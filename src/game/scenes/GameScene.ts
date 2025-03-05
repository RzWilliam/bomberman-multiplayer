import Phaser from "phaser";
import { Socket } from "socket.io-client";
import { Player } from "../entities/Player";
import { Bomb } from "../entities/Bomb";
import { PowerUp } from "../entities/PowerUp";

export class GameScene extends Phaser.Scene {
  private socket!: Socket;
  private roomId!: string;
  private playerId!: string;
  private players: Map<string, Player> = new Map();
  private bombs: Map<string, Bomb> = new Map();
  private powerUps: Map<string, PowerUp> = new Map();
  private map!: number[][];
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private boxes!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private playerColors = [0x0000ff, 0xff0000, 0x00ff00, 0xffff00];
  private isGameActive: boolean = true;

  constructor() {
    super("GameScene");
  }

  init() {
    this.socket = this.game.registry.get("socket");
    this.roomId = this.game.registry.get("roomId");
    this.playerId = this.game.registry.get("playerId");
    this.isGameActive = true;

    // Initialize input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    // Clear existing game objects
    this.players.clear();
    this.bombs.clear();
    this.powerUps.clear();
  }

  create() {
    // Create game world
    this.createMap();

    // Set up socket event listeners
    this.setupSocketListeners();

    // Join the game
    this.socket.emit("playerReady", {
      roomId: this.roomId,
      playerId: this.playerId,
    });
  }

  update() {
    if (!this.isGameActive) return;

    // Handle player input
    this.handlePlayerInput();

    // Update all players
    this.players.forEach((player) => player.update());

    // Update all bombs
    this.bombs.forEach((bomb) => bomb.update());
  }

  private handlePlayerInput() {
    const player = this.players.get(this.playerId);
    if (!player) return;

    // Movement
    let dirX = 0;
    let dirY = 0;

    if (this.cursors.left.isDown) {
      dirX = -1;
      player.setVelocityX(-player.speed);
    } else if (this.cursors.right.isDown) {
      dirX = 1;
      player.setVelocityX(player.speed);
    } else {
      player.setVelocityX(0);
    }

    if (this.cursors.up.isDown) {
      dirY = -1;
      player.setVelocityY(-player.speed);
    } else if (this.cursors.down.isDown) {
      dirY = 1;
      player.setVelocityY(player.speed);
    } else {
      player.setVelocityY(0);
    }

    if (dirX !== 0 || dirY !== 0) {
      this.socket.emit("playerMove", {
        roomId: this.roomId,
        playerId: this.playerId,
        dirX,
        dirY,
        deltaTime: this.game.loop.delta / 1000,
      });
    }

    // Place bomb
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.socket.emit("placeBomb", {
        roomId: this.roomId,
        playerId: this.playerId,
      });
    }
  }

  private createMap() {
    // Create background
    this.add.rectangle(0, 0, 600, 600, 0x00aa44).setOrigin(0, 0);

    // Create walls and boxes groups
    this.walls = this.physics.add.staticGroup();
    this.boxes = this.physics.add.staticGroup();

    // Wait for map data from server
  }

  private setupSocketListeners() {
    // Game state update
    this.socket.on("gameState", (data) => {
      if (!this.isGameActive) return;
      this.updateGameState(data);
    });

    // Map update
    this.socket.on("mapUpdate", (data) => {
      if (!this.isGameActive) return;
      this.updateMap(data.map);
    });

    // New player joined
    this.socket.on("newPlayer", (data) => {
      if (!this.isGameActive) return;
      this.addPlayer(data.player);
    });

    // Player left
    this.socket.on("playerLeft", (data) => {
      if (!this.isGameActive) return;
      this.removePlayer(data.playerId);
    });

    // Bomb placed
    this.socket.on("bombPlaced", (data) => {
      if (!this.isGameActive) return;
      this.addBomb(data.bomb);
    });

    // Bomb exploded
    this.socket.on("bombExploded", (data) => {
      if (!this.isGameActive) return;
      this.explodeBomb(data.bombId, data.explosionTiles);
    });

    // Box destroyed
    this.socket.on("boxDestroyed", (data) => {
      if (!this.isGameActive) return;
      this.destroyBox(data.x, data.y);
    });

    // Power-up spawned
    this.socket.on("powerUpSpawned", (data) => {
      if (!this.isGameActive) return;
      this.spawnPowerUp(data.powerUp);
    });

    // Power-up collected
    this.socket.on("powerUpCollected", (data) => {
      if (!this.isGameActive) return;
      this.collectPowerUp(data.powerUpId, data.playerId);
    });

    // Player died
    this.socket.on("playerDied", (data) => {
      if (!this.isGameActive) return;
      this.killPlayer(data.playerId);
    });

    // Game over
    this.socket.on("gameOver", (data) => {
      if (!this.isGameActive) return;
      this.gameOver(data.winner);
    });

    // Game reset
    this.socket.on("gameReset", () => {
      this.cleanupScene();
      this.scene.restart();
    });
  }

  private cleanupScene() {
    this.isGameActive = false;

    // Clean up all game objects
    this.players.forEach((player) => player.destroy());
    this.bombs.forEach((bomb) => bomb.destroy());
    this.powerUps.forEach((powerUp) => powerUp.destroy());

    // Clear collections
    this.players.clear();
    this.bombs.clear();
    this.powerUps.clear();

    // Clean up physics groups
    if (this.walls) {
      this.walls.clear(true, true);
    }
    if (this.boxes) {
      this.boxes.clear(true, true);
    }

    // Remove all socket listeners
    this.socket.removeAllListeners();
  }

  private updateGameState(data: any) {
    // Update players
    Object.entries(data.players).forEach(([id, playerData]: [string, any]) => {
      if (this.players.has(id)) {
        const player = this.players.get(id)!;
        player.setPosition(playerData.x, playerData.y);
        player.updateStats(
          playerData.bombCount,
          playerData.bombPower,
          playerData.speed
        );
      } else {
        this.addPlayer(playerData);
      }
    });

    // Update bombs
    Object.entries(data.bombs).forEach(([id, bombData]: [string, any]) => {
      if (!this.bombs.has(id)) {
        this.addBomb(bombData);
      }
    });

    // Update power-ups
    Object.entries(data.powerUps).forEach(
      ([id, powerUpData]: [string, any]) => {
        if (!this.powerUps.has(id)) {
          this.spawnPowerUp(powerUpData);
        }
      }
    );
  }

  private updateMap(mapData: number[][]) {
    this.map = mapData;

    // Clear existing walls and boxes
    this.walls.clear(true, true);
    this.boxes.clear(true, true);

    // Create new walls and boxes based on map data
    const tileSize = 40;

    for (let y = 0; y < mapData.length; y++) {
      for (let x = 0; x < mapData[y].length; x++) {
        const tileX = x * tileSize + tileSize / 2;
        const tileY = y * tileSize + tileSize / 2;

        if (mapData[y][x] === 1) {
          // Wall
          this.walls
            .create(tileX, tileY, "wall")
            .setScale(tileSize / 32)
            .refreshBody();
        } else if (mapData[y][x] === 2) {
          // Box
          this.boxes
            .create(tileX, tileY, "box")
            .setScale(tileSize / 32)
            .refreshBody();
        }
      }
    }

    // Add colliders
    this.players.forEach((player) => {
      this.physics.add.collider(player, this.walls);
      this.physics.add.collider(player, this.boxes);

      // Add colliders with other players
      this.players.forEach((otherPlayer) => {
        if (player !== otherPlayer) {
          this.physics.add.collider(player, otherPlayer);
        }
      });
    });
  }

  private addPlayer(playerData: any) {
    const colorIndex = this.players.size % this.playerColors.length;
    const player = new Player(
      this,
      playerData.x,
      playerData.y,
      playerData.id,
      this.playerColors[colorIndex],
      playerData.name,
      playerData.bombCount,
      playerData.bombPower,
      playerData.speed
    );

    this.players.set(playerData.id, player);

    // Add colliders for the new player
    this.physics.add.collider(player, this.walls);
    this.physics.add.collider(player, this.boxes);

    // Add colliders with other players
    this.players.forEach((otherPlayer) => {
      if (player !== otherPlayer) {
        this.physics.add.collider(player, otherPlayer);
      }
    });

    // Add colliders with bombs
    this.bombs.forEach((bomb) => {
      this.physics.add.collider(player, bomb);
    });

    // Add overlap with power-ups
    this.powerUps.forEach((powerUp) => {
      this.physics.add.overlap(player, powerUp, () => {
        if (playerData.id === this.playerId) {
          this.socket.emit("collectPowerUp", {
            roomId: this.roomId,
            playerId: this.playerId,
            powerUpId: powerUp.id,
          });
        }
      });
    });
  }

  private removePlayer(playerId: string) {
    const player = this.players.get(playerId);
    if (player) {
      player.destroy();
      this.players.delete(playerId);
    }
  }

  private addBomb(bombData: any) {
    const bomb = new Bomb(
      this,
      bombData.x,
      bombData.y,
      bombData.id,
      bombData.power,
      bombData.playerId
    );

    this.bombs.set(bombData.id, bomb);

    // Add colliders with all players
    this.players.forEach((player) => {
      this.physics.add.collider(player, bomb);
    });
  }

  private explodeBomb(bombId: string, explosionTiles: any[]) {
    const bomb = this.bombs.get(bombId);
    if (bomb && this.isGameActive) {
      bomb.explode(explosionTiles);
      this.bombs.delete(bombId);
    }
  }

  private destroyBox(x: number, y: number) {
    // Find and destroy the box at the given coordinates
    this.boxes.getChildren().forEach((box: any) => {
      if (Math.abs(box.x - x) < 20 && Math.abs(box.y - y) < 20) {
        box.destroy();
      }
    });
  }

  private spawnPowerUp(powerUpData: any) {
    const powerUp = new PowerUp(
      this,
      powerUpData.x,
      powerUpData.y,
      powerUpData.id,
      powerUpData.type
    );

    this.powerUps.set(powerUpData.id, powerUp);

    // Add overlap with all players
    this.players.forEach((player) => {
      this.physics.add.overlap(player, powerUp, () => {
        if (player.id === this.playerId) {
          this.socket.emit("collectPowerUp", {
            roomId: this.roomId,
            playerId: this.playerId,
            powerUpId: powerUpData.id,
          });
        }
      });
    });
  }

  private collectPowerUp(powerUpId: string, playerId: string) {
    const powerUp = this.powerUps.get(powerUpId);
    if (powerUp) {
      powerUp.collect();
      this.powerUps.delete(powerUpId);
    }
  }

  private killPlayer(playerId: string) {
    const player = this.players.get(playerId);
    if (player) {
      player.die();
    }
  }

  private gameOver(winner: string) {
    if (!this.isGameActive) return;

    this.isGameActive = false;

    // Display winner and transition back to the lobby
    const winnerText = this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY - 50,
        `${winner} wins!`,
        {
          fontSize: "32px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 4,
        }
      )
      .setOrigin(0.5);

    // Add a delay before returning to the lobby
    this.time.delayedCall(5000, () => {
      if (winnerText.scene) {
        winnerText.destroy();
      }
    });
  }

  shutdown() {
    this.cleanupScene();
  }

  destroy() {
    this.cleanupScene();
  }
}
