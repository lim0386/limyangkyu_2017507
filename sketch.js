let menus = ['PUBLICATION', 'EDUCATION', 'EXPERIENCE', 'VIDEO', 'GALLERY', 'CONTACT'];
let nodes = [];
let mic; // p5.AudioIn
let micLevel = 0;
let wavePoints = []; // store wave y-values per x-step for collision
const WAVE_STEP = 10;
const GRAVITY = 0.18;

function setup() {
  createCanvas(windowWidth, windowHeight);
  // 메뉴 노드 생성
  // 마이크 입력 초기화 (사용자가 브라우저에서 권한을 허용해야 작동합니다)
  mic = new p5.AudioIn();
  mic.start();
  for (let i = 0; i < menus.length; i++) {
    // spawn nodes at the same top position so they all drop downward together
    const sx = random(40, width - 40);
    const sy = -120;
    nodes.push(new MenuNode(sx, sy, menus[i]));
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
    // ensure nodes all initially move downward with a strong initial drop
    this.vel = createVector(random(-0.12, 0.12), random(6, 9));
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

    // 중력 적용
    this.vel.y += GRAVITY;
    // 이동과 속도 제한
    this.pos.add(this.vel);
    this.vel.limit(12);

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
          // push node out and invert Y velocity for bounce
          // for falling nodes we expect they approach from above; always push them up and invert Y velocity
          this.pos.y = wy - this.size / 2 - 1;
          this.vel.y = -abs(this.vel.y) * 0.9;
          // add slight horizontal jitter so node doesn't stick
          this.vel.x += random(-0.5, 0.5);
        }
      }
    }

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
  // 마이크 레벨을 사용해 파형의 진폭을 조절 (민감도 향상, 부드러운 보정 적용)
  let raw = mic ? mic.getLevel() : 0;
  micLevel = lerp(micLevel, raw, 0.2); // 부드럽게 변화
  // micLevel 보정: 상한을 낮춰 작은 소리에도 민감하도록 함
  let amp = constrain(map(micLevel, 0, 0.12, 0, 1), 0, 1);
  let sway = amp * 1000; // 진폭 스케일 (증가)

  stroke(255, 30);
  noFill();
  wavePoints = [];
  // use a sinusoidal phase shift so the wave moves back-and-forth instead of continuously translating
  let t = frameCount * 0.03;
  let phaseShift = sin(t) * 2.4; // controls left/right oscillation amount
  beginShape();
  for (let x = 0; x < width; x += WAVE_STEP) {
    // use a slowly oscillating noise input (not a linear time scroll) for vertical texture
    let n = noise(x * 0.005, sin(frameCount * 0.006) * 0.5 + 0.5);
    let base = n * height * 0.5 + height * 0.25;
    let wave = sin((x * 0.02) + phaseShift) * sway;
    let y = base + wave;
    wavePoints.push(y);
    vertex(x, y);
  }
  endShape();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}