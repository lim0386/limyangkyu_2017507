let menus = ['EXPERIENCE', 'GALLERY', 'EDUCATION'];
let nodes = [];
let mic; // p5.AudioIn
let micLevel = 0;
let wavePoints = []; // store wave y-values per x-step for collision
const WAVE_STEP = 10;
const GRAVITY = 0.25;

// UI data
let images = {};
let profiles = [];
let cardW = 420;
let cardH = 140;
let padding = 24;

// interaction state
let hoverIndex = -1;
// visibleButtons[id] = { expiry: ms, alpha: 0 }
let visibleButtons = {};
let introOpen = false;
let introContent = '';

function preload(){
  const files = { yklim: 'yklim.jpg', shim: 'bkshim.jpg', moon: 'mhmoon2.png', kim: 'yhkim.png', boti: 'boti.png', seo: 'shseo.jpg' };
  for(let k in files){
    images[k] = loadImage(files[k], ()=>{}, ()=>{ images[k]=null; });
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  mic = new p5.AudioIn();
  mic.start();

  profiles = [
    { id:'prof', name:'임양규 교수', title:'연구실 대표 교수', email:'trumpetyk09@duksung.ac.kr', img: images.yklim, type:'professor' },
    { id:'shim', name:'심보광', title:'박사과정', email:'galent@duksung.ac.kr', img: images.shim, type:'student' },
    { id:'moon', name:'문민혜', title:'석사과정', email:'minhyemoon@duksung.ac.kr', img: images.moon, type:'student' },
    { id:'kim', name:'김영한', title:'석사과정', email:'', img: images.kim, type:'student' },
    { id:'boti', name:'보티존', title:'석사과정', email:'botirjonabdulvoxidov@gmail.com', img: images.boti, type:'student' },
    { id:'seo', name:'서수현', title:'석사과정', email:'watermu@duksung.ac.kr', img: images.seo, type:'student' }
  ];

  for (let i = 0; i < menus.length; i++) {
    nodes.push(new MenuNode(random(60, width - 60), random(-220, -40), menus[i]));
  }
}

function draw() {
  background(15, 15, 25);

  drawBackgroundWave();

  layoutCards();

  for (let node of nodes) {
    node.update();
    node.display();
  }
  separateNodes();

  if (introOpen) drawIntroPanel();
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
          let jitter = createVector(random(-1,1), random(-1,1)).mult(2);
          a.pos.add(jitter);
          d = p5.Vector.dist(a.pos, b.pos);
        }
        let overlap = minDist - d;
        let dir = p5.Vector.sub(a.pos, b.pos).normalize();
        let push = dir.mult(overlap * 0.5);
        a.pos.add(push);
        b.pos.sub(push);
        a.vel.add(push.copy().mult(0.08));
        b.vel.sub(push.copy().mult(0.08));
      }
    }
  }
}

class MenuNode {
  constructor(x, y, label) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-0.6, 0.6), random(1, 3));
    this.label = label;
    this.size = 80;
    this.isHovered = false;
  }

  update() {
    let mousePos = createVector(constrain(mouseX, 0, width), constrain(mouseY, 0, height));
    let d = p5.Vector.dist(this.pos, mousePos);
    const avoidRadius = 120;
    if (d < avoidRadius) {
      let away = p5.Vector.sub(this.pos, mousePos);
      away.setMag((avoidRadius - d) / avoidRadius * 2.5);
      this.vel.add(away);
    }

    this.vel.y += GRAVITY;
    this.pos.add(this.vel);
    this.vel.limit(8);

    if (wavePoints && wavePoints.length > 0) {
      let xi = floor(this.pos.x / WAVE_STEP);
      xi = constrain(xi, 0, wavePoints.length - 1);
      let wy = wavePoints[xi];
      if (wy !== undefined) {
        let distToWave = this.pos.y - wy;
        if (abs(distToWave) < this.size / 2) {
          this.pos.y = wy - this.size / 2 - 1;
          this.vel.y = -max(1, abs(this.vel.y)) * 0.8;
          this.vel.x += random(-0.6, 0.6);
        }
      }
    }

    if (this.pos.x < 50) { this.pos.x = 50; this.vel.x *= -1; }
    if (this.pos.x > width - 50) { this.pos.x = width - 50; this.vel.x *= -1; }

    const bottomLimit = height - 40;
    if (this.pos.y > bottomLimit) {
      this.pos.y = bottomLimit;
      if (abs(this.vel.y) < 0.6) this.vel.y = -random(2, 4);
      else this.vel.y = -abs(this.vel.y) * 0.6;
      this.vel.x *= 0.9;
    }

    if (this.pos.y < -120) { this.pos.y = -120; this.vel.y = 0.1; }
    this.vel.mult(0.995);
  }

  display() {
    stroke(255, 150);
    noFill();
    ellipse(this.pos.x, this.pos.y, this.size);
    if (this.isHovered) {
      fill(0, 150, 255, 40);
      ellipse(this.pos.x, this.pos.y, this.size * 1.2);
    }
    textAlign(CENTER, CENTER);
    fill(255);
    noStroke();
    text(this.label, this.pos.x, this.pos.y);
  }
}

function drawBackgroundWave() {
  micLevel = mic ? mic.getLevel() : 0;
  let amp = constrain(map(micLevel, 0, 0.3, 0, 1), 0, 1);
  let sway = amp * 700;

  stroke(255, 30);
  noFill();
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

function layoutCards(){
  // responsive card size
  cardW = min(420, width - padding*2);
  cardH = 140; // fixed to match original CSS
  padding = 24;

  // compute positions
  let px = padding;
  let py = padding + 20;

  // If professor's buttons visible, shift students down so buttons don't overlap
  let profVisible = visibleButtons['prof'] && visibleButtons['prof'].expiry > millis();
  let extraShift = profVisible ? 44 : 0;

  // students row below
  let startY = py + cardH + 28 + extraShift;
  let gap = 18;
  let cols = floor((width - padding*2 + gap) / (cardW + gap));
  cols = max(1, cols);
  let x = padding;
  let y = startY;
  for(let i=1;i<profiles.length;i++){
    drawCard(profiles[i], x, y, cardW, cardH);
    x += cardW + gap;
    if (x + cardW > width - padding){ x = padding; y += cardH + gap; }
  }

  // draw professor last so its buttons render on top
  drawCard(profiles[0], px, py, cardW, cardH);
}

function drawCard(p, x, y, w, h){
  // save rect for interaction
  p._x = x; p._y = y; p._w = w; p._h = h;

  push();
  // drop shadow
  noStroke();
  fill(0,0,0,100);
  rect(x+4, y+6, w, h, 12);
  // card background
  if (p.type === 'professor') fill(24,24,28, 255);
  else fill(32,32,42, 255);
  rect(x, y, w, h, 12);

  // photo area
  let imgSize = (p.type==='professor')?100:90;
  let ix = x + 12; let iy = y + (h - imgSize)/2;
  fill(48); rect(ix, iy, imgSize, imgSize, imgSize*0.2);
  if (p.img) {
    imageMode(CORNER);
    image(p.img, ix, iy, imgSize, imgSize);
  } else {
    fill(120); textAlign(CENTER, CENTER); textSize(14);
    text('No Image', ix + imgSize/2, iy + imgSize/2);
  }
  // photo border
  noFill(); stroke(80); strokeWeight(2); rect(ix, iy, imgSize, imgSize, imgSize*0.2);
  noStroke();

  // text
  fill(255); textAlign(LEFT, TOP);
  let tx = ix + imgSize + 12;
  let ty = y + 12;
  if (p.type === 'professor') { textSize(22); }
  else { textSize(18); }
  text(p.name, tx, ty);
  textSize(14); fill(176); text(p.title, tx, ty + ((p.type==='professor')?30:26));
  textSize(13); fill(150); text(p.email, tx, ty + ((p.type==='professor')?56:50));

  // hover detection -> extend expiry
  if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h){
    hoverIndex = profiles.indexOf(p);
    if (!visibleButtons[p.id]) visibleButtons[p.id] = { expiry: millis() + 2000, alpha: 0 };
    else visibleButtons[p.id].expiry = millis() + 2000;
  } else {
    if (!visibleButtons[p.id]) visibleButtons[p.id] = { expiry: 0, alpha: 0 };
  }

  // update alpha for this card's buttons (fade in/out)
  let vb = visibleButtons[p.id];
  if (vb) {
    let target = (vb.expiry > millis())?255:0;
    if (vb.alpha < target) vb.alpha = min(255, vb.alpha + 28);
    if (vb.alpha > target) vb.alpha = max(0, vb.alpha - 28);
    if (vb.alpha > 5) drawButtons(p, x, y, w, h, vb.alpha);
  }

  pop();
}

function drawButtons(p, x, y, w, h, alpha){
  push();
  let bx = x + 12;
  let by = y + h + 8;
  let bw = 100; let bh = 30; let bgap = 8;
  let buttons = (p.type === 'professor')?['자기소개','Google Scholar','YouTube']:['자기소개','연구업적'];
  p._buttons = p._buttons || [];
  for(let i=0;i<buttons.length;i++){
    let rx = bx + i * (bw + bgap);
    fill(255, 215, 0, alpha); // #ffd700
    noStroke(); rect(rx, by, bw, bh, 8);
    fill(35, 35, 35, alpha); textAlign(CENTER, CENTER); textSize(13);
    text(buttons[i], rx + bw/2, by + bh/2);
    p._buttons[i] = { x: rx, y: by, w: bw, h: bh, label: buttons[i] };
  }
  pop();
}

function drawIntroPanel(){
  push();
  let W = min(680, width - 80);
  let H = min(420, height - 160);
  let x = (width - W)/2; let y = (height - H)/2;
  fill(36,36,43, 240); rect(x, y, W, H, 14);
  fill(255); textSize(16); textAlign(LEFT, TOP);
  text(introContent, x + 24, y + 24, W - 48, H - 80);
  // close button
  let cx = x + W - 96; let cy = y + H - 56; fill(255); rect(cx, cy, 72, 36, 8);
  fill(12); textAlign(CENTER, CENTER); text('닫기', cx + 36, cy + 18);
  pop();
}

function mousePressed(){
  if (introOpen){
    // check close
    let W = min(680, width - 80);
    let H = min(420, height - 160);
    let x = (width - W)/2; let y = (height - H)/2;
    let cx = x + W - 96; let cy = y + H - 56;
    if (mouseX >= cx && mouseX <= cx + 72 && mouseY >= cy && mouseY <= cy + 36){ introOpen = false; }
    return;
  }

  // check buttons on visible cards
  for(let p of profiles){
    if (p._buttons){
      for(let b of p._buttons){
        if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h){
          // handle action
          if (b.label === '자기소개'){
            introOpen = true;
            if (p.id === 'prof') introContent = '임양규 교수\n\n연구실 대표 교수 소개 내용...';
            else if (p.id === 'moon') introContent = '문민혜 — 석사과정\n\n(이곳에 자기소개 내용이 들어갑니다.)';
            else if (p.id === 'shim') introContent = '심보광 — 박사과정\n\n(자기소개 내용)';
            else introContent = p.name + '\n\n(자기소개 내용 없음)';
          } else if (b.label === '연구업적'){
            if (p.id === 'shim') window.open('https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART002914157','_blank');
            else if (p.id === 'boti') window.open('https://www.earticle.net/Article/A474319','_blank');
            else window.open('#','_blank');
          } else if (b.label === 'Google Scholar'){
            if (p.id === 'seo') window.open('https://scholar.google.com/citations?hl=ko&user=FsV6clgAAAAJ','_blank');
            else window.open('#','_blank');
          } else if (b.label === 'YouTube'){
            window.open('#','_blank');
          }
        }
      }
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}