# PCW playtest notes

Log entries after each play session. Bring the newest entries into the next
Claude Code session as the brief.

Format per entry:
- Date / build version
- What felt wrong
- What broke
- What surprised you (good or bad)
- One thing to change next

---

## 2026-07-02 / v0.03 — build brief (not a playtest yet)

What changed this session:
- Code split out of index.html into src/ modules + data/ (personas,
  call sheet). index.html still opens straight from disk, no build step.
- Character fix: STOVE HOT is now the FACE (orange, bald + goatee,
  finisher The Front Burner). THE BOULDER is the HEEL (navy/gold,
  flat-top, The Landslide). "Greg Texas" and the cowboy hat are gone.
  Stove Hot is player 1 (WASD); The Boulder is player 2 (arrows).
- Crowd model v1: heat now reacts to the PICTURE only — allegiance
  (the crowd is Stove's), a story arc (opener/heat/comeback/finish),
  banked resentment during heel heat that pays off the comeback, a
  belief supply that a too-early finisher burns, and one hijack chant
  when the match stalls (serve it or lose them).
- Two-audience fix: botches the crowd can't see no longer cost heat —
  a mistimed reversal now reads as a slam and costs body + trust
  backstage instead. Kicking out of the finish still pops the crowd
  while wrecking trust.
- New signature effect: flashbulbs ripple through a darkened crowd on
  big pops; the whole arena strobes on a high-heat near-fall.

What to feel for when you play it:
- Does the comeback actually feel bigger after a long heel heat run?
  (That's the resentment payoff — tune if it's too weak/strong.)
- Is the hijack chant showing up too often / not enough?
- Do the flashbulbs read as a reward, or get lost on the paper ring?
  (Full dark-arena art is a later pass; this is the placeholder.)

## 2026-07-02 / v0.03.1 — feedback response (perceivability pass)

Jordan's note from the v0.03 play: all three systems only spoke through
the log sidebar, which is unreadable mid-match with both hands on the
keys. Fix = make them speak through the game world. Done:
- Reaction popups now leap off the wrestler who acted ("POP", "COMEBACK!",
  "HEEL HEAT", "1-2-3!") — your eyes are already on the wrestlers.
- The comeback is now visible before it happens: an orange arena glow
  swells as heel heat banks resentment, a "CROWD BEHIND STOVE" bar fills,
  and a pulsing "FIRE UP! ▼" cue appears over Stove when the payoff window
  is open. Cashing it in shakes the screen and throws a big flash.
- The hijack chant is now a big centre banner with the demand in plain
  words + the action to take + a draining timer, and a bouncing arrow
  over the wrestler who should act. Serving it pops a green "YES!".
- Flashbulbs are much brighter/bigger (additive bloom), the crowd behind
  them is darker, and near-falls at high heat strobe the whole arena on
  top of everything.
- Side fix: inputs pressed during the brief hit-stop freeze are no longer
  eaten — they're honoured the instant it ends.

Still to judge next play: now that you can SEE them, are the comeback
resentment curve and the hijack frequency tuned right? (Numbers live in
src/crowd.js — easy to nudge.) And do the flashbulbs finally read, or do
we need to push the dark-arena art sooner than v0.06?

## 2026-07-02 / v0.03.2 — trust economy pass

From Jordan's v0.03.1 play (systems felt good, story reads even without
real move art). Reworked trust so it's legible and fair:
- Penalties now scale with severity (in src/config.js TRUST): stray
  strike −6, off-script slam −14, unplanned pin −16, kicking out of the
  finish −30, blown-spot stiff −8.
- Serving a crowd chant is now a sanctioned AUDIBLE, not a shoot: if the
  crowd is chanting for it, an off-script strike/slam/reversal costs no
  trust and isn't counted against you. The cardinal betrayals (stealing a
  pin, kicking out of the finish) are NEVER excused by a chant.
- Trust rebuilds by nailing spots (+4 each), but always slower than it's
  lost — one clean spot won't undo one bad slam.
- On-canvas trust warning: the trust bar turns amber ("TRUST SLIPPING")
  then red ("TRUST BREAKING DOWN"), a matching frame-edge glow pulses in
  your peripheral vision, and a green/red "±N TRUST" sting pops by the bar
  on every change.
- Side fix carried from last pass: inputs during hit-stop are honoured.

Tuning knobs for next play (all in src/config.js / src/crowd.js): the five
penalty sizes, the +4 regain rate, and the CrowdModel.PRIMED threshold.

Explicitly deferred (Jordan's ideas, not built yet):
- TAUNTS — a taunt system (likely its own Work-adjacent input, feeds the
  crowd/heat, maybe a trust/timing risk). Design before building.
- MATCH LENGTH — matches run short; the 7-spot sheet tells a good story
  but needs more body. Options: more spots in the draft (v0.04 planning
  screen is the natural home), longer per-spot beats, or a rest/grind
  mechanic. Decide alongside the planning screen.

## 2026-07-02 / v0.04 — the planning screen (Gorilla position)

The game now BOOTS into a planning screen; you book the match, then hit
the ring. "The Pitch" negotiation model:
- Office states a fixed agenda (protect the champion / build a heat
  segment / don't expose the business) — known to both players.
- 6 body slots, turns alternate: Stove owns 1/3/5, Boulder 2/4/6 (equal
  input). Match = fixed opener + 6 drafted + fixed finish = 9 spots, so
  matches are now longer and different every time (addresses the length
  note).
- You pitch a spot; partner PUTS IT OVER (free) / BURIES it (2 scarce
  tokens each) / lets it ride; the office + a dice roll decide.
- Safe on-agenda spots sail through; the top-rope superplex (big bump on
  the champ) needs a put-over AND a lucky roll — ~16% with buy-in, ~0%
  without. Push it through if you dare.
- Locks in with a projected crowd-arc sparkline. R from a finished match
  returns to booking a fresh one.

New files: data/spots.js (spot library + office agenda), src/planning.js.
data/matchplan.js retired (its role moved into spots.js).

Tuning knobs (src/planning.js TUNE + data/spots.js AGENDA): base 50,
threshold 55, office floor -20, risk mult 3, put-over +24, bury -28,
jitter ±14. Spot pop/risk/arc all in data/spots.js.

To judge next play: is the negotiation fun with two people? Is the office
agenda too strict/loose? Do matches now feel the right length? Are there
enough interesting spot choices (11 in the menu)?

Deferred (unchanged): TAUNTS; SHOOT-AS-ABYSS (Jordan: a fun easter-egg
devolve state, NOT a win condition — bodies deplete but it resolves as a
ruined match, never a winner; protects anti-goal #1). Next in build order
after this: v0.05 finish sequence (kick-out / near-fall / second Front
Burner) + the superplex multi-input chain.

## 2026-07-02 / v0.04.1 — Respect axis, crisp text, Audacity UI

Three notes from Jordan's v0.04 play:
- "Luck of the room" was out of place. REPLACED the random dice in pitch
  acceptance with RESPECT — a real second axis, earned by playing to the
  crowd. Distinct from Trust (reliability): a crowd-pleaser can be highly
  respected yet not the most trusted.
  · Earned in-ring: serving a chant +8; a crowd-pleasing shoot +3 (the
    "respected but not trusted" loose cannon — still tanks trust); a
    flat/booed shoot −5.
  · In planning: the pitcher's respect is the office's benefit-of-the-
    doubt. Safe spots pass on 50; the superplex needs a put-over AND a
    respected pitcher (~85). No dice at all now — the variability comes
    from your evolving standing + your partner's choices.
  · Respect persists across run-it-back, so playing for the fans buys you
    creative pull next booking. Also gives +0.25★ to a respected card.
  · Meters shown in-ring (next to body) and in planning.
- Blurry setup text: FIXED. Canvas now renders at device-pixel-ratio 2×
  (PCW.DPR) so all text is sharp.
- UI now invokes the AUDACITY ERA: page chrome + planning screen are
  dark/steel/blood-red with condensed shouting type, hazard tape, a
  clipboard for the sheet, VHS scanlines + REC bug + LIVE bug. The
  planning screen stays the grimy-backstage inverse of the neon show.

NOT yet touched: the MATCH ring art is still the cream placeholder (that
overhaul is the v0.06 asset pass). It now sits in a dark frame — a bit
transitional; pulling ring art forward is an option if it bugs you.

Tuning knobs: src/config.js PCW.RESPECT (earn/lose amounts) + respect
start values; src/planning.js TUNE.RESPECT_MULT (how much respect sways a
pitch). Deferred as before: taunts, shoot-as-abyss, v0.05 finish sequence.

## 2026-07-02 / v0.04.2 — dark ring, contrast pass, preset cards

Three notes from Jordan's v0.04.1 play:
- MATCH RING now matches the Audacity Era: black arena, hard overhead
  spotlight + haze, a spotlit canvas so the wrestlers read, steel ropes
  with blood-red top strands + turnbuckle pads, dark apron with red trim.
  HUD converted to light-on-dark (dark banner + red rule, light gauges,
  outlined POP!/pin-count/prompts). (Wrestler sprites are still the v0.06
  job — these are the procedural placeholders on the new stage.)
- CONTRAST: fixed unreadable text — all match-HUD labels/prompts/name-
  plates now light with dark outlines; planning DIM lightened; page
  callsheet/dim colors lightened. Nothing should be dark-on-dark now.
- PRESET CARDS so booking isn't all-or-nothing. New MODE screen at the
  top: pick THE CLASSIC (recommended), THE WAR (high risk, superplex), or
  FROM SCRATCH. Presets drop you into an EDIT screen — lock in as-is
  ([H]/[L]), or re-pitch any single slot ([F]/[J] on it) through the
  normal partner+office resolution. Scratch = the full draft as before.

New data: PCW.PRESETS in data/spots.js (edit/add cards there).

Known transitional bit: the post-match Observer card is still a cream
panel (readable, but not yet Audacity-styled) — easy to restyle later.

Deferred as before: taunts, shoot-as-abyss, v0.05 finish sequence +
superplex input chain, v0.06 wrestler/arena sprite art.

## 2026-07-02 / v0.05 — corners, the superplex chain, cues on the sprites

Process: the project is now a git repo; commit history is the version log
(see CLAUDE.md). The bible (§5.4) is updated to match this build.

- CORNER POSITIONS are real now. Four grid points sit under the rendered
  turnbuckle posts. Corner-tagged spots (CORNER STOMPS, the superplex)
  won't fire unless the bump-taker is actually in a corner — otherwise
  the move whiffs (no shoot penalty) and the cue says "get to a corner,"
  with the corners marked on the mat. Walk him into the buckle to enable
  it. (Tags live in data/spots.js as `corner: true`.)
- THE SUPERPLEX is a live four-beat chain at the turnbuckle: CLIMB →
  POSITION (receiver Works in-window) → THROW (attacker Works) → LAND
  (both Work). Each missed window = one degraded beat: still reads as a
  superplex, but more real damage + smaller pop. Clean chain reads huge.
  No cutscene — the attacker visibly climbs and comes off the top in the
  live ring. (Frame windows in config.js FRAMES.SPX_*.)
- CUES MOVED TO THE SPRITES. Each wrestler's instruction now floats over
  their own body in their own colour (same isoX/isoY floater pattern the
  crowd uses), instead of a shared bottom strip. The bottom banner keeps
  the spot name + the director's note for context.

To judge next play: are the corner nudge + superplex windows readable
mid-fight? Is the superplex timing too tight/loose (config FRAMES.SPX_*)?
Do the per-sprite cues actually help, or add clutter?

Deferred as before: taunts, shoot-as-abyss, the full finish kick-out
sequence (kick-out / near-fall / second Front Burner), v0.06 sprite art.

## 2026-07-02 / v0.05.1 — bug fixes + the movement experiment (v1-demo/)

Two bugs in the main build, fixed:
- Superplex was auto-completing on timers without Player 2. It now WAITS
  for each gated press (POSITION needs P2's Work, THROW needs P1's, LAND
  needs both) and ABORTS if ignored — nobody rides it out anymore.
- The per-wrestler cue chips overlapped when wrestlers were on top of each
  other. They now sit on two staggered rows so they can't collide.

The big swing (per Jordan's ask): a from-scratch MOVEMENT DEMO at
v1-demo/index.html — a self-contained single file, open it in a browser.
It's about making it FEEL like wrestling:
- Momentum locomotion (accelerate to a run, carry speed).
- Irish whip from a tie-up: push a direction to launch him into the ropes
  or a corner. Tie-up can be reversed (Grab).
- Run the ropes → rebound with momentum. Strike a charging man → CLOTHESLINE.
- Whip into a corner → stagger → Grab to go up → cooperative superplex
  (both players Work each beat; aborts if not).
- Jointed procedural skeletons with real run cycles / wind-ups / bumps —
  the animation target for the eventual sprite pass.
Controls are on the page. R resets, Space is slow-mo (great for watching
the animation).

To judge: does the movement finally feel like wrestling? Which mechanic
lands, which is fiddly? Should this become the new main engine, or do we
graft its movement onto the existing spot/crowd/trust systems? (The demo
has no planning/crowd-model/trust layer yet — it's movement-only.)

GAME_BIBLE §5.10 now records the movement grammar; §5.4 the gated superplex.

## 2026-07-02 / v0.06 — THE TRANSPLANT (momentum engine is now the base)

Big one. Per Jordan's call, the v1-demo movement feel is now the MAIN engine —
the old teleporty grid-step is gone. All the systems (crowd, trust, respect,
the Pitch planning screen, spots, endings) were kept and now sit on top of a
body that actually moves. Then: the finish sequence, taunts, and commentary.

What changed:
- MOMENTUM LOCOMOTION. Hold a direction to accelerate to a run and carry
  speed. Wrestlers are now JOINTED SKELETONS (real run cycles, wind-ups,
  sells, bumps) — the animation target the eventual sprite pass will match.
- THE GRAMMAR performs the spots. Grab = tie up; from the tie-up push a
  direction to Irish-WHIP him (into the ropes to rebound, or a corner);
  the controller Works to plant a slam; the receiver Works in the 4–9 window
  to REVERSE it into the arm drag. Strike a charging man = CLOTHESLINE. Whip
  him to a corner then Strike = the corner stomps. Grab a cornered man = go
  up top for the cooperative superplex. Position gates everything — a spot
  you can't set up isn't available; the cue tells you how to set it up.
- CONTROLS CHANGED: the old "Run" key is now TAUNT (Stove H, Boulder L).
  Running is automatic (hold a direction). Grab is G/K, Strike F/J, Work T/I.
- TAUNTS. Play to the crowd between spots. Face taunt pops; heel taunt draws
  heat and banks resentment for the comeback; either answers a chant for
  Respect. Cheap on heat and rate-limited so it can't be farmed.
- COMMENTARY BUBBLES. Two ringside voices (CHET play-by-play, DUTCH colour)
  in comic speech bubbles, fed by the action — the bell, big moves,
  near-falls, the shocking kick-out, the finish. This is what you read now;
  the backstage log stays a debug readout.
- THE ORCHESTRATED FINISH. The fixed tail is now a real six-beat sequence:
  Front Burner → Boulder kicks out at two (booked near-fall) → The Boulder's
  own finisher + a near-fall for the champ → second Front Burner → 1-2-3, new
  champion. Boulder CAN kick out of the real finish (a priced shoot) to arm a
  steal — betrayal stays available and priced.

How it was checked: I can't open the canvas, so this was verified in a headless
harness — no runtime errors across a planning fuzz, 6000 ticks of random
two-player input, and a scripted cooperative run that completes EVERY recipe
(tie-up plant, arm-drag reversal, corner stomps, superplex, comeback strikes)
and the full finish to a clean 5★ title change. Feel, readability, and timing
are yours to judge — that's this playtest.

What to feel for on your first 0.06 play:
- Does it finally FEEL like wrestling now that it's on the real systems? Is
  the run/whip/rebound momentum right, or too floaty / too twitchy?
  (Tuning: src/config.js PCW.MOVE — ACC, FRIC, VMAX_RUN, WHIP_V.)
- Are the spot cues legible? Can you tell what verb the current spot wants
  and where to set it up? (Corners are marked when a corner spot is called.)
- Are the timing windows right in the new grammar — the 4–9 arm-drag reversal
  inside the tie-up, the sell windows, the superplex beats? (config FRAMES.)
- Do the taunts feel worth doing? Right heat/respect payoff, right cadence?
  (config PCW.RESPECT + the taunt base in engine.js taunt().)
- Do the commentary bubbles read, or do they cover ring action / clutter?
  (Placement + line library in src/commentary.js.)
- Does the six-beat finish land as a climax — do the two kick-outs pop?
- Known thin spots: commentator names/desk art are placeholders; hiptoss and
  the plain tie-ups (collar & elbow / test of strength) currently play as a
  tie-up→plant like the other grapples — fine, but not yet distinct moves.

## 2026-07-02 / v0.07 — cues speak human, fixed lanes, corner-whip assist

From Jordan's 0.06 play: the momentum engine is right, but the control prompts
made the match hard to get through — they used design-doc words ("PLANT",
"WORK"), overlapped during tie-ups, and the corner whip silently failed.
Four jobs this session:

1. EVERY CUE REWRITTEN in plain player language + the literal key for that
   player. New rule (now in bible §5.3): say what to do in wrestling terms,
   then name the key — "SLAM HIM — PRESS T", "REVERSE HIM — PRESS T NOW",
   "KICK OUT — PRESS I", "STAY DOWN — TOUCH NOTHING". The words WORK and PLANT
   are banned from anything on screen. One instruction per cue (the tie-up cue
   no longer offers a plant-OR-whip menu; it reads the spot and shows only what
   the sheet wants now). Swept cueText, the superplex beats, and every string
   in data/spots.js. Fixed the hiptoss cue (was "press G", the move is grab
   then the finisher press).
2. CUE PLACEMENT: Stove's cue always renders ABOVE his figure, the Boulder's
   always BELOW — fixed lanes so stacked wrestlers never share a chip. Each
   chip now carries a coloured name tab and is clamped on-screen at the top/
   bottom rope.
3. CORNER-WHIP ASSIST: when a corner spot is booked, the whipped man now runs
   himself at the nearest post within a 35° cone of your aim (the honest
   kayfabe fix). Headless simulation: capture went 80% → 100% across the ring;
   whips with nothing corner-gated booked stay unassisted/honest. A corner
   whip that still misses now fires a colour line ("Too shallow — square him up
   with the buckle!") + a log line instead of looping in silence. Capture
   radius widened 1.5 → 2.0.
4. PLANNING SCREEN TEXT no longer overruns its panels: added a measured
   fit/ellipsize helper (txtFit) and routed the preset spot lists (the ones
   that clipped THE CLASSIC / THE WAR), the spot-card descriptions, and the
   lock-in run-of-show through it.

Verified headless: no runtime errors; full match still completes to a clean
title change; whip capture 100% assisted / 80% unassisted (unchanged honest
physics). NOT verifiable without you: whether the new cue WORDING actually
reads fast enough mid-match, whether above/below lanes feel clear, whether the
corner whip now feels reliable in the hand, and whether the planning text is
comfortable. That's this playtest.

To feel for:
- Can you now get through a match reading only the on-figure cues (not the
  bible)? Any cue that still made you freeze — tell me the exact spot.
- Do the above/below lanes + name tabs make ownership instant?
- Does whipping a man to the corner feel reliable now?
- Any planning text still clipping?

## 2026-07-03 / v0.08 — solo play (CPU performer), UI cleanup, no more end-shake

From Jordan's 0.07 play: cues are great now, corner whip feels good, fine with
the extra inputs being hidden — but (a) that hidden-input info should live in a
controls section, (b) put the controls right under the gameplay area and leave
only the call sheet + a renamed "Match Log" on the right, (c) commentary was
covering the health bars — move it to the bottom middle, (d) the screen keeps
shaking on the results screen (annoying), and (e) it's hard to play both
characters while testing — automate one side.

Done:
- CONTROLS moved to a card directly under the ring; it now documents the full
  toolbox behind the cues (grab = tie-up/cover/climb; in a tie-up push to whip
  or Work to slam; grab to spin out; run into a strike = clothesline; taunt).
  The right rail is now just TONIGHT'S CALL SHEET and MATCH LOG (renamed).
- COMMENTARY now rises from the bottom-centre (play-by-play low, colour above),
  well clear of the corner health/respect bars — no more overlap.
- RESULTS-SCREEN SHAKE removed. It was frozen because the logic loop stops
  ticking once the match ends, so the last screen-shake never decayed; now the
  shake (and strobe/flashbulbs) are zeroed on match end and the renderer never
  shakes an ended match.
- CPU PERFORMER (the big one): press 1 to hand STOVE to the CPU, 2 for THE
  BOULDER (a "· CPU" tag shows on that wrestler's body bar). Play the other
  side and feel a real partner. It's cooperative, not an opponent — it does its
  job (calls its spots, whips to corners, goes up top, takes bumps, sells,
  kicks out on cue, reverses in the window, works the superplex beats) and
  never shoots. It plays through the normal pad, so it obeys the same rules and
  timing. Book solo with a preset card (a couple of keypresses); a
  planning-screen CPU is a later nicety.

Verified headless: both sides on CPU auto-play full matches (both preset bodies)
to clean 5★ finishes, every recipe firing, no runtime errors; end-of-match
transients confirmed zeroed. NOT verifiable without you: whether the CPU *feels*
like a competent partner to perform with (does it get into position naturally,
is its timing convincing, does it ever look dumb), and whether the new controls-
below / log-right layout reads well. That's this playtest.

To feel for:
- Play a full match with the other side on CPU. Does it feel like performing
  WITH someone? Where does the CPU look wrong or leave you waiting?
- One deliberate CPU behaviour to sanity-check: when the CPU is the caller of
  the arm-drag (its partner must reverse), it WAITS for you rather than forcing
  a botch. If you don't reverse, that spot won't advance — is that the right
  call, or should it eventually just take the bump itself?
- Is the controls-under-ring / call-sheet+log-right layout comfortable?
- Anything still overlapping (commentary, cues, meters)?

## 2026-07-03 / v0.09 — feel pass (weight + legibility), driven by actually playing it

From Jordan's 0.08 play: guys feel a little fast / "walking on ice"; a grapple
doesn't feel like a grapple; visual spacing + prompt legibility need work. This
session I used the run skill to launch the real build in headless Chrome, drove
it into a CPU-vs-CPU match, and screenshotted — so these are fixes to things I
could see, not just reason about.

Done:
- MOVEMENT is heavier now (src/config.js PCW.MOVE): lower accel (.020→.015),
  much grippier friction (.86→.78 — the ice fix), lower top speed (run
  .19→.15), whip a touch slower. Should plant the feet instead of sliding.
- GRAPPLE HAS WEIGHT: a slam is no longer instant. The attacker locks up,
  LIFTS the man for ~14 frames, then drives him down with a heavier hit-stop;
  the crowd pop / trust / call-sheet all resolve on the IMPACT. New LIFTED
  state + pose (you can see him scooped up before the drop). Bible §5.3.
- TOP METERS FIXED: heat, "behind stove" (resentment) and trust were three
  bars overlapping each other and their own labels, smeared over the crowd.
  Now one dark paneled block, three clean rows, labels left of the bars —
  legible. (render.js drawMeters.)
- WRESTLERS SCALED UP ~18% so they read bigger in the big ring.
- CUE CHIPS bigger (13→15px) with larger name tabs; pushed a bit further off
  the taller sprites; the pin count is now a big clean number (the old "…"
  rendered as tofu boxes).
- Results screen sits still now (already zeroed the shake in 0.08; also cleared
  the frozen floaters/"POP!" stamps that lingered on the card).

Verified: launched + drove the real app (no console errors); slow-mo capture
confirms the lift reads and the meters/scale/commentary layout are clean;
logic regressions still green (cooperative finish + both-CPU auto-play to 5★).
NOT settled without your hands: the exact movement numbers (still too fast/too
floaty? too sluggish now?) and whether the slam's lift timing feels right —
all easy knobs in config.js (PCW.MOVE, FRAMES.SLAM_LIFT/SLAM_HITSTOP).

Noticed while watching (not fixed, flagging): the two CPUs tend to pool the
action in one corner rather than roam the ring — a CPU-positioning artifact,
not a bug; a human moves around more. Can add a "drift toward centre between
spots" nudge if it bugs you.

To feel for:
- Movement: right weight now, or over-corrected into sluggish? (PCW.MOVE knobs.)
- Does the slam finally feel like a grapple? Lift too long/short?
- Are the top meters + cues clearly legible now? Anything still cramped?

## 2026-07-03 / v0.10 — the receiver's game (stakes, selling, manual pins)

Jordan's 0.09 verdict: still too fast; it's one-button-each with no real
decisions; you're told the safe button but not the one that sandbags/goes off
script; no stakes — "a silly wrestling experiment." Also: pins auto-kicked-out
(should be manual), wrestlers pop up on their own before you can pin them, and
he wants selling depth (get up fast/slow/stay down), more taunting, real
heel-heat crowd interaction, real per-move animations, the booking screen
optional, and a WWF.com early-2000s visual/font redesign (he's a graphic
designer — Impact is cliché). Big list; I set a roadmap and built the
foundation this session.

Built this session (the performance core):
- BOOTS STRAIGHT INTO THE MATCH now (planning bypassed; press B to open it).
- SELLING IS A CHOICE. After a bump you go DOWN and DON'T get up on a timer.
  Staying down = the sell; move/Work = get up. Pop up too soon after a real
  bump = a SANDBAG: reads flat to the crowd, costs trust, and the wronged
  worker is owed a receipt. Lie there too long = the crowd gets restless (dead
  air). Move weight sets the expected sell (strike=quick, finisher=long). The
  cue shows the temptation: "SELL IT — STAY DOWN · move = pop up (cheap)".
  → This also fixes the "they got up before I could pin them" bug: they stay
    down until they choose, so you have time to walk over and cover.
- PINS ARE MANUAL, ALWAYS. Nothing auto-kicks-out. You must Work to kick out
  before three or you eat the fall — and failing to kick out of the champ's
  near-fall LOSES you the match. Real stakes on every pin.
- SLOWER pace again (config PCW.MOVE: run .15→.12, accel .015→.012); slower
  ref count for more near-fall suspense.

Verified: launched + drove the real app (boots to match, sell/get-up cue with
the sandbag temptation shows, manual kick-out cue shows, no console errors);
CPU-vs-CPU still auto-plays both preset cards to clean finishes with the new
manual kick-out + get-up logic.

Roadmap for the NEXT passes (nothing dropped):
- Attacker-side stakes: a STIFF you choose to lay in (reads as intensity to the
  crowd, hurts the body + trust), RECEIPTS (get stiffed/sandbagged → your next
  shot is a free stiff), and cooperation visibly breaking down as trust drops.
- REAL per-move animations (right now moves share poses — a proper procedural
  animation pass; the big one).
- HEEL HEAT: the heel fuelled by drawn heat, distinct from boredom.
- More taunting depth.
- The early-2000s WWF.com visual + font redesign — its own focused pass, wants
  Jordan's designer eye.

To feel for next play (solo is fine now — press 1 or 2 for a CPU partner):
- Does controlling your own sell/get-up make the match feel like YOU'RE
  performing, not just pressing? Is the get-up timing readable at this pace?
- Do the manual kick-outs create real "am I going to make it" tension?
- Is it still too fast, or getting closer?

## 2026-07-03 / v0.11 — pacing, keycaps, and the REAL sandbag

Jordan's 0.10 notes: gameplay improved but moves still too fast — the CPU
especially moves so quickly it's hard to respond; control labels still small,
the actual key to press should be emphasized; and a terminology correction —
what I called "sandbag" (popping up early) is really NO-SELLING. Sandbagging is
refusing to cooperate DURING a move (go dead weight so the attacker has to
brute-force it, risking a sloppy/dangerous bump). Also asked whether the
WWF.com redesign needs him to make assets (answer: no — he directs taste, I
build it in code).

Done:
- CPU PACING. The CPU now performs deliberately: a ~1s beat between its
  offensive moves (config FRAMES.AI_PACE) and a held lock-up before it slams
  (AI_LOCKUP). It still moves and reacts freely, it just doesn't rush. Match
  length went from ~1530 → ~2010 ticks. Locomotion slowed again (run .12→.10).
- KEYCAPS. The key you press is now a bright gold keycap in the cue —
  "LOCK HIM UP — [K]" — so the input is unmistakable. Cue chips are bigger.
- TERMINOLOGY FIXED. Popping up early is now called NO-SELLING everywhere
  (cue: "STAY DOWN — SELL IT (move = no-sell)").
- THE REAL SANDBAG, built on the slam. While you're being LIFTED you can Work
  to "fight the lift" (go dead weight). The attacker then brute-forces it:
  the move reads ugly (half the pop), hurts BOTH bodies (dangerous bump +
  strain), costs trust, and owes a receipt. Cue: "TAKE IT — or [T] to fight
  it". Will extend to the superplex/other lifts later.
- Reversal window widened (was 6 frames, now ~13) so a human can actually hit
  it.

Verified: drove the real app (keycaps render as bright keys; no-sell cue + the
new pacing confirmed; no console errors); CPU-vs-CPU still auto-plays both
cards to clean finishes; match is measurably slower.

Roadmap unchanged (nothing dropped): attacker-side stiff/receipts; real
per-move animations; heel heat; deeper taunting; and the early-2000s WWF.com
visual + font redesign (my recommended next session — separable, transforms the
look, your design domain).

To feel for: is the CPU answerable now, or still too fast? Do the keycaps make
the input obvious? Try sandbagging a slam (Work while being lifted) — does the
ugly/dangerous consequence read?

## 2026-07-03 / v0.12 "dot-com" — the WWF.com visual rebuild + sandbag on heavy moves only

Jordan added two WWF.com (2000–2001) reference images to references/ and asked
for the visual rebuild, plus: the sandbag happens too fast — it should only be
on heavier moves (spinebuster, finishers), and those should be slower to give
reaction time.

Done:
- WWF.COM PAGE REBUILD. The whole HTML shell is now an early-2000s WWF.com
  parody: scratchy PCW.com logo, a blood-red horizontal nav bar, the cheesy
  yellow banner-ad strip ("PCW SUPERSTORE… CLICK HERE — NEW!"), content boxes
  with red-gradient headers for the call sheet + match log, a grey "PCW
  CORPORATE" footer with period copyright. Black / blood-red / chrome / gold.
- FONTS OFF IMPACT. Embedded Anton (heavy condensed display, for the logo +
  headers) and Oswald (condensed, for nav + labels + the in-canvas HUD) as
  offline base64 — self-contained, no CDN, still opens from disk. The canvas
  HUD swapped Impact → "Oswald, Impact" everywhere.
- SANDBAG = HEAVY MOVES ONLY, AND SLOWER. Only big/risk≥2 moves (finishers,
  spinebuster, landslide) can be sandbagged, and they now lift slowly
  (SLAM_LIFT_HEAVY 46 vs the normal 16) so there's time to react and decide.
  Ordinary slams are quick and just taken (no sandbag prompt).

Verified: drove the real app — the page reads as a legit early-2000s wrestling
site, the canvas HUD is legible in Oswald with the gold keycaps, no console
errors; CPU-vs-CPU still auto-plays both cards to clean finishes.

DEMO PUSHED: the live site (https://jordanclermont.github.io/pcw/) now shows
this build — it finally looks like a product, not an experiment.

Roadmap still open (nothing dropped): attacker-side stiff/receipts; real
per-move animations (the big art pass); heel heat (fuelled by drawn heat vs
boredom); deeper taunting; sandbag extended to the superplex.

To feel for: does the WWF.com skin land? Is the heavy-move lift now slow enough
to react to the sandbag window? Any canvas text hard to read in the new font?

## 2026-09-24 / v0.13 "row twelve" — the crowd stops reading the script

Jordan's direction (after a research note on how real matches are called): the
crowd shouldn't get excited because the match is going to script — they don't
know the script. Like Flair said, you can't memorize, because if the crowd
isn't buying it you have to adjust. Keep it 1v1 (no tag ideas). Also: the
referee matters — he carries backstage's influence into the match.

What I found: the code broke rule 2 quietly. The crowd's sense of "where the
story is" was literally how far the call sheet had got, and each move's value
came from its booking card. Proof: two CPUs playing either preset card
flawlessly scored 5★ every time, heat pinned at 100.

Done:
- The crowd reads the PICTURE. It works out the story from what it has seen
  (time since the bell, who's been on offence, banked resentment, whether the
  comeback happened) and values each move by what it looks like.
- They get used to things. The same move again soon is worth less each time;
  the memory fades over ~10 s. Floater: "...seen it".
- Surprise pays: kicking out right after a finisher they watched land; hope
  spots (Stove fighting back out of a beat-down) — and if The Boulder cuts one
  off, the grudge builds twice as fast.
- Hold the comeback too long and they give up on it (Dutch says so).
- THE FRONT ROW. A second crowd axis — are they INTO it — shown with no meter:
  leaning in, they come forward into the ring light, warm-lit; sitting back,
  they sink into shadow and fold their arms. Dutch calls it when it shifts.
  A leaning crowd pops harder.
- Stars now weigh the front row (60% loudness, 40% lean). Results line shows
  "front row N". Flawless CPU runs: Classic 5★→3¾★, War 5★→2¾★ (The War
  throws big moves early and runs out of belief).

Verified: headless CPU-vs-CPU on both cards to clean finishes, no console
errors; direct checks of repeat-fatigue, hope-spot cut-off, and give-up; posture
rendered and screenshotted at sitting-back / neutral / leaning-in.
NOT verified (needs your hands): whether the front row reads out of the corner
of your eye mid-match, and whether a human who plays to the room can beat the
CPU's 3¾★ (that's the whole point — if you can't, the tuning is off).

Designed, not built (bible §5.5, §5.7): calls in rest holds (next), the referee
as the office's messenger, blank "call it in the ring" slots.

Bible/code disagreement to settle: the bible says the ref is "visually present"
in the demo; the build has no referee figure at all, just the count number.

To feel for:
- Can you see the front row lean in / sit back without looking for it?
- Try the Classic by hand and vary it — taunt, mix moves, don't repeat. Does
  it beat 3¾★? Try repeating the same strike: do you feel the room go flat?
- Is the score now too stingy?

## 2026-09-25 / v0.14 "the Observer" — the score, explained and re-balanced

Jordan's 0.13 notes: played several matches, couldn't get above 2.5★; asked
what the dynamic is. Also never got to book the match beforehand.

Cause (my tuning miss in 0.13): I lowered the crowd side of the rating but kept
the old penalties (−0.6 per botch, −0.4 per shoot). Pre-0.13 those hid under a
crowd score that overflowed the 5★ cap. So one missed arm drag + one stray
strike + trust dipping under 80 took a flawless 3¾ down to exactly 2½. And I'd
only checked that the CPU scored lower, never that a human could score HIGHER.
Booking: B only worked with no live match, and the game booted into one.

Done:
- Penalties resized: botch −0.3; off-sheet moves cost by severity (stray strike
  ≈ −0.1, off-script slam ≈ −0.25, kicking out of the finish −0.5).
- The results card now itemizes the rating ("crowd +3.27 · trust held +0.25 ·
  clean finish +0.25 · 1 botch −0.30 …") so you can see what cost you.
- POSING: taunt right after your own move = selling the moment. ~2.5× a random
  taunt, pulls the front row in; the heel posing banks extra resentment. Tires
  if you do it after every move.
- Opens on the booking screen again. H/L = skip, ring the bell on The Classic.
  After a match: R = same card again, B = book a new one.
- How-to-Play card updated (posing, the front row, R/B).

Harness (two CPUs): Classic by-the-sheet 3¾★ / played to the room 4½★ / with
one botch 3★. War by-the-sheet 2¾★ / played to the room 4½★.
Verified in the real app with real key presses: loads on booking, H starts the
match, results card renders the breakdown, R reruns, B rebooks, booking The War
through the menu works; no console errors.

To feel for:
- Play the Classic and pose (taunt) right after your moves. Does that get you
  past 3¾? Does it feel like playing to the room, or like a button to farm?
- Read the breakdown line after each match — does it explain your score?

Next per Jordan: refine the actual gameplay (define scope together first).

## 2026-09-25 / v0.15 "the third man" — the referee

Jordan: "let's add the referee now." Built to the bible's §5.7 design (his
messenger idea from the v0.13 conversation).

Done:
- A referee figure (striped shirt) in the ring. Stays clear of the action on
  the far side, walks around the wrestlers. The crowd ignores him.
- He counts the pins: slides in, gets down, and the count starts only once he's
  there — each count is his hand hitting the mat.
- Bias rule: faster counts on a man who's gone off the sheet (62 → 50 frames a
  count after two shoots).
- He checks on a man who's down and selling, and that's when Gorilla's messages
  come through (dashed "earpiece" box, top-left): injury warnings, "Gorilla
  loves it", "they're sitting on their hands", "you're fine on time" — and
  GO HOME (when you're running long, or the front row has been sat back 5 s+).
- GO HOME is answered with your body: STAY DOWN = agree (rest of the middle is
  cut, straight to the finish, +4 Respect); GET UP = wave it off (−4 Respect).
  My design call — the bible said the ref gives a "reason to stay down"; this
  uses the sell decision you already make instead of a new button.

Verified: CPU matches run clean on both cards (scores unchanged — the ref never
touches the crowd); a slow match gets Gorilla's go-home, the CPU stays down, 3
middle spots cut, finish runs; a real key press during the call waves it off
(−4 Respect); the ref's count, check, and message box rendered and screenshotted;
no console errors.

To feel for:
- Does the ref get in the way, or feel like part of the scenery?
- Is "stay down = agree / get up = wave it off" readable in the moment?
- Are Gorilla's messages useful, or noise? Too frequent / too rare?
- Is the count's wait-for-the-ref beat good suspense or a drag?

## 2026-11-18 / v2 draft, step 1 "the room" — a fresh build beside 0.15

Jordan asked for a review and a plan to jump-start development, with a new
idea: characters are made or broken by audience reactions; the audience is the
final judge. Possible new title: "The Art of Wrestling" (not decided; it is
also the name of Colt Cabana's wrestling podcast, trademark not checked).

Review of 0.15 (watched a CPU match): the crowd is a strip of dark heads and a
meter; its loyalty is fixed; every grapple draws the same picture (the
Landslide and the Spinebuster were both called "scoop and a slam"); play is a
13-step checklist; the whole match happened in one corner. Jordan approved a
rebuild in a new folder instead of patching 0.16.

Built: `v2/` (open `v2/index.html`). Build 0.15 is untouched.
- Side-on hard-camera view. The crowd is the top half of the screen, about 130
  people. Wrestlers are about three times bigger and look different from each
  other.
- Each person in the crowd picks a side. Shirts turn orange (Stove), gold
  (Boulder) or grey (nobody). They fold their arms when bored, come forward
  when they're into it, stand, cheer, boo, hold signs, chant, and count along
  with the ref.
- The crowd's opinion of each wrestler moves during the match. A long
  one-sided beating, or stomping a man who's down, gets the attacker booed and
  the victim cheered. Repeats bore them. The results card says what the room
  made of each man.
- No call sheet. Only the finish is booked (Stove wins with the Front Burner).
- You are Stove by default; The Boulder is the CPU. 1 and 2 swap who the CPU
  plays.

Checked: 2,000 lines, no build step. Headless: CPU-vs-CPU matches finish as
booked at about 2:30 and score 2¾ to 3½ stars; kicking out of the finish costs
30 trust each time and ends in a breakdown; a Stove who never sells breaks
trust. In the browser: it draws with no console errors; real key presses did a
lock-up, a slam, a pose, a cover (the CPU kicked out at two), sells, and a
no-sell (−10 trust).
NOT checked: how it feels at full speed. The browser pane I test in runs the
animation at about one frame a second, so I stepped it by hand. Speed, timing
windows and whether the crowd reads out of the corner of your eye are all
yours to judge.

Known rough spots: the finisher and pin pictures are approximate; a chop has
to be sold with T every time, which may be too much pressing; the turn on a
bullying Stove takes about a minute of steady stomping, which may be too slow.

Also found: the Anton/Oswald fonts embedded in 0.15 cover almost no letters,
so that page has been showing fallback fonts since 0.12. Not fixed.

Bible §13 lists where this draft contradicts the bible (side-on ring, no call
sheet, no booking screen, live loyalty). Those are Jordan's calls.

To feel for:
- Can you tell what the room thinks of you without looking at the bars?
- Try to lose them on purpose: stomp him when he's down, over and over. Then
  try to win them back. Does it feel like the crowd is judging you?
- Is the side-on view right, or do you miss the ring you could walk around?
- Is free-form better than the checklist, or do you feel lost?

## (next entry goes here)

## 2026-11-18 / v2 draft, step 1b — Jordan's first play, and the ring gets depth

Jordan played the v2 draft once. His notes, in his words:
- "biggest issue right now is the control layout is not intuitive at all. And you cannot react in time to certain things."
- "the 2D angle will not work for the final game because a huge part of what makes wrestling interesting is the ring the turnbuckles, going in and out. Unless we find a very creative way of utilizing 2D so it feels like it's not 2D."
- The moments that beat him: "the irish whips, and selling the chops."

He picked option 1 of three for the view: keep the TV camera, give the ring depth.

What changed:
- The ring is a square in perspective with four posts and ropes on all four sides. Movement is WASD in two directions. Whips go to any rope; two directions together send a man into that corner, where he hangs on the buckles.
- Keys: WASD move, J chop, K grab, L pose, hold Space to go with it. Bible §13 has the full list.
- Selling a chop: hold Space and every chop is sold as it lands. Tapping after the hit still works and the window is nearly twice as long.
- Irish whip: press J once any time after sending him; the arm comes up by itself. He comes back at you wherever you stand.
- Lock-up: choices are remembered if pressed early; the reversal window is about twice as long.
- Chops and grabs step in on their own.

What was checked: six CPU-vs-CPU matches finish as booked (2¼ to 3¼ stars, about 2:30, two or three corner whips each). With real key events: walk in depth, chop, lock up, whip and clothesline with the J press made early, whip into a corner, chop a man in the corner, and 75 seconds of holding Space against the CPU (19 chops, all sold clean, trust stayed 100). No console errors.

What was NOT checked: feel at full speed. The test browser still runs about one frame a second.

Known rough spots:
- A whip toward or away from the camera works, but the two men overlap in the picture when they meet.
- Going outside the ring and the top rope are not built.
- Holding Space makes selling chops easy. It may now be too easy; that is for Jordan to judge.
- The CPU throws a lot of chops (30 to 60 a match).

One thing to change next: Jordan plays it again and says whether the whips and chops are now answerable.

## 2026-11-18 / prototype 3 (`v3/`) — walk, choose, watch

Jordan played the second v2 draft. In his words: "its still feeling very rudemantary and rough and I'm not sure how this will turn into the game I want." He restated the game: storytelling in the ring, fans reacting to it, smooth and fun, not a fighting game, intuitive controls, "more like you are making decisions". He suggested free movement for position, then quick time events or RPG style on contact. Then: "prototype the game as if you were the developer from day 1 and the version we have now never existed."

What was built: a new folder, `v3/`. Walk with WASD, Space to do something, pick a choice with a number or a click, then the move plays by itself. The other man chooses how to take it. Bible §14 has the full description.

What was checked:
- Six CPU-vs-CPU matches: all finish as booked at about 2:45, 2½ to 3¼ stars, with a shine, a heat, cut-offs, a comeback and a finish.
- 60 matches with choices picked at random: no crashes, no stuck matches.
- In the browser, by key presses: lock-up card, body slam, the down card, top-rope elbow, letting the CPU take over, the answer card, firing back, throwing him to the floor, the referee's count, the dive, a late kick-out at two, the finisher, the cover, and the results card. No console errors.

What was NOT checked: how it feels at full speed (the test browser runs about one frame a second), and whether choosing then watching is fun. That is Jordan's call.

Known rough spots:
- Bodies are still code-drawn stand-ins, and some moves overlap the two men.
- The choice card covers the bottom of the ring while it is up.
- The crowd arrives almost entirely behind Stove, so the first minute has little to win.
- Two people on one keyboard works in principle (Stove WASD + Space, The Boulder arrows + Enter) but was not tested.

One thing to change next: Jordan plays one match and answers the first open question in §14.

## 2026-11-19 / prototype 3 — Jordan's first match, then roles and "what the room wants"

Jordan played one match of prototype 3. His words: "There is work to do but this has potential. I just had a match where I threw him out of the ring. That felt good." And: "I think we still need more of a story element to it. Right now I'm not sure how to get 5 stars. A little back and forth seems to work. But it might be better giving people roles in the game like the face vs the heel. The heel could take more breaks outside the ring, or knock out the referee and use a weapon, etc."

Agreed plan, three pieces: (1) roles, a job for each, and a line saying what the room wants; (2) the heel's everyday tricks; (3) the referee knockout and the weapon. This session built piece 1 only.

What changed:
- FACE / HEEL on the nameplates and the pre-match card, each with its job.
- A gold "THE ROOM" line at the top of the screen that says what the crowd wants right now.
- The results card marks each man on his job, and each job is worth up to 0.4 of a star.
- Stars count the loudest moment as well as the average.

What was checked: six CPU-vs-CPU matches (3¼ to 3¾ stars, both jobs DONE), 60 random-choice matches with no crashes, and the new line, tags and results card drawn in the browser with no console errors.

What was NOT checked: whether a person following the gold line actually scores higher than one who ignores it, and how any of it feels at full speed.

One thing to change next: piece 2, the heel's tricks, so the two roles stop sharing one card of choices.

## 2026-11-19 / prototype 3 — the heel's tricks

Piece 2 of the three agreed with Jordan. No new play notes from him this round; he said "Yes, heel tricks".

What changed: the heel gets four choices the face does not have (thumb in the eye, bail out, take a break outside, cover with feet on the ropes). The referee only calls what happens close to him; the card tells you whether he will see it. Three warnings is a disqualification. Bible §14 has the detail.

What was checked: six CPU-vs-CPU matches (3 to 4¼ stars; the CPU heel used the eye, the ropes and the walk outside, was caught by the referee on the ropes, and was never disqualified); 60 random-choice matches with no crashes (4 ended in a disqualification, as they should). In the browser as The Boulder: the heel's card, a thumb in the eye with the referee out of position (no warning), and a cover with feet on the ropes with the crowd booing through the count.

What was NOT checked: a full match played by a person as the heel, and feel at full speed.

Noticed: CPU-vs-CPU matches now score a little higher (up to 4¼), because the cheating makes the room louder. That narrows the room above for a person.

One thing to change next: piece 3, the referee knockout and the weapon. Or first, Jordan plays a match as The Boulder.

## 2026-11-19 / prototype 3 — more actions: count-alongs, move kinds, submissions

Jordan played the heel build: "I played it this is shaping up now. Still a rough demo but the ideas are great. We just need more actions. Throwing them into the corners, off the ropes, and out of the ring are the most fun actions. The chops and the body slams are okay, but I think the chops need more interactivity since the crowd likes to count along with them. We also need submissions. And instead of just a body slam we should give categories of moves that hit randomly depending on context, where they are in the match, etc." He also sketched where it goes eventually: planning the match with room to improvise, and classic stories (giant vs cruiserweight, technician works a body part to a submission, heel gets a dirty pin). Then: "yes start with 1, 2, 3, 4 go baby go! Lets take this game as far as we can in its current iteration."

What was built (bible §14 has the detail):
1. Chops one at a time with the room shouting along, and ten punches in the corner with the room counting.
2. Kinds of move (quick, power, off the ropes) with the actual move picked for the moment. Eight new moves.
3. Body parts and three submission holds; a new SUBMISSION ending.
4. Corner to corner, and the ring post on the floor.

What was checked: twelve CPU-vs-CPU matches all finish as booked (3¼ to 4¼ stars) and use the new moves, limb work and holds. Sixty random-choice matches: no crashes; endings included submissions, disqualifications and flat finishes. In the browser by key presses: the two-row card, count-along chops with the WOO, ten punches with the count on screen, working toward and applying a camel clutch, and the hold running through to a rope break. No console errors.

What was NOT checked: feel at full speed; a person making the CPU give up to a hold in a real match; the arm bar and leg lock pictures (only the camel clutch was looked at); the ring post on screen.

Known rough spots:
- The new moves are first-pass choreography. Some will look odd, the suplex and dropkick most likely.
- CPU-vs-CPU matches now reach 4¼ stars, so the room above for a person is small.
- The submission pictures are stand-ins: the two bodies overlap.
- Pressing Space ten times for the ten punches may be one press too many, or exactly right. Jordan to say.

One thing to change next: Jordan plays, then says which new actions are fun and which are noise.

## 2026-11-20 / prototype 3 — finishing the one-match demo

Jordan on the last build: "new options all feel pretty fun, keep going. Finish the one match demo to the best of your abilities."

What was built (bible §14):
- Three bookings to pick before the bell: the clean win, the technician (submission), the robbery (the heel cheats to win).
- Endings judged against the booking.
- The referee knockout, the chair, and a crowd that tells a receipt from a cheap shot.
- Sound, made in code.
- A more neutral opening crowd.

What was checked:
- Twelve CPU-vs-CPU matches under each booking: all 36 end as booked. Average stars: clean 3.7, technician 3.3, robbery 3.0.
- Sixty random-choice matches: no crashes, no stuck matches.
- A contact sheet of frames from every new move, looked at in the browser. One fix came out of it: the dropkick was landing at thigh height and now lands at the chest.
- On screen: the booking chooser, the referee down with The Boulder holding the chair, the robbery results card. No game errors in the console.

What was NOT checked:
- The sound. It was built blind: it cannot be heard from the test setup. It might be too loud, too quiet or unpleasant. M mutes it.
- Feel at full speed, as always.
- Two people on one keyboard.
- Each new move was only looked at as small still frames.

Known rough spots:
- Bodies are code-drawn stand-ins; in holds and pins they overlap.
- The robbery scores lowest because the room ends on boos, not cheers. That may be right, or the rating may need to learn that a furious room is a good room.
- The pre-match card is getting crowded.

One thing to change next: Jordan plays each booking once, with the sound on, and says what is wrong with the sound first.

