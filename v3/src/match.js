/* ============================================================
   v3 — src/match.js
   HOW A MATCH RUNS.

     WALK    you move around the ring. Where you are decides what you
             can do: the middle, the ropes, a corner, the floor.
     CHOOSE  when you lay hands on him the action holds, and you pick
             what happens. Then he picks how he takes it.
     WATCH   the move plays out by itself, and the crowd reacts.

   The whole match is one long script written as a generator (main),
   so "ask him, wait for the answer, play the move" reads top to bottom.
   It advances one step per logic frame.

   TWO AUDIENCES: the crowd only hears about things through PCW.see()
   (what row twelve could watch). TRUST is the private meter between
   the two men and never touches the crowd.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;
  const R = PCW.RING, B = PCW.BOUNDS, M = PCW.MOVES, TR = PCW.TRUST, WK = PCW.WALK;
  const clamp = PCW.clamp;

  const G = PCW.G = { phase: "PRE", tick: 0 };
  const padOf = w => PCW.pads[w.id];
  const other = w => (w === G.stove ? G.boulder : G.stove);
  PCW.other = other;

  function makeWrestler(p) {
    return {
      p, id: p.id, x: p.startX, z: R.D / 2, y: 0, g: 0, rot: 0, facing: p.facing,
      pose: PCW.clonePose(PCW.POSE.ready), vx: 0, vz: 0, ph: 0,
      out: false, st: "stand", downT: 0, sellT: 0, seated: false, downId: 0, downRot: 90,
      corner: null, cornerT: 0, solo: null,
      landedAt: -9999, hasPosed: true, finBy: null, finAt: -9999, ai: null
    };
  }

  /* ---------------- what the moves report back ---------------- */
  PCW.see = function (ev) {
    G.lastAct = G.tick;
    if (PART[ev.type] && !ev.part) { ev.part = PART[ev.type][0]; ev.hurt = PART[ev.type][1]; }
    return G.crowd.see(ev);
  };
  PCW.landed = function (a) { a.landedAt = G.tick; a.hasPosed = false; G.offence[a.id]++; };
  PCW.posed = function (a) {
    const posing = (G.tick - a.landedAt < 260) && !a.hasPosed;
    a.hasPosed = true;
    PCW.see({ type: "taunt", actor: a.id, posing });
  };
  PCW.woo = function (a) { if (G.crowd.W[a.id].like > 10 && G.crowd.heat > 25) G.crowd.words("pop", 2); };
  PCW.trust = function (delta, why) {
    if (G.phase !== "MATCH") return;
    const before = G.trust;
    G.trust = clamp(G.trust + delta, 0, 100);
    if (G.trust !== before) G.trustFlash = { d: G.trust - before, t: 0, why: delta < 0 ? why : null };
    if (G.trust <= 0) endMatch("BREAKDOWN", null);
  };
  /* prio: 0 routine, 1 notable, 2 must-hear */
  PCW.say = function (voice, text, prio) {
    prio = prio || 0;
    if (!text) return;
    if (Array.isArray(text)) text = PCW.pick(text);
    if (G.line && G.line.t < 90 && prio < G.line.prio) return;
    G.line = { voice, text, t: 0, prio };
  };
  function gorilla(text) { G.gorilla = { text, t: 0 }; }
  function banner(who, text) { G.banner = { who, text, t: 0 }; }
  function setCtrl(w) { if (G.ctrl !== w.id) { G.ctrl = w.id; G.run[w.id] = 0; G.ctrlAt = G.tick; } }

  /* ---------------- the choices, in plain words ---------------- */
  const OPT = {
    chops: ["CHOPS", "Light him up. Small, and it wears out."],
    slam: ["BODY SLAM", "Up, and down hard."],
    ropes: ["OFF THE ROPES", "Send him across. What he runs into depends on the moment."],
    power: ["POWER MOVE", "Slam, suplex, backbreaker. He goes down hard."],
    quick: ["QUICK MOVE", "Arm drag, dropkick, forearm. Fast and light."],
    limb: ["WORK A BODY PART", "Hurt one place again and again. It sets up a hold."],
    tenpunch: ["TEN PUNCHES", "Up on the ropes over him. The room counts along."],
    across: ["CORNER TO CORNER", "Whip him across into the other buckles."],
    submit: ["SUBMISSION HOLD", ""],
    post: ["INTO THE RING POST", "Run him head-first into the steel."],
    again: ["AGAIN", "One more."],
    enough: ["THAT'S ENOUGH", "Stop there."],
    p_arm: ["THE ARM", ""], p_leg: ["THE LEG", ""], p_back: ["THE BACK", ""],
    s_ropes: ["FIGHT FOR THE ROPES", "Crawl. The nearer the ropes, the sooner he has to let go."],
    s_fade: ["FADE", "Go limp. The referee checks your arm, and the room gets loud."],
    s_power: ["POWER OUT", "Fight up out of it. He decides if it works."],
    s_tap: ["GIVE UP", "Tap out. The match is over and you lose."],
    tocorner: ["INTO THE CORNER", "He hangs on the buckles. Walk over for more."],
    headlock: ["A HEADLOCK", "No body part: just slow it down and wear on him."],
    throwout: ["THROW HIM OUTSIDE", "Over the ropes to the floor."],
    finisher: ["", "The big one. It means more late in the match."],
    letgo: ["LET HIM TAKE OVER", "Give him the match for a while."],
    cornerchops: ["CHOPS IN THE CORNER", "He has nowhere to go."],
    charge: ["RUN AT HIM", "Back up and squash him in the corner."],
    cover: ["COVER HIM", "Go for the pin."],
    pickup: ["PICK HIM UP", "Bring him to his feet for more."],
    stomp: ["STOMP HIM", "Kick a man who is down. They boo that."],
    elbow: ["TOP ROPE", "Climb the corner and come down on him."],
    pose: ["POSE", "Play to the crowd. Best right after a big move."],
    dive: ["DIVE ONTO HIM", "Through the ropes. The biggest risk you have."],
    goout: ["GO OUT AFTER HIM", "Take it to the floor."],
    apron: ["INTO THE RING EDGE", "Drive his back into the apron."],
    rollin: ["ROLL HIM BACK IN", "Take it back to the ring."],
    selfin: ["GET BACK IN", "Back into the ring before the count."],
    selfout: ["ROLL OUTSIDE", "Take a breather on the floor."],
    rake: ["THUMB IN THE EYE", ""],
    refbump: ["SHOVE HIM INTO THE REFEREE", "The referee goes down. For a while, nobody is watching."],
    getchair: ["GET THE CHAIR", "The referee is down. Pull a chair from under the ring."],
    chair: ["HIT HIM WITH THE CHAIR", ""],
    ropecover: ["COVER, FEET ON THE ROPES", "Cheat on the pin. The room will scream. The referee may catch it at two."],
    bail: ["BAIL OUT", "Slide out of the ring instead. They will boo you for it."],
    back: ["BACK OFF", "Not yet."],
    /* how he takes it */
    sell: ["SELL IT", "Take it and go down. This is the job."],
    big: ["SELL IT BIG", "Make his move look like murder. You stay down longer."],
    fire: ["FIRE BACK", "Block it and hit him. He decides if it works."],
    shrug: ["SHRUG IT OFF", "Feel nothing. He looks weak, and he will remember it."],
    take: ["STAY THERE", "Take it."],
    move: ["MOVE", "He crashes. That is not what he was counting on."],
    /* when the other man fires back */
    feed: ["LET HIM COME BACK", "He takes over the match."],
    cut: ["CUT HIM OFF", "Shut it down. They will hate you for it."]
  };
  const NAME = {
    chops: "CHOPS", cornerchops: "CHOPS IN THE CORNER", slam: "A BODY SLAM", ropes: "THE ROPES", tocorner: "THE CORNER",
    headlock: "A HEADLOCK", throwout: "THE FLOOR", charge: "A CORNER CHARGE", apron: "THE RING EDGE", dive: "A DIVE",
    elbow: "THE TOP ROPE", stomp: "THE BOOTS", burner: "THE FRONT BURNER", landslide: "THE LANDSLIDE",
    suplex: "A SUPLEX", backbreaker: "A BACKBREAKER", spinebuster: "A SPINEBUSTER", armdrag: "AN ARM DRAG", dropkick: "A DROPKICK",
    forearm: "A FOREARM SMASH", backdrop: "A BACK BODY DROP", bigboot: "A BIG BOOT", across: "THE OTHER CORNER", post: "THE RING POST",
    limb_arm: "THE ARM", limb_leg: "THE LEG", limb_back: "THE BACK", tenpunch: "TEN PUNCHES", chair: "THE CHAIR"
  };
  NAME.ropes = "A CLOTHESLINE";
  /* the card offers a KIND of move; which one he actually hits depends on the moment */
  const POOLS = {
    power: [["slam", 3, 0], ["suplex", 3, 0], ["backbreaker", 2, 20], ["spinebuster", 3, 80]],
    quick: [["armdrag", 3, 0], ["dropkick", 3, 0], ["forearm", 2, 0]],
    ropes: [["ropes", 3, 0], ["backdrop", 2, 0], ["bigboot", 2, 45]]
  };
  function pickMove(cat, a) {
    const sec = G.tick / 60, late = sec > 100;
    const cand = POOLS[cat].filter(m => sec >= m[2]).map(m => {
      const seenIt = G.crowd.mem[a.id + ":" + m[0]] || 0;
      let w = m[1] / (1 + seenIt * 1.5);                       // he reaches for what the room has not seen
      if (late && PCW.SIZE[m[0]] >= 2.4) w *= 1.6;             // bigger things late
      if (!late && PCW.SIZE[m[0]] < 2.3) w *= 1.3;             // smaller things early
      if (a.lastMove === m[0]) w *= 0.15;
      return [m[0], w];
    });
    let r = PCW.rnd() * cand.reduce((t, c) => t + c[1], 0);
    for (const c of cand) { r -= c[1]; if (r <= 0) return c[0]; }
    return cand[0][0];
  }
  /* which moves hurt which body part (the crowd keeps the tally: it is what they have seen) */
  const PART = {
    slam: ["back", 1], suplex: ["back", 1], backbreaker: ["back", 2], spinebuster: ["back", 1], backdrop: ["back", 1], charge: ["back", 1],
    apron: ["back", 2], armdrag: ["arm", 1], limb_arm: ["arm", 2], limb_leg: ["leg", 2], limb_back: ["back", 2]
  };
  const worstPart = w => { const h = G.crowd.hurt[w.id]; let k = "back"; for (const p of ["arm", "leg"]) if (h[p] > h[k]) k = p; return k; };
  PCW.worstPart = worstPart;
  PCW.SIZE = {
    chops: 1.6, cornerchops: 1.6, slam: 2, ropes: 2.4, tocorner: 1.6, headlock: 1.3, throwout: 2.4, charge: 2.4,
    apron: 2.4, dive: 3.6, elbow: 3.2, burner: 4, landslide: 4,
    suplex: 2.4, backbreaker: 2.2, spinebuster: 2.8, armdrag: 1.6, dropkick: 1.9, forearm: 1.7, backdrop: 2.4, bigboot: 2.2,
    across: 2, post: 2.8, limb_arm: 1.3, limb_leg: 1.3, limb_back: 1.3, tenpunch: 2.6, chair: 3.4
  };
  const FULL = ["sell", "big", "fire", "shrug"];
  const ANSWERS = {
    chops: FULL, cornerchops: ["sell", "big", "fire"], slam: FULL, ropes: FULL, tocorner: FULL, headlock: FULL,
    throwout: FULL, charge: ["sell", "big", "fire"], apron: ["sell", "big"], elbow: ["take", "move"], dive: ["take", "move"],
    suplex: FULL, backbreaker: FULL, spinebuster: FULL, armdrag: FULL, dropkick: FULL, forearm: FULL, backdrop: FULL, bigboot: FULL,
    across: ["sell", "big", "fire"], post: ["sell", "big"], limb_arm: ["sell", "big", "fire"], limb_leg: ["sell", "big", "fire"],
    limb_back: ["sell", "big", "fire"], tenpunch: ["sell", "fire"], chair: ["sell", "big", "move"]
  };
  /* how the match ended, against what the office booked */
  function finishType(w, method) {
    const Bk = PCW.BOOKING;
    if (w.id !== Bk.winner) return "SCREWJOB";
    if (method === "pin" || method === "subweak") return "FLAT";       // the right man, but nobody saw a finish
    return method === Bk.how ? "CLEAN" : "CALLED";                       // CALLED = a real finish, just not the booked one
  }
  const refDown = () => G.ref.down > 0;
  function opt(id, who) {
    const o = { id, label: OPT[id][0], hint: OPT[id][1] };
    if (id === "finisher") o.label = who.p.finisher;
    if (id === "rake") o.hint = PCW.refSees(who)
      ? "He can't answer it. The referee is right there: that is warning " + (G.warn[who.id] + 1) + " of " + PCW.WARNINGS + "."
      : "He can't answer it. The referee is out of position and won't see it.";
    const foe = other(who);
    if (id === "chair") o.hint = refDown() ? "The referee is down. Nobody can stop you." : "The referee is UP. This is an instant disqualification.";
    if (id === "submit") {
      const part = worstPart(foe), n = G.crowd.hurt[foe.id][part];
      o.hint = PCW.HOLDS[part].name.replace(/^AN? /, "") + " on his " + part + ". " + (n >= 4 ? "They believe it is hurt: this could end it." : "They have no reason to believe it yet.");
      o.hint = o.hint.charAt(0) + o.hint.slice(1).toLowerCase().replace("they", "They");
    }
    if (id.startsWith("p_")) { const n = G.crowd.hurt[foe.id][id.slice(2)]; o.hint = n ? "They have seen it worked " + Math.round(n) + " times." : "Fresh. Nothing done to it yet."; }
    if (id === "selfout" && who.p.booked === "heel") { o.label = "TAKE A BREAK OUTSIDE"; o.hint = "Stall on the floor. They hate it."; }
    // a wrestler can feel when the room has seen something too often
    const key = who.id + ":" + (id === "finisher" ? "finisher" : id);
    if (G.crowd.mem[key] >= 1.5) o.stale = true;
    return o;
  }

  /* ---------------- where you are decides what you can do ---------------- */
  const reach = (a, b) => Math.hypot(a.x - b.x, (a.z - b.z) * 1.4);
  function nearCorner(w) { const c = PCW.cornerFor(w); return c.d < 185 ? c : null; }
  PCW.refSees = w => !refDown() && Math.hypot(G.ref.x - w.x, G.ref.z - w.z) < PCW.REF_SEES;
  const nearRopes = w => w.x < B.XLO + 120 || w.x > B.XHI - 120 || w.z < B.ZLO + 110 || w.z > B.ZHI - 110;
  PCW.context = function (a, b) {
    const c = baseContext(a, b);
    const L = c.list, add = (id, after) => { const i = L.indexOf(after); L.splice(i < 0 ? L.length : i + 1, 0, id); };
    // THE CHAIR: anyone can use it once the referee is down. What the room makes of it depends on who has been cheating.
    if (!a.out && !b.out) {
      if (a.weapon && c.kind !== "far") L.unshift("chair");
      else if (!a.weapon && refDown() && G.ref.down > 150) L.push("getchair");
    }
    if (a.p.booked !== "heel") return c;
    // THE HEEL'S TRICKS
    if (c.kind === "tie" && !a.out && !refDown() && Math.hypot(G.ref.x - b.x, G.ref.z - b.z) < 330) add("refbump", "chops");
    if ((c.kind === "tie" || c.kind === "corner") && !a.out) add("rake", c.kind === "tie" ? "chops" : "cornerchops");
    if (c.kind === "down" && !a.out && nearRopes(b)) add("ropecover", "cover");
    if (!a.out && !b.out && c.kind === "far" && !L.includes("selfout")) L.push("selfout");
    return c;
  };
  function baseContext(a, b) {
    const d = reach(a, b), near = d < PCW.REACH;
    if (!a.out && !b.out) {
      if (b.st === "down") {
        const L = [];
        if (near) L.push("cover", "submit", "pickup", "stomp");
        if (!b.seated && PCW.cornerFor(b).d < 400) L.push("elbow");
        L.push("pose");
        if (!near && a.z < 150) L.push("selfout");
        return { kind: near ? "down" : "far", list: L, title: near ? "HE IS DOWN" : "HE IS DOWN, OVER THERE", verb: near ? "HE IS DOWN: YOUR MOVE" : null };
      }
      if (near || (b.st === "corner" && d < 200)) {
        const c = b.st === "corner" ? b.corner : nearCorner(b);
        if (c) return { kind: "corner", corner: c, list: ["cornerchops", "tenpunch", "charge", "across", "power", "finisher", "letgo"], title: "YOU HAVE HIM IN THE CORNER", verb: "WORK HIM IN THE CORNER" };
        if ((a.z + b.z) / 2 < 150) return { kind: "tie", list: ["chops", "quick", "power", "ropes", "throwout", "limb", "finisher", "letgo"], title: "YOU HAVE HIM BY THE ROPES", verb: "LOCK UP (by the ropes)" };
        return { kind: "tie", list: ["chops", "quick", "power", "ropes", "tocorner", "limb", "finisher", "letgo"], title: "YOU HAVE HIM", verb: "LOCK UP" };
      }
      const L = ["pose"]; if (a.z < 150) L.push("selfout");
      return { kind: "far", list: L, title: "HE IS OUT OF REACH" };
    }
    if (!a.out && b.out) {
      const L = []; if (b.st === "stand") L.push("dive"); L.push("goout", "pose");
      return { kind: "far", list: L, title: "HE IS ON THE FLOOR" };
    }
    if (a.out && b.out) {
      if (near && b.st === "down") return { kind: "down", list: ["stomp", "rollin", "pose"], title: "HE IS DOWN ON THE FLOOR", verb: "HE IS DOWN: YOUR MOVE" };
      if (near) return { kind: "tie", list: ["chops", "apron", "post", "rollin", "letgo"], title: "YOU HAVE HIM ON THE FLOOR", verb: "GRAB HIM" };
      return { kind: "far", list: ["selfin", "pose"], title: "YOU ARE BOTH ON THE FLOOR" };
    }
    return { kind: "far", list: ["selfin", "pose"], title: "YOU ARE ON THE FLOOR" };
  }
  /* the referee saw him cheat */
  function warn(a) {
    G.warn[a.id]++;
    banner("THE REFEREE", "WARNS " + a.p.short + " (" + G.warn[a.id] + " OF " + PCW.WARNINGS + ")");
    if (G.warn[a.id] >= PCW.WARNINGS) { PCW.say("pbp", PCW.LINES.dq, 2); endMatch("DQ", other(a)); }
    else { PCW.say("pbp", PCW.LINES.warn, 1); if (!padOf(a).cpu) gorilla(PCW.GORILLA.warn); }
  }
  /* the one-line prompt over a player's head while he walks */
  PCW.hintFor = function (w) {
    if (G.phase !== "MATCH" || padOf(w).cpu || G.busy || G.ask || G.pin) return null;
    const k = "[" + PCW.keyName(w.id).act + "] ";
    if (w.st === "down") return "YOU ARE DOWN. SELL IT.";
    if (w.solo) return null;
    if (w.st === "corner") return "MOVE TO COME OUT OF THE CORNER";
    const foe = other(w); if (foe.solo) return null;
    const c = PCW.context(w, foe);
    if (c.verb) return k + c.verb;
    return k + c.list.slice(0, 3).map(id => OPT[id][0] || w.p.finisher).join("  /  ");
  };

  /* ---------------- start ---------------- */
  PCW.startMatch = function () {
    G.phase = "MATCH"; G.tick = 0; G.hitstop = 0; G.shake = 0; G.ropeShake = 0; G.ropeSide = "R";
    G.stove = makeWrestler(PCW.PERSONAS.stove);
    G.boulder = makeWrestler(PCW.PERSONAS.boulder);
    G.ws = [G.stove, G.boulder];
    G.ref = { x: 640, z: R.D - 70, state: "stand", facing: 1, slap: 0, down: 0 };
    G.trust = 100; G.trustFlash = null; G.lastAct = 0; G.seqEnd = 0; G.shoots = 0;
    G.ctrl = null; G.ctrlAt = 0; G.run = { stove: 0, boulder: 0 }; G.offence = { stove: 0, boulder: 0 };
    G.warn = { stove: 0, boulder: 0 }; G.props = [];
    G.cb = false; G.out = { n: 0, t: 0 }; G.ask = null; G.pin = null; G.busy = false; G.banner = null;
    G.line = null; G.gorilla = null; G.end = null; G.sparks = [];
    if (!G.crowd) G.crowd = new PCW.Crowd(); else G.crowd.reset();
    PCW.clearInput();
    PCW.say("pbp", PCW.LINES.bell, 2);
    gorilla(PCW.BOOKING.gorilla);
    PCW.sfx.bell(1);
    G.dir = main();
  };

  /* ============================================================
     ONE LOGIC FRAME
     ============================================================ */
  PCW.tick = function () {
    if (G.phase !== "MATCH") return;
    if (G.hitstop > 0) { G.hitstop--; return; }        // presses made during the freeze are kept
    G.tick++;
    G.dir.next();
    if (G.phase === "MATCH") { refTick(); officeTick(); G.crowd.tick(); }
    if (G.shake > 0) G.shake *= 0.86;
    if (G.ropeShake > 0) G.ropeShake--;
    if (G.line) G.line.t++;
    if (G.banner && ++G.banner.t > 110) G.banner = null;
    if (G.gorilla && ++G.gorilla.t > 360) G.gorilla = null;
    if (G.trustFlash && ++G.trustFlash.t > 170) G.trustFlash = null;
    for (const s of G.sparks) s.age++;
    G.sparks = G.sparks.filter(s => s.age < 14);
    PCW.clearInput();
  };

  /* ---------------- playing a piece of choreography ---------------- */
  function* play(seq) {
    const tracks = [];
    for (const [actor, keys] of seq.tracks) { actor.solo = null; tracks.push([actor, PCW.prepTrack(actor, keys)]); }
    const evs = seq.evs.slice().sort((a, b) => a.t - b.t);
    let ei = 0;
    G.busy = true;
    for (let f = 1; f <= seq.len; f++) {
      for (const [actor, tr] of tracks) PCW.stepTrack(actor, tr, f);
      while (ei < evs.length && evs[ei].t <= f) { evs[ei++].fn(); if (G.phase !== "MATCH") return; }
      yield;
    }
    G.busy = false; G.seqEnd = G.tick;
  }

  /* ---------------- asking a man what he wants to do ---------------- */
  function* ask(who, kind, title, opts, ctx) {
    const pad = padOf(who);
    if (pad.cpu) {
      for (let i = 0; i < 14; i++) yield;
      return PCW.cpuChoose(who, kind, opts, ctx || {}) || opts[0];
    }
    const A = G.ask = { who, kind, title, opts, sel: 0, t: kind === "again" ? 8 : 0, rects: [], backRect: null, canBack: kind === "lead" };
    let res = null;
    for (;;) {
      A.t++;
      if (A.t < 420) G.crowd.quiet = Math.min(G.crowd.quiet, 110);     // a moment to think is not dead air
      const n = opts.length;
      if (pad.just.left || pad.just.up) A.sel = (A.sel + n - 1) % n;
      if (pad.just.right || pad.just.down) A.sel = (A.sel + 1) % n;
      if (PCW.kb.digit && PCW.kb.digit <= n) res = opts[PCW.kb.digit - 1];
      else if (pad.just.act && A.t > (kind === "again" ? 3 : 8)) res = opts[A.sel];
      else if (PCW.kb.back && kind === "lead") res = { id: "back" };
      else if (PCW.kb.click) {
        const c = PCW.kb.click, inside = r => r && c.x >= r.x && c.x <= r.x + r.w && c.y >= r.y && c.y <= r.y + r.h;
        A.rects.forEach((r, i) => { if (inside(r)) res = opts[i]; });
        if (!res && kind === "lead" && inside(A.backRect)) res = { id: "back" };
      }
      if (res) break;
      yield;
    }
    G.ask = null;
    return res;
  }

  /* ============================================================
     THE MATCH
     ============================================================ */
  function* main() {
    for (;;) {
      const lead = roamFrame();
      if (lead) yield* act(lead);
      yield;
    }
  }

  /* one frame of walking around. Returns the man who wants to do something. */
  function roamFrame() {
    let wants = null;
    for (const w of G.ws) {
      const pad = padOf(w), foe = other(w);
      if (w.solo) {                                           // getting up
        PCW.stepTrack(w, w.solo, ++w.soloF);
        if (w.soloF >= w.solo.keys[w.solo.keys.length - 1].t) { w.solo = null; w.st = "stand"; w.seated = false; w.rot = 0; w.downRot = 90; }
        continue;
      }
      if (w.st === "down") {
        if (--w.downT <= 0) { w.solo = PCW.prepTrack(w, PCW.getupKeys(w)); w.soloF = 0; }
        else lieThere(w);
        continue;
      }
      let ax = 0, az = 0, press = false;
      if (pad.cpu) { const r = PCW.cpuRoam(w, foe); ax = r.ax; az = r.az; press = r.act; }
      else { ax = pad.axis(); az = pad.axisZ(); press = !!pad.just.act; }
      if (w.st === "corner") {
        PCW.chasePose(w.pose, PCW.POSE.cornered, 0.2);
        if (--w.cornerT <= 0 || (!pad.cpu && (ax || az) && w.cornerT < 380)) { w.st = "stand"; w.corner = null; }
        else continue;
      }
      walk(w, ax, az, foe);
      if (press && !foe.solo && (!wants || !pad.cpu)) wants = w;
    }
    // the count on a man outside
    if (G.ws.some(w => w.out)) {
      if (!refDown() && ++G.out.t >= PCW.OUT_COUNT) {
        G.out.t = 0; G.out.n++;
        G.crowd.see({ type: "refcount", actor: "stove", n: G.out.n });
        for (const w of G.ws) if (w.out && w.st === "stand" && !other(w).out && G.out.n >= 4) G.crowd.see({ type: "stall", actor: w.id });
        if (G.out.n === 7) gorilla(PCW.GORILLA.count);
        if (G.out.n >= 10) { PCW.say("pbp", PCW.LINES.countout, 2); endMatch("COUNTOUT", null); }
      }
    } else { G.out.n = 0; G.out.t = 0; }
    return wants;
  }
  function lieThere(w) {
    const base = w.seated ? PCW.POSE.sitdown : w.downRot === -90 ? PCW.POSE.cover : PCW.POSE.down;
    const p = PCW.clonePose(base), t = G.tick;
    if (w.downT > w.sellT * 0.25 && !w.seated && w.downRot !== -90) { p.lfk += Math.sin(t / 9) * 12; p.afs += Math.sin(t / 11) * 10; p.head += Math.sin(t / 13) * 8; }
    PCW.chasePose(w.pose, p, 0.2);
  }
  const inWay = (x, z, foe) => Math.abs(x - foe.x) < WK.GAP && Math.abs(z - foe.z) < WK.GAP_Z;
  function walk(w, ax, az, foe) {
    if (ax && az) { ax *= 0.72; az *= 0.72; }
    if (ax) w.vx += ax * WK.ACC; else w.vx *= WK.FRIC;
    if (az) w.vz += az * WK.ACC; else w.vz *= WK.FRIC;
    w.vx = clamp(w.vx, -WK.VMAX, WK.VMAX); w.vz = clamp(w.vz, -WK.VMAX, WK.VMAX);
    const lo = w.out ? [B.OX0, B.OX1, B.OZ0, B.OZ1] : [B.XLO, B.XHI, B.ZLO, B.ZHI];
    let nx = clamp(w.x + w.vx, lo[0], lo[1]), nz = clamp(w.z + w.vz, lo[2], lo[3]);
    if (foe.st !== "down" && foe.out === w.out && !inWay(w.x, w.z, foe) && inWay(nx, nz, foe)) {
      if (!inWay(nx, w.z, foe)) { nz = w.z; w.vz = 0; }
      else if (!inWay(w.x, nz, foe)) { nx = w.x; w.vx = 0; }
      else { nx = w.x; nz = w.z; w.vx = w.vz = 0; }
    }
    w.x = nx; w.z = nz; w.y = 0; w.rot *= 0.8; w.g = w.out ? R.RH : 0;
    const sp = Math.hypot(w.vx, w.vz);
    if (Math.abs(foe.x - w.x) > 8) w.facing = foe.x > w.x ? 1 : -1;
    if (sp > 0.35) { w.ph += sp * 0.085; PCW.chasePose(w.pose, PCW.cycle("walk", w.ph), 0.3); }
    else { const p = PCW.clonePose(PCW.POSE.ready); p.afs += Math.sin(G.tick / 17 + w.x) * 4; p.abs += Math.cos(G.tick / 19) * 4; PCW.chasePose(w.pose, p, 0.16); }
  }

  /* a man steps up and does something */
  function* act(lead) {
    const rec = other(lead);
    if (lead.st !== "stand" || lead.solo || rec.solo) return;
    const ctx = PCW.context(lead, rec);
    if (ctx.kind === "tie") yield* play(PCW.stage.tie(lead, rec));
    else if (ctx.kind === "corner") yield* play(PCW.stage.corner(lead, rec, ctx.corner));
    else if (ctx.kind === "down") yield* play(PCW.stage.down(lead, rec));
    const opts = ctx.list.map(id => opt(id, lead));
    const pick = yield* ask(lead, "lead", ctx.title, opts, ctx);
    if (!pick || pick.id === "back") { G.seqEnd = G.tick; return; }
    yield* resolve(lead, rec, pick.id);
    G.seqEnd = G.tick;
  }

  function* resolve(a, b, id) {
    if (id === "finisher") id = a.p.finKind;
    if (POOLS[id]) id = pickMove(id, a);
    if (id === "limb") {
      const pick = yield* ask(a, "limbpart", "WHICH PART OF HIM?", ["p_arm", "p_leg", "p_back", "headlock"].map(k => opt(k, a)), {});
      id = pick.id === "headlock" ? "headlock" : "limb_" + pick.id.slice(2);
    }
    if (id === "submit") { yield* submission(a, b); return; }
    a.lastMove = id;
    switch (id) {
      case "pose": yield* play(M.pose(a)); return;
      case "selfout": yield* play(M.selfout(a, b, {})); return;
      case "goout": yield* play(M.selfout(a, b, { x: b.x + (a.x <= b.x ? -1 : 1) * 120 })); return;
      case "selfin": yield* play(M.selfin(a)); return;
      case "rollin": yield* play(M.rollin(a, b)); setCtrl(a); return;
      case "letgo":
        setCtrl(b); banner(a.p.short, "BACKS OFF. IT IS " + b.p.short + "'S MATCH NOW.");
        if (!padOf(a).cpu && padOf(b).cpu) gorilla(PCW.GORILLA.letgo);
        return;
      case "cover": yield* pin(a, b, false); return;
      case "ropecover": yield* pin(a, b, true); return;
      case "rake": {
        const saw = PCW.refSees(a);
        if (b.st === "corner") b.cornerT = Math.max(b.cornerT, 200);
        banner(a.p.short, "GOES TO THE EYES");
        yield* play(M.rake(a, b)); setCtrl(a); G.run[a.id]++;
        if (saw && G.phase === "MATCH") warn(a);
        return;
      }
      case "refbump":
        banner(a.p.short, "THROWS HIM INTO THE REFEREE");
        if (b.st === "corner") { b.st = "stand"; b.corner = null; }
        yield* play(M.refbump(a, b)); setCtrl(a); G.run[a.id]++;
        return;
      case "getchair": banner(a.p.short, "GOES UNDER THE RING"); yield* play(M.getchair(a)); return;
      case "pickup": yield* play(M.pickup(a, b)); setCtrl(a); yield* act(a); return;
      case "stomp": banner(a.p.short, "PUTS THE BOOTS TO HIM"); yield* play(M.stomp(a, b)); setCtrl(a); G.run[a.id]++; return;
    }
    banner(a.p.short, "GOES FOR " + NAME[id]);
    const o = {};
    const refUp = !refDown();
    if (ANSWERS[id] && !(id === "chair" && b.st === "down")) {
      const ans = ANSWERS[id].slice();
      // the heel can always decide he wants no part of it
      if (b.p.booked === "heel" && !b.out && !a.out && b.st !== "corner" && ans.includes("fire")) ans.push("bail");
      const pick = yield* ask(b, "answer", a.p.short + " IS GOING FOR " + NAME[id], ans.map(k => opt(k, b)), { move: id, lead: a });
      if (pick.id === "bail") {
        banner(b.p.short, "BAILS OUT OF THE RING");
        yield* play(M.bail(a, b));
        return;
      }
      if (pick.id === "fire") {
        // grabbing the match back when he has barely touched you is greedy
        if (G.run[a.id] < 2 && G.crowd.W[b.id].taken < 4) PCW.trust(TR.GREEDY, b.p.short + " would not let him get anything in");
        banner(b.p.short, "FIRES BACK!");
        const r = yield* ask(a, "fireback", b.p.short + " IS FIRING BACK", [opt("feed", a), opt("cut", a)], { rec: b });
        if (id === "tenpunch") {
          // up on the ropes: either he gets shoved off part-way, or he gets all ten in anyway
          if (r.id === "feed") { yield* tenPunch(a, b, o, 4 + Math.floor(PCW.rnd() * 3)); setCtrl(b); if (b.id === PCW.FACE && G.tick > 75 * 60) G.cb = true; }
          else { yield* tenPunch(a, b, o, 0); setCtrl(a); G.run[a.id]++; }
          return;
        }
        if (b.st === "corner") { b.st = "stand"; b.corner = null; }
        yield* play(M.fireback(a, b, { cut: r.id === "cut" }));
        if (r.id === "cut") { setCtrl(a); G.run[a.id]++; }
        else {
          setCtrl(b);
          // the booked winner fighting back late in the match: this is THE comeback
          if (b.id === PCW.FACE && G.tick > 75 * 60) G.cb = true;
        }
        return;
      }
      if (pick.id === "shrug") {
        if (b.st === "corner") { b.st = "stand"; b.corner = null; }
        banner(b.p.short, "FEELS NOTHING");
        yield* play(M.shrug(a, b)); setCtrl(b);
        if (!padOf(b).cpu) gorilla(PCW.GORILLA.nosell);
        return;
      }
      if (pick.id === "big") o.big = true;
      if (pick.id === "move") o.miss = true;
    }
    if (padOf(b).cpu && G.trust < 50) { o.flat = true; o.big = false; }      // a partner you have burned stops working for you
    if (b.st === "corner" && !["cornerchops", "charge", "tenpunch", "across"].includes(id)) { b.st = "stand"; b.corner = null; }
    if (id === "chops" || id === "cornerchops") yield* chopsLoop(a, b, o);
    else if (id === "tenpunch") yield* tenPunch(a, b, o, 0);
    else if (id.startsWith("limb_")) yield* play(M.limb(a, b, o, id.slice(5)));
    else yield* play(M[id](a, b, o));
    if (o.miss) setCtrl(b); else { setCtrl(a); G.run[a.id]++; }
    // a chair shot in front of the referee ends it on the spot
    if (id === "chair" && refUp && G.phase === "MATCH") { G.warn[a.id] = PCW.WARNINGS - 1; warn(a); }
  }

  /* ============================================================
     COUNT-ALONG. Chops, one at a time: after each, again or enough.
     The room shouts along until it has had its fill; you have to
     hear when that is.
     ============================================================ */
  function* chopsLoop(a, b, o) {
    const corner = b.st === "corner", type = corner ? "cornerchops" : "chops";
    const fresh = 1 / (1 + 0.55 * (G.crowd.mem[a.id + ":" + type] || 0));
    const fill = 2 + Math.round(3 * fresh);                 // five the first time; fewer once they have seen it
    let n = 0;
    for (;;) {
      n++;
      yield* play(M.chop1(a, b, o, n));
      G.crowd.see({ type: "woo", actor: a.id, target: b.id, n, loud: n <= fill }); G.lastAct = G.tick;
      if (n >= 8) break;
      const pick = yield* ask(a, "again", "CHOP " + n + ". LISTEN TO THE ROOM.", [opt("again", a), opt("enough", a)], { n, fill });
      if (pick.id !== "again") break;
    }
    yield* play(M.chopEnd(a, b, o));
    PCW.see({ type, actor: a.id, target: b.id, size: 0.9 + 0.22 * Math.min(n, fill), q: o.big ? 1.3 : o.flat ? 0.8 : 1 });
    PCW.landed(a); PCW.trust(o.big ? TR.BIG : TR.SOLD);
    if (n >= 4) PCW.say("pbp", PCW.LINES.strike);
  }
  /* ten punches from the second rope. shoveAt > 0 = he gets pushed off at that punch. */
  function* tenPunch(a, b, o, shoveAt) {
    yield* play(M.mount(a, b));
    let n = 0, stopped = false;
    for (;;) {
      n++;
      yield* play(M.punch1(a, b));
      G.crowd.see({ type: "count10", actor: a.id, target: b.id, n }); G.lastAct = G.tick;
      if (shoveAt && n >= shoveAt) { yield* play(M.dismount(a, b, { shoved: true })); return; }
      if (n >= 10) break;
      const pick = yield* ask(a, "again", "PUNCH " + n + " OF 10", [opt("again", a), opt("enough", a)], { n, fill: 10, ten: true });
      if (pick.id !== "again") { stopped = true; break; }
    }
    if (stopped) G.crowd.see({ type: "short10", actor: a.id, target: b.id });
    else { PCW.see({ type: "tenpunch", actor: a.id, target: b.id, size: 2.6, q: o.big ? 1.3 : 1 }); PCW.say("pbp", PCW.LINES.ten, 1); }
    PCW.landed(a); PCW.trust(TR.SOLD);
    yield* play(M.dismount(a, b, { all: !stopped, big: o.big }));
  }

  /* ============================================================
     THE SUBMISSION. A hold on the part of him that has been worked
     the most. He crawls for the ropes, fades, powers out, or gives up.
     ============================================================ */
  function* submission(a, b) {
    const part = worstPart(b), H = PCW.HOLDS[part], C = G.crowd;
    const believed = () => C.hurt[b.id][part] >= 4;
    banner(a.p.short, "LOCKS IN " + H.name);
    yield* play(M.subApply(a, b, part));
    setCtrl(a); G.run[a.id]++;
    PCW.say("pbp", PCW.LINES.hold, 1);
    let ans = (yield* ask(b, "submit", a.p.short + " HAS " + H.name + " ON YOU", ["s_ropes", "s_fade", "s_power", "s_tap"].map(k => opt(k, b)), { part, lead: a, believed: believed() })).id;
    if (ans === "s_power") {
      banner(b.p.short, "IS POWERING OUT!");
      const r = yield* ask(a, "fireback", b.p.short + " IS POWERING OUT OF IT", [opt("feed", a), opt("cut", a)], { rec: b });
      if (r.id === "feed") {
        yield* play(M.subBeat(a, b, part, { x: 0, z: 0 }));
        C.see({ type: "subbeat", actor: a.id, target: b.id, believed: believed() });
        yield* play(M.subBreak(a, b, part, { reversed: true }));
        setCtrl(b); if (b.id === PCW.FACE && G.tick > 75 * 60) G.cb = true;
        return;
      }
      ans = "s_fade";                                         // he drags him back down and cinches it in
    }
    if (ans === "s_tap") {
      yield* play(M.subBeat(a, b, part, { x: 0, z: 0 }));
      C.see({ type: "subbeat", actor: a.id, target: b.id, believed: believed() });
      yield* play(M.subTap(a, b, part));
      PCW.say("pbp", PCW.LINES.tap, 2);
      C.see({ type: "pinfall", actor: a.id, afterBig: believed() });
      endMatch(finishType(a, believed() ? "sub" : "subweak"), a);
      return;
    }
    // how far to the nearest rope decides how long he is in it
    const gaps = [[b.x - B.XLO, -1, 0], [B.XHI - b.x, 1, 0], [b.z - B.ZLO, 0, -1], [B.ZHI - b.z, 0, 1]].sort((p, q) => p[0] - q[0])[0];
    const fade = ans === "s_fade";
    const beats = fade ? 4 : clamp(Math.ceil(gaps[0] / 110), 1, 4), stepLen = fade ? 0 : gaps[0] / beats;
    for (let i = 1; i <= beats; i++) {
      yield* play(M.subBeat(a, b, part, { x: gaps[1] * stepLen, z: gaps[2] * stepLen }));
      const count = fade && i >= 2 && i <= 3 ? i - 1 : 0;       // the referee lifts the arm: once, twice...
      C.see({ type: "subbeat", actor: a.id, target: b.id, believed: believed(), fade, count, part, hurt: 0.5 }); G.lastAct = G.tick;
      if (G.phase !== "MATCH") return;
    }
    C.see({ type: "ropebreak", actor: b.id, target: a.id, big: fade });
    PCW.say("pbp", PCW.LINES.ropebreak, 1); PCW.trust(fade ? TR.BIG : TR.SOLD);
    banner(b.p.short, fade ? "WILL NOT STAY DOWN" : "MAKES THE ROPES");
    yield* play(M.subBreak(a, b, part, { big: fade }));
  }

  /* ============================================================
     THE PIN. The man on his back has until three. The later he
     kicks out, the bigger it is. Nothing kicks out for him.
     ============================================================ */
  function* pin(a, b, feet) {
    yield* play(feet ? PCW.stage.coverFeet(a, b) : PCW.stage.cover(a, b));
    if (feet) { banner(a.p.short, "HAS HIS FEET ON THE ROPES"); PCW.see({ type: "feet", actor: a.id, target: b.id }); PCW.say("pbp", PCW.LINES.feet, 2); }
    const catchIt = feet && PCW.rnd() < 0.5;
    const fin = b.finBy === a.id && G.tick - b.finAt < 900;
    // did he cheat to get here? feet on the ropes, or a chair in the last little while
    const dirty = feet || (b.dirtyAt !== undefined && G.tick - b.dirtyAt < 1200);
    const method = dirty ? "dirty" : fin ? "fin" : "pin";
    const booked = a.id === PCW.BOOKING.winner && method === PCW.BOOKING.how;
    let vis = 0;
    const P = G.pin = { a, b, count: 0, f: 0, fin, booked, human: !padOf(b).cpu };
    PCW.say("pbp", PCW.LINES.cover, 1);
    const kickAt = padOf(b).cpu ? PCW.cpuKickAt(b, P) : -1;
    for (;;) {
      const here = G.ref.state === "count";
      if (here) P.f++;
      else if (refDown()) {
        // nobody to count it: the room counts for him (or howls), and the referee starts to stir
        if (G.ref.down > 170) G.ref.down = 170;
        if (++vis % PCW.COUNT === 0 && vis / PCW.COUNT <= 5) {
          G.crowd.see({ type: "viscount", actor: a.id, n: vis / PCW.COUNT });
          if (vis === PCW.COUNT) PCW.say("pbp", PCW.LINES.visual, 1);
        }
      }
      const cpuOut = kickAt > 0 && (P.f === kickAt || (!here && vis === PCW.COUNT * 2 + 40));
      const wantsOut = P.human ? !!padOf(b).just.act : cpuOut;
      if (wantsOut && (P.f > 0 || vis > 20)) {
        const late = P.count === 2 ? (P.f % PCW.COUNT) / PCW.COUNT : 0;
        G.pin = null;
        PCW.see({ type: "kickout", actor: b.id, target: a.id, late });
        if (booked) {
          // the cardinal betrayal: kicking out of the real finish. Always possible, always priced.
          G.shoots++; PCW.trust(TR.FINISH_KICKOUT, b.p.short + " kicked out of the FINISH");
          PCW.say("pbp", PCW.LINES.shoot, 2); gorilla(PCW.GORILLA.shoot);
        } else PCW.say("pbp", PCW.LINES.kickout, 1);
        if (G.phase !== "MATCH") return;
        b.finBy = null;
        yield* play(M.kickout(a, b));
        return;
      }
      if (here && P.f % PCW.COUNT === 0) {
        P.count++; G.ref.slap = 10;
        G.crowd.see({ type: "count", actor: a.id, n: P.count });
        if (feet && P.count < 3) G.crowd.words("boo", 5);
        if (catchIt && P.count === 2) {
          // the referee looks up and sees the feet
          G.pin = null;
          PCW.see({ type: "caught", actor: a.id, target: b.id }); PCW.say("pbp", PCW.LINES.caught, 2);
          warn(a);
          if (G.phase !== "MATCH") return;
          yield* play(M.kickout(a, b));
          return;
        }
        if (P.count >= 3) {
          G.pin = null;
          G.crowd.see({ type: "pinfall", actor: a.id, afterBig: fin });
          const type = finishType(a, method);
          PCW.say("pbp", method === "dirty" ? PCW.LINES.robbery : type === "SCREWJOB" ? PCW.LINES.screwjob : type === "FLAT" ? PCW.LINES.flatWin : PCW.LINES.cleanWin, 2);
          endMatch(type, a);
          return;
        }
      }
      yield;
    }
  }

  /* ---------------- the referee ---------------- */
  function refTick() {
    const r = G.ref;
    if (r.slap > 0) r.slap--;
    if (r.down > 0) {
      r.state = "down";
      if (--r.down === 0) {
        r.state = "stand"; PCW.say("color", PCW.LINES.refup, 1);
        // he wakes up and finds a man holding a chair
        for (const w of G.ws) if (w.weapon) { w.weapon = false; warn(w); }
      }
      return;
    }
    let tx, tz, want = "stand";
    if (G.pin) { tx = clamp(G.pin.b.x + 86, R.LO + 30, R.HI - 10); tz = clamp(G.pin.b.z + 46, B.ZLO, B.ZHI); want = "count"; }
    else if (G.ws.some(w => w.out)) { tx = clamp((G.stove.x + G.boulder.x) / 2 + 150, B.XLO, B.XHI); tz = 50; want = "point"; }
    else {
      const mid = (G.stove.x + G.boulder.x) / 2, mz = (G.stove.z + G.boulder.z) / 2;
      tx = clamp(mid + (mid < R.CX ? 180 : -180), B.XLO, B.XHI); tz = clamp(mz + 130, B.ZLO, R.D - 14);
    }
    const dx = tx - r.x, dz = tz - r.z, m = Math.hypot(dx, dz), sp = G.pin ? 6.5 : 2.6;
    if (m > sp + 1) {
      r.x += dx / m * sp; r.z += dz / m * sp;
      if (Math.abs(dx) > 2) r.facing = Math.sign(dx);
      r.state = "walk";
    } else {
      r.state = want;
      r.facing = want === "count" ? -1 : ((G.stove.x + G.boulder.x) / 2 >= r.x ? 1 : -1);
    }
  }

  /* ---------------- the office, in your ear ---------------- */
  function officeTick() {
    const t = G.tick;
    if (t === 140 * 60) gorilla(PCW.GORILLA.home);
    if (t === 185 * 60) gorilla(PCW.GORILLA.now);
    if (t > 185 * 60 && (t - 185 * 60) % (45 * 60) === 0) gorilla(PCW.GORILLA.over);
  }

  /* ============================================================
     ENDINGS. The rating is the room. And the room has an opinion
     about each man, which is the real result.
     ============================================================ */
  function endMatch(type, winner) {
    if (G.phase !== "MATCH") return;
    G.phase = "ENDED"; G.shake = 0; G.hitstop = 0; G.ask = null; G.pin = null; G.busy = false;
    const C = G.crowd, RT = PCW.RATING;
    // the room: how loud it was on average, how loud it got at its loudest, and whether they stayed with it
    const room = C.avgHeat() * RT.HEAT_W + C.peak * RT.PEAK_W + C.avgAttn() * (1 - RT.HEAT_W - RT.PEAK_W);
    const parts = [["the room", Math.max(0, (room - RT.FLOOR) / RT.PER_STAR)]];
    if (type === "CLEAN") parts.push(["clean finish", RT.CLEAN]);
    if (type === "FLAT") parts.push(["no real finish", RT.FLAT]);
    if (type === "COUNTOUT") parts.push(["count-out", RT.COUNTOUT]);
    if (type === "DQ") parts.push(["disqualification", RT.DQ]);
    PCW.sfx.bell(3);
    if (G.trust >= 80) parts.push(["trust held", RT.TRUST]);
    // each man was booked in a role, and each role has a job
    const jobs = { stove: job("stove"), boulder: job("boulder") };
    for (const id of ["stove", "boulder"]) parts.push([PCW.PERSONAS[id].short + "'s job", jobs[id].score * RT.JOB]);
    const secs = G.tick / 60;
    if (secs < 100 && type !== "BREAKDOWN") parts.push(["over too soon", -Math.round((100 - secs) / 100 * 2 * 4) / 4]);
    let stars = parts.reduce((s, p) => s + p[1], 0);
    if (type === "BREAKDOWN") stars = Math.min(stars, 1.25);
    stars = clamp(Math.round(stars * 4) / 4, 0.25, 5);
    if (type === "BREAKDOWN") PCW.say("color", PCW.LINES.breakdown, 2);
    G.end = {
      type, stars, parts, winner: winner ? winner.id : null,
      time: G.tick / 60, trust: G.trust,
      heat: Math.round(C.avgHeat()), attn: Math.round(C.avgAttn()), peak: Math.round(C.peak),
      verdict: { stove: verdict("stove"), boulder: verdict("boulder") }, jobs,
      headline:
        type === "CLEAN" ? (PCW.BOOKING.how === "dirty" ? "He stole it, exactly as booked. They are furious." : PCW.BOOKING.how === "sub" ? "NEW CHAMPION, by submission. As booked." : "NEW CHAMPION. As booked.") :
          type === "CALLED" ? "The right man won, but not with the booked finish. It still worked." :
          type === "FLAT" ? "The right man won, but nobody saw a finish." :
            type === "SCREWJOB" ? "The wrong man won. That was not the plan." :
              type === "COUNTOUT" ? "Counted out. Nobody paid to see that." :
                type === "DQ" ? "Disqualified. He cheated once too often, right in front of the referee." :
                "It fell apart in front of everybody."
    };
  }
  PCW.endMatch = endMatch;

  /* THE JOB. The face's job is to be cheered; the heel's job is to be booed.
     How well it was done = how strongly they feel that way x how much they react to him at all. */
  PCW.ROLE = {
    face: { tag: "FACE", job: "get cheered" },
    heel: { tag: "HEEL", job: "get booed" }
  };
  function job(id) {
    const w = G.crowd.W[id], role = PCW.PERSONAS[id].booked;
    const dir = role === "face" ? w.like : -w.like;
    const score = clamp(dir / 100, 0, 1) * clamp(w.over / 100, 0, 1);
    const word = dir < -8 ? "BACKWARDS" : score >= 0.6 ? "DONE" : score >= 0.3 ? "HALF DONE" : "NOT DONE";
    return { role, score, word };
  }

  function verdict(id) {
    const w = G.crowd.W[id], l = w.like, o = w.over, l0 = w.like0;
    let text;
    if (o < 32) text = "They stopped caring about him. That is the worst one.";
    else if (l0 > 0 && l < -8) text = "They turned on him. He walked in a hero and got booed.";
    else if (l0 < 0 && l > 8) text = "They started cheering him. The office booked a villain and got a star.";
    else if (l >= 55 && o >= 68) text = "They love him. He was made tonight.";
    else if (l <= -55 && o >= 68) text = "They hate him and they are loud about it. Made as a villain.";
    else if (l > 0) text = l >= l0 ? "Still their guy. A little more than before." : "Still their guy, but he lost some of them.";
    else text = l <= l0 ? "Still the one they boo. A little louder than before." : "Still booed, but the edge came off it.";
    return { like: Math.round(l), over: Math.round(o), like0: l0, over0: w.over0, text };
  }
})();
