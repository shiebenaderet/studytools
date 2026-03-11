# Nudge System Design

**Goal:** Guide students toward productive study patterns by suggesting next activities, detecting grinding, and tracking missed terms across all activities (including games).

**Architecture:** A centralized `NudgeManager` module (`study-tools/engine/js/core/nudge.js`) that reads existing progress data to make smart suggestions. No new localStorage keys, no new database tables, no config changes.

---

## NudgeManager API

### `getSuggestions(config)` → `[{ activityId, icon, name, reason }]`

Returns 1-2 activity suggestions. Priority order:

1. **Weak terms exist** → suggest best remediation activity (typing for memorization, fill-in-blank for context, practice test for assessment)
2. **Study flow gap** → suggest skipped step in: Textbook → Flashcards → Fill in the Blank / Typing → Practice Test → Games
3. **Activity variety** → suggest untried activities
4. **Fallback** → "Keep it up!" / hide section

### `renderSuggestions(container, config)`

Renders "What to Do Next" section on home page below stats grid. 1-2 cards with icon, activity name, reason string. Click navigates to activity. Hidden when nothing to suggest.

### `onActivityComplete(activityId, config)`

Post-activity smart toasts. Checks in order:

1. **Grinding** — same activity 2+ times in a row this session → "Great practice! Try [X] to mix things up."
2. **Weak terms generated** — activity just added misses → "You missed a few — [X] will help lock them in."
3. **Study flow** — natural next step exists → "Nice work! Ready to try [X]?"
4. **No toast** — none apply, don't nag.

Throttling: max 1 toast per completion, max 3 nudge toasts per session.

### `trackMissedTerms(unitId, config, missedTermNames)`

Shared helper replacing duplicated logic in practice-test and fill-in-blank. For each missed term:

- Increment count in `weakness_tracker`
- Set rating to `'again'` in flashcard ratings
- Remove from flashcard `mastered` array if present

## In-Memory State (resets on page reload)

- `_sessionActivityCounts` — `{ activityId: count }` for grinding detection
- `_sessionNudgeCount` — integer, caps at 3
- `_lastActivityId` — string, for consecutive-activity detection

## Study Flow (soft order)

```
Textbook → Flashcards → Fill in the Blank / Typing Practice → Practice Test → Games
```

Not enforced — just preferred when suggesting. If a student skips a step, nudge them back to it. If they've done everything, suggest variety.

## Game Missed-Term Integration

| Game | Miss Detection |
|------|---------------|
| Wordle | Failed to guess (all 6 attempts used) |
| Hangman | Word not guessed (hanged) |
| Flip Match | Mismatched pair |
| Term Catcher | Caught wrong term / missed correct one |
| Tower Defense | Answered vocab question wrong |
| Crossword | Used reveal or final check shows errors |
| Quiz Race | Answered incorrectly |

Each game calls `NudgeManager.trackMissedTerms(unitId, config, [termNames])` with an array of missed term names.

## Integration Points

| File | Change |
|------|--------|
| **NEW** `engine/js/core/nudge.js` | NudgeManager module |
| `engine/js/core/app.js` | Call `renderSuggestions()` from `renderHomeStats()`, call `onActivityComplete()` on activity finish |
| `engine/js/activities/practice-test.js` | Refactor to use `trackMissedTerms()` |
| `engine/js/activities/fill-in-blank.js` | Refactor to use `trackMissedTerms()` |
| `engine/js/activities/wordle.js` | Add `trackMissedTerms()` on loss |
| `engine/js/activities/hangman.js` | Add `trackMissedTerms()` on loss |
| `engine/js/activities/flip-match.js` | Add `trackMissedTerms()` on mismatch |
| `engine/js/activities/term-catcher.js` | Add `trackMissedTerms()` on miss |
| `engine/js/activities/tower-defense.js` | Add `trackMissedTerms()` on wrong answer |
| `engine/js/activities/crossword.js` | Add `trackMissedTerms()` on reveal/error |
| `engine/js/activities/quiz-race.js` | Add `trackMissedTerms()` on wrong answer |
| `engine/js/activities/lightning-round.js` | Refactor to use `trackMissedTerms()` |
| `engine/css/styles.css` | Minimal styles for suggestion cards |
| `engine/index.html` | Add `<script>` for nudge.js |

## Styling

Reuse existing card/stat-box patterns. No major new UI components. Suggestion cards match the stat-box aesthetic with activity icon, name, and reason text.

## What This Does NOT Change

- No new localStorage keys
- No new database tables
- No config.json changes
- No changes to mastery gating logic
- Existing weakness tracker and flashcard rating systems unchanged (just more activities feeding into them)
