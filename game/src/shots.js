// Screenshot scenes behind ?shot=start|play|ring|land. Each one plays the
// real rules forward from a fresh state with a simple autopilot — hold a
// cruise speed, steer toward the next ring or strip, ease down to land —
// so every frame is what a short game really looks like, and the same
// seed always gives the same frame.
import { WORLD } from './config.js';
import { groundHeight } from './world.js';
import { stepFlight } from './physics.js';
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';

const STEP = 1 / 60;
const START_SECONDS = 6;
const PLAY_SECONDS = 18;
const LIMIT_SECONDS = 150;
const CRUISE = 190;

// Steer toward a point, easing the descent so the approach reads.
// A landing approach flies a glide path: high and level until close,
// then a shallow settle onto the strip at low speed.
export function autopilot(state, target) {
  const plane = state.plane;
  let aimX = target.x;
  let aimY = target.y;
  let cruise = CRUISE;
  let maxPitch = 0.7;
  if (target.land) {
    const dx = target.x - plane.x;
    if (dx > 700) {
      // Stay high over the island chain until the strip is close.
      aimX = target.x - 150;
      aimY = target.y - 260;
    } else if (dx > 300) {
      // Mid-final: a gentle step down, not a drop, so the sink stays small.
      aimX = target.x - 100;
      aimY = target.y - 150;
      cruise = 165;
      maxPitch = 0.4;
    } else {
      // Shallow final: aim well past the strip so the descent angle
      // stays gentle, slow, nose nearly level, with a flare to kill
      // the sink in the last stretch.
      aimX = target.x + 200;
      aimY = target.y - 6;
      cruise = 150;
      maxPitch = 0.3;
    }
  }
  // Rings are flown to directly — the plane may turn all the way around
  // for a second pass at one it missed. Landings keep their shallow
  // staged descent instead.
  let want;
  if (target.land) {
    want = Math.max(-maxPitch, Math.min(maxPitch, Math.atan2(aimY - plane.y, aimX - plane.x)));
  } else {
    want = Math.atan2(aimY - plane.y, aimX - plane.x);
  }
  // Terrain clearance: never steer into a rising slope on the way to a
  // ring — stay above the ground 350 px ahead, with room for the plane's
  // own radius. Rings sit 130 px above the terrain, so the margin must
  // stay well under that or the plane can never descend into one.
  // (Landing approaches are exempt: they have to come down to the strip.)
  if (!target.land) {
    const aheadGround = groundHeight(state.world, plane.x + 350);
    const floor = aheadGround - 60;
    if (plane.y > floor - 20 && want > -0.35) want = -0.35;
    if (plane.y > floor) want = Math.min(want, -0.5);
  }
  // Flare only once the wheels are nearly down: nose-up too early holds
  // the plane above the strip and it sails straight past it.
  const nearGround = target.land && target.y - plane.y < 50;
  const flaring = nearGround && target.x - plane.x < 300 && target.x - plane.x > -50;
  if (flaring) want = Math.min(want, -0.2);
  let throttle = 0;
  if (flaring) {
    // A flare needs power: hold throttle open to arrest the sink.
    throttle = plane.speed < 175 ? 1 : 0;
  } else if (plane.speed < cruise - 15) throttle = 1;
  else if (plane.speed > cruise + 15) throttle = -1;
  const brake = Boolean(target.land) && plane.speed > 175;
  return { pitch: 0, throttle, brake, steer: want };
}
export function nextTarget(state) {
  if (state.mission === 'ring') {
    for (const ring of state.world.rings) {
      if (!ring.taken) return { x: ring.x, y: ring.y };
    }
    return { x: WORLD.length - 600, y: 300 };
  }
  // Storm Courier flies straight to the far field; Island Hop visits
  // the strips in order.
  const strip = state.mission === 'storm'
    ? state.world.strips[2]
    : state.world.strips[state.flight.stripsGot] || state.world.strips[2];
  return { x: strip.x, y: strip.y, land: true };
}
function runFor(state, seconds, stopWhen) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const events = stepFlight(state, state.world, autopilot(state, nextTarget(state)), STEP);
    state.flight.messageT = Math.max(0, state.flight.messageT - STEP);
    if (stopWhen && stopWhen(state, events)) break;
    if (state.plane.crashed) break;
  }
}
export function stageShot(name, state) {
  if (name === 'land') {
    state.mission = 'hop';
    state.flight.timeLeft = 0;
    // Stage a short final: the plane is already on approach to the first
    // strip, 700 px out and a little high, and the autopilot flies the
    // last seconds of the real rules down to the touchdown.
    const strip = state.world.strips[0];
    state.plane.x = strip.x - 700;
    state.plane.y = strip.y - 110;
    state.plane.vx = 150;
    state.plane.vy = 12;
    state.plane.angle = 0.08;
    state.plane.throttle = 0.55;
    state.flight.fuel = 70;
    runFor(state, LIMIT_SECONDS, (s, e) => e.landed >= 0 || s.plane.crashed);
    // Roll out on the strip: throttle shut, brakes on, so the plane stays
    // down and the soft-landing banner is still showing for the frame.
    for (let i = 0; i < 72; i += 1) {
      stepFlight(state, state.world, { pitch: 0, throttle: -1, brake: true, steer: null }, STEP);
      state.flight.messageT = Math.max(0, state.flight.messageT - STEP);
    }
    return { screen: SCREEN_PLAY };
  }
  if (name === 'ring') {
    state.mission = 'ring';
    runFor(state, LIMIT_SECONDS, (s) => s.flight.ringsGot >= 2 || s.plane.crashed);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'play') {
    state.mission = 'ring';
    runFor(state, PLAY_SECONDS, (s) => s.plane.crashed);
    return { screen: SCREEN_PLAY };
  }
  state.mission = 'ring';
  runFor(state, START_SECONDS, null);
  return { screen: SCREEN_TITLE };
}

// Shot filenames, in the order the dossier lists them: the first by name
// is the cover.
export const SHOT_NAMES = ['1-start', '2-play', '3-ring', '4-land'];
