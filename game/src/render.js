// Wok Star — all canvas drawing: night-market kitchen, tickets, plate, stove,
// serving window, counter, title and end screens, plus steam, confetti and
// screen shake. No images anywhere: every shape is drawn from scratch.

import {
  BURN_TIME,
  COLORS,
  COOK_TIME,
  DAY_LENGTH,
  DISHES,
  INGREDIENTS,
  LAYOUT,
  TIP_WINDOW,
  VIEW_H,
  VIEW_W,
  dishById,
  ingredientById,
  slotRect,
} from './config.js';

// ---------------------------------------------------------------- helpers

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, weight = 700, align = 'center') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function glowText(ctx, s, x, y, size, color, glow, weight = 800) {
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 28;
  text(ctx, s, x, y, size, color, weight);
  ctx.shadowBlur = 10;
  text(ctx, s, x, y, size, color, weight);
  ctx.restore();
}

// ---------------------------------------------------------------- particles

const steam = []; // {x, y, r, t, life, vx}
const confetti = []; // {x, y, vx, vy, rot, vr, color, t, life}
const CONFETTI_COLORS = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#f78c6b', '#c77dff'];

function spawnSteam(x, y, n) {
  for (let i = 0; i < n; i++) {
    if (steam.length > 60 || Math.random() < 0.5) return;
    steam.push({
      x: x + (Math.random() - 0.5) * 46,
      y: y + (Math.random() - 0.5) * 8,
      r: 4 + Math.random() * 5,
      t: 0,
      life: 1.1 + Math.random() * 0.9,
      vx: (Math.random() - 0.5) * 12,
    });
  }
}

function spawnConfetti(x, y) {
  for (let i = 0; i < 70; i++) {
    confetti.push({
      x: x + (Math.random() - 0.5) * 60,
      y: y + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 320,
      vy: -80 - Math.random() * 260,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 12,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      t: 0,
      life: 1.2 + Math.random() * 0.8,
    });
  }
}

function updateParticles(dt) {
  for (const s of steam) {
    s.t += dt;
    s.y -= 46 * dt;
    s.x += s.vx * dt + Math.sin(s.t * 5 + s.r) * 6 * dt;
    s.r += 6 * dt;
  }
  for (let i = steam.length - 1; i >= 0; i--) {
    if (steam[i].t >= steam[i].life) steam.splice(i, 1);
  }
  for (const c of confetti) {
    c.t += dt;
    c.vy += 520 * dt;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.rot += c.vr * dt;
  }
  for (let i = confetti.length - 1; i >= 0; i--) {
    if (confetti[i].t >= confetti[i].life) confetti.splice(i, 1);
  }
}

// ---------------------------------------------------------------- icons

function gloss(ctx, x, y, r) {
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.25, y - r * 0.4, r * 0.42, r * 0.22, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawIcon(ctx, id, x, y, r) {
  const g = ingredientById(id);
  if (!g) return;
  ctx.save();
  ctx.translate(x, y);
  // Soft drop shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.85, r * 0.9, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  switch (id) {
    case 'rice': {
      // Terracotta bowl with a white rice mound.
      ctx.fillStyle = '#b5651d';
      ctx.beginPath();
      ctx.arc(0, r * 0.15, r * 0.82, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.arc(0, -r * 0.1, r * 0.62, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff8e0';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(i * r * 0.22, -r * 0.28 - Math.abs(i) * -r * 0.06, r * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'noodles': {
      ctx.strokeStyle = g.color;
      ctx.lineWidth = r * 0.2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const yy = -r * 0.4 + i * r * 0.38;
        ctx.beginPath();
        for (let xx = -r * 0.7; xx <= r * 0.7; xx += r * 0.14) {
          const yv = yy + Math.sin(xx * 0.09 + i * 2) * r * 0.16;
          if (xx === -r * 0.7) ctx.moveTo(xx, yv);
          else ctx.lineTo(xx, yv);
        }
        ctx.stroke();
      }
      break;
    }
    case 'chicken': {
      // Drumstick: meaty circle + bone.
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.arc(-r * 0.1, -r * 0.05, r * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = g.accent;
      ctx.beginPath();
      ctx.arc(-r * 0.28, -r * 0.22, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f7ead0';
      ctx.lineWidth = r * 0.16;
      ctx.beginPath();
      ctx.moveTo(r * 0.35, r * 0.3);
      ctx.lineTo(r * 0.75, r * 0.7);
      ctx.stroke();
      ctx.fillStyle = '#f7ead0';
      ctx.beginPath();
      ctx.arc(r * 0.82, r * 0.78, r * 0.16, 0, Math.PI * 2);
      ctx.arc(r * 0.62, r * 0.86, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'egg': {
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.85, r * 0.62, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = g.accent;
      ctx.beginPath();
      ctx.arc(r * 0.08, -r * 0.05, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath();
      ctx.arc(r * 0.0, -r * 0.12, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'chili': {
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -r * 0.5);
      ctx.quadraticCurveTo(r * 0.1, -r * 0.95, r * 0.75, -r * 0.25);
      ctx.quadraticCurveTo(r * 0.9, r * 0.35, r * 0.25, r * 0.6);
      ctx.quadraticCurveTo(-r * 0.4, r * 0.75, -r * 0.7, -r * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = r * 0.14;
      ctx.beginPath();
      ctx.moveTo(r * 0.55, -r * 0.35);
      ctx.quadraticCurveTo(r * 0.85, -r * 0.75, r * 0.6, -r * 0.9);
      ctx.stroke();
      break;
    }
    case 'kecap': {
      ctx.fillStyle = '#2a1808';
      rr(ctx, -r * 0.34, -r * 0.55, r * 0.68, r * 1.3, r * 0.22);
      ctx.fill();
      ctx.fillStyle = g.color;
      rr(ctx, -r * 0.26, -r * 0.3, r * 0.52, r * 0.85, r * 0.14);
      ctx.fill();
      ctx.fillStyle = '#d7263d';
      rr(ctx, -r * 0.26, -r * 0.05, r * 0.52, r * 0.34, r * 0.08);
      ctx.fill();
      ctx.fillStyle = '#f2b705';
      rr(ctx, -r * 0.2, -r * 0.72, r * 0.4, r * 0.2, r * 0.08);
      ctx.fill();
      break;
    }
    case 'greens': {
      ctx.fillStyle = g.color;
      for (let i = -1; i <= 1; i++) {
        ctx.save();
        ctx.rotate(i * 0.5);
        ctx.beginPath();
        ctx.ellipse(i * r * 0.28, -r * 0.1, r * 0.3, r * 0.58, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = g.accent;
      ctx.lineWidth = r * 0.08;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.28, -r * 0.55);
        ctx.lineTo(i * r * 0.28, r * 0.35);
        ctx.stroke();
      }
      break;
    }
    case 'peanut': {
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.72, r * 0.5, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = g.accent;
      for (const [dx, dy] of [[-0.3, -0.1], [0.1, 0.2], [0.35, -0.25]]) {
        ctx.beginPath();
        ctx.arc(dx * r, dy * r, r * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'tea': {
      // Amber cup with a tea surface and a curl of steam.
      ctx.fillStyle = '#fdf3d8';
      rr(ctx, -r * 0.55, -r * 0.45, r * 1.1, r * 1.05, r * 0.2);
      ctx.fill();
      ctx.fillStyle = g.color;
      rr(ctx, -r * 0.45, -r * 0.35, r * 0.9, r * 0.5, r * 0.14);
      ctx.fill();
      ctx.strokeStyle = '#fdf3d8';
      ctx.lineWidth = r * 0.12;
      ctx.beginPath();
      ctx.arc(r * 0.62, r * 0.05, r * 0.28, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      break;
    }
    case 'sugar': {
      ctx.fillStyle = g.color;
      ctx.strokeStyle = g.accent;
      ctx.lineWidth = 2;
      for (const [dx, dy, s] of [[-0.28, 0.1, 0.52], [0.3, -0.18, 0.46]]) {
        rr(ctx, dx * r - s * r / 2, dy * r - s * r / 2, s * r, s * r, r * 0.08);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'ice': {
      ctx.fillStyle = g.color;
      ctx.strokeStyle = g.accent;
      ctx.lineWidth = 2;
      for (const [dx, dy, rot] of [[-0.25, 0.12, 0.3], [0.28, -0.15, -0.2]]) {
        ctx.save();
        ctx.translate(dx * r, dy * r);
        ctx.rotate(rot);
        rr(ctx, -r * 0.28, -r * 0.28, r * 0.56, r * 0.56, r * 0.08);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = r * 0.08;
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, -r * 0.1);
      ctx.lineTo(-r * 0.2, -r * 0.35);
      ctx.moveTo(r * 0.1, -r * 0.3);
      ctx.lineTo(r * 0.35, -r * 0.05);
      ctx.stroke();
      break;
    }
    case 'lime': {
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d7f75b';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = g.accent;
      ctx.lineWidth = r * 0.07;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
        ctx.stroke();
      }
      break;
    }
    default:
      break;
  }
  gloss(ctx, 0, 0, r);
  ctx.restore();
}

// ---------------------------------------------------------------- flames

function drawFlame(ctx, x, y, s, t, hue = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const flick = 1 + Math.sin(t * 11 + x) * 0.08;
  ctx.scale(flick, 1 / Math.sqrt(flick));
  const grad = ctx.createRadialGradient(0, 0, 2, 0, -6, 26);
  grad.addColorStop(0, hue ? '#ffd166' : '#ffe08a');
  grad.addColorStop(0.45, hue ? '#f4842b' : '#f4842b');
  grad.addColorStop(1, 'rgba(214, 48, 49, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.bezierCurveTo(14, -12, 12, 6, 0, 10);
  ctx.bezierCurveTo(-12, 6, -14, -12, 0, -30);
  ctx.fill();
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.bezierCurveTo(6, -4, 5, 4, 0, 6);
  ctx.bezierCurveTo(-5, 4, -6, -4, 0, -14);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- scenes

function drawBackground(ctx, now) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#081d1e');
  grad.addColorStop(0.55, COLORS.bg);
  grad.addColorStop(1, '#0a1f1e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Stars.
  ctx.save();
  for (let i = 0; i < 60; i++) {
    const x = (i * 227.3) % VIEW_W;
    const y = ((i * 131.7) % 200) + 8;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(now * 0.7 + i * 1.7));
    ctx.globalAlpha = 0.25 + 0.45 * tw;
    ctx.fillStyle = '#cfe8e0';
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Warm stall glow behind the counter.
  const glow = ctx.createRadialGradient(VIEW_W / 2, 480, 60, VIEW_W / 2, 480, 720);
  glow.addColorStop(0, 'rgba(242, 183, 5, 0.14)');
  glow.addColorStop(1, 'rgba(242, 183, 5, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawStringLights(ctx, now) {
  ctx.save();
  const colors = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#f78c6b'];
  for (let strand = 0; strand < 2; strand++) {
    const y0 = 10 + strand * 18;
    const sag = 16 + strand * 4;
    ctx.strokeStyle = 'rgba(20,20,20,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.quadraticCurveTo(VIEW_W / 2, y0 + sag * 2, VIEW_W, y0);
    ctx.stroke();
    const bulbs = 16;
    for (let i = 0; i <= bulbs; i++) {
      const u = i / bulbs;
      const x = u * VIEW_W;
      const y = y0 + sag * 4 * u * (1 - u);
      const sway = Math.sin(now * 1.2 + i * 0.9 + strand * 2) * 2;
      const color = colors[(i + strand * 2) % colors.length];
      const flicker = 0.75 + 0.25 * Math.sin(now * 3 + i * 2.3);
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 14 * flicker;
      ctx.fillStyle = color;
      ctx.globalAlpha = flicker;
      ctx.beginPath();
      ctx.arc(x + sway, y + 8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawHud(ctx, world) {
  const { hud } = LAYOUT;
  ctx.fillStyle = 'rgba(8, 24, 24, 0.85)';
  ctx.fillRect(hud.x, hud.y, hud.w, hud.h);
  ctx.fillStyle = 'rgba(242, 183, 5, 0.25)';
  ctx.fillRect(0, hud.h - 2, VIEW_W, 2);

  // Coins.
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(48, 28, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a5a22';
  text(ctx, '¢', 48, 29, 20, '#8a5a22', 800);
  text(ctx, `${world.coins}`, 74, 30, 30, COLORS.cream, 800, 'left');

  // Day clock + progress bar.
  const mins = Math.floor(world.dayLeft / 60);
  const secs = Math.floor(world.dayLeft % 60);
  text(ctx, `SHIFT ${mins}:${String(secs).padStart(2, '0')}`, VIEW_W / 2, 20, 22, COLORS.cream, 800);
  const barW = 320;
  const barX = VIEW_W / 2 - barW / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  rr(ctx, barX, 38, barW, 8, 4);
  ctx.fill();
  ctx.fillStyle = world.dayLeft < 30 ? '#ef476f' : COLORS.amber;
  rr(ctx, barX, 38, barW * (world.dayLeft / DAY_LENGTH), 8, 4);
  ctx.fill();

  // Combo meter with flame.
  const cx = VIEW_W - 330;
  const flameScale = 0.55 + Math.min(world.combo, 10) * 0.13;
  drawFlame(ctx, cx, 34, flameScale, performance.now() / 1000, 1);
  text(ctx, `x${world.combo}`, cx + 26, 30, 26, world.combo > 0 ? '#ffd166' : COLORS.dim, 800, 'left');
  text(ctx, `COMBO ${world.combo}  ·  BEST ${world.bestCombo}`, cx + 26, 48, 11, COLORS.dim, 700, 'left');

  // Missed orders as X marks.
  for (let i = 0; i < 3; i++) {
    const x = VIEW_W - 90 + i * 26;
    ctx.fillStyle = i < world.missed ? '#ef476f' : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(x, 28, 10, 0, Math.PI * 2);
    ctx.fill();
    if (i < world.missed) text(ctx, '✕', x, 29, 13, '#ffffff', 800);
  }
}

function drawTicket(ctx, order, x, y, now, fly) {
  const dish = dishById(order.dishId);
  const w = LAYOUT.ticketW;
  const h = LAYOUT.ticketH;
  const flyT = fly ? 1 - order.flyOff / 0.7 : 0;
  const fy = fly ? -flyT * 110 : 0;
  const fx = fly ? order.flyDir * flyT * 180 : 0;
  const rot = fly ? order.flyDir * flyT * 0.5 : 0;
  ctx.save();
  ctx.translate(x + fx, y + fy);
  ctx.rotate(rot);
  if (fly) ctx.globalAlpha = Math.max(0, 1 - flyT);
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  ctx.fillStyle = COLORS.ticket;
  rr(ctx, 0, 0, w, h, 12);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(x + fx, y + fy);
  ctx.rotate(rot);
  if (fly) ctx.globalAlpha = Math.max(0, 1 - flyT);
  // Order number + dish name.
  text(ctx, `#${order.id}`, 16, 22, 13, '#a08c6a', 800, 'left');
  text(ctx, dish.name.toUpperCase(), 16, 48, 23, COLORS.ticketInk, 800, 'left');
  // Ingredient icons needed.
  dish.needs.forEach((gid, i) => {
    drawIcon(ctx, gid, 34 + i * 44, 86, 15);
  });
  // Countdown bar.
  const frac = Math.max(0, order.left / order.total);
  const barX = w - 150;
  ctx.fillStyle = '#e5d6b0';
  rr(ctx, barX, 18, 130, 12, 6);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? COLORS.green : frac > 0.25 ? '#f4842b' : '#d7263d';
  rr(ctx, barX, 18, 130 * frac, 12, 6);
  ctx.fill();
  text(ctx, `${Math.ceil(order.left)}s`, barX + 65, 44, 15, COLORS.ticketInk, 800);
  // Tip badge while the serve is still fast.
  if (frac >= 1 - TIP_WINDOW && order.flyOff === 0) {
    ctx.fillStyle = '#f2b705';
    rr(ctx, w - 150, 62, 130, 26, 13);
    ctx.fill();
    text(ctx, 'TIP +50%', w - 85, 76, 14, '#3a2a18', 800);
  }
  // "Cook" tag for dishes that need the stove.
  if (dish.cook) {
    text(ctx, '🔥 MASAK', w - 20, 100, 13, '#c75b39', 800, 'right');
  } else {
    text(ctx, '❄ TANPA MASAK', w - 20, 100, 13, '#2a7f62', 800, 'right');
  }
  ctx.restore();
}

function drawBoard(ctx, world, now) {
  const { board } = LAYOUT;
  ctx.save();
  ctx.fillStyle = COLORS.board;
  rr(ctx, board.x, board.y, board.w, board.h, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(242, 183, 5, 0.35)';
  ctx.lineWidth = 2;
  rr(ctx, board.x, board.y, board.w, board.h, 16);
  ctx.stroke();
  ctx.restore();
  text(ctx, 'ORDER BOARD', board.x + 16, board.y - 14, 13, COLORS.dim, 800, 'left');
  const totalW = world.orders.length * LAYOUT.ticketW + (world.orders.length - 1) * LAYOUT.ticketGap;
  let x = board.x + (board.w - totalW) / 2;
  for (const order of world.orders) {
    drawTicket(ctx, order, x, board.y + 8, now, order.flyOff > 0);
    x += LAYOUT.ticketW + LAYOUT.ticketGap;
  }
  if (world.orders.length === 0) {
    text(ctx, 'Menunggu pelanggan…', board.x + board.w / 2, board.y + board.h / 2, 20, COLORS.dim, 600);
  }
}

function drawPlate(ctx, world, now) {
  const { plate } = LAYOUT;
  const cx = plate.x;
  const cy = plate.y;
  const r = plate.r;
  const complete = !!world.plateDish;
  const shake = world.wrongFlash > 0 ? Math.sin(now * 40) * 5 * (world.wrongFlash / 0.45) : 0;
  ctx.save();
  ctx.translate(shake, 0);
  // Glow when the plate matches a dish.
  if (complete) {
    ctx.save();
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 30 + Math.sin(now * 5) * 8;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Plate.
  ctx.fillStyle = '#fdfdfd';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d9cfae';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#f3ead2';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.68, 0, Math.PI * 2);
  ctx.fill();
  // Ingredients on the plate.
  const n = world.plate.length;
  world.plate.forEach((gid, i) => {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.85;
    drawIcon(ctx, gid, cx + Math.cos(a) * r * 0.42, cy + Math.sin(a) * r * 0.42, 26);
  });
  if (n === 0) {
    text(ctx, 'PIRING', cx, cy - 8, 20, '#b8ab8d', 800);
    text(ctx, 'klik bahan di bawah', cx, cy + 18, 14, '#c9bc9c', 600);
  }
  // Label under the plate.
  if (complete) {
    const dish = dishById(world.plateDish);
    text(ctx, dish.name.toUpperCase(), cx, cy + r + 26, 22, '#ffd166', 800);
    text(ctx, dish.cook ? 'siap dimasak — SPASI / klik kompor' : 'siap disajikan — ENTER / klik jendela', cx, cy + r + 50, 14, COLORS.cream, 600);
  } else if (n > 0) {
    text(ctx, `${n}/4 bahan`, cx, cy + r + 26, 16, COLORS.dim, 700);
  }
  ctx.restore();
}

function drawStove(ctx, world, now, dt) {
  const { stove, burnerA, burnerB } = LAYOUT;
  ctx.save();
  // Stove body.
  ctx.fillStyle = '#3a3f4a';
  rr(ctx, stove.x, stove.y, stove.w, stove.h, 18);
  ctx.fill();
  ctx.fillStyle = '#2b2f38';
  rr(ctx, stove.x + 10, stove.y + 10, stove.w - 20, stove.h - 20, 12);
  ctx.fill();
  text(ctx, 'KOMPOR', stove.x + stove.w / 2, stove.y + 34, 16, '#8fa8a0', 800);
  const burners = [burnerA, burnerB];
  world.burners.forEach((b, i) => {
    const pos = burners[i];
    // Burner ring.
    ctx.fillStyle = '#1d2026';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a4f5a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, pos.r - 2, 0, Math.PI * 2);
    ctx.stroke();
    if (b.state === 'cooking') {
      drawFlame(ctx, pos.x, pos.y + 8, 1.5, now, 0);
      spawnSteam(pos.x, pos.y - 40, 1);
      // Progress ring.
      const frac = b.t / COOK_TIME;
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pos.r + 10, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      ctx.stroke();
      const dish = dishById(b.dishId);
      if (dish) {
        text(ctx, dish.short, pos.x, pos.y - pos.r - 26, 15, COLORS.cream, 800);
        text(ctx, `${Math.ceil(COOK_TIME - b.t)}s`, pos.x, pos.y, 20, '#ffffff', 800);
      }
    } else if (b.state === 'done') {
      drawFlame(ctx, pos.x, pos.y + 8, 0.9, now, 0);
      const dish = dishById(b.dishId);
      if (dish) drawIcon(ctx, dish.needs[0], pos.x, pos.y - 6, 26);
      ctx.fillStyle = '#06d6a0';
      rr(ctx, pos.x - 42, pos.y + pos.r - 6, 84, 24, 12);
      ctx.fill();
      text(ctx, 'SIAP!', pos.x, pos.y + pos.r + 6, 14, '#06281c', 800);
      text(ctx, `${Math.ceil(BURN_TIME - b.t)}s sblm gosong`, pos.x, pos.y + pos.r + 26, 12, '#ff9b9b', 700);
    } else if (b.state === 'burnt') {
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pos.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, 'GOSONG', pos.x, pos.y, 16, '#ff6b6b', 800);
      text(ctx, 'klik utk buang', pos.x, pos.y + 22, 12, COLORS.dim, 600);
    } else {
      text(ctx, 'KOSONG', pos.x, pos.y, 14, '#5a6a66', 700);
    }
  });
  ctx.restore();
}

function drawWindow(ctx, world, now) {
  const { window: w } = LAYOUT;
  const ready = world.burners.some((b) => b.state === 'done') || (world.plateDish && !dishById(world.plateDish).cook);
  ctx.save();
  // Awning stripes.
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#d7263d' : '#fdf3d8';
    ctx.beginPath();
    ctx.moveTo(w.x + i * 50, w.y);
    ctx.lineTo(w.x + (i + 1) * 50, w.y);
    ctx.lineTo(w.x + (i + 1) * 50 - 14, w.y + 34);
    ctx.lineTo(w.x + i * 50 - 14, w.y + 34);
    ctx.closePath();
    ctx.fill();
  }
  // Window frame.
  ctx.fillStyle = '#5d3717';
  rr(ctx, w.x, w.y + 30, w.w, w.h - 30, 14);
  ctx.fill();
  const glow = ready ? 0.9 + 0.1 * Math.sin(now * 6) : 0.55;
  ctx.fillStyle = `rgba(255, 190, 80, ${glow})`;
  rr(ctx, w.x + 12, w.y + 42, w.w - 24, w.h - 54, 10);
  ctx.fill();
  // Silhouette of a waiting customer.
  ctx.fillStyle = 'rgba(58, 42, 24, 0.55)';
  ctx.beginPath();
  ctx.arc(w.x + w.w / 2, w.y + 150, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w.x + w.w / 2, w.y + 250, 62, 46, 0, Math.PI, 0);
  ctx.fill();
  text(ctx, 'JENDELA SAJI', w.x + w.w / 2, w.y + 66, 20, '#3a2a18', 800);
  text(ctx, ready ? 'SIAP DIANTAR! (ENTER)' : 'antar pesanan ke sini', w.x + w.w / 2, w.y + 96, 15, '#3a2a18', 700);
  if (world.servedFlash > 0) {
    ctx.globalAlpha = Math.min(1, world.servedFlash);
    text(ctx, 'TERIMA KASIH!', w.x + w.w / 2, w.y + 200, 26, '#3a2a18', 800);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawCounter(ctx, world, now) {
  const { counter } = LAYOUT;
  ctx.save();
  // Wooden counter.
  const grad = ctx.createLinearGradient(0, counter.y, 0, VIEW_H);
  grad.addColorStop(0, COLORS.counterTop);
  grad.addColorStop(0.25, COLORS.counter);
  grad.addColorStop(1, COLORS.stallDark);
  ctx.fillStyle = grad;
  ctx.fillRect(counter.x, counter.y, counter.w, counter.h);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(0, counter.y, VIEW_W, 4);
  // Ingredient slots.
  INGREDIENTS.forEach((g, i) => {
    const r = slotRect(i);
    const hover = world.hoverSlot === i;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = hover ? '#3a2a18' : 'rgba(43, 29, 18, 0.55)';
    rr(ctx, r.x, r.y, r.w, r.h, 14);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = hover ? '#ffd166' : 'rgba(255,255,255,0.16)';
    ctx.lineWidth = hover ? 3 : 1.5;
    rr(ctx, r.x, r.y, r.w, r.h, 14);
    ctx.stroke();
    drawIcon(ctx, g.id, r.x + 44, r.y + r.h / 2, 26);
    text(ctx, g.name, r.x + 82, r.y + 34, 20, COLORS.cream, 700, 'left');
    text(ctx, 'klik /', r.x + 82, r.y + 62, 13, COLORS.dim, 600, 'left');
    // Key badge.
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    rr(ctx, r.x + r.w - 44, r.y + 12, 32, 28, 8);
    ctx.fill();
    text(ctx, g.key, r.x + r.w - 28, r.y + 27, 16, COLORS.cream, 800);
    // Dim slots already on the plate.
    if (world.plate.includes(g.id)) {
      ctx.fillStyle = 'rgba(6, 214, 160, 0.22)';
      rr(ctx, r.x, r.y, r.w, r.h, 14);
      ctx.fill();
      text(ctx, '✓', r.x + r.w - 28, r.y + r.h - 22, 20, '#06d6a0', 800);
    }
  });
  // Clear plate button.
  const cb = LAYOUT.clearBtn;
  const canClear = world.plate.length > 0;
  ctx.fillStyle = canClear ? '#d7263d' : 'rgba(255,255,255,0.10)';
  rr(ctx, cb.x, cb.y, cb.w, cb.h, 14);
  ctx.fill();
  text(ctx, 'BUANG', cb.x + cb.w / 2, cb.y + 34, 20, canClear ? '#ffffff' : COLORS.dim, 800);
  text(ctx, 'Backspace', cb.x + cb.w / 2, cb.y + 64, 13, canClear ? '#ffd9d9' : COLORS.dim, 600);
  ctx.restore();
}

function drawPops(ctx, world) {
  for (const p of world.pops) {
    const a = Math.min(1, p.t / 0.5);
    const rise = (1.1 - p.t) * 40;
    ctx.save();
    ctx.globalAlpha = a;
    glowText(ctx, p.text, p.x, p.y - rise, 30, p.color, p.color);
    ctx.restore();
  }
}

function drawConfetti(ctx) {
  for (const c of confetti) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - c.t / c.life);
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.fillStyle = c.color;
    ctx.fillRect(-5, -3, 10, 6);
    ctx.restore();
  }
}

function drawSteamFx(ctx) {
  for (const s of steam) {
    const a = Math.max(0, 1 - s.t / s.life) * 0.25;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- screens

function drawTitle(ctx, world, now, dt) {
  // Dim the kitchen behind.
  ctx.fillStyle = 'rgba(6, 18, 19, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Animated wok with steam.
  const wx = VIEW_W / 2;
  const wy = 300;
  const bob = Math.sin(now * 1.6) * 6;
  spawnSteam(wx, wy - 60, 1);
  ctx.save();
  ctx.translate(wx, wy + bob);
  ctx.fillStyle = '#22242c';
  ctx.beginPath();
  ctx.arc(0, 0, 92, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3a3f4a';
  ctx.beginPath();
  ctx.ellipse(0, -6, 96, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  // Food in the wok.
  ctx.fillStyle = '#e07b39';
  ctx.beginPath();
  ctx.ellipse(-18, -14, 34, 14, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c14e';
  ctx.beginPath();
  ctx.ellipse(22, -12, 30, 12, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3fa34d';
  ctx.beginPath();
  ctx.ellipse(0, -20, 22, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // Handle.
  ctx.strokeStyle = '#8a5a22';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(88, -4);
  ctx.lineTo(150, -30);
  ctx.stroke();
  ctx.restore();
  // Neon logo.
  glowText(ctx, 'WOK STAR', VIEW_W / 2, 130, 110, '#ffd166', '#f4842b');
  text(ctx, 'WARUNG CEPAT SAJI  •  MASAK, SAJI, DAPAT CUAN', VIEW_W / 2, 208, 20, COLORS.cream, 700);
  text(ctx, 'Malam ini warungmu yang paling ramai. Sajikan pesanan secepat kilat!', VIEW_W / 2, 448, 20, COLORS.dim, 600);
  // Menu preview.
  DISHES.forEach((d, i) => {
    const x = VIEW_W / 2 + (i - 1.5) * 210;
    ctx.fillStyle = 'rgba(253, 243, 216, 0.08)';
    rr(ctx, x - 92, 478, 184, 64, 12);
    ctx.fill();
    text(ctx, d.name, x, 500, 17, d.color, 800);
    text(ctx, `${d.price} koin`, x, 524, 14, COLORS.dim, 700);
  });
  // Start button.
  const b = LAYOUT.startBtn;
  const pulse = 1 + Math.sin(now * 3) * 0.03;
  ctx.save();
  ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = '#f4842b';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#f2b705';
  rr(ctx, -b.w / 2, -b.h / 2, b.w, b.h, 18);
  ctx.fill();
  ctx.restore();
  text(ctx, '▶  MULAI SHIFT', b.x + b.w / 2, b.y + b.h / 2 + 1, 30, '#3a2a18', 800);
  // Controls.
  text(ctx, 'Klik bahan (atau tombol 1–9, 0, -, =)  •  SPASI masak  •  ENTER saji  •  BACKSPACE buang  •  P jeda  •  M bisu', VIEW_W / 2, 676, 16, COLORS.dim, 600);
  text(ctx, 'Shift 3 menit  •  3 order hangus = tutup warung  •  Saji cepat = tip sampai +50%', VIEW_W / 2, 704, 16, COLORS.dim, 600);
  if (world.best > 0) {
    text(ctx, `Rekor: ${world.best} koin`, VIEW_W / 2, 748, 18, '#ffd166', 800);
  }
  text(ctx, 'WOK STAR — game orisinal untuk make.fun', VIEW_W / 2, 860, 13, 'rgba(143,168,160,0.7)', 600);
}

function drawPaused(ctx, world) {
  ctx.fillStyle = 'rgba(6, 18, 19, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  glowText(ctx, 'JEDA', VIEW_W / 2, 400, 90, COLORS.cream, '#f2b705');
  text(ctx, 'Tekan P atau klik untuk lanjut', VIEW_W / 2, 490, 20, COLORS.dim, 600);
}

function drawOver(ctx, world) {
  ctx.fillStyle = 'rgba(6, 18, 19, 0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  glowText(ctx, 'SHIFT SELESAI', VIEW_W / 2, 180, 72, '#ffd166', '#f4842b');
  text(ctx, world.overReason, VIEW_W / 2, 250, 22, COLORS.cream, 600);
  // Score card.
  const cx = VIEW_W / 2;
  ctx.fillStyle = 'rgba(253, 243, 216, 0.07)';
  rr(ctx, cx - 260, 300, 520, 260, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(242, 183, 5, 0.4)';
  ctx.lineWidth = 2;
  rr(ctx, cx - 260, 300, 520, 260, 18);
  ctx.stroke();
  text(ctx, `${world.coins}`, cx, 380, 72, '#ffd166', 800);
  text(ctx, 'KOIN', cx, 432, 20, COLORS.dim, 800);
  text(ctx, `Hidangan disajikan: ${world.served}`, cx, 486, 20, COLORS.cream, 700);
  text(ctx, `Combo terbaik: x${world.bestCombo}`, cx, 516, 20, COLORS.cream, 700);
  if (world.coins >= world.best && world.coins > 0) {
    text(ctx, '★ REKOR BARU! ★', cx, 560, 24, '#ffd166', 800);
  } else if (world.best > 0) {
    text(ctx, `Rekor: ${world.best} koin`, cx, 560, 18, COLORS.dim, 700);
  }
  const b = LAYOUT.restartBtn;
  ctx.save();
  ctx.shadowColor = '#f4842b';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#f2b705';
  rr(ctx, b.x, b.y, b.w, b.h, 18);
  ctx.fill();
  ctx.restore();
  text(ctx, '↻  MAIN LAGI (R)', b.x + b.w / 2, b.y + b.h / 2 + 1, 28, '#3a2a18', 800);
  text(ctx, 'WOK STAR — terima kasih sudah mampir ke warung!', VIEW_W / 2, 800, 15, COLORS.dim, 600);
}

// ---------------------------------------------------------------- main draw

export function draw(ctx, world, now, dt) {
  updateParticles(dt);
  // Confetti bursts requested by the world.
  for (const b of world.bursts) {
    if (!b.spawned) {
      spawnConfetti(b.x, b.y);
      b.spawned = true;
    }
  }
  ctx.save();
  // Screen shake on burnt dishes.
  if (world.shake > 0) {
    const s = world.shake * 14;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawBackground(ctx, now);
  if (world.mode === 'title') {
    drawTitle(ctx, world, now, dt);
  } else {
    drawHud(ctx, world);
    drawBoard(ctx, world, now);
    drawPlate(ctx, world, now);
    drawStove(ctx, world, now, dt);
    drawWindow(ctx, world, now);
    drawCounter(ctx, world, now);
    drawPops(ctx, world);
    if (world.mode === 'paused') drawPaused(ctx, world);
    if (world.mode === 'over') drawOver(ctx, world);
  }
  // String lights drape over the top of everything, HUD included.
  drawStringLights(ctx, now);
  drawSteamFx(ctx);
  drawConfetti(ctx);
  // Perfect-serve golden vignette.
  if (world.perfectFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.25, world.perfectFlash * 0.25);
    const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 100, VIEW_W / 2, VIEW_H / 2, 800);
    g.addColorStop(0, 'rgba(255, 209, 102, 0)');
    g.addColorStop(1, 'rgba(255, 209, 102, 1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
    text(ctx, 'SEMPURNA!', VIEW_W / 2, 260, 44, '#ffd166', 800);
  }
  ctx.restore();
}
