/* ============================================================
   v2 — src/core.js
   Shared numbers, a seedable random, and the two key pads.
   Every timing below is in LOGIC FRAMES (fixed 60 per second).
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW = window.PCW || {};

  PCW.W = 1280; PCW.H = 720;

  /* the ring, seen from the hard camera (side-on) */
  PCW.RING = { LO: 240, HI: 1040, POST_L: 180, POST_R: 1100, FLOOR: 598 };

  PCW.MOVE = {
    ACC: 0.55, FRIC: 0.72, VMAX: 3.4,     // walking
    GAP: 62,                              // how close two standing men can get
    STRIKE_RANGE: 108, TIE_RANGE: 100, COVER_RANGE: 135, STOMP_RANGE: 112,
    WHIP_V: 8.5                           // speed of a man sent to the ropes
  };

  PCW.F = {
    STRIKE_HIT: 11, STRIKE_END: 26,
    SELL_WINDOW: 26, SELL_CRISP: 14, SELL_LEN: 36,
    TIE_SETTLE: 26,                       // the man in control can't act before this
    REV_OPEN: 6, REV_CLOSE: 22,           // the other man's window to reverse the lock-up
    TIE_HOLD: 170,
    GETUP: 36, TAUNT_LEN: 66, TAUNT_AT: 10,
    COUNT: 54,                            // frames between the referee's counts
    POSE_WINDOW: 170,                     // a taunt this soon after your own move is a "pose"
    CLOTH_HOLD: 44
  };

  /* how long a GOOD sell of each bump lasts, and how big the picture is */
  PCW.MOVES = {
    strike:      { name: "CHOP",            size: 1 },
    stomp:       { name: "STOMP",           size: 1 },
    armdrag:     { name: "ARM DRAG",        size: 2,   sell: 80 },
    slam:        { name: "BODY SLAM",       size: 2,   sell: 150, lift: 22, hold: 12, drop: 7, peak: 118, rot: 90 },
    tackle:      { name: "SHOULDER TACKLE", size: 2,   sell: 110 },
    clothesline: { name: "CLOTHESLINE",     size: 2.4, sell: 130 },
    landslide:   { name: "THE LANDSLIDE",   size: 4,   sell: 260, lift: 34, hold: 12, drop: 8, peak: 96, rot: 68 },
    burner:      { name: "THE FRONT BURNER", size: 4,  sell: 260, kick: 12, turn: 26, impact: 35 }
  };

  PCW.TRUST = { SOLD: 1, CLEAN: 2, MISSED_SELL: -4, NO_SELL: -10, FINISH_KICKOUT: -30 };

  PCW.RATING = { HEAT_W: 0.6, PER_STAR: 20, CLEAN: 0.25, TRUST: 0.25, FLAT: -0.5 };

  /* ---- seedable random (so a CPU match can be replayed exactly) ---- */
  let seed = (Date.now() >>> 0) || 1;
  PCW.seed = s => { seed = (s >>> 0) || 1; };
  PCW.rnd = () => {
    seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0;
    return seed / 4294967296;
  };
  PCW.pick = arr => arr[Math.floor(PCW.rnd() * arr.length)];
  PCW.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  PCW.lerp = (a, b, t) => a + (b - a) * t;

  /* ---- pads ---- */
  PCW.KEYMAP = {
    stove:   { KeyA: "left", KeyD: "right", KeyF: "strike", KeyG: "grab", KeyT: "work", KeyH: "taunt" },
    boulder: { ArrowLeft: "left", ArrowRight: "right", KeyJ: "strike", KeyK: "grab", KeyI: "work", KeyL: "taunt" }
  };
  PCW.KEYLABEL = {
    stove:   { strike: "F", grab: "G", work: "T", taunt: "H", dir: "A/D" },
    boulder: { strike: "J", grab: "K", work: "I", taunt: "L", dir: "LEFT/RIGHT" }
  };

  class Pad {
    constructor(id) { this.id = id; this.held = {}; this.just = {}; this.cpu = false; this.aiAx = 0; }
    axis() { return this.cpu ? this.aiAx : (this.held.right ? 1 : 0) - (this.held.left ? 1 : 0); }
    clear() { this.just = {}; }
  }
  PCW.Pad = Pad;
  PCW.pads = { stove: new Pad("stove"), boulder: new Pad("boulder") };
  PCW.pads.boulder.cpu = true;            // solo by default: you are STOVE HOT

  PCW.bindKeys = function (onGlobal) {
    window.addEventListener("keydown", e => {
      let used = false;
      for (const id of ["stove", "boulder"]) {
        const b = PCW.KEYMAP[id][e.code];
        if (!b) continue;
        used = true;
        const pad = PCW.pads[id];
        if (pad.cpu) continue;
        if (!e.repeat) pad.just[b] = true;
        pad.held[b] = true;
      }
      if (!e.repeat && onGlobal(e.code)) used = true;
      if (used || e.code === "Space") e.preventDefault();
    });
    window.addEventListener("keyup", e => {
      for (const id of ["stove", "boulder"]) {
        const b = PCW.KEYMAP[id][e.code];
        if (b) PCW.pads[id].held[b] = false;
      }
    });
  };
})();
