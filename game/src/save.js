// save.js — save and load through localStorage. One clear job: persist progress.
const KEY = 'solmar-nights-save-v1';

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
}

export function saveGame(G) {
  try {
    const data = {
      version: 1,
      money: G.money,
      missionIndex: G.missionIndex,
      missionStage: G.missionStage,
      health: G.player.health,
      x: G.player.x, y: G.player.y,
      stats: G.stats,
      savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d.version !== 1) return null;
    return d;
  } catch (e) { return null; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}
