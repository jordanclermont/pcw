/* ============================================================
   PCW — referee.js  (v0.15)
   The third man in the ring (bible §5.7). He is part of the LOCKER
   ROOM, not the show: the crowd sees an ordinary picture (a ref
   staying out of the way, sliding in to count, checking on a man
   who's hurt) and never reacts to him. Only the performers get what
   he carries.

   What he does:
     - stays out of the way, on the far side of the action
     - slides in to count a pin; the count doesn't start until he's
       down there, and each count is his hand hitting the mat
     - ONE bias rule: he counts faster on a man who's gone off the
       sheet (a worker who shoots gets no favours)
     - checks on a man who's down and selling — and that's when he
       passes on Gorilla's messages: time, the crowd, injuries, and
       the one call that changes the match, GO HOME. The downed man
       answers it with his body: stay down = agree (cut to the finish),
       get up = wave it off. Either way the office remembers (Respect).
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;
  const G = PCW.G;
  const S = PCW.S;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const REF = {
    WALK: 0.045, SLIDE: 0.2,      // grid units / tick: normal, and diving in to count
    STANDOFF: 2.6,                // how far he keeps from the action
    CHECK_AFTER: 12,              // a man down this long: the ref heads over to check on him
    CHECK_LEN: 80,                // how long a check lasts (frames)
    OFFER_LEN: 150,               // how long a GO HOME call waits for an answer
    CHECK_COOLDOWN: 420,          // min frames between checks
    FRAMES_PER_SPOT: 540,         // office's time budget per spot before the finish (~9 s)
    COLD_LEAN: 25, COLD_FOR: 300, // front row this low for this long = "they're dying"
    FAST_COUNT: 0.1,              // count speed-up per shoot by the pinned man (max 3)
    RESPECT_LISTEN: 4, RESPECT_IGNORE: -4
  };
  PCW.REF = REF;

  class Referee {
    constructor() {
      this.gx = PCW.GRID / 2; this.gy = PCW.BOUND_LO + 1.2;
      this.state = "STAND";       // STAND | MOVE | SLIDE | COUNT | CHECK
      this.stateFrame = 0; this.gait = 0; this.facing = 1;
      this.checkTarget = null; this.checkCool = 0; this.checkedThisDown = null;
      this.whisper = null;        // { text, to, ttl, ttlMax }
      this.offer = null;          // { to, frame } — a live GO HOME call
      this.offers = 0;            // how many GO HOME calls tonight
      this.coldFor = 0;
      this.said = {};             // one-shot messages already passed on
    }

    setState(s) { if (this.state !== s) { this.state = s; this.stateFrame = 0; } }

    /* the middle of the match (everything before the protected finish) */
    middleLeft() {
      const m = G.match, tailStart = m.script.length - PCW.SPOT_TAIL.length;
      return Math.max(0, tailStart - m.spot);
    }
    budget() { return (G.match.script.length - PCW.SPOT_TAIL.length) * REF.FRAMES_PER_SPOT; }

    /* ---- the count ---- */
    pinSpot(pin) {
      const d = pin.defender;
      return { gx: clamp(d.gx + 0.9, PCW.BOUND_LO, PCW.BOUND_HI), gy: clamp(d.gy - 0.9, PCW.BOUND_LO, PCW.BOUND_HI) };
    }
    atPin() { return this.state === "COUNT"; }
    /* frames per count on this man — faster if he's been off the sheet */
    countFrames(def) {
      const sh = Math.min(3, def.shoots || 0);
      return Math.round(PCW.FRAMES.PIN_COUNT * (1 - REF.FAST_COUNT * sh));
    }

    /* ---- per-tick (60 Hz logic) ---- */
    update() {
      this.stateFrame++;
      if (this.checkCool > 0) this.checkCool--;
      if (this.whisper && --this.whisper.ttl <= 0) this.whisper = null;
      const crowd = G.crowd;
      this.coldFor = crowd.lean <= REF.COLD_LEAN ? this.coldFor + 1 : 0;

      // a pin always wins his attention: slide in and get down to count
      if (G.pin) {
        this.cancelOffer();
        const t = this.pinSpot(G.pin);
        if (this.state !== "COUNT") {
          if (this.moveTo(t, REF.SLIDE, 0.25)) {
            this.setState("COUNT");
            PCW.log("REF: slides in to count.");
          } else this.setState("SLIDE");
        }
        return;
      }
      if (this.state === "COUNT") this.setState("STAND");

      // checking on a man who's down
      if (this.state === "CHECK") {
        const w = this.checkTarget;
        if (!w || w.state !== S.DOWN) { this.endCheck(); return; }
        if (this.offer) {
          this.offer.frame++;
          if (this.offer.frame >= REF.OFFER_LEN) this.acceptOffer();
          return;
        }
        if (this.stateFrame >= REF.CHECK_LEN) this.endCheck();
        return;
      }

      // someone down and selling, not being covered? go and check on him
      const downed = [G.P1, G.P2].find(w => w.state === S.DOWN && w.stateFrame >= REF.CHECK_AFTER && this.checkedThisDown !== w.downId);
      if (downed && this.checkCool <= 0 && !G.superplex && G.match.phase === "MATCH") {
        const t = { gx: clamp(downed.gx - 0.8, PCW.BOUND_LO, PCW.BOUND_HI), gy: clamp(downed.gy + 0.8, PCW.BOUND_LO, PCW.BOUND_HI) };
        if (this.moveTo(t, REF.WALK * 1.6, 0.3)) this.beginCheck(downed);
        else this.setState("MOVE");
        return;
      }

      // otherwise: stay out of the way, on the far side of the action
      const a = G.P1, b = G.P2;
      const mx = (a.gx + b.gx) / 2, my = (a.gy + b.gy) / 2;
      let px = -(b.gy - a.gy), py = b.gx - a.gx; const pm = Math.hypot(px, py) || 1; px /= pm; py /= pm;
      // pick the perpendicular that sits further BACK on screen, so he never blocks the view
      if (PCW.isoY(mx + px, my + py) > PCW.isoY(mx - px, my - py)) { px = -px; py = -py; }
      const t = { gx: clamp(mx + px * REF.STANDOFF, PCW.BOUND_LO + 0.3, PCW.BOUND_HI - 0.3),
                  gy: clamp(my + py * REF.STANDOFF, PCW.BOUND_LO + 0.3, PCW.BOUND_HI - 0.3) };
      if (this.moveTo(t, REF.WALK, 0.35)) this.setState("STAND"); else this.setState("MOVE");
      this.facing = (mx - my) >= (this.gx - this.gy) ? 1 : -1;
    }

    /* step toward t; true once arrived. He walks AROUND the wrestlers, not
       through them (a gentle push away from anyone he's about to walk into),
       except when sliding in to count. */
    moveTo(t, speed, near) {
      const dx = t.gx - this.gx, dy = t.gy - this.gy, d = Math.hypot(dx, dy);
      if (d <= near) return true;
      const s = Math.min(speed, d);
      let mx = dx / d, my = dy / d;
      if (speed < REF.SLIDE) for (const w of [G.P1, G.P2]) {
        const ox = this.gx - w.gx, oy = this.gy - w.gy, od = Math.hypot(ox, oy);
        if (od < 1.6 && od > 0.001) { const k = (1.6 - od) / 1.6 * 1.4; mx += ox / od * k; my += oy / od * k; }
      }
      const mm = Math.hypot(mx, my) || 1;
      this.gx = clamp(this.gx + mx / mm * s, PCW.BOUND_LO, PCW.BOUND_HI);
      this.gy = clamp(this.gy + my / mm * s, PCW.BOUND_LO, PCW.BOUND_HI);
      this.gait += 0.3;
      if (Math.abs(dx - dy) > 0.01) this.facing = (dx - dy) >= 0 ? 1 : -1;
      return false;
    }

    beginCheck(w) {
      this.setState("CHECK"); this.checkTarget = w; this.checkedThisDown = w.downId;
      this.facing = (w.gx - w.gy) >= (this.gx - this.gy) ? 1 : -1;
      const msg = this.pickMessage(w);
      if (!msg) return;
      if (msg.offer) {
        this.offer = { to: w, frame: 0, why: msg.why };
        this.offers++;
        this.whisperTo(w, msg.text, REF.OFFER_LEN);
        PCW.log("REF (from Gorilla) to " + w.short + ": " + msg.text + "  — stay down = agree, get up = wave it off.", "shoot");
      } else {
        this.whisperTo(w, msg.text, 200);
        PCW.log("REF (from Gorilla) to " + w.short + ": " + msg.text, "ok");
      }
    }
    endCheck() { this.setState("STAND"); this.checkTarget = null; this.checkCool = REF.CHECK_COOLDOWN; }

    whisperTo(w, text, ttl) { this.whisper = { text, to: w, ttl, ttlMax: ttl }; }

    /* what Gorilla wants passed on right now (most urgent first) */
    pickMessage(w) {
      const m = G.match, crowd = G.crowd, other = w === G.P1 ? G.P2 : G.P1;
      const mid = this.middleLeft(), clock = crowd.clock;
      // GO HOME — the one call that changes the match (at most twice a night)
      if (mid >= 1 && this.offers < 2) {
        if (clock > this.budget()) return { offer: true, why: "time", text: "Gorilla says you're running long — GO HOME." };
        if (this.coldFor >= REF.COLD_FOR && mid >= 2) return { offer: true, why: "cold", text: "Gorilla says they're dying out there — GO HOME." };
      }
      // injuries — backstage truth the crowd can't see
      if (w.body < 35 && !this.said["hurt" + w.id]) { this.said["hurt" + w.id] = 1; return { text: "You okay? Gorilla says protect yourself — take it easy." }; }
      if (other.body < 35 && !this.said["hurt" + other.id]) { this.said["hurt" + other.id] = 1; return { text: "Gorilla says he's really banged up — ease up on him." }; }
      // the crowd, as Gorilla sees it on the monitor
      if (crowd.lean >= 65 && !this.said.hot) { this.said.hot = 1; return { text: "Gorilla loves it — keep doing what you're doing." }; }
      if (crowd.lean <= 32 && !this.said.cold) { this.said.cold = 1; return { text: "Gorilla says they're sitting on their hands — change something up." }; }
      // time
      if (mid >= 2 && clock > this.budget() * 0.45 && !this.said.time) { this.said.time = 1; return { text: "Gorilla says you're fine on time — let it breathe." }; }
      return null;
    }

    /* ---- the GO HOME call, answered with the body ---- */
    offerFor(w) { return this.offer && this.offer.to === w ? this.offer : null; }
    acceptOffer() {
      const o = this.offer; this.offer = null;
      const w = o.to;
      PCW.awardRespect(w.id, REF.RESPECT_LISTEN);
      this.whisperTo(w, "Okay — taking it home.", 90);
      PCW.log(w.short + " stays down and nods — they're GOING HOME. The office likes a worker who listens.", "ok");
      if (PCW.goHome) PCW.goHome();
      this.endCheck();
    }
    /* the downed man got up during the call = waved it off */
    onGetUp(w) {
      if (!this.offerFor(w)) return;
      this.offer = null;
      PCW.awardRespect(w.id, REF.RESPECT_IGNORE);
      this.whisperTo(w, "Suit yourself...", 80);
      PCW.log(w.short + " gets up on the ref — WAVED OFF Gorilla's go-home call. The office noticed.", "shoot");
      this.endCheck();
    }
    cancelOffer() { if (this.offer) { this.offer = null; this.whisper = null; } }

    /* ============================================================
       DRAWING — a jointed figure like the wrestlers, in stripes
       ============================================================ */
    draw(ctx) {
      const x = PCW.isoX(this.gx, this.gy), y = PCW.isoY(this.gx, this.gy);
      const sc = 1.15, U = 13 * sc, f = this.facing;
      const sk = "#e7e1d3", dark = "#15161b", shirt = "#f2f0ea";
      const seg = (a, b, wd, col) => { ctx.lineCap = "round"; ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };

      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(x, y, 18 * sc, 7 * sc, 0, 0, 7); ctx.fill();
      ctx.translate(x, y);

      let pelvisY = -2.6 * U, chestY = pelvisY - 1.8 * U, headY = chestY - 1.1 * U, lean = 0;
      let footL = { x: -.45 * U, y: 0 }, footR = { x: .45 * U, y: 0 };
      let handL = null, handR = null;
      const moving = this.state === "MOVE" || this.state === "SLIDE";
      if (moving) {
        const p = this.gait;
        footL = { x: f * Math.sin(p) * 1.1 * U, y: -Math.max(0, Math.cos(p)) * .45 * U };
        footR = { x: f * Math.sin(p + Math.PI) * 1.1 * U, y: -Math.max(0, Math.cos(p + Math.PI)) * .45 * U };
        lean = f * (this.state === "SLIDE" ? 14 : 4);
      }
      if (this.state === "COUNT") {
        // down on the mat beside the pin, slapping the count
        const pin = G.pin, per = pin ? this.countFrames(pin.defender) : 60;
        const ph = pin ? (pin.frame % per) / per : 0;
        pelvisY = -1.0 * U; chestY = pelvisY - 0.4 * U; headY = chestY - 0.9 * U; lean = f * 60;
        footL = { x: -f * 1.6 * U, y: 0 }; footR = { x: -f * 2.0 * U, y: -2 };
        const up = ph < 0.8 ? Math.sin(ph / 0.8 * Math.PI / 2) : 1 - (ph - 0.8) / 0.2;   // raise… slap
        handL = { x: f * 1.0 * U, y: chestY - up * 1.6 * U + (1 - up) * 1.0 * U };
      } else if (this.state === "CHECK") {
        // crouched over the downed man, one hand on him, leaning in to talk
        pelvisY = -1.5 * U; chestY = pelvisY - 1.4 * U; headY = chestY - 1.0 * U; lean = f * 22;
        footL = { x: -.6 * U, y: 0 }; footR = { x: .5 * U, y: 0 };
        handL = { x: f * 1.4 * U, y: -0.6 * U };
      }

      ctx.rotate(lean * Math.PI / 180 * 0.4);
      const pelvis = { x: 0, y: pelvisY }, chest = { x: 0, y: chestY }, head = { x: f * 1, y: headY };
      const hipL = { x: -.35 * U, y: pelvisY }, hipR = { x: .35 * U, y: pelvisY };
      const kneeL = { x: (hipL.x + footL.x) / 2 + f * .3 * U, y: (hipL.y + footL.y) / 2 };
      const kneeR = { x: (hipR.x + footR.x) / 2 + f * .3 * U, y: (hipR.y + footR.y) / 2 };
      const shL = { x: -.5 * U, y: chestY + 2 }, shR = { x: .5 * U, y: chestY + 2 };
      if (!handL) handL = { x: shL.x - f * .2 * U, y: pelvisY + .3 * U };
      if (!handR) handR = { x: shR.x + f * .2 * U, y: pelvisY + .3 * U };

      seg(hipR, kneeR, 5 * sc, dark); seg(kneeR, footR, 4.4 * sc, dark);     // trousers
      seg(shR, handR, 3.8 * sc, sk);
      // the striped shirt: white torso, black vertical pinstripes
      seg(pelvis, chest, 10 * sc, shirt);
      ctx.strokeStyle = dark; ctx.lineWidth = 1.3;
      for (const o of [-3, 0, 3]) { ctx.beginPath(); ctx.moveTo(pelvis.x + o, pelvis.y); ctx.lineTo(chest.x + o, chest.y); ctx.stroke(); }
      seg(hipL, kneeL, 5.2 * sc, dark); seg(kneeL, footL, 4.6 * sc, dark);
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.ellipse(footL.x + f * 2, footL.y, 3.6 * sc, 2 * sc, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(footR.x + f * 2, footR.y, 3.6 * sc, 2 * sc, 0, 0, 7); ctx.fill();
      seg(shL, handL, 4 * sc, sk);
      ctx.fillStyle = sk; ctx.strokeStyle = dark; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(head.x, head.y, 4.2 * sc, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#3a3026"; ctx.beginPath(); ctx.arc(head.x, head.y - 1, 4.2 * sc, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
      ctx.restore();

      ctx.font = "bold 9px Oswald, Impact"; ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0,0,0,.75)"; ctx.lineWidth = 3;
      ctx.strokeText("REF", x, y + 16); ctx.fillStyle = "#d8dbe0"; ctx.fillText("REF", x, y + 16);
    }

    /* the whisper — Gorilla's message, styled as backstage (not broadcast).
       Docked top-left like an earpiece feed, with a dashed line to the ref,
       so it never covers the wrestlers' cues. (The downed man's own cue
       carries the stay-down / move choice.) */
    drawWhisper(ctx) {
      const wh = this.whisper; if (!wh) return;
      const x = PCW.isoX(this.gx, this.gy), y = PCW.isoY(this.gx, this.gy) - 40;
      const a = Math.min(1, wh.ttl / 20, (wh.ttlMax - wh.ttl + 1) / 8);
      ctx.save(); ctx.globalAlpha = a;
      ctx.font = "bold 14px Oswald, Impact";
      const offer = this.offerFor(wh.to);
      const lines = [wh.text];
      const w = Math.max(250, ...lines.map(l => ctx.measureText(l).width)) + 24, h = 30 + lines.length * 18;
      const bx = 14, by = 150;
      ctx.strokeStyle = offer ? "rgba(232,185,35,.6)" : "rgba(160,165,175,.5)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(bx + w / 2, by + h); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "rgba(14,14,18,.92)"; ctx.fillRect(bx, by, w, h);
      ctx.strokeStyle = offer ? "#e8b923" : "#8a8f99"; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
      ctx.strokeRect(bx, by, w, h); ctx.setLineDash([]);
      ctx.textAlign = "left";
      ctx.font = "bold 9px Oswald, Impact"; ctx.fillStyle = "#e8b923";
      ctx.fillText("REF · FROM GORILLA  (the crowd can't hear this)", bx + 12, by + 13);
      ctx.font = "bold 14px Oswald, Impact";
      lines.forEach((l, i) => { ctx.fillStyle = offer ? "#ffd27a" : "#f4efe2"; ctx.fillText(l, bx + 12, by + 32 + i * 18); });
      if (offer) {
        const t = 1 - offer.frame / REF.OFFER_LEN;
        ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(bx + 12, by + h - 6, w - 24, 3);
        ctx.fillStyle = "#e8b923"; ctx.fillRect(bx + 12, by + h - 6, (w - 24) * t, 3);
      }
      ctx.restore();
    }
  }

  PCW.Referee = Referee;
})();
