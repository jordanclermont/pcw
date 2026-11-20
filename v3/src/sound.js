/* ============================================================
   v3 — src/sound.js
   Sound, made in code (no audio files): a crowd that gets louder
   with the room, impacts, a bell, a chair. Starts on the first key
   press or click (browsers do not allow sound before that).
   M mutes it.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW = window.PCW || {};
  const AC = window.AudioContext || window.webkitAudioContext;
  const S = PCW.sfx = { on: true, ready: false };
  let ctx = null, master = null, bed = null, bedGain = null, noiseBuf = null;

  const quiet = () => !ctx || !S.on;
  function noise(dur) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = dur === undefined;
    return src;
  }
  S.init = function () {
    if (ctx || !AC) return;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; d[i] = last * 6 + w * 0.15; }   // brownish: a room, not hiss
      // the crowd bed: always there, louder as the room heats up
      bed = noise();
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 520; bp.Q.value = 0.5;
      bedGain = ctx.createGain(); bedGain.gain.value = 0.02;
      bed.connect(bp); bp.connect(bedGain); bedGain.connect(master); bed.start();
      S.ready = true;
    } catch (e) { ctx = null; }
  };
  S.toggle = function () { S.on = !S.on; if (master) master.gain.value = S.on ? 0.5 : 0; return S.on; };
  /* how loud the room is right now (0..100) */
  S.bed = function (heat) {
    if (quiet()) return;
    bedGain.gain.setTargetAtTime(0.015 + 0.16 * Math.pow(heat / 100, 1.4), ctx.currentTime, 0.4);
  };
  function burst(freq, q, peak, attack, decay, type) {
    const src = noise(1), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
    f.type = type || "bandpass"; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    src.connect(f); f.connect(g); g.connect(master); src.start(t, Math.random()); src.stop(t + attack + decay + 0.05);
  }
  function tone(freq, peak, decay, type, slideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + decay);
    g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + decay + 0.05);
  }
  /* a body hitting something. power 0..4 */
  S.hit = function (power) {
    if (quiet()) return;
    if (power <= 1) burst(2200, 0.7, 0.16 + power * 0.1, 0.002, 0.07, "highpass");      // a slap
    if (power >= 1) tone(120 + power * 8, 0.22 + power * 0.1, 0.14 + power * 0.05, "sine", 38);   // the mat
    if (power >= 2) burst(180, 0.6, 0.1 + power * 0.06, 0.004, 0.2);
  };
  /* the room reacting */
  S.crowd = function (kind, mag) {
    if (quiet()) return;
    const m = Math.min(1, mag / 9);
    if (kind === "pop") burst(1250, 0.5, 0.1 + m * 0.3, 0.12, 0.9 + m * 1.2);
    else if (kind === "boo") burst(260, 0.9, 0.12 + m * 0.3, 0.2, 1.1 + m * 1.1);
    else if (kind === "count") burst(900, 1.2, 0.12 + m * 0.2, 0.03, 0.3);
  };
  S.bell = function (n) {
    if (quiet()) return;
    for (let i = 0; i < n; i++) setTimeout(() => { if (quiet()) return; tone(1320, 0.22, 1.3, "sine"); tone(1978, 0.1, 0.9, "sine"); tone(2640, 0.05, 0.5, "triangle"); }, i * 330);
  };
  S.clang = function () {
    if (quiet()) return;
    [523, 811, 1193, 1687, 2411].forEach((f, i) => tone(f, 0.16 - i * 0.02, 0.5 - i * 0.05, "square"));
    burst(3000, 0.4, 0.2, 0.001, 0.12, "highpass");
  };
})();
