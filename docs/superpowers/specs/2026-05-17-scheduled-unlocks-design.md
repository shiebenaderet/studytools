# Scheduled Category Unlocks — Design

**Status:** Approved (pending user sign-off on this written spec)
**Date:** 2026-05-17
**Scope:** Civil War unit, week 2 onward. Mechanism reusable for any future unit.

## Problem

Mastery gating currently hides categories 2, 3, 4 until the previous category's must-know vocab is mastered. For an 8th grade class pacing through a multi-week unit, this means a student who falls behind in week 1 stays locked out of week 2 content even after class has moved on. Teacher (Shie) wants a calendar-based floor: by Sunday morning of each week, that week's category should be open to every student regardless of prior mastery.

Studying still works as an accelerator — fast students can race ahead of the calendar by mastering earlier categories.

## Goals

1. Categories 1 and 2 unlocked by default for week-2 launch (today, 2026-05-17).
2. Category 3 ("A Dividing Nation") auto-unlocks 2026-05-24 (Sun, week 3).
3. Category 4 ("The Civil War") auto-unlocks 2026-05-31 (Sun, week 4).
4. A student who masters category N still unlocks N+1 immediately, regardless of date.
5. Teacher dashboard surfaces a per-category "Unlock now" affordance for ad-hoc early unlocks.
6. Other units (e.g. early-republic) keep working with no changes.

## Non-goals

- No new backend, no Supabase writes for scheduling. Source of truth stays in git.
- No per-student schedule overrides. Schedule is class-wide.
- No timezone selection UI. All students treated as local time; for a single-classroom teacher in one timezone this is the correct simplification.

## Design

### 1. Config shape

Add a top-level `categorySchedule` block to `study-tools/units/civil-war/config.json`:

```json
"categorySchedule": {
  "Worlds of North & South": "2026-05-10",
  "African Americans at Mid-Century": "2026-05-17",
  "A Dividing Nation": "2026-05-24",
  "The Civil War": "2026-05-31"
}
```

- Keys: exact category names matching `category` field on vocab items.
- Values: `YYYY-MM-DD` strings, parsed as local midnight on that morning.
- Missing key or missing block → no date floor for that category (backwards-compat).

### 2. Gating logic changes (`study-tools/engine/js/core/mastery.js`)

**New helper:**

```js
isCategoryDateUnlocked(config, categoryName) {
    const schedule = config.categorySchedule;
    if (!schedule || !schedule[categoryName]) return false;
    const parts = schedule[categoryName].split('-');
    const unlockAt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return Date.now() >= unlockAt.getTime();
}
```

Local-time parse via `new Date(y, m-1, d)` avoids the UTC-midnight surprise of `new Date("2026-05-24")`.

**Modify `getUnlockedCategories`:** category N (N >= 1) unlocks if `isCategoryMastered(N-1)` **OR** `isCategoryDateUnlocked(N)`. Remove the `break` — keep iterating so a later date-unlock isn't blocked by an earlier locked-and-not-yet-mastered category.

**Modify `getReadUnlockedCategories`:** same OR-with-date change, but the `isChapterRead` requirement stays in force (flashcards still want Read > Study).

Downstream consumers (`getUnlockedQuestions`, `getMustKnowVocabulary`, `getUnlockedFillInBlanks`, `getUnlockStatus`, `isActivityAccessible`, `getNextLockedCategory`, `getLockMessage`) all delegate to the two functions above, so they pick up the new behavior automatically.

**Tweak `showMasteryNudge`:** if `getNextLockedCategory` returns null OR the returned category is already date-unlocked, drop the "Now try X flashcards to unlock more" wording — it's misleading when the next thing is already open. Use a simpler "Nice work, {firstName} — '{mastered}' mastered!"

### 3. Teacher dashboard "Schedule" tab

In `study-tools/dashboard/`:

- Add a new tab button "Schedule" alongside existing tabs in `index.html`.
- Add a tab pane that renders, per unit with `categorySchedule`:
  - Unit name header.
  - Table of categories with columns: Category, Scheduled date, Status (Unlocked / Locked in N days), Action.
  - "Unlock now" button on each locked row.
- Click handler: opens a modal showing:
  - The current `categorySchedule` block as JSON.
  - The same block with that category's date set to today (highlighted diff).
  - A "Copy snippet" button.
  - Instructions: "Paste this into `study-tools/units/{unit}/config.json`, commit, and push. Students see the unlock on their next page load."

This intentionally keeps git as the source of truth. No Supabase write, no new auth surface.

## Edge cases

- **No `categorySchedule` block** → behavior identical to today. Verified by tracing logic with no schedule.
- **Empty `categorySchedule: {}`** → same as missing block.
- **Category in schedule but not in vocabulary** → ignored (never appears in `getCategories`).
- **All dates in past** → all categories unlocked from page load.
- **Student's clock skewed** → they see a slightly earlier/later unlock. Acceptable: this is class-wide convenience, not security.
- **DST transition** → using `new Date(y, m-1, d)` returns local midnight, which is the correct wall-clock time even across DST. No DST issues in May 2026 anyway.

## Testing plan

Manual tests in a real browser, run before push:

1. **Default (no prior progress):** Open civil-war unit on today's date (2026-05-17). Verify cats 1 & 2 are unlocked in: home page category list, practice-test topic filter, short-answer topic filter, games (matching, who-am-i, gap-fill), fill-in-blanks. Verify cats 3 & 4 are locked everywhere.
2. **Date simulation cat 3:** Temporarily change `Date.now()` via DevTools (or set system clock forward to 2026-05-24) and reload. Verify cat 3 opens everywhere; cat 4 still locked.
3. **Mastery race-ahead:** Reset progress, master cat 1 vocab via flashcards. Verify cat 2 unlocks immediately (already date-unlocked) AND cat 3 stays locked (no race-ahead past the floor unless cat 2 also mastered).
4. **Master cat 2 before its date:** Set clock to 2026-05-12 (between cat 1 and cat 2 dates), master cat 2 vocab. Verify cat 3 stays locked (date-only, not mastery-cascade).
5. **early-republic regression:** Open early-republic unit (no `categorySchedule`). Verify gating identical to before — cat 1 unlocked, cats 2+ require mastery cascade.
6. **Nudge text:** After mastering a category whose successor is already date-unlocked, verify the toast no longer says "Now try X flashcards to unlock more."
7. **Dashboard:** Open dashboard, switch to Schedule tab. Verify table renders with correct dates and statuses. Click "Unlock now" on cat 3; verify modal shows correct JSON snippet with today's date for that category only.

## Files touched

- `study-tools/units/civil-war/config.json` — add `categorySchedule`.
- `study-tools/engine/js/core/mastery.js` — new helper + modify two functions + nudge tweak.
- `study-tools/dashboard/index.html` — new tab button + pane.
- `study-tools/dashboard/dashboard.js` — render schedule table, modal handler.
- `study-tools/dashboard/dashboard.css` — minimal styling for table/modal.
- `study-tools/engine/version.json` — bump version.

## Rollout

1. Implement and self-test (browser, all 7 test cases above).
2. Bump version.
3. Commit with why-focused message.
4. Push to main. GitHub Pages picks it up within ~1 min.
