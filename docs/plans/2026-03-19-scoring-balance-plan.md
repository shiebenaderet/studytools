# Scoring Balance & Activity Variety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce study-time score inflation, warn teachers about gaming patterns, and nudge students toward activity variety.

**Architecture:** Three independent features that touch four files. The scoring change is in `leaderboard.js`, study-time toasts in `app.js`, recency nudges in `nudge.js`, and dashboard badges in `dashboard.js`. No database changes — everything uses existing localStorage keys and Supabase columns.

**Tech Stack:** Vanilla JS, localStorage, Supabase (read-only for dashboard), no build tools.

**Spec:** `docs/plans/2026-03-19-scoring-balance-design.md`

---

### Task 1: Diminishing Study Time Points — `calculateTimePts()` helper

**Files:**
- Modify: `study-tools/engine/js/core/leaderboard.js:1-11`

- [ ] **Step 1: Add `calculateTimePts()` helper above `calculateScore()`**

Insert this new method at line 3, before `calculateScore`:

```js
    // Diminishing study-time points: 1pt/min for 0-30, 0.5pt/min for 31-60, 0.25pt/min for 61-100, 0 after 100
    calculateTimePts(studyTimeSeconds) {
        var mins = Math.floor((studyTimeSeconds || 0) / 60);
        if (mins <= 30) return mins;
        if (mins <= 60) return 30 + Math.floor((mins - 30) * 0.5);
        if (mins <= 100) return 45 + Math.floor((mins - 60) * 0.25);
        return 55; // hard cap
    },
```

- [ ] **Step 2: Update `calculateScore()` to use the new helper**

Replace line 8:
```js
        var timePts = Math.floor((studyTimeSeconds || 0) / 60); // 1 pt per minute
```
with:
```js
        var timePts = this.calculateTimePts(studyTimeSeconds);
```

Also update the comment on line 4 to:
```js
    // Calculate composite score: vocab mastered * 10 + best test score + study time (diminishing) + map bonus
```

- [ ] **Step 3: Verify the math manually**

Spot-check: 0 min → 0, 30 min → 30, 60 min → 45, 100 min → 55, 200 min → 55.

- [ ] **Step 4: Commit**

```bash
git add study-tools/engine/js/core/leaderboard.js
git commit -m "feat: add diminishing returns to study time scoring"
```

---

### Task 2: Update Formula Description Text

**Files:**
- Modify: `study-tools/engine/js/core/leaderboard.js:157`
- Modify: `study-tools/dashboard/dashboard.js:745`
- Modify: `study-tools/dashboard/dashboard.js:2118`

- [ ] **Step 1: Update the formula explainer in all three locations**

In each file, find and replace (use `replace_all` or search):
```js
'Vocab (\u00d710) + Test Score + Study Min + Map Bonus = Total'
```
with:
```js
'Vocab (\u00d710) + Test Score + Study Time (diminishing) + Map Bonus = Total'
```

There are exactly 3 occurrences across 2 files:
- `leaderboard.js:157`
- `dashboard.js:745`
- `dashboard.js:2118`

- [ ] **Step 2: Commit**

```bash
git add study-tools/engine/js/core/leaderboard.js study-tools/dashboard/dashboard.js
git commit -m "chore: update formula description to reflect diminishing study time"
```

---

### Task 3: Study Time Threshold Toasts in ActivityTimer

**Files:**
- Modify: `study-tools/engine/js/core/app.js:1-45`

- [ ] **Step 1: Add threshold tracking property and reset in `start()`**

Add a new property after line 8 (`_unitId: null,`):

```js
    _shownThresholds: {},  // track which study-time toasts have fired this session
```

In the `start()` method, after `this._elapsed = 0;` (line 14), add:

```js
        this._shownThresholds = {};
```

- [ ] **Step 2: Add `_checkStudyTimeThresholds()` method**

Add this new method after the `_tick()` method (after line 45):

```js
    _checkStudyTimeThresholds() {
        var elapsedMin = Math.floor(this._elapsed / 60000);
        var firstName = typeof ProgressManager !== 'undefined' ? ProgressManager.getFirstName() : '';
        var prefix = firstName ? firstName + ', ' : '';

        if (elapsedMin >= 100 && !this._shownThresholds[100]) {
            this._shownThresholds[100] = true;
            if (typeof StudyUtils !== 'undefined') {
                StudyUtils.showToast(prefix + 'you\'ve hit the study time point cap! Focus on vocab and practice tests to keep climbing the leaderboard!', 'info', 8000);
            }
        } else if (elapsedMin >= 60 && !this._shownThresholds[60]) {
            this._shownThresholds[60] = true;
            if (typeof StudyUtils !== 'undefined') {
                StudyUtils.showToast(prefix + '60 minutes of studying \u2014 impressive! Your study time points are slowing down. Try mastering vocab or taking a practice test to keep your score growing!', 'info', 8000);
            }
        } else if (elapsedMin >= 30 && !this._shownThresholds[30]) {
            this._shownThresholds[30] = true;
            if (typeof StudyUtils !== 'undefined') {
                StudyUtils.showToast(prefix + 'you\'ve been studying for 30 minutes \u2014 nice! Points are building up a bit slower now. Great time for a break!', 'info', 6000);
            }
        }
    },
```

- [ ] **Step 3: Call `_checkStudyTimeThresholds()` from `_tick()`**

At the end of the `_tick()` method, after `this._lastTick = now;` (line 44), add:

```js
        this._checkStudyTimeThresholds();
```

- [ ] **Step 4: Commit**

```bash
git add study-tools/engine/js/core/app.js
git commit -m "feat: add study time threshold toasts for diminishing returns"
```

---

### Task 4: Dashboard Warning Badges

**Files:**
- Modify: `study-tools/dashboard/dashboard.js`

**Important:** The dashboard does NOT load `leaderboard.js`, so `LeaderboardManager` is not available. The tier calculation must be inlined in the helper.

- [ ] **Step 1: Add `_scoreWarningBadges()` helper method on the Dashboard object**

Find the Dashboard object and add this helper method near other helpers like `_icon()`, `_emptyState()`. Search for `_icon(` to find the right area.

```js
    _scoreWarningBadges(entry) {
        var badges = [];
        // Inline tier calculation (mirrors LeaderboardManager.calculateTimePts)
        var mins = Math.floor((entry.study_time_seconds || 0) / 60);
        var timePts;
        if (mins <= 30) timePts = mins;
        else if (mins <= 60) timePts = 30 + Math.floor((mins - 30) * 0.5);
        else if (mins <= 100) timePts = 45 + Math.floor((mins - 60) * 0.25);
        else timePts = 55;

        // Study time heavy: time pts > 60% of score
        if (entry.score > 0 && timePts / entry.score > 0.6) {
            badges.push({ icon: 'fas fa-clock', color: '#e67e22', title: 'Most of this student\u2019s score comes from study time, not mastery.' });
        }
        // Missing milestones
        var noVocab = (entry.vocab_mastered || 0) === 0;
        var noTest = entry.best_test_score == null;
        if (noVocab && noTest) {
            badges.push({ icon: 'fas fa-exclamation-circle', color: '#e74c3c', title: 'This student hasn\u2019t mastered any vocabulary or taken a practice test.' });
        } else if (noVocab) {
            badges.push({ icon: 'fas fa-exclamation-circle', color: '#e74c3c', title: 'This student hasn\u2019t mastered any vocabulary.' });
        } else if (noTest) {
            badges.push({ icon: 'fas fa-exclamation-circle', color: '#e74c3c', title: 'This student hasn\u2019t taken a practice test.' });
        }
        return badges;
    },
```

- [ ] **Step 2: Add badges to the Scores tab student rows**

Find the Score cell rendering in the Scores tab (search for `tdScore.className = 'score-value'` near line 1788). There are two occurrences of this pattern in the file — this one is inside `loadScores` and uses `self._scoreWarningBadges`. Find:

```js
                var tdScore = document.createElement('td');
                tdScore.className = 'score-value';
                tdScore.textContent = entry.score;
                tr.appendChild(tdScore);
```

Replace with:

```js
                var tdScore = document.createElement('td');
                tdScore.className = 'score-value';
                tdScore.textContent = entry.score;
                var warnings = self._scoreWarningBadges(entry);
                for (var w = 0; w < warnings.length; w++) {
                    var badge = document.createElement('i');
                    badge.className = warnings[w].icon;
                    badge.title = warnings[w].title;
                    badge.style.cssText = 'color:' + warnings[w].color + ';margin-left:6px;font-size:0.85em;cursor:help;';
                    tdScore.appendChild(badge);
                }
                tr.appendChild(tdScore);
```

- [ ] **Step 3: Add badges to the Overview tab Top Students table**

Find the Score cell rendering in the Overview tab (search for `tdScore.className = 'score-value'` near line 773 — this is the other occurrence, inside `_renderOverview`, with deeper indentation). Find:

```js
                        var tdScore = document.createElement('td');
                        tdScore.className = 'score-value';
                        tdScore.textContent = entry.score;
                        tr.appendChild(tdScore);
```

Replace with:

```js
                        var tdScore = document.createElement('td');
                        tdScore.className = 'score-value';
                        tdScore.textContent = entry.score;
                        var warnings = self._scoreWarningBadges(entry);
                        for (var w = 0; w < warnings.length; w++) {
                            var badge = document.createElement('i');
                            badge.className = warnings[w].icon;
                            badge.title = warnings[w].title;
                            badge.style.cssText = 'color:' + warnings[w].color + ';margin-left:6px;font-size:0.85em;cursor:help;';
                            tdScore.appendChild(badge);
                        }
                        tr.appendChild(tdScore);
```

- [ ] **Step 4: Also add badges to the Leaderboard (public view) tab**

Search for a third `tdScore.className = 'score-value'` occurrence (near line 2152, inside `_renderLeaderboard`). Apply the same badge pattern there too.

- [ ] **Step 5: Commit**

```bash
git add study-tools/dashboard/dashboard.js
git commit -m "feat: add score warning badges to dashboard tables"
```

---

### Task 5: Recency Tracking — Save Last-Used Timestamps

**Files:**
- Modify: `study-tools/engine/js/core/nudge.js:1-6` (add constant)
- Modify: `study-tools/engine/js/core/nudge.js:257-263` (save timestamp in `onActivityComplete`)

- [ ] **Step 1: Add `STALE_ACTIVITY_DAYS` constant**

After line 6 (`MAX_NUDGES_PER_SESSION: 3,`), add:

```js
    STALE_ACTIVITY_DAYS: 3,
```

- [ ] **Step 2: Save last-used timestamp in `onActivityComplete()`**

At the beginning of `onActivityComplete()`, right after the line `if (!config || !config.unit) return;` (line 258), add:

```js
        var unitId = config.unit.id;
        ProgressManager.save(unitId, 'lastUsed_' + activityId, Date.now());
```

Then find and remove the duplicate `var unitId = config.unit.id;` that already exists later in the method (search for the second occurrence — it's currently on line 267). This avoids a redeclaration.

- [ ] **Step 3: Commit**

```bash
git add study-tools/engine/js/core/nudge.js
git commit -m "feat: track last-used timestamps for activity recency nudges"
```

---

### Task 6: Recency Nudge — `_getStaleActivity()` Helper

**Files:**
- Modify: `study-tools/engine/js/core/nudge.js` (add new method after `_getUntriedActivity`)

- [ ] **Step 1: Add `_getStaleActivity()` method**

Add after the closing `},` of `_getUntriedActivity()` (after line 188). Search for `_getUntriedActivity` to find it:

```js
    _getStaleActivity(unitId, config) {
        var now = Date.now();
        var threshold = this.STALE_ACTIVITY_DAYS * 24 * 60 * 60 * 1000;
        var activities = Object.keys(this.ACTIVITY_INFO);
        var stalest = null;
        var stalestAge = 0;

        for (var i = 0; i < activities.length; i++) {
            var id = activities[i];
            var lastUsed = ProgressManager.load(unitId, 'lastUsed_' + id);
            if (!lastUsed) continue; // never used — handled by _getUntriedActivity
            var age = now - lastUsed;
            if (age < threshold) continue;
            if (typeof MasteryManager !== 'undefined' && !MasteryManager.isActivityAccessible(unitId, config, id)) continue;
            if (typeof StudyEngine !== 'undefined' && StudyEngine.activities && !StudyEngine.activities[id]) continue;
            if (age > stalestAge) {
                stalest = id;
                stalestAge = age;
            }
        }
        return stalest ? { id: stalest, days: Math.floor(stalestAge / (24 * 60 * 60 * 1000)) } : null;
    },
```

- [ ] **Step 2: Commit**

```bash
git add study-tools/engine/js/core/nudge.js
git commit -m "feat: add stale activity detection helper"
```

---

### Task 7: Recency Nudge — Home Screen Suggestions

**Files:**
- Modify: `study-tools/engine/js/core/nudge.js` (insert stale check in `getSuggestions`)

- [ ] **Step 1: Insert stale-activity suggestion between flow-gap and untried checks**

In `getSuggestions()`, find the untried activity block. Search for `_getUntriedActivity(unitId, triedActivities, config)`:

```js
        if (suggestions.length < 2) {
            var untried = this._getUntriedActivity(unitId, triedActivities, config);
```

Insert this block BEFORE it:

```js
        if (suggestions.length < 2) {
            var stale = this._getStaleActivity(unitId, config);
            if (stale && !suggestions.some(function(s) { return s.activityId === stale.id; })) {
                var info = this.ACTIVITY_INFO[stale.id];
                if (info) {
                    suggestions.push({
                        activityId: stale.id,
                        icon: info.icon,
                        name: info.name,
                        group: info.group,
                        reason: 'You haven\'t tried ' + info.name + ' in ' + stale.days + ' day' + (stale.days !== 1 ? 's' : '') + ' \u2014 give it another go!'
                    });
                }
            }
        }

```

- [ ] **Step 2: Commit**

```bash
git add study-tools/engine/js/core/nudge.js
git commit -m "feat: add stale activity suggestions to home screen"
```

---

### Task 8: Recency Nudge — Toast on Activity Complete

**Files:**
- Modify: `study-tools/engine/js/core/nudge.js` (add recency toast in `onActivityComplete`)

- [ ] **Step 1: Add recency toast check at the end of `onActivityComplete()`**

In `onActivityComplete()`, find the last block that ends with `return;` and `}` — this is the flow-gap nudge block. It looks like:

```js
            StudyUtils.showToast(prefix + 'nice work! Ready to try ' + info.name + '?', 'info', 6000);
                return;
            }
        }
```

Insert the following code AFTER that block's closing `}` but BEFORE the method's final closing `},`:

```js

        // Recency nudge: suggest an activity not used in 3+ days
        var stale = this._getStaleActivity(unitId, config);
        if (stale && stale.id !== activityId) {
            var info = this.ACTIVITY_INFO[stale.id];
            if (info) {
                this._sessionNudgeCount++;
                StudyUtils.showToast(prefix + 'nice work! It\'s been ' + stale.days + ' days since you tried ' + info.name + ' \u2014 worth a revisit!', 'info', 6000);
                return;
            }
        }
```

**Caution:** Make sure this goes INSIDE `onActivityComplete()`, not after it. The method closes with `},` — the new code goes before that closing.

- [ ] **Step 2: Commit**

```bash
git add study-tools/engine/js/core/nudge.js
git commit -m "feat: add recency toast nudge on activity complete"
```

---

### Task 9: Version Bump and Final Verification

**Files:**
- Modify: `study-tools/engine/version.json`

- [ ] **Step 1: Bump version**

Update `study-tools/engine/version.json`:

```json
{
    "version": "7.11.0",
    "date": "2026-03-19"
}
```

Minor version bump because this changes scoring behavior.

- [ ] **Step 2: Commit**

```bash
git add study-tools/engine/version.json
git commit -m "chore: bump version to 7.11.0"
```

- [ ] **Step 3: Manual smoke test checklist**

Open the app in a browser and verify:
1. Leaderboard formula text shows "Study Time (diminishing)" instead of "Study Min"
2. After 30+ minutes of study time, a toast appears about slowing points
3. On home screen, "What to Do Next" suggests activities not used in 3+ days (set a fake `lastUsed_` timestamp in localStorage to test: `localStorage.setItem('studytool_early-republic_lastUsed_hangman', Date.now() - 4*86400000)`)
4. Dashboard Scores tab shows orange clock badge for students with >60% study time score
5. Dashboard shows red exclamation badge for students with 0 vocab or no test score
6. Scores are calculated correctly: 30 min → 30 pts, 60 min → 45 pts, 100+ min → 55 pts
