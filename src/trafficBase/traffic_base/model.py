import json
from pathlib import Path

from mesa import Model
from mesa.discrete_space import OrthogonalMooreGrid

from .agent import *


class CityModel(Model):
    """
    Creates a model based on a city map.

    Args:
        N: Number of agents in the simulation
        seed: Random seed for the model
        map_file: Map filename relative to the city_files directory
    """

    def __init__(self, N, seed=42, map_file="2024_base.txt"):

        super().__init__(seed=seed)

        base_dir = Path(__file__).resolve().parent.parent  # trafficBase package root
        city_files_dir = base_dir / "city_files"

        dictionary_path = city_files_dir / "mapDictionary.json"
        if not dictionary_path.exists():
            raise FileNotFoundError(f"Map dictionary not found: {dictionary_path}")

        # Load the map dictionary. The dictionary maps the characters in the map file to the corresponding agent.
        with dictionary_path.open() as f:
            dataDictionary = json.load(f)

        map_path = city_files_dir / map_file
        if not map_path.exists():
            raise FileNotFoundError(f"Map file not found: {map_path}")

        self.num_agents = N
        self.traffic_lights = []

        # Load the map file. The map file is a text file where each character represents an agent.
        with map_path.open() as baseFile:
            lines = baseFile.readlines()
            if not lines:
                raise ValueError(f"Map file is empty: {map_path}")

            first_line = lines[0].rstrip("\n")
            self.width = len(first_line)
            self.height = len(lines)

            self.grid = OrthogonalMooreGrid(
                [self.width, self.height], capacity=100, torus=False
            )

            # Goes through each character in the map file and creates the corresponding agent.
            for r, row in enumerate(lines):
                row = row.rstrip("\n")
                for c, col in enumerate(row):

                    cell = self.grid[(c, self.height - r - 1)]

                    if col in ["v", "^", ">", "<"]:
                        agent = Road(self, cell, dataDictionary[col])

                    elif col in ["S", "s"]:
                        agent = Traffic_Light(
                            self,
                            cell,
                            False if col == "S" else True,
                            int(dataDictionary[col]),
                        )
                        self.traffic_lights.append(agent)

                    elif col == "#":
                        agent = Obstacle(self, cell)

                    elif col == "D":
                        agent = Destination(self, cell)

        self.running = True

    def step(self):
        """Advance the model by one step."""
        self.agents.shuffle_do("step")
