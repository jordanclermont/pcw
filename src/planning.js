/* ============================================================
   PCW — planning.js  (v0.04)
   GORILLA POSITION — the planning screen. Two workers build the
   match with a producer (the office) at the table.

   THE PITCH (the negotiation model):
   - The office states a fixed AGENDA (known to both — strategy, not
     guesswork) and nudges every pitch's acceptance.
   - Six body slots, turns ALTERNATE — Stove owns 1/3/5, Boulder owns
     2/4/6 (three pitches each = equal input).
   - On your turn you pitch a spot. Your partner reacts: PUT IT OVER
     (free), BURY IT (costs one of two scarce tokens), or PASS.
   - Office + a random roll resolve it. Accept fills your slot; reject,
     you pitch again. After a few whiffs the office makes the call.
   Backstage look (fluorescent, clipboard) is the inverse of the show —
   the two-audience model expressed visually (bible §9).
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;
  const G = PCW.G;
  const { W, H } = PCW.CANVAS;
  const CVS = document.getElementById("game");
  const CTX = CVS.getContext("2d");

  // Audacity-Era backstage palette: grimy loading-dock, harsh fluorescent,
  // steel + blood + hazard yellow. The inverse of the dark neon show.
  const VOID = "#0d0e11", CONCRETE = "#14161a", STEEL = "#1c2027", STEEL2 = "#272d37";
  const BLOOD = "#c1121f", BONE = "#e7e1d3", DIM = "#aab0ba";
  const STOVE = "#ff7a18", BOULDER = "#6f86d6", GOLD = "#e8b923";
  const GO = "#4fae56", NO = "#e0454f";
  const INK = "#14161a";           // dark text on the bone clipboard
  const N_SLOTS = 6;
  const ownerName = o => o === "p1" ? "STOVE HOT" : "THE BOULDER";
  const ownerCol = o => o === "p1" ? STOVE : BOULDER;

  let st = null;

  function reset() {
    if (!G.pads) G.pads = { p1: new PCW.Pad(PCW.PAD_MAP.p1), p2: new PCW.Pad(PCW.PAD_MAP.p2) };
    st = {
      frame: 0, phase: "MODE",
      slots: new Array(N_SLOTS).fill(null),
      owners: ["p1", "p2", "p1", "p2", "p1", "p2"],
      current: 0, cursor: 0, mode: null, editing: false, presetName: "",
      buries: { p1: 2, p2: 2 },
      pending: null, result: null, tries: 0
    };
    G.appPhase = "PLANNING";
  }

  // the MODE menu: each preset, then book-from-scratch
  const modeOptions = () => PCW.PRESETS.concat([{ scratch: true, name: "FROM SCRATCH", tag: "", blurb: "Book the whole thing yourself, spot by spot — full control." }]);

  function chooseMode(opt) {
    if (opt.scratch) {
      st.mode = "scratch"; st.slots = new Array(N_SLOTS).fill(null);
      st.current = 0; st.cursor = 0; st.phase = "INTRO";
    } else {
      st.mode = "preset"; st.slots = opt.body.slice(); st.presetName = opt.name;
      st.cursor = 0; st.phase = "EDIT";
    }
  }

  const available = () => PCW.SPOT_MENU.filter(id => !st.slots.includes(id));
  const clampCursor = () => { const n = available().length; if (n) st.cursor = ((st.cursor % n) + n) % n; else st.cursor = 0; };

  /* acceptance tuning — all in one place for the designer to nudge.
     A safe on-agenda spot sails through; a reckless bump on the champ
     needs the partner's buy-in AND a respected pitcher. */
  const TUNE = { BASE: 50, THRESH: 55, OFFICE_FLOOR: -20, RISK_MULT: 3, OVER: 24, BURY: -28, RESPECT_MULT: 0.5 };
  const otherOf = o => o === "p1" ? "p2" : "p1";

  /* office-only lean on a spot (agenda, floored) — shown on the card */
  function officeLean(sp) {
    let s = 0; for (const g of PCW.OFFICE_AGENDA) s += g.effect(sp);
    return Math.max(TUNE.OFFICE_FLOOR, s);
  }

  /* pure resolver: (spot, partner stance, pitcher, pitcher's respect) ->
     outcome. No dice — the third factor is the pitcher's RESPECT: the
     office gives a respected worker more benefit of the doubt. */
  function computeScore(sp, stance, owner, respect) {
    const other = otherOf(owner);
    const reasons = [];
    let officeSum = 0;
    for (const g of PCW.OFFICE_AGENDA) {
      const d = g.effect(sp);
      if (d > 0) reasons.push({ t: "office likes it — " + g.short, good: true });
      else if (d < 0) reasons.push({ t: "office is nervous — " + g.short, good: false });
      officeSum += d;
    }
    officeSum = Math.max(TUNE.OFFICE_FLOOR, officeSum);
    let score = TUNE.BASE + officeSum - sp.risk * TUNE.RISK_MULT;
    if (sp.risk >= 2) reasons.push({ t: "the danger of it (" + sp.risk + "/3)", good: false });
    if (stance === "over") { score += TUNE.OVER; reasons.push({ t: ownerName(other) + " put it over", good: true }); }
    else if (stance === "bury") { score += TUNE.BURY; reasons.push({ t: ownerName(other) + " buried it", good: false }); }
    else reasons.push({ t: ownerName(other) + " let it ride", good: true });
    const respBonus = Math.round((respect - 50) * TUNE.RESPECT_MULT);
    score += respBonus;
    reasons.push({
      t: "office's respect for " + ownerName(owner).split(" ")[0] + " (" + respect + "/100)  " + (respBonus >= 0 ? "+" : "") + respBonus,
      good: respBonus >= 0
    });
    return { score, accepted: score >= TUNE.THRESH, reasons, respBonus };
  }

  function resolve(stance) {
    const sp = PCW.SPOTS[st.pending.id];
    const owner = st.pending.owner;
    const r = computeScore(sp, stance, owner, PCW.G.respect[owner]);
    st.result = { id: st.pending.id, owner, accepted: r.accepted, score: r.score, reasons: r.reasons };
    st.pending = null; st.phase = "RESULT";
  }

  function acceptInto(slot, id) { st.slots[slot] = id; }

  function afterResult() {
    if (st.editing) {
      // editing one slot: accept replaces it; reject leaves the original.
      if (st.result.accepted) st.slots[st.current] = st.result.id;
      st.editing = false; st.tries = 0;
      st.cursor = st.current; st.phase = "EDIT";
      return;
    }
    if (st.result.accepted) {
      acceptInto(st.current, st.result.id);
      st.current++; st.tries = 0;
    } else {
      st.tries++;
      if (st.tries >= 4) {
        // the office makes the call — inserts the safest available spot
        const safe = available().slice().sort((a, b) => PCW.SPOTS[a].risk - PCW.SPOTS[b].risk)[0];
        acceptInto(st.current, safe);
        st.current++; st.tries = 0;
      }
    }
    st.cursor = 0;
    st.phase = st.current >= N_SLOTS ? "LOCKIN" : "PITCH";
  }

  function lockIn() {
    const script = PCW.assembleScript(st.slots.slice());
    PCW.startMatch(script);
  }

  /* ---------------- tick ---------------- */
  function tick() {
    const justSet = PCW.drainPresses();
    G.pads.p1.beginTick(justSet); G.pads.p2.beginTick(justSet);
    const p1 = G.pads.p1, p2 = G.pads.p2;
    const anyConfirm = p1.just.A || p2.just.A;

    const anyUp = p1.just.up || p2.just.up, anyDown = p1.just.down || p2.just.down;
    const anyRun = p1.just.X || p2.just.X;

    switch (st.phase) {
      case "MODE": {
        const opts = modeOptions();
        if (anyUp) st.cursor = (st.cursor - 1 + opts.length) % opts.length;
        if (anyDown) st.cursor = (st.cursor + 1) % opts.length;
        if (anyConfirm) chooseMode(opts[st.cursor]);
        break;
      }
      case "EDIT": {
        if (anyUp) st.cursor = (st.cursor - 1 + N_SLOTS) % N_SLOTS;
        if (anyDown) st.cursor = (st.cursor + 1) % N_SLOTS;
        if (anyConfirm) { st.editing = true; st.current = st.cursor; st.cursor = 0; st.phase = "PITCH"; }
        else if (anyRun) st.phase = "LOCKIN";   // Run key = lock the card in
        break;
      }
      case "INTRO":
        if (anyConfirm) st.phase = "PITCH";
        break;
      case "PITCH": {
        const pad = G.pads[st.owners[st.current]];
        const n = available().length;
        if (n) {
          if (pad.just.up) { st.cursor = (st.cursor - 1 + n) % n; }
          if (pad.just.down) { st.cursor = (st.cursor + 1) % n; }
          if (pad.just.A) { st.pending = { id: available()[st.cursor], owner: st.owners[st.current] }; st.phase = "RESPOND"; }
        }
        break;
      }
      case "RESPOND": {
        const pad = G.pads[otherOf(st.pending.owner)];
        if (pad.just.A) resolve("over");
        else if (pad.just.B) { const o = otherOf(st.pending.owner); if (st.buries[o] > 0) { st.buries[o]--; resolve("bury"); } }
        else if (pad.just.X) resolve("pass");
        break;
      }
      case "RESULT":
        if (anyConfirm) afterResult();
        break;
      case "LOCKIN":
        if (anyConfirm) lockIn();
        break;
    }
  }

  /* ---------------- render (Audacity-Era backstage) ---------------- */
  // fonts: condensed block for headers, narrow sans for body, mono for data
  function setFont(size, weight) {
    const fam = weight === "head" ? "Impact, 'Arial Narrow Bold', sans-serif"
      : weight === "mono" ? "'Courier New', monospace"
        : "'Arial Narrow', 'Helvetica Neue', sans-serif";
    CTX.font = (weight === "head" ? "" : weight === "bold" ? "bold " : "") + size + "px " + fam;
  }
  function txt(s, x, y, size, col, weight, align) {
    setFont(size, weight);
    CTX.textAlign = align || "left"; CTX.fillStyle = col || BONE;
    CTX.fillText(s, x, y);
  }
  /* dynamic text MEASURED to fit inside maxW: wrap up to maxLines, then
     ellipsize the tail. Nothing drawn on the planning screen should overrun
     its panel — route any variable-length string through this. */
  function txtFit(s, x, y, size, col, weight, maxW, maxLines, lh) {
    setFont(size, weight);
    maxLines = maxLines || 1; lh = lh || size + 3;
    const words = ("" + s).split(" "), lines = []; let line = "", placed = 0;
    for (const wd of words) {
      const test = line ? line + " " + wd : wd;
      if (CTX.measureText(test).width > maxW && line) {
        lines.push(line); placed += line.split(" ").length; line = wd;
        if (lines.length === maxLines) break;
      } else line = test;
    }
    if (lines.length < maxLines && line) { lines.push(line); placed += line.split(" ").length; }
    if (placed < words.length && lines.length) {   // content left over — ellipsize the last line
      let last = lines[lines.length - 1];
      while (last.length && CTX.measureText(last + "…").width > maxW) last = last.slice(0, -1);
      lines[lines.length - 1] = last + "…";
    }
    CTX.textAlign = "left"; CTX.fillStyle = col || BONE;
    lines.forEach((l, i) => CTX.fillText(l, x, y + i * lh));
    return lines.length;
  }
  function riskDots(x, y, risk) {
    for (let i = 0; i < 3; i++) {
      CTX.beginPath(); CTX.arc(x + i * 9, y, 3, 0, 7);
      CTX.fillStyle = i < risk ? (risk >= 3 ? BLOOD : GOLD) : "rgba(255,255,255,.16)"; CTX.fill();
    }
  }
  function scanlines() {
    CTX.save(); CTX.globalAlpha = 0.5; CTX.fillStyle = "rgba(0,0,0,.10)";
    for (let y = 0; y < H; y += 3) CTX.fillRect(0, y, W, 1);
    CTX.restore();
  }
  function hazard(x, y, w, h) {
    CTX.save(); CTX.beginPath(); CTX.rect(x, y, w, h); CTX.clip();
    CTX.fillStyle = "#171717"; CTX.fillRect(x, y, w, h);
    CTX.fillStyle = GOLD;
    for (let i = -h; i < w; i += 22) { CTX.beginPath(); CTX.moveTo(x + i, y + h); CTX.lineTo(x + i + 11, y + h); CTX.lineTo(x + i + 11 + h, y); CTX.lineTo(x + i + h, y); CTX.closePath(); CTX.fill(); }
    CTX.restore();
  }
  function darkPanel(x, y, w, h, title) {
    CTX.fillStyle = STEEL; CTX.fillRect(x, y, w, h);
    CTX.strokeStyle = "#0b0c0f"; CTX.lineWidth = 3; CTX.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    CTX.strokeStyle = STEEL2; CTX.lineWidth = 1; CTX.strokeRect(x + 4, y + 4, w - 8, h - 8);
    if (title) { CTX.fillStyle = BLOOD; CTX.fillRect(x, y, w, 22); txt(title, x + 9, y + 16, 14, "#fff", "head"); }
  }
  function clipboard(x, y, w, h, title) {
    CTX.fillStyle = "#2a2b2d"; CTX.fillRect(x - 4, y - 4, w + 8, h + 8); // board backing
    CTX.fillStyle = BONE; CTX.fillRect(x, y, w, h);                      // paper
    CTX.strokeStyle = "rgba(0,0,0,.25)"; CTX.lineWidth = 1; CTX.strokeRect(x + 5, y + 5, w - 10, h - 10);
    // metal clip
    CTX.fillStyle = "#9aa0a8"; CTX.fillRect(x + w / 2 - 26, y - 10, 52, 16);
    CTX.fillStyle = "#c7ccd2"; CTX.fillRect(x + w / 2 - 22, y - 8, 44, 5);
    if (title) { CTX.fillStyle = INK; txt(title, x + 14, y + 24, 16, INK, "head"); CTX.fillStyle = BLOOD; CTX.fillRect(x + 14, y + 30, w - 28, 2); }
  }
  function vhsBug() {
    const rec = st.frame % 60 < 40;
    CTX.beginPath(); CTX.arc(W - 118, 26, 5, 0, 7); CTX.fillStyle = rec ? BLOOD : "rgba(193,18,31,.3)"; CTX.fill();
    txt("REC", W - 108, 30, 13, "#fff", "head");
    const tc = String(Math.floor(st.frame / 60 / 60) % 60).padStart(2, "0") + ":" +
      String(Math.floor(st.frame / 60) % 60).padStart(2, "0") + ":" + String(st.frame % 60).padStart(2, "0");
    txt(tc, W - 64, 30, 13, "#cfd3da", "mono");
  }

  function projectArc(ids) {
    const script = PCW.assembleScript(ids.filter(Boolean));
    let heat = 32, resent = 0; const pts = [heat];
    for (const sp of script) {
      const face = sp.caller === "p1"; let d;
      if (sp.move === "PIN") d = 22;
      else if (face) { d = sp.pop * 1.2 * (1 + resent / 120); resent *= 0.5; }
      else { d = sp.pop * 0.5; resent += sp.pop * 0.6; }
      heat = Math.max(0, Math.min(100, heat + d - 3));
      pts.push(heat);
    }
    return pts;
  }

  function bg() {
    const g = CTX.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#20242b"); g.addColorStop(0.12, CONCRETE); g.addColorStop(1, VOID);
    CTX.fillStyle = g; CTX.fillRect(0, 0, W, H);
    CTX.fillStyle = "rgba(220,225,235,.10)"; CTX.fillRect(0, 0, W, 60); // light spill
  }
  function vignette() {
    scanlines();
    const vg = CTX.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.9);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.5)");
    CTX.fillStyle = vg; CTX.fillRect(0, 0, W, H);
  }

  function render() {
    st.frame++;
    CTX.setTransform(PCW.DPR, 0, 0, PCW.DPR, 0, 0);   // crisp on hi-dpi
    bg();

    if (st.phase === "MODE") { renderMode(); vignette(); return; }

    txt("GORILLA POSITION", 22, 40, 34, "#fff", "head");
    CTX.fillStyle = BLOOD; CTX.fillRect(22, 46, 316, 4);
    txt("BEHIND THE CURTAIN — BOOKING THE MATCH", 348, 40, 15, DIM, "head");
    vhsBug();

    // office booking — hazard tape + blood text
    hazard(22, 58, 914, 20);
    txt("  NON-NEGOTIABLE  ", 30, 73, 13, "#111", "head");
    darkPanel(22, 82, 914, 46, null);
    txt("STOVE HOT GOES OVER", 34, 106, 17, STOVE, "head");
    txt("·  THE BOULDER PROTECTED (DOWN STRONG)", 232, 106, 15, BOULDER, "head");
    txt("OFFICE AGENDA:  " + PCW.OFFICE_AGENDA.map(g => g.short).join("   ·   "), 34, 122, 11, GOLD, "bold");

    // ---- left: THE SHEET (a real clipboard) ----
    clipboard(30, 150, 366, 400, "TONIGHT'S SHEET");
    let y = 190;
    const rowSheet = (label, name, col, cur, tag) => {
      if (cur) { CTX.fillStyle = "rgba(193,18,31,.14)"; CTX.fillRect(40, y - 13, 348, 21); CTX.strokeStyle = BLOOD; CTX.lineWidth = 1.5; CTX.strokeRect(40, y - 13, 348, 21); }
      txt(label, 44, y, 12, "#8a857a", "head");
      txt(name, 96, y, 14, col, name !== "— OPEN —" ? "bold" : "");
      if (tag) txt(tag, 384, y, 10, col, "head", "right");
      y += 25;
    };
    const hi = st.phase === "EDIT" ? st.cursor : st.phase === "LOCKIN" ? -1 : st.current;
    rowSheet("OPEN", PCW.SPOTS[PCW.SPOT_HEAD[0]].name.toUpperCase(), "#8a857a", false, "OFFICE");
    for (let i = 0; i < N_SLOTS; i++) {
      const o = st.owners[i], id = st.slots[i];
      rowSheet((i + 1) + ".", id ? PCW.SPOTS[id].name.toUpperCase() : "— OPEN —", ownerCol(o),
        i === hi, ownerName(o).split(" ")[0]);
    }
    for (const t of PCW.SPOT_TAIL) rowSheet("FIN", PCW.SPOTS[t].name.toUpperCase(), "#8a857a", false, "OFFICE");

    // ---- left-bottom: respect + bury tokens ----
    darkPanel(30, 562, 366, 56, null);
    txt("RESPECT", 42, 580, 12, GOLD, "head");
    meter(120, 572, 120, 8, PCW.G.respect.p1, STOVE); txt("STOVE", 120, 570, 9, STOVE, "head");
    meter(258, 572, 120, 8, PCW.G.respect.p2, BOULDER); txt("BOULDER", 258, 570, 9, BOULDER, "head");
    txt("BURY", 42, 604, 12, BLOOD, "head");
    txt(tokens(st.buries.p1), 120, 606, 13, STOVE, "head");
    txt(tokens(st.buries.p2), 258, 606, 13, BOULDER, "head");

    // ---- right: context panel ----
    darkPanel(414, 150, 522, 468, null);
    if (st.phase === "INTRO") renderIntro();
    else if (st.phase === "EDIT") renderEdit();
    else if (st.phase === "PITCH") renderPitch();
    else if (st.phase === "RESPOND") renderRespond();
    else if (st.phase === "RESULT") renderResult();
    else if (st.phase === "LOCKIN") renderLockin();

    vignette();
  }

  function renderMode() {
    txt("GORILLA POSITION", 22, 46, 38, "#fff", "head");
    CTX.fillStyle = BLOOD; CTX.fillRect(22, 54, 360, 5);
    vhsBug();
    txt("HOW DO YOU WANT TO BOOK TONIGHT?", 22, 96, 20, GOLD, "head");

    const opts = modeOptions();
    let y = 132;
    opts.forEach((o, i) => {
      const sel = i === st.cursor;
      darkPanel(22, y, 914, 92, null);
      if (sel) { CTX.strokeStyle = BLOOD; CTX.lineWidth = 3; CTX.strokeRect(24, y + 2, 910, 88); CTX.fillStyle = "rgba(193,18,31,.10)"; CTX.fillRect(22, y, 914, 92); }
      txt((sel ? "▶ " : "   ") + o.name, 40, y + 40, 30, sel ? "#fff" : BONE, "head");
      if (o.tag) { const tw = 128; CTX.fillStyle = o.tag === "HIGH RISK" ? BLOOD : "#2e7d38"; CTX.fillRect(360, y + 20, tw, 24); txt(o.tag, 366, y + 37, 15, "#fff", "head"); }
      txt(o.blurb, 40, y + 68, 15, DIM, "");
      if (!o.scratch) txtFit(o.body.map(id => PCW.SPOTS[id].name).join("  ·  "), 510, y + 36, 11, "#9aa0aa", "", 412, 2, 15);
      y += 104;
    });
    const blink = st.frame % 60 < 42;
    if (blink) txt("[W/S] or [↑/↓] CHOOSE     ·     [F] / [J] CONFIRM", W / 2, 606, 16, "#fff", "head", "center");
  }

  function renderEdit() {
    txt("EDIT THE CARD", 432, 186, 22, BLOOD, "head");
    txt(st.presetName || "YOUR CARD", 432, 210, 14, GOLD, "head");
    txt("Change any spot, or lock it in as-is.", 432, 234, 14, BONE, "");

    const slot = st.cursor, id = st.slots[slot], sp = PCW.SPOTS[id];
    txt("SELECTED — SLOT " + (slot + 1) + " (" + ownerName(st.owners[slot]).split(" ")[0] + "):", 432, 272, 13, DIM, "head");
    darkPanel(424, 284, 504, 86, null); spotCard(sp, 436, 308, 480);

    txt("[F] / [J]   RE-PITCH THIS SLOT", 432, 418, 18, "#fff", "head");
    txt("swap it — goes past your partner and the office again", 432, 440, 13, DIM, "");
    txt("[H] / [L]   LOCK IN THE CARD", 432, 480, 18, GO, "head");
    txt("book it as-is and see the projected arc", 432, 502, 13, DIM, "");
    txt("[W/S] · [↑/↓]   pick a different slot", 432, 540, 14, DIM, "head");
  }
  function meter(x, y, w, h, val, col) {
    CTX.strokeStyle = "#0b0c0f"; CTX.lineWidth = 1; CTX.strokeRect(x, y, w, h);
    CTX.fillStyle = col; CTX.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * val / 100), h - 2);
  }
  const tokens = n => "◆".repeat(n) + "◇".repeat(2 - n);

  function renderIntro() {
    txt("HOW IT WORKS", 432, 186, 20, BLOOD, "head");
    const lines = [
      "You and your partner book the body of the match together.",
      "",
      "SIX SLOTS. You take turns pitching — Stove owns 1/3/5,",
      "Boulder owns 2/4/6. Equal say.",
      "",
      "On your turn, browse the menu and PITCH a spot.",
      "Your partner then PUTS IT OVER, BURIES it (2 tokens",
      "each), or lets it ride.",
      "",
      "The office weighs its agenda and how much it RESPECTS",
      "you, then makes the call. Earn respect in the ring by",
      "playing to the crowd — it buys you pull next time.",
      "",
      "The office protects the champion. Big bumps on The",
      "Boulder make them nervous — push them through if you dare."
    ];
    lines.forEach((l, i) => txt(l, 432, 216 + i * 24, 14, i && !l ? DIM : BONE, ""));
    const blink = st.frame % 60 < 42;
    if (blink) txt("STOVE [F]   or   BOULDER [J]   TO START", 675, 600, 16, "#fff", "head", "center");
  }

  function spotCard(sp, x, y, w) {
    txt(sp.name.toUpperCase(), x, y, 17, "#fff", "head");
    txt(sp.arcSlot.toUpperCase(), x + w, y, 12, GOLD, "head", "right");
    txtFit(sp.desc, x, y + 18, 12, DIM, "", w, 1, 14);
    riskDots(x, y + 35, sp.risk);
    txt("RISK", x + 32, y + 38, 10, DIM, "head");
    txt("BUMP: " + sp.bump, x + 78, y + 38, 11, ownerCol(sp.bump === "STOVE" ? "p1" : "p2"), "head");
    txt("POP " + sp.pop, x + w, y + 38, 12, "#fff", "head", "right");
    const lean = officeLean(sp);
    txt(lean > 0 ? "OFFICE: LIKES IT" : lean < 0 ? "OFFICE: WARY" : "OFFICE: NEUTRAL",
      x, y + 55, 12, lean > 0 ? GO : lean < 0 ? NO : DIM, "head");
  }

  function renderPitch() {
    const owner = st.owners[st.current];
    txt(ownerName(owner) + " — PITCH SLOT " + (st.current + 1), 432, 186, 19, ownerCol(owner), "head");
    const nav = owner === "p1" ? "[W/S] BROWSE   [F] PITCH" : "[↑/↓] BROWSE   [J] PITCH";
    txt(nav, 924, 186, 12, DIM, "head", "right");

    const avail = available(); clampCursor();
    let ry = 214;
    for (let i = 0; i < avail.length; i++) {
      const sp = PCW.SPOTS[avail[i]], sel = i === st.cursor;
      if (sel) { CTX.fillStyle = "rgba(255,122,24,.12)"; CTX.fillRect(424, ry - 14, 504, 25); CTX.strokeStyle = ownerCol(owner); CTX.lineWidth = 2; CTX.strokeRect(424, ry - 14, 504, 25); }
      txt((sel ? "▶ " : "   ") + sp.name.toUpperCase(), 432, ry, 15, sel ? "#fff" : BONE, sel ? "head" : "");
      txt(sp.arcSlot, 686, ry, 11, DIM, "head");
      riskDots(758, ry - 4, sp.risk);
      txt(sp.bump, 798, ry, 10, ownerCol(sp.bump === "STOVE" ? "p1" : "p2"), "head");
      const lean = officeLean(sp);
      txt(lean > 0 ? "＋" : lean < 0 ? "－" : "·", 912, ry, 15, lean > 0 ? GO : lean < 0 ? NO : DIM, "head", "right");
      ry += 27;
    }
    if (avail.length) { darkPanel(424, 524, 504, 84, null); spotCard(PCW.SPOTS[avail[st.cursor]], 436, 548, 480); }
  }

  function renderRespond() {
    const owner = st.pending.owner, other = otherOf(owner);
    const sp = PCW.SPOTS[st.pending.id];
    txt(ownerName(owner) + " PITCHES:", 432, 186, 17, ownerCol(owner), "head");
    darkPanel(424, 198, 504, 86, null); spotCard(sp, 436, 222, 480);

    txt(ownerName(other) + " — YOUR CALL:", 432, 326, 19, ownerCol(other), "head");
    const keys = other === "p1" ? ["[F] PUT IT OVER", "[G] BURY IT", "[H] LET IT RIDE"]
      : ["[J] PUT IT OVER", "[K] BURY IT", "[L] LET IT RIDE"];
    txt(keys[0], 448, 366, 17, GO, "head"); txt("push the office toward yes", 660, 366, 12, DIM, "");
    const tk = st.buries[other];
    txt(keys[1] + "  (" + tk + " LEFT)", 448, 400, 17, tk > 0 ? NO : "#5c5c5c", "head");
    txt(tk > 0 ? "kill it — scarce, spend wisely" : "no tokens left", 660, 400, 12, DIM, "");
    txt(keys[2], 448, 434, 17, DIM, "head"); txt("stay neutral", 660, 434, 12, DIM, "");
  }

  function renderResult() {
    const r = st.result, sp = PCW.SPOTS[r.id];
    txt("THE OFFICE:", 432, 188, 16, DIM, "head");
    txt(r.accepted ? "YOU'RE ON." : "PASS — NOT TONIGHT.", 432, 224, 34, r.accepted ? GO : NO, "head");
    txt(sp.name.toUpperCase() + "  →  " + (r.accepted ? "SLOT " + (st.current + 1) : "BACK TO THE DRAWING BOARD"),
      432, 250, 14, BONE, "head");

    txt("WHAT WENT INTO IT  (start 50 · need 55):", 432, 288, 13, DIM, "head");
    r.reasons.forEach((rs, i) => {
      txt((rs.good ? "＋  " : "－  ") + rs.t, 444, 314 + i * 23, 14, rs.good ? GO : NO, "");
    });
    // score bar
    const by = 330 + r.reasons.length * 23;
    CTX.strokeStyle = "#0b0c0f"; CTX.strokeRect(432, by, 300, 16);
    CTX.fillStyle = r.accepted ? GO : NO; CTX.fillRect(433, by + 1, Math.max(0, Math.min(298, r.score / 100 * 298)), 14);
    CTX.fillStyle = "#fff"; CTX.fillRect(432 + 55 / 100 * 300, by - 3, 2, 22);
    txt(Math.round(r.score) + "/100", 740, by + 13, 14, "#fff", "head");
    txt("55 = the bar", 432 + 55 / 100 * 300 - 20, by + 32, 10, DIM, "");

    if (!r.accepted && st.tries >= 3) txt("ONE MORE MISS AND THE OFFICE MAKES THE CALL", 432, by + 54, 12, GOLD, "head");
    const blink = st.frame % 60 < 42;
    if (blink) txt("[F] / [J] TO CONTINUE", 675, 600, 15, "#fff", "head", "center");
  }

  function renderLockin() {
    txt("THE MATCH IS BOOKED", 432, 190, 22, BLOOD, "head");
    txt("PROJECTED CROWD ARC", 432, 218, 13, DIM, "head");
    const gx = 432, gy = 232, gw = 496, gh = 150;
    CTX.fillStyle = "#0c0d10"; CTX.fillRect(gx, gy, gw, gh);
    CTX.strokeStyle = STEEL2; CTX.strokeRect(gx, gy, gw, gh);
    for (let i = 1; i < 4; i++) { CTX.strokeStyle = "rgba(255,255,255,.06)"; CTX.beginPath(); CTX.moveTo(gx, gy + gh * i / 4); CTX.lineTo(gx + gw, gy + gh * i / 4); CTX.stroke(); }
    const pts = projectArc(st.slots);
    CTX.beginPath();
    pts.forEach((p, i) => { const x = gx + i / (pts.length - 1) * gw, yy = gy + gh - p / 100 * gh; i ? CTX.lineTo(x, yy) : CTX.moveTo(x, yy); });
    CTX.strokeStyle = STOVE; CTX.lineWidth = 3; CTX.stroke();
    pts.forEach((p, i) => { const x = gx + i / (pts.length - 1) * gw, yy = gy + gh - p / 100 * gh; CTX.fillStyle = "#fff"; CTX.beginPath(); CTX.arc(x, yy, 2.5, 0, 7); CTX.fill(); });
    txt("BELL", gx + 2, gy + gh + 14, 10, DIM, "head");
    txt("FINISH", gx + gw - 34, gy + gh + 14, 10, DIM, "head");

    const names = PCW.assembleScript(st.slots.slice()).map(s => s.name.toUpperCase());
    txt("RUN OF SHOW:", 432, 410, 12, GOLD, "head");
    names.forEach((n, i) => txtFit((i + 1) + ". " + n, 432 + (i % 2) * 252, 430 + Math.floor(i / 2) * 18, 11, BONE, "", 244, 1, 13));

    const blink = st.frame % 50 < 34;
    if (blink) { CTX.fillStyle = BLOOD; CTX.fillRect(432, 574, 496, 30); txt("★  HIT THE RING — [F] / [J]  ★", 680, 595, 20, "#fff", "head", "center"); }
  }

  PCW.Planning = {
    reset, tick, render,
    // test/debug surface
    _state: () => st,
    _score: (spotId, stance, respect) => computeScore(PCW.SPOTS[spotId], stance, "p1", respect == null ? 50 : respect)
  };
})();
