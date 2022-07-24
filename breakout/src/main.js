import Game from './scenes/Game.js';
import GameOver from './scenes/GameOver.js';

export default new Phaser.Game({
  type: Phaser.AUTO,
  width: 640,
  height: 256,
  scene: [Game, GameOver],
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  }
});

console.log('Online');
