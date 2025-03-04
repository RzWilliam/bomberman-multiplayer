import Phaser from 'phaser';

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
    super(scene, x, y, 'bomb');
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
      ease: 'Sine.easeInOut'
    });
  }

  update() {
    // Any per-frame updates
  }

  explode(explosionTiles: any[]) {
    // Stop the pulsing animation
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }
    
    // Create explosion sprites for each affected tile
    explosionTiles.forEach(tile => {
      const explosion = this.scene.add.sprite(tile.x, tile.y, 'explosion');
      
      // Set initial scale based on distance from bomb center
      const centerTile = explosionTiles[0]; // First tile is the center
      const distance = Phaser.Math.Distance.Between(
        centerTile.x, centerTile.y, tile.x, tile.y
      );
      
      // Scale based on distance and power
      const baseScale = 0.6;
      const powerScale = this.power * 0.2;
      const distanceScale = distance > 0 ? Math.max(0.5, 1 - (distance / (this.power * 80))) : 1;
      
      explosion.setScale(baseScale * distanceScale * powerScale);
      
      // Create a grow and fade effect
      this.scene.tweens.add({
        targets: explosion,
        scale: explosion.scale * 1.5,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          explosion.destroy();
        }
      });
      
      this.explosionSprites.push(explosion);
    });
    
    // Remove the bomb
    this.destroy();
  }

  destroy(fromScene?: boolean) {
    // Clean up explosion sprites
    this.explosionSprites.forEach(sprite => sprite.destroy());
    
    // Clean up tween if it exists
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }
    
    super.destroy(fromScene);
  }
}