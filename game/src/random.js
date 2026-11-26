// Seeded randomness for Kutilang Sky Courier: one tiny generator so the
// archipelago, the rings and the gusts are the same every run for a given
// seed, which is what makes the ?shot= scenes reproducible.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function range(rng, lo, hi) {
  return lo + rng() * (hi - lo);
}
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

// A shuffled copy helper used by the world builder when it lays out the
// island chain in a fresh order per seed.
export function shuffled(rng, list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}
