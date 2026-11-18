// police.js — the wanted level and the Solmar PD response.
// One clear job: make crime have consequences.
import { makeCar } from './traffic.js';
import { damagePlayer, showEndScreen } from './player.js';
import { collideBuildings, nearestRoadPoint } from './city.js';

export function wantedUp(G, n, reason) {
  const before = G.wanted;
  G.wanted = Math.max(0, Math.min(5, G.wanted + n));
  G.calmTimer = 0;
  if (G.wanted > before) {
    G.toast('Wanted level ' + G.wanted + ' — ' + reason);
    if (G.wanted >= 1) G.audio.siren(true);
  }
}

export function wantedDown(G) {
  if (G.wanted > 0) {
    G.wanted--;
    G.toast('Heat dying down… wanted level ' + G.wanted);
    if (G.wanted === 0) G.audio.siren(false);
  }
}

export function updatePolice(G, dt) {
  const p = G.player;
  // Heat cools when the player stays clean and unseen for a while.
  if (G.wanted > 0) {
    G.calmTimer += dt;
    const nearestCop = G.cops.reduce((m, c) => Math.min(m, Math.hypot(c.x - p.x, c.y - p.y)), Infinity);
    if (G.calmTimer > 22 && nearestCop > 380) { wantedDown(G); G.calmTimer = 0; }
  }
  // Spawn the right number of units for the wanted level.
  const wantCars = G.wanted === 0 ? 0 : G.wanted <= 2 ? 1 : G.wanted <= 3 ? 2 : 3;
  const wantFoot = G.wanted >= 3 ? G.wanted - 1 : 0;
  const cars = G.cops.filter((c) => c.kind === 'car').length;
  const foot = G.cops.filter((c) => c.kind === 'foot').length;
  if (cars < wantCars) spawnPoliceCar(G);
  if (foot < wantFoot) spawnFootCop(G);

  for (let i = G.cops.length - 1; i >= 0; i--) {
    const cop = G.cops[i];
    const d = Math.hypot(p.x - cop.x, p.y - cop.y);
    if (G.wanted === 0 && cop.kind === 'car') {
      // No heat: cruise away and leave.
      cop.x += Math.cos(cop.angle) * 120 * dt;
      cop.y += Math.sin(cop.angle) * 120 * dt;
      if (d > 1100) { removeCop(G, cop); continue; }
    }
    if (cop.kind === 'car') {
      updatePoliceCar(G, cop, dt, d);
    } else {
      updateFootCop(G, cop, dt, d);
    }
    // Bust: caught on foot, or boxed in while barely moving.
    if (d < 34 && p.health > 0) {
      cop.bustTimer = (cop.bustTimer || 0) + dt;
      if (cop.bustTimer > 1.6) { bustPlayer(G); return; }
    } else {
      cop.bustTimer = 0;
    }
    if (d > 1400) removeCop(G, cop);
  }
}

function removeCop(G, cop) {
  const i = G.cops.indexOf(cop);
  if (i >= 0) G.cops.splice(i, 1);
  if (cop.car) {
    const ci = G.cars.indexOf(cop.car);
    if (ci >= 0) G.cars.splice(ci, 1);
  }
}

function spawnPoliceCar(G) {
  const p = G.player;
  const a = Math.random() * Math.PI * 2;
  const pt = nearestRoadPoint(p.x + Math.cos(a) * 620, p.y + Math.sin(a) * 620);
  const car = makeCar(pt.x, pt.y, Math.atan2(p.y - pt.y, p.x - pt.x), {
    driver: 'police', owner: 'police', kind: 'police', color: '#f8f9fa', topSpeed: 430,
  });
  G.cars.push(car);
  const cop = { kind: 'car', x: car.x, y: car.y, angle: car.angle, car, speed: 0, bustTimer: 0 };
  G.cops.push(cop);
}

function spawnFootCop(G) {
  const p = G.player;
  const a = Math.random() * Math.PI * 2;
  const cop = {
    kind: 'foot', x: p.x + Math.cos(a) * 320, y: p.y + Math.sin(a) * 320,
    angle: 0, speed: 0, color: '#1d3557', bustTimer: 0, shootTimer: 1 + Math.random(),
  };
  G.cops.push(cop);
}

function nearestIntersection(x, y, city) {
  let best = null, bd = Infinity;
  for (const rx of city.roadsV) {
    for (const ry of city.roadsH) {
      const d = Math.hypot(x - rx, y - ry);
      if (d < bd) { bd = d; best = { x: rx, y: ry }; }
    }
  }
  return best;
}

// From one intersection, the neighbouring intersection that gets closest to the target.
function nextIntersectionToward(cur, target, city) {
  const ix = city.roadsV.indexOf(cur.x);
  const iy = city.roadsH.indexOf(cur.y);
  const cands = [];
  if (ix > 0) cands.push({ x: city.roadsV[ix - 1], y: cur.y });
  if (ix < city.roadsV.length - 1) cands.push({ x: city.roadsV[ix + 1], y: cur.y });
  if (iy > 0) cands.push({ x: cur.x, y: city.roadsH[iy - 1] });
  if (iy < city.roadsH.length - 1) cands.push({ x: cur.x, y: city.roadsH[iy + 1] });
  let best = cands[0], bd = Infinity;
  for (const c of cands) {
    const d = Math.hypot(c.x - target.x, c.y - target.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

function updatePoliceCar(G, cop, dt, d) {
  const p = G.player;
  const car = cop.car;
  if (!car || !G.cars.includes(car)) { removeCop(G, cop); return; }
  // Chase: close in, steer straight at the player to ram; far away, navigate the
  // road grid intersection by intersection so a building never blocks the pursuit.
  const lead = p.car ? 0.55 : 0.2;
  const tx = p.x + Math.cos(p.angle) * (p.speed || 0) * lead;
  const ty = p.y + Math.sin(p.angle) * (p.speed || 0) * lead;
  let wp;
  if (d < 220) {
    wp = { x: tx, y: ty };
  } else {
    const onRoad = G.city.roadsV.some((rx) => Math.abs(car.x - rx) < 40) ||
      G.city.roadsH.some((ry) => Math.abs(car.y - ry) < 40);
    if (!onRoad) {
      wp = nearestRoadPoint(car.x, car.y);
    } else {
      const targetIx = nearestIntersection(p.x, p.y, G.city);
      const cur = nearestIntersection(car.x, car.y, G.city);
      if (!cop.nextIx || Math.hypot(car.x - cop.nextIx.x, car.y - cop.nextIx.y) < 50) {
        cop.nextIx = nextIntersectionToward(cur, targetIx, G.city);
      }
      wp = cop.nextIx;
    }
  }
  const want = Math.atan2(wp.y - car.y, wp.x - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff * 3 * dt));
  const target = d > 900 ? 430 : 400;
  car.speed += (target - car.speed) * Math.min(1, dt * 0.8);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const fixed = collideBuildings(car.x, car.y, 20, G.city.buildings);
  if (fixed.x !== car.x || fixed.y !== car.y) { car.speed *= 0.5; }
  car.x = fixed.x; car.y = fixed.y;
  // Stuck against a building? Turn away and try another angle instead of grinding.
  const moved = Math.hypot(car.x - (cop.px ?? car.x), car.y - (cop.py ?? car.y));
  cop.px = car.x; cop.py = car.y;
  if (car.speed > 100 && moved < 2) cop.stuck = (cop.stuck || 0) + dt;
  else cop.stuck = 0;
  if ((cop.stuck || 0) > 0.4) { car.angle += 1.5; car.speed = 200; cop.stuck = 0; }
  cop.x = car.x; cop.y = car.y; cop.angle = car.angle;
  if (d < 46) {
    // Ram: shove the player's car and hurt the player a little.
    if (p.car) {
      p.car.speed *= 0.82;
      p.car.x += (p.car.x - car.x) * 0.06;
      p.car.y += (p.car.y - car.y) * 0.06;
    }
    if (Math.random() < dt * 2) damagePlayer(G, 2);
    if (Math.random() < dt * 0.8) G.audio.crash();
  }
}

function updateFootCop(G, cop, dt, d) {
  const p = G.player;
  const want = Math.atan2(p.y - cop.y, p.x - cop.x);
  cop.angle = want;
  const speed = d > 90 ? 235 : 120;
  const nx = cop.x + Math.cos(want) * speed * dt;
  const ny = cop.y + Math.sin(want) * speed * dt;
  const fixed = collideBuildings(nx, ny, 12, G.city.buildings);
  cop.x = fixed.x; cop.y = fixed.y;
  // Cops open fire at 3+ stars when the player is armed and close.
  cop.shootTimer -= dt;
  if (G.wanted >= 3 && d < 340 && d > 60 && cop.shootTimer <= 0) {
    cop.shootTimer = 1.1 + Math.random() * 0.7;
    G.bullets.push({
      x: cop.x, y: cop.y, angle: want + (Math.random() - 0.5) * 0.22,
      speed: 620, from: 'cop', life: 1.2, damage: 7,
    });
    G.audio.shoot();
    G.gunfireTimer = 1;
  }
}

export function bustPlayer(G) {
  const p = G.player;
  const fine = Math.min(G.money, 250);
  G.money -= fine;
  G.wanted = 0;
  G.audio.siren(false);
  G.audio.busted();
  if (p.car) { p.car.driver = 'parked'; p.car.speed = 0; p.car = null; p.onFoot = true; }
  const st = G.city.locations.policeStation;
  p.x = st.x + 60; p.y = st.y + 60; p.health = Math.max(40, p.health);
  for (const cop of G.cops.slice()) removeCop(G, cop);
  G.mode = 'busted';
  showEndScreen(G, 'BUSTED', 'Solmar PD caught you outside the station. Fine: $' + fine + '. The heat is off — for now.');
}
