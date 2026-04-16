let menus = ['PUBLICATION', 'EDUCATION', 'EXPERIENCE', 'VIDEO', 'GALLERY', 'CONTACT'];
let nodes = [];
let mic; // p5.AudioIn
let micLevel = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  // 메뉴 노드 생성
  // 마이크 입력 초기화 (사용자가 브라우저에서 권한을 허용해야 작동합니다)
  mic = new p5.AudioIn();
  mic.start();
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
    // 커서(마우스)를 피하는 동작
    let mousePos = createVector(constrain(mouseX, 0, width), constrain(mouseY, 0, height));
    let d = p5.Vector.dist(this.pos, mousePos);
    const avoidRadius = 120;
    if (d < avoidRadius) {
      let away = p5.Vector.sub(this.pos, mousePos);
      away.setMag((avoidRadius - d) / avoidRadius * 2.5);
      this.vel.add(away);
    }

    // 이동과 속도 제한
    this.pos.add(this.vel);
    this.vel.limit(4);

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