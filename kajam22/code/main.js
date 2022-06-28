const FLOOR_HEIGHT = 48;
const JUMP_FORCE = 800;
const SPEED = 480;
const GRAVITY_FORCE = 2400;
const LEVELS = [
  [
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "================================================================================================",
    "================================================================================================",
  ],
  [
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "                                                                                                ",
    "================================================================================================",
    "================================================================================================",
  ]
];

// Screen size stuffs
const gameWidth = 640;
const gameHeight = 320;
// initialize context
kaboom({
  width: gameWidth,
  height: gameHeight,
  background: [ 93, 163, 238, ],
  canvas: document.getElementById("gameCanvas"),
  debug: true, // TODO turn off
});

// load assets
loadSprite("bean", "sprites/bean.png");
loadSound("jump", "sounds/jump-sound.wav");
loadSound("doubleJump", "sounds/sfx_movement_jump2.wav");
loadSound("impact", "sounds/sfx_sounds_impact9.wav");

scene("game", () => {
  gravity(GRAVITY_FORCE);

  // add floor
  add([
    rect(width(), 48),
    pos(0, height() - 48),
    outline(4),
    area(),
    solid(),
    color(127, 200, 255),
  ]);

  // add a character to screen
  const bean = add([
    sprite("bean"),
    pos(80, 40),
    area(),
    body(),
  ]);

  let doubleJumped = false;
  function jump() {
    if (bean.isGrounded()) {
      bean.jump(JUMP_FORCE);
      doubleJumped = false;
      play("jump");
    } else if (!doubleJumped) {
      bean.jump(JUMP_FORCE/2);
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

  spawnTree();

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
  });

  bean.onCollide("tree", () => {
    addKaboom(bean.pos);
    play("impact");
    shake();
    go("lose", score);
  });

});

scene("start", () => {
  add([
    sprite("bean"),
    pos(width() / 2, height() / 2 - 80),
    scale(2),
    origin("center"),
  ]);


  add([
    text(
      "Hit space or tap to begin", {
        size: 24,
        font: "sink"
      }
    ),
    pos(width() / 2, height() / 2 + 80),
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
    sprite("bean"),
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
    pos(width() / 2, height() / 2 + 40),
    origin("center"),
  ]);

  add([
    text(
      highScoreText, {
        size: 24,
        font: "sink"
      }
    ),
    pos(width() / 2, height() / 2 + 80),
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
    pos(width() / 2, height() / 2 + 120),
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

