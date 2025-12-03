/*
 * Functions to connect to an external API to get the city map and traffic lights
 * from the trafficBase model.
 */


'use strict';

import { Object3D } from '../libs/object3d';

// Define the agent server URI
const agent_server_uri = "http://localhost:8585/";

// Colors for each type of object
const ROAD_COLOR = [0.3, 0.3, 0.3, 1.0];
const DESTINATION_COLOR = [0.2, 0.6, 0.35, 1.0];
const OBSTACLE_COLOR = [0.15, 0.15, 0.15, 1.0];
const GRADAS_COLOR = [0.25, 0.25, 0.25, 1.0];
const CAR_COLOR = [0.1, 0.5, 0.9, 1.0];
const RED_LIGHT = [1.0, 1.0, 1.0, 1.0]; // Neutral to let texture show
const GREEN_LIGHT = [1.0, 1.0, 1.0, 1.0];

const mapElements = {
    roads: [],
    destinations: [],
    obstacles: [],
    gradas: [],
    trafficLights: [],
    cars: [],
};

const mapMetadata = {
    width: 0,
    height: 0,
    map_file: ""
};

const initData = {
    mapFile: "2025_base.txt",
    NAgents: 0
};

function orientCarByMovement(car) {
    if (!car.prevPosition || !car.targetPosition) return;
    const dx = car.targetPosition.x - car.prevPosition.x;
    const dz = car.targetPosition.z - car.prevPosition.z;
    const mag = Math.hypot(dx, dz);
    if (mag < 1e-4) return;

    const yawDeg = Math.atan2(dx, dz) * 180 / Math.PI; // 0° mira hacia +Z
    const baseYaw = car.baseYaw ?? 0;
    car.rotDeg.y = yawDeg + baseYaw;
    car.rotRad.y = car.rotDeg.y * Math.PI / 180;
}


function trafficLightColor(isGreen) {
    return isGreen ? GREEN_LIGHT : RED_LIGHT;
}

function buildObject(raw, color) {
    const object = new Object3D(raw.id, [raw.x, raw.y, raw.z]);
    object.color = color;
    object.state = raw.state;
    object.direction = raw.direction;
    return object;
}

function refreshCollection(target, rawList, colorResolver, options = {}) {
    // Mantener referencias existentes cuando sea posible para no perder los VAOs
    const previous = new Map(target.map((obj) => [obj.id, obj]));
    target.length = 0;
    const { onUpdate } = options;

    for (const raw of rawList) {
        const existing = previous.get(raw.id);
        const object = existing ?? buildObject(raw, colorResolver(raw, existing));
        object.setPosition([raw.x, raw.y, raw.z]);
        object.color = colorResolver(raw, existing);
        object.state = raw.state;
        object.direction = raw.direction ?? object.direction;
        if (onUpdate) {
            onUpdate(object, raw, existing);
        }
        target.push(object);
    }
}


/*
 * Initializes the city model by sending a POST request to the agent server.
 */
async function initAgentsModel() {
    try {
        let response = await fetch(agent_server_uri + "init", {
            method: 'POST',
            headers: { 'Content-Type':'application/json' },
            body: JSON.stringify(initData)
        });

        if (response.ok) {
            let result = await response.json();
            mapMetadata.width = result.width;
            mapMetadata.height = result.height;
            mapMetadata.map_file = result.map_file;
            console.log(result.message);
            return result;
        }

    } catch (error) {
        console.log(error);
    }
}


/*
 * Retrieves all the map data (roads, destinations, obstacles, traffic lights).
 */
async function getMap() {
    try {
        let response = await fetch(agent_server_uri + "getMap");

        if (response.ok) {
            let result = await response.json();

            mapMetadata.width = result.width ?? mapMetadata.width;
            mapMetadata.height = result.height ?? mapMetadata.height;
            mapMetadata.map_file = result.map_file ?? mapMetadata.map_file;

            refreshCollection(mapElements.roads, result.roads ?? [], () => ROAD_COLOR);
            refreshCollection(mapElements.destinations, result.destinations ?? [], () => DESTINATION_COLOR);
            refreshCollection(mapElements.obstacles, result.obstacles ?? [], () => OBSTACLE_COLOR, {
                onUpdate: (object, raw) => {
                    object.kind = raw.kind;
                    object.modelId = raw.kind;
                },
            });
            refreshCollection(mapElements.gradas, result.gradas ?? [], () => GRADAS_COLOR);
            refreshCollection(mapElements.trafficLights, result.traffic_lights ?? [], (raw) => trafficLightColor(raw.state));
            refreshCollection(mapElements.cars, result.cars ?? [], () => CAR_COLOR, {
                onUpdate: orientCarByMovement,
            });
            return result;
        }

    } catch (error) {
        console.log(error);
    }
}


/*
 * Updates only the traffic lights after each simulation step.
 */
async function update() {
    try {
        let response = await fetch(agent_server_uri + "update");

        if (response.ok) {
            let result = await response.json();
            refreshCollection(mapElements.trafficLights, result.traffic_lights ?? [], (raw) => trafficLightColor(raw.state));
            refreshCollection(mapElements.cars, result.cars ?? [], () => CAR_COLOR, {
                onUpdate: orientCarByMovement,
            });
            return result;
        }

    } catch (error) {
        console.log(error);
    }
}

export { mapElements, mapMetadata, initAgentsModel, getMap, update };
