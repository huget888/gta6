// main.js — boot and the one loop. One clear job: own the game state, run the
// frames, and wire the menus, the save system and the screenshot staging.
//
// ?shot=cover|foot|chase|combat stages a scene for screenshots and sets
// window.__shotReady once it is painted.
import { buildCity, WORLD_W, WORLD_H } from './city.js';
import { createInput, isDown, pressed, endFrameInput } from './input.js';
import { createAudio } from './audio.js';
import { saveGame, loadGame, hasSave, clearSave } from './save.js';
import { createPlayer, updatePlayer, enterCar, exitCar, nearestCar, damagePlayer } from './player.js';
import { spawnTraffic, spawnParkedCars, updateTraffic, makeCar } from './traffic.js';
import { spawnPeds, updatePeds } from './pedestrians.js';
import { updatePolice, wantedUp } from './police.js';
import { shoot, melee, updateBullets, updateEnemies, updateParticles, spawnEnemy } from './combat.js';
import { startMission, updateMissions, noteKill, currentMission } from './missions.js';
import { drawHUD, drawMinimap } from './hud.js';
import { drawWorld } from './render.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(window.innerWidth * ratio);
  canvas.height = Math.round(window.innerHeight * ratio);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
}
resize();
window.addEventListener('resize', resize);

const audio = createAudio();
const input = createInput(canvas);

function newGameState() {
  const city = buildCity();
  const G = {
    city, audio, input,
    mode: 'menu',
    time: 0, money: 120, wanted: 0, calmTimer: 0,
    player: createPlayer(city.locations.playerStart.x, city.locations.playerStart.y),
    cars: [], peds: [], cops: [], bullets: [], enemies: [], particles: [],
    missionIndex: 0, missionStage: 0, missionTimer: 0, missionKills: 0,
    camera: { x: 0, y: 0 }, shake: 0,
    gunfireTimer: 0, shootCooldown: 0, meleeCooldown: 0, muzzle: 0,
    toasts: [], dialogue: null,
    stats: { carsStolen: 0, shotsFired: 0, punches: 0, kills: 0, missionsDone: 0 },
  };
  G.toast = (text) => { G.toasts.push({ text, until: G.time + 4 }); if (G.toasts.length > 4) G.toasts.shift(); };
  return G;
}

let G = newGameState();

function populateWorld() {
  spawnTraffic(G, 14);
  spawnParkedCars(G, 10);
  spawnPeds(G, 30);
  // The player's first ride, parked by the start.
  const car = makeCar(G.player.x + 90, G.player.y + 20, 0, { driver: 'parked', kind: 'sport', color: '#e8b04b', topSpeed: 420 });
  G.cars.push(car);
}

function startNewGame() {
  G = newGameState();
  populateWorld();
  startMission(G, 0);
  G.mode = 'playing';
  audio.ensure(); audio.musicStart();
  hideOverlays();
  document.getElementById('status').textContent = 'Playing Solmar Nights.';
}

function continueGame() {
  const d = loadGame();
  G = newGameState();
  populateWorld();
  if (d) {
    G.money = d.money;
    G.player.health = d.health;
    G.player.x = d.x; G.player.y = d.y;
    G.stats = { ...G.stats, ...d.stats };
    startMission(G, Math.min(d.missionIndex, 4));
    G.missionStage = d.missionStage || 0;
  } else {
    startMission(G, 0);
  }
  G.mode = 'playing';
  audio.ensure(); audio.musicStart();
  hideOverlays();
  G.toast('Welcome back to Solmar City.');
}

function hideOverlays() {
  for (const id of ['menu-screen', 'pause-screen', 'end-screen']) {
    document.getElementById(id).classList.add('hidden');
  }
}

function showMenu() {
  G.mode = 'menu';
  hideOverlays();
  document.getElementById('menu-screen').classList.remove('hidden');
  const cont = document.getElementById('btn-continue');
  cont.style.display = hasSave() ? '' : 'none';
}

// ---- Menu buttons ----
document.getElementById('btn-new').addEventListener('click', () => { audio.ensure(); audio.click(); startNewGame(); });
document.getElementById('btn-continue').addEventListener('click', () => { audio.ensure(); audio.click(); continueGame(); });
document.getElementById('btn-resume').addEventListener('click', () => {
  audio.click();
  if (G.mode !== 'paused') return; // Never resume out of dead/busted — use Keep Playing.
  G.mode = 'playing'; hideOverlays();
});
document.getElementById('btn-save').addEventListener('click', () => {
  if (saveGame(G)) { G.toast('Game saved.'); } else { G.toast('Save failed — storage unavailable.'); }
  audio.click();
});
document.getElementById('btn-quit').addEventListener('click', () => { audio.click(); showMenu(); });
document.getElementById('btn-end').addEventListener('click', () => {
  audio.click();
  hideOverlays();
  if (G.mode === 'dead') {
    G.player.health = 100;
    G.player.x = G.city.locations.playerStart.x;
    G.player.y = G.city.locations.playerStart.y;
    if (G.player.car) { G.player.car.driver = 'parked'; G.player.car = null; G.player.onFoot = true; }
    G.wanted = 0; audio.siren(false);
    G.mode = 'playing';
    G.toast('Back on your feet. Solmar is still waiting.');
  } else {
    G.mode = 'playing';
    G.toast('Free roam — the city is yours.');
  }
});
document.getElementById('btn-clear-save').addEventListener('click', () => { clearSave(); showMenu(); });
canvas.addEventListener('mousedown', () => audio.ensure());

// ---- Screenshot staging ----
function stageShot(name) {
  G = newGameState();
  populateWorld();
  hideOverlays();
  G.mode = 'playing';
  if (name === 'cover') {
    startMission(G, 0);
    const car = makeCar(1400, 1000, 0, { driver: 'player', owner: 'player', kind: 'sport', color: '#e8b04b', topSpeed: 420 });
    G.cars.push(car);
    G.player.onFoot = false; G.player.car = car; G.player.x = car.x; G.player.y = car.y;
    car.speed = 240;
    G.money = 1250;
  } else if (name === 'foot') {
    startMission(G, 1);
    G.player.x = 1780; G.player.y = 1330;
    for (let i = 0; i < 6; i++) {
      G.peds.push({ x: 1780 + (i - 3) * 46, y: 1420 + (i % 2) * 30, angle: 0, speed: 40, color: ['#e07a5f', '#81b29a', '#f2cc8f'][i % 3], state: 'walk', tx: 0, ty: 0, wait: 2, flee: false, fleeTimer: 0, walkPhase: i });
    }
    G.money = 450;
  } else if (name === 'chase') {
    startMission(G, 3);
    G.missionStage = 0;
    const car = makeCar(1400, 1400, -Math.PI / 2, { driver: 'player', owner: 'player', kind: 'sport', color: '#d64545', topSpeed: 420 });
    G.cars.push(car);
    G.player.onFoot = false; G.player.car = car; G.player.x = car.x; G.player.y = car.y;
    car.speed = 300;
    wantedUp(G, 3, 'the package job');
    G.money = 2150;
  } else if (name === 'combat') {
    startMission(G, 2);
    G.missionStage = 1;
    G.missionKills = 0;
    G.player.x = 2560; G.player.y = 1740;
    const wh = G.city.locations.warehouse;
    for (let i = 0; i < 3; i++) spawnEnemy(G, wh.x + (i - 1) * 90, wh.y + 60, { name: 'Vulture' });
    G.money = 950;
  }
  G.camera.x = Math.max(0, Math.min(WORLD_W - canvas.width, G.player.x - canvas.width / 2));
  G.camera.y = Math.max(0, Math.min(WORLD_H - canvas.height, G.player.y - canvas.height / 2));
  // Staged driving shots keep the throttle down so the car is moving, not parked.
  G.shotAuto = (name === 'cover' || name === 'chase') ? 'drive' : null;
  window.__shotReady = false;
  setTimeout(() => { window.__shotReady = true; }, 2600);
}

// ---- The loop ----
let last = performance.now();
let accumulator = 0;
let lastKills = 0;

function step(dt) {
  if (G.mode !== 'playing') return;
  G.time += dt;
  G.shootCooldown = Math.max(0, G.shootCooldown - dt);
  G.meleeCooldown = Math.max(0, G.meleeCooldown - dt);
  G.muzzle = Math.max(0, G.muzzle - dt);
  G.gunfireTimer = Math.max(0, G.gunfireTimer - dt);
  G.shake = Math.max(0, G.shake - dt * 18);
  G.toasts = G.toasts.filter((t) => G.time < t.until);

  updatePlayer(G, dt, input, isDown);
  updateTraffic(G, dt);
  updatePeds(G, dt);
  updatePolice(G, dt);
  updateBullets(G, dt);
  updateEnemies(G, dt);
  updateParticles(G, dt);
  updateMissions(G, dt);

  // A kill during a combat stage counts toward the objective.
  if (G.stats.kills > lastKills) { noteKill(G); lastKills = G.stats.kills; }

  // Camera follows the player with a little shake.
  const vw = canvas.width, vh = canvas.height;
  const tx = Math.max(0, Math.min(WORLD_W - vw, G.player.x - vw / 2));
  const ty = Math.max(0, Math.min(WORLD_H - vh, G.player.y - vh / 2));
  G.camera.x += (tx - G.camera.x) * Math.min(1, dt * 5);
  G.camera.y += (ty - G.camera.y) * Math.min(1, dt * 5);
  if (G.shake > 0) {
    G.camera.x += (Math.random() - 0.5) * G.shake;
    G.camera.y += (Math.random() - 0.5) * G.shake;
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  accumulator += Math.min((now - last) / 1000, MAX_FRAME);
  last = now;
  if (G.mode === 'playing') {
    // Staged screenshot driving: hold the throttle so the car stays moving.
    if (G.shotAuto === 'drive') input.keys.KeyW = true;
    // Edge-triggered actions.
    if (pressed(input, 'KeyE')) {
      if (G.player.onFoot) { const car = nearestCar(G, 70); if (car) enterCar(G, car); }
      else exitCar(G);
    }
    if (pressed(input, 'KeyF')) melee(G);
    if (pressed(input, 'KeyJ')) shoot(G);
    if (pressed(input, 'KeyH')) { if (saveGame(G)) G.toast('Game saved.'); }
    if (pressed(input, 'KeyM')) { audio.setMuted(!audio.muted); G.toast(audio.muted ? 'Sound off.' : 'Sound on.'); }
    if (pressed(input, 'KeyP') || pressed(input, 'Escape')) {
      G.mode = 'paused';
      document.getElementById('pause-screen').classList.remove('hidden');
    }
    if (input.mouse.clicked) shoot(G);
    while (accumulator >= STEP) { step(STEP); accumulator -= STEP; }
  } else {
    accumulator = 0;
  }
  endFrameInput(input);
  draw();
}

function draw() {
  const cw = canvas.width, ch = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // Sunset sky backdrop behind the world edges.
  const grad = ctx.createLinearGradient(0, 0, 0, ch);
  grad.addColorStop(0, '#ff9e5e');
  grad.addColorStop(1, '#5d3a6e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cw, ch);
  if (G.mode === 'menu') {
    // A slow pan over the city behind the menu.
    const t = G.time + performance.now() / 1000;
    G.camera.x = 700 + Math.sin(t * 0.05) * 500;
    G.camera.y = 500 + Math.cos(t * 0.04) * 300;
    drawWorld(ctx, G, cw, ch);
    return;
  }
  drawWorld(ctx, G, cw, ch);
  if (G.mode === 'playing' || G.mode === 'paused' || G.mode === 'busted' || G.mode === 'dead' || G.mode === 'complete') {
    drawHUD(ctx, G, cw, ch);
    drawMinimap(ctx, G, cw, ch);
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.mode === 'playing') {
    G.mode = 'paused';
    document.getElementById('pause-screen').classList.remove('hidden');
  }
});

// Debug / playtest handle: the CDP playtest drives the game through this.
window.__game = {
  G: () => G,
  state: () => ({
    mode: G.mode, x: Math.round(G.player.x), y: Math.round(G.player.y),
    onFoot: G.player.onFoot, health: Math.round(G.player.health),
    money: G.money, wanted: G.wanted, missionIndex: G.missionIndex,
    missionStage: G.missionStage, cars: G.cars.length, peds: G.peds.length,
    cops: G.cops.length, enemies: G.enemies.length,
    carSpeed: G.player.car ? Math.round(G.player.car.speed) : 0,
    stats: { ...G.stats },
  }),
  start: () => startNewGame(),
  teleport: (x, y) => { G.player.x = x; G.player.y = y; if (G.player.car) { G.player.car.x = x; G.player.car.y = y; } },
  setWanted: (n) => { G.wanted = n; if (n > 0) audio.siren(true); },
  setMission: (i, s) => startMission(G, i),
  damage: (n) => damagePlayer(G, n),
  save: () => saveGame(G),
  errors: [],
};
window.addEventListener('error', (e) => { window.__game.errors.push(String(e.message)); });
window.addEventListener('unhandledrejection', (e) => { window.__game.errors.push('rejection: ' + String(e.reason)); });

if (shotName) {
  stageShot(shotName);
  // In shot mode the world still ticks so police, traffic and peds are alive.
  requestAnimationFrame(frame);
} else {
  populateWorld();
  showMenu();
  requestAnimationFrame(frame);
}
window.__solmarReady = true;
