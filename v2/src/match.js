/* ============================================================
   v2 — src/match.js
   The rules of the ring. Fixed 60 Hz logic.

   THE TWO-AUDIENCE RULE, enforced here:
     - the crowd only ever hears about things through crowd.see(<what
       row twelve could watch>). Nothing here touches heat directly.
     - TRUST moves on backstage truth (missed cues, no-sells, kicking
       out of the finish) and never touches the crowd.

   There is no call sheet in this build. The office fixed ONE thing —
   the finish — and everything before it is called in the ring.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;
  const F = PCW.F, M = PCW.MOVE, MV = PCW.MOVES, R = PCW.RING, TR = PCW.TRUST;
  const clamp = PCW.clamp, lerp = PCW.lerp;

  const S = PCW.S = {
    IDLE: "IDLE", WALK: "WALK", STRIKE: "STRIKE", HIT: "HIT", SELL: "SELL", NOSOLD: "NOSOLD",
    WHIFF: "WHIFF", TIE: "TIE", SLAM_A: "SLAM_A", LIFTED: "LIFTED", DRAG: "DRAG", BUMP: "BUMP",
    DOWN: "DOWN", GETUP: "GETUP", WHIP: "WHIP", RUN: "RUN", CLOTH: "CLOTH", TACKLE: "TACKLE",
    STOMP: "STOMP", TAUNT: "TAUNT", COVER: "COVER", PINNED: "PINNED"
  };

  const G = PCW.G = { phase: "PRE", tick: 0 };

  const set = (w, s) => { w.state = s; w.sf = 0; };
  const free = w => w.state === S.IDLE || w.state === S.WALK;
  const standing = w => ![S.DOWN, S.PINNED, S.COVER, S.BUMP, S.LIFTED, S.RUN].includes(w.state);
  const hittable = w => [S.IDLE, S.WALK, S.TAUNT, S.NOSOLD, S.SELL, S.GETUP, S.WHIFF].includes(w.state);
  const tieable = w => [S.IDLE, S.WALK, S.TAUNT, S.NOSOLD].includes(w.state);
  const padOf = w => PCW.pads[w.id];
  const other = w => (w === G.stove ? G.boulder : G.stove);
  PCW.free = free; PCW.standing = standing; PCW.other = other;

  function makeWrestler(p) {
    return {
      p, id: p.id, x: p.startX, vx: 0, y: 0, rot: 0, rotT: 0, facing: p.facing,
      state: S.IDLE, sf: 0, pose: null, sellExpect: 0, bumpFrom: null, downId: 0,
      landedAt: -9999, posed: true, finishedAt: -9999, finishedBy: null,
      bounces: 0, tackling: false, jolt: 0, kick: 0, ai: null
    };
  }

  /* ---------------- talk ---------------- */
  /* prio: 0 routine, 1 notable, 2 must-hear. A line can't be stepped on by a
     lower one while it's fresh. */
  PCW.say = function (voice, text, prio) {
    prio = prio || 0;
    if (Array.isArray(text)) text = PCW.pick(text);
    if (G.line && G.line.t < 90 && prio < G.line.prio) return;
    G.line = { voice, text, t: 0, prio };
  };
  function gorilla(text) { G.gorilla = { text, t: 0 }; }
  function trust(delta, why) {
    if (G.phase !== "MATCH") return;
    const before = G.trust;
    G.trust = clamp(G.trust + delta, 0, 100);
    if (G.trust !== before) G.trustFlash = { d: G.trust - before, t: 0, why: delta < 0 ? why : null };
    if (G.trust <= 0) endMatch("BREAKDOWN", null);
  }
  function landed(a) { a.landedAt = G.tick; a.posed = false; G.lastAct = G.tick; }

  /* ---------------- start ---------------- */
  PCW.startMatch = function () {
    G.phase = "MATCH"; G.tick = 0; G.hitstop = 0; G.shake = 0; G.ropeShake = 0; G.ropeSide = 0;
    G.stove = makeWrestler(PCW.PERSONAS.stove);
    G.boulder = makeWrestler(PCW.PERSONAS.boulder);
    G.ws = [G.stove, G.boulder];
    G.tie = null; G.slam = null; G.pin = null;
    G.ref = { x: 640, state: "stand", sf: 0, facing: 1, slap: 0 };
    G.trust = 100; G.trustFlash = null; G.lastAct = 0; G.shoots = 0; G.nosells = 0;
    G.line = null; G.gorilla = null; G.end = null; G.sparks = [];
    if (!G.crowd) G.crowd = new PCW.Crowd(); else G.crowd.reset();
    for (const id in PCW.pads) PCW.pads[id].clear();
    PCW.say("pbp", PCW.LINES.bell, 2);
    gorilla(PCW.GORILLA.start);
  };

  /* ============================================================
     ONE LOGIC FRAME
     ============================================================ */
  PCW.tick = function () {
    if (G.phase !== "MATCH") return;
    if (G.hitstop > 0) { G.hitstop--; return; }      // presses made during the freeze are kept
    G.tick++;
    for (const w of G.ws) if (padOf(w).cpu) PCW.cpuThink(w, other(w), padOf(w));
    for (const w of G.ws) { if (G.phase === "MATCH") update(w, padOf(w), other(w)); }
    if (G.phase !== "MATCH") return;
    tieTick(); slamTick(); pinTick(); refTick(); officeTick();
    G.crowd.tick();
    for (const w of G.ws) {
      if (w.state !== S.BUMP && w.state !== S.LIFTED) w.rot += (w.rotT - w.rot) * 0.2;
      if (w.jolt > 0) w.jolt--; if (w.kick > 0) w.kick--;
      PCW.animate(w);
    }
    if (G.shake > 0) G.shake *= 0.86;
    if (G.ropeShake > 0) G.ropeShake--;
    if (G.line) G.line.t++;
    if (G.gorilla && ++G.gorilla.t > 330) G.gorilla = null;
    if (G.trustFlash && ++G.trustFlash.t > 150) G.trustFlash = null;
    for (const s of G.sparks) s.age++;
    G.sparks = G.sparks.filter(s => s.age < 14);
    for (const id in PCW.pads) PCW.pads[id].clear();
  };

  function update(w, pad, foe) {
    w.sf++;
    const d = Math.abs(w.x - foe.x);
    switch (w.state) {
      case S.IDLE: case S.WALK: {
        const ax = pad.axis();
        if (ax) w.vx += ax * M.ACC; else w.vx *= M.FRIC;
        w.vx = clamp(w.vx, -M.VMAX, M.VMAX);
        let nx = w.x + w.vx;
        if (standing(foe) && Math.abs(nx - foe.x) < M.GAP) {
          const side = Math.sign(w.x - foe.x) || -w.facing;
          nx = foe.x + side * M.GAP; w.vx = 0;
        }
        w.x = clamp(nx, R.LO, R.HI);
        if (foe.state !== S.RUN) w.facing = foe.x >= w.x ? 1 : -1;
        w.state = Math.abs(w.vx) > 0.3 ? S.WALK : S.IDLE;
        if (pad.just.strike) {
          if (foe.state === S.DOWN && d < M.STOMP_RANGE) set(w, S.STOMP);
          else if (foe.state === S.RUN) { set(w, S.CLOTH); w.facing = foe.x >= w.x ? 1 : -1; }
          else set(w, S.STRIKE);
          w.vx = 0;
        } else if (pad.just.grab) {
          if (foe.state === S.DOWN && d < M.COVER_RANGE) startPin(w, foe);
          else if (tieable(foe) && d < M.TIE_RANGE) tie(w, foe);
          else set(w, S.WHIFF);
          w.vx = 0;
        } else if (pad.just.taunt) { set(w, S.TAUNT); w.vx = 0; }
        break;
      }
      case S.STRIKE:
        if (w.sf === F.STRIKE_HIT && d < M.STRIKE_RANGE && hittable(foe)) {
          set(foe, S.HIT); foe.hitBy = w; foe.vx = 0; foe.rotT = 0;
          G.hitstop = 3; G.shake = Math.max(G.shake, 3);
          spark(foe.x - foe.facing * 8, R.FLOOR - 150 * foe.p.scale);
        }
        if (w.sf >= F.STRIKE_END) set(w, S.IDLE);
        break;
      case S.HIT: {
        const atk = w.hitBy;
        if (pad.just.work) {
          const crisp = w.sf <= F.SELL_CRISP;
          set(w, S.SELL); w.vx = -w.facing * 2.6;
          G.crowd.see({ type: "strike", actor: atk.id, target: w.id, size: MV.strike.size, q: crisp ? 1.15 : 0.85 });
          landed(atk); trust(TR.SOLD);
          if (PCW.rnd() < 0.3) PCW.say("pbp", PCW.LINES.strike);
        } else if (w.sf > F.SELL_WINDOW) {
          set(w, S.NOSOLD);
          G.crowd.see({ type: "weak", actor: atk.id, target: w.id });
          trust(TR.MISSED_SELL, w.p.short + " didn't sell the chop");
          G.lastAct = G.tick;
          if (PCW.rnd() < 0.5) PCW.say("color", PCW.LINES.weak);
        }
        break;
      }
      case S.SELL:
        w.x = clamp(w.x + w.vx, R.LO, R.HI); w.vx *= 0.9;
        if (w.sf >= F.SELL_LEN) set(w, S.IDLE);
        break;
      case S.NOSOLD: if (w.sf >= 22) set(w, S.IDLE); break;
      case S.WHIFF: if (w.sf >= 18) set(w, S.IDLE); break;
      case S.WHIP: if (w.sf >= 22) set(w, S.IDLE); break;
      case S.DRAG: if (w.sf >= 38) set(w, S.IDLE); break;
      case S.TACKLE:
        w.x = clamp(w.x + w.vx, R.LO, R.HI); w.vx *= 0.88;
        if (w.sf >= 26) { set(w, S.IDLE); w.vx = 0; }
        break;
      case S.CLOTH: if (w.sf >= F.CLOTH_HOLD) set(w, S.IDLE); break;
      case S.STOMP:
        if (w.sf === 12 && foe.state === S.DOWN && d < M.STOMP_RANGE + 10) {
          foe.jolt = 12; G.hitstop = 2; G.shake = Math.max(G.shake, 4);
          G.crowd.see({ type: "stomp", actor: w.id, target: foe.id, size: MV.stomp.size, q: 1, dirty: true });
          landed(w);
          if (PCW.rnd() < 0.35) PCW.say("color", PCW.LINES.stomp);
        }
        if (w.sf >= 28) set(w, S.IDLE);
        break;
      case S.TAUNT:
        if (w.sf === F.TAUNT_AT) {
          const posing = (G.tick - w.landedAt < F.POSE_WINDOW) && !w.posed;
          w.posed = true; G.lastAct = G.tick;
          G.crowd.see({ type: "taunt", actor: w.id, posing });
        }
        if (w.sf >= F.TAUNT_LEN) set(w, S.IDLE);
        break;
      case S.RUN: runTick(w, pad, foe, d); break;
      case S.BUMP: bumpTick(w); break;
      case S.DOWN: {
        const wantsUp = pad.just.left || pad.just.right || pad.just.work;
        if (wantsUp) getUp(w, false);
        else if (w.sf > w.sellExpect * 2.2 + 150) getUp(w, true);   // he can't lie there all night
        break;
      }
      case S.GETUP: if (w.sf >= F.GETUP) set(w, S.IDLE); break;
      // TIE, SLAM_A, LIFTED, COVER, PINNED are driven by tieTick / slamTick / pinTick
    }
  }

  function spark(x, y) { G.sparks.push({ x, y, age: 0 }); }

  /* ---------------- going down, and the choice to get up ---------------- */
  function goDown(w, from, sell) {
    set(w, S.DOWN); w.vx = 0; w.y = 0; w.rot = 90; w.rotT = 90;
    w.sellExpect = sell || 80; w.bumpFrom = from || null; w.downId++;
    w.tackling = false;
  }
  function getUp(w, forced) {
    // popping up well before a real bump is sold makes the other man's move
    // look like nothing. The crowd sees that; the locker room remembers it.
    if (!forced && w.sellExpect >= 100 && w.sf < w.sellExpect * 0.5) {
      G.nosells++;
      G.crowd.see({ type: "nosell", actor: w.id, target: w.bumpFrom ? w.bumpFrom.id : null });
      trust(TR.NO_SELL, w.p.short + " no-sold the bump");
      PCW.say("color", PCW.LINES.nosell, 1);
      if (!padOf(w).cpu) gorilla(PCW.GORILLA.nosell);
    }
    w.sellExpect = 0; set(w, S.GETUP); w.rotT = 0;
  }

  function startBump(w, o) {
    set(w, S.BUMP);
    w.bump = { f: 0, x0: w.x, x1: clamp(o.x1, R.LO, R.HI), frames: o.frames, height: o.height, rot0: w.rot, rot1: o.rot1, sell: o.sell, from: o.from, onLand: o.onLand };
  }
  function bumpTick(w) {
    const b = w.bump; b.f++;
    const k = b.f / b.frames;
    w.x = lerp(b.x0, b.x1, k); w.y = Math.sin(k * Math.PI) * b.height; w.rot = lerp(b.rot0, b.rot1, k);
    if (b.f >= b.frames) { goDown(w, b.from, b.sell); if (b.onLand) b.onLand(); }
  }

  /* ============================================================
     THE LOCK-UP — the hub. From it the man in control can slam,
     send him to the ropes, or go for his finisher; the other man
     gets a short window first to reverse it into an arm drag.
     ============================================================ */
  function tie(a, b) {
    const dir = Math.sign(b.x - a.x) || a.facing, mid = (a.x + b.x) / 2;
    a.x = clamp(mid - dir * 36, R.LO, R.HI); b.x = clamp(mid + dir * 36, R.LO, R.HI);
    a.facing = dir; b.facing = -dir; a.vx = b.vx = 0;
    set(a, S.TIE); set(b, S.TIE);
    G.tie = { a, b, frame: 0 };
    G.lastAct = G.tick;
  }
  function tieTick() {
    const t = G.tie; if (!t) return;
    t.frame++;
    const pa = padOf(t.a), pb = padOf(t.b);
    if (t.frame >= F.REV_OPEN && t.frame <= F.REV_CLOSE && pb.just.work) { armDrag(t.b, t.a); return; }
    if (t.frame >= F.TIE_SETTLE) {
      if (pa.just.work) { beginSlam(t.a, t.b, "slam"); return; }
      if (pa.just.taunt) { beginSlam(t.a, t.b, t.a.p.finKind); return; }
      const dir = pa.just.left ? -1 : pa.just.right ? 1 : 0;
      if (dir) { whip(t.a, t.b, dir); return; }
    }
    if (t.frame > F.TIE_HOLD) { set(t.a, S.IDLE); set(t.b, S.IDLE); G.tie = null; }
  }

  function armDrag(r, c) {
    G.tie = null;
    const side = Math.sign(c.x - r.x) || 1;
    set(r, S.DRAG);
    startBump(c, {
      x1: r.x - side * 135, frames: 26, height: 125, rot1: -270, sell: MV.armdrag.sell, from: r,
      onLand: () => {
        G.hitstop = 5; G.shake = Math.max(G.shake, 7);
        G.crowd.see({ type: "armdrag", actor: r.id, target: c.id, size: MV.armdrag.size, q: 1 });
        landed(r); trust(TR.CLEAN);
        PCW.say("pbp", PCW.LINES.armdrag, 1);
      }
    });
  }

  function whip(a, b, dir) {
    G.tie = null;
    set(a, S.WHIP); set(b, S.RUN);
    b.vx = dir * M.WHIP_V; b.facing = dir; b.bounces = 0; b.tackling = false; b.whipFrom = a;
    G.lastAct = G.tick;
  }
  function runTick(w, pad, foe, d) {
    w.x += w.vx;
    if (w.x <= R.LO || w.x >= R.HI) {
      w.x = clamp(w.x, R.LO, R.HI); w.vx = -w.vx; w.bounces++;
      G.ropeShake = 16; G.ropeSide = w.x < 640 ? -1 : 1;
      if (w.bounces >= 3) { set(w, S.IDLE); w.vx = 0; return; }
    }
    w.facing = Math.sign(w.vx) || w.facing;
    const approaching = (foe.x - w.x) * w.vx > 0;
    if (w.bounces >= 1 && approaching) {
      if (pad.just.strike) w.tackling = true;          // drop the shoulder
      if (d < 92) {
        if (w.tackling && (free(foe) || foe.state === S.CLOTH || foe.state === S.WHIP)) { tackle(w, foe); return; }
        if (foe.state === S.CLOTH) { clothesline(foe, w); return; }
      }
    }
  }
  function clothesline(a, runner) {
    const dir = Math.sign(runner.vx) || 1;
    runner.vx = 0;
    G.hitstop = 7; G.shake = Math.max(G.shake, 12);
    spark(a.x + a.facing * 40, R.FLOOR - 150 * a.p.scale);
    G.crowd.see({ type: "clothesline", actor: a.id, target: runner.id, size: MV.clothesline.size, q: 1 });
    landed(a); trust(TR.CLEAN);
    PCW.say("pbp", PCW.LINES.clothesline, 1);
    startBump(runner, { x1: runner.x + dir * 55, frames: 22, height: 62, rot1: 90, sell: MV.clothesline.sell, from: a });
  }
  function tackle(runner, foe) {
    const dir = Math.sign(runner.vx) || 1;
    set(runner, S.TACKLE); runner.vx = dir * 3; runner.tackling = false;
    G.hitstop = 6; G.shake = Math.max(G.shake, 10);
    spark(foe.x, R.FLOOR - 130 * foe.p.scale);
    G.crowd.see({ type: "tackle", actor: runner.id, target: foe.id, size: MV.tackle.size, q: 1 });
    landed(runner);
    PCW.say("pbp", PCW.LINES.tackle, 1);
    foe.facing = -dir; foe.rot = 0;
    startBump(foe, { x1: foe.x + dir * 115, frames: 26, height: 48, rot1: 90, sell: MV.tackle.sell, from: runner });
  }

  /* ============================================================
     SLAMS AND FINISHERS — a lift you can read, then the impact.
     Everything (the pop, the trust) resolves on the IMPACT.
     ============================================================ */
  function beginSlam(a, d, kind) {
    G.tie = null;
    set(a, S.SLAM_A); set(d, S.LIFTED);
    G.slam = { a, d, kind, f: 0, done: false, dir: a.facing };
    G.lastAct = G.tick;
  }
  function slamTick() {
    const s = G.slam; if (!s) return;
    s.f++;
    const a = s.a, d = s.d, m = MV[s.kind];
    const ease = k => k * k * (3 - 2 * k);

    if (s.kind === "burner") {
      // kick to the gut, turn, sit out: his jaw lands on the shoulder
      if (s.f === m.kick - 2) { G.hitstop = 2; spark(d.x, R.FLOOR - 100 * d.p.scale); }
      if (s.f === m.kick + 4) { a.facing = -s.dir; a.x = clamp(d.x - s.dir * 30, R.LO, R.HI); }
      if (s.f === m.impact && !s.done) {
        s.done = true; impact(s, 11, 17);
        d.rot = 0;
        startBump(d, { x1: d.x + s.dir * 80, frames: 34, height: 46, rot1: 90, sell: m.sell, from: a });
      }
      if (s.f >= m.impact + 46) { G.slam = null; set(a, S.GETUP); a.sf = 14; a.facing = s.dir; }
      return;
    }

    // slam / landslide: lift, hold, drive
    const L = m.lift, H = m.hold, D = m.drop;
    if (s.f <= L) {
      const k = ease(s.f / L);
      d.y = m.peak * k; d.rot = m.rot * k; d.x = lerp(d.x, a.x + s.dir * 28, 0.2);
    } else if (s.f <= L + H) {
      d.y = m.peak; d.rot = m.rot;
    } else if (s.f < L + H + D) {
      const k = (s.f - L - H) / D;
      d.y = m.peak * (1 - k * k); d.rot = lerp(m.rot, 90, k); d.x = lerp(d.x, a.x + s.dir * 96, 0.35);
    } else if (!s.done) {
      s.done = true;
      d.x = clamp(a.x + s.dir * 96, R.LO, R.HI);
      goDown(d, a, m.sell);
      impact(s, s.kind === "slam" ? 8 : 12, s.kind === "slam" ? 13 : 18);
    }
    if (s.f >= L + H + D + (s.kind === "slam" ? 18 : 40)) {
      G.slam = null;
      if (s.kind === "slam") set(a, S.IDLE); else { set(a, S.GETUP); a.sf = 14; }
    }
  }
  function impact(s, hitstop, shake) {
    const a = s.a, d = s.d, fin = s.kind !== "slam";
    G.hitstop = hitstop; G.shake = Math.max(G.shake, shake);
    spark(d.x, R.FLOOR - 20);
    if (fin) { d.finishedAt = G.tick; d.finishedBy = a.id; }
    G.crowd.see({ type: fin ? "finisher" : "slam", actor: a.id, target: d.id, size: MV[s.kind].size, q: 1 });
    landed(a); trust(TR.CLEAN);
    PCW.say("pbp", fin ? PCW.LINES[s.kind] : PCW.LINES.slam, fin ? 2 : 0);
  }

  /* ============================================================
     THE PIN. Nothing kicks out for you. The man on his back has to
     kick out before three, or the match is over — booked or not.
     ============================================================ */
  function startPin(a, d) {
    set(a, S.COVER); set(d, S.PINNED);
    a.x = d.x; a.rotT = -90; a.y = 0; d.rotT = 90;
    const fin = d.finishedBy === a.id && G.tick - d.finishedAt < 720;
    G.pin = { a, d, count: 0, f: 0, fin, booked: fin && a.id === PCW.BOOKING.winner && d.id === PCW.BOOKING.loser };
    G.lastAct = G.tick;
    PCW.say("pbp", PCW.LINES.cover, 1);
  }
  function pinTick() {
    const p = G.pin; if (!p) return;
    if (padOf(p.d).just.work) { kickOut(); return; }
    if (G.ref.state !== "count") return;                // no count until the referee is down there
    p.f++;
    if (p.f % F.COUNT === 0) {
      p.count++; G.ref.slap = 10;
      G.crowd.see({ type: "count", actor: p.a.id, n: p.count });
      if (p.count >= 3) pinfall();
    }
  }
  function kickOut() {
    const p = G.pin, a = p.a, d = p.d; G.pin = null;
    const dir = Math.sign(a.x - other(d).x) || 1;
    set(a, S.GETUP); a.rotT = 0; a.x = clamp(a.x - d.facing * 60, R.LO, R.HI);
    goDown(d, null, 40); d.kick = 16;
    G.crowd.see({ type: "kickout", actor: d.id, target: a.id });
    G.lastAct = G.tick;
    if (p.booked) {
      // the cardinal betrayal: kicking out of the real finish. Always possible, always priced.
      G.shoots++;
      trust(TR.FINISH_KICKOUT, d.p.short + " kicked out of the FINISH");
      PCW.say("pbp", PCW.LINES.shoot, 2); gorilla(PCW.GORILLA.shoot);
    } else PCW.say("pbp", PCW.LINES.kickout, 1);
  }
  function pinfall() {
    const p = G.pin; G.pin = null;
    G.crowd.see({ type: "pinfall", actor: p.a.id, afterBig: p.fin });
    const type = p.a.id !== PCW.BOOKING.winner ? "SCREWJOB" : p.fin ? "CLEAN" : "FLAT";
    PCW.say("pbp", type === "CLEAN" ? PCW.LINES.cleanWin : type === "FLAT" ? PCW.LINES.flatWin : PCW.LINES.screwjob, 2);
    endMatch(type, p.a);
  }

  /* ---------------- the referee: stays out of the way, then counts ---------------- */
  function refTick() {
    const r = G.ref; r.sf++;
    if (r.slap > 0) r.slap--;
    let tx;
    if (G.pin) tx = clamp(G.pin.d.x + 78, R.LO + 10, R.HI + 30);
    else { const mid = (G.stove.x + G.boulder.x) / 2; tx = clamp(mid + (mid < 640 ? 190 : -190), R.LO, R.HI); }
    const dx = tx - r.x, sp = G.pin ? 6 : 2.2;
    if (Math.abs(dx) > sp + 1) { r.x += Math.sign(dx) * sp; r.facing = Math.sign(dx); r.state = "walk"; }
    else if (G.pin) { if (r.state !== "count") { r.state = "count"; r.sf = 0; } r.facing = -1; }
    else { r.state = "stand"; r.facing = (G.stove.x + G.boulder.x) / 2 >= r.x ? 1 : -1; }
  }

  /* ---------------- the office, in your ear ---------------- */
  function officeTick() {
    const t = G.tick;
    if (t === 130 * 60) gorilla(PCW.GORILLA.home);
    if (t === 170 * 60) gorilla(PCW.GORILLA.now);
    if (t > 170 * 60 && (t - 170 * 60) % (40 * 60) === 0) gorilla(PCW.GORILLA.over);
  }

  /* ============================================================
     ENDINGS. The rating is the room. And the room has an opinion
     about each man, which is the real result.
     ============================================================ */
  function endMatch(type, winner) {
    if (G.phase !== "MATCH") return;
    G.phase = "ENDED"; G.shake = 0; G.hitstop = 0;
    const C = G.crowd, RT = PCW.RATING;
    const parts = [["the room", (C.avgHeat() * RT.HEAT_W + C.avgAttn() * (1 - RT.HEAT_W)) / RT.PER_STAR]];
    if (type === "CLEAN") parts.push(["clean finish", RT.CLEAN]);
    if (type === "FLAT") parts.push(["no real finish", RT.FLAT]);
    if (G.trust >= 80) parts.push(["trust held", RT.TRUST]);
    let stars = parts.reduce((s, p) => s + p[1], 0);
    if (type === "BREAKDOWN") stars = Math.min(stars, 1.25);
    stars = clamp(Math.round(stars * 4) / 4, 0.25, 5);
    if (type === "BREAKDOWN") PCW.say("color", PCW.LINES.breakdown, 2);
    G.end = {
      type, stars, parts, winner: winner ? winner.id : null,
      time: G.tick / 60, trust: G.trust,
      heat: Math.round(C.avgHeat()), attn: Math.round(C.avgAttn()), peak: Math.round(C.peak),
      verdict: { stove: verdict("stove"), boulder: verdict("boulder") },
      headline:
        type === "CLEAN" ? "NEW CHAMPION. As booked." :
          type === "FLAT" ? "Title change, but nobody saw a finish." :
            type === "SCREWJOB" ? "The champion kept the belt. That was not the plan." :
              "It fell apart in front of everybody."
    };
  }
  PCW.endMatch = endMatch;

  /* what the room made of one man tonight */
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

  /* ============================================================
     CUES — what to do, in wrestling words, then the key. Only for
     a wrestler a person is playing.
     ============================================================ */
  PCW.cueFor = function (w) {
    if (G.phase !== "MATCH" || padOf(w).cpu) return null;
    const L = PCW.KEYLABEL[w.id], K = b => "[" + L[b] + "]";
    const foe = other(w), d = Math.abs(w.x - foe.x);
    if (G.pin) {
      if (G.pin.d === w) return (G.pin.booked) ? "STAY DOWN — THIS IS THE FINISH" : "KICK OUT — " + K("work");
      return "HOLD THE COVER";
    }
    if (G.slam && w.state === S.LIFTED) return "TAKE IT";
    if (G.slam && G.slam.a === w) return null;
    if (G.tie) {
      const t = G.tie;
      if (t.a === w) return t.frame < F.TIE_SETTLE ? "LOCKED UP" : K("work") + " SLAM   [" + L.dir + "] WHIP   " + K("taunt") + " " + w.p.finisher;
      return t.frame <= F.REV_CLOSE ? "REVERSE — " + K("work") + " NOW, or go with him" : "HE HAS YOU — GO WITH IT";
    }
    if (w.state === S.HIT) return "SELL IT — " + K("work");
    if (w.state === S.RUN) return (w.bounces >= 1) ? "TAKE THE CLOTHESLINE — or " + K("strike") + " TACKLE HIM" : "RUN THE ROPES";
    if (w.state === S.DOWN) {
      if (w.sellExpect >= 100 && w.sf < w.sellExpect * 0.5) return "STAY DOWN — SELL IT";
      return "GET UP — MOVE or " + K("work");
    }
    if (!free(w)) return null;
    if (foe.state === S.RUN) return "CLOTHESLINE — " + K("strike") + " AS HE COMES BACK";
    if (foe.state === S.DOWN) {
      if (d < M.COVER_RANGE) return K("grab") + " COVER   " + K("strike") + " STOMP   " + K("taunt") + " POSE";
      return (!w.posed && G.tick - w.landedAt < F.POSE_WINDOW) ? K("taunt") + " POSE — or walk over and cover" : null;
    }
    if (free(foe) && d < M.STRIKE_RANGE) return K("strike") + " CHOP   " + K("grab") + " LOCK UP";
    return null;
  };
})();
