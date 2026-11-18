// audio.js — all sound is synthesized with WebAudio. No audio files, no network.
// One clear job: effects and a small procedural music loop.
export function createAudio() {
  const A = {
    ctx: null, master: null, muted: false, musicTimer: null, sirenNodes: null,
    engineNodes: null, musicStep: 0,
  };

  A.ensure = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      A.ctx = new Ctx();
      A.master = A.ctx.createGain();
      A.master.gain.value = 0.35;
      A.master.connect(A.ctx.destination);
    } catch (e) { A.ctx = null; }
  };

  function tone(freq, dur, type, vol, slideTo) {
    if (!A.ctx || A.muted) return;
    const t = A.ctx.currentTime;
    const o = A.ctx.createOscillator();
    const g = A.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(A.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    if (!A.ctx || A.muted) return;
    const t = A.ctx.currentTime;
    const len = Math.floor(A.ctx.sampleRate * dur);
    const buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = A.ctx.createBufferSource();
    src.buffer = buf;
    const f = A.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = filterFreq || 1200;
    const g = A.ctx.createGain();
    g.gain.setValueAtTime(vol || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(A.master);
    src.start(t);
  }

  A.click = () => tone(660, 0.06, 'square', 0.12);
  A.shoot = () => { noise(0.12, 0.5, 2600); tone(180, 0.08, 'square', 0.18, 60); };
  A.punch = () => { noise(0.08, 0.35, 500); tone(120, 0.08, 'sine', 0.25, 50); };
  A.pickup = () => { tone(880, 0.1, 'sine', 0.2); setTimeout(() => tone(1320, 0.14, 'sine', 0.2), 90); };
  A.mission = () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.22), i * 110)); };
  A.busted = () => { [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.15), i * 180)); };
  A.crash = () => { noise(0.25, 0.4, 700); };
  A.steal = () => { tone(300, 0.12, 'square', 0.15, 520); };

  A.siren = function (on) {
    if (!A.ctx) return;
    if (on && !A.sirenNodes) {
      const o = A.ctx.createOscillator();
      const g = A.ctx.createGain();
      o.type = 'sine'; o.frequency.value = 700;
      g.gain.value = A.muted ? 0 : 0.05;
      const lfo = A.ctx.createOscillator();
      const lg = A.ctx.createGain();
      lfo.frequency.value = 0.8; lg.gain.value = 260;
      lfo.connect(lg); lg.connect(o.frequency);
      o.connect(g); g.connect(A.master);
      o.start(); lfo.start();
      A.sirenNodes = { o, lfo, g };
    } else if (!on && A.sirenNodes) {
      try { A.sirenNodes.o.stop(); A.sirenNodes.lfo.stop(); } catch (e) {}
      A.sirenNodes = null;
    }
  };

  A.engine = function (level) {
    if (!A.ctx) return;
    if (!A.engineNodes) {
      const o = A.ctx.createOscillator();
      const g = A.ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = 60;
      g.gain.value = 0;
      const f = A.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 400;
      o.connect(f); f.connect(g); g.connect(A.master);
      o.start();
      A.engineNodes = { o, g };
    }
    const n = A.engineNodes;
    n.o.frequency.setTargetAtTime(55 + level * 130, A.ctx.currentTime, 0.08);
    n.g.gain.setTargetAtTime(A.muted ? 0 : 0.02 + level * 0.05, A.ctx.currentTime, 0.1);
  };

  A.setMuted = function (m) {
    A.muted = m;
    if (A.master) A.master.gain.value = m ? 0 : 0.35;
    if (A.sirenNodes) A.sirenNodes.g.gain.value = m ? 0 : 0.05;
  };

  // Looping sunset groove: a bass line + sparse plucks, scheduled ahead.
  const BASS = [110, 0, 110, 0, 130.8, 0, 98, 0, 110, 0, 110, 0, 146.8, 130.8, 98, 0];
  const PLUCK = [440, 0, 523, 0, 0, 659, 0, 523, 440, 0, 392, 0, 523, 0, 659, 784];
  A.musicStart = function () {
    if (!A.ctx || A.musicTimer) return;
    A.musicTimer = setInterval(() => {
      if (A.muted || !A.ctx) return;
      const step = A.musicStep % 16;
      const b = BASS[step], p = PLUCK[step];
      if (b) tone(b, 0.22, 'triangle', 0.16);
      if (p && step % 2 === 0) tone(p, 0.16, 'sine', 0.07);
      if (step === 0) noise(0.05, 0.05, 6000);
      A.musicStep++;
    }, 170);
  };

  return A;
}
