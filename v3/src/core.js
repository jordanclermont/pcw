/* ============================================================
   v3 — src/core.js
   Shared numbers, the camera, a seedable random, and input.
   All timing is in LOGIC FRAMES (fixed 60 per second).
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW = window.PCW || {};

  PCW.W = 1280; PCW.H = 720;

  /* THE RING. x = left/right, z = depth (0 = the ropes nearest the camera,
     D = the far ropes), y = height off whatever the man is standing on.
     The floor outside is RH lower than the mat. */
  const R = PCW.RING = { LO: 240, HI: 1040, D: 520, PAD: 26, CX: 640, ROPES: [58, 105, 152], RH: 62, APRON: 34 };
  PCW.BOUNDS = {
    XLO: R.LO + R.PAD, XHI: R.HI - R.PAD, ZLO: R.PAD, ZHI: R.D - R.PAD,
    OX0: 150, OX1: 1130, OZ0: -122, OZ1: -74           // the strip of floor on the camera side
  };

  /* the camera: one-point perspective */
  const CAM = PCW.CAM = { NEAR_Y: 590, HORIZON: 30, FAR_SCALE: 0.76 };
  CAM.C = (1 / CAM.FAR_SCALE - 1) / R.D;
  PCW.proj = function (x, z, h) {
    const s = 1 / (1 + z * CAM.C);
    return { x: R.CX + (x - R.CX) * s, y: CAM.HORIZON + (CAM.NEAR_Y - CAM.HORIZON) * s - (h || 0) * s, s };
  };

  PCW.WALK = { ACC: 0.5, FRIC: 0.74, VMAX: 3.3, GAP: 62, GAP_Z: 34 };
  PCW.REACH = 160;                 // how close you have to be to lay hands on him
  PCW.COUNT = 54;                  // frames between the referee's counts on a pin
  PCW.OUT_COUNT = 115;             // frames between counts when a man is outside

  PCW.TRUST = { SOLD: 1, BIG: 2, NO_SELL: -8, GREEDY: -5, MOVED: -4, FINISH_KICKOUT: -30 };
  PCW.RATING = { HEAT_W: 0.6, PER_STAR: 20, CLEAN: 0.25, TRUST: 0.25, FLAT: -0.5, COUNTOUT: -0.75 };

  /* ---- seedable random ---- */
  let seed = (Date.now() >>> 0) || 1;
  PCW.seed = s => { seed = (s >>> 0) || 1; };
  PCW.rnd = () => {
    seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0;
    return seed / 4294967296;
  };
  PCW.pick = arr => arr[Math.floor(PCW.rnd() * arr.length)];
  PCW.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  PCW.lerp = (a, b, t) => a + (b - a) * t;

  /* ---- input ----
     One person: WASD or the arrows to move, Space or Enter to act.
     Two people: Stove = WASD + Space, The Boulder = arrows + Enter.
     Choices: number keys, or left/right then the act key, or a click. */
  const KEYS_L = { KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right", Space: "act" };
  const KEYS_R = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", Enter: "act" };
  const SOLO = Object.assign({}, KEYS_L, KEYS_R);
  const SPLIT = { stove: KEYS_L, boulder: KEYS_R };

  class Pad {
    constructor(id) { this.id = id; this.held = {}; this.just = {}; this.cpu = false; }
    axis() { return (this.held.right ? 1 : 0) - (this.held.left ? 1 : 0); }
    axisZ() { return (this.held.up ? 1 : 0) - (this.held.down ? 1 : 0); }   // up = away from the camera
    clear() { this.just = {}; }
    reset() { this.held = {}; this.just = {}; }
  }
  PCW.pads = { stove: new Pad("stove"), boulder: new Pad("boulder") };
  PCW.pads.boulder.cpu = true;                  // solo by default: you are STOVE HOT
  PCW.kb = { digit: 0, back: false, click: null };

  const humans = () => ["stove", "boulder"].filter(id => !PCW.pads[id].cpu);
  PCW.humans = humans;
  PCW.keyName = function (id) {
    if (humans().length === 2) return id === "stove" ? { act: "SPACE", move: "WASD" } : { act: "ENTER", move: "ARROWS" };
    return { act: "SPACE", move: "WASD" };
  };
  const mapFor = id => (humans().length === 2 ? SPLIT[id] : SOLO);

  PCW.bindInput = function (canvas, onGlobal) {
    window.addEventListener("keydown", e => {
      let used = false;
      for (const id of humans()) {
        const b = mapFor(id)[e.code];
        if (!b) continue;
        used = true;
        if (!e.repeat) PCW.pads[id].just[b] = true;
        PCW.pads[id].held[b] = true;
      }
      if (!e.repeat) {
        const m = /^(Digit|Numpad)([1-9])$/.exec(e.code);
        if (m) { PCW.kb.digit = +m[2]; used = true; }
        if (e.code === "Escape" || e.code === "Backspace") { PCW.kb.back = true; used = true; }
        if (onGlobal(e.code)) used = true;
      }
      if (used || e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
    });
    window.addEventListener("keyup", e => {
      for (const id of ["stove", "boulder"]) {
        const b = mapFor(id)[e.code] || SOLO[e.code];
        if (b) PCW.pads[id].held[b] = false;
      }
    });
    canvas.addEventListener("pointerdown", e => {
      const r = canvas.getBoundingClientRect();
      PCW.kb.click = { x: (e.clientX - r.left) / r.width * PCW.W, y: (e.clientY - r.top) / r.height * PCW.H };
    });
  };
  PCW.clearInput = function () {
    for (const id in PCW.pads) PCW.pads[id].clear();
    PCW.kb.digit = 0; PCW.kb.back = false; PCW.kb.click = null;
  };
})();
