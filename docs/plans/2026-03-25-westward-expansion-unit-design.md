# Westward Expansion Unit Design

**Date:** 2026-03-25
**Status:** Approved
**Essential Question:** "Can one person be both a hero and a villain?"

## Overview

Build a complete second unit for the study tools platform covering Unit 8: Westward Expansion & Reform. The unit mirrors the early-republic unit's structure and activities but with new content, a distinct color scheme, and password gating to prevent student access until launch.

All content should draw from the provided source materials: `unit8_vocab_master.json`, `westward-expansion-review.tsv`, classroom handouts (HTML/DOCX/PDF in `Handouts/`), History Alive chapters 14 and 15, and americanyawpms.com. Avoid `--` dashes throughout all content.

## Unit Identity

- **Unit ID:** `westward-expansion`
- **Title:** "Westward Expansion & Reform Study Tool"
- **Subtitle:** "Get ready to ace your test! Learn vocabulary, practice questions, and track your progress."
- **Essential Question:** "Can one person be both a hero and a villain?"

### Theme: Sunset Trail

- **Primary:** `#B5651D` (warm orange-brown)
- **Secondary:** `#D4883A` (lighter amber)
- **Accent:** `#C0392B` (red)

## Categories (Mastery Unlock Sequence)

4 categories, unlocked sequentially via flashcard mastery:

| Order | Category | Source Segments | Term Count |
|-------|----------|----------------|------------|
| 1 | Jackson's America | Seg 1: Jacksonian Democracy + Indian Removal | 15 |
| 2 | Westward Trails | Seg 2: Manifest Destiny + Trails West | 14 |
| 3 | War & Compromise | Seg 3: Mexican-American War + Slavery & Compromise | 12 |
| 4 | Two Americas | Seg 4: North vs South + Reform Movements | 15 |

**Total: 56 vocabulary terms**

## Activities (18)

All activities from early-republic except SIFT Practice:

**Core Study:** flashcards, textbook, resources, typing-practice

**Practice/Assessment:** practice-test, short-answer, fill-in-blank, source-analysis, timeline

**Games:** wordle, hangman, flip-match, term-catcher, lightning-round, crossword, quiz-race, tower-defense, map-quiz

## Config Data (config.json)

### Vocabulary (56 terms)

Sourced from `unit8_vocab_master.json` (formal definitions) and `westward-expansion-review.tsv` (casual 8th-grade explanations). Each term includes:

- `term` and `definition` from the vocab JSON
- `simpleExplanation` from the TSV casual definitions
- `example` historical context sentence (to be generated)
- `category` one of the 4 categories
- `typingSnippet` short passage per term for typing practice (to be generated)
- `imageUrl` where a matching image exists
- `wikiUrl` (optional) Wikipedia link for the resources activity

### Practice Questions (28 + additional to be written)

From `westward-expansion-review.tsv`. 28 multiple-choice questions with 4 options each, plus additional questions to be written to ensure adequate coverage per category. Topics remapped to 4 categories plus "Connections" (gated behind full mastery).

Topic mapping:
- "Jacksonian Democracy" + "Indian Removal" maps to "Jackson's America"
- "Manifest Destiny" + "Trails West" maps to "Westward Trails"
- "Mexican-American War" + "Slavery & Compromise" maps to "War & Compromise"
- "North vs South" + "Reform Movements" maps to "Two Americas"
- "Connections" remains "Connections" (unlocked when all categories mastered)

### Short Answer Questions (5)

One per category plus one Connections question. Based on handout essential questions:
- Jackson's America: "Was Jackson strengthening or abusing presidential power?"
- Westward Trails: "What perspectives are missing from the Manifest Destiny narrative?"
- War & Compromise: "Was the Mexican-American War justified?"
- Two Americas: "How did technology deepen the divide between North and South?"
- Connections: "Can one person be both a hero and a villain? Use specific examples."

Each includes `question`, `topic`, `keyTerms`, `rubric`, `exemplar`, `sentenceStarters`.

### Fill-in-Blank Sentences (16)

Approximately 4 per category, sourced from key definitions and concepts.

### Typing Passages (4)

One per category, approximately 200 to 300 words at 8th grade reading level. Content tied to the vocabulary terms for that category so students reinforce term knowledge while practicing typing. Each passage should weave in as many category terms as natural, using them in context rather than just listing definitions.

### Timeline Events (16)

From `keyEvents` array in `unit8_vocab_master.json`. Note: source data uses `event` and `significance` fields; these must be remapped to `title` and `description` for the engine.

1. Cotton Gin Invention (1793)
2. Erie Canal Completion (1825)
3. Nullification Crisis (1828-1833)
4. Indian Removal Act (1830)
5. Worcester v. Georgia (1832)
6. Texas War for Independence (1835-1836)
7. Battle of the Alamo (1836)
8. Trail of Tears (1838-1839)
9. Mexican-American War (1846-1848)
10. Oregon Treaty (1846)
11. Treaty of Guadalupe Hidalgo (1848)
12. Seneca Falls Convention (1848)
13. Compromise of 1850 (1850)
14. Publication of Uncle Tom's Cabin (1852)
15. Industrial Revolution in North (1750s-1840s)
16. Formation of Two Americas (1830s-1850s)

Each includes `id` (numeric), `year`, `title`, `description`.

**Timeline enhancements:** The current timeline activity uses year-only sorting. For this unit, several events overlap in time (e.g., Trail of Tears 1838-1839 overlaps with Texas independence 1835-1836; Seneca Falls and Treaty of Guadalupe Hidalgo both in 1848). To make the activity more engaging and challenging:

- Add `month` field where historically specific (e.g., "February 1836" for the Alamo, "July 1848" for Seneca Falls, "February 1848" for Treaty of Guadalupe Hidalgo) to enable finer-grained ordering
- Support date ranges with `startYear` and `endYear` for multi-year events (Nullification Crisis, Mexican-American War, Industrial Revolution, etc.)
- Update the timeline engine to handle overlapping events and month-level precision in the drag-to-order challenge
- This is engine-level work in `timeline.js` and should be included in Stage 2 or as a sub-task of Stage 6 (Polish)

### Historical Flavor

**Quotes (15-20):** Sourced from handout primary sources (Travis's letter, Cherokee Memorial, Declaration of Sentiments, Jackson speeches) and historical figures. Every quote must include:
- `text` the quote
- `author` who said/wrote it
- `source` the specific document, speech, or letter
- `sourceUrl` link to a digital archive or reputable source
- `portrait` path to portrait image

All quotes must be verified against multiple sources before inclusion.

**Fun Facts (15-20):** Unit-specific historical facts. The engine currently expects fun facts as plain strings. To support sourcing, update the engine's fun-fact rendering in `app.js` to handle an object format, then each fun fact includes:
- `text` the fact
- `source` where the fact comes from
- `sourceUrl` link to a reputable source

The engine update (to read `fact.text` instead of `fact` directly) is a small change in `app.js` and should be done in Stage 2.

All quotes and fun facts are nested under `config.historicalFlavor` (i.e., `config.historicalFlavor.quotes` and `config.historicalFlavor.funFacts`).

## Textbook (textbook.json)

Separate file: `study-tools/units/westward-expansion/textbook.json`

### 4 Chapters (one per category), broken into sections

Each chapter is a segment containing multiple sections, mirroring the early-republic textbook structure. Each section includes:
- `id`, `heading`
- `vocabTerms` array (terms bolded inline in the text)
- `content` object with `simplified`, `standard`, and `advanced` reading levels
- `keyIdea` summary sentence
- `checkIn` with `type` ("stop-and-think"), `prompt`, and `hint`
- `sourceNote` citing source material
- `image` (optional) with `src`, `caption`, `float`

**Chapter 1: Jackson's America** (5-6 sections)
- The Rise of the Common Man (Jacksonian Democracy, spoils system, mudslinging)
- King Andrew and the Bank War (Bank of the U.S., kitchen cabinet, political cartoons)
- The Nullification Crisis (tariff, nullification, secede, Force Bill)
- Indian Removal (Indian Removal Act, Five Civilized Tribes, Worcester v. Georgia)
- The Trail of Tears (Sequoyah, Cherokee resistance, forced march)

**Chapter 2: Westward Trails** (5-6 sections)
- Manifest Destiny and the Dream of Expansion (manifest destiny, annex, territory, diplomacy)
- Texas Breaks Free (Stephen F. Austin, Tejanos, Texas War for Independence)
- Remember the Alamo (the Alamo, Sam Houston, Santa Anna, Davy Crockett)
- The Oregon Trail (Oregon Trail, South Pass, pioneer life)
- Polk and the Push to the Pacific (James K. Polk, "54-40 or fight!", Oregon Treaty)

**Chapter 3: War & Compromise** (5-6 sections)
- The Road to War (Rio Grande, Nueces River, disputed territory)
- The Mexican-American War (Mexican-American War, Bear Flag Republic)
- The Treaty and Its Consequences (Treaty of Guadalupe Hidalgo, Mexican Cession, Gadsden Purchase)
- The Slavery Question Explodes (Wilmot Proviso, free state / slave state)
- The Compromise of 1850 (Compromise of 1850, Fugitive Slave Act, Uncle Tom's Cabin)

**Chapter 4: Two Americas** (5-6 sections)
- The Industrial North (Industrial Revolution, interchangeable parts, Erie Canal, industrialist)
- King Cotton and the South (cotton gin, plantation, agrarian, Tredegar Iron Works)
- Push and Pull: Why People Moved (push factor / pull factor, deforestation)
- The Fight for Women's Rights (Seneca Falls Convention, Declaration of Sentiments, Elizabeth Cady Stanton, Sojourner Truth)
- Two Nations Under One Flag (North vs. South divergence, seeds of Civil War)

### 3 Reading Levels per Chapter

- **Simplified** (`simplified`) shorter sentences, core concepts only, approximately 3rd-5th grade reading level
- **On-level** (`standard`) standard 8th grade, the default
- **Advanced** (`advanced`) more nuance, primary source excerpts woven in, connections to broader themes

### Content Sources

- History Alive chapters 14 and 15 (structure and topical coverage)
- americanyawpms.com (additional context and perspectives)
- Classroom handouts (framing and analysis angles)

Each section includes vocabulary terms bolded inline, key idea summaries, stop-and-think check-ins, and image references where available.

## Source Analysis

Added as a westward-expansion branch inside `_getSourceData()` in `source-analysis.js`.

Each source object requires the following fields (matching the early-republic source data structure):
- `title`, `creator`, `year`
- `type` (primary/secondary source classification)
- `format` (media kind: cartoon, painting, map, letter, speech, etc.)
- `topic` (category name, for mastery gating)
- `image` (path to image file) or `excerpt` (for text-based sources)
- `context` (brief historical background paragraph)
- `questions` (array of 3-4 scaffolded analysis questions)

### Jackson's America (5-6 sources)

| Source | Image | Type |
|--------|-------|------|
| "King Andrew" political cartoon | `cartoon_king_andrew.jpg` | cartoon |
| "The House that Jack Built" | `cartoon_house_jack_built.webp` | cartoon |
| "Symptoms of a Locked Jaw" | `cartoon_locked_jaw.jpg` | cartoon |
| "The Great Father" | `cartoon_great_father.jpg` | cartoon |
| Spoils system cartoon | `cartoon_spoils_system.jpeg` | cartoon |
| Bank War cartoon | `cartoon_bank_war.jpg` | cartoon |

### Westward Trails (3-4 sources)

| Source | Image | Type |
|--------|-------|------|
| "American Progress" by John Gast | `painting_american_progress.jpg` | painting |
| Oregon Trail map | `map_oregon_trail.webp` | map |
| Travis's letter from the Alamo | text-based | document |

### War & Compromise (3-4 sources)

| Source | Image | Type |
|--------|-------|------|
| Mexican Cession before 1846 | `map_mexican_cession_before_1846.png` | map |
| Mexican Cession after 1848 | `map_mexican_cession_after_1848.jpeg` | map |
| Compromise of 1850 map | `map_compromise_of_1850.jpg` | map |
| Free/slave states 1854 | `map_free_slave_states_1854.jpg` | map |

### Two Americas (2-3 sources)

| Source | Image | Type |
|--------|-------|------|
| Declaration of Sentiments excerpt | text-based | document |
| Indian Removal cartoon | `cartoon_indian_removal.jpg` | cartoon |
| Tariff debate cartoon | `cartoon_tariff_debate.webp` | cartoon |

### Analysis Question Framework

Drawn from handout scaffolding (Jackson in Pictures, Political Cartoon Analysis, American Progress Painting Analysis):

Each source includes 3-4 questions following this progression:
1. **Observation:** "What do you see?" / "Describe what is shown."
2. **Interpretation:** "What symbols are used and what do they represent?"
3. **Point of view:** "What is the creator's perspective?"
4. **Evaluation:** "What is the overall message?" / "What perspective is missing?"

## Map Quiz

### 1. Interactive SVG Map: Territorial Expansion

Clickable SVG of the continental US showing territorial acquisitions:
- Original 13 states / territory at independence
- Louisiana Purchase (1803)
- Florida / Adams-Onis Treaty (1819)
- Texas Annexation (1845)
- Oregon Territory (1846)
- Mexican Cession (1848)
- Gadsden Purchase (1853)

Overlay modes for:
- Trail of Tears removal routes
- Oregon Trail / western trails
- Free state vs. slave state (1850)
- Rio Grande vs. Nueces River dispute

Region boundaries traced from existing map images for accuracy.

### 2. Image-Based Map Quizzes (per category)

| Category | Map Image | Quiz Content |
|----------|-----------|-------------|
| Jackson's America | `map_trail_of_tears_removal_routes.jpg` | Tribal homelands, removal routes, Indian Territory |
| Westward Trails | `map_oregon_trail.webp` | Key landmarks, South Pass, start/end points |
| War & Compromise | Mexican Cession before/after maps | Disputed territory, Rio Grande, Nueces River, ceded lands |
| Two Americas | `map_free_slave_states_1854.jpg` | Free states, slave states, territories |

### Quiz Formats

- "Click the region" name appears, student clicks correct area
- "Name the region" student clicks highlighted area and picks from multiple choice

**Note: Engine work required.** The current `map-quiz.js` has map regions hardcoded as inline SVG path data for a specific early-republic map. It does not read map data from `config.json`. Stage 5 requires either refactoring `map-quiz.js` to accept unit-specific map data, or adding a parallel westward-expansion map data set within the activity. This is engine-level work, not just content.

## Image Organization

### Directory Structure

```
study-tools/units/westward-expansion/images/
├── sources/        cartoons, maps, painting (moved from current flat structure)
├── portraits/      historical figure portraits (new, public domain)
├── vocab/          term illustration images (new, ~15-20 priority terms)
└── textbook/       textbook chapter illustrations (new, ~2 per chapter)
```

### Portraits Needed (~16)

Public domain historical portraits from Wikimedia Commons:
- Andrew Jackson, John C. Calhoun, Sequoyah, John Marshall
- James K. Polk, Sam Houston, Stephen F. Austin, Santa Anna, Davy Crockett
- Henry Clay, Harriet Beecher Stowe
- Elizabeth Cady Stanton, Sojourner Truth, Frederick Douglass
- Eli Whitney, William Travis

### Vocab Images (~15-20)

Priority terms that benefit from visuals: Trail of Tears, cotton gin, Erie Canal, the Alamo, Oregon Trail, plantation, Seneca Falls Convention, etc. Public domain sources.

### Textbook Images (~8)

Approximately 2 per chapter. Mix of existing maps/cartoons plus public domain illustrations.

## Password Gate

### Implementation

Two checkpoints, same password: `americanprogress`

**Unit selector page (`study-tools/index.html`):**
- Westward expansion card renders with a lock icon overlay
- Clicking "Start Studying" triggers a password prompt modal
- Correct password stores flag in `sessionStorage` and navigates to engine
- Wrong password shows "Incorrect password" message

**Engine page (via `app.js`):**
- On load, if `unit=westward-expansion` and no sessionStorage flag, show password prompt
- Catches direct URL navigation
- Correct password proceeds normally; wrong password redirects to unit selector

**Storage:** `sessionStorage` key `unit_access_westward-expansion`. Persists for browser tab session only.

**Removal:** Delete password check code and remove locked flag from `units.json`. Designed for clean removal with no leftover artifacts.

## Implementation Stages

### Stage 1: Password Gate + Unit Registration
- Add `westward-expansion` to `units.json` with `locked: true` flag, including: `id`, `title`, `subtitle`, `theme` (with `primary: "#B5651D"`), `activityCount: 18`
- Build password prompt modal component (HTML + CSS + JS) on unit selector page (`index.html`): locked card styling with lock icon overlay, modal with input field, sessionStorage write on success
- Add password check in `app.js` on unit load: if `unit=westward-expansion` and no `sessionStorage` flag `unit_access_westward-expansion`, show prompt; wrong password redirects to unit selector
- Update `index.html` to read the `locked` flag from `units.json` and gate locked units
- Create skeleton `config.json` with unit metadata, theme, and empty activity list
- Verify the unit loads behind the password gate

### Stage 2: Config.json Content
- Vocabulary (56 terms with all fields including wikiUrl)
- Practice questions (28 from TSV + additional to be written, remapped topics)
- Short answer questions (5)
- Fill-in-blank sentences (16)
- Typing passages (4)
- Timeline events (16, remapped from source field names)
- Historical flavor (quotes and fun facts, all sourced and verified)
- Update engine fun-fact rendering in `app.js` to support object format with `text`/`source`/`sourceUrl`
- Enable all 18 activities

### Stage 3: Textbook
- Write `textbook.json` with 4 chapters at 3 reading levels
- Source from History Alive Ch 14-15 and americanyawp.com
- Add textbook images

### Stage 4: Source Analysis
- Add westward-expansion source data to `_getSourceData()` in `source-analysis.js`
- Organize images into `sources/` subdirectory
- Write analysis questions per source using handout frameworks

### Stage 5: Map Quiz + Images
- Refactor `map-quiz.js` to support unit-specific map data (currently hardcoded for early-republic)
- Build SVG territorial expansion map with clickable regions
- Create image-based map quizzes per category with hotspot overlays
- Source and add portrait images from Wikimedia Commons
- Source and add vocab images for priority terms
- Organize all images into subdirectories

### Stage 6: Polish
- Test all 18 activities end-to-end
- Verify mastery gating works across all 4 categories
- Check responsive layout with new color scheme
- Verify dark mode and light mode with Sunset Trail theme
- Fix edge cases
- Bump version
