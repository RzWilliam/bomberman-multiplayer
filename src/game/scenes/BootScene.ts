import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    // Load assets
    this.load.spritesheet("player", "assets/player.png", {
      frameWidth: 32,
      frameHeight: 48,
    });
    this.load.image("bomb", "assets/bomb.png");
    this.load.image("explosion", "assets/explosion.png");
    this.load.image("wall", "assets/wall.png");
    this.load.image("box", "assets/box.png");
    this.load.image("powerup_bomb", "assets/powerup_bomb.png");
    this.load.image("powerup_speed", "assets/powerup_speed.png");
    this.load.image("powerup_power", "assets/powerup_power.png");

    // Loading bar
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(240, 270, 320, 50);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const loadingText = this.make.text({
      x: width / 2,
      y: height / 2 - 50,
      text: "Loading...",
      style: {
        font: "20px monospace",
        color: "#ffffff",
      },
    });
    loadingText.setOrigin(0.5, 0.5);

    this.load.on("progress", (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(250, 280, 300 * value, 30);
    });

    this.load.on("complete", () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();

      this.scene.start("GameScene");
    });
  }
}
