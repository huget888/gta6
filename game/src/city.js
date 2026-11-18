// city.js — Solmar City: the map, roads, buildings, districts and collision.
// One clear job: describe the world and answer "is this spot blocked?".
export const WORLD_W = 3200;
export const WORLD_H = 2400;

const ROAD_X = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
const ROAD_Y = [200, 600, 1000, 1400, 1800, 2200];
const ROAD_HALF = 34;

const PALETTES = {
  downtown: ['#e8b04b', '#c97b4a', '#7fa8c9', '#9db98a', '#d98a7a'],
  marina: ['#f2c14e', '#e07a5f', '#81b29a', '#f4f1de'],
  oldtown: ['#d9a441', '#b08968', '#a98467', '#e6ccb2'],
  harbor: ['#8d99ae', '#6c757d', '#adb5bd', '#ef8354'],
};

function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function buildCity() {
  const buildings = [];
  const parks = [];
  // Blocks between roads: each block gets 1-3 buildings or a park.
  for (let ix = 0; ix < ROAD_X.length - 1; ix++) {
    for (let iy = 0; iy < ROAD_Y.length - 1; iy++) {
      const x0 = ROAD_X[ix] + ROAD_HALF + 14;
      const x1 = ROAD_X[ix + 1] - ROAD_HALF - 14;
      const y0 = ROAD_Y[iy] + ROAD_HALF + 14;
      const y1 = ROAD_Y[iy + 1] - ROAD_HALF - 14;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      // District by position.
      let district = 'oldtown';
      if (cx > 1200 && cx < 2200 && cy > 800 && cy < 1800) district = 'downtown';
      if (cy > 1900) district = 'marina';
      if (cx > 2600) district = 'harbor';
      // The big central park.
      if (ix === 3 && iy === 2) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, name: 'Solmar Central Park' });
        continue;
      }
      // A plaza in downtown.
      if (ix === 4 && iy === 1) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, name: 'Beacon Plaza' });
        continue;
      }
      const n = Math.random() < 0.45 ? 2 : 1;
      if (n === 1) {
        buildings.push({
          x: x0 + 8, y: y0 + 8, w: x1 - x0 - 16, h: y1 - y0 - 16,
          color: pick(PALETTES[district]), district, tall: district === 'downtown',
          name: district + ' block',
        });
      } else {
        const vertical = (x1 - x0) > (y1 - y0);
        for (let k = 0; k < 2; k++) {
          if (vertical) {
            buildings.push({
              x: x0 + 8, y: y0 + 8 + k * ((y1 - y0) / 2), w: x1 - x0 - 16, h: (y1 - y0) / 2 - 16,
              color: pick(PALETTES[district]), district, tall: false, name: district + ' block',
            });
          } else {
            buildings.push({
              x: x0 + 8 + k * ((x1 - x0) / 2), y: y0 + 8, w: (x1 - x0) / 2 - 16, h: y1 - y0 - 16,
              color: pick(PALETTES[district]), district, tall: false, name: district + ' block',
            });
          }
        }
      }
    }
  }
  return {
    buildings, parks,
    roadsV: ROAD_X.slice(), roadsH: ROAD_Y.slice(), roadHalf: ROAD_HALF,
    beach: { y: 2280, name: 'Solmar Beach' },
    locations: {
      playerStart: { x: 600, y: 1000 },
      garage: { x: 1000, y: 600, name: "Rico's Garage" },
      contact: { x: 1800, y: 1400, name: 'Beacon Plaza meet' },
      dropoff: { x: 2600, y: 1000, name: 'Harbor drop-off' },
      warehouse: { x: 2600, y: 1800, name: 'Harbor warehouse' },
      marinaVault: { x: 1400, y: 2200, name: 'Marina vault' },
      safehouse: { x: 600, y: 1800, name: 'Safehouse' },
      policeStation: { x: 1400, y: 1000, name: 'Solmar PD' },
      diner: { x: 2200, y: 600, name: 'Sunset Diner' },
    },
  };
}

// Push a circle (x, y, radius) out of every building it overlaps. Returns corrected {x, y}.
export function collideBuildings(x, y, r, buildings) {
  for (const b of buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx, dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r;
        y = cy + (dy / d) * r;
      } else {
        // Centre inside the building: push out along the smallest penetration.
        const left = x - b.x, right = b.x + b.w - x, top = y - b.y, bot = b.y + b.h - y;
        const m = Math.min(left, right, top, bot);
        if (m === left) x = b.x - r;
        else if (m === right) x = b.x + b.w + r;
        else if (m === top) y = b.y - r;
        else y = b.y + b.h + r;
      }
    }
  }
  x = Math.max(20, Math.min(WORLD_W - 20, x));
  y = Math.max(20, Math.min(WORLD_H - 20, y));
  return { x, y };
}

export function pointInBuilding(x, y, buildings) {
  for (const b of buildings) {
    if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return b;
  }
  return null;
}

// A random point on a road (used to spawn traffic / parked cars).
export function randomRoadPoint() {
  if (Math.random() < 0.5) {
    return { x: pick(ROAD_X) + rand(-14, 14), y: rand(80, WORLD_H - 80), vertical: true };
  }
  return { x: rand(80, WORLD_W - 80), y: pick(ROAD_Y) + rand(-14, 14), vertical: false };
}

export function nearestRoadPoint(x, y) {
  let best = null, bestD = Infinity;
  for (const rx of ROAD_X) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y, vertical: true }; }
  }
  for (const ry of ROAD_Y) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x, y: ry, vertical: false }; }
  }
  return best;
}
