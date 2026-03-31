# New Games, Scoring Tiers & Learn Mode Enhancement Design

**Date:** 2026-03-30
**Unit:** westward-expansion (initially)
**Status:** Design approved

## Overview

Add 3 new higher-order thinking games (Who Am I?, Sort It Out, Four Corners), integrate mini-game breaks into Learn Mode sessions, implement multi-source mastery tracking, add scoring tier multipliers, a Learn Mode streak bonus, and smart nudges to guide students toward deeper study activities.

## Goals

1. Students engage with Learn Mode as the primary daily activity
2. New games reinforce categorization, inference, and comparison skills
3. Mastery reflects knowledge demonstrated across multiple activities, not just flashcards
4. Scoring incentivizes deeper activities without punishing easier ones
5. Nudges guide students toward higher-value activities gently

---

## 1. Three New Games

### Who Am I? (Progressive Clues)

**Concept:** The game picks a vocabulary term and reveals clues one at a time, from vaguest to most specific. The student guesses after each clue. Fewer clues = more points.

**Clue tiers (from existing vocab fields):**
1. Category name (vaguest) - e.g., "This term is from Jackson's America"
2. Simple explanation fragment - first sentence of `simpleExplanation`
3. Example - the `example` field
4. Full definition (most specific) - the `definition` field

**Scoring:** 5 points for clue 1 guess, 4 for clue 2, 3 for clue 3, 2 for clue 4, 1 if they need all clues. Streak bonus for consecutive first-clue guesses.

**Input:** Student types their guess (with fuzzy matching) or picks from 4 multiple-choice options (configurable).

**Session:** 10 terms per round, shuffled from unlocked vocabulary. End screen shows score and which terms needed the most clues.

**Scoring multiplier:** 1.25x
**Mastery contribution:** Correct guess on clue 1-3 counts toward term mastery via `recordTermCorrect()`.

### Sort It Out (Category Sorting)

**Concept:** Category buckets displayed at top/sides. Terms appear one at a time. Student taps the correct bucket.

**Gameplay:**
- 2-4 category buckets shown (based on how many categories are unlocked)
- Terms appear one at a time in the center
- Tap/click the correct category bucket
- Correct: term flies into bucket with green flash, streak counter increments
- Wrong: red flash, correct bucket highlighted briefly, streak resets
- Speed increases every 5 correct answers
- 3 difficulty tiers: Easy (term + definition shown), Medium (definition only), Hard (term only, faster speed)

**Session:** All unlocked terms shuffled. Ends when all terms sorted or 3 wrong in a row (mercy rule, not punishing).

**Scoring multiplier:** 1.25x
**Mastery contribution:** Correct sort counts toward term mastery via `recordTermCorrect()`.

### Four Corners (Odd One Out)

**Concept:** 4 terms shown in a 2x2 grid. 3 share a category, 1 doesn't belong. Student taps the odd one out.

**Gameplay:**
- 4 term cards displayed (term name + brief definition snippet)
- Student taps the one that doesn't belong
- Correct: card highlights green, grouping principle revealed ("These three are all from Reform Movements")
- Wrong: card highlights red, correct answer shown
- 10 rounds per session
- Terms drawn from unlocked vocabulary; the "odd one out" is always from a different category than the other 3

**Scoring:** Points for accuracy + speed bonus. Scored on percentage correct.

**Scoring multiplier:** 1.25x
**Mastery contribution:** Correct identification counts toward mastery for the 3 grouped terms (student demonstrated they understand the grouping).

### Common Game Properties

- All 3 games register via `StudyEngine.registerActivity({})`
- All gated behind first category mastery (same as existing games)
- All use existing config vocabulary data (no new data fields needed)
- All follow existing activity patterns: `render(container, config)`, `cleanup()`, `getProgress()`
- All use DOM creation methods (no innerHTML)
- Mobile responsive

---

## 2. Learn Mode Mini-Game Integration

### How It Works

After every 5-6 content slides in a Learn Mode session, a mini-game break appears automatically.

**Mini-game selection:** Rotates through Sort It Out, Who Am I?, and Four Corners so sessions feel varied. Each break uses a different game than the previous one.

**Terms used:** Drawn from the current session's terms, with emphasis on terms the student rated "Hard" or answered incorrectly.

**Duration:** 3-4 questions per break, approximately 30 seconds.

**Framing:**
- Intro: "Quick challenge! Let's see what stuck."
- Outro (success): "Nice work! Let's keep going."
- Outro (mixed): "Good effort! We'll revisit those tricky ones."

### Feedback Loop

- Correct answers in mini-games count toward term mastery via `recordTermCorrect()`
- Incorrect answers flag the term for re-exposure later in the session (spaced repetition within session)
- Mini-game performance does NOT affect the Learn Mode session score separately; it's part of the session flow

### What Stays The Same

- Existing tier system (Tier 1/2/3 depth)
- Reflections and Wiki Writer bonus
- 30-min daily cap
- Base 1.5x multiplier (enhanced by streak)

---

## 3. Multi-Source Mastery

### Current System

Only flashcard "Good"/"Easy" ratings count. `MasteryManager.isCategoryMastered()` checks `ProgressManager.getActivityProgress(unitId, 'flashcards').mastered` array.

### New System

A term is "mastered" when ANY of these conditions is met:

1. **Flashcard instant mastery** — Rated "Good" or "Easy" (same as now)
2. **Cross-activity mastery** — Correct in 2+ different activities
3. **Repeated mastery** — Correct 3 times in the same activity (across different sessions)

### Storage

New progress key `term-mastery` per unit:
```json
{
    "Manifest Destiny": {
        "sources": ["flashcards", "learn-mode", "sort-it-out"],
        "count": { "flashcards": 1, "learn-mode": 2, "sort-it-out": 1 }
    }
}
```

### Shared Method

`MasteryManager.recordTermCorrect(unitId, term, activityId)` — called by any activity when a student demonstrates correct knowledge of a term. Updates the `term-mastery` progress data.

### Which Activities Contribute

| Contributes | Activity |
|-------------|----------|
| Yes | Flashcards, Learn Mode, Sort It Out, Who Am I?, Four Corners |
| Yes | Lightning Round, Practice Test, Fill-in-Blank |
| No | Term Catcher, Flip Match, Hangman (recognition-based, too easy) |
| No | Tower Defense (questions feel incidental) |
| No | Typing Practice, Crossword, Wordle (spelling, not comprehension) |

### Migration

`MasteryManager.isCategoryMastered()` updated to check:
1. First: existing flashcard mastered array (backward compatible)
2. Then: new `term-mastery` multi-source data
3. A term is mastered if it appears in flashcard mastered list OR meets the 2+ activities / 3x same activity threshold

---

## 4. Scoring Tiers

### Multipliers by Tier

| Tier | Multiplier | Activities |
|------|-----------|------------|
| Deep Study | 1.5x | Learn Mode |
| Analysis | 1.25x | Sort It Out, Who Am I?, Four Corners, Map Quiz, Source Analysis |
| Recall | 1.0x | Flashcards, Lightning Round, Crossword, Wordle, Practice Test, Fill-in-Blank, Timeline, Quiz Race, Textbook, Typing Practice, Short Answer |
| Recognition | 0.75x | Term Catcher, Flip Match, Hangman, Tower Defense |

### Where Applied

The multiplier applies to the study time points component when `ProgressManager` calculates scores. The existing formula is: `Vocab (x10) + Test Score + Study Time (diminishing) + Map Bonus = Total`. The multiplier scales the study time contribution for each activity.

### Implementation

Each activity's `registerActivity()` call includes a `scoringTier` property. `ProgressManager` looks up the tier when calculating time-based points.

---

## 5. Learn Mode Streak Bonus

### Multiplier Scaling

| Consecutive Days | Learn Mode Multiplier |
|-----------------|----------------------|
| Day 1 | 1.5x (base) |
| Day 2 | 1.75x |
| Day 3+ | 2.0x |

Streak resets if the student does not complete a Learn Mode session that day.

### Tracking

Stored in progress as `learn-mode-streak`:
```json
{
    "currentStreak": 3,
    "lastSessionDate": "2026-03-30",
    "longestStreak": 5
}
```

### Notifications

- On login/home screen: "Day 3 streak! 2x points in Learn Mode today!"
- On Learn Mode card: streak counter badge (flame icon + number)
- On streak milestone (3, 5, 7, 14 days): celebratory toast with confetti
- On streak break: gentle message "Start a new streak today!" (not punishing)

---

## 6. Smart Nudges

### Triggers

| Trigger | Nudge | Max per session |
|---------|-------|----------------|
| Student plays recognition-tier game 2x in session | "You're doing great! Try Sort It Out for 1.25x points." | 1 |
| Student opens any game without doing Learn Mode today | "Start with Learn Mode for [streak multiplier]x points!" | 1 |
| Student finishes a Learn Mode session | "Want to test what you just learned? Try Who Am I?" | 1 |
| Student finishes any game without Learn Mode today | "Nice game! Learn Mode earns more and builds your streak." | 1 |

### Rules

- Maximum 2 nudges per session total (across all triggers)
- Always encouraging, never shaming
- Use first name when available
- Focus on what they gain ("1.25x points!") not what they miss
- No nudges when: student did Learn Mode today, teacher-unlock is active, student is a guest
- Nudges delivered via existing `StudyUtils.showToast()` system

---

## 7. Scope Boundaries

### In Scope

- 3 new game activities (Who Am I?, Sort It Out, Four Corners) — westward-expansion only (add to config)
- Mini-game breaks in Learn Mode — all units
- Multi-source mastery (`MasteryManager.recordTermCorrect()`) — all units
- Scoring tier multipliers — **westward-expansion only** (checked via unit config flag)
- Learn Mode streak bonus with notifications — all units
- Smart nudges (max 2 per session) — all units
- Add 3 new activity IDs to westward-expansion config

### NOT In Scope

- Chain Reaction / Fact Check games (need new config data)
- Territory map conquest (complex)
- Early-republic enablement (add activity IDs to config later)
- Redesigning existing games
- Leaderboard formula changes
- Diminishing returns per game (tiers handle this)

---

## 8. Files

| File | Action | Responsibility |
|------|--------|----------------|
| `study-tools/engine/js/activities/who-am-i.js` | Create | Who Am I? game |
| `study-tools/engine/js/activities/sort-it-out.js` | Create | Sort It Out game |
| `study-tools/engine/js/activities/four-corners.js` | Create | Four Corners game |
| `study-tools/engine/js/core/mastery.js` | Modify | Multi-source mastery + recordTermCorrect() |
| `study-tools/engine/js/core/progress.js` | Modify | Scoring tier multipliers |
| `study-tools/engine/js/activities/learn-mode.js` | Modify | Mini-game breaks + streak tracking |
| `study-tools/engine/js/core/nudge.js` | Modify | Smart nudge triggers |
| `study-tools/engine/css/styles.css` | Modify | New game styles |
| `study-tools/units/westward-expansion/config.json` | Modify | Add who-am-i, sort-it-out, four-corners to activities |
| `study-tools/engine/version.json` | Modify | Bump version |
| `study-tools/engine/sw.js` | Modify | Bump cache |
