# Scheduled Category Unlocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add calendar-based "floor" unlocks for the Civil War unit so categories open on scheduled Sundays regardless of mastery, while preserving the existing mastery-accelerator behavior.

**Architecture:** New `categorySchedule` block in unit config maps category names to ISO dates. `MasteryManager` gets a `isCategoryDateUnlocked` helper and the two existing `get*UnlockedCategories` functions become OR-logic (mastered-prev OR date-passed). Teacher dashboard gains a Schedule tab showing per-category dates with a copy-snippet "Unlock now" affordance. Source of truth stays in git — no new backend.

**Tech Stack:** Vanilla HTML/CSS/JS, no build tools, no test framework. Verification is browser-based with explicit pass/fail criteria. A tiny standalone HTML harness covers the gating logic where unit-test discipline pays off. No `innerHTML` anywhere — DOM creation methods only (project convention for XSS safety).

**Spec:** `docs/superpowers/specs/2026-05-17-scheduled-unlocks-design.md`

---

## File Structure

**Modify:**
- `study-tools/units/civil-war/config.json` — add `categorySchedule` block (top-level, after `unit` object).
- `study-tools/engine/js/core/mastery.js` — add `isCategoryDateUnlocked`; modify `getUnlockedCategories`, `getReadUnlockedCategories`, `showMasteryNudge`.
- `study-tools/dashboard/index.html` — add Schedule tab button and pane.
- `study-tools/dashboard/dashboard.js` — render schedule, modal handler, route Schedule tab.
- `study-tools/dashboard/dashboard.css` — schedule table + modal styles.
- `study-tools/engine/version.json` — bump to next minor.

**Create (test harness, not shipped):**
- `study-tools/engine/tests/mastery-schedule.html` — standalone page that runs gating assertions against synthetic configs and prints PASS/FAIL.

---

## Task 1: Add the date-unlock helper to MasteryManager

**Files:**
- Modify: `study-tools/engine/js/core/mastery.js` (insert before `getCategories`)

- [ ] **Step 1: Add `isCategoryDateUnlocked` method**

Open `study-tools/engine/js/core/mastery.js`. Insert this method between the `buildTermSectionMap` method (ends ~line 90) and the `getCategories` method:

```javascript
    /**
     * Returns true if the category has a scheduled unlock date in config.categorySchedule
     * that is today-or-earlier (local time). Returns false if no schedule entry exists.
     * Dates parsed as local midnight via new Date(y, m-1, d) to avoid UTC surprises.
     */
    isCategoryDateUnlocked(config, categoryName) {
        if (!config || !config.categorySchedule) return false;
        var iso = config.categorySchedule[categoryName];
        if (!iso) return false;
        var parts = iso.split('-');
        if (parts.length !== 3) return false;
        var y = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        var d = parseInt(parts[2], 10);
        if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
        var unlockAt = new Date(y, m - 1, d);
        return Date.now() >= unlockAt.getTime();
    },
```

- [ ] **Step 2: Sanity-check in DevTools**

Open `study-tools/engine/index.html?unit=civil-war` in a browser. In DevTools console:

```javascript
MasteryManager.isCategoryDateUnlocked({}, 'X')           // expect: false
MasteryManager.isCategoryDateUnlocked({categorySchedule:{}}, 'X')  // expect: false
MasteryManager.isCategoryDateUnlocked({categorySchedule:{X:'2020-01-01'}}, 'X')  // expect: true
MasteryManager.isCategoryDateUnlocked({categorySchedule:{X:'2099-01-01'}}, 'X')  // expect: false
MasteryManager.isCategoryDateUnlocked({categorySchedule:{X:'bad'}}, 'X')  // expect: false
```

All five must match. If any are wrong, stop and inspect.

- [ ] **Step 3: Commit**

```bash
git add study-tools/engine/js/core/mastery.js
git commit -m "feat(mastery): add isCategoryDateUnlocked helper

Returns true when a category's scheduled unlock date has passed.
Parses ISO dates as local midnight so timezone is the student's
clock, not UTC. Foundation for calendar-based category floors."
```

---

## Task 2: Make getUnlockedCategories use OR-with-date

**Files:**
- Modify: `study-tools/engine/js/core/mastery.js` (the `getUnlockedCategories` method)

- [ ] **Step 1: Replace `getUnlockedCategories`**

Find the existing `getUnlockedCategories` (currently mastery.js:130-143). Replace its body with:

```javascript
    getUnlockedCategories(unitId, config) {
        const categories = this.getCategories(config);
        if (categories.length === 0) return [];
        if (sessionStorage.getItem('teacher-unlock') === 'true') return categories.slice();
        const unlocked = [categories[0]];
        for (let i = 1; i < categories.length; i++) {
            var prevMastered = this.isCategoryMastered(unitId, config, categories[i - 1]);
            var dateUnlocked = this.isCategoryDateUnlocked(config, categories[i]);
            if (prevMastered || dateUnlocked) {
                unlocked.push(categories[i]);
            }
        }
        return unlocked;
    },
```

The critical change vs the old version: the `else { break; }` is gone. Without that, a category opened by date could be skipped if a prior category was locked.

- [ ] **Step 2: Verify in DevTools**

In `study-tools/engine/index.html?unit=civil-war` console (with no `categorySchedule` yet in config, so we're testing backwards-compat):

```javascript
var cfg = await fetch('../units/civil-war/config.json').then(r=>r.json())
MasteryManager.getUnlockedCategories('civil-war', cfg)
// expect: ["Worlds of North & South"]
```

If the array contains anything else (without prior progress), stop — backwards-compat is broken.

- [ ] **Step 3: Commit**

```bash
git add study-tools/engine/js/core/mastery.js
git commit -m "feat(mastery): unlock categories by date OR prior mastery

Removes the early-break in getUnlockedCategories so a date-floor
unlock on category N+1 isn't blocked by category N still being
locked. Behavior unchanged when no categorySchedule is set."
```

---

## Task 3: Apply same OR logic to getReadUnlockedCategories

**Files:**
- Modify: `study-tools/engine/js/core/mastery.js` (the `getReadUnlockedCategories` method)

- [ ] **Step 1: Replace `getReadUnlockedCategories`**

Find the existing `getReadUnlockedCategories` (currently mastery.js:149-170). Replace its body with:

```javascript
    getReadUnlockedCategories(unitId, config) {
        const categories = this.getCategories(config);
        if (categories.length === 0) return [];
        if (sessionStorage.getItem('teacher-unlock') === 'true') return categories.slice();

        const textbook = this._textbookCache[unitId] !== undefined ? this._textbookCache[unitId] : null;
        const unlocked = [];
        for (let i = 0; i < categories.length; i++) {
            const chapterRead = this.isChapterRead(unitId, textbook, categories[i]);
            if (i === 0) {
                if (chapterRead) unlocked.push(categories[i]);
                continue;
            }
            const prevMastered = this.isCategoryMastered(unitId, config, categories[i - 1]);
            const dateUnlocked = this.isCategoryDateUnlocked(config, categories[i]);
            if ((prevMastered || dateUnlocked) && chapterRead) {
                unlocked.push(categories[i]);
            }
        }
        return unlocked;
    },
```

Critical: chapter-read is still required (AND), only the previous-mastery requirement gets OR'd with the date. Also note `continue` not `break` for cat 0 — same reason as Task 2.

- [ ] **Step 2: Sanity-check**

In console with civil-war loaded (no schedule yet):

```javascript
var cfg = await fetch('../units/civil-war/config.json').then(r=>r.json())
MasteryManager.getReadUnlockedCategories('civil-war', cfg)
// expect: [] if you haven't read cat 1's chapter, ["Worlds of North & South"] if you have
```

- [ ] **Step 3: Commit**

```bash
git add study-tools/engine/js/core/mastery.js
git commit -m "feat(mastery): apply OR-with-date logic to read-gated unlocks

Flashcards keep the Read > Study requirement, but the
prev-category-mastered prereq becomes prev-mastered OR
date-unlocked. Without this, a date-floor wouldn't reach
flashcards."
```

---

## Task 4: Soften nudge text when next category is already date-open

**Files:**
- Modify: `study-tools/engine/js/core/mastery.js` (the `showMasteryNudge` method)

- [ ] **Step 1: Replace `showMasteryNudge`**

Find `showMasteryNudge` (currently mastery.js:269-286). Replace with:

```javascript
    showMasteryNudge(config, masteredCategory) {
        const unitId = config.unit ? config.unit.id : null;
        if (!unitId) return;
        const next = this.getNextLockedCategory(unitId, config);
        const firstName = ProgressManager.getFirstName();
        if (!next) {
            const prefix = firstName ? `Amazing, ${firstName}!` : 'Amazing!';
            StudyUtils.showToast(`${prefix} All categories mastered! Every activity is now fully unlocked!`, 'success');
            return;
        }
        const prefix = firstName ? `Nice work, ${firstName}!` : 'Nice!';
        // If next category is already date-unlocked, don't pretend mastery is the gate.
        if (this.isCategoryDateUnlocked(config, next)) {
            StudyUtils.showToast(`${prefix} "${masteredCategory}" mastered!`, 'success');
            return;
        }
        var nextChapter = this.getNextUnreadChapter(unitId, config);
        if (nextChapter) {
            StudyUtils.showToast(`${prefix} "${masteredCategory}" mastered! Read the next chapter in the textbook to unlock "${next}" terms.`, 'success');
        } else {
            StudyUtils.showToast(`${prefix} "${masteredCategory}" mastered! Now try "${next}" flashcards to unlock more.`, 'success');
        }
    },
```

- [ ] **Step 2: Commit**

```bash
git add study-tools/engine/js/core/mastery.js
git commit -m "feat(mastery): drop 'now try X' nudge when X is already date-open

When the next category has been opened by the calendar floor,
the 'try those flashcards to unlock more' wording is misleading
since nothing is being unlocked by that action. Short-circuit
to a celebration-only toast."
```

---

## Task 5: Build the standalone gating-logic test harness

**Files:**
- Create: `study-tools/engine/tests/mastery-schedule.html`

- [ ] **Step 1: Create the test harness**

Create directory `study-tools/engine/tests/` if it doesn't exist. Write this file (uses textContent + DOM methods only — no innerHTML, per project XSS convention):

```html
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Mastery Schedule Tests</title>
<style>
body{font-family:monospace;padding:1em;}
.pass{color:#070;}.fail{color:#c00;font-weight:bold;}
h2{margin-top:1.5em;}
table{border-collapse:collapse;margin-top:0.5em;}
th,td{border:1px solid #888;padding:4px 8px;}
</style></head><body>
<h1>MasteryManager schedule tests</h1>
<div id="results"></div>

<!-- Stub the globals mastery.js depends on -->
<script>
window.ProgressManager = {
    getActivityProgress: function(){ return {}; },
    load: function(){ return {}; },
    save: function(){},
    getFirstName: function(){ return ''; }
};
window.StudyUtils = { showToast: function(){} };
</script>
<script src="../js/core/mastery.js"></script>
<script>
var results = document.getElementById('results');
var passed = 0, failed = 0;
function assert(name, actual, expected) {
    var ok = JSON.stringify(actual) === JSON.stringify(expected);
    var div = document.createElement('div');
    div.className = ok ? 'pass' : 'fail';
    div.textContent = (ok ? 'PASS ' : 'FAIL ') + name +
        (ok ? '' : ' — got ' + JSON.stringify(actual) + ' expected ' + JSON.stringify(expected));
    results.appendChild(div);
    ok ? passed++ : failed++;
}

var pastDate = '2020-01-01';
var futureDate = '2099-01-01';

function makeConfig(opts) {
    opts = opts || {};
    return {
        unit: { id: 'test-unit' },
        vocabulary: [
            { term: 'a1', category: 'A', tier: 'must-know' },
            { term: 'b1', category: 'B', tier: 'must-know' },
            { term: 'c1', category: 'C', tier: 'must-know' }
        ],
        categorySchedule: opts.schedule || undefined
    };
}

assert('date helper: no schedule block',
    MasteryManager.isCategoryDateUnlocked({}, 'A'), false);
assert('date helper: empty schedule',
    MasteryManager.isCategoryDateUnlocked({categorySchedule:{}}, 'A'), false);
assert('date helper: past date is unlocked',
    MasteryManager.isCategoryDateUnlocked({categorySchedule:{A:pastDate}}, 'A'), true);
assert('date helper: future date is locked',
    MasteryManager.isCategoryDateUnlocked({categorySchedule:{A:futureDate}}, 'A'), false);
assert('date helper: malformed string is locked',
    MasteryManager.isCategoryDateUnlocked({categorySchedule:{A:'not-a-date'}}, 'A'), false);

assert('no schedule: cat 1 only when nothing mastered',
    MasteryManager.getUnlockedCategories('test-unit', makeConfig()),
    ['A']);

assert('cat B date-unlocked: cat B opens even without A mastered',
    MasteryManager.getUnlockedCategories('test-unit',
        makeConfig({ schedule: { B: pastDate } })),
    ['A', 'B']);

assert('cat C date-unlocked but B locked: C still opens (no early break)',
    MasteryManager.getUnlockedCategories('test-unit',
        makeConfig({ schedule: { C: pastDate } })),
    ['A', 'C']);

assert('all date-unlocked: all open',
    MasteryManager.getUnlockedCategories('test-unit',
        makeConfig({ schedule: { B: pastDate, C: pastDate } })),
    ['A', 'B', 'C']);

assert('future dates only: only cat 1',
    MasteryManager.getUnlockedCategories('test-unit',
        makeConfig({ schedule: { B: futureDate, C: futureDate } })),
    ['A']);

var summary = document.createElement('h2');
summary.textContent = passed + ' passed, ' + failed + ' failed';
summary.className = failed === 0 ? 'pass' : 'fail';
results.appendChild(summary);
</script>
</body></html>
```

- [ ] **Step 2: Run the harness**

Open `study-tools/engine/tests/mastery-schedule.html` in a browser. The relative `<script src="../js/core/mastery.js">` will work via `file://` on most browsers; if your browser blocks it, run `python3 -m http.server 8765` from `study-tools/` and open `http://localhost:8765/engine/tests/mastery-schedule.html`.

Expected: every line says PASS, footer says "10 passed, 0 failed".

If any FAIL, stop and fix the offending mastery.js change before continuing.

- [ ] **Step 3: Commit**

```bash
git add study-tools/engine/tests/mastery-schedule.html
git commit -m "test(mastery): standalone harness for schedule gating

Vanilla-JS test page exercising isCategoryDateUnlocked and the
OR-with-date logic in getUnlockedCategories. No framework — just
opens in a browser and prints PASS/FAIL. Catches regressions
that backward-compat checks against live config wouldn't notice
(e.g. the early-break bug)."
```

---

## Task 6: Add categorySchedule to civil-war config

**Files:**
- Modify: `study-tools/units/civil-war/config.json` (insert after the `unit` block, before `vocabulary`)

- [ ] **Step 1: Insert the schedule block**

Open `study-tools/units/civil-war/config.json`. After the closing `}` of the top-level `"unit": { ... }` object (and its trailing comma), and before the next top-level key, insert:

```json
    "categorySchedule": {
        "Worlds of North & South": "2026-05-10",
        "African Americans at Mid-Century": "2026-05-17",
        "A Dividing Nation": "2026-05-24",
        "The Civil War": "2026-05-31"
    },
```

Match the file's existing indentation (4 spaces based on line 2). Make sure the previous line ends with `,` and the line after starts a new key — JSON must remain valid.

- [ ] **Step 2: Validate JSON**

Run:

```bash
python3 -c "import json; json.load(open('study-tools/units/civil-war/config.json'))" && echo OK
```

Expected: `OK`. If you get a JSONDecodeError, fix the formatting before continuing.

- [ ] **Step 3: Verify in browser**

Open `study-tools/engine/index.html?unit=civil-war`. With a fresh profile (or `localStorage.clear()` + reload), today (2026-05-17) you should see:

- Home page category list: "Worlds of North & South" and "African Americans at Mid-Century" both open, others locked.
- Open a short-answer / practice-test activity: questions tagged with either of the first two categories appear, but not category 3 or 4.

If only cat 1 is open, the schedule block isn't being read — inspect the JSON and the new helper.

- [ ] **Step 4: Commit**

```bash
git add study-tools/units/civil-war/config.json
git commit -m "feat(civil-war): schedule weeks 1-4 category unlocks

Cats 1 & 2 open immediately for week-2 launch; cat 3 (A Dividing
Nation) opens 2026-05-24 and cat 4 (The Civil War) 2026-05-31.
Mastery still accelerates: fast students can unlock ahead of
the calendar by mastering prior categories."
```

---

## Task 7: Add Schedule tab to the teacher dashboard (HTML)

**Files:**
- Modify: `study-tools/dashboard/index.html`

- [ ] **Step 1: Add the tab button**

In `study-tools/dashboard/index.html`, find the `<nav class="tab-nav">` block (line 81). After the last `<button>` (the wiki button at line 103-105), and BEFORE the closing `</nav>`, add:

```html
            <button class="tab-btn" data-tab="schedule" onclick="Dashboard.switchTab('schedule')">
                <i class="fas fa-calendar-alt"></i> Schedule
            </button>
```

- [ ] **Step 2: Add the tab pane**

Find the last existing `<div id="tab-wiki" class="tab-content">` (line 145). After its closing `</div>` (line 147), and BEFORE the Student Edit Modal block (line 149), add:

```html
        <div id="tab-schedule" class="tab-content">
            <div id="schedule-container"></div>
        </div>
```

- [ ] **Step 3: Add the unlock-snippet modal**

Inside the same `<div id="dashboard">` block, after the Student Edit Modal (closes at line 158), add:

```html
        <!-- Unlock Snippet Modal -->
        <div id="schedule-unlock-modal" class="modal-overlay hidden">
            <div class="modal-card">
                <div class="modal-card-header">
                    <h3>Unlock category now</h3>
                    <button class="btn-close-modal" onclick="Dashboard.closeUnlockModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-card-body" id="schedule-unlock-body"></div>
            </div>
        </div>
```

- [ ] **Step 4: Verify**

Open `study-tools/dashboard/index.html` in a browser, log in. The tab nav should now show a "Schedule" button. Clicking it switches to an empty pane (we wire it up next). No JS errors in console.

- [ ] **Step 5: Commit**

```bash
git add study-tools/dashboard/index.html
git commit -m "feat(dashboard): add Schedule tab shell

Empty tab + button + modal scaffolding. JS handlers in the
next commit so this stays a small, reviewable change."
```

---

## Task 8: Wire up the Schedule tab JS

**Files:**
- Modify: `study-tools/dashboard/dashboard.js`

No `innerHTML` anywhere — every DOM construction uses `createElement` + `textContent` + `appendChild`. This matches the project XSS convention.

- [ ] **Step 1: Find the switchTab method and add schedule routing**

In `study-tools/dashboard/dashboard.js`, find the `switchTab` method (search for `switchTab:` or `switchTab(` — it dispatches per-tab loaders). Add a branch so that when `tab === 'schedule'` it calls `this.renderSchedule()`. Insert alongside the other branches. For example, if existing code looks like:

```javascript
if (tab === 'wiki') this.loadWikiTab();
```

add right after it:

```javascript
if (tab === 'schedule') this.renderSchedule();
```

(If the dispatcher uses a switch statement, add a `case 'schedule': this.renderSchedule(); break;`.)

- [ ] **Step 2: Add the Schedule-related methods**

Anywhere inside the `Dashboard = { ... }` object (e.g. after the existing `_preloadUnitConfigs` helper near the top), add these methods. Note the trailing commas required for object-literal members:

```javascript
    // ---- Schedule tab ----
    async renderSchedule() {
        var container = document.getElementById('schedule-container');
        if (!container) return;
        container.textContent = 'Loading…';

        // Discover units. Reuse the filter dropdown's option list as the source of truth.
        var unitIds = [];
        var unitSel = document.getElementById('filter-unit');
        if (unitSel) {
            unitIds = Array.from(unitSel.options)
                .map(function(o){ return o.value; })
                .filter(function(v){ return v; });
        }
        // Fallback if dropdown not populated yet
        if (unitIds.length === 0) unitIds = ['civil-war'];

        await this._preloadUnitConfigs(unitIds);

        // Clear loading text
        while (container.firstChild) container.removeChild(container.firstChild);

        var any = false;
        var self = this;
        unitIds.forEach(function(unitId) {
            var cfg = self._unitConfigCache[unitId];
            if (!cfg || !cfg.categorySchedule) return;
            any = true;
            container.appendChild(self._buildScheduleSection(unitId, cfg));
        });
        if (!any) {
            var p = document.createElement('p');
            p.textContent = 'No units have a categorySchedule configured.';
            container.appendChild(p);
        }
    },

    _buildScheduleSection(unitId, cfg) {
        var section = document.createElement('section');
        section.className = 'schedule-section';

        var h2 = document.createElement('h2');
        h2.textContent = (cfg.unit && cfg.unit.name) || unitId;
        section.appendChild(h2);

        var table = document.createElement('table');
        table.className = 'schedule-table';

        var thead = document.createElement('thead');
        var headRow = document.createElement('tr');
        ['Category','Scheduled date','Status',''].forEach(function(label){
            var th = document.createElement('th');
            th.textContent = label;
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        var today = new Date();
        today.setHours(0,0,0,0);
        var self = this;
        Object.keys(cfg.categorySchedule).forEach(function(cat) {
            var iso = cfg.categorySchedule[cat];
            var tr = document.createElement('tr');

            var tdCat = document.createElement('td');
            tdCat.textContent = cat;
            tr.appendChild(tdCat);

            var tdDate = document.createElement('td');
            tdDate.textContent = self._formatScheduleDate(iso);
            tr.appendChild(tdDate);

            var parts = iso.split('-');
            var unlockAt = new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10));
            var diffDays = Math.round((unlockAt - today) / 86400000);

            var tdStatus = document.createElement('td');
            if (diffDays <= 0) {
                tdStatus.textContent = '✓ Unlocked';
                tdStatus.className = 'status-unlocked';
            } else {
                tdStatus.textContent = 'Locked (in ' + diffDays + ' day' + (diffDays===1?'':'s') + ')';
                tdStatus.className = 'status-locked';
            }
            tr.appendChild(tdStatus);

            var tdAction = document.createElement('td');
            if (diffDays > 0) {
                var btn = document.createElement('button');
                btn.className = 'btn btn-primary btn-sm';
                btn.textContent = 'Unlock now';
                btn.addEventListener('click', function() {
                    self.openUnlockModal(unitId, cfg, cat);
                });
                tdAction.appendChild(btn);
            }
            tr.appendChild(tdAction);

            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        section.appendChild(table);
        return section;
    },

    _formatScheduleDate(iso) {
        var parts = iso.split('-');
        var d = new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10));
        return d.toLocaleDateString(undefined, { weekday:'short', year:'numeric', month:'long', day:'numeric' });
    },

    openUnlockModal(unitId, cfg, categoryName) {
        var todayIso = new Date().toISOString().slice(0,10);
        var updated = Object.assign({}, cfg.categorySchedule);
        updated[categoryName] = todayIso;
        var snippet = '"categorySchedule": ' + JSON.stringify(updated, null, 4);

        var body = document.getElementById('schedule-unlock-body');
        while (body.firstChild) body.removeChild(body.firstChild);

        var p = document.createElement('p');
        p.textContent = 'Replace the existing categorySchedule block in study-tools/units/' + unitId + '/config.json with the snippet below, then commit and push. Students will see the unlock on their next page load.';
        body.appendChild(p);

        var pre = document.createElement('pre');
        pre.className = 'unlock-snippet';
        pre.textContent = snippet;
        body.appendChild(pre);

        var copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-primary';
        copyBtn.textContent = 'Copy snippet';
        copyBtn.addEventListener('click', function() {
            navigator.clipboard.writeText(snippet).then(function(){
                copyBtn.textContent = 'Copied ✓';
                setTimeout(function(){ copyBtn.textContent = 'Copy snippet'; }, 1500);
            });
        });
        body.appendChild(copyBtn);

        document.getElementById('schedule-unlock-modal').classList.remove('hidden');
    },

    closeUnlockModal() {
        document.getElementById('schedule-unlock-modal').classList.add('hidden');
    },
```

- [ ] **Step 3: Verify in browser**

Reload the dashboard. Switch to the Schedule tab. Expected:

- A "Civil War" section with a 4-row table.
- Rows 1 & 2 show "✓ Unlocked", no button.
- Rows 3 & 4 show "Locked (in N days)" with an "Unlock now" button.
- Clicking "Unlock now" on row 3 opens the modal with a JSON snippet that has "A Dividing Nation" set to today's date and the other three dates unchanged.
- "Copy snippet" copies to clipboard (paste into any text editor to verify).
- No console errors.

If the Schedule tab is empty, check whether `civil-war` made it into the unit dropdown. The hard-coded fallback `['civil-war']` should cover the cold-start case.

- [ ] **Step 4: Commit**

```bash
git add study-tools/dashboard/dashboard.js
git commit -m "feat(dashboard): render Schedule tab with copy-snippet unlocker

Per-unit table of categories with scheduled date + status. The
'Unlock now' button opens a modal containing the exact JSON
snippet to paste into config.json — keeps git as source of
truth without needing a backend write. Pure DOM construction
(no innerHTML) per project XSS convention."
```

---

## Task 9: Style the schedule table and modal

**Files:**
- Modify: `study-tools/dashboard/dashboard.css`

- [ ] **Step 1: Append schedule styles**

At the end of `study-tools/dashboard/dashboard.css`, append:

```css
/* Schedule tab */
.schedule-section { margin-bottom: 2rem; }
.schedule-section h2 { margin-bottom: 0.75rem; font-size: 1.15rem; }
.schedule-table { width: 100%; border-collapse: collapse; }
.schedule-table th,
.schedule-table td { padding: 0.6rem 0.75rem; border-bottom: 1px solid #e2e8f0; text-align: left; }
.schedule-table th { font-weight: 600; background: #f7fafc; }
.schedule-table .status-unlocked { color: #2f855a; font-weight: 600; }
.schedule-table .status-locked { color: #718096; }
.btn-sm { padding: 0.35rem 0.75rem; font-size: 0.85rem; }

.unlock-snippet {
    background: #1a202c;
    color: #e2e8f0;
    padding: 0.9rem 1rem;
    border-radius: 6px;
    font-family: ui-monospace, "SF Mono", Consolas, monospace;
    font-size: 0.85rem;
    white-space: pre;
    overflow-x: auto;
    margin: 0.75rem 0;
}
```

- [ ] **Step 2: Verify**

Reload the dashboard, switch to Schedule tab. Table should have padded cells, a header row with light grey background, green "✓ Unlocked" text, grey "Locked..." text. Open the unlock modal — the JSON snippet should appear in a dark code block.

- [ ] **Step 3: Commit**

```bash
git add study-tools/dashboard/dashboard.css
git commit -m "style(dashboard): schedule table + unlock-snippet code block

Visual treatment for the new Schedule tab. Color codes
locked/unlocked status and gives the JSON snippet a readable
dark code-block aesthetic."
```

---

## Task 10: Full regression sweep + version bump + push

**Files:**
- Modify: `study-tools/engine/version.json`

- [ ] **Step 1: Run the test harness again**

Open `study-tools/engine/tests/mastery-schedule.html`. Confirm all PASS.

- [ ] **Step 2: Civil War: default-state browser checks**

Open `study-tools/engine/index.html?unit=civil-war` in an incognito window (fresh state) on today's date. Verify on the engine home page:

- Categories 1 & 2 in vocab/flashcards list are accessible; 3 & 4 show locked.
- Practice-test topic filter shows only "Worlds..." and "African Americans..." (plus any always-on items).
- Short-answer activity: same — only first two topics' questions render.
- Games (matching, who-am-i, gap-fill) sample only from the first two categories' must-know terms.

Any deviation: stop and inspect.

- [ ] **Step 3: Civil War: mastery race-ahead**

Same window, master all must-know terms in cat 1 via flashcards (fastest path: in DevTools console, with civil-war config already fetched):

```javascript
var unit = 'civil-war';
fetch('../units/civil-war/config.json').then(r=>r.json()).then(function(cfg){
    var terms = cfg.vocabulary
        .filter(function(v){ return v.category==='Worlds of North & South' && (!v.tier||v.tier==='must-know'); })
        .map(function(v){ return v.term; });
    var p = ProgressManager.getActivityProgress(unit, 'flashcards') || {};
    p.mastered = terms;
    ProgressManager.save(unit, 'flashcards', p);
    location.reload();
});
```

After reload, verify cat 3 ("A Dividing Nation") now unlocks (mastery cascade past the date-already-open cat 2). Cat 4 still locked.

- [ ] **Step 4: Early-republic backwards-compat**

Open `study-tools/engine/index.html?unit=early-republic` in incognito. Verify the unit's category list behavior is unchanged from prior releases — only cat 1 open without progress, cascade by mastery only.

- [ ] **Step 5: Dashboard sanity**

Log into the dashboard. Visit every existing tab (Overview, Students, Activity Usage, Class Codes, Scores, Vocab Insights, Leaderboard, Wiki Entries) and confirm none throw console errors or render blank. Then visit Schedule and confirm it still works.

- [ ] **Step 6: Bump version**

Edit `study-tools/engine/version.json`:

```json
{
    "version": "8.38.0",
    "date": "2026-05-17"
}
```

(Minor bump because this is a new user-facing feature.)

- [ ] **Step 7: Commit version + push**

```bash
git add study-tools/engine/version.json
git commit -m "chore: bump to 8.38.0 for scheduled category unlocks

User-visible feature: week-based calendar floors for category
unlocks in the Civil War unit, plus a teacher Schedule tab."
git push origin main
```

- [ ] **Step 8: Post-push verification**

Wait ~60 seconds for GitHub Pages to rebuild. Open the live site in incognito. Confirm:

- Version footer reads 8.38.0.
- Civil War unit shows cats 1 & 2 unlocked, 3 & 4 locked.
- Dashboard Schedule tab renders.

---

## Self-Review

**Spec coverage:**
- Goal 1 (cats 1&2 unlocked by default) → Task 6 (schedule block with past dates).
- Goal 2 (cat 3 on 2026-05-24) → Task 6.
- Goal 3 (cat 4 on 2026-05-31) → Task 6.
- Goal 4 (mastery still accelerates) → Tasks 2 & 3 (OR semantics).
- Goal 5 (teacher dashboard unlock affordance) → Tasks 7–9.
- Goal 6 (other units unaffected) → Tasks 2 & 3 guard on `!config.categorySchedule`; verified in Task 10 step 4.

**Placeholder scan:** no TBDs, no vague "handle edge cases" — every step has runnable code or commands.

**Type consistency:** method names `isCategoryDateUnlocked`, `renderSchedule`, `openUnlockModal`, `closeUnlockModal`, `_buildScheduleSection`, `_formatScheduleDate` are used consistently across tasks. Property `categorySchedule` (camelCase) used uniformly. No `innerHTML` anywhere.
