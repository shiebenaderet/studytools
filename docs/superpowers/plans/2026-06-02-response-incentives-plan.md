# Response Incentives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four features that incentivize short-answer writing: a nudge, a Supabase response corpus, study points per response, and paste prevention — all anchored on a deliberate "save my response" action.

**Architecture:** A new pure-logic-plus-DOM helper module (`response-incentives.js`, global `window.ResponseIncentives`) holds the testable count logic, the capture payload builder, the Supabase capture call, and the paste-guard. The two response entry points (Short Answer's existing `saveAnswer`, and a new Save button in the wizard Draft step) both route through it. The leaderboard score formula and the nudge system gain small additions. A SQL migration adds the `responses` table and a `leaderboard.responses_written` column (the teacher runs it in Supabase; the app never creates tables).

**Tech Stack:** Vanilla ES5-style JS, no build tools, no innerHTML, Supabase JS client (already loaded), vanilla-node test scripts (`node file.test.js`), CSS custom-property theming.

**Design spec:** `docs/superpowers/specs/2026-06-02-response-incentives-design.md`

**Resolved decisions (from spec):**
- POINTS_PER_RESPONSE = 20 (constant, tunable).
- Capture = upsert one row per (student, unit, question) on the deliberate Save action only.
- Short Answer reuses its existing `sa-save-btn` → `saveAnswer(index)`; the wizard Draft step gets a NEW Save button. Both call the shared capture.
- Paste guard on BOTH `sa-answer-text` and `rb-draft-text`.
- Guests (no studentId / isGuest) keep local autosave but are not sent to the corpus.

---

## File Structure

- **NEW** `study-tools/engine/js/core/response-incentives.js` — `window.ResponseIncentives`: `answeredCount(unitId, config)`, `buildCapturePayload(...)`, `capture(...)`, `blockPaste(el)`. Pure functions (`answeredCount`, `buildCapturePayload`) are node-testable; `capture`/`blockPaste` touch Supabase/DOM.
- **NEW** `study-tools/engine/js/core/response-incentives.test.js` — vanilla-node tests for the pure functions.
- **NEW** `study-tools/database/migrations/2026-06-02-responses.sql` — `responses` table + `leaderboard.responses_written` column + RLS.
- **MODIFIED** `study-tools/engine/index.html` — load `response-incentives.js` before app.js.
- **MODIFIED** `study-tools/engine/js/activities/short-answer.js` — enhance `saveAnswer` (capture + points already auto-fire via saveActivityProgress); add paste-guard to `sa-answer-text`.
- **MODIFIED** `study-tools/engine/js/activities/response-builder.js` — add a Save button to the Draft step that captures + toasts; add paste-guard to `rb-draft-text`.
- **MODIFIED** `study-tools/engine/js/core/leaderboard.js` — `responsesWritten` in `calculateScore` + `submitScore`.
- **MODIFIED** `study-tools/engine/js/core/nudge.js` — games-without-responses nudge.
- **MODIFIED** `study-tools/engine/css/styles.css` — wizard Save button style (`.rb-save-btn`).
- **MODIFIED** `study-tools/engine/version.json` + `README.md` — version bump.

---

## Task 1: Core logic — answered count + capture payload (pure, tested)

**Files:**
- Create: `study-tools/engine/js/core/response-incentives.js`
- Test: `study-tools/engine/js/core/response-incentives.test.js`

- [ ] **Step 1: Write the failing test**

Create `study-tools/engine/js/core/response-incentives.test.js`:

```javascript
#!/usr/bin/env node
// Tests for the pure logic in response-incentives.js: counting answered
// short-answer questions, and building the Supabase capture payload.
var RI = require('./response-incentives.js');

var failures = [];
function eq(name, got, want) {
  if (got !== want) failures.push(name + '\n  got:  ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want));
}
function deepEq(name, got, want) {
  if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(name + '\n  got:  ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want));
}

// answeredCount(getProgress, questionCount): counts indices 0..questionCount-1
// whose progress entry has a non-empty trimmed .answer. getProgress(i) is an
// injected lookup so the pure function has no ProgressManager/global dependency.
var store = {
  0: { answer: 'A real response.' },
  1: { answer: '   ' },         // whitespace only -> not counted
  2: null,                       // never saved -> not counted
  3: { answer: 'Another one.' },
  4: { answer: '' }              // empty -> not counted
};
var getP = function (i) { return store[i] || null; };
eq('answeredCount counts only non-empty', RI.answeredCount(getP, 5), 2);
eq('answeredCount zero when none', RI.answeredCount(function () { return null; }, 5), 0);
eq('answeredCount zero questions', RI.answeredCount(getP, 0), 0);

// buildCapturePayload(identity, unitId, qIndex, qText, answer):
// returns null for guest, missing studentId, or empty answer; else the row object.
var ident = { studentId: 'uuid-123', name: 'Sam', classCode: 'period4', isGuest: false };
deepEq('payload for valid student', RI.buildCapturePayload(ident, 'civil-war', 3, 'Why did X?', 'Because Y.'), {
  student_id: 'uuid-123', student_name: 'Sam', class_code: 'period4',
  unit_id: 'civil-war', question_index: 3, question_text: 'Why did X?', answer_text: 'Because Y.'
});
eq('payload null for guest', RI.buildCapturePayload({ studentId: 'g', name: 'Guest', classCode: 'guest', isGuest: true }, 'civil-war', 1, 'q', 'a'), null);
eq('payload null for no studentId', RI.buildCapturePayload({ studentId: null, name: 'Sam', classCode: 'p4', isGuest: false }, 'civil-war', 1, 'q', 'a'), null);
eq('payload null for empty answer', RI.buildCapturePayload(ident, 'civil-war', 1, 'q', '   '), null);

if (failures.length) {
  console.log('FAIL (' + failures.length + ')');
  failures.forEach(function (f) { console.log('- ' + f); });
  process.exit(1);
}
console.log('OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd study-tools/engine && node js/core/response-incentives.test.js`
Expected: FAIL — `Cannot find module './response-incentives.js'`

- [ ] **Step 3: Write minimal implementation**

Create `study-tools/engine/js/core/response-incentives.js`:

```javascript
// Response incentives: capture finished short-answer responses to the Supabase
// corpus, count answered questions (for points + nudge), and block paste in the
// response textareas. Pure functions (answeredCount, buildCapturePayload) are
// node-testable; capture() and blockPaste() touch Supabase/DOM.
(function () {
  var api = {};

  // getProgress(i) returns the saved progress entry for short-answer index i
  // (or null). Counts indices [0, questionCount) with a non-empty trimmed answer.
  api.answeredCount = function (getProgress, questionCount) {
    var n = 0;
    for (var i = 0; i < questionCount; i++) {
      var p = getProgress(i);
      if (p && typeof p.answer === 'string' && p.answer.trim().length > 0) n++;
    }
    return n;
  };

  // Build the Supabase 'responses' row, or null if it must not be captured
  // (guest, no studentId, or empty answer). identity = { studentId, name,
  // classCode, isGuest }.
  api.buildCapturePayload = function (identity, unitId, qIndex, qText, answer) {
    if (!identity || !identity.studentId || identity.isGuest) return null;
    if (typeof answer !== 'string' || answer.trim().length === 0) return null;
    return {
      student_id: identity.studentId,
      student_name: identity.name || null,
      class_code: identity.classCode || null,
      unit_id: unitId,
      question_index: qIndex,
      question_text: qText || null,
      answer_text: answer
    };
  };

  // Eager upsert of one finished response to the corpus. No-ops gracefully for
  // guests/offline/errors (the local autosave already holds the text). Reads
  // identity + supabase from ProgressManager at call time (browser only).
  api.capture = function (unitId, qIndex, qText, answer) {
    if (typeof ProgressManager === 'undefined' || !ProgressManager.supabase) return;
    var info = ProgressManager.studentInfo || {};
    var identity = {
      studentId: ProgressManager.studentId,
      name: info.name, classCode: info.classCode, isGuest: !!info.isGuest
    };
    var payload = api.buildCapturePayload(identity, unitId, qIndex, qText, answer);
    if (!payload) return;
    payload.updated_at = new Date().toISOString();
    try {
      ProgressManager.supabase.from('responses')
        .upsert(payload, { onConflict: 'student_id,unit_id,question_index' })
        .then(function (res) { if (res && res.error) console.error('Response capture error:', res.error); });
    } catch (e) {
      console.error('Response capture threw:', e);
    }
  };

  // Block paste + drag-drop into a textarea; show a friendly toast on attempt.
  api.blockPaste = function (el) {
    if (!el) return;
    function deny(e) {
      e.preventDefault();
      if (typeof StudyUtils !== 'undefined' && StudyUtils.showToast) {
        StudyUtils.showToast('Please type your response in your own words.', 'info');
      }
    }
    el.addEventListener('paste', deny);
    el.addEventListener('drop', deny);
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ResponseIncentives = api;
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd study-tools/engine && node js/core/response-incentives.test.js`
Expected: `OK`

Also confirm no regression on the other core tests:
`node tools/response-builder-core.test.js && node tools/question-export-core.test.js && node tools/map-quiz-guard-core.test.js`
Expected: `OK` each.

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/js/core/response-incentives.js study-tools/engine/js/core/response-incentives.test.js
git commit -m "feat(incentives): response-incentives core (answered count, capture payload, paste-guard)

Pure answeredCount + buildCapturePayload (node-tested); capture() upserts to the
Supabase responses corpus (no-ops for guests/offline); blockPaste() denies paste."
```

---

## Task 2: SQL migration — responses table + leaderboard column

**Files:**
- Create: `study-tools/database/migrations/2026-06-02-responses.sql`

- [ ] **Step 1: Write the migration**

Create `study-tools/database/migrations/2026-06-02-responses.sql`:

```sql
-- Response corpus: finished short-answer responses, one row per student+question.
-- Mirrors the progress table's RLS (anon student insert/read/update, teacher delete).
create table if not exists responses (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid references students(id) on delete cascade,
  student_name   text,
  class_code     text,
  unit_id        text not null,
  question_index int not null,
  question_text  text,
  answer_text    text not null,
  updated_at     timestamptz default now(),
  unique (student_id, unit_id, question_index)
);

alter table responses enable row level security;

create policy "Students insert own responses" on responses for insert with check (true);
create policy "Students read responses"        on responses for select using (true);
create policy "Students update own responses"  on responses for update using (true);
create policy "Teachers delete responses"      on responses for delete using (auth.role() = 'authenticated');

-- Study points for writing: count of distinct questions answered, * POINTS_PER_RESPONSE.
alter table leaderboard add column if not exists responses_written int default 0;
```

- [ ] **Step 2: Validate the SQL is well-formed (syntax sanity)**

Run: `grep -c "create policy" study-tools/database/migrations/2026-06-02-responses.sql`
Expected: `4`

(There is no local Postgres; the teacher runs this in the Supabase SQL editor. This step just confirms the file has the 4 policies and the table/column DDL.)

- [ ] **Step 3: Commit**

```bash
git add study-tools/database/migrations/2026-06-02-responses.sql
git commit -m "db: responses corpus table + leaderboard.responses_written column

Run in Supabase before the incentives feature goes live. RLS mirrors progress."
```

---

## Task 3: Load the helper + paste-guard the Short Answer textarea

**Files:**
- Modify: `study-tools/engine/index.html`
- Modify: `study-tools/engine/js/activities/short-answer.js`

- [ ] **Step 1: Load response-incentives.js in index.html**

In `study-tools/engine/index.html`, add immediately after the `js/core/term-details.js` line (which is right after `tools/map-quiz-guard-core.js`):

```html
    <script src="js/core/response-incentives.js"></script>
```

- [ ] **Step 2: Capture + paste-guard in Short Answer**

In `study-tools/engine/js/activities/short-answer.js`:

(a) Enhance `saveAnswer(index)` to capture to the corpus. Find the existing method (it currently saves progress and toasts "Response saved!"). After the `ProgressManager.saveActivityProgress(...)` call and before/after the existing toast, add the capture call:

```javascript
    saveAnswer(index) {
        var text = document.getElementById('sa-answer-text');
        var answer = text ? text.value : '';
        ProgressManager.saveActivityProgress(this.unitId, 'short-answer-' + index, {
            answer: answer
        });
        // Capture the finished response to the corpus (no-op for guests/offline).
        if (typeof ResponseIncentives !== 'undefined') {
            var q = this.questions[index];
            ResponseIncentives.capture(this.unitId, index, q ? q.question : '', answer);
        }
        StudyUtils.showToast('Response saved!', 'success');
        // ... existing checkmark + achievement code unchanged ...
```
(Keep the rest of the method exactly as-is. `saveActivityProgress` already triggers `LeaderboardManager.submitScore()`, so points update automatically once Task 5 lands — no extra call needed here.)

(b) Paste-guard the textarea. Find where `sa-answer-text` is created (the textarea with `id = 'sa-answer-text'`). Immediately after it's created/appended, add:

```javascript
        if (typeof ResponseIncentives !== 'undefined') ResponseIncentives.blockPaste(textarea);
```
(Use the actual variable name for that textarea element in the file — it is `textarea`.)

- [ ] **Step 3: Syntax check**

Run: `node --check study-tools/engine/js/activities/short-answer.js`
Expected: no output.

- [ ] **Step 4: Manual smoke (browser)**

Serve locally, open a civil-war short-answer question, try to paste into the box → blocked + toast. Type an answer, click Save → "Response saved!" (and, with Supabase configured and a non-guest student, a row appears in `responses`).

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/index.html study-tools/engine/js/activities/short-answer.js
git commit -m "feat(incentives): capture + paste-guard in Short Answer

saveAnswer now captures the finished response to the corpus; the textarea blocks
paste with a friendly toast. Loads response-incentives.js globally."
```

---

## Task 4: Save button + capture + paste-guard in the wizard Draft step

**Files:**
- Modify: `study-tools/engine/js/activities/response-builder.js`
- Modify: `study-tools/engine/css/styles.css`

- [ ] **Step 1: Add the Save button, capture, and paste-guard in `_renderDraft`**

In `study-tools/engine/js/activities/response-builder.js`, find `_renderDraft`. After the textarea (`rb-draft-text`) is created and its `input` autosave listener is attached, add a paste-guard. After the sentence-starters block (where `right` is assembled), add a "Save my response" button that captures and toasts. Concretely:

After `right.appendChild(ta);` (the textarea append), add:
```javascript
        if (typeof ResponseIncentives !== 'undefined') ResponseIncentives.blockPaste(ta);
```

After the starters block and before `cols.appendChild(right);`, add the Save button:
```javascript
        var saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'rb-save-btn';
        var saveIcon = document.createElement('i');
        saveIcon.className = 'fas fa-floppy-disk';
        saveBtn.appendChild(saveIcon);
        saveBtn.appendChild(document.createTextNode(' Save my response'));
        saveBtn.addEventListener('click', function () {
            // Persist (shares the short-answer-<index> key) then capture + toast.
            ProgressManager.saveActivityProgress(self._config.unit.id, 'short-answer-' + self._qIndex, { answer: ta.value });
            if (typeof ResponseIncentives !== 'undefined') {
                ResponseIncentives.capture(self._config.unit.id, self._qIndex, self._question ? self._question.question : '', ta.value);
            }
            StudyUtils.showToast('Response saved!', 'success');
        });
        right.appendChild(saveBtn);
```
(`self` is already defined at the top of `_renderDraft` as `var self = this;` — confirm it exists; if not, add it.)

- [ ] **Step 2: Add the Save button CSS**

In `study-tools/engine/css/styles.css`, append a `.rb-save-btn` rule: a prominent primary CTA using `var(--primary)` background, white text, `var(--radius-md)`, padding, hover `var(--primary-bold)`, an icon gap, and a little top margin so it sits below the starters. Match the weight of `.sa-save-btn` (look at that rule for reference).

- [ ] **Step 3: Syntax check**

Run: `node --check study-tools/engine/js/activities/response-builder.js`
Expected: no output.

- [ ] **Step 4: Manual smoke (browser)**

Open the wizard, reach the Draft step, try to paste → blocked + toast. Type, click "Save my response" → toast; the draft persists and (non-guest + Supabase) a `responses` row appears.

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/js/activities/response-builder.js study-tools/engine/css/styles.css
git commit -m "feat(incentives): Save button + capture + paste-guard in wizard Draft step

The Draft step gains a deliberate 'Save my response' action that persists,
captures to the corpus, and toasts; the textarea blocks paste."
```

---

## Task 5: Study points in the leaderboard

**Files:**
- Modify: `study-tools/engine/js/core/leaderboard.js`

- [ ] **Step 1: Add POINTS_PER_RESPONSE + responsesWritten to calculateScore**

In `study-tools/engine/js/core/leaderboard.js`, add a constant near the top of the `LeaderboardManager` object:
```javascript
    POINTS_PER_RESPONSE: 20,
```
Change `calculateScore` to accept and use `responsesWritten`:
```javascript
    calculateScore(vocabMastered, bestTestScore, studyTimeSeconds, mapBonus, responsesWritten) {
        var vocabPts = (vocabMastered || 0) * 10;
        var testPts = bestTestScore || 0;
        var timePts = this.calculateTimePts(studyTimeSeconds);
        var mapPts = mapBonus || 0;
        var responsePts = (responsesWritten || 0) * this.POINTS_PER_RESPONSE;
        return vocabPts + testPts + timePts + mapPts + responsePts;
    },
```

- [ ] **Step 2: Compute responsesWritten in submitScore and add to the upsert**

In `submitScore`, after the other stats are gathered and before `rawScore` is computed, add the count using the shared helper. The unit's config is available as `StudyEngine.config` (or the same source the rest of submitScore uses — confirm; the existing code reads `config` for tiers, so reuse that `config` variable):

```javascript
        var responsesWritten = 0;
        if (typeof ResponseIncentives !== 'undefined' && config && config.shortAnswerQuestions) {
            responsesWritten = ResponseIncentives.answeredCount(function (i) {
                return ProgressManager.getActivityProgress(unitId, 'short-answer-' + i);
            }, config.shortAnswerQuestions.length);
        }
```
Pass it into `calculateScore`:
```javascript
        var rawScore = this.calculateScore(vocabMastered, bestTestScore, studyTimeSeconds, mapBonus, responsesWritten);
```
Add `responses_written` to the leaderboard upsert payload:
```javascript
                map_bonus: mapBonus,
                responses_written: responsesWritten,
                updated_at: new Date().toISOString()
```

(Confirm the exact name of the config variable in `submitScore` before editing — the method already references `config` for the tier check; reuse it. If it's named differently, use that.)

- [ ] **Step 3: Syntax check**

Run: `node --check study-tools/engine/js/core/leaderboard.js`
Expected: no output.

- [ ] **Step 4: Manual smoke (browser)**

As a non-guest student, note the leaderboard score, save a response to a fresh question, and confirm the score increases by 20 (the `responses_written` column populates in Supabase). Re-saving the SAME question does not increase it further (distinct count).

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/js/core/leaderboard.js
git commit -m "feat(incentives): award study points for written responses

calculateScore gains responsesWritten * POINTS_PER_RESPONSE (20). submitScore
counts distinct answered questions via ResponseIncentives.answeredCount, so it's
unfarmable by re-saving, and writes responses_written to the leaderboard row."
```

---

## Task 6: Nudge to encourage writing

**Files:**
- Modify: `study-tools/engine/js/core/nudge.js`

- [ ] **Step 1: Add the games-without-responses nudge to checkSmartNudge**

In `study-tools/engine/js/core/nudge.js`, inside `checkSmartNudge(activityId, config)`, after the existing nudge rules (and respecting the `_smartNudgeCount` / `MAX_SMART_NUDGES` cap the other rules use), add:

```javascript
        // Nudge: playing a game but hasn't written any short-answer responses yet.
        var actInfo = this.ACTIVITY_INFO[activityId];
        if (actInfo && actInfo.group === 'games' && config && config.shortAnswerQuestions && config.shortAnswerQuestions.length) {
            var written = (typeof ResponseIncentives !== 'undefined')
                ? ResponseIncentives.answeredCount(function (i) {
                    return ProgressManager.getActivityProgress(unitId, 'short-answer-' + i);
                  }, config.shortAnswerQuestions.length)
                : 1; // if helper missing, don't nudge
            if (written === 0) {
                StudyUtils.showToast(prefix + 'try writing a short answer! Putting ideas in your own words really helps you remember.', 'info');
                this._smartNudgeCount++;
                return;
            }
        }
```

IMPORTANT: confirm the real variable names in `checkSmartNudge` — `unitId` and `prefix` are used by the existing rules in that method (the spec/exploration showed `prefix` and `unitId` in sibling rules). Match them exactly. Place this rule consistently with the others (after the cap check / early returns, so it doesn't exceed `MAX_SMART_NUDGES`).

- [ ] **Step 2: Syntax check**

Run: `node --check study-tools/engine/js/core/nudge.js`
Expected: no output.

- [ ] **Step 3: Manual smoke (browser)**

Fresh student, write zero responses, open a game → see the toast (once, capped). Write a response, open a game again → no toast.

- [ ] **Step 4: Commit**

```bash
git add study-tools/engine/js/core/nudge.js
git commit -m "feat(incentives): nudge students to write responses

When a student opens a game without having written any short-answer responses
this unit, a capped toast encourages trying it."
```

---

## Task 7: Ship — version, README, full verification

**Files:**
- Modify: `study-tools/engine/version.json`, `README.md`

- [ ] **Step 1: Full test + syntax sweep**

```bash
cd study-tools/engine
node js/core/response-incentives.test.js
node tools/response-builder-core.test.js
node tools/question-export-core.test.js
node tools/map-quiz-guard-core.test.js
for f in js/core/response-incentives.js js/core/leaderboard.js js/core/nudge.js js/activities/short-answer.js js/activities/response-builder.js; do node --check "$f" && echo "OK $f"; done
python3 -c "import json; json.load(open('../units/civil-war/config.json')); print('config ok')"
```
Expected: `OK` for each test and file; `config ok`.

- [ ] **Step 2: End-to-end manual walkthrough**

As a non-guest student on civil-war: paste blocked in both boxes; Save captures a `responses` row; leaderboard score rises by 20 per distinct question (not on re-save); the nudge fires when playing a game with zero responses written and not after one is written. As a guest: local save works, no corpus row, no crash. Offline: Save still works locally, no crash.

- [ ] **Step 3: Bump version + README**

`study-tools/engine/version.json` → bump minor (new feature set), e.g. `8.47.0`, date `2026-06-02`. Update the README version badge to match.

- [ ] **Step 4: Commit**

```bash
git add study-tools/engine/version.json README.md
git commit -m "chore: response incentives (nudge, corpus, points, no-paste), vX.Y.Z"
```

- [ ] **Step 5: Stop — confirm before merging/pushing**

Do NOT push or merge. Summarize what shipped and that the Supabase migration must be run before this goes live; ask the teacher how to integrate (the responses table SQL must be applied in Supabase first).

---

## Self-Review notes

- **Spec coverage:** A nudge (T6), B corpus table + capture (T1 capture/payload, T2 SQL, T3 + T4 wiring), C points (T1 answeredCount, T5 leaderboard + column in T2), D paste-guard (T1 blockPaste, T3 + T4 wiring), shared Save anchor (T3 reuses saveAnswer; T4 adds wizard button), guest/offline handling (T1 capture no-ops), both textareas guarded (T3 + T4). Teacher dashboard view correctly NOT included (spec non-goal).
- **Placeholder scan:** no TBD/TODO; every code step has real code. The two "confirm the variable name" notes (submitScore's `config`, checkSmartNudge's `unitId`/`prefix`) are verification instructions, not placeholders — the surrounding code is shown.
- **Type consistency:** `answeredCount(getProgress, questionCount)` defined in T1 and called the same way in T5 and T6. `buildCapturePayload(identity, unitId, qIndex, qText, answer)` and `capture(unitId, qIndex, qText, answer)` consistent across T1/T3/T4. `responses_written` column (T2) matches the upsert key in T5. `POINTS_PER_RESPONSE` defined and used in T5. `blockPaste(el)` consistent T1/T3/T4.
- **Migration dependency:** the SQL (T2) must be run in Supabase before C/B work against the live DB; T7 Step 5 surfaces this to the teacher rather than assuming it.
