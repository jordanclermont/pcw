/* ============================================================
   PCW — data/personas.js
   The two performers for the demo. Data only — edit these values
   to retune a persona; no logic lives here.

   ALIGNMENT (fixed in v0.03):
     STOVE HOT  = the FACE  (the crowd's guy). Stone Cold parody.
                  Burner-coil ORANGE. Finisher: The Front Burner.
     THE BOULDER = the HEEL (the office's champion). Rock parody.
                  Corporate NAVY + GOLD. Finisher: The Landslide.
   Player slots: Stove Hot is p1 (WASD), The Boulder is p2 (arrows).
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;

  PCW.PERSONAS = {
    stovehot: {
      id: "p1",
      name: "STOVE HOT",
      short: "STOVE",
      role: "face",
      accent: "#ff7a18",   // burner-coil orange
      accent2: "#ffb45a",  // hot glow
      build: "lean",
      head: "bald",        // bald + goatee, no cowboy hat
      finisher: "THE FRONT BURNER",
      start: { gx: 3.0, gy: 6.5 }
    },
    boulder: {
      id: "p2",
      name: "THE BOULDER",
      short: "BOULDER",
      role: "heel",
      accent: "#24356b",   // corporate navy
      accent2: "#e8b923",  // gold trim
      build: "slab",
      head: "flattop",
      finisher: "THE LANDSLIDE",
      finisher2: "THE SHAREHOLDER'S ELBOW",
      start: { gx: 7.0, gy: 3.5 }
    }
  };
})();
