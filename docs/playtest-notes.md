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

## (next entry goes here)
