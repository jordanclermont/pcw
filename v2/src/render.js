/* ============================================================
   v2 — src/render.js
   The hard camera. The crowd fills the top half of the picture and
   the ring sits in front of it, side-on, with the wrestlers big.
   Everything is drawn in code (no image files yet).
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;
  const G = PCW.G, S = PCW.S, R = PCW.RING, W = PCW.W, H = PCW.H;
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
    ring();
    if (G.phase !== "PRE") {
      referee();
      const order = G.ws.slice().sort((a, b) => layer(a) - layer(b));
      for (const w of order) shadow(w);
      for (const w of order) wrestler(w);
      sparks();
    }
    apron();
    ctx.restore();
    if (G.phase !== "PRE") { hud(); cues(); talk(); }
    if (G.phase === "PRE") preCard();
    if (G.phase === "ENDED") resultCard();
  };
  const layer = w => (w.state === S.DOWN || w.state === S.PINNED) ? 0 : w.state === S.COVER ? 1 : w.state === S.LIFTED ? 3 : 2;

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
    ctx.beginPath(); ctx.moveTo(560, 110); ctx.lineTo(720, 110); ctx.lineTo(1180, 620); ctx.lineTo(100, 620); ctx.closePath(); ctx.fill();
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
      text(C.chant.text, 640, 178 - beat * 6, 50, C.chant.kind === "bored" ? "#b9bcc6" : "#f3ecd8", "center", DISPLAY, 6);
      ctx.globalAlpha = 1;
    }
    if (C.shout) {
      const k = C.shout.t / 46;
      ctx.globalAlpha = 1 - k * k;
      text(C.shout.text, 640, 240 - k * 14, 84 + k * 18, "#fff", "center", DISPLAY, 8);
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
  function ring() {
    // mat
    const g = ctx.createLinearGradient(0, 572, 0, 628);
    g.addColorStop(0, "#9d9a92"); g.addColorStop(1, "#cfccc3");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(196, 572); ctx.lineTo(1084, 572); ctx.lineTo(1130, 628); ctx.lineTo(150, 628); ctx.closePath(); ctx.fill();
    const sp = ctx.createRadialGradient(640, 600, 40, 640, 600, 520);
    sp.addColorStop(0, "rgba(255,250,235,.35)"); sp.addColorStop(1, "rgba(0,0,0,.28)");
    ctx.fillStyle = sp;
    ctx.beginPath(); ctx.moveTo(196, 572); ctx.lineTo(1084, 572); ctx.lineTo(1130, 628); ctx.lineTo(150, 628); ctx.closePath(); ctx.fill();
    // ropes (they bow when a man hits them)
    const ys = [446, 493, 540], cols = ["#b3121a", "#e6e2d8", "#e6e2d8"];
    for (let i = 0; i < 3; i++) {
      const bow = G.ropeShake ? Math.sin(G.ropeShake * 0.9) * G.ropeShake * 0.9 : 0;
      const cxp = G.ropeSide < 0 ? 300 : 980;
      ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(R.POST_L, ys[i]); ctx.quadraticCurveTo(cxp, ys[i] + bow, R.POST_R, ys[i]); ctx.stroke();
      ctx.strokeStyle = cols[i]; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(R.POST_L, ys[i]); ctx.quadraticCurveTo(cxp, ys[i] + bow, R.POST_R, ys[i]); ctx.stroke();
    }
    // posts + turnbuckle pads
    for (const px of [R.POST_L, R.POST_R]) {
      const pg = ctx.createLinearGradient(px - 9, 0, px + 9, 0);
      pg.addColorStop(0, "#3c3f48"); pg.addColorStop(0.5, "#9aa0ad"); pg.addColorStop(1, "#2c2e36");
      ctx.fillStyle = pg; ctx.fillRect(px - 9, 426, 18, 172);
      ctx.fillStyle = "#b3121a";
      for (const y of ys) { rrect(px - 14, y - 11, 28, 22, 6); ctx.fill(); }
    }
  }
  function apron() {
    ctx.fillStyle = "#0b0b0e"; ctx.fillRect(150, 628, 980, 46);
    ctx.fillStyle = "#b3121a"; ctx.fillRect(150, 628, 980, 5);
    ctx.globalAlpha = 0.5;
    text("PCW", 300, 653, 28, "#e6e2d8", "center", DISPLAY);
    text("GRANDSTAND", 640, 653, 24, "#b3121a", "center", DISPLAY);
    text("PCW", 980, 653, 28, "#e6e2d8", "center", DISPLAY);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#050506"; ctx.fillRect(0, 674, W, 46);
    ctx.fillStyle = "#16161b"; ctx.fillRect(0, 674, W, 2);
  }

  /* ---------------- bodies ---------------- */
  function shadow(w) {
    const lying = Math.abs(Math.sin(w.rot * Math.PI / 180));
    ctx.fillStyle = "rgba(0,0,0,.32)";
    ctx.beginPath(); ctx.ellipse(w.x, R.FLOOR + 4, (38 + lying * 60) * w.p.scale * (1 - Math.min(0.5, w.y / 300)), 9, 0, 0, 6.3); ctx.fill();
  }
  function wrestler(w) {
    if (!w.pose) return;
    const cover = w.state === S.COVER ? 15 : 0;
    body({ x: w.x, y: w.y + cover, rot: w.rot, facing: w.facing, pose: w.pose, scale: w.p.scale }, w.p);
  }
  function referee() {
    const r = G.ref;
    refPose = PCW.refPose(r, refPose);
    ctx.globalAlpha = 0.96;
    body({ x: r.x, y: 0, rot: 0, facing: r.facing, pose: refPose, scale: PCW.REF_LOOK.scale, depth: -16 }, PCW.REF_LOOK);
    ctx.globalAlpha = 1;
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
    for (const sp of G.sparks) {
      const k = sp.age / 14;
      ctx.strokeStyle = "rgba(255,240,200," + (1 - k) + ")"; ctx.lineWidth = 4 * (1 - k) + 1;
      for (let i = 0; i < 8; i++) {
        const a = i * 0.785 + 0.3, r1 = 8 + k * 26, r2 = 20 + k * 52;
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
  }
  function plate(w, edge, right, share) {
    const c = G.crowd.W[w.id], x = right ? edge - 300 : edge, cpu = PCW.pads[w.id].cpu;
    rrect(x, 18, 300, 62, 6); ctx.fillStyle = "rgba(8,8,11,.86)"; ctx.fill();
    ctx.fillStyle = w.p.accent; ctx.fillRect(right ? x + 294 : x, 18, 6, 62);
    const tx = right ? x + 284 : x + 16, al = right ? "right" : "left";
    text(w.p.name + (cpu ? "  (CPU)" : ""), tx, 36, 20, "#f3ecd8", al, DISPLAY);
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
    const y = PCW.clamp(cy, 150, 560);
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
  function cues() {
    for (const w of G.ws) {
      const c = PCW.cueFor(w); if (!c) continue;
      const lying = Math.abs(Math.sin(w.rot * Math.PI / 180)) > 0.6;
      // Stove's cue sits above the action, The Boulder's sits higher still, so they never collide
      const base = R.FLOOR - (lying ? 120 : 250 * w.p.scale) - w.y * 0.5;
      chip(c, w.x, base - (w.id === "boulder" ? 46 : 0), w.p.accent, w.p.short);
    }
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
    // the work, bottom-left: what the crowd can't see or hear
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = "#5c6070"; ctx.lineWidth = 1.5;
    rrect(14, 680, 470, 34, 5); ctx.stroke(); ctx.restore();
    text("BACKSTAGE", 24, 690, 10.5, "#a9adb8", "left");
    text("TRUST", 24, 704, 11, "#c9ccd6", "left");
    ctx.fillStyle = "#23232b"; ctx.fillRect(64, 700, 70, 7);
    ctx.fillStyle = G.trust < 35 ? "#c2242c" : G.trust < 65 ? "#d9a13a" : "#c9b377"; ctx.fillRect(64, 700, 70 * G.trust / 100, 7);
    if (G.trustFlash && G.trustFlash.why) text(G.trustFlash.why.toUpperCase() + "  " + G.trustFlash.d, 146, 703, 11.5, "#ff8a8a", "left");
    else if (G.gorilla) text("GORILLA: " + G.gorilla.text, 146, 703, 12.5, "#e8dcae", "left");
    else text("Booked: STOVE HOT wins with THE FRONT BURNER", 146, 703, 11.5, "#8f93a0", "left");
    // the show, bottom-right: the announce desk
    if (G.line && G.line.t < 260) {
      const who = G.line.voice === "pbp" ? "CHET" : "DUTCH";
      const lines = wrapLines(G.line.text, 640, 14);
      const a = G.line.t > 220 ? 1 - (G.line.t - 220) / 40 : 1;
      ctx.globalAlpha = a;
      rrect(500, 680, 766, 34, 5); ctx.fillStyle = "rgba(20,20,26,.95)"; ctx.fill();
      ctx.fillStyle = G.line.voice === "pbp" ? "#b3121a" : "#3a4a8c"; ctx.fillRect(500, 680, 58, 34);
      text(who, 529, 697, 13, "#fff", "center", DISPLAY);
      if (lines.length > 1) { text(lines[0], 570, 690, 13, "#f3ecd8", "left"); text(lines[1], 570, 705, 13, "#f3ecd8", "left"); }
      else text(lines[0], 570, 697, 15, "#f3ecd8", "left");
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
    const x = 290, y = 150, w = 700, h = 400, B = PCW.BOOKING;
    panel(x, y, w, h);
    text("GORILLA POSITION", x + 36, y + 52, 40, "#f3ecd8", "left", DISPLAY);
    text("TONIGHT'S BOOKING  (the crowd doesn't know this)", x + 36, y + 96, 15, "#d9a13a", "left");
    text(B.line, x + 36, y + 136, 24, "#f3ecd8", "left");
    text(B.note, x + 36, y + 170, 17, "#c9ccd6", "left");
    text("The crowd decides who it likes. Watch the room, not a checklist.", x + 36, y + 198, 17, "#c9ccd6", "left");
    const row = (id, yy) => {
      const p = PCW.PERSONAS[id], cpu = PCW.pads[id].cpu, L = PCW.KEYLABEL[id];
      ctx.fillStyle = p.accent; ctx.fillRect(x + 36, yy - 14, 6, 28);
      text(p.name, x + 54, yy, 22, "#f3ecd8", "left", DISPLAY);
      text(cpu ? "CPU partner" : "YOU   move " + L.dir + "   chop " + L.strike + "   grab " + L.grab + "   do your part " + L.work + "   taunt " + L.taunt,
        x + 220, yy, 15, cpu ? "#8f93a0" : "#ffd24a", "left");
    };
    row("stove", y + 252); row("boulder", y + 292);
    text("Press 1 or 2 to hand a wrestler to the CPU or take him back.", x + 36, y + 334, 14, "#8f93a0", "left");
    const blink = Math.sin(frame / 16) > -0.3;
    if (blink) text("PRESS SPACE TO RING THE BELL", x + w / 2, y + 372, 22, "#ffd24a", "center", DISPLAY);
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
