// Kutilang Sky Courier — entry point. Owns the game state, the frame loop,
// the title/play/done/over screens and the ?shot= staging hook. Physics,
// world, rendering, sound and input each live in their own file.
import { VIEW, WORLD, MISSIONS, STORM, missionById, missionByKey } from './config.js';
import { buildWorld, resetMissionTargets } from './world.js';
import { freshPlane, freshFlight, stepFlight } from './physics.js';
import { drawScene, SCREEN_TITLE, SCREEN_PLAY, SCREEN_DONE, SCREEN_OVER } from './render.js';
import { createAudio, ensureAudio, updateEngine, playChime, playThump, playCrash, toggleMute } from './audio.js';
import { createInput, attachInput, readControls, missionRowAt } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const audio = createAudio();
const input = createInput();

function newGame(missionId) {
  const world = buildWorld(WORLD.seed);
  const state = {
    mission: missionId,
    missionIndex: MISSIONS.findIndex((m) => m.id === missionId),
    world,
    plane: freshPlane(),
    flight: freshFlight(),
    screen: SCREEN_TITLE,
    paused: false,
    best: 0,
  };
  if (missionId === 'storm') state.flight.timeLeft = STORM.timeLimit;
  resetMissionTargets(world);
  return state;
}
let state = newGame('ring');
let lastTime = performance.now();
let shotScreen = null;

function startMission(index) {
  const mission = MISSIONS[index] || MISSIONS[0];
  state = newGame(mission.id);
  state.screen = SCREEN_PLAY;
  ensureAudio(audio);
  announce(`${mission.name} — ${mission.goal}`);
}
function restart() {
  const mission = state.mission;
  state = newGame(mission);
  state.screen = SCREEN_PLAY;
  announce('Restarted. Fly safe.');
}
function announce(text) {
  if (statusEl) statusEl.textContent = text;
}
function onKey(code) {
  ensureAudio(audio);
  if (code === 'KeyM') {
    const muted = toggleMute(audio);
    announce(muted ? 'Sound muted.' : 'Sound on.');
    return;
  }
  if (code === 'KeyR') {
    restart();
    return;
  }
  if (code === 'KeyP' && state.screen === SCREEN_PLAY) {
    state.paused = !state.paused;
    announce(state.paused ? 'Paused.' : 'Resumed.');
    return;
  }
  if (state.screen === SCREEN_TITLE) {
    const mission = missionByKey(code.replace('Digit', ''));
    if (mission) startMission(MISSIONS.indexOf(mission));
    return;
  }
  if (code === 'Enter' && (state.screen === SCREEN_DONE || state.screen === SCREEN_OVER)) restart();
}
attachInput(input, canvas, onKey);
canvas.addEventListener('click', () => {
  ensureAudio(audio);
  if (state.screen === SCREEN_TITLE && input.clicked) {
    const row = missionRowAt(input.clicked.y);
    if (row >= 0) startMission(row);
  }
});
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(VIEW.width * dpr);
  canvas.height = Math.round(VIEW.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// The frame loop: advance the sim, ring the sounds for what happened,
// then draw. Shot mode stages a scene once and draws it still.
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (state.screen === SCREEN_PLAY && !state.paused) {
    // Camera follows the plane; the mouse steers in screen space, so the
    // controls need the camera offset the renderer uses.
    const camX = Math.max(0, Math.min(WORLD.length - VIEW.width, state.plane.x - 360));
    const camY = Math.max(-40, Math.min(260, state.plane.y - 380));
    const live = readControls(input, state.plane, { x: camX, y: camY });
    const events = stepFlight(state, state.world, live, dt);
    if (events.ring >= 0) playChime(audio);
    if (events.landed >= 0) playThump(audio, state.flight.damage > 40);
    if (events.crashed) playCrash(audio);
    if (state.flight.messageT > 0) state.flight.messageT -= dt;
    if (state.flight.done) state.screen = SCREEN_DONE;
    if (state.flight.over) state.screen = SCREEN_OVER;
    updateEngine(audio, state.plane.throttle, state.plane.speed, audio.muted);
  } else if (state.screen === SCREEN_TITLE) {
    // The title screen idles over a live, gently flying world.
    const idle = { pitch: 0, throttle: 0, brake: false, steer: 0 };
    stepFlight(state, state.world, idle, dt);
    if (state.plane.x > WORLD.length - 800 || state.plane.crashed) {
      state.plane = freshPlane();
      state.flight = freshFlight();
      resetMissionTargets(state.world);
    }
    updateEngine(audio, 0.3, state.plane.speed, true);
  }
  drawScene(ctx, state, state.screen, now / 1000);
  requestAnimationFrame(frame);
}
if (shotName) {
  // ?shot=start|play|ring|land: stage the scene synchronously, then draw
  // it once. No loop, no input — a still frame for the screenshot.
  const staged = stageShot(shotName, state);
  shotScreen = staged.screen;
  state.screen = staged.screen;
  drawScene(ctx, state, staged.screen, 4.2);
  announce(`Screenshot scene: ${shotName}.`);
} else {
  requestAnimationFrame(frame);
}
