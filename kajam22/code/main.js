const JUMP_FORCE = 800;
const GRAVITY_FORCE = 2400;
const LEVELS = [
  [
    "                                                                                                ",
    "                                                                                                ",
    "                               ================                                                 ",
    "                                                                                                ",
    "                  ~ ~                   ~ ~ ~ ~                                                 ",
    "                                                                                                ",
    "                                                                                                ",
    "===============================================  =  ============================================",
  ]
];

// Screen size
const gameWidth = 640;
const gameHeight = 256;

// initialize context
kaboom({
  width: gameWidth,
  height: gameHeight,
  background: [ 93, 163, 238, ],
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

// load assets
loadSprite("antagonist", "sprites/antagonist.png", {
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

loadSprite("bean", "sprites/bean.png");
loadSprite("ground", "sprites/ground.png");
loadSound("jump", "sounds/jump-sound.wav");
loadSound("doubleJump", "sounds/sfx_movement_jump2.wav");
loadSound("impact", "sounds/sfx_sounds_impact9.wav");
volume(0.25);
// debug.inspect = true;

const levelConfig = {
  width: 32,
  height: 32,
  pos: (0,0),
  "=": () => [
    sprite("ground"),
    area(),
    solid(),
    "ground"
  ],
  "~": () => [
    sprite("ground"),
    area(),
    solid(),
    move(LEFT, 240),
    "movingGround"
  ]
};

scene("game", (levelNumber = 0) => {
  layers([
    "bg",
    "game",
    "ui",
  ], "game");

  // TODO why is this here?
  gravity(GRAVITY_FORCE);

  const LEVEL = addLevel(LEVELS[levelNumber], levelConfig);

  add([
    text("Level " + (levelNumber + 1), { size: 24 }),
    pos(vec2(150, 120)),
    color(255, 255, 255),
    origin("center"),
    layer("ui"),
    lifespan(1, { fade: 0.5 })
  ]);

  // add floor
  /*
  add([
    rect(width(), 48),
    pos(0, height() - 48),
    outline(4),
    area(),
    solid(),
    color(127, 200, 255),
  ]);
  */

  // add a character to screen
  const pepper = add([
    sprite("pepper"),
    pos(80, 40),
    area(),
    body(),
    move(RIGHT, 240),
  ]);

  // add the thing chasing
  const antagonist = add([
    sprite("antagonist"),
    pos(-40, 40),
    area(),
    body(),
    move(RIGHT, 245),
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

  function spawnTree() {
    add([
      rect(12, rand(24, 64)),
      area(),
      outline(4),
      pos(width(), height() - 48),
      origin("botleft"),
      color(255, 180, 255),
      move(LEFT, 240),
      "tree", // tag name
    ]);
    // From the example, infinite recursion
    wait(rand(0.5,2), () => {
      spawnTree();
    });
  };

  //spawnTree();

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

  pepper.onCollide("movingGround", (movingGround) => {
    follow(movingGround);
  });

  pepper.onCollide("antagonist", (antagonist) => {
    go("lose", score);
  });

  pepper.onCollide("tree", (tree) => {
    addKaboom(pepper.pos);
    play("impact");
    shake();
    //go("lose", score);
    // push bean

    pepper.move(-1200, 0);
    destroy(tree);
    if (pepper.pos.x < 0) {
        go("lose", score);
    }
  });

  antagonist.onCollide("tree", (tree) => {
    addKaboom(antagonist.pos);
    play("impact");
    antagonist.move(-1200, 0);
    destroy(tree);
  });


});

scene("start", () => {
  add([
    text(
      "Panic! at the Pepper Patch", {
        size: 24,
        font: "sink"
      }
    ),
    pos(width() / 2, height() / 2),
    origin("center"),
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
  ]);

  onKeyPress("space", () => go("game"));
  onTouchStart(() => go("game"));
});

scene("lose", (score) => {

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

