# Progressive Mastery-Gating Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Gate all games and practice activities behind flashcard mastery, unlock content in category-based stages, add a monkeytype-style typing practice activity, and create a reusable system for future units.

**Architecture:** A new `MasteryManager` module sits between `ProgressManager` (data) and `StudyEngine` (UI). It reads flashcard mastery data, determines which categories are unlocked, and provides filtered vocabulary/questions to all activities. Activities call `MasteryManager.getUnlockedVocabulary()` instead of reading `config.vocabulary` directly. A new typing-practice activity provides contextual reading alongside flashcards.

**Tech Stack:** Vanilla JS (no frameworks), localStorage via ProgressManager, CSS custom properties for theming.

---

## Key Discovery: Existing Data Patterns

- `practiceQuestions` already have a `topic` field that maps to vocabulary categories
- `shortAnswerQuestions` already have a `topic` field
- `fillInBlankSentences` do NOT have a topic/category field (needs adding)
- Some questions use topic "Connections" which spans multiple categories (unlock when all categories are mastered)
- Vocabulary categories in early-republic: "Washington's First Decisions" (13), "Political Parties Are Born" (8), "Exploring & Growing" (14), "War & National Pride" (11)
- Category order is implicit in the vocabulary array order

---

### Task 1: Create MasteryManager Module

**Files:**
- Create: `study-tools/engine/js/core/mastery.js`

**Step 1: Create mastery.js with core unlock logic**

```javascript
const MasteryManager = {
    // Returns ordered list of category names from config
    getCategories(config) {
        const seen = [];
        (config.vocabulary || []).forEach(v => {
            if (v.category && !seen.includes(v.category)) {
                seen.push(v.category);
            }
        });
        return seen;
    },

    // Check if a specific category is mastered (all terms marked in flashcards)
    isCategoryMastered(unitId, config, categoryName) {
        const flashcardProgress = ProgressManager.getActivityProgress(unitId, 'flashcards');
        const mastered = flashcardProgress?.mastered || [];
        const categoryTerms = (config.vocabulary || [])
            .filter(v => v.category === categoryName)
            .map(v => v.term);
        return categoryTerms.length > 0 && categoryTerms.every(t => mastered.includes(t));
    },

    // Returns list of unlocked category names
    // Category 1 is always unlocked. Each subsequent category unlocks when the previous is mastered.
    getUnlockedCategories(unitId, config) {
        const categories = this.getCategories(config);
        const unlocked = [];
        for (let i = 0; i < categories.length; i++) {
            if (i === 0) {
                unlocked.push(categories[i]);
            } else if (this.isCategoryMastered(unitId, config, categories[i - 1])) {
                unlocked.push(categories[i]);
            } else {
                break;
            }
        }
        return unlocked;
    },

    // Returns vocabulary filtered to unlocked categories only
    getUnlockedVocabulary(unitId, config) {
        const unlocked = this.getUnlockedCategories(unitId, config);
        return (config.vocabulary || []).filter(v => unlocked.includes(v.category));
    },

    // Returns practice questions filtered to unlocked categories
    // "Connections" topic unlocks when ALL categories are mastered
    getUnlockedQuestions(unitId, config, questionsKey) {
        const unlocked = this.getUnlockedCategories(unitId, config);
        const allCategories = this.getCategories(config);
        const allMastered = allCategories.every(cat => this.isCategoryMastered(unitId, config, cat));
        const questions = config[questionsKey] || [];
        return questions.filter(q => {
            const topic = q.topic || q.category;
            if (!topic) return allMastered;
            if (topic === 'Connections') return allMastered;
            return unlocked.includes(topic);
        });
    },

    // Returns fill-in-blank sentences filtered by matching answer to unlocked vocabulary terms
    getUnlockedFillInBlanks(unitId, config) {
        const unlockedVocab = this.getUnlockedVocabulary(unitId, config);
        const unlockedTerms = unlockedVocab.map(v => v.term.toLowerCase());
        return (config.fillInBlankSentences || []).filter(s => {
            return unlockedTerms.includes(s.answer.toLowerCase());
        });
    },

    // Get total and unlocked counts for display
    getUnlockStatus(unitId, config) {
        const categories = this.getCategories(config);
        const unlocked = this.getUnlockedCategories(unitId, config);
        const totalVocab = (config.vocabulary || []).length;
        const unlockedVocab = this.getUnlockedVocabulary(unitId, config).length;
        return {
            categories,
            unlockedCategories: unlocked,
            totalVocab,
            unlockedVocab,
            allUnlocked: unlocked.length === categories.length && this.isCategoryMastered(unitId, config, categories[categories.length - 1])
        };
    },

    // Get the next category to unlock (or null if all unlocked)
    getNextLockedCategory(unitId, config) {
        const categories = this.getCategories(config);
        const unlocked = this.getUnlockedCategories(unitId, config);
        if (unlocked.length < categories.length) {
            return categories[unlocked.length];
        }
        return null;
    },

    // Show a nudge toast when a category is mastered
    showMasteryNudge(config, masteredCategory) {
        const categories = this.getCategories(config);
        const idx = categories.indexOf(masteredCategory);
        const nextCategory = idx < categories.length - 1 ? categories[idx + 1] : null;

        let message;
        if (nextCategory) {
            message = 'Nice work! You\'ve mastered "' + masteredCategory + '"! Ready for the next challenge? Head to Flashcards to start learning about "' + nextCategory + '."';
        } else {
            message = 'You\'ve mastered all the vocabulary! Every activity is now unlocked. Go crush it!';
        }

        StudyUtils.showToast(message, 'success', 5000);
    },

    // Check if an activity should be accessible
    isActivityAccessible(unitId, config, activityId) {
        const studyActivities = ['flashcards', 'typing-practice'];
        if (studyActivities.includes(activityId)) return true;

        const categories = this.getCategories(config);
        return categories.length > 0 && this.isCategoryMastered(unitId, config, categories[0]);
    },

    // Get lock message for an activity
    getLockMessage(unitId, config) {
        const categories = this.getCategories(config);
        if (categories.length === 0) return '';
        return 'Master "' + categories[0] + '" flashcards to unlock';
    }
};
```

**Step 2: Add mastery.js script tag to engine/index.html**

Add after progress.js, before app.js:
```html
<script src="js/core/mastery.js"></script>
```

**Step 3: Commit**
```bash
git add study-tools/engine/js/core/mastery.js study-tools/engine/index.html
git commit -m "feat: add MasteryManager module for category-based content gating"
```

---

### Task 2: Modify Flashcards — Require Flip Before Mastering

**Files:**
- Modify: `study-tools/engine/js/activities/flashcards.js`

**Step 1: Full replacement of flashcards.js**

Key changes from original:
1. Added `_hasFlipped: false` state
2. Flashcards filtered to unlocked categories via `MasteryManager.getUnlockedVocabulary()`
3. Master button disabled until card is flipped — shows "Flip card first"
4. After mastering, checks if category is now complete and fires nudge
5. Category filter only shows unlocked categories
6. Added mastery progress bar at top

See design doc for full rationale. The complete updated file replaces the existing one entirely.

**Step 2: Commit**
```bash
git add study-tools/engine/js/activities/flashcards.js
git commit -m "feat: require flip before mastering, integrate category gating in flashcards"
```

---

### Task 3: Integrate Gating into App Navigation

**Files:**
- Modify: `study-tools/engine/js/core/app.js`

**Step 1: Update `showSubNav` card rendering (lines 155-177)**

For each activity card, check `MasteryManager.isActivityAccessible()`. If locked: show lock icon, grey out, disable click. If unlocked but not all terms available: show "X/Y terms available" badge.

**Step 2: Add guard at top of `activateActivity` (line 183)**

```javascript
if (!MasteryManager.isActivityAccessible(this.config.unit.id, this.config, activityId)) {
    StudyUtils.showToast(MasteryManager.getLockMessage(this.config.unit.id, this.config), 'info');
    return;
}
```

**Step 3: Commit**
```bash
git add study-tools/engine/js/core/app.js
git commit -m "feat: integrate mastery gating into activity navigation and cards"
```

---

### Task 4: Update All Game Activities to Use Unlocked Vocabulary

**Files to modify (each with a small change — replace `config.vocabulary` access):**

| File | Line | Change |
|------|------|--------|
| `wordle.js` | 25 | `config.vocabulary` -> `MasteryManager.getUnlockedVocabulary(config.unit.id, config)` |
| `hangman.js` | 156 | `this._config.vocabulary` -> `MasteryManager.getUnlockedVocabulary(this._config.unit.id, this._config)` |
| `flip-match.js` | 130 | `this._config.vocabulary` -> `MasteryManager.getUnlockedVocabulary(this._config.unit.id, this._config)` |
| `typing-race.js` | 130 | `this._config.vocabulary` -> `MasteryManager.getUnlockedVocabulary(this._config.unit.id, this._config)` |
| `lightning-round.js` | 254 | `this._config.vocabulary` -> `MasteryManager.getUnlockedVocabulary(this._config.unit.id, this._config)` |
| `term-catcher.js` | 209 | `this._config.vocabulary` -> `MasteryManager.getUnlockedVocabulary(this._config.unit.id, this._config)` |
| `crossword.js` | 31 | `config.vocabulary` -> `MasteryManager.getUnlockedVocabulary(config.unit.id, config)` |
| `category-sort.js` | 37 | `config.vocabulary` -> `MasteryManager.getUnlockedVocabulary(config.unit.id, config)` |

**Important:** Some activities store config as `this._config` in render and reference vocabulary later. For those, change at the point of vocabulary access. For others that access `config.vocabulary` directly in render, change it there. Read each file before editing.

**Step 2: Commit**
```bash
git add study-tools/engine/js/activities/*.js
git commit -m "feat: filter all game activities to use only unlocked vocabulary"
```

---

### Task 5: Update Practice Activities to Use Unlocked Questions

**Files:**
- `study-tools/engine/js/activities/practice-test.js` — line 28
- `study-tools/engine/js/activities/short-answer.js` — line 10
- `study-tools/engine/js/activities/fill-in-blank.js` — line 24

**Changes:**

**practice-test.js line 28:**
```javascript
// FROM:
this._questions = this._shuffleArray((config.practiceQuestions || []).slice());
// TO:
this._questions = this._shuffleArray(MasteryManager.getUnlockedQuestions(config.unit.id, config, 'practiceQuestions').slice());
```

**short-answer.js line 10:**
```javascript
// FROM:
this.questions = config.shortAnswerQuestions || [];
// TO:
this.questions = MasteryManager.getUnlockedQuestions(config.unit.id, config, 'shortAnswerQuestions');
```

**fill-in-blank.js line 24:**
```javascript
// FROM:
const sentences = config.fillInBlankSentences;
// TO:
const sentences = MasteryManager.getUnlockedFillInBlanks(config.unit.id, config);
```

**Commit:**
```bash
git add study-tools/engine/js/activities/practice-test.js study-tools/engine/js/activities/short-answer.js study-tools/engine/js/activities/fill-in-blank.js
git commit -m "feat: filter practice activities to use only unlocked questions"
```

---

### Task 6: Add Locked Card Styles and Typing Practice Styles

**Files:**
- Modify: `study-tools/engine/css/styles.css`
- Modify: `study-tools/engine/js/core/utils.js`

**Step 1: Append CSS to end of styles.css**

```css
/* --- Mastery Gating --- */

.activity-card.locked {
    opacity: 0.6;
    cursor: not-allowed;
    position: relative;
    filter: grayscale(30%);
}

.activity-card.locked:hover {
    transform: none;
    box-shadow: none;
}

.activity-card.locked .card-button {
    background: #999;
    cursor: not-allowed;
}

.unlock-count {
    font-size: 0.8rem;
    color: var(--primary);
    font-weight: 600;
    margin-top: 4px;
    padding: 4px 10px;
    background: rgba(22, 105, 197, 0.08);
    border-radius: 12px;
    display: inline-block;
}

.mastery-progress-bar {
    text-align: center;
    margin-bottom: 16px;
    font-size: 0.9rem;
    color: #666;
}

.mastery-progress-bar .progress-bar {
    margin-top: 6px;
    max-width: 300px;
    margin-left: auto;
    margin-right: auto;
}

/* --- Typing Practice --- */

.typing-container {
    max-width: 800px;
    margin: 0 auto;
}

.typing-passage-display {
    font-size: 1.2rem;
    line-height: 2;
    padding: 24px;
    background: #f8f9fa;
    border-radius: 12px;
    margin-bottom: 20px;
    min-height: 150px;
    font-family: var(--font-body);
}

.typing-passage-display .word {
    display: inline;
    padding: 2px 0;
    border-radius: 3px;
    transition: background 0.15s;
}

.typing-passage-display .word.current {
    background: rgba(22, 105, 197, 0.15);
    border-bottom: 2px solid var(--primary);
}

.typing-passage-display .word.correct {
    color: #22c55e;
}

.typing-passage-display .word.incorrect {
    color: #ef4444;
    text-decoration: underline;
}

.typing-passage-display .word.vocab-term {
    font-weight: 700;
    color: var(--primary);
}

.typing-passage-display .word.vocab-term.correct {
    color: #22c55e;
    font-weight: 700;
}

.typing-passage-display .word.vocab-term.incorrect {
    color: #ef4444;
    font-weight: 700;
}

.typing-input-area {
    width: 100%;
    padding: 16px;
    font-size: 1.2rem;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    font-family: var(--font-body);
    outline: none;
    transition: border-color 0.2s;
}

.typing-input-area:focus {
    border-color: var(--primary);
}

.typing-stats {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin: 16px 0;
    font-size: 0.95rem;
}

.typing-stat {
    display: flex;
    align-items: center;
    gap: 6px;
}

.typing-stat-value {
    font-weight: 700;
    color: var(--primary);
}

.typing-category-select {
    text-align: center;
    margin-bottom: 20px;
}
```

**Step 2: Update showToast in utils.js to accept duration parameter**

Add `duration` as third parameter with default 3000ms.

**Step 3: Commit**
```bash
git add study-tools/engine/css/styles.css study-tools/engine/js/core/utils.js
git commit -m "feat: add locked card styles, typing practice styles, mastery progress UI"
```

---

### Task 7: Create Typing Practice Activity

**Files:**
- Create: `study-tools/engine/js/activities/typing-practice.js`

**Step 1: Create the monkeytype-style typing practice activity**

Key features:
- Category selector showing only unlocked categories
- Passage displayed word-by-word, current word highlighted
- Vocabulary terms rendered in bold/primary color
- Input field — press space/enter to submit each word
- WPM and accuracy tracking
- Lenient matching (ignoring trailing punctuation, case-insensitive)
- Completion tracking per category with checkmarks
- Progress saved via ProgressManager

The activity registers with `StudyEngine.registerActivity()` following the same plugin interface pattern as all other activities.

**Step 2: Commit**
```bash
git add study-tools/engine/js/activities/typing-practice.js
git commit -m "feat: add monkeytype-style typing practice activity"
```

---

### Task 8: Add Typing Passages and Category Tags to Config

**Files:**
- Modify: `study-tools/units/early-republic/config.json`

**Step 1: Add `"typing-practice"` to the activities array (after "flashcards")**

**Step 2: Add `typingPassages` array with one passage per category**

Each passage: ~200-300 words, 8th grade reading level, vocabulary terms used naturally in context. Four passages total for the four categories.

**Step 3: Add `"category"` field to each `fillInBlankSentences` entry**

Map each sentence's answer to its vocabulary term's category:
- Inauguration, Cabinet, Precedent, National Bank, Tariff, Whiskey Rebellion -> "Washington's First Decisions"
- Strict Construction, Loose Construction -> "Political Parties Are Born"
- Marbury v. Madison, Louisiana Purchase, Sacagawea, Impressment, Embargo Act -> "Exploring & Growing"
- Nationalism, Monroe Doctrine -> "War & National Pride"

**Step 4: Commit**
```bash
git add study-tools/units/early-republic/config.json
git commit -m "feat: add typing passages, category tags on fill-in-blanks"
```

---

### Task 9: Script Loading Order in index.html

**Files:**
- Modify: `study-tools/engine/index.html`

**Step 1: Ensure mastery.js loads after progress.js but before app.js**

```html
<script src="js/core/mastery.js"></script>
```

**Step 2: Commit**
```bash
git add study-tools/engine/index.html
git commit -m "feat: add mastery.js to script loading order"
```

---

### Task 10: Manual Testing Checklist

1. **Fresh start (clear localStorage):**
   - Only Category 1 flashcards visible
   - Games/Practice show locked cards with lock icon
   - Typing Practice shows only Category 1 passage

2. **Flip-before-master:**
   - Master button says "Flip card first" and is disabled
   - After flipping, button becomes "Mark as Mastered"

3. **Category unlock flow:**
   - Master all 13 Category 1 terms
   - Nudge toast appears
   - Category 2 flashcards/typing now available
   - Games/Practice now unlocked with "13/46 terms available"

4. **Game filtering:**
   - Wordle only uses Category 1 terms
   - Crossword only uses Category 1 terms
   - Practice Test only shows Category 1 questions

5. **Typing Practice:**
   - Type words, see WPM/accuracy
   - Vocab terms appear bold
   - Completion saved with checkmark

6. **Full unlock:**
   - Master all categories
   - "Connections" questions appear
   - All games show full count
   - Celebration nudge

---

## Future Unit Guide

When creating a new unit config.json, follow this structure to enable mastery gating automatically:

### Required config.json fields:

```json
{
    "unit": {
        "id": "unit-slug",
        "title": "Unit Title",
        "subtitle": "...",
        "essentialQuestion": "...",
        "theme": { "primary": "#hex", "secondary": "#hex", "accent": "#hex" }
    },
    "activities": [
        "flashcards", "typing-practice",
        "practice-test", "short-answer", "fill-in-blank",
        "timeline", "category-sort", "source-analysis",
        "wordle", "hangman", "flip-match", "typing-race",
        "term-catcher", "lightning-round", "crossword"
    ],
    "vocabulary": [
        {
            "term": "Term Name",
            "definition": "Clear definition",
            "example": "Example in context",
            "category": "Category Name"
        }
    ],
    "typingPassages": [
        {
            "category": "Category Name",
            "title": "Passage Title",
            "passage": "200-300 word passage at 8th grade level with vocabulary terms used naturally."
        }
    ],
    "practiceQuestions": [
        {
            "question": "Question text?",
            "options": ["A", "B", "C", "D"],
            "correct": 0,
            "explanation": "Why correct",
            "topic": "Category Name"
        }
    ],
    "shortAnswerQuestions": [
        {
            "question": "Open-ended question",
            "topic": "Category Name",
            "rubric": ["Criteria 1"],
            "exemplar": "Model answer",
            "sentenceStarters": ["Start with..."]
        }
    ],
    "fillInBlankSentences": [
        {
            "sentence": "Sentence with ___ blank.",
            "answer": "Term Name",
            "category": "Category Name"
        }
    ],
    "timelineEvents": [
        { "id": 1, "title": "Event", "year": "YYYY", "description": "What happened" }
    ]
}
```

### Rules for content authors:

1. **Category order matters** — Categories unlock in the order they first appear in the vocabulary array. Put foundational concepts first.
2. **Every vocabulary term needs a `category`** — This is how the system groups and gates content.
3. **Every practice question needs a `topic`** — Must match a vocabulary category name exactly. Use "Connections" for cross-category questions (unlock last).
4. **Every fill-in-blank needs a `category`** — Must match the vocabulary category of the answer term.
5. **One typing passage per category** — ~200-300 words, 8th grade reading level, vocab terms used naturally.
6. **Typing passages should teach** — Explain terms in historical context, not just mention them.
7. **Timeline events don't need categories** — They unlock once the first category is mastered.
