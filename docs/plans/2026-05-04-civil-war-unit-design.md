# Civil War Unit — Design

**Date:** 2026-05-04
**Unit ID:** `civil-war`
**Status:** Design approved — ready for Session 1 (engineering scaffold)
**Template followed:** westward-expansion (NOT early-republic)

## Overview

A third unit covering the buildup to the Civil War and the war itself. Unlike past years' separate Sectionalism/Reform and Civil War units, this version weaves the underlying conditions, the chain of trigger events, and the war itself into one unit.

All three categories are taught primarily through direct instruction + study-tools (vocab, flashcards, games, mastery gating, practice quiz). For category 3, two additional elements layer in: students take notes on the major battles and watch *Glory* during the unit. The [Civil War Battle Simulation](https://github.com/shiebenaderet/civil-war-battle-simulation) appears at the end as a **capstone synthesis activity** — students apply what they've learned by taking command, encountering primary sources, and writing reflections inside an interactive narrative.

The pedagogical framing for the simulation is *capstone, not content delivery*: students learn the war first, then play. This means:
- The simulation can fail gracefully (Chromebook issues, Firebase outage, etc.) without breaking core instruction.
- Students who paid attention earlier recognize deeper context when they hit familiar moments in the simulation.
- The simulation rewards attention paid earlier rather than carrying first-encounter teaching weight.

## Three Categories

Categories drive the mastery-gating unlock order. Students complete category 1's flashcards before category 2's games unlock, etc.

### 1. Sectionalism — the underlying conditions
The structural divides between regions that built up over decades. Slavery's economic role, the moral case against it, regional cultures, free vs. slave states.

**Pacing:** ~1 week of class time
**Suggested must-know terms (~8):**
- Sectionalism
- Slavery (as economic system, not just abstract)
- Abolitionism
- Plantation economy
- Frederick Douglass
- Underground Railroad
- Nat Turner's Rebellion
- Free state / Slave state (paired)

**Encounter-tier (~4):** Harriet Tubman, William Lloyd Garrison, Mason-Dixon Line, Cotton gin

**Decision (2026-05-04):** Reform movement content (Stanton, Sojourner Truth, transcendentalism) is **dropped from this unit entirely**. Decision rationale: Reform is rich enough that shoehorning it into Sectionalism muddies the focus, and the unit's already covering five weeks of dense content. Past materials in `_source-materials/` (files 06–08, the Stanton/Truth/transcendentalism sources) stay archived but unused for this unit. Revisit if a future "19th century reform" unit gets built.

### 2. Road to War — the chain of trigger events 1820–1861
The 11 events from your existing timeline activity, in order. The chronology is the lesson.

**Pacing:** ~2 weeks
**Must-know terms (~10):**
- Missouri Compromise (1820)
- Wilmot Proviso (1846)
- Compromise of 1850
- Fugitive Slave Law (the harsher 1850 version, embedded in Compromise of 1850 but worth a separate vocab card given how it angered the North)
- Uncle Tom's Cabin (1852)
- Bleeding Kansas (1854–59)
- Dred Scott decision (1857)
- Lincoln-Douglas Debates (1858)
- John Brown's Raid / Harpers Ferry (1859)
- Secession

**Encounter-tier (~3):** Kansas-Nebraska Act, popular sovereignty, Stephen Douglas

Note: Nat Turner's Rebellion (1831) appears in the Road to War timeline activity but lives as a Sectionalism vocab term. The activity references it; the gating doesn't double-count.

### 3. The War Itself
Real teaching content for the war: turning points, leadership, key battles, Emancipation, end of slavery, Lincoln's death. Direct instruction with student battle notes, *Glory* viewing, then the simulation as capstone.

**Pacing:** ~1.5 weeks total
- Direct instruction with battle notes: ~1 week
- *Glory* film: ~2 class periods (mid-unit, anchored to the 54th Massachusetts)
- Simulation as capstone: 2 class periods at the end
- In-class flow: notes → *Glory* → simulation → review/quiz

**Must-know terms (15):**

*Battles (5):* Fort Sumter, Antietam, Vicksburg, Gettysburg, Appomattox
*People (5):* Abraham Lincoln, Jefferson Davis, Robert E. Lee, Ulysses S. Grant, William T. Sherman
*Concepts (5):* Emancipation Proclamation, Gettysburg Address, Total War, 54th Massachusetts, 13th Amendment

**Encounter-tier (~8):** The other 8 battles by name (Bull Run, Shiloh, Fredericksburg, Chancellorsville, Chickamauga, Wilderness, Atlanta, Sherman's March), plus Stonewall Jackson, Clara Barton, Frederick Douglass (cross-ref to category 1), Minié ball, USCT, Copperheads, Anaconda Plan, Reconstruction

**Bonus tier (post-mastery enrichment):** TBD — possibly pulled from simulation's perspective sidebars (e.g. Susie King Taylor, James Henry Gooding, Mary Chesnut as primary-source figures students can deep-dive on)

**Note on the 54th Massachusetts:** This term gets triple coverage — your direct instruction, *Glory*, and the simulation's perspective sidebar. That's intentional reinforcement. The vocab card in study-tools can be relatively brief because students will arrive at the practice quiz already saturated with the 54th from other sources.

## Activity layout

The unit's home screen will look like westward-expansion but with one new card type — the simulation launcher.

**Standard activities** (use existing study-tools engine):
- Textbook (3 chapters, one per category)
- Flashcards
- Typing Practice
- Games: Hangman, Wordle, Crossword, Term-catcher, etc. (standard set)
- Practice Test
- Map Quiz: 1861 States & Territories (already built — links into this unit's `activities` array)

**New activity card: Battle Simulation launcher** ("medium" wiring, per discussion 2026-05-04)
- Card title: "Battle Simulation"
- Description: Capstone framing — something like *"Now that you've learned the war, take command. Make the decisions Lincoln, Davis, Grant, and Lee faced. Read primary sources from soldiers, nurses, and civilians who lived it. Write your reflections."*
- Subtitle warning: *"You'll spend 2 class periods on this. Bring your full attention."*
- Action: opens https://shiebenaderet.github.io/civil-war-battle-simulation in a new tab
- Visually appears as part of the unit so students see it as core, not optional
- No progress tracking integration in v1 — students export PDF from the simulation as their submission artifact

**Gating recommendation:** Lock the simulation launcher until category 3's vocab is mastered. The simulation is a synthesis activity; students who haven't yet learned the war will get less out of it and risk checking out (the very failure mode we're designing around). Teachers should still have direct access for setup and demos.

## Theme & Visual Design

**Decision (2026-05-04): Option B — Reconciliation palette.**

- `--primary`: Deep navy (period-appropriate; works equally for Union/Confederate framing)
- `--secondary`: Warm parchment (evokes archival documents, primary sources)
- `--accent`: Oxblood red (used sparingly for emphasis, not gore)

Rationale: avoids the "picks a side" feel of pure Union blue + Confederate gray, avoids the dour feel of slate/sepia. Period-appropriate without being heavy. Specific hex values to be tuned during Session 1 against light/dark theme requirements.

The CSS custom properties `--primary`, `--secondary`, `--accent` get set in unit config and propagate everywhere via existing theming infrastructure.

## Pedagogical Flow

> *Build the conditions* (Sectionalism: direct instruction + study-tools flashcards/games) → *learn the triggers* (Road to War: timeline activity + study-tools flashcards/games) → *learn the war* (direct instruction with battle notes → *Glory* film → study-tools flashcards/games for category 3 vocab) → *synthesize* (battle simulation as capstone, 2 class periods) → *review and assess* (study-tools practice test + summative quiz)

Mastery gating enforces this ordering: games for category N stay locked until category N's flashcards reach mastery threshold, and the battle simulation launcher unlocks only after category 3 vocab is mastered.

### Approximate week-by-week pacing

| Week | Focus | In class | Study-tools support |
|---|---|---|---|
| 1 | Sectionalism | Direct instruction, free/slave map work, abolitionism | Flashcards, games for cat. 1 |
| 2 | Road to War (early) | Timeline activity, Missouri Compromise → Bleeding Kansas | Flashcards for cat. 2, timeline-sort |
| 3 | Road to War (late) | Dred Scott → Lincoln's election → Fort Sumter | Games for cat. 2, practice quiz |
| 4 | The War — direct instruction | Battle notes, key turning points, Emancipation | Flashcards for cat. 3 begins |
| 4–5 | *Glory* | Film over 2 class periods | (no study-tools work during viewing) |
| 5 | Synthesis | Battle simulation, 2 class periods | Simulation launcher unlocks |
| 5 | Assessment | Review + summative quiz | Practice test, all categories |

Total: ~5 weeks. Adjustable based on your calendar.

## What we're NOT doing in v1

- Reform movement content (Stanton, Truth, transcendentalism) — recommend cutting; revisit if a future "19th century reform" unit gets built
- Tight integration between study-tools and the simulation (e.g., score sharing, completion tracking) — overkill for v1; can add later if useful
- Battle-by-battle vocab in study-tools — the simulation owns experiential battle content
- Habeas corpus suspension content — too dense for 8th grade scope

## Pre-launch tasks

### Simulation review (separate from this unit's build)
See companion list: 13-battle content review covering primary source attribution, casualty figures, WWYD feedback alignment, perspective sidebars, leader messages framing. Also code-level: add `historicalIndex` field to WWYD data structure to make future content edits auditable. Worth its own session.

### Unit content authoring
1. Vocab definitions for all ~32 must-know + encounter terms
2. Three textbook chapters (~250 words each at 8th grade level — per category)
3. Practice test questions (~20 questions, tagged by category topic)
4. Fill-in-blanks where appropriate
5. Audio recording for textbook chapters (TTS pipeline used by westward-expansion)

### Engineering scaffold (do BEFORE content authoring)
1. Apply reconciliation palette (Option B) — tune exact hex values against light/dark themes
2. Create `study-tools/units/civil-war/config.json` with category structure, theme, empty arrays
3. Register unit in `study-tools/units/units.json`
4. Build new "external activity card" type in the engine. Approved 2026-05-04 — this is the only piece of new code the unit needs. Scope:
   - Add a card type that takes a `url` and `description` instead of an internal activity ID
   - Opens the URL in a new tab on click
   - Respects mastery-gating (so the simulation launcher can be locked behind category 3 vocab mastery)
   - Card rendering reuses existing styles where possible to keep visual consistency
5. Wire 1861 map quiz into the new unit's `activities` array (already exists, just needs activation here)

## Recommended session split

Per the auto-memory note from 2026-05-01: *splitting engineering setup from content authoring into separate sessions prevents the two from blocking each other.*

- **Session 1 (engineering):** palette tuning → config skeleton → external activity card → unit registers and renders empty
- **Session 2+ (content):** vocab → textbook → practice questions, in that order
- **Session N (review):** simulation pre-launch review (separate scope) — see content/structure checklist captured 2026-05-04

## References

- Source materials (local only): `study-tools/units/civil-war/_source-materials/`
- Battle Simulation repo: https://github.com/shiebenaderet/civil-war-battle-simulation
- Existing 1861 map quiz: `study-tools/engine/js/data/map-1861-data.js`
- Vocab tier system: `docs/superpowers/plans/2026-04-09-vocab-tiers.md`
- Mastery gating: `docs/plans/2026-03-06-mastery-gating-design.md`
