from mesa.discrete_space import CellAgent, FixedAgent
import random

class Car(CellAgent):
    """
    Agent that moves following a path to a destination.
    RESPETA las direcciones del Road con flexibilidad.
    Se elimina al llegar a su destino.
    """
    def __init__(self, model, corner_position, destination=None, car_id=None):
        """
        Creates a new car agent.
        Args:
            model: Model reference for the agent
            corner_position: The initial corner position of the agent
            destination: The destination of the agent, selected randomly if None
        """
        super().__init__(model)
        # ID estable para poder rastrear el coche desde la visualización
        self.unique_id = car_id if car_id is not None else id(self)
        self.corner_position = corner_position
        self.destination = destination or self.select_random_destination()
        self.path = []
        self.path_index = 0
        self.moves_count = 0
        self.stuck_counter = 0
        self.last_position = None
        self.recalculate_threshold = 10
        self.wait_counter = 0
        
        if self.destination:
            print(f"coche creado en {corner_position}, destino: {self.destination.cell.coordinate}")
    
    def select_random_destination(self):
        """
        Selects a random destination from the available destinations in the model.
        Returns:
            A randomly selected destination agent.
        """
        if self.model.destinations:
            dest = random.choice(self.model.destinations)
            return dest
        return None
    
    def calculate_path(self):
        """
        Calcula el path al destino usando A* que respeta direcciones.
        """
        if not self.destination or not self.cell:
            print(f"No se puede calcular path: destination={self.destination}, cell={self.cell}")
            return
        
        start = self.cell.coordinate
        end = self.destination.cell.coordinate
        
        print(f"Calculando camino desde {start} hasta {end}")
        self.path = self.model.find_path(start, end)
        self.path_index = 0
        
        if self.path:
            print(f"Camino encontrado con {len(self.path)} pasos")
            # Mostrar primeros 5 pasos del camino
            preview = self.path[:5]
            print(f"   Primeros pasos: {preview}")
        else:
            print(f"No se encontró camino desde {start} hasta {end}")

    def can_move_to(self, next_pos):
        """
        Verifica si el coche puede moverse a la siguiente posición.
        VERIFICA dirección pero es más permisivo.
        """
        if not (0 <= next_pos[0] < self.model.width and 
                0 <= next_pos[1] < self.model.height):
            return False
        
        if not self.cell:
            return False
        
        current_pos = self.cell.coordinate
        next_cell = self.model.grid[next_pos]
        agents_in_cell = list(next_cell.agents)
        
        # Permitir llegada a destino
        if any(isinstance(agent, Destination) for agent in agents_in_cell):
            if any(isinstance(agent, Obstacle) for agent in agents_in_cell):
                return False
            return True
        
        # Verificar si hay un obstáculo
        if any(isinstance(agent, (Obstacle, Gradas)) for agent in agents_in_cell):
            return False
        
        # Verificar semáforo en rojo
        for agent in agents_in_cell:
            if isinstance(agent, Traffic_Light) and not agent.state:
                return False
        
        # Verificar si hay otro coche
        if any(isinstance(agent, Car) and agent != self for agent in agents_in_cell):
            return False
        
        # Verificar dirección (pero no bloquear totalmente)
        # Esta verificación es más laxa que en pathfinding
        if not self.model.is_move_allowed_by_road(current_pos, next_pos):
            # Solo rechazar si va completamente contra el flujo
            current_dir = self.model.get_road_direction(current_pos)
            dx = next_pos[0] - current_pos[0]
            dy = next_pos[1] - current_pos[1]
            
            # Rechazar solo movimientos claramente incorrectos
            if current_dir == "Right" and dx < 0:
                return False
            elif current_dir == "Left" and dx > 0:
                return False
            elif current_dir == "Up" and dy < 0:
                return False
            elif current_dir == "Down" and dy > 0:
                return False
        
        return True

    def find_alternative_move(self):
        """
        Busca un movimiento alternativo válido.
        """
        if not self.cell or not self.destination:
            return None
        
        current_pos = self.cell.coordinate
        dest_pos = self.destination.cell.coordinate
        
        # Obtener dirección del road actual
        current_direction = self.model.get_road_direction(current_pos)
        if not current_direction:
            return None
        
        # Obtener movimientos permitidos según la dirección
        allowed_moves = self.model.get_allowed_moves(current_pos, current_direction)
        
        neighbors = []
        for dx, dy, cost in allowed_moves:
            new_pos = (current_pos[0] + dx, current_pos[1] + dy)
            
            if (0 <= new_pos[0] < self.model.width and 
                0 <= new_pos[1] < self.model.height and
                self.model.is_valid_road(new_pos) and
                self.can_move_to(new_pos)):
                
                dist = self.model.heuristic(new_pos, dest_pos)
                neighbors.append((new_pos, dist))
        
        if neighbors:
            neighbors.sort(key=lambda x: x[1])
            return neighbors[0][0]
        
        return None

    def step(self):
        """ 
        Determines the new direction it will take, and then moves.
        Se elimina al llegar a destino.
        """
        # Verificar si ya está en destino
        if self.cell:
            agents_in_current_cell = list(self.cell.agents)
            if any(isinstance(agent, Destination) for agent in agents_in_current_cell):
                print(f"Coche #{id(self) % 1000} llego a su destino {self.cell.coordinate}")
                self.model.total_cars_arrived = getattr(self.model, 'total_cars_arrived', 0) + 1
                self.remove()
                return
        
        # Calcular path si no existe
        if not self.path and self.destination and self.cell:
            self.calculate_path()
        
        if not self.path:
            self.stuck_counter += 1
            if self.stuck_counter > 20:
                print(f"Coche en {self.cell.coordinate} sin path válido, recalculando...")
                self.calculate_path()
                self.stuck_counter = 0
            return
        
        # Si completó el path pero no está en destino
        if self.path_index >= len(self.path):
            current_pos = self.cell.coordinate
            dest_pos = self.destination.cell.coordinate
            if current_pos != dest_pos:
                print(f"Path completado pero no en destino. Recalculando...")
                self.calculate_path()
            return
        
        # Obtener siguiente posición
        next_pos = self.path[self.path_index]
        
        # Intentar moverse
        if self.can_move_to(next_pos):
            next_cell = self.model.grid[next_pos]
            old_pos = self.cell.coordinate
            self.cell = next_cell
            self.path_index += 1
            self.moves_count += 1
            self.stuck_counter = 0
            self.wait_counter = 0
            self.last_position = next_pos
            
            # Debug: mostrar movimiento
            if self.moves_count <= 5:
                print(f"Coche se movió: {old_pos} -> {next_pos}")
            
            # Verificar si llegó a destino
            agents_in_cell = list(self.cell.agents)
            if any(isinstance(agent, Destination) for agent in agents_in_cell):
                print(f"Coche #{id(self) % 1000} llego a su destino {self.cell.coordinate}")
                self.model.total_cars_arrived = getattr(self.model, 'total_cars_arrived', 0) + 1
                self.remove()
                return
        else:
            # Bloqueado
            self.stuck_counter += 1
            self.wait_counter += 1
            
            # Debug
            if self.stuck_counter == 1:
                print(f"Coche bloqueado en {self.cell.coordinate}, esperando...")
            
            # Esperar un poco
            if self.wait_counter < 5:
                return
            
            # Buscar alternativa o recalcular
            if self.stuck_counter >= self.recalculate_threshold:
                alternative_pos = self.find_alternative_move()
                
                if alternative_pos:
                    next_cell = self.model.grid[alternative_pos]
                    self.cell = next_cell
                    self.moves_count += 1
                    print(f"Movimiento alternativo hacia {alternative_pos}")
                    self.calculate_path()
                    self.stuck_counter = 0
                    self.wait_counter = 0
                else:
                    print(f"Recalculando camino completo desde {self.cell.coordinate}")
                    self.calculate_path()
                    self.stuck_counter = 0
                    self.wait_counter = 0


class Traffic_Light(FixedAgent):
    """
    Traffic light. Where the traffic lights are in the grid.
    """
    def __init__(self, model, cell, state = False, timeToChange = 10):
        """
        Creates a new Traffic light.
        Args:
            model: Model reference for the agent
            cell: The initial position of the agent
            state: Whether the traffic light is green or red
            timeToChange: After how many step should the traffic light change color 
        """
        super().__init__(model)
        self.cell = cell
        self.state = state
        self.timeToChange = timeToChange

    def step(self):
        """ 
        To change the state (green or red) of the traffic light in case you consider the time to change of each traffic light.
        """
        if self.model.steps % self.timeToChange == 0:
            self.state = not self.state


class Destination(FixedAgent):
    """
    Destination agent. Where each car should go.
    """
    def __init__(self, model, cell):
        """
        Creates a new destination agent
        Args:
            model: Model reference for the agent
            cell: The initial position of the agent
        """
        super().__init__(model)
        self.cell = cell


class Obstacle(FixedAgent):
    """
    Obstacle agent. Just to add obstacles to the grid.
    """
    def __init__(self, model, cell, kind="Obstacle"):
        """
        Creates a new obstacle.
        
        Args:
            model: Model reference for the agent
            cell: The initial position of the agent
            kind: Identifier to map to a specific obstacle model
        """
        super().__init__(model)
        self.cell = cell
        self.kind = kind


class Gradas(FixedAgent):
    """
    Bleachers/gradas agent. Acts as an obstacle but keeps its own type for visualización.
    """
    def __init__(self, model, cell):
        super().__init__(model)
        self.cell = cell


class Road(FixedAgent):
    """
    Road agent. Determines where the cars can move, and in which direction.
    """
    def __init__(self, model, cell, direction= "Left"):
        """
        Creates a new road.
        Args:
            model: Model reference for the agent
            cell: The initial position of the agent
            direction: Direction of the road (Right, Left, Up, Down)
        """
        super().__init__(model)
        self.cell = cell
        self.direction = direction
