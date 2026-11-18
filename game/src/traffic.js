// traffic.js — civilian cars on the roads and parked cars to steal.
// One clear job: keep the city moving.
import { randomRoadPoint, WORLD_W, WORLD_H } from './city.js';

const CAR_COLORS = ['#d64545', '#3a7bd5', '#e8b04b', '#7fb069', '#9b5de5', '#f1fa8c', '#e0e0e0', '#222831', '#ef8354', '#00b4d8'];
const CAR_NAMES = ['Comet', 'Vagabond', 'Sunrunner', 'Marlin', 'Duchess', 'Prowler', 'Sandpiper', 'Falcon'];

export function makeCar(x, y, angle, opts) {
  const o = opts || {};
  return {
    x, y, angle, speed: o.speed || 0,
    topSpeed: o.topSpeed || 330,
    color: o.color || CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    name: o.name || CAR_NAMES[Math.floor(Math.random() * CAR_NAMES.length)],
    driver: o.driver || 'parked', // parked | traffic | player | police
    owner: o.owner || 'npc',
    vertical: !!o.vertical, dir: o.dir || 1,
    kind: o.kind || 'sedan', // sedan | taxi | truck | sport | police
    hp: 100, honk: 0,
  };
}

export function spawnTraffic(G, n) {
  for (let i = 0; i < n; i++) {
    const pt = randomRoadPoint();
    const angle = pt.vertical ? (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (Math.random() < 0.5 ? 0 : Math.PI);
    const car = makeCar(pt.x, pt.y, angle, {
      driver: 'traffic', speed: 70 + Math.random() * 50,
      vertical: pt.vertical, dir: 1,
      kind: Math.random() < 0.08 ? 'taxi' : (Math.random() < 0.1 ? 'truck' : 'sedan'),
      topSpeed: 260 + Math.random() * 80,
    });
    if (car.kind === 'taxi') car.color = '#f7c948';
    G.cars.push(car);
  }
}

export function spawnParkedCars(G, n) {
  for (let i = 0; i < n; i++) {
    const pt = randomRoadPoint();
    const angle = pt.vertical ? Math.PI / 2 : 0;
    const car = makeCar(pt.x + (pt.vertical ? 26 : 0), pt.y + (pt.vertical ? 0 : 26), angle + (Math.random() < 0.5 ? 0 : Math.PI), {
      driver: 'parked', speed: 0,
      kind: Math.random() < 0.15 ? 'sport' : 'sedan',
      topSpeed: 380 + Math.random() * 120,
    });
    G.cars.push(car);
  }
}

export function updateTraffic(G, dt) {
  const p = G.player;
  for (const car of G.cars) {
    if (car.driver !== 'traffic') continue;
    // Keep a little distance from the car ahead on the same road.
    let blocked = false;
    for (const other of G.cars) {
      if (other === car || other.driver === 'parked') continue;
      const dx = other.x - car.x, dy = other.y - car.y;
      const along = car.vertical ? dy * Math.sin(car.angle) : dx * Math.cos(car.angle);
      const side = car.vertical ? Math.abs(dx) : Math.abs(dy);
      if (along > 0 && along < 70 && side < 30) { blocked = true; break; }
    }
    // Slow near the player so traffic feels alive, not suicidal.
    const pd = Math.hypot(p.x - car.x, p.y - car.y);
    if (pd < 60) blocked = true;
    const target = blocked ? 0 : car.topSpeed * 0.55;
    car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // At an intersection, sometimes turn; at the edge, loop to the other side.
    const nearX = G.city.roadsV.some((rx) => Math.abs(car.x - rx) < 6);
    const nearY = G.city.roadsH.some((ry) => Math.abs(car.y - ry) < 6);
    if (car.vertical && nearY && Math.random() < dt * 0.25) {
      car.vertical = false;
      car.angle = Math.random() < 0.5 ? 0 : Math.PI;
    } else if (!car.vertical && nearX && Math.random() < dt * 0.25) {
      car.vertical = true;
      car.angle = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    }
    if (car.x < 40 || car.x > WORLD_W - 40 || car.y < 40 || car.y > WORLD_H - 40) {
      const pt = randomRoadPoint();
      car.x = pt.x; car.y = pt.y;
      car.vertical = pt.vertical;
      car.angle = pt.vertical ? Math.PI / 2 : 0;
    }
  }
  // Gentle car-car separation for the player's car and police.
  for (let i = 0; i < G.cars.length; i++) {
    for (let j = i + 1; j < G.cars.length; j++) {
      const a = G.cars[i], b = G.cars[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.01 && d < 44) {
        const push = (44 - d) / 2;
        const nx = dx / d, ny = dy / d;
        if (a.driver !== 'player') { a.x -= nx * push; a.y -= ny * push; }
        if (b.driver !== 'player') { b.x += nx * push; b.y += ny * push; }
        if ((a.driver === 'player' || b.driver === 'player') && Math.abs((a.driver === 'player' ? a.speed : b.speed)) > 150) {
          G.audio.crash();
        }
      }
    }
  }
}
