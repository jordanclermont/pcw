/* ============================================================
   PCW — wrestler.js
   The performer state machine. Physics are identical for worked
   and shoot actions — the SCRIPT decides what each outcome means.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;

  const S = {
    IDLE: "IDLE", MOVE: "MOVE", RUN: "RUN", STRIKE: "STRIKE",
    GRAPPLE_STARTUP: "GRAPPLE_STARTUP", SLAM: "SLAM", ARM_DRAG: "ARM_DRAG",
    DOWN: "DOWN", GETUP: "GETUP", HITSTUN: "HITSTUN", SELL: "SELL", WHIFF: "WHIFF",
    PINNING: "PINNING", PINNED: "PINNED",
    // the top-rope superplex chain (attacker climbs, receiver waits below/atop)
    SPX_CLIMB: "SPX_CLIMB", SPX_TOP: "SPX_TOP", SPX_THROW: "SPX_THROW",
    SPX_WAIT: "SPX_WAIT", SPX_RECEIVE: "SPX_RECEIVE"
  };
  const BUSY = new Set([
    S.STRIKE, S.GRAPPLE_STARTUP, S.SLAM, S.ARM_DRAG, S.DOWN, S.GETUP,
    S.HITSTUN, S.SELL, S.WHIFF, S.PINNING, S.PINNED,
    S.SPX_CLIMB, S.SPX_TOP, S.SPX_THROW, S.SPX_WAIT, S.SPX_RECEIVE
  ]);

  class Wrestler {
    constructor(persona) {
      this.persona = persona;
      this.id = persona.id;
      this.name = persona.name;
      this.short = persona.short;
      this.role = persona.role;         // "face" | "heel"
      this.accent = persona.accent;
      this.accent2 = persona.accent2;
      this.build = persona.build;       // "slab" | "lean"
      this.head = persona.head;
      this.gx = persona.start.gx;
      this.gy = persona.start.gy;
      this.body = 100;
      this.state = S.IDLE;
      this.stateFrame = 0;
      this.facing = 1;
      this.downTime = PCW.FRAMES.DOWN;
    }
    setState(s) {
      if (this.state !== s) PCW.log(this.short + ": " + this.state + " → " + s);
      this.state = s; this.stateFrame = 0;
    }
    busy() { return BUSY.has(this.state); }
    distTo(o) { return Math.hypot(this.gx - o.gx, this.gy - o.gy); }
    hurt(v) {
      this.body = Math.max(0, this.body - v);
      const m = PCW.G.match;
      if (this.body === 0 && m && m.phase === "MATCH") PCW.matchEnd("INJURY", this);
    }
  }

  PCW.S = S;
  PCW.BUSY = BUSY;
  PCW.Wrestler = Wrestler;
})();
