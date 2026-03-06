# Progressive Mastery-Gated Content System

## Overview

Content unlocks in category-based stages. Students learn terms through Flashcards and/or Typing Practice, which progressively unlocks Games, Practice, and more categories. This prevents students from being overwhelmed and ensures they learn vocabulary before encountering it in games.

## Unlock Flow

```
Category 1 Flashcards + Typing Practice (always available)
  -> Master all Cat 1 flashcard terms
    -> Unlocks: Cat 1 Games & Practice questions
    -> Unlocks: Category 2 Flashcards & Typing Practice
    -> Nudge: "You've mastered these! Ready for the next challenge?"
      -> Master all Cat 2 flashcard terms
        -> Unlocks: Cat 2 Games & Practice
        -> Unlocks: Category 3 Flashcards & Typing
        -> ... continues through all categories
```

## Mastery Rules

- **Flashcard mastery:** Student must flip card (view definition) THEN click "Mark as Mastered." Cannot mark without flipping first.
- **Flashcards are required** to unlock. Typing Practice is supplemental -- encouraged but not gating.
- **Unlock trigger:** All terms in a category mastered via flashcards.

## New Activity: Typing Practice

- **Category:** "study" (alongside Flashcards)
- **Style:** Monkeytype-inspired word-by-word typing interface
- **Content:** 8th-grade-accessible passages (~200-300 words per category) sourced from American Yawp / Wikipedia, rewritten for readability
- **Vocabulary terms bolded** in the passage so students see them in context
- **Tracking:** WPM and accuracy displayed; completion recorded per category
- **One passage per category**, unlocks alongside that category's flashcards
- **Not required for unlocking** -- supplemental study tool

## Games & Practice Gating

- Activity cards show current unlock state:
  - Unlocked: normal card with "12/46 terms available" indicator
  - Locked: lock icon + "Master [Category Name] to unlock"
- Games and Practice **filter to only include terms from unlocked categories**
- Practice questions tagged with `category` field to enable filtering

## Nudge System

Celebratory nudges when students master a category:

- **Category complete:** "Nice work! You've mastered [Category Name]! Ready for the next challenge? Head to Flashcards to start learning about [Next Category]."
- **Mid-game nudge:** When all available terms in games are mastered: "You know all these terms! Unlock more by learning the next set of vocabulary."
- **All categories done:** "You've mastered all the vocabulary! Every activity is now unlocked. Go crush it!"
- **Style:** Toast notification or brief modal, warm and encouraging tone

## Data Changes

### config.json modifications
- Add `category` field to `practiceQuestions[]`
- Add `category` field to `shortAnswerQuestions[]`
- Add `category` field to `fillInBlankSentences[]`
- Add `typingPassages` array: `[{ category, title, passage }]`
- Add `typing-practice` to `activities` list

### No new localStorage keys
- Reuses existing flashcard mastery data (`activity_flashcards.mastered[]`) to determine category unlock status
- Typing practice progress stored via standard `saveActivityProgress()`

## Files to Create

- `engine/js/activities/typing-practice.js` -- new monkeytype-style typing activity
- `engine/js/core/mastery.js` -- unlock logic, category ordering, gating checks, nudge triggers

## Files to Modify

- `engine/js/core/app.js` -- integrate gating into nav, activity cards, show lock states
- `engine/js/activities/flashcards.js` -- require flip before mark-as-mastered
- `engine/css/styles.css` -- locked card styles, nudge/toast styling, typing practice styles
- `units/early-republic/config.json` -- add categories to questions, add typing passages, add typing-practice activity
- All 12 game/practice activity files -- filter vocabulary/questions to unlocked categories only

## Architecture Notes

- `MasteryManager` (in mastery.js) provides:
  - `getUnlockedCategories(unitId)` -- returns list of unlocked category names
  - `getUnlockedVocabulary(unitId, config)` -- returns filtered vocabulary array
  - `isCategoryMastered(unitId, categoryName)` -- checks if all terms in category are mastered
  - `checkAndNudge(unitId, config)` -- triggers appropriate nudge after mastery events
- Activities call `MasteryManager.getUnlockedVocabulary()` instead of using `config.vocabulary` directly
- Practice activities filter by both unlocked categories and question category tags
