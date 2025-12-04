/*
 * Visualizer for the trafficBase city map. Connects to the Flask API and
 * renders the map elements and traffic lights (no cars).
 *
 * Gilberto Echeverria
 * 2025-11-08
 */


'use strict';

import * as twgl from 'twgl-base.js';
import GUI from 'lil-gui';
import { M4 } from '../libs/3d-lib';
import { Scene3D } from '../libs/scene3d';
import { Object3D } from '../libs/object3d';
import { Camera3D } from '../libs/camera3d';
import { getModelo, modelos } from '../libs/modelos.js';

// Functions and arrays for the communication with the API
import {
  mapElements, mapMetadata, initAgentsModel, initData,
  update, getMap
} from '../libs/api_connection.js';

// Define the shader code, using GLSL 3.00
import vsGLSL from '../assets/shaders/vs_color.glsl?raw';
import fsGLSL from '../assets/shaders/fs_color.glsl?raw';
import vsTexGLSL from '../assets/shaders/vs_color_tex.glsl?raw';
import fsTexGLSL from '../assets/shaders/fs_color_tex.glsl?raw';
import vsSkyboxGLSL from '../assets/shaders/vs_skybox.glsl?raw';
import fsSkyboxGLSL from '../assets/shaders/fs_skybox.glsl?raw';
import cubemapDesertUrl from '../assets/modelos/Cielo/Cubemap/Cubemap_Desert_02-512x512.png';

const scene = new Scene3D();
const textureCache = new Map();

/*
// Variable for the scene settings
const settings = {
    // Speed in degrees
    rotationSpeed: {
        x: 0,
        y: 0,
        z: 0,
    },
};
*/


// Global variables
let colorProgramInfo = undefined;
let colorTextureProgramInfo = undefined;
let gl = undefined;
let baseCube = undefined;
let setBaseShapeRef = undefined;
let setCarShapeRef = undefined;
let stepDuration = 250; // ms between API steps (adaptive)
let lastUpdateTime = 0;
let updating = false;

const defaultCarScale = { x: 0.35, y: 0.35, z: 0.35 };
const defaultRoadScale = { x: 0.5, y: 0.08, z: 0.5 };
const blockScale = { x: 0.5, y: 0.5, z: 0.5 };
const emptyTileScale = { x: 0.5, y: 0.05, z: 0.5 };
const lightScale = { x: 0.35, y: 0.8, z: 0.35 };

const sunLight = {
  direction: [0, -1, 0],   // Luz entrando desde arriba hacia abajo
  ambient: [0, 0, 0],
};

const MAX_POINT_LIGHTS = 64;
const destinationLightColor = [5, 5, 5];
// Reducir brillo de semáforos
const trafficLightGreenColor = [0.05, 1.0, 0.05];
const trafficLightRedColor = [1.1, 0.08, 0.05];

const skybox = {
  programInfo: undefined,
  bufferInfo: undefined,
  vao: undefined,
  texture: undefined,
  ready: false,
};

const { roads, destinations, obstacles, gradas, trafficLights, cars } = mapElements;
const uiParams = {
  seed: initData.seed ?? 42,
  spawnInterval: initData.spawn_interval ?? 10,
  carsPerSpawn: initData.cars_per_spawn ?? 1,
  updateSpeedMs: 250,
};
let gui = null;

const getTexture = (glRef, url, options = {}) => {
  if (!url) return null;
  const cached = textureCache.get(url);
  if (cached) return cached;
  const texture = twgl.createTexture(glRef, { src: url, ...options });
  textureCache.set(url, texture);
  return texture;
};

function getRoadRotation(direction) {
  const yawByDirection = {
    Right: 90,
    Left: -90,
    Down: 180,
    Up: 0,
  };
  const yaw = yawByDirection[direction] ?? 0;
  return { x: 0, y: yaw, z: 0 };
}

const loadImage = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = (error) => reject(error);
  img.src = url;
});

async function loadCubemapFromCross(glRef, url) {
  try {
    const image = await loadImage(url);
    const faceSize = Math.floor(image.height / 3);
    const validLayout = faceSize > 0 && image.width === faceSize * 4 && image.height === faceSize * 3;
    if (!validLayout) {
      console.warn('Skybox: formato inesperado para el cubemap, se esperaba layout 4x3.');
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = faceSize;
    canvas.height = faceSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('Skybox: no se pudo crear el contexto 2D para cortar el cubemap.');
      return null;
    }

    const faces = [
      { target: glRef.TEXTURE_CUBE_MAP_POSITIVE_X, coord: [2, 1] },
      { target: glRef.TEXTURE_CUBE_MAP_NEGATIVE_X, coord: [0, 1] },
      { target: glRef.TEXTURE_CUBE_MAP_POSITIVE_Y, coord: [1, 0] },
      { target: glRef.TEXTURE_CUBE_MAP_NEGATIVE_Y, coord: [1, 2] },
      { target: glRef.TEXTURE_CUBE_MAP_POSITIVE_Z, coord: [1, 1] },
      { target: glRef.TEXTURE_CUBE_MAP_NEGATIVE_Z, coord: [3, 1] },
    ];

    const texture = glRef.createTexture();
    glRef.bindTexture(glRef.TEXTURE_CUBE_MAP, texture);
    glRef.pixelStorei(glRef.UNPACK_FLIP_Y_WEBGL, false);

    faces.forEach(({ target, coord }) => {
      const [cx, cy] = coord;
      ctx.clearRect(0, 0, faceSize, faceSize);
      ctx.drawImage(
        image,
        cx * faceSize,
        cy * faceSize,
        faceSize,
        faceSize,
        0,
        0,
        faceSize,
        faceSize
      );
      glRef.texImage2D(target, 0, glRef.RGBA, glRef.RGBA, glRef.UNSIGNED_BYTE, canvas);
    });

    glRef.generateMipmap(glRef.TEXTURE_CUBE_MAP);
    glRef.texParameteri(glRef.TEXTURE_CUBE_MAP, glRef.TEXTURE_MIN_FILTER, glRef.LINEAR_MIPMAP_LINEAR);
    glRef.texParameteri(glRef.TEXTURE_CUBE_MAP, glRef.TEXTURE_MAG_FILTER, glRef.LINEAR);
    glRef.texParameteri(glRef.TEXTURE_CUBE_MAP, glRef.TEXTURE_WRAP_S, glRef.CLAMP_TO_EDGE);
    glRef.texParameteri(glRef.TEXTURE_CUBE_MAP, glRef.TEXTURE_WRAP_T, glRef.CLAMP_TO_EDGE);
    glRef.texParameteri(glRef.TEXTURE_CUBE_MAP, glRef.TEXTURE_WRAP_R, glRef.CLAMP_TO_EDGE);
    glRef.bindTexture(glRef.TEXTURE_CUBE_MAP, null);

    return texture;
  } catch (error) {
    console.error('Skybox: error cargando cubemap', error);
    return null;
  }
}

async function setupSkybox(glRef) {
  skybox.programInfo = twgl.createProgramInfo(glRef, [vsSkyboxGLSL, fsSkyboxGLSL]);
  skybox.bufferInfo = twgl.createBufferInfoFromArrays(glRef, {
    a_position: {
      numComponents: 2,
      data: [
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ],
    },
  });
  skybox.vao = twgl.createVAOFromBufferInfo(glRef, skybox.programInfo, skybox.bufferInfo);
  skybox.texture = await loadCubemapFromCross(glRef, cubemapDesertUrl);
  skybox.ready = !!skybox.texture;
}

function drawSkybox(glRef, viewMatrix, projectionMatrix) {
  if (!skybox.ready || !skybox.programInfo || !skybox.texture || !skybox.vao) return;

  const viewNoTranslation = [...viewMatrix];
  viewNoTranslation[12] = 0;
  viewNoTranslation[13] = 0;
  viewNoTranslation[14] = 0;

  const viewDirProj = M4.multiply(projectionMatrix, viewNoTranslation);
  const viewDirProjInv = M4.inverse(viewDirProj);

  glRef.depthFunc(glRef.LEQUAL);
  glRef.depthMask(false);

  glRef.useProgram(skybox.programInfo.program);
  glRef.bindVertexArray(skybox.vao);
  twgl.setUniforms(skybox.programInfo, {
    u_viewDirectionProjectionInverse: viewDirProjInv,
    u_skybox: skybox.texture,
  });
  twgl.drawBufferInfo(glRef, skybox.bufferInfo);

  glRef.depthMask(true);
  glRef.depthFunc(glRef.LESS);
}

function getTrafficLightColor(light) {
  const state = (light?.state ?? '').toString().toLowerCase();
  const isGreen = state === 'green' || state === '1' || state === 'true' || light?.state === true || light?.state === 1;
  return isGreen ? trafficLightGreenColor : trafficLightRedColor;
}

function buildPointLights(destinationsList, trafficLightsList) {
  const positions = new Float32Array(MAX_POINT_LIGHTS * 3);
  const colors = new Float32Array(MAX_POINT_LIGHTS * 3);
  let count = 0;

  for (let i = 0; i < trafficLightsList.length && count < MAX_POINT_LIGHTS; i++) {
    const light = trafficLightsList[i];
    const pos = light.getInterpolatedPos ? light.getInterpolatedPos(1) : light.posArray ?? [light.x, light.y, light.z];
    const color = getTrafficLightColor(light);
    light.emissive = color;
    positions.set(pos, count * 3);
    colors.set(color, count * 3);
    count++;
  }

  for (let i = 0; i < destinationsList.length && count < MAX_POINT_LIGHTS; i++) {
    const dest = destinationsList[i];
    const pos = dest.getInterpolatedPos ? dest.getInterpolatedPos(1) : dest.posArray ?? [dest.x, dest.y, dest.z];
    const color = dest.emissive ?? destinationLightColor;
    positions.set(pos, count * 3);
    colors.set(color, count * 3);
    count++;
  }

  return { positions, colors, count };
}

const emptyLights = {
  positions: new Float32Array(MAX_POINT_LIGHTS * 3),
  colors: new Float32Array(MAX_POINT_LIGHTS * 3),
  count: 0,
};

function resetMapCollections() {
  mapElements.roads.length = 0;
  mapElements.destinations.length = 0;
  mapElements.obstacles.length = 0;
  mapElements.gradas.length = 0;
  mapElements.trafficLights.length = 0;
  mapElements.cars.length = 0;
}

async function initializeSimulation(overrides = {}) {
  updating = true;
  try {
    const payload = {
      ...overrides,
      seed: Math.round(overrides.seed ?? uiParams.seed),
      spawn_interval: Math.round(overrides.spawn_interval ?? uiParams.spawnInterval),
      cars_per_spawn: Math.round(overrides.cars_per_spawn ?? uiParams.carsPerSpawn),
    };
    const initResult = await initAgentsModel(payload);
    if (!initResult) {
      throw new Error('No se pudo inicializar el modelo con los parámetros seleccionados');
    }
    resetMapCollections();
    await getMap();
    scene.objects = [];
    setupScene();
    setupObjects(scene, gl, colorProgramInfo);
    stepDuration = Math.max(30, overrides.updateSpeedMs ?? uiParams.updateSpeedMs);
    lastUpdateTime = performance.now();
    Object.assign(uiParams, {
      seed: payload.seed,
      spawnInterval: payload.spawn_interval,
      carsPerSpawn: payload.cars_per_spawn,
    });
  } catch (error) {
    console.error('Error inicializando la simulación', error);
  } finally {
    updating = false;
  }
}


// Main function is async to be able to make the requests
async function main() {
  // Setup the canvas area
  const canvas = document.querySelector('canvas');
  gl = canvas.getContext('webgl2');
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Prepare the program with the shaders
  colorProgramInfo = twgl.createProgramInfo(gl, [vsGLSL, fsGLSL]);
  colorTextureProgramInfo = twgl.createProgramInfo(gl, [vsTexGLSL, fsTexGLSL]);
  await setupSkybox(gl);

  // Initialize the agents model, load the map and place objects
  await initializeSimulation();

  // Prepare the user interface
  setupUI();

  // Fisrt call to the drawing loop
  drawScene();
}



function setupScene() {
  const width = mapMetadata.width || 28;
  const height = mapMetadata.height || 28;
  const maxSize = Math.max(width, height);
  const distance = Math.min(Math.max(14, maxSize * 0.9), 45);
  const center = [width / 2, 0, height / 2];

  let camera = new Camera3D(0,
    distance,        // Distance to target
    4,               // Azimut
    0.9,             // Elevation
    [center[0], center[1], center[2] + distance],
    center);

  scene.setCamera(camera);
  scene.camera.setupControls();
}

function setupObjects(scene, gl, programInfo) {
  // Create VAOs for the different shapes
  baseCube = new Object3D(-1);
  baseCube.useVertexColors = false;
  baseCube.prepareVAO(gl, programInfo);

  setBaseShapeRef = (object, scale, baseShape = baseCube, offsetY = 0, rotation = null) => {
    object.arrays = baseShape.arrays;
    object.bufferInfo = baseShape.bufferInfo;
    object.vao = baseShape.vao;
    object.scale = scale;
    object.vertexColorMix = baseShape.useVertexColors ? 1.0 : 0.0;
    object.offsetY = offsetY;
    object.texture = baseShape.useTexture ? baseShape.texture : null;
    object.useTexture = baseShape.useTexture ?? false;
    if (rotation) {
      object.rotDeg = { x: rotation.x || 0, y: rotation.y || 0, z: rotation.z || 0 };
      object.rotRad = {
        x: object.rotDeg.x * Math.PI / 180,
        y: object.rotDeg.y * Math.PI / 180,
        z: object.rotDeg.z * Math.PI / 180,
      };
      object.baseYaw = object.rotDeg.y;
    } else {
      object.baseYaw = object.baseYaw ?? 0;
    }
  };

  const carModel = getModelo('carSedan');
  let carBase = null;
  let carScale = defaultCarScale;
  let carOffsetY = 0;
  let carRotation = null;
  if (carModel) {
    carBase = new Object3D(-4);
    carBase.arrays = carModel.arrays;
    carBase.bufferInfo = twgl.createBufferInfoFromArrays(gl, carModel.arrays);
    const carTexture = getTexture(gl, carModel.textureUrl, {
      wrapS: gl.REPEAT,
      wrapT: gl.REPEAT,
      min: gl.LINEAR_MIPMAP_LINEAR,
      mag: gl.LINEAR,
    });
    const carProgram = carTexture ? colorTextureProgramInfo : programInfo;
    carBase.vao = twgl.createVAOFromBufferInfo(gl, carProgram, carBase.bufferInfo);
    carBase.useVertexColors = !carModel.color && !carTexture;
    carBase.useTexture = !!carTexture;
    carBase.texture = carTexture;
    carScale = { x: carModel.escala, y: carModel.escala, z: carModel.escala };
    carOffsetY = carModel.offsetY ?? 0;
    carRotation = carModel.rotation ?? null;
  }

  // Prepare traffic light model (S/s) if available
  const trafficLightModel = getModelo('trafficLight');
  let trafficLightBase = null;
  if (trafficLightModel) {
    trafficLightBase = new Object3D(-2);
    trafficLightBase.arrays = trafficLightModel.arrays;
    trafficLightBase.bufferInfo = twgl.createBufferInfoFromArrays(gl, trafficLightModel.arrays);
    const trafficTexture = getTexture(gl, trafficLightModel.textureUrl, {
      wrapS: gl.CLAMP_TO_EDGE,
      wrapT: gl.CLAMP_TO_EDGE,
      min: gl.LINEAR_MIPMAP_LINEAR,
      mag: gl.LINEAR,
    });
    const trafficProgram = trafficTexture ? colorTextureProgramInfo : programInfo;
    trafficLightBase.vao = twgl.createVAOFromBufferInfo(gl, trafficProgram, trafficLightBase.bufferInfo);
    trafficLightBase.useVertexColors = !trafficLightModel.color && !trafficTexture;
    trafficLightBase.useTexture = !!trafficTexture;
    trafficLightBase.texture = trafficTexture;
  }

  // Preparar modelos de montañas para los obstáculos (#)
  const mountainModels = modelos.filter((m) => m.id.startsWith('mountain'));
  const mountainBases = mountainModels.map((model) => {
    const base = new Object3D(`mount-base-${model.id}`);
    base.arrays = model.arrays;
    base.bufferInfo = twgl.createBufferInfoFromArrays(gl, model.arrays);
    const mountainTexture = getTexture(gl, model.textureUrl, {
      wrapS: gl.REPEAT,
      wrapT: gl.REPEAT,
      min: gl.LINEAR_MIPMAP_LINEAR,
      mag: gl.LINEAR,
    });
    const mountainProgram = mountainTexture ? colorTextureProgramInfo : programInfo;
    base.vao = twgl.createVAOFromBufferInfo(gl, mountainProgram, base.bufferInfo);
    base.useVertexColors = !mountainTexture && !model.color;
    base.useTexture = !!mountainTexture;
    base.texture = mountainTexture;
    return { model, base };
  });
  const mountainBaseById = new Map(mountainBases.map((entry) => [entry.model.id, entry]));
  const mountainChoice = new Map();

  const roadColor = roads[0]?.color ?? [0.3, 0.3, 0.3, 1];
  const roadModel = getModelo('roadStraight');
  let roadBase = null;
  let roadScale = { ...defaultRoadScale };
  let roadOffsetY = 0;
  if (roadModel) {
    roadBase = new Object3D(-5);
    roadBase.arrays = roadModel.arrays;
    roadBase.bufferInfo = twgl.createBufferInfoFromArrays(gl, roadModel.arrays);
    const roadTexture = getTexture(gl, roadModel.textureUrl, {
      wrapS: gl.REPEAT,
      wrapT: gl.REPEAT,
      min: gl.LINEAR_MIPMAP_LINEAR,
      mag: gl.LINEAR,
    });
    const roadProgram = roadTexture ? colorTextureProgramInfo : programInfo;
    roadBase.vao = twgl.createVAOFromBufferInfo(gl, roadProgram, roadBase.bufferInfo);
    roadBase.useVertexColors = !roadTexture;
    roadBase.useTexture = !!roadTexture;
    roadBase.texture = roadTexture;
    const escala = roadModel.escala ?? defaultRoadScale.x;
    const scaleOverride = roadModel.scale ?? {};
    roadScale = {
      x: scaleOverride.x ?? escala,
      y: scaleOverride.y ?? escala,
      z: scaleOverride.z ?? escala,
    };
    roadOffsetY = roadModel.offsetY ?? 0;
  }
  const destinationModel = getModelo('destination');
  let destinationBase = null;
  let destinationOffsetY = 0;
  if (destinationModel) {
    destinationBase = new Object3D(-6);
    destinationBase.arrays = destinationModel.arrays;
    destinationBase.bufferInfo = twgl.createBufferInfoFromArrays(gl, destinationModel.arrays);
    const destinationTexture = getTexture(gl, destinationModel.textureUrl, {
      wrapS: gl.REPEAT,
      wrapT: gl.REPEAT,
      min: gl.LINEAR_MIPMAP_LINEAR,
      mag: gl.LINEAR,
    });
    const destinationProgram = destinationTexture ? colorTextureProgramInfo : programInfo;
    destinationBase.vao = twgl.createVAOFromBufferInfo(gl, destinationProgram, destinationBase.bufferInfo);
    destinationBase.useVertexColors = !destinationTexture && !destinationModel.color;
    destinationBase.useTexture = !!destinationTexture;
    destinationBase.texture = destinationTexture;
    destinationOffsetY = destinationModel.offsetY ?? 0;
  }
  const tileZeroModel = getModelo('tileZero');
  let tileZeroBase = null;
  let tileZeroScale = { ...emptyTileScale };
  let tileZeroOffsetY = 0;
  if (tileZeroModel) {
    tileZeroBase = new Object3D(-7);
    tileZeroBase.arrays = tileZeroModel.arrays;
    tileZeroBase.bufferInfo = twgl.createBufferInfoFromArrays(gl, tileZeroModel.arrays);
    const tileZeroTexture = getTexture(gl, tileZeroModel.textureUrl, {
      wrapS: gl.REPEAT,
      wrapT: gl.REPEAT,
      min: gl.LINEAR_MIPMAP_LINEAR,
      mag: gl.LINEAR,
    });
    const tileZeroProgram = tileZeroTexture ? colorTextureProgramInfo : programInfo;
    tileZeroBase.vao = twgl.createVAOFromBufferInfo(gl, tileZeroProgram, tileZeroBase.bufferInfo);
    tileZeroBase.useVertexColors = !tileZeroTexture && !tileZeroModel.color;
    tileZeroBase.useTexture = !!tileZeroTexture;
    tileZeroBase.texture = tileZeroTexture;
    const escala = tileZeroModel.escala ?? tileZeroModel.scale?.x ?? emptyTileScale.x;
    const scaleOverride = tileZeroModel.scale ?? { x: escala, y: escala, z: escala };
    tileZeroScale = scaleOverride;
    tileZeroOffsetY = tileZeroModel.offsetY ?? 0;
  }
  const gradasModel = getModelo('bleachers');
  let gradasBase = null;
  if (gradasModel) {
    gradasBase = new Object3D(-3);
    gradasBase.arrays = gradasModel.arrays;
    gradasBase.bufferInfo = twgl.createBufferInfoFromArrays(gl, gradasModel.arrays);
    gradasBase.vao = twgl.createVAOFromBufferInfo(gl, programInfo, gradasBase.bufferInfo);
    gradasBase.useVertexColors = !gradasModel.color;
  }

  roads.forEach((road) => {
    const rotation = getRoadRotation(road.direction);
    if (roadBase && roadModel) {
      setBaseShapeRef(road, roadScale, roadBase, roadOffsetY, rotation);
    } else {
      setBaseShapeRef(road, defaultRoadScale, baseCube, 0, rotation);
    }
    scene.addObject(road);
  });
  destinations.forEach((destination) => {
    destination.isDestination = true;
    if (destinationBase && destinationModel) {
      const scale = destinationModel.scale ?? { x: destinationModel.escala, y: destinationModel.escala, z: destinationModel.escala };
      const offsetY = destinationModel.offsetY ?? destinationOffsetY;
      destination.color = destinationModel.color ?? destination.color;
      destination.emissive = destinationModel.emissive ?? destination.emissive;
      setBaseShapeRef(destination, scale, destinationBase, offsetY, destinationModel.rotation);
    } else {
      setBaseShapeRef(destination, blockScale);
    }
    scene.addObject(destination);
  });
  obstacles.forEach((obstacle) => {
    const isEmptyTile = obstacle.kind === 'Empty';
    if (isEmptyTile) {
      if (tileZeroBase && tileZeroModel) {
        const scale = tileZeroModel.scale ?? { x: tileZeroModel.escala, y: tileZeroModel.escala, z: tileZeroModel.escala };
        const offsetY = tileZeroModel.offsetY ?? tileZeroOffsetY;
        obstacle.color = tileZeroModel.color ?? obstacle.color;
        setBaseShapeRef(obstacle, scale, tileZeroBase, offsetY, tileZeroModel.rotation);
      } else {
        setBaseShapeRef(obstacle, emptyTileScale, baseCube);
        const texture = roadTextureUrl
          ? getTexture(gl, roadTextureUrl, {
              wrapS: gl.REPEAT,
              wrapT: gl.REPEAT,
              min: gl.LINEAR_MIPMAP_LINEAR,
              mag: gl.LINEAR,
            })
          : null;
        obstacle.useTexture = !!texture;
        obstacle.texture = texture;
        obstacle.vertexColorMix = texture ? 0 : (obstacle.vertexColorMix ?? 0);
      }
      scene.addObject(obstacle);
      return;
    }

    if (mountainBases.length > 0) {
      let pick = null;
      if (obstacle.kind && mountainBaseById.has(obstacle.kind)) {
        pick = mountainBaseById.get(obstacle.kind);
      } else {
        pick = mountainChoice.get(obstacle.id);
      }
      if (!pick) {
        pick = mountainBases[Math.floor(Math.random() * mountainBases.length)];
      }
      mountainChoice.set(obstacle.id, pick);

      const { model, base } = pick;
      const scale = model.scale ?? { x: model.escala, y: model.escala, z: model.escala };
      const offsetY = model.offsetY ?? 0;
      obstacle.color = model.color ?? obstacle.color;
      setBaseShapeRef(obstacle, scale, base, offsetY);
    } else {
      setBaseShapeRef(obstacle, blockScale);
    }
    scene.addObject(obstacle);
  });
  gradas.forEach((grada) => {
    if (gradasBase && gradasModel) {
      const scale = { x: gradasModel.escala, y: gradasModel.escala, z: gradasModel.escala };
      const offsetY = gradasModel.offsetY ?? 0;
      setBaseShapeRef(grada, scale, gradasBase, offsetY, gradasModel.rotation);
    } else {
      setBaseShapeRef(grada, blockScale);
    }
    scene.addObject(grada);
  });

  // Lookup de dirección de calles por celda para orientar semáforos
  const roadDirByPos = new Map(
    roads
      .filter((r) => r.direction)
      .map((r) => [`${Math.round(r.position.x)}|${Math.round(r.position.z)}`, r.direction])
  );
  const neighborOffsets = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];

  trafficLights.forEach((trafficLight) => {
    trafficLight.isTrafficLight = true;
    // Poner un tile de carretera debajo del semáforo para evitar huecos visuales
    const basePos = [trafficLight.position.x, trafficLight.position.y, trafficLight.position.z];
    const roadTile = new Object3D(`road-tl-${trafficLight.id}`, basePos);
    roadTile.color = roadColor;
    // Offset fijo para que no cambie al mover sliders
    const loweredTileOffset = -0.04;
    if (roadBase && roadModel) {
      setBaseShapeRef(roadTile, roadScale, roadBase, loweredTileOffset);
    } else {
      setBaseShapeRef(roadTile, defaultRoadScale, baseCube, loweredTileOffset);
    }
    scene.addObject(roadTile);

    if (trafficLightBase && trafficLightModel) {
      const scale = { x: trafficLightModel.escala, y: trafficLightModel.escala, z: trafficLightModel.escala };
      const offsetY = trafficLightModel.offsetY ?? 0;
      const baseKey = `${Math.round(trafficLight.position.x)}|${Math.round(trafficLight.position.z)}`;
      let dir = roadDirByPos.get(baseKey);
      if (!dir) {
        for (const [dx, dz] of neighborOffsets) {
          const key = `${Math.round(trafficLight.position.x) + dx}|${Math.round(trafficLight.position.z) + dz}`;
          dir = roadDirByPos.get(key);
          if (dir) break;
        }
      }
      const dirRot = getRoadRotation(dir ?? '');
      // Solo girar sobre Y para orientar sin acostarlos
      const rotation = { x: 0, y: dirRot.y || 0, z: 0 };
      setBaseShapeRef(trafficLight, scale, trafficLightBase, offsetY, rotation);
    } else {
      setBaseShapeRef(trafficLight, lightScale);
    }
    scene.addObject(trafficLight);
  });

  setCarShapeRef = carBase
    ? (object) => setBaseShapeRef(object, carScale, carBase, carOffsetY, carRotation)
    : (object) => setBaseShapeRef(object, defaultCarScale);

  syncCarsInScene(setCarShapeRef);

}

function syncCarsInScene(setBaseShape = (object) => setBaseShapeRef(object, defaultCarScale)) {
  // Eliminar carros que ya no están reportados por la API
  if (!setBaseShape) return;
  const activeIds = new Set(cars.map((car) => car.id));
  scene.objects = scene.objects.filter((object) => !object.isCar || activeIds.has(object.id));

  cars.forEach((car) => {
    car.isCar = true;
    if (!car.vao) {
      setBaseShape(car);
    }
    // Track yaw only when it changes (per update) to interpolate turns
    const currentYaw = car.rotDeg?.y ?? car.baseYaw ?? 0;
    if (car.lastYaw === undefined) {
      car.lastYaw = currentYaw;
      car.yawStart = currentYaw;
      car.yawEnd = currentYaw;
      car.yawChangedAtUpdate = false;
    } else if (currentYaw !== car.lastYaw) {
      car.yawStart = car.lastYaw;
      car.yawEnd = currentYaw;
      car.lastYaw = currentYaw;
      car.yawChangedAtUpdate = true;
    } else {
      car.yawChangedAtUpdate = false;
      car.yawStart = car.yawStart ?? currentYaw;
      car.yawEnd = car.yawEnd ?? currentYaw;
    }
    if (!scene.objects.includes(car)) {
      scene.addObject(car);
    }
  });
}

// Draw an object with its corresponding transformations
function drawObject(gl, programInfo, object, viewProjectionMatrix, lights, alpha) {
  // Prepare the vector for translation and scale
  let v3_tra = object.getInterpolatedPos(alpha);
  let v3_sca = object.scaArray;

  /*
  // Animate the rotation of the objects
  object.rotDeg.x = (object.rotDeg.x + settings.rotationSpeed.x * fract) % 360;
  object.rotDeg.y = (object.rotDeg.y + settings.rotationSpeed.y * fract) % 360;
  object.rotDeg.z = (object.rotDeg.z + settings.rotationSpeed.z * fract) % 360;
  object.rotRad.x = object.rotDeg.x * Math.PI / 180;
  object.rotRad.y = object.rotDeg.y * Math.PI / 180;
  object.rotRad.z = object.rotDeg.z * Math.PI / 180;
  */

  // Create the individual transform matrices
  const scaMat = M4.scale(v3_sca);
  const rotXMat = M4.rotationX(object.rotRad.x);
  const rotYMat = (() => {
    if (object.isCar && object.yawStart !== undefined && object.yawEnd !== undefined && object.yawChangedAtUpdate) {
      const start = object.yawStart;
      const end = object.yawEnd;
      const delta = ((end - start + 540) % 360) - 180; // shortest path
      const yawDeg = start + delta * alpha;
      return M4.rotationY(yawDeg * Math.PI / 180);
    }
    return M4.rotationY(object.rotRad.y);
  })();
  const rotZMat = M4.rotationZ(object.rotRad.z);
  const traMat = M4.translation(v3_tra);

  // Create the composite matrix with all transformations
  let transforms = M4.identity();
  transforms = M4.multiply(scaMat, transforms);
  transforms = M4.multiply(rotXMat, transforms);
  transforms = M4.multiply(rotYMat, transforms);
  transforms = M4.multiply(rotZMat, transforms);
  transforms = M4.multiply(traMat, transforms);

  object.matrix = transforms;

  // Apply the projection to the final matrix for the
  // World-View-Projection
  const wvpMat = M4.multiply(viewProjectionMatrix, transforms);
  const worldInverse = M4.inverse(transforms);
  const worldInverseTranspose = M4.transpose(worldInverse);

  const emissiveColor = object.emissive
    ? object.emissive
    : [0, 0, 0];

  const useTexture = !!object.texture;
  // Model uniforms
  const objectUniforms = {
    u_worldViewProjection: wvpMat,
    u_worldInverseTranspose: worldInverseTranspose,
    u_world: transforms,
    u_emissive: emissiveColor,
    u_pointLightCount: lights.count,
    u_pointLightPos: lights.positions,
    u_pointLightColor: lights.colors,
  };
  if (useTexture) {
    objectUniforms.u_texture = object.texture;
  } else {
    objectUniforms.u_color = object.color ?? [1, 1, 1, 1];
    objectUniforms.u_vertexColorMix = object.vertexColorMix ?? 0;
  }
  objectUniforms.u_lightDirection = sunLight.direction;
  objectUniforms.u_ambient = sunLight.ambient;
  twgl.setUniforms(programInfo, objectUniforms);

  gl.bindVertexArray(object.vao);
  twgl.drawBufferInfo(gl, object.bufferInfo);
}

// Function to do the actual display of the objects
async function drawScene() {
  const now = performance.now();
  const alpha = Math.min((now - lastUpdateTime) / stepDuration, 1);

  // Clear the canvas
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // tell webgl to cull faces
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  scene.camera.checkKeys();
  const { viewProjectionMatrix, viewMatrix, projectionMatrix } = setupViewProjection(gl);

  drawSkybox(gl, viewMatrix, projectionMatrix);

  const lights = buildPointLights(destinations, trafficLights);

  // Draw the objects
  for (let object of scene.objects) {
    const useTexture = !!object.texture && !!colorTextureProgramInfo;
    const programInfo = useTexture ? colorTextureProgramInfo : colorProgramInfo;
    gl.useProgram(programInfo.program);
    const applyLights = object.isDestination || object.isTrafficLight ? emptyLights : lights;
    drawObject(gl, programInfo, object, viewProjectionMatrix, applyLights, alpha);
  }

  // Update the scene after the elapsed duration
  if (!updating && alpha >= 1) {
    updating = true;
    try {
      await update();
      syncCarsInScene(setCarShapeRef);
      const after = performance.now();
      const observed = after - lastUpdateTime;
      const clamped = Math.max(80, Math.min(1200, observed));
      const desired = Math.max(30, uiParams.updateSpeedMs);
      stepDuration = 0.5 * desired + 0.5 * (0.7 * stepDuration + 0.3 * clamped);
      lastUpdateTime = after;
    } catch (error) {
      console.error(error);
    } finally {
      updating = false;
    }
  }

  requestAnimationFrame(drawScene);
}

function setupViewProjection(gl) {
  // Field of view of 60 degrees vertically, in radians
  const fov = 60 * Math.PI / 180;
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

  // Matrices for the world view
  const projectionMatrix = M4.perspective(fov, aspect, 1, 200);

  const cameraPosition = scene.camera.posArray;
  const target = scene.camera.targetArray;
  const up = [0, 1, 0];

  const cameraMatrix = M4.lookAt(cameraPosition, target, up);
  const viewMatrix = M4.inverse(cameraMatrix);
  const viewProjectionMatrix = M4.multiply(projectionMatrix, viewMatrix);

  return { viewProjectionMatrix, viewMatrix, projectionMatrix };
}

// Setup a ui.
function setupUI() {
  if (gui) {
    gui.destroy();
  }
  gui = new GUI({ title: 'Parámetros' });

  gui.add(uiParams, 'seed')
    .name('Seed')
    .onFinishChange((value) => { uiParams.seed = Math.round(value); });

  gui.add(uiParams, 'spawnInterval', 0, 25, 1)
    .name('Intervalo de spawn')
    .onFinishChange((value) => { uiParams.spawnInterval = Math.round(value); });

  gui.add(uiParams, 'carsPerSpawn', 1, 4, 1)
    .name('Coches por spawn')
    .onFinishChange((value) => { uiParams.carsPerSpawn = Math.round(value); });

  gui.add(uiParams, 'updateSpeedMs', 80, 1200, 10)
    .name('Update speed (ms)')
    .onFinishChange((value) => {
      uiParams.updateSpeedMs = Math.max(30, Math.round(value));
      stepDuration = uiParams.updateSpeedMs;
      lastUpdateTime = performance.now();
    });

  const actions = {
    aplicar: async () => {
      await initializeSimulation({
        seed: uiParams.seed,
        spawn_interval: uiParams.spawnInterval,
        cars_per_spawn: uiParams.carsPerSpawn,
        updateSpeedMs: uiParams.updateSpeedMs,
      });
    },
  };

  gui.add(actions, 'aplicar').name('Aplicar cambios');
}

main();
