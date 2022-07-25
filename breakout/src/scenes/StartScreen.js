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

    this.add.text(width * 0.5, height * 0.5, 'Press button',{fontsize:48})
      .setOrigin(0.5);

    this.add.sprite(width * 0.5, height * 0.85, 'startButton');
  };

}
