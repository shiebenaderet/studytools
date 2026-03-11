# Nudge System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add smart activity suggestions on the home screen, post-activity nudge toasts, and missed-term tracking across all games.

**Architecture:** A centralized `NudgeManager` in `engine/js/core/nudge.js` reads existing progress data to suggest activities and track misses. No new storage keys, no DB changes. Games call `NudgeManager.trackMissedTerms()` on wrong answers.

**Tech Stack:** Vanilla JavaScript, CSS custom properties, existing `StudyUtils.showToast()`.

---

### Task 1: Create NudgeManager core module

**Files:**
- Create: `study-tools/engine/js/core/nudge.js`
- Modify: `study-tools/engine/index.html:85-88` (add script tag)

**Step 1: Create `nudge.js` with full implementation**

```js
// NudgeManager — smart activity suggestions and missed-term tracking
var NudgeManager = {

    // In-memory session state (resets on page reload)
    _sessionActivityCounts: {},
    _sessionNudgeCount: 0,
    _lastActivityId: null,
    MAX_NUDGES_PER_SESSION: 3,

    // Soft study flow order
    STUDY_FLOW: ['textbook', 'flashcards', 'fill-in-blank', 'typing-practice', 'practice-test'],

    // Activity metadata for suggestions
    ACTIVITY_INFO: {
        'textbook':         { icon: 'fas fa-book-open',       name: 'Textbook',          group: 'study' },
        'flashcards':       { icon: 'fas fa-graduation-cap',  name: 'Flashcards',        group: 'study' },
        'fill-in-blank':    { icon: 'fas fa-puzzle-piece',    name: 'Fill in the Blank', group: 'study' },
        'typing-practice':  { icon: 'fas fa-keyboard',        name: 'Typing Practice',   group: 'study' },
        'practice-test':    { icon: 'fas fa-pencil',          name: 'Practice Test',     group: 'practice' },
        'timeline':         { icon: 'fas fa-clock',           name: 'Timeline',          group: 'practice' },
        'wordle':           { icon: 'fas fa-th',              name: 'Wordle',            group: 'games' },
        'hangman':          { icon: 'fas fa-skull-crossbones',name: 'Hangman',           group: 'games' },
        'flip-match':       { icon: 'fas fa-clone',           name: 'Flip Match',        group: 'games' },
        'lightning-round':  { icon: 'fas fa-bolt',            name: 'Lightning Round',   group: 'games' },
        'crossword':        { icon: 'fas fa-border-all',      name: 'Crossword',         group: 'games' },
        'term-catcher':     { icon: 'fas fa-hand-paper',      name: 'Term Catcher',      group: 'games' },
        'tower-defense':    { icon: 'fas fa-chess-rook',      name: 'Tower Defense',     group: 'games' },
        'quiz-race':        { icon: 'fas fa-flag-checkered',  name: 'Quiz Race',         group: 'games' }
    },

    // --- Shared missed-term tracking ---

    /**
     * Track missed terms: increment weakness_tracker counts,
     * mark as 'again' in flashcard ratings, remove from mastered.
     * @param {string} unitId
     * @param {object} config - StudyEngine.config
     * @param {string[]} missedTermNames - array of term name strings
     */
    trackMissedTerms(unitId, config, missedTermNames) {
        if (!missedTermNames || missedTermNames.length === 0) return;
        var vocab = config.vocabulary || [];

        // Update weakness tracker
        var weakData = ProgressManager.load(unitId, 'weakness_tracker') || { terms: {} };
        for (var i = 0; i < missedTermNames.length; i++) {
            var termName = missedTermNames[i];
            // Normalize to exact vocab term name (case-insensitive match)
            for (var j = 0; j < vocab.length; j++) {
                if (vocab[j].term.toLowerCase() === termName.toLowerCase()) {
                    weakData.terms[vocab[j].term] = (weakData.terms[vocab[j].term] || 0) + 1;
                    break;
                }
            }
        }
        ProgressManager.save(unitId, 'weakness_tracker', weakData);

        // Update flashcard ratings and mastered list
        var fcProgress = ProgressManager.getActivityProgress(unitId, 'flashcards') || {};
        var mastered = fcProgress.mastered ? fcProgress.mastered.slice() : [];
        var ratings = fcProgress.ratings ? Object.assign({}, fcProgress.ratings) : {};
        var changed = false;

        for (var i = 0; i < missedTermNames.length; i++) {
            var termName = missedTermNames[i];
            for (var j = 0; j < vocab.length; j++) {
                if (vocab[j].term.toLowerCase() === termName.toLowerCase()) {
                    ratings[vocab[j].term] = 'again';
                    var mIdx = mastered.indexOf(vocab[j].term);
                    if (mIdx !== -1) {
                        mastered.splice(mIdx, 1);
                    }
                    changed = true;
                    break;
                }
            }
        }

        if (changed) {
            ProgressManager.saveActivityProgress(unitId, 'flashcards', {
                mastered: mastered,
                ratings: ratings
            });
        }
    },

    // --- Suggestion engine ---

    /**
     * Returns 1-2 activity suggestions based on student progress.
     * Priority: weak terms > study flow gaps > untried activities.
     */
    getSuggestions(config) {
        if (!config || !config.unit) return [];
        var unitId = config.unit.id;
        var suggestions = [];

        var weakCount = this._getWeakTermCount(unitId);
        var triedActivities = this._getTriedActivities(unitId);
        var fcProgress = ProgressManager.getActivityProgress(unitId, 'flashcards') || {};
        var masteredCount = fcProgress.mastered ? fcProgress.mastered.length : 0;
        var totalVocab = config.vocabulary ? config.vocabulary.length : 0;

        // Priority 1: Weak terms — suggest remediation
        if (weakCount > 0) {
            var remediation = this._pickRemediationActivity(unitId, triedActivities);
            if (remediation) {
                var info = this.ACTIVITY_INFO[remediation];
                suggestions.push({
                    activityId: remediation,
                    icon: info.icon,
                    name: info.name,
                    group: info.group,
                    reason: weakCount + ' term' + (weakCount > 1 ? 's' : '') + ' need' + (weakCount === 1 ? 's' : '') + ' review'
                });
            }
        }

        // Priority 2: Study flow gap — suggest skipped step
        if (suggestions.length < 2) {
            var flowGap = this._findFlowGap(unitId, triedActivities, masteredCount, totalVocab);
            if (flowGap && !suggestions.some(function(s) { return s.activityId === flowGap; })) {
                var info = this.ACTIVITY_INFO[flowGap];
                if (info) {
                    suggestions.push({
                        activityId: flowGap,
                        icon: info.icon,
                        name: info.name,
                        group: info.group,
                        reason: 'Next step in your study plan'
                    });
                }
            }
        }

        // Priority 3: Untried activities
        if (suggestions.length < 2) {
            var untried = this._getUntriedActivity(unitId, triedActivities, config);
            if (untried && !suggestions.some(function(s) { return s.activityId === untried; })) {
                var info = this.ACTIVITY_INFO[untried];
                if (info) {
                    suggestions.push({
                        activityId: untried,
                        icon: info.icon,
                        name: info.name,
                        group: info.group,
                        reason: 'You haven\'t tried this yet'
                    });
                }
            }
        }

        return suggestions;
    },

    _getWeakTermCount(unitId) {
        var weakData = ProgressManager.load(unitId, 'weakness_tracker');
        if (!weakData || !weakData.terms) return 0;
        // Count terms with count >= 2 (filter out one-time flukes)
        var count = 0;
        for (var term in weakData.terms) {
            if (weakData.terms[term] >= 2) count++;
        }
        return count;
    },

    _getTriedActivities(unitId) {
        var tried = {};
        var activities = Object.keys(this.ACTIVITY_INFO);
        for (var i = 0; i < activities.length; i++) {
            var progress = ProgressManager.getActivityProgress(unitId, activities[i]);
            if (progress) tried[activities[i]] = true;
        }
        // Also check mastery data for practice-test (stored under different key)
        var ptMastery = ProgressManager.getActivityProgress(unitId, 'practice-test-mastery');
        if (ptMastery && ptMastery.sessions > 0) tried['practice-test'] = true;
        return tried;
    },

    _pickRemediationActivity(unitId, triedActivities) {
        // Prefer: typing-practice (memorization) > fill-in-blank (context) > flashcards (review)
        var options = ['typing-practice', 'fill-in-blank', 'flashcards'];
        for (var i = 0; i < options.length; i++) {
            // Prefer activities they've already tried (lower friction)
            if (triedActivities[options[i]]) return options[i];
        }
        // If they haven't tried any, suggest flashcards (lowest barrier)
        return 'flashcards';
    },

    _findFlowGap(unitId, triedActivities, masteredCount, totalVocab) {
        // Don't suggest flow steps before flashcards are started
        if (masteredCount === 0) return 'flashcards';

        for (var i = 0; i < this.STUDY_FLOW.length; i++) {
            var activity = this.STUDY_FLOW[i];
            if (!triedActivities[activity]) {
                // Check if activity is accessible (mastery gating)
                if (typeof MasteryManager !== 'undefined' && typeof StudyEngine !== 'undefined' && StudyEngine.config) {
                    if (!MasteryManager.isActivityAccessible(unitId, StudyEngine.config, activity)) continue;
                }
                return activity;
            }
        }
        return null;
    },

    _getUntriedActivity(unitId, triedActivities, config) {
        // Suggest an untried activity that's accessible
        var activities = Object.keys(this.ACTIVITY_INFO);
        for (var i = 0; i < activities.length; i++) {
            var id = activities[i];
            if (triedActivities[id]) continue;
            if (typeof MasteryManager !== 'undefined') {
                if (!MasteryManager.isActivityAccessible(unitId, config, id)) continue;
            }
            // Check activity is registered
            if (typeof StudyEngine !== 'undefined' && StudyEngine.activities && !StudyEngine.activities[id]) continue;
            return id;
        }
        return null;
    },

    // --- Home screen rendering ---

    renderSuggestions(container, config) {
        // Remove existing suggestions section if present
        var existing = document.getElementById('nudge-suggestions');
        if (existing) existing.remove();

        var suggestions = this.getSuggestions(config);
        if (suggestions.length === 0) return;

        var section = document.createElement('div');
        section.id = 'nudge-suggestions';
        section.className = 'nudge-section';

        var title = document.createElement('h2');
        title.className = 'nudge-title';
        title.textContent = 'What to Do Next';
        section.appendChild(title);

        var grid = document.createElement('div');
        grid.className = 'nudge-grid';

        for (var i = 0; i < suggestions.length; i++) {
            var s = suggestions[i];
            var card = document.createElement('button');
            card.className = 'nudge-card';
            card.dataset.group = s.group;
            card.dataset.activity = s.activityId;

            var iconEl = document.createElement('i');
            iconEl.className = s.icon + ' nudge-card-icon';
            card.appendChild(iconEl);

            var textDiv = document.createElement('div');
            textDiv.className = 'nudge-card-text';

            var nameEl = document.createElement('div');
            nameEl.className = 'nudge-card-name';
            nameEl.textContent = s.name;
            textDiv.appendChild(nameEl);

            var reasonEl = document.createElement('div');
            reasonEl.className = 'nudge-card-reason';
            reasonEl.textContent = s.reason;
            textDiv.appendChild(reasonEl);

            card.appendChild(textDiv);

            var arrow = document.createElement('i');
            arrow.className = 'fas fa-chevron-right nudge-card-arrow';
            card.appendChild(arrow);

            (function(suggestion) {
                card.addEventListener('click', function() {
                    // Navigate to the activity
                    var navBtn = document.querySelector('.nav-btn[data-group="' + suggestion.group + '"]');
                    if (navBtn) navBtn.click();
                    setTimeout(function() {
                        var actBtn = document.querySelector('[data-activity="' + suggestion.activityId + '"]');
                        if (actBtn) actBtn.click();
                    }, 100);
                });
            })(s);

            grid.appendChild(card);
        }

        section.appendChild(grid);
        container.appendChild(section);
    },

    // --- Post-activity toasts ---

    onActivityComplete(activityId, config) {
        if (!config || !config.unit) return;

        // Track session counts
        this._sessionActivityCounts[activityId] = (this._sessionActivityCounts[activityId] || 0) + 1;
        var consecutiveCount = this._sessionActivityCounts[activityId];
        var wasConsecutive = this._lastActivityId === activityId;
        this._lastActivityId = activityId;

        // Throttle: max nudges per session
        if (this._sessionNudgeCount >= this.MAX_NUDGES_PER_SESSION) return;

        var unitId = config.unit.id;
        var firstName = ProgressManager.getFirstName();
        var prefix = firstName ? firstName + ', ' : '';

        // Check 1: Grinding detection (same activity 2+ times consecutively)
        if (wasConsecutive && consecutiveCount >= 2) {
            var suggestion = this._pickDifferentActivity(activityId, unitId, config);
            if (suggestion) {
                var info = this.ACTIVITY_INFO[suggestion];
                if (info) {
                    this._sessionNudgeCount++;
                    StudyUtils.showToast(prefix + 'great practice! Try ' + info.name + ' to mix things up.', 'info', 6000);
                    return;
                }
            }
        }

        // Check 2: Weak terms generated
        var weakCount = this._getWeakTermCount(unitId);
        if (weakCount > 0) {
            var remediation = this._pickRemediationActivity(unitId, this._getTriedActivities(unitId));
            if (remediation && remediation !== activityId) {
                var info = this.ACTIVITY_INFO[remediation];
                if (info) {
                    this._sessionNudgeCount++;
                    StudyUtils.showToast(prefix + 'you missed a few \u2014 ' + info.name + ' will help lock them in.', 'info', 6000);
                    return;
                }
            }
        }

        // Check 3: Study flow nudge
        var flowNext = this._findFlowGap(unitId, this._getTriedActivities(unitId),
            (ProgressManager.getActivityProgress(unitId, 'flashcards') || {}).mastered
                ? (ProgressManager.getActivityProgress(unitId, 'flashcards') || {}).mastered.length : 0,
            config.vocabulary ? config.vocabulary.length : 0);
        if (flowNext && flowNext !== activityId) {
            var info = this.ACTIVITY_INFO[flowNext];
            if (info) {
                this._sessionNudgeCount++;
                StudyUtils.showToast(prefix + 'nice work! Ready to try ' + info.name + '?', 'info', 6000);
                return;
            }
        }

        // No toast — don't nag
    },

    _pickDifferentActivity(currentId, unitId, config) {
        var tried = this._getTriedActivities(unitId);
        // Prefer study flow activities they haven't maxed out
        var all = Object.keys(this.ACTIVITY_INFO);
        for (var i = 0; i < all.length; i++) {
            var id = all[i];
            if (id === currentId) continue;
            if (typeof MasteryManager !== 'undefined' && !MasteryManager.isActivityAccessible(unitId, config, id)) continue;
            if (typeof StudyEngine !== 'undefined' && StudyEngine.activities && !StudyEngine.activities[id]) continue;
            // Prefer activities with low session count
            if ((this._sessionActivityCounts[id] || 0) < 2) return id;
        }
        return null;
    }
};
```

**Step 2: Add script tag to index.html**

Add after the mastery.js script tag (line 85) and before command-palette.js (line 86):

```html
    <script src="js/core/nudge.js"></script>
```

**Step 3: Verify in browser**

Open `http://localhost:8000/study-tools/engine/?unit=early-republic`, open console, type `NudgeManager` — should show the object.

**Step 4: Commit**

```bash
git add study-tools/engine/js/core/nudge.js study-tools/engine/index.html
git commit -m "feat: add NudgeManager core module — suggestions, toasts, shared missed-term tracking"
```

---

### Task 2: Integrate home screen suggestions

**Files:**
- Modify: `study-tools/engine/js/core/app.js:553-612` (renderHomeStats, replace Continue CTA)
- Modify: `study-tools/engine/css/styles.css` (add nudge card styles)

**Step 1: Add nudge suggestion rendering to `renderHomeStats()`**

In `app.js`, find the `renderHomeStats()` method (line 553). After the existing `ProgressManager.renderHomeStats(this.config)` call and leaderboard submit, add the nudge rendering. Replace the "Continue Studying" CTA block (lines 567-612) with a call to NudgeManager:

Replace lines 563-612 (the entire `homeCards` block including the Continue Studying CTA) with:

```js
        // Smart suggestions — "What to Do Next"
        const homeCards = document.getElementById('home-cards');
        if (homeCards) {
            homeCards.textContent = '';
            if (typeof NudgeManager !== 'undefined') {
                NudgeManager.renderSuggestions(homeCards, this.config);
            }
```

Keep the existing "Here's how to study" flow section that follows (lines 614+) — just close the `if (homeCards)` block before it. The flow section should remain as-is since it's the static 3-step guide.

Actually, looking at the code more carefully, the `homeCards` block contains BOTH the Continue CTA (567-612) AND the study flow steps (614-670+). We want to keep the flow steps. So the change is:

Replace lines 563-612 with:
```js
        const homeCards = document.getElementById('home-cards');
        if (homeCards && homeCards.children.length === 0) {
            homeCards.textContent = '';

            // Smart "What to Do Next" suggestions
            if (typeof NudgeManager !== 'undefined') {
                NudgeManager.renderSuggestions(homeCards, this.config);
            }
```

This replaces the hardcoded Continue Studying CTA with the dynamic NudgeManager suggestions, while keeping the "Here's how to study" flow section that follows.

**Step 2: Add CSS for nudge cards**

Add to the end of `study-tools/engine/css/styles.css`:

```css
/* --- Nudge suggestions --- */
.nudge-section { margin-bottom: 20px; }
.nudge-title {
    font-size: 1.1em;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 12px;
}
.nudge-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.nudge-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 18px;
    background: var(--bg-card);
    border: 1px solid var(--border-card);
    border-radius: 12px;
    box-shadow: var(--shadow-card);
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
    text-align: left;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
}
.nudge-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.nudge-card-icon {
    font-size: 1.4em;
    color: var(--primary);
    flex-shrink: 0;
    width: 32px;
    text-align: center;
}
.nudge-card-text { flex: 1; }
.nudge-card-name {
    font-weight: 700;
    color: var(--text-primary);
    font-size: 0.95em;
}
.nudge-card-reason {
    font-size: 0.82em;
    color: var(--text-secondary);
    margin-top: 2px;
}
.nudge-card-arrow {
    color: var(--text-muted);
    font-size: 0.85em;
    flex-shrink: 0;
}
```

**Step 3: Verify in browser**

Open home page — should see "What to Do Next" section with 1-2 suggestion cards above the "Here's how to study" section.

**Step 4: Commit**

```bash
git add study-tools/engine/js/core/app.js study-tools/engine/css/styles.css
git commit -m "feat: render smart suggestions on home screen, replacing static Continue CTA"
```

---

### Task 3: Add post-activity toast integration

**Files:**
- Modify: `study-tools/engine/js/core/app.js:456-476` (showHome method)

**Step 1: Call `onActivityComplete` when returning home from an activity**

In `showHome()` (line 456), the `this.activeActivity` variable holds the activity ID the student just left. Add a nudge call before clearing it:

After line 470 (`if (this.activeActivity && this.activities[this.activeActivity]) {`), before the deactivate call, add:

```js
        // Smart nudge toast when leaving an activity
        if (this.activeActivity && typeof NudgeManager !== 'undefined' && this.config) {
            NudgeManager.onActivityComplete(this.activeActivity, this.config);
        }
```

So the full block becomes:
```js
        // Smart nudge toast when leaving an activity
        if (this.activeActivity && typeof NudgeManager !== 'undefined' && this.config) {
            NudgeManager.onActivityComplete(this.activeActivity, this.config);
        }

        if (this.activeActivity && this.activities[this.activeActivity]) {
            this.activities[this.activeActivity].deactivate?.();
            this.activeActivity = null;
        }
```

**Step 2: Verify in browser**

Do flashcards, go home — should see a nudge toast suggesting next activity. Do flashcards again, go home — should see a "mix it up" toast.

**Step 3: Commit**

```bash
git add study-tools/engine/js/core/app.js
git commit -m "feat: show smart nudge toasts when student finishes an activity"
```

---

### Task 4: Refactor practice-test to use NudgeManager.trackMissedTerms()

**Files:**
- Modify: `study-tools/engine/js/activities/practice-test.js:476-528` (_markWrongTermsInFlashcards)

**Step 1: Replace `_markWrongTermsInFlashcards` body**

Replace the entire method body with a call to NudgeManager. The method currently does two things: (1) marks wrong terms by topic, and (2) marks wrong terms by answer text for topicless questions. NudgeManager.trackMissedTerms takes term names directly, so we need to collect them first.

Replace `_markWrongTermsInFlashcards(wrongQuestions)` (lines 476-528) with:

```js
    _markWrongTermsInFlashcards(wrongQuestions) {
        var config = this._config;
        if (!config || !config.vocabulary) return;
        var unitId = config.unit.id;
        var missedTerms = [];

        for (var i = 0; i < wrongQuestions.length; i++) {
            var q = wrongQuestions[i];

            if (q.topic) {
                // Collect all vocab terms in this topic's category
                for (var j = 0; j < config.vocabulary.length; j++) {
                    if (config.vocabulary[j].category === q.topic) {
                        missedTerms.push(config.vocabulary[j].term);
                    }
                }
            } else {
                // Match correct answer text to vocab terms
                var correctText = q.options[q.correct].toLowerCase();
                for (var j = 0; j < config.vocabulary.length; j++) {
                    var v = config.vocabulary[j];
                    if (v.term.toLowerCase() === correctText || correctText.indexOf(v.term.toLowerCase()) !== -1) {
                        missedTerms.push(v.term);
                    }
                }
            }
        }

        if (typeof NudgeManager !== 'undefined') {
            NudgeManager.trackMissedTerms(unitId, config, missedTerms);
        }
    },
```

**Step 2: Remove `_trackWeakTerms` method** (lines 585-607)

This is now redundant — `NudgeManager.trackMissedTerms` handles weakness tracker updates. Remove the entire `_trackWeakTerms()` method.

Also remove the call to it in `finishTest()` — delete this line:
```js
        // Track weak terms in weakness tracker
        this._trackWeakTerms();
```

The `_markWrongTermsInFlashcards` call that remains already handles both weakness tracking and flashcard demotion via NudgeManager.

**Step 3: Verify in browser**

Take a practice test, get one wrong — check console for `localStorage.getItem('studytool_early-republic_weakness_tracker')` to confirm term was tracked.

**Step 4: Commit**

```bash
git add study-tools/engine/js/activities/practice-test.js
git commit -m "refactor: practice-test uses NudgeManager.trackMissedTerms()"
```

---

### Task 5: Refactor fill-in-blank to use NudgeManager.trackMissedTerms()

**Files:**
- Modify: `study-tools/engine/js/activities/fill-in-blank.js:477-531` (_trackWrongAnswers)

**Step 1: Replace `_trackWrongAnswers` body**

Replace the method body with:

```js
    _trackWrongAnswers() {
        var config = this._config;
        if (!config || !config.vocabulary) return;
        var unitId = config.unit.id;
        var self = this;

        // Collect wrong answer terms
        var missedTerms = [];
        this._sentences.forEach(function(item, index) {
            var placed = self._answers[index] || '';
            if (placed.toLowerCase() !== item.answer.toLowerCase()) {
                missedTerms.push(item.answer);
            }
        });

        if (missedTerms.length > 0 && typeof NudgeManager !== 'undefined') {
            NudgeManager.trackMissedTerms(unitId, config, missedTerms);
        }
    },
```

**Step 2: Commit**

```bash
git add study-tools/engine/js/activities/fill-in-blank.js
git commit -m "refactor: fill-in-blank uses NudgeManager.trackMissedTerms()"
```

---

### Task 6: Refactor lightning-round to use NudgeManager.trackMissedTerms()

**Files:**
- Modify: `study-tools/engine/js/activities/lightning-round.js` (_trackWeakTerms method and _endGame)

**Step 1: Replace `_trackWeakTerms` body**

The current method (lines 417-426) manually updates weakness_tracker. Replace with:

```js
    _trackWeakTerms() {
        if (this._missed.length === 0) return;
        var config = this._config;
        if (!config) return;
        var unitId = config.unit.id;
        var missedTerms = this._missed.map(function(m) { return m.term; });

        if (typeof NudgeManager !== 'undefined') {
            NudgeManager.trackMissedTerms(unitId, config, missedTerms);
        }
    },
```

**Step 2: Commit**

```bash
git add study-tools/engine/js/activities/lightning-round.js
git commit -m "refactor: lightning-round uses NudgeManager.trackMissedTerms()"
```

---

### Task 7: Add missed-term tracking to Wordle

**Files:**
- Modify: `study-tools/engine/js/activities/wordle.js` (_endGame method)

**Step 1: Add tracking on loss**

In the `_endGame(won)` method, after the loss is detected (when `won` is false), add:

```js
        // Track missed term on loss
        if (!won && typeof NudgeManager !== 'undefined' && this._config) {
            NudgeManager.trackMissedTerms(this._config.unit.id, this._config, [this._targetWord]);
        }
```

Add this near the top of `_endGame`, right after any existing loss-handling code.

**Step 2: Commit**

```bash
git add study-tools/engine/js/activities/wordle.js
git commit -m "feat: wordle tracks missed terms on loss"
```

---

### Task 8: Add missed-term tracking to Hangman

**Files:**
- Modify: `study-tools/engine/js/activities/hangman.js` (_endGame method)

**Step 1: Add tracking on loss**

In `_endGame(won)`, add:

```js
        // Track missed term on loss
        if (!won && typeof NudgeManager !== 'undefined' && this._config) {
            NudgeManager.trackMissedTerms(this._config.unit.id, this._config, [this._targetWord]);
        }
```

**Step 2: Commit**

```bash
git add study-tools/engine/js/activities/hangman.js
git commit -m "feat: hangman tracks missed terms on loss"
```

---

### Task 9: Add missed-term tracking to Flip Match

**Files:**
- Modify: `study-tools/engine/js/activities/flip-match.js` (_checkMatch method)

**Step 1: Add tracking on mismatch**

In `_checkMatch()`, in the `else` (mismatch) branch, add tracking. The card data has `pairId` which maps to the vocab term. On mismatch, both cards' terms were confused — track both:

```js
        } else {
            // Track mismatched terms
            if (typeof NudgeManager !== 'undefined' && this._config) {
                var missed = [];
                if (first.data.type === 'term') missed.push(first.data.text);
                if (second.data.type === 'term') missed.push(second.data.text);
                if (missed.length > 0) {
                    NudgeManager.trackMissedTerms(this._config.unit.id, this._config, missed);
                }
            }
            // Flip back after delay
```

**Step 2: Commit**

```bash
git add study-tools/engine/js/activities/flip-match.js
git commit -m "feat: flip-match tracks missed terms on mismatch"
```

---

### Task 10: Add missed-term tracking to Term Catcher

**Files:**
- Modify: `study-tools/engine/js/activities/term-catcher.js` (_clickTerm method)

**Step 1: Add tracking on wrong click**

In `_clickTerm()`, in the wrong-answer `else` branch, track the correct answer that was missed:

```js
        } else {
            // Track missed term (the correct answer they should have caught)
            if (typeof NudgeManager !== 'undefined' && this._config) {
                NudgeManager.trackMissedTerms(this._config.unit.id, this._config, [this._currentAnswer]);
            }
```

**Step 2: Commit**

```bash
git add study-tools/engine/js/activities/term-catcher.js
git commit -m "feat: term-catcher tracks missed terms on wrong catch"
```

---

### Task 11: Refactor Tower Defense to use NudgeManager.trackMissedTerms()

**Files:**
- Modify: `study-tools/engine/js/activities/tower-defense.js` (_answerQuestion method, lines 1287-1303)

**Step 1: Replace inline weakness tracking with NudgeManager call**

Tower Defense already tracks by topic/category (lines 1292-1303). Replace that block with:

```js
        } else {
            this._streak = 0;
            this._showQuestionFeedback(false, 'Correct: ' + q.options[q.correct]);

            // Track missed terms via NudgeManager
            if (q.topic && typeof NudgeManager !== 'undefined' && this._config) {
                var vocab = this._config.vocabulary || [];
                var missed = [];
                for (var j = 0; j < vocab.length; j++) {
                    if (vocab[j].category === q.topic) {
                        missed.push(vocab[j].term);
                    }
                }
                NudgeManager.trackMissedTerms(this._config.unit.id, this._config, missed);
            }
        }
```

**Step 2: Commit**

```bash
git add study-tools/engine/js/activities/tower-defense.js
git commit -m "refactor: tower-defense uses NudgeManager.trackMissedTerms()"
```

---

### Task 12: Add missed-term tracking to Crossword

**Files:**
- Modify: `study-tools/engine/js/activities/crossword.js` (_checkAnswers and _revealWord methods)

**Step 1: Track wrong answers in `_checkAnswers()`**

After the check loop that marks cells correct/incorrect, collect words with errors and track them:

Add after the existing check loop:

```js
        // Track missed terms
        var missedTerms = [];
        for (var i = 0; i < this._words.length; i++) {
            var w = this._words[i];
            var wordCorrect = true;
            for (var j = 0; j < w.word.length; j++) {
                var r = w.direction === 'across' ? w.row : w.row + j;
                var c = w.direction === 'across' ? w.col + j : w.col;
                var input = this._getInputElement(r, c);
                if (!input || input.value.toUpperCase() !== w.word[j]) {
                    wordCorrect = false;
                    break;
                }
            }
            if (!wordCorrect && w.vocab) {
                missedTerms.push(w.vocab);
            }
        }
        if (missedTerms.length > 0 && typeof NudgeManager !== 'undefined' && this._config) {
            NudgeManager.trackMissedTerms(this._config.unit.id, this._config, missedTerms);
        }
```

**Step 2: Track revealed words in `_revealWord()`**

When a student uses "reveal", that's also a miss. Add at the top of `_revealWord()`:

```js
        // Track revealed word as missed
        if (this._words[wordIndex] && this._words[wordIndex].vocab && typeof NudgeManager !== 'undefined' && this._config) {
            NudgeManager.trackMissedTerms(this._config.unit.id, this._config, [this._words[wordIndex].vocab]);
        }
```

**Step 3: Commit**

```bash
git add study-tools/engine/js/activities/crossword.js
git commit -m "feat: crossword tracks missed terms on wrong answers and reveals"
```

---

### Task 13: Add missed-term tracking to Quiz Race

**Files:**
- Modify: `study-tools/engine/js/activities/quiz-race.js` (_handleAnswer method)

**Step 1: Add tracking on wrong answer**

In `_handleAnswer()`, in the wrong-answer `else` branch, track the terms. Quiz Race questions come from `config.practiceQuestions` which have topics, so match by topic like practice-test does:

```js
        } else {
            this._scores[player] = Math.max(0, this._scores[player] - 1);
            // Track missed terms
            var q = this._questions[this._currentQ];
            if (q && q.topic && typeof NudgeManager !== 'undefined' && this._config) {
                var vocab = this._config.vocabulary || [];
                var missed = [];
                for (var j = 0; j < vocab.length; j++) {
                    if (vocab[j].category === q.topic) {
                        missed.push(vocab[j].term);
                    }
                }
                NudgeManager.trackMissedTerms(this._config.unit.id, this._config, missed);
            }
```

**Step 2: Commit**

```bash
git add study-tools/engine/js/activities/quiz-race.js
git commit -m "feat: quiz-race tracks missed terms on wrong answers"
```

---

### Task 14: Bump version and final commit

**Files:**
- Modify: `study-tools/engine/version.json`
- Modify: `README.md`

**Step 1: Bump version to 7.8.0**

version.json:
```json
{
    "version": "7.8.0",
    "date": "2026-03-11"
}
```

README.md: Update badge to `Version-7.8.0`

**Step 2: Commit and push**

```bash
git add study-tools/engine/version.json README.md
git commit -m "chore: bump version to 7.8.0 — nudge system + game weakness tracking"
git push
```

---

## Task Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Create NudgeManager core module | nudge.js (new), index.html |
| 2 | Home screen suggestions | app.js, styles.css |
| 3 | Post-activity toast integration | app.js |
| 4 | Refactor practice-test | practice-test.js |
| 5 | Refactor fill-in-blank | fill-in-blank.js |
| 6 | Refactor lightning-round | lightning-round.js |
| 7 | Wordle missed-term tracking | wordle.js |
| 8 | Hangman missed-term tracking | hangman.js |
| 9 | Flip Match missed-term tracking | flip-match.js |
| 10 | Term Catcher missed-term tracking | term-catcher.js |
| 11 | Refactor Tower Defense | tower-defense.js |
| 12 | Crossword missed-term tracking | crossword.js |
| 13 | Quiz Race missed-term tracking | quiz-race.js |
| 14 | Version bump and push | version.json, README.md |
