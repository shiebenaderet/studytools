# Leaderboard Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add map quiz speed bonus to leaderboard, explain score formula to students, and add a Map Speed Run tab.

**Architecture:** Add `map_best_time` and `map_bonus` columns to existing `leaderboard` table. Update score calculation to include map bonus. Add new tab to leaderboard UI. Only 100% perfect map runs qualify.

**Tech Stack:** Vanilla JS, Supabase (PostgreSQL), CSS custom properties

---

### Task 1: Database Migration

**Files:**
- Create: `study-tools/database/migrate-map-leaderboard.sql`
- Modify: `study-tools/database/schema.sql:37-49`

**Step 1: Create migration file**

```sql
-- Add map quiz columns to leaderboard
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS map_best_time integer;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS map_bonus integer NOT NULL DEFAULT 0;
```

**Step 2: Update schema.sql to include new columns**

In the `CREATE TABLE leaderboard` block, add after `study_time_seconds`:
```sql
    map_best_time integer,
    map_bonus integer NOT NULL DEFAULT 0,
```

**Step 3: Run migration against Supabase**

Run the migration SQL in the Supabase SQL editor or via MCP tool.

**Step 4: Commit**

```
docs: add map leaderboard migration and update schema
```

---

### Task 2: Update Score Calculation

**Files:**
- Modify: `study-tools/engine/js/core/leaderboard.js:1-10` (calculateScore)
- Modify: `study-tools/engine/js/core/leaderboard.js:12-44` (submitScore)

**Step 1: Update `calculateScore` to include map bonus**

```javascript
calculateScore(vocabMastered, bestTestScore, studyTimeSeconds, mapBonus) {
    var vocabPts = (vocabMastered || 0) * 10;
    var testPts = bestTestScore || 0;
    var timePts = Math.floor((studyTimeSeconds || 0) / 60);
    var mapPts = mapBonus || 0;
    return vocabPts + testPts + timePts + mapPts;
},
```

**Step 2: Update `submitScore` to read map progress and include new fields**

After the existing `studyTimeSeconds` calculation (line ~27), add:

```javascript
var mapProgress = ProgressManager.getActivityProgress(unitId, 'map-quiz') || {};
var mapBestTime = (mapProgress.bestScore === 100 && mapProgress.bestTime) ? mapProgress.bestTime : null;
var mapBonus = mapBestTime ? Math.max(0, 180 - mapBestTime) : 0;
```

Update the `calculateScore` call to pass `mapBonus`.

Add `map_best_time: mapBestTime, map_bonus: mapBonus` to the upsert payload.

**Step 3: Commit**

```
feat: include map bonus in leaderboard score calculation
```

---

### Task 3: Update beforeunload Leaderboard Sync

**Files:**
- Modify: `study-tools/engine/js/core/progress.js` (beforeunload handler, leaderboard section ~line 901-923)

**Step 1: Add map fields to the keepalive fetch payload**

After `var bestTestScore = ...` line, add:

```javascript
var mapProgress = ProgressManager.getActivityProgress(uid, 'map-quiz') || {};
var mapBestTime = (mapProgress.bestScore === 100 && mapProgress.bestTime) ? mapProgress.bestTime : null;
var mapBonus = mapBestTime ? Math.max(0, 180 - mapBestTime) : 0;
var score = LeaderboardManager.calculateScore(vocabMastered, bestTestScore, studyTimeSeconds, mapBonus);
```

Add to the JSON.stringify payload:

```javascript
map_best_time: mapBestTime,
map_bonus: mapBonus,
```

**Step 2: Commit**

```
fix: include map bonus in beforeunload leaderboard sync
```

---

### Task 4: Submit Map Time on Perfect Run

**Files:**
- Modify: `study-tools/engine/js/activities/map-quiz.js:447-461` (_endGame)

**Step 1: After the existing `saveActivityProgress` call, trigger leaderboard update on perfect score**

After line 461 (`ProgressManager.saveActivityProgress(...)`) and inside the `if (pct === 100)` block (which starts at line 464), add:

```javascript
if (typeof LeaderboardManager !== 'undefined') {
    LeaderboardManager.submitScore();
}
```

This ensures that when a student gets 100%, the leaderboard immediately updates with their map time and bonus. The existing `submitScore` (from Task 2) will read the freshly-saved map progress.

**Step 2: Commit**

```
feat: submit leaderboard score on perfect map run
```

---

### Task 5: Score Explanation in Top Students Tab

**Files:**
- Modify: `study-tools/engine/js/core/leaderboard.js:96-94` (renderStudentRankings)

**Step 1: Add explanation text after the loading state resolves**

After `container.textContent = '';` (line ~144) and before the empty-state check, add:

```javascript
var explainer = document.createElement('p');
explainer.className = 'lb-explainer';
explainer.textContent = 'Vocab (\u00d710) + Test Score + Study Min + Map Bonus = Total';
container.appendChild(explainer);
```

**Step 2: Add CSS for the explainer**

In `study-tools/engine/css/styles.css`, add near the other `.lb-` styles:

```css
.lb-explainer {
    text-align: center;
    font-size: 0.8em;
    color: var(--text-muted);
    margin-bottom: 12px;
    font-weight: 500;
}
```

**Step 3: Add map stat to each ranking row**

In the `entries.forEach` loop (~line 196-238), after the test score stat, add:

```javascript
var mapStat = document.createElement('span');
mapStat.title = 'Map bonus';
mapStat.textContent = entry.map_bonus ? '+' + entry.map_bonus + ' map' : '';
if (mapStat.textContent) stats.appendChild(mapStat);
```

Update the select query (~line 121) to include the new columns:

```javascript
.select('student_id, score, vocab_mastered, best_test_score, study_time_seconds, map_best_time, map_bonus, updated_at')
```

**Step 4: Commit**

```
feat: add score explanation and map stat to student rankings
```

---

### Task 6: Map Speed Run Tab

**Files:**
- Modify: `study-tools/engine/js/core/leaderboard.js:59-94` (renderPage — tabs array and click handler)
- Add new method: `renderMapSpeedRun(container)` after `renderStudentRankings`

**Step 1: Add tab to the tabs array**

Insert after the `students` tab:

```javascript
{ id: 'map', label: 'Map Speed Run', icon: 'fas fa-map-marked-alt' },
```

**Step 2: Add click handler case**

In the tab click handler, add:

```javascript
else if (tab.id === 'map') self.renderMapSpeedRun(contentArea);
```

**Step 3: Implement `renderMapSpeedRun`**

Add new method after `renderStudentRankings`:

```javascript
async renderMapSpeedRun(container) {
    container.textContent = '';
    var loading = document.createElement('div');
    loading.style.cssText = 'text-align:center;padding:30px;color:var(--text-muted);';
    var spinner = document.createElement('i');
    spinner.className = 'fas fa-spinner fa-spin';
    loading.appendChild(spinner);
    loading.appendChild(document.createTextNode(' Loading map times...'));
    container.appendChild(loading);

    if (!ProgressManager.supabase) {
        container.textContent = '';
        var msg = document.createElement('p');
        msg.style.cssText = 'text-align:center;color:var(--text-muted);padding:30px;';
        msg.textContent = 'Speed run board requires an internet connection.';
        container.appendChild(msg);
        return;
    }

    try {
        var config = StudyEngine.config;
        var unitId = config ? config.unit.id : null;

        var query = ProgressManager.supabase
            .from('leaderboard')
            .select('student_id, map_best_time, map_bonus')
            .eq('approved', true)
            .not('map_best_time', 'is', null)
            .order('map_best_time', { ascending: true })
            .limit(50);
        if (unitId) query = query.eq('unit_id', unitId);

        var result = await query;
        if (result.error) throw result.error;
        var entries = result.data || [];

        // Get student names
        var studentIds = entries.map(function(e) { return e.student_id; });
        var studentNames = {};
        if (studentIds.length > 0) {
            var sResult = await ProgressManager.supabase
                .from('students')
                .select('id, name')
                .in('id', studentIds);
            if (sResult.data) {
                sResult.data.forEach(function(s) { studentNames[s.id] = s; });
            }
        }

        container.textContent = '';

        // Explanation
        var desc = document.createElement('p');
        desc.className = 'lb-explainer';
        desc.textContent = 'Get 100% on the Map Quiz to post your time. Faster = more bonus points!';
        container.appendChild(desc);

        if (entries.length === 0) {
            var empty = document.createElement('div');
            empty.style.cssText = 'text-align:center;padding:40px;color:var(--text-muted);';
            var emptyIcon = document.createElement('i');
            emptyIcon.className = 'fas fa-map-marked-alt';
            emptyIcon.style.cssText = 'font-size:2em;display:block;margin-bottom:12px;opacity:0.3;';
            empty.appendChild(emptyIcon);
            var emptyText = document.createElement('p');
            emptyText.textContent = 'No perfect map runs yet. Get 100% to post your time!';
            empty.appendChild(emptyText);
            container.appendChild(empty);
            return;
        }

        // Podium for top 3
        if (entries.length >= 3) {
            var podium = document.createElement('div');
            podium.className = 'lb-podium';
            var podiumOrder = [1, 0, 2];
            podiumOrder.forEach(function(idx) {
                var entry = entries[idx];
                var student = studentNames[entry.student_id] || {};
                var place = document.createElement('div');
                place.className = 'lb-podium-place lb-place-' + (idx + 1);

                var medal = document.createElement('div');
                medal.className = 'lb-medal';
                var medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
                medal.textContent = medals[idx];
                place.appendChild(medal);

                var name = document.createElement('div');
                name.className = 'lb-podium-name';
                name.textContent = student.name || 'Unknown';
                place.appendChild(name);

                var time = document.createElement('div');
                time.className = 'lb-podium-score';
                var m = Math.floor(entry.map_best_time / 60);
                var s = entry.map_best_time % 60;
                time.textContent = m + ':' + (s < 10 ? '0' : '') + s;
                place.appendChild(time);

                podium.appendChild(place);
            });
            container.appendChild(podium);
        }

        // Full list
        var list = document.createElement('div');
        list.className = 'lb-list';

        entries.forEach(function(entry, i) {
            var student = studentNames[entry.student_id] || {};
            var row = document.createElement('div');
            row.className = 'lb-row';
            if (ProgressManager.studentId === entry.student_id) row.classList.add('lb-row-me');

            var rank = document.createElement('div');
            rank.className = 'lb-rank';
            rank.textContent = '#' + (i + 1);
            row.appendChild(rank);

            var nameEl = document.createElement('div');
            nameEl.className = 'lb-name';
            nameEl.textContent = student.name || 'Unknown';
            if (ProgressManager.studentId === entry.student_id) {
                var youTag = document.createElement('span');
                youTag.className = 'lb-you-tag';
                youTag.textContent = 'YOU';
                nameEl.appendChild(youTag);
            }
            row.appendChild(nameEl);

            var stats = document.createElement('div');
            stats.className = 'lb-stats';
            var timeStat = document.createElement('span');
            var m = Math.floor(entry.map_best_time / 60);
            var s = entry.map_best_time % 60;
            timeStat.textContent = m + ':' + (s < 10 ? '0' : '') + s;
            stats.appendChild(timeStat);
            row.appendChild(stats);

            var scoreEl = document.createElement('div');
            scoreEl.className = 'lb-score';
            scoreEl.textContent = '+' + (entry.map_bonus || 0) + ' pts';
            row.appendChild(scoreEl);

            list.appendChild(row);
        });

        container.appendChild(list);

    } catch (err) {
        console.error('Map speed run error:', err);
        container.textContent = '';
        var errEl = document.createElement('p');
        errEl.style.cssText = 'text-align:center;color:var(--danger);padding:20px;';
        errEl.textContent = 'Failed to load map speed runs.';
        container.appendChild(errEl);
    }
},
```

**Step 4: Commit**

```
feat: add Map Speed Run leaderboard tab
```

---

### Task 7: Update Dashboard Scores Table

**Files:**
- Modify: `study-tools/dashboard/dashboard.js:936` (select query)
- Modify: `study-tools/dashboard/dashboard.js:996` (table headers)
- Modify: `study-tools/dashboard/dashboard.js:~1047` (row rendering)

**Step 1: Add map columns to the select query**

Change the select to include `map_best_time, map_bonus`:

```javascript
.select('id, student_id, unit_id, score, vocab_mastered, best_test_score, study_time_seconds, map_best_time, map_bonus, approved, updated_at')
```

**Step 2: Add "Map Time" to table headers**

Insert `'Map Time'` before `'Actions'` in the headers array.

**Step 3: Add map time cell in the row rendering loop**

After the study time cell and before the actions cell, add:

```javascript
var tdMap = document.createElement('td');
if (entry.map_best_time) {
    var mm = Math.floor(entry.map_best_time / 60);
    var ss = entry.map_best_time % 60;
    tdMap.textContent = mm + ':' + (ss < 10 ? '0' : '') + ss + ' (+' + (entry.map_bonus || 0) + ')';
} else {
    tdMap.textContent = '-';
}
tr.appendChild(tdMap);
```

**Step 4: Commit**

```
feat: show map time and bonus in teacher dashboard scores
```

---

### Task 8: Version Bump and Changelog

**Files:**
- Modify: `study-tools/engine/version.json`
- Modify: `CHANGELOG.md`
- Modify: `README.md` (version badge)

**Step 1: Bump version to 7.4.0, update date to 2026-03-10**

**Step 2: Add changelog entry**

```markdown
## [7.4.0] - 2026-03-10

### Added
- **Map quiz bonus points** — Perfect map runs (100%) earn bonus points: `max(0, 180 - seconds)`, rewarding speed
- **Map Speed Run leaderboard tab** — Fastest perfect map times ranked separately with podium
- **Score formula explanation** — "Vocab (x10) + Test Score + Study Min + Map Bonus = Total" shown above rankings
- **Map bonus column** — Map time and bonus visible in Top Students stats and teacher dashboard

### Changed
- Leaderboard composite score now includes map bonus in calculation
```

**Step 3: Update README badge to 7.4.0**

**Step 4: Commit**

```
docs: bump version to 7.4.0, update changelog and readme
```
