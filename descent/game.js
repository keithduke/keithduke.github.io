let game;

// global object where to store game options
let gameOptions = {

    // first platform vertical position. 0 = top of the screen, 1 = bottom of the screen
    firstPlatformPosition: 1 / 10,

    // game gravity, which only affects the hero
    gameGravity: 1200,

    // hero speed, in pixels per second
    heroSpeed: 300,

    // platform speed, in pixels per second
    platformSpeed: 190,

    // platform length range, in pixels
    platformLengthRange: [50, 150],

    // platform horizontal distance range from the center of the stage, in pixels
    platformHorizontalDistanceRange: [0, 250],

    // platform vertical distance range, in pixels
    platformVerticalDistanceRange: [150, 300]
}

window.onload = function() {

    // game configuration object
    let gameConfig = {
        type: Phaser.AUTO,
        backgroundColor:0x444444,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            parent: "thegame",
            width: 750,
            height: 1334
        },
        physics: {
            default: "arcade"
        },
        scene: playGame
    }
    game = new Phaser.Game(gameConfig);
    window.focus();
}
class playGame extends Phaser.Scene {
    constructor() {
        super("PlayGame");
    }
    preload() {
        this.load.image("hero", "hero.png");
        this.load.image("platform", "platform.png");
    }
    create() {

        // creation of the physics group which will contain all platforms
        this.platformGroup = this.physics.add.group();

        // create starting platform
        let platform = this.platformGroup.create(game.config.width / 2, game.config.height * gameOptions.firstPlatformPosition, "platform");

        // platform won't physically react to collisions
        platform.setImmovable(true);

        // we are going to create 10 more platforms which we'll reuse to save resources
        for(let i = 0; i < 10; i ++) {

            // platform creation, as a member of platformGroup physics group
            let platform = this.platformGroup.create(0, 0, "platform");

            // platform won't physically react to collisions
            platform.setImmovable(true);

            // position the platform
            this.positionPlatform(platform)
        }

        // add the hero
        this.hero = this.physics.add.sprite(game.config.width / 2, 0, "hero");

        // set hero gravity
        this.hero.body.gravity.y = gameOptions.gameGravity;

        // input listener to move the hero
        this.input.on("pointerdown", this.moveHero, this);

        // input listener to stop the hero
        this.input.on("pointerup", this.stopHero, this);

        // we are waiting for player first move
        this.firstMove = true;
    }

    // method to return a random value between index 0 and 1 of a giver array
    randomValue(a) {
        return Phaser.Math.Between(a[0], a[1]);
    }

    // method to move the hero
    moveHero(e) {

        // set hero velocity according to input horizontal coordinate
        this.hero.setVelocityX(gameOptions.heroSpeed * ((e.x > game.config.width / 2) ? 1 : -1));

        // is it the first move?
        if(this.firstMove) {

            // it's no longer the first move
            this.firstMove = false;

            // move platform group
            this.platformGroup.setVelocityY(-gameOptions.platformSpeed);
        }
    }

    // method to stop the hero
    stopHero() {

        // ... just stop the hero :)
        this.hero.setVelocityX(0);
    }

    // method to get the lowest platform, returns the position of the lowest platform, in pixels
    getLowestPlatform() {
        let lowestPlatform = 0;
        this.platformGroup.getChildren().forEach(function(platform) {
            lowestPlatform = Math.max(lowestPlatform, platform.y);
        });
        return lowestPlatform;
    }

    // method to position a platform
    positionPlatform(platform) {

        // vertical position
        platform.y = this.getLowestPlatform() + this.randomValue(gameOptions.platformVerticalDistanceRange);

        // horizontal position
        platform.x = game.config.width / 2 + this.randomValue(gameOptions.platformHorizontalDistanceRange) * Phaser.Math.RND.sign();

        // platform width
        platform.displayWidth = this.randomValue(gameOptions.platformLengthRange);
    }

    // method to be executed at each frame
    update(){

        // handle collision between ball and platforms
        this.physics.world.collide(this.platformGroup, this.hero);

        // loop through all platforms
        this.platformGroup.getChildren().forEach(function(platform) {

            // if a platform leaves the stage to the upper side...
            if(platform.getBounds().bottom < 0) {

                // ... recycle the platform
                this.positionPlatform(platform);
            }
        }, this);

        // if the hero falls down or leaves the stage from the top...
        if(this.hero.y > game.config.height || this.hero.y < 0) {

            // restart the scene
            this.scene.start("PlayGame");
        }
    }
}
