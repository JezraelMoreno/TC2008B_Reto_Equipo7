/*
 * Arreglos para objetos en OBJ y sus mtl.
 */

'use strict';

import { loadObj, loadMtl } from './obj_loader';
import citybitsTextureUrl from '../assets/modelos/calle/citybits_texture.png';
import rockyTrailTextureUrl from '../assets/modelos/calle/rocky_trail_02_diff_1k.png';
import mountainTextureUrl from '../assets/modelos/Montañas/obj/6_rocktext.jpg';

// OBJ de carros / semaforos
import trafficLightObj from '../assets/modelos/trafficLight/source/Semaforo.obj?raw';
import trafficLightMtl from '../assets/modelos/trafficLight/source/Semaforo.mtl?raw';
import roadStraightObj from '../assets/modelos/calle/road_straight.obj?raw';
import roadStraightMtl from '../assets/modelos/calle/road_straight.mtl?raw';
import trafficLightTextureUrl from '../assets/modelos/trafficLight/source/StopLight.jpg';
import carSedanObj from '../assets/modelos/carro2/car_sedan.obj?raw';
import carSedanMtl from '../assets/modelos/carro2/car_sedan.mtl?raw';
import carSedanWheelFrontLeftObj from '../assets/modelos/carro2/car_sedan_wheel_front_left.obj?raw';
import carSedanWheelFrontLeftMtl from '../assets/modelos/carro2/car_sedan_wheel_front_left.mtl?raw';
import carSedanWheelFrontRightObj from '../assets/modelos/carro2/car_sedan_wheel_front_right.obj?raw';
import carSedanWheelFrontRightMtl from '../assets/modelos/carro2/car_sedan_wheel_front_right.mtl?raw';
import carSedanWheelRearLeftObj from '../assets/modelos/carro2/car_sedan_wheel_rear_left.obj?raw';
import carSedanWheelRearLeftMtl from '../assets/modelos/carro2/car_sedan_wheel_rear_left.mtl?raw';
import carSedanWheelRearRightObj from '../assets/modelos/carro2/car_sedan_wheel_rear_right.obj?raw';
import carSedanWheelRearRightMtl from '../assets/modelos/carro2/car_sedan_wheel_rear_right.mtl?raw';

// OBJ de montañas (decoración de obstáculos)
import hill1Obj from '../assets/modelos/Montañas/obj/Hill_desert_001.obj?raw';
import hill1Mtl from '../assets/modelos/Montañas/obj/Hill_desert_001.mtl?raw';
import hill2Obj from '../assets/modelos/Montañas/obj/Hill_desert_002.obj?raw';
import hill2Mtl from '../assets/modelos/Montañas/obj/Hill_desert_002.mtl?raw';
import hill5Obj from '../assets/modelos/Montañas/obj/Hill_desert_005.obj?raw';
import hill5Mtl from '../assets/modelos/Montañas/obj/Hill_desert_005.mtl?raw';
import mtnDesert1Obj from '../assets/modelos/Montañas/obj/Mountain_desert_001.obj?raw';
import mtnDesert1Mtl from '../assets/modelos/Montañas/obj/Mountain_desert_001.mtl?raw';
import mtnDesert2Obj from '../assets/modelos/Montañas/obj/Mountain_desert_002.obj?raw';
import mtnDesert2Mtl from '../assets/modelos/Montañas/obj/Mountain_desert_002.mtl?raw';
import mtnDesert3Obj from '../assets/modelos/Montañas/obj/Mountain_desert_003.obj?raw';
import mtnDesert3Mtl from '../assets/modelos/Montañas/obj/Mountain_desert_003.mtl?raw';
import mtnDesert4Obj from '../assets/modelos/Montañas/obj/Mountain_desert_004.obj?raw';
import mtnDesert4Mtl from '../assets/modelos/Montañas/obj/Mountain_desert_004.mtl?raw';
import mtnDesert5Obj from '../assets/modelos/Montañas/obj/Mountain_desert_005.obj?raw';
import mtnDesert5Mtl from '../assets/modelos/Montañas/obj/Mountain_desert_005.mtl?raw';
import mtnDesert6Obj from '../assets/modelos/Montañas/obj/Mountain_desert_006.obj?raw';
import mtnDesert6Mtl from '../assets/modelos/Montañas/obj/Mountain_desert_006.mtl?raw';
import mtnDesert7Obj from '../assets/modelos/Montañas/obj/Mountain_desert_007.obj?raw';
import mtnDesert7Mtl from '../assets/modelos/Montañas/obj/Mountain_desert_007.mtl?raw';
import mtnDesert8Obj from '../assets/modelos/Montañas/obj/Mountain_desert_008.obj?raw';
import mtnDesert8Mtl from '../assets/modelos/Montañas/obj/Mountain_desert_008.mtl?raw';
import mtnDesert9Obj from '../assets/modelos/Montañas/obj/Mountain_desert_009.obj?raw';
import mtnDesert9Mtl from '../assets/modelos/Montañas/obj/Mountain_desert_009.mtl?raw';
import gradasObj from '../assets/modelos/gradas/bleachers_v1_L1.123c489e84b7-a282-451c-9689-6412d8ec0dac/gradas_mod.obj?raw';
import gradasMtl from '../assets/modelos/gradas/bleachers_v1_L1.123c489e84b7-a282-451c-9689-6412d8ec0dac/gradas_mod.mtl?raw';
import destinoObj from '../assets/modelos/Destinos/destino.obj?raw';
import destinoMtl from '../assets/modelos/Destinos/destino.mtl?raw';
import destinoTextureUrl from '../assets/modelos/Destinos/6_rocktext.jpg.png';
import destinoLavaTextureUrl from '../assets/modelos/Destinos/lava.png';
import tipoCeroObj from '../assets/modelos/Montañas/obj/Tipocero.obj?raw';
import tipoCeroMtl from '../assets/modelos/Montañas/obj/Tipocero.mtl?raw';
import tipoCeroTextureUrl from '../assets/modelos/Montañas/obj/6_rocktext.jpg.png';

// Constructor to merge multiple OBJ arrays into one mesh
function combinarArrays(arraysList = []) {
    const base = {
        a_position: { numComponents: 3, data: [] },
        a_color: { numComponents: 4, data: [] },
        a_normal: { numComponents: 3, data: [] },
        a_texCoord: { numComponents: 2, data: [] },
    };

    arraysList.forEach((arr) => {
        if (!arr) return;
        if (arr.a_position?.data) base.a_position.data.push(...arr.a_position.data);
        if (arr.a_color?.data) base.a_color.data.push(...arr.a_color.data);
        if (arr.a_normal?.data) base.a_normal.data.push(...arr.a_normal.data);
        if (arr.a_texCoord?.data) base.a_texCoord.data.push(...arr.a_texCoord.data);
    });

    return base;
}

function centrarModelo(arrays) {
    const posiciones = arrays?.a_position?.data;
    if (!posiciones || posiciones.length < 3) {
        return { arrays, altura: 0, dims: { width: 0, height: 0, depth: 0 } };
    }

    let min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
    let max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];

    for (let i = 0; i < posiciones.length; i += 3) {
        const x = posiciones[i];
        const y = posiciones[i + 1];
        const z = posiciones[i + 2];
        if (x < min[0]) min[0] = x; if (x > max[0]) max[0] = x;
        if (y < min[1]) min[1] = y; if (y > max[1]) max[1] = y;
        if (z < min[2]) min[2] = z; if (z > max[2]) max[2] = z;
    }

    const centro = [
        (min[0] + max[0]) / 2,
        (min[1] + max[1]) / 2,
        (min[2] + max[2]) / 2
    ];

    for (let i = 0; i < posiciones.length; i += 3) {
        posiciones[i] -= centro[0];
        posiciones[i + 1] -= centro[1];
        posiciones[i + 2] -= centro[2];
    }

    const altura = max[1] - min[1];
    const width = max[0] - min[0];
    const depth = max[2] - min[2];
    return { arrays, altura, dims: { width, height: altura, depth } };
}

function prepararMontana(id, nombre, objRaw, mtlRaw, opciones = {}) {
    const materials = loadMtl(mtlRaw);
    const { arrays, altura, dims } = centrarModelo(loadObj(objRaw, materials));
    const textureUrl = opciones.textureUrl ?? mountainTextureUrl;

    const alturaObjetivo = opciones.alturaObjetivo ?? 0.5;
    const anchoObjetivo = opciones.anchoObjetivo;
    const largoObjetivo = opciones.largoObjetivo;
    const escalaFallback = opciones.escalaFallback ?? 0.0015;

    const escalaY = altura > 0 ? alturaObjetivo / altura : escalaFallback;
    const escalaX = anchoObjetivo && dims.width > 0 ? anchoObjetivo / dims.width : escalaY;
    const escalaZ = largoObjetivo && dims.depth > 0 ? largoObjetivo / dims.depth : escalaY;
    const scale = { x: escalaX, y: escalaY, z: escalaZ };
    const yLift = 0.08; // ligera elevación para que no queden hundidas

    return {
        id,
        nombre,
        arrays,
        escala: escalaY,
        scale,
        offsetY: (altura * escalaY) / 2 + yLift,
        color: opciones.color ?? [0.45, 0.4, 0.36, 1],
        textureUrl,
    };
}

function prepararCarro(id, nombre, objRaw, mtlRaw, opciones = {}) {
    const materials = loadMtl(mtlRaw);
    const arraysList = [loadObj(objRaw, materials)];

    if (opciones.partes && opciones.partes.length > 0) {
        opciones.partes.forEach((parte) => {
            const parteMaterials = parte.compartirMateriales ? materials : loadMtl(parte.mtlRaw ?? mtlRaw);
            arraysList.push(loadObj(parte.objRaw, parteMaterials));
        });
    }

    const { arrays, altura } = centrarModelo(combinarArrays(arraysList));
    const alturaObjetivo = opciones.alturaObjetivo ?? 0.42;
    const escalaFallback = opciones.escalaFallback ?? 0.0025;
    const escala = altura > 0 ? alturaObjetivo / altura : escalaFallback;

    return {
        id,
        nombre,
        arrays,
        escala,
        offsetY: (altura * escala) / 2,
        rotation: opciones.rotation,
        textureUrl: opciones.textureUrl,
    };
}

function prepararRoad(id, nombre, objRaw, mtlRaw, escala = 0.5, textureUrl = null) {
    const materials = loadMtl(mtlRaw);
    const { arrays } = centrarModelo(loadObj(objRaw, materials));

    return {
        id,
        nombre,
        arrays,
        escala,
        scale: { x: escala, y: escala, z: escala },
        offsetY: 0,
        textureUrl,
    };
}

function prepararDestino(id, nombre, objRaw, mtlRaw, opciones = {}) {
    const materials = loadMtl(mtlRaw);
    const { arrays, altura } = centrarModelo(loadObj(objRaw, materials));
    const escala = opciones.escala ?? 0.55;
    const scale = opciones.scale ?? { x: escala, y: escala, z: escala };
    const offsetY = opciones.offsetY ?? (altura * scale.y) / 2;

    // Seleccionar la textura declarada en el MTL (primer map_Kd que tengamos importado)
    const mapKds = Object.values(materials)
        .map((mat) => mat?.mapKd)
        .filter(Boolean);
    const textureLookup = {
        '6_rocktext.jpg.png': destinoTextureUrl,
        'lava.png': destinoLavaTextureUrl,
    };
    const textureUrl = mapKds.map((name) => textureLookup[name]).find(Boolean)
        ?? opciones.textureUrl
        ?? null;

    return {
        id,
        nombre,
        arrays,
        escala: scale.y,
        scale,
        offsetY,
        textureUrl,
        color: opciones.color,
        emissive: opciones.emissive ?? [1.0, 0.9, 0.8],
    };
}

function prepararModeloPlano(id, nombre, objRaw, mtlRaw, opciones = {}) {
    const materials = loadMtl(mtlRaw);
    const { arrays, altura } = centrarModelo(loadObj(objRaw, materials));
    const escala = opciones.escala ?? 0.5;
    const scale = opciones.scale ?? { x: escala, y: escala, z: escala };
    const offsetY = opciones.offsetY ?? (altura * scale.y) / 2;
    // Resolver textura desde map_Kd si existe
    const mapKds = Object.values(materials).map((mat) => mat?.mapKd).filter(Boolean);
    const textureUrl = mapKds.length > 0 ? opciones.textureMap?.[mapKds[0]] ?? opciones.textureUrl ?? null : opciones.textureUrl ?? null;

    return {
        id,
        nombre,
        arrays,
        escala: scale.y,
        scale,
        offsetY,
        textureUrl,
        color: opciones.color,
    };
}

// Cargar materiales para aplicar colores del MTL
const materialsTraffic = loadMtl(trafficLightMtl);

// Cargar, centrar y escalar 
const { arrays: trafficLightArrays, altura: alturaTraffic } = centrarModelo(loadObj(trafficLightObj, materialsTraffic));
const escalaTraffic = 0.003; // semáforos visibles pero discretos

const materialsGradas = loadMtl(gradasMtl);
const { arrays: gradasArrays, altura: alturaGradas } = centrarModelo(loadObj(gradasObj, materialsGradas));
const escalaGradas = 4;
const rotacionGradas = { x: -90, y: 0, z: 0 };

// Configuración por tipo para montañas (ajusta altura/ancho/largo por ID)
const mountainScaleOverrides = {
    mountainHill1: { alturaObjetivo: 6, anchoObjetivo: 3, largoObjetivo: 3 },
    mountainHill2: { alturaObjetivo: 5, anchoObjetivo: 3, largoObjetivo: 3 },
    mountainHill5: { alturaObjetivo: 5, anchoObjetivo: 1, largoObjetivo: 1 },
    mountainDesert1: { alturaObjetivo: 4, anchoObjetivo: 1, largoObjetivo: 3 },
    mountainDesert2: { alturaObjetivo: 4, anchoObjetivo: 5.5, largoObjetivo: 3.2 },
    mountainDesert3: {alturaObjetivo: 4, anchoObjetivo: 3.5, largoObjetivo: 3.2  },
    mountainDesert4: {alturaObjetivo: 4, anchoObjetivo: 3, largoObjetivo: 1.13  },
    mountainDesert5: { alturaObjetivo: 4, anchoObjetivo: 10, largoObjetivo: 1.15 },
    mountainDesert6: { alturaObjetivo: 4, anchoObjetivo: 5, largoObjetivo: 2 },
    mountainDesert7: { alturaObjetivo: 4, anchoObjetivo: 7, largoObjetivo: 1},
    mountainDesert8: { alturaObjetivo: 6, anchoObjetivo: 9, largoObjetivo: 1},
    mountainDesert9: { alturaObjetivo: 4, anchoObjetivo: 7, largoObjetivo: 1 },
};

// Arreglo de modelos listos para ser consumidos por los objetos de la escena
const modelos = [
    {
        id: 'trafficLight',
        nombre: 'Semaforo',
        arrays: trafficLightArrays,
        escala: escalaTraffic,
        offsetY: (alturaTraffic * escalaTraffic) / 2,
        textureUrl: trafficLightTextureUrl,
        rotation: { x: 0, y: 0, z: 90 },
    },
    prepararCarro('carSedan', 'Carro sedán', carSedanObj, carSedanMtl, {
        textureUrl: citybitsTextureUrl,
        partes: [
            { objRaw: carSedanWheelFrontLeftObj, mtlRaw: carSedanWheelFrontLeftMtl, compartirMateriales: true },
            { objRaw: carSedanWheelFrontRightObj, mtlRaw: carSedanWheelFrontRightMtl, compartirMateriales: true },
            { objRaw: carSedanWheelRearLeftObj, mtlRaw: carSedanWheelRearLeftMtl, compartirMateriales: true },
            { objRaw: carSedanWheelRearRightObj, mtlRaw: carSedanWheelRearRightMtl, compartirMateriales: true },
        ],
    }),
    prepararRoad('roadStraight', 'Camino recto', roadStraightObj, roadStraightMtl, 0.5, rockyTrailTextureUrl),
    prepararModeloPlano('tileZero', 'Tile Cero', tipoCeroObj, tipoCeroMtl, {
        escala: 1,
        textureMap: { '6_rocktext.jpg.png': tipoCeroTextureUrl },
        textureUrl: tipoCeroTextureUrl,
    }),
    prepararDestino('destination', 'Destino', destinoObj, destinoMtl, {
        escala: 0.55,
        textureUrl: destinoTextureUrl,
    }),
    {
        id: 'bleachers',
        nombre: 'Gradas',
        arrays: gradasArrays,
        escala: escalaGradas,
        offsetY: (alturaGradas * escalaGradas) / 2,
        color: [0.6, 0.6, 0.6, 1],
        rotation: rotacionGradas,
    },
    ...[
        { id: 'mountainHill1', nombre: 'Colina desierto 1', obj: hill1Obj, mtl: hill1Mtl },
        { id: 'mountainHill2', nombre: 'Colina desierto 2', obj: hill2Obj, mtl: hill2Mtl },
        { id: 'mountainHill5', nombre: 'Colina desierto 5', obj: hill5Obj, mtl: hill5Mtl },
        { id: 'mountainDesert1', nombre: 'Montaña desierto 1', obj: mtnDesert1Obj, mtl: mtnDesert1Mtl },
        { id: 'mountainDesert2', nombre: 'Montaña desierto 2', obj: mtnDesert2Obj, mtl: mtnDesert2Mtl },
        { id: 'mountainDesert3', nombre: 'Montaña desierto 3', obj: mtnDesert3Obj, mtl: mtnDesert3Mtl },
        { id: 'mountainDesert4', nombre: 'Montaña desierto 4', obj: mtnDesert4Obj, mtl: mtnDesert4Mtl },
        { id: 'mountainDesert5', nombre: 'Montaña desierto 5', obj: mtnDesert5Obj, mtl: mtnDesert5Mtl },
        { id: 'mountainDesert6', nombre: 'Montaña desierto 6', obj: mtnDesert6Obj, mtl: mtnDesert6Mtl },
        { id: 'mountainDesert7', nombre: 'Montaña desierto 7', obj: mtnDesert7Obj, mtl: mtnDesert7Mtl },
        { id: 'mountainDesert8', nombre: 'Montaña desierto 8', obj: mtnDesert8Obj, mtl: mtnDesert8Mtl },
        { id: 'mountainDesert9', nombre: 'Montaña desierto 9', obj: mtnDesert9Obj, mtl: mtnDesert9Mtl },
    ].map(({ id, nombre, obj, mtl }) =>
        prepararMontana(id, nombre, obj, mtl, mountainScaleOverrides[id] ?? {})
    ),
];

// Devuelve un modelo por su identificador
function getModelo(id) {
    return modelos.find((modelo) => modelo.id === id);
}

export { modelos, getModelo };
