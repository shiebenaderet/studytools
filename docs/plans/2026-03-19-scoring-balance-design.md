# Scoring Balance & Activity Variety Design

**Date:** 2026-03-19
**Problem:** Students can accumulate high leaderboard scores by grinding study time without mastering vocabulary or taking practice tests. Study time points are uncapped (1pt/min) and dominate the scoring formula, making it easy to inflate scores without meaningful learning.

**Goals:**
1. Apply diminishing returns to study time points so grinding is less effective
2. Notify students when study time points decrease and when they hit the cap
3. Add dashboard warnings for teachers to spot score inflation and missing milestones
4. Nudge students toward activities they haven't used recently

---

## 1. Diminishing Study Time Points

### Current Formula
```
timePts = Math.floor(studyTimeSeconds / 60)  // 1 pt per minute, no cap
```

### New Stepped Tiers (cumulative, all-time)

| Minutes | Rate       | Points in tier | Cumulative max |
|---------|------------|----------------|----------------|
| 0–30    | 1 pt/min   | 30             | 30             |
| 31–60   | 0.5 pt/min | 15             | 45             |
| 61–100  | 0.25 pt/min| 10             | 55             |
| 101+    | 0 pt/min   | 0              | 55 (hard cap)  |

**Note:** The cap is on all-time accumulated study time, not per-session. Students who do many short sessions still benefit, but the total contribution of study time to their score is bounded at 55 points.

### Implementation
- New helper function `calculateTimePts(studyTimeSeconds)` in `LeaderboardManager`
- Replace the existing `Math.floor(studyTimeSeconds / 60)` line with a call to this helper
- Leaderboard formula description updates in both `leaderboard.js` (student-facing) and `dashboard.js` (teacher-facing) to reflect the new tiers — e.g., "Vocab (x10) + Test Score + Study (diminishing) + Map Bonus = Total"

### Student Notifications
Toast messages triggered from a new `_checkStudyTimeThresholds()` method called by `ActivityTimer._tick()`, based on cumulative elapsed time within the current session. Threshold-shown flags are stored on the `ActivityTimer` object and reset in `start()`.

- **At 30 min:** "You've been studying for 30 minutes — nice! Points are building up a bit slower now. Great time for a break!"
- **At 60 min:** "60 minutes of studying — impressive! Your study time points are slowing down. Try mastering vocab or taking a practice test to keep your score growing!"
- **At 100 min (cap):** "You've hit the study time point cap! Focus on vocab and practice tests to keep climbing the leaderboard!"

Each threshold fires only once per session.

### Existing Score Migration
No migration needed. Scores are recalculated on every `LeaderboardManager.submitScore()` call, which fires whenever a student completes any activity or on the periodic sync. All existing scores will naturally adjust to the new formula on each student's next interaction.

---

## 2. Dashboard Warnings

Two badge types added to student rows in the Scores tab, appearing in the Score column cell next to the score value.

### "Study Time Heavy" Badge
- **Trigger:** Study time points (computed via `calculateTimePts()`) > 60% of total score
- **Appearance:** Small orange badge with clock icon (`fas fa-clock`)
- **Tooltip:** "Most of this student's score comes from study time, not mastery."

### "Missing Milestones" Badge
- **Trigger:** `vocab_mastered === 0` OR `best_test_score === null`
- **Appearance:** Small red badge with exclamation icon (`fas fa-exclamation-circle`)
- **Tooltip:** Shows all applicable conditions:
  - Vocab only: "This student hasn't mastered any vocabulary."
  - Test only: "This student hasn't taken a practice test."
  - Both: "This student hasn't mastered any vocabulary or taken a practice test."

### Implementation
- Computed client-side from existing leaderboard columns — no database changes
- Badges are small inline elements after the score number
- Both badges can appear simultaneously on the same row
- Applied in both the Overview tab "Top Students" table and the full Scores tab table

---

## 3. Recency-Based Activity Nudges

### Tracking Last-Used Timestamps
When a student completes any activity, save a timestamp via `ProgressManager.save()`:
```
ProgressManager.save(unitId, 'lastUsed_' + activityId, Date.now())
```

This uses the standard key format (`studytool_{unitId}_lastUsed_{activityId}`) and participates in the dirty-tracking / Supabase sync pipeline.

### Constants
```js
STALE_ACTIVITY_DAYS: 3
```
Added as a named constant on `NudgeManager` for easy tuning.

### Home Screen Suggestions (`getSuggestions`)
New priority slot in the suggestion pipeline, between "study flow gap" and "untried activity":

**Priority order:**
1. Weak terms remediation (existing)
2. Study flow gap (existing)
3. **Stale activity — not used in 3+ days** (new)
4. Untried activity (existing)

Stale activity suggestion reason: "You haven't tried {Activity Name} in {N} days — give it another go!"

Only suggests activities that:
- The student has used before (has a lastUsed timestamp)
- Are currently accessible (mastery gating check)
- Are registered in `StudyEngine.activities`
- Are listed in `ACTIVITY_INFO` (so we can look up name/icon)

### Toast Nudge on Activity Complete
In `onActivityComplete()`, after the existing consecutive-repeat check and weak-terms check, add a recency check:

- If any previously-used activity hasn't been touched in 3+ days, show: "{Name}, nice work! It's been a few days since you tried {Activity} — worth a revisit!"
- Still respects `MAX_NUDGES_PER_SESSION: 3` cap
- Only fires if no higher-priority nudge was already shown for this completion

---

## Files to Modify

| File | Changes |
|------|---------|
| `engine/js/core/leaderboard.js` | New `calculateTimePts()` helper, update `calculateScore()`, update formula description text |
| `engine/js/core/app.js` | Add `_checkStudyTimeThresholds()` method, threshold flags, call from `_tick()` |
| `engine/js/core/nudge.js` | Add `STALE_ACTIVITY_DAYS` constant, recency tracking in `onActivityComplete()`, stale-activity suggestions in `getSuggestions()`, recency toast nudge |
| `dashboard/dashboard.js` | Add warning badges to Scores tab rows (both overview Top Students and full Scores table), update formula description text |

## No Database Changes Required
All features use existing localStorage keys (via `ProgressManager`) and existing Supabase columns.
