/* ============================================================
   PCW — crowd.js
   CROWD MODEL v1. The crowd is an engine with desires, not a meter
   that dispenses points. It answers to ONE question about every
   event: "could a person in row twelve actually see this?"

   It reacts to the PICTURE (who hit whom, what move, how clean,
   where in the story) and NEVER to the plan. Botches it can't
   detect cost trust and bodies backstage — not heat. Those live in
   the engine's work layer and never touch this file.

   State it carries:
     heat        (0–100) the public score. Decays when nothing lands.
     resentment  built by heel control; spent to amplify the comeback.
     belief      the crowd's limited supply for big moves / near-falls.
     restless    rises when the match stalls; triggers a hijack chant.
     expected    the story stage the crowd currently WANTS (its own
                 clock, independent of the script).
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;

  const ORDER = ["opener", "heat", "comeback", "finish"];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  class CrowdModel {
    constructor() {
      this.buildSpectators();
      this.reset();
    }

    reset() {
      this.heat = 32;
      this.resentment = 0;
      this.belief = 100;
      this.restless = 0;
      this.sinceReaction = 0;
      this.expected = "opener";
      this.hijack = null;          // { cat, label, hint, target, ttl, ttlMax }
      this.chantCooldown = 0;
      this.lastRole = null;
      this.flashes = [];
      this.floaters = [];          // world-anchored reaction popups
      this.strobe = 0;
      this.primed = false;         // resentment high enough to pay a comeback
      this.popTimer = 0;
      this.booTimer = 0;
      this.stamp = null;
      this.heatSum = 0;
      this.ticks = 0;
    }

    /* resentment threshold at which a comeback cashes in big */
    static get PRIMED() { return 55; }

    addHeat(v) { this.heat = clamp(this.heat + v, 0, 100); }
    avgHeat() { return this.heatSum / Math.max(1, this.ticks); }

    /* the crowd's own sense of where the story should be, from how
       far the match has progressed (NOT from any single spot's tag). */
    setProgress(done, total) {
      const f = done / Math.max(1, total);
      this.expected = f < 0.25 ? "opener" : f < 0.65 ? "heat" : f < 0.85 ? "comeback" : "finish";
    }

    arcMultiplier(slot) {
      if (!slot || slot === "transition") return 0.9;
      const d = Math.abs(ORDER.indexOf(slot) - ORDER.indexOf(this.expected));
      return d === 0 ? 1.15 : d === 1 ? 0.95 : 0.6;
    }

    /* ---- the one entry point. ev is the VISIBLE picture ----
       ev = { picture, role, base, quality, arcSlot, big, actor } */
    react(ev) {
      const face = ev.role === "face";
      const q = ev.quality == null ? 1 : ev.quality;
      const base = ev.base || 6;
      const arcMult = this.arcMultiplier(ev.arcSlot);
      const bankedBefore = this.resentment;   // for detecting a comeback payoff

      // a big move before the crowd is ready reads as premature —
      // it earns a fraction and spends future belief.
      const early = ev.big && (this.expected === "opener" || this.expected === "heat");

      let delta;
      if (face) {
        let al = 1.35;                                  // the crowd's guy
        if (ev.arcSlot === "comeback" || ev.arcSlot === "finish") al += this.resentment / 120;
        delta = base * arcMult * q * al;
      } else {
        // an engaged, hostile crowd still runs hot while it jeers,
        // but the heel's offence banks resentment for the comeback.
        delta = base * arcMult * q * 0.55;
        this.resentment = clamp(this.resentment + base * 0.7, 0, 100);
      }

      if (ev.big || ev.picture === "nearfall" || ev.picture === "kickout") {
        delta *= 0.5 + 0.5 * this.belief / 100;
        this.belief = Math.max(0, this.belief - (ev.big ? 22 : 8));
      }
      if (early) { delta *= 0.35; this.belief = Math.max(0, this.belief - 25); }

      if (face && (ev.arcSlot === "comeback" || ev.arcSlot === "finish")) this.resentment *= 0.45;

      delta = Math.round(delta);
      this.addHeat(delta);
      this.sinceReaction = 0;
      this.restless = Math.max(0, this.restless - 30);
      this.lastRole = ev.role;

      this.serve(ev);

      // tone: a pop or a jeer, decided by what the crowd is looking at.
      const cheerPicture = ev.picture === "reversal" || ev.picture === "kickout" ||
        ev.picture === "nearfall" || ev.picture === "pin";
      const tone = (face || cheerPicture) ? "pop" : "boo";
      const payoff = face && (ev.arcSlot === "comeback" || ev.arcSlot === "finish") && bankedBefore >= 30;
      this.show(tone, delta, ev, payoff);
      return delta;
    }

    show(tone, delta, ev, payoff) {
      this.lastTone = tone;   // so the engine can price a shoot's respect
      const big = delta >= 12 || ev.big;
      this.stamp = { text: tone === "pop" ? (big ? "POP!" : "pop") : "BOO", big, t: 40 };

      // world-anchored popup off the wrestler who did the visible thing —
      // the player's eyes are already on them.
      const a = ev.actor;
      if (a) {
        let text, color, size;
        if (tone === "boo") { text = "HEEL HEAT"; color = "#ff5a5a"; size = 15; }
        else if (payoff && delta >= 12) { text = ev.arcSlot === "finish" ? "1-2-3!" : "COMEBACK!"; color = "#ffd27a"; size = 30; }
        else if (ev.picture === "kickout") { text = "KICK OUT!"; color = "#fff2c8"; size = 26; }
        else if (big) { text = "BIG POP!"; color = "#ffb45a"; size = 24; }
        else if (ev.picture === "weakstrike") { text = "...flat"; color = "#9a938a"; size = 13; }
        else { text = "POP", color = "#ffb45a"; size = 17; }
        this.floater(a, text, color, size);
      }

      if (tone === "pop") {
        this.popTimer = Math.max(this.popTimer, big ? 46 : 30);
        if (delta >= 6) this.flash(14 + delta * 4);
        if ((ev.big || ev.picture === "kickout" || delta >= 18) && this.heat > 55) this.strobe = 12;
      } else {
        this.booTimer = 46;
      }
      const who = a ? a.short : "";
      if (tone === "pop") {
        PCW.log("Crowd: they erupt" + (who ? " for " + who : "") + " (+" + delta + " heat)", "ok");
      } else {
        PCW.log("Crowd: heat pours down on " + (who || "the champ") + " (+" + delta + " heat)", "bad");
      }
    }

    floater(w, text, color, size) {
      this.floaters.push({
        x: PCW.isoX(w.gx, w.gy), y: PCW.isoY(w.gx, w.gy) - 70,
        text, color, size, life: 48, age: 0, vy: -0.8
      });
    }

    /* which chant categories a visible event answers */
    eventCats(ev) {
      const cats = new Set(["ACTION"]);
      if (ev.role === "face") cats.add("FACE");
      if (ev.big) cats.add("BIG");
      return cats;
    }
    /* would this event answer the live chant? (no state change) —
       the engine asks this to decide whether an off-script move is a
       sanctioned audible or a genuine shoot. */
    wouldServe(ev) {
      return !!this.hijack && this.eventCats(ev).has(this.hijack.cat);
    }

    /* ---- restlessness serves a single hijack chant ---- */
    serve(ev) {
      if (!this.hijack) return;
      if (this.eventCats(ev).has(this.hijack.cat)) {
        this.addHeat(8);
        this.flash(60);
        if (ev.actor) {
          this.floater(ev.actor, "YES!", "#8fffa8", 28);
          // playing to the crowd earns RESPECT (doing it for the fans)
          PCW.awardRespect(ev.actor.id, PCW.RESPECT.SERVE_CHANT);
          this.floater(ev.actor, "+RESPECT", "#f0c65a", 13);
        }
        PCW.log("They answer the '" + this.hijack.label + "' chant — the place lights up!", "ok");
        this.hijack = null;
        this.chantCooldown = 600;
      }
    }

    fireHijack() {
      let cat, label, hint, target;
      if (this.lastRole === "heel" || this.heat < 40) {
        cat = "FACE"; label = "LET'S GO STOVE HOT";
        hint = "GIVE THEM STOVE HOT — hit back as the face";
        target = "p1";                 // point the player at Stove
      } else {
        cat = "ACTION"; label = "WE WANT ACTION";
        hint = "PICK UP THE PACE — land a spot, any spot";
        target = null;
      }
      this.hijack = { cat, label, hint, target, ttl: 360, ttlMax: 360 };
      PCW.log("Crowd hijack: a '" + label + "' chant breaks out. Serve it or lose them.", "shoot");
    }

    /* ---- per-tick upkeep (called on the 60 Hz logic step) ---- */
    update() {
      this.ticks++; this.heatSum += this.heat;
      if (this.popTimer > 0) this.popTimer--;
      if (this.booTimer > 0) this.booTimer--;
      if (this.strobe > 0) this.strobe--;
      if (this.chantCooldown > 0) this.chantCooldown--;
      if (this.stamp && --this.stamp.t <= 0) this.stamp = null;

      this.sinceReaction++;
      if (this.sinceReaction > 300) this.restless = clamp(this.restless + 0.15, 0, 100);
      else this.restless = Math.max(0, this.restless - 0.05);

      const decay = 0.008 + this.restless * 0.0006 + (this.hijack ? 0.01 : 0);
      this.heat = Math.max(0, this.heat - decay);
      this.belief = Math.min(100, this.belief + 0.02);

      if (this.hijack) {
        this.hijack.ttl--;
        if (this.hijack.ttl <= 0) {
          this.heat = Math.max(0, this.heat - 6);
          this.restless = clamp(this.restless + 20, 0, 100);
          PCW.log("The '" + this.hijack.label + "' chant dies unanswered — they're getting restless.", "bad");
          this.hijack = null;
          this.chantCooldown = 300;
        }
      } else if (this.sinceReaction > 420 && this.chantCooldown <= 0) {
        this.fireHijack();
      }

      for (const f of this.flashes) f.life--;
      this.flashes = this.flashes.filter(f => f.life > 0);

      for (const fl of this.floaters) { fl.age++; fl.y += fl.vy; }
      this.floaters = this.floaters.filter(fl => fl.age < fl.life);

      // the crowd is primed once it has banked enough resentment during
      // heel control — this is the "comeback will pay off NOW" window.
      this.primed = this.resentment >= CrowdModel.PRIMED &&
        (this.expected === "heat" || this.expected === "comeback");
    }

    /* ============================================================
       VISUALS — flashbulbs are the signature reward (bible §9):
       camera flashes ripple through the dark crowd on big pops.
       ============================================================ */
    buildSpectators() {
      const W = PCW.CANVAS.W;
      this.spec = [];
      for (let row = 0; row < 3; row++) {
        const y = 44 + row * 26, n = 16 + row * 3;
        for (let i = 0; i < n; i++) {
          const x = 40 + (i + Math.random() * 0.6) * (W - 80) / n;
          this.spec.push({
            x, y: y + Math.random() * 8,
            sc: 0.8 + row * 0.18 + Math.random() * 0.12,
            seed: Math.random() * 100, sign: Math.random() < 0.05
          });
        }
      }
      // parody-safe crowd signs: pro-Stove, anti-Boulder, no trademarks.
      const texts = ["LIGHT THE BURNER", "BOULDER = SELLOUT", "WE WANT STOVE",
        "OFFICE STOOGE", "STOVE HOT IS OUR GUY", "GRANITE CHUMP"];
      let si = 0;
      for (const m of this.spec) if (m.sign) m.signText = texts[si++ % texts.length];
    }

    flash(power) {
      const n = Math.min(140, Math.round(power));
      for (let i = 0; i < n; i++) {
        const m = this.spec[(Math.random() * this.spec.length) | 0];
        this.flashes.push({
          x: m.x + (Math.random() - 0.5) * 12,
          y: m.y - 6 + (Math.random() - 0.5) * 10,
          r: 2.6 + Math.random() * 3.4,
          life: 7 + (Math.random() * 6 | 0),
          delay: (i % 6) * 2
        });
      }
    }

    draw(ctx, rf) {
      const W = PCW.CANVAS.W;
      // dark arena band behind the crowd, so flashbulbs read.
      const g = ctx.createLinearGradient(0, 0, 0, 150);
      g.addColorStop(0, "rgba(9,11,22,0.9)");
      g.addColorStop(1, "rgba(9,11,22,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, 150);

      const popping = this.popTimer > 0;
      for (const m of this.spec) {
        const sway = Math.sin(rf * 0.04 + m.seed) * 1.5;
        const excited = popping && ((m.seed * 7) % 3 < 2 || this.heat > 70);
        ctx.save();
        ctx.translate(m.x + sway, m.y);
        // silhouette body + head
        ctx.fillStyle = "#0b0e1a";
        ctx.fillRect(-7 * m.sc, -4 * m.sc, 14 * m.sc, 10 * m.sc);
        ctx.beginPath(); ctx.arc(0, -8 * m.sc, 4.4 * m.sc, 0, 7); ctx.fill();
        // faint rim so they read against the black band
        ctx.strokeStyle = "rgba(150,170,210,.18)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, -8 * m.sc, 4.4 * m.sc, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        if (excited) {
          ctx.strokeStyle = "rgba(200,210,235,.5)"; ctx.lineWidth = 1.6;
          const wig = Math.sin(rf * 0.5 + m.seed) * 2;
          ctx.beginPath();
          ctx.moveTo(-6 * m.sc, -2); ctx.lineTo(-9 * m.sc, -14 * m.sc + wig);
          ctx.moveTo(6 * m.sc, -2); ctx.lineTo(9 * m.sc, -14 * m.sc - wig);
          ctx.stroke();
        }
        if (m.sign && !excited) {
          ctx.fillStyle = "#f4efe2"; ctx.strokeStyle = "#111"; ctx.lineWidth = 1.2;
          ctx.fillRect(-16, -26, 32, 12); ctx.strokeRect(-16, -26, 32, 12);
          ctx.fillStyle = "#111"; ctx.font = "4.5px 'Courier New'"; ctx.textAlign = "center";
          ctx.fillText(m.signText, 0, -18);
        }
        ctx.restore();
      }

      // booing overlay
      if (this.booTimer > 0) {
        ctx.font = "bold 15px Impact"; ctx.fillStyle = "rgba(230,235,250,.7)";
        for (let i = 0; i < 4; i++) {
          ctx.save();
          ctx.translate(120 + i * 220 + Math.sin(rf * .2 + i) * 6, 62 + ((i * 37) % 40));
          ctx.rotate((i % 2 ? -1 : 1) * 0.08);
          ctx.fillText("BOO", 0, 0); ctx.restore();
        }
      }

      // flashbulbs — white pinpricks firing in waves, with additive bloom
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const f of this.flashes) {
        if (f.delay > 0) { f.delay--; continue; }
        const a = f.life / 12;
        ctx.globalAlpha = Math.min(1, a);
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 5);
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(0.35, "rgba(235,240,255,.7)");
        grad.addColorStop(1, "rgba(200,215,255,0)");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 5, 0, 7); ctx.fill();
        ctx.globalAlpha = Math.min(1, a * 1.3);
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.8, 0, 7); ctx.fill();
      }
      ctx.restore();
      // NOTE: the full-arena strobe and the hijack banner are drawn by the
      // render HUD layer, ON TOP of the wrestlers, so they can't be occluded.
    }
  }

  PCW.CrowdModel = CrowdModel;
})();
