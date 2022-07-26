import Phaser from '../lib/phaser.js';

export default class StartScreen extends Phaser.Scene {
  constructor(){
    super('start-screen');
  };

  preload(){
    this.load.image('startButton', 'assets/startButton.png');
  };

  create(){
    const width = this.scale.width;
    const height = this.scale.height;

    let startButton = this.add.sprite(width * 0.5, height - 140, 'startButton');
    startButton.setInteractive();

    startButton.on('pointerdown', function() {
      console.log('clicked');
      this.scene.start('game');
    }, this);

  };

}
