// player.js — the player on foot and behind the wheel. One clear job: move the hero,
// get in and out of cars, and take damage.
import { collideBuildings } from './city.js';
import { wantedUp } from './police.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0,
    onFoot: true, car: null,
    health: 100, maxHealth: 100,
    walkSpeed: 210, runSpeed: 320,
    radius: 14, moving: false, hurtFlash: 0,
  };
}

function moveCircle(G, x, y, r) {
  const fixed = collideBuildings(x, y, r, G.city.buildings);
  return fixed;
}

export function updatePlayer(G, dt, input, isDown) {
  const p = G.player;
  p.hurtFlash = Math.max(0, p.hurtFlash - dt);
  if (p.onFoot) {
    let mx = 0, my = 0;
    if (isDown(input, 'KeyW', 'ArrowUp')) my -= 1;
    if (isDown(input, 'KeyS', 'ArrowDown')) my += 1;
    if (isDown(input, 'KeyA', 'ArrowLeft')) mx -= 1;
    if (isDown(input, 'KeyD', 'ArrowRight')) mx += 1;
    p.moving = mx !== 0 || my !== 0;
    if (p.moving) {
      const len = Math.hypot(mx, my);
      const run = isDown(input, 'ShiftLeft', 'ShiftRight');
      const sp = (run ? p.runSpeed : p.walkSpeed) * dt;
      const nx = p.x + (mx / len) * sp;
      const ny = p.y + (my / len) * sp;
      const fixed = moveCircle(G, nx, ny, p.radius);
      p.x = fixed.x; p.y = fixed.y;
      p.angle = Math.atan2(my, mx);
    }
    // Aim at the mouse when fighting.
    if (input.mouse.down || G.enemies.length > 0) {
      const wx = G.camera.x + input.mouse.x;
      const wy = G.camera.y + input.mouse.y;
      if (Math.hypot(wx - p.x, wy - p.y) > 30) p.angle = Math.atan2(wy - p.y, wx - p.x);
    }
  } else if (p.car) {
    const car = p.car;
    const fwd = isDown(input, 'KeyW', 'ArrowUp') ? 1 : 0;
    const back = isDown(input, 'KeyS', 'ArrowDown') ? 1 : 0;
    const steer = (isDown(input, 'KeyA', 'ArrowLeft') ? -1 : 0) + (isDown(input, 'KeyD', 'ArrowRight') ? 1 : 0);
    const accel = 620;
    if (fwd) car.speed += accel * dt;
    if (back) car.speed -= (car.speed > 0 ? 900 : 420) * dt;
    car.speed *= Math.pow(0.4, dt); // drag
    if (!fwd && !back) car.speed *= Math.pow(0.12, dt);
    car.speed = Math.max(-140, Math.min(car.topSpeed, car.speed));
    const spd = Math.abs(car.speed);
    if (spd > 4) {
      car.angle += steer * (car.speed > 0 ? 1 : -1) * 2.1 * dt * Math.min(1, spd / 160);
    }
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const before = { x: car.x, y: car.y };
    const fixed = collideBuildings(nx, ny, 20, G.city.buildings);
    car.x = fixed.x; car.y = fixed.y;
    if (Math.hypot(car.x - before.x, car.y - before.y) < Math.hypot(nx - before.x, ny - before.y) - 1) {
      if (Math.abs(car.speed) > 200) { G.audio.crash(); addShake(G, 6); damagePlayer(G, 4); }
      car.speed *= -0.25;
    }
    p.x = car.x; p.y = car.y; p.angle = car.angle; p.speed = car.speed;
    p.moving = spd > 10;
    G.audio.engine(Math.min(1, spd / 420));
  }
  // Regen a little health when calm.
  if (G.wanted === 0 && p.health < p.maxHealth) p.health = Math.min(p.maxHealth, p.health + 2 * dt);
}

export function addShake(G, amount) {
  G.shake = Math.max(G.shake || 0, amount);
}

// Find the nearest car the player could enter.
export function nearestCar(G, maxDist) {
  let best = null, bestD = maxDist;
  for (const c of G.cars) {
    if (c === G.player.car) continue;
    const d = Math.hypot(c.x - G.player.x, c.y - G.player.y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

export function enterCar(G, car) {
  const p = G.player;
  if (!car) return false;
  if (car.owner === 'player') {
    p.onFoot = false; p.car = car; car.driver = 'player';
    G.audio.click();
    return true;
  }
  // Stealing: pull the driver out (they flee on foot) and take the car.
  if (car.driver === 'traffic' || car.driver === 'parked') {
    if (car.driver === 'traffic') spawnFleeingDriver(G, car);
    car.driver = 'player'; car.owner = 'player';
    p.onFoot = false; p.car = car;
    G.stats.carsStolen++;
    G.audio.steal();
    G.toast('Car stolen! The cops noticed.');
    wantedUp(G, 1, 'theft');
    return true;
  }
  return false;
}

function spawnFleeingDriver(G, car) {
  const a = Math.random() * Math.PI * 2;
  G.peds.push({
    x: car.x + Math.cos(a) * 30, y: car.y + Math.sin(a) * 30,
    angle: a, speed: 150, color: '#e07a5f', flee: true, fleeTimer: 6, state: 'flee',
  });
}

export function exitCar(G) {
  const p = G.player;
  if (!p.car) return;
  const car = p.car;
  car.driver = 'parked'; car.speed = 0;
  p.car = null; p.onFoot = true;
  p.x = car.x - Math.sin(car.angle) * 34;
  p.y = car.y + Math.cos(car.angle) * 34;
  const fixed = collideBuildings(p.x, p.y, p.radius, G.city.buildings);
  p.x = fixed.x; p.y = fixed.y;
  G.audio.engine(0);
  G.audio.click();
}

export function damagePlayer(G, amount) {
  const p = G.player;
  if (G.mode !== 'playing' || p.health <= 0) return;
  p.health -= amount;
  p.hurtFlash = 0.35;
  addShake(G, 4);
  if (p.health <= 0) {
    p.health = 0;
    if (p.car) { p.car.driver = 'parked'; p.car.speed = 0; p.car = null; p.onFoot = true; }
    G.mode = 'dead';
    G.audio.busted();
    showEndScreen(G, 'WASTED', 'Solmar took you down. The city never forgets — but you can try again.');
  }
}

export function showEndScreen(G, title, text) {
  const el = document.getElementById('end-screen');
  if (!el) return;
  document.getElementById('end-title').textContent = title;
  document.getElementById('end-text').textContent = text;
  el.classList.remove('hidden');
}
