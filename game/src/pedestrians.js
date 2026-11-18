// pedestrians.js — the people of Solmar City. One clear job: walk, stroll and flee.
import { collideBuildings, randomRoadPoint } from './city.js';

const SHIRTS = ['#e07a5f', '#81b29a', '#f2cc8f', '#3d405b', '#e07a9f', '#6d9dc5', '#f4f1de', '#8d99ae'];

export function spawnPeds(G, n) {
  for (let i = 0; i < n; i++) {
    const pt = randomRoadPoint();
    G.peds.push({
      x: pt.x + (Math.random() - 0.5) * 60,
      y: pt.y + (Math.random() - 0.5) * 60,
      angle: Math.random() * Math.PI * 2,
      speed: 30 + Math.random() * 40,
      color: SHIRTS[Math.floor(Math.random() * SHIRTS.length)],
      state: 'walk', tx: 0, ty: 0, wait: Math.random() * 3,
      flee: false, fleeTimer: 0, walkPhase: Math.random() * 6,
    });
  }
}

function pickTarget(G, ped) {
  const pt = randomRoadPoint();
  ped.tx = pt.x + (Math.random() - 0.5) * 80;
  ped.ty = pt.y + (Math.random() - 0.5) * 80;
}

export function updatePeds(G, dt) {
  const p = G.player;
  for (const ped of G.peds) {
    ped.walkPhase += dt * 6;
    // Flee from gunfire, speeding cars and the player when wanted.
    const pd = Math.hypot(p.x - ped.x, p.y - ped.y);
    if (G.gunfireTimer > 0 && pd < 420) { ped.flee = true; ped.fleeTimer = 3; }
    if (ped.fleeTimer > 0) {
      ped.fleeTimer -= dt;
      const a = Math.atan2(ped.y - p.y, ped.x - p.x);
      ped.angle = a;
      const nx = ped.x + Math.cos(a) * 150 * dt;
      const ny = ped.y + Math.sin(a) * 150 * dt;
      const fixed = collideBuildings(nx, ny, 12, G.city.buildings);
      ped.x = fixed.x; ped.y = fixed.y;
      if (ped.fleeTimer <= 0) ped.flee = false;
      continue;
    }
    if (ped.wait > 0) { ped.wait -= dt; continue; }
    if (!ped.tx && !ped.ty) pickTarget(G, ped);
    const dx = ped.tx - ped.x, dy = ped.ty - ped.y;
    const d = Math.hypot(dx, dy);
    if (d < 12) { ped.wait = 1 + Math.random() * 4; ped.tx = 0; ped.ty = 0; continue; }
    ped.angle = Math.atan2(dy, dx);
    const nx = ped.x + (dx / d) * ped.speed * dt;
    const ny = ped.y + (dy / d) * ped.speed * dt;
    const fixed = collideBuildings(nx, ny, 12, G.city.buildings);
    ped.x = fixed.x; ped.y = fixed.y;
  }
  // Keep the crowd topped up near the player.
  if (G.peds.length < 26 && Math.random() < dt * 0.5) {
    spawnPeds(G, 2);
  }
}
