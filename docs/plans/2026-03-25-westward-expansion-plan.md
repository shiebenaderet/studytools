# Westward Expansion Unit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete second study unit (westward-expansion) with password gating, 56 vocab terms, 18 activities, a 3-level textbook, source analysis, and interactive map quizzes.

**Architecture:** Content-first approach. The engine is already built and reusable. 90% of the work is content creation (config.json, textbook.json, source data) with targeted engine modifications for password gating, fun-fact format, timeline enhancements, source analysis branching, and map quiz multi-unit support.

**Tech Stack:** Vanilla HTML/CSS/JS, no build tools. Config-driven unit system via JSON. localStorage for progress. GitHub Pages hosting.

**Spec:** `docs/plans/2026-03-25-westward-expansion-unit-design.md`

**Content style rules:**
- All content at 8th grade reading level (simplified level at 3rd-5th grade)
- Warm, encouraging tone
- No `--` dashes anywhere in content
- All quotes and fun facts must be sourced and verified with links
- Draw from provided source materials: `unit8_vocab_master.json`, `westward-expansion-review.tsv`, classroom handouts, History Alive Ch 14-15, americanyawpms.com

---

## Stage 1: Password Gate + Unit Registration

### Task 1.1: Register unit in units.json

**Files:**
- Modify: `study-tools/units/units.json`

- [ ] **Step 1: Add westward-expansion entry**

Add a second entry to the `units` array with a `locked` flag:

```json
{
    "units": [
        {
            "id": "early-republic",
            "title": "Early Republic Study Tool",
            "subtitle": "Get ready to ace your test! Learn vocabulary, practice questions, and track your progress.",
            "theme": { "primary": "#1669C5" },
            "activityCount": 13
        },
        {
            "id": "westward-expansion",
            "title": "Westward Expansion & Reform Study Tool",
            "subtitle": "Get ready to ace your test! Learn vocabulary, practice questions, and track your progress.",
            "theme": { "primary": "#B5651D" },
            "activityCount": 18,
            "locked": true
        }
    ]
}
```

- [ ] **Step 2: Verify JSON is valid**

Open the file in browser or run: `python3 -m json.tool study-tools/units/units.json`

- [ ] **Step 3: Commit**

```bash
git add study-tools/units/units.json
git commit -m "feat: register westward-expansion unit in units.json with locked flag"
```

### Task 1.2: Create skeleton config.json

**Files:**
- Create: `study-tools/units/westward-expansion/config.json`

- [ ] **Step 1: Create minimal config with unit metadata and theme**

```json
{
    "unit": {
        "id": "westward-expansion",
        "title": "Westward Expansion & Reform Study Tool",
        "subtitle": "Get ready to ace your test! Learn vocabulary, practice questions, and track your progress.",
        "essentialQuestion": "Can one person be both a hero and a villain?",
        "theme": {
            "primary": "#B5651D",
            "secondary": "#D4883A",
            "accent": "#C0392B"
        }
    },
    "activities": [
        "flashcards"
    ],
    "vocabulary": [],
    "timelineEvents": [],
    "practiceQuestions": [],
    "shortAnswerQuestions": [],
    "fillInBlankSentences": [],
    "typingPassages": [],
    "historicalFlavor": {
        "quotes": [],
        "funFacts": []
    }
}
```

- [ ] **Step 2: Verify config loads**

Open `study-tools/engine/?unit=westward-expansion` in browser (after password gate is built). The page should load with the Sunset Trail orange-brown theme applied.

- [ ] **Step 3: Commit**

```bash
git add study-tools/units/westward-expansion/config.json
git commit -m "feat: add skeleton config.json for westward-expansion unit"
```

### Task 1.3: Add password gate to unit selector page

**Files:**
- Modify: `study-tools/index.html` (around lines 240-286 where unit cards are rendered)

- [ ] **Step 1: Add locked card styling**

In the `<style>` section of `index.html`, add CSS for locked units: `.unit-card.locked` styling with lock overlay badge, plus `.password-modal-overlay` and `.password-modal` styles for the prompt dialog.

- [ ] **Step 2: Modify card rendering to check locked flag**

In the JavaScript section where unit cards are built (around line 240), after creating each card element, check the `unit.locked` flag. If locked and no `sessionStorage.getItem('unit_access_' + unit.id)`, add the `locked` class to the card, append a lock badge overlay element, and change the "Start Studying" button to "Enter Password" with a click handler that calls `showPasswordModal(unit)`.

If already unlocked via sessionStorage, render the card normally.

- [ ] **Step 3: Add password modal function**

Add `showPasswordModal(unit)` function using safe DOM methods (createElement, textContent, appendChild). The modal should:
- Create an overlay div covering the viewport
- Build modal content with heading, description, password input, error message div, cancel and submit buttons
- On submit: compare `input.value === 'americanprogress'`. If correct, set `sessionStorage.setItem('unit_access_' + unit.id, 'true')` and navigate. If wrong, show error, clear input.
- Support Enter key on the input field
- Cancel button and overlay click both remove the modal

**Important:** Use DOM creation methods (createElement, textContent, appendChild) instead of setting large blocks of content via string assignment, to avoid XSS patterns.

- [ ] **Step 4: Test the unit selector**

1. Open `study-tools/index.html` in browser
2. Verify westward-expansion card shows with lock badge and "Enter Password" button
3. Click "Enter Password", enter wrong password, verify error shows
4. Enter `americanprogress`, verify it navigates to `engine/?unit=westward-expansion`

- [ ] **Step 5: Commit**

```bash
git add study-tools/index.html
git commit -m "feat: add password gate modal to unit selector for locked units"
```

### Task 1.4: Add password gate to engine page

**Files:**
- Modify: `study-tools/engine/js/core/app.js` (around line 262, after config fetch)

- [ ] **Step 1: Add password check after config loads**

In `app.js`, find the `init()` method. After the config is loaded and parsed (after `this.config = await response.json();` around line 264), add a password gate check before theme application:

```javascript
// Password gate for locked units
if (this.config.unit && this.config.unit.id) {
    const unitId = this.config.unit.id;
    try {
        const unitsResp = await fetch('../units/units.json');
        const unitsData = await unitsResp.json();
        const unitMeta = unitsData.units.find(u => u.id === unitId);
        if (unitMeta && unitMeta.locked && !sessionStorage.getItem('unit_access_' + unitId)) {
            await this._showEnginePasswordGate(unitId);
        }
    } catch (e) {
        // If units.json fails to load, skip gate check
    }
}
```

- [ ] **Step 2: Add the password gate method**

Add `_showEnginePasswordGate(unitId)` method using safe DOM creation methods (createElement, textContent, appendChild). The method should:
- Return a Promise (so init() can await it)
- Clear the app container
- Build a centered password form with heading, description, input, error message, back link, and submit button
- On correct password (`americanprogress`): set sessionStorage flag and `window.location.reload()`
- On wrong password: show error, clear input
- Back link navigates to `../` (unit selector)

**Important:** Use DOM creation methods throughout. No string-based content injection.

**Security note:** The password is hardcoded as a string literal in client-side JavaScript. Any student who opens DevTools can find it. This is acceptable for the intended use case (temporary gating to prevent accidental access, not real security). The password gate will be removed entirely when the unit launches.

- [ ] **Step 3: Test direct URL navigation**

1. Clear sessionStorage
2. Navigate directly to `study-tools/engine/?unit=westward-expansion`
3. Verify password prompt appears
4. Enter `americanprogress`, verify unit loads with Sunset Trail theme
5. Refresh page, verify it loads without re-prompting (sessionStorage persists)

- [ ] **Step 4: Commit**

```bash
git add study-tools/engine/js/core/app.js
git commit -m "feat: add password gate to engine page for locked units"
```

### Task 1.5: Verify end-to-end password gate flow

- [ ] **Step 1: Full flow test**

1. Clear all sessionStorage
2. Open `study-tools/index.html`
3. Verify early-republic card works normally (no lock)
4. Verify westward-expansion card shows lock badge
5. Click "Enter Password" on westward-expansion
6. Enter wrong password, verify error
7. Enter `americanprogress`, verify navigation to engine
8. Verify Sunset Trail colors load (orange-brown header/theme)
9. Close tab, reopen, verify password is required again

- [ ] **Step 2: Commit stage 1 complete**

```bash
git add -A
git commit -m "feat: complete stage 1 - password gate and unit registration"
```

---

## Stage 2: Config.json Content

### Task 2.1: Build vocabulary array (56 terms)

**Files:**
- Modify: `study-tools/units/westward-expansion/config.json`

**Source files to reference:**
- `study-tools/units/westward-expansion/unit8_vocab_master.json` (formal definitions, segment assignments)
- `study-tools/units/westward-expansion/westward-expansion-review.tsv` (casual definitions in "VOCABULARY TERMS" section)
- `study-tools/units/early-republic/config.json` (vocabulary entry format reference)

- [ ] **Step 1: Build vocabulary entries**

For each of the 56 terms, create an entry with this structure (example):

```json
{
    "term": "Jacksonian Democracy",
    "definition": "A political movement of the 1820s-1830s that expanded democracy and political participation for common white men while excluding women, enslaved people, and Native Americans.",
    "simpleExplanation": "Andrew Jackson said 'I'm going to include the everyday guy in government!' But his idea of 'everyday guy' really only meant white men. It's like opening a club that says it welcomes everyone, but actually only lets in certain people.",
    "example": "During the Election of 1828, Jackson's supporters rallied around the idea that ordinary citizens, not just wealthy elites, should have a voice in government.",
    "category": "Jackson's America",
    "typingSnippet": "Jacksonian Democracy was a political movement that expanded voting rights for common white men in the 1820s and 1830s. Andrew Jackson championed the idea that ordinary citizens should participate in government. However, this new democracy excluded women, enslaved people, and Native Americans from political power.",
    "wikiUrl": "https://en.wikipedia.org/wiki/Jacksonian_democracy"
}
```

**Category mapping from segments:**
- Segment 1 terms get `"category": "Jackson's America"` (15 terms)
- Segment 2 terms get `"category": "Westward Trails"` (14 terms)
- Segment 3 terms get `"category": "War & Compromise"` (12 terms)
- Segment 4 terms get `"category": "Two Americas"` (15 terms)

**Rules:**
- `definition` from `unit8_vocab_master.json` vocabulary[].definition
- `simpleExplanation` from the TSV "VOCABULARY TERMS" section (the casual Definition column)
- `example` to be generated: one sentence using the term in historical context
- `typingSnippet` to be generated: 2-3 sentences weaving the term into a contextual passage
- `wikiUrl` add Wikipedia links for terms that have clear Wikipedia articles
- No `--` dashes in any field
- All at 8th grade reading level

- [ ] **Step 2: Validate vocabulary count per category**

Verify: Jackson's America = 15, Westward Trails = 14, War & Compromise = 12, Two Americas = 15, Total = 56

- [ ] **Step 3: Commit**

```bash
git add study-tools/units/westward-expansion/config.json
git commit -m "feat: add 56 vocabulary terms to westward-expansion config"
```

### Task 2.2: Build practice questions

**Files:**
- Modify: `study-tools/units/westward-expansion/config.json`

**Source:** `study-tools/units/westward-expansion/westward-expansion-review.tsv` (MULTIPLE CHOICE QUESTIONS section)

- [ ] **Step 1: Convert TSV questions to config format**

Convert the 28 questions from the TSV, plus write additional questions to reach at least 30 total. Each entry:

```json
{
    "question": "The primary goal of the spoils system under Andrew Jackson was to:",
    "options": [
        "Create a merit-based government where the most qualified people got jobs",
        "Reward loyal supporters with government positions regardless of experience",
        "Reduce the size of the federal government",
        "Strengthen the power of state governments over the federal government"
    ],
    "correct": 1,
    "explanation": "The spoils system rewarded Jackson's political supporters with government jobs, replacing experienced officials with loyal followers.",
    "topic": "Jackson's America"
}
```

**Topic mapping from TSV:**
- "Jacksonian Democracy" and "Indian Removal" map to `"Jackson's America"`
- "Manifest Destiny" and "Trails West" map to `"Westward Trails"`
- "Mexican-American War" and "Slavery & Compromise" map to `"War & Compromise"`
- "North vs South" and "Reform Movements" map to `"Two Americas"`
- "Connections" stays `"Connections"`

**Note:** TSV uses letters (A/B/C/D) for correct answers. Convert to 0-indexed integers (A=0, B=1, C=2, D=3).

- [ ] **Step 2: Add explanations for each question**

Each question needs an `explanation` field (1-2 sentences explaining why the correct answer is right). Reference the vocab definitions and handout content.

- [ ] **Step 3: Verify coverage**

Check that each topic has adequate coverage (at least 5 questions per category, 2-3 for Connections).

- [ ] **Step 4: Commit**

```bash
git add study-tools/units/westward-expansion/config.json
git commit -m "feat: add practice questions to westward-expansion config"
```

### Task 2.3: Build short answer questions

**Files:**
- Modify: `study-tools/units/westward-expansion/config.json`

**Reference:** `study-tools/units/early-republic/config.json` (shortAnswerQuestions format)

- [ ] **Step 1: Write 5 short answer questions**

One per category plus Connections. Format:

```json
{
    "question": "Was Andrew Jackson strengthening or abusing presidential power? Use at least two specific examples from the unit to support your answer.",
    "topic": "Jackson's America",
    "keyTerms": ["spoils system", "nullification", "Indian Removal Act", "Worcester v. Georgia", "Bank of the U.S.", "Force Bill"],
    "rubric": "Strong answers will take a clear position and support it with at least two specific examples. They should mention specific actions Jackson took and explain whether those actions helped or hurt democracy.",
    "exemplar": "Andrew Jackson both strengthened and abused presidential power. He strengthened democracy by expanding voting rights to common white men and fighting against the Bank of the U.S., which he saw as favoring the wealthy. However, he abused his power by ignoring the Supreme Court's ruling in Worcester v. Georgia and forcing Native Americans off their land through the Indian Removal Act. His use of the spoils system also weakened government by replacing experienced workers with loyal supporters.",
    "sentenceStarters": [
        "Andrew Jackson's presidency showed that...",
        "One example of Jackson using his power was...",
        "This action was (strengthening/abusing) power because..."
    ]
}
```

Questions:
1. Jackson's America: "Was Andrew Jackson strengthening or abusing presidential power?"
2. Westward Trails: "What perspectives are missing from the Manifest Destiny narrative?"
3. War & Compromise: "Was the Mexican-American War justified?"
4. Two Americas: "How did technology deepen the divide between North and South?"
5. Connections: "Can one person be both a hero and a villain? Use specific examples from this unit."

- [ ] **Step 2: Commit**

```bash
git add study-tools/units/westward-expansion/config.json
git commit -m "feat: add short answer questions to westward-expansion config"
```

### Task 2.4: Build fill-in-blank sentences

**Files:**
- Modify: `study-tools/units/westward-expansion/config.json`

- [ ] **Step 1: Write 16 fill-in-blank sentences (4 per category)**

Format:

```json
{
    "sentence": "The _____ was the practice of giving government jobs to loyal political supporters.",
    "answer": "spoils system",
    "category": "Jackson's America"
}
```

Draw from key vocabulary definitions. Ensure the blank is the term, and the surrounding sentence provides enough context for students to identify it.

- [ ] **Step 2: Commit**

```bash
git add study-tools/units/westward-expansion/config.json
git commit -m "feat: add fill-in-blank sentences to westward-expansion config"
```

### Task 2.5: Build typing passages

**Files:**
- Modify: `study-tools/units/westward-expansion/config.json`

- [ ] **Step 1: Write 4 typing passages (one per category)**

Format:

```json
{
    "category": "Jackson's America",
    "title": "The Age of Jackson",
    "source": "Adapted from History Alive Ch. 14 and American Yawp",
    "passage": "Andrew Jackson's presidency marked a dramatic shift in American democracy..."
}
```

Each passage should be 200-300 words at 8th grade reading level, weaving in as many category vocabulary terms as natural. Terms used in context, not just defined.

- [ ] **Step 2: Commit**

```bash
git add study-tools/units/westward-expansion/config.json
git commit -m "feat: add typing passages to westward-expansion config"
```

### Task 2.6: Build timeline events

**Files:**
- Modify: `study-tools/units/westward-expansion/config.json`

**Source:** `unit8_vocab_master.json` keyEvents array

- [ ] **Step 1: Convert 16 events to config format**

Remap fields: `event` to `title`, `significance` to `description`. Add sequential `id` and `year` with month precision where known.

```json
{
    "id": 1,
    "title": "Cotton Gin Invented",
    "year": "1793",
    "description": "Eli Whitney's cotton gin cleaned cotton 50 times faster than by hand, making cotton hugely profitable and increasing demand for enslaved labor in the South."
}
```

Add month precision where historically specific:
- Battle of the Alamo: "February 1836"
- Trail of Tears: "1838-1839"
- Treaty of Guadalupe Hidalgo: "February 1848"
- Seneca Falls Convention: "July 1848"

IDs must be sequential integers matching chronological order (used for sort validation).

- [ ] **Step 2: Commit**

```bash
git add study-tools/units/westward-expansion/config.json
git commit -m "feat: add timeline events to westward-expansion config"
```

### Task 2.7: Build historical flavor (quotes and fun facts)

**Files:**
- Modify: `study-tools/units/westward-expansion/config.json`
- Modify: `study-tools/engine/js/core/app.js` (line ~927, fun-fact rendering)

- [ ] **Step 1: Update engine fun-fact rendering to support object format**

In `app.js`, find `renderFooterFact()` (around line 915). Change the line that appends the fact text (line ~927) from:

```javascript
factEl.appendChild(document.createTextNode(fact));
```

To:

```javascript
var factText = typeof fact === 'string' ? fact : fact.text;
factEl.appendChild(document.createTextNode(factText));
```

This preserves backward compatibility with early-republic's plain string format while supporting the new object format.

- [ ] **Step 2: Write 15-20 historical quotes**

Each quote must be verified against multiple sources. Format:

```json
{
    "text": "John Marshall has made his decision; now let him enforce it.",
    "author": "Andrew Jackson",
    "source": "Attributed response to Worcester v. Georgia, 1832",
    "sourceUrl": "https://www.mountvernon.org/library/digitalhistory/quotes/article/john-marshall-has-made-his-decision-now-let-him-enforce-it/",
    "portrait": "images/portraits/jackson.jpg"
}
```

Source quotes from:
- Travis's letter from the Alamo (Day 07 handout)
- Cherokee Memorial excerpt (Day 03 handout)
- Declaration of Sentiments (Day 10 handout)
- Jackson speeches and attributed quotes
- Polk, Clay, Stowe, Stanton, Truth, Douglass quotes

**Every quote must include a sourceUrl to a digital archive or reputable source.**

- [ ] **Step 3: Write 15-20 fun facts**

New object format:

```json
{
    "text": "Davy Crockett's famous motto 'Be always sure you are right, then go ahead' was used in his real autobiography, but many of his other legendary tales were completely made up by dime novelists.",
    "source": "Smithsonian National Museum of American History",
    "sourceUrl": "https://americanhistory.si.edu/collections"
}
```

**Every fun fact must include a source and sourceUrl.**

- [ ] **Step 4: Commit**

```bash
git add study-tools/units/westward-expansion/config.json study-tools/engine/js/core/app.js
git commit -m "feat: add historical flavor with sourced quotes and fun facts, update engine for object format"
```

### Task 2.8: Enable all 18 activities and validate config

**Files:**
- Modify: `study-tools/units/westward-expansion/config.json`

- [ ] **Step 1: Update activities array**

```json
"activities": [
    "flashcards",
    "textbook",
    "resources",
    "typing-practice",
    "practice-test",
    "short-answer",
    "timeline",
    "wordle",
    "hangman",
    "flip-match",
    "fill-in-blank",
    "term-catcher",
    "lightning-round",
    "crossword",
    "source-analysis",
    "quiz-race",
    "tower-defense",
    "map-quiz"
]
```

- [ ] **Step 2: Validate full config.json**

Run: `python3 -m json.tool study-tools/units/westward-expansion/config.json > /dev/null`

- [ ] **Step 3: Test activities in browser**

Open `study-tools/engine/?unit=westward-expansion` (with password). Test each activity loads:
- Flashcards shows vocabulary with correct categories
- Practice Test shows questions
- Timeline shows events
- Fill-in-Blank shows sentences
- Games (wordle, hangman, etc.) can access vocabulary
- Textbook will show empty (built in Stage 3)
- Source Analysis will show empty (built in Stage 4)
- Map Quiz will need engine work (Stage 5)

- [ ] **Step 4: Commit**

```bash
git add study-tools/units/westward-expansion/config.json
git commit -m "feat: enable all 18 activities for westward-expansion unit"
```

---

## Stage 3: Textbook

### Task 3.1: Write textbook Chapter 1 (Jackson's America)

**Files:**
- Create: `study-tools/units/westward-expansion/textbook.json`

**Reference format:** `study-tools/units/early-republic/textbook.json`

**Content sources:** History Alive Ch. 14, americanyawpms.com, Day 01-04 handouts

- [ ] **Step 1: Create textbook.json with reading level metadata and Chapter 1**

Start with the `textbookContent` wrapper, reading level definitions, and Segment 1 with 5 sections:

```json
{
    "textbookContent": {
        "readingLevels": {
            "simplified": {
                "label": "Easier",
                "gradeRange": "3rd-5th",
                "description": "Shorter sentences, simpler vocabulary"
            },
            "standard": {
                "label": "On Grade",
                "gradeRange": "8th Grade",
                "description": "Standard reading level"
            },
            "advanced": {
                "label": "Challenge",
                "gradeRange": "High School",
                "description": "More detail, complex analysis"
            }
        },
        "segments": [
            {
                "id": "segment-1",
                "number": 1,
                "title": "Jackson's America",
                "subtitle": "1828-1840",
                "icon": "fas fa-flag-usa",
                "sections": []
            }
        ]
    }
}
```

Each section follows this format:

```json
{
    "id": "s1-01-rise-common-man",
    "heading": "The Rise of the Common Man",
    "vocabTerms": ["Jacksonian Democracy", "spoils system", "mudslinging"],
    "content": {
        "simplified": "<p>...</p>",
        "standard": "<p>...</p>",
        "advanced": "<p>...</p>"
    },
    "keyIdea": "Jackson expanded democracy for white men but excluded women, enslaved people, and Native Americans.",
    "checkIn": {
        "type": "stop-and-think",
        "prompt": "Jackson said he was fighting for the 'common man.' But who was left out of his idea of democracy?",
        "hint": "Think about who could and couldn't vote..."
    },
    "sourceNote": "Adapted from History Alive Ch. 14 and American Yawp"
}
```

Chapter 1 sections:
1. The Rise of the Common Man (Jacksonian Democracy, spoils system, mudslinging)
2. King Andrew and the Bank War (Bank of the U.S., kitchen cabinet, civil servant)
3. The Nullification Crisis (tariff, nullification, secede, Force Bill)
4. Indian Removal (Indian Removal Act, Five Civilized Tribes, Worcester v. Georgia)
5. The Trail of Tears (Sequoyah, Trail of Tears, forced march)

- [ ] **Step 2: Validate JSON**

Run: `python3 -m json.tool study-tools/units/westward-expansion/textbook.json > /dev/null`

- [ ] **Step 3: Test in browser**

Open the textbook activity. Verify Chapter 1 loads, reading level toggle works, sections display correctly.

- [ ] **Step 4: Commit**

```bash
git add study-tools/units/westward-expansion/textbook.json
git commit -m "feat: add textbook Chapter 1 - Jackson's America (3 reading levels)"
```

### Task 3.2: Write textbook Chapter 2 (Westward Trails)

**Files:**
- Modify: `study-tools/units/westward-expansion/textbook.json`

**Content sources:** History Alive Ch. 15, americanyawpms.com, Day 05-07 handouts

- [ ] **Step 1: Add Segment 2 to the segments array**

5 sections:
1. Manifest Destiny and the Dream of Expansion (manifest destiny, annex, territory, diplomacy)
2. Texas Breaks Free (Stephen F. Austin, Tejanos, Texas War for Independence)
3. Remember the Alamo (the Alamo, Sam Houston, Santa Anna, Davy Crockett)
4. The Oregon Trail (Oregon Trail, South Pass, pioneer life)
5. Polk and the Push to the Pacific (James K. Polk, "54-40 or fight!")

Each with 3 reading levels, keyIdea, checkIn, sourceNote.

- [ ] **Step 2: Validate and test**

- [ ] **Step 3: Commit**

```bash
git add study-tools/units/westward-expansion/textbook.json
git commit -m "feat: add textbook Chapter 2 - Westward Trails (3 reading levels)"
```

### Task 3.3: Write textbook Chapter 3 (War & Compromise)

**Files:**
- Modify: `study-tools/units/westward-expansion/textbook.json`

**Content sources:** History Alive Ch. 15, americanyawpms.com, Day 08-09 handouts

- [ ] **Step 1: Add Segment 3**

5 sections:
1. The Road to War (Rio Grande, Nueces River, disputed territory)
2. The Mexican-American War (Mexican-American War, Bear Flag Republic)
3. The Treaty and Its Consequences (Treaty of Guadalupe Hidalgo, Mexican Cession, Gadsden Purchase)
4. The Slavery Question Explodes (Wilmot Proviso, free state / slave state)
5. The Compromise of 1850 (Compromise of 1850, Fugitive Slave Act, Uncle Tom's Cabin)

- [ ] **Step 2: Validate and test**

- [ ] **Step 3: Commit**

```bash
git add study-tools/units/westward-expansion/textbook.json
git commit -m "feat: add textbook Chapter 3 - War & Compromise (3 reading levels)"
```

### Task 3.4: Write textbook Chapter 4 (Two Americas)

**Files:**
- Modify: `study-tools/units/westward-expansion/textbook.json`

**Content sources:** americanyawpms.com, Day 10-11 handouts

- [ ] **Step 1: Add Segment 4**

5 sections:
1. The Industrial North (Industrial Revolution, interchangeable parts, Erie Canal, industrialist)
2. King Cotton and the South (cotton gin, plantation, agrarian, Tredegar Iron Works, Eli Whitney)
3. Push and Pull: Why People Moved (push factor / pull factor, deforestation)
4. The Fight for Women's Rights (Seneca Falls Convention, Declaration of Sentiments, Elizabeth Cady Stanton, Sojourner Truth)
5. Two Nations Under One Flag (North vs. South divergence, Frederick Douglass)

- [ ] **Step 2: Validate and test all 4 chapters**

- [ ] **Step 3: Commit**

```bash
git add study-tools/units/westward-expansion/textbook.json
git commit -m "feat: add textbook Chapter 4 - Two Americas (3 reading levels)"
```

---

## Stage 4: Source Analysis

### Task 4.1: Organize source images

**Files:**
- Move existing images from `study-tools/units/westward-expansion/images/` to subdirectories

- [ ] **Step 1: Create subdirectories and move files**

```bash
mkdir -p study-tools/units/westward-expansion/images/sources
mkdir -p study-tools/units/westward-expansion/images/portraits
mkdir -p study-tools/units/westward-expansion/images/vocab
mkdir -p study-tools/units/westward-expansion/images/textbook

# Move cartoons, maps, and painting to sources/
mv study-tools/units/westward-expansion/images/cartoon_* study-tools/units/westward-expansion/images/sources/
mv study-tools/units/westward-expansion/images/map_* study-tools/units/westward-expansion/images/sources/
mv study-tools/units/westward-expansion/images/painting_* study-tools/units/westward-expansion/images/sources/
```

- [ ] **Step 2: Commit**

```bash
git add study-tools/units/westward-expansion/images/
git commit -m "chore: organize westward-expansion images into subdirectories"
```

### Task 4.2: Add westward-expansion source data to source-analysis.js

**Files:**
- Modify: `study-tools/engine/js/activities/source-analysis.js` (inside `_getSourceData()` method starting at line ~21)

- [ ] **Step 1: Refactor _getSourceData() for multi-unit support**

The current `_getSourceData()` method (starting at line ~21) is a single `return [...]` statement containing the entire early-republic source array inline (hundreds of lines). This must be extracted into a separate method.

1. Create a new method `_getEarlyRepublicSources()` and move the entire existing array content into it
2. Replace `_getSourceData()` with unit branching:

```javascript
_getSourceData() {
    var unitId = this._config.unit.id;

    if (unitId === 'westward-expansion') {
        return this._getWestwardExpansionSources();
    }

    return this._getEarlyRepublicSources();
}

_getEarlyRepublicSources() {
    return [
        // Move the ENTIRE existing source array content here (all early-republic sources)
    ];
}
```

3. Verify early-republic source analysis still works after the refactor before proceeding

- [ ] **Step 2: Add _getWestwardExpansionSources() method**

Add a new method returning an array of ~15 source objects. Each source needs all required fields: `title`, `creator`, `year`, `type` (primary/secondary), `format` (cartoon/painting/map/letter/etc.), `topic` (category name), `image` or `excerpt`, `context`, and `questions` array.

Example source entry:

```javascript
{
    title: "King Andrew the First",
    creator: "Unknown artist",
    year: 1833,
    type: "primary",
    format: "cartoon",
    topic: "Jackson's America",
    image: "../units/westward-expansion/images/sources/cartoon_king_andrew.jpg",
    excerpt: "",
    context: "This political cartoon appeared in 1833 during debates over Jackson's use of presidential power. It depicts Jackson as a king, trampling on the Constitution.",
    questions: [
        {
            question: "What symbols in this cartoon suggest Jackson is acting like a king?",
            options: ["He wears a crown and royal robes while holding a veto", "He is sitting in the White House signing laws", "He is shaking hands with common citizens", "He is reading the Constitution carefully"],
            correct: 0
        },
        // 2-3 more questions following observation -> interpretation -> evaluation
    ]
}
```

Sources to include (from spec):
- **Jackson's America (6):** King Andrew, House that Jack Built, Locked Jaw, Great Father, Spoils System, Bank War cartoons
- **Westward Trails (3):** American Progress painting, Oregon Trail map, Travis's letter (text-based with excerpt field)
- **War & Compromise (4):** Mexican Cession before/after maps, Compromise of 1850 map, Free/slave states map
- **Two Americas (3):** Declaration of Sentiments excerpt (text-based), Indian Removal cartoon, Tariff debate cartoon

For text-based sources (Travis letter, Declaration of Sentiments), populate the `excerpt` field with the actual primary source text and leave `image` as empty string.

Analysis questions follow the handout scaffolding progression:
1. Observation: "What do you see?"
2. Interpretation: "What symbols are used?"
3. Point of view: "What is the creator's perspective?"
4. Evaluation: "What is the overall message?"

- [ ] **Step 3: Test source analysis activity**

Open `study-tools/engine/?unit=westward-expansion`, navigate to Source Analysis. Verify:
- Sources load with correct images
- Questions display and are answerable
- Text-based sources show excerpt text
- Sources are gated by category mastery

- [ ] **Step 4: Commit**

```bash
git add study-tools/engine/js/activities/source-analysis.js
git commit -m "feat: add westward-expansion source analysis data (16 sources, 4 categories)"
```

---

## Stage 5: Map Quiz + Images

### Task 5.1: Refactor map-quiz.js for multi-unit support

**Files:**
- Modify: `study-tools/engine/js/activities/map-quiz.js` (line ~26 where `_mapRegions` is defined)

- [ ] **Step 1: Add unit branching for map data**

**Key structural notes:**
- `_mapRegions` is currently a static property defined on the `registerActivity({})` object literal at line ~26. It is NOT assigned inside `render()`, so `config` is not available at that point.
- The `drawOrder` variable is a local `var` inside `_buildGameUI()` at line ~243, not a class property.
- The activity `description` at line ~5 is hardcoded to early-republic content ("Click the correct state or territory on the 1802 map").
- Line ~112 has hardcoded text: "Identify all 24 regions of the early United States before the Louisiana Purchase."

Refactoring steps:

1. Move `_mapRegions` from a static property to an assignment inside `render()` or `_startGame()` where `config` is available:

```javascript
// Inside render() or _startGame(), after config is available:
this._mapRegions = this._getMapRegions(config.unit.id);
```

2. Extract the existing static array content into `_getEarlyRepublicRegions()`:

```javascript
_getMapRegions(unitId) {
    if (unitId === 'westward-expansion') {
        return this._getWestwardExpansionRegions();
    }
    return this._getEarlyRepublicRegions();
}

_getEarlyRepublicRegions() {
    return [ /* move existing _mapRegions array content here */ ];
}

_getWestwardExpansionRegions() {
    return []; // placeholder, filled in Task 5.2
}
```

3. Update the local `drawOrder` var inside `_buildGameUI()` (line ~243) to use a branching helper method:

```javascript
var drawOrder = this._getDrawOrder(this._config.unit.id);
```

4. Update the hardcoded activity `description` (line ~5) and instructions text (line ~112) to be unit-aware:

```javascript
// In description or where instructions are rendered:
var desc = config.unit.id === 'westward-expansion'
    ? 'Identify the territories acquired during westward expansion'
    : 'Click the correct state or territory on the 1802 map of the United States';
```

- [ ] **Step 2: Verify early-republic map quiz still works**

Open `study-tools/engine/?unit=early-republic`, navigate to Map Quiz. Verify it works identically to before the refactor.

- [ ] **Step 3: Commit**

```bash
git add study-tools/engine/js/activities/map-quiz.js
git commit -m "refactor: add unit branching to map-quiz.js for multi-unit support"
```

### Task 5.2: Build westward-expansion SVG map data

**Files:**
- Modify: `study-tools/engine/js/activities/map-quiz.js`

**Reference images for tracing:** `study-tools/units/westward-expansion/images/sources/map_*.{jpg,png,webp}`

- [ ] **Step 1: Create territorial expansion map regions**

Populate `_getWestwardExpansionRegions()` with SVG path data for territorial acquisitions:

Each region format:
```javascript
{
    id: 'mexican-cession',
    name: 'Mexican Cession (1848)',
    color: '#D4883A',
    path: 'M...'  // SVG path data traced from reference maps
}
```

Regions to include:
- Original 13 states / territory at independence
- Louisiana Purchase (1803)
- Florida / Adams-Onis (1819)
- Texas Annexation (1845)
- Oregon Territory (1846)
- Mexican Cession (1848)
- Gadsden Purchase (1853)

Also add a `_getWestwardExpansionDrawOrder()` method for correct layering.

- [ ] **Step 2: Test map quiz**

Open westward-expansion Map Quiz. Verify all regions render, are clickable, and the quiz flow works.

- [ ] **Step 3: Commit**

```bash
git add study-tools/engine/js/activities/map-quiz.js
git commit -m "feat: add westward-expansion territorial expansion map quiz"
```

### Task 5.2b: Build image-based map quizzes and overlay modes

**Files:**
- Modify: `study-tools/engine/js/activities/map-quiz.js`

This task adds the per-category image-based map quizzes and the SVG overlay modes specified in the design spec. This is significant engine work beyond the base SVG territorial map.

- [ ] **Step 1: Add image-based quiz mode**

Extend the map quiz activity to support an image-based quiz mode where a reference map image is used as a background with clickable hotspot overlays (rectangles or polygons positioned over the image).

Data structure for image-based quizzes:

```javascript
{
    id: 'trail-of-tears',
    type: 'image-quiz',
    image: '../units/westward-expansion/images/sources/map_trail_of_tears_removal_routes.jpg',
    category: "Jackson's America",
    hotspots: [
        { id: 'cherokee-homeland', name: 'Cherokee Homeland', x: 65, y: 45, width: 12, height: 10 },
        { id: 'indian-territory', name: 'Indian Territory', x: 35, y: 40, width: 10, height: 12 },
        // ... more hotspots
    ]
}
```

The quiz cycles through hotspot names, and students click the correct region on the image.

- [ ] **Step 2: Build 4 image-based quizzes (one per category)**

| Category | Map Image | Hotspots |
|----------|-----------|----------|
| Jackson's America | `map_trail_of_tears_removal_routes.jpg` | Tribal homelands, removal routes, Indian Territory |
| Westward Trails | `map_oregon_trail.webp` | Key landmarks, South Pass, start/end points |
| War & Compromise | `map_mexican_cession_before_1846.png` / `map_mexican_cession_after_1848.jpeg` | Disputed territory, Rio Grande, Nueces River, ceded lands |
| Two Americas | `map_free_slave_states_1854.jpg` | Free states, slave states, territories |

- [ ] **Step 3: Add SVG overlay modes to the territorial expansion map**

Add toggle buttons for overlay layers on the main SVG map:
- Trail of Tears removal routes (polyline paths over the base map)
- Oregon Trail / western trails route
- Free state vs. slave state coloring (1850)
- Rio Grande vs. Nueces River dispute zone highlighting

Each overlay is a togglable SVG layer drawn on top of the base territorial regions.

- [ ] **Step 4: Add quiz mode selector**

When the user opens Map Quiz for westward-expansion, show a selection screen:
- "Territorial Expansion" (the main SVG quiz)
- "Trail of Tears Routes" (image-based, Jackson's America)
- "Oregon Trail" (image-based, Westward Trails)
- "Mexican Cession" (image-based, War & Compromise)
- "Free & Slave States" (image-based, Two Americas)

Image-based quizzes should respect mastery gating (only show quizzes for unlocked categories).

- [ ] **Step 5: Test all map quiz modes**

- [ ] **Step 6: Commit**

```bash
git add study-tools/engine/js/activities/map-quiz.js
git commit -m "feat: add image-based map quizzes and SVG overlay modes for westward-expansion"
```

### Task 5.3: Source and add portrait images

**Files:**
- Add images to: `study-tools/units/westward-expansion/images/portraits/`
- Modify: `study-tools/units/westward-expansion/config.json` (update quote portrait paths)

- [ ] **Step 1: Download public domain portraits from Wikimedia Commons**

16 portraits needed:
- `jackson.jpg`, `calhoun.jpg`, `sequoyah.jpg`, `marshall.jpg`
- `polk.jpg`, `houston.jpg`, `austin.jpg`, `santa_anna.jpg`, `crockett.jpg`
- `clay.jpg`, `stowe.jpg`
- `stanton.jpg`, `truth.jpg`, `douglass.jpg`
- `whitney.jpg`, `travis.jpg`

Use public domain historical portraits. Resize to consistent dimensions (~300x400px). Verify all are public domain.

- [ ] **Step 2: Update config.json quote portrait paths**

Update `historicalFlavor.quotes` entries to reference the correct portrait paths:
```json
"portrait": "images/portraits/jackson.jpg"
```

- [ ] **Step 3: Test quotes display**

Verify portraits render correctly alongside quotes in the app.

- [ ] **Step 4: Commit**

```bash
git add study-tools/units/westward-expansion/images/portraits/
git add study-tools/units/westward-expansion/config.json
git commit -m "feat: add historical figure portraits and link to quotes"
```

### Task 5.4: Source and add vocab images

**Files:**
- Add images to: `study-tools/units/westward-expansion/images/vocab/`
- Modify: `study-tools/units/westward-expansion/config.json` (add imageUrl to vocab entries)

- [ ] **Step 1: Source ~15-20 public domain images**

Priority terms: Trail of Tears, cotton gin, Erie Canal, the Alamo, Oregon Trail, plantation, Seneca Falls Convention, Indian Removal Act, Mexican-American War, Compromise of 1850, etc.

Use Wikimedia Commons, Library of Congress, National Archives.

- [ ] **Step 2: Add imageUrl to vocabulary entries**

```json
"imageUrl": "../units/westward-expansion/images/vocab/trail_of_tears.jpg"
```

- [ ] **Step 3: Commit**

```bash
git add study-tools/units/westward-expansion/images/vocab/
git add study-tools/units/westward-expansion/config.json
git commit -m "feat: add vocabulary images for priority terms"
```

---

## Stage 6: Polish

### Task 6.1: Timeline engine enhancements

**Files:**
- Modify: `study-tools/engine/js/activities/timeline.js`

**Scope note:** The design spec mentions `startYear`/`endYear` fields for date ranges and full month-level parsing in the timeline engine. For this initial implementation, we take a simpler approach: use sequential IDs for sort order (the existing mechanism) and put month+year strings in the `year` display field. The sort is based on `id` ordering, not date parsing. Full date range support can be added in a future enhancement.

- [ ] **Step 1: Verify sort logic with month-level precision**

The current sort at `timeline.js` line ~346 uses: `events.map(function(ev) { return ev.id; }).sort(function(a, b) { return a - b; })`. This sorts by the `id` array, not the events themselves. Sequential IDs determine correct order.

Verify that the westward-expansion timeline events (from Task 2.6) have IDs assigned in correct chronological order accounting for month precision (e.g., Treaty of Guadalupe Hidalgo in February 1848 gets a lower id than Seneca Falls in July 1848).

- [ ] **Step 2: Verify month+year display**

The `year` field (e.g., "February 1848") is displayed as-is on cards. Verify the card display renders the full string correctly, including longer strings like "February 1848" without truncation.

- [ ] **Step 3: Test timeline drag-to-order**

Test with events that share the same year. Verify students must place them in the correct month order to get full marks.

- [ ] **Step 4: Commit if changes needed**

```bash
git add study-tools/engine/js/activities/timeline.js
git commit -m "feat: verify timeline display for month-level date precision"
```

### Task 6.2: Test all 18 activities end-to-end

- [ ] **Step 1: Systematic activity testing**

Open `study-tools/engine/?unit=westward-expansion` and test each activity:

| Activity | Test |
|----------|------|
| Flashcards | Cards load, categories display, flip works, mastery rating works |
| Textbook | All 4 chapters load, reading level toggle works, sections display |
| Resources | Vocabulary terms show with wiki links |
| Typing Practice | 4 passages load, typing input works |
| Practice Test | Questions load, scoring works, topic filtering works |
| Short Answer | 5 questions display, rubric and exemplar show |
| Timeline | 16 events load, drag-to-order works, year toggle works |
| Wordle | Picks vocabulary terms, game plays correctly |
| Hangman | Definitions as clues, game works |
| Flip Match | Term/definition pairs match correctly |
| Fill-in-Blank | 16 sentences load, answer checking works |
| Term Catcher | Game loads with vocabulary |
| Lightning Round | Rapid-fire questions work |
| Crossword | Generates from vocabulary terms |
| Source Analysis | ~16 sources load with images and questions |
| Quiz Race | Competitive mode works with practice questions |
| Tower Defense | Vocabulary-based gameplay works |
| Map Quiz | SVG map loads, regions clickable, quiz flow works |

- [ ] **Step 2: Fix any issues found**

### Task 6.3: Verify mastery gating

- [ ] **Step 1: Test unlock sequence**

1. Start with fresh localStorage (clear progress)
2. Verify only "Jackson's America" flashcards are accessible
3. Master all Jackson's America terms (rate each "Good" or "Easy")
4. Verify "Westward Trails" unlocks
5. Check that games/practice filter to unlocked terms only
6. Verify "Connections" questions only appear when all 4 categories mastered

### Task 6.4: Theme and responsive testing

- [ ] **Step 1: Test Sunset Trail theme**

- Verify `#B5651D` primary color applies throughout
- Check dark mode renders correctly with the warm colors
- Check light mode renders correctly
- Test on mobile viewport (responsive layout)
- Test dyslexic font toggle with new content

### Task 6.5: Bump version and final commit

**Files:**
- Modify: `study-tools/engine/version.json`

- [ ] **Step 1: Bump version**

Update version.json with new version number and today's date.

- [ ] **Step 2: Final commit**

```bash
git add study-tools/engine/version.json
git commit -m "chore: bump version for westward-expansion unit launch"
```
