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
  mapElements, mapMetadata, initAgentsModel,
  update, getMap
} from '../libs/api_connection.js';

// Define the shader code, using GLSL 3.00
import vsGLSL from '../assets/shaders/vs_color.glsl?raw';
import fsGLSL from '../assets/shaders/fs_color.glsl?raw';

const scene = new Scene3D();

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
let gl = undefined;
let baseCube = undefined;
let setBaseShapeRef = undefined;
let setCarShapeRef = undefined;
let stepDuration = 250; // ms between API steps (adaptive)
let lastUpdateTime = 0;
let updating = false;

const defaultCarScale = { x: 0.35, y: 0.35, z: 0.35 };
const roadScale = { x: 0.5, y: 0.08, z: 0.5 };
const blockScale = { x: 0.5, y: 0.5, z: 0.5 };
const lightScale = { x: 0.35, y: 0.8, z: 0.35 };

const sunLight = {
  direction: [0, -1, 0],   // Luz entrando desde arriba hacia abajo
  ambient: [0.25, 0.25, 0.3],
};

const { roads, destinations, obstacles, gradas, trafficLights, cars } = mapElements;


// Main function is async to be able to make the requests
async function main() {
  // Setup the canvas area
  const canvas = document.querySelector('canvas');
  gl = canvas.getContext('webgl2');
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Prepare the program with the shaders
  colorProgramInfo = twgl.createProgramInfo(gl, [vsGLSL, fsGLSL]);

  // Initialize the agents model
  await initAgentsModel();

  // Get the city map (roads, destinations, obstacles and traffic lights)
  await getMap();
  lastUpdateTime = performance.now();


  // Initialize the scene
  setupScene();

  // Position the objects in the scene
  setupObjects(scene, gl, colorProgramInfo);

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

  const rallyKartModel = getModelo('rallyKart');
  let carBase = null;
  let carScale = defaultCarScale;
  let carOffsetY = 0;
  let carRotation = null;
  if (rallyKartModel) {
    carBase = new Object3D(-4);
    carBase.arrays = rallyKartModel.arrays;
    carBase.bufferInfo = twgl.createBufferInfoFromArrays(gl, rallyKartModel.arrays);
    carBase.vao = twgl.createVAOFromBufferInfo(gl, programInfo, carBase.bufferInfo);
    carBase.useVertexColors = !rallyKartModel.color;
    carScale = { x: rallyKartModel.escala, y: rallyKartModel.escala, z: rallyKartModel.escala };
    carOffsetY = rallyKartModel.offsetY ?? 0;
    carRotation = rallyKartModel.rotation ?? null;
  }

  // Prepare traffic light model (S/s) if available
  const trafficLightModel = getModelo('trafficLight');
  let trafficLightBase = null;
  if (trafficLightModel) {
    trafficLightBase = new Object3D(-2);
    trafficLightBase.arrays = trafficLightModel.arrays;
    trafficLightBase.bufferInfo = twgl.createBufferInfoFromArrays(gl, trafficLightModel.arrays);
    trafficLightBase.vao = twgl.createVAOFromBufferInfo(gl, programInfo, trafficLightBase.bufferInfo);
    trafficLightBase.useVertexColors = true;
  }

  // Preparar modelos de montañas para los obstáculos (#)
  const mountainModels = modelos.filter((m) => m.id.startsWith('mountain'));
  const mountainBases = mountainModels.map((model) => {
    const base = new Object3D(`mount-base-${model.id}`);
    base.arrays = model.arrays;
    base.bufferInfo = twgl.createBufferInfoFromArrays(gl, model.arrays);
    base.vao = twgl.createVAOFromBufferInfo(gl, programInfo, base.bufferInfo);
    base.useVertexColors = !model.color;
    return { model, base };
  });
  const mountainChoice = new Map();

  const roadColor = roads[0]?.color ?? [0.3, 0.3, 0.3, 1];
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
    setBaseShapeRef(road, roadScale);
    scene.addObject(road);
  });
  destinations.forEach((destination) => {
    setBaseShapeRef(destination, blockScale);
    scene.addObject(destination);
  });
  obstacles.forEach((obstacle) => {
    if (mountainBases.length > 0) {
      const cached = mountainChoice.get(obstacle.id);
      const pick = cached ?? mountainBases[Math.floor(Math.random() * mountainBases.length)];
      mountainChoice.set(obstacle.id, pick);
      const { model, base } = pick;
      const scale = { x: model.escala, y: model.escala, z: model.escala };
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
  trafficLights.forEach((trafficLight) => {
    trafficLight.isTrafficLight = true;
    // Poner un tile de carretera debajo del semáforo para evitar huecos visuales
    const roadTile = new Object3D(`road-tl-${trafficLight.id}`, trafficLight.posArray);
    roadTile.color = roadColor;
    setBaseShapeRef(roadTile, roadScale);
    scene.addObject(roadTile);

    if (trafficLightBase && trafficLightModel) {
      const scale = { x: trafficLightModel.escala, y: trafficLightModel.escala, z: trafficLightModel.escala };
      const offsetY = trafficLightModel.offsetY ?? 0;
      setBaseShapeRef(trafficLight, scale, trafficLightBase, offsetY);
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
    if (!scene.objects.includes(car)) {
      scene.addObject(car);
    }
  });
}

// Draw an object with its corresponding transformations
function drawObject(gl, programInfo, object, viewProjectionMatrix, alpha) {
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
  const rotYMat = M4.rotationY(object.rotRad.y);
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
    : (object.isTrafficLight ? (object.color ?? [1, 1, 1, 1]).slice(0, 3).map((c) => c * 0.9) : [0, 0, 0]);

  // Model uniforms
  const objectUniforms = {
    u_worldViewProjection: wvpMat,
    u_worldInverseTranspose: worldInverseTranspose,
    u_color: object.color ?? [1, 1, 1, 1],
    u_vertexColorMix: object.vertexColorMix ?? 0,
    u_emissive: emissiveColor,
  };
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
  //console.log(scene.camera);
  const viewProjectionMatrix = setupViewProjection(gl);

  // Draw the objects
  gl.useProgram(colorProgramInfo.program);
  twgl.setUniforms(colorProgramInfo, {
    u_lightDirection: sunLight.direction,
    u_ambient: sunLight.ambient,
  });
  for (let object of scene.objects) {
    drawObject(gl, colorProgramInfo, object, viewProjectionMatrix, alpha);
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
      stepDuration = 0.7 * stepDuration + 0.3 * clamped;
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

  return viewProjectionMatrix;
}

// Setup a ui.
function setupUI() {
  /*
  const gui = new GUI();

  // Settings for the animation
  const animFolder = gui.addFolder('Animation:');
  animFolder.add( settings.rotationSpeed, 'x', 0, 360)
      .decimals(2)
  animFolder.add( settings.rotationSpeed, 'y', 0, 360)
      .decimals(2)
  animFolder.add( settings.rotationSpeed, 'z', 0, 360)
      .decimals(2)
  */
}

main();
