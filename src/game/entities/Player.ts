import Phaser from "phaser";

export class Player extends Phaser.Physics.Arcade.Sprite {
  public id: string;
  public bombCount: number;
  public bombPower: number;
  public speed: number;
  private nameText: Phaser.GameObjects.Text;
  private isDead: boolean = false;
  private lastDirection: string = "down";
  private isMoving: boolean = false;

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

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(1);
    this.setTint(color);
    this.setCollideWorldBounds(true);
    this.setSize(20, 32);
    this.setOffset(6, 8);

    this.nameText = scene.add
      .text(x, y - 30, name, {
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.createAnimations();
    this.play("idle-down");
  }

  update() {
    if (this.isDead) return;

    this.nameText.setPosition(this.x, this.y - 30);

    // Update animation based on velocity
    const velocity = this.body?.velocity;
    if (velocity) {
      if (velocity.x !== 0 || velocity.y !== 0) {
        this.isMoving = true;
        if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
          this.lastDirection = velocity.x > 0 ? "right" : "left";
          this.play(velocity.x > 0 ? "walk-right" : "walk-left", true);
        } else {
          this.lastDirection = velocity.y > 0 ? "down" : "up";
          this.play(velocity.y > 0 ? "walk-down" : "walk-up", true);
        }
      } else {
        this.isMoving = false;
        switch (this.lastDirection) {
          case "up":
            this.play("idle-up", true);
            break;
          case "down":
            this.play("idle-down", true);
            break;
          case "left":
          case "right":
            this.play("idle-down", true);
            break;
        }
      }
    }
  }

  private createAnimations() {
    // Idle animations
    if (!this.scene.anims.exists("idle-down")) {
      this.scene.anims.create({
        key: "idle-down",
        frames: [{ key: "player", frame: 1 }],
        frameRate: 10,
      });
    }

    if (!this.scene.anims.exists("idle-up")) {
      this.scene.anims.create({
        key: "idle-up",
        frames: [{ key: "player", frame: 3 }],
        frameRate: 10,
      });
    }

    // Walking animations
    if (!this.scene.anims.exists("walk-down")) {
      this.scene.anims.create({
        key: "walk-down",
        frames: this.scene.anims.generateFrameNumbers("player", { start: 1, end: 2 }),
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!this.scene.anims.exists("walk-up")) {
      this.scene.anims.create({
        key: "walk-up",
        frames: this.scene.anims.generateFrameNumbers("player", { start: 3, end: 5 }),
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!this.scene.anims.exists("walk-right")) {
      this.scene.anims.create({
        key: "walk-right",
        frames: this.scene.anims.generateFrameNumbers("player", { start: 6, end: 8 }),
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!this.scene.anims.exists("walk-left")) {
      this.scene.anims.create({
        key: "walk-left",
        frames: this.scene.anims.generateFrameNumbers("player", { start: 9, end: 11 }),
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!this.scene.anims.exists("die")) {
      this.scene.anims.create({
        key: "die",
        frames: this.scene.anims.generateFrameNumbers("player", { start: 0, end: 3 }),
        frameRate: 8,
        repeat: 0,
      });
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

  destroy(fromScene?: boolean) {
    this.nameText.destroy();
    super.destroy(fromScene);
  }
}