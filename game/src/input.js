// Wok Star — mouse + keyboard input. Converts browser events into logical
// 1440x900 coordinates and key names, then hands them to the game controller.

import { VIEW_W, VIEW_H } from './config.js';

// Map a pointer event to logical game coordinates.
function toLogical(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * VIEW_W;
  const y = ((event.clientY - rect.top) / rect.height) * VIEW_H;
  return { x, y };
}

export function bindInput(canvas, game) {
  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    const p = toLogical(canvas, event);
    game.onClick(p.x, p.y);
  });

  window.addEventListener('keydown', (event) => {
    // Ignore repeats so holding a key does not spam ingredients.
    if (event.repeat) return;
    const key = event.key;
    if (key === ' ' || key.startsWith('Arrow')) event.preventDefault();
    game.onKey(key);
  });

  // Keep the canvas focused so keys always land here.
  canvas.setAttribute('tabindex', '0');
  canvas.addEventListener('pointerdown', () => canvas.focus());
  canvas.focus();
}
