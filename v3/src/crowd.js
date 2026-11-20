/* ============================================================
   v3 — src/crowd.js
   THE ROOM. The crowd is the judge, and it is made of people.

   HARD RULE (bible §3, §12): the crowd never reads the script. The
   only way in is see(event), and an event is only ever something a
   person in row twelve could watch happen.

   What the room tracks:
     heat   0..100   how loud they are
     attn   0..100   are they INTO it (the front row leaning in / sitting back)
   and, for EACH wrestler:
     like  -100..100 do they cheer him or boo him
     over   0..100   do they react to him at all
     taken           how much unanswered punishment he has soaked up

   Nothing says who the good guy is. Whoever the room likes gets
   cheered; whoever bullies a man the room likes gets booed. A hero
   who bores them or stomps a man who's down can lose the room, and
   a villain who works hard can win it.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;
  const clamp = PCW.clamp;

  const ROWS = [
    { y: 420, s: 1.28, n: 17, shade: 1.00 },
    { y: 358, s: 1.14, n: 19, shade: 0.84 },
    { y: 300, s: 1.02, n: 21, shade: 0.68 },
    { y: 246, s: 0.92, n: 23, shade: 0.54 },
    { y: 197, s: 0.83, n: 25, shade: 0.42 },
    { y: 153, s: 0.75, n: 27, shade: 0.32 }
  ];
  const SKINS = ["#e8c1a0", "#d9a983", "#b98058", "#8d5a3b", "#f0d0b4", "#6e4530"];
  const HAIRS = ["#1a1410", "#3a2a1c", "#6b4a2a", "#111", "#8a8a8a", "#b08a4a"];
  const GREY = [96, 98, 108];
  const FAN = { stove: [255, 112, 34], boulder: [226, 182, 64] };

  class Crowd {
    constructor() { this.people = []; this.build(); this.reset(); }

    build() {
      let s = 7;
      const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      ROWS.forEach((row, ri) => {
        const gap = (PCW.W + 80) / row.n;
        for (let i = 0; i < row.n; i++) {
          this.people.push({
            row: ri,
            x: -40 + gap * (i + 0.5) + (r() - 0.5) * gap * 0.3,
            y: row.y + (r() - 0.5) * 7,
            s: row.s * (0.94 + r() * 0.12),
            shade: row.shade,
            bS: (r() - 0.5) * 70, bB: (r() - 0.5) * 70,   // this person's own taste
            thr: r(),                                     // how hard they are to get going
            skin: SKINS[Math.floor(r() * SKINS.length)],
            hair: r() < 0.78 ? HAIRS[Math.floor(r() * HAIRS.length)] : null,
            col: GREY.slice(), ph: r() * 6.28, sign: null, signUp: 0, fav: null
          });
        }
      });
      // hand out the signs, spread across the building (not the front row)
      const cands = this.people.filter(p => p.row >= 1 && p.row <= 4 && p.x > 60 && p.x < PCW.W - 60)
        .sort((a, b) => a.x - b.x);
      PCW.SIGNS.forEach((sg, k) => {
        const p = cands[Math.floor((k + 0.5) / PCW.SIGNS.length * cands.length)];
        if (p && !p.sign) p.sign = sg;
      });
    }

    reset() {
      this.heat = 20; this.attn = 50; this.t = 0; this.quiet = 0;
      this.W = {};
      for (const id of ["stove", "boulder"]) {
        const p = PCW.PERSONAS[id];
        this.W[id] = { like: p.startLike, over: p.startOver, taken: 0, like0: p.startLike, over0: p.startOver, lowLike: p.startLike, highLike: p.startLike };
      }
      this.finKicked = { stove: false, boulder: false };   // has anybody kicked out of this man's finisher tonight?
      this.cheats = { stove: 0, boulder: 0 };                                                 // how often they have SEEN each man cheat
      this.hurt = { stove: { arm: 0, leg: 0, back: 0 }, boulder: { arm: 0, leg: 0, back: 0 } };   // what they have SEEN worked on
      this.mem = {}; this.pulses = []; this.floaters = []; this.flashes = [];
      this.chant = null; this.shout = null; this.chantCool = 300;
      this.sumHeat = 0; this.sumAttn = 0; this.n = 0; this.peak = 20;
      this.lastBig = { t: -9999, actor: null };
      this.flag = { stove: 1, boulder: -1, attn: 0 };
      this.tone = "murmur";
      for (const p of this.people) { p.col = GREY.slice(); p.signUp = 0; }
    }

    /* ---------------- the only way in: something they SAW ---------------- */
    see(ev) {
      const A = this.W[ev.actor], T = ev.target ? this.W[ev.target] : null;
      const sec = this.t / 60;
      this.quiet = 0;
      let tone = "murmur", mag = 0;
      if (ev.part && this.hurt[ev.target]) this.hurt[ev.target][ev.part] += ev.hurt || 1;
      if (["rake", "feet", "refbump", "chair"].includes(ev.type)) this.cheats[ev.actor] += ev.type === "rake" ? 1 : 2;

      if (ev.type === "refbump") {
        // the referee just got flattened. Everybody is on their feet.
        this.heat += 7; this.attn += 6; A.like -= 3; A.over += 2;
        this.pulse("boo", ev.actor, 5); this.flash(14);
        return this.finish("boo", 5);
      }
      if (ev.type === "weaponout") {
        this.heat += 4; this.attn += 5; this.pulse(A.like >= 0 ? "pop" : "boo", ev.actor, 4);
        return this.finish("murmur", 0);
      }
      if (ev.type === "viscount") {
        // he has him pinned and there is no referee: the room counts it for him, or howls
        this.heat += 2; this.attn += 1;
        this.shout = { text: String(ev.n) + "!", t: 0, scale: 0.5 + 0.08 * ev.n };
        this.pulse(A.like >= 0 ? "count" : "boo", ev.actor, 2 + ev.n * 0.5);
        return this.finish("murmur", 0);
      }

      if (ev.type === "woo") {
        // one chop. If the room is with it they shout along; past that it wears thin.
        const liked = A.like >= T.like;
        if (ev.loud) {
          this.heat += (1 + 0.45 * ev.n) * (0.5 + A.over / 100) * (liked ? 1 : 0.5);
          A.over += 0.3; this.attn += 0.6;
          this.shout = { text: liked ? "WOO!" : "OHH!", t: 0, scale: 0.55 + 0.09 * ev.n };
          this.pulse(liked ? "pop" : "boo", ev.actor, 1 + ev.n * 0.4);
        } else {
          this.heat -= 1.5; this.attn -= 2;
          this.shout = { text: "woo.", t: 0, small: true };
          this.words("seen", 2);
        }
        return this.finish("murmur", 0);
      }
      if (ev.type === "count10") {
        // the ten punches in the corner: they count along with a man they like
        const liked = A.like >= T.like;
        this.heat += (0.6 + 0.22 * ev.n) * (0.5 + A.over / 100) * (liked ? 1 : 0.45);
        this.attn += 0.5;
        this.shout = liked ? { text: ev.n + "!", t: 0, scale: 0.5 + 0.06 * ev.n } : { text: "BOO!", t: 0, small: true };
        this.pulse(liked ? "count" : "boo", ev.actor, 1 + ev.n * 0.3);
        return this.finish("murmur", 0);
      }
      if (ev.type === "short10") {
        // he climbed up there and stopped short of ten
        this.attn -= 3; this.heat -= 2; this.words("endit", 3);
        return this.finish("murmur", 0);
      }
      if (ev.type === "subbeat") {
        // a hold. If they have seen that body part worked, they believe it could end.
        const rally = T.like > A.like, b = ev.believed;
        this.heat += (b ? 3.4 : 1.2) * (0.5 + (rally ? T.over : A.over) / 100) * (ev.fade ? 1.3 : 1);
        this.attn += b ? 2 : -1.2;
        T.taken += 1; if (rally) T.like += 0.5;
        if (ev.count) this.shout = { text: ["", "ONE!", "TWO!"][ev.count], t: 0, scale: 0.8 };
        this.pulse(rally ? "pop" : "boo", rally ? ev.target : ev.actor, b ? 3 : 1.2);
        if (rally) this.words("pop", b ? 4 : 1);
        return this.finish("murmur", 0);
      }
      if (ev.type === "ropebreak") {
        // actor = the man who got out of the hold
        const liked = A.like >= T.like;
        mag = (ev.big ? 5 : 3.4) * (0.5 + A.over / 100);
        this.heat += mag * (liked ? 2.6 : 1.2); this.attn += 3; if (liked) A.like += 1.5;
        this.shout = null;
        this.pulse(liked ? "pop" : "boo", ev.actor, mag);
        return this.finish(liked ? "pop" : "boo", mag);
      }

      if (ev.type === "count") {
        this.heat += [0, 3, 6, 10][ev.n] * (0.6 + this.attn / 150);
        this.attn += 1.5;
        this.shout = { text: ["", "ONE!", "TWO!", "THREE!"][ev.n], t: 0 };
        this.pulse("count", ev.actor, 2 + ev.n);
        return this.finish("murmur", 0);
      }

      if (ev.type === "bail") {
        // he ran from the fight. They let him hear it; it wears thin if he keeps doing it.
        const n0 = this.mem[ev.actor + ":bail"] || 0, f = 1 / (1 + 0.55 * n0);
        this.mem[ev.actor + ":bail"] = n0 + 1;
        this.heat += 4 * f * (0.5 + A.over / 100); A.like -= 3 * f; A.over += 1.5 * f;
        if (f < 0.5) this.attn -= 3;
        this.pulse("boo", ev.actor, 3 * f);
        return this.finish("boo", 3 * f);
      }
      if (ev.type === "feet") {
        // his feet are on the ropes and everybody but the referee can see it
        this.heat += 5 * (0.5 + A.over / 100); A.like -= 3; A.over += 2; this.attn += 3;
        this.pulse("boo", ev.actor, 4); this.words("boo", 6);
        return this.finish("boo", 4);
      }
      if (ev.type === "caught") {
        // the referee saw it. The room loves that.
        this.heat += 7; this.attn += 4; A.like -= 1;
        this.shout = null;
        this.pulse("pop", ev.target, 4); this.words("pop", 6);
        return this.finish("pop", 4);
      }
      if (ev.type === "refcount") {
        // the count on a man outside the ring
        this.shout = { text: String(ev.n), t: 0, small: true };
        if (ev.n >= 7) { this.heat += 2; this.attn += 1; }
        return this.finish("murmur", 0);
      }
      if (ev.type === "stall") {
        // standing around outside while the referee counts
        A.like -= 1.5; this.heat += 0.6; this.attn -= 0.5;
        this.words("boo", 2);
        return this.finish("boo", 1);
      }

      const key = ev.actor + ":" + ev.type;
      const n = this.mem[key] || 0;
      const fresh = 1 / (1 + 0.55 * n);          // they get used to things
      this.mem[key] = n + 1;

      if (ev.type === "weak") {
        // the other man didn't sell it: the move looked like nothing
        this.heat += 0.3; A.over -= 1.2; this.attn -= 1.5;
        this.words("weak", 2);
        return this.finish("murmur", 0);
      }

      if (ev.type === "hulkup" && A.like > 30 && A.taken >= 8 && fresh > 0.5) {
        // a man they love, who has taken a beating, suddenly feels nothing: they come unglued
        mag = 5 * (0.5 + A.over / 100);
        this.heat += mag * 3; A.over += 4; A.like += 2; this.attn += 6; A.taken *= 0.3;
        this.pulse("pop", ev.actor, mag); this.flash(mag * 2);
        this.setChant(ev.actor === "stove" ? "stoveLoved" : "boulderLoved", true);
        return this.finish("pop", mag);
      }
      if (ev.type === "crash") {
        // he moved, and the other man hit nothing but the mat (or the floor)
        mag = ev.size * fresh * (0.55 + A.over / 110);
        tone = A.like >= T.like ? "pop" : "boo";
        this.heat += mag * 2.8; A.over += mag * 0.5; this.attn += 3; T.taken += 2;
        this.lastBig = { t: this.t, actor: ev.actor };
        this.pulse(tone, ev.actor, mag); this.flash(mag * 2);
        return this.finish(tone, mag);
      }

      if (ev.type === "nosell" || ev.type === "hulkup") {
        // popped straight up from a real bump: the man who hit him looks weak
        if (T) T.over -= 3;
        A.like -= 3; this.attn -= 4; this.heat += 1;
        this.pulse("boo", ev.actor, 2); this.words("weak", 4);
        return this.finish("boo", 2);
      }

      if (ev.type === "taunt") {
        const O = this.W[ev.actor === "stove" ? "boulder" : "stove"];
        mag = (ev.posing ? 2.2 : 0.8) * fresh * (0.5 + A.over / 100);
        if (this.heat < 24 && !ev.posing) {
          A.over -= 1.5; tone = "boo"; mag = 1; this.words("endit", 2);   // nothing has happened yet, get on with it
        } else if (A.like >= 0) {
          tone = "pop"; this.heat += mag * 2.5; A.like += mag * 0.5; A.over += mag * 0.8;
        } else {
          tone = "boo"; this.heat += mag * 2.5; A.like -= mag * 1.0; A.over += mag * 0.9; O.like += mag * 0.4;
        }
        this.attn += ev.posing ? 2 * fresh : -1;
        this.pulse(tone, ev.actor, mag);
        return this.finish(tone, mag);
      }

      if (ev.type === "kickout") {
        const surprise = ((this.t - this.lastBig.t < 480 && this.lastBig.actor !== ev.actor) ? 2.0 : 1.0) * (1 + (ev.late || 0) * 0.5);
        mag = 4 * surprise * fresh * (0.5 + A.over / 100);
        if (ev.fin) {
          // he kicked out of the FINISHER. The first time anybody does that, the room loses its mind.
          mag *= this.finKicked[ev.target] ? 1.25 : 1.9;
          this.finKicked[ev.target] = true; this.attn += 6; this.flash(20);
        }
        if (A.like >= -10) { tone = "pop"; this.heat += mag * 2.6; A.like += mag * 0.5; A.over += mag * 0.8; }
        else { tone = "boo"; this.heat += mag * 2.0; A.over += mag * 0.5; A.like -= mag * 0.3; }
        this.attn += 5 * fresh;
        this.shout = null;
        this.pulse(tone, ev.actor, mag); this.flash(mag * 2);
        return this.finish(tone, mag);
      }

      if (ev.type === "pinfall") {
        mag = 6 * (0.5 + A.over / 100) * (ev.afterBig ? 1 : 0.5);
        tone = A.like > 0 ? "pop" : "boo";
        this.heat += mag * 4;
        if (sec < 60) { this.heat -= 15; this.attn -= 20; this.words("endit", 6); }   // "that's it?"
        if (tone === "pop") A.like += mag; else A.like -= mag * 0.5;
        A.over += mag;
        this.pulse(tone, ev.actor, mag * 1.5); this.flash(mag * 3);
        return this.finish(tone, mag);
      }

      /* ---- offence: strike, stomp, slam, armdrag, clothesline, tackle, finisher ---- */
      let size = ev.size * (ev.q || 1);
      let v = (A.like - T.like) / 100;            // who are they rooting for in this exchange
      if (ev.dirty) v -= 0.9 + T.taken * 0.04;    // hitting a man who's down: worse the longer it has been one-sided
      // ...unless the other man has been cheating all night: then a chair is a RECEIPT, and they love it
      const receipt = ev.type === "chair" && this.cheats[ev.target] >= this.cheats[ev.actor] + 2;
      if (receipt) v = Math.abs(v) + 0.5;
      // a man they like who cheats for no reason: they turn on him
      else if (ev.dirty && ev.type !== "stomp" && A.like > 0) A.like -= 8 + A.like * 0.25;

      // the story, read off the picture: has this man been taking a beating?
      let mult = 1, comeback = false;
      if (A.taken >= 6 && !ev.dirty) { mult += Math.min(A.taken, 16) / 10; comeback = true; }
      if (ev.callback) { this.attn += 4; this.words("pop", 4); }      // they remember he was stopped on this
      if (ev.type === "finisher") {
        mult *= clamp(0.3 + sec / 140, 0.3, 1);   // a finisher in minute one means nothing yet
        if (this.finKicked[ev.actor]) mult *= 1.3;   // he kicked out of it once: this time they believe it is over
        this.lastBig = { t: this.t, actor: ev.actor };
      } else if (ev.size >= 3) this.lastBig = { t: this.t, actor: ev.actor };

      mag = size * fresh * mult * (0.55 + A.over / 110) * (0.7 + this.attn / 160);

      if (v > 0.15) {
        tone = "pop"; this.heat += mag * 3.2; A.over += mag * 0.8; A.like += mag * 0.15;
      } else if (v < -0.15) {
        tone = "boo"; this.heat += mag * 2.6; A.over += mag * 0.7; A.like -= mag * 0.45; T.like += mag * 0.3;
      } else {
        this.heat += mag * 1.6; A.over += mag * 0.4;
      }

      // sympathy: a man who keeps taking it (and sells it) earns the room
      T.taken += ev.size; A.taken *= 0.5;
      // (scaled by how fresh it is and how much they care: a bored room stops judging)
      const care = fresh * (0.35 + A.over / 100);
      const onesided = T.taken > 7;
      T.like += (onesided ? 0.8 : 0.3) * size * care;
      if (onesided && v < 1.2) A.like -= 1.6 * size * care;      // the bully gets booed
      if (T.taken > 20) {                                      // held too long: they give up on him
        this.attn -= 1.5 * ev.size; T.over -= 0.5 * ev.size;
        if (Math.floor(T.taken) % 4 === 0) this.words("endit", 3);
      }

      this.attn += (fresh > 0.6 ? 1.2 : -1.6) * ev.size + (comeback ? 6 : 0);
      if (fresh < 0.4) { A.over -= 0.6; this.words("seen", 2); }
      if (comeback && tone === "pop") this.setChant(ev.actor === "stove" ? "stoveLoved" : "boulderLoved", true);

      this.pulse(tone, ev.actor, mag);
      if (mag * 3 >= 9) this.flash(mag * 2);
      return this.finish(tone, mag);
    }

    finish(tone, mag) {
      this.tone = tone;
      this.heat = clamp(this.heat, 0, 100); this.attn = clamp(this.attn, 0, 100);
      for (const id in this.W) {
        const w = this.W[id];
        w.like = clamp(w.like, -100, 100); w.over = clamp(w.over, 0, 100);
        w.lowLike = Math.min(w.lowLike, w.like); w.highLike = Math.max(w.highLike, w.like);
      }
      return { tone, mag };
    }

    /* ---------------- what the room does with it ---------------- */
    pulse(tone, actor, mag) {
      PCW.sfx.crowd(tone, mag);
      this.pulses.push({ tone, actor, mag, age: 0, dur: 34 + Math.min(mag, 14) * 7 });
      if (this.pulses.length > 6) this.pulses.shift();
      if (tone === "pop") this.words("pop", Math.min(8, Math.round(mag)));
      if (tone === "boo") this.words("boo", Math.min(8, Math.round(mag)));
    }
    words(kind, count) {
      const list = PCW.SHOUTS[kind]; if (!list) return;
      for (let i = 0; i < count; i++) {
        const p = PCW.pick(this.people);
        this.floaters.push({
          x: p.x, y: p.y - 26 * p.s, text: PCW.pick(list), age: -Math.floor(PCW.rnd() * 14), life: 58,
          size: (kind === "pop" || kind === "boo" ? 15 : 12) * (0.8 + p.s * 0.45),
          color: kind === "pop" ? "#ffe9a8" : kind === "boo" ? "#ff6b6b" : "#a9adb8"
        });
      }
    }
    flash(count) {
      count = Math.min(40, Math.round(count));
      for (let i = 0; i < count; i++) {
        const p = PCW.pick(this.people);
        this.flashes.push({ x: p.x + (PCW.rnd() - 0.5) * 10, y: p.y - 4, age: -Math.floor(PCW.rnd() * 26), size: 10 + PCW.rnd() * 16 });
      }
    }
    setChant(kind, force) {
      if (this.chant && !force) return;
      if (force && this.chant && this.chant.kind === kind) return;
      this.chant = { kind, text: PCW.pick(PCW.CHANTS[kind]), t: 0, dur: 210 };
      this.chantCool = 420 + PCW.rnd() * 300;
    }

    tick() {
      this.t++; this.quiet++;
      const S = this.W.stove, B = this.W.boulder;

      // heat has to be kept, not banked; a hot crowd cools faster
      if (this.quiet > 150) { this.heat -= 0.03 + this.heat * 0.0011; this.attn -= 0.025; }
      else this.heat -= this.heat * 0.0006;
      if (this.quiet >= 420 && (this.quiet - 420) % 300 === 0) {   // dead air
        this.setChant("bored", true);
        S.over -= 2; B.over -= 2; this.attn -= 3; S.like *= 0.96; B.like *= 0.96;
      }
      if (this.t % 60 === 0) for (const k in this.mem) { this.mem[k] *= 0.9; if (this.mem[k] < 0.05) delete this.mem[k]; }

      // the room finds its own voice
      this.chantCool--;
      if (this.chantCool <= 0 && !this.chant && this.heat > 48) {
        if (this.attn > 78 && this.heat > 80) this.setChant("great");
        else if (S.like > 35 && S.over > 55 && S.like >= B.like) this.setChant("stoveLoved");
        else if (B.like > 35 && B.over > 55) this.setChant("boulderLoved");
        else if (B.like < -45 && B.over > 58) this.setChant("boulderHated");
        else if (S.like < -35 && S.over > 50) this.setChant("stoveHated");
        else this.chantCool = 200;
      }
      if (this.chant && ++this.chant.t > this.chant.dur) this.chant = null;
      if (this.shout && ++this.shout.t > 46) this.shout = null;

      // the moments the announce desk can hear
      const f = this.flag, L = PCW.LINES;
      if (f.stove > 0 && S.like < -8) { f.stove = -1; PCW.say("color", L.turnOnStove, 2); this.setChant("stoveHated", true); }
      else if (f.stove < 0 && S.like > 8) { f.stove = 1; PCW.say("color", L.winBackStove, 2); }
      if (f.boulder < 0 && B.like > 8) { f.boulder = 1; PCW.say("color", L.cheerBoulder, 2); this.setChant("boulderLoved", true); }
      else if (f.boulder > 0 && B.like < -8) { f.boulder = -1; PCW.say("color", L.booBoulder, 2); }
      if (f.attn >= 0 && this.attn < 30) { f.attn = -1; PCW.say("color", L.sitBack, 1); }
      else if (f.attn <= 0 && this.attn > 72) { f.attn = 1; PCW.say("color", L.leanIn, 1); }

      for (const p of this.pulses) p.age++;
      this.pulses = this.pulses.filter(p => p.age < p.dur + 40);
      for (const fl of this.floaters) fl.age++;
      this.floaters = this.floaters.filter(fl => fl.age < fl.life);
      for (const fl of this.flashes) fl.age++;
      this.flashes = this.flashes.filter(fl => fl.age < 12);

      this.finish(this.tone, 0);
      this.sumHeat += this.heat; this.sumAttn += this.attn; this.n++;
      this.peak = Math.max(this.peak, this.heat);
    }

    /* WHAT THE ROOM WANTS RIGHT NOW. Not a script: this is what a wrestler
       hears from the seats, read off the same things the crowd has seen. */
    want() {
      const S = this.W.stove, B = this.W.boulder, sec = this.t / 60;
      const fav = S.like >= B.like ? "stove" : "boulder", oth = fav === "stove" ? "boulder" : "stove";
      const F = this.W[fav], O = this.W[oth], name = id => PCW.PERSONAS[id].short;
      if (this.quiet > 450) return "They are getting restless. Do something.";
      for (const id of ["stove", "boulder"]) if (this.finKicked[id] && this.t - this.lastBig.t < 900 && this.lastBig.actor === id)
        return "They cannot believe he kicked out of that. Hit it again and they will believe it is over.";
      if (F.like - O.like < 25) return "They have not picked a side. Give them a reason to.";
      if (F.taken >= 20) return "They have seen enough of this beating. Let " + name(fav) + " fight back NOW.";
      if (F.taken >= 8) return "They want to see " + name(fav) + " fight back.";
      if (this.attn < 35) return "They are sitting on their hands. Change something.";
      let worn = 0; for (const k in this.mem) worn = Math.max(worn, this.mem[k]);
      if (worn >= 2.4) return "They have seen that move too often. Show them something else.";
      const worst = id => { const h = this.hurt[id]; let k = "back"; for (const p in h) if (h[p] > h[k]) k = p; return h[k] >= 4 ? k : null; };
      if (worst(fav) && F.taken >= 3) return "They are scared for " + name(fav) + "'s " + worst(fav) + ". A hold on it would have them screaming.";
      if (sec > 130 && O.taken >= 5) return "They are ready. Give them the finish.";
      if (worst(oth) && sec > 60) return "They believe " + name(oth) + "'s " + worst(oth) + " is hurt. A hold on it means something now.";
      if (O.taken >= 10 && F.taken < 4 && sec < 120) return "They are happy, but nothing is at stake. " + name(fav) + " needs to be in trouble.";
      if (F.taken >= 3) return "They are worried about " + name(fav) + ". Let it build.";
      return "They are behind " + name(fav) + ". Let him look good.";
    }

    avgHeat() { return this.n ? this.sumHeat / this.n : this.heat; }
    avgAttn() { return this.n ? this.sumAttn / this.n : this.attn; }

    /* how many of the room are behind each man right now (for the nameplates) */
    split() {
      let s = 0, b = 0;
      for (const p of this.people) { if (p.fav === "stove") s++; else if (p.fav === "boulder") b++; }
      return { stove: s / this.people.length, boulder: b / this.people.length };
    }

    /* ---------------- one person's body language (called by the renderer) ---------------- */
    posture(p) {
      const S = this.W.stove.like + p.bS, B = this.W.boulder.like + p.bB;
      p.fav = (S > 12 && S >= B) ? "stove" : (B > 12 ? "boulder" : null);
      const target = p.fav ? FAN[p.fav] : GREY;
      for (let i = 0; i < 3; i++) p.col[i] += (target[i] - p.col[i]) * 0.04;

      const bored = this.attn + p.thr * 30 - 15 < 35;
      const leaning = this.attn - p.thr * 25 > 60;
      let stand = this.heat - p.thr * 35 > 58;
      let arms = bored ? "folded" : (this.heat > 40 && !leaning ? "clap" : "down");
      let mouth = false, jump = 0;

      // the newest reaction that has reached this seat (it ripples outward)
      const delay = p.row * 3 + Math.abs(p.x - 640) / 55;
      let live = null;
      for (const pl of this.pulses) if (pl.age >= delay && pl.age < pl.dur + delay) live = pl;
      if (live) {
        const feel = live.actor === "stove" ? S : B;       // how THIS person feels about the man who did it
        const strong = live.mag * 9 > p.thr * 22;
        if (live.tone === "count") { arms = "point"; mouth = true; stand = stand || strong; }
        else if (live.tone === "pop" && strong) {
          if (feel > -5) { arms = "up"; mouth = true; stand = true; jump = 1; } else arms = "folded";
        } else if (live.tone === "boo" && strong) {
          if (feel < 5) { arms = "boo"; mouth = true; } else { arms = "up"; mouth = true; stand = true; }   // his fans still cheer
        }
      }

      // signs
      let up = false;
      if (p.sign && this.heat > 38) {
        const sg = p.sign;
        if (sg.for) up = (sg.for === "stove" ? S : B) > 15;
        else if (sg.against) up = (sg.against === "stove" ? S : B) < -15;
        else up = this.heat > 55;
      }
      p.signUp += ((up ? 1 : 0) - p.signUp) * 0.08;

      return { stand, arms, mouth, jump, lean: leaning ? 1 : bored ? -1 : 0 };
    }
  }

  PCW.Crowd = Crowd;
})();
