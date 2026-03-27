# Learn Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a guided study activity that orchestrates existing vocabulary, questions, and textbook content into an adaptive slide-based learning flow with pre/post assessments, tiered explanations, student reflections, and a 1.5x points incentive.

**Architecture:** Single activity file (`learn-mode.js`) registered via `StudyEngine.registerActivity()`. Reads from existing config data (vocabulary, practiceQuestions, fillInBlankSentences) and fetches textbook.json for Key Idea cards. All adaptive state stored in localStorage via ProgressManager. Engine modifications for custom daily cap (30 min) and points multiplier (1.5x).

**Tech Stack:** Vanilla JS, DOM creation methods (no innerHTML), localStorage, existing engine patterns.

**Spec:** `docs/plans/2026-03-26-learn-mode-design.md`

---

## Stage 1: Core Activity Shell + Engine Changes

### Task 1.1: Create learn-mode.js with activity registration and setup screen

**Files:**
- Create: `study-tools/engine/js/activities/learn-mode.js`
- Modify: `study-tools/units/westward-expansion/config.json` (add to activities array)
- Modify: `study-tools/engine/js/core/mastery.js` (add to alwaysAccessible)

- [ ] **Step 1: Create learn-mode.js skeleton**

Register the activity with the engine. Include the setup screen with three mode buttons (By Category, Full Unit, Smart Review). Use DOM creation methods only.

Activity registration:
```javascript
StudyEngine.registerActivity({
    id: 'learn-mode',
    name: 'Learn Mode',
    icon: 'fas fa-brain',
    description: 'Guided study sessions that teach, test, and adapt to how you learn',
    category: 'study',
    requires: ['vocabulary', 'practiceQuestions', 'fillInBlankSentences'],
    // ... render, internal state, methods
});
```

The `render(container, config)` method should:
1. Store container and config references
2. Check for missing data (vocabulary, practiceQuestions, fillInBlankSentences). If any are empty/missing, show friendly message: "Not enough content for Learn Mode yet." and return
3. Fetch textbook.json asynchronously (store result, graceful failure if fetch fails)
4. Show setup screen

Setup screen layout:
- Title: "Learn Mode" with brain icon
- Subtitle: "Choose how you want to study"
- Three mode cards:
  - **By Category**: shows each unlocked category name with mastery % from MasteryManager
  - **Full Unit**: "Work through all categories in order"
  - **Smart Review**: "Focus on what you need most" (disabled with message if no prior session data)

When student picks a mode:
- Category mode: show category picker (list of unlocked categories with mastery %)
- Full Unit: proceed to pre-assessment
- Smart Review: use algorithm from spec (terms wrong in last session > never seen > Tier 1 > flashcard weak list). If no data, redirect to category picker with message.

- [ ] **Step 2: Add learn-mode to westward-expansion config**

Add `"learn-mode"` to the activities array in config.json. Place it first in the list (before flashcards) since it's the primary study mode.

- [ ] **Step 3: Add learn-mode to alwaysAccessible in mastery.js**

In `study-tools/engine/js/core/mastery.js`, find the `alwaysAccessible` array at line ~140 and add `'learn-mode'`.

- [ ] **Step 4: Test**

Open westward-expansion unit, verify Learn Mode appears in the Study section. Click it, verify setup screen shows with three mode options. Smart Review should show disabled state for first-time users.

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/js/activities/learn-mode.js study-tools/units/westward-expansion/config.json study-tools/engine/js/core/mastery.js
git commit -m "feat: add Learn Mode activity shell with setup screen"
```

### Task 1.2: Engine changes for 30-min cap and 1.5x multiplier

**Files:**
- Modify: `study-tools/engine/js/core/app.js` (ActivityTimer methods)

- [ ] **Step 1: Add per-activity cap override**

In `ActivityTimer`, add a method to get the cap for the current activity:

```javascript
_getActivityCapMs(activityId) {
    if (activityId === 'learn-mode') return 30 * 60 * 1000; // 30 min
    return this.DAILY_ACTIVITY_CAP_MS; // 15 min default
},
```

Update `_isActivityCappedToday()` and `_getActivityTodayMs()` to use this method instead of the constant `DAILY_ACTIVITY_CAP_MS`.

Update `_checkActivityCap()`:
- Replace `var capMs = this.DAILY_ACTIVITY_CAP_MS;` with `var capMs = this._getActivityCapMs(this._activityId);`
- The 80% warning and 100% cap will now use the correct cap per activity

- [ ] **Step 2: Add points multiplier**

In `_addCappedStudyTime()`, after calculating `credited` (the capped real time), apply the multiplier BEFORE passing to `ProgressManager.addStudyTime()`:

```javascript
var credited = Math.min(ms, remaining);
// Apply points multiplier for learn-mode
if (activityId === 'learn-mode') {
    credited = Math.round(credited * 1.5);
}
if (credited > 0) {
    ProgressManager.addStudyTime(unitId, credited);
}
```

The cap check still uses raw `data.ms` (real wall-clock time), but credited points are multiplied.

- [ ] **Step 3: Update cap banner text to be activity-aware**

In `_showCapBanner()`, replace the hardcoded "15 min daily limit" text:

```javascript
var capMinutes = Math.round(self._getActivityCapMs(self._activityId) / 60000);
text.textContent = 'No more points available on ' + actName + ' today (' + capMinutes + ' min daily limit per activity)...';
```

- [ ] **Step 4: Update cap warning toast to use correct time**

In `_checkActivityCap()`, update the 80% warning message to calculate remaining minutes from the actual cap:

```javascript
var remainingMin = Math.round((capMs - todayMs) / 60000);
StudyUtils.showToast(prefix + 'heads up! You have about ' + remainingMin + ' minutes of point-earning time left on ' + actName + '...', 'info', 10000);
```

- [ ] **Step 5: Test**

Open Learn Mode, verify the activity timer starts. Check that the cap warning mentions 30 minutes (not 15). Verify other activities still show 15-min cap.

- [ ] **Step 6: Commit**

```bash
git add study-tools/engine/js/core/app.js
git commit -m "feat: add 30-min cap and 1.5x multiplier for Learn Mode"
```

---

## Stage 2: Card Rendering

### Task 2.1: Build Term Card component

**Files:**
- Modify: `study-tools/engine/js/activities/learn-mode.js`

- [ ] **Step 1: Add _buildTermCard(term) method**

Builds a slide element for a vocabulary term. Layout:
- Unit theme gradient background
- Category label (small, uppercase)
- Term name (large, bold)
- Explanation text (Tier 1: simpleExplanation, Tier 2: definition + example, Tier 3: keyIdea + connection prompt)
- Image (if term has imageUrl, show it floated right)
- "Got it" button to advance

The method takes the vocab term object and the current tier (1, 2, or 3) and renders accordingly.

**Tier rendering:**
- Tier 1: show `term.simpleExplanation`
- Tier 2: show `term.definition` as main text, then "For example: " + `term.example` below
- Tier 3: show textbook keyIdea for this term's section + "How does this connect to [related term]?"

- [ ] **Step 2: Commit**

```bash
git add study-tools/engine/js/activities/learn-mode.js
git commit -m "feat: add Term Card component for Learn Mode"
```

### Task 2.2: Build Key Idea Card component

**Files:**
- Modify: `study-tools/engine/js/activities/learn-mode.js`

- [ ] **Step 1: Add _buildKeyIdeaCard(section) method**

Takes a textbook section object (from textbook.json). Layout:
- Dark background
- "Key Idea" label
- Section heading (small, colored)
- keyIdea text (larger, prominent)
- vocabTerms as tag chips at bottom
- Tap to continue

If textbook data was not loaded (fetch failed), this method returns null and the sequencer skips Key Idea cards.

- [ ] **Step 2: Commit**

```bash
git add study-tools/engine/js/activities/learn-mode.js
git commit -m "feat: add Key Idea Card component for Learn Mode"
```

### Task 2.3: Build MC Question Card component

**Files:**
- Modify: `study-tools/engine/js/activities/learn-mode.js`

- [ ] **Step 1: Add _buildMCCard(question) method**

Takes a practiceQuestion object. Layout:
- Dark background
- "Quick Check" label
- Question text
- 4 option buttons (styled as cards/pills)
- On click: highlight selected, show correct/incorrect feedback
- Wrong: show explanation text, mark related terms for re-teaching
- Right: brief green highlight, auto-advance after 1 second
- Returns result object: { correct: boolean, questionIndex: number }

- [ ] **Step 2: Commit**

```bash
git add study-tools/engine/js/activities/learn-mode.js
git commit -m "feat: add MC Question Card component for Learn Mode"
```

### Task 2.4: Build Fill-in-Blank Card component

**Files:**
- Modify: `study-tools/engine/js/activities/learn-mode.js`

- [ ] **Step 1: Add _buildFIBCard(sentence) method**

Takes a fillInBlankSentence object. Layout:
- Dark gradient background
- "Fill in the Blank" label
- Sentence with blank shown as underlined space
- 3-4 word chips: correct answer + distractors
- Distractors: other vocab term names from the same category, matched by approximate word count (single-word answers get single-word distractors, multi-word get multi-word)
- On tap: highlight selection, show correct/incorrect
- Returns result object

**Distractor selection logic:**
```javascript
_getDistractors(correctAnswer, category, count) {
    var correctWords = correctAnswer.split(' ').length;
    var sameCategory = this._config.vocabulary
        .filter(v => v.category === category && v.term !== correctAnswer);
    // Sort by word-count similarity to correct answer
    sameCategory.sort((a, b) => {
        var aDiff = Math.abs(a.term.split(' ').length - correctWords);
        var bDiff = Math.abs(b.term.split(' ').length - correctWords);
        return aDiff - bDiff;
    });
    // Take top N, shuffle
    return shuffle(sameCategory.slice(0, count)).map(v => v.term);
}
```

- [ ] **Step 2: Commit**

```bash
git add study-tools/engine/js/activities/learn-mode.js
git commit -m "feat: add Fill-in-Blank Card component for Learn Mode"
```

### Task 2.5: Slide container and transitions

**Files:**
- Modify: `study-tools/engine/js/activities/learn-mode.js`
- Modify: `study-tools/engine/css/styles.css` (add Learn Mode CSS)

- [ ] **Step 1: Add slide container and progress bar**

Build the main Learn Mode UI shell:
- Progress bar at top (current slide / total slides)
- Slide container (holds one card at a time)
- Slide transition: fade or horizontal slide animation (CSS transitions)
- Navigation: "Got it" / "Continue" button advances, no back button (prevents gaming)

- [ ] **Step 2: Add CSS for Learn Mode cards**

Add styles for `.lm-slide-container`, `.lm-term-card`, `.lm-keyidea-card`, `.lm-mc-card`, `.lm-fib-card`, `.lm-progress-bar`, slide transitions, responsive layout for mobile.

Use the unit's theme colors via CSS custom properties (already set by applyTheme).

- [ ] **Step 3: Commit**

```bash
git add study-tools/engine/js/activities/learn-mode.js study-tools/engine/css/styles.css
git commit -m "feat: add slide container, transitions, and Learn Mode CSS"
```

---

## Stage 3: Session Flow & Sequencing

### Task 3.1: Pre-assessment flow

**Files:**
- Modify: `study-tools/engine/js/activities/learn-mode.js`

- [ ] **Step 1: Add _runPreAssessment(scope) method**

`scope` is either a single category name, an array of unlocked categories (full unit), or the smart review term list.

Logic:
1. Build question pool: filter practiceQuestions and fillInBlankSentences to match scope
2. Exclude "Connections" topic unless all categories are mastered (check via MasteryManager)
3. Ensure at least 1 question from every topic area in scope
4. Shuffle the pool
5. Present questions one at a time using MC Card and FIB Card components
6. Track correct/wrong per topic
7. Adaptive stopping: stop if 3+ consecutive wrong (to avoid frustration), or after confident coverage of all topics (min 1 per topic, typically 5-8 total)
8. Store results: `{ scores: { topic: { correct, total } }, questionsUsed: [indices], timestamp }`
9. Show brief results screen: "You know X% of this material. Let's learn the rest!"
10. Transition to learning flow

- [ ] **Step 2: Commit**

```bash
git add study-tools/engine/js/activities/learn-mode.js
git commit -m "feat: add adaptive pre-assessment for Learn Mode"
```

### Task 3.2: Slide sequencer

**Files:**
- Modify: `study-tools/engine/js/activities/learn-mode.js`

- [ ] **Step 1: Add _buildSlideSequence(scope, preResults) method**

Takes the study scope and pre-assessment results. Builds an ordered array of slide objects.

Sequencing algorithm:
1. Get terms for scope (filtered by mastery gating)
2. Deprioritize terms the student got right in pre-assessment (push to end, not removed)
3. Group terms by textbook section (using vocabTerms arrays)
4. For each group of 2-3 terms:
   a. Add Term Card slides for each term (at appropriate tier)
   b. Add 1 MC or FIB question related to those terms
   c. Add 1 Key Idea card from the textbook section (if textbook loaded)
5. Interleave reflection prompts every 5-7 slides
6. Total: ~15-25 slides for a category, ~60-80 for full unit

Each slide object: `{ type: 'term'|'keyidea'|'mc'|'fib'|'reflection', data: {...}, tier: 1|2|3 }`

- [ ] **Step 2: Add _advanceSlide() method**

Called when student completes a slide. Logic:
- Record result if it was a question card
- If wrong answer: flag the term for re-teaching (insert a Tier 2 term card later in the sequence)
- Increment slide index
- If more slides: render next slide
- If no more slides: transition to post-assessment

- [ ] **Step 3: Commit**

```bash
git add study-tools/engine/js/activities/learn-mode.js
git commit -m "feat: add slide sequencer with learn/test interleaving"
```

### Task 3.3: Post-assessment and growth screen

**Files:**
- Modify: `study-tools/engine/js/activities/learn-mode.js`

- [ ] **Step 1: Add _runPostAssessment() method**

Same logic as pre-assessment but:
- Draws from the same question pool
- Excludes questions used in the pre-assessment (tracked via questionsUsed array)
- If not enough unique questions remain (small pool), allow reuse but note it
- Deliberately includes questions from topics the student got wrong in pre-assessment

- [ ] **Step 2: Add _showGrowthScreen(preResults, postResults) method**

Layout:
- "Session Complete!" heading
- Side-by-side bars: "Before: X% → After: Y%"
- Per-topic breakdown (only topics that were studied)
- Encouraging message based on improvement
- Reflection count if any were captured
- "Study Again" and "Back to Home" buttons

Save session to ProgressManager: `learn-mode-sessions` array with `{ date, mode, category, preScore, postScore, termsLearned, reflectionCount }`.

- [ ] **Step 3: Commit**

```bash
git add study-tools/engine/js/activities/learn-mode.js
git commit -m "feat: add post-assessment and growth screen"
```

### Task 3.4: Session persistence

**Files:**
- Modify: `study-tools/engine/js/activities/learn-mode.js`

- [ ] **Step 1: Add session save/restore**

On each slide advance, save current session state to ProgressManager under key `learn-mode-current-session`:
```javascript
{
    mode: 'category'|'full'|'smart',
    category: 'Jackson\'s America',
    slideIndex: 12,
    preResults: { ... },
    questionsUsed: [3, 7, 15],
    tierOverrides: { 'spoils system': 2 },
    reflections: [ ... ],
    startedAt: timestamp,
    slideSequence: [ ... ] // the full sequence so it can be resumed
}
```

On `render()`, check for existing session. If found and less than 7 days old, offer "Resume session" or "Start fresh" choice. If older than 7 days, discard.

- [ ] **Step 2: Commit**

```bash
git add study-tools/engine/js/activities/learn-mode.js
git commit -m "feat: add session persistence for Learn Mode"
```

---

## Stage 4: Adaptive Depth

### Task 4.1: Tier tracking and transitions

**Files:**
- Modify: `study-tools/engine/js/activities/learn-mode.js`

- [ ] **Step 1: Add tier management**

Load tier state from ProgressManager key `learn-mode-tiers` (object mapping term names to tier numbers, default 1).

Tier transition logic in `_advanceSlide()`:
- When a question is answered **wrong**: find related terms, set their tier to `Math.max(current, 2)`
- When answered wrong on a term already at Tier 2: keep at Tier 2, but insert a re-test with a **different question format** (if MC was wrong, insert a FIB next, or vice versa)
- When answered **right**: mark term as "learning". If right again in next session, eligible for Tier 3
- Tier 3 cards are bonus/supplemental: shown after the main sequence for mastered terms

Save updated tiers to ProgressManager after each session.

- [ ] **Step 2: Add _getTermTier(termName) and _setTermTier(termName, tier) helpers**

- [ ] **Step 3: Update Term Card to render based on tier**

The `_buildTermCard` method already accepts a tier parameter. Ensure the sequencer passes the correct tier when building each slide.

- [ ] **Step 4: Commit**

```bash
git add study-tools/engine/js/activities/learn-mode.js
git commit -m "feat: add adaptive tier tracking and transitions"
```

---

## Stage 5: Student Voice

### Task 5.1: Reflection prompts

**Files:**
- Modify: `study-tools/engine/js/activities/learn-mode.js`

- [ ] **Step 1: Add _buildReflectionCard(prompt, context) method**

Layout:
- Calm/neutral background (not the test red or learn orange)
- Reflection icon (thought bubble or pencil)
- Prompt text (e.g., "What connection can you make between [term] and your life?")
- Text area (3-4 lines, placeholder: "Share your thoughts...")
- "Skip" link (small, secondary) and "Share & Continue" button (primary)
- Not scored; thank the student after sharing

Reflection prompts pool:
```javascript
_reflectionPrompts: [
    "What connection can you make between {term} and something in your life?",
    "What's still confusing about this topic?",
    "How would you explain {term} to a friend?",
    "What questions do you have for Mr. B about this?",
    "What surprised you about what you just learned?",
    "How does {term} connect to something else we've studied?"
]
```

The sequencer inserts a reflection slide every 5-7 content slides, picking a random prompt and filling in the `{term}` with the most recently taught term.

- [ ] **Step 2: Add Wonder button**

A small lightbulb icon button fixed in the bottom-right corner of every slide (except reflection slides). On click:
- Opens a small modal/drawer with text field: "What are you wondering right now?"
- Submit saves the reflection and closes the drawer
- Cancel closes without saving
- The slide flow is not interrupted

- [ ] **Step 3: Reflection storage**

Save reflections to ProgressManager key `learn-mode-reflections`:
```javascript
{
    text: "I wonder why Jackson ignored the Supreme Court",
    prompt: "What questions do you have for Mr. B about this?", // or "wonder" for wonder button
    term: "Worcester v. Georgia",
    topic: "Jackson's America",
    timestamp: 1711432800000,
    sessionDate: "2026-03-26"
}
```

Keep only last 50 in localStorage. If array exceeds 50, trim oldest entries.

- [ ] **Step 4: Commit**

```bash
git add study-tools/engine/js/activities/learn-mode.js
git commit -m "feat: add reflection prompts and wonder button"
```

---

## Stage 6: Points, Polish & Integration

### Task 6.1: Completion bonus

**Files:**
- Modify: `study-tools/engine/js/activities/learn-mode.js`

- [ ] **Step 1: Add completion bonus on growth screen**

When student reaches the post-assessment and the growth screen is shown:
- Check if a completion bonus has already been awarded today (store flag in localStorage: `learn-mode-bonus-{date}`)
- If not yet awarded: add 5 minutes (300000ms) to study time via `ProgressManager.addStudyTime()` (this bypasses the cap)
- Show a celebratory message: "Bonus: +5 min study time for completing a Learn Mode session!"
- Set the daily flag so it can't be farmed

- [ ] **Step 2: Commit**

```bash
git add study-tools/engine/js/activities/learn-mode.js
git commit -m "feat: add daily completion bonus for Learn Mode"
```

### Task 6.2: CSS polish and responsive design

**Files:**
- Modify: `study-tools/engine/css/styles.css`

- [ ] **Step 1: Polish card styles**

Ensure all 4 card types + reflection cards look good in:
- Dark mode (using unit's bgDeep/bgCard custom properties)
- Light mode
- Mobile viewport (cards stack, buttons are touch-friendly, text is readable)
- Dyslexic font mode

Add slide transition animation (subtle fade or horizontal slide, 200-300ms).

Progress bar should be sticky at top, thin (4px), colored with unit primary color.

Wonder button should be fixed position, not overlapping card content.

- [ ] **Step 2: Commit**

```bash
git add study-tools/engine/css/styles.css
git commit -m "feat: polish Learn Mode CSS for dark/light mode and mobile"
```

### Task 6.3: Version bump and final testing

**Files:**
- Modify: `study-tools/engine/version.json`

- [ ] **Step 1: Test full Learn Mode flow**

1. Open westward-expansion unit
2. Click Learn Mode
3. Choose "By Category" → pick "Jackson's America"
4. Complete pre-assessment (answer some right, some wrong)
5. Go through learning slides (verify term cards, key ideas, MC, FIB interleave correctly)
6. Verify wrong answers trigger Tier 2 re-teaching
7. Verify reflection prompt appears after ~5-7 slides
8. Test Wonder button on any slide
9. Complete post-assessment
10. Verify growth screen shows before/after comparison
11. Verify session saved (check localStorage)
12. Re-open Learn Mode, verify "Resume session" prompt
13. Verify 1.5x points multiplier (check leaderboard/dashboard)
14. Verify 30-min cap warning (fast-forward timer or check logic)
15. Test on mobile viewport
16. Test in dark mode and light mode
17. Verify early-republic unit is unaffected

- [ ] **Step 2: Bump version**

```bash
git add study-tools/engine/version.json
git commit -m "chore: bump version for Learn Mode launch"
```

---

## Deferred to v2

- Image analysis cards (from source analysis data)
- True/False cards (generated from definitions)
- Matching/sorting cards
- My Study Guide integration (displaying reflections and session history)
- Teacher dashboard integration (reflections view, session analytics)
- Custom `scaffoldedExplanation` field for terms where Tier 2 auto-derivation is poor
- Supabase sync for reflections (currently localStorage only)
- Enable for early-republic unit (just add "learn-mode" to its activities array)
