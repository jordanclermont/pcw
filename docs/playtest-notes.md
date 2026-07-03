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

## (next entry goes here)
