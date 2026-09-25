/* ============================================================
   PCW — config.js
   Constants, frame timings, iso-grid math, and the shared state
   container. Loaded first: creates the global PCW namespace.
   All game logic runs on a fixed 60 Hz timestep, so every timing
   window below is measured in LOGIC FRAMES, never wall-clock.
   ============================================================ */
(function () {
  "use strict";
  const PCW = (window.PCW = window.PCW || {});

  PCW.VERSION = "0.14";
  PCW.CANVAS = { W: 960, H: 640 };

  /* frame windows (60 Hz logic) */
  PCW.FRAMES = {
    // WINDOW_CLOSE widened (was 9) so a human has a fair chance at the reversal.
    GRAPPLE_STARTUP: 12, WINDOW_OPEN: 4, WINDOW_CLOSE: 16,
    // CPU pacing: a beat between the CPU's offensive moves, and a lock-up hold
    // before it slams — so it performs deliberately instead of rushing.
    AI_PACE: 58, AI_LOCKUP: 24,
    ARM_DRAG: 28, SLAM: 24, DOWN: 110, DOWN_SHORT: 70, GETUP: 26,
    HITSTUN: 16, SELL: 36, SELL_WINDOW: 26,
    WHIFF: 16, STRIKE_TOTAL: 14, STRIKE_ACTIVE_A: 5, STRIKE_ACTIVE_B: 8,
    SPLATTER: 5, HITSTOP: 5, PIN_COUNT: 62,   // slightly slower ref count = more near-fall suspense
    /* the top-rope superplex chain — four beats, each a state with its
       own length and a timed Work-button window inside it (same pattern
       as the grapple reversal). CLIMB has no input; the other three do. */
    SPX_CLIMB: 42,
    // POSITION and THROW WAIT for the required press (they do NOT auto-
    // advance) — pressing in the early window is clean, later is sloppy,
    // and never pressing before the timeout ABORTS the whole spot.
    SPX_POS_OPEN: 8, SPX_POS_CLOSE: 26, SPX_POS_TIMEOUT: 120,
    SPX_THROW_OPEN: 8, SPX_THROW_CLOSE: 24, SPX_THROW_TIMEOUT: 120,
    SPX_LAND_OPEN: 6, SPX_LAND_CLOSE: 22, SPX_LAND_TIMEOUT: 44,
    SPX_RECOVER: 30,
    /* momentum grammar (v0.06 transplant) */
    TIEUP_HOLD: 150,       // how long a tie-up stands before it breaks on its own
    WHIP: 18,              // attacker's whip follow-through
    WHIPPED_MIN: 8,        // min frames a whipped man is committed before he can act
    CLOTHESLINE: 20,       // clothesline swing
    REBOUND_SETTLE: 6,     // frames a rope rebound reads before it becomes a run
    CORNER_STAGGER: 200,   // how long a man stays stunned in the corner
    BUMP: 26,              // a big collision bump before he hits the mat
    TAUNT: 46,             // a taunt pose (play to the crowd)
    /* a grapple slam now has WEIGHT: the attacker locks him up and lifts for
       SLAM_LIFT frames, THEN drives him down with a heavy hit-stop. */
    SLAM_LIFT: 16,         // a normal slam: quick lift, no sandbag window
    SLAM_LIFT_HEAVY: 46,   // a HEAVY move (finisher / spinebuster): slow lift, sandbag window open
    SLAM_HITSTOP: 9        // freeze-frame on the slam impact (weightier than a strike)
  };

  /* body cost per outcome. Worked moves cost a little; botches and
     shoots cost a lot. Body damage is BACKSTAGE truth — the crowd
     never sees it. */
  PCW.BODY = {
    WORKED_STRIKE: 3, WORKED_SLAM: 6, BOTCH_SLAM: 14,
    SHOOT_SLAM: 10, SHOOT_STRIKE: 6, ARM_DRAG: 5
  };

  /* trust cost per betrayal (backstage truth), scaled by severity.
     A stray strike is a minor liberty; dropping someone off-script is
     worse; stealing a pin or kicking out of the finish is the cardinal
     sin. Trust rebuilds by nailing spots — REGAIN — but always slower
     than it's lost (one clean spot won't undo one bad slam). */
  PCW.TRUST = {
    STRIKE: 6,     // unplanned strike / potato
    REVERSAL: 10,  // reversing an uncalled spot
    SLAM: 14,      // dropping someone off-script
    PIN: 16,       // an unplanned pin attempt
    KICKOUT: 30,   // kicking out of the finish — the big one
    STIFF: 8,      // a blown spot that hurt (botch)
    REGAIN: 4      // recovered per cleanly-completed spot
  };

  /* ---------------- isometric grid ----------------
     v0.06 adopts the movement prototype's larger ring (12×12, bigger
     tiles) so momentum locomotion has room to build speed and the ropes
     sit where a running man expects them. */
  PCW.GRID = 12;
  const TILE_W = 64, TILE_H = 32;
  PCW.TILE_W = TILE_W; PCW.TILE_H = TILE_H;
  PCW.ORIGIN = { x: PCW.CANVAS.W / 2, y: 150 };
  PCW.isoX = (gx, gy) => PCW.ORIGIN.x + (gx - gy) * TILE_W / 2;
  PCW.isoY = (gx, gy) => PCW.ORIGIN.y + (gx + gy) * TILE_H / 2;

  /* the ropes are elastic boundaries just inside the grid edge. A man
     runs to them and rebounds; a whip into them sends him bouncing. */
  const ROPE_INSET = 0.7;
  PCW.BOUND_LO = ROPE_INSET;
  PCW.BOUND_HI = PCW.GRID - ROPE_INSET;
  PCW.clampGrid = v => Math.min(PCW.BOUND_HI, Math.max(PCW.BOUND_LO, v));

  /* momentum locomotion — wrestlers accelerate to a walk then a run and
     CARRY velocity (grid units per 60 Hz tick). This is the feel the whole
     transplant is for; everything else (whip, rebound, clothesline) is
     built on it. Tuned on the 12-grid. */
  PCW.MOVE = {
    // v0.11: slower again — the CPU especially was moving too fast to respond to.
    ACC: 0.011, FRIC: 0.78,
    VMAX_WALK: 0.045, VMAX_RUN: 0.10,
    WHIP_V: 0.21,          // launch speed of an Irish whip
    ROPE_KEEP: 0.94,       // fraction of speed kept off a rope rebound
    RUN_THRESHOLD: 0.07,   // speed above which the gait reads as a run
    CLOTHESLINE_MIN: 0.055 // a foe must be charging faster than this to be clotheslined
  };

  /* SELLING — the receiver's performance. After a bump you go DOWN and DON'T
     get up on your own: staying down IS the sell, getting up is a choice, and
     popping up too soon is a NO-SELL (under-selling — reads flat, costs trust).
     (Distinct from a SANDBAG, which is refusing to cooperate DURING a move; see
     the slam lift.) A move's weight sets how long a good sell should last. */
  PCW.SELL = {
    LIGHT: 26,    // a struck bump / minor move
    MED: 72,      // a slam
    BIG: 130,     // a finisher, the superplex — stay down, this one hurt
    EARLY: 0.42,  // get up before this fraction of the expected sell = a no-sell
    STALL: 2.4    // stay down past this multiple with no pin = the crowd gets bored
  };

  /* the four corners — ring-inside points sitting under the turnbuckle
     posts render.js draws at the grid corners. Corner-tagged spots
     require the bump-taker to actually be staggered in one of these before
     the move can fire. Order matches the posts: NW, NE, SE, SW. */
  PCW.CORNERS = [
    { gx: PCW.BOUND_LO, gy: PCW.BOUND_LO }, { gx: PCW.BOUND_HI, gy: PCW.BOUND_LO },
    { gx: PCW.BOUND_HI, gy: PCW.BOUND_HI }, { gx: PCW.BOUND_LO, gy: PCW.BOUND_HI }
  ];
  PCW.CORNER_RADIUS = 2.0;   // widened in v0.07 as a corner-whip capture margin
  PCW.cornerIndexAt = (gx, gy) => {
    for (let i = 0; i < PCW.CORNERS.length; i++) {
      const c = PCW.CORNERS[i];
      if (Math.hypot(gx - c.gx, gy - c.gy) <= PCW.CORNER_RADIUS) return i;
    }
    return -1;
  };
  PCW.atCorner = w => PCW.cornerIndexAt(w.gx, w.gy) >= 0;

  /* ---------------- shared runtime state ----------------
     Single source of truth for everything the logic mutates and
     the renderer reads. Populated by engine.startMatch(). */
  PCW.G = {};

  /* RESPECT — a wrestler's standing, earned by playing to the crowd.
     Distinct from Trust (reliability): a crowd-pleaser can be highly
     respected yet not the most trusted in the ring. Persists across the
     run-it-back loop (startMatch/Planning.reset never wipe it), so
     serving the fans literally buys you creative pull with the office
     next time you book. 0–100, both start neutral. */
  PCW.G.respect = { p1: 50, p2: 50 };
  PCW.awardRespect = function (id, amt) {
    const r = PCW.G.respect;
    r[id] = Math.max(0, Math.min(100, r[id] + amt));
  };
  /* the star rating (the PCW Observer). Mostly the crowd — loudness blended
     with the front row's lean — then itemized bonuses and penalties. Off-sheet
     moves cost in proportion to how serious the liberty was (its trust cost). */
  PCW.RATING = {
    PER_STAR: 20, HEAT_W: 0.6,
    TRUST_BONUS: 0.25, CLEAN_BONUS: 0.25, RESPECT_BONUS: 0.25,
    PER_BOTCH: 0.3, PER_SHOOT_TRUST: 1 / 60
  };
  PCW.RESPECT = { SERVE_CHANT: 8, SHOOT_POPPED: 3, SHOOT_FLOPPED: -5, BIG_POP: 1 };

  /* ---------------- crisp canvas (device-pixel-ratio) ----------------
     The canvas draws in logical 960×640 coords but backs itself at 2×+
     so text stays sharp when the page scales it up on hi-dpi displays.
     Renderers call CTX.setTransform(DPR,0,0,DPR,0,0) each frame. */
  PCW.DPR = Math.max(2, Math.ceil(window.devicePixelRatio || 1));
  (function () {
    const cvs = document.getElementById("game");
    if (cvs && "width" in cvs) { cvs.width = PCW.CANVAS.W * PCW.DPR; cvs.height = PCW.CANVAS.H * PCW.DPR; }
  })();
})();
