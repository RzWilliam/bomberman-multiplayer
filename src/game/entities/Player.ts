import Phaser from "phaser";

export class Player extends Phaser.Physics.Arcade.Sprite {
  public id: string;
  public bombCount: number;
  public bombPower: number;
  public speed: number;
  private nameText: Phaser.GameObjects.Text;
  private isDead: boolean = false;
  private lastDirection: string = "right";

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    id: string,
    color: number,
    name: string,
    bombCount: number = 1,
    bombPower: number = 1,
    speed: number = 50
  ) {
    super(scene, x, y, "player");
    this.id = id;
    this.bombCount = bombCount;
    this.bombPower = bombPower;
    this.speed = speed;

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set player properties
    this.setScale(1);
    this.setTint(color);
    this.setCollideWorldBounds(true);
    this.setSize(20, 32);
    this.setOffset(6, 8);

    // Create player name text
    this.nameText = scene.add
      .text(x, y - 30, name, {
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Create animations
    this.createAnimations();

    // Start with idle animation
    this.play("idle");
  }

  update() {
    if (this.isDead) return;

    // Update name text position
    this.nameText.setPosition(this.x, this.y - 30);

    // Update animation based on velocity
    const velocity = this.body?.velocity;
    if (velocity) {
      if (velocity.x !== 0 || velocity.y !== 0) {
        // Determine direction for animation
        if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
          this.lastDirection = velocity.x > 0 ? "right" : "left";
          this.play(velocity.x > 0 ? "walk-right" : "walk-left", true);
        } else {
          this.play(velocity.y > 0 ? "walk-down" : "walk-up", true);
        }
      } else {
        // If not moving, show idle animation based on last direction
        if (this.lastDirection === "left" || this.lastDirection === "right") {
          this.play("idle", true);
        } else if (this.lastDirection === "up") {
          this.play("idle-up", true);
        } else {
          this.play("idle-down", true);
        }
      }
    }
  }

  updateStats(bombCount: number, bombPower: number, speed: number) {
    this.bombCount = bombCount;
    this.bombPower = bombPower;
    this.speed = speed;
  }

  die() {
    this.isDead = true;
    this.setTint(0x666666);
    this.setAlpha(0.7);
    this.disableBody();
    this.play("die", true);
  }

  private createAnimations() {
    // Idle animation
    if (!this.scene.anims.exists("idle")) {
      this.scene.anims.create({
        key: "idle",
        frames: [{ key: "player", frame: 0 }],
        frameRate: 10,
      });
    }

    // Down walk animation
    if (!this.scene.anims.exists("walk-down")) {
      this.scene.anims.create({
        key: "walk-down",
        frames: this.scene.anims.generateFrameNumbers("player", {
          start: 1,
          end: 2,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    // Up walk animation
    if (!this.scene.anims.exists("walk-up")) {
      this.scene.anims.create({
        key: "walk-up",
        frames: this.scene.anims.generateFrameNumbers("player", {
          start: 3,
          end: 5,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    // Right walk animation
    if (!this.scene.anims.exists("walk-right")) {
      this.scene.anims.create({
        key: "walk-right",
        frames: this.scene.anims.generateFrameNumbers("player", {
          start: 6,
          end: 8,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    // Left walk animation
    if (!this.scene.anims.exists("walk-left")) {
      this.scene.anims.create({
        key: "walk-left",
        frames: this.scene.anims.generateFrameNumbers("player", {
          start: 9,
          end: 11,
        }),
        frameRate: 10,
        repeat: -1,
      });
    }

    // Death animation
    if (!this.scene.anims.exists("die")) {
      this.scene.anims.create({
        key: "die",
        frames: this.scene.anims.generateFrameNumbers("player", {
          start: 0,
          end: 3,
        }),
        frameRate: 10,
        repeat: 0,
      });
    }
  }

  destroy(fromScene?: boolean) {
    this.nameText.destroy();
    super.destroy(fromScene);
  }
}
