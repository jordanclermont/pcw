/* ============================================================
   PCW — commentary.js  (v0.06)
   Two-voice broadcast commentary, presented as comic-style SPEECH
   BUBBLES at ringside rather than scrolling text (bible §5.9). Keeps
   commentary diegetic and naturally caps how much is said at once —
   an overstuffed bubble stops reading as a bubble, so lines are short
   and each voice shows only its latest.

   Voices (invented, parody-safe):
     pbp   — CHET VANDYKE, straight play-by-play (bottom-left)
     color — DUTCH, grizzled ex-wrestler colour man (bottom-right)

   The engine calls PCW.Commentary.say(voice, text). This module owns
   only presentation; it never touches game logic. It is ALSO free to
   drift from the backstage log — commentary is what the player reads,
   the log is a debug readout.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;
  const { W, H } = PCW.CANVAS;

  const VOICES = {
    pbp: { name: "CHET", accent: "#e7e1d3", side: "L" },
    color: { name: "DUTCH", accent: "#e8b923", side: "R" }
  };
  const DEFAULT_TTL = 190;   // logic frames a line stays up (~3.1s)
  const MAXLINES = 3;

  const state = { pbp: null, color: null };

  function reset() { state.pbp = null; state.color = null; }

  function say(voice, text, ttl) {
    if (!VOICES[voice]) voice = "pbp";
    state[voice] = { text: String(text), ttl: ttl || DEFAULT_TTL, ttlMax: ttl || DEFAULT_TTL, age: 0 };
  }

  function update() {
    for (const v in state) {
      const b = state[v];
      if (!b) continue;
      b.age++; b.ttl--;
      if (b.ttl <= 0) state[v] = null;
    }
  }

  /* greedy wrap to a pixel width, capped at MAXLINES with an ellipsis */
  function wrap(ctx, text, maxW) {
    const words = text.split(" "), lines = [];
    let line = "";
    for (const wd of words) {
      const test = line ? line + " " + wd : wd;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = wd; }
      else line = test;
      if (lines.length >= MAXLINES) break;
    }
    if (lines.length < MAXLINES && line) lines.push(line);
    if (lines.length >= MAXLINES) {
      // if there was more, mark the last line as truncated
      let last = lines[MAXLINES - 1];
      while (ctx.measureText(last + "…").width > maxW && last.length) last = last.slice(0, -1);
      lines[MAXLINES - 1] = last + "…";
    }
    return lines;
  }

  const PAD = 9, LH = 15, BW = 250;
  function measure(ctx, b) {
    ctx.font = "13px 'Arial Narrow', 'Helvetica Neue', sans-serif";
    const lines = wrap(ctx, b.text, BW - PAD * 2);
    const innerW = Math.min(BW - PAD * 2, Math.max(60, ...lines.map(l => ctx.measureText(l).width)));
    return { lines, boxW: innerW + PAD * 2, boxH: lines.length * LH + PAD * 2 + 8 };
  }

  /* draw a bubble horizontally centred on cx with its BOTTOM at bottomY, tail
     pointing down — commentary rises from the bottom middle of the screen,
     clear of the corner health/respect bars. */
  function drawBubbleAt(ctx, b, voice, cx, bottomY, M) {
    const V = VOICES[voice];
    const x = Math.round(cx - M.boxW / 2), y = bottomY - M.boxH;
    ctx.save();
    ctx.globalAlpha = Math.min(1, b.ttl / 30);
    if (b.age < 6) { const s = 0.7 + 0.3 * (b.age / 6); ctx.translate(x + M.boxW / 2, bottomY); ctx.scale(s, s); ctx.translate(-(x + M.boxW / 2), -bottomY); }
    // bubble body
    roundRect(ctx, x, y, M.boxW, M.boxH, 8);
    ctx.fillStyle = "#f4efe2"; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = "#111"; ctx.stroke();
    // downward tail from the bubble's centre
    const tx = x + M.boxW / 2;
    ctx.beginPath();
    ctx.moveTo(tx - 7, y + M.boxH - 1); ctx.lineTo(tx + 7, y + M.boxH - 1); ctx.lineTo(tx, y + M.boxH + 11);
    ctx.closePath(); ctx.fillStyle = "#f4efe2"; ctx.fill(); ctx.strokeStyle = "#111"; ctx.lineWidth = 2.5; ctx.stroke();
    // speaker tag
    ctx.font = "bold 10px Impact"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#111"; ctx.fillRect(x + PAD, y + 6, ctx.measureText(V.name).width + 8, 12);
    ctx.fillStyle = V.accent === "#e7e1d3" ? "#fff" : V.accent;
    ctx.fillText(V.name, x + PAD + 4, y + 15);
    // text
    ctx.fillStyle = "#14161a"; ctx.font = "13px 'Arial Narrow', 'Helvetica Neue', sans-serif";
    M.lines.forEach((l, i) => ctx.fillText(l, x + PAD, y + PAD + 20 + i * LH));
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw(ctx) {
    // stack from the bottom middle upward: play-by-play low (primary), colour
    // above it. Both centred, well clear of the bottom-corner body/respect bars.
    const stack = [];
    if (state.pbp) stack.push({ b: state.pbp, v: "pbp" });
    if (state.color) stack.push({ b: state.color, v: "color" });
    let bottomY = H - 70;
    for (const it of stack) {
      const M = measure(ctx, it.b);
      drawBubbleAt(ctx, it.b, it.v, W / 2, bottomY, M);
      bottomY -= (M.boxH + 10);
    }
  }

  PCW.Commentary = { reset, say, update, draw };
})();
