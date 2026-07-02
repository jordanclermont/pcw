/* ============================================================
   PCW — render.js
   Free-running render layer. Reads shared state from PCW.G, never
   mutates game logic. The crowd draws itself (crowd.js); this file
   draws the ring, the performers, impact effects, and the HUD.

   NOTE: the black/white ink look of 0.02 is officially retired; the
   full "Audacity Era" dark-arena art lands with the sprite pass
   (v0.06). For now the ring keeps procedural placeholders, but the
   crowd is already dark so the new signature effect — flashbulbs —
   reads correctly.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;
  const G = PCW.G;
  const F = PCW.FRAMES, S = PCW.S;
  const { W, H } = PCW.CANVAS;
  const isoX = PCW.isoX, isoY = PCW.isoY;

  const CVS = document.getElementById("game");
  const CTX = CVS.getContext("2d");

  /* ---- dark arena backdrop (Audacity Era: black hall, hard spotlight) ---- */
  const paper = document.createElement("canvas"); paper.width = W; paper.height = H;
  (function () {
    const c = paper.getContext("2d");
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#090a0d"); g.addColorStop(0.5, "#0d0f14"); g.addColorStop(1, "#040405");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // overhead spotlight cone onto the ring
    const sp = c.createRadialGradient(W / 2, 250, 30, W / 2, 320, W * 0.6);
    sp.addColorStop(0, "rgba(150,160,185,.16)"); sp.addColorStop(0.5, "rgba(90,100,120,.06)"); sp.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = sp; c.fillRect(0, 0, W, H);
    // smoke/haze grain
    const img = c.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() * 12) | 0; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    c.putImageData(img, 0, 0);
  })();
  const stainLayer = document.createElement("canvas"); stainLayer.width = W; stainLayer.height = H;
  const stainCtx = stainLayer.getContext("2d");

  function makePattern(draw) {
    const c = document.createElement("canvas"); c.width = c.height = 8;
    draw(c.getContext("2d")); return CTX.createPattern(c, "repeat");
  }
  const hatch = makePattern(g => { g.strokeStyle = "rgba(22,19,14,.55)"; g.lineWidth = 1; g.beginPath(); g.moveTo(-2, 10); g.lineTo(10, -2); g.moveTo(-2, 6); g.lineTo(6, -2); g.stroke(); });
  const stipple = makePattern(g => { g.fillStyle = "rgba(22,19,14,.6)"; g.fillRect(1, 2, 1.4, 1.4); g.fillRect(5, 6, 1.4, 1.4); g.fillRect(6, 1, 1.2, 1.2); g.fillRect(2, 6, 1.1, 1.1); });

  function jit(seed) { const t = (G.renderFrame >> 3); const v = Math.sin(seed * 127.1 + t * 311.7) * 43758.5453; return (v - Math.floor(v) - 0.5) * 2.4; }
  function inkLine(x1, y1, x2, y2, wd, seed, col) {
    CTX.strokeStyle = col || "#16130e"; CTX.lineWidth = wd; CTX.lineCap = "round";
    CTX.beginPath();
    CTX.moveTo(x1 + jit(seed), y1 + jit(seed + 1));
    CTX.quadraticCurveTo((x1 + x2) / 2 + jit(seed + 2), (y1 + y2) / 2 + jit(seed + 3), x2 + jit(seed + 4), y2 + jit(seed + 5));
    CTX.stroke();
  }

  /* ---- impact splatters (placeholder; called from engine) ---- */
  function spawnSplatter(def) {
    const x = isoX(def.gx, def.gy), y = isoY(def.gx, def.gy) - 26, blobs = [];
    for (let i = 0; i < 22; i++) { const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 70; blobs.push({ dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.6, s: 2 + Math.random() * 11, wob: Math.random() * 7 }); }
    G.splatters.push({ x, y, color: def.accent, blobs, age: 0 });
  }
  function inkBurst(w) {
    const x = isoX(w.gx, w.gy), y = isoY(w.gx, w.gy) - 24, blobs = [];
    for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 26; blobs.push({ dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.6, s: 1.5 + Math.random() * 4, wob: 0 }); }
    G.splatters.push({ x, y, color: "#16130e", blobs, age: 0, mono: true });
  }
  function drawSplatter(sp) {
    const t = Math.min(1, sp.age / F.SPLATTER), spread = 0.35 + t * 0.65;
    CTX.save(); CTX.globalAlpha = sp.mono ? 0.8 : 0.92; CTX.fillStyle = sp.color;
    for (const b of sp.blobs) {
      const bx = sp.x + b.dx * spread, by = sp.y + b.dy * spread;
      CTX.beginPath(); CTX.ellipse(bx, by, b.s * (0.6 + t * 0.7) + b.wob * t, b.s * (0.5 + t * 0.5), 0, 0, Math.PI * 2); CTX.fill();
      if (!sp.mono && Math.random() < 0.4) CTX.fillRect(bx - 1, by, 2, 4 + 8 * t);
    }
    CTX.restore();
  }
  function stampStain(sp) {
    stainCtx.save(); stainCtx.globalAlpha = 0.16; stainCtx.fillStyle = sp.color;
    for (const b of sp.blobs) { stainCtx.beginPath(); stainCtx.ellipse(sp.x + b.dx, sp.y + b.dy * 1.05, b.s * 1.5, b.s * 1.1, 0, 0, Math.PI * 2); stainCtx.fill(); }
    stainCtx.restore();
  }
  function clearStain() { stainCtx.clearRect(0, 0, W, H); }

  /* ---- context readers (visible cues only) ---- */
  const inGrappleCtx = w => G.exchange && !G.exchange.resolved && G.exchange.defender === w && G.exchange.attacker.state === S.GRAPPLE_STARTUP;
  const winOpen = () => G.exchange && G.exchange.frame >= F.WINDOW_OPEN && G.exchange.frame <= F.WINDOW_CLOSE;

  /* ---- ring (dark arena, lit canvas, steel ropes, blood-red pads) ---- */
  const ROPE = "#c9ccd2", ROPE_RED = "#c1121f", STEEL = "#3b3f47", STEEL_HI = "#5a6069";
  function drawRing() {
    const c0 = [isoX(0, 0), isoY(0, 0)], c1 = [isoX(PCW.GRID, 0), isoY(PCW.GRID, 0)],
      c2 = [isoX(PCW.GRID, PCW.GRID), isoY(PCW.GRID, PCW.GRID)], c3 = [isoX(0, PCW.GRID), isoY(0, PCW.GRID)];

    // apron skirt (dark, with a blood-red trim + PCW)
    for (const [a, b] of [[c1, c2], [c2, c3]]) {
      CTX.fillStyle = "#111318";
      CTX.beginPath(); CTX.moveTo(a[0], a[1]); CTX.lineTo(b[0], b[1]);
      CTX.lineTo(b[0], b[1] + 36); CTX.lineTo(a[0], a[1] + 36); CTX.closePath(); CTX.fill();
      CTX.strokeStyle = ROPE_RED; CTX.lineWidth = 3;
      CTX.beginPath(); CTX.moveTo(a[0], a[1] + 34); CTX.lineTo(b[0], b[1] + 34); CTX.stroke();
    }
    CTX.save(); CTX.translate((c2[0] + c3[0]) / 2, (c2[1] + c3[1]) / 2 + 22);
    CTX.rotate(Math.atan2(c3[1] - c2[1], c3[0] - c2[0]));
    CTX.font = "bold 20px Impact"; CTX.textAlign = "center"; CTX.fillStyle = "#e7e1d3";
    CTX.fillText("P C W", 0, 0); CTX.restore();

    // the mat — a spotlit canvas so the (white) wrestlers read on it
    CTX.save();
    CTX.beginPath(); CTX.moveTo(c0[0], c0[1]); CTX.lineTo(c1[0], c1[1]);
    CTX.lineTo(c2[0], c2[1]); CTX.lineTo(c3[0], c3[1]); CTX.closePath();
    CTX.clip();
    const mid = [(c0[0] + c2[0]) / 2, (c0[1] + c2[1]) / 2];
    const mg = CTX.createRadialGradient(mid[0], mid[1], 20, mid[0], mid[1], 320);
    mg.addColorStop(0, "#9b9a93"); mg.addColorStop(0.7, "#6f6f6a"); mg.addColorStop(1, "#4a4a47");
    CTX.fillStyle = mg; CTX.fillRect(0, 0, W, H);
    CTX.drawImage(stainLayer, 0, 0);
    CTX.restore();

    // mat grid — faint dark lines read on the lit mat
    CTX.save(); CTX.globalAlpha = .28;
    for (let i = 0; i <= PCW.GRID; i++) {
      inkLine(isoX(i, 0), isoY(i, 0), isoX(i, PCW.GRID), isoY(i, PCW.GRID), i % 5 === 0 ? 1.2 : 0.5, i * 3 + 1, "#2a2a28");
      inkLine(isoX(0, i), isoY(0, i), isoX(PCW.GRID, i), isoY(PCW.GRID, i), i % 5 === 0 ? 1.2 : 0.5, i * 3 + 2, "#2a2a28");
    }
    CTX.restore();

    // ring frame (light steel, reads against the dark hall)
    inkLine(c0[0], c0[1], c1[0], c1[1], 3.4, 50, STEEL_HI); inkLine(c1[0], c1[1], c2[0], c2[1], 3.4, 51, STEEL_HI);
    inkLine(c2[0], c2[1], c3[0], c3[1], 3.4, 52, STEEL_HI); inkLine(c3[0], c3[1], c0[0], c0[1], 3.4, 53, STEEL_HI);
    const posts = [c0, c1, c2, c3], PH = 78;
    // back ropes (3 strands, top one red)
    for (const [a, b, seed] of [[c3, c0, 60], [c0, c1, 63]])
      for (let r = 1; r <= 3; r++) inkLine(a[0], a[1] - PH * r / 3.2, b[0], b[1] - PH * r / 3.2, 1.8, seed + r, r === 3 ? ROPE_RED : ROPE);
    for (const [px, py] of posts) {
      const pg = CTX.createLinearGradient(px - 4, 0, px + 4, 0);
      pg.addColorStop(0, STEEL); pg.addColorStop(0.5, STEEL_HI); pg.addColorStop(1, STEEL);
      CTX.fillStyle = pg; CTX.fillRect(px - 4, py - PH, 8, PH);
      CTX.fillStyle = ROPE_RED; CTX.beginPath(); CTX.ellipse(px, py - PH, 6.5, 4.5, 0, 0, 7); CTX.fill(); // red pad cap
    }
    return {
      frontRopes() {
        for (const [a, b, seed] of [[c1, c2, 66], [c2, c3, 69]])
          for (let r = 1; r <= 3; r++) inkLine(a[0], a[1] - PH * r / 3.2, b[0], b[1] - PH * r / 3.2, 1.8, seed + r, r === 3 ? ROPE_RED : ROPE);
      }
    };
  }

  /* how high off the mat a wrestler is drawn (turnbuckle climb) */
  function figureLift(w) {
    const sf = w.stateFrame;
    switch (w.state) {
      case S.SPX_CLIMB: return Math.min(72, sf * 2.4);
      case S.SPX_TOP: return 72;
      case S.SPX_THROW: return Math.max(0, 72 - sf * 5);
      case S.SPX_RECEIVE: return Math.min(64, sf * 2.6);
      default: return 0;
    }
  }

  /* ---- wrestlers ---- */
  function drawWrestler(w) {
    const x = isoX(w.gx, w.gy), y = isoY(w.gx, w.gy);
    const slab = w.build === "slab", s = slab ? 1.8 : 1.45, f = w.facing, sf = w.stateFrame;
    const fill = slab ? stipple : hatch;

    if (w.state === S.DOWN || w.state === S.PINNED) { drawDown(w, x, y, s, slab, fill); return; }

    let lean = 0, crouch = 0, pose = 0, lift = 0;
    switch (w.state) {
      case S.RUN: pose = 0; lean = f * 7; break;
      case S.STRIKE: pose = 1; lean = f * (sf < F.STRIKE_ACTIVE_A ? -6 : 6); break;
      case S.GRAPPLE_STARTUP: pose = 2; crouch = 4; lean = f * 3; break;
      case S.SLAM: pose = 2; crouch = 8; lean = f * 5; break;
      case S.ARM_DRAG: pose = 3; lean = -f * 10; break;
      case S.HITSTUN: lean = -f * 8; break;
      case S.SELL: pose = 4; lean = -f * (14 + Math.sin(sf * 0.5) * 6); crouch = Math.min(8, sf * 0.4); break;
      case S.GETUP: crouch = 10 - (sf / F.GETUP) * 10; break;
      case S.WHIFF: lean = f * 9; crouch = 4; break;
      case S.PINNING: pose = 2; crouch = 14; break;
      // the superplex: attacker climbs the buckle, receiver meets him up top
      case S.SPX_CLIMB: pose = 2; break;
      case S.SPX_TOP: pose = 2; break;
      case S.SPX_THROW: pose = 2; lean = f * 6; break;
      case S.SPX_WAIT: crouch = 3; break;
      case S.SPX_RECEIVE: pose = 4; break;
    }
    lift = figureLift(w);
    const bob = (w.state === S.MOVE || w.state === S.RUN) ? Math.sin(sf * 0.5) * 2 : Math.sin(G.renderFrame * 0.05 + (slab ? 2 : 0));

    CTX.save(); CTX.fillStyle = "rgba(22,19,14,.28)";
    CTX.beginPath(); CTX.ellipse(x, y, 22 * s, 9 * s, 0, 0, 7); CTX.fill(); CTX.restore();

    CTX.save();
    CTX.translate(x, y - 4 + bob + crouch * 0.6 - lift);
    CTX.rotate(lean * Math.PI / 180);
    const seed = slab ? 97 : 7;

    const tw = (slab ? 26 : 16) * s, th = (30 - crouch * 0.5) * s, taper = slab ? 7 * s : 2 * s;
    CTX.fillStyle = "#fdfcf7";
    CTX.beginPath();
    CTX.moveTo(-tw / 2 - taper, -th - 14 * s); CTX.lineTo(tw / 2 + taper, -th - 14 * s);
    CTX.lineTo(tw / 2, -14 * s); CTX.lineTo(-tw / 2, -14 * s); CTX.closePath(); CTX.fill();
    CTX.save(); CTX.clip(); CTX.fillStyle = fill;
    CTX.fillRect(-tw / 2 - taper, -th - 14 * s, (tw + taper * 2) * 0.55, th); CTX.restore();
    inkLine(-tw / 2 - taper, -th - 14 * s, tw / 2 + taper, -th - 14 * s, 3, seed + 1);
    inkLine(tw / 2 + taper, -th - 14 * s, tw / 2, -14 * s, 3, seed + 2);
    inkLine(tw / 2, -14 * s, -tw / 2, -14 * s, 3, seed + 3);
    inkLine(-tw / 2, -14 * s, -tw / 2 - taper, -th - 14 * s, 3, seed + 4);

    if (slab) { // Boulder: corporate singlet, gold straps
      CTX.strokeStyle = w.accent2; CTX.lineWidth = 2.4;
      CTX.beginPath(); CTX.moveTo(-tw / 4, -th - 13 * s); CTX.lineTo(-tw / 5, -th + 6); CTX.stroke();
      CTX.beginPath(); CTX.moveTo(tw / 4, -th - 13 * s); CTX.lineTo(tw / 5, -th + 6); CTX.stroke();
      CTX.fillStyle = w.accent; CTX.fillRect(-tw / 2, -14 * s - 6, tw, 5);   // navy band
    } else {   // Stove Hot: black vest with orange fringe
      for (let i = 0; i < 5; i++) {
        CTX.strokeStyle = w.accent; CTX.lineWidth = 1.2;
        CTX.beginPath(); CTX.moveTo(-tw / 2 + 2 + i * 3, -14 * s); CTX.lineTo(-tw / 2 + 1 + i * 3, -14 * s + 7); CTX.stroke();
        CTX.beginPath(); CTX.moveTo(tw / 2 - 2 - i * 3, -14 * s); CTX.lineTo(tw / 2 - 1 - i * 3, -14 * s + 7); CTX.stroke();
      }
    }
    CTX.fillStyle = w.accent; CTX.fillRect(-tw / 2, -16 * s, tw, 4.5); // trunks trim

    inkLine(-6 * s, -13 * s, -8 * s, -1, 5 * s, seed + 11);
    inkLine(6 * s, -13 * s, 8 * s, -1, 5 * s, seed + 12);
    CTX.fillStyle = "#16130e"; CTX.fillRect(-11 * s, -3, 7 * s, 4); CTX.fillRect(4 * s, -3, 7 * s, 4);

    const AW = slab ? 5.5 * s : 4 * s, shY = -(th + 8 * s);
    if (pose === 1) {
      const ext = sf < F.STRIKE_ACTIVE_A ? sf / F.STRIKE_ACTIVE_A : 1;
      inkLine(0, shY, f * (26 * ext) * s, shY - 4 * s, AW, seed + 13);
      inkLine(0, shY + 3, -f * 9 * s, shY + 10 * s, AW, seed + 14);
    } else if (pose === 2) {
      inkLine(0, shY, f * 18 * s, shY + (w.state === S.PINNING ? 14 : -6), AW, seed + 13);
      inkLine(0, shY + 3, f * 16 * s, shY + (w.state === S.PINNING ? 18 : 4), AW, seed + 14);
    } else if (pose === 3) {
      const sw = Math.sin(sf * 0.3) * 16;
      inkLine(0, shY, -f * (12 + sw) * s, shY - 10 * s, AW, seed + 13);
      inkLine(0, shY + 3, f * (16 - sw) * s, shY + 2, AW, seed + 14);
    } else if (pose === 4) {
      const fl = Math.sin(sf * 0.7) * 10;
      inkLine(0, shY, -f * 10 * s + fl, shY - 16 * s, AW, seed + 13);
      inkLine(0, shY + 3, f * 6 * s - fl, shY - 14 * s, AW, seed + 14);
    } else {
      inkLine(0, shY, -9 * s, shY + 12 * s, AW, seed + 13);
      inkLine(0, shY + 3, 9 * s, shY + 12 * s, AW, seed + 14);
    }

    // head
    const hy = -(th + 21 * s), hr = (slab ? 7.5 : 8.5) * s;
    CTX.fillStyle = "#fdfcf7"; CTX.strokeStyle = "#16130e"; CTX.lineWidth = 2.6;
    CTX.beginPath(); CTX.arc(0, hy, hr, 0, 7); CTX.fill(); CTX.stroke();
    if (slab) {
      // Boulder: granite flat-top + scowl, gold brow
      CTX.fillStyle = "#16130e"; CTX.fillRect(-hr - 1, hy - hr - 2, hr * 2 + 2, 4.5);
      CTX.fillStyle = w.accent2; CTX.fillRect(-hr, hy - 2, hr * 2, 1.6);
      CTX.fillStyle = "#16130e"; CTX.fillRect(-2.5, hy + 2, 5, 2);
    } else {
      // Stove Hot: bald dome, hard brow, goatee (no cowboy hat)
      CTX.fillStyle = "#16130e";
      CTX.fillRect(-hr + 1, hy - 1.5, hr * 2 - 2, 1.8);            // brow
      CTX.beginPath(); CTX.moveTo(-3.5, hy + 3.5); CTX.lineTo(3.5, hy + 3.5);
      CTX.lineTo(2.2, hy + hr + 1); CTX.lineTo(-2.2, hy + hr + 1); CTX.closePath(); CTX.fill(); // goatee
    }
    CTX.restore();

    if (inGrappleCtx(w)) drawPrompt(x, y - 110 * s / 1.45, winOpen() ? "[ Y! ]" : "[ Y? ]", winOpen() ? w.accent : null);
    if (G.sellWin && G.sellWin.defender === w) drawPrompt(x, y - 110 * s / 1.45, "SELL [Y]", w.accent);

    nameplate(w, x, y + 20);
  }
  function nameplate(w, x, y) {
    CTX.font = "10px 'Courier New'"; CTX.textAlign = "center";
    CTX.strokeStyle = "rgba(0,0,0,.75)"; CTX.lineWidth = 3;
    const s = w.short + " · " + w.state;
    CTX.strokeText(s, x, y); CTX.fillStyle = "#e7e1d3"; CTX.fillText(s, x, y);
  }

  function drawDown(w, x, y, s, slab, fill) {
    const breathe = Math.sin(G.renderFrame * 0.1) * 1;
    CTX.save(); CTX.fillStyle = "rgba(22,19,14,.28)";
    CTX.beginPath(); CTX.ellipse(x, y + 2, 30 * s, 9 * s, 0, 0, 7); CTX.fill(); CTX.restore();
    CTX.save(); CTX.translate(x, y - 6 + breathe * 0.4);
    const L = (slab ? 46 : 40) * s * 0.8, T = (slab ? 15 : 11) * s * 0.8;
    CTX.fillStyle = "#fdfcf7"; CTX.fillRect(-L / 2, -T, L, T);
    CTX.save(); CTX.beginPath(); CTX.rect(-L / 2, -T, L, T); CTX.clip();
    CTX.fillStyle = fill; CTX.fillRect(-L / 2, -T, L * 0.6, T); CTX.restore();
    inkLine(-L / 2, -T, L / 2, -T, 2.6, w.id === "p1" ? 301 : 401);
    inkLine(L / 2, -T, L / 2, 0, 2.6, 302); inkLine(L / 2, 0, -L / 2, 0, 2.6, 303); inkLine(-L / 2, 0, -L / 2, -T, 2.6, 304);
    CTX.fillStyle = w.accent; CTX.fillRect(-3, -T, 6, T);
    CTX.fillStyle = "#fdfcf7"; CTX.strokeStyle = "#16130e"; CTX.lineWidth = 2.2;
    CTX.beginPath(); CTX.arc(-L / 2 - 6 * s * 0.8, -T / 2, 6.5 * s * 0.8, 0, 7); CTX.fill(); CTX.stroke();
    inkLine(L / 2, -T * 0.6, L / 2 + 12 * s * 0.8, -T * 0.3, 4 * s * 0.8, 305);
    inkLine(L / 2, -T * 0.3, L / 2 + 11 * s * 0.8, 2, 4 * s * 0.8, 306);
    CTX.restore();
    if (G.pin && G.pin.defender === w && G.pin.finish) drawPrompt(x, y - 64, "STAY DOWN", w.accent);
    nameplate(w, x, y + 22);
  }

  function drawPrompt(x, y, text, accent) {
    CTX.save(); CTX.translate(x, y); CTX.rotate(Math.sin(G.renderFrame * 0.3) * 0.06);
    CTX.font = "bold 21px Impact"; CTX.textAlign = "center";
    CTX.strokeStyle = "rgba(0,0,0,.7)"; CTX.lineWidth = 4; CTX.strokeText(text, 0, 0);
    CTX.fillStyle = accent || "#fff"; CTX.fillText(text, 0, 0); CTX.restore();
  }

  /* ---- HUD ---- */
  function gauge(x, y, wd, ht, val, label, accent, labelColor) {
    CTX.strokeStyle = "#16130e"; CTX.lineWidth = 2.4; CTX.strokeRect(x, y, wd, ht);
    const fill = Math.max(0, wd * (val / 100) - 4);
    CTX.fillStyle = accent; CTX.fillRect(x + 2, y + 2, fill, ht - 4);
    CTX.fillStyle = hatch; CTX.fillRect(x + 2, y + 2, fill, ht - 4);
    CTX.fillStyle = labelColor || "#16130e"; CTX.font = "bold 11px Impact"; CTX.textAlign = "left";
    CTX.fillText(label, x, y - 4);
  }

  function starText(s) {
    const full = Math.floor(s), q = s - full;
    return "★".repeat(full) + (q === 0.25 ? "¼" : q === 0.5 ? "½" : q === 0.75 ? "¾" : "") + (full === 0 && q === 0 ? "DUD" : "");
  }
  PCW.starText = starText;

  function wrapText(text, x, y, maxW, lh) {
    const words = text.split(" "); let line = "", yy = y;
    for (const wd of words) {
      const test = line + wd + " ";
      if (CTX.measureText(test).width > maxW) { CTX.fillText(line, x, yy); line = wd + " "; yy += lh; }
      else line = test;
    }
    CTX.fillText(line, x, yy);
  }

  /* ---- in-world crowd signals (top layer, catchable peripherally) ----
     The player's hands are on the keyboard and eyes on the wrestlers, so
     the crowd's wants and payoffs speak through the canvas, not the log. */
  function drawCrowdSignals() {
    const crowd = G.crowd, match = G.match, rf = G.renderFrame;

    // (1) COMEBACK PRESSURE — an orange arena glow that swells around the
    // edges as heel heat banks resentment. Pure peripheral vision.
    const r = crowd.resentment / 100;
    if (r > 0.02) {
      let inten = Math.min(0.5, r * 0.5);
      if (crowd.primed) inten *= 0.8 + 0.2 * Math.sin(rf * 0.15);
      const vg = CTX.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.72);
      vg.addColorStop(0, "rgba(255,122,24,0)");
      vg.addColorStop(1, "rgba(255,122,24," + inten.toFixed(3) + ")");
      CTX.save(); CTX.fillStyle = vg; CTX.fillRect(0, 0, W, H); CTX.restore();
    }

    // (2) CROWD-BEHIND-STOVE meter, under the heat bar.
    const mx = W / 2 - 150, my = 48, mw = 300, mh = 7;
    CTX.save();
    CTX.fillStyle = "#16130e"; CTX.font = "bold 10px Impact"; CTX.textAlign = "left";
    CTX.fillText(crowd.primed ? "CROWD BEHIND STOVE — READY!" : "CROWD BEHIND STOVE", mx, my - 2);
    CTX.strokeStyle = "#16130e"; CTX.lineWidth = 2; CTX.strokeRect(mx, my, mw, mh);
    const fillW = Math.max(0, mw * (crowd.resentment / 100) - 3);
    CTX.fillStyle = crowd.primed ? (rf % 8 < 4 ? "#ffd27a" : "#ff7a18") : "#ff7a18";
    CTX.fillRect(mx + 1.5, my + 1.5, fillW, mh - 3);
    CTX.restore();

    // (3) PRIMED cue — tells the player the payoff window is open, over Stove.
    if (crowd.primed && match.phase === "MATCH") {
      const s = G.P1, x = isoX(s.gx, s.gy), y = isoY(s.gx, s.gy) - 118;
      const pulse = 0.65 + 0.35 * Math.sin(rf * 0.22);
      CTX.save(); CTX.globalAlpha = pulse; CTX.textAlign = "center";
      CTX.fillStyle = "#ffd27a"; CTX.font = "bold 18px Impact";
      CTX.strokeStyle = "rgba(0,0,0,.55)"; CTX.lineWidth = 3;
      CTX.strokeText("FIRE UP!", x, y); CTX.fillText("FIRE UP!", x, y);
      CTX.font = "bold 22px Impact";
      CTX.strokeText("▼", x, y + 16); CTX.fillText("▼", x, y + 16);
      CTX.restore();
    }

    // (4) HIJACK CHANT — the demand in plain words, the action to take, and
    // a draining timer. Plus a bouncing arrow over the wrestler to act.
    if (crowd.hijack) {
      const hj = crowd.hijack, bx = W / 2, by = 96;
      const pulse = 0.6 + 0.4 * Math.abs(Math.sin(rf * 0.12));
      CTX.save();
      CTX.fillStyle = "rgba(18,14,9,0.85)"; CTX.fillRect(bx - 235, by - 30, 470, 62);
      CTX.lineWidth = 3; CTX.strokeStyle = "rgba(255,210,120," + pulse.toFixed(2) + ")";
      CTX.strokeRect(bx - 235, by - 30, 470, 62);
      CTX.textAlign = "center";
      CTX.fillStyle = "#ffd27a"; CTX.font = "bold 23px Impact";
      CTX.fillText("♪ " + hj.label + "! ♪", bx, by - 6);
      CTX.fillStyle = "#f4efe2"; CTX.font = "12px 'Courier New'";
      CTX.fillText(hj.hint, bx, by + 11);
      const t = hj.ttl / hj.ttlMax;
      CTX.fillStyle = "rgba(255,255,255,.2)"; CTX.fillRect(bx - 215, by + 20, 430, 5);
      CTX.fillStyle = t < 0.33 ? "#ff5a5a" : "#ffd27a"; CTX.fillRect(bx - 215, by + 20, 430 * t, 5);
      CTX.restore();
      if (hj.target) {
        const w = hj.target === "p1" ? G.P1 : G.P2;
        const x = isoX(w.gx, w.gy), y = isoY(w.gx, w.gy) - 116 + Math.sin(rf * 0.2) * 4;
        CTX.save(); CTX.textAlign = "center"; CTX.font = "bold 26px Impact";
        CTX.strokeStyle = "rgba(0,0,0,.5)"; CTX.lineWidth = 3;
        CTX.fillStyle = "#ffd27a";
        CTX.strokeText("▼", x, y); CTX.fillText("▼", x, y);
        CTX.restore();
      }
    }

    // (5) FLOATERS — reaction popups leaping off the wrestler who acted.
    for (const fl of crowd.floaters) {
      const a = 1 - fl.age / fl.life;
      CTX.save(); CTX.globalAlpha = Math.max(0, a); CTX.textAlign = "center";
      CTX.font = "bold " + fl.size + "px Impact";
      CTX.strokeStyle = "rgba(0,0,0,.6)"; CTX.lineWidth = 3.5;
      CTX.strokeText(fl.text, fl.x, fl.y);
      CTX.fillStyle = fl.color; CTX.fillText(fl.text, fl.x, fl.y);
      CTX.restore();
    }

    // (6) STROBE — a near-fall at high heat whites out the whole arena.
    if (crowd.strobe > 0) {
      CTX.save();
      CTX.globalAlpha = 0.22 * (crowd.strobe / 12) + (crowd.strobe % 2 ? 0.14 : 0);
      CTX.fillStyle = "#fff"; CTX.fillRect(0, 0, W, H);
      CTX.restore();
    }

    // (7) TRUST WARNING — the private stakes. A frame-edge glow warns, in
    // the corner of the eye, that the relationship is heading for breakdown
    // (trust 0 = the match falls apart). Amber = slipping, red = danger.
    if (match.phase === "MATCH" && match.trust < 40) {
      const danger = match.trust < 20;
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(rf * (danger ? 0.24 : 0.13)));
      CTX.save();
      CTX.globalAlpha = pulse;
      CTX.strokeStyle = danger ? "#ff2b2b" : "#e0902b";
      CTX.lineWidth = danger ? 7 : 4;
      CTX.strokeRect(CTX.lineWidth / 2, CTX.lineWidth / 2, W - CTX.lineWidth, H - CTX.lineWidth);
      CTX.restore();
    }

    // trust-change sting beside the trust bar (green up, red down).
    if (match.trustFlash) {
      const tf = match.trustFlash, a = Math.min(1, tf.t / 55);
      CTX.save(); CTX.globalAlpha = a; CTX.textAlign = "left";
      CTX.font = "bold 15px Impact";
      CTX.fillStyle = tf.delta < 0 ? "#ff4d4d" : "#5fd07a";
      const rise = (55 - tf.t) * 0.35;
      CTX.strokeStyle = "rgba(0,0,0,.5)"; CTX.lineWidth = 3;
      const txt = (tf.delta > 0 ? "+" : "") + tf.delta + " TRUST";
      CTX.strokeText(txt, W / 2 + 86, 73 - rise);
      CTX.fillText(txt, W / 2 + 86, 73 - rise);
      CTX.restore();
    }
  }

  const LT = "#d8dbe0";                          // light HUD text on dark
  const barCol = w => w.id === "p1" ? "#ff7a18" : "#6f86d6";  // lightened brand bars

  /* each wrestler's current instruction, anchored to their own sprite in
     their own colour — so you read your cue where you're already looking,
     not in a shared strip at the bottom of the screen. */
  function drawCueLabels() {
    for (const w of [G.P1, G.P2]) {
      const t = PCW.cueText && PCW.cueText(w);
      if (!t) continue;
      const x = isoX(w.gx, w.gy), y = isoY(w.gx, w.gy) - 46 - figureLift(w);
      const pulse = 0.75 + 0.25 * Math.sin(G.renderFrame * 0.18 + (w.id === "p1" ? 0 : 2));
      CTX.save(); CTX.globalAlpha = pulse; CTX.textAlign = "center";
      CTX.font = "bold 13px Impact";
      CTX.strokeStyle = "rgba(0,0,0,.8)"; CTX.lineWidth = 3.5;
      CTX.strokeText(t, x, y); CTX.fillStyle = barCol(w); CTX.fillText(t, x, y);
      // a little tick pointing down at the wrestler
      CTX.fillText("▾", x, y + 11);
      CTX.restore();
    }
  }

  /* when a corner spot is called but the man isn't in a corner yet, mark
     the four corners so the players know where to take him. */
  function drawCornerHints() {
    const m = G.match, sp = m && m.script[m.spot];
    if (!m || m.phase !== "MATCH" || !sp || !sp.corner || G.superplex) return;
    const def = sp.bump === "STOVE" ? G.P1 : G.P2;
    if (PCW.cornerIndexAt(def.gx, def.gy) >= 0) return;   // already there
    const pulse = 0.4 + 0.35 * Math.abs(Math.sin(G.renderFrame * 0.12));
    CTX.save();
    for (const c of PCW.CORNERS) {
      const x = isoX(c.gx, c.gy), y = isoY(c.gx, c.gy);
      CTX.globalAlpha = pulse; CTX.strokeStyle = barCol(def); CTX.lineWidth = 2.5;
      CTX.beginPath(); CTX.ellipse(x, y, 26, 13, 0, 0, 7); CTX.stroke();
      CTX.globalAlpha = pulse * 0.5; CTX.fillStyle = barCol(def);
      CTX.beginPath(); CTX.ellipse(x, y, 26, 13, 0, 0, 7); CTX.fill();
    }
    CTX.restore();
  }

  function drawHUD() {
    const match = G.match, crowd = G.crowd, sp = match.script[match.spot] || null;
    CTX.save();
    CTX.fillStyle = "rgba(10,12,16,.92)"; CTX.fillRect(0, H - 58, W, 58);
    CTX.fillStyle = "#c1121f"; CTX.fillRect(0, H - 58, W, 2);
    CTX.textAlign = "center";
    if (match.phase === "MATCH" && sp) {
      CTX.fillStyle = "#fff"; CTX.font = "bold 15px Impact";
      CTX.fillText("SPOT " + (match.spot + 1) + "/" + match.script.length + " — " + sp.name, W / 2, H - 38);
      // per-wrestler instructions now live on the sprites (drawCueLabels);
      // the banner keeps the director's note for context.
      CTX.fillStyle = LT; CTX.font = "italic 12px 'Courier New'";
      CTX.fillText("“" + sp.promo + "”", W / 2, H - 20);
    } else if (match.phase === "MATCH") {
      CTX.fillStyle = "#fff"; CTX.font = "bold 13px Impact"; CTX.fillText("SHEET COMPLETE — GO HOME", W / 2, H - 30);
    }
    CTX.restore();

    gauge(W / 2 - 150, 26, 300, 16, crowd.heat, "CROWD HEAT", "#e8562a", LT);
    const tr = match.trust;
    const trustAccent = tr < 20 ? "#e0454f" : tr < 40 ? "#e0902b" : "#c9a24a";
    const trustLabel = tr < 20 ? "⚠ TRUST BREAKING DOWN" : tr < 40 ? "⚠ TRUST SLIPPING" : "TRUST (backstage)";
    const trustLabelCol = tr < 20 ? "#e0454f" : tr < 40 ? "#e0902b" : LT;
    gauge(W / 2 - 80, 64, 160, 9, tr, trustLabel, trustAccent, trustLabelCol);
    gauge(24, H - 100, 180, 10, G.P1.body, G.P1.short + " — BODY", barCol(G.P1), LT);
    gauge(W - 204, H - 100, 180, 10, G.P2.body, G.P2.short + " — BODY", barCol(G.P2), LT);
    gauge(24, H - 78, 180, 7, PCW.G.respect.p1, "RESPECT", "#c9a24a", LT);
    gauge(W - 204, H - 78, 180, 7, PCW.G.respect.p2, "RESPECT", "#c9a24a", LT);

    if (G.exchange && !G.exchange.resolved) {
      const a = G.exchange.attacker, x = isoX(a.gx, a.gy) - 38, y = isoY(a.gx, a.gy) + 34;
      for (let i = 1; i <= F.GRAPPLE_STARTUP; i++) {
        const inWin = i >= F.WINDOW_OPEN && i <= F.WINDOW_CLOSE, px = x + (i - 1) * 6.4;
        CTX.strokeStyle = "#cfd3da"; CTX.lineWidth = 1; CTX.strokeRect(px, y, 5, 10);
        if (i <= G.exchange.frame) { CTX.fillStyle = inWin ? "#ffd27a" : "#cfd3da"; CTX.fillRect(px + .5, y + .5, 4, 9); }
        else if (inWin) { CTX.fillStyle = "rgba(255,210,122,.25)"; CTX.fillRect(px + .5, y + .5, 4, 9); }
      }
    }
    if (G.pin) {
      CTX.save(); CTX.translate(W / 2, H / 2 - 40); CTX.rotate(-0.03);
      CTX.font = "bold 64px Impact"; CTX.textAlign = "center";
      CTX.strokeStyle = "rgba(0,0,0,.7)"; CTX.lineWidth = 5;
      const s = G.pin.count === 0 ? "..." : String(G.pin.count) + "!";
      CTX.strokeText(s, 0, 0); CTX.fillStyle = "#fff"; CTX.fillText(s, 0, 0); CTX.restore();
    }
    if (crowd.stamp) {
      CTX.save(); CTX.translate(W / 2 + ((crowd.stamp.t * 13) % 60) - 30, 120);
      CTX.rotate(crowd.stamp.big ? -0.08 : 0.05);
      CTX.font = "bold " + (crowd.stamp.big ? 34 : 20) + "px Impact"; CTX.textAlign = "center";
      CTX.globalAlpha = Math.min(1, crowd.stamp.t / 12);
      CTX.strokeStyle = "rgba(0,0,0,.6)"; CTX.lineWidth = 4;
      CTX.strokeText(crowd.stamp.text, 0, 0);
      CTX.fillStyle = crowd.stamp.text === "BOO" ? "#ff5a5a" : "#ffd27a";
      CTX.fillText(crowd.stamp.text, 0, 0); CTX.restore();
    }
    if (G.slowmo) {
      CTX.save(); CTX.translate(W / 2, 100); CTX.rotate(-0.04);
      CTX.font = "bold 15px Impact"; CTX.textAlign = "center"; CTX.fillStyle = LT;
      CTX.fillText("◼ SLOW-MO ◼", 0, 0); CTX.restore();
    }

    drawCueLabels();
    drawCrowdSignals();

    if (match.phase === "ENDED" && match.endInfo) {
      const e = match.endInfo;
      CTX.save(); CTX.fillStyle = "rgba(236,231,217,.94)"; CTX.fillRect(W / 2 - 280, H / 2 - 120, 560, 220);
      CTX.strokeStyle = "#16130e"; CTX.lineWidth = 3; CTX.strokeRect(W / 2 - 280, H / 2 - 120, 560, 220);
      CTX.strokeRect(W / 2 - 274, H / 2 - 114, 548, 208);
      CTX.textAlign = "center"; CTX.fillStyle = "#16130e";
      CTX.font = "bold 20px Impact"; CTX.fillText("THE PCW OBSERVER — MATCH RATING", W / 2, H / 2 - 84);
      CTX.font = "bold 52px Impact"; CTX.fillText(starText(e.stars), W / 2, H / 2 - 24);
      CTX.font = "12px 'Courier New'";
      CTX.fillText("finish: " + e.type + "  ·  avg heat " + e.avg + "  ·  botches " + match.botches + "  ·  shoots " + match.shoots, W / 2, H / 2 + 8);
      CTX.font = "13px 'Courier New'";
      wrapText(e.blurb, W / 2, H / 2 + 36, 500, 18);
      CTX.font = "bold 13px Impact"; CTX.fillText("PRESS R TO RUN IT BACK", W / 2, H / 2 + 78);
      CTX.restore();
    }
  }

  /* ---- top-level frame ---- */
  function frame() {
    G.renderFrame++;
    CTX.setTransform(PCW.DPR, 0, 0, PCW.DPR, 0, 0);   // crisp on hi-dpi
    CTX.save();
    if (G.shake > 0.5) CTX.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
    CTX.drawImage(paper, 0, 0);
    G.crowd.draw(CTX, G.renderFrame);
    const ring = drawRing();
    drawCornerHints();
    const order = [G.P1, G.P2].sort((a, b) => isoY(a.gx, a.gy) - isoY(b.gx, b.gy));
    for (const w of order) drawWrestler(w);
    for (const sp of G.splatters) drawSplatter(sp);
    ring.frontRopes();
    CTX.restore();
    drawHUD();
  }

  PCW.render = { frame, spawnSplatter, inkBurst, stampStain, clearStain };
})();
