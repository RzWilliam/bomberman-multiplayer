import { v4 as uuidv4 } from 'uuid';

// Power-up types
const POWERUP_TYPES = ['bomb', 'speed', 'power'];

// Game constants
const TILE_SIZE = 40;
const PLAYER_RADIUS = 12;
const BOMB_RADIUS = 16;
const MOVEMENT_DURATION = 200;

// Player speed constants
const BASE_SPEED = 50;
const SPEED_INCREMENT = 25;
const MAX_SPEED = 150;

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
    this.playerBombOverlaps = new Map();
    this.playerMovements = new Map();
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
      isMoving: false,
      alive: true
    });
  }

  removePlayer(playerId) {
    this.players = this.players.filter(player => player.id !== playerId);
    this.playerBombOverlaps.delete(playerId);
    this.playerMovements.delete(playerId);
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
    this.playerBombOverlaps.clear();
    this.playerMovements.clear();
    
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
    
    this.players.forEach(player => {
      player.x = 0;
      player.y = 0;
      player.bombCount = 1;
      player.bombsPlaced = 0;
      player.bombPower = 1;
      player.speed = BASE_SPEED;
      player.isMoving = false;
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
    this.createMap();
    this.positionPlayers();
  }

  createMap() {
    const mapSize = 15;
    this.map = [];
    
    for (let y = 0; y < mapSize; y++) {
      this.map[y] = [];
      for (let x = 0; x < mapSize; x++) {
        if (x === 0 || y === 0 || x === mapSize - 1 || y === mapSize - 1 || (x % 2 === 0 && y % 2 === 0)) {
          this.map[y][x] = 1;
        } else {
          this.map[y][x] = Math.random() <= 0.6 ? 2 : 0;
        }
      }
    }
    
    const spawnPoints = [
      { x: 1, y: 1 },
      { x: mapSize - 2, y: mapSize - 2 },
      { x: mapSize - 2, y: 1 },
      { x: 1, y: mapSize - 2 }
    ];
    
    spawnPoints.forEach(point => {
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
    
    const spawnPoints = [
      { x: 1, y: 1 },
      { x: mapSize - 2, y: mapSize - 2 },
      { x: mapSize - 2, y: 1 },
      { x: 1, y: mapSize - 2 }
    ];
    
    this.players.forEach((player, index) => {
      const spawn = spawnPoints[index % spawnPoints.length];
      player.x = spawn.x * TILE_SIZE + TILE_SIZE / 2;
      player.y = spawn.y * TILE_SIZE + TILE_SIZE / 2;
    });
  }

  movePlayer(playerId, dirX, dirY) {
    const player = this.getPlayerById(playerId);
    if (!player || !player.alive || player.isMoving) {
      this.io.to(this.id).emit('playerMoveRejected', { playerId });
      return;
    }

    const currentGridX = Math.floor(player.x / TILE_SIZE);
    const currentGridY = Math.floor(player.y / TILE_SIZE);

    const targetGridX = currentGridX + dirX;
    const targetGridY = currentGridY + dirY;

    if (this.canMoveTo(targetGridX, targetGridY)) {
      const targetX = targetGridX * TILE_SIZE + TILE_SIZE / 2;
      const targetY = targetGridY * TILE_SIZE + TILE_SIZE / 2;

      player.isMoving = true;
      
      const duration = Math.max(50, 200 - (player.speed - 150));

      this.playerMovements.set(playerId, {
        startX: player.x,
        startY: player.y,
        targetX,
        targetY,
        startTime: Date.now(),
        duration
      });

      this.io.to(this.id).emit('playerMoveStart', {
        playerId,
        startX: player.x,
        startY: player.y,
        targetX,
        targetY,
        duration
      });
    } else {
      this.io.to(this.id).emit('playerMoveRejected', { playerId });
    }
  }

  canMoveTo(gridX, gridY) {
    if (gridY < 0 || gridY >= this.map.length || gridX < 0 || gridX >= this.map[0].length) {
      return false;
    }

    if (this.map[gridY][gridX] !== 0) {
      return false;
    }

    for (const bomb of Object.values(this.bombs)) {
      const bombGridX = Math.floor(bomb.x / TILE_SIZE);
      const bombGridY = Math.floor(bomb.y / TILE_SIZE);
      if (bombGridX === gridX && bombGridY === gridY) {
        return false;
      }
    }

    return true;
  }

  update() {
    const now = Date.now();
    
    this.playerMovements.forEach((movement, playerId) => {
      const player = this.getPlayerById(playerId);
      if (!player) return;

      const elapsed = now - movement.startTime;
      const progress = Math.min(elapsed / movement.duration, 1);

      if (progress < 1) {
        player.x = movement.startX + (movement.targetX - movement.startX) * progress;
        player.y = movement.startY + (movement.targetY - movement.startY) * progress;
      } else {
        player.x = movement.targetX;
        player.y = movement.targetY;
        player.isMoving = false;
        this.playerMovements.delete(playerId);
        
        this.checkPowerUpCollection(player);
      }
    });

    this.updateBombs((now - this.lastUpdateTime) / 1000);
    this.updateBombOverlaps();
    this.checkGameOver();

    this.lastUpdateTime = now;
  }

  startGameLoop() {
    this.lastUpdateTime = Date.now();
    
    this.gameLoopInterval = setInterval(() => {
      if (this.gameOver) {
        clearInterval(this.gameLoopInterval);
        this.gameLoopInterval = null;
        return;
      }
      
      this.update();
      this.io.to(this.id).emit('gameState', this.getGameState());
    }, 1000 / 60);
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

  updateBombOverlaps() {
    this.players.forEach(player => {
      if (!player.alive) return;

      const overlappingBombs = new Set();
      
      Object.values(this.bombs).forEach(bomb => {
        const dx = player.x - bomb.x;
        const dy = player.y - bomb.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < (PLAYER_RADIUS + BOMB_RADIUS)) {
          overlappingBombs.add(bomb.id);
        }
      });
      
      this.playerBombOverlaps.set(player.id, overlappingBombs);
    });
  }

  placeBomb(playerId) {
    const player = this.getPlayerById(playerId);
    if (!player || !player.alive || player.bombsPlaced >= player.bombCount) return;
    
    const gridX = Math.floor(player.x / TILE_SIZE);
    const gridY = Math.floor(player.y / TILE_SIZE);
    
    const bombPosition = `${gridX},${gridY}`;
    for (const bombId in this.bombs) {
      if (this.bombs[bombId].position === bombPosition) {
        return;
      }
    }
    
    const bombId = uuidv4();
    const bomb = {
      id: bombId,
      playerId,
      x: gridX * TILE_SIZE + TILE_SIZE / 2,
      y: gridY * TILE_SIZE + TILE_SIZE / 2,
      gridX,
      gridY,
      position: bombPosition,
      power: player.bombPower,
      timer: 3
    };
    
    this.bombs[bombId] = bomb;
    player.bombsPlaced++;

    const overlappingBombs = this.playerBombOverlaps.get(playerId) || new Set();
    overlappingBombs.add(bombId);
    this.playerBombOverlaps.set(playerId, overlappingBombs);
    
    this.io.to(this.id).emit('bombPlaced', { bomb });
  }

  explodeBomb(bombId) {
    const bomb = this.bombs[bombId];
    if (!bomb) return;
    
    const player = this.getPlayerById(bomb.playerId);
    if (player) {
      player.bombsPlaced--;
    }
    
    const explosionTiles = [];
    
    explosionTiles.push({
      x: bomb.x,
      y: bomb.y,
      gridX: bomb.gridX,
      gridY: bomb.gridY
    });
    
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];
    
    directions.forEach(dir => {
      for (let i = 1; i <= bomb.power; i++) {
        const checkX = bomb.gridX + dir.x * i;
        const checkY = bomb.gridY + dir.y * i;
        
        if (checkY < 0 || checkY >= this.map.length || checkX < 0 || checkX >= this.map[0].length) {
          break;
        }
        
        if (this.map[checkY][checkX] === 1) {
          break;
        }
        
        explosionTiles.push({
          x: checkX * TILE_SIZE + TILE_SIZE / 2,
          y: checkY * TILE_SIZE + TILE_SIZE / 2,
          gridX: checkX,
          gridY: checkY
        });
        
        if (this.map[checkY][checkX] === 2) {
          this.destroyBox(checkX, checkY);
          break;
        }
      }
    });
    
    this.players.forEach(player => {
      if (!player.alive) return;
      
      const playerGridX = Math.floor(player.x / TILE_SIZE);
      const playerGridY = Math.floor(player.y / TILE_SIZE);
      
      const inExplosion = explosionTiles.some(tile => 
        tile.gridX === playerGridX && tile.gridY === playerGridY
      );
      
      if (inExplosion) {
        this.killPlayer(player.id);
      }
    });

    this.players.forEach(player => {
      const overlappingBombs = this.playerBombOverlaps.get(player.id);
      if (overlappingBombs) {
        overlappingBombs.delete(bombId);
      }
    });
    
    this.io.to(this.id).emit('bombExploded', {
      bombId,
      explosionTiles
    });
    
    delete this.bombs[bombId];
  }

  destroyBox(x, y) {
    this.map[y][x] = 0;
    
    this.io.to(this.id).emit('boxDestroyed', { x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 });
    
    if (Math.random() <= 0.5) {
      this.spawnPowerUp(x, y);
    }
  }

  spawnPowerUp(x, y) {
    const powerUpId = uuidv4();
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    
    const powerUp = {
      id: powerUpId,
      x: x * TILE_SIZE + TILE_SIZE / 2,
      y: y * TILE_SIZE + TILE_SIZE / 2,
      gridX: x,
      gridY: y,
      type
    };
    
    this.powerUps[powerUpId] = powerUp;
    
    this.io.to(this.id).emit('powerUpSpawned', { powerUp });
  }

  checkPowerUpCollection(player) {
    const playerGridX = Math.floor(player.x / TILE_SIZE);
    const playerGridY = Math.floor(player.y / TILE_SIZE);
    
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
    
    switch (powerUp.type) {
      case 'bomb':
        player.bombCount++;
        break;
      case 'speed':
        player.speed = Math.min(player.speed + SPEED_INCREMENT, MAX_SPEED);
        break;
      case 'power':
        player.bombPower++;
        break;
    }
    
    this.io.to(this.id).emit('powerUpCollected', {
      powerUpId,
      playerId,
      powerUpType: powerUp.type
    });
    
    delete this.powerUps[powerUpId];
  }

  killPlayer(playerId) {
    const player = this.getPlayerById(playerId);
    if (!player || !player.alive) return;
    
    player.alive = false;
    
    this.io.to(this.id).emit('playerDied', { playerId });
    
    setTimeout(() => {
      this.checkGameOver();
    }, 1000);
  }

  checkGameOver() {
    const alivePlayers = this.players.filter(player => player.alive);
    
    if (alivePlayers.length === 1 && this.players.length > 1) {
      const winner = alivePlayers[0];
      this.gameOver = true;
      
      this.io.to(this.id).emit('gameOver', {
        winner: winner.name
      });
    }
    else if (alivePlayers.length === 0 && this.players.length > 0) {
      this.gameOver = true;
      
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
          alive: player.alive,
          isMoving: player.isMoving
        };
        return acc;
      }, {}),
      bombs: this.bombs,
      powerUps: this.powerUps
    };
  }
}