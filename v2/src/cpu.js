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
    pad.aiAx = 0; pad.aiAz = 0;
    const j = pad.just, B = PCW.BOUNDS;
    const ai = me.ai || (me.ai = { wait: 50, next: null, chops: 0, sellAt: 8, tieAt: 60, seenDown: -1, plan: "wait", stomps: 0, usedFin: false, grap: 0, revRoll: 0 });
    const t = G.tick / 60, phase = phaseAt(t);
    const d = PCW.dist(me, foe), toward = Math.sign(foe.x - me.x) || 1;
    const myTurn = turnAt(t) === me.id;
    const deadAir = G.tick - G.lastAct > 300;

    /* walk to a spot (both axes) */
    const goTo = (tx, tz) => {
      const dx = tx - me.x, dz = tz - me.z;
      pad.aiAx = Math.abs(dx) > 6 ? Math.sign(dx) : 0;
      pad.aiAz = Math.abs(dz) > 6 ? Math.sign(dz) : 0;
    };
    /* stand beside him, on his line, on whichever side I am already on */
    const close = gap => {
      const side = (me.x <= foe.x) ? -1 : 1;
      let tx = foe.x + side * gap;
      if (tx < B.XLO || tx > B.XHI) tx = foe.x - side * gap;      // he's on the ropes: come from the middle
      goTo(tx, foe.z);
    };
    const away = gap => { if (d < gap) { pad.aiAx = -toward; } };

    /* ---- doing my job when it's done to me ---- */
    if (me.state === S.HIT) {
      // a partner you've burned stops selling crisp: he sells late
      if (me.sf === 1) ai.sellAt = (G.trust < 35 ? 24 : 5) + Math.floor(rnd() * 8);
      if (me.sf >= ai.sellAt) j.give = true;
      return;
    }
    if (G.pin) {
      if (G.pin.d === me && !G.pin.booked && G.pin.f >= F.COUNT * 2 + 14) j.grab = true;   // kick out at two
      return;
    }
    if (me.state === S.DOWN) {
      if (me.sf >= me.sellExpect * 0.95 + 20) j.getup = true;                 // sell the whole thing, then get up
      return;
    }
    if (me.state === S.CORNER) return;                                        // hang there and take it
    if (G.tie) {
      const T = G.tie;
      if (T.b === me) {
        if (T.frame === 1) ai.revRoll = rnd();
        if (myTurn && T.frame === F.REV_OPEN + 12 && ai.revRoll < 0.8) j.grab = true;   // take over with a reversal
        return;
      }
      if (T.a === me && !T.cmd && T.frame >= Math.max(ai.tieAt, F.TIE_SETTLE)) {
        if (phase === "finish" && me.id === PCW.BOOKING.winner) j.taunt = true;        // the finish
        else if (me.id === "boulder" && !ai.usedFin && t > 78 && phase === "heat") { j.taunt = true; ai.usedFin = true; }   // the champ's near-fall
        else {
          const k = ai.grap++ % 4;            // slam, ropes, slam, corner
          if (k === 0 || k === 2) j.grab = true;
          else if (k === 1) {
            // send him the long way: across the ring, or front to back
            if (rnd() < 0.7) pad.aiWhip = { x: (foe.x < R.CX ? 1 : -1), z: 0 };
            else pad.aiWhip = { x: 0, z: (foe.z < R.D / 2 ? 1 : -1) };
          } else pad.aiWhip = { x: (foe.x >= me.x ? 1 : -1), z: (foe.z < R.D / 2 ? -1 : 1) };   // the nearest corner behind him
        }
        ai.wait = 70 + Math.floor(rnd() * 40);
      }
      return;
    }
    if (me.state === S.RUN) {
      // sent to the ropes: take the clothesline, unless it's my turn to take over
      if (myTurn && !me.run.corner && me.bounces >= 1 && !me.tackling) j.strike = true;
      return;
    }
    if (foe.state === S.RUN && (PCW.free(me) || me.state === S.WHIP)) {
      if (foe.whipFrom === me && !foe.run.corner && !me.clothReady && foe.bounces >= 1) j.strike = true;
      return;
    }
    if (!PCW.free(me)) return;
    if (ai.wait > 0) ai.wait--;

    /* ---- not my turn: stay close and give him something to work with ---- */
    if (!myTurn && !deadAir) {
      if (foe.state === S.DOWN) away(170);
      else if (d > 96) close(84);
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
      else if (ai.plan === "cover") { if (d > 112) close(70); else { j.grab = true; ai.plan = "wait"; } }
      else if (ai.plan === "stomp") {
        if (d > 98) close(74);
        else { j.strike = true; ai.wait = 46; if (++ai.stomps >= 2) ai.plan = "wait"; }
      } else away(165);
      return;
    }

    /* ---- he's up: go to work ---- */
    if (foe.state === S.GETUP || !PCW.standing(foe)) return;
    if (ai.wait > 0) { if (d > 150) close(84); return; }
    if (!ai.next) {
      if (phase === "finish" && me.id === PCW.BOOKING.winner) ai.next = "grab";
      else if (ai.chops <= 0 && rnd() < 0.55) { ai.next = "chop"; ai.chops = 2 + Math.floor(rnd() * 2); }
      else ai.next = "grab";
    }
    if (d > 94) { close(80); return; }
    if (ai.next === "chop") {
      j.strike = true; ai.wait = 52;
      if (--ai.chops <= 0) { ai.next = null; ai.wait = 84; }
    } else if (PCW.free(foe) || foe.state === S.TAUNT || foe.state === S.CORNER) {
      j.grab = true; ai.next = null;
      ai.tieAt = F.TIE_SETTLE + 10 + Math.floor(rnd() * 16);
    }
  };
})();
