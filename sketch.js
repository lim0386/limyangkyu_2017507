let menus = ['EXPERIENCE', 'GALLERY', 'EDUCATION'];
let nodes = [];
let mic; // p5.AudioIn
let micLevel = 0;
let wavePoints = []; // store wave y-values per x-step for collision
const WAVE_STEP = 10;
const GRAVITY = 0.25;
const THEME = {
  midnight: '#122C4F',
  pearl: '#FBF9E4',
  noir: '#000000',
  ocean: '#5B88B2'
};

// UI data
let images = {};
let uiFonts = {};
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
let pageHeader = null;

function ensurePageHeader(){
  if (pageHeader) return;
  if (!document.getElementById('sega-font-faces')) {
    const fontStyle = document.createElement('style');
    fontStyle.id = 'sega-font-faces';
    fontStyle.textContent = `
      @font-face { font-family: 'SegaLight'; src: url('fonts/3Light.ttf') format('truetype'); font-weight: 300; font-style: normal; }
      @font-face { font-family: 'SegaRegular'; src: url('fonts/4Regular.ttf') format('truetype'); font-weight: 400; font-style: normal; }
      @font-face { font-family: 'SegaSemiBold'; src: url('fonts/6SemiBold.ttf') format('truetype'); font-weight: 600; font-style: normal; }
      @font-face { font-family: 'SegaExtraBold'; src: url('fonts/8ExtraBold.ttf') format('truetype'); font-weight: 800; font-style: normal; }
    `;
    document.head.appendChild(fontStyle);
  }

  const canvasContainer = document.getElementById('canvas-container');
  pageHeader = document.createElement('header');
  pageHeader.id = 'site-header';
  pageHeader.innerHTML = '<h1>Sound Exploration &amp; Generative Arts Lab.</h1>';
  pageHeader.style.position = 'relative';
  pageHeader.style.zIndex = '3';
  pageHeader.style.padding = '16px 24px 4px 24px';

  const title = pageHeader.querySelector('h1');
  title.style.margin = '0';
  title.style.fontSize = 'clamp(1.6rem, 2.8vw, 3rem)';
  title.style.lineHeight = '1.05';
  title.style.letterSpacing = '-0.03em';
  title.style.fontFamily = "SegaExtraBold, 'Segoe UI', sans-serif";
  title.style.fontWeight = '700';
  title.style.color = THEME.pearl;
  title.style.textShadow = '0 8px 24px rgba(0,0,0,0.5)';

  if (canvasContainer && canvasContainer.parentNode) {
    canvasContainer.parentNode.insertBefore(pageHeader, canvasContainer);
  } else {
    document.body.insertBefore(pageHeader, document.body.firstChild);
  }
}

function preload(){
  uiFonts.light = loadFont('fonts/3Light.ttf', ()=>{}, ()=>{ uiFonts.light = null; });
  uiFonts.regular = loadFont('fonts/4Regular.ttf', ()=>{}, ()=>{ uiFonts.regular = null; });
  uiFonts.semiBold = loadFont('fonts/6SemiBold.ttf', ()=>{}, ()=>{ uiFonts.semiBold = null; });
  uiFonts.extraBold = loadFont('fonts/8ExtraBold.ttf', ()=>{}, ()=>{ uiFonts.extraBold = null; });

  const files = { yklim: 'yklim.jpg', shim: 'bkshim.jpg', moon: 'mhmoon2.png', kim: 'yhkim.png', boti: 'boti.png', seo: 'shseo.jpg' };
  for(let k in files){
    images[k] = loadImage(files[k], ()=>{}, ()=>{ images[k]=null; });
  }
}

function setCanvasFont(weight){
  let fontObj = null;
  if (weight === 'light') fontObj = uiFonts.light;
  else if (weight === 'semiBold') fontObj = uiFonts.semiBold;
  else if (weight === 'extraBold') fontObj = uiFonts.extraBold;
  else fontObj = uiFonts.regular;

  if (fontObj) textFont(fontObj);
  else textFont('sans-serif');
}

// draw an image clipped to a circle of given size at (x,y)
function drawCircularImage(img, x, y, size, crop){
  push();
  // use canvas clipping so the image itself is drawn circular
  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  imageMode(CORNER);
  if (img) {
    if (crop && typeof crop.sx === 'number'){
      // draw with source cropping: image(img, sx, sy, sw, sh, dx, dy, dw, dh)
      let sx = crop.sx, sy = crop.sy, sw = crop.sw, sh = crop.sh;
      // ensure integer bounds
      sx = max(0, sx); sy = max(0, sy);
      sw = Math.floor(max(1, min(img.width - sx, sw)));
      sh = Math.floor(max(1, min(img.height - sy, sh)));
      // if crop area is too small (or invalid) fall back to full-image draw
      if (sw < 20 || sh < 20) {
        image(img, x, y, size, size);
      } else {
        image(img, x, y, size, size, sx, sy, sw, sh);
      }
    } else {
      image(img, x, y, size, size);
    }
  }
  else {
    noStroke(); fill(120); rect(x, y, size, size);
    fill(255); textAlign(CENTER, CENTER); textSize(12);
    text('No Image', x + size/2, y + size/2);
  }
  ctx.restore();
  pop();
}

function buildSquareCoverCrop(img, biasX, biasY, scaleFactor){
  if (!img || !img.width || !img.height) return null;
  const sideBase = min(img.width, img.height);
  const side = floor(sideBase * (scaleFactor || 1));
  const clampedSide = constrain(side, 1, sideBase);
  const bx = typeof biasX === 'number' ? biasX : 0.5;
  const by = typeof biasY === 'number' ? biasY : 0.5;
  const sx = floor((img.width - clampedSide) * bx);
  const sy = floor((img.height - clampedSide) * by);
  return {
    sx: constrain(sx, 0, img.width - clampedSide),
    sy: constrain(sy, 0, img.height - clampedSide),
    sw: clampedSide,
    sh: clampedSide
  };
}

function setup() {
  ensurePageHeader();
  createCanvas(windowWidth, windowHeight).parent('canvas-container');
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
  background(THEME.noir);

  drawBackgroundWave();

  for (let node of nodes) {
    node.update();
    node.display();
  }
  separateNodes();

  layoutCards();

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
    stroke(251, 249, 228, 150);
    noFill();
    ellipse(this.pos.x, this.pos.y, this.size);
    if (this.isHovered) {
      fill(91, 136, 178, 55);
      ellipse(this.pos.x, this.pos.y, this.size * 1.2);
    }
    textAlign(CENTER, CENTER);
    fill(THEME.pearl);
    noStroke();
    setCanvasFont('semiBold');
    text(this.label, this.pos.x, this.pos.y);
  }
}

function drawBackgroundWave() {
  micLevel = mic ? mic.getLevel() : 0;
  let amp = constrain(map(micLevel, 0, 0.3, 0, 1), 0, 1);
  let sway = amp * 700;

  stroke(91, 136, 178, 85);
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
  const buttonReserve = 46;
  const rowGap = 14;
  const rowHeight = cardH + buttonReserve + rowGap;

  // compute positions
  let px = padding;
  let py = padding + 20;

  // students row below
  let startY = py + cardH + buttonReserve + rowGap;
  let gap = 18;
  let cols = floor((width - padding*2 + gap) / (cardW + gap));
  cols = max(1, cols);
  let x = padding;
  let y = startY;
  for(let i=1;i<profiles.length;i++){
    drawCard(profiles[i], x, y, cardW, cardH);
    x += cardW + gap;
    if (x + cardW > width - padding){ x = padding; y += rowHeight; }
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
  if (p.type === 'professor') fill(251, 249, 228, 95);
  else fill(18, 44, 79, 130);
  rect(x+4, y+6, w, h, 12);
  // card background
  if (p.type === 'professor') fill(251, 249, 228, 248);
  else fill(18, 44, 79, 240);
  rect(x, y, w, h, 12);

  // photo area (circular)
  let imgSize = (p.type==='professor')?100:90;
  let ix = x + 18; let iy = y + (h - imgSize)/2;
  let cx = ix + imgSize/2; let cy = iy + imgSize/2;
  fill(91, 136, 178, 90); noStroke(); ellipse(cx, cy, imgSize, imgSize);
  // for specific profiles we can pass a crop region so the important area is shown
  // 김영한은 기존 대비 20% 더 타이트하게, 얼굴 위치(약간 오른쪽/아래)에 맞춘 정사각형 크롭 사용
  if (p.id === 'kim' && p.img && p.img.width && p.img.height) {
    if (!p._kimCrop) {
      p._kimCrop = buildSquareCoverCrop(p.img, 0.58, 0.28, 0.67);
    }
    drawCircularImage(p.img, ix, iy, imgSize, p._kimCrop);
  } else {
    if (!p._squareCrop) {
      let biasX = 0.5;
      let biasY = 0.5;
      let scaleFactor = 1;
      if (p.id === 'moon') {
        scaleFactor = 0.95;
        biasY = 0.43;
      } else if (p.id === 'seo') {
        biasY = 0.43;
      }
      p._squareCrop = buildSquareCoverCrop(p.img, biasX, biasY, scaleFactor);
    }
    drawCircularImage(p.img, ix, iy, imgSize, p._squareCrop);
  }
  // photo border (circle)
  if (p.type === 'professor') stroke(18, 44, 79, 120);
  else stroke(251, 249, 228, 90);
  noFill(); strokeWeight(2); ellipse(cx, cy, imgSize, imgSize);
  noStroke();

  // text
  textAlign(LEFT, TOP);
  let tx = ix + imgSize + 24;
  let ty = y + 20;
  setCanvasFont('extraBold');
  if (p.type === 'professor') fill(THEME.midnight);
  else fill(THEME.pearl);
  if (p.type === 'professor') { textSize(22); }
  else { textSize(18); }
  text(p.name, tx, ty);
  setCanvasFont('regular');
  textSize(14);
  if (p.type === 'professor') fill(27, 59, 95, 210);
  else fill(205, 221, 238, 235);
  text(p.title, tx, ty + ((p.type==='professor')?30:26));
  setCanvasFont('light');
  textSize(13);
  if (p.type === 'professor') fill(50, 80, 112, 190);
  else fill(170, 196, 222, 230);
  text(p.email, tx, ty + ((p.type==='professor')?56:50));

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
  let by = y + h + 10;
  let bw = 100; let bh = 30; let bgap = 8;
  let buttons = (p.type === 'professor')?['자기소개','Google Scholar','YouTube']:['자기소개','연구업적'];
  p._buttons = p._buttons || [];
  for(let i=0;i<buttons.length;i++){
    let rx = bx + i * (bw + bgap);
    fill(251, 249, 228, alpha);
    stroke(91, 136, 178, alpha);
    strokeWeight(1);
    rect(rx, by, bw, bh, 8);
    noStroke();
    setCanvasFont('semiBold');
    fill(18, 44, 79, alpha); textAlign(CENTER, CENTER); textSize(13);
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
  fill(18, 44, 79, 238); rect(x, y, W, H, 14);
  setCanvasFont('regular');
  fill(THEME.pearl); textSize(16); textAlign(LEFT, TOP);
  text(introContent, x + 24, y + 24, W - 48, H - 80);
  // close button
  let cx = x + W - 96; let cy = y + H - 56; fill(251, 249, 228); rect(cx, cy, 72, 36, 8);
  setCanvasFont('semiBold');
  fill(18, 44, 79); textAlign(CENTER, CENTER); text('닫기', cx + 36, cy + 18);
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
            if (p.id === 'prof') {
              introContent = `임양규 교수\n연구실 대표 교수\n\nEducation:\n2015-2020 Chung-Ang University, Seoul, South Korea, Ph.D. in Film and Media Studies (중앙대학교 첨단영상대학원, 영상학박사)\n2007-2015 KAIST, Daejeon, South Korea, Master of Science (카이스트 문화기술대학원, 공학석사)\n2004-2007 University of Music Franz Liszt Weimar, Germany, Pädagogisches Diplom (Master of Music in Education) in Classical Trumpet (독일 국립 리스트 음악원, 교육학 석사)\n2002-2004 University of Music Franz Liszt Weimar, Germany, Vordiplom (Pre-Diploma in Music) in Classical Trumpet (독일 국립 리스트 음악원, 음악 학사)\n2001- Korean National University of Art, Major in Trumpet (한국예술종합학교 음악원 기악과)\n\nResearch and Development:\n- Global Ph.D. Fellowship - Ministry of Education, Science and Technology (Apr. 2015 - Mar. 2018)\n- Subject: Computer-based Music Conducting\n- Chung-Ang University Hospital (Sep. 2014 - Mar. 2015) - Subject: Development of Game Analysis Model for Serious Games\n- KAIST (Apr. 2012 - Mar. 2014) - Subject: Standardization of Recording Techniques and Development of Composition/Arrangement Tools for Korean Traditional Instruments\n- Development of Korean traditional music score digitalization program and MusicXML conversion tools\n\nCourse Instructor:\n- Sungkyunkwan University, Seoul, Korea: Art Technology 1 (Mar. 2020 - Present)\n- Chung-Ang University, Seoul, Korea: 3D Video Design, Sound Programming, Physical Computing (Mar. 2016 - Present)\n\nPerformance & Exhibition Highlights:\n- Music Skyline — SIGGRAPH 2018\n- Ars Electronica - Out of the Box (TechiEon)\n- Various concerts and collaborative performances (KBS, Seoul, international venues)\n\nContact: trumpetyk09@duksung.ac.kr`;
            } else if (p.id === 'moon') {
              introContent = `문민혜 — 석사과정\n\n소속: 석사과정\n관심분야: 인터랙티브 미디어, 3D 비주얼, 사운드 프로그래밍\n연구주제: 미디어 아트에서의 사운드-비주얼 상호작용과 인터랙션 디자인\n학력/경력 요약: 관련 프로젝트 및 전시 다수 참여\nContact: minhyemoon@duksung.ac.kr`;
            } else if (p.id === 'seo') {
              introContent = `서수현 — 석사과정\n\n관심분야: 미디어 디자인, 사용자 경험\n연구주제: 인터랙션 디자인 기반 프로젝트\nContact: watermu@duksung.ac.kr`;
            } else if (p.id === 'shim') {
              introContent = '심보광 — 박사과정\n\n(자기소개 내용)';
            } else {
              introContent = p.name + '\n\n(자기소개 내용 없음)';
            }
          } else if (b.label === '연구업적'){
            if (p.id === 'shim') window.open('https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART002914157','_blank');
            else if (p.id === 'boti') window.open('https://www.earticle.net/Article/A474319','_blank');
            else if (p.id === 'seo') window.open('https://scholar.google.com/citations?hl=ko&user=FsV6clgAAAAJ','_blank');
            else window.open('#','_blank');
          } else if (b.label === 'Google Scholar'){
            if (p.id === 'seo') window.open('https://scholar.google.com/citations?hl=ko&user=FsV6clgAAAAJ','_blank');
            else if (p.id === 'prof') window.open('https://scholar.google.com/citations?hl=ko&user=Abd4YukAAAAJ&view_op=list_works','_blank');
            else window.open('#','_blank');
          } else if (b.label === 'YouTube'){
            if (p.id === 'prof') window.open('https://www.youtube.com/@Professor_Bravissimo_Parlalote/shorts','_blank');
            else window.open('#','_blank');
          }
        }
      }
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}