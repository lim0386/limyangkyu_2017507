let menus = ['PUBLICATION', 'EDUCATION', 'EXPERIENCE', 'VIDEO', 'GALLERY', 'CONTACT'];
let nodes = [];
let mic; // p5.AudioIn
let micLevel = 0;
let wavePoints = []; // store wave y-values per x-step for collision
const WAVE_STEP = 10;
const GRAVITY = 0.25;

function setup() {
  createCanvas(windowWidth, windowHeight);
  // 메뉴 노드 생성
  // 마이크 입력 초기화 (사용자가 브라우저에서 권한을 허용해야 작동합니다)
  mic = new p5.AudioIn();
  mic.start();
  for (let i = 0; i < menus.length; i++) {
    // spawn nodes from above the canvas so they fall in
    nodes.push(new MenuNode(random(60, width - 60), random(-220, -40), menus[i]));
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
  // separate nodes so they don't overlap visually
  separateNodes();
}

function separateNodes(){
  for(let i=0;i<nodes.length;i++){
    for(let j=i+1;j<nodes.length;j++){
      let a = nodes[i];
      let b = nodes[j];
      let minDist = (a.size + b.size)/2 + 6; // small gap
      let d = p5.Vector.dist(a.pos, b.pos);
      if(d < minDist){
        if(d < 0.001){
          // avoid exact overlap
          let jitter = createVector(random(-1,1), random(-1,1)).mult(2);
          a.pos.add(jitter);
          d = p5.Vector.dist(a.pos, b.pos);
        }
        let overlap = minDist - d;
        let dir = p5.Vector.sub(a.pos, b.pos).normalize();
        let push = dir.mult(overlap * 0.5);
        a.pos.add(push);
        b.pos.sub(push);
        // damp/adjust velocities to reduce future overlap
        a.vel.add(push.copy().mult(0.08));
        b.vel.sub(push.copy().mult(0.08));
      }
    }
  }
}

class MenuNode {
  constructor(x, y, label) {
    this.pos = createVector(x, y);
    // give an initial downward velocity so nodes drop
    this.vel = createVector(random(-0.6, 0.6), random(1, 3));
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

    // apply gravity and integrate
    this.vel.y += GRAVITY;
    this.pos.add(this.vel);
    this.vel.limit(8);

    // 파형과 충돌 체크: wavePoints에 따라 튕기기
    if (wavePoints && wavePoints.length > 0) {
      let xi = floor(this.pos.x / WAVE_STEP);
      xi = constrain(xi, 0, wavePoints.length - 1);
      let wy = wavePoints[xi];
      if (wy !== undefined) {
        let distToWave = this.pos.y - wy; // positive if node below the wave
        let overlap = (this.size / 2) - abs(distToWave);
        // if absolute vertical distance is less than radius -> collision
        if (abs(distToWave) < this.size / 2) {
          // Ensure node stays above the wave surface — never sink below.
          // Always position node just above the wave and give an upward bounce.
          this.pos.y = wy - this.size / 2 - 1;
          this.vel.y = -max(1, abs(this.vel.y)) * 0.8; // bounce up with some energy
          // add slight horizontal jitter so node doesn't stick
          this.vel.x += random(-0.6, 0.6);
        }
      }
    }

    // 벽에 튕기기 (x축은 반사)
    if (this.pos.x < 50) {
      this.pos.x = 50;
      this.vel.x *= -1;
    }
    if (this.pos.x > width - 50) {
      this.pos.x = width - 50;
      this.vel.x *= -1;
    }

    // 바닥 처리: 바닥에 걸려서 떨지 않도록 위치 보정 및 감쇠/반발
    const bottomLimit = height - 40;
    if (this.pos.y > bottomLimit) {
      this.pos.y = bottomLimit;
      // if vertical speed is very small, give a small kick upward to avoid trembling
      if (abs(this.vel.y) < 0.6) this.vel.y = -random(2, 4);
      else this.vel.y = -abs(this.vel.y) * 0.6;
      // damp horizontal motion slightly
      this.vel.x *= 0.9;
    }

    // ceiling
    if (this.pos.y < -120) {
      this.pos.y = -120;
      this.vel.y = 0.1;
    }

    // light air friction
    this.vel.mult(0.995);
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
  // 마이크 레벨을 사용해 파형의 진폭을 조절
  micLevel = mic ? mic.getLevel() : 0;
  // micLevel 보정
  let amp = constrain(map(micLevel, 0, 0.3, 0, 1), 0, 1);
  let sway = amp * 700; // 진폭 스케일

  stroke(255, 30);
  noFill();
  // build wavePoints at WAVE_STEP resolution for collision checks
  wavePoints = [];
  beginShape();
  for (let x = 0; x < width; x += WAVE_STEP) {
    let base = noise(x * 0.005, frameCount * 0.01) * height * 0.5 + height * 0.25;
    let wave = sin((x * 0.02) + frameCount * 0.06) * sway;
    let y = base + wave;
    vertex(x, y);
    wavePoints.push(y);
  }
  endShape();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}