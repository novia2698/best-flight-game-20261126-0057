// Kutilang Sky Courier — tuning constants and mission definitions.
// One file, one job: every number the rest of the game reads lives here,
// so the feel of the plane can be tuned without touching the simulation.
export const VIEW = { width: 1280, height: 800 };
export const WORLD = {
  length: 15000,
  seaY: 640,
  startX: 320,
  startY: 300,
  seed: 20261126,
};
export const PLANE = {
  radius: 16,
  maxThrust: 260,
  gravity: 150,
  liftK: 0.004,
  liftCap: 320,
  dragK: 0.004,
  inducedK: 0.00012,
  stallSpeed: 95,
  pitchRate: 2.4,
  throttleRate: 0.9,
  brakeK: 0.55,
  fuelMax: 100,
  fuelBurn: 0.9,
  damageMax: 100,
};
export const CAMERA = { aheadX: 360, aheadY: 380, smooth: 5 };
export const RING = { count: 8, radius: 42, fuelBonus: 15, score: 250 };
export const STRIP = { count: 3, width: 260, softVy: 55, hardVy: 130, score: 400 };
export const STORM = { timeLimit: 150, gustBase: 60, gustPeak: 170, score: 600 };
export const MISSIONS = [
  {
    id: 'ring',
    key: '1',
    name: 'Ring Run',
    blurb: 'Thread 8 golden rings along the coast. Each ring scores and tops up fuel.',
    goal: 'Fly through all 8 golden rings.',
  },
  {
    id: 'hop',
    key: '2',
    name: 'Island Hop',
    blurb: 'Land gently on 3 island airstrips in sequence. Soft touchdowns score.',
    goal: 'Land on all 3 airstrips, softly.',
  },
  {
    id: 'storm',
    key: '3',
    name: 'Storm Courier',
    blurb: 'Race the clock to the far airstrip while gusts shove the plane around.',
    goal: 'Reach the far airstrip before the clock runs out.',
  },
];
export const SCORE = { ring: 250, softLanding: 400, hardLanding: 120, delivery: 600, timeBonus: 5 };
export const COLORS = {
  skyTop: '#2b1d4e',
  skyMid: '#b34a6b',
  skyLow: '#ff9a52',
  horizon: '#ffd9a0',
  sun: '#fff3c4',
  seaDeep: '#1d4e6b',
  seaShallow: '#3f8ea6',
  sand: '#e8c98a',
  grass: '#5d8a4a',
  jungle: '#3c6b34',
  rock: '#6b4a3a',
  volcano: '#4a3230',
  lava: '#ff6b35',
  planeRed: '#c23b2e',
  planeCream: '#f2e3c6',
  planeDark: '#5a2320',
  ringGold: '#ffc93c',
  panel: '#20242e',
  panelLit: '#ffe9a8',
  hudText: '#fff6e0',
};

// Lookup helper so the rest of the game never indexes MISSIONS by hand.
export function missionById(id) {
  for (const mission of MISSIONS) {
    if (mission.id === id) return mission;
  }
  return MISSIONS[0];
}
export function missionByKey(key) {
  for (const mission of MISSIONS) {
    if (mission.key === key) return mission;
  }
  return null;
}
