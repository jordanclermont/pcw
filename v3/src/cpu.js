/* ============================================================
   v3 — src/cpu.js
   THE CPU PARTNER. He is working WITH you, not against you.
   He knows the shape a match is supposed to have:

     the challenger looks good early    (the shine)
     the champion takes over            (the heat)
     the challenger fights back         (the comeback)
     the finish

   He takes his turn when it is his, gives it back when it is yours,
   sells what you give him, cuts off your first comeback and feeds
   your second, and lies down for the booked finish. He reads the
   same crowd you do. He never double-crosses you, but if you burn
   his trust he stops making you look good.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;
  const R = PCW.RING, B = PCW.BOUNDS, G = PCW.G;
  const rnd = PCW.rnd;

  const BOOK = () => PCW.BOOKING;
  function phaseAt(t) {
    if (t >= 152) return "finish";
    if (G.cb) return "comeback";                 // the comeback starts when it is fed, not on a clock
    return t < 32 ? "shine" : t < 124 ? "heat" : "comeback";
  }
  /* whose turn the clock says it is */
  function turnAt(t) { const ph = phaseAt(t); return ph === "finish" ? BOOK().winner : ph === "heat" ? PCW.HEEL : PCW.FACE; }
  PCW.phaseAt = phaseAt;

  const brain = w => w.ai || (w.ai = { pace: 50, seenDown: -1, queue: [], last: null, cuts: 0, usedFin: false, flown: false, outs: 0, dove: false, floor: 0, tryAt: 0 });
  const has = (opts, id) => opts.find(o => o.id === id);

  /* ---------------- walking, and deciding when to step up ---------------- */
  PCW.cpuRoam = function (me, foe) {
    const ai = brain(me), out = { ax: 0, az: 0, act: false };
    const t = G.tick / 60, since = G.tick - G.seqEnd;
    const goTo = (tx, tz) => {
      const dx = tx - me.x, dz = tz - me.z;
      out.ax = Math.abs(dx) > 6 ? Math.sign(dx) : 0; out.az = Math.abs(dz) > 6 ? Math.sign(dz) : 0;
      return Math.abs(dx) <= 6 && Math.abs(dz) <= 6;
    };
    const beside = gap => {
      const lo = me.out ? B.OX0 : B.XLO, hi = me.out ? B.OX1 : B.XHI;
      const side = me.x <= foe.x ? -1 : 1;
      let tx = foe.x + side * gap; if (tx < lo || tx > hi) tx = foe.x - side * gap;
      return goTo(tx, foe.z);
    };
    const d = Math.hypot(me.x - foe.x, (me.z - foe.z) * 1.4);
    const humanFoe = !PCW.pads[foe.id].cpu;
    // is it mine to do something? I have control, or the air has gone dead on my watch
    const dead = G.tick - Math.max(G.lastAct, G.seqEnd) > (humanFoe ? 330 : 150);
    const mine = G.ctrl === me.id || (G.ctrl === null && turnAt(t) === me.id && (!humanFoe || dead)) || (dead && (turnAt(t) === me.id || G.tick - Math.max(G.lastAct, G.seqEnd) > 600));
    if (since < ai.pace || foe.solo) return out;

    /* on the floor */
    if (me.out && !foe.out) { if (G.out.n >= 3 || mine) out.act = true; return out; }       // get back in
    if (!me.out && foe.out) {
      if (!mine) return out;
      if (!ai.floorPlan) ai.floorPlan = (foe.st === "stand" && !ai.dove && me.id === PCW.FACE && t > 60) ? "dive" : (G.out.n < 4 && rnd() < 0.6 ? "goout" : "pose");
      if (ai.floorPlan === "pose" && me.hasPosed && G.out.n < 6) return out;                 // posed already: let him get back in
      out.act = true; return out;
    }
    ai.floorPlan = null;
    if (me.out && foe.out) {
      if (!mine) { if (G.out.n >= 6) out.act = d < PCW.REACH ? false : true; return out; }
      if (foe.st === "down" && G.out.n < 4 && foe.downT > 40) return out;                    // let it breathe
      if (d > 120) beside(84); else out.act = true;
      return out;
    }

    /* in the ring */
    if (foe.st === "down") {
      if (!mine) { if (d < 170) out.ax = me.x <= foe.x ? -1 : 1; return out; }
      if (foe.downId !== ai.seenDown) { ai.seenDown = foe.downId; ai.queue = planDown(me, foe, t, ai); }
      const next = ai.queue[0];
      if (!next) { if (d < 170) out.ax = me.x <= foe.x ? -1 : 1; return out; }
      if (next === "elbow" || next === "pose") { out.act = true; return out; }
      if (foe.downT < 30) return out;                                                        // too late: he is getting up
      if (d > 120) beside(80); else out.act = true;
      return out;
    }
    if (!mine) {
      if (d > 130 && foe.st === "stand") beside(96);                                          // stay close: give him something to work with
      return out;
    }
    if (d > 118) beside(84); else out.act = true;
    return out;
  };

  /* he is down: what do I do about it? A short list, in order. */
  function planDown(me, foe, t, ai) {
    const winner = me.id === BOOK().winner, phase = phaseAt(t);
    if (me.weapon) return G.ref.down > 70 ? ["chair", "cover"] : [];
    if (foe.dirtyAt !== undefined && G.tick - foe.dirtyAt < 700 && me.p.booked === "heel") return ["cover"];
    if (foe.finBy === me.id && G.tick - foe.finAt < 500) return ["cover"];
    if (G.ref.down > 150 && me.p.booked === "heel") return ["getchair"];
    if (phase === "finish" && winner) {
      const how = BOOK().how;
      if (how === "sub") return G.crowd.hurt[foe.id][PCW.worstPart(foe)] >= 4 ? ["submit"] : ["pickup"];
      if (how === "dirty") return t > 200 ? ["ropecover", "cover"] : ["ropecover", "pickup"];
      return ["pickup"];
    }
    const r = rnd(), q = [];
    const landed = G.tick - me.landedAt < 150 && !me.hasPosed;
    const canFly = !foe.seated && PCW.cornerFor(foe).d < 400 && !ai.flown && t > 45 && foe.downT > 150;
    if (canFly && r < 0.45) { ai.flown = true; return t > 70 && rnd() < 0.5 ? ["elbow", "cover"] : ["elbow"]; }
    if (landed && r < 0.5) q.push("pose");
    if (me.p.booked === "heel" && rnd() < 0.5) q.push("stomp");
    // a hold on the part he has been working, once the room believes it
    const part = PCW.worstPart(foe);
    if (G.crowd.hurt[foe.id][part] >= 4 && t > 60 && (ai.subs || 0) < 2 && rnd() < 0.55) { ai.subs = (ai.subs || 0) + 1; return q.concat(["submit"]); }
    if (t > 55 && foe.sellT >= 150 && rnd() < 0.3) q.push("cover");
    else if (rnd() < 0.6) q.push("pickup");
    return q;
  }

  /* ---------------- answering a choice ---------------- */
  PCW.cpuChoose = function (me, kind, opts, ctx) {
    const ai = brain(me), t = G.tick / 60, phase = phaseAt(t), foe = PCW.other(me);
    const winner = me.id === BOOK().winner, myTurn = turnAt(t) === me.id;
    const humanFoe = !PCW.pads[foe.id].cpu;
    ai.pace = 34 + Math.floor(rnd() * 30);

    /* count-along: he listens to the room. Stops when it has had its fill (now and then one too many). */
    if (kind === "again") {
      if (ctx.ten) return has(opts, "again");
      const stop = ai.fill !== undefined && ai.fillFor === ctx.fill ? ai.fill : (ai.fillFor = ctx.fill, ai.fill = ctx.fill + (rnd() < 0.2 ? 1 : rnd() < 0.3 ? -1 : 0));
      if (ctx.n >= stop) { ai.fill = undefined; return has(opts, "enough"); }
      return has(opts, "again");
    }
    /* which part to work: he picks one for the night and stays on it */
    if (kind === "limbpart") {
      if (!ai.part) ai.part = PCW.pick(["arm", "leg", "back"]);
      if (winner && BOOK().how === "sub") return has(opts, "p_" + ai.part);
      return (ai.limbs = (ai.limbs || 0) + 1) % 4 === 0 ? has(opts, "headlock") : has(opts, "p_" + ai.part);
    }
    /* in a hold */
    if (kind === "submit") {
      const loser = me.id === BOOK().loser;
      // the booked loser can give up to a hold the room believes, late: that is a finish too
      if (loser && ctx.believed && (BOOK().how === "sub" ? (phase === "finish" || t > 125) : (t > 120 && !PCW.pads[foe.id].cpu))) return has(opts, "s_tap");
      if (G.tick > ai.tryAt && myTurn && G.ctrl !== me.id && !(phase === "finish" && loser) && rnd() < 0.4) { ai.tryAt = G.tick + 240; return has(opts, "s_power"); }
      if (G.trust >= 50 && ctx.believed && rnd() < 0.5) return has(opts, "s_fade");
      return has(opts, "s_ropes");
    }

    if (kind === "answer") {
      if (has(opts, "take")) return has(opts, "take");
      // the heel takes a walk when the hero gets rolling (once or twice a match, never at the finish)
      if (has(opts, "bail") && (ai.bails || 0) < 2 && t > 40 && phase !== "finish" && G.run[foe.id] >= 2 && G.tick > (ai.bailAt || 0) && rnd() < 0.45) {
        ai.bails = (ai.bails || 0) + 1; ai.bailAt = G.tick + 1500; return has(opts, "bail");
      }
      const big = PCW.SIZE[ctx.move] || 2;
      if (G.trust < 25 && has(opts, "shrug") && rnd() < 0.3) return has(opts, "shrug");            // a receipt
      const finishing = phase === "finish" && !winner;
      const taken = G.crowd.W[me.id].taken;
      if (has(opts, "fire") && !finishing && G.tick > ai.tryAt) {
        // take the match when the clock says it is mine; or fight back when I have been taking a beating
        const p = (myTurn && G.ctrl !== me.id) ? (G.run[foe.id] >= 2 ? 0.8 : 0.3) : (taken >= 10 ? 0.4 : 0);
        if (rnd() < p) { ai.tryAt = G.tick + 240; return has(opts, "fire"); }
      }
      if (has(opts, "big") && G.trust >= 50 && big >= 2.4 && rnd() < 0.5) return has(opts, "big");
      return has(opts, "sell");
    }

    if (kind === "fireback") {
      // his comeback: is it time? The first one in my stretch gets cut off (the hope spot).
      const hisTime = !myTurn || phase !== "heat" || t > 100;
      if (hisTime || ai.cuts >= 2) { ai.cuts = 0; return has(opts, "feed"); }
      ai.cuts++; return has(opts, "cut");
    }

    /* kind === "lead": I am doing something */
    if (ai.queue[0] === "chair" && G.ref.down <= 70) ai.queue = [];            // the referee is up: do not swing it
    if (ai.queue[0] === "ropecover" && G.warn[me.id] >= PCW.WARNINGS - 1) ai.queue.shift();   // one more warning would end it
    let first = ai.queue[0];
    while (first && !has(opts, first) && ai.queue.length > 1 && (first === "ropecover" || first === "chair" || first === "getchair")) { ai.queue.shift(); first = ai.queue[0]; }
    if (first === "cover" && has(opts, "ropecover") && !(foe.finBy === me.id) && G.warn[me.id] < PCW.WARNINGS - 1 && rnd() < 0.7) { ai.queue.shift(); return has(opts, "ropecover"); }
    if (first && has(opts, first)) { ai.queue.shift(); return has(opts, first); }
    if (has(opts, "selfin") && !has(opts, "chops")) {
      if (me.out && !foe.out) return has(opts, "selfin");
      return G.out.n >= 5 ? has(opts, "selfin") : has(opts, "pose");
    }
    if (has(opts, "goout") || has(opts, "dive")) {
      const p = ai.floorPlan; ai.floorPlan = null;
      if (p === "dive" && has(opts, "dive")) { ai.dove = true; return has(opts, "dive"); }
      if (p === "goout") return has(opts, "goout");
      return has(opts, "pose");
    }
    if (has(opts, "rollin")) {                                  // on the floor together
      ai.floor++;
      if (G.out.n >= 5 || ai.floor > 2) { ai.floor = 0; return has(opts, "rollin"); }
      if (has(opts, "apron") && ai.floor === 2) return has(opts, "apron");
      return has(opts, "chops") || has(opts, "stomp") || has(opts, "rollin");
    }
    if (has(opts, "pose") && !has(opts, "chops") && !has(opts, "cornerchops")) return has(opts, "pose");

    // standing, with my hands on him
    if (me.weapon && has(opts, "chair") && G.ref.down > 70) return has(opts, "chair");
    if (has(opts, "getchair") && me.p.booked === "heel") return has(opts, "getchair");
    if (phase === "finish" && winner) {
      const how = BOOK().how;
      if (how === "fin" && has(opts, "finisher")) return has(opts, "finisher");
      if (how === "sub") {
        // stay on one body part until the room believes it, then put him down for the hold
        const part = PCW.worstPart(foe);
        if (G.crowd.hurt[foe.id][part] > 0) ai.part = part;
        if (G.crowd.hurt[foe.id][part] < 4 && has(opts, "limb")) return has(opts, "limb");
        return has(opts, "quick") || has(opts, "power") || opts[0];
      }
      if (how === "dirty") {
        // steal it: flatten the referee and go for the chair, or get him down by the ropes
        if (has(opts, "refbump") && (!ai.bumped || G.tick > (ai.bumpAt || 0) + 1500)) { ai.bumped = true; ai.bumpAt = G.tick; return has(opts, "refbump"); }
        return has(opts, "ropes") || has(opts, "power") || opts[0];
      }
    }
    // the heel's big cheat, once, in the middle of the match: referee down, chair out, a near-fall
    if (me.p.booked === "heel" && has(opts, "refbump") && !ai.bumped && BOOK().how !== "dirty" && t > 88 && phase === "heat" && G.run[me.id] >= 2 && rnd() < 0.4) { ai.bumped = true; return has(opts, "refbump"); }
    // it is his time now: hand it over (to a person: only after I have had a couple)
    if (!myTurn && has(opts, "letgo") && G.run[me.id] >= (humanFoe ? 1 : 2)) return has(opts, "letgo");
    if (me.p.booked === "heel" && has(opts, "finisher") && !ai.usedFin && t > 84 && phase === "heat" && G.run[me.id] >= 3) { ai.usedFin = true; return has(opts, "finisher"); }
    // a thumb in the eye, but only behind the referee's back
    if (has(opts, "rake") && !PCW.refSees(me) && G.tick > (ai.rakeAt || 0) && rnd() < 0.6) { ai.rakeAt = G.tick + 1100; ai.last = "rake"; return has(opts, "rake"); }
    // working a body part: mostly the heel's game, and mostly while he is on top
    if (has(opts, "limb") && ai.last !== "limb" && rnd() < (me.p.booked === "heel" ? 0.3 : 0.12)) { ai.last = "limb"; return has(opts, "limb"); }
    // ten punches: the crowd counts for a man it likes
    if (has(opts, "tenpunch") && !ai.ten && G.crowd.W[me.id].like > G.crowd.W[foe.id].like && rnd() < 0.5) { ai.ten = true; ai.last = "tenpunch"; return has(opts, "tenpunch"); }
    const pool = opts.filter(o => !["finisher", "letgo", "back", "rake", "limb", "tenpunch", "refbump", "getchair", "chair"].includes(o.id) && o.id !== ai.last);
    const ok = pool.filter(o => {
      if (o.id === "throwout") return ai.outs < 1 && t > 40 && rnd() < 0.5 && (ai.outs++, true);
      if (o.id === "headlock") return t > 30;
      return true;
    });
    // prefer what the room has not seen much of
    ok.sort((x, y) => (G.crowd.mem[me.id + ":" + x.id] || 0) - (G.crowd.mem[me.id + ":" + y.id] || 0) + (rnd() - 0.5) * 0.8);
    const pick = ok[0] || pool[0] || opts[0];
    ai.last = pick.id;
    return pick;
  };

  /* pinned: which frame of the count do I kick out on? (-1 = I stay down) */
  PCW.cpuKickAt = function (me, pin) {
    if (pin.booked) return -1;                                   // the finish: lie there
    const t = G.tick / 60;
    if (me.id === BOOK().loser && pin.fin && t > 150) return -1;
    if (me.id === BOOK().loser && t > 205) return -1;             // it has gone long: let it end
    return PCW.COUNT * 2 + 12 + Math.floor(rnd() * 28);          // a good two-count
  };
})();
