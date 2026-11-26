// Everything the eye sees: golden-hour sky, sea, islands, the volcano,
// villages and terraces, the rings, the Kutilang herself, and the lit
// instrument panel. All drawing is plain canvas paths — no images.
import { VIEW, WORLD, COLORS, MISSIONS } from './config.js';
import { groundHeight, stripAt } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_DONE = 'done';
export const SCREEN_OVER = 'over';

export function drawScene(ctx, state, screen, time) {
  const cam = camera(state);
  drawSky(ctx, cam, time);
  drawSea(ctx, cam, time);
  drawIslands(ctx, state.world, cam, time);
  drawRings(ctx, state, cam, time);
  drawPlane(ctx, state, cam, time);
  drawHud(ctx, state, screen, time);
  drawPanel(ctx, state, time);
  drawScreens(ctx, state, screen, time);
}
export function camera(state) {
  const plane = state.plane;
  const x = clamp(plane.x - 360, 0, WORLD.length - VIEW.width);
  const y = clamp(plane.y - 380, -40, 260);
  return { x, y };
}
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
function drawSky(ctx, cam, time) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  g.addColorStop(0, COLORS.skyTop);
  g.addColorStop(0.45, COLORS.skyMid);
  g.addColorStop(0.72, COLORS.skyLow);
  g.addColorStop(1, COLORS.horizon);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Low sun, half-drowned in haze.
  const sunX = VIEW.width * 0.78 - cam.x * 0.02;
  const sunY = 190 - cam.y * 0.05;
  const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 220);
  glow.addColorStop(0, 'rgba(255, 243, 196, 0.95)');
  glow.addColorStop(0.25, 'rgba(255, 190, 110, 0.55)');
  glow.addColorStop(1, 'rgba(255, 150, 80, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 220, sunY - 220, 440, 440);
  ctx.fillStyle = COLORS.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 42, 0, Math.PI * 2);
  ctx.fill();
  // A few high streaks of cloud.
  ctx.fillStyle = 'rgba(255, 220, 190, 0.28)';
  for (let i = 0; i < 7; i += 1) {
    const cx = ((i * 397 + 120 - cam.x * 0.08) % (VIEW.width + 400) + VIEW.width + 400) % (VIEW.width + 400) - 200;
    const cy = 70 + i * 26 - cam.y * 0.1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 150 + i * 12, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawSea(ctx, cam, time) {
  const seaTop = WORLD.seaY - cam.y;
  const g = ctx.createLinearGradient(0, seaTop, 0, VIEW.height);
  g.addColorStop(0, COLORS.seaShallow);
  g.addColorStop(1, COLORS.seaDeep);
  ctx.fillStyle = g;
  ctx.fillRect(0, seaTop, VIEW.width, VIEW.height - seaTop);
  // Sun glitter on the water.
  ctx.fillStyle = 'rgba(255, 220, 150, 0.35)';
  for (let i = 0; i < 24; i += 1) {
    const wx = ((i * 173 + 60 - cam.x * 0.6) % (VIEW.width + 120) + VIEW.width + 120) % (VIEW.width + 120) - 60;
    const wy = seaTop + 12 + ((i * 61) % Math.max(40, VIEW.height - seaTop - 20));
    const wob = Math.sin(time * 1.4 + i * 2.1) * 6;
    ctx.fillRect(wx + wob, wy, 26 - (i % 3) * 6, 2);
  }
}
function drawIslands(ctx, world, cam, time) {
  // Far silhouettes first, then the near chain the plane flies over.
  ctx.fillStyle = 'rgba(90, 50, 70, 0.55)';
  for (const island of world.islands) {
    const x = island.x - cam.x * 0.92 - 500;
    if (x < -900 || x > VIEW.width + 900) continue;
    ctx.beginPath();
    ctx.moveTo(x - island.w * 0.7, WORLD.seaY - cam.y + 30);
    ctx.quadraticCurveTo(x, WORLD.seaY - cam.y - island.h * 0.55, x + island.w * 0.7, WORLD.seaY - cam.y + 30);
    ctx.closePath();
    ctx.fill();
  }
  for (const island of world.islands) drawIsland(ctx, world, island, cam, time);
  drawVillages(ctx, world, cam);
  drawStrips(ctx, world, cam, time);
}
function drawIsland(ctx, world, island, cam, time) {
  const x0 = island.x - island.w / 2 - cam.x;
  const x1 = island.x + island.w / 2 - cam.x;
  const base = WORLD.seaY - cam.y;
  if (x1 < -50 || x0 > VIEW.width + 50) return;
  // Sand rim.
  ctx.fillStyle = COLORS.sand;
  ctx.beginPath();
  ctx.moveTo(x0 - 26, base);
  ctx.quadraticCurveTo(island.x - cam.x, base - island.h - 6, x1 + 26, base);
  ctx.lineTo(x1 + 26, base + 26);
  ctx.lineTo(x0 - 26, base + 26);
  ctx.closePath();
  ctx.fill();
  // Grassy body.
  ctx.fillStyle = island.kind === 'volcano' ? COLORS.volcano : COLORS.grass;
  ctx.beginPath();
  ctx.moveTo(x0, base);
  ctx.quadraticCurveTo(island.x - cam.x, base - island.h, x1, base);
  ctx.lineTo(x1, base + 4);
  ctx.lineTo(x0, base + 4);
  ctx.closePath();
  ctx.fill();
  if (island.kind === 'volcano') drawVolcano(ctx, island, cam, time);
  if (island.kind === 'terraces') drawTerraces(ctx, island, cam);
  if (island.kind === 'palms') drawPalms(ctx, island, cam, time);
}
function drawVolcano(ctx, island, cam, time) {
  const cx = island.x - cam.x;
  const base = WORLD.seaY - cam.y;
  const top = base - island.h;
  // Crater glow and lava trickle.
  ctx.fillStyle = COLORS.lava;
  ctx.beginPath();
  ctx.ellipse(cx, top + 8, 26, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.lava;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx + 6, top + 12);
  ctx.quadraticCurveTo(cx + 30, top + 60, cx + 18, top + 110);
  ctx.stroke();
  // Smoke puffs rising and drifting.
  ctx.fillStyle = 'rgba(220, 200, 190, 0.5)';
  for (let i = 0; i < 4; i += 1) {
    const age = (time * 0.25 + i * 0.25) % 1;
    const px = cx + 10 + age * 60 + Math.sin(time + i) * 8;
    const py = top - age * 130;
    const r = 12 + age * 26;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawTerraces(ctx, island, cam) {
  const cx = island.x - cam.x;
  const base = WORLD.seaY - cam.y;
  ctx.strokeStyle = 'rgba(30, 80, 40, 0.7)';
  ctx.lineWidth = 3;
  for (let step = 1; step <= 5; step += 1) {
    const y = base - (island.h * step) / 6;
    const half = (island.w / 2) * (1 - step / 7);
    ctx.beginPath();
    ctx.moveTo(cx - half, y);
    ctx.quadraticCurveTo(cx, y - 10, cx + half, y);
    ctx.stroke();
  }
}
function drawPalms(ctx, island, cam, time) {
  const cx = island.x - cam.x;
  const base = WORLD.seaY - cam.y;
  for (let i = -1; i <= 1; i += 1) {
    const px = cx + i * 90;
    const py = groundHeight({ islands: [island], strips: [] }, island.x + i * 90) - cam.y;
    const sway = Math.sin(time * 0.9 + i * 2) * 4;
    ctx.strokeStyle = '#5a3a22';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + 6 + sway, py - 26, px + 14 + sway, py - 44);
    ctx.stroke();
    ctx.strokeStyle = '#2f6b2a';
    ctx.lineWidth = 3;
    for (let f = 0; f < 5; f += 1) {
      const a = -Math.PI * (0.15 + f * 0.18);
      ctx.beginPath();
      ctx.moveTo(px + 14 + sway, py - 44);
      ctx.quadraticCurveTo(px + 14 + sway + Math.cos(a) * 18, py - 44 + Math.sin(a) * 14, px + 14 + sway + Math.cos(a) * 34, py - 44 + Math.sin(a) * 22);
      ctx.stroke();
    }
  }
}
function drawVillages(ctx, world, cam) {
  for (const house of world.villages) {
    const x = house.x - cam.x;
    const y = house.y - cam.y;
    if (x < -40 || x > VIEW.width + 40) continue;
    ctx.fillStyle = '#f0e0c0';
    ctx.fillRect(x, y, house.w, 16);
    ctx.fillStyle = house.hue;
    ctx.beginPath();
    ctx.moveTo(x - 3, y);
    ctx.lineTo(x + house.w / 2, y - 12);
    ctx.lineTo(x + house.w + 3, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(x + house.w / 2 - 2, y + 5, 4, 6);
  }
}
function drawStrips(ctx, world, cam, time) {
  for (const strip of world.strips) {
    const x = strip.x - strip.w / 2 - cam.x;
    const y = strip.y - cam.y;
    if (x + strip.w < -20 || x > VIEW.width + 20) continue;
    ctx.fillStyle = '#c9a86a';
    ctx.fillRect(x, y, strip.w, 8);
    ctx.fillStyle = '#f4ead0';
    ctx.fillRect(x + 14, y + 2, 26, 4);
    ctx.fillRect(x + strip.w - 40, y + 2, 26, 4);
    ctx.fillStyle = strip.landed ? '#7fc97f' : '#e8e0c8';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(strip.name, strip.x - cam.x, y - 10);
    // Windsock on a pole at the strip's far end.
    const px = strip.x + strip.w / 2 - 12 - cam.x;
    ctx.strokeStyle = '#3a2c22';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px, y - 34);
    ctx.stroke();
    const flap = Math.sin(time * 3) * 4;
    ctx.fillStyle = '#ff7a3c';
    ctx.beginPath();
    ctx.moveTo(px, y - 34);
    ctx.lineTo(px + 26, y - 30 + flap);
    ctx.lineTo(px, y - 24);
    ctx.closePath();
    ctx.fill();
  }
}

// Rings, the plane, HUD, instrument panel and title/end screens.
function drawRings(ctx, state, cam, time) {
  const next = nextRing(state.world);
  for (const ring of state.world.rings) {
    const x = ring.x - cam.x;
    const y = ring.y - cam.y;
    if (x < -120 || x > VIEW.width + 120) continue;
    if (ring.taken) {
      ctx.strokeStyle = 'rgba(127, 201, 127, 0.7)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, ring.r, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    const pulse = 1 + Math.sin(time * 3 + ring.x * 0.01) * 0.06;
    const isNext = ring === next;
    ctx.save();
    ctx.shadowColor = COLORS.ringGold;
    ctx.shadowBlur = isNext ? 26 : 12;
    ctx.strokeStyle = isNext ? '#ffe066' : COLORS.ringGold;
    ctx.lineWidth = isNext ? 9 : 6;
    ctx.beginPath();
    ctx.arc(x, y, ring.r * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(x, y, ring.r * pulse - 8, 0, Math.PI * 2);
    ctx.fill();
    if (isNext) {
      ctx.fillStyle = '#fff3c4';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NEXT RING', x, y - ring.r - 12);
    }
  }
}
function nextRing(world) {
  for (const ring of world.rings) if (!ring.taken) return ring;
  return null;
}
function drawPlane(ctx, state, cam, time) {
  const plane = state.plane;
  const x = plane.x - cam.x;
  const y = plane.y - cam.y;
  if (x < -80 || x > VIEW.width + 80 || y < -80 || y > VIEW.height + 80) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(plane.angle);
  if (plane.crashed) ctx.rotate(0.5);
  // Shadow on the water/ground below.
  ctx.restore();
  const ground = groundHeight(state.world, plane.x) - cam.y;
  if (ground > y && ground - y < 320) {
    ctx.fillStyle = `rgba(20, 20, 40, ${0.28 * (1 - (ground - y) / 320)})`;
    ctx.beginPath();
    ctx.ellipse(x, ground + 6, 26 * (1 - (ground - y) / 640), 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(plane.angle);
  if (plane.crashed) ctx.rotate(0.6);
  // Tail, fuselage, wings — a little red-and-cream bush plane.
  ctx.fillStyle = COLORS.planeRed;
  ctx.beginPath();
  ctx.moveTo(-26, -4);
  ctx.lineTo(-34, -16);
  ctx.lineTo(-26, -2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.planeCream;
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.planeRed;
  ctx.beginPath();
  ctx.ellipse(2, -1, 22, 7, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  // High wing and struts.
  ctx.fillStyle = COLORS.planeRed;
  ctx.fillRect(-8, -22, 20, 6);
  ctx.strokeStyle = COLORS.planeDark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(2, -16);
  ctx.lineTo(8, -6);
  ctx.moveTo(10, -16);
  ctx.lineTo(14, -6);
  ctx.stroke();
  // Cockpit glass catching the sunset.
  ctx.fillStyle = '#bfe8ff';
  ctx.beginPath();
  ctx.ellipse(10, -5, 7, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Spinning propeller.
  const blur = 0.25 + plane.throttle * 0.75;
  ctx.strokeStyle = `rgba(90, 35, 32, ${blur})`;
  ctx.lineWidth = 3;
  const spin = time * (6 + plane.throttle * 30);
  ctx.beginPath();
  ctx.moveTo(26 + Math.cos(spin) * 16, Math.sin(spin) * 16);
  ctx.lineTo(26 - Math.cos(spin) * 16, -Math.sin(spin) * 16);
  ctx.stroke();
  ctx.fillStyle = COLORS.planeDark;
  ctx.beginPath();
  ctx.arc(27, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  // Wheels.
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-6, 11, 4, 0, Math.PI * 2);
  ctx.arc(12, 11, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function drawHud(ctx, state, screen, time) {
  const plane = state.plane;
  const flight = state.flight;
  const mission = MISSIONS.find((m) => m.id === state.mission);
  ctx.fillStyle = 'rgba(16, 18, 30, 0.62)';
  ctx.fillRect(0, 0, VIEW.width, 46);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`KUTILANG SKY COURIER — ${mission.name}`, 16, 29);
  ctx.textAlign = 'center';
  const alt = Math.max(0, Math.round((WORLD.seaY - plane.y) * 3));
  const speed = Math.round(plane.speed * 1.9);
  const heading = Math.round(((plane.angle * 180) / Math.PI + 360) % 360);
  ctx.fillText(`ALT ${alt} ft    SPD ${speed} kt    HDG ${String(heading).padStart(3, '0')}°`, VIEW.width / 2, 29);
  ctx.textAlign = 'right';
  ctx.fillText(`SCORE ${flight.score}`, VIEW.width - 16, 29);
  // Mission progress line under the bar.
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  let progress = '';
  if (state.mission === 'ring') progress = `Rings ${flight.ringsGot} / 8`;
  if (state.mission === 'hop') progress = `Strips landed ${flight.stripsGot} / 3`;
  if (state.mission === 'storm') progress = `Time left ${Math.max(0, Math.ceil(flight.timeLeft))}s — reach Far Courier Field`;
  ctx.fillStyle = '#ffd9a0';
  ctx.fillText(progress, 16, 68);
  if (state.mission === 'storm' && Math.abs(flight.wind) > 40) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffb0a0';
    ctx.fillText(flight.wind > 0 ? 'GUST → pushing right' : 'GUST ← pushing left', VIEW.width - 16, 68);
  }
  // Transient message banner.
  if (flight.messageT > 0 && flight.message) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(16, 18, 30, 0.72)';
    const w = ctx.measureText(flight.message).width + 36;
    ctx.fillRect((VIEW.width - w) / 2, 92, w, 34);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(flight.message, VIEW.width / 2, 115);
  }
  if (screen === SCREEN_PLAY && state.paused) {
    dim(ctx);
    bigText(ctx, 'PAUSED', 'P — resume · R — restart');
  }
}
function drawPanel(ctx, state, time) {
  const plane = state.plane;
  const flight = state.flight;
  const panelY = VIEW.height - 118;
  ctx.fillStyle = 'rgba(20, 22, 34, 0.88)';
  ctx.fillRect(0, panelY, VIEW.width, 118);
  ctx.strokeStyle = '#3a4054';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, panelY + 1, VIEW.width - 2, 116);
  const cx = VIEW.width / 2;
  drawGauge(ctx, cx - 340, panelY + 55, 36, 'ALT', Math.max(0, Math.round((WORLD.seaY - plane.y) * 3)), 3000, '#7fd4ff');
  drawGauge(ctx, cx - 210, panelY + 55, 36, 'SPD', Math.round(plane.speed * 1.9), 260, '#ffd166');
  drawHorizon(ctx, cx - 60, panelY + 55, 42, plane.angle, plane.vy);
  drawGauge(ctx, cx + 90, panelY + 55, 36, 'FUEL', Math.round(flight.fuel), 100, flight.fuel < 25 ? '#ff6b5e' : '#7fc97f');
  drawThrottle(ctx, cx + 220, panelY + 55, plane.throttle);
  // Damage bar, right side.
  ctx.fillStyle = '#ff6b5e';
  ctx.fillRect(cx + 300, panelY + 34, 120 * (flight.damage / 100), 12);
  ctx.strokeStyle = '#5a3a3a';
  ctx.strokeRect(cx + 300, panelY + 34, 120, 12);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('DAMAGE', cx + 300, panelY + 26);
  ctx.fillText(`${Math.round(flight.damage)}%`, cx + 300, panelY + 62);
}
function drawGauge(ctx, x, y, r, label, value, max, color) {
  ctx.fillStyle = COLORS.panel;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4a5168';
  ctx.lineWidth = 2;
  ctx.stroke();
  const frac = Math.max(0, Math.min(1, value / max));
  const a = -Math.PI * 0.75 + frac * Math.PI * 1.5;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, r - 6, -Math.PI * 0.75, a);
  ctx.stroke();
  ctx.fillStyle = COLORS.panelLit;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(value), x, y + 5);
  ctx.fillStyle = '#9aa3b8';
  ctx.font = '11px sans-serif';
  ctx.fillText(label, x, y + r + 14);
}
function drawHorizon(ctx, x, y, r, angle, vy) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#e8955a';
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.fillStyle = '#3f6d8f';
  ctx.fillRect(x - r, y - r, r * 2, r);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#4a5168';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  // Fixed wings marker.
  ctx.strokeStyle = '#ffe9a8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 18, y);
  ctx.lineTo(x - 6, y);
  ctx.moveTo(x + 6, y);
  ctx.lineTo(x + 18, y);
  ctx.stroke();
  ctx.fillStyle = '#9aa3b8';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('HORIZON', x, y + r + 14);
}
function drawThrottle(ctx, x, y, throttle) {
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(x - 12, y - 34, 24, 68);
  ctx.strokeStyle = '#4a5168';
  ctx.strokeRect(x - 12, y - 34, 24, 68);
  ctx.fillStyle = '#ff9a52';
  const h = 64 * throttle;
  ctx.fillRect(x - 9, y + 32 - h, 18, h);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(throttle * 100)}%`, x, y + 48);
  ctx.fillStyle = '#9aa3b8';
  ctx.font = '11px sans-serif';
  ctx.fillText('THR', x, y - 42);
}
function drawScreens(ctx, state, screen, time) {
  if (screen === SCREEN_TITLE) {
    dim(ctx);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff3c4';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText('KUTILANG', VIEW.width / 2, 250);
    ctx.fillStyle = '#ffd9a0';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('SKY COURIER', VIEW.width / 2, 296);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = '17px sans-serif';
    ctx.fillText('A bush-plane courier over a golden-hour archipelago.', VIEW.width / 2, 340);
    ctx.fillText('Fly rings, hop islands, outrun the storm — mind the fuel and the ground.', VIEW.width / 2, 366);
    for (let i = 0; i < MISSIONS.length; i += 1) {
      const m = MISSIONS[i];
      const y = 428 + i * 58;
      ctx.fillStyle = i === state.missionIndex ? 'rgba(255, 201, 60, 0.25)' : 'rgba(16, 18, 30, 0.5)';
      ctx.fillRect(VIEW.width / 2 - 330, y - 32, 660, 52);
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${m.key} — ${m.name}`, VIEW.width / 2 - 314, y - 8);
      ctx.fillStyle = '#cfd6e4';
      ctx.font = '14px sans-serif';
      ctx.fillText(m.blurb, VIEW.width / 2 - 314, y + 12);
    }
    ctx.fillStyle = '#9aa3b8';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Press 1 / 2 / 3 or click a mission — then fly with W/S, A/D or the mouse.', VIEW.width / 2, 620);
    ctx.fillText('Space brakes · P pauses · R restarts · M mutes', VIEW.width / 2, 644);
  }
  if (screen === SCREEN_DONE) {
    dim(ctx);
    bigText(ctx, 'MISSION COMPLETE', `${state.flight.message}  Score ${state.flight.score} — press R to fly again.`);
  }
  if (screen === SCREEN_OVER) {
    dim(ctx);
    bigText(ctx, 'FLIGHT OVER', `${state.flight.message}  Score ${state.flight.score} — press R to try again.`);
  }
}
function dim(ctx) {
  ctx.fillStyle = 'rgba(10, 12, 24, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}
function bigText(ctx, title, sub) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff3c4';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText(title, VIEW.width / 2, 340);
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '18px sans-serif';
  ctx.fillText(sub, VIEW.width / 2, 384);
}
