// render.js — draw the city, the cars, the people and the action.
// One clear job: turn game state into pixels.
import { missionMarker } from './missions.js';
import { WORLD_W, WORLD_H } from './city.js';

export function drawWorld(ctx, G, cw, ch) {
  const cam = G.camera;
  ctx.save();
  // Sunset-tinted ground.
  ctx.fillStyle = '#5d7a44';
  ctx.fillRect(0, 0, cw, ch);
  ctx.translate(-cam.x, -cam.y);

  const vx0 = cam.x - 60, vy0 = cam.y - 60, vx1 = cam.x + cw + 60, vy1 = cam.y + ch + 60;
  const city = G.city;

  // Beach and sea at the south edge.
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(0, city.beach.y, WORLD_W, WORLD_H - city.beach.y);
  ctx.fillStyle = '#2e86ab';
  ctx.fillRect(0, 2340, WORLD_W, WORLD_H - 2340);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 8; i++) {
    const wx = ((i * 397 + G.time * 12) % WORLD_W);
    ctx.fillRect(wx, 2352 + (i % 3) * 14, 90, 3);
  }

  // Parks.
  for (const pk of city.parks) {
    if (pk.x > vx1 || pk.x + pk.w < vx0 || pk.y > vy1 || pk.y + pk.h < vy0) continue;
    ctx.fillStyle = '#4c7a3f';
    ctx.fillRect(pk.x, pk.y, pk.w, pk.h);
    ctx.fillStyle = '#3a6132';
    for (let i = 0; i < 6; i++) {
      const tx = pk.x + 40 + i * 52;
      const ty = pk.y + 40 + (i % 2) * 90;
      ctx.beginPath(); ctx.arc(tx, ty, 16, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pk.name, pk.x + pk.w / 2, pk.y + pk.h / 2);
  }

  // Roads.
  ctx.fillStyle = '#3c3c46';
  for (const rx of city.roadsV) ctx.fillRect(rx - city.roadHalf, 0, city.roadHalf * 2, WORLD_H);
  for (const ry of city.roadsH) ctx.fillRect(0, ry - city.roadHalf, WORLD_W, city.roadHalf * 2);
  // Lane dashes.
  ctx.strokeStyle = '#f2c14e';
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 22]);
  for (const rx of city.roadsV) {
    ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx, WORLD_H); ctx.stroke();
  }
  for (const ry of city.roadsH) {
    ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(WORLD_W, ry); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Buildings with a sun-side shadow and lit windows.
  for (const b of city.buildings) {
    if (b.x > vx1 || b.x + b.w < vx0 || b.y > vy1 || b.y + b.h < vy0) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + 7, b.y + 9, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(b.x, b.y, b.w, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(b.x, b.y + b.h - 8, b.w, 8);
    // Windows.
    ctx.fillStyle = '#ffe9a8';
    const cols = Math.max(1, Math.floor(b.w / 46));
    const rows = Math.max(1, Math.floor(b.h / 46));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if ((i * 7 + j * 13 + (b.tall ? 3 : 0)) % 4 === 0) continue;
        ctx.fillRect(b.x + 14 + i * 46, b.y + 14 + j * 46, 16, 12);
      }
    }
    if (b.tall) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(b.x + b.w / 2 - 14, b.y + b.h / 2 - 4, 28, 8);
    }
  }

  // Mission marker beacon.
  const mk = missionMarker(G);
  if (mk) {
    const pulse = 1 + Math.sin(G.time * 4) * 0.15;
    ctx.save();
    ctx.translate(mk.x, mk.y);
    ctx.fillStyle = 'rgba(255,214,10,0.18)';
    ctx.beginPath(); ctx.arc(0, 0, 70 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 46 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath();
    ctx.moveTo(0, -18); ctx.lineTo(14, 6); ctx.lineTo(0, 0); ctx.lineTo(-14, 6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mk.name, mk.x, mk.y - 56);
  }

  // Cars.
  for (const car of G.cars) drawCar(ctx, car, G);

  // Pedestrians.
  for (const pd of G.peds) {
    if (pd.x < vx0 || pd.x > vx1 || pd.y < vy0 || pd.y > vy1) continue;
    const bob = Math.sin(pd.walkPhase) * 1.5;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(pd.x + 2, pd.y + 4, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pd.color;
    ctx.beginPath(); ctx.arc(pd.x, pd.y + bob * 0.3, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath(); ctx.arc(pd.x + Math.cos(pd.angle) * 4, pd.y + Math.sin(pd.angle) * 4 + bob * 0.3, 5.5, 0, Math.PI * 2); ctx.fill();
  }

  // Enemies (red) with a health bar.
  for (const e of G.enemies) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(e.x + 2, e.y + 4, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(e.x, e.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath(); ctx.arc(e.x + Math.cos(e.angle) * 4, e.y + Math.sin(e.angle) * 4, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(e.x - 14, e.y - 24, 28, 5);
    ctx.fillStyle = '#e5484d';
    ctx.fillRect(e.x - 14, e.y - 24, 28 * Math.max(0, e.hp / 55), 5);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(e.name, e.x, e.y - 30);
  }

  // Foot cops.
  for (const c of G.cops) {
    if (c.kind !== 'foot') continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(c.x + 2, c.y + 4, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1d3557';
    ctx.beginPath(); ctx.arc(c.x, c.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath(); ctx.arc(c.x + Math.cos(c.angle) * 4, c.y + Math.sin(c.angle) * 4, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', c.x, c.y + 3);
  }

  // Player.
  drawPlayer(ctx, G);

  // Bullets and particles.
  ctx.fillStyle = '#ffe66d';
  for (const b of G.bullets) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillRect(-7, -1.5, 14, 3);
    ctx.restore();
  }
  for (const pt of G.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;

  // Off-screen mission arrow at the screen edge.
  if (mk) drawEdgeArrow(ctx, G, mk, cw, ch);

  ctx.restore();
}

function drawCar(ctx, car, G) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const len = car.kind === 'truck' ? 52 : 44;
  const wid = car.kind === 'truck' ? 24 : 20;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-len / 2 + 3, -wid / 2 + 4, len, wid);
  ctx.fillStyle = car.color;
  roundRectPath(ctx, -len / 2, -wid / 2, len, wid, 6);
  ctx.fill();
  if (car.kind === 'police') {
    ctx.fillStyle = '#1d3557';
    ctx.fillRect(-6, -wid / 2, 12, wid);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 3);
    // Light bar, flashing.
    ctx.fillStyle = Math.floor(G.time * 6) % 2 === 0 ? '#ff3b30' : '#007aff';
    ctx.fillRect(-4, -wid / 2 - 3, 8, 4);
    ctx.fillStyle = Math.floor(G.time * 6) % 2 === 0 ? '#007aff' : '#ff3b30';
    ctx.fillRect(-4, wid / 2 - 1, 8, 4);
  } else {
    ctx.fillStyle = 'rgba(20,30,50,0.85)';
    ctx.fillRect(-2, -wid / 2 + 3, 12, wid - 6);
  }
  // Headlights.
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(len / 2 - 3, -wid / 2 + 2, 3, 4);
  ctx.fillRect(len / 2 - 3, wid / 2 - 6, 3, 4);
  // Brake lights when reversing.
  if (car.speed < -10) {
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(-len / 2, -wid / 2 + 2, 3, 4);
    ctx.fillRect(-len / 2, wid / 2 - 6, 3, 4);
  }
  ctx.restore();
  // "E" prompt over a stealable car near the player.
  if (car.driver !== 'player' && G.player.onFoot) {
    const d = Math.hypot(car.x - G.player.x, car.y - G.player.y);
    if (d < 70) {
      ctx.fillStyle = 'rgba(10,10,16,0.8)';
      ctx.beginPath(); ctx.arc(car.x, car.y - 34, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd60a';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('E', car.x, car.y - 29);
    }
  }
}

function drawPlayer(ctx, G) {
  const p = G.player;
  if (!p.onFoot) return; // The car is the player while driving.
  const bob = p.moving ? Math.sin(G.time * 12) * 1.5 : 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(2, 5, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd60a'; // Yellow jacket: the hero reads at a glance.
  ctx.beginPath(); ctx.arc(0, bob * 0.3, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(Math.cos(p.angle) * 5, Math.sin(p.angle) * 5 + bob * 0.3, 6.5, 0, Math.PI * 2); ctx.fill();
  // Pistol in hand when aiming.
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(Math.cos(p.angle) * 8, Math.sin(p.angle) * 8);
  ctx.lineTo(Math.cos(p.angle) * 20, Math.sin(p.angle) * 20);
  ctx.stroke();
  if (G.muzzle > 0) {
    ctx.fillStyle = '#ffe66d';
    ctx.beginPath(); ctx.arc(Math.cos(p.angle) * 26, Math.sin(p.angle) * 26, 7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawEdgeArrow(ctx, G, mk, cw, ch) {
  const p = G.player;
  const sx = mk.x - G.camera.x, sy = mk.y - G.camera.y;
  if (sx > 40 && sx < cw - 40 && sy > 40 && sy < ch - 40) return;
  const cx = cw / 2, cy = ch / 2;
  const a = Math.atan2(sy - cy, sx - cx);
  const ex = cx + Math.cos(a) * (Math.min(cw, ch) / 2 - 50);
  const ey = cy + Math.sin(a) * (Math.min(cw, ch) / 2 - 50);
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(a);
  ctx.fillStyle = '#ffd60a';
  ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -10); ctx.lineTo(-10, 10); ctx.closePath(); ctx.fill();
  ctx.restore();
  const d = Math.round(Math.hypot(mk.x - p.x, mk.y - p.y));
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(d + 'm', ex, ey + 28);
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
