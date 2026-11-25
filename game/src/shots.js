// Wok Star — screenshot scenes: ?shot=start|play|end|serve&seed=N sets up a
// deterministic, good-looking frame for each named shot. The play shot is the
// hero: a full board, a dish mid-assembly, a burner cooking with steam.

import { ORDER_TIME } from './config.js';
import { createWorld, startShift } from './world.js';

function ticket(id, dishId, left) {
  return { id, dishId, left, total: ORDER_TIME, flyOff: 0, flyDir: 1 };
}

// Build a fresh world for the given shot name and seed.
export function worldForShot(shot, seed) {
  const world = createWorld(seed);
  if (shot === 'start') {
    world.mode = 'title';
    world.best = 87;
    return world;
  }
  if (shot === 'end') {
    startShift(world);
    world.time = 180;
    world.dayLeft = 0;
    world.coins = 156;
    world.served = 14;
    world.combo = 0;
    world.bestCombo = 6;
    world.missed = 3;
    world.best = 156;
    world.mode = 'over';
    world.overReason = 'Tiga order hangus — shift berakhir.';
    world.orders = [];
    world.plate = ['tea', 'sugar', 'ice', 'lime'];
    world.plateDish = 'es-teh';
    return world;
  }
  if (shot === 'serve') {
    startShift(world);
    world.time = 96;
    world.dayLeft = 84;
    world.coins = 72;
    world.served = 7;
    world.combo = 4;
    world.bestCombo = 5;
    world.orders = [
      ticket(11, 'nasi-goreng', 38),
      ticket(12, 'es-teh', 22),
      ticket(13, 'sate-ayam', 14),
    ];
    // One ticket just flew off after a serve.
    world.orders.push({ id: 10, dishId: 'mie-ayam', left: 30, total: ORDER_TIME, flyOff: 0.45, flyDir: 1 });
    world.plate = ['tea', 'sugar'];
    world.plateDish = null;
    world.burners[0] = { dishId: 'sate-ayam', t: 0, state: 'done' };
    world.burners[1] = { dishId: null, t: 0, state: 'empty' };
    world.servedFlash = 0.9;
    world.perfectFlash = 1.0;
    world.bursts.push({ x: 1260, y: 330, t: 1.3 });
    world.pops.push({ x: 1260, y: 300, text: '+18', color: '#ffd166', t: 1.1 });
    world.lastServe = { dishId: 'mie-ayam', coins: 18 };
    return world;
  }
  // Default: play — the hero shot.
  startShift(world);
  world.time = 52;
  world.dayLeft = 128;
  world.coins = 48;
  world.served = 4;
  world.combo = 3;
  world.bestCombo = 4;
  world.orders = [
    ticket(4, 'nasi-goreng', 34),
    ticket(5, 'mie-ayam', 26),
    ticket(6, 'es-teh', 18),
  ];
  // Nasi Goreng mid-assembly on the plate: rice + egg, chili and kecap to go.
  world.plate = ['rice', 'egg'];
  world.plateDish = null;
  // One burner cooking Mie Ayam, one free.
  world.burners[0] = { dishId: 'mie-ayam', t: 2.2, state: 'cooking' };
  world.burners[1] = { dishId: null, t: 0, state: 'empty' };
  return world;
}

// Read the shot from the page URL (?shot=...&seed=...). Defaults to play/1.
export function shotFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot') || 'play';
  const seed = Number(params.get('seed') || '1') || 1;
  return { shot, seed };
}
