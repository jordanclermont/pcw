/* ============================================================
   v3 — src/moves.js
   THE MOVES. Nobody steers a move once it starts: each one is a
   short piece of choreography for both men, written as key poses
   on a timeline and eased from one to the next.

     seq.k(actor, frame, { x, z, y, g, rot, pose, face, ease, arc })
       x, z   where his feet are
       y      height off his own ground;  g = how far his ground is below the mat
       rot    whole-body rotation (90 = flat on his back)
       pose   a name from PCW.POSE, or "walk" / "run"
       ease   how he ARRIVES at this key: io (default), in, out, snap, lin
       arc    extra height at the middle of the trip (a bump or a leap)
     seq.ev(frame, fn)   something happens: an impact, the crowd sees it

   What the crowd sees is reported at the impact, through PCW.see().
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;
  const R = PCW.RING, B = PCW.BOUNDS, POSE = PCW.POSE, TR = PCW.TRUST;
  const clamp = PCW.clamp, lerp = PCW.lerp;
  const cx = x => clamp(x, B.XLO, B.XHI), cz = z => clamp(z, B.ZLO, B.ZHI);
  const ox = x => clamp(x, B.OX0, B.OX1);
  const RUN_V = 7.6;

  /* ---------------- the timeline ---------------- */
  class Seq {
    constructor() { this.tracks = new Map(); this.evs = []; this.len = 0; }
    k(actor, t, props) {
      if (!this.tracks.has(actor)) this.tracks.set(actor, []);
      this.tracks.get(actor).push(Object.assign({ t }, props));
      if (t > this.len) this.len = t;
      return this;
    }
    ev(t, fn) { this.evs.push({ t, fn }); if (t > this.len) this.len = t; return this; }
    pad(n) { this.len += n; return this; }
  }
  PCW.Seq = Seq;

  const EASE = {
    io: k => k * k * (3 - 2 * k), in: k => k * k, out: k => 1 - (1 - k) * (1 - k),
    snap: k => 1 - Math.pow(1 - k, 3), lin: k => k
  };
  const NUM = ["x", "z", "y", "g", "rot"];
  const isCycle = p => p === "walk" || p === "run";

  /* fill in every key from the one before it, starting from where the man is now */
  PCW.prepTrack = function (actor, keys) {
    keys = keys.slice().sort((a, b) => a.t - b.t);
    const out = [{ t: 0, x: actor.x, z: actor.z, y: actor.y, g: actor.g, rot: actor.rot, pose: PCW.clonePose(actor.pose) }];
    for (const k of keys) {
      const prev = out[out.length - 1];
      const n = k.t === 0 ? prev : { t: k.t };
      for (const p of NUM) n[p] = k[p] !== undefined ? k[p] : prev[p];
      if (k.pose !== undefined) {
        if (isCycle(k.pose)) { n.cyc = k.pose; n.pose = prev.pose; }
        else { n.cyc = null; n.pose = typeof k.pose === "string" ? POSE[k.pose] : k.pose; }
      } else { n.pose = prev.pose; n.cyc = k.t === 0 ? null : prev.cyc; }
      n.ease = k.ease || "io"; n.arc = k.arc || 0; n.face = k.face;
      if (k.t === 0) { if (k.face) actor.facing = k.face; } else out.push(n);
    }
    return { keys: out, i: 0, from: null, ph: 0 };
  };
  /* move one man to where he should be on frame f */
  PCW.stepTrack = function (actor, tr, f) {
    const keys = tr.keys;
    while (tr.i < keys.length - 2 && f > keys[tr.i + 1].t) { tr.i++; tr.from = null; }
    const p = keys[tr.i], n = keys[tr.i + 1];
    if (!n || f > n.t) {                                   // past his last key: hold it
      if (n && n.cyc) { tr.ph += 0.42; PCW.chasePose(actor.pose, PCW.cycle(n.cyc, tr.ph), 0.4); }
      return;
    }
    if (!tr.from) tr.from = PCW.clonePose(actor.pose);
    const k = (f - p.t) / (n.t - p.t), e = EASE[n.ease](k);
    actor.x = lerp(p.x, n.x, e); actor.z = lerp(p.z, n.z, e); actor.g = lerp(p.g, n.g, e);
    actor.y = lerp(p.y, n.y, e) + (n.arc ? Math.sin(Math.PI * k) * n.arc : 0);
    actor.rot = lerp(p.rot, n.rot, e);
    if (n.cyc) { tr.ph += n.cyc === "run" ? 0.42 : 0.24; PCW.chasePose(actor.pose, PCW.cycle(n.cyc, tr.ph), 0.4); }
    else PCW.mixPose(tr.from, n.pose, n.ease === "snap" ? EASE.snap(k) : EASE.io(Math.min(1, k * 1.15)), actor.pose);
    if (f >= n.t && n.face) actor.facing = n.face;
  };

  /* ---------------- shared bits ---------------- */
  const G = () => PCW.G;
  function hit(x, z, h, power) {           // power 0..4
    const g = G();
    g.hitstop = Math.max(g.hitstop, Math.round(1 + power * 2.2));
    g.shake = Math.max(g.shake, 2 + power * 4);
    g.sparks.push({ x, z, h, age: 0, big: power >= 3 });
  }
  function down(b, frames, from, seated) {
    b.st = "down"; b.downT = Math.round(frames); b.sellT = b.downT; b.seated = !!seated; b.downBy = from || null;
    b.corner = null; b.y = 0; b.downId = (b.downId || 0) + 1; b.downRot = 90;
  }
  const q = o => (o.big ? 1.3 : o.flat ? 0.8 : 1);
  const mul = o => (o.big ? 1.7 : 1);
  function seen(type, a, b, size, o, extra) {
    PCW.see(Object.assign({ type, actor: a.id, target: b.id, size, q: q(o || {}) }, extra || {}));
    PCW.landed(a);
    PCW.trust(o && o.big ? TR.BIG : TR.SOLD);
  }
  const sideOf = (a, b) => Math.sign(b.x - a.x) || a.facing;
  const lim = a => (a.out ? ox : cx);

  /* ---------------- getting into position before a choice ---------------- */
  const stage = PCW.stage = {};
  stage.tie = function (a, b) {
    const s = new Seq(), dir = sideOf(a, b), cl = lim(a);
    const mid = clamp((a.x + b.x) / 2, (a.out ? B.OX0 : B.XLO) + 36, (a.out ? B.OX1 : B.XHI) - 36), z = (a.z + b.z) / 2;
    s.k(a, 0, { face: dir }).k(b, 0, { face: -dir });
    s.k(a, 14, { x: cl(mid - dir * 36), z, pose: "tie" }).k(b, 14, { x: cl(mid + dir * 36), z, pose: "tie" });
    return s;
  };
  stage.corner = function (a, b, c) {
    const s = new Seq(), fresh = b.st !== "corner";
    s.k(a, 0, { face: c.side }).k(b, 0, { face: -c.side });
    s.k(b, fresh ? 16 : 8, { x: c.x, z: c.z, pose: "cornered", ease: fresh ? "in" : "io" });
    s.k(a, 18, { x: c.x - c.side * 80, z: c.z, pose: "ready" });
    if (fresh) s.ev(16, () => { hit(c.x, c.z, 120, 0); G().ropeShake = 12; G().ropeSide = c.side < 0 ? "L" : "R"; });
    s.ev(18, () => { b.st = "corner"; b.corner = c; b.cornerT = Math.max(b.cornerT || 0, 420); });
    return s;
  };
  stage.down = function (a, b) {
    const s = new Seq(), side = sideOf(a, b), cl = lim(a);
    let x = b.x - side * 76; if (cl(x) !== x) x = b.x + side * 76;
    s.k(a, 0, { face: Math.sign(b.x - x) || 1 }).k(a, 12, { x: cl(x), z: b.z, pose: "ready" });
    return s;
  };
  stage.cover = function (a, b) {
    const s = new Seq();
    s.k(a, 14, { x: b.x, z: b.z, y: 15, rot: -90, pose: "cover" });
    s.k(b, 14, { rot: 90, pose: "pinned" });
    return s;
  };

  /* ---------------- the moves ---------------- */
  const M = PCW.MOVES = {};

  /* three chops. Works in the middle, in the corner, and on the floor. */
  M.chops = function (a, b, o) {
    const s = new Seq(), dir = a.facing, corner = b.st === "corner", push = corner ? 0 : (o.big ? 16 : 8);
    const rest = corner ? "cornered" : "ready", cl = lim(b);
    let bx = b.x;
    [[10, 14], [36, 40], [62, 66]].forEach(([w, c], i) => {
      s.k(a, w, { pose: "windup" }).k(a, c, { pose: "chop", ease: "snap" }).k(a, c + 10, { pose: "ready" });
      bx = cl(bx + dir * push);
      s.k(b, c, { pose: i ? "hit" : rest }).k(b, c + 4, { x: bx, pose: "sell", ease: "snap" });
      s.ev(c, () => { hit(b.x - dir * 10, b.z, 150 * b.p.scale - b.g, 1); PCW.woo(a); });
    });
    s.ev(66, () => { seen(corner ? "cornerchops" : "chops", a, b, 1.6, o); PCW.say("pbp", PCW.LINES.strike); });
    if (o.big) s.k(b, 96, { pose: "kneel" }).k(b, 132, { pose: rest });
    else s.k(b, 88, { pose: "stagger" }).k(b, 108, { pose: rest });
    s.k(a, 88, { pose: "ready" });
    return s;
  };
  M.cornerchops = M.chops;

  M.slam = function (a, b, o) {
    const s = new Seq(), dir = a.facing;
    const sd = cx(a.x + dir * 100) === a.x + dir * 100 ? dir : -dir;          // slam him where there is room
    const lx = a.x + sd * 96;
    s.k(a, 12, { pose: "scoop" }).k(a, 34, { pose: "hoist" }).k(a, 46, { pose: "hoist" })
      .k(a, 54, { pose: "drive", ease: "in" }).k(a, 86, { pose: "ready" });
    s.k(b, 12, { x: a.x + dir * 30, pose: "hit" })
      .k(b, 34, { x: a.x + sd * 8, y: 118, rot: 90, pose: "carried" }).k(b, 46, { y: 118 })
      .k(b, 54, { x: lx, y: 0, pose: "down", ease: "in" });
    if (o.big) s.k(b, 68, { arc: 30, x: lx + sd * 14 });
    s.ev(54, () => {
      hit(lx, b.z, 20, 2); down(b, 150 * mul(o), a);
      seen("slam", a, b, 2, o); PCW.say("pbp", PCW.LINES.slam);
    });
    return s;
  };

  /* off the ropes and into a clothesline */
  M.ropes = function (a, b, o) {
    const s = new Seq(), dir = a.facing;
    const room = dir > 0 ? B.XHI - b.x : b.x - B.XLO, wd = room > 220 ? dir : -dir;
    const rope = wd > 0 ? B.XHI : B.XLO, meet = a.x + wd * 74;
    const t1 = 16 + Math.ceil(Math.abs(rope - b.x) / RUN_V), t2 = t1 + Math.ceil(Math.abs(rope - meet) / RUN_V);
    s.k(a, 0, { face: wd }).k(a, 12, { pose: "whip", ease: "snap" }).k(a, 34, { pose: "ready" })
      .k(a, t2 - 14, { pose: "ready" }).k(a, t2 - 5, { pose: "windup" }).k(a, t2, { pose: "cloth", ease: "snap" })
      .k(a, t2 + 22, { pose: "cloth" }).k(a, t2 + 44, { pose: "ready" });
    s.k(b, 10, { pose: "hit" }).k(b, 16, { face: wd })
      .k(b, t1, { x: rope, pose: "run", ease: "lin" }).k(b, t1 + 1, { face: -wd })
      .k(b, t2, { x: meet, pose: "run", ease: "lin" })
      .k(b, t2 + 22, { x: cx(meet - wd * 34), rot: 90, arc: o.big ? 86 : 58, pose: "air", ease: "lin" })
      .k(b, t2 + 30, { pose: "down" });
    s.ev(t1, () => { G().ropeShake = 16; G().ropeSide = wd > 0 ? "R" : "L"; });
    s.ev(t2, () => {
      hit(a.x + wd * 40, a.z, 150 * a.p.scale, 3);
      seen("ropes", a, b, 2.4, o); PCW.say("pbp", PCW.LINES.clothesline, 1);
    });
    s.ev(t2 + 22, () => { hit(b.x, b.z, 16, 1); down(b, 130 * mul(o), a); });
    return s;
  };

  /* sent into the buckles; he hangs there */
  M.tocorner = function (a, b, o) {
    const s = new Seq(), side = a.facing;
    const c = { x: side > 0 ? B.XHI : B.XLO, z: b.z > R.D / 2 ? B.ZHI : B.ZLO, side };
    const t1 = 16 + Math.ceil(Math.hypot(c.x - b.x, c.z - b.z) / RUN_V);
    s.k(a, 12, { pose: "whip", ease: "snap" }).k(a, 36, { pose: "ready" });
    s.k(b, 10, { pose: "hit" }).k(b, 16, { face: side })
      .k(b, t1, { x: c.x, z: c.z, pose: "run", ease: "lin" }).k(b, t1 + 1, { face: -side })
      .k(b, t1 + 7, { pose: "snap", ease: "snap" }).k(b, t1 + 30, { pose: "cornered" });
    s.ev(t1, () => {
      hit(c.x, c.z, 130, 2); G().ropeShake = 16; G().ropeSide = side > 0 ? "R" : "L";
      b.st = "corner"; b.corner = c; b.cornerT = o.big ? 600 : 440;
      seen("tocorner", a, b, 1.6, o); PCW.say("pbp", PCW.LINES.corner, 1);
    });
    return s;
  };

  /* back up, run in, squash him in the corner */
  M.charge = function (a, b, o) {
    const s = new Seq(), side = b.corner ? b.corner.side : a.facing;
    const back = cx(b.x - side * 270);
    s.k(a, 24, { x: back, pose: "walk", ease: "lin" }).k(a, 36, { pose: "windup" })
      .k(a, 54, { x: b.x - side * 58, pose: "run", ease: "in" }).k(a, 58, { pose: "tackle", ease: "snap" })
      .k(a, 70, { pose: "tackle" }).k(a, 96, { x: b.x - side * 120, pose: "ready" });
    s.k(b, 54, { pose: "cornered" }).k(b, 59, { pose: "snap", ease: "snap" })
      .k(b, 96, { x: b.x - side * 22, pose: "sitdown", ease: "in" });
    s.ev(56, () => {
      hit(b.x - side * 20, b.z, 130, 3); G().ropeShake = 18; G().ropeSide = side > 0 ? "R" : "L";
      seen("charge", a, b, 2.4, o); PCW.say("pbp", PCW.LINES.charge, 1);
    });
    s.ev(96, () => down(b, 140 * mul(o), a, true));
    return s;
  };

  /* slow it down: a side headlock, a couple of wrenches, then take him over */
  M.headlock = function (a, b, o) {
    const s = new Seq(), dir = a.facing, wrench = Object.assign({}, POSE.hlA, { lean: 30, afe: 118 });
    const flail = Object.assign({}, POSE.hlB, { afs: 108, afe: 10 });
    s.k(a, 14, { x: a.x + dir * 12, pose: "hlA" }).k(b, 14, { x: a.x + dir * 44, pose: "hlB" });
    [38, 80].forEach(t => {
      s.k(a, t, { pose: "hlA" }).k(a, t + 8, { pose: wrench, ease: "snap" }).k(a, t + 22, { pose: "hlA" });
      s.k(b, t, { pose: "hlB" }).k(b, t + 8, { pose: flail, ease: "snap" }).k(b, t + 26, { pose: "hlB" });
      s.ev(t + 8, () => { G().shake = Math.max(G().shake, 3); });
    });
    s.ev(88, () => seen("headlock", a, b, 1.3, o));
    const lx = cx(a.x - dir * 74);
    s.k(a, 112, { pose: "hlA" }).k(a, 124, { pose: "throwing", ease: "snap" }).k(a, 160, { pose: "ready" });
    s.k(b, 112, { pose: "hlB" }).k(b, 136, { x: lx, rot: -270, arc: 96, pose: "air", ease: "lin" }).k(b, 142, { pose: "down" });
    s.ev(136, () => { b.rot = 90; hit(lx, b.z, 16, 1); down(b, 100 * mul(o), a); });
    return s;
  };

  /* over the ropes and out to the floor on the camera side */
  M.throwout = function (a, b, o) {
    const s = new Seq(), lx = ox(b.x);
    s.k(a, 10, { pose: "reach" }).k(a, 22, { pose: "throwing", ease: "snap" }).k(a, 60, { pose: "ready" });
    s.k(b, 10, { pose: "hit" }).k(b, 22, { z: Math.max(30, b.z - 30), pose: "doubled" })
      .k(b, 50, { x: lx, z: -98, g: R.RH, rot: 450, arc: 74, pose: "air", ease: "lin" }).k(b, 58, { pose: "down" });
    s.ev(36, () => { G().ropeShake = 14; G().ropeSide = "N"; });
    s.ev(50, () => {
      b.rot = 90; b.out = true; hit(lx, -98, 16 - R.RH, 3); down(b, 170 * mul(o), a);
      seen("throwout", a, b, 2.4, o); PCW.say("pbp", PCW.LINES.outside, 1);
    });
    return s;
  };

  /* on the floor: drive him back-first into the edge of the ring */
  M.apron = function (a, b, o) {
    const s = new Seq();
    s.k(a, 0, { face: sideOf(a, b) }).k(a, 12, { pose: "reach" }).k(a, 22, { pose: "throwing", ease: "snap" }).k(a, 60, { pose: "ready" });
    s.k(b, 12, { pose: "hit" }).k(b, 28, { z: -58, pose: "snap", ease: "in" }).k(b, 64, { z: -70, pose: "sitdown", ease: "in" });
    s.ev(28, () => {
      hit(b.x, -52, 70 - R.RH, 3);
      seen("apron", a, b, 2.4, o); PCW.say("pbp", PCW.LINES.apron, 1);
    });
    s.ev(64, () => down(b, 150 * mul(o), a, true));
    return s;
  };

  /* roll him under the bottom rope, then follow him in */
  M.rollin = function (a, b) {
    const s = new Seq(), bx = cx(b.x), axp = cx(bx - sideOf(a, b) * 96);
    s.k(a, 14, { pose: "reach" });
    s.k(b, 14, { rot: b.st === "down" && !b.seated ? b.rot : 90, pose: "down" }).k(b, 44, { x: bx, z: 64, g: 0, y: 0, rot: 450, pose: "down" });
    s.k(a, 44, { pose: "ready" }).k(a, 70, { x: axp, z: 56, g: 0, pose: "kneel" }).k(a, 88, { pose: "ready" });
    s.ev(44, () => { b.rot = 90; b.out = false; if (b.st !== "down") down(b, 70, a); else { b.seated = false; b.downT = Math.max(b.downT, 70); } });
    s.ev(70, () => { a.out = false; });
    return s;
  };
  M.selfout = function (a, b, o) {
    const s = new Seq(), x = ox(o && o.x !== undefined ? o.x : a.x);
    const t0 = a.z > 90 ? Math.ceil((a.z - 60) / 3.6) : 0;
    if (t0) s.k(a, t0, { z: 60, pose: "walk", ease: "lin" });
    s.k(a, t0 + 26, { x, z: -98, g: R.RH, pose: "kneel" }).k(a, t0 + 44, { pose: "ready" });
    s.ev(t0 + 26, () => { a.out = true; });
    return s;
  };
  M.selfin = function (a) {
    const s = new Seq();
    s.k(a, 26, { x: cx(a.x), z: 56, g: 0, pose: "kneel" }).k(a, 44, { pose: "ready" });
    s.ev(26, () => { a.out = false; });
    return s;
  };

  /* run, and throw yourself through the ropes onto a man on the floor */
  M.dive = function (a, b, o) {
    const s = new Seq(), bx = b.x, bz = b.z;
    const t0 = Math.max(10, Math.ceil(Math.hypot(bx - a.x, 190 - a.z) / 6.4));
    s.k(a, 0, { face: Math.sign(bx - a.x) || a.facing }).k(a, t0, { x: cx(bx), z: 190, pose: "run", ease: "lin" })
      .k(a, t0 + 10, { pose: "windup" }).k(a, t0 + 24, { z: 34, pose: "run", ease: "in" });
    const land = t0 + 44;
    if (o.miss) {
      const away = bx > 640 ? -1 : 1;
      s.k(b, t0 + 24, { pose: "ready" }).k(b, land - 4, { x: ox(bx + away * 130), pose: "walk" }).k(b, land + 20, { pose: "ready" });
      s.k(a, land, { x: ox(bx), z: bz, g: R.RH, rot: -90, arc: 78, pose: "fly", ease: "lin" }).k(a, land + 10, { pose: "cover" });
      s.ev(land, () => {
        a.out = true; hit(bx, bz, 10 - R.RH, 3); down(a, 210, b); a.downRot = -90;
        PCW.see({ type: "crash", actor: b.id, target: a.id, size: 2.6 }); PCW.trust(TR.MOVED, b.p.short + " moved"); PCW.say("pbp", PCW.LINES.crash, 1);
      });
      return s.pad(24);
    }
    s.k(b, land - 6, { pose: "block" }).k(b, land + 20, { x: ox(bx), rot: 90, arc: 22, pose: "down", ease: "lin" });
    s.k(a, land, { x: ox(bx), z: bz + 6, g: R.RH, y: 60, rot: -90, arc: 60, pose: "fly", ease: "lin" })
      .k(a, land + 20, { x: ox(bx + (bx > 640 ? -70 : 70)), y: 0, pose: "cover" });
    s.ev(t0 + 26, () => { G().ropeShake = 14; G().ropeSide = "N"; G().crowd.flash(14); });
    s.ev(land, () => {
      a.out = true; hit(bx, bz, 120 - R.RH, 4);
      seen("dive", a, b, 3.6, o); PCW.say("pbp", PCW.LINES.dive, 2);
    });
    s.ev(land + 20, () => { down(b, 180 * mul(o), a); down(a, 70, null); a.downRot = -90; });
    return s;
  };

  /* THE HEEL'S TRICKS ---------------------------------------- */
  /* a thumb in the eye. He cannot answer it. The crowd sees it; the referee might not. */
  M.rake = function (a, b) {
    const s = new Seq(), dir = a.facing;
    s.k(a, 8, { pose: "reach" }).k(a, 13, { pose: "chop", ease: "snap" }).k(a, 30, { pose: "ready" });
    s.k(b, 13, {}).k(b, 19, { x: lim(b)(b.x + dir * 14), pose: "eyes", ease: "snap" }).k(b, 80, { pose: "eyes" }).k(b, 100, { pose: b.st === "corner" ? "cornered" : "ready" });
    s.ev(13, () => {
      hit(b.x - dir * 6, b.z, 170 * b.p.scale - b.g, 0);
      PCW.see({ type: "rake", actor: a.id, target: b.id, size: 1.4, q: 1, dirty: true }); PCW.landed(a);
      PCW.say("color", PCW.LINES.rake, 1);
    });
    return s;
  };
  /* he wants no part of it: out under the bottom rope */
  M.bail = function (a, b) {
    const s = M.selfout(b, a, {});
    s.k(a, 12, { pose: "reach" }).k(a, 36, { pose: "ready" });
    s.ev(10, () => { PCW.see({ type: "bail", actor: b.id, target: a.id }); PCW.say("color", PCW.LINES.bail, 1); });
    return s;
  };
  stage.coverFeet = function (a, b) {
    const s = new Seq();
    s.k(a, 14, { x: b.x, z: b.z, y: 15, rot: -90, pose: "coverfeet" });
    s.k(b, 14, { rot: 90, pose: "pinned" });
    return s;
  };

  M.stomp = function (a, b) {
    const s = new Seq(), curl = Object.assign({}, POSE.down, { lfh: 70, lbh: 50, afs: 60, lean: 20 });
    [[10, 16], [42, 48]].forEach(([u, d]) => {
      s.k(a, u, { pose: "stompup" }).k(a, d, { pose: "stompdn", ease: "snap" }).k(a, d + 14, { pose: "ready" });
      if (!b.seated) s.k(b, d, {}).k(b, d + 5, { pose: curl, ease: "snap" }).k(b, d + 22, { pose: "down" });
      s.ev(d, () => hit(b.x, b.z, 24 - b.g, 1));
    });
    s.ev(48, () => {
      PCW.see({ type: "stomp", actor: a.id, target: b.id, size: 1, q: 1, dirty: true }); PCW.landed(a);
      b.downT += 50; if (PCW.rnd() < 0.5) PCW.say("color", PCW.LINES.stomp);
    });
    return s.pad(20);
  };

  M.pose = function (a) {
    const s = new Seq();
    s.k(a, 12, { pose: a.p.tauntKind }).k(a, 70, { pose: a.p.tauntKind }).k(a, 84, { pose: "ready" });
    s.ev(12, () => PCW.posed(a));
    return s;
  };

  M.pickup = function (a, b) {
    const s = new Seq(), dir = sideOf(a, b), cl = lim(a);
    // out of a corner, he is hauled up and walked back toward the middle
    let bx = b.x, bz = b.z;
    if (!b.out && PCW.cornerFor(b).d < 230) { bx = cx(b.x + Math.sign(R.CX - b.x) * 170); bz = cz(b.z + Math.sign(R.D / 2 - b.z) * 110); }
    s.k(a, 0, { face: dir }).k(a, 14, { pose: "reach" }).k(a, 40, { pose: "reach" }).k(a, 60, { x: cl(bx - dir * 72), z: bz, pose: "tie" });
    s.k(b, 0, { face: -dir }).k(b, 14, {}).k(b, 40, { rot: 0, pose: "kneel" }).k(b, 60, { x: bx, z: bz, pose: "tie" });
    s.ev(40, () => { b.st = "stand"; b.seated = false; b.downT = 0; });
    return s;
  };

  /* up to the top rope, and down onto him */
  M.elbow = function (a, b, o) {
    const s = new Seq(), c = PCW.cornerFor(b), side = c.side;
    const t0 = Math.max(8, Math.ceil(Math.hypot(c.x - side * 34 - a.x, c.z - a.z) / 4.6));
    const lead = b.x - c.x;                                  // which way he flies
    s.k(a, 0, { face: Math.sign(c.x - a.x) || side }).k(a, t0, { x: c.x - side * 34, z: c.z, pose: "run", ease: "lin" })
      .k(a, t0 + 26, { x: c.x - side * 4, y: 150, pose: "perch" }).k(a, t0 + 27, { face: -side })
      .k(a, t0 + 46, { pose: "tall" }).k(a, t0 + 72, { pose: "tall" });
    const land = t0 + 98;
    s.ev(t0 + 46, () => G().crowd.flash(16));
    if (o.miss) {
      const rx = cx(b.x + (Math.sign(lead) || -side) * 120);
      s.k(b, land - 20, {}).k(b, land - 2, { x: rx, rot: b.rot + 360 });
      s.k(a, land, { x: b.x, z: b.z, y: 0, rot: 90, arc: 96, pose: "elbow", ease: "lin" }).k(a, land + 10, { pose: "down" });
      s.ev(land - 2, () => { b.rot = 90; });
      s.ev(land, () => {
        hit(a.x, a.z, 16, 3); down(a, 200, b); b.downT = Math.min(b.downT, 50);
        PCW.see({ type: "crash", actor: b.id, target: a.id, size: 2.6 }); PCW.trust(TR.MOVED, b.p.short + " moved"); PCW.say("pbp", PCW.LINES.crash, 1);
      });
      return s.pad(20);
    }
    const fold = Object.assign({}, POSE.down, { lfh: 78, lbh: 60, afs: 80, lean: 26 });
    s.k(a, land, { x: b.x + side * 6, z: b.z, y: 16, rot: 90, arc: 96, pose: "elbow", ease: "lin" })
      .k(a, land + 26, { x: cx(b.x + side * 64), y: 0, pose: "down" })
      .k(a, land + 62, { rot: 0, pose: "kneel" }).k(a, land + 82, { pose: "ready" });
    s.k(b, land, {}).k(b, land + 6, { pose: fold, ease: "snap" }).k(b, land + 34, { pose: "down" });
    s.ev(land, () => {
      hit(b.x, b.z, 30, 4); down(b, 200 * mul(o), a);
      seen("elbow", a, b, 3.2, o); PCW.say("pbp", PCW.LINES.elbow, 2);
    });
    return s;
  };

  /* STOVE HOT's finisher: kick, turn, sit out. His jaw lands on the shoulder. */
  M.burner = function (a, b, o) {
    const s = new Seq(), dir = a.facing, lx = cx(b.x + dir * 84);
    s.k(a, 12, { pose: "kick", ease: "snap" }).k(a, 20, { pose: "ready" }).k(a, 21, { face: -dir })
      .k(a, 34, { x: cx(b.x - dir * 30), pose: "headlock" }).k(a, 46, { pose: "headlock" })
      .k(a, 54, { pose: "sit", ease: "in" }).k(a, 104, { pose: "sit" }).k(a, 122, { pose: "kneel" }).k(a, 140, { pose: "ready" }).k(a, 141, { face: dir });
    s.k(b, 12, { pose: "ready" }).k(b, 18, { pose: "doubled", ease: "snap" }).k(b, 46, { pose: "doubled" })
      .k(b, 56, { pose: "snap", ease: "snap" }).k(b, 92, { x: lx, rot: 90, arc: 50, pose: "air", ease: "lin" }).k(b, 100, { pose: "down" });
    s.ev(12, () => hit(b.x, b.z, 100, 1));
    s.ev(40, () => G().crowd.flash(12));
    s.ev(54, () => {
      hit(b.x - dir * 10, b.z, 110, 4); b.finBy = a.id; b.finAt = G().tick;
      seen("finisher", a, b, 4, o); PCW.say("pbp", PCW.LINES.burner, 2);
    });
    s.ev(92, () => down(b, 280, a));
    return s;
  };
  /* THE BOULDER's finisher: up onto the shoulder, and planted. */
  M.landslide = function (a, b, o) {
    const s = new Seq(), dir = a.facing, sd = cx(a.x + dir * 100) === a.x + dir * 100 ? dir : -dir, lx = a.x + sd * 96;
    s.k(a, 12, { pose: "scoop" }).k(a, 46, { pose: "sidelift" }).k(a, 62, { pose: "sidelift" })
      .k(a, 70, { pose: "slamdown", ease: "in" }).k(a, 104, { pose: "kneel" }).k(a, 122, { pose: "ready" });
    s.k(b, 12, { x: a.x + dir * 30, pose: "hit" }).k(b, 46, { x: a.x + sd * 18, y: 100, rot: 68, pose: "carried" }).k(b, 62, { y: 100 })
      .k(b, 70, { x: lx, y: 0, rot: 90, pose: "down", ease: "in" });
    s.ev(54, () => G().crowd.flash(12));
    s.ev(70, () => {
      hit(lx, b.z, 20, 4); b.finBy = a.id; b.finAt = G().tick; down(b, 280, a);
      seen("finisher", a, b, 4, o); PCW.say("pbp", PCW.LINES.landslide, 2);
    });
    return s;
  };

  /* he blocks it and fires back. The man who was in control then either
     lets the comeback happen, or cuts it off. */
  M.fireback = function (a, b, o) {
    const s = new Seq(), dir = a.facing, cl = lim(a);
    s.k(a, 10, { pose: "windup" }).k(a, 14, { pose: "chop", ease: "snap" });
    s.k(b, 10, { pose: "block", ease: "snap" });
    s.ev(14, () => hit(b.x - dir * 22, b.z, 150 - b.g, 0));
    s.k(b, 24, { pose: "windup" }).k(b, 28, { pose: "punch", ease: "snap" }).k(b, 40, { pose: "windup" }).k(b, 44, { pose: "punch", ease: "snap" });
    s.k(a, 28, { pose: "chop" }).k(a, 32, { x: cl(a.x - dir * 10), pose: "hit", ease: "snap" }).k(a, 48, { x: cl(a.x - dir * 22), pose: "stagger", ease: "snap" });
    s.ev(28, () => { hit(a.x + dir * 8, a.z, 150 - a.g, 1); PCW.woo(b); });
    s.ev(44, () => {
      hit(a.x + dir * 8, a.z, 150 - a.g, 1); PCW.woo(b);
      PCW.see({ type: "fireback", actor: b.id, target: a.id, size: 1.6, q: 1 }); PCW.landed(b);
    });
    if (o.cut) {
      const fall = Object.assign({}, POSE.down);
      s.k(b, 54, { pose: "windup" });
      s.k(a, 54, { pose: "ready" }).k(a, 60, { pose: "kick", ease: "snap" }).k(a, 72, { pose: "hoist" }).k(a, 80, { pose: "drive", ease: "in" }).k(a, 110, { pose: "ready" });
      s.k(b, 62, { pose: "doubled", ease: "snap" }).k(b, 78, { pose: "doubled" }).k(b, 84, { pose: "clubbed", ease: "snap" }).k(b, 104, { rot: 90, pose: fall, ease: "in" });
      s.ev(60, () => hit(b.x, b.z, 100 - b.g, 1));
      s.ev(80, () => {
        hit(b.x, b.z, 120 - b.g, 2);
        PCW.see({ type: "cutoff", actor: a.id, target: b.id, size: 2, q: 1 }); PCW.landed(a); PCW.say("color", PCW.LINES.cutoff, 1);
      });
      s.ev(104, () => down(b, 130, a));
    } else {
      s.k(b, 58, { pose: "windup" }).k(b, 66, { pose: "punch", ease: "snap" }).k(b, 92, { pose: "ready" });
      s.k(a, 66, {}).k(a, 90, { x: cl(a.x - dir * 110), pose: "stagger", ease: "out" }).k(a, 118, { pose: "ready" });
      s.ev(66, () => {
        hit(a.x + dir * 8, a.z, 150 - a.g, 2);
        PCW.see({ type: "comeback", actor: b.id, target: a.id, size: 2, q: 1 }); PCW.landed(b); PCW.say("pbp", PCW.LINES.comeback, 1);
      });
    }
    return s;
  };

  /* he just stands there and takes it. */
  M.shrug = function (a, b) {
    const s = new Seq(), dir = a.facing, cl = lim(a);
    [[10, 14], [38, 42]].forEach(([w, c]) => {
      s.k(a, w, { pose: "windup" }).k(a, c, { pose: "chop", ease: "snap" }).k(a, c + 12, { pose: "ready" });
      s.ev(c, () => hit(b.x - dir * 10, b.z, 150 - b.g, 0));
    });
    s.k(b, 14, {}).k(b, 22, { pose: "nosold" }).k(b, 96, { pose: "nosold" }).k(b, 112, { pose: "ready" });
    s.k(a, 60, { pose: "ready" }).k(a, 78, { x: cl(a.x - dir * 46), pose: "stagger" }).k(a, 112, { pose: "ready" });
    s.ev(46, () => {
      PCW.see({ type: "hulkup", actor: b.id, target: a.id });
      PCW.trust(TR.NO_SELL, b.p.short + " no-sold it"); PCW.say("color", PCW.LINES.nosell, 1);
    });
    return s;
  };

  M.kickout = function (a, b) {
    const s = new Seq(), side = b.x > 640 ? -1 : 1, cl = lim(a);
    s.k(b, 6, { pose: "kickout", ease: "snap" }).k(b, 34, { pose: "down" });
    s.k(a, 30, { x: cl(a.x + side * 96), y: 0, rot: 0, arc: 34, pose: "kneel" }).k(a, 56, { pose: "ready" });
    s.ev(6, () => { G().shake = Math.max(G().shake, 6); });
    s.ev(34, () => down(b, 70, null));
    return s;
  };

  /* getting up by himself (played per man while the other is free to move) */
  PCW.getupKeys = function (w) {
    if (w.seated) return [{ t: 30, pose: "kneel", rot: 0 }, { t: 46, pose: "ready" }];
    return [{ t: 20, rot: 0, pose: "kneel" }, { t: 44, pose: "ready" }];
  };

  /* the nearest corner to a man, and whether it is close enough to fly from */
  PCW.CORNERS = [
    { x: B.XLO, z: B.ZLO, side: -1 }, { x: B.XHI, z: B.ZLO, side: 1 },
    { x: B.XLO, z: B.ZHI, side: -1 }, { x: B.XHI, z: B.ZHI, side: 1 }
  ];
  PCW.cornerFor = function (w) {
    let best = null, bd = 1e9;
    for (const c of PCW.CORNERS) { const d = Math.hypot(c.x - w.x, c.z - w.z); if (d < bd) { bd = d; best = c; } }
    return Object.assign({ d: bd }, best);
  };
})();
