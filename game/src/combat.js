// combat.js — fists, pistols and the people shooting back.
// One clear job: fighting.
import { wantedUp } from './police.js';
import { damagePlayer } from './player.js';
import { collideBuildings } from './city.js';

export function shoot(G) {
  const p = G.player;
  if (G.mode !== 'playing') return;
  if (G.shootCooldown > 0) return;
  G.shootCooldown = 0.28;
  G.stats.shotsFired++;
  const spread = (Math.random() - 0.5) * 0.08;
  const ox = p.x + Math.cos(p.angle) * 22;
  const oy = p.y + Math.sin(p.angle) * 22;
  G.bullets.push({
    x: ox, y: oy, angle: p.angle + spread,
    speed: 780, from: 'player', life: 1.1, damage: 26,
  });
  G.audio.shoot();
  G.gunfireTimer = 1.5;
  wantedUp(G, 0, ''); // no-op guard: firing is only a crime when it hits someone
  if (G.wanted === 0) { /* firing into the air is free — hitting someone is not */ }
  G.muzzle = 0.06;
}

export function melee(G) {
  const p = G.player;
  if (G.mode !== 'playing' || G.meleeCooldown > 0) return;
  G.meleeCooldown = 0.45;
  G.audio.punch();
  G.stats.punches++;
  const range = 52;
  // Hit the nearest enemy, cop or pedestrian in front of the player.
  const targets = [
    ...G.enemies.map((e) => ({ x: e.x, y: e.y, kind: 'enemy', ref: e })),
    ...G.cops.filter((c) => c.kind === 'foot').map((c) => ({ x: c.x, y: c.y, kind: 'cop', ref: c })),
    ...G.peds.map((pd) => ({ x: pd.x, y: pd.y, kind: 'ped', ref: pd })),
  ];
  let best = null, bestD = range;
  for (const t of targets) {
    const d = Math.hypot(t.x - p.x, t.y - p.y);
    if (d < bestD) {
      const a = Math.atan2(t.y - p.y, t.x - p.x);
      let diff = Math.abs(a - p.angle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < 1.2) { bestD = d; best = t; }
    }
  }
  if (!best) return;
  const kb = 160;
  best.ref.x += Math.cos(p.angle) * 14;
  best.ref.y += Math.sin(p.angle) * 14;
  if (best.kind === 'enemy') {
    best.ref.hp -= 34;
    spawnParticles(G, best.x, best.y, '#ffd166', 6);
    if (best.ref.hp <= 0) killEnemy(G, best.ref);
  } else if (best.kind === 'cop') {
    wantedUp(G, 1, 'assaulting an officer');
    const i = G.cops.indexOf(best.ref);
    if (i >= 0) G.cops.splice(i, 1);
    spawnParticles(G, best.x, best.y, '#1d3557', 6);
  } else {
    best.ref.flee = true; best.ref.fleeTimer = 5;
    wantedUp(G, 1, 'assault');
    spawnParticles(G, best.x, best.y, '#e07a5f', 5);
  }
  void kb;
}

export function spawnEnemy(G, x, y, opts) {
  const o = opts || {};
  const e = {
    x, y, angle: Math.random() * Math.PI * 2, hp: o.hp || 55,
    speed: 120 + Math.random() * 30, color: o.color || '#7f1d1d',
    shootTimer: 0.6 + Math.random(), name: o.name || 'Rival',
  };
  G.enemies.push(e);
  return e;
}

export function killEnemy(G, e) {
  const i = G.enemies.indexOf(e);
  if (i >= 0) G.enemies.splice(i, 1);
  G.stats.kills++;
  G.money += 40;
  spawnParticles(G, e.x, e.y, '#ff5d5d', 14);
  G.audio.pickup();
  G.toast('Rival down. +$40');
}

export function spawnParticles(G, x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 160;
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.4, maxLife: 0.9, color, size: 2 + Math.random() * 3 });
  }
}

export function updateBullets(G, dt) {
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.life -= dt;
    b.x += Math.cos(b.angle) * b.speed * dt;
    b.y += Math.sin(b.angle) * b.speed * dt;
    let dead = b.life <= 0;
    // Hit a building.
    if (!dead && b.x > 0 && b.x < 3200 && b.y > 0 && b.y < 2400) {
      const hit = G.city.buildings.some((bd) => b.x > bd.x && b.x < bd.x + bd.w && b.y > bd.y && b.y < bd.y + bd.h);
      if (hit) { spawnParticles(G, b.x, b.y, '#c9c9c9', 3); dead = true; }
    }
    if (!dead && b.from === 'player') {
      // Enemies first, then cops, then pedestrians.
      for (const e of G.enemies.slice()) {
        if (Math.hypot(e.x - b.x, e.y - b.y) < 18) {
          e.hp -= b.damage;
          spawnParticles(G, b.x, b.y, '#ff5d5d', 5);
          if (e.hp <= 0) killEnemy(G, e);
          dead = true; break;
        }
      }
      if (!dead) for (const c of G.cops.slice()) {
        if (c.kind === 'foot' && Math.hypot(c.x - b.x, c.y - b.y) < 16) {
          const ci = G.cops.indexOf(c);
          if (ci >= 0) G.cops.splice(ci, 1);
          wantedUp(G, 1, 'shooting an officer');
          spawnParticles(G, b.x, b.y, '#1d3557', 6);
          dead = true; break;
        }
      }
      if (!dead) for (const pd of G.peds) {
        if (Math.hypot(pd.x - b.x, pd.y - b.y) < 14) {
          pd.flee = true; pd.fleeTimer = 6;
          wantedUp(G, 1, 'shooting a bystander');
          spawnParticles(G, b.x, b.y, '#e07a5f', 5);
          dead = true; break;
        }
      }
    } else if (!dead && (b.from === 'cop' || b.from === 'enemy')) {
      const p = G.player;
      if (Math.hypot(p.x - b.x, p.y - b.y) < 16) {
        damagePlayer(G, b.damage);
        spawnParticles(G, b.x, b.y, '#ff5d5d', 4);
        dead = true;
      }
    }
    if (dead) G.bullets.splice(i, 1);
  }
}

export function updateEnemies(G, dt) {
  const p = G.player;
  for (const e of G.enemies.slice()) {
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    const want = Math.atan2(p.y - e.y, p.x - e.x);
    e.angle = want;
    if (d > 60) {
      const nx = e.x + Math.cos(want) * e.speed * dt;
      const ny = e.y + Math.sin(want) * e.speed * dt;
      const fixed = collideBuildings(nx, ny, 12, G.city.buildings);
      e.x = fixed.x; e.y = fixed.y;
    }
    e.shootTimer -= dt;
    if (d < 380 && e.shootTimer <= 0) {
      e.shootTimer = 1.3 + Math.random() * 1.0;
      G.bullets.push({
        x: e.x, y: e.y, angle: want + (Math.random() - 0.5) * 0.3,
        speed: 560, from: 'enemy', life: 1.2, damage: 5,
      });
      G.audio.shoot();
      G.gunfireTimer = 1;
    }
  }
}

export function updateParticles(G, dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const pt = G.particles[i];
    pt.life -= dt;
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vx *= 0.92; pt.vy *= 0.92;
    if (pt.life <= 0) G.particles.splice(i, 1);
  }
}
