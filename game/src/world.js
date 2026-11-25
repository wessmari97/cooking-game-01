// Wok Star — game state: orders, plate, burners, score, combo, day clock.
// Pure logic, no drawing and no DOM: render.js draws whatever this holds.

import {
  BURN_TIME,
  COOK_TIME,
  COMBO_CAP,
  COMBO_STEP,
  DAY_LENGTH,
  DISHES,
  FIRST_ORDER_DELAY,
  MAX_MISSED,
  MAX_ORDERS,
  ORDER_GAP_MAX,
  ORDER_GAP_MIN,
  ORDER_TIME,
  PLATE_SIZE,
  TIP_MAX,
  TIP_WINDOW,
  WRONG_LOCK,
  anyDishFits,
  dishForPlate,
} from './config.js';
import { makeRng } from './random.js';

let ticketSeq = 0;

export function createWorld(seed = 1) {
  const rng = makeRng(seed);
  return {
    seed,
    rng,
    mode: 'title', // title | playing | paused | over
    time: 0, // seconds into the shift
    dayLeft: DAY_LENGTH,
    orders: [], // {id, dishId, left, total, flyOff}
    plate: [], // ingredient ids, in the order added
    plateDish: null, // dish id once the plate exactly matches a recipe
    burners: [
      { dishId: null, t: 0, state: 'empty' }, // state: empty | cooking | done | burnt
      { dishId: null, t: 0, state: 'empty' },
    ],
    coins: 0,
    served: 0,
    combo: 0,
    bestCombo: 0,
    missed: 0,
    wrongLock: 0,
    wrongFlash: 0,
    spawnIn: FIRST_ORDER_DELAY,
    pops: [], // floating "+12" texts {x, y, text, color, t}
    servedFlash: 0, // timer for the serve celebration
    shake: 0, // screen-shake seconds left (burnt dish)
    bursts: [], // confetti bursts {x, y, t}
    perfectFlash: 0, // timer for a perfect-serve glow
    lastServe: null, // {dishId, coins} for the end screen
    overReason: '',
    best: 0, // best coins, filled in by main.js from localStorage
  };
}

export function startShift(world) {
  world.mode = 'playing';
  world.time = 0;
  world.dayLeft = DAY_LENGTH;
  world.orders = [];
  world.plate = [];
  world.plateDish = null;
  world.burners = [
    { dishId: null, t: 0, state: 'empty' },
    { dishId: null, t: 0, state: 'empty' },
  ];
  world.coins = 0;
  world.served = 0;
  world.combo = 0;
  world.bestCombo = 0;
  world.missed = 0;
  world.wrongLock = 0;
  world.wrongFlash = 0;
  world.spawnIn = FIRST_ORDER_DELAY;
  world.pops = [];
  world.servedFlash = 0;
  world.shake = 0;
  world.bursts = [];
  world.perfectFlash = 0;
  world.lastServe = null;
  world.overReason = '';
}

// --- orders ---------------------------------------------------------------

function spawnOrder(world) {
  const dish = world.rng.pick(DISHES);
  world.orders.push({
    id: ++ticketSeq,
    dishId: dish.id,
    left: ORDER_TIME,
    total: ORDER_TIME,
    flyOff: 0, // >0 while the ticket flies away after a serve
    flyDir: 1,
  });
}

function dishPrice(world, dish, order) {
  const fast = order.left / order.total;
  const tip = fast >= 1 - TIP_WINDOW ? TIP_MAX * (fast - (1 - TIP_WINDOW)) / TIP_WINDOW : 0;
  const comboBonus = Math.min(world.combo * COMBO_STEP, COMBO_CAP);
  return Math.max(1, Math.round(dish.price * (1 + tip) * (1 + comboBonus)));
}

// --- plate ----------------------------------------------------------------

export function addIngredient(world, id) {
  if (world.mode !== 'playing' || world.wrongLock > 0) return { ok: false, reason: 'locked' };
  if (world.plate.length >= PLATE_SIZE) return { ok: false, reason: 'full' };
  if (world.plate.includes(id)) return { ok: false, reason: 'dup' };
  if (!anyDishFits(world.plate, id)) {
    world.wrongLock = WRONG_LOCK;
    world.wrongFlash = WRONG_LOCK;
    world.combo = 0;
    return { ok: false, reason: 'wrong' };
  }
  world.plate.push(id);
  const dish = dishForPlate(world.plate);
  world.plateDish = dish ? dish.id : null;
  return { ok: true, dish: world.plateDish };
}

export function clearPlate(world) {
  if (world.mode !== 'playing') return false;
  if (world.plate.length === 0) return false;
  world.plate = [];
  world.plateDish = null;
  return true;
}

// --- cooking --------------------------------------------------------------

export function startCooking(world) {
  if (world.mode !== 'playing' || !world.plateDish) return { ok: false };
  const dish = DISHES.find((d) => d.id === world.plateDish);
  if (!dish.cook) return { ok: false, reason: 'no-cook' };
  const burner = world.burners.find((b) => b.state === 'empty');
  if (!burner) return { ok: false, reason: 'busy' };
  burner.dishId = dish.id;
  burner.t = 0;
  burner.state = 'cooking';
  world.plate = [];
  world.plateDish = null;
  return { ok: true };
}

// --- serving --------------------------------------------------------------

export function serve(world) {
  if (world.mode !== 'playing') return { ok: false };
  // A cooked dish ready on a burner, or a no-cook dish assembled on the plate.
  let dishId = null;
  let burner = null;
  for (const b of world.burners) {
    if (b.state === 'done') {
      dishId = b.dishId;
      burner = b;
      break;
    }
  }
  if (!dishId && world.plateDish) {
    const dish = DISHES.find((d) => d.id === world.plateDish);
    if (dish && !dish.cook) dishId = dish.id;
  }
  if (!dishId) return { ok: false, reason: 'nothing-ready' };
  const order = world.orders.find((o) => o.dishId === dishId && o.flyOff === 0);
  if (!order) return { ok: false, reason: 'no-order' };
  const dish = DISHES.find((d) => d.id === dishId);
  const earned = dishPrice(world, dish, order);
  world.coins += earned;
  world.served += 1;
  world.combo += 1;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  world.lastServe = { dishId, coins: earned };
  world.servedFlash = 0.9;
  // A fast serve (inside the tip window) is perfect: confetti + glow.
  const fast = order.left / order.total;
  if (fast >= 1 - TIP_WINDOW) {
    world.perfectFlash = 1.1;
    world.bursts.push({ x: 1260, y: 330, t: 1.4 });
  }
  order.flyOff = 0.7;
  order.flyDir = world.rng.next() > 0.5 ? 1 : -1;
  if (burner) {
    burner.dishId = null;
    burner.t = 0;
    burner.state = 'empty';
  } else {
    world.plate = [];
    world.plateDish = null;
  }
  world.pops.push({ x: 1260, y: 300, text: `+${earned}`, color: '#ffd166', t: 1.1 });
  return { ok: true, earned, dishId };
}

// --- update ---------------------------------------------------------------

export function update(world, dt) {
  if (world.mode !== 'playing') return;
  world.time += dt;
  world.dayLeft = Math.max(0, DAY_LENGTH - world.time);
  if (world.wrongLock > 0) world.wrongLock -= dt;
  if (world.wrongFlash > 0) world.wrongFlash -= dt;
  if (world.servedFlash > 0) world.servedFlash -= dt;
  if (world.perfectFlash > 0) world.perfectFlash -= dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt);
  for (const p of world.pops) p.t -= dt;
  world.pops = world.pops.filter((p) => p.t > 0);
  for (const b of world.bursts) b.t -= dt;
  world.bursts = world.bursts.filter((b) => b.t > 0);

  // Spawn orders.
  world.spawnIn -= dt;
  if (world.spawnIn <= 0 && world.orders.filter((o) => o.flyOff === 0).length < MAX_ORDERS) {
    spawnOrder(world);
    world.spawnIn = world.rng.float(ORDER_GAP_MIN, ORDER_GAP_MAX);
  }

  // Tickets count down; expired ones fly off and count as missed.
  for (const o of world.orders) {
    if (o.flyOff > 0) {
      o.flyOff -= dt;
      continue;
    }
    o.left -= dt;
    if (o.left <= 0) {
      o.left = 0;
      o.flyOff = 0.7;
      o.flyDir = -1;
      world.missed += 1;
      world.combo = 0;
      world.pops.push({ x: 220, y: 130, text: 'Order hangus!', color: '#ff6b6b', t: 1.2 });
    }
  }
  world.orders = world.orders.filter((o) => o.flyOff > 0 || o.left > 0);

  // Burners cook, then burn.
  for (const b of world.burners) {
    if (b.state === 'cooking') {
      b.t += dt;
      if (b.t >= COOK_TIME) {
        b.state = 'done';
        b.t = 0;
      }
    } else if (b.state === 'done') {
      b.t += dt;
      if (b.t >= BURN_TIME) {
        b.state = 'burnt';
        b.t = 0;
        world.combo = 0;
        world.shake = 0.4;
        world.pops.push({ x: 850, y: 320, text: 'Gosong!', color: '#ff6b6b', t: 1.2 });
      }
    }
  }

  // End of shift.
  if (world.missed >= MAX_MISSED) {
    world.mode = 'over';
    world.overReason = 'Tiga order hangus — shift berakhir.';
  } else if (world.dayLeft <= 0) {
    world.mode = 'over';
    world.overReason = 'Shift selesai! Waktunya tutup warung.';
  }
}

export function clearBurnt(world, index) {
  const b = world.burners[index];
  if (!b || b.state !== 'burnt') return false;
  b.dishId = null;
  b.t = 0;
  b.state = 'empty';
  return true;
}
