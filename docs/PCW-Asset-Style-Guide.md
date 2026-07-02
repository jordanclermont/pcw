# PCW ASSET STYLE GUIDE
## Everything Gemini needs, in generation order
### v1.0 · July 2026 · companion to the Game Bible §9–10

This document is the single source of truth for generating PCW's art. Work top
to bottom. Nothing in Phase 2 starts until Phase 1 is approved and locked.

---

## 0. Rules that apply to every single generation

**Never type these into a prompt:** the names of real wrestlers or promotions
(Stone Cold, Austin, The Rock, WWF, WWE, "attitude era"). Image models trained
on the real people will drift toward real likenesses, which is a legal problem
and a creative one. Describe our invented men physically; the archetype comes
through attitude and costume.

**No text in images.** Generators produce garbage lettering. Every logo,
sign, lower-third, and title is added by you in your design pass. Prompts end
with "no text anywhere in the image."

**One lighting setup forever.** Key light from the upper front-left, plus a
cool rim light from behind, as if lit by arena spotlights. Every prompt says
so. This is what lets separately generated assets composite into one scene.

**Flat green background** (solid chroma green) on every character, referee,
and prop asset, for clean cutout. Scene assets (ring, arena, stills) are the
exception: they keep their own backgrounds.

**Generate big, deliver exact.** Generate at the largest size available, at
least 1024 px on the short side. After cutout, export transparent PNGs at
roughly 480 px character height for standing poses (display target is 240 px,
so this is 2x). Anchor every sprite at the centre of the feet.

**Judge in this order:** silhouette first (would you know him in black?),
face second, costume detail last. Reject anything whose silhouette is generic
before you spend a second on the details.

---

## 1. The palette (for your design pass and for prompts)

- PCW blood red: `#B3001B`
- PCW black: `#0B0B0D`
- Steel grey: `#8A8D91`
- Off-white paper/flash: `#F2EFE6`
- Stove Hot burner orange: `#FF6A00`, glow highlight `#FFB000`
- Boulder corporate navy: `#0E2A52`, gold trim: `#C9A227`

---

## 2. The prompt formula

Every prompt is assembled from four parts:

> [STYLE BLOCK] + [CHARACTER] + [POSE CLAUSE] + [TECHNICAL TAIL]

**STYLE BLOCK (paste verbatim, never edit):**

> Bold graphic illustration style for a late-1990s professional wrestling
> television aesthetic, gritty and theatrical. Flat cel-shaded coloring,
> thick clean outlines, minimal gradient, poster-art rendering, bold
> readable silhouettes, slightly exaggerated heroic proportions, strong rim
> lighting as if lit by harsh arena spotlights, high contrast.

*(Revised after v1: the original "painted realistic illustration style"
with "smoky atmosphere" produced results too detailed and too slow to stay
consistent across a large pose set, especially the two-body poses. The flat
cel-shaded version holds up better at in-game display size and drifts less
between generations.)*

**CHARACTER:** in Phase 1, the full canon description below. From Phase 2 on,
you attach the approved reference sheet image and write: "Same character as
the reference image, identical face, costume, and proportions."

**POSE CLAUSE:** from the inventory in Phase 2.

**TECHNICAL TAIL (paste verbatim on all cutout assets):**

> Full body visible from head to boots, centred, feet fully in frame, key
> light from upper front-left with a cool rim light from behind, solid flat
> chroma-green background, no text anywhere in the image, no logos, no
> watermark.

---

## 3. Character canon

These paragraphs are canon. If a generation contradicts them, the generation
is wrong, not the canon.

**STOVE HOT (the face).** A bald, goateed brawler in his late 30s. Stocky,
built like a bar bouncer rather than a bodybuilder: thick neck, heavy
shoulders, a slight gut he carries like a weapon. Plain black trunks, black
knee pads, black boots, black taped fists. A sleeveless black leather vest,
collarless, no lapels, no zipper, with a glowing orange emblem on the back:
concentric rings like a coiled electric stovetop burner element, with a
visible gap where the coil connects to a dial — not a spiral or hypnotic
swirl. The same coil emblem appears small on his trunks' waistband and
nowhere else. His face carries a cocky half-grin, one eyebrow raised, a
spark of dark humor in his eyes, the look of a man who is about to enjoy
this. He is magnetic and dangerous, not menacing: charisma first, threat
second — this is the man who's supposed to be the most popular guy in the
building.

*(Revised after v1: the first generation nailed the build but the emblem
came out as a spiral, the vest read as a motorcycle jacket, and the face
was pure intimidation — mean rather than likeable, which read as a heel.
The wording above is more explicit on the coil shape and the vest cut, and
replaces "he does not smile, he smirks once before violence" with
charisma-forward expression language, since a beloved anti-authority face
needs magnetism, not menace.)*

**THE BOULDER (the heel).** A towering, impossibly handsome corporate
champion in his early 30s. Granite physique, flawless grooming, short
immaculate dark hair, one eyebrow arched in permanent self-satisfaction.
Navy trunks with gold trim, navy boots, white athletic tape on both wrists,
and in entrance contexts a luxurious navy robe with gold lining draped over
his shoulders. The body language of a man who believes the company is lucky
to have him and the crowd is lucky to boo him. Everything about him is
polished, expensive, and infuriating.

---

## 4. PHASE 1 — Reference sheets (do this first, approve, lock)

Goal: one canonical turnaround per wrestler, plus a face sheet. Expect five
to ten iterations each. When one is right, save it, name it
(`canon_stovehot.png`, `canon_boulder.png`), and never regenerate it.
It becomes the reference image attached to every later prompt.

**Prompt 1a — Stove Hot turnaround:**
[STYLE BLOCK] + [Stove Hot canon paragraph] +
> Character turnaround sheet: the same wrestler shown four times in a row —
> front view, three-quarter view, side view, back view — in an identical
> relaxed standing pose. The back view clearly shows the glowing orange
> burner-coil emblem on the vest.
+ [TECHNICAL TAIL]

**Prompt 1b — The Boulder turnaround:**
[STYLE BLOCK] + [Boulder canon paragraph] +
> Character turnaround sheet: the same wrestler shown four times in a row —
> front view, three-quarter view, side view, back view — in an identical
> confident standing pose, no robe.
+ [TECHNICAL TAIL]

**Prompt 1c / 1d — Face sheets** (one per wrestler):
> Close-up character sheet of the same wrestler's head and shoulders from
> the reference image: front view, three-quarter view, profile. Neutral
> expression, angry expression, and his signature expression (Stove Hot: a
> one-sided smirk / The Boulder: the arched eyebrow).

**Workflow tips for Phase 1.** Keep one Gemini conversation per character so
its context helps consistency. When a result is close, edit rather than
reroll: "same image, but make the goatee fuller" beats a fresh prompt. If the
face keeps wandering, lock the body first and fix the face through close-up
edits.

---

## 5. PHASE 2 — Pose inventory (only after Phase 1 is locked)

Every prompt: [STYLE BLOCK] + reference image attached + "Same character as
the reference image, identical face, costume, and proportions." + the pose
clause + [TECHNICAL TAIL]. Generate each pose in the three-quarter view
facing left; the engine mirrors for the other direction.

File naming: `stovehot_idle.png`, `boulder_sell.png`, and so on, exactly as
listed. These names are what the v0.06 sprite loader will expect.

**Solo poses, both wrestlers (16 files each):**

- `_idle` — relaxed ready stance, weight even, hands loose at chest height.
- `_walk_a` — mid-stride, left foot forward, arms in natural counterswing.
- `_walk_b` — mid-stride, right foot forward.
- `_run` — full sprint, deep forward lean, arms pumping.
- `_strike_windup` — right arm cocked far back across the body, open hand,
  torso twisted away, ready to deliver a huge open-hand blow.
- `_strike_contact` — open-hand chop fully extended across chest height,
  torso rotated through the blow, follow-through.
- `_grapple_reach` — crouched slightly, both arms extended forward at
  shoulder height, fingers spread, closing in to seize an opponent.
- `_slam_delivery` — torso bent forward, both arms driving down and forward
  as if hurling something heavy at the ground.
- `_sell` — staggering backward theatrically, arms flailing above shoulder
  height, head thrown back, knees buckling: enormous exaggerated pain.
- `_hit` — head snapped to the side, shoulders jolted, slight knee buckle.
- `_down` — lying flat on his back seen from the side, arms slightly out,
  one knee raised, chest heaving, exhausted.
- `_getup` — on one knee, one fist pressed to the ground, head down, rising.
- `_kickout` — lying position, back arched explosively off the ground, arms
  thrusting upward: a desperate burst of effort.
- `_taunt` — persona-specific: Stove Hot raises both taped fists and roars
  at the crowd; The Boulder stands arms spread wide, drinking in the boos,
  eyebrow arched.
- `_celebrate` — persona-specific: Stove Hot with both fists raised as if on
  a turnbuckle saluting the crowd; The Boulder holding an invisible belt
  aloft one-handed (belt composited later).
- `_stagger_feed` — bent forward at the waist, arms hanging, wobbling
  toward the viewer: dazed and walking into whatever comes next.

**Two-body poses (generated as single combined images; the engine treats
contact moments as one "duo sprite").** These are the hardest generations.
Describe bodies and weight, never move names. Only the pairings the demo
needs:

- `duo_frontburner.png` — Stove Hot delivering his finisher to The Boulder:
  the bald wrestler is dropping to a seated position on the mat while
  gripping the taller wrestler's head over his own right shoulder; the
  taller wrestler is jackknifed forward at the waist, feet leaving the
  ground, body whipping downward.
- `duo_landslide.png` — The Boulder delivering his finisher to Stove Hot:
  the taller wrestler has one arm wrapped around the other man's back,
  lifting him fully horizontal at chest height, driving him down toward the
  mat, his own body falling with the throw.
- `duo_elbow.png` — The Boulder mid-air above a prone Stove Hot, one elbow
  pointed straight down, theatrical and unnecessary, the prone man flat on
  his back below.
- `duo_pin_stovehot_covers.png` — Stove Hot draped across The Boulder's
  chest, hooking one leg; the pinned man flat on his back. Side view.
- `duo_pin_boulder_covers.png` — the reverse pairing. Side view.
- `duo_superplex_setup.png` — both wrestlers standing on the top turnbuckle
  corner, the taller man gripping the other in a front facelock, both
  balanced precariously at height. (Generate with the corner post included.)
- `duo_superplex_fall.png` — both wrestlers mid-air, horizontal, falling
  backward together away from the turnbuckle, limbs braced.

Expect the duo images to take the most iterations. If a duo pose will not
converge, generate the two bodies separately in matching poses and composite
them yourself; your cutout pass is allowed to cheat. Impact frames hide sins:
the engine's hit-stop, shake, and flashbulbs land on exactly these moments.

---

## 6. PHASE 3 — The scene

These keep their own backgrounds (no green screen). Same style block, same
lighting language.

- `scene_ring.png` — an empty professional wrestling ring seen from an
  elevated three-quarter angle, black mat, black apron (large blank flat
  panel on the apron for a logo to be added later), steel corner posts, three
  red ropes, harsh spotlight pool on the mat, dark smoky arena beyond. This
  angle must roughly match the game camera; generate several and pick the
  best match against a screenshot of the current build.
- `scene_crowd_far.png` — a wide, dark arena bowl at night: thousands of
  barely lit silhouettes, lighting rigs, haze, occasional camera flashes.
- `scene_crowd_near.png` — a single row of rowdy late-90s wrestling fans
  from the waist up, dark arena behind them, several holding blank white
  rectangular signs (you letter the signs later). Generated as a wide strip;
  will be layered and duplicated for parallax.
- `scene_stage.png` — an entrance stage: giant video screen frame (screen
  itself blank black), steel scaffolding, smoke, spotlights.
- `scene_gorilla.png` — a cramped backstage staging area just behind an
  arena curtain: monitors, a folding table, cables, fluorescent light,
  clipboard on the table. Unglamorous. This backs the planning screen.

---

## 7. PHASE 4 — The cast around the match

- Referee, on green screen, technical tail applies, six files: `ref_idle`
  (striped shirt, black trousers, bow tie), `ref_count` (on his knees, palm
  flat, mid-slap of the mat), `ref_count_up` (kneeling, holding up two
  fingers), `ref_warn` (finger-wagging remonstration), `ref_down` (flat on
  his back, out cold), `ref_signal` (arms crossing in a sharp X: match over).
- `prop_belt.png` — a championship belt, navy leather strap with a large
  ornate gold centre plate left blank of any lettering, hero shot on green.
- `prop_belt_small.png` — the same belt straight-on for UI overlay use.

---

## 8. PHASE 5 — Story stills (the hype package)

Five cinematic images, 16:9, own backgrounds, same style block. These are
the feud in pictures; text and grading come from you afterward.

1. `still_champion.png` — The Boulder in a wood-panelled boardroom, belt on
   his shoulder, flanked by applauding executives in suits, smug beyond
   endurance.
2. `still_defiance.png` — Stove Hot in a dim arena corridor, burner coil
   glowing on his vest, staring down a wall of framed corporate portraits,
   one already knocked crooked.
3. `still_confrontation.png` — the two men nose to nose in the ring under a
   single spotlight, crowd flashbulbs freckling the darkness behind them.
4. `still_contract.png` — a contract-signing table flipped mid-air, papers
   flying, both men lunging at each other as suited officials scatter.
5. `still_poster.png` — the two facing off in profile against a black
   background split by a crack of red light, composed like a pay-per-view
   poster with empty space at the top for the event logo.

---

## 9. Acceptance checklist (every asset, before it enters the repo)

An asset is done when: the character matches canon at a glance; the
silhouette reads instantly at 240 px tall (zoom out and check); lighting
comes from upper front-left with a cool rim; the pose is legible without
context; there is no text, no watermark, no accidental logo; the cutout edge
is clean; the file is a transparent PNG at 2x display size with the correct
name. If any check fails, it does not go in `assets/`.

---

## 10. Delivery into the project

Finished sprites go in `assets/sprites/`, scene art in `assets/ui/`, story
stills in `assets/stills/`, using the exact file names above. When a
meaningful batch has landed, tell Claude Code: "Assets have arrived in
assets/ per the style guide file names; wire up the sprite loader per v0.06."
Any pose still missing simply keeps its procedural placeholder, so partial
batches are fine and you can integrate as you go.
