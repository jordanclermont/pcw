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

   The ring has depth: x is left/right, z is toward/away from the
   camera. Two men who lock up or trade moves are pulled onto the same
   line so the picture always reads side-on.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;
  const F = PCW.F, M = PCW.MOVE, MV = PCW.MOVES, R = PCW.RING, TR = PCW.TRUST;
  const clamp = PCW.clamp, lerp = PCW.lerp, dist = PCW.dist;

  /* where a man's feet can be */
  const XLO = R.LO + R.PAD, XHI = R.HI - R.PAD, ZLO = R.PAD, ZHI = R.D - R.PAD;
  const cx = x => clamp(x, XLO, XHI), cz = z => clamp(z, ZLO, ZHI);
  PCW.BOUNDS = { XLO, XHI, ZLO, ZHI };

  const S = PCW.S = {
    IDLE: "IDLE", WALK: "WALK", STRIKE: "STRIKE", HIT: "HIT", SELL: "SELL", NOSOLD: "NOSOLD",
    WHIFF: "WHIFF", TIE: "TIE", SLAM_A: "SLAM_A", LIFTED: "LIFTED", DRAG: "DRAG", BUMP: "BUMP",
    DOWN: "DOWN", GETUP: "GETUP", WHIP: "WHIP", RUN: "RUN", CLOTH: "CLOTH", TACKLE: "TACKLE",
    STOMP: "STOMP", TAUNT: "TAUNT", COVER: "COVER", PINNED: "PINNED", CORNER: "CORNER"
  };

  const G = PCW.G = { phase: "PRE", tick: 0 };

  const set = (w, s) => { w.state = s; w.sf = 0; };
  const free = w => w.state === S.IDLE || w.state === S.WALK;
  const standing = w => ![S.DOWN, S.PINNED, S.COVER, S.BUMP, S.LIFTED, S.RUN].includes(w.state);
  const hittable = w => [S.IDLE, S.WALK, S.TAUNT, S.NOSOLD, S.SELL, S.GETUP, S.WHIFF, S.CORNER].includes(w.state);
  const tieable = w => [S.IDLE, S.WALK, S.TAUNT, S.NOSOLD, S.CORNER].includes(w.state);
  const padOf = w => PCW.pads[w.id];
  const other = w => (w === G.stove ? G.boulder : G.stove);
  PCW.free = free; PCW.standing = standing; PCW.other = other;

  function makeWrestler(p) {
    return {
      p, id: p.id, x: p.startX, z: R.D / 2, vx: 0, vz: 0, y: 0, rot: 0, rotT: 0, facing: p.facing,
      state: S.IDLE, sf: 0, pose: null, sellExpect: 0, bumpFrom: null, downId: 0,
      landedAt: -9999, posed: true, finishedAt: -9999, finishedBy: null,
      bounces: 0, tackling: false, clothReady: false, run: null, give: false, inCorner: false,
      jolt: 0, kick: 0, ai: null
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
    G.phase = "MATCH"; G.tick = 0; G.hitstop = 0; G.shake = 0; G.ropeShake = 0; G.ropeSide = "R";
    G.stove = makeWrestler(PCW.PERSONAS.stove);
    G.boulder = makeWrestler(PCW.PERSONAS.boulder);
    G.ws = [G.stove, G.boulder];
    G.tie = null; G.slam = null; G.pin = null;
    G.ref = { x: 640, z: R.D - 70, state: "stand", sf: 0, facing: 1, slap: 0 };
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

  /* walking, with the other man in the way */
  const inWay = (x, z, foe) => Math.abs(x - foe.x) < M.GAP && Math.abs(z - foe.z) < M.GAP_Z;
  function step(w, foe) {
    let nx = cx(w.x + w.vx), nz = cz(w.z + w.vz);
    if (standing(foe) && !inWay(w.x, w.z, foe) && inWay(nx, nz, foe)) {
      if (!inWay(nx, w.z, foe)) { nz = w.z; w.vz = 0; }
      else if (!inWay(w.x, nz, foe)) { nx = w.x; w.vx = 0; }
      else { nx = w.x; nz = w.z; w.vx = w.vz = 0; }
    }
    w.x = nx; w.z = nz;
  }
  const faceTo = (w, foe) => { if (Math.abs(foe.x - w.x) > 6) w.facing = foe.x > w.x ? 1 : -1; };
  const anyMove = pad => pad.just.left || pad.just.right || pad.just.up || pad.just.down;

  function update(w, pad, foe) {
    w.sf++;
    const d = dist(w, foe);
    w.give = false;
    switch (w.state) {
      case S.IDLE: case S.WALK: {
        // GIVING: you plant your feet and open up. You can't move or attack while you do.
        const giving = pad.giving();
        let ax = giving ? 0 : pad.axis(), az = giving ? 0 : pad.axisZ();
        if (ax && az) { ax *= 0.72; az *= 0.72; }
        if (ax) w.vx += ax * M.ACC; else w.vx *= M.FRIC;
        if (az) w.vz += az * M.ACC; else w.vz *= M.FRIC;
        w.vx = clamp(w.vx, -M.VMAX, M.VMAX); w.vz = clamp(w.vz, -M.VMAX, M.VMAX);
        step(w, foe);
        if (foe.state !== S.RUN) faceTo(w, foe);
        w.state = Math.hypot(w.vx, w.vz) > 0.3 ? S.WALK : S.IDLE;
        w.give = giving; w.inCorner = false;
        if (giving) break;
        if (pad.just.strike) {
          if (foe.state === S.RUN) { w.clothReady = true; break; }   // the arm comes up by itself when he gets back
          if (foe.state === S.DOWN && d < M.STOMP_RANGE) set(w, S.STOMP);
          else set(w, S.STRIKE);
          w.vx = w.vz = 0;
        } else if (pad.just.grab) {
          if (foe.state === S.DOWN && d < M.COVER_RANGE) startPin(w, foe);
          else if (tieable(foe) && d < M.TIE_RANGE) tie(w, foe);
          else set(w, S.WHIFF);
          w.vx = w.vz = 0;
        } else if (pad.just.taunt) { set(w, S.TAUNT); w.vx = w.vz = 0; }
        break;
      }
      case S.STRIKE:
        if (w.sf < F.STRIKE_HIT && d < M.STRIKE_RANGE * 1.6 && hittable(foe)) {      // step in, onto his line
          w.z += (foe.z - w.z) * 0.2;
          const gapX = Math.abs(foe.x - w.x);
          if (gapX > 92) w.x = cx(w.x + Math.sign(foe.x - w.x) * Math.min(4, gapX - 92));
        }
        if (w.sf === F.STRIKE_HIT && d < M.STRIKE_RANGE && hittable(foe)) {
          const cornered = foe.state === S.CORNER;
          set(foe, S.HIT); foe.hitBy = w; foe.vx = foe.vz = 0; foe.rotT = 0; foe.inCorner = cornered;
          faceTo(foe, w);
          G.hitstop = 3; G.shake = Math.max(G.shake, 3);
          spark(foe.x - foe.facing * 8, foe.z, 150 * foe.p.scale);
          if (padOf(foe).giving()) sellHit(foe, true);       // he was already giving: it lands clean
        }
        if (w.sf >= F.STRIKE_END) set(w, S.IDLE);
        break;
      case S.HIT:
        if (pad.giving()) sellHit(w, w.sf <= F.SELL_CRISP);
        else if (w.sf > F.SELL_WINDOW) {
          set(w, S.NOSOLD);
          G.crowd.see({ type: "weak", actor: w.hitBy.id, target: w.id });
          trust(TR.MISSED_SELL, w.p.short + " didn't sell the chop");
          G.lastAct = G.tick;
          if (PCW.rnd() < 0.5) PCW.say("color", PCW.LINES.weak);
        }
        break;
      case S.SELL:
        w.x = cx(w.x + w.vx); w.vx *= 0.9;
        if (w.sf >= F.SELL_LEN) set(w, S.IDLE);
        break;
      case S.NOSOLD: if (w.sf >= 22) set(w, S.IDLE); break;
      case S.WHIFF: if (w.sf >= 18) set(w, S.IDLE); break;
      case S.WHIP:
        if (pad.just.strike) w.clothReady = true;
        if (w.sf >= 22) set(w, S.IDLE);
        break;
      case S.DRAG: if (w.sf >= 38) set(w, S.IDLE); break;
      case S.TACKLE:
        w.x = cx(w.x + w.vx); w.z = cz(w.z + w.vz); w.vx *= 0.88; w.vz *= 0.88;
        if (w.sf >= 26) { set(w, S.IDLE); w.vx = w.vz = 0; }
        break;
      case S.CLOTH: if (w.sf >= F.CLOTH_HOLD) set(w, S.IDLE); break;
      case S.CORNER:
        // hanging on the buckles. He comes out by himself, or sooner if the player walks him out.
        w.give = pad.giving();
        if (w.sf >= F.CORNER || (w.sf > 40 && !w.give && (pad.axis() || pad.axisZ()))) set(w, S.IDLE);
        break;
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
      case S.RUN: runTick(w, pad, foe); break;
      case S.BUMP: bumpTick(w); break;
      case S.DOWN: {
        // staying down is the default. Moving gets you up; holding the give key keeps you down.
        const wantsUp = pad.just.getup || (anyMove(pad) && !pad.held.give);
        if (wantsUp) getUp(w, false);
        else if (w.sf > w.sellExpect * 2.2 + 150 && !pad.held.give) getUp(w, true);   // he can't lie there all night
        else if (w.sf > w.sellExpect * 2.2 + 420) getUp(w, true);
        break;
      }
      case S.GETUP: if (w.sf >= F.GETUP) set(w, S.IDLE); break;
      // TIE, SLAM_A, LIFTED, COVER, PINNED are driven by tieTick / slamTick / pinTick
    }
  }

  function sellHit(w, crisp) {
    const atk = w.hitBy;
    set(w, S.SELL); w.vx = w.inCorner ? 0 : -w.facing * 2.6;
    G.crowd.see({ type: "strike", actor: atk.id, target: w.id, size: MV.strike.size, q: crisp ? 1.15 : 0.85 });
    landed(atk); trust(TR.SOLD);
    if (PCW.rnd() < 0.3) PCW.say("pbp", PCW.LINES.strike);
  }

  function spark(x, z, h) { G.sparks.push({ x, z, h, age: 0 }); }

  /* ---------------- going down, and the choice to get up ---------------- */
  function goDown(w, from, sell) {
    set(w, S.DOWN); w.vx = w.vz = 0; w.y = 0; w.rot = 90; w.rotT = 90;
    w.sellExpect = sell || 80; w.bumpFrom = from || null; w.downId++;
    w.tackling = false; w.inCorner = false;
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
    w.bump = {
      f: 0, x0: w.x, x1: cx(o.x1), z0: w.z, z1: cz(o.z1 === undefined ? w.z : o.z1),
      frames: o.frames, height: o.height, rot0: w.rot, rot1: o.rot1, sell: o.sell, from: o.from, onLand: o.onLand
    };
  }
  function bumpTick(w) {
    const b = w.bump; b.f++;
    const k = b.f / b.frames;
    w.x = lerp(b.x0, b.x1, k); w.z = lerp(b.z0, b.z1, k);
    w.y = Math.sin(k * Math.PI) * b.height; w.rot = lerp(b.rot0, b.rot1, k);
    if (b.f >= b.frames) { goDown(w, b.from, b.sell); if (b.onLand) b.onLand(); }
  }

  /* ============================================================
     THE LOCK-UP — the hub. The man who grabbed is in control: he
     can slam, send the other man to the ropes or a corner, or go
     for his finisher. The other man gets a window first to reverse
     it into an arm drag. A choice made early is remembered and
     happens the moment the hold settles.
     ============================================================ */
  function tie(a, b) {
    const dir = Math.sign(b.x - a.x) || a.facing;
    const mid = clamp((a.x + b.x) / 2, XLO + 36, XHI - 36), mz = cz((a.z + b.z) / 2);
    a.facing = dir; b.facing = -dir; a.vx = a.vz = b.vx = b.vz = 0;
    set(a, S.TIE); set(b, S.TIE);
    // they step in to each other over the first few frames (ax/bx/z are where they end up)
    G.tie = { a, b, frame: 0, cmd: null, wx: 0, wz: 0, wait: 0, ax: mid - dir * 36, bx: mid + dir * 36, z: mz };
    G.lastAct = G.tick;
  }
  function tieTick() {
    const t = G.tie; if (!t) return;
    t.frame++;
    const pa = padOf(t.a), pb = padOf(t.b);
    const k = t.frame >= 12 ? 1 : 0.3;
    t.a.x = lerp(t.a.x, t.ax, k); t.b.x = lerp(t.b.x, t.bx, k);
    t.a.z = lerp(t.a.z, t.z, k); t.b.z = lerp(t.b.z, t.z, k);
    if (t.frame >= F.REV_OPEN && t.frame <= F.REV_CLOSE && pb.just.grab) { armDrag(t.b, t.a); return; }

    // what the man in control has asked for (not on the frame he grabbed: that press was the grab)
    if (t.frame === 1) return;
    if (pa.just.grab) t.cmd = "slam";
    else if (pa.just.taunt) t.cmd = "fin";
    else if (pa.cpu && pa.aiWhip) { t.cmd = "whip"; t.wx = pa.aiWhip.x; t.wz = pa.aiWhip.z; t.wait = 0; pa.aiWhip = null; }
    else if (!pa.cpu && anyMove(pa)) {
      if (t.cmd !== "whip") { t.wx = 0; t.wz = 0; }
      t.cmd = "whip"; t.wait = F.WHIP_GRACE;
    }
    if (t.cmd === "whip" && !pa.cpu && t.wait > 0) {       // a second direction inside the grace = a corner
      t.wx = pa.axis() || t.wx; t.wz = pa.axisZ() || t.wz;
      if (pa.just.left) t.wx = -1; if (pa.just.right) t.wx = 1;
      if (pa.just.up) t.wz = 1; if (pa.just.down) t.wz = -1;
      t.wait--;
    }
    if (t.frame >= F.TIE_SETTLE && t.cmd) {
      if (t.cmd === "slam") { beginSlam(t.a, t.b, "slam"); return; }
      if (t.cmd === "fin") { beginSlam(t.a, t.b, t.a.p.finKind); return; }
      if (t.wait <= 0 && (t.wx || t.wz)) { whip(t.a, t.b, t.wx, t.wz); return; }
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

  /* ---------------- the Irish whip ---------------- */
  function aim(w, tx, tz) {
    const dx = tx - w.x, dz = tz - w.z, m = Math.hypot(dx, dz) || 1;
    w.vx = dx / m * M.WHIP_V; w.vz = dz / m * M.WHIP_V;
  }
  function whip(a, b, dx, dz) {
    G.tie = null;
    set(a, S.WHIP); set(b, S.RUN);
    b.bounces = 0; b.tackling = false; b.whipFrom = a; a.clothReady = false;
    if (dx && dz) {                         // two directions: into that corner
      b.run = { corner: { x: dx > 0 ? XHI : XLO, z: dz > 0 ? ZHI : ZLO } };
      aim(b, b.run.corner.x, b.run.corner.z);
    } else { b.run = {}; b.vx = dx * M.WHIP_V; b.vz = dz * M.WHIP_V; }
    if (Math.abs(b.vx) > 1) b.facing = Math.sign(b.vx);
    G.lastAct = G.tick;
  }
  function runTick(w, pad, foe) {
    w.x += w.vx; w.z += w.vz;
    if (pad.just.strike) w.tackling = true;            // drop the shoulder: asked for any time, used on the way back
    if (w.run.corner) {
      const c = w.run.corner;
      if (Math.hypot(c.x - w.x, c.z - w.z) <= M.WHIP_V + 1 || w.x < XLO || w.x > XHI || w.z < ZLO || w.z > ZHI) hitCorner(w, c);
      return;
    }
    if (w.x <= XLO || w.x >= XHI || w.z <= ZLO || w.z >= ZHI) {
      G.ropeSide = w.x <= XLO ? "L" : w.x >= XHI ? "R" : w.z <= ZLO ? "N" : "F";
      w.x = cx(w.x); w.z = cz(w.z); w.bounces++;
      G.ropeShake = 16;
      if (w.bounces >= 3) { set(w, S.IDLE); w.vx = w.vz = 0; return; }
      // he comes back off the ropes AT the other man
      if (Math.hypot(foe.x - w.x, foe.z - w.z) > 80 && standing(foe)) aim(w, foe.x, foe.z);
      else { w.vx = -w.vx; w.vz = -w.vz; }
    }
    if (Math.abs(w.vx) > 1) w.facing = Math.sign(w.vx);
    const gap = Math.hypot(foe.x - w.x, foe.z - w.z);
    const approaching = (foe.x - w.x) * w.vx + (foe.z - w.z) * w.vz > 0;
    if (w.bounces >= 1 && approaching) {
      if (foe.clothReady && free(foe) && gap < M.CLOTH_AT) {
        set(foe, S.CLOTH); foe.clothReady = false; foe.vx = foe.vz = 0;
        if (Math.abs(w.x - foe.x) > 6) foe.facing = w.x > foe.x ? 1 : -1;
      }
      if (gap < M.MEET) {
        if (w.tackling && (free(foe) || foe.state === S.CLOTH || foe.state === S.WHIP)) { tackle(w, foe); return; }
        if (foe.state === S.CLOTH) { clothesline(foe, w); return; }
      }
    }
  }
  function hitCorner(w, c) {
    const a = w.whipFrom;
    set(w, S.CORNER); w.x = c.x; w.z = c.z; w.vx = w.vz = 0; w.inCorner = true;
    w.facing = c.x < R.CX ? 1 : -1;
    G.ropeSide = c.x < R.CX ? "L" : "R"; G.ropeShake = 16;
    G.hitstop = 5; G.shake = Math.max(G.shake, 9);
    spark(c.x - w.facing * 14, c.z, 130 * w.p.scale);
    G.crowd.see({ type: "corner", actor: a.id, target: w.id, size: MV.corner.size, q: 1 });
    landed(a); trust(TR.SOLD);
    PCW.say("pbp", PCW.LINES.corner, 1);
  }
  const unit = w => { const m = Math.hypot(w.vx, w.vz) || 1; return [w.vx / m, w.vz / m]; };
  function clothesline(a, runner) {
    const u = unit(runner);
    runner.vx = runner.vz = 0;
    G.hitstop = 7; G.shake = Math.max(G.shake, 12);
    spark(a.x + a.facing * 40, a.z, 150 * a.p.scale);
    G.crowd.see({ type: "clothesline", actor: a.id, target: runner.id, size: MV.clothesline.size, q: 1 });
    landed(a); trust(TR.CLEAN);
    PCW.say("pbp", PCW.LINES.clothesline, 1);
    startBump(runner, { x1: runner.x + u[0] * 55, z1: runner.z + u[1] * 55, frames: 22, height: 62, rot1: 90, sell: MV.clothesline.sell, from: a });
  }
  function tackle(runner, foe) {
    const u = unit(runner), dir = Math.sign(u[0]) || runner.facing;
    set(runner, S.TACKLE); runner.vx = u[0] * 3; runner.vz = u[1] * 3; runner.tackling = false;
    foe.clothReady = false;
    G.hitstop = 6; G.shake = Math.max(G.shake, 10);
    spark(foe.x, foe.z, 130 * foe.p.scale);
    G.crowd.see({ type: "tackle", actor: runner.id, target: foe.id, size: MV.tackle.size, q: 1 });
    landed(runner);
    PCW.say("pbp", PCW.LINES.tackle, 1);
    foe.facing = -dir; foe.rot = 0;
    startBump(foe, { x1: foe.x + u[0] * 115, z1: foe.z + u[1] * 115, frames: 26, height: 48, rot1: 90, sell: MV.tackle.sell, from: runner });
  }

  /* ============================================================
     SLAMS AND FINISHERS — a lift you can read, then the impact.
     Everything (the pop, the trust) resolves on the IMPACT.
     ============================================================ */
  function beginSlam(a, d, kind) {
    G.tie = null;
    set(a, S.SLAM_A); set(d, S.LIFTED);
    // slam him toward the middle if the ropes are right behind him
    let dir = a.facing;
    if (cx(a.x + dir * 96) !== a.x + dir * 96) { dir = -dir; a.facing = dir; d.x = cx(a.x + dir * 40); }
    G.slam = { a, d, kind, f: 0, done: false, dir };
    G.lastAct = G.tick;
  }
  function slamTick() {
    const s = G.slam; if (!s) return;
    s.f++;
    const a = s.a, d = s.d, m = MV[s.kind];
    const ease = k => k * k * (3 - 2 * k);
    d.z = lerp(d.z, a.z, 0.3);

    if (s.kind === "burner") {
      // kick to the gut, turn, sit out: his jaw lands on the shoulder
      if (s.f === m.kick - 2) { G.hitstop = 2; spark(d.x, d.z, 100 * d.p.scale); }
      if (s.f === m.kick + 4) { a.facing = -s.dir; a.x = cx(d.x - s.dir * 30); }
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
      d.x = cx(a.x + s.dir * 96); d.z = a.z;
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
    spark(d.x, d.z, 20);
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
    a.x = d.x; a.z = d.z; a.vx = a.vz = 0; a.rotT = -90; a.y = 0; d.rotT = 90;
    const fin = d.finishedBy === a.id && G.tick - d.finishedAt < 720;
    G.pin = { a, d, count: 0, f: 0, fin, booked: fin && a.id === PCW.BOOKING.winner && d.id === PCW.BOOKING.loser };
    G.lastAct = G.tick;
    PCW.say("pbp", PCW.LINES.cover, 1);
  }
  function pinTick() {
    const p = G.pin; if (!p) return;
    if (padOf(p.d).just.grab) { kickOut(); return; }
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
    set(a, S.GETUP); a.rotT = 0; a.x = cx(a.x - d.facing * 70);
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

  /* ---------------- the referee: stays behind the action, then counts ---------------- */
  function refTick() {
    const r = G.ref; r.sf++;
    if (r.slap > 0) r.slap--;
    let tx, tz;
    if (G.pin) { tx = clamp(G.pin.d.x + 84, R.LO + 30, R.HI - 10); tz = cz(G.pin.d.z + 46); }
    else {
      const mid = (G.stove.x + G.boulder.x) / 2, mz = (G.stove.z + G.boulder.z) / 2;
      tx = cx(mid + (mid < R.CX ? 170 : -170)); tz = clamp(mz + 130, ZLO, R.D - 14);
    }
    const dx = tx - r.x, dz = tz - r.z, m = Math.hypot(dx, dz), sp = G.pin ? 6.5 : 2.4;
    if (m > sp + 1) {
      r.x += dx / m * sp; r.z += dz / m * sp;
      if (Math.abs(dx) > 2) r.facing = Math.sign(dx);
      r.state = "walk";
    } else if (G.pin) { if (r.state !== "count") { r.state = "count"; r.sf = 0; } r.facing = -1; }
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
    const L = PCW.keyLabels(w.id), K = b => "[" + L[b] + "]";
    const foe = other(w), d = dist(w, foe);
    if (G.pin) {
      if (G.pin.d === w) return (G.pin.booked) ? "STAY DOWN — THIS IS THE FINISH" : "KICK OUT — " + K("grab");
      return "HOLD THE COVER";
    }
    if (G.slam && w.state === S.LIFTED) return "TAKE IT";
    if (G.slam && G.slam.a === w) return null;
    if (G.tie) {
      const t = G.tie;
      if (t.a === w) {
        if (t.cmd) return t.cmd === "slam" ? "SLAM COMING" : t.cmd === "fin" ? w.p.finisher + " COMING" : "SENDING HIM";
        return K("grab") + " SLAM   " + K("dir") + " SEND HIM   " + K("taunt") + " " + w.p.finisher;
      }
      return t.frame <= F.REV_CLOSE ? "GO WITH HIM — or " + K("grab") + " TO REVERSE" : "HE HAS YOU — GO WITH IT";
    }
    if (w.state === S.HIT) return "SELL IT — HOLD " + K("give");
    if (w.state === S.RUN) {
      if (w.run.corner) return "INTO THE CORNER";
      return w.tackling ? "SHOULDER DOWN — RUN THROUGH HIM" : "TAKE THE CLOTHESLINE — or " + K("strike") + " TO TACKLE HIM";
    }
    if (w.state === S.CORNER) return "HOLD " + K("give") + " TO TAKE IT — or " + K("dir") + " WALK OUT";
    if (w.state === S.DOWN) {
      if (w.sellExpect >= 100 && w.sf < w.sellExpect * 0.5) return "STAY DOWN — SELL IT";
      return "GET UP — " + K("dir");
    }
    if (w.state === S.WHIP || (free(w) && foe.state === S.RUN)) {
      if (foe.run && foe.run.corner) return null;
      return w.clothReady ? "ARM IS READY — HERE HE COMES" : "CLOTHESLINE — " + K("strike");
    }
    if (!free(w)) return null;
    if (w.give) return foe.state === S.STRIKE ? "TAKING IT" : "LET GO OF " + K("give") + " TO MOVE";
    if (foe.state === S.DOWN) {
      if (d < M.COVER_RANGE) return K("grab") + " COVER   " + K("strike") + " STOMP   " + K("taunt") + " POSE";
      return (!w.posed && G.tick - w.landedAt < F.POSE_WINDOW) ? K("taunt") + " POSE — or walk over and cover" : null;
    }
    if (foe.state === S.STRIKE && d < M.STRIKE_RANGE * 1.3) return "TAKE IT — HOLD " + K("give");
    if (foe.state === S.CORNER && d < M.TIE_RANGE) return K("strike") + " CHOP   " + K("grab") + " PULL HIM OUT";
    if (free(foe) && d < M.TIE_RANGE) return K("strike") + " CHOP   " + K("grab") + " LOCK UP";
    return null;
  };
})();
