// hud.js — the heads-up display and the minimap. One clear job: show the player
// what is going on: health, money, wanted stars, mission, messages and the map.
import { currentMission, currentStage, missionMarker } from './missions.js';

export function drawHUD(ctx, G, cw, ch) {
  const p = G.player;
  // Top-left: health bar + money.
  ctx.save();
  ctx.fillStyle = 'rgba(10,10,16,0.55)';
  roundRect(ctx, 12, 12, 210, 64, 8); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('$' + G.money.toLocaleString('en-US'), 24, 30);
  ctx.fillStyle = '#222';
  roundRect(ctx, 24, 46, 150, 12, 6); ctx.fill();
  ctx.fillStyle = p.health > 50 ? '#57cc5a' : p.health > 25 ? '#f2c14e' : '#e5484d';
  roundRect(ctx, 24, 46, 150 * Math.max(0, p.health / 100), 12, 6); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('HP ' + Math.ceil(p.health), 180, 52);

  // Top-right: wanted stars.
  ctx.fillStyle = 'rgba(10,10,16,0.55)';
  roundRect(ctx, cw - 190, 12, 178, 40, 8); ctx.fill();
  ctx.font = '22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < G.wanted ? '#ffd60a' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', cw - 168 + i * 34, 33);
  }

  // Mission objective, top-centre.
  const m = currentMission(G);
  const s = currentStage(G);
  if (m && s) {
    ctx.fillStyle = 'rgba(10,10,16,0.55)';
    const w = Math.min(520, cw - 460);
    roundRect(ctx, (cw - w) / 2, 12, w, 52, 8); ctx.fill();
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(m.title, cw / 2, 28);
    ctx.fillStyle = '#fff';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(s.text, cw / 2, 48);
  }

  // Dialogue box, bottom-centre.
  if (G.dialogue && G.time < G.dialogue.until) {
    ctx.fillStyle = 'rgba(10,10,16,0.75)';
    const w = Math.min(640, cw - 80);
    roundRect(ctx, (cw - w) / 2, ch - 118, w, 56, 10); ctx.fill();
    ctx.fillStyle = '#ffd60a';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(G.dialogue.name, (cw - w) / 2 + 16, ch - 100);
    ctx.fillStyle = '#fff';
    ctx.font = '13px system-ui, sans-serif';
    wrapText(ctx, G.dialogue.text, (cw - w) / 2 + 16, ch - 80, w - 32, 17);
  }

  // Toasts, bottom-left above the minimap.
  ctx.textAlign = 'left';
  let ty = ch - 210;
  for (let i = G.toasts.length - 1; i >= 0; i--) {
    const t = G.toasts[i];
    ctx.globalAlpha = Math.min(1, t.until - G.time);
    ctx.fillStyle = 'rgba(10,10,16,0.6)';
    const tw = ctx.measureText(t.text).width + 20;
    roundRect(ctx, 12, ty - 14, tw, 24, 6); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(t.text, 22, ty - 1);
    ty -= 30;
  }
  ctx.globalAlpha = 1;

  // Controls hint, bottom-right (fades after the first minute).
  if (G.time < 75) {
    ctx.fillStyle = 'rgba(10,10,16,0.55)';
    roundRect(ctx, cw - 252, ch - 118, 240, 106, 8); ctx.fill();
    ctx.fillStyle = '#ddd';
    ctx.font = '12px system-ui, sans-serif';
    const lines = ['WASD / arrows — move & drive', 'E — steal / enter car', 'Mouse — aim, Click — shoot', 'F — punch    P — pause', 'M — mute    H — save game'];
    lines.forEach((l, i) => ctx.fillText(l, cw - 240, ch - 100 + i * 18));
  }

  // Speed + car name when driving.
  if (!p.onFoot && p.car) {
    ctx.fillStyle = 'rgba(10,10,16,0.55)';
    roundRect(ctx, cw - 252, ch - 158, 240, 32, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(p.car.name + '  •  ' + Math.round(Math.abs(p.car.speed) * 0.32) + ' km/h', cw - 240, ch - 141);
  }

  // Hurt vignette.
  if (p.hurtFlash > 0) {
    ctx.fillStyle = 'rgba(229,72,77,' + (p.hurtFlash * 0.5) + ')';
    ctx.fillRect(0, 0, cw, ch);
  }
  ctx.restore();
}

export function drawMinimap(ctx, G, cw, ch) {
  const size = 168;
  const x0 = 12, y0 = ch - size - 12;
  const scale = size / 3200;
  ctx.save();
  ctx.fillStyle = 'rgba(10,10,16,0.6)';
  roundRect(ctx, x0 - 4, y0 - 4, size + 8, size + 8, 8); ctx.fill();
  ctx.beginPath();
  ctx.rect(x0, y0, size, size);
  ctx.clip();
  // Ground.
  ctx.fillStyle = '#3f6b3a';
  ctx.fillRect(x0, y0, size, size);
  // Roads.
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  for (const rx of G.city.roadsV) {
    ctx.beginPath(); ctx.moveTo(x0 + rx * scale, y0); ctx.lineTo(x0 + rx * scale, y0 + size); ctx.stroke();
  }
  for (const ry of G.city.roadsH) {
    ctx.beginPath(); ctx.moveTo(x0, y0 + ry * scale); ctx.lineTo(x0 + size, y0 + ry * scale); ctx.stroke();
  }
  // Beach strip.
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(x0, y0 + 2280 * scale, size, size - 2280 * scale);
  // Mission marker.
  const mk = missionMarker(G);
  if (mk) {
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath();
    ctx.arc(x0 + mk.x * scale, y0 + mk.y * scale, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  // Police (blue), player (white arrow).
  ctx.fillStyle = '#4aa8ff';
  for (const c of G.cops) {
    ctx.beginPath(); ctx.arc(x0 + c.x * scale, y0 + c.y * scale, 3, 0, Math.PI * 2); ctx.fill();
  }
  const p = G.player;
  ctx.save();
  ctx.translate(x0 + p.x * scale, y0 + p.y * scale);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 - 4, y0 - 4, size + 8, size + 8);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w; yy += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}
