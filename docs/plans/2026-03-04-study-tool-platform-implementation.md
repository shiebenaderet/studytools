# Study Tool Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a plugin-based study tool engine where each unit is a JSON config and activities are mix-and-match JS modules, with optional Supabase progress sync.

**Architecture:** A shared engine (HTML shell + CSS + core JS) dynamically loads a unit's `config.json` and only the activity plugins listed in it. Progress saves to localStorage by default with optional Supabase sync. Each activity is a self-contained JS file that registers itself with the engine.

**Tech Stack:** Vanilla HTML/CSS/JS (no build tools), CSS custom properties for theming, Supabase JS client for optional sync, GitHub Pages for hosting.

**Design Doc:** `docs/plans/2026-03-04-study-tool-platform-design.md`

**Security Note:** innerHTML is used throughout for rendering teacher-authored config data (vocabulary, questions, etc.). This data comes from the teacher's own config.json files committed to the repo, not from user input. All student-entered text (names, answers, notes) must use textContent or escapeHtml() to prevent XSS. The StudyUtils.escapeHtml() function is provided for this purpose.

---

## Phase 1: Core Engine

### Task 1: Create project structure and engine shell

**Files:**
- Create: `study-tools/engine/index.html`
- Create: `study-tools/engine/css/styles.css`

**Step 1: Create directory structure**

```bash
mkdir -p study-tools/engine/css
mkdir -p study-tools/engine/js/core
mkdir -p study-tools/engine/js/activities
mkdir -p study-tools/engine/tools
mkdir -p study-tools/units/early-republic
mkdir -p study-tools/dashboard
```

**Step 2: Create engine/index.html**

The HTML shell with:
- `<head>`: meta tags, Font Awesome CDN link, `css/styles.css` link
- `<body>`:
  - `<header>` with id `site-header` (title, subtitle, essential question -- all populated by JS from config)
  - `<nav>` with id `main-nav` -- group buttons: Home, Study, Practice, Games, Tools
  - `<div id="sub-nav">` -- populated dynamically when a group is selected
  - `<div id="activity-container">` -- where activity content renders
  - `<div id="home-section">` -- progress stats, badges, welcome cards
  - Modal containers: `<div id="modal-overlay">`
  - Login prompt: `<div id="login-prompt">` (Save My Progress button)
- `<script>` tags: load `js/core/utils.js`, `js/core/progress.js`, `js/core/app.js` (in that order)

**Step 3: Create base CSS**

`study-tools/engine/css/styles.css` -- migrate all styles from `early-republic-study-tool.html` but replace hardcoded colors with CSS custom properties:

- Replace `#0d9488` with `var(--primary)`
- Replace `#065f46` with `var(--secondary)`
- Replace `#f59e0b` with `var(--accent)`
- Add `:root` defaults for the variables
- Add styles for sub-nav, login prompt, activity container
- Keep all existing component styles (flashcard, timeline, practice, etc.)
- Add new styles for nav grouping (`.nav-group`, `.sub-nav`, `.activity-card-grid`)

**Step 4: Verify the shell loads**

Open `study-tools/engine/index.html` in a browser. Should see the header with "Loading..." and empty nav. No errors in console.

**Step 5: Commit**

```bash
git add study-tools/
git commit -m "feat: create engine shell with HTML, CSS, and directory structure"
```

---

### Task 2: Build the StudyEngine core (app.js)

**Files:**
- Create: `study-tools/engine/js/core/app.js`

**Step 1: Implement StudyEngine global object**

The StudyEngine object handles:
- **init()**: Read `?unit=` query param, fetch `../units/{unitId}/config.json`, call applyTheme/renderHeader/loadActivities
- **applyTheme()**: Set CSS custom properties from `config.unit.theme`
- **renderHeader()**: Populate header elements with config unit metadata using textContent (not innerHTML)
- **loadActivities()**: Dynamically create `<script>` tags for each activity in `config.activities`, wait for all to load, then call buildNav()
- **registerActivity(activity)**: Store activity object in `this.activities[activity.id]`
- **buildNav()**: Create nav buttons for Home + activity category groups (Study, Practice, Games) + Tools. Only show groups that have registered activities.
- **showSubNav(groupId, items)**: Show sub-navigation buttons for activities within a group, plus a card grid for activity selection
- **activateActivity(activityId)**: Deactivate current activity, clear container, call activity.render(), load saved progress, call activity.activate()
- **showHome()**: Hide activity container, show home section, render stats
- **showTools()**: Render tools grid in activity container
- **showModal(contentHtml)** / **closeModal()**: Modal overlay helpers
- **showUnitError(message)**: Error display for missing/invalid units

DOM event listeners:
- `DOMContentLoaded` -> `StudyEngine.init()`
- Click on `modal-overlay` -> `StudyEngine.closeModal()`

Note: When rendering activity cards, descriptions come from teacher-authored plugin metadata and are safe. Student-entered data must always use `textContent` or `StudyUtils.escapeHtml()`.

**Step 2: Create a minimal test config**

Create `study-tools/units/early-republic/config.json` with just unit metadata and empty activities array. Open the engine in a browser with `?unit=early-republic`. Should see the header populated with title/subtitle. No console errors.

**Step 3: Commit**

```bash
git add study-tools/engine/js/core/app.js study-tools/units/early-republic/config.json
git commit -m "feat: implement StudyEngine core with config loading and nav building"
```

---

### Task 3: Build utils.js

**Files:**
- Create: `study-tools/engine/js/core/utils.js`

**Step 1: Implement StudyUtils object**

Shared utility functions:
- **shuffle(array)**: Fisher-Yates shuffle, returns new array
- **formatTime(seconds)**: Returns "MM:SS" string
- **formatStudyTime(ms)**: Returns "Xh Ym" string
- **createElement(html)**: Create DOM element from HTML string using `<template>`
- **escapeHtml(text)**: Sanitize text to prevent XSS by setting textContent on a div and reading innerHTML
- **debounce(fn, ms)**: Standard debounce
- **normalizeTerm(term)**: Lowercase, trim, strip punctuation for comparison

**Step 2: Commit**

```bash
git add study-tools/engine/js/core/utils.js
git commit -m "feat: add shared utility functions"
```

---

### Task 4: Build progress.js (localStorage tier)

**Files:**
- Create: `study-tools/engine/js/core/progress.js`

**Step 1: Implement ProgressManager object**

Core state:
- `prefix`: `'studytool_'` (localStorage key prefix)
- `studentInfo`: null or `{ name, classCode }`
- `dirty`: object tracking which records need syncing

Methods:
- **getKey(unitId, key)**: Returns prefixed localStorage key
- **save(unitId, key, value)**: JSON.stringify to localStorage, mark dirty
- **load(unitId, key)**: JSON.parse from localStorage
- **getActivityProgress(unitId, activityId)**: Load activity-specific progress
- **saveActivityProgress(unitId, activityId, data)**: Save with updatedAt timestamp
- **updateStreak(unitId)**: Track consecutive study days
- **addStudyTime(unitId, ms)**: Accumulate study time
- **getBadges(unitId)** / **unlockBadge(unitId, badgeId)**: Badge management
- **renderHomeStats(config)**: Build stats HTML for home section (study time, vocab mastered, practice count, streak). Use textContent for any student-entered data.
- **showLoginModal()**: Display name + class code login form via StudyEngine.showModal()
- **login()**: Save student info to localStorage (Supabase integration added in Task 20). Use escapeHtml() on student name before any display.
- **loadStudentInfo()**: Restore from localStorage on page load

Auto-initialize: Call `loadStudentInfo()` at module load time.

**Step 2: Commit**

```bash
git add study-tools/engine/js/core/progress.js
git commit -m "feat: implement ProgressManager with localStorage and home stats"
```

---

### Task 5: Migrate Early Republic data to config.json

**Files:**
- Create: `study-tools/units/early-republic/config.json`

**Step 1: Extract all data from early-republic-study-tool.html into config.json**

Take the `vocabulary`, `timelineEvents`, `questions`, and `shortAnswerQuestions` arrays from the existing file and place them in the config JSON format defined in the design doc. Include:

- `unit` metadata (id: "early-republic", title, subtitle, essentialQuestion, teacherEmail, theme)
- `activities` array listing all enabled activities
- `vocabulary` (46 terms with term, definition, example, category)
- `timelineEvents` (10 events with id, title, year, description)
- `practiceQuestions` (30 questions with question, options, correct, explanation, topic)
- `shortAnswerQuestions` (5 questions with question, topic, rubric, exemplar, sentenceStarters)
- `fillInBlankSentences` -- generate ~15 fill-in-the-blank sentences from the existing vocabulary data, e.g.:
  ```json
  { "sentence": "Washington sent the army to crush the ___, proving the federal government could enforce its laws.", "answer": "Whiskey Rebellion" }
  ```

**Step 2: Verify JSON is valid**

```bash
python3 -c "import json; json.load(open('study-tools/units/early-republic/config.json'))"
```

Expected: No output (success).

**Step 3: Commit**

```bash
git add study-tools/units/early-republic/config.json
git commit -m "feat: migrate Early Republic content to config.json"
```

---

## Phase 2: Core Activity Plugins (existing features)

### Task 6: Flashcards plugin

**Files:**
- Create: `study-tools/engine/js/activities/flashcards.js`

**Step 1: Implement flashcards.js**

Register with StudyEngine using the plugin interface:
- id: `'flashcards'`, category: `'study'`, icon: `'fas fa-graduation-cap'`
- requires: `['vocabulary']`

Internal state: `_currentIndex`, `_isFlipped`, `_displayedVocab`, `_mastered`

render(container, config):
- Build category filter dropdown from unique vocab categories
- Shuffle and Flip All buttons
- Stats bar (term number, mastered count)
- Flashcard element with label and content
- Navigation: Previous, Mark as Mastered, Next
- Tip text about keyboard shortcuts
- Bind click events to all buttons

Key methods:
- **display()**: Show current card (term or definition based on flip state). Use escapeHtml() for definition/example content. Update nav button disabled states.
- **flip()**: Toggle _isFlipped, redisplay
- **next()/prev()**: Navigate, reset flip state
- **master()**: Add term to _mastered array, save progress, advance
- **shuffleCards()**: Fisher-Yates shuffle displayed vocab
- **filterByCategory(category, config)**: Filter or show all

activate(): Register keyboard handler (ArrowLeft/Right, Space, M key)
deactivate(): Remove keyboard handler
getProgress()/loadProgress(data): Save/restore mastered array
saveProgress(): Call ProgressManager.saveActivityProgress()

**Step 2: Add "flashcards" to Early Republic config activities array**

**Step 3: Test in browser -- flashcards should render and be fully functional**

**Step 4: Commit**

```bash
git add study-tools/engine/js/activities/flashcards.js
git commit -m "feat: add flashcards activity plugin"
```

---

### Task 7: Practice Test plugin

**Files:**
- Create: `study-tools/engine/js/activities/practice-test.js`

**Step 1: Implement practice-test.js**

Register with StudyEngine:
- id: `'practice-test'`, category: `'practice'`, icon: `'fas fa-pencil'`
- requires: `['practiceQuestions']`

Migrate the practice test logic from the existing file:
- Question display with question number and text
- 4 option buttons per question
- Answer selection: highlight correct (blue) and incorrect (red), disable other options
- Explanation reveal after answering
- Previous/Next navigation
- Submit Test button: calculate score, show results
- Reset button to retake
- Track answered questions in progress

Use textContent for question and option text (teacher-authored but good practice).

**Step 2: Test in browser**

**Step 3: Commit**

```bash
git add study-tools/engine/js/activities/practice-test.js
git commit -m "feat: add practice test activity plugin"
```

---

### Task 8: Short Answer plugin

**Files:**
- Create: `study-tools/engine/js/activities/short-answer.js`

**Step 1: Implement short-answer.js**

Register with StudyEngine:
- id: `'short-answer'`, category: `'practice'`, icon: `'fas fa-pen-fancy'`
- requires: `['shortAnswerQuestions']`

Migrate short answer logic:
- Question selector dropdown
- On selection: show question text, rubric checklist, textarea, exemplar response, sentence starters
- Save button: persist textarea content to localStorage via ProgressManager
- Load saved responses on revisit
- Student-entered textarea content must use textContent when displayed elsewhere

**Step 2: Test in browser**

**Step 3: Commit**

```bash
git add study-tools/engine/js/activities/short-answer.js
git commit -m "feat: add short answer activity plugin"
```

---

### Task 9: Timeline plugin

**Files:**
- Create: `study-tools/engine/js/activities/timeline.js`

**Step 1: Implement timeline.js**

Register with StudyEngine:
- id: `'timeline'`, category: `'practice'`, icon: `'fas fa-history'`
- requires: `['timelineEvents']`

Migrate drag-and-drop timeline:
- Instructions panel
- Shuffled event cards (draggable) showing year, title, description
- Ordered drop zone with numbered slots
- Drag events: dragstart sets event ID, dragover prevents default, drop places element in slot
- Check Answer: compare placed order against correct chronological order
- Reset button: re-initialize
- Track attempts and perfect scores in progress

**Step 2: Test in browser**

**Step 3: Commit**

```bash
git add study-tools/engine/js/activities/timeline.js
git commit -m "feat: add timeline activity plugin"
```

---

### Task 10: Category Sort plugin

**Files:**
- Create: `study-tools/engine/js/activities/category-sort.js`

**Step 1: Implement category-sort.js**

Register with StudyEngine:
- id: `'category-sort'`, category: `'practice'`, icon: `'fas fa-layer-group'`
- requires: `['sortingData']`

New activity using `config.sortingData`:
```json
{
    "title": "Sort the Powers",
    "instruction": "Drag each power to the correct branch of government.",
    "categories": ["Legislative", "Executive", "Judicial"],
    "items": [
        { "text": "Declares laws unconstitutional", "category": "Judicial" }
    ]
}
```

- Display category buckets as drop zones
- Shuffled item cards (draggable)
- Drag items into category buckets
- Check Answer: highlight correct (green border) and incorrect (red border)
- Show correct answers for misplaced items
- Reset button
- Track score in progress

**Step 2: Test with mock sorting data added to Early Republic config**

**Step 3: Commit**

```bash
git add study-tools/engine/js/activities/category-sort.js
git commit -m "feat: add category sort activity plugin"
```

---

## Phase 3: New Game Plugins

### Task 11: Wordle plugin

**Files:**
- Create: `study-tools/engine/js/activities/wordle.js`

**Step 1: Implement wordle.js**

Register: id `'wordle'`, category `'games'`, icon `'fas fa-spell-check'`
requires: `['vocabulary']`

Vocabulary-based Wordle:
- Pick a random vocab term as target word
- Show the definition as the clue at the top
- Show word length as hint (e.g., "_ _ _ _ _ _ _ _ _ _" for 10-letter word)
- 6 guess rows, each with letter cells matching target word length
- Text input for typing guesses (auto-capitalize, auto-focus)
- On submit: color each letter cell -- green (correct position), yellow (in word but wrong position), gray (not in word)
- On-screen keyboard (A-Z) with matching color feedback on used letters
- Win: show congratulations, track in progress
- Lose: reveal the word
- "Next Word" button for another round
- Filter to words with reasonable lengths (4-15 letters)
- Track wins, losses, guess distribution in progress

**Step 2: Add CSS for Wordle grid**

Add to styles.css:
- `.wordle-grid` -- grid of letter cells
- `.wordle-cell` -- individual cell with border
- `.wordle-cell.correct` -- green background
- `.wordle-cell.present` -- yellow background
- `.wordle-cell.absent` -- gray background
- `.wordle-keyboard` -- on-screen keyboard layout
- `.wordle-key` -- individual key styling with color states

**Step 3: Test in browser**

**Step 4: Commit**

```bash
git add study-tools/engine/js/activities/wordle.js study-tools/engine/css/styles.css
git commit -m "feat: add Wordle vocabulary game"
```

---

### Task 12: Hangman plugin

**Files:**
- Create: `study-tools/engine/js/activities/hangman.js`

**Step 1: Implement hangman.js**

Register: id `'hangman'`, category `'games'`, icon `'fas fa-user'`
requires: `['vocabulary']`

- Pick random vocab term, show definition as clue
- Display blanks (underscores) for each letter, with spaces preserved
- On-screen letter buttons A-Z in a grid
- On letter click: if in word, reveal all instances; if not, increment wrong count
- CSS/div-based hangman drawing (8 parts: gallows, head, body, left arm, right arm, left leg, right leg, face)
  - Use absolutely positioned divs or CSS shapes -- no canvas
  - Each part has a class that toggles visibility
- 8 wrong guesses allowed
- Win: celebrate, track in progress
- Lose: reveal word, show sad face
- "New Word" button
- Track wins/losses in progress

**Step 2: Add CSS for hangman figure**

Add to styles.css:
- `.hangman-figure` -- container with relative positioning
- `.hangman-part` -- hidden by default, shown via `.visible` class
- Individual part styles (`.gallows`, `.head`, `.body`, `.arm-left`, etc.) using borders, border-radius

**Step 3: Test in browser**

**Step 4: Commit**

```bash
git add study-tools/engine/js/activities/hangman.js study-tools/engine/css/styles.css
git commit -m "feat: add Hangman vocabulary game"
```

---

### Task 13: Flip Match plugin

**Files:**
- Create: `study-tools/engine/js/activities/flip-match.js`

**Step 1: Implement flip-match.js**

Register: id `'flip-match'`, category `'games'`, icon `'fas fa-clone'`
requires: `['vocabulary']`

Memory card matching:
- Difficulty selector: Easy (6 pairs), Medium (8 pairs), Hard (12 pairs)
- Randomly select N vocab terms, create card pairs (one with term, one with truncated definition)
- Shuffle all cards into a grid
- Card flip animation using CSS transform (rotateY)
- Click to flip -- max 2 cards face-up at a time
- If term matches its definition: keep both face-up, mark as matched (green border)
- If no match: flip both back after 1 second delay
- Move counter and timer
- Win condition: all pairs matched
- Show completion stats: time, moves, par score
- Track best scores per difficulty in progress

**Step 2: Add CSS for flip cards**

Add to styles.css:
- `.match-grid` -- CSS grid, responsive columns
- `.match-card` -- perspective container
- `.match-card-inner` -- transform-style preserve-3d, transition
- `.match-card.flipped .match-card-inner` -- rotateY(180deg)
- `.match-card-front`, `.match-card-back` -- backface-visibility hidden
- `.match-card.matched` -- green border, pointer-events none

**Step 3: Test in browser**

**Step 4: Commit**

```bash
git add study-tools/engine/js/activities/flip-match.js study-tools/engine/css/styles.css
git commit -m "feat: add Flip Match memory game"
```

---

### Task 14: Typing Race plugin

**Files:**
- Create: `study-tools/engine/js/activities/typing-race.js`

**Step 1: Implement typing-race.js**

Register: id `'typing-race'`, category `'games'`, icon `'fas fa-car'`
requires: `['vocabulary']`

Speed typing race:
- Select 10 random vocab terms for the round
- Visual race track: horizontal lanes with colored car divs
  - Lane 1: Student (labeled with "You")
  - Lanes 2-4: AI racers (named: "Quick Quinn", "Speedy Sam", "Fast Fiona")
- Show definition at top, input field for typing the term
- Timer starts when definition appears
- On correct submission: student car advances 10%, move to next definition
- AI racers advance at configurable intervals (randomized slightly for realism)
  - Easy AI: advances every 4-6 seconds
  - Medium AI: every 3-5 seconds
  - Hard AI: every 2-4 seconds
- Show accuracy (correct keystrokes / total keystrokes)
- Race ends when someone finishes all 10 terms
- Results screen: placement, time, accuracy
- Track best times in progress
- Difficulty selector changes AI speed

**Step 2: Add CSS for race track**

Add to styles.css:
- `.race-track` -- container with lanes
- `.race-lane` -- horizontal bar with car
- `.race-car` -- colored div with transition on left position
- `.race-input` -- styled text input

**Step 3: Test in browser**

**Step 4: Commit**

```bash
git add study-tools/engine/js/activities/typing-race.js study-tools/engine/css/styles.css
git commit -m "feat: add Typing Race vocabulary game"
```

---

### Task 15: Fill-in-the-Blank plugin

**Files:**
- Create: `study-tools/engine/js/activities/fill-in-blank.js`

**Step 1: Implement fill-in-blank.js**

Register: id `'fill-in-blank'`, category `'study'`, icon `'fas fa-puzzle-piece'`
requires: `['fillInBlankSentences']`

- Display sentences with blank slots (highlighted underscores)
- Word bank at top: clickable term buttons
- Click a term in the word bank, then click a blank to place it (or click blank first, then term)
- Placed terms show in the blank with a different background
- Click a filled blank to remove the term (returns to word bank)
- Check Answers button: green for correct, red for incorrect with correct answer shown below
- Score display: X out of Y correct
- Reset button
- Track scores in progress

**Step 2: Add CSS for blanks and word bank**

Add to styles.css:
- `.word-bank` -- flex wrap container for term buttons
- `.word-bank-term` -- clickable term pill
- `.word-bank-term.used` -- grayed out when placed
- `.blank-slot` -- inline styled blank in sentence
- `.blank-slot.filled` -- shows placed term
- `.blank-slot.correct` / `.blank-slot.incorrect` -- feedback colors

**Step 3: Test in browser**

**Step 4: Commit**

```bash
git add study-tools/engine/js/activities/fill-in-blank.js study-tools/engine/css/styles.css
git commit -m "feat: add Fill-in-the-Blank activity"
```

---

### Task 16: Term Catcher plugin

**Files:**
- Create: `study-tools/engine/js/activities/term-catcher.js`

**Step 1: Implement term-catcher.js**

Register: id `'term-catcher'`, category `'games'`, icon `'fas fa-hand-pointer'`
requires: `['vocabulary']`

Arcade-style falling word game:
- Game area: fixed-height div with relative positioning
- Definition shown at top of game area in a highlighted bar
- Terms appear at random x positions at top, fall downward
- Each falling term is an absolutely positioned, clickable div
- Use `requestAnimationFrame` loop:
  - Move each term down by `speed` pixels per frame
  - Spawn new terms every 2-3 seconds (random from vocab, including correct answer)
  - 3-4 terms visible at once
- Click correct term: score +1, combo multiplier increases, flash green
- Click wrong term: combo resets, flash red, lose a life
- Term reaches bottom without being caught: lose a life if it was the correct term
- 3 lives (displayed as hearts)
- Speed increases every 5 correct answers
- Combo multiplier: x1 (base), x2 (3 streak), x3 (5 streak), x4 (8 streak)
- Game over screen: final score, terms missed
- Track high score in progress

**Step 2: Add CSS for game area**

Add to styles.css:
- `.catcher-game-area` -- relative position, fixed height, overflow hidden, border
- `.catcher-definition` -- sticky top bar with current definition
- `.falling-term` -- absolutely positioned, clickable, rounded, animated
- `.falling-term.correct-flash` -- brief green animation
- `.falling-term.wrong-flash` -- brief red animation
- `.catcher-lives` -- heart display
- `.catcher-score` -- score and combo display

**Step 3: Test in browser**

**Step 4: Commit**

```bash
git add study-tools/engine/js/activities/term-catcher.js study-tools/engine/css/styles.css
git commit -m "feat: add Term Catcher arcade game"
```

---

### Task 17: Lightning Round plugin

**Files:**
- Create: `study-tools/engine/js/activities/lightning-round.js`

**Step 1: Implement lightning-round.js**

Register: id `'lightning-round'`, category `'games'`, icon `'fas fa-bolt'`
requires: `['vocabulary']`

60-second speed quiz:
- Start screen with "Ready?" button
- 3-2-1 countdown animation
- Countdown timer bar at top (60 seconds, visual progress bar shrinking)
- Show definition, 4 clickable term buttons (1 correct + 3 random distractors)
- On correct click: flash green, score +1, auto-advance after 0.5 seconds
- On wrong click: flash red, show correct answer, auto-advance after 1 second
- Timer hits 0: game over
- Results screen: score, percentage, list of missed terms with correct answers
- Leaderboard: top 10 scores stored in localStorage (name from student info or "Anonymous")
- Track best score in progress

**Step 2: Add CSS for lightning round**

Add to styles.css:
- `.lightning-timer-bar` -- full-width bar that shrinks via width transition
- `.lightning-options` -- grid of 4 option buttons
- `.lightning-option.correct-flash` / `.lightning-option.wrong-flash` -- brief color animations
- `.lightning-countdown` -- large centered countdown text (3, 2, 1, GO!)
- `.leaderboard` -- styled score table

**Step 3: Test in browser**

**Step 4: Commit**

```bash
git add study-tools/engine/js/activities/lightning-round.js study-tools/engine/css/styles.css
git commit -m "feat: add Lightning Round speed quiz game"
```

---

### Task 18: Crossword plugin

**Files:**
- Create: `study-tools/engine/js/activities/crossword.js`

**Step 1: Implement crossword.js**

Register: id `'crossword'`, category `'games'`, icon `'fas fa-th'`
requires: `['vocabulary']`

Auto-generated crossword puzzle:

**Grid generation algorithm:**
1. Sort vocabulary by term length (longest first)
2. Filter to single-word terms or take first word of multi-word terms (for grid simplicity)
3. Place first word horizontally at center of grid
4. For each remaining word:
   a. Find all letters shared with already-placed words
   b. For each shared letter, try placing perpendicular (if previous was horizontal, try vertical)
   c. Check: no overlap conflicts, no adjacent parallel words
   d. Place if valid, skip if not
5. Aim for 10-15 placed words
6. Number the cells (across and down starting positions)

**UI:**
- Grid rendered as table with input cells (one character per cell)
- Empty cells are blacked out
- Clue panel split into Across and Down sections
- Click a clue: highlight corresponding cells in the grid, focus first cell
- Tab/arrow keys navigate between cells
- Check button: highlight correct (green) and incorrect (red) cells
- Reveal Word button: fill in selected word
- Reveal All button
- Track completion in progress

**Step 2: Add CSS for crossword grid**

Add to styles.css:
- `.crossword-container` -- flex layout (grid + clues side by side, stack on mobile)
- `.crossword-grid` -- table with fixed cell sizes
- `.crossword-cell` -- square cell with centered input
- `.crossword-cell.black` -- black background, no input
- `.crossword-cell.highlighted` -- active clue highlight
- `.crossword-cell.correct` / `.crossword-cell.incorrect` -- feedback colors
- `.crossword-number` -- small superscript number in cell
- `.crossword-clues` -- scrollable clue list

**Step 3: Test in browser -- verify grid generates with Early Republic terms**

**Step 4: Commit**

```bash
git add study-tools/engine/js/activities/crossword.js study-tools/engine/css/styles.css
git commit -m "feat: add Crossword puzzle generator"
```

---

## Phase 4: Tools and Supabase

### Task 19: Study Tools (notes, timer, print, export)

**Files:**
- Create: `study-tools/engine/tools/tools.js`

**Step 1: Implement StudyTools object**

Consolidate all tool functionality into `StudyTools`:

- **openNotes()**: Show modal with note-taking textareas organized by vocabulary categories from config. Save/load via ProgressManager. Print button opens print-friendly window.
- **openTimer()**: Show modal with minutes/seconds inputs (default 25:00). Start button launches focused study modal with countdown display, pause/resume, and exit. Track time via ProgressManager.addStudyTime().
- **openPrint()**: Show modal with checkboxes (vocabulary, definitions, timeline, questions). Generate print-friendly HTML in new window. Build content from StudyEngine.config data.
- **exportProgress()**: Gather all progress data from ProgressManager, format as readable summary, open in print-friendly window.

All student-entered note content must use textContent when redisplayed.

**Step 2: Add script tag to engine/index.html**

Add before app.js:
```html
<script src="tools/tools.js"></script>
```

**Step 3: Test all tools in browser**

**Step 4: Commit**

```bash
git add study-tools/engine/tools/tools.js study-tools/engine/index.html
git commit -m "feat: add study tools (notes, timer, print, export)"
```

---

### Task 20: Supabase integration

**Files:**
- Modify: `study-tools/engine/js/core/progress.js`
- Create: `study-tools/engine/js/core/supabase-config.js`
- Modify: `study-tools/engine/index.html`

**Step 1: Add Supabase client to index.html**

Add before other scripts:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/core/supabase-config.js"></script>
```

**Step 2: Create supabase-config.js**

```javascript
// Replace these with your Supabase project values
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

**Step 3: Create Supabase tables**

Run this SQL in the Supabase dashboard SQL editor:

```sql
CREATE TABLE classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text UNIQUE NOT NULL,
    name text NOT NULL,
    teacher_email text NOT NULL,
    created_at timestamp DEFAULT now()
);

CREATE TABLE students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    class_id uuid REFERENCES classes(id),
    created_at timestamp DEFAULT now()
);

CREATE TABLE progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES students(id),
    unit_id text NOT NULL,
    activity text NOT NULL,
    data jsonb NOT NULL DEFAULT '{}',
    updated_at timestamp DEFAULT now(),
    UNIQUE(student_id, unit_id, activity)
);

CREATE TABLE sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES students(id),
    unit_id text NOT NULL,
    started_at timestamp DEFAULT now(),
    duration_seconds int DEFAULT 0,
    activities_used text[] DEFAULT '{}'
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read classes" ON classes FOR SELECT USING (true);
CREATE POLICY "Anyone can register" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Students read own data" ON students FOR SELECT USING (true);
CREATE POLICY "Students manage own progress" ON progress FOR ALL USING (true);
CREATE POLICY "Students manage own sessions" ON sessions FOR ALL USING (true);
```

**Step 4: Extend ProgressManager with Supabase methods**

Add to progress.js:

- **initSupabase()**: Create Supabase client from config constants. Called after student login.
- **login()** (update existing): After saving to localStorage, call Supabase to find or create student:
  1. Query `classes` table for matching code
  2. If no class found, show error "Invalid class code"
  3. Query `students` for matching name + class_id
  4. If not found, insert new student
  5. Store student UUID in localStorage
  6. Call startSyncLoop()
- **syncToSupabase()**: For each dirty record, upsert to `progress` table. Clear dirty flags on success.
- **syncFromSupabase()**: On page load (if logged in), fetch all progress for this student. For each record, compare `updatedAt` with localStorage -- keep newer version.
- **startSyncLoop()**: `setInterval(syncToSupabase, 30000)` -- sync every 30 seconds
- **startSession()**: Insert row into `sessions` table with current timestamp
- **endSession()**: Update session row with duration and activities used
- **onBeforeUnload**: Add `beforeunload` event listener that calls `endSession()` and final `syncToSupabase()` using `fetch` with `keepalive: true`

Handle all Supabase errors gracefully -- if Supabase is down, localStorage keeps working. Log errors to console but don't show to students.

**Step 5: Test login flow**

1. Create a test class in Supabase: `INSERT INTO classes (code, name, teacher_email) VALUES ('TEST-1', 'Test Class', 'test@test.com');`
2. Open site, click Save My Progress, enter name and class code
3. Use some activities
4. Check Supabase tables for data

**Step 6: Commit**

```bash
git add study-tools/engine/js/core/progress.js study-tools/engine/js/core/supabase-config.js study-tools/engine/index.html
git commit -m "feat: add Supabase sync for persistent student progress"
```

---

### Task 21: Teacher Dashboard

**Files:**
- Create: `study-tools/dashboard/index.html`
- Create: `study-tools/dashboard/dashboard.js`
- Create: `study-tools/dashboard/dashboard.css`

**Step 1: Build dashboard HTML**

Standalone page with:
- Supabase client script
- Login form (email/password for teacher auth via Supabase Auth)
- After login, tabbed interface: Overview, Students, Units

**Step 2: Implement dashboard.js**

- **login(email, password)**: Supabase auth signInWithPassword. On success, show dashboard.
- **loadOverview()**: Query aggregated stats -- total students, active this week (sessions in last 7 days), total study time (sum of session durations)
- **loadStudents(filters)**: Query students joined with their progress and sessions. Display as sortable table: Name, Class, Last Active, Total Study Time, Vocab Mastered (%), Practice Score (%). Filter by class code dropdown and date range.
- **loadUnits()**: Query progress grouped by unit_id and activity. Show which activities are most/least used.
- All student names displayed using textContent to prevent XSS.

**Step 3: Create dashboard.css**

Simple styles for the dashboard: login form, data tables, tab navigation, filter controls. Can reuse some CSS variables from main styles.

**Step 4: Test with sample data**

**Step 5: Commit**

```bash
git add study-tools/dashboard/
git commit -m "feat: add teacher dashboard with student progress views"
```

---

## Phase 5: Landing Page and Polish

### Task 22: Landing page

**Files:**
- Create: `study-tools/index.html`
- Create: `study-tools/units/units.json`

**Step 1: Create units manifest**

```json
{
    "units": [
        {
            "id": "early-republic",
            "title": "Early Republic",
            "subtitle": "8th Grade US History",
            "theme": { "primary": "#0d9488" },
            "activityCount": 13
        }
    ]
}
```

**Step 2: Build landing page**

Simple page that fetches `units/units.json` and renders a card for each unit:
- Unit title and subtitle
- Card border/accent using unit's theme color
- Activity count badge
- Link to `engine/?unit={id}`
- Teacher dashboard link in footer

**Step 3: Commit**

```bash
git add study-tools/index.html study-tools/units/units.json
git commit -m "feat: add landing page listing available units"
```

---

### Task 23: Keyboard shortcuts and accessibility

**Files:**
- Modify: `study-tools/engine/js/core/app.js`

**Step 1: Add global keyboard shortcuts**

Add a global keydown listener in app.js:
- `?` key: show shortcuts help modal listing all available shortcuts
- `Escape`: close any open modal
- `1-5` keys: switch between nav groups (Home, Study, Practice, Games, Tools)

Activities manage their own keyboard shortcuts via activate()/deactivate() -- this is already implemented in the plugin pattern.

**Step 2: Add focus styles**

Ensure all interactive elements (buttons, cards, inputs) have visible `:focus` outlines using `outline: 2px solid var(--primary)`. Add `tabindex="0"` to clickable divs that aren't natively focusable.

**Step 3: Commit**

```bash
git add study-tools/engine/js/core/app.js study-tools/engine/css/styles.css
git commit -m "feat: add keyboard shortcuts and accessibility improvements"
```

---

### Task 24: Final testing and cleanup

**Step 1: Test all 13 activities with Early Republic data**

Open each activity and verify:
- Renders correctly with no console errors
- Core functionality works (can interact, get feedback)
- Progress saves to localStorage
- Progress persists on page refresh
- Keyboard shortcuts work where applicable

**Step 2: Test Supabase sync flow**

- Register as student with name + class code
- Use several activities
- Verify data in Supabase tables
- Open dashboard, verify student appears with correct stats

**Step 3: Test responsive design**

- Test at 375px width (phone)
- Test at 768px width (tablet)
- Verify all activities are usable on touch devices

**Step 4: Clean up old file**

Decide whether to archive or delete `early-republic-study-tool.html`. The content is now in `study-tools/units/early-republic/config.json`.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: final testing and cleanup"
```

---

## Task Dependency Order

```
Phase 1 (sequential):
  Task 1 -> Task 2 -> Task 3 -> Task 4 -> Task 5

Phase 2 (parallel after Phase 1):
  Task 6, 7, 8, 9, 10 (all independent)

Phase 3 (parallel after Phase 1):
  Task 11, 12, 13, 14, 15, 16, 17, 18 (all independent)

Phase 4 (after Phase 1):
  Task 19 (independent, after Phase 1)
  Task 20 (after Task 4)
  Task 21 (after Task 20)

Phase 5 (after all others):
  Task 22, 23, 24
```
