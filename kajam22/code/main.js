const FLOOR_HEIGHT = 48;
const JUMP_FORCE = 800;
const SPEED = 480;

// initialize context
kaboom({
  width: 640,
  height: 360,
  background: [ 93, 163, 238, ],
  debug: true, // TODO turn off
});

// load assets
loadSprite("bean", "sprites/bean.png");

scene("game", () => {
  gravity(2400); // make a const

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
    } else if (!doubleJumped) {
      bean.jump(JUMP_FORCE/2);
      doubleJumped = true;
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
    pos(width() / 2, height() / 2 + 80),
    origin("center"),
  ]);

  onKeyPress("space", () => go("game"));
  onTouchStart(() => go("game"));
});

go("start");

// Focus on the canvas so first tap works in game
//document.getElementById("gameCanvas").focus();

