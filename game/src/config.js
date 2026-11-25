// Wok Star — configuration: menu, ingredients, timings, colours, layout.
// All tuning lives here so the rest of the game stays small and readable.

export const VIEW_W = 1440;
export const VIEW_H = 900;

export const DAY_LENGTH = 180; // seconds per shift
export const ORDER_TIME = 45; // seconds before an order ticket expires
export const MAX_ORDERS = 3;
export const MAX_MISSED = 3; // expired orders that end the shift
export const COOK_TIME = 4; // seconds on a burner
export const BURN_TIME = 3; // seconds after done before the dish burns
export const PLATE_SIZE = 4; // ingredients a plate holds

// First order shows up quickly; later ones arrive every 9-16 seconds.
export const FIRST_ORDER_DELAY = 2;
export const ORDER_GAP_MIN = 9;
export const ORDER_GAP_MAX = 16;

// Tip: serve in the first half of the ticket's life for up to +50%.
export const TIP_WINDOW = 0.5;
export const TIP_MAX = 0.5;

// Combo: each consecutive on-time serve adds 5% (capped at +50%).
export const COMBO_STEP = 0.05;
export const COMBO_CAP = 0.5;

// Wrong-ingredient penalty: a short lock so the player feels the mistake.
export const WRONG_LOCK = 0.45;

// Keys for the 12 counter slots, left to right, top row then bottom row.
export const SLOT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];

export const INGREDIENTS = [
  { id: 'rice', name: 'Nasi', color: '#f7f3e8', accent: '#d9cfae', key: '1' },
  { id: 'noodles', name: 'Mie', color: '#f2c14e', accent: '#c98f1b', key: '2' },
  { id: 'chicken', name: 'Ayam', color: '#c98a4b', accent: '#8a5a22', key: '3' },
  { id: 'egg', name: 'Telur', color: '#fdfdfd', accent: '#f2b705', key: '4' },
  { id: 'chili', name: 'Cabai', color: '#d7263d', accent: '#8f1626', key: '5' },
  { id: 'kecap', name: 'Kecap', color: '#4a2c14', accent: '#2a1808', key: '6' },
  { id: 'greens', name: 'Sayur', color: '#3fa34d', accent: '#1e6b2c', key: '7' },
  { id: 'peanut', name: 'Kacang', color: '#d9a066', accent: '#a06a2e', key: '8' },
  { id: 'tea', name: 'Teh', color: '#b5651d', accent: '#7a3f0e', key: '9' },
  { id: 'sugar', name: 'Gula', color: '#ffffff', accent: '#c9c9c9', key: '0' },
  { id: 'ice', name: 'Es', color: '#a8d8ea', accent: '#5b9db8', key: '-' },
  { id: 'lime', name: 'Jeruk', color: '#8ac926', accent: '#4d7a0e', key: '=' },
];

export const DISHES = [
  {
    id: 'nasi-goreng',
    name: 'Nasi Goreng',
    short: 'NasGor',
    needs: ['rice', 'egg', 'chili', 'kecap'],
    price: 12,
    cook: true,
    color: '#e07b39',
  },
  {
    id: 'mie-ayam',
    name: 'Mie Ayam',
    short: 'MieAyam',
    needs: ['noodles', 'chicken', 'greens', 'chili'],
    price: 12,
    cook: true,
    color: '#e8a838',
  },
  {
    id: 'sate-ayam',
    name: 'Sate Ayam',
    short: 'Sate',
    needs: ['chicken', 'peanut', 'chili', 'lime'],
    price: 15,
    cook: true,
    color: '#c75b39',
  },
  {
    id: 'es-teh',
    name: 'Es Teh Manis',
    short: 'EsTeh',
    needs: ['tea', 'sugar', 'ice', 'lime'],
    price: 8,
    cook: false,
    color: '#7fb069',
  },
];

export const ingredientById = (id) => INGREDIENTS.find((g) => g.id === id);
export const dishById = (id) => DISHES.find((d) => d.id === id);

// Does any dish contain every ingredient in `plate` (plus `extra`)?
export function anyDishFits(plate, extra) {
  const set = [...plate, ...(extra ? [extra] : [])];
  return DISHES.some((d) => set.every((g) => d.needs.includes(g)));
}

// The dish whose recipe is exactly `plate`, or null.
export function dishForPlate(plate) {
  if (plate.length !== PLATE_SIZE) return null;
  return DISHES.find((d) => d.needs.length === plate.length && d.needs.every((g) => plate.includes(g))) ?? null;
}

export const COLORS = {
  bg: '#0e2a2b',
  bgGlow: '#14393a',
  stall: '#7a4a21',
  stallDark: '#5d3717',
  counter: '#a9713d',
  counterTop: '#c98d4e',
  board: '#2b1d12',
  ticket: '#fdf3d8',
  ticketInk: '#3a2a18',
  hud: '#10201f',
  cream: '#f7ead0',
  amber: '#f2b705',
  red: '#d7263d',
  green: '#3fa34d',
  gold: '#ffd166',
  white: '#ffffff',
  dim: '#8fa8a0',
};

export const LAYOUT = {
  hud: { x: 0, y: 0, w: VIEW_W, h: 56 },
  board: { x: 24, y: 68, w: VIEW_W - 48, h: 132 },
  ticketW: 400,
  ticketH: 116,
  ticketGap: 24,
  plate: { x: 400, y: 430, r: 108 },
  stove: { x: 640, y: 300, w: 420, h: 250 },
  burnerA: { x: 745, y: 425, r: 62 },
  burnerB: { x: 955, y: 425, r: 62 },
  window: { x: 1110, y: 250, w: 300, h: 300 },
  counter: { x: 0, y: 640, w: VIEW_W, h: 260 },
  slotW: 196,
  slotH: 96,
  slotGap: 12,
  slotsX: 24,
  slotsY: 668,
  clearBtn: { x: 1280, y: 664, w: 136, h: 96 },
  startBtn: { x: VIEW_W / 2 - 160, y: 560, w: 320, h: 84 },
  restartBtn: { x: VIEW_W / 2 - 160, y: 620, w: 320, h: 84 },
};

export function slotRect(i) {
  const col = i % 6;
  const row = Math.floor(i / 6);
  return {
    x: LAYOUT.slotsX + col * (LAYOUT.slotW + LAYOUT.slotGap),
    y: LAYOUT.slotsY + row * (LAYOUT.slotH + LAYOUT.slotGap),
    w: LAYOUT.slotW,
    h: LAYOUT.slotH,
  };
}
