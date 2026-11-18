// input.js — keyboard and mouse state. One clear job: read the player's controls.
export function createInput(canvas) {
  const input = {
    keys: {},
    mouse: { x: 0, y: 0, down: false, clicked: false },
    _prev: {},
  };
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    input.keys[e.code] = true;
  });
  window.addEventListener('keyup', (e) => { input.keys[e.code] = false; });
  window.addEventListener('blur', () => { input.keys = {}; input.mouse.down = false; });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = e.clientX - r.left;
    input.mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { input.mouse.down = true; input.mouse.clicked = true; }
  });
  window.addEventListener('mouseup', () => { input.mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  return input;
}

export function isDown(input, ...codes) {
  return codes.some((c) => !!input.keys[c]);
}

// Edge-triggered key: true only on the frame the key went down.
export function pressed(input, code) {
  const was = !!input._prev[code];
  return !!input.keys[code] && !was;
}

export function endFrameInput(input) {
  input._prev = { ...input.keys };
  input.mouse.clicked = false;
}
