const JUMP_FORCE = 800;
const GRAVITY_FORCE = 2400;
const MOVESPEED = 200;
const ENEMY_MOVESPEED = 220;
const LEVELS = [
  [
    "                                                                                                          ",
    "                                                                                                  t       ",
    "                               ioooooooooooooop                                                   m       ",
    "                                 y          y                                                     m       ",
    "a                                y    aaa   y                                                     m       ",
    "aa                               y   aaaaaa y                aaaa                                 m       ",
    "aaa                              u aaaaaaaa u              u aaaa u                               g       ",
    "================================================lhrlhr=====================lhr==lhr=======================",
  ]
];

// Screen size
const gameWidth = 640;
const gameHeight = 256;

// initialize context
kaboom({
  width: gameWidth,
  height: gameHeight,
  background: [ 0, 153, 219, ],
  canvas: document.getElementById("gameCanvas"),
});

// load assets
loadSprite("pepper", "sprites/pepper.png", {
	sliceX: 8,
	anims: {
		"run": {
			from: 0,
			to: 7,
			speed: 12,
			loop: true,
		}
	}
});

loadSprite("antagonist", "sprites/newfarmer.png", {
	sliceX: 9,
	anims: {
		"run": {
			from: 0,
			to: 7,
			speed: 12,
			loop: true,
		},
		"gotcha": 8
	}
});

loadSprite("bird", "sprites/bird.png", {
  scale: 1,
	sliceX: 6,
	anims: {
		"idle": {
			from: 0,
			to: 3,
			speed: 5,
			loop: true,
		},
    "exploded": {
      from: 4,
      to: 5,
      speed: 5,
      loop: true,
    }
	}
});

loadSprite("bean", "sprites/bean.png");
loadSprite("ground", "sprites/ground.png");
loadSprite("basetile", "sprites/basetile.png");
loadSprite("leftHole", "sprites/leftHole.png");
loadSprite("rightHole", "sprites/rightHole.png");
loadSprite("hole", "sprites/hole.png");
loadSprite("gateBottom", "sprites/gateBottom.png");
loadSprite("gateMiddle", "sprites/gateMiddle.png");
loadSprite("gateTop", "sprites/gateTop.png");
loadSprite("barnLeft", "sprites/barnLeft.png");
loadSprite("barnMiddle", "sprites/barnMiddle.png");
loadSprite("barnRight", "sprites/barnRight.png");
loadSprite("barnPoleBottom", "sprites/barnPoleBottom.png");
loadSprite("barnPoleMiddle", "sprites/barnPoleMiddle.png");
loadSprite("haybale", "sprites/haybale.png");
loadSprite("background", "sprites/background.png");
loadSound("jump", "sounds/jump-sound.wav");
loadSound("doubleJump", "sounds/sfx_movement_jump2.wav");
loadSound("impact", "sounds/sfx_sounds_impact9.wav");
loadSound("chirp", "sounds/bird2.wav");
loadSound("themeSong", "sounds/TechnoTronic2.mp3");
volume(0.25);

const levelConfig = {
  width: 32,
  height: 32,
  pos: (0,0),
  "=": () => [
    sprite("basetile"),
    area(),
    solid(),
    "ground"
  ],
  "b": () => [
    sprite("bird", {anim: 'idle'}),
    scale(0.75),
    area(),
    solid(),
    move(LEFT, MOVESPEED),
    "bird"
  ],
  "l": () => [
    sprite("leftHole"),
    area(),
    solid()
  ],
  "r": () => [
    sprite("rightHole")
  ],
  "h": () => [
    sprite("hole")
  ],
  "i": () => [
    sprite("barnLeft"),
    area(),
    solid(),
    "ground"
  ],
  "o": () => [
    sprite("barnMiddle"),
    area(),
    solid(),
    "ground"
  ],
  "p": () => [
    sprite("barnRight"),
    area(),
    solid(),
    "ground"
  ],
  "a": () => [
    sprite("haybale")
  ],
  "y": () => [
    sprite("barnPoleMiddle")
  ],
  "u": () => [
    sprite("barnPoleBottom")
  ],
  "g": () => [
    sprite("gateBottom"),
    area(),
    "gate"
  ],
  "m": () => [
    sprite("gateMiddle"),
    area(),
    "gate"
  ],
  "t": () => [
    sprite("gateTop"),
    area(),
    "gate"
  ],
};

const themeSong = play("themeSong", {loop: true});

scene("game", (levelNumber = 0) => {
  layers([
    "bg",
    "game",
    "ui",
  ], "game");

  gravity(GRAVITY_FORCE);

  const LEVEL = addLevel(LEVELS[levelNumber], levelConfig);
  themeSong.stop();
  themeSong.play();

  add([
    text("Level " + (levelNumber + 1), { size: 24 }),
    pos(vec2(150, 120)),
    color(255, 255, 255),
    origin("center"),
    layer("ui"),
    fixed(),
    lifespan(1, { fade: 0.5 })
  ]);

  // add background
  add([
    sprite("background"),
    layer("bg"),
    fixed(),
  ]);

  // add our runner
  const pepper = add([
    sprite("pepper"),
    pos(80, 40),
    area(),
    body(),
    move(RIGHT, MOVESPEED),
  ]);

  // add the thing chasing
  const antagonist = add([
    sprite("antagonist"),
    pos(-120, 40),
    area(),
    body(),
    move(RIGHT, ENEMY_MOVESPEED),
    "antagonist",
  ]);

  pepper.play("run");
  antagonist.play("run");

  let doubleJumped = false;
  function jump() {
    if (!pepper.isDead){
      if (pepper.isGrounded()) {
        pepper.jump(JUMP_FORCE);
        doubleJumped = false;
        play("jump");
      } else if (!doubleJumped) {
        pepper.jump(JUMP_FORCE/2);
        doubleJumped = true;
        play("doubleJump");
      }
    }
  }

  onKeyPress("space", jump);
  onTouchStart(jump);

  function spawnBird() {
    add([
      sprite("bird", {anim: 'idle'}),
      pos(pepper.pos.x + width(), rand(140, 200)),
      scale(0.75),
      area(),
      solid(),
      move(LEFT, MOVESPEED),
      "bird"
    ]);
    // From the example, infinite recursion
    wait(rand(0.5,2), () => {
      spawnBird();
    });
  };

  spawnBird();

  pepper.onCollide("gate", (gate) => {
    go("end", "Congrats! You escaped!");
  });

  pepper.onCollide("antagonist", (antagonist) => {
    // if you havent fallen into a hole
    if (pepper.pos.y > 180){
      pepper.isDead = true;
      destroy(pepper);
      antagonist.play("gotcha");

      add([
        text("GOTCHA!", {font:"sinko", size: 96}),
        pos(camPos()),
        color(255, 0, 0),
        origin("center"),
        layer("ui"),
        lifespan(1, { fade: 0.5 })
      ]);

      wait(1, () => {
        go("end", "You were caught by the farmer!");
      });
    }
  });

  pepper.onCollide("bird", (bird) => {
    destroy(bird);
    play("chirp", {volume: 0.25});
    shake();
    pepper.move(-600, 0);
    add([
      sprite("bird", {anim: 'exploded'}),
      pos(bird.pos),
      scale(1),
      move(LEFT, MOVESPEED/2),
      lifespan(1, { fade: 1 })
    ]);
  });

  antagonist.onCollide("bird", (bird) => {
    destroy(bird);
    play("chirp", {volume: 0.25});
    antagonist.move(-1200, 0);
    add([
      sprite("bird", {anim: 'exploded'}),
      pos(bird.pos),
      scale(1),
      move(LEFT, MOVESPEED/2),
      lifespan(1, { fade: 1 })
    ]);
  });

  onUpdate(() => {
    if (pepper.pos.x < 0 || pepper.pos.y > 350){
        go("end", "You fell into a hole!");
    }
  });

  pepper.onUpdate(() => {
    var cameraPosition = camPos();
    if (cameraPosition.x < pepper.pos.x){
      camPos(pepper.pos.x, cameraPosition.y);
    }
  });


});

scene("start", () => {
  add([
    text(
      "Panic! at the Pepper Patch", {
        size: 24,
        font: "sinko"
      }
    ),
    pos(width() / 2, height() / 2),
    origin("center"),
    color(255, 0, 0)
  ]);

  add([
    text(
      "Hit space or tap to begin", {
        size: 16,
        font: "sink"
      }
    ),
    pos(width() / 2, height() / 2 + 40),
    origin("center"),
    color(0, 255, 0)
  ]);

  themeSong.play();
  onKeyPress("space", () => go("howto"));
  onTouchStart(() => go("howto"));
});

scene("howto", () => {
  add([
    text(
      "Can you escape the frantic farmer\nwho is hot to catch you?\nPress space or tap screen to\njump over obstacles and make it to the end!", {
        size: 16,
        font: "sink"
      }
    ),
    pos(width() / 2, height() / 2),
    origin("center"),
    color(255, 255, 255)
  ]);

  add([
    text(
      "Hit space or tap to begin", {
        size: 16,
        font: "sink"
      }
    ),
    pos(width() / 2, height() / 2 + 60),
    origin("center"),
    color(0, 255, 0)
  ]);


  onKeyPress("space", () => go("game"));
  onTouchStart(() => go("game"));
});

scene("end", (endingText) => {

  themeSong.stop();

  add([
    sprite("pepper"),
    pos(width() / 2, height() / 2 - 80),
    scale(2),
    origin("center"),
  ]);

  add([
    text(
      "Game Over", {
        size: 36,
        font: "sink"
      }
    ),
    pos(width() / 2, height() / 2),
    origin("center"),
  ]);

  add([
    text(
      endingText, {
        size: 24,
        font: "sink"
      }
    ),
    pos(width() / 2, height() / 2 + 40),
    origin("center"),
    "endingText",
  ]);

  add([
    text(
      "Hit space or tap to retry", {
        size: 16,
        font: "sink"
      }
    ),
    pos(width() / 2, height() / 2 + 80),
    origin("center"),
  ]);

  onKeyPress("space", () => go("game"));
  onTouchStart(() => go("game"));

});

// Fire it up!
go("start");

// Focus on the canvas so first tap works in game
document.getElementById("gameCanvas").focus();

