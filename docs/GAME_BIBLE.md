# PCW: PERSONA CHAMPIONSHIP WRESTLING
## Game Bible v1.1
### July 2026 · Jordan Clermont · Working document

*v1.1 revisions: added the Respect axis (§5.2), updated the planning screen
to the actual Pitch model as built (§8), added a status note that corners
are drafted but not yet physically implemented (§8), and added the deferred
commentary design (§5.9). Sections 1–4, 6, 7 unchanged.*

*v1.8 revisions (Build 0.12): the page chrome rebuilt as an early-2000s WWF.com
throwback with embedded Anton/Oswald fonts (§9, Jordan's design reference);
sandbag restricted to HEAVY moves, which now lift slowly for reaction time
(§5.13). The canvas HUD moved off Impact onto Oswald for cohesion.*

*v1.7 revisions (Build 0.11): corrected terminology (pop-up-early = no-sell) and
built the real SANDBAG (fight the lift, attacker must brute-force) on the slam;
CPU now performs deliberately (paced, held lock-ups) so it's answerable; cues
emphasize the key as a keycap; slower locomotion + wider reversal window. §5.13.
Answered a process question: the WWF.com-era redesign is Jordan-directs-taste,
Claude-builds-it-in-code — no assets to hand-make.*

*v1.6 revisions (Build 0.10): the receiver's game — selling and get-up are now
a real choice, popping up early is a priced sandbag, and pins are manual (kick
out or lose), §5.13. The match now boots straight into the ring (the booking
screen is bypassed — press B to open it) to focus on the match. Movement
slowed again. Attacker-side stakes (stiff/receipts), real per-move animations,
heel heat, and the WWF.com-era visual/font redesign are the sequenced next
passes.*

*v1.5 revisions (Build 0.09, feel pass): grapple weight — the lift-and-drive
slam (§5.3); heavier/grippier locomotion; plus non-bible UI work (the top
heat/resentment/trust meters consolidated into one legible panel, wrestlers
scaled up to read bigger, larger cue chips, the results screen left calm).
Driven by playing the build via the run skill, not just the harness.*

*v1.4 revisions (Build 0.08): added the CPU performer for solo play/testing
(§5.12); commentary bubbles now rise from the bottom-centre, clear of the
health bars (§5.9); plus UI/bugfix work not needing bible changes (controls
moved below the ring, right rail is call sheet + Match Log, the frozen
end-of-match shake removed).*

*v1.3 revisions (Build 0.07): the cue grammar is now a hard rule (§5.3) —
plain wrestling language plus the literal key, "work"/"plant" banned from
screen, fixed above/below cue lanes; the corner-whip assist and its miss
feedback (§5.4); and a note on what the headless harness can and cannot prove
(§11). Also updated CLAUDE.md's build-order note. Nothing else changed.*

*v1.2 revisions (Build 0.06, "the transplant"): the movement prototype's
momentum grammar is now the MAIN engine — the old teleporty grid-step is
retired and every booked spot is performed through the momentum verbs
(§5.3, §5.10). Added the TAUNT verb (§5.11). Commentary bubbles are now
BUILT, not deferred (§5.9). The orchestrated finish sequence is BUILT — the
six-beat protected finish with two booked kick-outs (§8). Sections 1–4, 6,
7 unchanged.*

---

## 1. What PCW is

PCW is a cooperative performance game disguised as a wrestling game. Two players hold controllers and perform a professional wrestling match together, in real time, in front of a simulated crowd. The crowd is the score. The match has a plan agreed before the bell, and the drama of the game comes from whether the two performers execute that plan, improvise around problems, or betray each other.

Every wrestling game ever made asks "can you beat your opponent?" PCW asks "can the two of you have a great match?" Those are different games. In PCW, a suplex is not an attack, it is a stunt two people perform together, and it only works if both of them do their jobs.

What PCW is not: a fighting game, a booking simulator, or a wrestling game with a kayfabe skin. Health bars do not decide anything. The moment a player can win by depleting the other player, the design has failed.

The genre research confirms the lane is open. The cooperative worked-match idea exists in a tabletop RPG (World Wide Wrestling), the crowd-hype idea exists in a turn-based RPG (WrestleQuest), and the match-quality-as-objective idea exists in booking sims and one turn-based indie (Built for the Ring). Nobody has built the real-time action version where two humans physically perform the match. That gap is the project.

---

## 2. The core thesis: performance, not combat

Players should feel like they are playing a wrestling game. They run the ropes, throw strikes, hit slams, kick out of pins. The inputs, timing, and physicality of an action wrestling game all remain. What changes is what the actions mean and how they are scored.

A chop that lands is worth nothing by itself. A chop that lands, gets sold big by the receiver, and arrives at the right moment in the match's emotional arc is worth heat. Execution is shared: the person taking the move is performing just as much as the person delivering it, and the game's timing challenges are distributed across both players. This is the single most important design rule: **every significant moment requires input from both performers.**

The Work button carries this philosophy. Each player has one context-sensitive button whose meaning is always "do your job right now": reverse when the spot calls for a reversal, sell when a strike lands, feed a comeback, kick out at two, stay down for the finish. The same button, used against the plan, is a shoot. Cooperation and betrayal live on the same input, which keeps the temptation physically present in the player's hand at all times.

---

## 3. The two-audience model

This is the structural heart of the game. There are two watching parties with different information, and every system answers to one or the other.

**The crowd** sees only the show. It does not know the script, does not know who is booked to win, and cannot tell a botch from a receipt unless it looks like one. The crowd knows the *storyline* (it watched the weeks of TV that built this match, so it has rooting interests and expectations) but not the *plan*. The crowd judges pacing, drama, escalation, believability, and whether it is getting the story it came to see. Crowd Heat is the public score.

**The locker room** (the other performer, the referee, the office behind the curtain) sees the work. It knows the script, notices every missed cue, feels every stiff shot, and remembers who can be trusted. Trust is the private score.

The design consequence: a botch you cover smoothly costs almost nothing publicly. It costs trust and bodies backstage. A shoot the crowd enjoys (a shocking title change, a surprise kick-out) can gain heat while destroying trust. The two meters can move in opposite directions from the same event, and that split is where the interesting decisions live. Build 0.02 got this wrong by letting the crowd boo botches it could not have detected; every future system must pass the test "could the crowd actually know this?"

---

## 4. The three loops

**Plan.** Before the bell, the performers build the match together. The office hands down non-negotiables (tonight's finish, any stipulations from the talent). The players then draft the body of the match from a spot menu, negotiating who takes which bumps. Big bumps are risk trades: the taker carries the injury risk, both share the heat reward. This phase is a strategy game about trust, played before any physical skill is tested.

**Perform.** The match itself. Real-time execution of the plan, spot by spot, with timing windows, cooperative multi-input sequences for big moves, selling, pacing decisions, audibles when things go wrong, and the standing temptation to shoot.

**Pay off.** The rating, the fallout, the story consequence. In the full game this feeds the next show: injuries persist, trust reputations follow you, the office books around what you did. In the demo it is a rating card and a written epilogue that acknowledges what actually happened.

---

## 5. Systems

### 5.1 The crowd model

The crowd is an engine with desires, not a meter that dispenses points. Its state includes:

- **Heat** (0 to 100): current engagement. Decays slowly when nothing lands. The public score.
- **An expectation arc**: crowds want matches shaped like stories. Early feeling-out, escalating action, a heat segment where the heel controls, a comeback, near-falls, a finish. Spots that land where the arc wants them earn full value; a finisher in minute one earns a fraction and burns future pop (the crowd has a limited supply of belief, and big moves spend it).
- **Storyline allegiance**: the crowd arrives caring. In the demo it is firmly behind Stove Hot and hostile to the champion. Face offence pops harder; heel control builds resentment that makes the comeback pay more. Playing to allegiance is playing the crowd.
- **Restlessness and hijack**: if heat stalls too long, the crowd starts asking for things: a chant appears on screen requesting a spot type or a performer. Serving the chant pays a bonus; ignoring it drains heat faster. This is the crowd overriding the match plan, and it forces audibles. The crowd never requests specific scripted spots (it cannot know them); it requests categories: more action, the face, a big one, take it outside.
- **Visible reactions only**: pops, boos, chants, silence, flashbulbs. The crowd reacts to what it sees. A missed reversal reads as a slam. A shoot pin reads as a shocking finish. The crowd's information is the picture, never the plan.

### 5.2 Trust, and the Respect axis

Trust (0 to 100) is the private meter between the performers, and in the full game it extends to reputations with the referee, the locker room, and the office. It moves on backstage truth: kept promises, safe hands, covered mistakes, and their opposites.

Betrayal is always mechanically possible. A player can stiff their opponent, no-sell, hijack spots, kick out of the finish, or steal a pin over the champion. The game never prevents this; it prices it. The pricing, escalating with severity:

- **Immediate**: trust drops. At zero trust the professional relationship is dead: cooperative moves stop being available (your opponent will not take your moves properly), the match breaks down, and the rating collapses.
- **Officiating**: the referee is a person with a memory. A worker the ref trusts gets slow counts against them, leniency on rope breaks, an eye conveniently elsewhere. A worker who shoots gets fast counts, strict enforcement, and no favours. (Full treatment in 5.7.)
- **The other performer's tools**: a betrayed worker can sandbag: refuse to feed, refuse to sell, stiff back. Receipts are a legitimate in-fiction response, and the game should let a wronged player extract them, at further cost to the match.
- **The office** (full game): booking punishment. Steal a win and you may hold the belt, but you will defend it in openers against people paid to hurt you, and the story layer writes you as the promotion's problem.

The design intent: stealing the title should be genuinely available, occasionally story-perfect, and almost never worth it. The player who does it should feel the temperature drop.

**Respect** is a second, separate meter, added during v0.04.1 and worth formalizing here because it turned out to be a real idea, not just a tuning knob. Trust measures whether your partner believes you'll do your job safely and as agreed. Respect measures whether the crowd and the office rate you. The two can diverge on purpose: a player can be a beloved, crowd-pleasing loose cannon, high respect, low trust, or a scrupulously reliable worker nobody's excited to see, high trust, low respect. Respect is earned in-ring (serving a crowd chant, a shoot that the crowd happens to pop for) and spent in the planning phase, where a pitcher's standing respect is the office's benefit of the doubt on a risky pitch: safe spots pass easily regardless, but a genuinely dangerous spot needs both a partner's buy-in and a pitcher who's respected enough that the office trusts them to pull it off. Respect persists across matches, so playing to the crowd in one match buys creative pull in the next booking.

### 5.3 The Work button and timing

Carried forward from Build 0.01/0.02, this is proven and stays. Timed windows measured in frames on a fixed 60 Hz logic step. The reversal window (frames 4 to 9, perfect at 6 to 7) is the template; selling windows, kick-out timing, and the superplex beats use the same pattern with their own tunings. Timing quality grades the pop: crisp work reads better from the fifth row.

**Performing spots through the momentum grammar (Build 0.06).** With the momentum engine (§5.10) as the base, a booked spot is no longer a single context-button press — it is performed with the movement verbs, and position gates it. The call sheet still names each spot and cues it, but you execute it in the ring: tie up (Grab) and the controller Works to plant a slam, or the receiver Works in the 4–9 window to reverse it into the arm drag; whip the bump-taker into a corner (Grab-whip + push a direction) and Strike to stomp; run him into a Strike for a clothesline bump; go up top (Grab) from a corner for the superplex. A spot you cannot set up yet — the man isn't in the corner, say — simply is not available; the attacker whiffs (no shoot penalty for a missing prerequisite) and the cue tells you how to set it up. The same verbs used against the sheet are shoots, priced as ever.

**Grapple weight (Build 0.09).** A slam is not an instant teleport-to-the-mat: the attacker locks up, LIFTS the opponent for a beat, then drives him down with a heavy hit-stop. The audience/backstage outcome (the crowd pop, the trust cost, the call-sheet advance) resolves on the impact, not the button press — so a grapple reads and feels like a grapple. Locomotion was also made heavier the same pass (lower top speed, much grippier friction) after the "walking on ice" note.

**Cue grammar — the hard rule for all player-facing text (Build 0.07).** A cue must say WHAT TO DO in wrestling terms, then name the literal key for THAT player — nothing else, one instruction at a time. "SLAM HIM — PRESS T"; "WHIP HIM AT A CORNER — PUSH A DIRECTION"; "REVERSE HIM — PRESS T NOW"; "KICK OUT — PRESS I"; "STAY DOWN — TOUCH NOTHING". Never design-doc vocabulary: the words **work** and **plant** are banned from anything on screen (they live in the bible and the code; the cue names the key). Cues are per-player about keys — a single key-label map (`KEYLABEL` in engine.js: Stove T/G/F/H, Boulder I/K/J/L) is the one source of truth for what letter a button is. The cue reads the current spot and shows only the action the sheet wants right now; other options still work mechanically, the cue just stops advertising them. This applies everywhere: the live ring cues, the superplex beats, and the spot data. Placement (Build 0.07): the two performers' cues sit in fixed vertical lanes — Stove's always above his figure, the Boulder's always below — each tagged with the wrestler's name and clamped on-screen, so when the two are stacked the chips never collide.

### 5.4 Big spots: cooperative execution

Signature moments are multi-input sequences shared across both players. Every input hit cleanly means full heat and minimal real damage; degraded execution means the same visual event with more genuine harm to the receiver and a sloppier read from the crowd. The riskier the bump, the longer the input chain and the higher the stakes on both sides. This is the mechanical expression of "putting your body in someone else's hands": the receiver's health literally depends on the attacker's inputs, and vice versa. Ladder and table spots belong to this system later; the demo proves it with one top-rope spot.

**Implemented in v0.05 — the top-rope superplex.** It is a four-beat chain, each beat its own wrestler state with its own frame length and (for three of the four) a timed Work-button window, using the same state-plus-window pattern as the grapple reversal. It plays out entirely in the live ring — no cutscene, no camera change. The beats: **CLIMB** (attacker goes up, no input), **POSITION** (receiver Works in-window to meet him up top), **THROW** (attacker Works in-window to bring him over), **LAND** (both Work in-window for the landing). Each missed window is one degraded beat: the landing still happens and still reads to the crowd as a superplex (no botch-boo — it is visible offence either way), but every miss adds real body damage to the receiver and shaves the pop. A clean four-beat chain reads huge; a sloppy one is a realer, uglier bump for the same picture.

**Positional preconditions (v0.05).** Some spots require a real ring position, not just a call-sheet label. Corner-tagged spots (CORNER STOMPS, the superplex) will not fire unless the bump-taker is actually standing in one of the four corners — grid points sitting under the rendered turnbuckle posts. If he isn't there the move is simply unavailable: the attacker whiffs (no shoot penalty — a missed prerequisite is not a betrayal) and the on-canvas cue switches to "get him to a corner first," with the corners marked on the mat. Players achieve the position by whipping him into the buckle. This is the seed of a general "the ring is a real space" idea: later spots (ropes, apron, announce table) will gate on position the same way.

**Corner-whip assist (Build 0.07).** Getting a man to a corner has to be reliable or the whole corner layer plays as a silent broken loop. Raw physics only captured ~80% of intuitive whips (aim is quantized to eight directions; from about a fifth of ring positions no direction can point at a post), and a miss gave no feedback while the cue kept demanding the whip. The fix is also the honest kayfabe one: **in a worked match the whipped man runs to the buckle himself.** So when the booked spot is corner-gated, the whip's launch is bent straight at whichever post sits within ~35° of the aim (100% capture in simulation across the ring); if no post is in that cone, or the spot isn't corner-gated, the whip stays honest and unassisted. A corner whip that still fails to capture now says so out loud — a colour-commentary line and a log line — instead of looping in silence. (Corner capture radius widened to 2.0 as a margin.)

### 5.5 Audibles and calls

Matches go wrong: a spot gets botched, a limb gets hurt, the crowd hijacks, someone is blown up. Workers adjust by calling audibles, and the call has to be covert because the crowd is watching. Mechanically: a call input opens a small radial of proposals (skip ahead, repeat a segment, swap a planned spot for a safer one, go home early). The proposal appears only on the partner's screen, styled as a whispered call in the clinch. The partner accepts or declines with their own input. Agreed audibles rewrite the live call sheet. An injured leg greys out every spot that needs it, forcing exactly the adaptation you described: the plan must reroute through what the bodies can still do.

### 5.6 Bodies and injury

Body condition is real and per-region (head, back, arms, legs), not a health bar. Worked moves cost a little; botches and shoots cost a lot; big bumps cost according to execution quality. Damaged regions degrade the relevant actions (a bad leg slows movement and disables leg-dependent spots) and force audibles. A region hitting zero is an injury stoppage: the worst ending, bad for the rating, worse for the story. Bodies are the reason the trust economy has teeth: when you agree to take someone's move, you are wagering your body on their hands.

### 5.7 The referee

The ref is a character with a trust ledger of their own, and their behaviour is a consequence system: count speed, strictness, and attention all flex with standing. The ref also anchors kayfabe: they can be knocked down (opening a window where anything goes, a classic device the crowd loves in the right dose), and they sell the drama of counts. In the demo the ref is visually present and implements count timing plus one bias rule; the full ledger comes later.

### 5.9 Commentary (built, v0.06)

Built as designed: two voices — play-by-play (CHET) and colour (DUTCH, a grizzled ex-wrestler) — presented as comic-style speech bubbles, not scrolling text. They rise from the bottom-centre of the broadcast (play-by-play low, colour stacked above), deliberately clear of the corner health/respect bars so they never cover a meter. Each voice shows only its latest line and lines are short and auto-truncated, so an overstuffed bubble never stops reading as a bubble. This keeps commentary diegetic, in keeping with the Audacity Era presentation. The engine feeds it: the bell, big moves, near-falls, reversals, the shocking kick-out, the finish. It is meta-guidance as well as flavour and is free to drift from the backstage log — the log stays a debug-facing technical readout; commentary is what the player actually reads. Still to come: kayfabe out-of-position hints and a fuller line library (names and desk art are placeholders).

### 5.10 Movement and the ring as real space (ADOPTED as the main engine, v0.06)

The core thesis (§2) promises that players "run the ropes, throw strikes, hit slams" — real wrestling locomotion, not menu combat. The v0.05 prototype (`v1-demo/index.html`) proved that feel; **v0.06 transplants it into the main build as the base engine.** The old teleporty grid-step is retired; `src/wrestler.js` now carries velocity, `src/engine.js` runs the momentum grammar, and `src/render.js` draws the wrestlers as jointed procedural skeletons. All the systems (crowd, trust, respect, the Pitch planning screen, spots, endings) were kept and now sit on top of a body that actually moves. `v1-demo/` remains as the reference prototype. The grammar:

- **Momentum locomotion.** Wrestlers accelerate to a walk and then a run and carry velocity; they do not snap between fixed speeds. This is what makes everything else feel physical.
- **The Irish whip.** From a collar-and-elbow tie-up, the wrestler in control pushes a direction to launch the other along it. It is the primary tool for *moving your opponent* — into the ropes, or into a corner. The receiver can contest the tie-up (a reversal press) to seize control instead.
- **Running the ropes.** The four ropes are elastic boundaries: a wrestler who hits them with speed rebounds with momentum, whether whipped or running on their own. This is the engine for criss-cross sequences and rebound spots.
- **Rebound collisions.** A stationary wrestler who strikes a charging opponent turns it into a **clothesline** — a big collision bump. Timing a move against a rebounding body is its own skill.
- **Position gates spots.** A whip into a corner leaves the man stunned there, which is the prerequisite for corner offence and the top-rope superplex. Spots that need a place (corner now; ropes, apron, outside later) simply are not available until the bodies are in the right place — the ring is a real space, not a backdrop. (See §5.4 for the superplex chain, which the prototype runs as a genuinely input-gated cooperative sequence.)
- **Procedural jointed animation.** Bodies are drawn as jointed skeletons (pelvis, torso, head, two-segment arms and legs) posed per state, with real run cycles, wind-ups, sells and bumps — the motion language that sells "wrestling" without hand-drawn frames, and the target the sprite pass (v0.06) will match.

Outside-the-ring brawling is the next extension of the same boundary logic and is not yet built.

### 5.11 The taunt (built, v0.06)

Each performer has a taunt (its own button, distinct from Work). A taunt is always legitimate crowd work — never a shoot — and it is the verb for *playing to the room* between spots. A face taunt pops the crowd; a heel taunt draws heat and banks resentment toward the comeback (the same engine that pays off a long heel-control segment). Either can answer a live hijack chant, which is where a taunt earns Respect. It is deliberately cheap in heat and rate-limited by its own animation, so it flavours the pacing without becoming a heat farm — the crowd's decay and finite belief keep it honest. It fills the gap the playtest notes flagged between "throw a move" and "hit a finisher," and gives the crowd something to request.

### 5.13 Selling & get-up — the receiver's game (built v0.10)

The single biggest fix to "it's just one guy presses a button, the other presses another": the person TAKING a move is no longer a ragdoll on a timer. After a bump you go DOWN and **do not get up on your own** — staying down IS the sell, getting up is a choice, and the move's weight sets how long a good sell should last (a strike bump is quick; a finisher or the superplex wants you down a long time). Popping up too soon after a real bump is a **sandbag**: it makes the attacker's move look like it did nothing (flat to the crowd), costs trust, and marks you as owing that worker a receipt. Lying there forever isn't free either — the show stalls and the crowd gets restless (dead-air negativity, distinct from heat on the heel). The cue shows the safe play *and* the temptation ("SELL IT — STAY DOWN · move = pop up (cheap)").

**Pins are manual, always (v0.10).** Nothing auto-kicks-out anymore. When you're pinned you MUST Work to kick out before three, or you eat the fall — and failing to kick out of the champion's near-fall means you *lose the match*. That's the stake: every pin is a live "kick out or it's over" decision. On the finish you're booked to lose, the cue says STAY DOWN and pressing Work is the shoot (as before).

This is the first delivery of §2's promise that "the person taking the move is performing just as much as the one delivering it." The attacker-side stakes (a *stiff* you can choose to lay in, receipts, cooperation visibly breaking down) are the next pass.

**Terminology note + the real sandbag (v0.11, refined v0.12).** Popping up early is a **no-sell** (under-selling), corrected from the earlier loose use of "sandbag." A **sandbag** is a distinct, separate betrayal: refusing to cooperate *during* a move. It exists only on **heavy** moves (finishers, the spinebuster, the landslide — anything big or risk ≥ 2), which now lift **slowly** so you have time to read the beat and decide; ordinary slams are quick and simply taken. While you're being lifted on a heavy move you can Work to *fight the lift* (go dead weight); the attacker then has to brute-force it, which makes the move ugly (half the crowd pop), dangerous (a real bump for the taker and a strain on the forcer), and costs trust and a receipt. The cue shows it only when it applies ("TAKE IT — or [T] to fight it"). The same principle will extend to the superplex and other cooperative lifts.

**Pacing (v0.11).** The CPU performer now works *deliberately* — a beat between its offensive moves and a held lock-up before it slams — so it's readable and answerable instead of rushing. Cues emphasize the literal key as a bright **keycap** so the input to press is unmistakable. Locomotion slowed again and the reversal window widened, all in service of "give the player time to read the beat and decide."

### 5.12 The CPU performer (solo play & testing, built v0.08)

Two people at one keyboard is a real barrier to feeling the match, so either side can be handed to a **CPU performer** (press 1 for Stove, 2 for The Boulder; on-screen "· CPU" tag on that wrestler's body bar). This is emphatically **not an opponent to beat** — that would violate anti-goal #1. PCW is a co-operative performance, so the CPU does its *job*: it closes distance, calls its own booked spots (ties up and slams, whips to a corner and stomps, goes up top for the superplex), takes its bumps, sells on cue, kicks out on the booked near-fall, reverses the arm drag inside the window, and works the superplex beats — and it **never shoots**. It plays entirely through the normal pad (a synthetic movement axis plus the same just-pressed button flags a human generates), so it obeys the exact same rules, timing windows, and two-audience pricing; nothing is special-cased for it. When the CPU is the *caller* of a spot its partner must answer (the arm-drag reversal), it deliberately waits rather than forcing a botch — cooperation over completion. Verified by both sides on CPU auto-playing full matches to a clean finish in the headless harness. (Booking is still done by the player; the preset cards make solo booking a couple of keypresses. A planning-screen CPU is a later nicety.)

---

## 6. The personas

The game is called Persona Championship Wrestling because the character is the unit of design. A persona defines a moveset, a crowd relationship, a promo voice, and a set of things the crowd expects and will pay to see. The demo ships two.

**Stove Hot** (face). The Stone Cold parody: anti-authority, beer-swilling energy, the working man who does not respect the office. The crowd's guy. Visual identity: black trunks and vest, shaved head, an iconography built around a glowing stove burner coil (his logo, his flame, his everything; the merch writes itself). Finisher: a stunner parody, placeholder name **The Front Burner**. Signature crowd ritual to be designed (the Austin beer-toast equivalent; your call as the writer, it should be something the crowd can request via chant).

**The Boulder** (heel). The corporate-era Rock parody: the office's handpicked champion, impossibly charismatic, insufferably polished, granite in a tailored entrance robe. Speaks of himself in the third person. Finisher: a Rock Bottom parody, placeholder **The Landslide**; secondary taunt-finisher, the People's Elbow parody, placeholder **The Shareholder's Elbow**. His heat comes from smugness and office protection; his genius is that the crowd hates him and cannot look away.

All names above are placeholders for you to keep or replace. Parody guidance: the gimmicks can be recognizably inspired, but invent adjacent iconography rather than cloning trade dress or catchphrases verbatim. No "3:16", no scratch-logo lookalike, no lifted lines. The parody should be legible from silhouette and attitude, not from copied assets. (I am not a lawyer; if this ever heads toward commercial release, that is a real conversation to have with one.)

---

## 7. Promos and story

The promo is a performance minigame, and it should be deterministic before it is intelligent. A workable core: the player assembles a promo from beats (callback, insult, stakes, catchphrase, crowd address) under a timing rhythm, reading the crowd's live reaction and deciding when to let a chant breathe versus talk over it. Pausing for the pop at the right moment is the skill, exactly as in the ring. This needs no AI and will be reliable, tunable, and funny.

AI earns its place one layer up: the story engine. Feuds that react to what actually happened in matches, an office that writes next week around your screwjob, promo text that references the real events of your career. That adaptability is where hand-authored branching cannot compete. The constraint to respect: an AI-dependent feature needs a connection and someone paying for the calls, so the design treats AI story as an enhancement over a deterministic skeleton, never as the foundation. The demo uses templated epilogue text keyed to match outcomes; it will feel authored, because it is.

---

## 8. The demo: one match

Yes, it is manageable, and the scope you described is close to ideal. One match, fully realized, is worth more than any breadth. The Boulder's protection stipulation is a gift to the design: it forces the finish to be a multi-beat sequence (finisher, kick-out, escalation, second finisher), which means the demo's climax exercises every system the game is about. Title: working name **PCW GRANDSTAND** for the pay-per-view (placeholder, your call).

**The demo flow, four screens:**

**1. The hype package.** A skippable 60 to 90 second cold open in the style of an attitude-era video package: four to six generated story stills, hard cuts, aggressive type, parody promo pull-quotes, building the feud. The story: The Boulder is the office's champion, deep into a protected reign; Stove Hot is the anti-authority face the crowd has demanded into this match; tonight the office finally has to put them in a ring. Purpose: give the crowd (and the player) the storyline allegiance that the crowd model runs on.

**2. Gorilla position (the planning screen).** The office's booking is displayed as non-negotiable: *Stove Hot wins the title tonight.* The Boulder's stipulation is attached: *he goes down strong*: he kicks out of the first Front Burner, he gets his own finisher and a believable near-fall, and only a second Front Burner keeps him down. Around those fixed beats, the match is a nine-spot structure, a fixed opener, six drafted spots, and the fixed finish, drafted through **the Pitch**: turns alternate, one performer pitches a spot from the menu, the other either puts it over for free, buries it at a cost, or lets it ride, and the office's agenda plus both performers' standing Respect decide whether it sails through or needs real buy-in. Safe, on-agenda spots pass easily; the top-rope superplex, a big bump on the champion, needs a put-over from the partner and a genuinely respected pitcher, roughly an 85 Respect threshold, to get approved at all. Three preset cards (The Classic, recommended; The War, high risk; From Scratch, full manual draft) make booking approachable without flattening it into all-or-nothing. A projected crowd-arc sparkline previews the pacing shape of the drafted plan before you lock it in. This is where the strategy game lives, and it plays like two workers with a clipboard behind a curtain, exactly as intended, just with sharper mechanics than the original sketch had.

*Status note (v0.06): the Pitch model is fully built and playable, and the gap the v0.04 note flagged is now CLOSED — spots are physically executed through the momentum grammar (§5.3, §5.10), corners are real space, and a spot resolves only when it is actually set up and worked. The protected finish is now a fully orchestrated six-beat sequence on the fixed tail: the first Front Burner, a booked kick-out at two, The Boulder's own finisher and a believable near-fall for the champion, a second Front Burner, and the three-count — with the champion's kick-out of the REAL finish available as a priced betrayal that arms a steal. Verified end-to-end in a headless harness (clean title change, all recipes firing). Still authored-thin and awaiting Jordan's feel pass.*

**3. The match.** The 0.02 engine evolved: crowd model v1 (arc, allegiance, decay, one hijack chant event), the Work button in all its contexts, the call sheet advancing spot by spot, the audible call system in a minimal form (two or three proposals), the referee with count timing, the superplex input chain, and the scripted finish sequence with its kick-out beats. Every betrayal option live: the Boulder can stay down early and gift a flat win, kick out of the second Front Burner and steal the match, or stooge for the office; Stove Hot can stiff, no-sell, or go home early. All priced by trust, heat, and story.

**4. The aftermath.** The Observer rating card, the key stats, and a written epilogue in kayfabe-news voice that acknowledges what actually happened: the clean title change, the screwjob, the botchfest, the injury, or the breakdown. Then "run it back."

**Explicitly out of demo scope:** more than two wrestlers, ladders and tables, career or season structure, AI-generated text, online play, entrances beyond the hype package, commentary audio, a promo minigame. All noted, all later.

---

## 9. Art direction: the Audacity Era

The black-and-white ink style is retired. The new direction is a period parody: PCW looks like a wrestling television product from the crash-TV era, 1997 to 2000, made by a promotion with more attitude than budget.

**The feel.** Black arenas cut by harsh white spotlights and smoke. Steel, chain-link, scaffolding, sticker-bombed staging. A hostile sea of crowd signs. Aggressive ultra-condensed block typography, always slightly distressed, always shouting. VHS-era broadcast texture: subtle scanlines, chroma fuzz, a LIVE bug, lower-third graphics that slam in. The palette is black, steel, and blood red for the promotion, with each persona owning a brand colour: burner-coil orange for Stove Hot, corporate navy and gold for The Boulder.

**The signature moment.** Replacing the ink splatter: **flashbulbs.** On big pops, camera flashes ripple through the darkened crowd, dozens of white pinpricks firing in waves, scaled to the size of the pop. It is period-perfect, it makes crowd approval visible without any meter, and it turns the audience itself into the game's particle system. Near-falls at high heat should strobe the whole arena.

**Presentation frame.** The match renders as a television broadcast: subtle letterboxing, the PCW watermark, lower-thirds for the performers, a title-match graphic. The planning screen is the inverse: fluorescent-lit backstage realism, a clipboard, a curtain, no glamour. The contrast between the show and the work is the two-audience model expressed visually.

**The page chrome — an early-2000s WWF.com throwback (built v0.12).** The whole HTML shell that frames the canvas is a loving parody of the 2000–2001 WWF.com website (Jordan's reference, his design call): a scratchy **PCW.com** logo, a blood-red horizontal nav bar (NEWS · THE MATCH · THE CARD · MATCH LOG · HOW TO PLAY · SHOP-ZONE), a cheesy yellow banner-ad strip, content boxes with red-gradient headers for the call sheet and match log, and a grey "PCW CORPORATE" footer with the period copyright. Palette: black, blood red, chrome silver, bone white, a little gold. Typography moved off the cliché of Impact: **Anton** (heavy condensed display) for the logo/headers and **Oswald** (condensed) for nav, labels, and the in-canvas HUD — both embedded as offline base64 so the page stays self-contained and needs no network. Process note: Jordan directs the taste/references; the look is rebuilt in code (HTML/CSS/canvas), no hand-made assets.

**Parody discipline.** Evoke the era, never the trademarks. Invented logos, invented event names, invented iconography adjacent to the references. The joke is the register, not the assets.

---

## 10. Asset plan and the Gemini pipeline

**On open-source assets, honestly:** wrestling-specific open art barely exists. OpenGameArt has a small CC0 retro wrestling pack in an 8-bit Master System style, which is the wrong look entirely; itch.io hosts wrestling-sim packs (portraits, championship belts, promotion and PPV logos) that could fill incidental UI gaps if their licences check out; and the sprite-rip databases carry actual WWF game sprites that are copyrighted material and not usable. Conclusion: we generate our own. The visual identity is the moat anyway, and you are a designer with image tools; borrowed art would dilute the one thing nobody can copy.

**Pipeline principles.** Consistency beats beauty. Every generation uses the same style block, and every character generation works from that character's approved reference sheet rather than from a fresh text prompt. Lock a lighting direction (key light upper front, arena spot from above) so every asset composites into the same scene. Generate large (1024 px or more per pose), on a flat solid background (a green or magenta the costume never uses) for clean cutout, and export transparent PNGs at twice the in-game display size. You do the cutouts and cleanup; that pass is also where your design hand unifies whatever the generator wobbles on.

**Reusable style block (paste into every prompt, tune once):**

> Late-1990s professional wrestling television style, gritty attitude-era parody. Painted realistic style with bold silhouettes, slightly exaggerated proportions, strong rim lighting from arena spotlights, dark smoky background, high contrast. Consistent character design, full body visible, [SOLID GREEN] background, no text, no logos.

**Order of operations:**

1. **Character sheets first.** For each wrestler: a turnaround (front, three-quarter, side, back) in a neutral stance, plus a face close-up. Iterate until you approve the design. This sheet is now canon; every pose generation references it with "same character as reference image."
2. **Pose inventory per wrestler** (the state machine's shopping list, roughly 16 each): idle, walk (2 frames), run, strike wind-up, strike contact, grapple reach, slam delivery, arm drag, sell stagger, hit reaction, down on mat, get-up, pin cover, being pinned, kick-out burst, finisher delivery, finisher receipt, celebration. Generate each as a single pose on the flat background. Where the generator struggles with a pose, describe the wrestling move in plain physical terms (bodies, limbs, weight) rather than by move name.
3. **The scene:** the ring in a consistent three-quarter view (mat, ropes, posts, apron with the PCW logo), the arena backdrop in two or three layers for depth (far crowd darkness, mid crowd with signs, ringside), entrance stage, titantron frame.
4. **The cast around the match:** the referee (six poses: neutral, counting 1-2-3 slaps, knocked down, remonstrating), a handful of crowd sign textures.
5. **Story and UI stills:** four to six hype-package images (the feud beats: the champion with the office, Stove Hot's defiance, the confrontation, the contract), the championship belt (hero shot and small overlay version), the Gorilla-position backstage scene, logos (PCW, the PPV, each wrestler's brand mark; these you likely design directly rather than generate).

**Technical spec for the engine:** individual PNG files, not packed sheets (simpler to iterate); naming convention `stovehot_sell.png`; consistent anchor at the feet centreline; standing poses around 480 px tall in source for a 240 px display target. The engine keeps the flashbulb system, screen shake, hit-stop, scanline post-processing, and crowd reactivity as code; the PNGs only need to be strong stills, because the game's motion language is pose-switching plus impact effects, which suits generated art far better than trying to produce smooth animation frames.

---

## 11. Production plan

The project moves to Claude Code on your Mac and becomes a real repository. Suggested shape:

```
pcw/
  index.html
  src/          (engine modules: input, states, crowd, script, render, audio)
  assets/       (sprites/, ui/, stills/)
  data/         (spots.json, matchplan.json, personas.json)
  docs/         (this bible, playtest notes)
```

This document lives in the repo, and a condensed version of its rules goes in the project's CLAUDE.md so every coding session starts already knowing what PCW is and, just as important, what it is not.

Working rhythm for a non-coder director: one system per session, playtest immediately, keep a running playtest-notes file (what felt wrong, what broke, what surprised you), and bring that file to the next session as the brief. You never need to touch the code; your job is exactly the job you already know, which is design direction and taste. Build order for the demo: v0.03 crowd model and character rename/realignment on placeholder art, v0.04 planning screen, v0.05 finish sequence and superplex chain, v0.06 asset integration as your Gemini sprites land, v0.07 hype package and aftermath, then tuning until the match feels like a match.

Art production runs in parallel from day one: the character sheets are the long pole, so they start first.

**What the headless harness can and cannot prove.** Sessions verify logic in a headless harness (stubbed canvas, scripted inputs) because the canvas can't be opened from the coding environment. That harness proves the *systems resolve correctly when the inputs arrive* — spots complete, the finish reaches its ending, no runtime errors, capture geometry hits its target rate. It **cannot** prove that a human can read the prompts, parse the screen, or land the inputs in time — readability, legibility, feel, and timing tightness are exactly what it can't see. Those remain Jordan's to judge at the keyboard. Every session flags what was verified in the harness versus what needs the feel pass.

---

## 12. Anti-goals

Written down so future sessions can be held to them.

- **It never becomes a fighting game.** No victory by damage. If a playtest ever feels like a fight to win, a system is miscalibrated.
- **The crowd never reads the script.** Every crowd reaction must be justifiable by what a person in row twelve could see.
- **AI is seasoning, not structure.** The demo must be fully playable offline with authored content.
- **Betrayal is priced, never prevented.** The temptation must stay in the player's hands; removing it removes the game.
- **One match until it sings.** No roster, no modes, no career until the demo match is something you would show a stranger.
- **Parody, not plagiarism.** The era is the reference; the assets are ours.
