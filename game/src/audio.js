// Synthesized sound only: a little engine drone, wind rush, a ring
// chime, a landing thump and a crash. No audio files, no network.
export function createAudio() {
  return {
    ctx: null,
    muted: false,
    engineOsc: null,
    engineGain: null,
    windGain: null,
    windSrc: null,
    started: false,
  };
}
export function ensureAudio(audio) {
  if (audio.started) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    audio.ctx = ctx;
    // Engine: two detuned saws through a low-pass, pitch follows throttle.
    const oscA = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscA.frequency.value = 70;
    const oscB = ctx.createOscillator();
    oscB.type = 'sawtooth';
    oscB.frequency.value = 71.5;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(ctx.destination);
    oscA.start();
    oscB.start();
    // Wind: looped noise through a band-pass, loudness follows airspeed.
    const noise = makeNoise(ctx);
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = noise;
    windSrc.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 500;
    band.Q.value = 0.6;
    const windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSrc.connect(band);
    band.connect(windGain);
    windGain.connect(ctx.destination);
    windSrc.start();
    audio.engineOsc = [oscA, oscB];
    audio.engineGain = engineGain;
    audio.windGain = windGain;
    audio.windSrc = windSrc;
    audio.started = true;
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    audio.started = false;
  }
}
function makeNoise(ctx) {
  const len = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}
export function updateEngine(audio, throttle, speed, muted) {
  if (!audio.started || !audio.ctx) return;
  const t = audio.ctx.currentTime;
  const level = muted ? 0 : 0.05 + throttle * 0.06;
  audio.engineGain.gain.setTargetAtTime(level, t, 0.1);
  const freq = 55 + throttle * 90 + speed * 0.08;
  audio.engineOsc[0].frequency.setTargetAtTime(freq, t, 0.1);
  audio.engineOsc[1].frequency.setTargetAtTime(freq * 1.02, t, 0.1);
  const windLevel = muted ? 0 : Math.min(0.12, (speed / 300) * 0.12);
  audio.windGain.gain.setTargetAtTime(windLevel, t, 0.15);
}
export function playChime(audio) {
  if (!audio.started || !audio.ctx || audio.muted) return;
  const ctx = audio.ctx;
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    const start = ctx.currentTime + i * 0.07;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.16, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.55);
  });
}

// A low thump for touchdowns and a noise burst for crashes.
export function playThump(audio, hard) {
  if (!audio.started || !audio.ctx || audio.muted) return;
  const ctx = audio.ctx;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(hard ? 90 : 70, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.18);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(hard ? 0.35 : 0.22, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
}
export function playCrash(audio) {
  if (!audio.started || !audio.ctx || audio.muted) return;
  const ctx = audio.ctx;
  const noise = makeNoise(ctx);
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start();
  src.stop(ctx.currentTime + 0.75);
}
export function toggleMute(audio) {
  audio.muted = !audio.muted;
  return audio.muted;
}
