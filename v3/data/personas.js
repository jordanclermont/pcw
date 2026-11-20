/* ============================================================
   v3 — data/personas.js
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
      startLike: 30, startOver: 48, startX: 460, facing: 1
    },
    boulder: {
      id: "boulder", name: "THE BOULDER", short: "BOULDER", booked: "heel",
      scale: 1.22, bulk: 1.24,
      skin: "#a8734d", trunks: "#16285c", accent: "#e2b33c", boots: "#0e1a40",
      hair: "flattop", goatee: false, elbowpads: true, stripe: true,
      finisher: "THE LANDSLIDE", finKind: "landslide",
      tauntKind: "point",
      startLike: -25, startOver: 48, startX: 820, facing: -1
    }
  };

  /* the referee borrows the wrestler skeleton */
  PCW.REF_LOOK = {
    id: "ref", scale: 0.98, bulk: 0.85,
    skin: "#d9a983", trunks: "#0d0d10", accent: "#0d0d10", boots: "#0d0d10",
    hair: "short", pants: true, stripes: true
  };

  PCW.FACE = "stove"; PCW.HEEL = "boulder";

  /* TONIGHT'S BOOKING: the one thing the office fixed. Pick one before the bell.
     how: "fin" = pin after the winner's finisher, "sub" = a submission the room believes,
          "dirty" = a pin he cheated to get. */
  PCW.BOOKINGS = [
    {
      id: "clean", title: "THE CLEAN WIN", winner: "stove", loser: "boulder", how: "fin",
      line: "STOVE HOT wins the title with THE FRONT BURNER.",
      note: "Give them a story, hit the Front Burner late, and cover him.",
      short: "STOVE HOT wins with THE FRONT BURNER",
      gorilla: "Stove goes over with the Front Burner. Give them a story first."
    },
    {
      id: "sub", title: "THE TECHNICIAN", winner: "stove", loser: "boulder", how: "sub",
      line: "STOVE HOT makes THE BOULDER give up.",
      note: "Work one body part until the room believes it is hurt, then lock in a hold.",
      short: "STOVE HOT wins by submission",
      gorilla: "Stove goes over by submission. Pick a body part and stay on it."
    },
    {
      id: "dirty", title: "THE ROBBERY", winner: "boulder", loser: "stove", how: "dirty",
      line: "THE BOULDER keeps his title by cheating.",
      note: "Stove has him beaten, and he steals it: feet on the ropes, or the referee goes down and the chair comes out.",
      short: "THE BOULDER steals it by cheating",
      gorilla: "The champ retains, and he cheats to do it. Make them furious."
    }
  ];
  PCW.BOOKING = PCW.BOOKINGS[0];
})();
