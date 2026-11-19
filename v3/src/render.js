/* ============================================================
   v3 — src/render.js
   The hard camera. The crowd fills the top half of the picture and
   the ring sits in front of it: a square with depth, four posts,
   ropes on all four sides, and the floor outside on the camera side.
   Things further from the camera are drawn smaller and higher
   (PCW.proj). Everything is drawn in code (no image files yet).
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;
  const G = PCW.G, R = PCW.RING, W = PCW.W, H = PCW.H, proj = PCW.proj;
  // System condensed faces for now (the fonts embedded in build 0.15 turned out
  // to cover almost no letters). DISPLAY is the same family, drawn heavy.
  const FONT = "'Avenir Next Condensed', 'Arial Narrow', 'Helvetica Neue', sans-serif";
  const DISPLAY = "display";
  const face = (size, font) => (font === DISPLAY ? "800 " : "600 ") + size + "px " + FONT;
  let ctx, refPose = null, frame = 0;

  PCW.initRender = function (canvas) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const rgb = (c, m) => "rgb(" + Math.round(c[0] * m) + "," + Math.round(c[1] * m) + "," + Math.round(c[2] * m) + ")";
  function shadeHex(hex, m) {
    const n = parseInt(hex.slice(1), 16);
    return rgb([(n >> 16) & 255, (n >> 8) & 255, n & 255], m);
  }
  function text(str, x, y, size, color, align, font, stroke) {
    ctx.font = face(size, font);
    ctx.textAlign = align || "left"; ctx.textBaseline = "middle";
    if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = "rgba(0,0,0,.85)"; ctx.lineJoin = "round"; ctx.strokeText(str, x, y); }
    ctx.fillStyle = color; ctx.fillText(str, x, y);
  }
  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  /* ============================================================ */
  PCW.render = function () {
    frame++;
    ctx.save();
    if (G.phase === "MATCH" && G.shake > 0.5) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
    arena();
    if (G.crowd) crowd();
    floor();
    ringBack();
    const live = G.phase !== "PRE";
    if (live) {
      // far men first, so a man nearer the camera is drawn over one further back.
      // Men on the floor in front of the ring are drawn after the ring itself.
      const cast = G.ws.map(w => ({ w, front: w.z < -20, key: -w.z + (w.st === "down" ? 0 : 6) + (w.y > 40 ? 6 : 0) }));
      cast.push({ ref: true, front: false, key: -G.ref.z + 5 });
      cast.sort((a, b) => a.key - b.key);
      for (const c of cast) if (!c.front) shadow(c.ref ? G.ref : c.w, c.ref);
      for (const c of cast) if (!c.front) { if (c.ref) referee(); else wrestler(c.w); }
      ringFront(); apron();
      for (const c of cast) if (c.front) { shadow(c.w, false); wrestler(c.w); }
      sparks();
    } else { ringFront(); apron(); }
    ctx.restore();
    if (live) { hud(); talk(); banner(); hints(); askCard(); }
    if (G.phase === "PRE") preCard();
    if (G.phase === "ENDED") resultCard();
  };

  /* ---------------- the building ---------------- */
  function arena() {
    ctx.fillStyle = "#060608"; ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, 260);
    g.addColorStop(0, "#0d0d12"); g.addColorStop(1, "#060608");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 260);
    // lighting truss + cans
    ctx.fillStyle = "#15151b"; ctx.fillRect(0, 96, W, 7); ctx.fillRect(0, 114, W, 3);
    for (let i = 0; i < 9; i++) {
      const x = 80 + i * 140;
      ctx.fillStyle = "#1c1c24"; ctx.fillRect(x - 9, 103, 18, 16);
      ctx.fillStyle = i % 2 ? "rgba(255,244,214,.75)" : "rgba(255,255,255,.55)";
      ctx.beginPath(); ctx.arc(x, 121, 4.5, 0, 6.3); ctx.fill();
    }
    // the cone of light over the ring
    const cone = ctx.createLinearGradient(0, 110, 0, 620);
    cone.addColorStop(0, "rgba(255,246,222,.10)"); cone.addColorStop(1, "rgba(255,246,222,.02)");
    ctx.fillStyle = cone;
    ctx.beginPath(); ctx.moveTo(560, 110); ctx.lineTo(720, 110); ctx.lineTo(1180, 610); ctx.lineTo(100, 610); ctx.closePath(); ctx.fill();
  }

  /* ---------------- the crowd: people, not a meter ---------------- */
  function crowd() {
    const C = G.crowd;
    let row = -1;
    for (let i = C.people.length - 1; i >= 0; i--) {   // back row first
      const p = C.people[i];
      if (p.row !== row) { row = p.row; riser(p); }
      person(p, C.posture(p), C);
    }
    // flashbulbs
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const f of C.flashes) {
      if (f.age < 0) continue;
      const a = 1 - f.age / 12, r = f.size * (0.6 + f.age / 10);
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
      g.addColorStop(0, "rgba(255,255,255," + a + ")"); g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 6.3); ctx.fill();
    }
    ctx.restore();
    // what they're shouting
    for (const f of C.floaters) {
      if (f.age < 0) continue;
      const k = f.age / f.life;
      ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      text(f.text, f.x, f.y - k * 34, f.size, f.color, "center", FONT, 3);
    }
    ctx.globalAlpha = 1;
    if (C.chant && !C.shout) {
      const k = C.chant.t / C.chant.dur, a = Math.min(1, k * 8, (1 - k) * 5);
      const beat = Math.abs(Math.sin(C.chant.t / 9));
      ctx.globalAlpha = a * (0.55 + beat * 0.45);
      text(C.chant.text, 640, 150 - beat * 6, 46, C.chant.kind === "bored" ? "#b9bcc6" : "#f3ecd8", "center", DISPLAY, 6);
      ctx.globalAlpha = 1;
    }
    if (C.shout) {
      const k = C.shout.t / 46;
      ctx.globalAlpha = 1 - k * k;
      if (C.shout.small) text(C.shout.text, 640, 226 - k * 10, 50 + k * 8, "#d9dbe2", "center", DISPLAY, 6);
      else text(C.shout.text, 640, 226 - k * 14, 84 + k * 18, "#fff", "center", DISPLAY, 8);
      ctx.globalAlpha = 1;
    }
  }
  function riser(p) {   // the dark step each row sits behind
    ctx.fillStyle = "rgba(4,4,6,.55)";
    ctx.fillRect(0, p.y + 30 * p.s, W, 40 * p.s);
  }
  function person(p, post, C) {
    const s = p.s * (post.lean > 0 ? 1.05 : 1);
    let y = p.y + (post.stand ? -15 * s : 0) + (post.lean > 0 ? 3 : post.lean < 0 ? 6 : 0);
    if (post.jump) y -= Math.abs(Math.sin(frame / 5 + p.ph)) * 9 * s;
    else if (post.arms === "clap") y -= Math.abs(Math.sin(frame / 9 + p.ph)) * 1.5;
    const x = p.x;
    // leaning in = they come forward into the light; sitting back = they sink into the dark
    const lit = p.shade * (post.lean > 0 ? 1.22 : post.lean < 0 ? 0.62 : 1);
    const shirt = rgb(p.col, Math.min(1, lit * 0.95)), skin = shadeHex(p.skin, Math.min(1, lit));

    if (p.signUp > 0.04) sign(p, x, y, s, lit);

    // body
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.moveTo(x - 19 * s, y + 13 * s); ctx.quadraticCurveTo(x, y + 6 * s, x + 19 * s, y + 13 * s);
    ctx.lineTo(x + 17 * s, y + 58 * s); ctx.lineTo(x - 17 * s, y + 58 * s); ctx.closePath(); ctx.fill();
    // head
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x, y, 10.5 * s, 0, 6.3); ctx.fill();
    if (p.hair) { ctx.fillStyle = shadeHex(p.hair, Math.min(1, lit + 0.1)); ctx.beginPath(); ctx.arc(x, y - 1.5 * s, 10.8 * s, Math.PI * 1.08, Math.PI * 1.92); ctx.fill(); }
    if (post.mouth) { ctx.fillStyle = "rgba(20,6,6,.9)"; ctx.beginPath(); ctx.ellipse(x, y + 5 * s, 3 * s, 3.4 * s, 0, 0, 6.3); ctx.fill(); }
    // arms
    ctx.strokeStyle = skin; ctx.lineWidth = 5.5 * s; ctx.lineCap = "round";
    const sx = 17 * s, sy = y + 16 * s;
    const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    if (post.arms === "up") {
      const wv = Math.sin(frame / 4 + p.ph) * 3 * s;
      line(x - sx, sy, x - 24 * s + wv, y - 24 * s); line(x + sx, sy, x + 24 * s + wv, y - 24 * s);
    } else if (post.arms === "point") {
      line(x + sx, sy, x + 20 * s, y - 26 * s);
    } else if (post.arms === "boo") {
      line(x - sx, sy, x - 7 * s, y + 6 * s); line(x + sx, sy, x + 7 * s, y + 6 * s);
    } else if (post.arms === "folded") {
      ctx.strokeStyle = shirt; ctx.lineWidth = 7 * s; line(x - 14 * s, y + 31 * s, x + 14 * s, y + 31 * s);
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1.5 * s; line(x - 14 * s, y + 34.5 * s, x + 14 * s, y + 34.5 * s);
    } else if (post.arms === "clap") {
      const c = Math.abs(Math.sin(frame / 6 + p.ph)) * 5 * s;
      line(x - sx, sy, x - c, y + 27 * s); line(x + sx, sy, x + c, y + 27 * s);
    }
  }
  function sign(p, x, y, s, lit) {
    const k = p.signUp, w = 62 * s, h = (p.sign.text.length > 1 ? 40 : 26) * s;
    const cx = x + 4 * s, cy = y - (18 + 46 * k) * s;
    ctx.strokeStyle = "#3a2c1c"; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.moveTo(cx, cy + h / 2); ctx.lineTo(cx, y + 6 * s); ctx.stroke();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.sin(frame / 14 + p.ph) * 0.05 * k);
    const m = Math.min(1, lit + 0.25);
    ctx.fillStyle = rgb(p.sign.against ? [236, 226, 150] : [238, 236, 226], m);
    ctx.fillRect(-w / 2, -h / 2, w, h);
    p.sign.text.forEach((ln, i) => {
      const ty = p.sign.text.length > 1 ? (i - 0.5) * 16 * s : 0;
      text(ln, 0, ty + 1, 13 * s, "#101014", "center", DISPLAY);
    });
    ctx.restore();
  }

  /* ---------------- the ring ---------------- */
  const APRON = 34;                     // the mat runs a little way past the ropes
  const POST_H = 168;
  const quad = pts => { ctx.beginPath(); pts.forEach((p, i) => ctx[i ? "lineTo" : "moveTo"](p.x, p.y)); ctx.closePath(); };

  function floor() {
    // the barricade the front row leans on, and the arena floor in front of it
    ctx.fillStyle = "#0c0c10"; ctx.fillRect(0, 452, W, H - 452);
    ctx.fillStyle = "#23232c"; ctx.fillRect(0, 452, W, 4);
    ctx.fillStyle = "#15151b"; ctx.fillRect(0, 474, W, 2);
    const g = ctx.createLinearGradient(0, 480, 0, 720);
    g.addColorStop(0, "#101015"); g.addColorStop(1, "#22222b");
    ctx.fillStyle = g; ctx.fillRect(0, 476, W, H - 476);
    // thin floor mats around the ring
    const A = R.APRON + 70, pts = [proj(R.LO - A, -150, -R.RH), proj(R.HI + A, -150, -R.RH), proj(R.HI + A, R.D + 40, -R.RH), proj(R.LO - A, R.D + 40, -R.RH)];
    quad(pts); ctx.fillStyle = "rgba(60,62,78,.35)"; ctx.fill();
  }

  function rope(a, b, h, color, side) {
    const p1 = proj(a[0], a[1], h), p2 = proj(b[0], b[1], h);
    let mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    if (G.ropeShake && G.ropeSide === side) {
      const bow = Math.sin(G.ropeShake * 0.9) * G.ropeShake * 1.1;
      if (side === "L") mx -= bow; else if (side === "R") mx += bow; else if (side === "F") my -= bow * 0.6; else my += bow * 0.6;
    }
    const wdt = 3.6 * (p1.s + p2.s) / 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.lineWidth = wdt + 2.5;
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.quadraticCurveTo(mx, my, p2.x, p2.y); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = wdt;
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.quadraticCurveTo(mx, my, p2.x, p2.y); ctx.stroke();
  }
  const ROPE_COL = ["#e6e2d8", "#e6e2d8", "#b3121a"];   // bottom, middle, top
  function ropes(a, b, side, dim) {
    R.ROPES.forEach((h, i) => rope(a, b, h, dim ? shadeHex(ROPE_COL[i], dim) : ROPE_COL[i], side));
  }
  function post(x, z) {
    const b = proj(x, z, 0), t = proj(x, z, POST_H), w = 9 * b.s;
    const pg = ctx.createLinearGradient(b.x - w, 0, b.x + w, 0);
    pg.addColorStop(0, "#3c3f48"); pg.addColorStop(0.5, "#9aa0ad"); pg.addColorStop(1, "#2c2e36");
    ctx.fillStyle = pg; ctx.fillRect(b.x - w, t.y, w * 2, b.y - t.y);
    ctx.fillStyle = "#b3121a";
    for (const h of R.ROPES) { const p = proj(x, z, h); rrect(p.x - 14 * p.s, p.y - 11 * p.s, 28 * p.s, 22 * p.s, 6 * p.s); ctx.fill(); }
  }

  /* everything behind the wrestlers: the mat, the far ropes, the side ropes, the far posts */
  function ringBack() {
    const A = APRON;
    const m = [proj(R.LO - A, -A), proj(R.HI + A, -A), proj(R.HI + A, R.D + A), proj(R.LO - A, R.D + A)];
    const g = ctx.createLinearGradient(0, m[2].y, 0, m[0].y);
    g.addColorStop(0, "#8f8c85"); g.addColorStop(1, "#d2cfc6");
    quad(m); ctx.fillStyle = g; ctx.fill();
    const c = proj(R.CX, R.D / 2);
    const sp = ctx.createRadialGradient(c.x, c.y, 30, c.x, c.y, 520);
    sp.addColorStop(0, "rgba(255,250,235,.38)"); sp.addColorStop(1, "rgba(0,0,0,.30)");
    quad(m); ctx.fillStyle = sp; ctx.fill();
    // the far edge of the mat
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(m[3].x, m[3].y); ctx.lineTo(m[2].x, m[2].y); ctx.stroke();
    ropes([R.LO, R.D], [R.HI, R.D], "F", 0.78);
    ropes([R.LO, 0], [R.LO, R.D], "L", 0.9);
    ropes([R.HI, 0], [R.HI, R.D], "R", 0.9);
    post(R.LO, R.D); post(R.HI, R.D);
  }
  /* in front of the wrestlers: the near ropes and the two near posts */
  function ringFront() {
    ropes([R.LO, 0], [R.HI, 0], "N");
    post(R.LO, 0); post(R.HI, 0);
  }
  /* the side of the ring facing the camera */
  function apron() {
    const l = proj(R.LO - APRON, -APRON), r = proj(R.HI + APRON, -APRON), lb = proj(R.LO - APRON, -APRON, -R.RH);
    const top = l.y, hgt = lb.y - top;
    ctx.fillStyle = "#0b0b0e"; ctx.fillRect(l.x, top, r.x - l.x, hgt);
    ctx.fillStyle = "#b3121a"; ctx.fillRect(l.x, top, r.x - l.x, 5);
    ctx.globalAlpha = 0.5;
    const ty = top + hgt / 2 + 3;
    text("PCW", 300, ty, 26, "#e6e2d8", "center", DISPLAY);
    text("GRANDSTAND", 640, ty, 22, "#b3121a", "center", DISPLAY);
    text("PCW", 980, ty, 26, "#e6e2d8", "center", DISPLAY);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(l.x, lb.y, r.x - l.x, 6);
  }

  /* ---------------- bodies ---------------- */
  function shadow(w, isRef) {
    const p = proj(w.x, w.z, isRef ? 0 : -w.g);
    const lying = isRef ? 0 : Math.abs(Math.sin(w.rot * Math.PI / 180)), sc = isRef ? 0.95 : w.p.scale, up = isRef ? 0 : w.y;
    ctx.fillStyle = "rgba(0,0,0,.32)";
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 3, (38 + lying * 60) * sc * p.s * (1 - Math.min(0.5, up / 300)), 9 * p.s, 0, 0, 6.3); ctx.fill();
  }
  function wrestler(w) {
    const p = proj(w.x, w.z, -w.g);
    // a little breathing, so nobody is ever a statue
    const pose = Object.assign({}, w.pose); pose.lean += Math.sin(frame / 13 + (w.id === "stove" ? 0 : 2)) * 1.3;
    body({ x: p.x, floor: p.y, y: w.y * p.s, rot: w.rot, facing: w.facing, pose, scale: w.p.scale * p.s }, w.p);
  }
  function referee() {
    const r = G.ref, p = proj(r.x, r.z, 0);
    refPose = PCW.refPose(r, refPose);
    body({ x: p.x, floor: p.y, y: 0, rot: 0, facing: r.facing, pose: refPose, scale: PCW.REF_LOOK.scale * p.s }, PCW.REF_LOOK);
  }

  const OUT = "#08080b";
  function limb(a, b, width, color) {
    ctx.lineCap = "round";
    ctx.strokeStyle = OUT; ctx.lineWidth = width + 4;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

  function body(b, look) {
    const J = PCW.joints(b), s = b.scale, k = look.bulk;
    const skin = look.skin, skinB = shadeHex(look.skin, 0.74);
    const legs = look.pants ? look.trunks : null;

    const drawArm = (arm, col) => {
      limb(J.sh, arm.el, 13 * k * s, look.stripes ? "#e9e7df" : col);
      limb(arm.el, arm.hand, 11 * k * s, col);
      if (look.elbowpads) { ctx.fillStyle = look.accent; ctx.beginPath(); ctx.arc(arm.el[0], arm.el[1], 7.5 * k * s, 0, 6.3); ctx.fill(); }
      if (look.wristbands) limb(mix(arm.el, arm.hand, 0.62), mix(arm.el, arm.hand, 0.86), 11.5 * k * s, "#17171c");
      ctx.fillStyle = col; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(arm.hand[0], arm.hand[1], 6.5 * k * s, 0, 6.3); ctx.fill(); ctx.stroke();
    };
    const drawLeg = (leg, col, dark) => {
      limb(J.pelvis, leg.knee, 18 * k * s, legs || col);
      if (!legs) limb(J.pelvis, mix(J.pelvis, leg.knee, 0.4), 18.5 * k * s, dark ? shadeHex(look.trunks, 0.8) : look.trunks);
      limb(leg.knee, leg.foot, 14 * k * s, legs || col);
      limb(mix(leg.knee, leg.foot, 0.42), leg.foot, 14.5 * k * s, look.boots);
      limb(leg.foot, leg.toe, 10 * s, look.boots);
      if (!legs) { ctx.fillStyle = dark ? shadeHex(look.accent, 0.75) : look.accent; ctx.beginPath(); ctx.arc(leg.knee[0], leg.knee[1], 8.5 * k * s, 0, 6.3); ctx.fill(); }
    };

    drawArm(J.ab, skinB);
    drawLeg(J.lb, skinB, true);
    // torso: waist to chest, then the wider shoulders
    const torsoCol = look.stripes ? "#e9e7df" : skin;
    limb(J.pelvis, J.neck, 30 * k * s, torsoCol);
    limb(J.chest, J.sh, 38 * k * s, torsoCol);
    if (look.stripes) {
      ctx.strokeStyle = "#111"; ctx.lineWidth = 3.2 * s;
      for (const q of [-9, 0, 9]) {
        const nx = (J.neck[1] - J.pelvis[1]), ny = -(J.neck[0] - J.pelvis[0]), m = Math.hypot(nx, ny) || 1;
        const ox = nx / m * q * s, oy = ny / m * q * s;
        const a = mix(J.pelvis, J.neck, 0.22), c = mix(J.pelvis, J.neck, 0.98);
        ctx.beginPath(); ctx.moveTo(a[0] + ox, a[1] + oy); ctx.lineTo(c[0] + ox, c[1] + oy); ctx.stroke();
      }
    }
    limb(J.pelvis, mix(J.pelvis, J.neck, 0.2), 31 * k * s, look.trunks);
    if (look.stripe) limb(mix(J.pelvis, J.neck, 0.19), mix(J.pelvis, J.neck, 0.21), 31 * k * s, look.accent);
    head(J, s, look, b.facing);
    drawLeg(J.lf, skin, false);
    drawArm(J.af, skin);
  }

  function head(J, s, look, facing) {
    const hx = J.head[0], hy = J.head[1], r = 15 * s;
    let ux = hx - J.neck[0], uy = hy - J.neck[1]; const m = Math.hypot(ux, uy) || 1; ux /= m; uy /= m;   // "up" out of the skull
    // which way the face points: perpendicular to up, on the facing side
    let fx = -uy, fy = ux;
    if (fx * facing < 0 || (Math.abs(fx) < 0.3 && fy > 0 && facing === 0)) { fx = -fx; fy = -fy; }
    if (Math.abs(ux) > 0.75) { // lying down: face the sky
      if (fy > 0) { fx = -fx; fy = -fy; }
    }
    limb(J.neck, [hx - ux * r * 0.6, hy - uy * r * 0.6], 12 * s, look.skin);
    ctx.fillStyle = look.skin; ctx.strokeStyle = OUT; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(hx, hy, r, 0, 6.3); ctx.fill(); ctx.stroke();
    const ang = Math.atan2(uy, ux);
    if (look.hair === "flattop") {
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang + Math.PI / 2);
      ctx.fillStyle = "#0c0c10"; ctx.fillRect(-r * 0.98, -r * 1.3, r * 1.96, r * 0.72);
      ctx.restore();
    } else if (look.hair === "short") {
      ctx.fillStyle = "#2a2018"; ctx.beginPath(); ctx.arc(hx, hy, r, ang - 1.25, ang + 1.25); ctx.closePath(); ctx.fill();
    }
    // eye + brow
    const ex = hx + fx * r * 0.5 + ux * r * 0.12, ey = hy + fy * r * 0.5 + uy * r * 0.12;
    ctx.fillStyle = "#0b0b0e"; ctx.beginPath(); ctx.arc(ex, ey, 2 * s, 0, 6.3); ctx.fill();
    ctx.strokeStyle = "#0b0b0e"; ctx.lineWidth = 2.4 * s; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(ex - fx * 4 * s + ux * 5 * s, ey - fy * 4 * s + uy * 5 * s);
    ctx.lineTo(ex + fx * 4 * s + ux * 3.4 * s, ey + fy * 4 * s + uy * 3.4 * s); ctx.stroke();
    if (look.goatee) {
      ctx.fillStyle = "#2a1a10";
      ctx.beginPath(); ctx.arc(hx + fx * r * 0.62 - ux * r * 0.66, hy + fy * r * 0.62 - uy * r * 0.66, 5.4 * s, 0, 6.3); ctx.fill();
    }
  }

  function sparks() {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const sw of G.sparks) {
      const k = sw.age / 14, sp = proj(sw.x, sw.z, sw.h), bg = sw.big ? 1.5 : 1;
      ctx.strokeStyle = "rgba(255,240,200," + (1 - k) + ")"; ctx.lineWidth = 4 * (1 - k) + 1;
      for (let i = 0; i < 8; i++) {
        const a = i * 0.785 + 0.3, r1 = (8 + k * 26) * bg, r2 = (20 + k * 52) * bg;
        ctx.beginPath(); ctx.moveTo(sp.x + Math.cos(a) * r1, sp.y + Math.sin(a) * r1); ctx.lineTo(sp.x + Math.cos(a) * r2, sp.y + Math.sin(a) * r2); ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ---------------- the broadcast graphics ---------------- */
  function hud() {
    const C = G.crowd, split = C.split();
    plate(G.stove, 24, false, split.stove);
    plate(G.boulder, W - 24, true, split.boulder);
    // clock + how loud the building is
    const sec = Math.floor((G.end ? G.end.time : G.tick / 60));
    rrect(566, 18, 148, 62, 6); ctx.fillStyle = "rgba(8,8,11,.86)"; ctx.fill();
    ctx.fillStyle = "#b3121a"; ctx.fillRect(566, 18, 148, 4);
    text(Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"), 640, 42, 26, "#f3ecd8", "center", DISPLAY);
    text("CROWD NOISE", 640, 62, 11.5, "#a9adb8", "center");
    ctx.fillStyle = "#23232b"; ctx.fillRect(582, 69, 116, 5);
    ctx.fillStyle = C.heat > 75 ? "#ffd27a" : "#e6e2d8"; ctx.fillRect(582, 69, 116 * C.heat / 100, 5);
    if (G.out && G.out.n > 0 && G.phase === "MATCH") {
      rrect(566, 84, 148, 24, 5); ctx.fillStyle = G.out.n >= 7 ? "rgba(150,20,26,.95)" : "rgba(8,8,11,.86)"; ctx.fill();
      text("REFEREE'S COUNT  " + G.out.n + " / 10", 640, 97, 12.5, "#f3ecd8", "center");
    }
  }
  function plate(w, edge, right, share) {
    const c = G.crowd.W[w.id], x = right ? edge - 300 : edge, cpu = PCW.pads[w.id].cpu;
    rrect(x, 18, 300, 62, 6); ctx.fillStyle = "rgba(8,8,11,.86)"; ctx.fill();
    ctx.fillStyle = w.p.accent; ctx.fillRect(right ? x + 294 : x, 18, 6, 62);
    const tx = right ? x + 284 : x + 16, al = right ? "right" : "left";
    text(w.p.name + (cpu ? "  (CPU)" : ""), tx, 36, 20, "#f3ecd8", al, DISPLAY);
    if (G.ctrl === w.id && G.phase === "MATCH") text("IN CONTROL", right ? x + 16 : x + 284, 36, 11.5, w.p.accent, right ? "left" : "right");
    // cheers <-> boos: one bar, centre is "they don't care either way"
    const bx = x + 16, bw = 268, mid = bx + bw / 2;
    ctx.fillStyle = "#23232b"; ctx.fillRect(bx, 54, bw, 8);
    const len = (bw / 2) * Math.abs(c.like) / 100;
    ctx.fillStyle = c.like >= 0 ? w.p.accent : "#c2242c";
    ctx.fillRect(c.like >= 0 ? mid : mid - len, 54, len, 8);
    ctx.fillStyle = "#f3ecd8"; ctx.fillRect(mid - 1, 51, 2, 14);
    text("BOOS", bx, 72, 11.5, "#a9adb8", "left"); text("CHEERS", bx + bw, 72, 11.5, "#a9adb8", "right");
    text(Math.round(share * 100) + "% OF THE ROOM", mid, 72, 11.5, "#e6e2d8", "center");
  }

  function chip(str, cx, cy, accent, tag) {
    // "[T]" renders as a gold keycap
    const parts = str.split(/(\[[^\]]+\])/).filter(Boolean), size = 17;
    ctx.font = face(size);
    const widths = parts.map(p => p[0] === "[" ? ctx.measureText(p.slice(1, -1)).width + 16 : ctx.measureText(p).width);
    const total = widths.reduce((a, b) => a + b, 0) + 26;
    let x = PCW.clamp(cx - total / 2, 12, W - total - 12);
    const y = PCW.clamp(cy, 130, 700);
    rrect(x, y - 19, total, 38, 6); ctx.fillStyle = "rgba(8,8,11,.92)"; ctx.fill();
    ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = accent; ctx.fillRect(x, y - 33, ctx.measureText(tag).width * 0.62 + 14, 14);
    text(tag, x + 7, y - 26, 10.5, "#0b0b0e", "left");
    x += 13;
    parts.forEach((p, i) => {
      if (p[0] === "[") {
        rrect(x + 1, y - 13, widths[i] - 2, 26, 4); ctx.fillStyle = "#ffd24a"; ctx.fill();
        text(p.slice(1, -1), x + widths[i] / 2, y + 1, size, "#141006", "center");
      } else text(p, x, y + 1, size, "#f3ecd8", "left");
      x += widths[i];
    });
  }
  /* the one-line prompt over a player's head while he walks, and the pin prompt */
  function hints() {
    for (const w of G.ws) {
      let c = PCW.hintFor(w);
      if (G.pin && !PCW.pads[w.id].cpu) {
        const k = "[" + PCW.keyName(w.id).act + "]";
        if (G.pin.b === w) c = G.pin.booked ? "STAY DOWN. THIS IS THE FINISH." : "KICK OUT — " + k + "  (later is louder)";
        else c = "HOLD THE COVER";
      }
      if (!c) continue;
      const lying = Math.abs(Math.sin(w.rot * Math.PI / 180)) > 0.6, p = proj(w.x, w.z, -w.g);
      const base = p.y - (lying ? 130 : 262 * w.p.scale * p.s) - w.y * 0.5;
      chip(c, p.x, base, w.p.accent, w.p.short);
    }
  }

  /* what just got called, for a second, so you always know what you are watching */
  function banner() {
    const b = G.banner; if (!b || G.ask) return;
    const a = b.t < 8 ? b.t / 8 : b.t > 90 ? 1 - (b.t - 90) / 20 : 1;
    const str = b.who + " " + b.text;
    ctx.font = face(18, DISPLAY);
    const w = ctx.measureText(str).width + 36;
    ctx.globalAlpha = Math.max(0, a);
    rrect(640 - w / 2, 114, w, 32, 6); ctx.fillStyle = "rgba(8,8,11,.9)"; ctx.fill();
    text(str, 640, 131, 18, "#f3ecd8", "center", DISPLAY);
    ctx.globalAlpha = 1;
  }

  /* THE CHOICE. The action holds while a player picks. */
  function askCard() {
    const A = G.ask; if (!A) return;
    const n = A.opts.length, gap = 8, x0 = 34, total = W - 68;
    const cw = Math.min(210, (total - gap * (n - 1)) / n), rowW = cw * n + gap * (n - 1);
    const ch = 96, ph = ch + 52;
    // keep the card off the wrestlers: bottom of the screen unless the action is down there
    let low = 0; for (const w of G.ws) low = Math.max(low, proj(w.x, w.z, -w.g).y);
    const py = low > 566 ? 112 : H - ph - 10;
    const px = (W - rowW) / 2 - 14, pw = rowW + 28;
    const fade = Math.min(1, A.t / 8);
    ctx.globalAlpha = fade;
    rrect(px, py, pw, ph, 8); ctx.fillStyle = "rgba(10,10,14,.94)"; ctx.fill();
    ctx.strokeStyle = A.who.p.accent; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = A.who.p.accent; ctx.fillRect(px, py, pw, 5);
    text(A.who.p.name, px + 14, py + 24, 13, A.who.p.accent, "left", DISPLAY);
    ctx.font = face(13, DISPLAY); const nameW = ctx.measureText(A.who.p.name).width;
    text(A.title, px + 26 + nameW, py + 24, 17, "#f3ecd8", "left", DISPLAY);
    const kn = PCW.keyName(A.who.id);
    text("Press the number, or " + (kn.move === "WASD" ? "A / D" : "LEFT / RIGHT") + " then " + kn.act + ", or click", px + pw - 14, py + 24, 11.5, "#8f93a0", "right");
    A.rects = [];
    A.opts.forEach((o, i) => {
      const cx0 = (W - rowW) / 2 + i * (cw + gap), cy0 = py + 40, sel = i === A.sel, back = o.id === "back";
      A.rects.push({ x: cx0, y: cy0, w: cw, h: ch });
      rrect(cx0, cy0, cw, ch, 6);
      ctx.fillStyle = sel ? "rgba(255,210,74,.14)" : "rgba(28,28,36,.95)"; ctx.fill();
      ctx.strokeStyle = sel ? "#ffd24a" : "#3a3a48"; ctx.lineWidth = sel ? 2.5 : 1.2; ctx.stroke();
      rrect(cx0 + 8, cy0 + 8, 22, 22, 4); ctx.fillStyle = "#ffd24a"; ctx.fill();
      text(String(i + 1), cx0 + 19, cy0 + 20, 14, "#141006", "center", DISPLAY);
      const lines = wrapLines(o.label, cw - 46, 15, DISPLAY);
      lines.slice(0, 2).forEach((ln, k) => text(ln, cx0 + 38, cy0 + (lines.length > 1 ? 14 : 20) + k * 16, 15, back ? "#a9adb8" : "#f3ecd8", "left", DISPLAY));
      const hl = wrapLines(o.hint || "", cw - 18, 11.5);
      hl.slice(0, 3).forEach((ln, k) => text(ln, cx0 + 9, cy0 + 50 + k * 14, 11.5, "#a9adb8", "left"));
      if (o.stale) { text("THEY HAVE SEEN THIS", cx0 + cw - 8, cy0 + ch - 9, 9.5, "#ff8a8a", "right"); }
    });
    ctx.globalAlpha = 1;
  }

  function wrapLines(str, maxW, size, font) {
    ctx.font = face(size, font);
    const words = str.split(" "), out = []; let line = "";
    for (const wd of words) {
      const t = line ? line + " " + wd : wd;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = wd; } else line = t;
    }
    if (line) out.push(line);
    return out;
  }

  function talk() {
    // the work, left: what the crowd can't see or hear
    const y = 84;
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = "#5c6070"; ctx.lineWidth = 1.5;
    rrect(24, y, 520, 26, 5); ctx.fillStyle = "rgba(8,8,11,.8)"; ctx.fill(); ctx.stroke(); ctx.restore();
    text("TRUST", 34, y + 13, 11, "#c9ccd6", "left");
    ctx.fillStyle = "#23232b"; ctx.fillRect(74, y + 10, 60, 7);
    ctx.fillStyle = G.trust < 35 ? "#c2242c" : G.trust < 65 ? "#d9a13a" : "#c9b377"; ctx.fillRect(74, y + 10, 60 * G.trust / 100, 7);
    if (G.trustFlash && G.trustFlash.why) text(G.trustFlash.why.toUpperCase() + "  " + G.trustFlash.d, 144, y + 13, 11.5, "#ff8a8a", "left");
    else if (G.gorilla) text("GORILLA: " + G.gorilla.text, 144, y + 13, 12, "#e8dcae", "left");
    else text("Booked: STOVE HOT wins with THE FRONT BURNER", 144, y + 13, 11.5, "#8f93a0", "left");
    // the show, right: the announce desk
    if (G.line && G.line.t < 260 && !(G.out && G.out.n > 0 && false)) {
      const who = G.line.voice === "pbp" ? "CHET" : "DUTCH";
      const a = G.line.t > 220 ? 1 - (G.line.t - 220) / 40 : 1;
      ctx.globalAlpha = a;
      rrect(736, y, 520, 26, 5); ctx.fillStyle = "rgba(20,20,26,.95)"; ctx.fill();
      ctx.fillStyle = G.line.voice === "pbp" ? "#b3121a" : "#3a4a8c"; ctx.fillRect(736, y, 50, 26);
      text(who, 761, y + 13, 12, "#fff", "center", DISPLAY);
      let str = G.line.text; ctx.font = face(12.5);
      while (ctx.measureText(str).width > 452 && str.length > 10) str = str.slice(0, -2);
      text(str === G.line.text ? str : str + "…", 794, y + 13, 12.5, "#f3ecd8", "left");
      ctx.globalAlpha = 1;
    }
  }

  /* ---------------- cards ---------------- */
  function panel(x, y, w, h) {
    ctx.fillStyle = "rgba(0,0,0,.62)"; ctx.fillRect(0, 0, W, H);
    rrect(x, y, w, h, 8); ctx.fillStyle = "rgba(12,12,16,.97)"; ctx.fill();
    ctx.strokeStyle = "#2c2c36"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#b3121a"; ctx.fillRect(x, y, w, 6);
  }
  function preCard() {
    const x = 270, y = 120, w = 740, h = 470, B = PCW.BOOKING;
    panel(x, y, w, h);
    text("GORILLA POSITION", x + 36, y + 50, 38, "#f3ecd8", "left", DISPLAY);
    text("TONIGHT'S BOOKING  (the crowd doesn't know this)", x + 36, y + 92, 15, "#d9a13a", "left");
    text(B.line, x + 36, y + 128, 23, "#f3ecd8", "left");
    text("Everything before the finish is yours to decide. The crowd is the judge.", x + 36, y + 160, 16, "#c9ccd6", "left");
    text("HOW IT WORKS", x + 36, y + 204, 15, "#d9a13a", "left");
    const steps = [
      "WALK.  Where you are changes what you can do: the middle, the ropes, a corner, the floor.",
      "CHOOSE.  Lay hands on him and the action holds while you pick what happens.",
      "WATCH.  The move plays out by itself, and the room reacts to what it saw.",
      "When it is done to you, you choose how to take it: sell it, sell it big, or fight back."
    ];
    steps.forEach((ln, i) => text(ln, x + 36, y + 232 + i * 24, 15, "#f3ecd8", "left"));
    const row = (id, yy) => {
      const p = PCW.PERSONAS[id], cpu = PCW.pads[id].cpu, L = PCW.keyName(id);
      ctx.fillStyle = p.accent; ctx.fillRect(x + 36, yy - 13, 6, 26);
      text(p.name, x + 54, yy, 21, "#f3ecd8", "left", DISPLAY);
      text(cpu ? "CPU partner" : "YOU    move: " + L.move + "    act: " + L.act + "    choose: number keys or a click",
        x + 220, yy, 14.5, cpu ? "#8f93a0" : "#ffd24a", "left");
    };
    row("stove", y + 350); row("boulder", y + 386);
    text("Press 1 or 2 to hand a wrestler to the CPU or take him back.", x + 36, y + 420, 13.5, "#8f93a0", "left");
    const blink = Math.sin(frame / 16) > -0.3;
    if (blink) text("PRESS SPACE TO RING THE BELL", x + w / 2, y + 448, 21, "#ffd24a", "center", DISPLAY);
  }

  function star(cx, cy, r, fill) {
    const path = () => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
        ctx[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.closePath();
    };
    path(); ctx.fillStyle = "#2a2a33"; ctx.fill();
    if (fill > 0) { ctx.save(); ctx.beginPath(); ctx.rect(cx - r, cy - r, 2 * r * fill, 2 * r); ctx.clip(); path(); ctx.fillStyle = "#ffd24a"; ctx.fill(); ctx.restore(); }
  }
  function resultCard() {
    const E = G.end, x = 240, y = 96, w = 800, h = 470;
    panel(x, y, w, h);
    text("THE PCW OBSERVER", x + 36, y + 46, 30, "#f3ecd8", "left", DISPLAY);
    for (let i = 0; i < 5; i++) star(x + 500 + i * 56, y + 46, 22, PCW.clamp(E.stars - i, 0, 1));
    text(E.headline, x + 36, y + 92, 22, "#ffd24a", "left");
    const sec = Math.floor(E.time);
    text("Time " + Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0") + "     Crowd noise, average " + E.heat + " (peak " + E.peak +
      ")     Front row " + E.attn + "     Trust " + Math.round(E.trust), x + 36, y + 124, 14.5, "#c9ccd6", "left");
    text(E.parts.map(p => p[0] + " " + (p[1] >= 0 ? "+" : "") + p[1].toFixed(2)).join("     "), x + 36, y + 148, 13.5, "#8f93a0", "left");

    text("WHAT THE ROOM MADE OF THEM", x + 36, y + 192, 15, "#d9a13a", "left");
    const row = (id, yy) => {
      const p = PCW.PERSONAS[id], v = E.verdict[id];
      ctx.fillStyle = p.accent; ctx.fillRect(x + 36, yy - 20, 6, 78);
      text(p.name, x + 56, yy - 4, 24, "#f3ecd8", "left", DISPLAY);
      const word = n => n >= 0 ? "cheered " + n : "booed " + (-n);
      text("Walked in: " + word(v.like0) + "     Walked out: " + word(v.like) + "     Reaction " + v.over0 + " to " + v.over, x + 56, yy + 24, 14, "#c9ccd6", "left");
      wrapLines(v.text, w - 110, 17).forEach((ln, i) => text(ln, x + 56, yy + 48 + i * 20, 17, "#f3ecd8", "left"));
    };
    row("stove", y + 234); row("boulder", y + 334);
    text("R  run it back", x + w / 2, y + 438, 20, "#ffd24a", "center", DISPLAY);
  }
})();
