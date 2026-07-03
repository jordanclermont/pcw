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

  function drawBubble(ctx, b, voice) {
    const V = VOICES[voice];
    const pad = 9, lh = 15, bw = 250;
    ctx.font = "13px 'Arial Narrow', 'Helvetica Neue', sans-serif";
    const lines = wrap(ctx, b.text, bw - pad * 2);
    const innerW = Math.min(bw - pad * 2, Math.max(60, ...lines.map(l => ctx.measureText(l).width)));
    const boxW = innerW + pad * 2, boxH = lines.length * lh + pad * 2 + 8;
    // anchor at the bottom corners, above the body/respect gauges and clear
    // of the ring centre, so the two bubbles can never collide.
    const anchorY = H - 106;                        // bubble bottom sits here
    const x = V.side === "L" ? 24 : W - 24 - boxW;
    const y = anchorY - boxH;
    ctx.save();
    ctx.globalAlpha = Math.min(1, b.ttl / 30);
    // pop-in scale for the first few frames
    if (b.age < 6) {
      const s = 0.7 + 0.3 * (b.age / 6);
      ctx.translate(x + boxW / 2, y + boxH); ctx.scale(s, s); ctx.translate(-(x + boxW / 2), -(y + boxH));
    }
    // bubble body (comic cream with a hard black outline)
    roundRect(ctx, x, y, boxW, boxH, 8);
    ctx.fillStyle = "#f4efe2"; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = "#111"; ctx.stroke();
    // tail pointing down toward the desk/ringside
    const tx = V.side === "L" ? x + 26 : x + boxW - 26;
    ctx.beginPath();
    ctx.moveTo(tx - 7, y + boxH - 1); ctx.lineTo(tx + 7, y + boxH - 1);
    ctx.lineTo(V.side === "L" ? tx - 4 : tx + 4, y + boxH + 12); ctx.closePath();
    ctx.fillStyle = "#f4efe2"; ctx.fill(); ctx.strokeStyle = "#111"; ctx.lineWidth = 2.5; ctx.stroke();
    // speaker tag
    ctx.font = "bold 10px Impact"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#111"; ctx.fillRect(x + pad, y + 6, ctx.measureText(V.name).width + 8, 12);
    ctx.fillStyle = V.accent === "#e7e1d3" ? "#fff" : V.accent;
    ctx.fillText(V.name, x + pad + 4, y + 15);
    // text
    ctx.fillStyle = "#14161a"; ctx.font = "13px 'Arial Narrow', 'Helvetica Neue', sans-serif";
    lines.forEach((l, i) => ctx.fillText(l, x + pad, y + pad + 20 + i * lh));
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
    if (state.pbp) drawBubble(ctx, state.pbp, "pbp");
    if (state.color) drawBubble(ctx, state.color, "color");
  }

  PCW.Commentary = { reset, say, update, draw };
})();
