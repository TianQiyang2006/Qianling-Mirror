const canvas = document.getElementById('fogCanvas');
const ctx = canvas.getContext('2d');

let introParticles = [];
let sceneParticles = [];
let fogBlobs = [];
let cloudBands = [];
let cursorTrails = [];
let footprints = [];
let lastTrailTime = 0;
let lastFootprintTime = 0;

const INTRO_TIMING = {
  title: 1000,
  titleFade: 11000,
  sceneStart: 1500,
  sceneReady: 3000,
  prompt: 3500,
  promptShake: 4000,
  interactive: 4500
};

const introState = {
  start: 0,
  titleShown: false,
  titleHidden: false,
  promptShown: false,
  promptShaken: false,
  interactive: false,
  completed: false,
  sceneReady: false,
  cursorEnabled: false,
  idleShakeTimer: null
};

const mouse = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  inside: false
};

const introOverlay = document.getElementById('introOverlay');
const introTitle = document.querySelector('.intro-title');
const introDialog = document.getElementById('introDialog');
const interactionPoint = document.getElementById('interactionPoint');
const interactionText = document.getElementById('interactionText');
const customCursor = document.getElementById('customCursor');
let introTitlePrepared = false;
let introDialogPrepared = false;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function prepareIntroTitle() {
  if (!introTitle) return;
  if (introTitle.dataset.split === '1') return;
  const text = introTitle.textContent.trim();
  introTitle.innerHTML = '';
  const chars = Array.from(text);
  chars.forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'char';
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    span.style.animationDelay = `${i * 70}ms`;
    introTitle.appendChild(span);
  });
  introTitle.dataset.split = '1';
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initIntroParticles();
  initSceneParticles();
  initFogBlobs();
  initCloudBands();
}

function prepareIntroTitle() {
  if (introTitlePrepared || !introTitle) return;
  const text = introTitle.textContent.trim();
  introTitle.textContent = '';
  [...text].forEach((char, index) => {
    const span = document.createElement('span');
    span.textContent = char;
    span.className = 'char';
    span.style.animationDelay = `${index * 80}ms`;
    introTitle.appendChild(span);
  });
  introTitle.classList.add('show');
  introTitlePrepared = true;
}

function prepareIntroDialog() {
  if (introDialogPrepared || !introDialog) return;
  const text = introDialog.textContent.trim();
  introDialog.textContent = '';
  [...text].forEach((char, index) => {
    const span = document.createElement('span');
    span.textContent = char;
    span.className = 'char';
    span.style.animationDelay = `${index * 80}ms`;
    introDialog.appendChild(span);
  });
  introDialogPrepared = true;
}

function initIntroParticles() {
  introParticles = [];
  const particleCount = 3 + Math.floor(Math.random() * 3);

  for (let i = 0; i < particleCount; i++) {
    introParticles.push({
      angle: Math.random() * Math.PI * 2,
      radius: Math.random() * 40 + 20,
      size: Math.random() * 2 + 2,
      speed: (Math.random() * 0.6 + 0.2) * (Math.random() > 0.5 ? 1 : -1),
      opacity: Math.random() * 0.35 + 0.15
    });
  }
}

function initSceneParticles() {
  sceneParticles = [];
  const particleCount = Math.min(Math.floor(window.innerWidth * 0.06), 80);

  for (let i = 0; i < particleCount; i++) {
    sceneParticles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.15,
      speedY: (Math.random() - 0.5) * 0.08,
      opacity: Math.random() * 0.4 + 0.2,
      tone: Math.random() > 0.5 ? 'purple' : 'silver'
    });
  }
}

function initFogBlobs() {
  fogBlobs = [];
  const fogCount = 12;

  for (let i = 0; i < fogCount; i++) {
    fogBlobs.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 200 + 180,
      speedX: (Math.random() - 0.5) * 0.2,
      speedY: (Math.random() - 0.5) * 0.12,
      opacity: Math.random() * 0.08 + 0.05
    });
  }
}

function initCloudBands() {
  cloudBands = [];
  const bandCount = 6;
  for (let i = 0; i < bandCount; i++) {
    cloudBands.push({
      y: canvas.height * (0.18 + i * 0.12),
      speed: (Math.random() * 0.12 + 0.04) * (Math.random() > 0.5 ? 1 : -1),
      amplitude: Math.random() * 30 + 20,
      opacity: Math.random() * 0.25 + 0.2
    });
  }
}

function drawBaseBackground(sceneProgress) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (sceneProgress <= 0) return;

  const fade = easeInOut(sceneProgress);
  ctx.save();
  ctx.globalAlpha = fade;
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#0b1518');
  gradient.addColorStop(0.38, '#0d1d23');
  gradient.addColorStop(0.75, '#112a31');
  gradient.addColorStop(1, '#1a3238');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // side vignette to match the dark-frame look
  const vignette = ctx.createRadialGradient(
    canvas.width * 0.5, canvas.height * 0.45, canvas.width * 0.15,
    canvas.width * 0.5, canvas.height * 0.45, canvas.width * 0.85
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(3, 8, 10, 0.82)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // soft vertical light columns
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 6; i++) {
    const x = (i / 5) * canvas.width;
    const beam = ctx.createLinearGradient(x - 100, 0, x + 100, 0);
    beam.addColorStop(0, 'rgba(120, 190, 200, 0)');
    beam.addColorStop(0.5, 'rgba(145, 210, 220, 0.065)');
    beam.addColorStop(1, 'rgba(120, 190, 200, 0)');
    ctx.fillStyle = beam;
    ctx.fillRect(x - 120, 0, 240, canvas.height);
  }
  ctx.restore();
}

function drawClouds(time, sceneProgress) {
  if (sceneProgress <= 0) return;

  ctx.save();
  ctx.globalAlpha = 0.56 * sceneProgress;
  ctx.filter = 'blur(28px)';

  cloudBands.forEach((band, index) => {
    const offset = (time * 0.00009 * band.speed) * canvas.width;
    const baseY = band.y + Math.sin(time * 0.0005 + index * 0.7) * 14;
    const height = 95 + index * 18;

    const gradient = ctx.createLinearGradient(0, baseY - height, 0, baseY + height);
    gradient.addColorStop(0, 'rgba(95, 118, 126, 0)');
    gradient.addColorStop(0.5, `rgba(122, 150, 162, ${band.opacity * 0.95})`);
    gradient.addColorStop(1, 'rgba(95, 118, 126, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-canvas.width, baseY);
    for (let x = -canvas.width; x <= canvas.width * 2; x += 90) {
      const waveA = Math.sin((x + offset) * 0.0033 + index * 0.6) * band.amplitude;
      const waveB = Math.cos((x + offset) * 0.0018 + index) * band.amplitude * 0.45;
      ctx.lineTo(x, baseY + waveA + waveB);
    }
    ctx.lineTo(canvas.width * 2, baseY + height);
    ctx.lineTo(-canvas.width, baseY + height);
    ctx.closePath();
    ctx.fill();
  });

  // dense lower fog layer like the reference frame
  ctx.filter = 'blur(22px)';
  const floorFog = ctx.createLinearGradient(0, canvas.height * 0.5, 0, canvas.height);
  floorFog.addColorStop(0, 'rgba(88, 108, 118, 0)');
  floorFog.addColorStop(0.55, 'rgba(103, 129, 140, 0.42)');
  floorFog.addColorStop(1, 'rgba(118, 146, 154, 0.66)');
  ctx.fillStyle = floorFog;
  ctx.fillRect(0, canvas.height * 0.48, canvas.width, canvas.height * 0.55);

  ctx.filter = 'none';
  ctx.restore();
}

function drawSigil(time, sceneProgress) {
  if (sceneProgress <= 0) return;

  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.44;
  const size = Math.min(canvas.width, canvas.height) * 0.22;
  const ringRadius = size * 1.85;
  const pulse = 0.74 + 0.26 * Math.sin(time * 0.0014);
  const spinA = time * 0.00016;
  const spinB = -time * 0.00009;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = 0.96 * sceneProgress;

  // atmosphere glow behind the sigil
  const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, ringRadius * 1.1);
  aura.addColorStop(0, 'rgba(176, 227, 238, 0.24)');
  aura.addColorStop(0.45, 'rgba(98, 166, 181, 0.19)');
  aura.addColorStop(1, 'rgba(52, 94, 108, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius * 1.08, 0, Math.PI * 2);
  ctx.fill();

  // outer halo ring
  ctx.save();
  ctx.rotate(spinA);
  ctx.shadowBlur = 34;
  ctx.shadowColor = 'rgba(103, 174, 186, 0.7)';
  ctx.strokeStyle = 'rgba(214, 229, 234, 0.93)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  // denser rune ticks
  const ticks = 40;
  ctx.strokeStyle = 'rgba(220, 233, 236, 0.72)';
  ctx.lineWidth = 1.25;
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2;
    const r1 = ringRadius - 10;
    const r2 = ringRadius + 7;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    ctx.stroke();
  }

  // runic glyphs around the ring
  const runeCount = 24;
  ctx.strokeStyle = 'rgba(214, 226, 232, 0.78)';
  ctx.lineWidth = 1.05;
  for (let i = 0; i < runeCount; i++) {
    const a = (i / runeCount) * Math.PI * 2;
    const rx = Math.cos(a) * (ringRadius - 22);
    const ry = Math.sin(a) * (ringRadius - 22);
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(a + Math.PI / 2);

    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(0, 8);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-4, -3);
    ctx.lineTo(4, -3);
    ctx.stroke();

    if (i % 2 === 0) {
      ctx.beginPath();
      ctx.moveTo(-3, 4);
      ctx.lineTo(3, 7);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-3, 7);
      ctx.lineTo(3, 4);
      ctx.stroke();
    }

    ctx.restore();
  }
  ctx.restore();

  // inner moving ring
  ctx.save();
  ctx.rotate(spinB);
  ctx.strokeStyle = 'rgba(168, 204, 214, 0.58)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, size * 1.05, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // six crystal petals
  const petals = 6;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2 + spinA * 0.35;
    ctx.save();
    ctx.rotate(a);
    const width = size * 0.24;
    const length = size * (1.22 + 0.06 * Math.sin(time * 0.001 + i));
    const petalGradient = ctx.createLinearGradient(0, -length, 0, size * 0.12);
    petalGradient.addColorStop(0, `rgba(245, 249, 250, ${0.96 * pulse})`);
    petalGradient.addColorStop(0.35, `rgba(212, 228, 232, ${0.8 * pulse})`);
    petalGradient.addColorStop(1, 'rgba(136, 177, 184, 0.08)');
    ctx.fillStyle = petalGradient;
    ctx.beginPath();
    ctx.moveTo(0, -length);
    ctx.quadraticCurveTo(width, -length * 0.25, 0, size * 0.12);
    ctx.quadraticCurveTo(-width, -length * 0.25, 0, -length);
    ctx.closePath();
    ctx.fill();

    // subtle vein
    ctx.strokeStyle = `rgba(235, 243, 245, ${0.52 * pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -length * 0.95);
    ctx.lineTo(0, size * 0.08);
    ctx.stroke();
    ctx.restore();
  }

  // four short cardinal spikes
  ctx.save();
  ctx.strokeStyle = 'rgba(222, 236, 240, 0.72)';
  ctx.lineWidth = 2.3;
  for (let i = 0; i < 4; i++) {
    const a = i * (Math.PI / 2) + spinB * 0.6;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (size * 0.45), Math.sin(a) * (size * 0.45));
    ctx.lineTo(Math.cos(a) * (size * 1.18), Math.sin(a) * (size * 1.18));
    ctx.stroke();
  }
  ctx.restore();

  // center core
  ctx.save();
  const coreOuter = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.5);
  coreOuter.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  coreOuter.addColorStop(0.35, 'rgba(210, 233, 238, 0.95)');
  coreOuter.addColorStop(0.7, 'rgba(76, 125, 144, 0.92)');
  coreOuter.addColorStop(1, 'rgba(30, 61, 73, 0.3)');
  ctx.fillStyle = coreOuter;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
  ctx.fill();

  const coreInner = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.16);
  coreInner.addColorStop(0, 'rgba(255, 255, 255, 1)');
  coreInner.addColorStop(1, 'rgba(178, 224, 232, 0.22)');
  ctx.fillStyle = coreInner;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // center sparkle
  ctx.save();
  ctx.rotate(spinA * 1.4);
  ctx.strokeStyle = 'rgba(244, 248, 249, 0.78)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 4; i++) {
    const a = i * (Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (size * 0.03), Math.sin(a) * (size * 0.03));
    ctx.lineTo(Math.cos(a) * (size * 0.26), Math.sin(a) * (size * 0.26));
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

function drawIntroParticles(elapsed) {
  if (elapsed > INTRO_TIMING.titleFade) return;

  const expand = clamp(elapsed / INTRO_TIMING.title, 0, 1);
  const collapse = clamp((elapsed - INTRO_TIMING.title) / (INTRO_TIMING.titleFade - INTRO_TIMING.title), 0, 1);
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  introParticles.forEach(p => {
    p.angle += p.speed * 0.01;
    const radius = p.radius * (0.6 + 0.6 * expand) * (1 - 0.8 * collapse);
    const x = centerX + Math.cos(p.angle) * radius;
    const y = centerY + Math.sin(p.angle) * radius;
    const opacity = p.opacity * (1 - 0.85 * collapse);

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, p.size * 4);
    gradient.addColorStop(0, `rgba(200, 180, 255, ${opacity})`);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, p.size * (1.1 - 0.3 * collapse), 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawFog(sceneProgress) {
  if (sceneProgress <= 0) return;

  const reveal = easeInOut(sceneProgress);
  const centerX = canvas.width * 0.5;
  const centerY = canvas.height * 0.45;
  const clipRadius = Math.max(canvas.width, canvas.height) * 0.82 * reveal;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, clipRadius, 0, Math.PI * 2);
  ctx.clip();

  fogBlobs.forEach(fog => {
    const gradient = ctx.createRadialGradient(
      fog.x, fog.y, 0,
      fog.x, fog.y, fog.radius
    );
    gradient.addColorStop(0, `rgba(150, 188, 197, ${fog.opacity * 0.7 * reveal})`);
    gradient.addColorStop(0.6, `rgba(78, 108, 122, ${fog.opacity * 0.52 * reveal})`);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(fog.x, fog.y, fog.radius, 0, Math.PI * 2);
    ctx.fill();

    fog.x += fog.speedX;
    fog.y += fog.speedY;

    if (fog.x < -fog.radius) fog.x = canvas.width + fog.radius;
    if (fog.x > canvas.width + fog.radius) fog.x = -fog.radius;
    if (fog.y < -fog.radius) fog.y = canvas.height + fog.radius;
    if (fog.y > canvas.height + fog.radius) fog.y = -fog.radius;
  });

  ctx.restore();
}

function drawDome(sceneProgress) {
  if (sceneProgress <= 0) return;

  const opacity = 0.25 * sceneProgress;
  const centerX = canvas.width / 2;
  const horizonY = canvas.height * 0.45;
  const radius = Math.min(canvas.width, canvas.height) * 0.36;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = 'rgba(210, 200, 255, 1)';
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 20;
  ctx.shadowColor = 'rgba(120, 110, 170, 0.3)';

  ctx.beginPath();
  ctx.arc(centerX, horizonY, radius, Math.PI, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = opacity * 0.7;
  ctx.beginPath();
  ctx.arc(centerX, horizonY + 10, radius * 0.86, Math.PI, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = opacity * 0.5;
  for (let i = -2; i <= 2; i++) {
    const x = centerX + i * radius * 0.18;
    ctx.beginPath();
    ctx.moveTo(x, horizonY - radius * 0.05);
    ctx.lineTo(x, horizonY - radius * 0.35);
    ctx.stroke();
  }

  ctx.restore();
}

function drawGround(sceneProgress, time) {
  if (sceneProgress <= 0) return;

  const horizon = canvas.height * 0.6;
  const groundHeight = canvas.height - horizon;
  const glow = introState.sceneReady
    ? 0.5 + 0.5 * Math.sin((time / 1000) * Math.PI * 2)
    : 0;

  ctx.save();
  ctx.globalAlpha = 0.9 * sceneProgress;
  const groundGradient = ctx.createLinearGradient(0, horizon, 0, canvas.height);
  groundGradient.addColorStop(0, 'rgba(60, 50, 90, 0.15)');
  groundGradient.addColorStop(1, 'rgba(20, 15, 40, 0.7)');
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, horizon, canvas.width, groundHeight);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = `rgba(200, 180, 255, ${(0.08 + 0.12 * glow) * sceneProgress})`;
  ctx.lineWidth = 1.2;

  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += 24) {
      const y = horizon + 40 + i * 18 + Math.sin(x * 0.01 + time * 0.0006 + i) * 6;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  ctx.restore();
}

function drawSceneParticles(sceneProgress) {
  if (sceneProgress <= 0) return;

  sceneParticles.forEach(particle => {
    const color = particle.tone === 'silver' ? '218, 228, 232' : '126, 186, 198';
    const opacity = particle.opacity * sceneProgress;

    const gradient = ctx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, particle.size * 3
    );
    gradient.addColorStop(0, `rgba(${color}, ${opacity})`);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * 2.2, 0, Math.PI * 2);
    ctx.fill();

    particle.x += particle.speedX;
    particle.y += particle.speedY;

    if (particle.x < 0) particle.x = canvas.width;
    if (particle.x > canvas.width) particle.x = 0;
    if (particle.y < 0) particle.y = canvas.height;
    if (particle.y > canvas.height) particle.y = 0;
  });
}

function drawCursorTrails(time) {
  const life = 500;
  cursorTrails = cursorTrails.filter(t => time - t.created < life);

  cursorTrails.forEach(trail => {
    const age = (time - trail.created) / life;
    const opacity = (1 - age) * 0.25;
    const size = 10 + 8 * (1 - age);

    const gradient = ctx.createRadialGradient(trail.x, trail.y, 0, trail.x, trail.y, size);
    gradient.addColorStop(0, `rgba(200, 180, 255, ${opacity})`);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawFootprints(time) {
  const life = 3000;
  footprints = footprints.filter(f => time - f.created < life);

  footprints.forEach(f => {
    const age = (time - f.created) / life;
    const opacity = (1 - age) * 0.35;
    const size = f.size * (1 - 0.3 * age);

    const gradient = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, size * 2);
    gradient.addColorStop(0, `rgba(200, 180, 255, ${opacity})`);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(f.x, f.y, size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function updateIntroState(elapsed) {
  if (introState.completed) return;

  if (elapsed >= INTRO_TIMING.title && !introState.titleShown) {
    introState.titleShown = true;
    if (introTitle) {
      prepareIntroTitle();
      introTitle.classList.add('visible');
      // small delay to allow DOM animation delays to apply
      setTimeout(() => {
        introTitle.classList.add('show');
        introTitle.classList.add('glow');
      }, 40);
      console.log('[INTRO] Title shown at', elapsed, 'ms');
    }
  }

  // title stays visible until user enters

  if (elapsed >= INTRO_TIMING.sceneReady && !introState.sceneReady) {
    introState.sceneReady = true;
  }

  if (elapsed >= INTRO_TIMING.prompt && !introState.promptShown) {
    introState.promptShown = true;
    showPrompt();
  }

  if (elapsed >= INTRO_TIMING.promptShake && !introState.promptShaken) {
    introState.promptShaken = true;
    triggerPromptShake();
  }

  if (elapsed >= INTRO_TIMING.interactive && !introState.interactive) {
    enableInteractive();
  }

  if (elapsed >= INTRO_TIMING.sceneReady && !introState.cursorEnabled) {
    introState.cursorEnabled = true;
    if (mouse.inside) {
      document.body.classList.add('custom-cursor');
    }
  }
}

function showPrompt() {
  if (interactionPoint) interactionPoint.classList.add('visible');
  if (interactionText) interactionText.classList.add('visible');
}

function enableInteractive() {
  introState.interactive = true;
  if (!introState.idleShakeTimer) {
    introState.idleShakeTimer = setInterval(() => {
      if (!introState.completed) {
        triggerPromptShake();
      }
    }, 3000);
  }
}

function triggerPromptShake() {
  if (interactionPoint) {
    interactionPoint.classList.add('shake');
    setTimeout(() => {
      interactionPoint.classList.remove('shake');
    }, 500);
  }
  playChime();
}

function handleIntroClick() {
  if (introState.completed) return;

  introState.completed = true;
  introState.interactive = true;
  introState.cursorEnabled = true;

  if (introState.idleShakeTimer) {
    clearInterval(introState.idleShakeTimer);
    introState.idleShakeTimer = null;
  }

  if (interactionPoint) interactionPoint.classList.remove('visible', 'shake');
  if (interactionText) interactionText.classList.remove('visible');
  if (introDialog) {
    prepareIntroDialog();
    introDialog.classList.add('visible', 'awaken');
    setTimeout(() => {
      introDialog.classList.add('show');
    }, 40);
  }
  if (introOverlay) {
    introOverlay.classList.add('awakening');
  }
  if (introTitle) {
    introTitle.classList.add('fade');
    setTimeout(() => {
      if (introTitle) introTitle.classList.remove('glow');
    }, 300);
  }

  const mainContent = document.getElementById('mainContent');
  if (mainContent) {
    mainContent.classList.remove('hidden');
  }

  setTimeout(() => {
    if (introOverlay) introOverlay.classList.add('fade-out');
  }, 5200);

  setTimeout(() => {
    if (introOverlay) {
      introOverlay.style.display = 'none';
      introOverlay.classList.remove('awakening');
    }
    if (introDialog) introDialog.classList.remove('awaken');
  }, 7000);
}

function initIntroAnimation() {
  prepareIntroTitle();
  populateEmotionSelect();

  if (introOverlay) {
    introOverlay.style.display = 'flex';
    introOverlay.classList.remove('fade-out', 'awakening');
  }

  if (introTitle) {
    introTitle.classList.remove('visible', 'fade', 'show', 'glow');
  }
  if (interactionPoint) {
    interactionPoint.classList.remove('visible', 'shake');
  }
  if (interactionText) {
    interactionText.classList.remove('visible');
  }
  if (introDialog) {
    introDialog.classList.remove('visible', 'show', 'awaken');
  }

  if (introState.idleShakeTimer) {
    clearInterval(introState.idleShakeTimer);
    introState.idleShakeTimer = null;
  }

  introState.start = performance.now();
  introState.titleShown = false;
  introState.titleHidden = false;
  introState.promptShown = false;
  introState.promptShaken = false;
  introState.interactive = false;
  introState.completed = false;
  introState.sceneReady = false;
  introState.cursorEnabled = false;
  lastTrailTime = 0;
  lastFootprintTime = 0;

  document.body.classList.remove('custom-cursor');

  const mainContent = document.getElementById('mainContent');
  if (mainContent) {
    mainContent.classList.add('hidden');
  }

  loadMemories();
}

function updateCursorPosition(x, y) {
  if (!customCursor) return;
  customCursor.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
}

function handleMouseEnter() {
  mouse.inside = true;
  if (introState.cursorEnabled) {
    document.body.classList.add('custom-cursor');
  }
}

function handleMouseLeave() {
  mouse.inside = false;
  document.body.classList.remove('custom-cursor');
}

function handleMouseMove(e) {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  if (!mouse.inside) handleMouseEnter();
  updateCursorPosition(mouse.x, mouse.y);

  const now = performance.now();
  const elapsed = introState.start ? now - introState.start : 0;

  if (introState.cursorEnabled && elapsed >= INTRO_TIMING.sceneReady && now - lastTrailTime > 30) {
    cursorTrails.push({ x: mouse.x, y: mouse.y, created: now });
    lastTrailTime = now;
  }

  if (introState.interactive && now - lastFootprintTime > 120) {
    footprints.push({ x: mouse.x, y: mouse.y, created: now, size: 16 + Math.random() * 10 });
    lastFootprintTime = now;
  }
}

function drawScene(elapsed, time) {
  const sceneProgress = clamp((elapsed - INTRO_TIMING.sceneStart) / 1500, 0, 1);
  drawBaseBackground(sceneProgress);
  drawClouds(time, sceneProgress);
  drawSigil(time, sceneProgress);
  drawFog(sceneProgress);
  drawSceneParticles(sceneProgress);
  drawIntroParticles(elapsed);
}

function animate(time) {
  if (!introState.start) introState.start = time;
  const elapsed = time - introState.start;

  updateIntroState(elapsed);
  drawScene(elapsed, time);
  drawCursorTrails(time);
  drawFootprints(time);

  requestAnimationFrame(animate);
}

const EMOTION_OPTIONS = [
  { value: 'peaceful', label: '平静' },
  { value: 'joyful', label: '喜悦' },
  { value: 'melancholy', label: '忧伤' },
  { value: 'nostalgic', label: '怀念' },
  { value: 'mysterious', label: '神秘' },
  { value: 'hopeful', label: '希望' },
  { value: 'warm', label: '温暖' },
  { value: 'gentle', label: '温柔' },
  { value: 'lonely', label: '孤独' },
  { value: 'quiet', label: '静谧' },
  { value: 'sad', label: '悲伤' },
  { value: 'light', label: '轻盈' },
  { value: 'deep', label: '深沉' },
  { value: 'cold', label: '清冷' },
  { value: 'soft', label: '柔和' },
  { value: 'free', label: '自由' },
  { value: 'dreamy', label: '梦幻' },
  { value: 'pure', label: '纯净' },
  { value: 'romantic', label: '浪漫' },
  { value: 'weak', label: '淡淡' },
  { value: 'strong', label: '浓烈' },
  { value: 'sweet', label: '甜蜜' },
  { value: 'calm', label: '安宁' },
  { value: 'bright', label: '明亮' },
  { value: 'dim', label: '朦胧' },
  { value: 'fresh', label: '清新' },
  { value: 'faint', label: '微弱' },
  { value: 'clear', label: '清澈' },
  { value: 'foggy', label: '迷离' },
  { value: 'beautiful', label: '美好' },
  { value: 'quietly', label: '安然' },
  { value: 'chilly', label: '微凉' },
  { value: 'sunny', label: '明媚' },
  { value: 'moonlit', label: '月色' },
  { value: 'starry', label: '星空' },
  { value: 'windy', label: '随风' },
  { value: 'quiet_sad', label: '静谧忧伤' },
  { value: 'warm_memory', label: '温暖回忆' },
  { value: 'light_sad', label: '淡淡伤感' },
  { value: 'light_hope', label: '微光希望' },
  { value: 'quiet_joy', label: '平静喜悦' },
  { value: 'light_nostalgia', label: '浅浅怀念' }
];

function populateEmotionSelect() {
  const select = document.getElementById('memoryEmotion');
  if (!select) return;
  select.innerHTML = EMOTION_OPTIONS
    .map((item) => `<option value="${item.value}">${item.label}</option>`)
    .join('');
}

function setEmotionValue(value) {
  const select = document.getElementById('memoryEmotion');
  if (!select) return;
  if (!select.options.length) populateEmotionSelect();
  if (value && !select.querySelector(`option[value="${value}"]`)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
  select.value = value || select.value || EMOTION_OPTIONS[0]?.value || '';
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatTimeIndicator(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function updateTimeIndicator() {
  const timelineScroll = document.getElementById('timelineScroll');
  const timeLabel = document.getElementById('timeLabel');
  const timeIndicator = document.getElementById('timeIndicator');
  const memoryCards = document.querySelectorAll('.memory-card');
  
  if (memoryCards.length === 0) {
    timeLabel.textContent = '暂无记忆';
    return;
  }
  
  const updateLabel = () => {
    const scrollTop = timelineScroll.scrollTop;
    const scrollHeight = timelineScroll.scrollHeight;
    const scrollCenter = scrollTop + scrollHeight / 2;
    
    let closestCard = null;
    let closestDistance = Infinity;
    
    memoryCards.forEach(card => {
      const cardTop = card.offsetTop;
      const cardCenter = cardTop + card.offsetHeight / 2;
      const distance = Math.abs(cardCenter - scrollCenter);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCard = card;
      }
    });
    
    if (closestCard) {
      const date = closestCard.dataset.date;
      timeLabel.textContent = formatTimeIndicator(date);
      if (timeIndicator) {
        timeIndicator.classList.remove('time-left', 'time-right');
      }
    }
  };
  
  timelineScroll.removeEventListener('scroll', updateLabel);
  timelineScroll.addEventListener('scroll', updateLabel);
  updateLabel();
}

async function loadMemories() {
  try {
    const response = await fetch('/api/memories');
    const memories = await response.json();
    renderMemories(memories);
  } catch (error) {
    console.error('加载记忆失败:', error);
  }
}

function renderMemories(memories) {
  const grid = document.getElementById('memoriesGrid');
  const emptyState = document.getElementById('emptyState');
  
  if (memories.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" id="emptyState">
        <div class="icon">✦</div>
        <p>前灵境内暂无记忆碎片</p>
      </div>
    `;
    return;
  }
  
  const waveOffsets = [70, 30, 50, 90];
  const connectorLengths = [110, 80, 95, 120];
  grid.innerHTML = memories.map((memory, index) => {
    const side = index % 2 === 0 ? 'left' : 'right';
    const waveIndex = index % waveOffsets.length;
    const offset = waveOffsets[waveIndex] * (side === 'left' ? -1 : 1);
    const connector = connectorLengths[waveIndex];
    const style = `--card-offset-x: ${offset}px; --connector-length: ${connector}px;`;
    return `
      <div class="memory-card ${side}" style="${style}" data-id="${memory.id}" data-date="${memory.memory_date || memory.created_at}">
        <span class="card-connector" aria-hidden="true"></span>
        ${memory.image ? `<img src="${memory.image}" alt="${escapeHtml(memory.title)}" class="memory-image">` : ''}
        <h3>${escapeHtml(memory.title)}</h3>
        ${memory.memory_date ? `<div class="memory-date">${formatDate(memory.memory_date)}</div>` : ''}
        <div class="memory-content-preview">${escapeHtml(memory.content.substring(0, 100))}${memory.content.length > 100 ? '...' : ''}</div>
        <div class="meta">${formatDate(memory.created_at)}</div>
        <div class="actions">
          <button class="btn" onclick="viewMemory('${memory.id}')">阅读</button>
          <button class="btn" onclick="openModal('edit', '${memory.id}')">编辑</button>
          <button class="btn" onclick="deleteMemory('${memory.id}')">消散</button>
        </div>
      </div>
    `;
  }).join('');
  
  updateTimeIndicator();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openModal(mode, id = null) {
  const modal = document.getElementById('memoryModal');
  const form = document.getElementById('memoryForm');
  const title = document.getElementById('modalTitle');

  ensureMusicDataLoaded().then(() => {
    if (mode === 'add') {
      title.textContent = '存入记忆';
      form.reset();
      document.getElementById('memoryId').value = '';
      memoryPlaylistDraft = [];
      setEmotionValue(EMOTION_OPTIONS[0]?.value);
      renderMemoryPlaylistEditor();
    } else {
      title.textContent = '编辑记忆';
      loadMemoryForEdit(id);
    }

    modal.classList.add('active');
  });
}

function closeModal() {
  document.getElementById('memoryModal').classList.remove('active');
  document.getElementById('imagePreview').innerHTML = '';
  document.getElementById('memoryImage').value = '';
}

function closeViewModal() {
  document.getElementById('viewModal').classList.remove('active');
  restoreGlobalPlayback();
}

function parseMarkdown(text) {
  if (!text) return '';
  
  if (typeof marked !== 'undefined') {
    return marked.parse(text);
  }
  
  let html = text;
  
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
  
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

let audioElement = null;
let audioFadeRaf = null;
let chimeContext = null;
let volumeSaveTimer = null;
let targetVolume = 0.3;

let musicLibrary = [];
let globalPlaylist = [];
let globalTrackIndex = 0;
let memoryPlaylistDraft = [];
let currentMemoryPlayback = null;
let audioMode = 'global';
let globalResumeState = null;
let audioDataPromise = null;
let audioInitialized = false;

function normalizeTrackList(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set();
  const result = [];
  list.forEach((item) => {
    if (typeof item !== 'string') return;
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  });
  return result;
}

function getLibraryNameSet() {
  return new Set(musicLibrary.map((item) => item.name));
}

function filterExistingTracks(list) {
  const nameSet = getLibraryNameSet();
  return normalizeTrackList(list).filter((name) => nameSet.has(name));
}

function trackDisplayName(name) {
  return name.replace(/\.[^.]+$/, '');
}

function trackToUrl(name) {
  const hit = musicLibrary.find((item) => item.name === name);
  return hit ? hit.url : `/music/${encodeURIComponent(name)}`;
}

function getSelectedValues(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return [];
  return Array.from(select.selectedOptions).map((option) => option.value);
}

function fillSelect(selectId, list, withIndex = false) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = list
    .map((name, index) => {
      const label = withIndex ? `${index + 1}. ${trackDisplayName(name)}` : trackDisplayName(name);
      return `<option value="${escapeHtml(name)}">${escapeHtml(label)}</option>`;
    })
    .join('');
}

function moveListItem(list, index, direction) {
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return index;
  [list[index], list[target]] = [list[target], list[index]];
  return target;
}

function renderMemoryPlaylistEditor() {
  const available = musicLibrary.map((item) => item.name);
  fillSelect('availableMusicList', available, false);
  fillSelect('memoryPlaylistList', memoryPlaylistDraft, true);
}

function renderGlobalPlaylistEditor() {
  const available = musicLibrary.map((item) => item.name);
  fillSelect('globalAvailableMusicList', available, false);
  fillSelect('globalPlaylistList', globalPlaylist, true);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return response.json();
}

async function loadAudioData() {
  const [filesData, settingsData] = await Promise.all([
    fetchJson('/api/music/files'),
    fetchJson('/api/audio/settings').catch(() => ({ global_playlist: [], volume: 0.3 }))
  ]);

  const files = Array.isArray(filesData.files) ? filesData.files : [];
  musicLibrary = files
    .filter((item) => item && typeof item.name === 'string' && typeof item.url === 'string')
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

  globalPlaylist = filterExistingTracks(settingsData.global_playlist);
  if (!globalPlaylist.length) {
    globalPlaylist = musicLibrary.map((item) => item.name);
  }

  const rawVolume = Number(settingsData.volume);
  targetVolume = Number.isFinite(rawVolume) ? clamp(rawVolume, 0, 1) : 0.3;

  if (globalTrackIndex >= globalPlaylist.length) globalTrackIndex = 0;
  memoryPlaylistDraft = filterExistingTracks(memoryPlaylistDraft);
  if (currentMemoryPlayback) {
    currentMemoryPlayback.playlist = filterExistingTracks(currentMemoryPlayback.playlist);
    if (currentMemoryPlayback.index >= currentMemoryPlayback.playlist.length) {
      currentMemoryPlayback.index = 0;
    }
  }

  const volumeSlider = document.getElementById('volumeSlider');
  if (volumeSlider) volumeSlider.value = String(targetVolume);

  renderMemoryPlaylistEditor();
  renderGlobalPlaylistEditor();
  updateMemoryAudioListUI();
  if (audioElement) audioElement.volume = targetVolume;
}

function ensureMusicDataLoaded() {
  if (audioDataPromise) return audioDataPromise;
  audioDataPromise = loadAudioData().catch((error) => {
    audioDataPromise = null;
    throw error;
  });
  return audioDataPromise;
}

async function saveAudioSettings(payload) {
  const response = await fetch('/api/audio/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`保存音频设置失败: ${response.status}`);
  return response.json();
}

function scheduleVolumeSave() {
  if (volumeSaveTimer) clearTimeout(volumeSaveTimer);
  volumeSaveTimer = setTimeout(() => {
    saveAudioSettings({ volume: targetVolume }).catch((error) => {
      console.error('保存音量失败:', error);
    });
  }, 400);
}

async function saveGlobalPlaylist() {
  try {
    await ensureMusicDataLoaded();
    globalPlaylist = filterExistingTracks(globalPlaylist);
    if (globalTrackIndex >= globalPlaylist.length) globalTrackIndex = 0;
    await saveAudioSettings({ global_playlist: globalPlaylist });
    renderGlobalPlaylistEditor();
    if (!globalPlaylist.length && audioMode === 'global' && audioElement) {
      audioElement.pause();
      return;
    }
    if (audioElement && globalPlaylist.length && audioElement.paused) {
      playGlobalTrack(globalTrackIndex, { restart: false, fadeIn: true }).catch(() => {});
    }
  } catch (error) {
    console.error('保存播放列表失败:', error);
    alert('保存播放列表失败，请重试');
  }
}

function applyTrackSource(trackName, options = {}) {
  if (!audioElement || !trackName) return;
  const { forceReload = false, startTime = 0 } = options;
  const nextUrl = trackToUrl(trackName);
  const sameTrack = audioElement.dataset.trackName === trackName;
  if (forceReload || !sameTrack) {
    audioElement.src = nextUrl;
    audioElement.dataset.trackName = trackName;
    audioElement.load();
  }
  if (startTime > 0) {
    const seekTo = () => {
      try {
        audioElement.currentTime = startTime;
      } catch (_) {}
    };
    if (audioElement.readyState >= 1) seekTo();
    else audioElement.addEventListener('loadedmetadata', seekTo, { once: true });
  } else if (forceReload || !sameTrack) {
    try {
      audioElement.currentTime = 0;
    } catch (_) {}
  }
}

function cancelAudioFade() {
  if (!audioFadeRaf) return;
  cancelAnimationFrame(audioFadeRaf);
  audioFadeRaf = null;
}

function fadeAudioTo(target, duration) {
  if (!audioElement) return;
  cancelAudioFade();
  const start = performance.now();
  const from = audioElement.volume;
  const to = clamp(target, 0, 1);
  const step = (now) => {
    const t = clamp((now - start) / duration, 0, 1);
    audioElement.volume = from + (to - from) * t;
    if (t < 1) audioFadeRaf = requestAnimationFrame(step);
    else audioFadeRaf = null;
  };
  audioFadeRaf = requestAnimationFrame(step);
}

async function playTrack(trackName, options = {}) {
  if (!audioElement || !trackName) return;
  const { restart = true, startTime = 0, fadeIn = false } = options;
  applyTrackSource(trackName, { forceReload: restart, startTime: startTime > 0 ? startTime : 0 });
  cancelAudioFade();
  audioElement.volume = fadeIn ? 0 : targetVolume;
  try {
    await audioElement.play();
    if (fadeIn) fadeAudioTo(targetVolume, 1500);
  } catch (error) {
    const resume = () => {
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
      playTrack(trackName, options).catch(() => {});
    };
    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });
    console.warn('音频播放被拦截，等待用户交互:', error);
  }
}

function normalizeIndex(index, length) {
  if (!length) return 0;
  const value = Number(index);
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.trunc(value);
  return ((rounded % length) + length) % length;
}

async function playGlobalTrack(index, options = {}) {
  if (!audioElement || !globalPlaylist.length) return;
  const { restart = true, startTime = 0, fadeIn = false } = options;
  globalTrackIndex = normalizeIndex(index, globalPlaylist.length);
  const trackName = globalPlaylist[globalTrackIndex];
  audioMode = 'global';
  await playTrack(trackName, { restart, startTime, fadeIn });
}

async function playMemoryTrack(index, options = {}) {
  if (!audioElement || !currentMemoryPlayback || !currentMemoryPlayback.playlist.length) return;
  const { restart = true, startTime = 0 } = options;
  currentMemoryPlayback.index = normalizeIndex(index, currentMemoryPlayback.playlist.length);
  const trackName = currentMemoryPlayback.playlist[currentMemoryPlayback.index];
  audioMode = 'memory';
  await playTrack(trackName, { restart, startTime, fadeIn: false });
  updateMemoryAudioListUI();
}

function handleAudioEnded() {
  if (audioMode === 'memory' && currentMemoryPlayback && currentMemoryPlayback.playlist.length) {
    playMemoryTrack(currentMemoryPlayback.index + 1, { restart: true }).catch((error) => {
      console.error('播放记忆曲目失败:', error);
    });
    return;
  }
  if (globalPlaylist.length) {
    playGlobalTrack(globalTrackIndex + 1, { restart: true }).catch((error) => {
      console.error('播放全局曲目失败:', error);
    });
  }
}

function startIntroAudio() {
  if (!audioElement) return;
  const attempt = () => {
    ensureMusicDataLoaded()
      .then(() => {
        if (!globalPlaylist.length) return;
        currentMemoryPlayback = null;
        audioMode = 'global';
        return playGlobalTrack(globalTrackIndex, { restart: true, fadeIn: true });
      })
      .catch(() => {
        const resume = () => {
          window.removeEventListener('pointerdown', resume);
          window.removeEventListener('keydown', resume);
          attempt();
        };
        window.addEventListener('pointerdown', resume, { once: true });
        window.addEventListener('keydown', resume, { once: true });
      });
  };
  attempt();
}

async function initAudio() {
  if (audioInitialized) return;
  audioInitialized = true;
  audioElement = document.getElementById('backgroundMusic');
  if (!audioElement) return;
  audioElement.loop = false;
  audioElement.preload = 'auto';
  audioElement.muted = false;
  audioElement.volume = targetVolume;
  audioElement.addEventListener('ended', handleAudioEnded);
  const volumeSlider = document.getElementById('volumeSlider');
  if (volumeSlider) {
    volumeSlider.value = String(targetVolume);
    volumeSlider.addEventListener('input', (event) => {
      targetVolume = clamp(parseFloat(event.target.value), 0, 1);
      cancelAudioFade();
      audioElement.volume = targetVolume;
      scheduleVolumeSave();
    });
  }
  await ensureMusicDataLoaded();
  startIntroAudio();
}

function startMemoryPlayback(memory) {
  if (!audioElement) return;
  const playlist = filterExistingTracks(memory.music_playlist);
  if (!playlist.length) {
    currentMemoryPlayback = null;
    audioMode = 'global';
    updateMemoryAudioListUI();
    return;
  }

  globalResumeState = {
    index: globalTrackIndex,
    time: Number.isFinite(audioElement.currentTime) ? audioElement.currentTime : 0,
    wasPlaying: !audioElement.paused
  };
  currentMemoryPlayback = { memoryId: memory.id, playlist, index: 0 };
  audioMode = 'memory';
  playMemoryTrack(0, { restart: true }).catch((error) => {
    console.error('启动记忆播放失败:', error);
  });
}

function restoreGlobalPlayback() {
  if (audioMode !== 'memory' && !globalResumeState) return;
  const resumeState = globalResumeState;
  globalResumeState = null;
  currentMemoryPlayback = null;
  audioMode = 'global';
  if (!audioElement || !globalPlaylist.length || !resumeState) return;
  globalTrackIndex = normalizeIndex(resumeState.index, globalPlaylist.length);
  const resumeTime = Number.isFinite(resumeState.time) ? Math.max(0, resumeState.time) : 0;
  const trackName = globalPlaylist[globalTrackIndex];
  if (!trackName) return;
  if (resumeState.wasPlaying) {
    playGlobalTrack(globalTrackIndex, {
      restart: resumeTime <= 0,
      startTime: resumeTime
    }).catch((error) => {
      console.error('恢复全局播放失败:', error);
    });
    return;
  }
  applyTrackSource(trackName, { forceReload: true, startTime: resumeTime });
  audioElement.pause();
  audioElement.volume = targetVolume;
}

function playAudio() {
  if (!audioElement) return;
  if (audioMode === 'memory' && currentMemoryPlayback && currentMemoryPlayback.playlist.length) {
    playMemoryTrack(currentMemoryPlayback.index, { restart: false }).catch((error) => {
      console.error('播放记忆曲目失败:', error);
    });
    return;
  }
  if (globalPlaylist.length) {
    playGlobalTrack(globalTrackIndex, { restart: false }).catch((error) => {
      console.error('播放全局曲目失败:', error);
    });
  }
}

function pauseAudio() {
  if (audioElement && !audioElement.paused) audioElement.pause();
}

function togglePlayPause() {
  if (!audioElement) return;
  if (audioElement.paused) playAudio();
  else pauseAudio();
}

function nextTrack() {
  if (audioMode === 'memory' && currentMemoryPlayback && currentMemoryPlayback.playlist.length) {
    playMemoryTrack(currentMemoryPlayback.index + 1, { restart: true }).catch((error) => {
      console.error('切换记忆曲目失败:', error);
    });
    return;
  }
  if (globalPlaylist.length) {
    playGlobalTrack(globalTrackIndex + 1, { restart: true }).catch((error) => {
      console.error('切换全局曲目失败:', error);
    });
  }
}

function playChime() {
  try {
    if (!chimeContext) {
      chimeContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (chimeContext.state === 'suspended') chimeContext.resume();
    const now = chimeContext.currentTime;
    const gain = chimeContext.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    const osc = chimeContext.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.35);
    osc.connect(gain);
    gain.connect(chimeContext.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  } catch (error) {
    console.log('叮声播放失败:', error);
  }
}

function toggleAudioControls() {
  const audioPanel = document.getElementById('audioPanel');
  if (!audioPanel) return;
  audioPanel.classList.toggle('visible');
  if (audioPanel.classList.contains('visible')) {
    ensureMusicDataLoaded().catch((error) => {
      console.error('加载音乐库失败:', error);
    });
  }
}

function addToMemoryPlaylist() {
  const selected = getSelectedValues('availableMusicList');
  selected.forEach((track) => {
    if (!memoryPlaylistDraft.includes(track)) memoryPlaylistDraft.push(track);
  });
  renderMemoryPlaylistEditor();
}

function removeFromMemoryPlaylist() {
  const selected = new Set(getSelectedValues('memoryPlaylistList'));
  memoryPlaylistDraft = memoryPlaylistDraft.filter((track) => !selected.has(track));
  renderMemoryPlaylistEditor();
}

function moveMemoryTrackUp() {
  const select = document.getElementById('memoryPlaylistList');
  if (!select || select.selectedIndex < 0) return;
  const nextIndex = moveListItem(memoryPlaylistDraft, select.selectedIndex, -1);
  renderMemoryPlaylistEditor();
  if (nextIndex >= 0) document.getElementById('memoryPlaylistList').selectedIndex = nextIndex;
}

function moveMemoryTrackDown() {
  const select = document.getElementById('memoryPlaylistList');
  if (!select || select.selectedIndex < 0) return;
  const nextIndex = moveListItem(memoryPlaylistDraft, select.selectedIndex, 1);
  renderMemoryPlaylistEditor();
  if (nextIndex >= 0) document.getElementById('memoryPlaylistList').selectedIndex = nextIndex;
}

function addToGlobalPlaylist() {
  const selected = getSelectedValues('globalAvailableMusicList');
  selected.forEach((track) => {
    if (!globalPlaylist.includes(track)) globalPlaylist.push(track);
  });
  renderGlobalPlaylistEditor();
}

function removeFromGlobalPlaylist() {
  const selected = new Set(getSelectedValues('globalPlaylistList'));
  const currentTrackName = globalPlaylist[globalTrackIndex] || null;
  globalPlaylist = globalPlaylist.filter((track) => !selected.has(track));
  if (currentTrackName) {
    const newIndex = globalPlaylist.indexOf(currentTrackName);
    globalTrackIndex = newIndex >= 0 ? newIndex : 0;
  } else {
    globalTrackIndex = 0;
  }
  renderGlobalPlaylistEditor();
}

function moveGlobalTrackUp() {
  const select = document.getElementById('globalPlaylistList');
  if (!select || select.selectedIndex < 0) return;
  const nextIndex = moveListItem(globalPlaylist, select.selectedIndex, -1);
  renderGlobalPlaylistEditor();
  if (nextIndex >= 0) document.getElementById('globalPlaylistList').selectedIndex = nextIndex;
}

function moveGlobalTrackDown() {
  const select = document.getElementById('globalPlaylistList');
  if (!select || select.selectedIndex < 0) return;
  const nextIndex = moveListItem(globalPlaylist, select.selectedIndex, 1);
  renderGlobalPlaylistEditor();
  if (nextIndex >= 0) document.getElementById('globalPlaylistList').selectedIndex = nextIndex;
}

function buildMemoryAudioBlock(playlist) {
  if (!playlist.length) {
    return `
      <div class="memory-audio-block">
        <div class="memory-audio-title">记忆配乐</div>
        <div class="memory-audio-list">该记忆未设置专属音乐。</div>
      </div>
    `;
  }
  const listText = playlist.map((name, index) => `${index + 1}. ${trackDisplayName(name)}`).join('\n');
  return `
    <div class="memory-audio-block">
      <div class="memory-audio-title">记忆配乐（阅读时自动播放）</div>
      <div class="memory-audio-list" id="memoryAudioList">${escapeHtml(listText)}</div>
      <div class="memory-audio-controls">
        <button class="btn" type="button" onclick="togglePlayPause()">播放/暂停</button>
        <button class="btn" type="button" onclick="nextTrack()">下一曲</button>
      </div>
    </div>
  `;
}

function updateMemoryAudioListUI() {
  const listElement = document.getElementById('memoryAudioList');
  if (!listElement || !currentMemoryPlayback || !currentMemoryPlayback.playlist.length) return;
  listElement.textContent = currentMemoryPlayback.playlist
    .map((name, index) => {
      const marker = index === currentMemoryPlayback.index ? '> ' : '  ';
      return `${marker}${index + 1}. ${trackDisplayName(name)}`;
    })
    .join('\n');
}

async function viewMemory(id) {
  try {
    await ensureMusicDataLoaded();
    const memory = await fetchJson(`/api/memories/${id}`);
    const playlist = filterExistingTracks(memory.music_playlist);
    const viewContent = document.getElementById('viewContent');
    const parsedContent = parseMarkdown(memory.content);
    viewContent.innerHTML = `
      <div class="memory-article">
        ${memory.image ? `<img src="${memory.image}" alt="${escapeHtml(memory.title)}" class="memory-view-image">` : ''}
        <h2>${escapeHtml(memory.title)}</h2>
        ${memory.memory_date ? `<div class="memory-view-date">${formatDate(memory.memory_date)}</div>` : ''}
        <div class="memory-view-content">${parsedContent}</div>
        ${buildMemoryAudioBlock(playlist)}
      </div>
      <button class="btn view-close-btn" type="button" onclick="closeViewModal()">退出</button>
    `;
    document.getElementById('viewModal').classList.add('active');
    startMemoryPlayback(memory);
  } catch (error) {
    console.error('加载记忆失败:', error);
    alert('加载记忆失败，请重试');
  }
}

const imageInput = document.getElementById('memoryImage');
const imagePreview = document.getElementById('imagePreview');
if (imageInput) {
  imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      imagePreview.innerHTML = `<img src="${loadEvent.target.result}" alt="预览">`;
    };
    reader.readAsDataURL(file);
  });
}

async function loadMemoryForEdit(id) {
  try {
    await ensureMusicDataLoaded();
    const memory = await fetchJson(`/api/memories/${id}`);
    document.getElementById('memoryId').value = memory.id;
    document.getElementById('memoryTitle').value = memory.title;
    document.getElementById('memoryContent').value = memory.content;
    setEmotionValue(memory.emotion);
    if (memory.memory_date) {
      const date = new Date(memory.memory_date);
      document.getElementById('memoryDate').value = date.toISOString().slice(0, 16);
    } else {
      document.getElementById('memoryDate').value = '';
    }
    if (memory.image) {
      imagePreview.innerHTML = `<img src="${memory.image}" alt="预览">`;
    } else {
      imagePreview.innerHTML = '';
    }
    memoryPlaylistDraft = filterExistingTracks(memory.music_playlist);
    renderMemoryPlaylistEditor();
  } catch (error) {
    console.error('加载记忆失败:', error);
  }
}

const memoryForm = document.getElementById('memoryForm');
if (memoryForm) {
  memoryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = document.getElementById('memoryId').value;
    const formData = new FormData();
    formData.append('title', document.getElementById('memoryTitle').value);
    formData.append('content', document.getElementById('memoryContent').value);
    formData.append('emotion', document.getElementById('memoryEmotion').value);
    formData.append('memory_date', document.getElementById('memoryDate').value || new Date().toISOString());
    formData.append('music_playlist', JSON.stringify(memoryPlaylistDraft));
    if (imageInput && imageInput.files[0]) formData.append('image', imageInput.files[0]);
    try {
      const url = id ? `/api/memories/${id}` : '/api/memories';
      const method = id ? 'PUT' : 'POST';
      const response = await fetch(url, { method, body: formData });
      if (!response.ok) throw new Error(`保存失败: ${response.status}`);
      closeModal();
      loadMemories();
    } catch (error) {
      console.error('保存记忆失败:', error);
      alert('保存失败，请重试');
    }
  });
}

async function deleteMemory(id) {
  if (!confirm('确定要让这段记忆消散于虚空吗？')) return;
  try {
    const response = await fetch(`/api/memories/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`删除失败: ${response.status}`);
    loadMemories();
  } catch (error) {
    console.error('删除记忆失败:', error);
    alert('删除失败，请重试');
  }
}

const memoryModal = document.getElementById('memoryModal');
if (memoryModal) {
  memoryModal.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeModal();
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeModal();
    closeViewModal();
  }
});

if (interactionPoint) interactionPoint.addEventListener('click', handleIntroClick);
if (interactionText) interactionText.addEventListener('click', handleIntroClick);

document.body.addEventListener('mouseenter', handleMouseEnter);
document.body.addEventListener('mouseleave', handleMouseLeave);
document.addEventListener('mousemove', handleMouseMove);

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
requestAnimationFrame(animate);
initIntroAnimation();
initAudio().catch((error) => {
  console.warn('音频初始化失败，继续执行:', error);
});



