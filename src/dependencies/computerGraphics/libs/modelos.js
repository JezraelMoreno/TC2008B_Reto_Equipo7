/*
 * Arreglos para objetos en OBJ y sus mtl.
 */

'use strict';

import { loadObj, loadMtl } from './obj_loader';
import citybitsTextureUrl from '../assets/modelos/calle/citybits_texture.png';

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
import mtnDesert6Obj from '../assets/modelos/Montañas/obj/Mountain_desert_006.obj?raw';
import mtnDesert6Mtl from '../assets/modelos/Montañas/obj/Mountain_desert_006.mtl?raw';
import gradasObj from '../assets/modelos/gradas/bleachers_v1_L1.123c489e84b7-a282-451c-9689-6412d8ec0dac/gradas_mod.obj?raw';
import gradasMtl from '../assets/modelos/gradas/bleachers_v1_L1.123c489e84b7-a282-451c-9689-6412d8ec0dac/gradas_mod.mtl?raw';

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
        return { arrays, altura: 0 };
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
    return { arrays, altura };
}

function prepararMontana(id, nombre, objRaw, mtlRaw, alturaObjetivo = 0.5) {
    const materials = loadMtl(mtlRaw);
    const { arrays, altura } = centrarModelo(loadObj(objRaw, materials));
    const escala = altura > 0 ? alturaObjetivo / altura : 0.0015;
    const yLift = 0.08; // ligera elevación para que no queden hundidas

    return {
        id,
        nombre,
        arrays,
        escala,
        offsetY: (altura * escala) / 2 + yLift,
        color: [0.45, 0.4, 0.36, 1],
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

// Cargar materiales para aplicar colores del MTL
const materialsTraffic = loadMtl(trafficLightMtl);

// Cargar, centrar y escalar 
const { arrays: trafficLightArrays, altura: alturaTraffic } = centrarModelo(loadObj(trafficLightObj, materialsTraffic));
const escalaTraffic = 0.003; // semáforos visibles pero discretos

const materialsGradas = loadMtl(gradasMtl);
const { arrays: gradasArrays, altura: alturaGradas } = centrarModelo(loadObj(gradasObj, materialsGradas));
const escalaGradas = 4;
const rotacionGradas = { x: -90, y: 0, z: 0 };

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
    prepararRoad('roadStraight', 'Camino recto', roadStraightObj, roadStraightMtl, 0.5, citybitsTextureUrl),
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
        { id: 'mountainDesert6', nombre: 'Montaña desierto 6', obj: mtnDesert6Obj, mtl: mtnDesert6Mtl },
    ].map(({ id, nombre, obj, mtl }) => prepararMontana(id, nombre, obj, mtl)),
];

// Devuelve un modelo por su identificador
function getModelo(id) {
    return modelos.find((modelo) => modelo.id === id);
}

export { modelos, getModelo };
