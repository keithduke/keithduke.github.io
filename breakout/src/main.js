import Game from './scenes/Game.js';
import GameOver from './scenes/GameOver.js';
import StartScreen from './scenes/StartScreen.js';

export default new Phaser.Game({
  type: Phaser.AUTO,
  width: 360,
  height: 640,
  scene: [StartScreen, Game, GameOver],
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  }
});

console.log('Online');
