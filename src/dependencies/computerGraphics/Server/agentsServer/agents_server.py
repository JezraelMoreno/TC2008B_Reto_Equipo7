# TC2008B. Sistemas Multiagentes y Gráficas Computacionales
# Python flask server to interact with WebGL.
# Octavio Navarro. 2024

import sys
from pathlib import Path

from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin

# Locate the trafficBase package (now under src/trafficBase).
_HERE = Path(__file__).resolve()
_CANDIDATE_PATHS = [
    _HERE.parents[4] / "trafficBase",                     # <repo>/src/trafficBase
    _HERE.parents[3] / "mesaExamples" / "trafficBase",    # legacy location
]
TRAFFIC_BASE_PATH = next((p for p in _CANDIDATE_PATHS if p.exists()), None)
if TRAFFIC_BASE_PATH is None:
    raise ImportError("Unable to locate trafficBase package")

if str(TRAFFIC_BASE_PATH) not in sys.path:
    sys.path.append(str(TRAFFIC_BASE_PATH))

from traffic_base.model import CityModel
from traffic_base.agent import Car, Traffic_Light, Road, Destination, Obstacle, Gradas


# Model defaults
cityModel = None
currentStep = 0
default_map = "2025_base.txt"


# This application will be used to interact with WebGL
app = Flask("Traffic example")
cors = CORS(app, resources={r"/*": {"origins": ["http://localhost", "http://localhost:5173"]}})


def _serialize_agents(agent_type, include_state=False, include_direction=False, include_kind=False):
    """
    Recorre toda la grilla y devuelve una lista serializada de agentes del tipo
    solicitado. Se usa un ID estable por agente cuando es posible, de lo contrario
    se deriva de su posición actual.
    """
    serialized_agents = []

    if cityModel is None:
        return serialized_agents

    for x in range(cityModel.width):
        for y in range(cityModel.height):
            cell = cityModel.grid[(x, y)]
            if not cell or not getattr(cell, "agents", None):
                continue

            for agent in cell.agents:
                if not isinstance(agent, agent_type):
                    continue

                agent_id = getattr(agent, "unique_id", None) or f"{agent_type.__name__.lower()}-{x}-{y}"
                agent_json = {
                    "id": agent_id,
                    "x": x,
                    "y": 1,
                    "z": y,
                }

                if include_state:
                    agent_json["state"] = bool(getattr(agent, "state", False))

                if include_direction:
                    agent_json["direction"] = getattr(agent, "direction", None)

                if include_kind:
                    agent_json["kind"] = getattr(agent, "kind", None)

                serialized_agents.append(agent_json)

    return serialized_agents


# This route will be used to send the parameters of the simulation to the server.
# The server expects a POST request with the parameters in JSON.
@app.route('/init', methods=['GET', 'POST'])
@cross_origin()
def initModel():
    global currentStep, cityModel, default_map

    map_file = default_map
    num_agents = 0
    seed = 42
    spawn_interval = 10
    cars_per_spawn = 1

    if request.method == 'POST':
        try:
            payload = request.get_json(force=True, silent=True) or {}
            num_agents = int(payload.get('NAgents', 0))
            map_file = payload.get('mapFile', map_file)
            seed = int(payload.get('seed', seed))
            spawn_interval = int(payload.get('spawn_interval', payload.get('spawnInterval', spawn_interval)))
            cars_per_spawn = int(payload.get('cars_per_spawn', payload.get('carsPerSpawn', cars_per_spawn)))
            currentStep = 0

        except Exception as e:
            print(e)
            return jsonify({"message": "Error initializing the model"}), 500

    try:
        cityModel = CityModel(
            num_agents,
            seed=seed,
            map_file=map_file,
            spawn_interval=spawn_interval,
            cars_per_spawn=cars_per_spawn
        )
    except FileNotFoundError as e:
        print(e)
        return jsonify({"message": str(e)}), 400
    except Exception as e:
        print(e)
        return jsonify({"message": "Error initializing the CityModel"}), 500

    print(f"City model ready. Map: {map_file}, Size: {cityModel.width}x{cityModel.height}")

    return jsonify({
        "message": f"City model initiated with map {map_file}",
        "width": cityModel.width,
        "height": cityModel.height,
        "map_file": map_file,
        "spawn_interval": spawn_interval,
        "cars_per_spawn": cars_per_spawn,
    })


# This route will be used to get the positions for the map
@app.route('/getMap', methods=['GET'])
@cross_origin()
def getMap():
    global cityModel

    if cityModel is None:
        return jsonify({"message": "Model not initialized"}), 400

    try:
        roads = _serialize_agents(Road, include_direction=True)
        destinations = _serialize_agents(Destination)
        obstacles = _serialize_agents(Obstacle, include_kind=True)
        gradas = _serialize_agents(Gradas)
        traffic_lights = _serialize_agents(Traffic_Light, include_state=True)
        cars = _serialize_agents(Car)

        return jsonify({
            'width': cityModel.width,
            'height': cityModel.height,
            'roads': roads,
            'destinations': destinations,
            'obstacles': obstacles,
            'gradas': gradas,
            'traffic_lights': traffic_lights,
            'cars': cars
        })
    except Exception as e:
        print(e)
        return jsonify({"message": "Error with the map data"}), 500


# This route will be used to update the model
@app.route('/update', methods=['GET'])
@cross_origin()
def updateModel():
    global currentStep, cityModel

    if cityModel is None:
        return jsonify({"message": "Model not initialized"}), 400

    if request.method == 'GET':
        try:
            cityModel.step()
            currentStep += 1
            traffic_lights = _serialize_agents(Traffic_Light, include_state=True)
            cars = _serialize_agents(Car)

            return jsonify({
                'message': f'Model updated to step {currentStep}.',
                'currentStep': currentStep,
                'traffic_lights': traffic_lights,
                'cars': cars,
                'cars_created': getattr(cityModel, "total_cars_created", 0),
                'cars_arrived': getattr(cityModel, "total_cars_arrived", 0),
            })
        except Exception as e:
            print(e)
            return jsonify({"message": "Error during step."}), 500


@app.route('/cars', methods=['GET'])
@cross_origin()
def getCars():
    """
    Devuelve la lista completa de carros en la escena sin avanzar el modelo.
    Pensado para inicializar el estado en el cliente WebGL.
    """
    if cityModel is None:
        return jsonify({"message": "Model not initialized"}), 400

    try:
        cars = _serialize_agents(Car)
        return jsonify({
            "cars": cars,
            "count": len(cars),
        })
    except Exception as e:
        print(e)
        return jsonify({"message": "Error while collecting cars"}), 500


if __name__=='__main__':
    # Run the flask server in port 8585
    app.run(host="localhost", port=8585, debug=True)
