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
const RED_LIGHT = [0.8, 0.1, 0.1, 1.0];
const GREEN_LIGHT = [0.1, 0.7, 0.1, 1.0];

const mapElements = {
    roads: [],
    destinations: [],
    obstacles: [],
    trafficLights: []
};

const mapMetadata = {
    width: 0,
    height: 0,
    map_file: ""
};

const initData = {
    mapFile: "2022_base.txt",
    NAgents: 0
};


function trafficLightColor(isGreen) {
    return isGreen ? GREEN_LIGHT : RED_LIGHT;
}

function buildObject(raw, color) {
    const object = new Object3D(raw.id, [raw.x, raw.y, raw.z]);
    object.color = color;
    object.state = raw.state;
    return object;
}

function refreshCollection(target, rawList, colorResolver) {
    target.length = 0;
    for (const raw of rawList) {
        const object = buildObject(raw, colorResolver(raw));
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

            refreshCollection(mapElements.roads, result.roads ?? [], () => ROAD_COLOR);
            refreshCollection(mapElements.destinations, result.destinations ?? [], () => DESTINATION_COLOR);
            refreshCollection(mapElements.obstacles, result.obstacles ?? [], () => OBSTACLE_COLOR);
            refreshCollection(mapElements.trafficLights, result.traffic_lights ?? [], (raw) => trafficLightColor(raw.state));
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
            const lights = result.traffic_lights ?? [];

            for (const light of lights) {
                const currentLight = mapElements.trafficLights.find((obj) => obj.id === light.id);
                if (currentLight != undefined) {
                    currentLight.state = light.state;
                    currentLight.color = trafficLightColor(light.state);
                }
            }
        }

    } catch (error) {
        console.log(error);
    }
}

export { mapElements, mapMetadata, initAgentsModel, getMap, update };
