// The archipelago: islands, airstrips, rings, villages, clouds and wind.
// Everything is built once from a seed, and groundHeight(x) is the single
// source of truth for terrain — physics, rendering and landing all ask it.
import { WORLD, RING, STRIP } from './config.js';
import { mulberry32, range, pick } from './random.js';

const ISLAND_KINDS = ['terraces', 'village', 'palms', 'village', 'terraces'];
function bump(x, centre, halfWidth, height) {
  const d = (x - centre) / halfWidth;
  return height * Math.exp(-d * d);
}
export function buildWorld(seed) {
  const rng = mulberry32(seed);
  const islands = [];
  // A volcano anchors the early coast; the rest of the chain is shuffled.
  islands.push({ x: 2400, w: 1500, h: 330, kind: 'volcano' });
  let cursor = 3600;
  const kinds = ISLAND_KINDS.slice();
  while (cursor < 13500) {
    const kind = kinds.length ? kinds.splice(Math.floor(rng() * kinds.length), 1)[0] : pick(rng, ISLAND_KINDS);
    const w = range(rng, 1100, 1700);
    const h = range(rng, 150, 240);
    islands.push({ x: cursor + w / 2, w, h, kind });
    cursor += w + range(rng, 500, 1100);
  }
  islands.push({ x: 14300, w: 1400, h: 210, kind: 'village' });
  // Three airstrips sit on flat island tops, spaced along the route.
  const stripXs = [4300, 8600, 13800];
  const strips = stripXs.map((x, i) => {
    const island = nearestIsland(islands, x);
    const top = WORLD.seaY - islandHeightAt(islands, x);
    return { x, y: top, w: STRIP.width, index: i, name: ['Kutilang Field', 'Terrace Strip', 'Far Courier Field'][i] };
  });
  // Eight golden rings weave along the coast between the strips.
  const rings = [];
  const ringXs = [1200, 2900, 4700, 6200, 7900, 9600, 11300, 12900];
  for (let i = 0; i < RING.count; i += 1) {
    // Keep each ring clear of the terrain below it, so threading one is
    // a flying challenge, not a terrain strike.
    const ground = groundHeight({ islands, strips }, ringXs[i]);
    const y = Math.min(range(rng, 190, 470), ground - 130);
    rings.push({ x: ringXs[i], y, r: RING.radius, taken: false });
  }
  // Villages: little house clusters on the village islands.
  const villages = [];
  for (const island of islands) {
    if (island.kind !== 'village') continue;
    const count = 4 + Math.floor(rng() * 4);
    for (let i = 0; i < count; i += 1) {
      const hx = island.x + range(rng, -island.w * 0.32, island.w * 0.32);
      villages.push({ x: hx, y: WORLD.seaY - islandHeightAt(islands, hx) - 14, w: range(rng, 16, 26), hue: pick(rng, ['#d96b4a', '#e8a34c', '#7a9a5a', '#c25a6b']) });
    }
  }
  // Clouds drift slowly above the sea.
  const clouds = [];
  for (let i = 0; i < 26; i += 1) {
    clouds.push({ x: range(rng, 0, WORLD.length), y: range(rng, 60, 240), s: range(rng, 0.6, 1.6), drift: range(rng, 2, 7) });
  }
  return { islands, strips, rings, villages, clouds, seed };
}
function nearestIsland(islands, x) {
  let best = islands[0];
  for (const island of islands) {
    if (Math.abs(island.x - x) < Math.abs(best.x - x)) best = island;
  }
  return best;
}
function islandHeightAt(islands, x) {
  let h = 0;
  for (const island of islands) h += bump(x, island.x, island.w / 2, island.h);
  return h;
}

// Terrain queries, shared by physics and rendering.
export function groundHeight(world, x) {
  let h = 0;
  for (const island of world.islands) {
    const d = (x - island.x) / (island.w / 2);
    h += island.h * Math.exp(-d * d);
  }
  const strip = stripAt(world, x);
  if (strip) return strip.y;
  return WORLD.seaY - h;
}
export function stripAt(world, x) {
  for (const strip of world.strips) {
    if (x >= strip.x - strip.w / 2 && x <= strip.x + strip.w / 2) return strip;
  }
  return null;
}
export function isSea(world, x) {
  return groundHeight(world, x) >= WORLD.seaY - 4;
}
// Storm gusts: a slow swell plus a fast chop, so the push comes in waves
// the pilot can read and ride instead of as unreadable noise.
export function windAt(time, x) {
  const swell = Math.sin(time * 0.35 + x * 0.0004) * 70;
  const chop = Math.sin(time * 1.7 + x * 0.0013) * 45;
  const lull = 0.5 + 0.5 * Math.sin(time * 0.11);
  return (swell + chop) * (0.4 + 0.6 * lull);
}
export function resetMissionTargets(world) {
  for (const ring of world.rings) ring.taken = false;
  for (const strip of world.strips) strip.landed = false;
}
