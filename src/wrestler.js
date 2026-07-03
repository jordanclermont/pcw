/* ============================================================
   PCW — wrestler.js  (v0.06: momentum model)
   The performer state machine. v0.06 replaces the old teleporty
   grid-step with real momentum locomotion (velocity + friction),
   ported from the movement prototype, while keeping every field the
   crowd / planning / render systems already read (id, role, accent,
   build, body). Physics are identical for worked and shoot actions —
   the SCRIPT decides what each outcome MEANS.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;

  const S = {
    /* free locomotion — the player controls acceleration in these */
    IDLE: "IDLE", WALK: "WALK", RUN: "RUN",
    /* the collar-and-elbow tie-up: A controls, B receives */
    TIEUP_A: "TIEUP_A", TIEUP_B: "TIEUP_B",
    /* the Irish whip: WHIP is the thrower, WHIPPED is the launched man */
    WHIP: "WHIP", WHIPPED: "WHIPPED", REBOUND: "REBOUND",
    /* strikes + collisions */
    STRIKE: "STRIKE", CLOTHESLINE: "CLOTHESLINE",
    SLAM: "SLAM", LIFTED: "LIFTED", ARM_DRAG: "ARM_DRAG",
    SELL: "SELL", HITSTUN: "HITSTUN", BUMP: "BUMP",
    /* positions + downs */
    CORNER: "CORNER", DOWN: "DOWN", GETUP: "GETUP", WHIFF: "WHIFF",
    TAUNT: "TAUNT",
    /* the pin */
    PINNING: "PINNING", PINNED: "PINNED",
    /* the top-rope superplex chain */
    SPX_CLIMB: "SPX_CLIMB", SPX_TOP: "SPX_TOP", SPX_THROW: "SPX_THROW",
    SPX_WAIT: "SPX_WAIT", SPX_RECEIVE: "SPX_RECEIVE"
  };

  /* the three FREE states — everything else is "busy" (can't start a
     new action). WHIPPED / REBOUND are busy for input purposes but the
     engine special-cases a strike out of them (the clothesline). */
  const FREE = new Set([S.IDLE, S.WALK, S.RUN]);
  const BUSY = new Set(Object.values(S).filter(s => !FREE.has(s)));

  /* locomotion churn (IDLE↔WALK↔RUN and the whip/rebound momentum
     states) must NOT spam the backstage log — it turns over every few
     frames. Only transitions INTO a meaningful worked/shoot state log. */
  const QUIET = new Set([S.IDLE, S.WALK, S.RUN, S.WHIPPED, S.REBOUND]);

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
      this.finisher = persona.finisher;
      this.gx = persona.start.gx;
      this.gy = persona.start.gy;
      this.vx = 0; this.vy = 0;         // momentum (grid units / tick)
      this.gait = 0;                    // run-cycle phase, advanced by the renderer/logic
      this.facing = 1;                  // +1 screen-right, -1 screen-left
      this.body = 100;
      this.state = S.IDLE;
      this.stateFrame = 0;
      this.downTime = PCW.FRAMES.DOWN;
      /* transient move bookkeeping */
      this.grabTarget = null;           // the other man in a tie-up
      this.whipFrom = null;             // who whipped me (for rebound credit)
      this.bounces = 0;                 // rope rebounds this launch
      this.bumpSpin = 1;                // clothesline/superplex spin direction
      this.cornerIndex = -1;            // which corner he's stunned in
      this.cornerAimed = false;         // this whip was aimed at a corner (for capture/miss feedback)
      this.sellExpect = 0;              // how long a good sell of the last bump should last (frames)
      this.wronged = false;             // sandbagged/no-sold on — a receipt is owed (retaliation primed)
      this.aiCooldown = 0;              // CPU pacing: frames until it may start its next offensive move
    }
    setState(s) {
      if (this.state === s) return;
      if (!QUIET.has(s)) PCW.log(this.short + ": " + this.state + " → " + s);
      this.state = s; this.stateFrame = 0;
    }
    busy() { return BUSY.has(this.state); }
    free() { return FREE.has(this.state); }
    speed() { return Math.hypot(this.vx, this.vy); }
    stop() { this.vx = 0; this.vy = 0; }
    distTo(o) { return Math.hypot(this.gx - o.gx, this.gy - o.gy); }
    hurt(v) {
      this.body = Math.max(0, this.body - v);
      const m = PCW.G.match;
      if (this.body === 0 && m && m.phase === "MATCH") PCW.matchEnd("INJURY", this);
    }
  }

  PCW.S = S;
  PCW.FREE = FREE;
  PCW.BUSY = BUSY;
  PCW.Wrestler = Wrestler;
})();
