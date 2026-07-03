# PCW: Persona Championship Wrestling

Read docs/GAME_BIBLE.md before doing significant design or system work. This file is the short version plus working rules.

## What this game is

A cooperative performance game. Two players perform a professional wrestling
match together in front of a simulated crowd. The crowd is the score. There is
a match plan agreed before the bell; the game is about executing it, adapting
it, or betraying it.

## Hard rules (anti-goals — never violate)

1. This is NOT a fighting game. No victory by depleting the other player.
2. The crowd never reads the script. Every crowd reaction must be justifiable
   by what a person in row twelve could actually see.
3. The two-audience model: the crowd sees the show (heat, public); the locker
   room sees the work (trust, private). Botches the crowd can't detect cost
   trust and bodies, not heat.
4. Betrayal (shooting) is always possible and always priced, never prevented.
5. AI-generated content is an enhancement layer only. The game must run fully
   offline with authored content.
6. One match until it sings. No roster, modes, or career features.
7. Parody, not plagiarism: attitude-era register, invented iconography, no
   real trademarks, catchphrases, or trade dress.

## Characters (note: correction pending from build 0.02)

- STOVE HOT — the FACE. Stone Cold parody. Drop "Greg Texas" from his name
  everywhere. Brand: burner-coil orange. Finisher placeholder: The Front Burner.
- THE BOULDER — the HEEL. Corporate-champion Rock parody. Brand: navy/gold.
  Finisher placeholders: The Landslide; The Shareholder's Elbow.
(The alignment/name fix landed in v0.03; STOVE HOT is the face, THE BOULDER
the heel, and "Greg Texas"/the cowboy hat are gone. Kept here as the record.)

## Current state

index.html is **Build 0.06 "the transplant"**: a modular HTML5/Canvas build
(src/ + data/), no build step, opens straight from disk. The movement
prototype's **momentum engine is now the base**: wrestlers accelerate and run
and carry velocity, tie up (collar & elbow), Irish-whip each other into the
ropes and corners, rebound, clothesline a charging man, and climb for a
cooperative top-rope superplex — all drawn as jointed procedural skeletons in
the dark "Audacity Era" arena (bible §9). Every booked spot is PERFORMED
through those verbs (bible §5.3, §5.10). On top sit the systems, all working:
crowd model v1 (arc, allegiance, resentment, hijack chant, flashbulbs), the
two-audience split, trust + respect economies, the Gorilla-position Pitch
planning screen, and star-rated endings. New in 0.06: the **taunt** verb
(§5.11), diegetic **commentary bubbles** (§5.9), and the fully **orchestrated
six-beat finish** (§8). `v1-demo/` remains as the reference prototype.

## Build order for the demo

- v0.03–v0.05 — DONE: src/ refactor, character fix, crowd model v1, the
  Gorilla-position Pitch planning screen, corners, the gated superplex.
- v0.06 "transplant" — DONE: momentum engine adopted as the base; spots
  performed through the momentum grammar; jointed-skeleton rendering; the
  taunt verb; commentary bubbles; the orchestrated finish sequence.
- v0.07 "readable cues" — DONE: every cue rewritten in plain player language
  + the literal key (cue grammar is now a hard rule, bible §5.3; "work"/
  "plant" banned from screen); cues in fixed above/below lanes with name tags,
  clamped on-screen; corner-whip assist (aim-toward-post, 80%→100% capture)
  with miss feedback; planning-screen text measured so it can't overrun panels.
- v0.08 "one-man band" — DONE: the CPU performer (press 1/2 to hand STOVE/THE
  BOULDER to a cooperative AI, bible §5.12) so the match is playable/testable
  solo; UI pass (controls card moved below the ring; right rail is now just the
  call sheet + "Match Log"); commentary bubbles rise from the bottom-centre off
  the health bars; removed the frozen end-of-match screen shake.
- v0.09 "weight & warmth" (feel pass) — DONE, driven by playing the build via
  the run skill: heavier/grippier locomotion (the "walking on ice" fix); the
  grapple now lifts-and-drives with a heavy impact (bible §5.3); the top
  heat/resentment/trust meters consolidated into one legible panel; wrestlers
  scaled up; bigger cue chips + a clean pin-count number; results screen calmed.
- NEXT — Jordan's 0.09 playtest (movement weight dialled right? slam lift feel?
  meters/cues legible?); tuning knobs in config.js (PCW.MOVE, FRAMES.SLAM_*).
  Then the sprite/asset pass (individual PNGs from assets/sprites/, naming:
  stovehot_idle.png; anchor at feet centreline; ~480 px source for ~240 px
  display; keep the procedural skeletons as the fallback), and the
  hype-package + aftermath screens.

## Technical conventions

- Vanilla JavaScript, HTML5 Canvas, no frameworks, no build step. index.html
  must always open directly in a browser and be playable after every session.
- Game logic on the fixed 60 Hz timestep; rendering free-running. All timing
  windows in logic frames, never wall-clock or render frames.
- Data-driven where possible: spots, personas, and match plans as JSON in
  data/, not hardcoded.
- Individual PNG files, not sprite sheets.

## How to work with Jordan

Jordan is the designer/director, not a coder. Explain changes in plain
practical terms, not code walkthroughs. Work in small increments: one system
per session, playable at the end of it. When a design question comes up,
consult docs/GAME_BIBLE.md first and raise a real objection if a request
conflicts with the anti-goals. Playtest feedback lives in
docs/playtest-notes.md — read it at the start of each session.

## Process: the version log and keeping docs true

- **Git history is the version log.** After every session that adds,
  removes, or meaningfully changes a real game system (not a pure bugfix
  or a tuning tweak), make a git commit whose message says what changed
  and why. Do not keep a separate hand-maintained changelog file — the
  commit history serves that purpose.
- **Keep the bible in sync with the code.** Whenever a session adds,
  removes, or meaningfully changes a game system, update
  docs/GAME_BIBLE.md to reflect it before the session ends — the same
  cadence docs/playtest-notes.md already follows. The bible is the design
  source of truth and must not drift from what the code actually does.
- **On disagreement, surface it — don't silently reconcile.** If the
  bible and the actual code ever contradict each other, tell Jordan and
  let him decide which is right; never quietly pick one and move on.
