export default class Game extends Phaser.Scene {
  ball;
  paddle;
  cursors;

  constructor(){
    super('game');
  };

  preload(){
    this.load.image('ball', 'assets/ball.png');
    this.load.image('paddle', 'assets/paddle.png');
    this.cursors = this.input.keyboard.createCursorKeys();
  };

  create(){
    this.ball = this.physics.add.sprite(90, 160, 'ball');
    this.ball.body.collideWorldBounds = true;
    this.ball.body.bounce.set(1);
    this.ball.setVelocity(150, -150);

    this.paddle = this.physics.add.sprite(320, 250, 'paddle');
    this.paddle.body.immovable = true;

    this.physics.add.collider(this.ball, this.paddle);
    this.physics.world.checkCollision.down = false;
  };

  update(){
    if (this.input.activePointer.isDown){
      this.paddle.x = this.input.activePointer.x;
    } else if (this.cursors.left.isDown){
      this.paddle.setVelocityX(-200);
    } else if (this.cursors.right.isDown){
      this.paddle.setVelocityX(200);
    }

    if (this.ball && this.ball.body && this.ball.body.y > 260){
      this.ball.destroy();
      console.log("out");
    }

  };
}
