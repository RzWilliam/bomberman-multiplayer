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
  private canMove: boolean = true;
  private lastMoveTime: number = 0;
  private moveTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super("GameScene");
  }

  init() {
    this.socket = this.game.registry.get("socket");
    this.roomId = this.game.registry.get("roomId");
    this.playerId = this.game.registry.get("playerId");
    this.isGameActive = true;
    this.canMove = true;
    this.lastMoveTime = 0;

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    this.players.clear();
    this.bombs.clear();
    this.powerUps.clear();
  }

  create() {
    this.createMap();
    this.setupSocketListeners();

    this.socket.emit("playerReady", {
      roomId: this.roomId,
      playerId: this.playerId,
    });
  }

  update() {
    if (!this.isGameActive) return;

    this.handlePlayerInput();
    this.players.forEach((player) => player.update());
    this.bombs.forEach((bomb) => bomb.update());
  }

  private handlePlayerInput() {
    if (!this.canMove) return;

    const player = this.players.get(this.playerId);
    if (!player) return;

    let dirX = 0;
    let dirY = 0;

    // Check for movement input
    if (this.cursors.left.isDown) {
      dirX = -1;
    } else if (this.cursors.right.isDown) {
      dirX = 1;
    } else if (this.cursors.up.isDown) {
      dirY = -1;
    } else if (this.cursors.down.isDown) {
      dirY = 1;
    }

    // If there's movement input and we can move
    if ((dirX !== 0 || dirY !== 0) && this.canMove) {
      this.canMove = false;

      // Send move request to server
      this.socket.emit("playerMove", {
        roomId: this.roomId,
        playerId: this.playerId,
        dirX,
        dirY,
      });

      // Calculate move delay based on player speed
      const moveDelay = Math.max(50, 200 - (player.speed - 150));

      // Set up the next movement if key is still held
      this.moveTimer = this.time.delayedCall(moveDelay, () => {
        this.canMove = true;

        // If key is still held, trigger next movement immediately
        if (
          this.cursors.left.isDown ||
          this.cursors.right.isDown ||
          this.cursors.up.isDown ||
          this.cursors.down.isDown
        ) {
          this.handlePlayerInput();
        }
      });
    }

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.socket.emit("placeBomb", {
        roomId: this.roomId,
        playerId: this.playerId,
      });
    }
  }

  private setupSocketListeners() {
    this.socket.on("gameState", (data) => {
      if (!this.isGameActive) return;
      this.updateGameState(data);
    });

    this.socket.on("mapUpdate", (data) => {
      if (!this.isGameActive) return;
      this.updateMap(data.map);
    });

    this.socket.on("newPlayer", (data) => {
      if (!this.isGameActive) return;
      this.addPlayer(data.player);
    });

    this.socket.on("playerLeft", (data) => {
      if (!this.isGameActive) return;
      this.removePlayer(data.playerId);
    });

    this.socket.on("bombPlaced", (data) => {
      if (!this.isGameActive) return;
      this.addBomb(data.bomb);
    });

    this.socket.on("bombExploded", (data) => {
      if (!this.isGameActive) return;
      this.explodeBomb(data.bombId, data.explosionTiles);
    });

    this.socket.on("boxDestroyed", (data) => {
      if (!this.isGameActive) return;
      this.destroyBox(data.x, data.y);
    });

    this.socket.on("powerUpSpawned", (data) => {
      if (!this.isGameActive) return;
      this.spawnPowerUp(data.powerUp);
    });

    this.socket.on("powerUpCollected", (data) => {
      if (!this.isGameActive) return;
      this.collectPowerUp(data.powerUpId, data.playerId);
    });

    this.socket.on("playerDied", (data) => {
      if (!this.isGameActive) return;
      this.killPlayer(data.playerId);
    });

    this.socket.on("gameOver", (data) => {
      if (!this.isGameActive) return;
      this.gameOver(data.winner);
    });

    this.socket.on("gameReset", () => {
      this.cleanupScene();
      this.scene.restart();
    });

    this.socket.on("playerMoveStart", (data) => {
      if (!this.isGameActive) return;

      const player = this.players.get(data.playerId);
      if (!player) return;

      this.tweens.add({
        targets: player,
        x: data.targetX,
        y: data.targetY,
        duration: data.duration,
        ease: "Linear",
        onComplete: () => {
          if (data.playerId === this.playerId) {
            this.canMove = true;

            // If key is still held, trigger next movement
            if (
              this.cursors.left.isDown ||
              this.cursors.right.isDown ||
              this.cursors.up.isDown ||
              this.cursors.down.isDown
            ) {
              this.handlePlayerInput();
            }
          }
        },
      });
    });

    this.socket.on("playerMoveRejected", (data) => {
      if (data.playerId === this.playerId) {
        this.canMove = true;
        if (this.moveTimer) {
          this.moveTimer.remove();
          this.moveTimer = null;
        }
      }
    });
  }

  private createMap() {
    this.add.rectangle(0, 0, 600, 600, 0x00aa44).setOrigin(0, 0);
    this.walls = this.physics.add.staticGroup();
    this.boxes = this.physics.add.staticGroup();
  }

  private updateGameState(data: any) {
    Object.entries(data.players).forEach(([id, playerData]: [string, any]) => {
      if (this.players.has(id)) {
        const player = this.players.get(id)!;
        if (!playerData.isMoving) {
          player.setPosition(playerData.x, playerData.y);
        }
        player.updateStats(
          playerData.bombCount,
          playerData.bombPower,
          playerData.speed
        );
      } else {
        this.addPlayer(playerData);
      }
    });

    Object.entries(data.bombs).forEach(([id, bombData]: [string, any]) => {
      if (!this.bombs.has(id)) {
        this.addBomb(bombData);
      }
    });

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
    this.walls.clear(true, true);
    this.boxes.clear(true, true);

    const tileSize = 40;

    for (let y = 0; y < mapData.length; y++) {
      for (let x = 0; x < mapData[y].length; x++) {
        const tileX = x * tileSize + tileSize / 2;
        const tileY = y * tileSize + tileSize / 2;

        if (mapData[y][x] === 1) {
          this.walls
            .create(tileX, tileY, "wall")
            .setScale(tileSize / 32)
            .refreshBody();
        } else if (mapData[y][x] === 2) {
          this.boxes
            .create(tileX, tileY, "box")
            .setScale(tileSize / 32)
            .refreshBody();
        }
      }
    }

    this.players.forEach((player) => {
      this.physics.add.collider(player, this.walls);
      this.physics.add.collider(player, this.boxes);

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

    this.physics.add.collider(player, this.walls);
    this.physics.add.collider(player, this.boxes);

    this.players.forEach((otherPlayer) => {
      if (player !== otherPlayer) {
        this.physics.add.collider(player, otherPlayer);
      }
    });

    this.bombs.forEach((bomb) => {
      this.physics.add.collider(player, bomb);
    });

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

    const winnerText = this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY - 50,
        `GAME OVER!`,
        {
          fontSize: "32px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 4,
        }
      )
      .setOrigin(0.5);

    this.time.delayedCall(3000, () => {
      if (winnerText.scene) {
        winnerText.destroy();
      }
    });
  }

  private cleanupScene() {
    this.isGameActive = false;

    if (this.moveTimer) {
      this.moveTimer.remove();
      this.moveTimer = null;
    }

    this.players.forEach((player) => player.destroy());
    this.bombs.forEach((bomb) => bomb.destroy());
    this.powerUps.forEach((powerUp) => powerUp.destroy());

    this.players.clear();
    this.bombs.clear();
    this.powerUps.clear();

    if (this.walls) {
      this.walls.clear(true, true);
    }
    if (this.boxes) {
      this.boxes.clear(true, true);
    }

    this.socket.removeAllListeners();
  }

  shutdown() {
    this.cleanupScene();
  }

  destroy() {
    this.cleanupScene();
  }
}
