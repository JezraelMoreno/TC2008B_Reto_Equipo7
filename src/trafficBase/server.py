from traffic_base.agent import *
from traffic_base.model import CityModel

from mesa.visualization import SolaraViz, make_space_component, make_plot_component
from mesa.visualization.components import AgentPortrayalStyle


def agent_portrayal(agent):

    if agent is None:
        return

    portrayal = AgentPortrayalStyle(
        marker="s",
    )

    if isinstance(agent, Car):
        portrayal.color = "blue"

    if isinstance(agent, Road):
        portrayal.color = "#aaa"

    if isinstance(agent, Destination):
        portrayal.color = "lightgreen"

    if isinstance(agent, Traffic_Light):
        portrayal.color = "red" if not agent.state else "green"

    if isinstance(agent, Obstacle):
        portrayal.color = "#555"

    return portrayal


def post_process(ax):
    ax.set_aspect("equal")


model_params = {
    "N": 5,
    "seed": {
        "type": "InputText",
        "value": 42,
        "label": "Random Seed",
    },

    "spawn_interval": {
        "type": "SliderInt",
        "value": 10,
        "label": "Intervalo de spawn",
        "min": 0,
        "max": 25,
        "step": 1,
    },
    
    "cars_per_spawn": {
        "type": "SliderInt",
        "value": 1,
        "label": "Coches por spawn",
        "min": 1,
        "max": 4,
        "step": 1,
    },
}

model = CityModel(model_params["N"])

space_component = make_space_component(
    agent_portrayal, draw_grid=False, post_process=post_process
)

# Crear las 3 gráficas usando make_plot_component
chart_total_created = make_plot_component(
    {"Total Creados": "blue"}
)

chart_active_cars = make_plot_component(
    {"Coches Activos": "green"}
)

chart_arrived = make_plot_component(
    {"Total Llegados": "orange"}
)

page = SolaraViz(
    model,
    components=[space_component, chart_total_created, chart_active_cars, chart_arrived],
    model_params=model_params,
    name="Traffic Simulation",
)