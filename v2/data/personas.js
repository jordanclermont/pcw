/* ============================================================
   v2 — data/personas.js
   The two performers. Looks, names, and how the crowd feels about
   each of them when the bell rings. Data only.

   startLike : -100 (booed out of the building) .. +100 (adored)
   startOver : 0 (nobody cares) .. 100 (the whole room reacts)
   "booked" is what the OFFICE calls him. The crowd makes up its own
   mind — that's the game.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW = window.PCW || {};

  PCW.PERSONAS = {
    stove: {
      id: "stove", name: "STOVE HOT", short: "STOVE", booked: "face",
      scale: 1.10, bulk: 1.0,
      skin: "#e4b792", trunks: "#17171c", accent: "#ff6a1a", boots: "#101014",
      hair: null, goatee: true, wristbands: true,
      finisher: "THE FRONT BURNER", finKind: "burner",
      tauntKind: "armsup",
      startLike: 45, startOver: 55, startX: 460, facing: 1
    },
    boulder: {
      id: "boulder", name: "THE BOULDER", short: "BOULDER", booked: "heel",
      scale: 1.22, bulk: 1.24,
      skin: "#a8734d", trunks: "#16285c", accent: "#e2b33c", boots: "#0e1a40",
      hair: "flattop", goatee: false, elbowpads: true, stripe: true,
      finisher: "THE LANDSLIDE", finKind: "landslide",
      tauntKind: "point",
      startLike: -40, startOver: 55, startX: 820, facing: -1
    }
  };

  /* the referee borrows the wrestler skeleton */
  PCW.REF_LOOK = {
    id: "ref", scale: 0.98, bulk: 0.85,
    skin: "#d9a983", trunks: "#0d0d10", accent: "#0d0d10", boots: "#0d0d10",
    hair: "short", pants: true, stripes: true
  };

  /* tonight's booking — the one thing the office fixed */
  PCW.BOOKING = {
    winner: "stove", loser: "boulder",
    line: "STOVE HOT wins the title with THE FRONT BURNER.",
    note: "Everything before the finish is yours to call in the ring."
  };
})();
