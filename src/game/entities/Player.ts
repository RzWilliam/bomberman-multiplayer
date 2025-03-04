import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  public id: string;
  public bombCount: number;
  public bombPower: number;
  public speed: number;
  private nameText: Phaser.GameObjects.Text;
  private isDead: boolean = false;

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
    super(scene, x, y, 'player');
    this.id = id;
    this.bombCount = bombCount;
    this.bombPower = bombPower;
    this.speed = speed;
    
    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Set player properties
    this.setScale(0.8);
    this.setTint(color);
    this.setCollideWorldBounds(true);
    this.setSize(24, 32);
    this.setOffset(4, 16);
    
    // Create player name text
    this.nameText = scene.add.text(x, y - 30, name, {
      fontSize: '14px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    
    // Create animations
    this.createAnimations();
  }

  update() {
    if (this.isDead) return;
    
    // Update name text position
    this.nameText.setPosition(this.x, this.y - 30);
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
  }

  private createAnimations() {
    // Create player animations (idle, walk, etc.)
    if (!this.scene.anims.exists('player_idle')) {
      this.scene.anims.create({
        key: 'player_idle',
        frames: this.scene.anims.generateFrameNumbers('player', { start: 0, end: 0 }),
        frameRate: 10,
        repeat: -1
      });
    }
    
    if (!this.scene.anims.exists('player_walk')) {
      this.scene.anims.create({
        key: 'player_walk',
        frames: this.scene.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
      });
    }
    
    // Play idle animation by default
    this.play('player_idle');
  }

  destroy(fromScene?: boolean) {
    this.nameText.destroy();
    super.destroy(fromScene);
  }
}