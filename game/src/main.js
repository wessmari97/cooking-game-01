// Wok Star — game loop, wiring, state machine and synthesized sound.
// No audio files: every beep, ding and sizzle is made with WebAudio.

import { INGREDIENTS, LAYOUT, SLOT_KEYS, VIEW_H, VIEW_W, slotRect } from './config.js';
import { bindInput } from './input.js';
import { draw } from './render.js';
import { shotFromUrl, worldForShot } from './shots.js';
import { addIngredient, clearBurnt, clearPlate, createWorld, serve, startCooking, startShift, update } from './world.js';

const BEST_KEY = 'wokstar-best';
const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');

const inShot = new URLSearchParams(window.location.search).has('shot');
const { shot, seed } = shotFromUrl();
const world = inShot ? worldForShot(shot, seed) : createWorld((Date.now() % 2147483647) | 0);
world.best = Number(localStorage.getItem(BEST_KEY) || '0') || 0;

// ------------------------------------------------------------------ sound

let audio = null;
let muted = false;
let sizzleGain = null;
let sizzleSrc = null;

function ensureAudio() {
  if (audio) return;
  try {
    audio = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    audio = null;
  }
}

function beep(freq, dur, type = 'sine', vol = 0.16, when = 0) {
  if (!audio || muted) return;
  const t0 = audio.currentTime + when;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const sfx = {
  click() {
    beep(660, 0.06, 'square', 0.1);
  },
  add() {
    beep(520, 0.05, 'sine', 0.14);
    beep(780, 0.06, 'sine', 0.12, 0.04);
  },
  wrong() {
    beep(130, 0.18, 'sawtooth', 0.16);
    beep(98, 0.2, 'sawtooth', 0.14, 0.05);
  },
  ding() {
    beep(880, 0.12, 'sine', 0.18);
    beep(1318, 0.22, 'sine', 0.16, 0.09);
  },
  coin() {
    beep(1568, 0.07, 'square', 0.1);
    beep(2093, 0.14, 'square', 0.1, 0.06);
  },
  pop() {
    beep(300, 0.08, 'triangle', 0.16);
    beep(600, 0.1, 'triangle', 0.14, 0.05);
  },
  burn() {
    beep(220, 0.25, 'sawtooth', 0.14);
    beep(165, 0.3, 'sawtooth', 0.12, 0.1);
  },
};

function setSizzle(on) {
  if (!audio || muted) {
    if (sizzleGain) sizzleGain.gain.value = 0;
    return;
  }
  if (on && !sizzleSrc) {
    const len = audio.sampleRate * 1;
    const buf = audio.createBuffer(1, len, audio.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    sizzleSrc = audio.createBufferSource();
    sizzleSrc.buffer = buf;
    sizzleSrc.loop = true;
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 5200;
    filter.Q.value = 0.8;
    sizzleGain = audio.createGain();
    sizzleGain.gain.value = 0.05;
    sizzleSrc.connect(filter).connect(sizzleGain).connect(audio.destination);
    sizzleSrc.start();
  } else if (!on && sizzleSrc) {
    try {
      sizzleSrc.stop();
    } catch {
      // Already stopped.
    }
    sizzleSrc = null;
    sizzleGain = null;
  }
}

// ------------------------------------------------------------------ helpers

function inRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function inCircle(x, y, c) {
  const dx = x - c.x;
  const dy = y - c.y;
  return dx * dx + dy * dy <= c.r * c.r;
}

function announce(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function saveBest() {
  if (world.coins > world.best) {
    world.best = world.coins;
    try {
      localStorage.setItem(BEST_KEY, String(world.best));
    } catch {
      // Storage unavailable: best score just lives for the session.
    }
  }
}

// ------------------------------------------------------------------ controller

const game = {
  onClick(x, y) {
    ensureAudio();
    if (audio && audio.state === 'suspended') void audio.resume();
    if (world.mode === 'title') {
      if (inRect(x, y, LAYOUT.startBtn)) {
        sfx.pop();
        startShift(world);
        announce('Shift dimulai. Sajikan pesanan secepat kilat!');
      }
      return;
    }
    if (world.mode === 'over') {
      if (inRect(x, y, LAYOUT.restartBtn)) {
        sfx.pop();
        startShift(world);
        announce('Shift baru dimulai.');
      }
      return;
    }
    if (world.mode === 'paused') {
      world.mode = 'playing';
      announce('Lanjut masak.');
      return;
    }
    // Playing: clear button.
    if (inRect(x, y, LAYOUT.clearBtn)) {
      if (clearPlate(world)) sfx.click();
      return;
    }
    // Burnt burner: click to toss it.
    const burners = [LAYOUT.burnerA, LAYOUT.burnerB];
    for (let i = 0; i < 2; i++) {
      if (inCircle(x, y, burners[i]) && world.burners[i].state === 'burnt') {
        if (clearBurnt(world, i)) sfx.click();
        return;
      }
    }
    // Serving window.
    if (inRect(x, y, LAYOUT.window)) {
      const res = serve(world);
      if (res.ok) {
        sfx.ding();
        sfx.coin();
        saveBest();
        announce(`Disajikan! +${res.earned} koin.`);
      } else if (res.reason === 'no-order') {
        sfx.wrong();
        announce('Tidak ada order untuk hidangan ini.');
      } else {
        sfx.click();
      }
      return;
    }
    // Stove: start cooking.
    if (inRect(x, y, LAYOUT.stove)) {
      const res = startCooking(world);
      if (res.ok) {
        sfx.add();
        announce('Memasak…');
      } else if (res.reason === 'busy') {
        sfx.wrong();
      }
      return;
    }
    // Ingredient slots.
    for (let i = 0; i < INGREDIENTS.length; i++) {
      if (inRect(x, y, slotRect(i))) {
        const res = addIngredient(world, INGREDIENTS[i].id);
        if (res.ok) {
          sfx.add();
          if (res.dish) {
            sfx.ding();
            announce('Piring lengkap! Siap dimasak atau disajikan.');
          }
        } else if (res.reason === 'wrong') {
          sfx.wrong();
          announce('Bahan salah untuk hidangan ini.');
        } else if (res.reason === 'full') {
          sfx.click();
        }
        return;
      }
    }
  },

  onKey(key) {
    ensureAudio();
    if (audio && audio.state === 'suspended') void audio.resume();
    if (key === 'm' || key === 'M') {
      muted = !muted;
      if (muted) setSizzle(false);
      announce(muted ? 'Suara mati.' : 'Suara hidup.');
      return;
    }
    if (world.mode === 'title') {
      if (key === 'Enter' || key === ' ') {
        sfx.pop();
        startShift(world);
      }
      return;
    }
    if (world.mode === 'over') {
      if (key === 'r' || key === 'R' || key === 'Enter') {
        sfx.pop();
        startShift(world);
      }
      return;
    }
    if (key === 'p' || key === 'P') {
      world.mode = world.mode === 'paused' ? 'playing' : 'paused';
      sfx.click();
      announce(world.mode === 'paused' ? 'Jeda.' : 'Lanjut masak.');
      return;
    }
    if (world.mode !== 'playing') return;
    if (key === 'r' || key === 'R') {
      startShift(world);
      return;
    }
    if (key === ' ') {
      const res = startCooking(world);
      if (res.ok) sfx.add();
      else if (res.reason === 'busy') sfx.wrong();
      return;
    }
    if (key === 'Enter') {
      const res = serve(world);
      if (res.ok) {
        sfx.ding();
        sfx.coin();
        saveBest();
      } else if (res.reason === 'no-order') {
        sfx.wrong();
      }
      return;
    }
    if (key === 'Backspace') {
      if (clearPlate(world)) sfx.click();
      return;
    }
    const slot = SLOT_KEYS.indexOf(key);
    if (slot >= 0 && slot < INGREDIENTS.length) {
      const res = addIngredient(world, INGREDIENTS[slot].id);
      if (res.ok) {
        sfx.add();
        if (res.dish) sfx.ding();
      } else if (res.reason === 'wrong') {
        sfx.wrong();
      }
    }
  },
};

// Hover highlight for the counter slots.
canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * VIEW_W;
  const y = ((event.clientY - rect.top) / rect.height) * VIEW_H;
  world.hoverSlot = -1;
  for (let i = 0; i < INGREDIENTS.length; i++) {
    if (inRect(x, y, slotRect(i))) {
      world.hoverSlot = i;
      break;
    }
  }
});

bindInput(canvas, game);

// ------------------------------------------------------------------ loop

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = VIEW_W * dpr;
  canvas.height = VIEW_H * dpr;
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
let wasBurnt = false;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  if (!inShot && world.mode === 'playing') {
    const burntBefore = world.burners.some((b) => b.state === 'burnt');
    update(world, dt);
    const burntNow = world.burners.some((b) => b.state === 'burnt');
    if (burntNow && !burntBefore) sfx.burn();
    if (world.mode === 'over') saveBest();
  }
  // Sizzle while any burner cooks.
  const cooking = world.mode === 'playing' && world.burners.some((b) => b.state === 'cooking');
  setSizzle(cooking);
  wasBurnt = world.burners.some((b) => b.state === 'burnt');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw(ctx, world, t, dt);
  requestAnimationFrame(frame);
}

announce('Wok Star. Tekan Enter atau klik Mulai Shift untuk bermain.');
requestAnimationFrame(frame);
