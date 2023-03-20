/*
snek: simple snake game program (p5.js tutorial/game programming practice)
https://betterprogramming.pub/how-to-build-your-first-snake-game-with-p5-js-577a45909fd7

basic game loop

    setup() -> draw()-> (is game running?) -yes-> (snake crashed?) --(no)-> (snake fed?)-yes->(grow snake)----|
                  |                                   |                         |                             |-> update score -> return to draw()    
                  -> (no) stop game                    -yes> stop game           ->no ------------------------|
*/


// global vars/structs

//pauses/resumes gameply
let pauseResumeElement = document.getElementById("btnPause");
pauseResumeElement.addEventListener("click", function(){
  if (Board.state == 0){
    Board.state =1;
    pauseResumeElement.innerHTML = "Pause";
  } else if (Board.state == 1){
    Board.state =2;
    pauseResumeElement.innerHTML = "Resume";
    noLoop();
  } else if (Board.state ==2){
    Board.state = 1;
    pauseResumeElement.innerHTML = "Pause";
    loop();
  }
})

let toggleGridElement = document.getElementById("btnGrid");
toggleGridElement.addEventListener("click", function(){
  if (Board.grid === 0){
    Board.grid = 1;
  }else if (Board.grid===1){
    Board.grid = 0;
  }
})

//board - represents state of game & field of play
let Board = {
  state: 0, //0 - not started, 1 - resume/run, 2- pause, 3 - crash/end
  bSize: 20,
  bCount: 20,
  boardWidth: function(){
    return this.bSize * this.bCount
  },
  boardHeight: function(){
    return this.bSize * this.bCount
  },
  score: 0,
  grid: 0
}

const snek = {
  direction:{
    x: 1,
    y: 0
  },
  positions: [{
    x: 5,
    y: 0
  },
  {
    x:4,
    y:0
  }
]
}

let food = {
  x: getRandomBoardCoordinate(),
  y: getRandomBoardCoordinate()
}

//speed of refresh rate & snek
let speed = 5;

//setup canvas and tag parent container
function setup() {
  let canvas = createCanvas(Board.boardWidth(), Board.boardHeight());
  canvas.parent('p5-container');
}

function drawGrid(){
  if (Board.grid ===1){
    for (i = 0; i < Board.boardHeight(); i+=Board.bSize){
      line(i,0,i, Board.boardHeight());
    }
    for (i = 0; i < Board.boardWidth(); i+=Board.bSize){
      line(0,i,Board.boardWidth(), i);
    }
  }
}

//main exdcution loop
function draw() {
  frameRate(speed);
  noStroke();
  stroke('darkgrey');

  strokeWeight(5);
  background('lightgrey');
  drawGrid();

  //if game starts or not crashed
  if (Board.state !=0 && Board.state !=3){
      let sX = snek.positions[0].x + snek.direction.x;
      let sY = snek.positions[0].y + snek.direction.y;

      if (hasCrashed(sX, sY)){
        pauseResumeElement.innerHTML = "CRASH!";
        Board.state = 3;
        noLoop();
      }
      snek.positions.unshift({
        x: sX,
        y: sY
  })

      //process food
        if(!snekEatenFood()) snek.positions.pop();
        processFood();

      //draw snake
      snek.positions.forEach(element => {
        rect(element.x*Board.bSize, element.y*Board.bSize, Board.bSize, Board.bSize);
      });
      Board.score++;
      document.getElementById("score").innerHTML  = "Score: " + Board.score;
  }
}

//handles crashed snek logic
function hasCrashed(x, y){
  console.log(snek.positions[0].x)
  if (x<0) return true;
  if (x > Board.bCount) return true;
  if (y < 0) return true;
  if (y > Board.bCount) return true;
  let crashed = false;
  snek.positions.forEach(e => {
    if (e.x === x && e.y === y) {
      console.log('snek crashed into self');
      crashed = true;
    }
  });
  return crashed;
}



/**
 * Check if snake has eaten the food
 * @returns true if snake's head is the same position as the food, else false
 */
function snekEatenFood() {
  return snek.positions[0].x === food.x && snek.positions[0].y === food.y
}

/**
 * Process the food. Update player score.
 */
function processFood() {
  if (snekEatenFood()) {
      Board.score += speed * 2;
      // if snake has eaten food place a new one:
      //  food should only be placed on a non-snake field
      let foodPlacedOnBody = false;
      do {
          food.x = getRandomBoardCoordinate();
          food.y = getRandomBoardCoordinate();
          snek.positions.forEach(el => {
              if (el.x === food.x && el.y === food.y) {
                  foodPlacedOnBody = true;
              }
          });
      } while (foodPlacedOnBody == true);
      Board.score++;
      speed += 0.5;
  }
  console.log(`Score: ${Board.score}`);
  ellipse(food.x * Board.bSize + Board.bSize/2, food.y * Board.bSize + Board.bSize/2, Board.bSize);
}

//WASD listeners for snek controlz
function keyPressed(){
  if (keyCode === 65){
    if (snek.direction.x > 0) return;
    snek.direction.x = -1;
    snek.direction.y = 0;
  } else if (keyCode === 68){
    if (snek.direction.x < 0 ) return;
    snek.direction.x = 1;
    snek.direction.y = 0;
  } else if (keyCode === 87){
    if (snek.direction.y > 0) return;
    snek.direction.x = 0;
    snek.direction.y = -1;
  } else if (keyCode === 83){
    if (snek.direction.y < 0) return;
    snek.direction.x = 0;
    snek.direction.y = 1;
  }
}

//random food generation
function getRandomBoardCoordinate() {
  return Math.floor(Math.random() * Board.bCount)
}
