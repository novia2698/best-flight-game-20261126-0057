// Keyboard and mouse input: a small state object the main loop reads
// every frame. The mouse steers the plane toward the cursor; keys
// handle pitch, throttle, brake, pause, restart and mute.
export function createInput() {
  return {
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseActive: false,
    mouseDown: false,
    clicked: null,
  };
}
export function attachInput(input, canvas, onKey) {
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (!event.repeat) {
      input.keys.add(event.code);
      if (onKey) onKey(event.code);
    }
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouseDown = false;
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = event.clientX - rect.left;
    input.mouseY = event.clientY - rect.top;
    input.mouseActive = true;
  });
  canvas.addEventListener('mousedown', (event) => {
    input.mouseDown = true;
    const rect = canvas.getBoundingClientRect();
    input.clicked = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });
}
// What the physics step should do this frame, from the raw input state.
export function readControls(input, plane, cam) {
  const pitchKey = (input.keys.has('ArrowDown') || input.keys.has('KeyS') ? 1 : 0)
    - (input.keys.has('ArrowUp') || input.keys.has('KeyW') ? 1 : 0);
  const throttleKey = (input.keys.has('ArrowRight') || input.keys.has('KeyD') ? 1 : 0)
    - (input.keys.has('ArrowLeft') || input.keys.has('KeyA') ? 1 : 0);
  let steer = null;
  if (input.mouseActive && !plane.landed) {
    const px = plane.x - cam.x;
    const py = plane.y - cam.y;
    const dx = input.mouseX - px;
    const dy = input.mouseY - py;
    // Only steer when the cursor is meaningfully ahead of the plane.
    if (Math.hypot(dx, dy) > 60) steer = Math.atan2(dy, dx);
  }
  return {
    pitch: pitchKey,
    throttle: throttleKey,
    brake: input.keys.has('Space'),
    steer,
  };
}

// Click zones the title screen understands: the three mission rows.
export function missionRowAt(y) {
  for (let i = 0; i < 3; i += 1) {
    const top = 428 + i * 58 - 32;
    if (y >= top && y <= top + 52) return i;
  }
  return -1;
}
