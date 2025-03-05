import { v4 as uuidv4 } from 'uuid';

// Power-up types
const POWERUP_TYPES = ['bomb', 'speed', 'power'];

// Player speed constants
const BASE_SPEED = 100;
const MAX_SPEED = 200;

export class GameRoom {
  constructor(id, io) {
    this.id = id;
    this.io = io;
    this.players = [];
    this.gameStarted = false;
    this.gameOver = false;
    this.map = [];
    this.bombs = {};
    this.powerUps = {};
    this.gameLoopInterval = null;
    this.lastUpdateTime = 0;
  }

  getPlayers() {
    return this.players;
  }

  getPlayerById(playerId) {
    return this.players.find(player => player.id === playerId);
  }

  getPlayerBySocketId(socketId) {
    return this.players.find(player => player.socketId === socketId);
  }

  addPlayer(player) {
    this.players.push({
      ...player,
      x: 0,
      y: 0,
      bombCount: 1,
      bombsPlaced: 0,
      bombPower: 1,
      speed: BASE_SPEED,
      alive: true
    });
  }

  removePlayer(playerId) {
    this.players = this.players.filter(player => player.id !== playerId);
  }

  assignNewHost() {
    if (this.players.length > 0) {
      this.players[0].isHost = true;
    }
  }

  isGameStarted() {
    return this.gameStarted;
  }

  startGame() {
    this.gameStarted = true;
    this.gameOver = false;
  }

  resetGame() {
    this.gameStarted = false;
    this.gameOver = false;
    this.map = [];
    this.bombs = {};
    this.powerUps = {};
    
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
    
    // Reset player positions and stats
    this.players.forEach(player => {
      player.x = 0;
      player.y = 0;
      player.bombCount = 1;
      player.bombsPlaced = 0;
      player.bombPower = 1;
      player.speed = BASE_SPEED;
      player.alive = true;
      player.isReady = false;
    });
  }

  setPlayerReady(playerId) {
    const player = this.getPlayerById(playerId);
    if (player) {
      player.isReady = true;
    }
  }

  areAllPlayersReady() {
    return this.players.every(player => player.isReady);
  }

  initializeGame() {
    // Create the game map
    this.createMap();
    
    // Position players at spawn points
    this.positionPlayers();
  }

  createMap() {
    const mapSize = 15; // 15x15 grid
    this.map = [];
    
    // Initialize empty map
    for (let y = 0; y < mapSize; y++) {
      this.map[y] = [];
      for (let x = 0; x < mapSize; x++) {
        // 0 = empty, 1 = wall, 2 = box
        if (x === 0 || y === 0 || x === mapSize - 1 || y === mapSize - 1 || (x % 2 === 0 && y % 2 === 0)) {
          // Walls around the edges and in a grid pattern
          this.map[y][x] = 1;
        } else {
          // 40% chance of a box in empty spaces
          this.map[y][x] = Math.random() < 0.4 ? 2 : 0;
        }
      }
    }
    
    // Clear spawn areas for players
    const spawnPoints = [
      { x: 1, y: 1 },                           // Top-left
      { x: mapSize - 2, y: 1 },                 // Top-right
      { x: 1, y: mapSize - 2 },                 // Bottom-left
      { x: mapSize - 2, y: mapSize - 2 }        // Bottom-right
    ];
    
    spawnPoints.forEach(point => {
      // Clear 3x3 area around spawn point
      for (let y = point.y - 1; y <= point.y + 1; y++) {
        for (let x = point.x - 1; x <= point.x + 1; x++) {
          if (y >= 0 && y < mapSize && x >= 0 && x < mapSize && this.map[y][x] !== 1) {
            this.map[y][x] = 0;
          }
        }
      }
    });
  }

  positionPlayers() {
    const mapSize = this.map.length;
    const tileSize = 40;
    
    const spawnPoints = [
      { x: 1, y: 1 },                           // Top-left
      { x: mapSize - 2, y: 1 },                 // Top-right
      { x: 1, y: mapSize - 2 },                 // Bottom-left
      { x: mapSize - 2, y: mapSize - 2 }        // Bottom-right
    ];
    
    // Assign spawn points to players
    this.players.forEach((player, index) => {
      const spawn = spawnPoints[index % spawnPoints.length];
      player.x = spawn.x * tileSize + tileSize / 2;
      player.y = spawn.y * tileSize + tileSize / 2;
    });
  }

  startGameLoop() {
    this.lastUpdateTime = Date.now();
    
    this.gameLoopInterval = setInterval(() => {
      if (this.gameOver) {
        clearInterval(this.gameLoopInterval);
        this.gameLoopInterval = null;
        return;
      }
      
      // Update game state
      this.update();
      
      // Send game state to all players
      this.io.to(this.id).emit('gameState', this.getGameState());
    }, 1000 / 30); // 30 FPS
  }

  update() {
    const now = Date.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = now;
    
    // Update bombs
    this.updateBombs(deltaTime);
    
    // Check for game over condition
    this.checkGameOver();
  }

  updateBombs(deltaTime) {
    Object.keys(this.bombs).forEach(bombId => {
      const bomb = this.bombs[bombId];
      bomb.timer -= deltaTime;
      
      if (bomb.timer <= 0) {
        this.explodeBomb(bombId);
      }
    });
  }

  movePlayer(playerId, dirX, dirY, deltaTime) {
    const player = this.getPlayerById(playerId);
    if (!player || !player.alive) return;

    const tileSize = 40;

    // Utilisation de deltaTime pour que le mouvement soit indépendant des FPS
    const distance = player.speed * deltaTime;

    let newX = player.x + dirX * distance;
    let newY = player.y + dirY * distance;

    if (this.canMoveTo(newX, newY)) {
        player.x = newX;
        player.y = newY;
    } else {
        if (dirX !== 0 && this.canMoveTo(player.x, newY)) {
            player.y = newY;
        } else if (dirY !== 0 && this.canMoveTo(newX, player.y)) {
            player.x = newX;
        }
    }

    this.checkPowerUpCollection(player);
}


  canMoveTo(x, y) {
    const tileSize = 40;
    const playerRadius = 12;
    
    // Get the grid coordinates
    const gridX = Math.floor(x / tileSize);
    const gridY = Math.floor(y / tileSize);
    
    // Check surrounding tiles
    for (let offsetY = -1; offsetY <= 1; offsetY++) {
      for (let offsetX = -1; offsetX <= 1; offsetX++) {
        const checkX = gridX + offsetX;
        const checkY = gridY + offsetY;
        
        // Skip if out of bounds
        if (checkY < 0 || checkY >= this.map.length || checkX < 0 || checkX >= this.map[0].length) {
          continue;
        }
        
        // If the tile is a wall or box
        if (this.map[checkY][checkX] === 1 || this.map[checkY][checkX] === 2) {
          // Calculate the closest point on the tile to the player
          const tileLeft = checkX * tileSize;
          const tileRight = tileLeft + tileSize;
          const tileTop = checkY * tileSize;
          const tileBottom = tileTop + tileSize;
          
          const closestX = Math.max(tileLeft, Math.min(x, tileRight));
          const closestY = Math.max(tileTop, Math.min(y, tileBottom));
          
          // Calculate distance from closest point to player center
          const distX = x - closestX;
          const distY = y - closestY;
          const distance = Math.sqrt(distX * distX + distY * distY);
          
          // If the distance is less than the player radius, there's a collision
          if (distance < playerRadius) {
            return false;
          }
        }
      }
    }
    
    return true;
  }

  placeBomb(playerId) {
    const player = this.getPlayerById(playerId);
    if (!player || !player.alive) return;
    
    // Check if player has bombs available
    if (player.bombsPlaced >= player.bombCount) return;
    
    const tileSize = 40;
    
    // Get the grid coordinates
    const gridX = Math.floor(player.x / tileSize);
    const gridY = Math.floor(player.y / tileSize);
    
    // Check if there's already a bomb at this position
    const bombPosition = `${gridX},${gridY}`;
    for (const bombId in this.bombs) {
      if (this.bombs[bombId].position === bombPosition) {
        return;
      }
    }
    
    // Create a new bomb
    const bombId = uuidv4();
    const bomb = {
      id: bombId,
      playerId,
      x: gridX * tileSize + tileSize / 2,
      y: gridY * tileSize + tileSize / 2,
      gridX,
      gridY,
      position: bombPosition,
      power: player.bombPower,
      timer: 3 // 3 seconds until explosion
    };
    
    this.bombs[bombId] = bomb;
    player.bombsPlaced++;
    
    // Notify clients
    this.io.to(this.id).emit('bombPlaced', { bomb });
  }

  explodeBomb(bombId) {
    const bomb = this.bombs[bombId];
    if (!bomb) return;
    
    const player = this.getPlayerById(bomb.playerId);
    if (player) {
      player.bombsPlaced--;
    }
    
    const tileSize = 40;
    const explosionTiles = [];
    
    // Add center tile
    explosionTiles.push({
      x: bomb.x,
      y: bomb.y,
      gridX: bomb.gridX,
      gridY: bomb.gridY
    });
    
    // Directions: right, left, down, up
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];
    
    // Check each direction
    directions.forEach(dir => {
      for (let i = 1; i <= bomb.power; i++) {
        const checkX = bomb.gridX + dir.x * i;
        const checkY = bomb.gridY + dir.y * i;
        
        // Skip if out of bounds
        if (checkY < 0 || checkY >= this.map.length || checkX < 0 || checkX >= this.map[0].length) {
          break;
        }
        
        // If hit a wall, stop in this direction
        if (this.map[checkY][checkX] === 1) {
          break;
        }
        
        // Add explosion tile
        explosionTiles.push({
          x: checkX * tileSize + tileSize / 2,
          y: checkY * tileSize + tileSize / 2,
          gridX: checkX,
          gridY: checkY
        });
        
        // If hit a box, destroy it and stop in this direction
        if (this.map[checkY][checkX] === 2) {
          this.destroyBox(checkX, checkY);
          break;
        }
      }
    });
    
    // Check for player damage
    this.players.forEach(player => {
      if (!player.alive) return;
      
      const playerGridX = Math.floor(player.x / tileSize);
      const playerGridY = Math.floor(player.y / tileSize);
      
      // Check if player is in explosion range
      const inExplosion = explosionTiles.some(tile => 
        tile.gridX === playerGridX && tile.gridY === playerGridY
      );
      
      if (inExplosion) {
        this.killPlayer(player.id);
      }
    });
    
    // Notify clients
    this.io.to(this.id).emit('bombExploded', {
      bombId,
      explosionTiles
    });
    
    // Remove the bomb
    delete this.bombs[bombId];
  }

  destroyBox(x, y) {
    // Set the map tile to empty
    this.map[y][x] = 0;
    
    // Notify clients
    this.io.to(this.id).emit('boxDestroyed', { x: x * 40 + 20, y: y * 40 + 20 });
    
    // 30% chance to spawn a power-up
    if (Math.random() < 0.3) {
      this.spawnPowerUp(x, y);
    }
  }

  spawnPowerUp(x, y) {
    const tileSize = 40;
    const powerUpId = uuidv4();
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    
    const powerUp = {
      id: powerUpId,
      x: x * tileSize + tileSize / 2,
      y: y * tileSize + tileSize / 2,
      gridX: x,
      gridY: y,
      type
    };
    
    this.powerUps[powerUpId] = powerUp;
    
    // Notify clients
    this.io.to(this.id).emit('powerUpSpawned', { powerUp });
  }

  checkPowerUpCollection(player) {
    const tileSize = 40;
    const playerGridX = Math.floor(player.x / tileSize);
    const playerGridY = Math.floor(player.y / tileSize);
    
    Object.keys(this.powerUps).forEach(powerUpId => {
      const powerUp = this.powerUps[powerUpId];
      
      if (powerUp.gridX === playerGridX && powerUp.gridY === playerGridY) {
        this.collectPowerUp(player.id, powerUpId);
      }
    });
  }

  collectPowerUp(playerId, powerUpId) {
    const player = this.getPlayerById(playerId);
    const powerUp = this.powerUps[powerUpId];
    
    if (!player || !powerUp) return;
    
    // Apply power-up effect
    switch (powerUp.type) {
      case 'bomb':
        player.bombCount++;
        break;
      case 'speed':
        // Increase speed but don't exceed max speed
        player.speed = Math.min(player.speed + 20, MAX_SPEED);
        break;
      case 'power':
        player.bombPower++;
        break;
    }
    
    // Notify clients
    this.io.to(this.id).emit('powerUpCollected', {
      powerUpId,
      playerId
    });
    
    // Remove the power-up
    delete this.powerUps[powerUpId];
  }

  killPlayer(playerId) {
    const player = this.getPlayerById(playerId);
    if (!player || !player.alive) return;
    
    player.alive = false;
    
    // Notify clients
    this.io.to(this.id).emit('playerDied', { playerId });
    
    // Check if game is over
    this.checkGameOver();
  }

  checkGameOver() {
    // Count alive players
    const alivePlayers = this.players.filter(player => player.alive);
    
    // If only one player is left, they win
    if (alivePlayers.length === 1 && this.players.length > 1) {
      const winner = alivePlayers[0];
      this.gameOver = true;
      
      // Notify clients
      this.io.to(this.id).emit('gameOver', {
        winner: winner.name
      });
    }
    // If no players are left, it's a draw
    else if (alivePlayers.length === 0 && this.players.length > 0) {
      this.gameOver = true;
      
      // Notify clients
      this.io.to(this.id).emit('gameOver', {
        winner: 'Nobody'
      });
    }
  }

  getMap() {
    return this.map;
  }

  getGameState() {
    return {
      players: this.players.reduce((acc, player) => {
        acc[player.id] = {
          id: player.id,
          name: player.name,
          x: player.x,
          y: player.y,
          bombCount: player.bombCount,
          bombPower: player.bombPower,
          speed: player.speed,
          alive: player.alive
        };
        return acc;
      }, {}),
      bombs: this.bombs,
      powerUps: this.powerUps
    };
  }
}