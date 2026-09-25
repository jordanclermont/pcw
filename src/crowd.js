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
     heat        (0–100) the public score — how LOUD they are. Decays
                 when nothing lands.
     lean        (0–100) how much they're INTO it — the front row
                 leaning forward vs sitting back (Shawn Michaels' tell).
                 Separate from heat: a crowd can be loud but drifting.
                 A leaning crowd pops harder; drawn as posture, not a bar.
     resentment  built by heel control; spent to amplify the comeback.
                 Hold the comeback too long and they give up on it.
     belief      the crowd's limited supply for big moves / near-falls.
     restless    rises when the match stalls; triggers a hijack chant.
     seen        what they've already watched tonight. A move they've
                 just seen is worth less the next time (they can't read
                 the plan, but they can get bored of it).
     expected    the story stage the crowd currently WANTS — worked out
                 from what it has SEEN (time since the bell, who has been
                 on offence, whether the comeback has happened), never
                 from the call sheet. Moves are valued by what they LOOK
                 like, never by their booking card.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;

  const ORDER = ["opener", "heat", "comeback", "finish"];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const say = (voice, text) => { if (PCW.Commentary) PCW.Commentary.say(voice, text); };

  /* what each PICTURE is worth to row twelve, before story/fatigue/lean.
     The crowd values the move it sees, not the card it was booked on. */
  const VALUE = {
    strike: 4, weakstrike: 1, slam: 7, bigslam: 13, reversal: 8,
    nearfall: 4, kickout: 9, pin: 20, taunt: 3
  };

  /* the crowd's own clock (logic frames since the bell) */
  const CLOCK = {
    SHINE: 720,       // the first ~12 s: they want to see their guy look good
    LATE: 2400,       // past ~40 s they expect it to be heading home regardless
    GIVE_UP: 660,     // primed this long with no comeback → they start giving up
    SEEN_FADE: 0.9988 // per-tick fade of "we've seen that" (~10 s half-life)
  };

  class CrowdModel {
    constructor() {
      this.buildSpectators();
      this.reset();
    }

    reset() {
      this.heat = 32;
      this.lean = 45;
      this.seen = {};              // picture key → familiarity (fades over time)
      this.clock = 0;              // frames since the bell
      this.faceMoves = 0; this.heelMoves = 0;
      this.heelStreak = 0;         // heel offence in a row, uninterrupted
      this.lastBigAt = -9999;      // when they last saw a big move land
      this.lastMove = null;        // { id, at } — who landed the last move, and when
      this.hopeAt = -9999;         // when the face last flashed a hope spot
      this.primedFor = 0;          // frames spent primed with no comeback
      this.gaveUp = false;
      this.comebackDone = false;
      this.leanBand = 1;           // 0 sitting back · 1 watching · 2 leaning in (for commentary)
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
      this.heatSum = 0; this.leanSum = 0;
      this.ticks = 0;
    }

    /* resentment threshold at which a comeback cashes in big */
    static get PRIMED() { return 55; }

    addHeat(v) { this.heat = clamp(this.heat + v, 0, 100); }
    avgHeat() { return this.heatSum / Math.max(1, this.ticks); }
    avgLean() { return this.leanSum / Math.max(1, this.ticks); }

    /* the crowd's own sense of where the story should be — read off what it
       has SEEN, never off the call sheet. They want their guy to shine early;
       then they'll accept the heel's control while it builds resentment;
       once that's banked they want the comeback; after the comeback (or once
       it's getting late) they want it to go home. */
    updateExpected() {
      if (this.comebackDone || this.clock > CLOCK.LATE) this.expected = "finish";
      else if (this.primed) this.expected = "comeback";
      else if (this.clock < CLOCK.SHINE && this.heelStreak < 3) this.expected = "opener";
      else this.expected = "heat";
    }

    /* the story stage a move LOOKS like from row twelve */
    stageOf(ev) {
      if (ev.taunt) return "transition";
      if (ev.big || ev.picture === "nearfall" || ev.picture === "kickout" || ev.picture === "pin") return "finish";
      if (ev.role === "heel") return "heat";
      if (this.resentment >= 30) return "comeback";
      return this.expected === "opener" ? "opener" : "transition";
    }

    arcMultiplier(stage) {
      if (!stage || stage === "transition") return 0.9;
      const d = Math.abs(ORDER.indexOf(stage) - ORDER.indexOf(this.expected));
      return d === 0 ? 1.15 : d === 1 ? 0.95 : 0.6;
    }

    /* how fresh this looks: a move they just watched is worth less again */
    novelty(key) {
      const fam = this.seen[key] || 0;
      this.seen[key] = fam + 1;
      return Math.pow(0.7, fam);
    }

    moveLean(v) { this.lean = clamp(this.lean + v, 0, 100); }

    /* ---- the one entry point. ev is the VISIBLE picture ----
       ev = { picture, role, quality, big, actor, taunt }. Nothing from the
       booking card: what the move is worth comes from what it looks like. */
    react(ev) {
      const face = ev.role === "face";
      const q = ev.quality == null ? 1 : ev.quality;
      const pic = ev.picture === "slam" && ev.big ? "bigslam" : ev.taunt ? "taunt" : ev.picture;
      const base = VALUE[pic] || 5;
      const stage = this.stageOf(ev);
      const arcMult = this.arcMultiplier(stage);
      const bankedBefore = this.resentment;   // for detecting a comeback payoff
      // (each rung of a count is its own "seen it" — the count BUILDS, but a
      //  night of near-falls wears the two-count out)
      const fresh = this.novelty(pic + ":" + ev.role + (ev.count ? ":" + ev.count : ""));

      // a big move before the crowd is ready reads as premature —
      // it earns a fraction and spends future belief.
      const early = ev.big && (this.expected === "opener" || this.expected === "heat");

      // SURPRISE — only what row twelve could see coming (or not):
      //  · surviving a big move they just watched land ("he kicked out of THAT?")
      //  · the face fighting back out of a long beat-down (a hope spot)
      let surprise = 1;
      if (ev.picture === "kickout" && this.clock - this.lastBigAt < 240) surprise = 1.5;
      const hope = face && !ev.taunt && this.heelStreak >= 3 && !this.primed;
      // a taunt right after YOUR OWN move is selling the moment (the pose over
      // the fallen man) — worth far more than a taunt out of nowhere. Once per move.
      const posed = !!(ev.taunt && ev.actor && this.lastMove && this.lastMove.id === ev.actor.id &&
        !this.lastMove.posed && this.clock - this.lastMove.at < 150);
      if (posed) this.lastMove.posed = true;
      if (hope) { surprise *= 1.2; this.hopeAt = this.clock; }

      let delta;
      if (face) {
        let al = 1.35;                                  // the crowd's guy
        if (stage === "comeback" || stage === "finish") al += this.resentment / 120;
        delta = base * arcMult * q * al;
      } else {
        // an engaged, hostile crowd still runs hot while it jeers,
        // but the heel's offence banks resentment for the comeback —
        // extra if he just cut off the face's hope spot.
        delta = base * arcMult * q * 0.55;
        if (!ev.taunt || this.heelStreak < 4) {
          const cutoff = this.clock - this.hopeAt < 300 ? 10 : 0;
          if (cutoff) { this.hopeAt = -9999; PCW.log("Crowd: he cut off the comeback — they HATE that.", "bad"); }
          if (!this.gaveUp) this.resentment = clamp(this.resentment + base * 1.1 + 2 + cutoff, 0, 100);
        }
      }

      if (ev.big || ev.picture === "nearfall" || ev.picture === "kickout") {
        delta *= 0.5 + 0.5 * this.belief / 100;
        this.belief = Math.max(0, this.belief - (ev.big ? 22 : 8));
      }
      if (early) { delta *= 0.35; this.belief = Math.max(0, this.belief - 25); }

      // freshness, surprise, and whether they're leaning in all scale it.
      const leanMult = 0.6 + 0.8 * this.lean / 100;
      delta *= fresh * surprise * leanMult * (posed ? 2.5 : 1);

      // the front row moves on what's fresh and surprising, and sits back
      // for what's stale, sloppy, or the heel dragging it past the point.
      // (a new move is merely interesting; right-moment and surprise is what
      //  pulls them forward)
      let dl = (fresh - 0.85) * 16 + (surprise - 1) * 30 + (q < 0.6 ? -6 : 0) +
        (arcMult > 1 ? 2 : arcMult < 0.7 ? -4 : 0);
      if (ev.picture === "weakstrike") dl -= 5;
      if (posed) dl += 6;
      if (!face && this.primed && !ev.taunt) dl -= 6;   // "come ON, let him fight back"
      this.moveLean(dl);

      if (face && (stage === "comeback" || stage === "finish") && bankedBefore >= 30) {
        this.resentment *= 0.45;
        this.comebackDone = true;
      }
      if (ev.big) this.lastBigAt = this.clock;
      if (!ev.taunt && ev.actor && ev.picture !== "weakstrike" && ev.picture !== "nearfall") this.lastMove = { id: ev.actor.id, at: this.clock, posed: false };
      if (posed && !face) this.resentment = clamp(this.resentment + 6, 0, 100);   // gloating over his work
      if (!ev.taunt) {
        if (face) { this.faceMoves++; this.heelStreak = 0; }
        else { this.heelMoves++; this.heelStreak++; }
      }

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
      const payoff = face && (stage === "comeback" || stage === "finish") && bankedBefore >= 30;
      this.show(tone, delta, ev, payoff, stage, fresh);
      return delta;
    }

    show(tone, delta, ev, payoff, stage, fresh) {
      this.lastTone = tone;   // so the engine can price a shoot's respect
      const big = delta >= 12 || ev.big;
      this.stamp = { text: tone === "pop" ? (big ? "POP!" : "pop") : "BOO", big, t: 40 };

      // world-anchored popup off the wrestler who did the visible thing —
      // the player's eyes are already on them.
      const a = ev.actor;
      if (a) {
        let text, color, size;
        if (fresh < 0.4 && !ev.big && ev.picture !== "kickout" && ev.picture !== "pin") { text = "...seen it"; color = "#9a938a"; size = 14; }
        else if (tone === "boo") { text = "HEEL HEAT"; color = "#ff5a5a"; size = 15; }
        else if (payoff && delta >= 12) { text = stage === "finish" ? "1-2-3!" : "COMEBACK!"; color = "#ffd27a"; size = 30; }
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
      this.ticks++; this.heatSum += this.heat; this.leanSum += this.lean;
      if (this.popTimer > 0) this.popTimer--;
      if (this.booTimer > 0) this.booTimer--;
      if (this.strobe > 0) this.strobe--;
      if (this.chantCooldown > 0) this.chantCooldown--;
      if (this.stamp && --this.stamp.t <= 0) this.stamp = null;

      this.sinceReaction++;
      if (this.sinceReaction > 300) this.restless = clamp(this.restless + 0.15, 0, 100);
      else this.restless = Math.max(0, this.restless - 0.05);

      this.clock++;
      // a hot crowd cools faster than a mild one — heat has to be KEPT, not banked.
      const decay = 0.008 + this.heat * 0.00014 + this.restless * 0.0006 + (this.hijack ? 0.01 : 0);
      this.heat = Math.max(0, this.heat - decay);
      this.belief = Math.min(100, this.belief + 0.02);

      // "we've seen that" fades, so a move can be fresh again later.
      for (const k in this.seen) this.seen[k] *= CLOCK.SEEN_FADE;
      // the front row drifts back into its seats when nothing's happening.
      if (this.sinceReaction > 180) this.moveLean(-0.02 - this.restless * 0.0004);
      // the drawn posture eases toward the real value so the room SHIFTS, not snaps
      this.leanShown = this.leanShown == null ? this.lean : this.leanShown + (this.lean - this.leanShown) * 0.04;

      // held too long: primed and no comeback → they start giving up on it.
      if (this.primed) {
        this.primedFor++;
        if (this.primedFor > CLOCK.GIVE_UP) {
          if (!this.gaveUp) {
            this.gaveUp = true;
            PCW.log("Crowd: they waited for the comeback too long — they're giving up on it.", "bad");
            say("color", "They've been waiting on Stove to fight back — you can feel them giving up.");
          }
          this.resentment = Math.max(0, this.resentment - 0.08);
          this.moveLean(-0.04);
        }
      } else if (this.resentment < 20) { this.primedFor = 0; this.gaveUp = false; }

      this.updateExpected();

      // commentary calls the front row when it shifts (the readable tell)
      const band = this.lean >= 65 ? 2 : this.lean <= 28 ? 0 : 1;
      if (band !== this.leanBand) {
        if (band === 2 && this.leanBand < 2) say("color", "Look at the front row — they're on the edge of their seats!");
        else if (band === 0) say("color", "Front row's sitting on its hands. They've seen this before.");
        this.leanBand = band;
      }

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
            x, y: y + Math.random() * 8, row,
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
      // POSTURE — the front row's tell (bible §5.1). Leaning in: they come
      // forward toward the ring, heads down and in, rim-lit warm. Sitting
      // back: they sink into their seats, slump, and fold their arms. The
      // front row shows it fully; the rows behind echo it.
      const pose = clamp(((this.leanShown == null ? this.lean : this.leanShown) - 50) / 50, -1, 1);
      const ROW_W = [0.35, 0.65, 1];
      // leaning in brings the front row forward INTO the ring light; sitting
      // back lets them fall into shadow. Readable out of the corner of an eye.
      if (pose > 0.05) {
        const lg = ctx.createLinearGradient(0, 70, 0, 140);
        lg.addColorStop(0, "rgba(255,170,90,0)");
        lg.addColorStop(0.55, "rgba(255,170,90," + (pose * 0.22).toFixed(3) + ")");
        lg.addColorStop(1, "rgba(255,170,90,0)");
        ctx.fillStyle = lg; ctx.fillRect(0, 70, W, 70);
      }
      for (const m of this.spec) {
        const sway = Math.sin(rf * 0.04 + m.seed) * 1.5;
        const excited = popping && ((m.seed * 7) % 3 < 2 || this.heat > 70);
        const lp = pose * ROW_W[m.row];
        const s = m.sc * (1 + lp * 0.14);                 // forward = nearer = bigger
        const bodyH = 10 * s * (lp < 0 ? 1 + lp * 0.35 : 1); // slumped = shorter
        const headY = -4 * s - 4 * s * (lp < 0 ? 1 + lp * 0.3 : 1) + (lp > 0 ? lp * 3 : 0);
        ctx.save();
        ctx.translate(m.x + sway, m.y + (lp > 0 ? lp * 8 : lp * 4));
        // silhouette body + head
        ctx.fillStyle = "#0b0e1a";
        ctx.fillRect(-7 * s, -4 * s + (10 * s - bodyH), 14 * s, bodyH);
        ctx.beginPath(); ctx.arc(lp > 0 ? 0 : 0, headY + (10 * s - bodyH), 4.4 * s, 0, 7); ctx.fill();
        // rim light so they read against the black band — warm when they're into it
        const warm = Math.max(0, lp), cold = Math.max(0, -lp);
        const hy = headY + (10 * s - bodyH);
        if (warm > 0.15) {
          // lit from the ring: a warm rim on the head
          ctx.strokeStyle = "rgba(255,180,100," + (0.25 + warm * 0.6).toFixed(2) + ")";
          ctx.lineWidth = 1 + warm * 1.2;
          ctx.beginPath(); ctx.arc(0, hy, 4.4 * s, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
        } else {
          ctx.strokeStyle = "rgba(150,170,210," + (0.18 * (1 - cold * 0.8)).toFixed(3) + ")"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(0, hy, 4.4 * s, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        }
        // sitting on their hands: arms folded across the chest
        if (!excited && lp < -0.2 && (m.seed % 1) < cold) {
          ctx.strokeStyle = "rgba(150,170,210,.6)"; ctx.lineWidth = 2;
          const ay = -4 * s + (10 * s - bodyH) + bodyH * 0.4;
          ctx.beginPath(); ctx.moveTo(-7 * s, ay); ctx.lineTo(7 * s, ay); ctx.stroke();
        }
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
        ctx.font = "bold 15px Oswald, Impact"; ctx.fillStyle = "rgba(230,235,250,.7)";
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
