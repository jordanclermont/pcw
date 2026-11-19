/* ============================================================
   v2 — src/cpu.js
   THE CPU PERFORMER — a partner, not an opponent (bible §5.12).
   It does its job: takes turns on offence so the match has a shape
   (the challenger looks good early, the champion takes over, the
   challenger fights back, then the finish), sells what it's given,
   stays down, kicks out at two, and lies down for the booked finish.
   It never shoots. It plays through the same pad a person does.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;
  const F = PCW.F, S = PCW.S, R = PCW.RING, G = PCW.G;
  const rnd = PCW.rnd;

  /* whose turn is it to be on offence, by the clock (seconds) */
  function phaseAt(t) { return t < 28 ? "shine" : t < 95 ? "heat" : t < 140 ? "comeback" : "finish"; }
  function turnAt(t) {
    const ph = phaseAt(t);
    if (ph === "heat") return (t > 56 && t < 61) ? "stove" : "boulder";   // one hope spot in the middle
    return "stove";
  }
  PCW.phaseAt = phaseAt;

  PCW.cpuThink = function (me, foe, pad) {
    pad.aiAx = 0;
    const j = pad.just;
    const ai = me.ai || (me.ai = { wait: 50, next: null, chops: 0, sellAt: 8, tieAt: 40, seenDown: -1, plan: "wait", stomps: 0, usedFin: false, lastGrap: "whip", revRoll: 0 });
    const t = G.tick / 60, phase = phaseAt(t);
    const d = Math.abs(me.x - foe.x), toward = Math.sign(foe.x - me.x) || 1;
    const myTurn = turnAt(t) === me.id;
    const deadAir = G.tick - G.lastAct > 300;

    /* ---- doing my job when it's done to me ---- */
    if (me.state === S.HIT) {
      // a partner you've burned stops selling crisp: he sells late
      if (me.sf === 1) ai.sellAt = (G.trust < 35 ? 17 : 5) + Math.floor(rnd() * 8);
      if (me.sf >= ai.sellAt) j.work = true;
      return;
    }
    if (G.pin) {
      if (G.pin.d === me && !G.pin.booked && G.pin.f >= F.COUNT * 2 + 14) j.work = true;   // kick out at two
      return;
    }
    if (me.state === S.DOWN) {
      if (me.sf >= me.sellExpect * 0.95 + 20) j.work = true;                  // sell the whole thing, then get up
      return;
    }
    if (G.tie) {
      const T = G.tie;
      if (T.b === me) {
        if (T.frame === 1) ai.revRoll = rnd();
        if (myTurn && T.frame === F.REV_OPEN + 5 && ai.revRoll < 0.8) j.work = true;   // take over with a reversal
        return;
      }
      if (T.a === me && T.frame >= Math.max(ai.tieAt, F.TIE_SETTLE)) {
        if (phase === "finish" && me.id === PCW.BOOKING.winner) j.taunt = true;        // the finish
        else if (me.id === "boulder" && !ai.usedFin && t > 78 && phase === "heat") { j.taunt = true; ai.usedFin = true; }   // the champ's near-fall
        else if (ai.lastGrap === "whip") { j.work = true; ai.lastGrap = "slam"; }
        else {
          const dir = (foe.x > me.x) ? ((R.HI - foe.x) > 160 ? 1 : -1) : ((foe.x - R.LO) > 160 ? -1 : 1);
          if (dir < 0) j.left = true; else j.right = true;
          ai.lastGrap = "whip";
        }
        ai.wait = 70 + Math.floor(rnd() * 40);
      }
      return;
    }
    if (me.state === S.RUN) {
      // sent to the ropes: take the clothesline, unless it's my turn to take over
      if (myTurn && me.bounces >= 1 && d < 170) j.strike = true;
      return;
    }
    if (!PCW.free(me)) return;
    if (foe.state === S.RUN) {
      if (foe.whipFrom === me && foe.bounces >= 1 && (me.x - foe.x) * foe.vx > 0 && d < 210) j.strike = true;
      return;
    }
    if (ai.wait > 0) ai.wait--;

    /* ---- not my turn: stay close and give him something to work with ---- */
    if (!myTurn && !deadAir) {
      if (foe.state === S.DOWN) { if (d < 170) pad.aiAx = -toward; }
      else if (d > 92) pad.aiAx = toward;
      return;
    }

    /* ---- he's down: pose, put the boots to him, cover, or let him breathe ---- */
    if (foe.state === S.DOWN) {
      if (foe.downId !== ai.seenDown) {
        ai.seenDown = foe.downId; ai.stomps = 0;
        const justLanded = G.tick - me.landedAt < 120 && !me.posed;
        const myFinisher = foe.finishedBy === me.id && G.tick - foe.finishedAt < 300;
        const r = rnd();
        if (myFinisher) ai.plan = "cover";
        else if (justLanded && r < 0.45) ai.plan = "pose";
        else if (me.id === "boulder" && r < 0.75) ai.plan = "stomp";
        else if (foe.sellExpect >= 130 && t > 45 && r > 0.82) ai.plan = "cover";
        else ai.plan = "wait";
        ai.wait = Math.max(ai.wait, 24);
      }
      if (ai.wait > 0) return;
      if (ai.plan === "pose") { j.taunt = true; ai.plan = "wait"; ai.wait = 80; }
      else if (ai.plan === "cover") { if (d > 110) pad.aiAx = toward; else { j.grab = true; ai.plan = "wait"; } }
      else if (ai.plan === "stomp") {
        if (d > 96) pad.aiAx = toward;
        else { j.strike = true; ai.wait = 46; if (++ai.stomps >= 2) ai.plan = "wait"; }
      } else if (d < 165) pad.aiAx = -toward;
      return;
    }

    /* ---- he's up: go to work ---- */
    if (foe.state === S.GETUP || !PCW.standing(foe)) return;
    if (ai.wait > 0) { if (d > 150) pad.aiAx = toward; return; }
    if (!ai.next) {
      if (phase === "finish" && me.id === PCW.BOOKING.winner) ai.next = "grab";
      else if (ai.chops <= 0 && rnd() < 0.55) { ai.next = "chop"; ai.chops = 2 + Math.floor(rnd() * 2); }
      else ai.next = "grab";
    }
    if (d > 90) { pad.aiAx = toward; return; }
    if (ai.next === "chop") {
      j.strike = true; ai.wait = 44;
      if (--ai.chops <= 0) { ai.next = null; ai.wait = 78; }
    } else if (PCW.free(foe) || foe.state === S.TAUNT) {
      j.grab = true; ai.next = null;
      ai.tieAt = F.TIE_SETTLE + 12 + Math.floor(rnd() * 16);
    }
  };
})();
