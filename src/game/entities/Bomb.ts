import Phaser from "phaser";

export class Bomb extends Phaser.Physics.Arcade.Sprite {
  public id: string;
  public power: number;
  public playerId: string;
  private explosionSprites: Phaser.GameObjects.Sprite[] = [];
  private pulseTween: Phaser.Tweens.Tween | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    id: string,
    power: number,
    playerId: string
  ) {
    super(scene, x, y, "bomb");
    this.id = id;
    this.power = power;
    this.playerId = playerId;

    // Add to scene
    scene.add.existing(this);

    // Set bomb properties
    this.setScale(0.8);

    // Create a pulsing effect for the bomb
    this.pulseTween = scene.tweens.add({
      targets: this,
      scale: 1.0,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  update() {
    // Any per-frame updates
  }

  explode(explosionTiles: any[]) {
    // Check if the scene is still active
    if (!this.scene || !this.scene.scene.isActive()) {
      return;
    }

    // Stop the pulsing animation
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }

    // Create explosion sprites for each affected tile
    explosionTiles.forEach((tile) => {
      if (!this.scene || !this.scene.scene.isActive()) return;

      const explosion = this.scene.add.sprite(tile.x, tile.y, "explosion");

      // Set initial scale and alpha
      explosion.setScale(0.1);
      explosion.setAlpha(1);

      // Create a grow and fade effect
      this.scene.tweens.add({
        targets: explosion,
        scale: { from: 0.1, to: 1 },
        alpha: { from: 1, to: 0 },
        duration: 600,
        ease: "Power2",
        onComplete: () => {
          explosion.destroy();
        },
      });

      // Add particle effects
      if (this.scene.add.particles) {
        const particles = this.scene.add.particles(
          tile.x,
          tile.y,
          "explosion",
          {
            scale: { start: 0.2, end: 0 },
            speed: { min: 50, max: 100 },
            angle: { min: 0, max: 360 },
            alpha: { start: 0.5, end: 0 },
            lifespan: 300,
            quantity: 5,
            blendMode: "ADD",
          }
        );

        // Stop emitting after a short duration
        this.scene.time.delayedCall(100, () => {
          particles.destroy();
        });
      }

      this.explosionSprites.push(explosion);
    });

    // Create a flash effect
    if (this.scene && this.scene.scene.isActive()) {
      const flash = this.scene.add.rectangle(
        this.x,
        this.y,
        800,
        600,
        0xffffff,
        0.3
      );

      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 100,
        onComplete: () => {
          flash.destroy();
        },
      });

      // Add screen shake
      this.scene.cameras.main.shake(200, 0.005);
    }

    // Remove the bomb
    this.destroy();
  }

  destroy(fromScene?: boolean) {
    // Clean up explosion sprites
    this.explosionSprites.forEach((sprite) => {
      if (sprite && sprite.scene) {
        sprite.destroy();
      }
    });

    // Clean up tween if it exists
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }

    super.destroy(fromScene);
  }
}
