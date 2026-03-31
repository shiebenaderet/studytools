# Infrastructure: Multi-Source Mastery, Scoring Tiers, Streak & Nudges — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundational systems that new games and Learn Mode integration depend on: multi-source term mastery tracking, per-activity scoring multipliers, Learn Mode streak bonuses, and smart nudges that guide students toward deeper activities.

**Architecture:** `MasteryManager` gains a `recordTermCorrect(unitId, term, activityId)` method that tracks mastery evidence from multiple activities. `ActivityTimer._addCappedStudyTime()` applies per-activity scoring multipliers looked up from a tier map. A new `learn-mode-streak` progress key tracks consecutive-day Learn Mode usage with escalating multipliers. `NudgeManager` gains smart nudge triggers based on activity usage patterns.

**Tech Stack:** Vanilla JS, localStorage via ProgressManager, no build tools, no frameworks

**Spec:** `docs/plans/2026-03-30-new-games-scoring-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `study-tools/engine/js/core/mastery.js` | Modify | Add `recordTermCorrect()`, update `isCategoryMastered()` to check multi-source data |
| `study-tools/engine/js/core/app.js` | Modify | Add scoring tier map to `ActivityTimer`, update `_addCappedStudyTime()` for multipliers, add streak logic |
| `study-tools/engine/js/core/nudge.js` | Modify | Add smart nudge triggers for activity guidance |
| `study-tools/engine/js/core/progress.js` | Modify | Add `renderStreakBadge()` for home screen |
| `study-tools/engine/css/styles.css` | Modify | Streak badge and nudge styles |
| `study-tools/engine/version.json` | Modify | Bump version |
| `study-tools/engine/sw.js` | Modify | Bump cache |

---

### Task 1: Multi-Source Mastery — `recordTermCorrect()`

**Files:**
- Modify: `study-tools/engine/js/core/mastery.js`

- [ ] **Step 1: Add `recordTermCorrect()` method**

In `mastery.js`, add this method after `showMasteryNudge()` (after line 135):

```js
    /**
     * Records that a student answered a term correctly in an activity.
     * Tracks mastery evidence from multiple sources.
     * A term is mastered when: flashcard Good/Easy (instant),
     * OR correct in 2+ different activities, OR correct 3+ times in same activity.
     */
    recordTermCorrect(unitId, term, activityId) {
        if (!unitId || !term || !activityId) return;
        var data = ProgressManager.load(unitId, 'term-mastery') || {};
        if (!data[term]) {
            data[term] = { sources: [], count: {} };
        }
        // Add activity to sources if not already there
        if (data[term].sources.indexOf(activityId) === -1) {
            data[term].sources.push(activityId);
        }
        // Increment count for this activity
        data[term].count[activityId] = (data[term].count[activityId] || 0) + 1;
        ProgressManager.save(unitId, 'term-mastery', data);
    },

    /**
     * Returns true if a term is mastered via multi-source evidence.
     * Checks: flashcard mastered list, OR 2+ activity sources, OR 3+ times in one activity.
     */
    isTermMastered(unitId, config, term) {
        // Check flashcard mastery first (instant, existing behavior)
        var flashcardProgress = ProgressManager.getActivityProgress(unitId, 'flashcards') || {};
        var mastered = flashcardProgress.mastered || [];
        if (mastered.indexOf(term) !== -1) return true;

        // Check multi-source mastery
        var data = ProgressManager.load(unitId, 'term-mastery') || {};
        var termData = data[term];
        if (!termData) return false;

        // 2+ different activity sources
        if (termData.sources.length >= 2) return true;

        // 3+ times in same activity
        var counts = termData.count || {};
        for (var key in counts) {
            if (counts[key] >= 3) return true;
        }

        return false;
    },
```

- [ ] **Step 2: Update `isCategoryMastered()` to use multi-source mastery**

Replace the existing `isCategoryMastered` method (lines 23-30) with:

```js
    isCategoryMastered(unitId, config, categoryName) {
        if (!config.vocabulary) return false;
        var categoryTerms = config.vocabulary.filter(function(v) { return v.category === categoryName; });
        if (categoryTerms.length === 0) return false;
        var self = this;
        return categoryTerms.every(function(v) {
            return self.isTermMastered(unitId, config, v.term);
        });
    },
```

- [ ] **Step 3: Verify syntax**

Run: `node -c study-tools/engine/js/core/mastery.js`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add study-tools/engine/js/core/mastery.js
git commit -m "feat: multi-source mastery tracking (recordTermCorrect + isTermMastered)"
```

---

### Task 2: Scoring Tier Multipliers

**Files:**
- Modify: `study-tools/engine/js/core/app.js` (ActivityTimer section, lines 2-115)

- [ ] **Step 1: Add scoring tier map to ActivityTimer**

After line 16 (`LEARN_MODE_MULTIPLIER: 1.5,`), add:

```js
    // Scoring tiers: higher-order activities earn more points per minute
    // Only applied when unit config has scoringTiers: true
    SCORING_TIERS: {
        // Deep Study (1.5x) — handled by LEARN_MODE_MULTIPLIER
        // Analysis (1.25x)
        'sort-it-out': 1.25,
        'who-am-i': 1.25,
        'four-corners': 1.25,
        'map-quiz': 1.25,
        'source-analysis': 1.25,
        'sift-practice': 1.25,
        // Recall (1.0x) — default, no entry needed
        // Recognition (0.75x)
        'term-catcher': 0.75,
        'flip-match': 0.75,
        'hangman': 0.75,
        'tower-defense': 0.75
    },

    _getScoringMultiplier(activityId) {
        // Learn mode has its own multiplier (with streak bonus)
        if (activityId === 'learn-mode') return this._getLearnModeMultiplier();
        // Check if current unit has scoring tiers enabled
        if (typeof StudyEngine !== 'undefined' && StudyEngine.config && StudyEngine.config.unit) {
            var unitConfig = StudyEngine.config;
            if (!unitConfig.scoringTiers) return 1.0; // unit doesn't use tiers
        }
        return this.SCORING_TIERS[activityId] || 1.0;
    },
```

- [ ] **Step 2: Update `_addCappedStudyTime()` to use dynamic multipliers**

Replace the multiplier logic at lines 75-78:

```js
        // Apply points multiplier for learn-mode (cap is on real time, multiplier on credited points)
        if (credited > 0) {
            var multiplied = activityId === 'learn-mode' ? Math.round(credited * this.LEARN_MODE_MULTIPLIER) : credited;
            ProgressManager.addStudyTime(unitId, multiplied);
        }
```

With:

```js
        // Apply scoring tier multiplier (cap is on real time, multiplier on credited points)
        if (credited > 0) {
            var multiplier = this._getScoringMultiplier(activityId);
            var multiplied = Math.round(credited * multiplier);
            ProgressManager.addStudyTime(unitId, multiplied);
        }
```

- [ ] **Step 3: Add `scoringTiers: true` to westward-expansion config**

In `study-tools/units/westward-expansion/config.json`, add after the `theme` block closing `}` (after line 15):

```json
    "scoringTiers": true,
```

- [ ] **Step 4: Verify syntax**

Run: `node -c study-tools/engine/js/core/app.js`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/js/core/app.js study-tools/units/westward-expansion/config.json
git commit -m "feat: per-activity scoring tier multipliers (westward-expansion only)"
```

---

### Task 3: Learn Mode Streak Bonus

**Files:**
- Modify: `study-tools/engine/js/core/app.js` (ActivityTimer section)
- Modify: `study-tools/engine/js/core/progress.js` (home stats rendering)
- Modify: `study-tools/engine/css/styles.css` (streak badge)

- [ ] **Step 1: Add streak tracking method to ActivityTimer**

After the `_getScoringMultiplier` method added in Task 2, add:

```js
    _getLearnModeMultiplier() {
        var unitId = this._unitId;
        if (!unitId) return this.LEARN_MODE_MULTIPLIER;
        var streakData = ProgressManager.load(unitId, 'learn-mode-streak') || { currentStreak: 0, lastSessionDate: null, longestStreak: 0 };
        var streak = streakData.currentStreak || 0;
        if (streak >= 3) return 2.0;
        if (streak >= 2) return 1.75;
        return 1.5; // base
    },

    recordLearnModeSession(unitId) {
        var today = new Date().toDateString();
        var streakData = ProgressManager.load(unitId, 'learn-mode-streak') || { currentStreak: 0, lastSessionDate: null, longestStreak: 0 };

        if (streakData.lastSessionDate === today) {
            // Already recorded today
            return streakData;
        }

        var yesterday = new Date(Date.now() - 86400000).toDateString();
        if (streakData.lastSessionDate === yesterday) {
            streakData.currentStreak = (streakData.currentStreak || 0) + 1;
        } else if (streakData.lastSessionDate !== today) {
            streakData.currentStreak = 1; // reset streak
        }

        streakData.lastSessionDate = today;
        streakData.longestStreak = Math.max(streakData.longestStreak || 0, streakData.currentStreak);
        ProgressManager.save(unitId, 'learn-mode-streak', streakData);

        // Show streak notification
        var multiplier = streakData.currentStreak >= 3 ? '2x' : streakData.currentStreak >= 2 ? '1.75x' : '1.5x';
        var firstName = ProgressManager.getFirstName();
        var prefix = firstName ? firstName + ', ' : '';
        if (streakData.currentStreak >= 2) {
            StudyUtils.showToast(prefix + 'Day ' + streakData.currentStreak + ' streak! ' + multiplier + ' points in Learn Mode today!', 'success');
        }

        return streakData;
    },
```

- [ ] **Step 2: Add streak badge to home screen**

In `study-tools/engine/js/core/progress.js`, find the `renderHomeStats` method. Find where it renders the streak stat box (around line 86-87):

```js
        const streak = this.load(unitId, 'streak') || { current: 0 };
```

After that line, add:

```js
        var learnStreak = this.load(unitId, 'learn-mode-streak') || { currentStreak: 0 };
```

Then find where the stat boxes are created (the `createStatBox` calls) and add after the existing streak box:

Find the line that has `grid.appendChild(createStatBox('Streak',` and add after it:

```js
            if (learnStreak.currentStreak > 0) {
                var multiplier = learnStreak.currentStreak >= 3 ? '2x' : learnStreak.currentStreak >= 2 ? '1.75x' : '1.5x';
                grid.appendChild(createStatBox('Learn Streak', learnStreak.currentStreak + ' day' + (learnStreak.currentStreak !== 1 ? 's' : '') + ' (' + multiplier + ')', false));
            }
```

- [ ] **Step 3: Verify syntax**

Run: `node -c study-tools/engine/js/core/app.js && node -c study-tools/engine/js/core/progress.js`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add study-tools/engine/js/core/app.js study-tools/engine/js/core/progress.js
git commit -m "feat: Learn Mode streak bonus (1.5x → 1.75x → 2.0x) with home screen badge"
```

---

### Task 4: Smart Nudges

**Files:**
- Modify: `study-tools/engine/js/core/nudge.js`

- [ ] **Step 1: Add smart nudge tracking and triggers**

At the top of `NudgeManager` (after line 6 `MAX_NUDGES_PER_SESSION: 3,`), add:

```js
    _smartNudgeCount: 0,
    MAX_SMART_NUDGES: 2,
    _learnModeDoneToday: false,

    RECOGNITION_GAMES: ['term-catcher', 'flip-match', 'hangman', 'tower-defense'],
    ANALYSIS_GAMES: ['sort-it-out', 'who-am-i', 'four-corners', 'map-quiz', 'source-analysis'],
```

- [ ] **Step 2: Add the `showSmartNudge()` method**

After the `ACTIVITY_INFO` object (after line 26), add:

```js
    checkSmartNudge(activityId, config) {
        // Don't nudge if teacher-unlock is active or guest
        if (sessionStorage.getItem('teacher-unlock') === 'true') return;
        if (!ProgressManager.studentInfo || ProgressManager.studentInfo.isGuest) return;
        if (this._smartNudgeCount >= this.MAX_SMART_NUDGES) return;

        var unitId = config && config.unit ? config.unit.id : null;
        if (!unitId) return;
        var firstName = ProgressManager.getFirstName();
        var prefix = firstName ? firstName + ', ' : '';

        // Check if student did Learn Mode today
        var today = new Date().toDateString();
        var learnStreak = ProgressManager.load(unitId, 'learn-mode-streak') || {};
        this._learnModeDoneToday = learnStreak.lastSessionDate === today;

        // Track how many times this activity was used this session
        this._sessionActivityCounts[activityId] = (this._sessionActivityCounts[activityId] || 0) + 1;

        // Nudge 1: Opening any game without doing Learn Mode today
        if (!this._learnModeDoneToday && activityId !== 'learn-mode' && activityId !== 'flashcards' && activityId !== 'textbook') {
            var streakData = ProgressManager.load(unitId, 'learn-mode-streak') || { currentStreak: 0 };
            var multiplier = '1.5x';
            if (streakData.currentStreak >= 2) multiplier = '1.75x';
            if (streakData.currentStreak >= 3) multiplier = '2x';
            var streakNote = streakData.currentStreak >= 1 ? ' (Day ' + (streakData.currentStreak + 1) + ' streak: ' + multiplier + '!)' : '';
            StudyUtils.showToast(prefix + 'start with Learn Mode for ' + multiplier + ' points!' + streakNote, 'info');
            this._smartNudgeCount++;
            return;
        }

        // Nudge 2: Playing recognition-tier game 2+ times
        if (this.RECOGNITION_GAMES.indexOf(activityId) !== -1 && this._sessionActivityCounts[activityId] >= 2) {
            var suggestions = this.ANALYSIS_GAMES.filter(function(g) {
                return config.activities && config.activities.indexOf(g) !== -1;
            });
            if (suggestions.length > 0) {
                var suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
                var info = this.ACTIVITY_INFO[suggestion];
                var name = info ? info.name : suggestion;
                StudyUtils.showToast(prefix + 'you\'re doing great! Try ' + name + ' for 1.25x points.', 'info');
                this._smartNudgeCount++;
            }
        }
    },

    checkPostLearnNudge(config) {
        if (this._smartNudgeCount >= this.MAX_SMART_NUDGES) return;
        if (sessionStorage.getItem('teacher-unlock') === 'true') return;
        var firstName = ProgressManager.getFirstName();
        var prefix = firstName ? firstName + ', w' : 'W';
        var suggestions = this.ANALYSIS_GAMES.filter(function(g) {
            return config.activities && config.activities.indexOf(g) !== -1;
        });
        if (suggestions.length > 0) {
            var suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
            var info = this.ACTIVITY_INFO[suggestion];
            var name = info ? info.name : suggestion;
            StudyUtils.showToast(prefix + 'ant to test what you just learned? Try ' + name + '!', 'info');
            this._smartNudgeCount++;
        }
    },

    checkPostGameNudge(activityId, config) {
        if (this._smartNudgeCount >= this.MAX_SMART_NUDGES) return;
        if (this._learnModeDoneToday) return;
        if (sessionStorage.getItem('teacher-unlock') === 'true') return;
        var firstName = ProgressManager.getFirstName();
        var prefix = firstName ? 'Nice game, ' + firstName + '! ' : 'Nice game! ';
        StudyUtils.showToast(prefix + 'Learn Mode earns more points and builds your streak.', 'info');
        this._smartNudgeCount++;
    },
```

- [ ] **Step 3: Add new games to ACTIVITY_INFO**

In the `ACTIVITY_INFO` object, add these entries:

```js
        'sort-it-out':      { icon: 'fas fa-layer-group',    name: 'Sort It Out',       group: 'games' },
        'who-am-i':         { icon: 'fas fa-question-circle',name: 'Who Am I?',         group: 'games' },
        'four-corners':     { icon: 'fas fa-th-large',       name: 'Four Corners',      group: 'games' },
        'learn-mode':       { icon: 'fas fa-brain',          name: 'Learn Mode',        group: 'study' },
        'source-analysis':  { icon: 'fas fa-search',         name: 'Source Analysis',   group: 'study' },
```

- [ ] **Step 4: Wire nudges into activity activation**

In `study-tools/engine/js/core/app.js`, find `activateActivity` (line 628). After the line `ActivityTimer.start(this.config.unit.id, activityId);` (around line 669), add:

```js
        // Smart nudges
        if (typeof NudgeManager !== 'undefined') {
            NudgeManager.checkSmartNudge(activityId, this.config);
        }
```

- [ ] **Step 5: Verify syntax**

Run: `node -c study-tools/engine/js/core/nudge.js && node -c study-tools/engine/js/core/app.js`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add study-tools/engine/js/core/nudge.js study-tools/engine/js/core/app.js
git commit -m "feat: smart nudges guide students toward deeper activities"
```

---

### Task 5: Wire Up Learn Mode Streak Recording

**Files:**
- Modify: `study-tools/engine/js/activities/learn-mode.js`

- [ ] **Step 1: Find where Learn Mode sessions complete**

Search for where a Learn Mode session ends (likely a method like `_endSession` or `_completeSession`). Add the streak recording call there.

Find the session completion point and add:

```js
        // Record Learn Mode streak
        if (typeof ActivityTimer !== 'undefined') {
            ActivityTimer.recordLearnModeSession(this._config.unit.id);
        }
        // Post-learn nudge
        if (typeof NudgeManager !== 'undefined') {
            NudgeManager.checkPostLearnNudge(this._config);
        }
```

Note: The implementer must read `learn-mode.js` to find the exact insertion point. Search for where the session end screen is shown or where session progress is saved.

- [ ] **Step 2: Verify syntax**

Run: `node -c study-tools/engine/js/activities/learn-mode.js`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add study-tools/engine/js/activities/learn-mode.js
git commit -m "feat: record Learn Mode streak on session completion"
```

---

### Task 6: Version Bump & Cache

**Files:**
- Modify: `study-tools/engine/version.json`
- Modify: `study-tools/engine/sw.js`

- [ ] **Step 1: Bump version**

Change `study-tools/engine/version.json` to:

```json
{
    "version": "8.5.0",
    "date": "2026-03-30"
}
```

- [ ] **Step 2: Bump service worker cache**

In `study-tools/engine/sw.js`, update the cache name to `studytools-v29`.

- [ ] **Step 3: Commit**

```bash
git add study-tools/engine/version.json study-tools/engine/sw.js
git commit -m "feat: infrastructure for new games and scoring (v8.5.0)"
```

---

### Task 7: Manual Testing Checklist

- [ ] **Multi-source mastery:** In westward-expansion, get a term correct in Learn Mode AND Lightning Round. Check if the term shows as mastered (should need 2+ sources or 3x same source).
- [ ] **Flashcard mastery still works:** Rate a term "Good" in flashcards. It should still count as mastered immediately.
- [ ] **Scoring tiers (WE only):** Play Term Catcher in westward-expansion. Verify study time points are 0.75x. Play Map Quiz and verify 1.25x. Switch to early-republic and verify Term Catcher earns 1.0x (no tiers).
- [ ] **Learn Mode streak:** Complete a Learn Mode session. Check home screen for streak badge. Check console/toast for streak notification.
- [ ] **Smart nudges:** Open Term Catcher twice without doing Learn Mode. Should see a nudge suggesting Learn Mode or a harder game. Max 2 nudges per session.
- [ ] **Teacher unlock still works:** Type `unlock` in command palette, enter password. All activities should be accessible regardless of mastery.
- [ ] **Early-republic not affected by scoring tiers:** Verify all activities earn 1.0x in early-republic (no `scoringTiers` flag in its config).
