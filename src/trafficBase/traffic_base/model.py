from mesa import Model
from mesa.discrete_space import OrthogonalMooreGrid
from mesa.datacollection import DataCollector
from traffic_base.agent import *
import json
import random
import math


class CityModel(Model):
    """
    Creates a model based on a city map.

    Args:
        N: Number of agents in the simulation
        seed: Random seed for the model
        spawn_interval: Steps between car spawns
        cars_per_spawn: Number of cars to spawn each time
    """

    def __init__(self, N=4, seed=42, spawn_interval=10, cars_per_spawn=1):

        super().__init__(seed=seed)

        # Load the map dictionary
        dataDictionary = json.load(open("city_files/mapDictionary.json"))

        self.num_agents = N
        self.traffic_lights = []
        self.destinations = []
        self.roads = []
        self.spawn_interval = spawn_interval
        self.cars_per_spawn = cars_per_spawn
        self.next_spawn_step = spawn_interval
        self.total_cars_created = 0
        self.total_cars_arrived = 0
        self.consecutive_failed_spawns = 0  # Nuevo contador
        self.max_failed_spawns = 5  # Número de intentos fallidos antes de terminar
        self.gradas = []
        obstacle_symbols = {
            "#", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
            "a", "b", "c", "A", "B", "C",
        }

        # Load the map file
        with open("city_files/2025_base.txt") as baseFile:
            lines = baseFile.readlines()
            self.width = len(lines[0].strip())
            self.height = len(lines)

            self.grid = OrthogonalMooreGrid(
                [self.width, self.height], capacity=100, torus=False
            )

            # Goes through each character in the map file and creates the corresponding agent
            for r, row in enumerate(lines):
                for c, col in enumerate(row.strip()):

                    cell = self.grid[(c, self.height - r - 1)]

                    if col in ["v", "^", ">", "<"]:
                        agent = Road(self, cell, dataDictionary[col])
                        self.roads.append(agent)

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
                        self.destinations.append(agent)
                        print(f"Destino encontrado en posición: {cell.coordinate}")

        print(f"Total de destinos cargados: {len(self.destinations)}")
        
        # Crear DataCollector para las gráficas
        self.datacollector = DataCollector(
            model_reporters={
                "Total Creados": lambda m: m.total_cars_created,
                "Coches Activos": lambda m: sum(1 for agent in m.agents if isinstance(agent, Car)),
                "Total Llegados": lambda m: m.total_cars_arrived,
            }
        )
        
        # Crear los coches iniciales
        self.create_cars()
        
        self.running = True

    def get_corners(self):
        """Retorna las 4 esquinas exactas del mapa"""
        corners = [
            (0, 0),
            (self.width - 1, 0),
            (0, self.height - 1),
            (self.width - 1, self.height - 1)
        ]
        return corners

    def find_nearest_road(self, corner):
        """
        Encuentra el Road más cercano a una esquina.
        Busca en espiral expandiendo desde la esquina.
        """
        max_search_radius = max(self.width, self.height)
        
        for radius in range(max_search_radius):
            for dx in range(-radius, radius + 1):
                for dy in range(-radius, radius + 1):
                    if abs(dx) != radius and abs(dy) != radius:
                        continue
                    
                    x = corner[0] + dx
                    y = corner[1] + dy
                    
                    if 0 <= x < self.width and 0 <= y < self.height:
                        if self.is_valid_road((x, y)):
                            direction = self.get_road_direction((x, y))
                            print(f"Road encontrado en {(x, y)} dirección: {direction}")
                            return (x, y)
        
        print(f"No se encontró road cerca de {corner}")
        return corner

    def create_cars(self):
        """Crea 4 coches iniciales, uno en cada esquina del mapa"""
        corners = self.get_corners()
        
        print(f"\n=== INICIALIZANDO COCHES ===")
        print(f"Esquinas del mapa: {corners}")
        print(f"Dimensiones: {self.width}x{self.height}")
        print(f"Creando 4 coches iniciales (uno por esquina)")
        
        for i in range(4):
            corner = corners[i]
            position = self.find_nearest_road(corner)
            
            # Verificar que sea válido
            if not self.is_valid_road(position):
                print(f"Posición {position} no es válida para coche")
                continue
            
            cell = self.grid[position]
            
            car = Car(self, position)
            car.cell = cell
            self.total_cars_created += 1
            
            print(f"Coche {self.total_cars_created} creado en posición {position}")
    
    def spawn_new_cars(self):
        """
        Crea múltiples coches nuevos en las esquinas según cars_per_spawn.
        Retorna el número de coches creados exitosamente.
        """
        corners = self.get_corners()
        spawned = 0
        available_corners = []
        
        # Primero, identificar qué esquinas están disponibles
        for corner in corners:
            position = self.find_nearest_road(corner)
            
            if not self.is_valid_road(position):
                continue
            
            cell = self.grid[position]
            agents_in_cell = list(cell.agents)
            
            # Verificar si la esquina está disponible
            if not any(isinstance(agent, Car) for agent in agents_in_cell):
                available_corners.append((corner, position))
        
        # Si no hay esquinas disponibles
        if len(available_corners) == 0:
            print(f"No hay esquinas disponibles para spawn en step {self.steps}")
            self.consecutive_failed_spawns += 1
            
            # Solo terminar si han fallado múltiples intentos consecutivos
            if self.consecutive_failed_spawns >= self.max_failed_spawns:
                print(f"\nSIMULACION TERMINADA: {self.max_failed_spawns} intentos consecutivos sin poder crear coches")
                print(f"Estadisticas finales:")
                print(f"   - Total coches creados: {self.total_cars_created}")
                print(f"   - Total coches que llegaron: {self.total_cars_arrived}")
                active_cars = sum(1 for agent in self.agents if isinstance(agent, Car))
                print(f"   - Coches activos antes de eliminar: {active_cars}")
                
                # Eliminar todos los coches activos
                cars_to_remove = [agent for agent in self.agents if isinstance(agent, Car)]
                for car in cars_to_remove:
                    car.remove()
                
                print(f"   - Todos los coches han sido eliminados")
                self.running = False
            
            return 0
        
        # Intentar crear coches en esquinas disponibles
        for i in range(min(self.cars_per_spawn, len(available_corners))):
            # Usar el índice total de coches creados para rotar entre esquinas disponibles
            corner_index = self.total_cars_created % len(available_corners)
            corner, position = available_corners[corner_index]
            
            cell = self.grid[position]
            
            # Doble verificación (por si acaso otro coche se movió aquí)
            agents_in_cell = list(cell.agents)
            if any(isinstance(agent, Car) for agent in agents_in_cell):
                print(f"Esquina {position} ocupada en último momento")
                continue
            
            car = Car(self, position)
            car.cell = cell
            self.total_cars_created += 1
            spawned += 1
            
            print(f"Nuevo coche {self.total_cars_created} spawneado en posición {position} (esquina {corner})")
        
        # Si spawneamos exitosamente, resetear el contador de fallos
        if spawned > 0:
            self.consecutive_failed_spawns = 0
        
        return spawned
            
    def heuristic(self, pos1, pos2):
        """Calcula la distancia Manhattan"""
        return abs(pos1[0] - pos2[0]) + abs(pos1[1] - pos2[1])

    def is_valid_road(self, pos):
        """Verifica si una posición es un camino válido (Road, Traffic_Light o Destination)"""
        if not (0 <= pos[0] < self.width and 0 <= pos[1] < self.height):
            return False
        
        cell = self.grid[pos]
        agents_in_cell = list(cell.agents)
        
        if any(isinstance(agent, Obstacle) for agent in agents_in_cell):
            return False
        
        return any(isinstance(agent, (Road, Traffic_Light, Destination)) 
                for agent in agents_in_cell)

    def get_road_direction(self, pos):
        """Obtiene la dirección del Road en una posición dada"""
        if not (0 <= pos[0] < self.width and 0 <= pos[1] < self.height):
            return None
        
        cell = self.grid[pos]
        agents_in_cell = list(cell.agents)
        
        for agent in agents_in_cell:
            if isinstance(agent, Road):
                return agent.direction
        
        # Traffic lights y destinations permiten todas las direcciones
        if any(isinstance(agent, (Traffic_Light, Destination)) for agent in agents_in_cell):
            return "All"
        
        return None

    def is_move_allowed_by_road(self, current_pos, next_pos):
        """
        Verifica que el movimiento respete la dirección del Road.
        SOLO VERIFICA LA DIRECCION, NO BLOQUEA TOTALMENTE.
        """
        current_direction = self.get_road_direction(current_pos)
        
        # Si no hay dirección o es "All", permitir movimiento
        if not current_direction or current_direction == "All":
            return True
        
        # Calcular el movimiento
        dx = next_pos[0] - current_pos[0]
        dy = next_pos[1] - current_pos[1]
        
        # Verificar según la dirección del Road
        if current_direction == "Right":
            return dx >= 0  # Derecha o permanecer (más permisivo)
        elif current_direction == "Left":
            return dx <= 0  # Izquierda o permanecer
        elif current_direction == "Up":
            return dy >= 0  # Arriba o permanecer
        elif current_direction == "Down":
            return dy <= 0  # Abajo o permanecer
        
        return True  # Por defecto permitir

    def get_allowed_moves(self, pos, direction):
        """
        Retorna movimientos permitidos según la dirección del Road.
        MÁS PERMISIVO: Permite movimientos perpendiculares para cambiar de carril.
        
        Args:
            pos: Posición actual
            direction: Dirección del road
        
        Returns:
            Lista de tuplas (dx, dy, cost)
        """
        moves = []
        
        if direction == "Right":
            # Prioridad: derecha, luego perpendiculares
            moves = [
                (1, 0, 1.0),    # Derecha (principal)
                (0, 1, 2.0),    # Arriba (cambio de carril)
                (0, -1, 2.0),   # Abajo (cambio de carril)
            ]
        elif direction == "Left":
            moves = [
                (-1, 0, 1.0),   # Izquierda (principal)
                (0, 1, 2.0),    # Arriba (cambio de carril)
                (0, -1, 2.0),   # Abajo (cambio de carril)
            ]
        elif direction == "Up":
            moves = [
                (0, 1, 1.0),    # Arriba (principal)
                (1, 0, 2.0),    # Derecha (cambio de carril)
                (-1, 0, 2.0),   # Izquierda (cambio de carril)
            ]
        elif direction == "Down":
            moves = [
                (0, -1, 1.0),   # Abajo (principal)
                (1, 0, 2.0),    # Derecha (cambio de carril)
                (-1, 0, 2.0),   # Izquierda (cambio de carril)
            ]
        elif direction == "All":
            # En intersecciones/semáforos, permitir todas las direcciones
            moves = [
                (0, 1, 1.0), (0, -1, 1.0), 
                (1, 0, 1.0), (-1, 0, 1.0)
            ]
        else:
            # Default: permitir 4 direcciones
            moves = [
                (0, 1, 1.0), (0, -1, 1.0), 
                (1, 0, 1.0), (-1, 0, 1.0)
            ]
        
        return moves

    def get_cell_weight(self, pos, avoid_cars=True):
        """
        Obtiene el peso adicional de una celda según el tipo de agente.
        """
        cell = self.grid[pos]
        agents_in_cell = list(cell.agents)
        
        weight = 0
        
        for agent in agents_in_cell:
            if isinstance(agent, Traffic_Light):
                weight += agent.timeToChange * 0.3
            elif isinstance(agent, Destination):
                weight += 0
            elif isinstance(agent, Car) and avoid_cars:
                has_destination = any(isinstance(a, Destination) for a in agents_in_cell)
                if not has_destination:
                    weight += 50
        
        return weight

    def find_path(self, start, end, avoid_cars=True):
        """
        Implementa A* que respeta direcciones pero permite exploración.
        MÁS PERMISIVO en pathfinding, restricciones aplicadas en movimiento real.
        """
        if start == end:
            return [end]
        
        print(f"\nPATHFINDING: {start} -> {end}")
        
        open_set = [(0, start)]
        came_from = {}
        g_score = {start: 0}
        f_score = {start: self.heuristic(start, end)}
        visited = set()
        
        iterations = 0
        max_iterations = self.width * self.height * 20  # Más iteraciones
        
        while open_set and iterations < max_iterations:
            iterations += 1
            
            # Encontrar el nodo con menor f_score
            min_idx = 0
            for i in range(len(open_set)):
                if open_set[i][0] < open_set[min_idx][0]:
                    min_idx = i
            
            current_f, current = open_set.pop(min_idx)
            
            if current == end:
                # Reconstruir el camino
                path = []
                while current in came_from:
                    path.append(current)
                    current = came_from[current]
                path.reverse()
                print(f"Camino encontrado: {len(path)} pasos, {iterations} iteraciones")
                return path
            
            visited.add(current)
            
            # Obtener la dirección del Road actual
            current_direction = self.get_road_direction(current)
            
            if current_direction is None:
                continue
            
            # Obtener movimientos permitidos
            allowed_moves = self.get_allowed_moves(current, current_direction)
            
            # Explorar vecinos
            for dx, dy, move_cost in allowed_moves:
                neighbor = (current[0] + dx, current[1] + dy)
                
                # Verificar que el vecino sea válido
                if neighbor in visited or not self.is_valid_road(neighbor):
                    continue
                
                # Calcular costo del movimiento
                cell_weight = self.get_cell_weight(neighbor, avoid_cars=avoid_cars)
                
                # Penalizar movimientos contra-flujo pero NO bloquearlos
                penalty = 0
                neighbor_direction = self.get_road_direction(neighbor)
                if neighbor_direction and neighbor_direction != "All":
                    # Si el vecino tiene dirección opuesta, penalizar fuertemente
                    if (neighbor_direction == "Right" and dx < 0) or \
                        (neighbor_direction == "Left" and dx > 0) or \
                        (neighbor_direction == "Up" and dy < 0) or \
                        (neighbor_direction == "Down" and dy > 0):
                        penalty = 100  # Penalizar pero no prohibir
                
                tentative_g = g_score[current] + move_cost + cell_weight + penalty
                
                if neighbor not in g_score or tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    new_f = tentative_g + self.heuristic(neighbor, end)
                    f_score[neighbor] = new_f
                    open_set.append((new_f, neighbor))
        
        print(f"No se encontró camino después de {iterations} iteraciones")
        print(f"Start direction: {self.get_road_direction(start)}")
        print(f"End direction: {self.get_road_direction(end)}")
        return []

    def step(self):
        """Advance the model by one step."""
        # Recolectar datos para las gráficas
        self.datacollector.collect(self)
        
        # Verificar si es momento de crear nuevos coches
        if self.spawn_interval > 0 and self.steps >= self.next_spawn_step:
            spawned_count = self.spawn_new_cars()
            
            # Siempre programar el siguiente spawn, incluso si no se pudo crear ningún coche
            self.next_spawn_step = self.steps + self.spawn_interval
            
            # Si no se pudo crear ningún coche, no terminar inmediatamente
            # El contador consecutive_failed_spawns maneja esto
        
        # Ejecutar step de Traffic_Lights
        for agent in self.traffic_lights:
            agent.step()
        
        # Ejecutar step de los Cars
        cars = [agent for agent in self.agents if isinstance(agent, Car)]
        self.random.shuffle(cars)
        for car in cars:
            car.step()
        
        # Imprimir estadísticas cada 50 steps
        if self.steps % 50 == 0:
            active_cars = sum(1 for agent in self.agents if isinstance(agent, Car))
            print(f"\nStep {self.steps} - Coches activos: {active_cars} | Creados: {self.total_cars_created} | Llegaron: {self.total_cars_arrived}")
