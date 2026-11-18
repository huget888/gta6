// missions.js — the story of Solmar Nights: a five-job chain with dialogue,
// objectives, a marker on the map and a payout for every job.
// One clear job: run the missions.
import { spawnEnemy } from './combat.js';
import { wantedUp } from './police.js';
import { saveGame } from './save.js';

export const MISSIONS = [
  {
    id: 'first-wheels',
    title: 'Job 1 — First Wheels',
    giver: 'Rico',
    briefing: 'Rico: "Kid, you need wheels before you need anything. Grab any car on the street and bring it to my garage."',
    reward: 150,
    stages: [
      { text: 'Steal a car — press E next to any car', done: (G) => !G.player.onFoot },
      { text: "Drive to Rico's Garage", marker: 'garage', done: (G) => near(G, 'garage', 90) },
    ],
  },
  {
    id: 'the-pickup',
    title: 'Job 2 — The Pickup',
    giver: 'Rico',
    briefing: 'Rico: "A friend left a package at Beacon Plaza. Pick it up, then drop it at the harbor. No questions, no stops."',
    reward: 300,
    stages: [
      { text: 'Meet the contact at Beacon Plaza', marker: 'contact', done: (G) => near(G, 'contact', 80) },
      { text: 'Deliver the package to the Harbor drop-off', marker: 'dropoff', done: (G) => near(G, 'dropoff', 90) },
    ],
  },
  {
    id: 'payback',
    title: 'Job 3 — Payback',
    giver: 'Mara',
    briefing: 'Mara: "The Vultures jumped my brother at the harbor warehouse. Three of them. Make them regret it — fists or pistol, your call."',
    reward: 500,
    stages: [
      { text: 'Go to the Harbor warehouse', marker: 'warehouse', done: (G) => near(G, 'warehouse', 130) },
      { text: 'Deal with the Vultures (0/3)', spawn: true, done: (G) => G.missionKills >= 3 },
    ],
  },
  {
    id: 'hot-pursuit',
    title: 'Job 4 — Hot Pursuit',
    giver: 'Rico',
    briefing: 'Rico: "The PD put a price on that package. Lose them, then get to the safehouse. Do NOT get busted."',
    reward: 600,
    stages: [
      { text: 'The cops are coming — survive the heat', heat: true, done: (G) => G.missionTimer > 12 },
      { text: 'Lose the cops and reach the Safehouse', marker: 'safehouse', done: (G) => near(G, 'safehouse', 90) && G.wanted === 0 },
    ],
  },
  {
    id: 'the-big-score',
    title: 'Job 5 — The Big Score',
    giver: 'Mara',
    briefing: 'Mara: "Last one. The Marina vault holds the Vultures’ whole stash. Guards inside. Grab the cash and run to the safehouse — then Solmar is ours."',
    reward: 2500,
    stages: [
      { text: 'Reach the Marina vault', marker: 'marinaVault', done: (G) => near(G, 'marinaVault', 100) },
      { text: 'Take down the vault guards (0/2)', spawn: true, done: (G) => G.missionKills >= 2 },
      { text: 'Grab the cash and escape to the Safehouse', marker: 'safehouse', done: (G) => near(G, 'safehouse', 90) },
    ],
  },
];

function near(G, locKey, dist) {
  const loc = G.city.locations[locKey];
  if (!loc) return false;
  return Math.hypot(G.player.x - loc.x, G.player.y - loc.y) < dist;
}

export function currentMission(G) {
  return MISSIONS[G.missionIndex] || null;
}

export function currentStage(G) {
  const m = currentMission(G);
  return m ? m.stages[G.missionStage] : null;
}

export function missionMarker(G) {
  const s = currentStage(G);
  if (!s || !s.marker) return null;
  const loc = G.city.locations[s.marker];
  return loc ? { x: loc.x, y: loc.y, name: loc.name } : null;
}

export function startMission(G, index) {
  G.missionIndex = index;
  G.missionStage = 0;
  G.missionTimer = 0;
  G.missionKills = 0;
  const m = MISSIONS[index];
  if (!m) return;
  G.dialogue = { name: m.giver, text: m.briefing, until: G.time + 7 };
  G.toast(m.title + ' — ' + m.stages[0].text);
  G.audio.mission();
}

export function updateMissions(G, dt) {
  const m = currentMission(G);
  if (!m) return;
  G.missionTimer += dt;
  const s = m.stages[G.missionStage];
  if (!s) return;
  // Stage entry hooks: spawn rivals, raise the heat.
  if (!s.entered) {
    s.entered = true;
    G.missionKills = 0;
    if (s.spawn) {
      const loc = G.city.locations[m.id === 'the-big-score' ? 'marinaVault' : 'warehouse'];
      const count = m.id === 'the-big-score' ? 2 : 3;
      for (let i = 0; i < count; i++) {
        spawnEnemy(G, loc.x + (Math.random() - 0.5) * 160, loc.y + (Math.random() - 0.5) * 160, { name: 'Vulture' });
      }
      G.toast('Rivals incoming — watch your back.');
    }
    if (s.heat) {
      // Raise the heat to 2, but never above what the scene already has.
      wantedUp(G, Math.max(0, 2 - G.wanted), 'the package job');
      G.toast('Wanted level ' + G.wanted + ' — lose the cops!');
    }
  }
  // Track kills for combat stages (baseText keeps a fresh game from showing a stale count).
  if (s.spawn) {
    if (!s.baseText) s.baseText = s.text;
    const total = m.id === 'the-big-score' ? 2 : 3;
    s.text = s.baseText.replace(/\(\d+\/\d+\)/, '(' + Math.min(G.missionKills, total) + '/' + total + ')');
  }
  if (s.done(G)) {
    G.missionStage++;
    G.audio.pickup();
    if (G.missionStage >= m.stages.length) {
      completeMission(G, m);
    } else {
      G.toast('Objective done — ' + m.stages[G.missionStage].text);
    }
  }
}

// Count a kill toward the current combat stage.
export function noteKill(G) {
  const m = currentMission(G);
  if (!m) return;
  const s = m.stages[G.missionStage];
  if (s && s.spawn) G.missionKills++;
}

export function completeMission(G, m) {
  G.money += m.reward;
  G.stats.missionsDone++;
  G.toast(m.title + ' complete! +$' + m.reward);
  G.dialogue = { name: m.giver, text: 'Job done. $' + m.reward + ' is yours. ' + (G.missionIndex + 1 < MISSIONS.length ? 'Next job is waiting.' : 'Solmar is yours, kid.'), until: G.time + 6 };
  G.audio.mission();
  saveGame(G);
  if (G.missionIndex + 1 < MISSIONS.length) {
    startMission(G, G.missionIndex + 1);
  } else {
    G.mode = 'complete';
    const el = document.getElementById('end-screen');
    if (el) {
      document.getElementById('end-title').textContent = 'SOLMAR IS YOURS';
      document.getElementById('end-text').textContent = 'Every job done. $' + G.money + ' in your pocket and the whole city behind you. Play on in free roam, or start a new story.';
      el.classList.remove('hidden');
    }
  }
}
