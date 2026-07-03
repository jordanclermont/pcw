/* ============================================================
   PCW — data/spots.js
   The spot library the planning screen drafts from, the fixed
   booking beats, and the office's agenda. Data only.

   Each spot carries everything the ring engine needs (caller, move,
   pop, cue, promo, arcSlot) PLUS the planning fields:
     risk   0–3, how dangerous the bump is
     bump   who takes it ("STOVE" | "BOULDER") — for the office's nerves
     desc   one-line pitch shown on the card
   The office is nervous about high-risk bumps on the champion, which
   is exactly the superplex tension: Boulder takes the biggest bump in
   a match he's booked to lose.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;

  // caller "p1" = STOVE HOT (face), "p2" = THE BOULDER (heel)
  const SPOTS = {
    /* ---- fixed head: always opens the match ---- */
    collar_elbow: {
      id: "collar_elbow", name: "COLLAR & ELBOW", caller: "p2", move: "GRAPPLE",
      reversal: false, pop: 8, arcSlot: "opener", risk: 0, bump: "STOVE",
      desc: "Feel-out tie-up, clean break.",
      cue: { p2: "Tie up — press K", p1: "Give ground, take the bump (don't reverse)" },
      promo: "Feel each other out. Boulder bullies him to the corner, clean break." },

    /* ---- draftable body spots ---- */
    test_strength: {
      id: "test_strength", name: "TEST OF STRENGTH", caller: "p2", move: "GRAPPLE",
      reversal: false, pop: 8, arcSlot: "opener", risk: 0, bump: "STOVE",
      desc: "Knuckle-lock power struggle. Safe.",
      cue: { p2: "Lock knuckles — press K", p1: "Lose the test, take the bump" },
      promo: "Old-school test of strength. The champ wins it, of course." },
    armdrag: {
      id: "armdrag", name: "ARM-DRAG POP", caller: "p2", move: "GRAPPLE",
      reversal: true, pop: 16, arcSlot: "opener", risk: 1, bump: "BOULDER",
      desc: "Stove reverses into an arm drag. Face pop.",
      cue: { p2: "Come in for the lock-up (K)", p1: "REVERSE into the arm drag — Work (T) on frames 4–9" },
      promo: "Stove Hot slips it and drags him over. First real pop of the night." },
    hiptoss: {
      id: "hiptoss", name: "HIPTOSS SEQUENCE", caller: "p1", move: "GRAPPLE",
      reversal: false, pop: 10, arcSlot: "opener", risk: 1, bump: "BOULDER",
      desc: "Stove tosses the champ, early shine.",
      cue: { p1: "Whip and toss him — press G", p2: "Take the hiptoss, bump big" },
      promo: "Early shine for the challenger. The crowd likes what they see." },
    corner_stomps: {
      id: "corner_stomps", name: "CORNER STOMPS", caller: "p2", move: "STRIKE",
      count: 2, pop: 7, arcSlot: "heat", risk: 1, bump: "STOVE", corner: true,
      desc: "Boulder mudholes him in the corner. Heat.",
      cue: { p2: "Two stomps in the corner (J)", p1: "Sell each one — Work (T) when it lands" },
      promo: "Boot him down in the corner. Draw the heat." },
    knee_drops: {
      id: "knee_drops", name: "KNEE DROPS", caller: "p2", move: "STRIKE",
      count: 2, pop: 6, arcSlot: "heat", risk: 1, bump: "STOVE",
      desc: "Methodical knees to the skull. Grind.",
      cue: { p2: "Drop two knees (J)", p1: "Sell them — Work (T) on each" },
      promo: "Slow it down, grind him out, make them wait." },
    chinlock: {
      id: "chinlock", name: "THE CHINLOCK", caller: "p2", move: "STRIKE",
      count: 1, pop: 5, arcSlot: "heat", risk: 0, bump: "STOVE",
      desc: "Rest hold. Low pop, buys time, safe.",
      cue: { p2: "Cinch in the chinlock (J)", p1: "Sell the grind — Work (T)" },
      promo: "Wear him down. It's a rest, but it tells the story." },
    landslide: {
      id: "landslide", name: "THE LANDSLIDE", caller: "p2", move: "GRAPPLE",
      reversal: false, pop: 13, arcSlot: "heat", risk: 2, bump: "STOVE",
      desc: "Boulder's slam. Big heat spot.",
      cue: { p2: "Plant him — The Landslide (K)", p1: "Eat it. Stay down a beat." },
      promo: "Heel control. Let them stew and want the comeback." },
    spinebuster: {
      id: "spinebuster", name: "SPINEBUSTER", caller: "p2", move: "GRAPPLE",
      reversal: false, pop: 11, arcSlot: "heat", risk: 2, bump: "STOVE",
      desc: "Cut-off spinebuster. Nasty bump.",
      cue: { p2: "Cut him off — spinebuster (K)", p1: "Take it flat, stay down" },
      promo: "Catch the comeback and drive him into the mat." },
    comeback_hooks: {
      id: "comeback_hooks", name: "COMEBACK HAYMAKERS", caller: "p1", move: "STRIKE",
      count: 2, pop: 12, arcSlot: "comeback", risk: 1, bump: "BOULDER",
      desc: "Stove fires up, two haymakers.",
      cue: { p1: "Fire up — two haymakers (F)", p2: "Sell big — Work (I) on each" },
      promo: "Here it comes. The place has been waiting all night." },
    face_flurry: {
      id: "face_flurry", name: "THE FLURRY", caller: "p1", move: "STRIKE",
      count: 3, pop: 15, arcSlot: "comeback", risk: 1, bump: "BOULDER",
      desc: "Three-punch flurry. Big comeback.",
      cue: { p1: "Unload — three shots (F)", p2: "Sell all three — Work (I)" },
      promo: "Full comeback. Empty the tank, send it home." },
    superplex: {
      id: "superplex", name: "TOP-ROPE SUPERPLEX", caller: "p1", move: "GRAPPLE",
      reversal: false, pop: 18, arcSlot: "comeback", big: true, risk: 3, bump: "BOULDER",
      corner: true, sequence: "superplex",
      desc: "The big one — a four-beat chain at the turnbuckle. Boulder takes a huge bump.",
      cue: { p1: "Get him to a corner, then press G to climb", p2: "Be in the corner — trust him" },
      promo: "Off the top. The most dangerous spot in the match — on the champ." },

    /* ---- fixed tail: the protected finish (the orchestrated climax) ----
       Six booked beats the office made non-negotiable. The champion goes
       down STRONG: he kicks out of the first Front Burner, gets his own
       finisher and a believable near-fall, and only a SECOND Front Burner
       keeps him down. PIN spots carry an `outcome`: "kickout" is a booked
       near-fall (the pinned man survives at two); "win" is the real three. */
    front_burner: {
      id: "front_burner", name: "THE FRONT BURNER", caller: "p1", move: "GRAPPLE",
      reversal: false, pop: 16, arcSlot: "finish", big: true, risk: 1, bump: "BOULDER",
      desc: "Stove's finisher — the first one.",
      cue: { p1: "Light him up — The Front Burner", p2: "Take it flat. Stay down." },
      promo: "The finisher. Plant the champion — but he's booked to survive it." },
    fb_cover_1: {
      id: "fb_cover_1", name: "COVER — KICK OUT AT TWO", caller: "p1", move: "PIN",
      outcome: "kickout", pop: 18, arcSlot: "finish", big: true, risk: 0, bump: "BOULDER",
      desc: "Cover; the champ kicks out at two. Huge near-fall.",
      cue: { p1: "Cover — hook the leg", p2: "KICK OUT at two — Work (I)" },
      promo: "Count of two — and the champion survives! The place comes unglued." },
    boulder_finisher: {
      id: "boulder_finisher", name: "THE LANDSLIDE (CHAMP'S HOPE)", caller: "p2", move: "GRAPPLE",
      reversal: false, pop: 15, arcSlot: "finish", big: true, risk: 2, bump: "STOVE",
      desc: "The Boulder's finisher — the champion's last stand.",
      cue: { p1: "Take The Landslide — sell death", p2: "Plant him — The Landslide" },
      promo: "The champion will not die quietly — he plants the challenger with everything." },
    bl_cover: {
      id: "bl_cover", name: "CHAMP'S NEAR-FALL", caller: "p2", move: "PIN",
      outcome: "kickout", pop: 17, arcSlot: "finish", big: true, risk: 0, bump: "STOVE",
      desc: "Boulder covers; Stove kicks out at two. The hope spot.",
      cue: { p1: "KICK OUT at two — Work (T)", p2: "Cover — hook the leg" },
      promo: "The champ has him! Two count — NO! Stove Hot lives!" },
    front_burner_2: {
      id: "front_burner_2", name: "THE FRONT BURNER (AGAIN)", caller: "p1", move: "GRAPPLE",
      reversal: false, pop: 18, arcSlot: "finish", big: true, risk: 1, bump: "BOULDER",
      desc: "The second finisher. This is the one.",
      cue: { p1: "One more — The Front Burner", p2: "Take it flat. This is the end." },
      promo: "He's setting up a SECOND one — nobody survives two!" },
    finish_pin: {
      id: "finish_pin", name: "FINISH: 1-2-3", caller: "p1", move: "PIN",
      outcome: "win", pop: 24, arcSlot: "finish", big: true, risk: 0, bump: "BOULDER",
      desc: "Cover, hook the leg, new champion.",
      cue: { p1: "Cover — hook the leg", p2: "STAY DOWN. Do not kick out." },
      promo: "Count the three. New champion. Send them home loud." }
  };

  const HEAD = ["collar_elbow"];
  const TAIL = ["front_burner", "fb_cover_1", "boulder_finisher", "bl_cover", "front_burner_2", "finish_pin"];
  const MENU = ["test_strength", "armdrag", "hiptoss", "corner_stomps", "knee_drops",
    "chinlock", "landslide", "spinebuster", "comeback_hooks", "face_flurry", "superplex"];

  /* The office's non-negotiable booking + its agenda. Each agenda goal
     nudges a spot's acceptance score (the office is the third voice at
     the table). Known to the players — strategy, not guesswork. */
  const AGENDA = [
    { id: "protect", short: "PROTECT THE CHAMPION",
      note: "No reckless bumps on The Boulder.",
      effect: sp => (sp.bump === "BOULDER" && sp.risk >= 2) ? -20 : 0 },
    { id: "heat", short: "BUILD A HEAT SEGMENT",
      note: "They want the champ to get real heat.",
      effect: sp => sp.arcSlot === "heat" ? +12 : 0 },
    { id: "expose", short: "DON'T EXPOSE THE BUSINESS",
      note: "Nothing that looks like a car crash.",
      effect: sp => sp.risk >= 3 ? -22 : 0 }
  ];

  function cloneSpot(id) {
    const t = SPOTS[id];
    const c = Object.assign({}, t);
    c.cue = Object.assign({}, t.cue);
    delete c.status; c._count = 0;   // fresh for a new match
    return c;
  }

  /* assemble a full ring script from a drafted body (array of ids) */
  function assemble(bodyIds) {
    return [].concat(HEAD, bodyIds, TAIL).map(cloneSpot);
  }

  /* fallback sheet if the planning screen is skipped */
  function makeMatchPlan() {
    return assemble(["armdrag", "corner_stomps", "landslide", "comeback_hooks", "superplex", "spinebuster"]);
  }

  /* ready-made cards you can book as-is or tweak, so the planning
     screen doesn't force a from-scratch draft every time. Each body is
     6 spots (slots owned p1/p2/p1/p2/p1/p2), pre-approved by the office. */
  const PRESETS = [
    { id: "classic", name: "THE CLASSIC", tag: "RECOMMENDED",
      blurb: "A textbook title match — safe, well-shaped, sends them home happy.",
      body: ["armdrag", "corner_stomps", "landslide", "spinebuster", "comeback_hooks", "face_flurry"] },
    { id: "war", name: "THE WAR", tag: "HIGH RISK",
      blurb: "Physical and dangerous, headlined by the top-rope superplex. The office will sweat.",
      body: ["hiptoss", "landslide", "spinebuster", "superplex", "comeback_hooks", "face_flurry"] }
  ];

  PCW.SPOTS = SPOTS;
  PCW.PRESETS = PRESETS;
  PCW.SPOT_HEAD = HEAD;
  PCW.SPOT_TAIL = TAIL;
  PCW.SPOT_MENU = MENU;
  PCW.OFFICE_AGENDA = AGENDA;
  PCW.cloneSpot = cloneSpot;
  PCW.assembleScript = assemble;
  PCW.makeMatchPlan = makeMatchPlan;
})();
