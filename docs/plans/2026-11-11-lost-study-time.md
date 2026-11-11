# Lost study time and streaks after logging back in (period 5 report)

## Reports (Revolution unit, v8.55.42, Chromebook)

- Oct 28, 1:38 AM: "I relogged in and like my 14 hours of study time disappeared."
- Oct 28, 1:40 AM: "my current streak also reset"
- Oct 28, 6:06 PM: "My score is not going up now help please"

## Cause (found in code, confirmed in her data)

`ProgressManager.mergeActivityData` decides which copy wins when the device's
copy meets the cloud copy. Its default rule is "newer `updatedAt` wins." But
`studyTime` (a plain number), `streak` and `learn-mode-streak` never had an
`updatedAt`, so both sides counted as 0 and **the device copy always won**.

When she logged back in, the device already had a few seconds of study time
and a fresh 1-day streak. Those beat the cloud copy and then synced up over it.

Her cloud data now:

| Field | Value |
|---|---|
| Leaderboard `study_time_seconds` (never lowers) | 49,259 s = 13 h 40 min (her "14 hours") |
| Progress `studyTime` | 5,001 s = 83 min (time earned since Oct 28) |
| Leaderboard score | 1321 (frozen high-water mark) |

The leaderboard never lowers a score, so her 1321 stayed. But her live score
is now computed from 83 minutes, about 500 to 1000 points, so the board will
not move until she earns back roughly 12 hours. That is "my score is not going
up."

A scan of every student found one other: a period 1 student on Revolution,
leaderboard 122 min, progress 0 min.

## Fix shipped on the branch (8.55.45)

- `studyTime`: keep the larger total.
- `streak` / `learn-mode-streak`: keep the copy from the later day, the higher
  count on a tie, and the longer best streak.
- Tests: `node study-tools/engine/tools/progress-merge.test.js`.

Size: small, done. Goes live only when merged.

## Decisions for the teacher

1. **Merge to `main`?** Needed before any data repair, or her Chromebook's old
   83-minute copy keeps winning and would undo the repair.
2. **Repair the two students' study time?** Proposed, after the merge:
   set `progress.studyTime` to (leaderboard seconds + time earned since):
   - Period 5 student: 49,259 s + 5,001 s = about 15 h 04 min.
   - Period 1 student: 122 min (nothing earned since).
   Small risk of counting the few seconds from the bad login twice.
   The new max rule then pulls this onto their devices on next load.
3. **Repair her streak?** Her streak has since rebuilt to 4 days (last Nov 7)
   and her study-days list (the leaderboard multiplier) was never affected,
   since it already merged correctly. Recommend leaving the streak alone.
4. **Badges** use the same newer-wins default (an array with no timestamp) and
   could lose a badge the same way. Fix as a separate change? Small.
