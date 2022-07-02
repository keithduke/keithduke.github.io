const JUMP_FORCE = 800;
const GRAVITY_FORCE = 2400;
const MOVESPEED = 200;
const ENEMY_MOVESPEED = 210;
const LEVELS = [
  [
    "                                                                                                          ",
    "                                                                                                  t       ",
    "                               ================                                                   m       ",
    "                                                                                                  m       ",
    "                                                                                                  m       ",
    "                             b b                              b                                   m       ",
    "                b                                            b                                    g       ",
    "==============lhr===============================lhrlhr=====================lhr==lhr=======================",
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
	// The image contains 9 frames layed out horizontally, slice it into individual frames
	sliceX: 8,
	// Define animations
	anims: {
		"idle": {
			// Starts from frame 0, ends at frame 3
			from: 0,
			to: 3,
			// Frame per second
			speed: 5,
			loop: true,
		},
		"run": {
			from: 0,
			to: 7,
			speed: 12,
			loop: true,
		},
		// This animation only has 1 frame
		"jump": 8
	}
});

loadSprite("antagonist", "sprites/newfarmer.png", {
	// The image contains 9 frames layed out horizontally, slice it into individual frames
	sliceX: 9,
	// Define animations
	anims: {
		"run": {
			from: 0,
			to: 7,
			speed: 12,
			loop: true,
		},
		// This animation only has 1 frame
		"gotcha": 8
	}
});

loadSprite("bird", "sprites/bird.png", {
	// The image contains 9 frames layed out horizontally, slice it into individual frames
  scale: 1,
	sliceX: 4,
	// Define animations
	anims: {
		"idle": {
			// Starts from frame 0, ends at frame 3
			from: 0,
			to: 3,
			// Frame per second
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
loadSprite("background", "sprites/background.png");
loadSound("jump", "sounds/jump-sound.wav");
loadSound("doubleJump", "sounds/sfx_movement_jump2.wav");
loadSound("impact", "sounds/sfx_sounds_impact9.wav");
loadSound("chirp", "sounds/bird2.wav");
loadSound("themeSong", "sounds/TechnoTronic2.mp3");
volume(0.25);
// debug.inspect = true;

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

  // TODO why is this here?
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
    pos(-20, 40),
    area(),
    body(),
    move(RIGHT, ENEMY_MOVESPEED),
    "antagonist",
  ]);

  pepper.play("run");
  antagonist.play("run");

  let doubleJumped = false;
  function jump() {
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

  onKeyPress("space", jump);
  onTouchStart(jump);

  function spawnBird() {
    add([
      sprite("bird", {anim: 'idle'}),
      pos(pepper.pos.x + width(), rand(120, 200)),
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

  let score = 0;
  const scoreLabel = add([
    text(
      score, {
        font: "sinko",
        size: 36
      }
    ),
    pos(24,24),
  ]);

  onUpdate(() => {
    score++;
    scoreLabel.text = score;
    if (pepper.pos.x < 0 || pepper.pos.y > 350){
        go("lose", score);
    }
  });

  pepper.onUpdate(() => {
    var cameraPosition = camPos();
    if (cameraPosition.x < pepper.pos.x){
      camPos(pepper.pos.x, cameraPosition.y);
    }
  });

  pepper.onCollide("bird", (bird) => {
    follow(bird);
  });

  pepper.onCollide("gate", (gate) => {
    go("lose", score);
  });

  pepper.onCollide("antagonist", (antagonist) => {
    // if you havent fallen into a hole
    if (pepper.pos.y < 185){
      destroy(pepper);
      antagonist.play("gotcha");

      add([
        text("GOTCHA!", {font:"sinko", size: 48}),
        pos(camPos()),
        color(255, 0, 0),
        origin("center"),
        layer("ui"),
        lifespan(1, { fade: 0.5 })
      ]);

      wait(1, () => {
        go("lose", score);
      });
    }
  });

  pepper.onCollide("bird", (tree) => {
    addKaboom(pepper.pos);
    play("chirp", {volume: 0.25});
    shake();
    //go("lose", score);
    // push bean

    pepper.move(-1200, 0);
    destroy(tree);
    if (pepper.pos.x < 0) {
        go("lose", score);
    }
  });

  antagonist.onCollide("bird", (tree) => {
    addKaboom(antagonist.pos);
    play("chirp", {volume: 0.25});
    antagonist.move(-1200, 0);
    destroy(tree);
  });

  antagonist.onCollide("bird", (bird) => {
    destroy(bird);
    antagonist.move(-1200, 0);
    // sqwak sound
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
  onKeyPress("space", () => go("game"));
  onTouchStart(() => go("game"));
});

scene("lose", (score) => {

  themeSong.stop();
  // High score is browser based, using localStorage
  let highScore = localStorage.getItem('highScore');
  let highScoreText = "";
  let shakeIt = false;

  if (highScore) {
    highScoreText = "High Score: " + highScore;
  }

  let yourScoreText = "Your Score: " + score;

  if (!highScore || highScore < score){
    localStorage.setItem("highScore", score);
    highScoreText = "New High Score!";
    shakeIt = true;
  }

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
      highScoreText, {
        size: 24,
        font: "sink"
      }
    ),
    pos(width() / 2, height() / 2 + 40),
    origin("center"),
    "highScoreText",
  ]);

  add([
    text(
      yourScoreText, {
        size: 24,
        font: "sink"
      }
    ),
    pos(width() / 2, height() / 2 + 80),
    origin("center"),
  ]);

  onKeyPress("space", () => go("game"));
  onTouchStart(() => go("game"));

  onUpdate(() => {
    if (shakeIt) {
      // apply random values
      // let oddOrEven = Math.random() < 0.5 ? -1 : 1;
      // let a = oddOrEven * (Math.floor(Math.random() * 100));
      // let b = oddOrEven * (Math.random() * 40);
      console.log("we should be shaking it");
    }
  });

});

go("start");

// Focus on the canvas so first tap works in game
document.getElementById("gameCanvas").focus();

