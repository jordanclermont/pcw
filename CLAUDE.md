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
The 0.02 code has these alignments and names wrong. Fix in v0.03.

## Current state

index.html is Build 0.02: a single-file HTML5/Canvas prototype. Working:
fixed 60 Hz logic timestep, WASD/arrows two-player input, grapple with a
12-frame startup and a frames-4-to-9 reversal window on the Work (Y) button,
sell windows, pins, a scripted call sheet, heat/trust meters, botch/shoot
penalties, endings with a star rating. The visual style in 0.02 (black/white
ink) is RETIRED — new direction is "Audacity Era" (see bible §9): crash-TV
1997–2000 parody, dark arena, flashbulb ripples through the crowd as the
signature reward effect.

## Build order for the demo

- v0.03 — refactor index.html into src/ modules; fix character names and
  face/heel alignment; crowd model v1 (arc, allegiance, decay, one hijack
  chant); remove crowd reactions to information it can't see.
- v0.04 — Gorilla position planning screen (draft ~6 spots from a menu around
  the fixed booking: Stove Hot wins; Boulder protected in the loss).
- v0.05 — finish sequence (finisher / kick-out / near-fall / second finisher)
  and the top-rope superplex multi-input chain.
- v0.06 — asset integration: sprite loader for individual PNGs from
  assets/sprites/ (naming: stovehot_idle.png; anchor at feet centreline;
  ~480 px source for ~240 px display). Keep procedural placeholders as
  fallback for any missing pose.
- v0.07 — hype package intro and aftermath/epilogue screens.
- Then tuning passes from docs/playtest-notes.md.

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
