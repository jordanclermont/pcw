/* ============================================================
   PCW — engine.js
   The rules layer. Owns the fixed 60 Hz logic step, the move
   physics, the call sheet, and the match endings. Ties every
   module together.

   THE TWO-AUDIENCE RULE, enforced here:
     - HEAT only ever moves through crowd.react(<visible picture>)
       or the crowd's own decay/hijack. Nothing in this file adds
       heat directly.
     - TRUST and BODY move on backstage truth (missed cues, stiff
       shots, shoots) and NEVER touch heat.
   A botch the crowd can't detect costs trust and bodies, not heat.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;
  const G = PCW.G;
  const F = PCW.FRAMES, BODY = PCW.BODY, TRUST = PCW.TRUST, S = PCW.S;
  const clampGrid = PCW.clampGrid;

  const spot = () => G.match.script[G.match.spot] || null;

  /* ---------------- start a match from a drafted sheet ---------------- */
  function startMatch(script) {
    G.tick = 0; G.renderFrame = 0; G.hitstop = 0; G.shake = 0; G.slowmo = !!G.slowmo;
    G.P1 = new PCW.Wrestler(PCW.PERSONAS.stovehot);
    G.P2 = new PCW.Wrestler(PCW.PERSONAS.boulder);
    G.pads = { p1: new PCW.Pad(PCW.PAD_MAP.p1), p2: new PCW.Pad(PCW.PAD_MAP.p2) };
    G.exchange = null; G.sellWin = null; G.pin = null; G.splatters = [];
    if (!G.crowd) G.crowd = new PCW.CrowdModel(); else G.crowd.reset();
    G.match = {
      phase: "MATCH", script: script || PCW.makeMatchPlan(), spot: 0,
      trust: 100, botches: 0, shoots: 0, endInfo: null, trustFlash: null
    };
    G.appPhase = "MATCH";
    G.crowd.setProgress(0, G.match.script.length);
    PCW.render.clearStain();
    PCW.clearLog();
    PCW.log("Gorilla position: 'Stick to the sheet you just booked. Have a good one.'");
    PCW.renderCallsheet();
  }
  PCW.startMatch = startMatch;

  /* ---------------- work-layer bookkeeping (backstage) ---------------- */
  function adjustTrust(delta, reason) {
    const before = G.match.trust;
    G.match.trust = Math.max(0, Math.min(100, before + delta));
    const actual = G.match.trust - before;
    if (actual !== 0) G.match.trustFlash = { delta: actual, t: 55 };  // on-canvas sting
    if (reason && delta < 0) PCW.log(reason + "  ·  Trust " + G.match.trust + "/100.", "shoot");
    if (G.match.trust <= 0) matchEnd("BREAKDOWN", G.P1);
  }
  function markDone(sp) {
    sp.status = "done"; G.match.spot++;
    adjustTrust(TRUST.REGAIN);   // clean work slowly rebuilds trust
    PCW.renderCallsheet();
    G.crowd.setProgress(G.match.spot, G.match.script.length);
    const nx = spot(); if (nx) PCW.log("Next — " + nx.name + ": " + nx.promo);
  }
  function markBotched(sp) {
    sp.status = "botched"; G.match.botches++; G.match.spot++;
    PCW.renderCallsheet();
    G.crowd.setProgress(G.match.spot, G.match.script.length);
    const nx = spot(); if (nx) PCW.log("Cover it, move on. Next — " + nx.name + ".");
  }

  // pictures that a crowd chant can legitimately excuse as an audible.
  // Stealing a pin or kicking out of the finish never qualifies — that's
  // going into business for yourself, chant or no chant.
  const SANCTIONABLE = new Set(["strike", "weakstrike", "slam", "reversal"]);

  /* an off-script action. If a live crowd chant called for exactly this,
     it's a sanctioned AUDIBLE — no trust cost, not counted as a shoot.
     Otherwise it's a genuine shoot, priced by severity. The crowd reacts
     to the picture either way. */
  function offScript(who, label, picture, severity) {
    if (SANCTIONABLE.has(picture.picture) && G.crowd.wouldServe(picture)) {
      PCW.log("AUDIBLE — " + who.short + " " + label + ", but the crowd called for it. No harm done.", "ok");
      popShake(G.crowd.react(picture));   // react() serves the chant + pays the bonus
      return;
    }
    G.match.shoots++;
    adjustTrust(-severity, "SHOOT — " + who.short + " " + label);
    popShake(G.crowd.react(picture));
    // a shoot always costs trust — but if the crowd ate it up, it earns a
    // little RESPECT (the "respected but not the most trusted" loose cannon).
    if (G.crowd.lastTone === "pop") PCW.awardRespect(who.id, PCW.RESPECT.SHOOT_POPPED);
    else PCW.awardRespect(who.id, PCW.RESPECT.SHOOT_FLOPPED);
  }

  /* tie screen-shake to the size of the pop, so a big reaction is felt
     in the hands as well as seen. */
  function popShake(delta) {
    if (delta >= 14) G.shake = Math.max(G.shake, 11);
    else if (delta >= 8) G.shake = Math.max(G.shake, 6);
    return delta;
  }

  /* ============================================================
     MOVE LOGIC (physics identical for worked and shoot actions)
     ============================================================ */
  function initiateGrapple(atk, def) {
    if (atk.busy()) return;
    if ((def.state === S.DOWN) && atk.distTo(def) < 1.6) { startPin(atk, def); return; }
    if (def.busy() && def.state !== S.MOVE) return;
    if (atk.distTo(def) > 1.35) { PCW.log(atk.short + " reaches — nobody home."); return; }
    atk.setState(S.GRAPPLE_STARTUP);
    G.exchange = { attacker: atk, defender: def, frame: 0, reversalAttempted: false, resolved: false };
  }
  const grappleCtx = w => G.exchange && !G.exchange.resolved && G.exchange.defender === w && G.exchange.attacker.state === S.GRAPPLE_STARTUP;

  function attemptReversal(def) {
    if (G.exchange.reversalAttempted) return;
    G.exchange.reversalAttempted = true;
    const f = G.exchange.frame;
    if (f >= F.WINDOW_OPEN && f <= F.WINDOW_CLOSE) executeCounterTransition(G.exchange.attacker, def, f);
    else {
      def.pendingBotch = true;   // mistimed: it will read as a slam, invisibly
      PCW.log(def.short + " mistimed the reversal (f" + f + ", window f4–9).", "bad");
    }
  }
  function executeCounterTransition(atk, def, frame) {
    G.exchange.resolved = true; G.exchange = null;
    atk.hurt(BODY.ARM_DRAG);
    const dx = atk.gx - def.gx, dy = atk.gy - def.gy, m = Math.hypot(dx, dy) || 1;
    atk.gx = clampGrid(def.gx - dx / m * 2.1); atk.gy = clampGrid(def.gy - dy / m * 2.1);
    atk.downTime = F.DOWN_SHORT; atk.setState(S.DOWN);
    def.setState(S.ARM_DRAG);
    PCW.render.spawnSplatter(def); G.hitstop = F.HITSTOP; G.shake = 6;
    const sp = spot();
    const perfect = (frame === 6 || frame === 7);
    if (sp && sp.move === "GRAPPLE" && sp.reversal && sp.caller === atk.id) {
      // scripted reversal: the FACE's counter. Crowd sees a clean arm drag.
      popShake(G.crowd.react({ picture: "reversal", role: def.role, base: sp.pop, quality: perfect ? 1.25 : 1.0, arcSlot: sp.arcSlot, actor: def }));
      PCW.log(def.short + (perfect ? " — PICTURE-PERFECT arm drag (f" + frame + ")" : " — clean arm drag (f" + frame + ")"), "ok");
      markDone(sp);
    } else {
      // reversing something that wasn't called: still a clean counter to
      // the crowd (a pop), but a broken cue backstage (trust).
      offScript(def, "reversed a spot that wasn't called",
        { picture: "reversal", role: def.role, base: 6, quality: 1.0, arcSlot: "transition", actor: def }, TRUST.REVERSAL);
    }
  }
  function resolveGrappleConnect() {
    const atk = G.exchange.attacker, def = G.exchange.defender;
    G.exchange.resolved = true; G.exchange = null;
    if (atk.distTo(def) > 1.7) { atk.setState(S.WHIFF); PCW.log(atk.short + "'s grapple whiffs. Reset the spot."); return; }
    atk.setState(S.SLAM);
    const push = 0.9, dx = def.gx - atk.gx, dy = def.gy - atk.gy, m = Math.hypot(dx, dy) || 1;
    def.gx = clampGrid(def.gx + dx / m * push); def.gy = clampGrid(def.gy + dy / m * push);
    def.downTime = F.DOWN; def.setState(S.DOWN);
    PCW.render.inkBurst(def); G.hitstop = F.HITSTOP; G.shake = 8;
    const sp = spot();
    if (sp && sp.move === "GRAPPLE" && sp.caller === atk.id) {
      if (sp.reversal) {
        // a called reversal got missed. The crowd sees the attacker's slam
        // land (offence by whoever grappled) — NOT a botch. The cost is a
        // real bump (body) and a broken cue (trust), both invisible.
        def.pendingBotch = false;
        def.hurt(BODY.BOTCH_SLAM);
        adjustTrust(-TRUST.STIFF, def.short + " ate a real one — blown reversal");
        G.crowd.react({ picture: "slam", role: atk.role, base: sp.pop, quality: 0.7, arcSlot: sp.arcSlot, actor: atk });
        markBotched(sp);
      } else {
        def.hurt(BODY.WORKED_SLAM);
        popShake(G.crowd.react({ picture: "slam", role: atk.role, base: sp.pop, quality: 1.0, arcSlot: sp.arcSlot, big: !!sp.big, actor: atk }));
        PCW.log((sp.big ? sp.name + " — " : "") + "slam lands flush.", "ok");
        markDone(sp);
      }
    } else {
      // off-script slam. Crowd sees a slam and reads it as offence.
      def.hurt(BODY.SHOOT_SLAM);
      offScript(atk, "dropped " + def.short + " off-script",
        { picture: "slam", role: atk.role, base: 8, quality: 0.9, arcSlot: "transition", actor: atk }, TRUST.SLAM);
    }
  }

  /* strikes */
  function tryStrikeHit(atk, def) {
    if (def.busy() && def.state !== S.MOVE && def.state !== S.HITSTUN) return;
    if (atk.distTo(def) > 1.5 || def.state === S.HITSTUN) return;
    def.setState(S.HITSTUN);
    PCW.render.inkBurst(def); G.hitstop = 3; G.shake = 3;
    const sp = spot();
    if (sp && sp.move === "STRIKE" && sp.caller === atk.id) {
      def.hurt(BODY.WORKED_STRIKE);
      G.sellWin = { defender: def, frames: F.SELL_WINDOW, age: 0, spotRef: sp, attacker: atk };
      PCW.log(atk.short + " chop lands — " + def.short + ", sell it!");
    } else {
      // a shot that wasn't called: a potato. Crowd just sees a strike land.
      def.hurt(BODY.SHOOT_STRIKE);
      offScript(atk, "threw a potato at " + def.short,
        { picture: "strike", role: atk.role, base: 3, quality: 0.6, arcSlot: "transition", actor: atk }, TRUST.STRIKE);
    }
  }
  function doSell(def) {
    const sw = G.sellWin;
    const crisp = sw.age <= 12;
    const atk = sw.attacker;
    G.sellWin = null;
    def.setState(S.SELL);
    const sp = sw.spotRef; if (!sp || sp.move !== "STRIKE") return;
    sp._count = (sp._count || 0) + 1;
    // the sell is the pop. A crisp sell reads bigger from the fifth row.
    popShake(G.crowd.react({ picture: "strike", role: atk.role, base: sp.pop, quality: crisp ? 1.0 : 0.7, arcSlot: sp.arcSlot, actor: atk }));
    PCW.log((crisp ? def.short + " sells it to the cheap seats" : "a beat late, but it reads") + " (" + sp._count + "/" + sp.count + ")");
    if (sp._count >= sp.count) markDone(sp);
  }
  function sellWindowExpire() {
    const sp = G.sellWin.spotRef, atk = G.sellWin.attacker;
    G.sellWin = null;
    if (!sp || sp.move !== "STRIKE") return;
    sp._count = (sp._count || 0) + 1;
    // no-sell: the crowd SEES a strike that did nothing — reads weak, flat.
    // Not a hidden botch; a visibly limp exchange.
    G.crowd.react({ picture: "weakstrike", role: atk.role, base: 2, quality: 0.4, arcSlot: sp.arcSlot, actor: atk });
    PCW.log("No-sold it. Flat crowd. (" + sp._count + "/" + sp.count + ")", "bad");
    if (sp._count >= sp.count) markDone(sp);
  }

  /* pin */
  function startPin(atk, def) {
    const sp = spot();
    const finish = !!(sp && sp.move === "PIN" && sp.caller === atk.id);
    atk.gx = clampGrid(def.gx - 0.35); atk.gy = clampGrid(def.gy - 0.35);
    atk.setState(S.PINNING); def.setState(S.PINNED);
    G.pin = { attacker: atk, defender: def, count: 0, frame: 0, finish };
    if (!finish) offScript(atk, "went for a pin that wasn't the finish",
      { picture: "nearfall", role: atk.role, base: 6, quality: 1.0, arcSlot: "transition", actor: atk }, TRUST.PIN);
    PCW.log(atk.short + " hooks the leg...");
  }
  function pinTick() {
    const pin = G.pin;
    pin.frame++;
    if (pin.frame % F.PIN_COUNT === 0) {
      pin.count++;
      // each near-count is a visible suspense beat.
      popShake(G.crowd.react({ picture: "nearfall", role: pin.attacker.role, base: 5, quality: 1.0, arcSlot: pin.finish ? "finish" : "transition", actor: pin.attacker }));
      PCW.log("REF: ..." + pin.count + "!");
      if (pin.count === 2 && !pin.finish) { pinKickout(false); return; }
      if (pin.count >= 3) {
        if (pin.finish) {
          popShake(G.crowd.react({ picture: "pin", role: pin.attacker.role, base: 22, quality: 1.0, arcSlot: "finish", big: true, actor: pin.attacker }));
          spot().status = "done";
          matchEnd("CLEAN", pin.attacker);
        } else {
          matchEnd("SCREWJOB", pin.attacker);
        }
      }
    }
  }
  function pinKickout(isShoot) {
    const atk = G.pin.attacker, def = G.pin.defender;
    G.pin = null;
    def.downTime = 40; def.setState(S.DOWN);
    atk.setState(S.WHIFF);
    if (isShoot) {
      // kicking out of the FINISH: the crowd sees a shocking near-fall
      // (a real pop) even as it wrecks trust backstage.
      offScript(def, "kicked out of the FINISH",
        { picture: "kickout", role: def.role, base: 14, quality: 1.0, arcSlot: "finish", big: true, actor: def }, TRUST.KICKOUT);
    } else {
      popShake(G.crowd.react({ picture: "kickout", role: def.role, base: 8, quality: 1.0, arcSlot: "transition", actor: def }));
      PCW.log(def.short + " kicks out at two — scripted survival.");
    }
  }

  /* ---------------- endings + rating ---------------- */
  function matchEnd(type, who) {
    const match = G.match, crowd = G.crowd;
    if (match.phase !== "MATCH") return;
    match.phase = "ENDED";
    const avg = crowd.avgHeat();
    let stars = avg / 18 - match.botches * 0.6 - match.shoots * 0.4;
    if (match.trust >= 80) stars += 0.5;
    if (type === "CLEAN") stars += 0.5;
    if ((PCW.G.respect.p1 + PCW.G.respect.p2) / 2 >= 65) stars += 0.25;  // a respected card lands better
    if (type === "BREAKDOWN") stars = Math.min(stars, 1.25);
    if (type === "INJURY") stars = Math.min(stars, 0.75);
    stars = Math.max(0.25, Math.min(5, Math.round(stars * 4) / 4));
    const blurb =
      type === "INJURY" ? who.short + " couldn't continue. The office is furious." :
        type === "BREAKDOWN" ? "It fell apart in front of everybody. Gorilla position is silent." :
          type === "SCREWJOB" ? who.short + " took the win for real. Somebody's getting fined." :
            stars >= 4.5 ? "An instant classic. They'll chant 'PCW' in the parking lot." :
              stars >= 3.5 ? "A hell of a night's work. The crowd went home happy." :
                stars >= 2.5 ? "Solid house-show stuff. Nothing to be ashamed of." :
                  "Rough one. Watch the tape, tighten it up, go again tomorrow.";
    match.endInfo = { type, stars, blurb, avg: Math.round(avg) };
    PCW.log("MATCH OVER (" + type + ") — " + PCW.starText(stars) + " — " + blurb, type === "CLEAN" ? "ok" : "bad");
  }
  PCW.matchEnd = matchEnd;

  /* ============================================================
     LOGIC TICK — fixed 60 Hz
     ============================================================ */
  function logicTick() {
    G.tick++;
    // Hit-stop is a VISUAL freeze — don't drain inputs during it, or a
    // Work-button press that lands in the freeze gets silently eaten.
    // Leave presses queued so they're honoured the instant it ends.
    if (G.hitstop > 0) { G.hitstop--; return; }
    const justSet = PCW.drainPresses();
    G.pads.p1.beginTick(justSet); G.pads.p2.beginTick(justSet);
    if (G.match.phase === "ENDED") return;

    G.crowd.update();
    if (G.match.trustFlash && --G.match.trustFlash.t <= 0) G.match.trustFlash = null;

    const pairs = [[G.P1, G.pads.p1, G.P2], [G.P2, G.pads.p2, G.P1]];
    for (const [w, pad, foe] of pairs) {
      w.stateFrame++;

      /* WORK button (Y) — context-sensitive cooperation */
      if (pad.just.Y) {
        if (grappleCtx(w)) attemptReversal(w);
        else if (G.sellWin && G.sellWin.defender === w) doSell(w);
        else if (G.pin && G.pin.defender === w && G.pin.finish) pinKickout(true);
      }
      if (!w.busy()) {
        if (pad.just.B) initiateGrapple(w, foe);
        else if (pad.just.A) w.setState(S.STRIKE);
      }

      switch (w.state) {
        case S.IDLE: case S.MOVE: case S.RUN: {
          const a = pad.axis();
          const running = pad.held("X") && (a.gx || a.gy);
          const spd = running ? 0.115 : 0.062;
          if (a.gx || a.gy) {
            w.gx = clampGrid(w.gx + a.gx * spd); w.gy = clampGrid(w.gy + a.gy * spd);
            w.facing = (a.gx - a.gy) >= 0 ? 1 : -1;
            if (w.state !== (running ? S.RUN : S.MOVE)) w.setState(running ? S.RUN : S.MOVE);
          } else if (w.state !== S.IDLE) w.setState(S.IDLE);
          break;
        }
        case S.STRIKE:
          if (w.stateFrame === F.STRIKE_ACTIVE_A) tryStrikeHit(w, foe);
          if (w.stateFrame >= F.STRIKE_TOTAL) w.setState(S.IDLE);
          break;
        case S.SLAM: if (w.stateFrame >= F.SLAM) w.setState(S.IDLE); break;
        case S.ARM_DRAG: if (w.stateFrame >= F.ARM_DRAG) w.setState(S.IDLE); break;
        case S.DOWN: if (w.stateFrame >= w.downTime) w.setState(S.GETUP); break;
        case S.GETUP: if (w.stateFrame >= F.GETUP) w.setState(S.IDLE); break;
        case S.HITSTUN: if (w.stateFrame >= F.HITSTUN) w.setState(S.IDLE); break;
        case S.SELL: if (w.stateFrame >= F.SELL) w.setState(S.IDLE); break;
        case S.WHIFF: if (w.stateFrame >= F.WHIFF) w.setState(S.IDLE); break;
        case S.GRAPPLE_STARTUP: case S.PINNING: case S.PINNED: break;
      }
    }

    if (G.exchange && !G.exchange.resolved) {
      G.exchange.frame++;
      if (G.exchange.frame > F.GRAPPLE_STARTUP) resolveGrappleConnect();
    }
    if (G.sellWin) { G.sellWin.age++; if (G.sellWin.age > G.sellWin.frames) sellWindowExpire(); }
    if (G.pin) pinTick();

    for (const sp of G.splatters) { sp.age++; if (sp.age === F.SPLATTER) PCW.render.stampStain(sp); }
    G.splatters = G.splatters.filter(sp => sp.age <= F.SPLATTER);
    if (G.shake > 0) G.shake *= 0.82;
  }

  /* ---------------- meta keys + main loop ---------------- */
  addEventListener("keydown", e => {
    if (e.code === "Space" && !e.repeat) G.slowmo = !G.slowmo;
    if (e.code === "KeyR" && !e.repeat) {
      // R restarts: from a finished match, go back to booking a new one.
      if (G.appPhase === "MATCH" && G.match && G.match.phase === "ENDED") PCW.Planning.reset();
      else if (G.appPhase === "PLANNING") PCW.Planning.reset();
    }
  });

  G.slowmo = false;
  PCW.Planning.reset();   // boot into the planning screen

  let acc = 0, last = performance.now();
  function loop(now) {
    const dt = Math.min(100, now - last); last = now; acc += dt;
    const step = G.slowmo ? 1000 / 15 : 1000 / 60;
    while (acc >= step) {
      if (G.appPhase === "PLANNING") PCW.Planning.tick();
      else logicTick();
      acc -= step;
    }
    if (G.appPhase === "PLANNING") PCW.Planning.render();
    else PCW.render.frame();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
