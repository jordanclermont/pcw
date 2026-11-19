/* ============================================================
   v2 — src/poses.js
   The jointed body. A pose is ten angles (degrees):
     lean, head            torso and head tilt (+ = forward)
     afs, afe / abs, abe   front / back arm: shoulder, elbow
                           (0 = hanging down, 90 = straight out in front, 180 = straight up)
     lfh, lfk / lbh, lbk   front / back leg: hip (+ = forward), knee bend
   Each wrestler eases toward the pose his state asks for, so every
   move has a picture of its own. This is the stand-in the sprite
   pass will replace later.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;
  const S = PCW.S, G = PCW.G, F = PCW.F, MV = PCW.MOVES;

  const P = (lean, head, af, ab, lf, lb) => ({
    lean, head, afs: af[0], afe: af[1], abs: ab[0], abe: ab[1], lfh: lf[0], lfk: lf[1], lbh: lb[0], lbk: lb[1]
  });

  const POSE = {
    idle:     P(6, 0, [38, 72], [16, 84], [14, 12], [-14, 8]),
    windup:   P(-8, 0, [-46, 104], [34, 78], [18, 14], [-18, 6]),
    chop:     P(18, 4, [96, 4], [-24, 60], [28, 22], [-26, 4]),
    hit:      P(-12, -16, [10, 30], [-12, 30], [8, 6], [-16, 10]),
    sell:     P(-26, -30, [-54, 20], [-76, 30], [22, 32], [-32, 12]),
    nosold:   P(2, 6, [26, 112], [-22, 118], [8, 2], [-8, 2]),
    reach:    P(24, 6, [84, 14], [70, 26], [28, 24], [-28, 6]),
    tie:      P(28, 10, [82, 22], [70, 32], [30, 28], [-32, 6]),
    scoop:    P(36, 4, [62, 30], [42, 40], [28, 42], [-20, 32]),
    hoist:    P(-8, -6, [152, 18], [140, 22], [10, 8], [-12, 8]),
    drive:    P(50, 12, [72, 8], [60, 10], [38, 46], [-28, 24]),
    sidelift: P(-16, -8, [124, 28], [102, 38], [14, 10], [-16, 12]),
    slamdown: P(72, 14, [62, 0], [50, 0], [62, 72], [-10, 60]),
    carried:  P(0, 8, [24, 22], [-30, 22], [16, 26], [-10, 42]),
    throwing: P(52, 10, [44, 8], [-62, 12], [34, 30], [-36, 10]),
    air:      P(12, 10, [62, 42], [42, 42], [52, 62], [30, 72]),
    down:     P(0, 0, [150, 22], [24, 12], [26, 52], [2, 4]),
    pinned:   P(0, 0, [112, 8], [70, 10], [6, 6], [-2, 2]),
    kickout:  P(10, 10, [168, 0], [150, 0], [82, 8], [20, 30]),
    kneel:    P(42, 8, [22, 42], [10, 62], [52, 84], [-10, 72]),
    whip:     P(34, 6, [98, 0], [60, 20], [34, 26], [-30, 8]),
    cloth:    P(10, 0, [92, 0], [-30, 32], [22, 10], [-22, 6]),
    tackle:   P(38, 10, [34, 104], [28, 104], [40, 44], [-40, 12]),
    stompup:  P(-6, 6, [50, 40], [-40, 40], [72, 84], [-6, 4]),
    stompdn:  P(14, 12, [70, 20], [-50, 20], [36, 4], [-10, 6]),
    armsup:   P(-8, -12, [166, 8], [152, -8], [12, 4], [-12, 4]),
    point:    P(-6, -6, [104, 0], [22, 122], [10, 2], [-12, 2]),
    cover:    P(0, -8, [60, 20], [84, 10], [-8, 10], [-22, 22]),
    kick:     P(-12, 0, [-22, 42], [32, 62], [78, 8], [-8, 8]),
    doubled:  P(64, 22, [12, 22], [0, 30], [22, 32], [-10, 26]),
    headlock: P(-4, 0, [172, -64], [160, -52], [10, 6], [-10, 6]),
    sit:      P(-8, 0, [168, -70], [158, -56], [86, 8], [80, 22]),
    snap:     P(-42, -40, [-104, 0], [-132, 0], [10, 0], [-6, 0]),
    refstand: P(4, 0, [8, 14], [-6, 16], [6, 2], [-6, 2]),
    refcount: P(48, -6, [40, 30], [20, 60], [58, 96], [-6, 80]),
    refslap:  P(60, 0, [70, 0], [20, 60], [58, 96], [-6, 80])
  };
  PCW.POSE = POSE;

  const walkCycle = (base, ph, amp, knee) => Object.assign({}, base, {
    lfh: amp * Math.sin(ph), lfk: knee * Math.max(0, -Math.cos(ph)) + 6,
    lbh: -amp * Math.sin(ph), lbk: knee * Math.max(0, Math.cos(ph)) + 6
  });

  /* the pose a wrestler's state is asking for right now */
  function target(w) {
    const t = G.tick, sl = G.slam;
    switch (w.state) {
      case S.IDLE: { const p = Object.assign({}, POSE.idle); p.afs += Math.sin(t / 17 + w.x) * 4; p.abs += Math.cos(t / 19) * 4; return p; }
      case S.WALK: return walkCycle(POSE.idle, w.x * 0.085, 22, 26);
      case S.STRIKE: return w.sf < F.STRIKE_HIT - 2 ? POSE.windup : w.sf < F.STRIKE_HIT + 9 ? POSE.chop : POSE.idle;
      case S.HIT: return POSE.hit;
      case S.SELL: return w.sf < 26 ? POSE.sell : POSE.idle;
      case S.NOSOLD: return POSE.nosold;
      case S.WHIFF: return POSE.reach;
      case S.TIE: { const p = Object.assign({}, POSE.tie); p.lean += Math.sin(t / 7) * 3; return p; }
      case S.SLAM_A:
        if (!sl) return POSE.idle;
        if (sl.kind === "burner") {
          const m = MV.burner;
          return sl.f < m.kick ? POSE.kick : sl.f < m.kick + 4 ? POSE.idle : sl.f < m.turn + 4 ? POSE.headlock : POSE.sit;
        }
        if (sl.kind === "landslide") {
          const m = MV.landslide;
          return sl.f < 10 ? POSE.scoop : sl.f <= m.lift + m.hold ? POSE.sidelift : POSE.slamdown;
        }
        { const m = MV.slam; return sl.f < 9 ? POSE.scoop : sl.f <= m.lift + m.hold ? POSE.hoist : POSE.drive; }
      case S.LIFTED:
        if (sl && sl.kind === "burner") return sl.f < MV.burner.kick - 2 ? POSE.hit : POSE.doubled;
        return POSE.carried;
      case S.DRAG: return w.sf < 8 ? POSE.tie : POSE.throwing;
      case S.BUMP: return (sl && sl.kind === "burner" && sl.d === w && w.bump.f < 12) ? POSE.snap : POSE.air;
      case S.DOWN: {
        if (w.kick > 0) return POSE.kickout;
        const p = Object.assign({}, POSE.down);
        if (w.sf < w.sellExpect) { p.lfk += Math.sin(t / 9) * 12; p.afs += Math.sin(t / 11) * 10; }   // selling it
        if (w.jolt > 0) { p.lfh += 30; p.lbh += 26; p.afs -= 40; }
        return p;
      }
      case S.GETUP: return w.sf < 18 ? POSE.kneel : POSE.idle;
      case S.WHIP: return POSE.whip;
      case S.RUN: {
        const p = walkCycle(POSE.idle, t * 0.42, 44, 56);
        p.lean = 20; p.afs = 20 + 44 * Math.sin(t * 0.42 + Math.PI); p.afe = 84; p.abs = 20 + 44 * Math.sin(t * 0.42); p.abe = 84;
        if (w.tackling) { p.lean = 38; p.afs = 34; p.afe = 104; p.abs = 28; p.abe = 104; }
        return p;
      }
      case S.CLOTH: return POSE.cloth;
      case S.TACKLE: return POSE.tackle;
      case S.STOMP: return w.sf < 10 ? POSE.stompup : w.sf < 20 ? POSE.stompdn : POSE.idle;
      case S.TAUNT: {
        const p = Object.assign({}, POSE[w.p.tauntKind] || POSE.armsup);
        if (w.p.tauntKind === "armsup") { p.afs += Math.sin(t / 5) * 8; p.abs += Math.cos(t / 5) * 8; }
        else p.head += Math.sin(t / 12) * 10;
        return p;
      }
      case S.COVER: return POSE.cover;
      case S.PINNED: return POSE.pinned;
    }
    return POSE.idle;
  }

  const FAST = new Set([S.STRIKE, S.HIT, S.SELL, S.STOMP, S.CLOTH, S.TACKLE, S.BUMP, S.SLAM_A, S.LIFTED]);
  PCW.animate = function (w) {
    const tg = target(w);
    if (!w.pose) { w.pose = Object.assign({}, tg); return; }
    const rate = FAST.has(w.state) ? 0.4 : 0.24;
    for (const k in tg) w.pose[k] += (tg[k] - w.pose[k]) * rate;
  };

  PCW.refPose = function (ref, cur) {
    const tg = ref.state === "count" ? (ref.slap > 4 ? POSE.refslap : POSE.refcount)
      : ref.state === "walk" ? walkCycle(POSE.refstand, ref.x * 0.09, 20, 22) : POSE.refstand;
    if (!cur) return Object.assign({}, tg);
    for (const k in tg) cur[k] += (tg[k] - cur[k]) * 0.3;
    return cur;
  };

  /* ---------------- pose -> joints on screen ---------------- */
  const DIM = { torso: 62, neck: 5, head: 15, upper: 30, fore: 29, thigh: 44, shin: 44, foot: 13 };
  PCW.DIM = DIM;
  const rad = a => a * Math.PI / 180;

  PCW.joints = function (b) {   // b: { x, y, rot, facing, pose, scale, depth }
    const p = b.pose, s = b.scale;
    const ext = h => DIM.thigh * Math.cos(rad(h[0])) + DIM.shin * Math.cos(rad(h[0] - h[1]));
    const legExt = Math.max(ext([p.lfh, p.lfk]), ext([p.lbh, p.lbk]), 12);
    const k = Math.abs(Math.sin(rad(b.rot)));
    const px = b.x, py = PCW.RING.FLOOR + (b.depth || 0) - b.y - (legExt * (1 - k) + 13 * k) * s;
    const cr = Math.cos(rad(b.rot)), sr = Math.sin(rad(b.rot));
    const tf = (lx, ly) => [px + (lx * cr - ly * sr) * s * b.facing, py - (lx * sr + ly * cr) * s];
    const dir = a => [Math.sin(rad(a)), -Math.cos(rad(a))];

    const L = rad(p.lean), up = [Math.sin(L), Math.cos(L)];
    const neck = [up[0] * DIM.torso, up[1] * DIM.torso];
    const sh = [up[0] * (DIM.torso - 7), up[1] * (DIM.torso - 7)];
    const H = rad(p.lean + p.head);
    const head = [neck[0] + Math.sin(H) * (DIM.neck + DIM.head), neck[1] + Math.cos(H) * (DIM.neck + DIM.head)];
    const arm = (a, e) => {
      const d1 = dir(a), el = [sh[0] + d1[0] * DIM.upper, sh[1] + d1[1] * DIM.upper];
      const d2 = dir(a + e), hand = [el[0] + d2[0] * DIM.fore, el[1] + d2[1] * DIM.fore];
      return { el: tf(el[0], el[1]), hand: tf(hand[0], hand[1]) };
    };
    const leg = (h, kn) => {
      const d1 = dir(h), knee = [d1[0] * DIM.thigh, d1[1] * DIM.thigh];
      const d2 = dir(h - kn), foot = [knee[0] + d2[0] * DIM.shin, knee[1] + d2[1] * DIM.shin];
      const toe = [foot[0] + Math.cos(rad(h - kn)) * DIM.foot, foot[1] + Math.sin(rad(h - kn)) * DIM.foot];
      return { knee: tf(knee[0], knee[1]), foot: tf(foot[0], foot[1]), toe: tf(toe[0], toe[1]) };
    };
    return {
      pelvis: tf(0, 0), neck: tf(neck[0], neck[1]), sh: tf(sh[0], sh[1]), head: tf(head[0], head[1]),
      chest: tf(up[0] * DIM.torso * 0.62, up[1] * DIM.torso * 0.62),
      af: arm(p.afs, p.afe), ab: arm(p.abs, p.abe), lf: leg(p.lfh, p.lfk), lb: leg(p.lbh, p.lbk)
    };
  };
})();
