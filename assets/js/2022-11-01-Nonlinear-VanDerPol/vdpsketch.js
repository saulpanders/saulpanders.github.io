

// dynamic list with our points
let points = [];
let colors = ["#FF0000", "#00FF00", "#5555FF", "#FFFF00", "#FF00FF", "#00FFFF", "#FFCC00", "#DDFF00"];
let a, b, c, d;
// global configuration
let rand = new Array(500);
let vector_scale = 0.01

let time =0;

function setup(){
  let mycanvas = createCanvas(500, 500);
  mycanvas.parent('canvas');
  noStroke();
  background(22);
  smooth(8);


  for (let i =0; i<rand.length; i++) {
    rand[i] = int(random(-1, 10));
  }
  for (let i =0 ;i<10;i++){
    v = createVector(i*0.2+0.3,i*0.2+0.3);
    points.push(v);
  }
}

function draw() {
  var htmlDoc = parent.document;
  if(htmlDoc.getElementById("r").value){
	 var r = parseFloat(htmlDoc.getElementById("r").value);
  } else {
    var r = 0.5
  }

  translate(width/2, height/2);

   let x = 0;
   for ( p of points){
    // map floating point coordinates to screen coordinates
    xx = map(p.x, -6, 6, -width, width);
    yy = map(p.y, -6, 6, height, -height);

    //c = colors[Math.floor(r * colors.length)];
    fill("#00FF00");
    ellipse(xx, yy, 3, 3); //draw

    v = createVector(p.y,(1)*r*(1-p.x*p.x)*p.y-p.x);

    p.x += (vector_scale * v.x);
    p.y += (vector_scale * v.y);

    // we wanna change color;
    x++;
    time += 0.001;
  }
}

function update() {
  clear();
  createCanvas(500, 500);
  let mycanvas = createCanvas(500, 500);
  mycanvas.parent('canvas');
  noStroke();
  background(22);
  smooth(8);

  for (let i =0 ;i<10;i++){
    v = createVector(i*0.2+0.3,i*0.2+0.3);
    points[i] = v;
  }
  
} 