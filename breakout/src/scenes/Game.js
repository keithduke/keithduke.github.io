export default class Game extends Phaser.Scene {
  ball;
  paddle;
  bricks;
  cursors;

  constructor(){
    super('game');
  };

  preload(){
    this.load.image('ball', 'assets/ball.png');
    this.load.image('paddle', 'assets/paddle.png');
    this.load.image('brick', 'assets/brick.png');
    this.cursors = this.input.keyboard.createCursorKeys();
  };

  create(){
    this.ball = this.physics.add.sprite(90, 160, 'ball');
    this.ball.body.collideWorldBounds = true;
    this.ball.body.bounce.set(1);
    this.ball.setVelocity(150, -150);

    const height = this.scale.height;
    this.paddle = this.physics.add.sprite(175, height - 200, 'paddle');
    this.paddle.body.immovable = true;

    this.physics.add.collider(this.ball, this.paddle);
    this.physics.world.checkCollision.down = false;

    this.initBricks();
  };

  update(){
    if (this.input.activePointer.isDown){
      this.paddle.x = this.input.activePointer.x;
    } else if (this.cursors.left.isDown){
      this.paddle.setVelocityX(-200);
    } else if (this.cursors.right.isDown){
      this.paddle.setVelocityX(200);
    }

    if (this.ball && this.ball.body && this.ball.body.y > 640){
      this.ball.destroy();
      this.scene.start('game-over');
    }
  };

  ballHitBrick(ball, brick){
    brick.destroy();
  }

  initBricks(){
    const brickInfo = {
      width: 32,
      height: 20,
      count: {
        row: 3,
        col: 7
      },
      offset: {
        top: 32,
        left: 60
      },
      padding: 10
    };

    this.bricks = this.add.group();

    for (let c=0; c<brickInfo.count.col; c++){
      for (let r=0; r<brickInfo.count.row; r++){
        var brickX = (c * (brickInfo.width + brickInfo.padding)) + brickInfo.offset.left;
        var brickY = (r * (brickInfo.height + brickInfo.padding)) + brickInfo.offset.top;

        let newBrick = this.physics.add.sprite(brickX, brickY, 'brick');
        newBrick.body.immovable = true;
        this.bricks.add(newBrick);
      };
    };

    this.physics.add.collider(this.ball, this.bricks, this.ballHitBrick);
  };
}
