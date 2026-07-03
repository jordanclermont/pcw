/* ============================================================
   PCW — render.js  (v0.06: jointed skeletons)
   Free-running render layer. Reads shared state from PCW.G, never
   mutates game logic. The crowd draws itself (crowd.js); this file
   draws the dark-arena ring, the performers as JOINTED PROCEDURAL
   SKELETONS (ported from the movement prototype — real run cycles,
   wind-ups, sells and bumps), the impact effects, and the HUD.

   The skeleton is the v0.06 motion language and the target the sprite
   pass (v0.06/asset) will eventually match, pose for pose.
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
    const sp = c.createRadialGradient(W / 2, 250, 30, W / 2, 320, W * 0.6);
    sp.addColorStop(0, "rgba(150,160,185,.16)"); sp.addColorStop(0.5, "rgba(90,100,120,.06)"); sp.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = sp; c.fillRect(0, 0, W, H);
    const img = c.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() * 12) | 0; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    c.putImageData(img, 0, 0);
  })();
  const stainLayer = document.createElement("canvas"); stainLayer.width = W; stainLayer.height = H;
  const stainCtx = stainLayer.getContext("2d");

  /* ---- impact splatters (subtle sparks; called from engine) ---- */
  function spawnSplatter(def) {
    const x = isoX(def.gx, def.gy), y = isoY(def.gx, def.gy) - 26, blobs = [];
    for (let i = 0; i < 16; i++) { const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 54; blobs.push({ dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.6, s: 2 + Math.random() * 8, wob: Math.random() * 6 }); }
    G.splatters.push({ x, y, color: def.accent2 || def.accent, blobs, age: 0 });
  }
  function inkBurst(w) {
    const x = isoX(w.gx, w.gy), y = isoY(w.gx, w.gy) - 24, blobs = [];
    for (let i = 0; i < 8; i++) { const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 22; blobs.push({ dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.6, s: 1.4 + Math.random() * 3.4, wob: 0 }); }
    G.splatters.push({ x, y, color: "#f4efe2", blobs, age: 0, mono: true });
  }
  function drawSplatter(sp) {
    const t = Math.min(1, sp.age / F.SPLATTER), spread = 0.35 + t * 0.65;
    CTX.save(); CTX.globalCompositeOperation = "lighter"; CTX.globalAlpha = (sp.mono ? 0.6 : 0.5) * (1 - t * 0.5);
    CTX.fillStyle = sp.color;
    for (const b of sp.blobs) {
      const bx = sp.x + b.dx * spread, by = sp.y + b.dy * spread;
      CTX.beginPath(); CTX.ellipse(bx, by, b.s * (0.6 + t * 0.7) + b.wob * t, b.s * (0.5 + t * 0.5), 0, 0, Math.PI * 2); CTX.fill();
    }
    CTX.restore();
  }
  function stampStain(sp) {
    stainCtx.save(); stainCtx.globalAlpha = 0.10; stainCtx.fillStyle = sp.mono ? "#000" : sp.color;
    for (const b of sp.blobs) { stainCtx.beginPath(); stainCtx.ellipse(sp.x + b.dx, sp.y + b.dy * 1.05, b.s * 1.4, b.s, 0, 0, Math.PI * 2); stainCtx.fill(); }
    stainCtx.restore();
  }
  function clearStain() { stainCtx.clearRect(0, 0, W, H); }

  /* ---- the ring (dark arena, lit canvas, steel ropes, blood-red pads) ---- */
  const ROPE = "#c9ccd2", ROPE_RED = "#c1121f", STEEL = "#3b3f47", STEEL_HI = "#5a6069";
  function ropeGive(side) {
    const rs = G.ropeShake;
    return (rs && rs.t > 0 && rs.side === side) ? Math.sin(rs.t * 0.9) * rs.t * 0.5 : 0;
  }
  function drawRopes(a, b, PH, side) {
    const give = ropeGive(side);
    for (let r = 1; r <= 3; r++) {
      const yo = PH * r / 3.2, col = r === 3 ? ROPE_RED : ROPE;
      CTX.strokeStyle = col; CTX.lineWidth = r === 3 ? 2.2 : 1.8; CTX.lineCap = "round";
      CTX.beginPath();
      CTX.moveTo(a[0], a[1] - yo);
      CTX.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - yo + give, b[0], b[1] - yo);
      CTX.stroke();
    }
  }
  function drawRing() {
    const G0 = PCW.GRID;
    const c0 = [isoX(0, 0), isoY(0, 0)], c1 = [isoX(G0, 0), isoY(G0, 0)],
      c2 = [isoX(G0, G0), isoY(G0, G0)], c3 = [isoX(0, G0), isoY(0, G0)];
    // apron skirt
    for (const [a, b] of [[c1, c2], [c2, c3]]) {
      CTX.fillStyle = "#111318";
      CTX.beginPath(); CTX.moveTo(a[0], a[1]); CTX.lineTo(b[0], b[1]);
      CTX.lineTo(b[0], b[1] + 38); CTX.lineTo(a[0], a[1] + 38); CTX.closePath(); CTX.fill();
      CTX.strokeStyle = ROPE_RED; CTX.lineWidth = 3;
      CTX.beginPath(); CTX.moveTo(a[0], a[1] + 36); CTX.lineTo(b[0], b[1] + 36); CTX.stroke();
    }
    CTX.save(); CTX.translate((c2[0] + c3[0]) / 2, (c2[1] + c3[1]) / 2 + 24);
    CTX.rotate(Math.atan2(c3[1] - c2[1], c3[0] - c2[0]));
    CTX.font = "bold 22px Impact"; CTX.textAlign = "center"; CTX.fillStyle = "#e7e1d3";
    CTX.fillText("P C W", 0, 0); CTX.restore();
    // mat (spotlit)
    CTX.save();
    CTX.beginPath(); CTX.moveTo(c0[0], c0[1]); CTX.lineTo(c1[0], c1[1]);
    CTX.lineTo(c2[0], c2[1]); CTX.lineTo(c3[0], c3[1]); CTX.closePath(); CTX.clip();
    const mid = [(c0[0] + c2[0]) / 2, (c0[1] + c2[1]) / 2];
    const mg = CTX.createRadialGradient(mid[0], mid[1], 20, mid[0], mid[1], 380);
    mg.addColorStop(0, "#9b9a93"); mg.addColorStop(0.7, "#6f6f6a"); mg.addColorStop(1, "#4a4a47");
    CTX.fillStyle = mg; CTX.fillRect(0, 0, W, H);
    CTX.drawImage(stainLayer, 0, 0);
    CTX.restore();
    // frame
    CTX.strokeStyle = STEEL_HI; CTX.lineWidth = 3.4;
    CTX.beginPath(); CTX.moveTo(c0[0], c0[1]); CTX.lineTo(c1[0], c1[1]);
    CTX.lineTo(c2[0], c2[1]); CTX.lineTo(c3[0], c3[1]); CTX.closePath(); CTX.stroke();
    const posts = [c0, c1, c2, c3], PH = 84;
    drawRopes(c3, c0, PH, 0); drawRopes(c0, c1, PH, 3);
    for (const [px, py] of posts) {
      const pg = CTX.createLinearGradient(px - 4, 0, px + 4, 0);
      pg.addColorStop(0, STEEL); pg.addColorStop(0.5, STEEL_HI); pg.addColorStop(1, STEEL);
      CTX.fillStyle = pg; CTX.fillRect(px - 4, py - PH, 8, PH);
      CTX.fillStyle = ROPE_RED; CTX.beginPath(); CTX.ellipse(px, py - PH, 6.5, 4.5, 0, 0, 7); CTX.fill();
    }
    return { frontRopes() { drawRopes(c1, c2, PH, 1); drawRopes(c2, c3, PH, 2); } };
  }

  /* how high off the mat a wrestler is drawn (turnbuckle climb) */
  function figureLift(w) {
    const sf = w.stateFrame;
    switch (w.state) {
      case S.SPX_CLIMB: return Math.min(72, sf * 2.4);
      case S.SPX_TOP: return 72;
      case S.SPX_THROW: return Math.max(0, 72 - sf * 5);
      case S.SPX_RECEIVE: return Math.min(64, sf * 2.6);
      case S.BUMP: return Math.sin(Math.min(Math.PI, sf * 0.18)) * 18;
      case S.LIFTED: return 22 + Math.min(F.SLAM_LIFT, sf) * 0.7;   // scooped up off the mat
      default: return 0;
    }
  }

  /* ============================================================
     JOINTED SKELETON — pelvis / torso / head, two-segment arms & legs,
     posed per state. Ported from the movement prototype, extended to
     the full PCW state set and the two personas' brand colours.
     ============================================================ */
  function seg(a, b, wd, col) { CTX.lineCap = "round"; CTX.strokeStyle = col; CTX.lineWidth = wd; CTX.beginPath(); CTX.moveTo(a.x, a.y); CTX.lineTo(b.x, b.y); CTX.stroke(); }
  function limb(a, b, c, wd, col) { CTX.lineCap = "round"; CTX.lineJoin = "round"; CTX.strokeStyle = col; CTX.lineWidth = wd; CTX.beginPath(); CTX.moveTo(a.x, a.y); CTX.lineTo(b.x, b.y); CTX.lineTo(c.x, c.y); CTX.stroke(); }

  function drawWrestler(w) {
    const x = isoX(w.gx, w.gy), y = isoY(w.gx, w.gy);
    const slab = w.build === "slab", sc = slab ? 1.5 : 1.3, f = w.facing;   // v0.09: read bigger
    const sk = "#e7e1d3", dark = "#12141a", rf = G.renderFrame;
    const acc = w.accent2 && w.build === "slab" ? w.accent2 : w.accent;

    // shadow
    CTX.save(); CTX.fillStyle = "rgba(0,0,0,.34)"; CTX.beginPath(); CTX.ellipse(x, y, 24 * sc, 9 * sc, 0, 0, 7); CTX.fill(); CTX.restore();

    const U = 13 * sc;                       // unit scale
    let pelvisY = -2.6 * U, chestY = pelvisY - 1.9 * U, headY = chestY - 1.15 * U;
    let lean = 0, lift = figureLift(w), prone = false;
    let footLx = -.5 * U, footRx = .5 * U, footLy = 0, footRy = 0;
    const gaitOn = (w.state === S.RUN || w.state === S.WALK || w.state === S.WHIPPED || w.state === S.REBOUND);
    if (gaitOn) {
      const spd = (w.state === S.WHIPPED || w.state === S.REBOUND) ? 1.5 : (w.state === S.RUN ? 1.15 : 0.7);
      const p = w.gait;
      lean = f * (2.2 + spd * 2.2);
      footLx = f * Math.sin(p) * 1.3 * U; footRx = f * Math.sin(p + Math.PI) * 1.3 * U;
      footLy = -Math.max(0, Math.cos(p)) * .55 * U; footRy = -Math.max(0, Math.cos(p + Math.PI)) * .55 * U;
      pelvisY = -2.6 * U - Math.abs(Math.sin(p)) * .18 * U;
    }
    const shL = { x: -.55 * U, y: chestY }, shR = { x: .55 * U, y: chestY };
    function arm(sh, ang, bend, len) {
      const e = { x: sh.x + Math.sin(ang) * len * .55, y: sh.y + Math.cos(ang) * len * .55 };
      const h = { x: e.x + Math.sin(ang + bend) * len * .5, y: e.y + Math.cos(ang + bend) * len * .5 };
      return { e, h };
    }
    let LA = arm(shL, f * 0.25, -f * 0.5, 2.0 * U), RA = arm(shR, -f * 0.25, f * 0.5, 2.0 * U);

    switch (w.state) {
      case S.RUN: case S.WALK: case S.WHIPPED: case S.REBOUND: {
        const p = w.gait;
        LA = arm(shL, -f * Math.sin(p) * 1.1, -f * 0.6, 2.0 * U);
        RA = arm(shR, -f * Math.sin(p + Math.PI) * 1.1, f * 0.6, 2.0 * U);
        break;
      }
      case S.STRIKE: {
        const e = Math.min(1, w.stateFrame / 5), r = w.stateFrame < 5 ? -0.6 : 1.5;
        lean = f * (w.stateFrame < 5 ? -5 : 8);
        LA = arm(shL, f * (r * e), -f * 0.3, 2.1 * U);
        break;
      }
      case S.CLOTHESLINE: {
        lean = f * 7; LA = arm(shL, f * 1.55, 0, 2.3 * U); RA = arm(shR, f * 1.4, 0, 2.1 * U);
        footLx = f * 1.1 * U; footRx = -f * .6 * U;
        break;
      }
      case S.SLAM: {
        lean = f * 9; pelvisY = -2.3 * U;
        LA = arm(shL, f * 1.2, f * 0.4, 2.0 * U); RA = arm(shR, f * 1.0, -f * 0.3, 2.0 * U);
        break;
      }
      case S.WHIP: case S.ARM_DRAG: {
        const sw = Math.sin(w.stateFrame * 0.3) * 1.2; lean = -f * 6;
        LA = arm(shL, f * (1.4 - sw), 0, 2.2 * U); RA = arm(shR, f * (1.0 - sw), 0, 2.0 * U);
        break;
      }
      case S.TIEUP_A: case S.TIEUP_B: {
        lean = f * 4 + Math.sin(rf * 0.4 + (w.id === "p1" ? 0 : 1)) * 0.6;
        LA = arm(shL, f * 1.15, 0.1, 1.9 * U); RA = arm(shR, f * 0.95, -0.1, 1.9 * U);
        break;
      }
      case S.SELL: case S.HITSTUN: {
        lean = -f * (12 + Math.sin(w.stateFrame * 0.6) * 5); headY -= 2;
        LA = arm(shL, -f * 0.9, -0.4, 2.0 * U); RA = arm(shR, -f * 0.6, 0.4, 2.0 * U);
        break;
      }
      case S.CORNER: {
        lean = -f * 10; pelvisY = -2.3 * U; footLx = -.7 * U; footRx = .7 * U;
        LA = arm(shL, -f * 1.3, 0, 2.0 * U); RA = arm(shR, -f * 1.3, 0, 2.0 * U);
        break;
      }
      case S.TAUNT: {
        lean = 0; headY -= 1;
        LA = arm(shL, -f * 1.5, 0.1, 2.1 * U); RA = arm(shR, f * 1.5, -0.1, 2.1 * U);   // arms flung wide
        break;
      }
      case S.WHIFF: { lean = f * 9; LA = arm(shL, -f * 0.6, -0.5, 2.0 * U); break; }
      case S.PINNING: {
        lean = f * 34; pelvisY = -1.5 * U;
        LA = arm(shL, f * 1.4, 0, 1.8 * U); RA = arm(shR, f * 1.2, 0, 1.8 * U);
        break;
      }
      case S.BUMP: {
        const spin = (w.bumpSpin || 1); lean = spin * Math.min(80, w.stateFrame * 6);
        break;
      }
      case S.DOWN: case S.PINNED: prone = true; break;
      case S.LIFTED: prone = true; break;   // held horizontal, raised by figureLift
      case S.GETUP: pelvisY = -1.3 * U - (w.stateFrame / F.GETUP) * 1.3 * U; lean = -f * 6; break;
      case S.SPX_CLIMB: lean = 0; LA = arm(shL, 0, 0, 2.0 * U); RA = arm(shR, 0, 0, 2.0 * U); footLy = footRy = 0; break;
      case S.SPX_TOP: pelvisY = -2.1 * U; break;
      case S.SPX_THROW: lean = f * 10; break;
      case S.SPX_WAIT: lean = 0; break;
      case S.SPX_RECEIVE: break;
    }

    CTX.save(); CTX.translate(x, y - lift);
    if (prone) { drawProne(w, sc, sk, dark, acc); CTX.restore(); nameplate(w, x, y + 18); return; }
    CTX.rotate(lean * Math.PI / 180 * (w.state === S.BUMP ? 1 : 0.4));

    const pelvis = { x: 0, y: pelvisY }, chest = { x: f * lean * 0.05, y: chestY }, head = { x: chest.x + f * 1, y: headY };
    const hipL = { x: pelvis.x - .42 * U, y: pelvis.y }, hipR = { x: pelvis.x + .42 * U, y: pelvis.y };
    const footL = { x: footLx, y: footLy }, footR = { x: footRx, y: footRy };
    const kneeL = { x: (hipL.x + footL.x) / 2 + f * .25 * U, y: (hipL.y + footL.y) / 2 };
    const kneeR = { x: (hipR.x + footR.x) / 2 + f * .25 * U, y: (hipR.y + footR.y) / 2 };

    seg(hipR, kneeR, 5.4 * sc, dark); seg(kneeR, footR, 4.6 * sc, dark);   // back leg
    limb(shR, RA.e, RA.h, 4.4 * sc, sk);                                  // back arm
    seg(pelvis, chest, 9 * sc, sk);                                        // torso
    CTX.strokeStyle = acc; CTX.lineWidth = 3.4 * sc;                       // trunks band
    CTX.beginPath(); CTX.moveTo(pelvis.x - 3, pelvis.y + 2); CTX.lineTo(pelvis.x + 3, pelvis.y + 2); CTX.stroke();
    seg(hipL, kneeL, 5.6 * sc, sk); seg(kneeL, footL, 4.8 * sc, sk);       // front leg
    CTX.fillStyle = dark;                                                  // boots
    CTX.beginPath(); CTX.ellipse(footL.x + f * 2, footL.y, 4 * sc, 2.4 * sc, 0, 0, 7); CTX.fill();
    CTX.beginPath(); CTX.ellipse(footR.x + f * 2, footR.y, 4 * sc, 2.4 * sc, 0, 0, 7); CTX.fill();
    limb(shL, LA.e, LA.h, 4.6 * sc, sk);                                  // front arm
    // head
    CTX.fillStyle = sk; CTX.strokeStyle = dark; CTX.lineWidth = 1.5;
    CTX.beginPath(); CTX.arc(head.x, head.y, 4.6 * sc, 0, 7); CTX.fill(); CTX.stroke();
    CTX.fillStyle = acc; CTX.beginPath(); CTX.arc(head.x, head.y - 1, 4.6 * sc, Math.PI * 1.05, Math.PI * 1.95); CTX.fill();
    if (w.head !== "bald") { // Boulder flat-top
      CTX.fillStyle = dark; CTX.fillRect(head.x - 4.6 * sc, head.y - 5.6 * sc, 9.2 * sc, 2.4 * sc);
    } else { // Stove goatee
      CTX.fillStyle = dark; CTX.beginPath();
      CTX.moveTo(head.x - 2, head.y + 3.4 * sc); CTX.lineTo(head.x + 2, head.y + 3.4 * sc);
      CTX.lineTo(head.x + 1.3, head.y + 5.4 * sc); CTX.lineTo(head.x - 1.3, head.y + 5.4 * sc); CTX.closePath(); CTX.fill();
    }
    CTX.restore();

    nameplate(w, x, y + 18);
  }

  function drawProne(w, sc, sk, dark, acc) {
    const L = 30 * sc, T = 8 * sc, f = w.facing;
    CTX.strokeStyle = sk; CTX.lineCap = "round"; CTX.lineWidth = 9 * sc;
    CTX.beginPath(); CTX.moveTo(-L / 2, -T); CTX.lineTo(L / 2, -T); CTX.stroke();
    CTX.strokeStyle = dark; CTX.lineWidth = 4.5 * sc;
    CTX.beginPath(); CTX.moveTo(L / 2, -T); CTX.lineTo(L / 2 + 8 * sc, -T + 3); CTX.stroke();
    CTX.fillStyle = sk; CTX.strokeStyle = dark; CTX.lineWidth = 1.5;
    CTX.beginPath(); CTX.arc(-L / 2 - 4 * sc, -T, 4.6 * sc, 0, 7); CTX.fill(); CTX.stroke();
    CTX.strokeStyle = acc; CTX.lineWidth = 3 * sc; CTX.beginPath(); CTX.moveTo(-4, -T - 1); CTX.lineTo(4, -T - 1); CTX.stroke();
  }

  function nameplate(w, x, y) {
    CTX.font = "bold 10px Impact"; CTX.textAlign = "center";
    CTX.strokeStyle = "rgba(0,0,0,.75)"; CTX.lineWidth = 3;
    CTX.strokeText(w.short, x, y + 6); CTX.fillStyle = barCol(w); CTX.fillText(w.short, x, y + 6);
  }

  function drawPrompt(x, y, text, accent) {
    CTX.save(); CTX.translate(x, y); CTX.rotate(Math.sin(G.renderFrame * 0.3) * 0.06);
    CTX.font = "bold 21px Impact"; CTX.textAlign = "center";
    CTX.strokeStyle = "rgba(0,0,0,.7)"; CTX.lineWidth = 4; CTX.strokeText(text, 0, 0);
    CTX.fillStyle = accent || "#fff"; CTX.fillText(text, 0, 0); CTX.restore();
  }

  /* ---- HUD ---- */
  /* the top public meters (heat / resentment / trust) in ONE dark panel with
     clear rows, so they never overlap each other or smear over the crowd. */
  function meterRow(lx, bx, y, bw, label, val, fill, labelCol) {
    const h = 12;
    CTX.font = "bold 11px Impact"; CTX.textAlign = "left"; CTX.textBaseline = "middle";
    CTX.fillStyle = labelCol || "#d8dbe0"; CTX.fillText(label, lx, y + h / 2);
    CTX.fillStyle = "rgba(0,0,0,.55)"; CTX.fillRect(bx, y, bw, h);
    CTX.strokeStyle = "#0b0c0f"; CTX.lineWidth = 1.5; CTX.strokeRect(bx, y, bw, h);
    CTX.fillStyle = fill; CTX.fillRect(bx + 1.5, y + 1.5, Math.max(0, (bw - 3) * val / 100), h - 3);
    CTX.textBaseline = "alphabetic";
  }
  function drawMeters() {
    const crowd = G.crowd, match = G.match, rf = G.renderFrame;
    const pw = 320, ph = 76, px = W / 2 - pw / 2, py = 12;
    CTX.fillStyle = "rgba(8,10,14,.86)"; CTX.fillRect(px, py, pw, ph);
    CTX.strokeStyle = "#c1121f"; CTX.lineWidth = 2; CTX.strokeRect(px, py, pw, ph);
    const lx = px + 12, bx = px + 104, bw = pw - 104 - 14;
    meterRow(lx, bx, py + 10, bw, "CROWD HEAT", crowd.heat, "#e8562a", "#fff");
    const primed = crowd.primed;
    meterRow(lx, bx, py + 32, bw, primed ? "BEHIND STOVE ▲" : "BEHIND STOVE", crowd.resentment,
      primed ? (rf % 8 < 4 ? "#ffd27a" : "#ff7a18") : "#ff7a18", primed ? "#ffd27a" : LT);
    const tr = match.trust, danger = tr < 20, warn = tr < 40;
    meterRow(lx, bx, py + 54, bw, danger ? "TRUST ⚠" : warn ? "TRUST ⚠" : "TRUST", tr,
      danger ? "#e0454f" : warn ? "#e0902b" : "#c9a24a", danger ? "#ff6b6b" : warn ? "#e0902b" : LT);
  }

  function gauge(x, y, wd, ht, val, label, accent, labelColor) {
    CTX.strokeStyle = "#0b0c0f"; CTX.lineWidth = 2.4; CTX.strokeRect(x, y, wd, ht);
    const fill = Math.max(0, wd * (val / 100) - 4);
    CTX.fillStyle = accent; CTX.fillRect(x + 2, y + 2, fill, ht - 4);
    CTX.fillStyle = labelColor || "#d8dbe0"; CTX.font = "bold 11px Impact"; CTX.textAlign = "left";
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

  const LT = "#d8dbe0";
  const barCol = w => w.id === "p1" ? "#ff7a18" : "#6f86d6";

  /* ---- in-world crowd signals (top layer, catchable peripherally) ---- */
  function drawCrowdSignals() {
    const crowd = G.crowd, match = G.match, rf = G.renderFrame;

    const r = crowd.resentment / 100;
    if (r > 0.02) {
      let inten = Math.min(0.5, r * 0.5);
      if (crowd.primed) inten *= 0.8 + 0.2 * Math.sin(rf * 0.15);
      const vg = CTX.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.72);
      vg.addColorStop(0, "rgba(255,122,24,0)");
      vg.addColorStop(1, "rgba(255,122,24," + inten.toFixed(3) + ")");
      CTX.save(); CTX.fillStyle = vg; CTX.fillRect(0, 0, W, H); CTX.restore();
    }

    // (the heat / crowd-behind-stove / trust meters now live in one tidy
    // paneled block — drawMeters() — so nothing overlaps up top.)

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
        CTX.strokeStyle = "rgba(0,0,0,.5)"; CTX.lineWidth = 3; CTX.fillStyle = "#ffd27a";
        CTX.strokeText("▼", x, y); CTX.fillText("▼", x, y);
        CTX.restore();
      }
    }

    for (const fl of crowd.floaters) {
      const a = 1 - fl.age / fl.life;
      CTX.save(); CTX.globalAlpha = Math.max(0, a); CTX.textAlign = "center";
      CTX.font = "bold " + fl.size + "px Impact";
      CTX.strokeStyle = "rgba(0,0,0,.6)"; CTX.lineWidth = 3.5;
      CTX.strokeText(fl.text, fl.x, fl.y);
      CTX.fillStyle = fl.color; CTX.fillText(fl.text, fl.x, fl.y);
      CTX.restore();
    }

    if (crowd.strobe > 0) {
      CTX.save();
      CTX.globalAlpha = 0.22 * (crowd.strobe / 12) + (crowd.strobe % 2 ? 0.14 : 0);
      CTX.fillStyle = "#fff"; CTX.fillRect(0, 0, W, H);
      CTX.restore();
    }

    if (match.phase === "MATCH" && match.trust < 40) {
      const danger = match.trust < 20;
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(rf * (danger ? 0.24 : 0.13)));
      CTX.save(); CTX.globalAlpha = pulse;
      CTX.strokeStyle = danger ? "#ff2b2b" : "#e0902b"; CTX.lineWidth = danger ? 7 : 4;
      CTX.strokeRect(CTX.lineWidth / 2, CTX.lineWidth / 2, W - CTX.lineWidth, H - CTX.lineWidth);
      CTX.restore();
    }

    if (match.trustFlash) {
      const tf = match.trustFlash, a = Math.min(1, tf.t / 55);
      CTX.save(); CTX.globalAlpha = a; CTX.textAlign = "left"; CTX.font = "bold 15px Impact";
      CTX.fillStyle = tf.delta < 0 ? "#ff4d4d" : "#5fd07a";
      const rise = (55 - tf.t) * 0.35;
      CTX.strokeStyle = "rgba(0,0,0,.5)"; CTX.lineWidth = 3;
      const txt = (tf.delta > 0 ? "+" : "") + tf.delta + " TRUST";
      CTX.strokeText(txt, W / 2 + 168, 84 - rise); CTX.fillText(txt, W / 2 + 168, 84 - rise);
      CTX.restore();
    }
  }

  /* each wrestler's current instruction, on a chip below their sprite */
  /* Each wrestler's instruction on a chip in a FIXED vertical lane: Stove's
     always ABOVE his figure, the Boulder's always BELOW — so when the two are
     stacked (tie-up, corner, pin) the chips never share a lane. A coloured
     name tab makes ownership unambiguous, and the chip is clamped to stay on
     the canvas even at the top or bottom rope. */
  function drawCueLabels() {
    for (const w of [G.P1, G.P2]) {
      const t = PCW.cueText && PCW.cueText(w);
      if (!t) continue;
      const lift = figureLift(w);
      const above = w.id === "p1";                        // Stove above, Boulder below
      const fx = isoX(w.gx, w.gy), fy = isoY(w.gx, w.gy) - lift;
      const col = barCol(w);
      CTX.save();
      CTX.font = "bold 15px Impact";
      const tw = CTX.measureText(t).width, pw = tw + 28, ph = 25;
      // desired chip position, then clamped fully inside the canvas
      let px = fx - pw / 2, py = (fy + (above ? -112 : 48)) - ph / 2;   // clears the taller sprites
      px = Math.max(6, Math.min(W - pw - 6, px));
      py = Math.max(24, Math.min(H - 118 - ph, py));
      // pointer toward the figure (down from an above-chip, up from a below-chip)
      const ptx = Math.max(px + 12, Math.min(px + pw - 12, fx));
      CTX.fillStyle = "rgba(9,11,15,.95)";
      CTX.beginPath();
      if (above) { CTX.moveTo(ptx - 6, py + ph - 1); CTX.lineTo(ptx + 6, py + ph - 1); CTX.lineTo(ptx, py + ph + 9); }
      else { CTX.moveTo(ptx - 6, py + 1); CTX.lineTo(ptx + 6, py + 1); CTX.lineTo(ptx, py - 9); }
      CTX.closePath(); CTX.fill();
      // chip
      CTX.fillStyle = "rgba(9,11,15,.95)"; CTX.fillRect(px, py, pw, ph);
      CTX.lineWidth = 2; CTX.strokeStyle = col; CTX.strokeRect(px, py, pw, ph);
      // name tab (own colour) sitting on the chip's top edge
      CTX.font = "bold 10px Impact"; CTX.textAlign = "left";
      const ntw = CTX.measureText(w.short).width + 10;
      CTX.fillStyle = col; CTX.fillRect(px, py - 13, ntw, 13);
      CTX.fillStyle = "#0b0c0f"; CTX.fillText(w.short, px + 5, py - 3.5);
      // cue text
      CTX.font = "bold 15px Impact"; CTX.textAlign = "center"; CTX.textBaseline = "middle";
      CTX.fillStyle = col; CTX.fillText(t, px + pw / 2, py + ph / 2 + 1);
      CTX.textBaseline = "alphabetic";
      CTX.restore();
    }
  }

  /* mark the corners when a corner spot is called but nobody's there yet */
  function drawCornerHints() {
    const m = G.match, sp = m && m.script[m.spot];
    if (!m || m.phase !== "MATCH" || !sp || !sp.corner || G.superplex) return;
    const def = sp.bump === "STOVE" ? G.P1 : G.P2;
    if (PCW.atCorner(def)) return;
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
      CTX.fillStyle = LT; CTX.font = "italic 12px 'Courier New'";
      CTX.fillText("“" + sp.promo + "”", W / 2, H - 20);
    } else if (match.phase === "MATCH") {
      CTX.fillStyle = "#fff"; CTX.font = "bold 13px Impact"; CTX.fillText("SHEET COMPLETE — GO HOME", W / 2, H - 30);
    }
    CTX.restore();

    drawMeters();   // heat / resentment / trust, one tidy panel up top
    const cpu = id => (PCW.AI && PCW.AI.control[id]) ? "  · CPU" : "";
    gauge(24, H - 100, 180, 10, G.P1.body, G.P1.short + " — BODY" + cpu("p1"), barCol(G.P1), LT);
    gauge(W - 204, H - 100, 180, 10, G.P2.body, G.P2.short + " — BODY" + cpu("p2"), barCol(G.P2), LT);
    gauge(24, H - 78, 180, 7, PCW.G.respect.p1, "RESPECT", "#c9a24a", LT);
    gauge(W - 204, H - 78, 180, 7, PCW.G.respect.p2, "RESPECT", "#c9a24a", LT);

    // the arm-drag reversal window, over the receiver, when a booked reversal
    // tie-up is live (frames 4–9 of the tie-up are the sweet spot).
    if (G.tieup && G.tieup.reversalSpot) {
      const t = G.tieup, rec = t.receiver;
      const x = isoX(rec.gx, rec.gy) - 38, y = isoY(rec.gx, rec.gy) + 34;
      for (let i = 1; i <= F.GRAPPLE_STARTUP; i++) {
        const inWin = i >= F.WINDOW_OPEN && i <= F.WINDOW_CLOSE, px = x + (i - 1) * 6.4;
        CTX.strokeStyle = "#cfd3da"; CTX.lineWidth = 1; CTX.strokeRect(px, y, 5, 10);
        if (i <= t.frame) { CTX.fillStyle = inWin ? "#ffd27a" : "#cfd3da"; CTX.fillRect(px + .5, y + .5, 4, 9); }
        else if (inWin) { CTX.fillStyle = "rgba(255,210,122,.25)"; CTX.fillRect(px + .5, y + .5, 4, 9); }
      }
    }
    if (G.pin && G.pin.count >= 1) {   // the ref's count — a big clean number
      CTX.save(); CTX.translate(W / 2, H / 2 - 40); CTX.rotate(-0.03);
      CTX.font = "bold 76px Impact"; CTX.textAlign = "center";
      CTX.strokeStyle = "rgba(0,0,0,.7)"; CTX.lineWidth = 6;
      const s = String(G.pin.count) + "!";
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
    if (PCW.Commentary) PCW.Commentary.draw(CTX);

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
    CTX.setTransform(PCW.DPR, 0, 0, PCW.DPR, 0, 0);
    CTX.save();
    if (G.shake > 0.5 && G.match.phase !== "ENDED") CTX.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
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
