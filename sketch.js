let menus = ['PUBLICATION', 'EDUCATION', 'EXPERIENCE', 'VIDEO', 'GALLERY', 'CONTACT'];
let nodes = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  // 메뉴 노드 생성
  for (let i = 0; i < menus.length; i++) {
    nodes.push(new MenuNode(random(width), random(height), menus[i]));
  }
}

function draw() {
  background(15, 15, 25); // 어두운 테마
  
  // 배경에 은은한 파형 효과 (Music Skyline 컨셉 차용)
  drawBackgroundWave();

  for (let node of nodes) {
    node.update();
    node.display();
    node.checkHover(mouseX, mouseY);
  }
}

class MenuNode {
  constructor(x, y, label) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(0.5);
    this.label = label;
    this.size = 80;
    this.isHovered = false;
  }

  update() {
    this.pos.add(this.vel);
    // 벽에 튕기기
    if (this.pos.x < 50 || this.pos.x > width - 50) this.vel.x *= -1;
    if (this.pos.y < 50 || this.pos.y > height - 50) this.vel.y *= -1;
  }

  display() {
    stroke(255, 150);
    noFill();
    if (this.isHovered) {
      fill(0, 150, 255, 50);
      ellipse(this.pos.x, this.pos.y, this.size * 1.2);
    }
    ellipse(this.pos.x, this.pos.y, this.size);
    
    textAlign(CENTER, CENTER);
    fill(255);
    noStroke();
    text(this.label, this.pos.x, this.pos.y);
  }

  checkHover(mx, my) {
    let d = dist(mx, my, this.pos.x, this.pos.y);
    this.isHovered = (d < this.size / 2);
  }
  
  // 클릭 시 실제 페이지로 이동하는 로직 추가 가능
}

function drawBackgroundWave() {
  stroke(255, 30);
  noFill();
  beginShape();
  for (let x = 0; x < width; x += 10) {
    let y = noise(x * 0.005, frameCount * 0.01) * height;
    vertex(x, y);
  }
  endShape();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}