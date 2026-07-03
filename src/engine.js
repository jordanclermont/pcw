/* ============================================================
   PCW — engine.js  (v0.06: momentum grammar)
   The rules layer. Owns the fixed 60 Hz logic step, the move
   physics, the call sheet, and the match endings.

   v0.06 replaces the teleporty grid-step with the movement
   prototype's momentum grammar — accelerate/run, the Irish whip,
   running the ropes and rebounding, the clothesline off a rebound,
   corner staggers — and PERFORMS each booked spot through those
   verbs (Option A): tie up and reverse for the arm drag, whip him to
   a corner and stomp for the corner heat, run him into a clothesline
   for a bump, go up top from a corner for the superplex.

   THE TWO-AUDIENCE RULE, still enforced here:
     - HEAT only ever moves through crowd.react(<visible picture>)
       or the crowd's own decay/hijack. Nothing here adds heat direct.
     - TRUST and BODY move on backstage truth (missed cues, stiff
       shots, shoots) and NEVER touch heat.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;
  const G = PCW.G;
  const F = PCW.FRAMES, BODY = PCW.BODY, TRUST = PCW.TRUST, S = PCW.S, MOVE = PCW.MOVE;
  const clampGrid = PCW.clampGrid;
  const LO = PCW.BOUND_LO, HI = PCW.BOUND_HI;

  const spot = () => G.match.script[G.match.spot] || null;
  const wrestlerById = id => (G.P1.id === id ? G.P1 : G.P2);
  const defenderOf = sp => (sp && sp.bump === "STOVE") ? G.P1 : G.P2;

  /* which momentum recipe performs a given spot */
  function performKind(sp) {
    if (!sp) return null;
    if (sp.sequence === "superplex") return "SUPERPLEX";
    if (sp.move === "PIN") return "PIN";
    if (sp.move === "GRAPPLE") return sp.reversal ? "REVERSAL" : "PLANT";
    if (sp.move === "STRIKE") return sp.corner ? "CORNER_STRIKES" : "STRIKES";
    return null;
  }

  /* ---------------- start a match from a drafted sheet ---------------- */
  function startMatch(script) {
    G.tick = 0; G.renderFrame = 0; G.hitstop = 0; G.shake = 0; G.slowmo = !!G.slowmo;
    G.P1 = new PCW.Wrestler(PCW.PERSONAS.stovehot);
    G.P2 = new PCW.Wrestler(PCW.PERSONAS.boulder);
    G.pads = { p1: new PCW.Pad(PCW.PAD_MAP.p1), p2: new PCW.Pad(PCW.PAD_MAP.p2) };
    G.tieup = null; G.sellWin = null; G.pin = null; G.superplex = null; G.splatters = [];
    G.ropeShake = { t: 0, side: 0 };
    if (!G.crowd) G.crowd = new PCW.CrowdModel(); else G.crowd.reset();
    if (PCW.Commentary) PCW.Commentary.reset();
    G.match = {
      phase: "MATCH", script: script || PCW.makeMatchPlan(), spot: 0,
      trust: 100, botches: 0, shoots: 0, endInfo: null, trustFlash: null,
      shootOn: false   // set when someone kicks out of the real finish (steal armed)
    };
    G.appPhase = "MATCH";
    G.crowd.setProgress(0, G.match.script.length);
    PCW.render.clearStain();
    PCW.clearLog();
    PCW.log("Gorilla position: 'Stick to the sheet you just booked. Have a good one.'");
    say("pbp", "And the bell rings! We are underway here at PCW GRANDSTAND!");
    PCW.renderCallsheet();
  }
  PCW.startMatch = startMatch;

  /* commentary shim — a no-op until the commentary module loads */
  function say(voice, text, ttl) { if (PCW.Commentary) PCW.Commentary.say(voice, text, ttl); }

  /* ---------------- work-layer bookkeeping (backstage) ---------------- */
  function adjustTrust(delta, reason) {
    const before = G.match.trust;
    G.match.trust = Math.max(0, Math.min(100, before + delta));
    const actual = G.match.trust - before;
    if (actual !== 0) G.match.trustFlash = { delta: actual, t: 55 };
    if (reason && delta < 0) PCW.log(reason + "  ·  Trust " + G.match.trust + "/100.", "shoot");
    if (G.match.trust <= 0) matchEnd("BREAKDOWN", G.P1);
  }
  function markDone(sp) {
    sp.status = "done"; G.match.spot++;
    adjustTrust(TRUST.REGAIN);
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

  const SANCTIONABLE = new Set(["strike", "weakstrike", "slam", "reversal"]);

  function offScript(who, label, picture, severity) {
    if (SANCTIONABLE.has(picture.picture) && G.crowd.wouldServe(picture)) {
      PCW.log("AUDIBLE — " + who.short + " " + label + ", but the crowd called for it. No harm done.", "ok");
      popShake(G.crowd.react(picture));
      return;
    }
    G.match.shoots++;
    adjustTrust(-severity, "SHOOT — " + who.short + " " + label);
    popShake(G.crowd.react(picture));
    if (G.crowd.lastTone === "pop") PCW.awardRespect(who.id, PCW.RESPECT.SHOOT_POPPED);
    else PCW.awardRespect(who.id, PCW.RESPECT.SHOOT_FLOPPED);
  }

  function popShake(delta) {
    if (delta >= 14) G.shake = Math.max(G.shake, 11);
    else if (delta >= 8) G.shake = Math.max(G.shake, 6);
    return delta;
  }

  /* ============================================================
     MOMENTUM LOCOMOTION + the ropes
     ============================================================ */
  const faceFromVel = w => (w.vx - w.vy) >= 0 ? 1 : -1;
  function capSpeed(w, cap) { const s = w.speed(); if (s > cap) { w.vx *= cap / s; w.vy *= cap / s; } }

  /* free-state driving: accelerate toward the stick, else coast to a stop */
  function drive(w, pad) {
    const a = pad.axis();
    if (a.gx || a.gy) {
      w.vx += a.gx * MOVE.ACC; w.vy += a.gy * MOVE.ACC;
      capSpeed(w, MOVE.VMAX_RUN);
      w.facing = faceFromVel(w);
    } else { w.vx *= MOVE.FRIC; w.vy *= MOVE.FRIC; }
    integrate(w);
    const sp = w.speed();
    w.setState(sp > MOVE.RUN_THRESHOLD ? S.RUN : sp > 0.006 ? S.WALK : S.IDLE);
  }

  /* integrate position + rope collisions/rebounds. Called for the free
     states and for a man carrying whip/rebound momentum. */
  function integrate(w) {
    w.gx += w.vx; w.gy += w.vy;
    const bouncing = (w.state === S.WHIPPED || w.state === S.REBOUND || w.state === S.RUN);
    let hitRope = false, side = 0;
    if (w.gx < LO) { w.gx = LO; if (w.vx < 0) { w.vx = -w.vx * MOVE.ROPE_KEEP; hitRope = true; side = 3; } }
    if (w.gx > HI) { w.gx = HI; if (w.vx > 0) { w.vx = -w.vx * MOVE.ROPE_KEEP; hitRope = true; side = 1; } }
    if (w.gy < LO) { w.gy = LO; if (w.vy < 0) { w.vy = -w.vy * MOVE.ROPE_KEEP; hitRope = true; side = 0; } }
    if (w.gy > HI) { w.gy = HI; if (w.vy > 0) { w.vy = -w.vy * MOVE.ROPE_KEEP; hitRope = true; side = 2; } }
    if (hitRope) {
      G.ropeShake = { t: 12, side };
      const ci = PCW.cornerIndexAt(w.gx, w.gy);
      if (w.state === S.WHIPPED && ci >= 0) { w.cornerAimed = false; toCorner(w, ci); return; }
      // a corner whip whose first rope contact missed the buckle: say so, out
      // loud, once — no more silent broken loop with the cue still asking.
      if (w.state === S.WHIPPED && w.cornerAimed) {
        w.cornerAimed = false;
        say("color", "Too shallow — square him up with the buckle!");
        PCW.log("Whip missed the corner — line " + w.short + " up with a post and try again.", "bad");
      }
      if (bouncing) { w.setState(S.REBOUND); w.bounces = (w.bounces || 0) + 1; }
    }
    if (w.state === S.REBOUND && w.stateFrame > F.REBOUND_SETTLE) w.setState(S.RUN);
    if (w.state === S.WHIPPED && w.speed() < MOVE.VMAX_WALK && w.stateFrame > F.WHIPPED_MIN) w.setState(S.RUN);
  }

  function toCorner(w, ci) {
    const c = PCW.CORNERS[ci];
    w.gx = c.gx; w.gy = c.gy; w.stop();
    w.cornerIndex = ci; w.setState(S.CORNER);
    say("color", "Whipped hard into the corner! He's stunned up there.");
  }

  /* ============================================================
     THE TIE-UP (collar & elbow) — the hub of the grapple grammar.
     From it: whip (push a direction), plant (controller Works),
     reverse the arm drag (receiver Works, timed), or wrest control
     (receiver Grabs).
     ============================================================ */
  function tie(a, b) {
    if (!a.free() || a.distTo(b) > 1.6) { return false; }
    if (b.busy() && b.state !== S.CORNER) return false;
    a.facing = (b.gx - b.gy) >= (a.gx - a.gy) ? 1 : -1; b.facing = -a.facing;
    a.stop(); b.stop(); a.grabTarget = b; b.grabTarget = a;
    a.setState(S.TIEUP_A); b.setState(S.TIEUP_B);
    const sp = spot(), kind = performKind(sp);
    // arm the timed arm-drag reversal only when THIS tie-up is the booked
    // reversal spot (caller ties up the man who will take the drag).
    const reversalSpot = (kind === "REVERSAL" && sp.caller === a.id && defenderOf(sp) === a) ? sp : null;
    G.tieup = { controller: a, receiver: b, frame: 0, reversalAttempted: false, reversalSpot };
    PCW.log(a.short + " locks up with " + b.short + ".");
    return true;
  }
  /* is w the receiver in a live tie-up whose reversal window is open? (render) */
  const tieReversalOpen = () => G.tieup && G.tieup.reversalSpot &&
    G.tieup.frame >= F.WINDOW_OPEN && G.tieup.frame <= F.WINDOW_CLOSE;
  PCW.tieReversalOpen = tieReversalOpen;

  function irishWhip(a, b, dir) {
    G.tieup = null;
    a.grabTarget = null; b.grabTarget = null;
    a.setState(S.WHIP); b.setState(S.WHIPPED);
    let vx = dir.gx, vy = dir.gy;
    const sp = spot();
    // In a worked match the whipped man RUNS to the buckle himself. When the
    // booked spot is corner-gated, bend his launch straight at whichever post
    // sits within ~35° of the whip direction, so an intuitive aim always lands.
    // Whips with nothing corner-gated booked stay honest (unassisted).
    b.cornerAimed = !!(sp && (sp.corner || sp.sequence === "superplex"));
    if (b.cornerAimed) {
      const post = aimAtPostInCone(b, dir, 35 * Math.PI / 180);
      if (post) { vx = post.x; vy = post.y; }
    }
    b.vx = vx * MOVE.WHIP_V; b.vy = vy * MOVE.WHIP_V;
    b.whipFrom = a; b.bounces = 0;
    PCW.log(a.short + " whips " + b.short + (b.cornerAimed ? " toward the corner." : " across the ring."));
  }

  /* the post whose direction from b best aligns with the whip within `cone`
     radians; null if no post is in the cone (leave the whip unassisted). */
  function aimAtPostInCone(b, dir, cone) {
    const dm = Math.hypot(dir.gx, dir.gy) || 1, dx = dir.gx / dm, dy = dir.gy / dm;
    let best = null, bestDot = Math.cos(cone);
    for (const c of PCW.CORNERS) {
      const tx = c.gx - b.gx, ty = c.gy - b.gy, m = Math.hypot(tx, ty);
      if (m < 0.001) continue;
      const dot = (tx / m) * dx + (ty / m) * dy;
      if (dot >= bestDot) { bestDot = dot; best = { x: tx / m, y: ty / m }; }
    }
    return best;
  }

  function reverseTie(receiver) {
    const controller = receiver.grabTarget;
    if (!controller || controller.state !== S.TIEUP_A) return;
    controller.setState(S.TIEUP_B); receiver.setState(S.TIEUP_A);
    controller.grabTarget = receiver; receiver.grabTarget = controller;
    const sp = spot(), kind = performKind(sp);
    const reversalSpot = (kind === "REVERSAL" && sp.caller === receiver.id && defenderOf(sp) === receiver) ? sp : null;
    G.tieup = { controller: receiver, receiver: controller, frame: 0, reversalAttempted: false, reversalSpot };
    say("color", "Reversed! " + receiver.short + " wrenches the hold around.");
  }

  /* the controller executes the plant out of the tie-up (Work) */
  function controllerPlant(w) {
    const t = G.tieup, def = t.receiver; G.tieup = null;
    const sp = spot(), kind = performKind(sp);
    plantBump(w, def, 0.9);
    if (t.reversalSpot) {
      // the controller planted during the FACE's booked reversal — he buried
      // the spot. Reads to the crowd as a slam; costs a real bump + trust.
      def.hurt(BODY.BOTCH_SLAM);
      adjustTrust(-TRUST.STIFF, w.short + " planted him instead of giving the arm drag");
      G.crowd.react({ picture: "slam", role: w.role, base: sp.pop, quality: 0.7, arcSlot: sp.arcSlot, actor: w });
      markBotched(sp);
      return;
    }
    if (kind === "PLANT" && sp.caller === w.id && defenderOf(sp) === def) {
      def.hurt(BODY.WORKED_SLAM);
      popShake(G.crowd.react({ picture: "slam", role: w.role, base: sp.pop, quality: 1.0, arcSlot: sp.arcSlot, big: !!sp.big, actor: w }));
      PCW.log((sp.big ? sp.name + " — " : "") + "planted flush.", "ok");
      say("pbp", sp.big ? sp.name + "! He got all of it!" : "Scoop and a slam, " + w.short + " in control.");
      markDone(sp);
    } else {
      def.hurt(BODY.SHOOT_SLAM);
      offScript(w, "dropped " + def.short + " off-script",
        { picture: "slam", role: w.role, base: 8, quality: 0.9, arcSlot: "transition", actor: w }, TRUST.SLAM);
    }
  }

  /* shared plant physics: shove the receiver down and out */
  function plantBump(atk, def, push) {
    atk.setState(S.SLAM);
    const dx = def.gx - atk.gx, dy = def.gy - atk.gy, m = Math.hypot(dx, dy) || 1;
    def.gx = clampGrid(def.gx + dx / m * push); def.gy = clampGrid(def.gy + dy / m * push);
    def.stop(); def.downTime = F.DOWN; def.setState(S.DOWN);
    PCW.render.inkBurst(def); G.hitstop = F.HITSTOP; G.shake = 8;
  }

  /* the receiver attempts the arm-drag reversal (Work) */
  function receiverReverse(w) {
    const t = G.tieup; if (t.reversalAttempted) return;
    t.reversalAttempted = true;
    const controller = t.controller, sp = spot();
    const f = t.frame, inWin = f >= F.WINDOW_OPEN && f <= F.WINDOW_CLOSE;
    const perfect = (f === 6 || f === 7);
    G.tieup = null;
    // arm-drag physics: the controller sails over, the receiver stays up
    const dx = controller.gx - w.gx, dy = controller.gy - w.gy, m = Math.hypot(dx, dy) || 1;
    controller.gx = clampGrid(w.gx - dx / m * 2.1); controller.gy = clampGrid(w.gy - dy / m * 2.1);
    controller.stop(); w.setState(S.ARM_DRAG);
    if (t.reversalSpot && inWin) {
      controller.hurt(BODY.ARM_DRAG); controller.downTime = F.DOWN_SHORT; controller.setState(S.DOWN);
      PCW.render.spawnSplatter(w); G.hitstop = F.HITSTOP; G.shake = 6;
      popShake(G.crowd.react({ picture: "reversal", role: w.role, base: sp.pop, quality: perfect ? 1.25 : 1.0, arcSlot: sp.arcSlot, actor: w }));
      PCW.log(w.short + (perfect ? " — PICTURE-PERFECT arm drag (f" + f + ")" : " — clean arm drag (f" + f + ")"), "ok");
      say("pbp", "Arm drag! " + w.short + " slips it and takes him over — listen to this crowd!");
      markDone(sp);
    } else if (t.reversalSpot) {
      // booked reversal, mistimed: the crowd sees the controller shrug him off
      // into a slam. A real bump + a broken cue, both invisible to the crowd.
      controller.setState(S.WHIFF);
      w.stop(); w.hurt(BODY.BOTCH_SLAM); w.downTime = F.DOWN; w.setState(S.DOWN);
      adjustTrust(-TRUST.STIFF, w.short + " blew the arm-drag timing (f" + f + ", window 4–9)");
      G.crowd.react({ picture: "slam", role: controller.role, base: sp.pop, quality: 0.6, arcSlot: sp.arcSlot, actor: controller });
      markBotched(sp);
    } else {
      // reversing a tie-up that wasn't the booked spot: a clean counter to the
      // crowd (a pop) but a broken cue backstage (a shoot).
      controller.hurt(BODY.ARM_DRAG); controller.downTime = F.DOWN_SHORT; controller.setState(S.DOWN);
      PCW.render.spawnSplatter(w); G.hitstop = F.HITSTOP; G.shake = 6;
      offScript(w, "reversed a spot that wasn't called",
        { picture: "reversal", role: w.role, base: 6, quality: 1.0, arcSlot: "transition", actor: w }, TRUST.REVERSAL);
    }
  }

  /* auto-break a tie-up nobody works */
  function tieupTick() {
    const t = G.tieup; if (!t) return;
    t.frame++;
    if (t.frame > F.TIEUP_HOLD) {
      t.controller.setState(S.IDLE); t.receiver.setState(S.IDLE);
      t.controller.grabTarget = null; t.receiver.grabTarget = null;
      G.tieup = null;
      PCW.log("Clean break.");
    }
  }

  /* ============================================================
     STRIKES + the clothesline
     ============================================================ */
  function strikeContact(a, foe) {
    const charging = (foe.state === S.WHIPPED || foe.state === S.REBOUND || foe.state === S.RUN)
      && foe.speed() > MOVE.CLOTHESLINE_MIN;
    if (a.distTo(foe) < 1.9 && charging) { clothesline(a, foe); return; }
    if (a.distTo(foe) > 1.5) return;   // swung at air
    strikeWorkedHit(a, foe);
  }

  function clothesline(a, foe) {
    a.setState(S.CLOTHESLINE);
    foe.bumpSpin = (a.facing >= 0 ? 1 : -1);
    foe.stop(); foe.hurt(BODY.SHOOT_SLAM); foe.setState(S.BUMP);
    PCW.render.spawnSplatter(foe); G.hitstop = F.HITSTOP; G.shake = 12;
    // a big collision nobody called — priced as a liberty, but sanctioned if
    // the crowd is chanting for action/a big one.
    offScript(a, "turned " + foe.short + " inside out with a clothesline",
      { picture: "slam", role: a.role, base: 9, quality: 1.0, arcSlot: "transition", actor: a }, TRUST.STIFF);
    say("pbp", "CLOTHESLINE! He nearly took his head off!");
  }

  function strikeWorkedHit(atk, def) {
    if (def.busy() && def.state !== S.WALK && def.state !== S.RUN && def.state !== S.HITSTUN && def.state !== S.CORNER) return;
    const sp = spot(), kind = performKind(sp);
    // a corner-strike spot needs the bump-taker in a corner (positional — he
    // stays there across the stomps even as the stun state drops on each hit).
    if (sp && sp.corner && kind === "CORNER_STRIKES" && sp.caller === atk.id && !PCW.atCorner(def)) {
      atk.setState(S.WHIFF);
      PCW.log("Not in the corner — whip " + def.short + " into the buckle first.");
      return;
    }
    def.setState(S.HITSTUN);
    PCW.render.inkBurst(def); G.hitstop = 3; G.shake = 3;
    if (sp && sp.move === "STRIKE" && sp.caller === atk.id && defenderOf(sp) === def) {
      def.hurt(BODY.WORKED_STRIKE);
      G.sellWin = { defender: def, frames: F.SELL_WINDOW, age: 0, spotRef: sp, attacker: atk };
      PCW.log(atk.short + " lights him up — " + def.short + ", sell it!");
    } else {
      def.hurt(BODY.SHOOT_STRIKE);
      offScript(atk, "threw a potato at " + def.short,
        { picture: "strike", role: atk.role, base: 3, quality: 0.6, arcSlot: "transition", actor: atk }, TRUST.STRIKE);
    }
  }

  function doSell(def) {
    const sw = G.sellWin, crisp = sw.age <= 12, atk = sw.attacker;
    G.sellWin = null; def.setState(S.SELL);
    const sp = sw.spotRef; if (!sp || sp.move !== "STRIKE") return;
    sp._count = (sp._count || 0) + 1;
    popShake(G.crowd.react({ picture: "strike", role: atk.role, base: sp.pop, quality: crisp ? 1.0 : 0.7, arcSlot: sp.arcSlot, actor: atk }));
    PCW.log((crisp ? def.short + " sells it to the cheap seats" : "a beat late, but it reads") + " (" + sp._count + "/" + sp.count + ")");
    if (sp._count >= sp.count) markDone(sp);
  }
  function sellWindowExpire() {
    const sp = G.sellWin.spotRef, atk = G.sellWin.attacker;
    G.sellWin = null;
    if (!sp || sp.move !== "STRIKE") return;
    sp._count = (sp._count || 0) + 1;
    G.crowd.react({ picture: "weakstrike", role: atk.role, base: 2, quality: 0.4, arcSlot: sp.arcSlot, actor: atk });
    PCW.log("No-sold it. Flat crowd. (" + sp._count + "/" + sp.count + ")", "bad");
    if (sp._count >= sp.count) markDone(sp);
  }

  /* ============================================================
     TAUNT — play to the crowd. Always legit crowd work (never a shoot):
     a face taunt pops the room; a heel taunt draws heat and banks
     resentment for the comeback; either can answer a chant for respect.
     ============================================================ */
  function taunt(w) {
    w.stop(); w.setState(S.TAUNT);
    const face = w.role === "face";
    popShake(G.crowd.react({
      picture: face ? "reversal" : "strike",   // a cheer-picture for the face, a heat-picture for the heel
      role: w.role, base: 4, quality: 1.0, arcSlot: "transition", actor: w, taunt: true
    }));
    PCW.log(w.short + " plays to the crowd.");
    say("color", face ? w.short + " soaking it in — the people are with him!" : w.short + " running his mouth, and they are letting him hear it.");
  }

  /* ============================================================
     THE TOP-ROPE SUPERPLEX — cooperative chain (unchanged rules)
     ============================================================ */
  function initiateSuperplex(atk, def) {
    const ci = PCW.cornerIndexAt(def.gx, def.gy), c = PCW.CORNERS[ci];
    def.gx = c.gx; def.gy = c.gy; def.stop();
    const side = c.gx < PCW.GRID / 2 ? 1 : -1;
    atk.gx = clampGrid(c.gx + side * 0.9); atk.gy = clampGrid(c.gy + 0.3); atk.stop();
    atk.facing = side >= 0 ? 1 : -1; def.facing = -atk.facing;
    atk.setState(S.SPX_CLIMB); def.setState(S.SPX_WAIT);
    G.superplex = {
      attacker: atk, defender: def, corner: ci, step: "CLIMB", frame: 0,
      posHit: null, posClean: false, throwHit: null, throwClean: false,
      landAtk: null, landAtkWin: false, landDef: null, landDefWin: false
    };
    PCW.log(atk.short + " climbs the turnbuckle — this is the big one.");
    say("pbp", atk.short + " is going up top! What is he thinking?!");
  }
  const spxInWin = (sx, o, c) => sx.frame >= o && sx.frame <= c;
  function superplexInput(w) {
    const sx = G.superplex; if (!sx) return;
    if (sx.step === "POSITION" && w === sx.defender && sx.posHit == null) {
      sx.posHit = true; sx.posClean = spxInWin(sx, F.SPX_POS_OPEN, F.SPX_POS_CLOSE);
      if (!sx.posClean) PCW.log(sx.defender.short + " was slow getting up top.", "bad");
    } else if (sx.step === "THROW" && w === sx.attacker && sx.throwHit == null) {
      sx.throwHit = true; sx.throwClean = spxInWin(sx, F.SPX_THROW_OPEN, F.SPX_THROW_CLOSE);
      if (!sx.throwClean) PCW.log(sx.attacker.short + " rushed the throw.", "bad");
    } else if (sx.step === "LAND") {
      if (w === sx.attacker && sx.landAtk == null) { sx.landAtk = true; sx.landAtkWin = spxInWin(sx, F.SPX_LAND_OPEN, F.SPX_LAND_CLOSE); }
      if (w === sx.defender && sx.landDef == null) { sx.landDef = true; sx.landDefWin = spxInWin(sx, F.SPX_LAND_OPEN, F.SPX_LAND_CLOSE); }
    }
  }
  function superplexAbort(reason) {
    const sx = G.superplex; G.superplex = null;
    sx.attacker.setState(S.WHIFF); sx.defender.setState(S.IDLE);
    PCW.log("The superplex fell apart — " + reason + ". Reset it.", "bad");
    G.crowd.react({ picture: "weakstrike", role: sx.attacker.role, base: 1, quality: 0.3, arcSlot: "transition", actor: sx.attacker });
  }
  function superplexTick() {
    const sx = G.superplex; if (!sx) return;
    sx.frame++;
    const A = sx.attacker, D = sx.defender;
    if (sx.step === "CLIMB") {
      if (sx.frame >= F.SPX_CLIMB) { sx.step = "POSITION"; sx.frame = 0; A.setState(S.SPX_TOP); D.setState(S.SPX_RECEIVE); PCW.log(D.short + " — meet him up top! (Work)"); }
    } else if (sx.step === "POSITION") {
      if (sx.posHit != null) { sx.step = "THROW"; sx.frame = 0; PCW.log(A.short + " — bring him over! (Work)"); }
      else if (sx.frame >= F.SPX_POS_TIMEOUT) superplexAbort(D.short + " never went up with him");
    } else if (sx.step === "THROW") {
      if (sx.throwHit != null) { sx.step = "LAND"; sx.frame = 0; A.setState(S.SPX_THROW); }
      else if (sx.frame >= F.SPX_THROW_TIMEOUT) superplexAbort(A.short + " never brought him over");
    } else if (sx.step === "LAND") {
      if ((sx.landAtk != null && sx.landDef != null) || sx.frame >= F.SPX_LAND_TIMEOUT) superplexResolve();
    }
  }
  function superplexResolve() {
    const sx = G.superplex; G.superplex = null;
    const A = sx.attacker, D = sx.defender, sp = spot();
    const landClean = !!(sx.landAtkWin && sx.landDefWin);
    const misses = (sx.posClean ? 0 : 1) + (sx.throwClean ? 0 : 1) + (landClean ? 0 : 1);
    const quality = Math.max(0.4, 1.25 - misses * 0.28);
    D.hurt(BODY.WORKED_SLAM + misses * 5);
    const c = PCW.CORNERS[sx.corner];
    D.gx = clampGrid(c.gx + (c.gx < PCW.GRID / 2 ? 1.4 : -1.4)); D.gy = clampGrid(c.gy);
    D.stop(); D.downTime = F.DOWN; D.setState(S.DOWN);
    A.gx = clampGrid(D.gx + 0.2); A.stop(); A.setState(S.WHIFF);
    PCW.render.inkBurst(D); G.hitstop = F.HITSTOP; G.shake = 12;
    if (sp && sp.sequence === "superplex" && sp.caller === A.id) {
      popShake(G.crowd.react({ picture: "slam", role: A.role, base: sp.pop, quality, arcSlot: sp.arcSlot, big: true, actor: A }));
      PCW.log("TOP-ROPE SUPERPLEX" + (misses ? " — sloppy, " + misses + " missed beat" + (misses > 1 ? "s" : "") : " — PICTURE PERFECT!"), misses ? "bad" : "ok");
      say("pbp", misses ? "He got him over — but it was ugly!" : "SUPERPLEX OFF THE TOP! Oh my! Both men are down!");
      markDone(sp);
    } else {
      offScript(A, "hit an uncalled superplex",
        { picture: "slam", role: A.role, base: 12, quality, arcSlot: "transition", big: true, actor: A }, TRUST.SLAM);
    }
  }

  /* ============================================================
     THE PIN + the orchestrated finish sequence
     ============================================================
     The demo's climax the whole thing is built for (bible §8): the
     Front Burner, a kick-out, The Boulder's OWN near-fall, then a
     second Front Burner to keep him down. finishStage tracks it as the
     booked finish spots resolve:
       null           → not in the finish yet
       FIRST_BURNER   → first Front Burner armed, waiting to land
       FIRST_COVER    → it landed; the cover should be a booked kick-out
       BOULDER_COMEBACK / BOULDER_NEARFALL_DONE → the champ's near-fall
       SECOND_COVER   → the second Front Burner; this one keeps him down */
  function startPin(atk, def) {
    const sp = spot();
    const isFinishPin = !!(sp && sp.move === "PIN" && sp.caller === atk.id);
    const outcome = isFinishPin ? sp.outcome : null;        // "kickout" | "win"
    // a STEAL: after a shoot-kickout of the real finish, the champion (heel)
    // covering for real to take the win he was never booked to get.
    const steal = !!(G.match.shootOn && !isFinishPin && atk.role === "heel");
    atk.gx = clampGrid(def.gx - 0.35); atk.gy = clampGrid(def.gy - 0.35); atk.stop();
    atk.setState(S.PINNING); def.setState(S.PINNED);
    G.pin = { attacker: atk, defender: def, count: 0, frame: 0, finish: isFinishPin, outcome, steal, pop: sp ? sp.pop : 22 };
    if (!isFinishPin && !steal) offScript(atk, "went for a pin that wasn't the finish",
      { picture: "nearfall", role: atk.role, base: 6, quality: 1.0, arcSlot: "transition", actor: atk }, TRUST.PIN);
    PCW.log(atk.short + " hooks the leg...");
    say("pbp", steal ? "The champion is covering him — for REAL this time!" : "He hooks the leg! The referee slides in!");
  }

  function pinTick() {
    const pin = G.pin; pin.frame++;
    if (pin.frame % F.PIN_COUNT !== 0) return;
    pin.count++;
    popShake(G.crowd.react({ picture: "nearfall", role: pin.attacker.role, base: 5, quality: 1.0, arcSlot: pin.finish ? "finish" : "transition", actor: pin.attacker }));
    PCW.log("REF: ..." + pin.count + "!");
    say("pbp", pin.count === 1 ? "ONE!" : pin.count === 2 ? "TWO!—" : "THREE!");

    if (pin.count === 2) {
      // a booked near-fall resolves at two whether or not the pinned man
      // pressed Work (Work just makes it crisper) — so the finish never strands.
      if (pin.outcome === "kickout") { bookedNearFall("auto"); return; }
      // a stray/unplanned pin: scripted survival, the other man kicks out.
      if (!pin.finish && !pin.steal) { pinKickout(false); return; }
    }
    if (pin.count >= 3) {
      if (pin.steal) { say("pbp", "He STOLE it! A three-count on the challenger — bedlam!"); matchEnd("SCREWJOB", pin.attacker); return; }
      if (pin.finish && pin.outcome === "win") {
        popShake(G.crowd.react({ picture: "pin", role: pin.attacker.role, base: pin.pop, quality: 1.0, arcSlot: "finish", big: true, actor: pin.attacker }));
        spot().status = "done";
        say("pbp", "THREE! It's over! We have a NEW CHAMPION!");
        matchEnd("CLEAN", pin.attacker);
      }
    }
  }

  /* a booked kick-out near-fall: the pinned man survives at two, the spot's
     JOB is done, and the sheet advances to the next finish beat. */
  function bookedNearFall(via) {
    const pin = G.pin, def = pin.defender, atk = pin.attacker, sp = spot();
    G.pin = null;
    def.downTime = 44; def.setState(S.DOWN); atk.setState(S.WHIFF);
    const crisp = via === "work";
    popShake(G.crowd.react({ picture: "kickout", role: def.role, base: 12, quality: crisp ? 1.15 : 1.0, arcSlot: "finish", big: true, actor: def }));
    say("pbp", def.short + " KICKS OUT AT TWO! I do not believe it!");
    markDone(sp);
  }

  /* the Work button while pinned routes by the pin's booked outcome */
  function handlePinWork(def) {
    const pin = G.pin;
    if (pin.outcome === "kickout") { bookedNearFall("work"); return; }   // cooperative near-fall
    if (pin.outcome === "win") { pinKickout(true); return; }              // SHOOT — kicking out of the real finish
    if (pin.steal) { stealEscape(); return; }                            // fighting out of a betrayal
  }

  function pinKickout(isShoot) {
    const atk = G.pin.attacker, def = G.pin.defender;
    G.pin = null;
    def.downTime = 40; def.setState(S.DOWN); atk.setState(S.WHIFF);
    if (isShoot) {
      G.match.shootOn = true;   // the steal is now armed
      offScript(def, "kicked out of the REAL FINISH",
        { picture: "kickout", role: def.role, base: 14, quality: 1.0, arcSlot: "finish", big: true, actor: def }, TRUST.KICKOUT);
      say("pbp", "HE KICKED OUT?! He was NOT supposed to! What is he DOING?!");
    } else {
      popShake(G.crowd.react({ picture: "kickout", role: def.role, base: 8, quality: 1.0, arcSlot: "transition", actor: def }));
      PCW.log(def.short + " kicks out at two — scripted survival.");
    }
  }

  /* the booked winner fighting out of a stolen pin — no penalty, it disarms
     the steal and sends them back to the finish. */
  function stealEscape() {
    const pin = G.pin, def = pin.defender;
    G.pin = null; G.match.shootOn = false;
    def.downTime = 30; def.setState(S.DOWN); pin.attacker.setState(S.WHIFF);
    popShake(G.crowd.react({ picture: "kickout", role: def.role, base: 14, quality: 1.0, arcSlot: "finish", big: true, actor: def }));
    say("pbp", def.short + " kicks out! He is fighting to save this match!");
    PCW.log(def.short + " fights out of the stolen pin — back to the finish.");
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
    if ((PCW.G.respect.p1 + PCW.G.respect.p2) / 2 >= 65) stars += 0.25;
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
    say("pbp", type === "CLEAN" ? "What a match! What a NIGHT!" : type === "SCREWJOB" ? "The office is going to have something to say about THAT." : "That's all she wrote, folks.");
    PCW.log("MATCH OVER (" + type + ") — " + PCW.starText(stars) + " — " + blurb, type === "CLEAN" ? "ok" : "bad");
  }
  PCW.matchEnd = matchEnd;

  /* ============================================================
     the current on-canvas instruction for a wrestler (world cue)
     ============================================================ */
  const other = w => w === G.P1 ? G.P2 : G.P1;
  /* Every player-facing cue: say WHAT TO DO in wrestling terms, then name the
     literal key for THAT player. The words "work"/"plant" never appear on
     screen — they stay in the bible and code; the cue names the key.
     KEYLABEL maps each pad button to its actual key letter per player. */
  const KEYLABEL = {
    p1: { work: "T", grab: "G", strike: "F", taunt: "H" },
    p2: { work: "I", grab: "K", strike: "J", taunt: "L" }
  };
  const padKey = (w, btn) => KEYLABEL[w.id][btn];

  function cueText(w) {
    const m = G.match; if (!m || m.phase !== "MATCH") return null;
    const sx = G.superplex;
    if (sx) {
      const atk = w === sx.attacker;
      if (sx.step === "CLIMB") return atk ? "CLIMBING UP…" : "HE'S GOING UP TOP…";
      if (sx.step === "POSITION") return atk ? "WAIT FOR HIM…" : "GET UP THERE — PRESS " + padKey(w, "work");
      if (sx.step === "THROW") return atk ? "THROW HIM OFF — PRESS " + padKey(w, "work") : "HANG ON…";
      if (sx.step === "LAND") return "LAND IT — PRESS " + padKey(w, "work");
      return null;
    }
    if (G.tieup) {
      const t = G.tieup, isCtrl = w === t.controller, isRecv = w === t.receiver, sp0 = spot();
      if (t.reversalSpot) {
        if (isRecv) return "REVERSE HIM — PRESS " + padKey(w, "work") + " NOW";
        if (isCtrl) return "LET HIM TAKE YOU OVER";
        return null;
      }
      // plain tie-up: show only what the sheet wants now — a corner spot wants
      // a whip, everything else wants a slam. The other options still work.
      const cornerWanted = sp0 && (sp0.corner || sp0.sequence === "superplex") && sp0.caller === t.controller.id;
      if (isCtrl) return cornerWanted ? "WHIP HIM AT A CORNER — PUSH A DIRECTION" : "SLAM HIM — PRESS " + padKey(w, "work");
      if (isRecv) return cornerWanted ? "HE'LL WHIP YOU — HANG ON" : "HE'LL SLAM YOU — RIDE IT";
      return null;
    }
    if (G.sellWin && G.sellWin.defender === w) return "SELL IT — PRESS " + padKey(w, "work");
    if (G.pin) {
      if (G.pin.defender === w) {
        if (G.pin.steal) return "FIGHT OUT — PRESS " + padKey(w, "work");
        if (G.pin.outcome === "win") return "STAY DOWN — TOUCH NOTHING";
        return "KICK OUT — PRESS " + padKey(w, "work");
      }
      return null;
    }
    const sp = spot(); if (!sp) return "MATCH'S OVER — GO HOME";
    const kind = performKind(sp), caller = wrestlerById(sp.caller), def = defenderOf(sp);
    const isCaller = w === caller, isDef = w === def;
    switch (kind) {
      case "REVERSAL": {
        // the caller (heel) locks up; the OTHER man reverses into the arm drag
        if (isCaller) return "LOCK HIM UP — PRESS " + padKey(w, "grab");
        if (w === other(caller)) return "REVERSE WHEN HE LOCKS UP";
        return null;
      }
      case "PLANT":
        return isCaller ? "LOCK HIM UP — PRESS " + padKey(w, "grab") : isDef ? "LET HIM LOCK UP" : null;
      case "STRIKES":
        return isCaller ? "STRIKE HIM — PRESS " + padKey(w, "strike") : isDef ? "SELL EACH ONE — PRESS " + padKey(w, "work") : null;
      case "CORNER_STRIKES":
        if (!PCW.atCorner(def))
          return isCaller ? "SEND HIM TO A CORNER — LOCK UP, PRESS " + padKey(w, "grab") : isDef ? "HE'S SENDING YOU TO THE CORNER" : null;
        return isCaller ? "STOMP HIM — PRESS " + padKey(w, "strike") : isDef ? "SELL EACH ONE — PRESS " + padKey(w, "work") : null;
      case "SUPERPLEX":
        if (def.state !== S.CORNER)
          return isCaller ? "SEND HIM TO A CORNER — LOCK UP, PRESS " + padKey(w, "grab") : isDef ? "GET TO A CORNER" : null;
        return isCaller ? "GO UP TOP — PRESS " + padKey(w, "grab") : isDef ? "STAY THERE — TRUST HIM" : null;
      case "PIN":
        if (isCaller) return "COVER HIM — PRESS " + padKey(w, "grab");
        if (isDef) return sp.outcome === "win" ? "STAY DOWN — TOUCH NOTHING" : "KICK OUT WHEN HE COVERS";
        return null;
    }
    return null;
  }
  PCW.cueText = cueText;

  /* ============================================================
     LOGIC TICK — fixed 60 Hz
     ============================================================ */
  function logicTick() {
    G.tick++;
    if (G.hitstop > 0) { G.hitstop--; return; }
    const justSet = PCW.drainPresses();
    G.pads.p1.beginTick(justSet); G.pads.p2.beginTick(justSet);
    if (G.match.phase === "ENDED") return;

    G.crowd.update();
    if (PCW.Commentary) PCW.Commentary.update();
    if (G.match.trustFlash && --G.match.trustFlash.t <= 0) G.match.trustFlash = null;
    if (G.ropeShake && G.ropeShake.t > 0) G.ropeShake.t--;

    const pairs = [[G.P1, G.pads.p1, G.P2], [G.P2, G.pads.p2, G.P1]];
    for (const [w, pad, foe] of pairs) {
      w.stateFrame++;
      w.gait += 0.28 * (w.state === S.RUN ? 1.15 : w.state === S.WHIPPED || w.state === S.REBOUND ? 1.5 : 0.7);

      /* WORK button (Y) — context-sensitive cooperation / the job */
      if (pad.just.Y) {
        if (G.superplex && (G.superplex.attacker === w || G.superplex.defender === w)) superplexInput(w);
        else if (G.tieup && w === G.tieup.controller) controllerPlant(w);
        else if (G.tieup && w === G.tieup.receiver) receiverReverse(w);
        else if (G.sellWin && G.sellWin.defender === w) doSell(w);
        else if (G.pin && G.pin.defender === w) handlePinWork(w);
      }

      /* action initiations */
      if (w.free()) {
        if (pad.just.B) tryGrab(w, foe);
        else if (pad.just.A) w.setState(S.STRIKE);
        else if (pad.just.X) taunt(w);
      } else if (w.state === S.TIEUP_A) {
        const a = pad.axis();
        if (a.gx || a.gy) irishWhip(w, w.grabTarget, a);
      } else if (w.state === S.TIEUP_B) {
        if (pad.just.B) reverseTie(w);
      } else if (w.state === S.WHIPPED || w.state === S.REBOUND) {
        if (pad.just.A) w.setState(S.STRIKE);   // strike out of a rebound = clothesline
      }

      /* per-state updates */
      switch (w.state) {
        case S.IDLE: case S.WALK: case S.RUN: drive(w, pad); break;
        case S.WHIPPED: case S.REBOUND: integrate(w); break;
        case S.STRIKE:
          if (w.stateFrame === F.STRIKE_ACTIVE_A) strikeContact(w, foe);
          if (w.stateFrame >= F.STRIKE_TOTAL) w.setState(S.IDLE);
          break;
        case S.CLOTHESLINE: if (w.stateFrame >= F.CLOTHESLINE) w.setState(S.IDLE); break;
        case S.WHIP: if (w.stateFrame >= F.WHIP) w.setState(S.IDLE); break;
        case S.SLAM: if (w.stateFrame >= F.SLAM) w.setState(S.IDLE); break;
        case S.ARM_DRAG: if (w.stateFrame >= F.ARM_DRAG) w.setState(S.IDLE); break;
        case S.BUMP: if (w.stateFrame >= F.BUMP) { w.downTime = F.DOWN; w.setState(S.DOWN); } break;
        case S.DOWN: if (w.stateFrame >= w.downTime) w.setState(S.GETUP); break;
        case S.GETUP: if (w.stateFrame >= F.GETUP) w.setState(S.IDLE); break;
        case S.HITSTUN: if (w.stateFrame >= F.HITSTUN) w.setState(S.IDLE); break;
        case S.SELL: if (w.stateFrame >= F.SELL) w.setState(S.IDLE); break;
        case S.TAUNT: if (w.stateFrame >= F.TAUNT) w.setState(S.IDLE); break;
        case S.WHIFF: if (w.stateFrame >= F.WHIFF) w.setState(S.IDLE); break;
        case S.CORNER: if (w.stateFrame >= F.CORNER_STAGGER) w.setState(S.IDLE); break;
        case S.TIEUP_A: case S.TIEUP_B:
        case S.PINNING: case S.PINNED:
        case S.SPX_CLIMB: case S.SPX_TOP: case S.SPX_THROW: case S.SPX_WAIT: case S.SPX_RECEIVE: break;
      }
    }

    if (G.tieup) tieupTick();
    if (G.sellWin) { G.sellWin.age++; if (G.sellWin.age > G.sellWin.frames) sellWindowExpire(); }
    if (G.pin) pinTick();
    if (G.superplex) superplexTick();

    for (const sp of G.splatters) { sp.age++; if (sp.age === F.SPLATTER) PCW.render.stampStain(sp); }
    G.splatters = G.splatters.filter(sp => sp.age <= F.SPLATTER);
    if (G.shake > 0) G.shake *= 0.82;
  }

  /* Grab (B): pin a downed man, go up top from a corner, or tie up */
  function tryGrab(w, foe) {
    if ((foe.state === S.DOWN || foe.state === S.GETUP) && w.distTo(foe) < 1.7) { startPin(w, foe); return; }
    if (foe.state === S.CORNER && w.distTo(foe) < 1.9) { initiateSuperplex(w, foe); return; }
    if (!tie(w, foe)) { w.setState(S.WHIFF); PCW.log(w.short + " reaches — nobody home."); }
  }

  /* ---------------- meta keys + main loop ---------------- */
  addEventListener("keydown", e => {
    if (e.code === "Space" && !e.repeat) G.slowmo = !G.slowmo;
    if (e.code === "KeyR" && !e.repeat) {
      if (G.appPhase === "MATCH" && G.match && G.match.phase === "ENDED") PCW.Planning.reset();
      else if (G.appPhase === "PLANNING") PCW.Planning.reset();
    }
  });

  G.slowmo = false;
  PCW.Planning.reset();

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
