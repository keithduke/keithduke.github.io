console.log('Online');

import Phaser from './lib/phaser.js';
import Game from './scenes/Game.js';
import GameOver from './scenes/GameOver.js';

export default new Phaser.Game({
  type: Phaser.AUTO,
  width: 360,
  height: 640,
  scene: [Game, GameOver],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: {
        y: 200
      },
      debug: true
    }
  }
});

