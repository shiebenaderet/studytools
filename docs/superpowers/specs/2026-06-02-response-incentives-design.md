# Response Incentives Design Spec

**Date:** 2026-06-02
**Status:** Approved design, pending implementation plan
**Author:** Shie Benaderet (with Claude)
**Builds on:** the Response Builder wizard (v8.46.0, `docs/superpowers/specs/2026-06-02-response-builder-design.md`)

## Summary

Four features that incentivize students to write short-answer responses, layered
onto the existing Short Answer activity and Response Builder wizard:

- **A — Nudge:** a capped toast encouraging response writing when a student plays
  games without having written any responses this unit.
- **B — Response corpus:** capture finished responses into a new Supabase
  `responses` table to build a teacher-owned corpus of real student exemplars.
- **C — Study points:** award flat points per distinct question answered, folded
  into the existing leaderboard score.
- **D — Paste prevention:** block paste into the response textareas with a warm
  message, to push students to write in their own words.

All four plug into existing infrastructure (NudgeManager, Supabase client +
identity, LeaderboardManager, the two response textareas). The only genuinely new
piece is the `responses` table and a small `ResponseCapture` helper.

## Shared Foundation: the "Save my response" action

Today both response textareas autosave to localStorage on every keystroke
(`input` event → `ProgressManager.saveActivityProgress(unitId, 'short-answer-' +
index, { answer })`), but there is no deliberate "I'm finished" moment.

This design routes both entry points through one deliberate save action:
- **Short Answer** ALREADY has a "Save Response" button (`sa-save-btn` →
  `saveAnswer(index)`). Reuse and enhance it — do NOT add a second button.
- **Response Builder Draft step** currently only autosaves on keystroke (no
  button; its subtext says "It saves automatically when you finish"). ADD a
  "Save my response" button here so it has the same deliberate anchor.

Both route through the same finished-save handler that (1) captures the finished
response to the cloud corpus (B), (2) triggers the leaderboard recalculation so
points appear (C), and (3) shows a warm confirmation toast. **Local keystroke
autosave is unchanged** — nothing is lost mid-typing; the button is purely the
"this one is done, count it" signal.

Note "two doors to the same draft": both textareas share the
`short-answer-<index>` progress key, so the Save button, capture, points, and
paste-guard must be wired to BOTH, or a student could bypass a feature by using
the other door.

## Feature A — Nudge

**Mechanism:** one new rule in `NudgeManager.checkSmartNudge(activityId, config)`
(`study-tools/engine/js/core/nudge.js`).

**Trigger:** when a student opens a **game** (`ACTIVITY_INFO[activityId].group ===
'games'`) AND has written zero short-answer responses this unit, show:

> "Try writing a short answer! Putting ideas in your own words really helps you
> remember."

via `StudyUtils.showToast(message, 'info')`. It respects the existing
`MAX_SMART_NUDGES` (2 per session) cap and `_smartNudgeCount`, so it cannot nag.

**"Zero responses written" check:** iterate `config.shortAnswerQuestions`; count
how many `short-answer-<i>` progress entries have non-empty `.answer`. Zero →
eligible. (This same count is reused by C; extract it into a shared helper —
see Architecture.)

**No new infrastructure.** Toast + cap already exist.

## Feature B — Response Corpus

**Purpose:** a teacher-owned corpus of real student exemplars (all responses,
name attached), to use for teaching, showing future students good examples, and
refining CER plans. NOT a per-student gradebook (though name is retained).

### New Supabase table `responses`

```sql
create table responses (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid references students(id) on delete cascade,
  student_name  text,
  class_code    text,
  unit_id       text not null,
  question_index int not null,
  question_text text,          -- denormalized: corpus is readable without joins
  answer_text   text not null,
  updated_at    timestamptz default now(),
  unique (student_id, unit_id, question_index)  -- upsert: one row per student+question
);

alter table responses enable row level security;
create policy "Students insert own responses" on responses for insert with check (true);
create policy "Students read responses"       on responses for select using (true);
create policy "Students update own responses" on responses for update using (true);
create policy "Teachers delete responses"     on responses for delete using (auth.role() = 'authenticated');
```

This mirrors the `progress` table's RLS exactly (anon student insert/read/update,
teacher delete). The anon-key + non-guessable-UUID model is the same one the
existing tables document as acceptable.

### Capture path

A small new helper module `study-tools/engine/js/core/response-capture.js`
(global `window.ResponseCapture`), with one method:

```
ResponseCapture.capture(unitId, questionIndex, questionText, answerText)
```

It:
- No-ops for guests or when there is no `ProgressManager.studentId` (guest =
  `studentInfo.isGuest`); guests still keep their local autosave but are not sent
  to the corpus.
- No-ops for empty `answerText`.
- Upserts via the established pattern:
  ```javascript
  ProgressManager.supabase.from('responses').upsert({
    student_id: ProgressManager.studentId,
    student_name: ProgressManager.studentInfo && !ProgressManager.studentInfo.isGuest
      ? ProgressManager.studentInfo.name : null,
    class_code: ProgressManager.studentInfo ? ProgressManager.studentInfo.classCode : null,
    unit_id: unitId,
    question_index: questionIndex,
    question_text: questionText,
    answer_text: answerText,
    updated_at: new Date().toISOString()
  }, { onConflict: 'student_id,unit_id,question_index' });
  ```
- Fails silently/gracefully if `ProgressManager.supabase` is null (offline) or the
  call errors — exactly like `feedback.js`. A response is never lost because the
  local autosave already holds it.

Called only from the "Save my response" action (not on keystroke).

### Teacher view (out of scope for this spec)

Reading the corpus in the dashboard is a separate future task. This spec only
covers capturing the data. (Flagged so we don't silently assume a dashboard view
ships here.)

## Feature C — Study Points

**Mechanism:** extend `LeaderboardManager` (`study-tools/engine/js/core/leaderboard.js`).

- Add a `responsesWritten` parameter to `calculateScore`:
  ```javascript
  calculateScore(vocabMastered, bestTestScore, studyTimeSeconds, mapBonus, responsesWritten) {
    var vocabPts = (vocabMastered || 0) * 10;
    var testPts = bestTestScore || 0;
    var timePts = this.calculateTimePts(studyTimeSeconds);
    var mapPts = mapBonus || 0;
    var responsePts = (responsesWritten || 0) * POINTS_PER_RESPONSE; // 20
    return vocabPts + testPts + timePts + mapPts + responsePts;
  }
  ```
  `POINTS_PER_RESPONSE = 20` (a constant, tunable; ~2 vocab terms, since writing
  is more effortful than a flashcard).
- In `submitScore`, compute `responsesWritten` = the count of DISTINCT
  `short-answer-<i>` keys (over `config.shortAnswerQuestions`) with non-empty
  `.answer`, pass it to `calculateScore`, and add `responses_written` to the
  `leaderboard` upsert payload (new column).
- Add the `responses_written int default 0` column to the `leaderboard` table.

**Unfarmable by construction:** the score is recomputed from *distinct-question
completion*, not an event counter. Re-saving the same question still counts once.
`submitScore()` already runs on every `saveActivityProgress`, so points appear
immediately after Save.

**Shared count helper:** A and C both need "how many distinct questions has this
student answered." Extract `ResponseStats.answeredCount(unitId, config)` (or a
method on an existing manager) returning the integer, used by both the nudge
check (zero?) and the score (count). One source of truth.

## Feature D — Paste Prevention

**Mechanism:** a shared helper that attaches `paste` and `drop` listeners to a
textarea, calls `preventDefault()`, and shows:

> "Please type your response in your own words."

via `StudyUtils.showToast(message, 'info')`. Applied to BOTH `rb-draft-text`
(response-builder.js) and `sa-answer-text` (short-answer.js).

A tiny helper (e.g. `StudyUtils.blockPaste(textareaEl)` or a function in the same
new module) keeps both textareas identical.

**Known limitation (documented, accepted):** this also blocks dictation and
assistive-tech paste. If a specific student needs an exception, a teacher
override is a future addition; not built now.

## Architecture / File Plan

- **NEW** `study-tools/engine/js/core/response-capture.js` — `window.ResponseCapture`
  with `capture(...)`, plus the shared `answeredCount(unitId, config)` stat and the
  `blockPaste(el)` helper (or split `blockPaste` into StudyUtils — decide in
  planning). Loaded as a static `<script>` in index.html before app.js, like the
  other core helpers.
- **NEW** `study-tools/database/migrations/` SQL for the `responses` table + the
  `leaderboard.responses_written` column (the teacher runs it in Supabase; the app
  does not create tables).
- **MODIFIED** `study-tools/engine/js/activities/response-builder.js` — Save button
  in the Draft step; wire capture + paste-guard on `rb-draft-text`.
- **MODIFIED** `study-tools/engine/js/activities/short-answer.js` — enhance the
  EXISTING `saveAnswer(index)` (sa-save-btn) to also call `ResponseCapture.capture`
  + confirmation toast; wire paste-guard on `sa-answer-text`. Do not add a second
  Save button.
- **MODIFIED** `study-tools/engine/js/core/leaderboard.js` — `responsesWritten` in
  `calculateScore` + `submitScore`.
- **MODIFIED** `study-tools/engine/js/core/nudge.js` — the games-without-responses
  nudge rule.
- **MODIFIED** `study-tools/engine/css/styles.css` — the Save button styling.
- **MODIFIED** `study-tools/engine/index.html` — load response-capture.js.
- **MODIFIED** `version.json` + `README.md` — version bump.

## Testing

- **Pure logic** (vanilla-node core test, per the established pattern):
  `answeredCount` given a set of progress entries (zero, some, all; empty vs
  non-empty answers); `calculateScore` includes response points correctly and is
  monotonic; the capture payload builder produces the right shape and returns
  null for guests/empty. Put the testable pure functions in response-capture.js
  (or a `-core` companion) so they can be required by node.
- **Manual:** Save button captures (verify a row appears in Supabase), points
  increase on the leaderboard after Save, the nudge fires when playing a game with
  zero responses and not otherwise, paste is blocked with the toast on both
  textareas, guests don't write to the corpus, offline fails gracefully.
- Version bump + README on ship.

## Error Handling / Edge Cases

- **Guest users:** local autosave works; no corpus write, no crash.
- **Offline / Supabase down:** capture fails silently (local copy retained);
  points still compute locally and sync later via the existing leaderboard loop.
- **Empty response:** Save does nothing (no empty rows, no points).
- **Re-saving:** upsert overwrites the one row; points unchanged (distinct count).
- **Both textareas:** every feature wired to both `rb-draft-text` and
  `sa-answer-text` so neither door bypasses capture/points/paste-guard.
- **Paste guard vs. assistive tech:** accepted limitation, documented above.

## Non-Goals

- No teacher dashboard view of the corpus (separate future task).
- No per-student grading workflow.
- No paste teacher-override (future, only if needed).
- No full version history of responses (upsert keeps latest only).
- No change to local keystroke autosave behavior.

## Open Questions (resolve during planning)

1. Where exactly does `blockPaste` live — a new helper module, or a method added
   to `StudyUtils`? (Leaning: StudyUtils, since it's a generic DOM utility.)
2. RESOLVED: Short Answer already has `sa-save-btn` → `saveAnswer(index)`
   (short-answer.js:388). Enhance that method with capture + points; do NOT add
   a duplicate button. The wizard Draft step has no button (autosave only) and
   needs one added. Both call the same `ResponseCapture.capture(...)`.
3. Exact `POINTS_PER_RESPONSE` value — ship at 20, tune after seeing it live.
