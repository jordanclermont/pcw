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

  PCW.VERSION = "0.05";
  PCW.CANVAS = { W: 960, H: 640 };

  /* frame windows (60 Hz logic) */
  PCW.FRAMES = {
    GRAPPLE_STARTUP: 12, WINDOW_OPEN: 4, WINDOW_CLOSE: 9,
    ARM_DRAG: 28, SLAM: 24, DOWN: 110, DOWN_SHORT: 70, GETUP: 26,
    HITSTUN: 16, SELL: 36, SELL_WINDOW: 26,
    WHIFF: 16, STRIKE_TOTAL: 14, STRIKE_ACTIVE_A: 5, STRIKE_ACTIVE_B: 8,
    SPLATTER: 5, HITSTOP: 5, PIN_COUNT: 55,
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
    SPX_RECOVER: 30
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

  /* ---------------- isometric grid ---------------- */
  PCW.GRID = 10;
  const TILE_W = 58, TILE_H = 29;
  PCW.TILE_W = TILE_W; PCW.TILE_H = TILE_H;
  PCW.ORIGIN = { x: PCW.CANVAS.W / 2, y: 168 };
  PCW.isoX = (gx, gy) => PCW.ORIGIN.x + (gx - gy) * TILE_W / 2;
  PCW.isoY = (gx, gy) => PCW.ORIGIN.y + (gx + gy) * TILE_H / 2;
  PCW.clampGrid = v => Math.min(PCW.GRID - 0.6, Math.max(0.6, v));

  /* the four corners — ring-inside points sitting under the turnbuckle
     posts render.js draws at the grid corners. Corner-tagged spots
     require the DEFENDER to actually be standing in one of these before
     the move can fire. Order matches the posts: NW, NE, SE, SW. */
  const IN = 1.3;
  PCW.CORNERS = [
    { gx: IN, gy: IN }, { gx: PCW.GRID - IN, gy: IN },
    { gx: PCW.GRID - IN, gy: PCW.GRID - IN }, { gx: IN, gy: PCW.GRID - IN }
  ];
  PCW.CORNER_RADIUS = 1.6;
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
