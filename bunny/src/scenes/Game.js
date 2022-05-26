import Phaser from '../lib/phaser.js';
import Carrot from '../game/Carrot.js';

export default class Game extends Phaser.Scene {
  player;
  platforms;
  cursors;
  carrots;
  carrotsCollected = 0;
  carrotsCollectedText;
  halfScreenWidth;
  skyColor;
  spaceColor;
  cameraHeight;
  cameraWidth;

  // TODO Cleanup carrots not picked up, see note in guide

  constructor(){
    super('game');
  };

  preload(){
    this.load.image('platform', 'assets/ground_grass2.png');
    this.load.image('bunny-stand', 'assets/bunny3_stand.png');
    this.load.image('bunny-jump', 'assets/bunny3_jump.png');
    this.load.image('carrot', 'assets/carrot2.png');
    this.cursors = this.input.keyboard.createCursorKeys();
    this.halfScreenWidth = this.sys.game.canvas.width/2;
  };

  create(){
    this.cameraHeight = this.cameras.main.height;
    this.cameraWidth = this.cameras.main.width;
    this.skyColor = new Phaser.Display.Color(203, 219, 252);
    this.spaceColor = new Phaser.Display.Color(0, 0, 0);
    this.cameras.main.setBackgroundColor(this.skyColor);
    this.platforms = this.physics.add.staticGroup();

    for (let i = 0; i < 5; ++i) {
      // x = width = 180 minus some padding
      const x = Phaser.Math.Between(10, 350);
      const y = 140 * i;

      const platform = this.platforms.create(x, y, 'platform');
      platform.scale = 2.5;

      const body = platform.body;
      body.updateFromGameObject();
    }

    // score
    const style = { color: '#000', fontSize: 24 };
    this.carrotsCollectedText = this.add.text(180, 10, 'Carrots: 0', style)
      .setScrollFactor(0)
      .setOrigin(0.5, 0);

    // add player
    this.player = this.physics.add.sprite(90, 160, 'bunny-stand').setScale(2.5);
    this.player.body.checkCollision.up = false;
    this.player.body.checkCollision.left = false;
    this.player.body.checkCollision.right = false;

    this.physics.add.collider(this.platforms, this.player);

    this.cameras.main.startFollow(this.player);
    // set the horizontal dead zone to 1.5x game width
    this.cameras.main.setDeadzone(this.scale.width * 1.5);

    this.carrots = this.physics.add.group({
      classType: Carrot
    });

    this.physics.add.collider(this.platforms, this.carrots);

    this.physics.add.overlap(
      this.player,
      this.carrots,
      this.handleCollectCarrot,
      undefined,
      this
    )
  };

  update(){
    this.platforms.children.iterate(child => {
      const platform = child;
      const scrollY = this.cameras.main.scrollY;

      if (platform.y >= scrollY + 700){
        platform.y = scrollY - Phaser.Math.Between(25, 50);
        platform.body.updateFromGameObject();
        this.addCarrotAbove(platform);
      }
    });

    const touchingDown = this.player.body.touching.down;
    if (touchingDown){
      // jump
      this.player.setVelocityY(-300);
      this.player.setTexture('bunny-jump');
    }

    const vy = this.player.body.velocity.y;
    if (vy > 0 && this.player.texture.key !== 'bunny-stand'){
      this.player.setTexture('bunny-stand');
    }

    // left and right handling swipe then keyboard
    this.player.setVelocityX(0);
    let tapDirection = "";

    if (this.input.activePointer.isDown && !touchingDown){
      if(this.input.activePointer.downX < this.halfScreenWidth) {
        tapDirection = "left";
      } else if(this.input.activePointer.downX > this.halfScreenWidth) {
        tapDirection = "right";
      }
    } else if (this.cursors.left.isDown && !touchingDown){
      this.player.setVelocityX(-200);
    } else if (this.cursors.right.isDown && !touchingDown){
      this.player.setVelocityX(200);
    }

    if(tapDirection == "left" && !touchingDown){
      this.player.setVelocityX(-300);
    } else if (tapDirection == "right" && !touchingDown){
      this.player.setVelocityX(300);
    }

    this.horizontalWrap(this.player);

    const bottomPlatform = this.findBottomMostPlatform();
    if (this.player.y > bottomPlatform.y + 200){
      console.log('game over');
      this.scene.start('game-over');
    }
  };

  horizontalWrap(sprite){
    const spriteWidth = sprite.displayWidth;
    const gameWidth = this.sys.game.canvas.width;
    if (sprite.x < -spriteWidth){
      sprite.x = gameWidth + spriteWidth
    } else if (sprite.x > gameWidth + spriteWidth){
      sprite.x = -spriteWidth;
    }
  };

  addCarrotAbove(sprite){
    const y = sprite.y - sprite.displayHeight;
    const carrot = this.carrots.get(sprite.x, y, 'carrot');

    // set active and visible
    carrot.setActive(true);
    carrot.setVisible(true);
    carrot.setScale(2.5);

    this.add.existing(carrot);
    carrot.body.setSize(carrot.width, carrot.height);
    // make sure body is enabed in the physics world
    this.physics.world.enable(carrot);
    return carrot;
  };

  handleCollectCarrot(player, carrot){
    this.carrots.killAndHide(carrot);
    this.physics.world.disableBody(carrot.body);
    this.carrotsCollected++;
    const value = `Carrots: ${this.carrotsCollected}`;
    this.carrotsCollectedText.text = value;
    this.player.setVelocityY(-325);
  }

  findBottomMostPlatform(){
    const platforms = this.platforms.getChildren();
    let bottomPlatform = platforms[0];

    for(let i = 1; i < platforms.length; ++i){
      const platform = platforms[i];

      if (platform.y < bottomPlatform.y){
        continue;
      }

      bottomPlatform = platform;
    }

    return bottomPlatform;
  }
}
