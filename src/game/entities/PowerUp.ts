import Phaser from 'phaser';

export enum PowerUpType {
  BOMB = 'bomb',
  SPEED = 'speed',
  POWER = 'power'
}

export class PowerUp extends Phaser.Physics.Arcade.Sprite {
  public id: string;
  public type: PowerUpType;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    id: string,
    type: PowerUpType
  ) {
    super(scene, x, y, `powerup_${type}`);
    this.id = id;
    this.type = type;

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Set power-up properties
    this.setScale(0.8);

    // Add a pulsing effect
    scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }

  collect() {
    // Play collection animation
    this.scene.tweens.add({
      targets: this,
      scale: 1.5,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.destroy();
      }
    });
  }
}