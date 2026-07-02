/* ============================================================
   PCW — input.js
   Two-player keyboard input abstracted as gamepads. Each player
   has one context-sensitive WORK button (Y) — "do your job right
   now": reverse, sell, kick out. Used against the plan, it's a shoot.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;

  const PAD_MAP = {
    p1: { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD", A: "KeyF", B: "KeyG", X: "KeyH", Y: "KeyT" },
    p2: { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", A: "KeyJ", B: "KeyK", X: "KeyL", Y: "KeyI" }
  };

  const keysDown = new Set();
  let pressQueue = [];

  addEventListener("keydown", e => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (!e.repeat) pressQueue.push(e.code);
    keysDown.add(e.code);
  });
  addEventListener("keyup", e => keysDown.delete(e.code));

  class Pad {
    constructor(map) { this.map = map; this.just = {}; }
    beginTick(justSet) {
      for (const b of ["A", "B", "X", "Y", "up", "down", "left", "right"])
        this.just[b] = justSet.has(this.map[b]);
    }
    held(n) { return keysDown.has(this.map[n]); }
    axis() {
      let sx = 0, sy = 0;
      if (this.held("up")) sy -= 1; if (this.held("down")) sy += 1;
      if (this.held("left")) sx -= 1; if (this.held("right")) sx += 1;
      let gx = sx + sy, gy = sy - sx; const m = Math.hypot(gx, gy) || 1;
      return { gx: gx / m * !!(sx || sy), gy: gy / m * !!(sx || sy) };
    }
  }

  PCW.PAD_MAP = PAD_MAP;
  PCW.Pad = Pad;
  /* drain the just-pressed set for this logic tick */
  PCW.drainPresses = function () { const s = new Set(pressQueue); pressQueue = []; return s; };
})();
