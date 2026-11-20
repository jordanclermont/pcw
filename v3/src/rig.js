/* ============================================================
   v3 — src/rig.js
   The jointed body. A pose is ten angles (degrees):
     lean, head            torso and head tilt (+ = forward)
     afs, afe / abs, abe   front / back arm: shoulder, elbow
                           (0 = hanging down, 90 = straight out in front, 180 = straight up)
     lfh, lfk / lbh, lbk   front / back leg: hip (+ = forward), knee bend
   Moves are written as key poses on a timeline (src/moves.js) and the
   body is eased from one to the next. This is the stand-in the art
   pass will replace later.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;

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
    give:     P(-4, -4, [-18, 18], [-34, 14], [10, 4], [-12, 4]),
    cornered: P(-14, 10, [118, -62], [128, -70], [22, 20], [-6, 14]),
    ready:    P(10, 2, [52, 70], [30, 82], [18, 16], [-18, 10]),
    block:    P(-6, 0, [128, -84], [116, -92], [14, 10], [-14, 8]),
    punch:    P(16, 2, [94, 4], [-22, 74], [28, 20], [-26, 6]),
    stagger:  P(-20, -16, [-34, 30], [-56, 24], [20, 22], [-28, 10]),
    hlA:      P(18, 6, [66, 104], [52, 110], [22, 20], [-22, 8]),
    hlB:      P(62, 20, [34, 40], [18, 52], [32, 36], [-18, 26]),
    perch:    P(44, -14, [34, 62], [22, 72], [78, 124], [66, 120]),
    tall:     P(-6, -8, [150, 10], [140, -6], [8, 4], [-8, 4]),
    elbow:    P(0, 0, [62, 124], [18, 20], [12, 12], [-8, 16]),
    fly:      P(0, -12, [166, 0], [154, 0], [-8, 6], [-22, 12]),
    sitdown:  P(-14, 16, [22, 20], [8, 22], [84, 10], [78, 22]),
    clubbed:  P(70, 26, [20, 20], [4, 30], [40, 60], [0, 50]),
    beg:      P(30, -10, [110, -20], [100, -30], [60, 96], [-10, 84]),
    coverfeet: P(0, -8, [60, 20], [84, 10], [-64, 8], [-78, 16]),
    eyes:     P(34, 16, [128, -96], [120, -104], [24, 26], [-20, 16]),
    subA:     P(-24, -8, [74, 26], [62, 38], [56, 88], [-8, 74]),
    subAw:    P(-40, -18, [60, 50], [48, 60], [56, 88], [-8, 74]),
    armup:    P(0, 14, [176, 4], [24, 12], [26, 52], [2, 4]),
    armupw:   P(0, 24, [168, 30], [60, 40], [50, 70], [10, 20]),
    legup:    P(0, 10, [130, 30], [40, 20], [84, 6], [2, 4]),
    legupw:   P(0, 22, [160, 10], [80, 30], [92, 30], [20, 40]),
    clutched: P(-40, -30, [150, 10], [140, 20], [-4, 6], [-14, 14]),
    clutchedw: P(-52, -38, [170, -10], [160, 0], [-10, 20], [-20, 30]),
    crawl:    P(0, -20, [170, 0], [120, 40], [30, 60], [-10, 20]),
    punchup:  P(4, 8, [172, -24], [58, 62], [34, 44], [-22, 34]),
    punchdn:  P(34, 14, [70, 6], [58, 62], [34, 44], [-22, 34]),
    lowkick:  P(-6, 4, [-20, 40], [30, 60], [48, 10], [-10, 10]),
    highkick: P(-22, 0, [-30, 40], [34, 60], [104, 4], [-12, 12]),
    refstand: P(4, 0, [8, 14], [-6, 16], [6, 2], [-6, 2]),
    refcount: P(48, -6, [40, 30], [20, 60], [58, 96], [-6, 80]),
    refslap:  P(60, 0, [70, 0], [20, 60], [58, 96], [-6, 80])
  };
  PCW.POSE = POSE;
  const KEYS = Object.keys(POSE.idle);
  PCW.clonePose = p => Object.assign({}, p);
  PCW.mixPose = function (a, b, k, out) {
    out = out || {};
    for (const key of KEYS) out[key] = a[key] + (b[key] - a[key]) * k;
    return out;
  };
  PCW.chasePose = function (cur, tg, rate) { for (const key of KEYS) cur[key] += (tg[key] - cur[key]) * rate; };

  /* walking and running are generated from a phase, not keyed */
  const stride = (base, ph, amp, knee) => Object.assign({}, base, {
    lfh: amp * Math.sin(ph), lfk: knee * Math.max(0, -Math.cos(ph)) + 6,
    lbh: -amp * Math.sin(ph), lbk: knee * Math.max(0, Math.cos(ph)) + 6
  });
  PCW.cycle = function (name, ph) {
    if (name === "walk") return stride(POSE.idle, ph, 22, 26);
    const p = stride(POSE.idle, ph, 46, 58);          // run
    p.lean = 22; p.afs = 20 + 46 * Math.sin(ph + Math.PI); p.afe = 86; p.abs = 20 + 46 * Math.sin(ph); p.abe = 86;
    return p;
  };

  PCW.refPose = function (ref, cur) {
    const tg = ref.state === "count" ? (ref.slap > 4 ? POSE.refslap : POSE.refcount)
      : ref.state === "walk" ? stride(POSE.refstand, (ref.x + ref.z) * 0.09, 20, 22)
        : ref.state === "point" ? Object.assign({}, POSE.refstand, { afs: 96, afe: 0 }) : POSE.refstand;
    if (!cur) return Object.assign({}, tg);
    PCW.chasePose(cur, tg, 0.3);
    return cur;
  };

  /* ---------------- pose -> joints on screen ---------------- */
  const DIM = { torso: 62, neck: 5, head: 15, upper: 30, fore: 29, thigh: 44, shin: 44, foot: 13 };
  PCW.DIM = DIM;
  const rad = a => a * Math.PI / 180;

  PCW.joints = function (b) {   // b: { x, floor, y, rot, facing, pose, scale } — x/floor are SCREEN positions
    const p = b.pose, s = b.scale;
    const ext = h => DIM.thigh * Math.cos(rad(h[0])) + DIM.shin * Math.cos(rad(h[0] - h[1]));
    const legExt = Math.max(ext([p.lfh, p.lfk]), ext([p.lbh, p.lbk]), 12);
    const k = Math.abs(Math.sin(rad(b.rot)));
    const px = b.x, py = b.floor - b.y - (legExt * (1 - k) + 13 * k) * s;
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
