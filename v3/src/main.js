/* ============================================================
   v3 — src/main.js
   Boot, keys, and the loop: logic on a fixed 60 Hz step, drawing
   as fast as the screen allows.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW, G = PCW.G;

  function boot() {
    const canvas = document.getElementById("stage");
    PCW.initRender(canvas);
    G.crowd = new PCW.Crowd();
    PCW.bindInput(canvas, code => {
      // 1 and 2 swap who the CPU plays, but only before the bell (during a match the numbers pick choices)
      if (G.phase !== "MATCH" && (code === "Digit1" || code === "Digit2")) {
        const pad = PCW.pads[code === "Digit1" ? "stove" : "boulder"];
        pad.cpu = !pad.cpu;
        for (const id in PCW.pads) PCW.pads[id].reset();
        return true;
      }
      if ((code === "Space" || code === "Enter") && G.phase === "PRE") { PCW.startMatch(); return true; }
      if (code === "KeyR" && G.phase === "ENDED") { PCW.startMatch(); return true; }
      return false;
    });
    canvas.addEventListener("pointerdown", () => { if (G.phase === "PRE") PCW.startMatch(); });

    const STEP = 1000 / 60;
    let last = performance.now(), acc = 0;
    function loop(now) {
      acc += Math.min(100, now - last); last = now;
      while (acc >= STEP) { PCW.tick(); acc -= STEP; }
      PCW.render();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* test hook: run n logic frames at once */
  PCW.fast = function (n) { for (let i = 0; i < n && G.phase === "MATCH"; i++) PCW.tick(); return G.phase; };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
