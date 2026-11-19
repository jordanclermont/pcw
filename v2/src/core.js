/* ============================================================
   v2 — src/core.js
   Shared numbers, a seedable random, and the two key pads.
   Every timing below is in LOGIC FRAMES (fixed 60 per second).
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW = window.PCW || {};

  PCW.W = 1280; PCW.H = 720;

  /* THE RING, seen from the hard camera: a square with depth.
     x = left/right along the camera side, z = depth (0 = the ropes nearest
     the camera, D = the far ropes), y = height off the mat.
     LO/HI are the rope lines in x. Men stay PAD inside the ropes. */
  PCW.RING = { LO: 240, HI: 1040, D: 520, PAD: 26, CX: 640, ROPES: [58, 105, 152] };

  /* the camera: one-point perspective. Things further back are smaller and higher. */
  const CAM = { NEAR_Y: 630, HORIZON: 30, FAR_SCALE: 0.76 };
  CAM.C = (1 / CAM.FAR_SCALE - 1) / PCW.RING.D;
  PCW.CAM = CAM;
  PCW.proj = function (x, z, h) {
    const s = 1 / (1 + z * CAM.C);
    return { x: PCW.RING.CX + (x - PCW.RING.CX) * s, y: CAM.HORIZON + (CAM.NEAR_Y - CAM.HORIZON) * s - (h || 0) * s, s };
  };
  /* how far apart two men are. Depth counts for more, so "in range" also means "lined up". */
  PCW.dist = (a, b) => Math.hypot(a.x - b.x, (a.z - b.z) * 1.5);

  PCW.MOVE = {
    ACC: 0.55, FRIC: 0.72, VMAX: 3.4,     // walking
    GAP: 62, GAP_Z: 34,                   // how close two standing men can get
    STRIKE_RANGE: 112, TIE_RANGE: 150, COVER_RANGE: 140, STOMP_RANGE: 116,
    WHIP_V: 7,                            // speed of a man sent to the ropes
    CLOTH_AT: 210, MEET: 92               // the arm comes up when he is this close; contact at MEET
  };

  PCW.F = {
    STRIKE_HIT: 13, STRIKE_END: 28,
    SELL_WINDOW: 48, SELL_CRISP: 16, SELL_LEN: 36,   // you have 0.8 s to sell a chop; holding the key sells at once
    REV_OPEN: 10, REV_CLOSE: 46,          // the other man's window to reverse the lock-up
    TIE_SETTLE: 50,                       // the man in control can't act before this
    TIE_HOLD: 230,
    WHIP_GRACE: 5,                        // frames to add a second direction (for a corner)
    CORNER: 115,                          // how long a man hangs in the corner after hitting the buckles
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
    corner:      { name: "INTO THE CORNER", size: 1.6 },
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

  /* ---- pads ----
     One person playing gets the whole keyboard: WASD or the arrows to move,
     J K L (or F G H) to act, Space (or Enter) to go with it.
     Two people split it: Stove = WASD + F G H + Space, The Boulder = arrows + J K L + Enter. */
  const MOVE_L = { KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right" };
  const MOVE_R = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
  const ACT_L = { KeyF: "strike", KeyG: "grab", KeyH: "taunt", Space: "give" };
  const ACT_R = { KeyJ: "strike", KeyK: "grab", KeyL: "taunt", Enter: "give" };
  const SOLO = Object.assign({}, MOVE_L, MOVE_R, ACT_L, ACT_R);
  const SPLIT = { stove: Object.assign({}, MOVE_L, ACT_L), boulder: Object.assign({}, MOVE_R, ACT_R) };

  class Pad {
    constructor(id) { this.id = id; this.held = {}; this.just = {}; this.cpu = false; this.aiAx = 0; this.aiAz = 0; this.aiWhip = null; }
    axis() { return this.cpu ? this.aiAx : (this.held.right ? 1 : 0) - (this.held.left ? 1 : 0); }
    axisZ() { return this.cpu ? this.aiAz : (this.held.up ? 1 : 0) - (this.held.down ? 1 : 0); }   // up = away from the camera
    giving() { return !!(this.held.give || this.just.give); }
    clear() { this.just = {}; }
  }
  PCW.Pad = Pad;
  PCW.pads = { stove: new Pad("stove"), boulder: new Pad("boulder") };
  PCW.pads.boulder.cpu = true;            // solo by default: you are STOVE HOT

  const humans = () => ["stove", "boulder"].filter(id => !PCW.pads[id].cpu);
  /* which pad button (if any) a key means right now */
  function route(code) {
    const h = humans();
    if (h.length === 1) return SOLO[code] ? [[h[0], SOLO[code]]] : [];
    return h.filter(id => SPLIT[id][code]).map(id => [id, SPLIT[id][code]]);
  }
  /* the key names to print in cues and on the cards */
  PCW.keyLabels = function (id) {
    if (humans().length === 2) {
      return id === "stove" ? { strike: "F", grab: "G", taunt: "H", give: "SPACE", dir: "WASD" }
        : { strike: "J", grab: "K", taunt: "L", give: "ENTER", dir: "ARROWS" };
    }
    return { strike: "J", grab: "K", taunt: "L", give: "SPACE", dir: "WASD" };
  };

  PCW.bindKeys = function (onGlobal) {
    window.addEventListener("keydown", e => {
      let used = false;
      for (const [id, b] of route(e.code)) {
        used = true;
        const pad = PCW.pads[id];
        if (!e.repeat) pad.just[b] = true;
        pad.held[b] = true;
      }
      if (!e.repeat && onGlobal(e.code)) used = true;
      if (used || e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
    });
    window.addEventListener("keyup", e => {
      const two = humans().length === 2;
      for (const id of ["stove", "boulder"]) {
        const b = two ? SPLIT[id][e.code] : SOLO[e.code];
        if (b) PCW.pads[id].held[b] = false;
      }
    });
  };
})();
