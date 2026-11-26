// Flight model for the Kutilang: thrust along the nose, lift at right
// angles to it, gravity always down, quadratic drag, and a stall that
// drops the nose when the airspeed falls away. Landings, rings and
// crashes are all decided here, in world coordinates.
import { PLANE, WORLD, RING, STRIP, SCORE } from './config.js';
import { groundHeight, stripAt, isSea, windAt } from './world.js';

export function freshPlane() {
  return {
    x: WORLD.startX,
    y: WORLD.startY,
    vx: 120,
    vy: 0,
    angle: 0,
    throttle: 0.55,
    speed: 120,
    landed: false,
    crashed: false,
    ditched: false,
    onStrip: null,
    roll: 0,
  };
}
export function freshFlight() {
  return {
    fuel: PLANE.fuelMax,
    damage: 0,
    score: 0,
    ringsGot: 0,
    stripsGot: 0,
    time: 0,
    timeLeft: 0,
    wind: 0,
    message: '',
    messageT: 0,
    invuln: 0,
    done: false,
    over: false,
  };
}
// input: { pitch (-1 nose up .. +1 nose down), throttle (-1..+1),
//          brake (bool), steer (target angle in radians or null) }
export function stepFlight(state, world, input, dt) {
  const plane = state.plane;
  const flight = state.flight;
  const events = { ring: -1, landed: -1, crashed: false, fuelEmpty: false, done: false };
  if (plane.crashed || flight.done) return events;
  flight.time += dt;
  if (flight.invuln > 0) flight.invuln = Math.max(0, flight.invuln - dt);
  if (state.mission === 'storm') flight.timeLeft -= dt;
  const speed = Math.hypot(plane.vx, plane.vy);
  plane.speed = speed;
  // Throttle: keys nudge it, empty tanks force it shut.
  plane.throttle = clamp(plane.throttle + input.throttle * PLANE.throttleRate * dt, 0, 1);
  if (flight.fuel <= 0) {
    plane.throttle = 0;
    events.fuelEmpty = true;
  }
  flight.fuel = Math.max(0, flight.fuel - plane.throttle * PLANE.fuelBurn * dt);
  // Pitch: keyboard sets a rate, the mouse sets a target angle to chase.
  const authority = clamp(speed / 130, 0.3, 1);
  if (input.steer !== null && input.steer !== undefined) {
    const diff = wrapAngle(input.steer - plane.angle);
    plane.angle += clamp(diff, -PLANE.pitchRate * authority * dt, PLANE.pitchRate * authority * dt);
  } else {
    plane.angle += input.pitch * PLANE.pitchRate * authority * dt;
  }
  // The plane can turn all the way around — a missed ring is worth a
  // second pass, not a dive into the ground ahead.
  plane.angle = wrapAngle(plane.angle);
  // Forces, in pixels per second squared.
  const hx = Math.cos(plane.angle);
  const hy = Math.sin(plane.angle);
  const thrust = plane.throttle * PLANE.maxThrust;
  let ax = hx * thrust;
  let ay = hy * thrust + PLANE.gravity;
  const liftMag = Math.min(PLANE.liftK * speed * speed, PLANE.liftCap);
  const liftScale = speed < PLANE.stallSpeed ? speed / PLANE.stallSpeed : 1;
  const lift = liftMag * liftScale;
  ax += Math.sin(plane.angle) * lift;
  ay += -Math.cos(plane.angle) * lift;
  // Storm gusts shove the whole plane sideways.
  if (state.mission === 'storm') {
    flight.wind = windAt(flight.time, plane.x);
    ax += flight.wind * 0.6;
  }
  // Quadratic drag, plus a little extra when the wing is working hard.
  const drag = PLANE.dragK * speed + PLANE.inducedK * lift;
  ax -= plane.vx * drag;
  ay -= plane.vy * drag;
  if (input.brake) {
    ax -= plane.vx * PLANE.brakeK;
    ay -= plane.vy * PLANE.brakeK;
  }
  plane.vx += ax * dt;
  plane.vy += ay * dt;
  // A stalled wing cannot hold the nose up: it drops toward straight down.
  if (speed < PLANE.stallSpeed && !plane.landed) {
    plane.angle += wrapAngle(Math.PI / 2 - plane.angle) * 0.35 * dt * (1 - speed / PLANE.stallSpeed);
  }
  plane.x += plane.vx * dt;
  plane.y += plane.vy * dt;
  if (!plane.landed) plane.roll = 0;
  plane.x = clamp(plane.x, 120, WORLD.length - 120);
  if (plane.y < 56) {
    plane.y = 56;
    if (plane.vy < 0) plane.vy = 0;
  }
  if (plane.landed) rollOnStrip(state, world, input, dt);
  checkTerrain(state, world, events);
  checkRings(state, world, events);
  if (state.mission === 'storm' && flight.timeLeft <= 0 && !flight.done) {
    flight.over = true;
    flight.message = 'Out of time — the parcel never arrived.';
    flight.messageT = 4;
  }
  return events;
}
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Rolling on a strip or a rough field: friction scrubs speed, full
// throttle after a spool-up lifts off again — unless the plane ditched.
function rollOnStrip(state, world, input, dt) {
  const plane = state.plane;
  plane.roll += dt;
  plane.vx *= Math.max(0, 1 - 0.5 * dt);
  plane.vy = 0;
  // Ease the nose toward the nearest horizontal, either direction.
  const target = Math.abs(plane.angle) > Math.PI / 2 ? Math.PI * Math.sign(plane.angle) : 0;
  plane.angle += (target - plane.angle) * Math.min(1, 6 * dt);
  // Liftoff needs a real spool-up: a second on the ground with the
  // throttle firewalled and the speed built up, not the flare's leftover.
  if (!plane.ditched && plane.roll > 1 && plane.throttle > 0.85 && plane.speed > 170) {
    plane.landed = false;
    plane.onStrip = null;
    plane.roll = 0;
    state.flight.message = 'Airborne again.';
    state.flight.messageT = 2;
  }
}
function checkTerrain(state, world, events) {
  const plane = state.plane;
  const flight = state.flight;
  const ground = groundHeight(world, plane.x);
  if (plane.y + PLANE.radius < ground) return;
  const strip = stripAt(world, plane.x);
  const impactVy = plane.vy;
  const impactSpeed = plane.speed;
  // Level means horizontal, flying either way along the strip.
  const level = Math.abs(Math.sin(plane.angle)) < 0.28;
  if (strip && level && impactVy < STRIP.hardVy && impactSpeed < 300) {
    // A landing: soft ones score, hard ones cost damage.
    plane.y = ground - PLANE.radius;
    plane.vy = 0;
    if (!plane.landed) {
      plane.landed = true;
      plane.onStrip = strip;
      if (!strip.landed) {
        strip.landed = true;
        flight.stripsGot += 1;
        events.landed = strip.index;
        if (impactVy <= STRIP.softVy) {
          flight.score += SCORE.softLanding;
          flight.message = `Soft landing on ${strip.name}! +${SCORE.softLanding}`;
        } else {
          flight.score += SCORE.hardLanding;
          flight.damage = Math.min(PLANE.damageMax, flight.damage + 14);
          flight.message = `Hard landing on ${strip.name} — airframe damage. +${SCORE.hardLanding}`;
        }
        flight.messageT = 3;
        if (state.mission === 'hop' && flight.stripsGot >= STRIP.count) finishMission(state, 'All three strips visited. The hop is complete!');
        if (state.mission === 'storm' && strip.index === 2) {
          flight.score += SCORE.delivery + Math.max(0, Math.round(flight.timeLeft)) * SCORE.timeBonus;
          finishMission(state, 'Parcel delivered! The far field cheers.');
        }
      } else if (flight.messageT <= 0) {
        flight.message = `Down on ${strip.name}.`;
        flight.messageT = 2;
      }
    }
    return;
  }
  // The sea ends a flight: the Kutilang ditches and floats, done flying.
  if (isSea(world, plane.x)) {
    plane.y = ground - PLANE.radius;
    plane.vy = 0;
    plane.vx *= 0.3;
    plane.ditched = true;
    plane.landed = true;
    flight.damage = Math.min(PLANE.damageMax, flight.damage + 25);
    flight.over = true;
    flight.message = 'Ditched in the sea! The Kutilang floats — the sortie is over.';
    flight.messageT = 5;
    return;
  }
  // Not a landing: terrain, a building or the sea.
  const hit = Math.abs(impactVy) + impactSpeed * 0.25;
  if (hit <= 40) {
    // A gentle touch on rough ground: the plane settles, scrubs speed
    // and sits there — a rough-field landing, not a crash. Full throttle
    // after a spool-up gets it airborne again.
    plane.y = ground - PLANE.radius;
    plane.vy = 0;
    plane.vx *= 0.9;
    if (!plane.landed) {
      plane.landed = true;
      plane.onStrip = strip;
      flight.message = 'Down in the rough — throttle up to take off again.';
      flight.messageT = 3;
    }
    return;
  }
  if (flight.invuln <= 0) {
    flight.invuln = 0.9;
    const hurt = (hit - 40) * 0.35;
    flight.damage = Math.min(PLANE.damageMax, flight.damage + hurt);
    flight.message = 'Terrain strike! Check the damage gauge.';
    flight.messageT = 3;
    if (flight.damage >= PLANE.damageMax) crash(state, events, 'The Kutilang is wrecked.');
  }
  plane.y = ground - PLANE.radius;
  plane.vy = -Math.abs(plane.vy) * 0.25;
  plane.vx *= 0.6;
}
function checkRings(state, world, events) {
  const plane = state.plane;
  const flight = state.flight;
  for (let i = 0; i < world.rings.length; i += 1) {
    const ring = world.rings[i];
    if (ring.taken) continue;
    const dx = plane.x - ring.x;
    const dy = plane.y - ring.y;
    if (dx * dx + dy * dy < (ring.r + PLANE.radius) * (ring.r + PLANE.radius)) {
      ring.taken = true;
      flight.ringsGot += 1;
      flight.score += SCORE.ring;
      flight.fuel = Math.min(PLANE.fuelMax, flight.fuel + RING.fuelBonus);
      events.ring = i;
      flight.message = `Ring ${flight.ringsGot} of ${RING.count}! +${SCORE.ring} — fuel topped up.`;
      flight.messageT = 2.5;
      if (state.mission === 'ring' && flight.ringsGot >= RING.count) {
        finishMission(state, 'Every ring threaded. Ring Run complete!');
      }
      return;
    }
  }
}
function finishMission(state, text) {
  state.flight.done = true;
  state.flight.message = text;
  state.flight.messageT = 5;
}
function crash(state, events, text) {
  state.plane.crashed = true;
  state.flight.over = true;
  state.flight.message = text;
  state.flight.messageT = 5;
  events.crashed = true;
}
