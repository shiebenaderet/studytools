# Textbook Gating Design Spec

**Goal:** Students must read the textbook chapter for a category before that category's flashcards unlock. Creates a Read > Study > Practice > Play learning flow.

**Four features:**
1. Reading level prompt on first textbook visit
2. Textbook-before-flashcards mastery gate
3. Unlocked vs locked term visibility in flashcards
4. "Read in textbook" link on flashcard back face

---

## Feature 1: Reading Level Prompt

**When:** First time a student opens the textbook (no `readingLevel` saved in their textbook progress).

**What they see:** A full-screen selector within the textbook activity area:

- Heading: "Choose Your Reading Level"
- Three cards/buttons, one per level:
  - **Easier** (feather icon) — "Shorter sentences, simpler vocabulary"
  - **On Grade** (book icon) — "Standard 8th grade reading level"
  - **Challenge** (graduation cap icon) — "More detail, deeper analysis"
- Subtext: "You can change this anytime using the buttons at the top."

**Behavior:**
- Clicking a level saves it to textbook progress (`readingLevel` field) and immediately loads the textbook at that level.
- On all future visits, the prompt is skipped and the textbook loads at their saved level.
- The existing level-picker buttons in the textbook header remain, so students can switch anytime.

**Backwards compatibility:** Students who already have textbook progress (with a saved `readingLevel`) skip the prompt entirely. Only brand-new students see it.

---

## Feature 2: Textbook-Before-Flashcards Gate

### How It Works

The mastery gating system gains a new prerequisite: a category's flashcards only become available after all sections in that category's textbook chapter have been marked as read.

**Current unlock flow:**
Category 1 flashcards always available > master > Category 2 unlocks > ...

**New unlock flow:**
Read Chapter 1 (all sections) > Category 1 flashcards unlock > master terms > Read Chapter 2 (all sections) > Category 2 flashcards unlock > ...

### Category-to-Chapter Mapping

The textbook segments map 1:1 to vocabulary categories by name:

| Vocab Category | Textbook Segment |
|---------------|-----------------|
| Jackson's America | Segment 1: Jackson's America |
| Westward Trails | Segment 2: Westward Trails |
| War & Compromise | Segment 3: War & Compromise |
| Two Americas | Segment 4: Two Americas |

The mapping is done by matching `segment.title` to `vocab.category`. If a unit has no textbook (like early-republic currently), the gate is skipped entirely (backwards compat).

### "Read" Definition

A section is "read" when the student has scrolled/navigated to it and it's been recorded in `progress.sectionsRead`. The textbook already tracks this. A chapter is "fully read" when ALL of its sections appear in `sectionsRead`.

Any reading level counts. A student reading at "Easier" gets the same credit as one reading at "Challenge."

### What Students See

**When opening Flashcards before reading:**

If no categories have their chapters read, the flashcard activity shows a gate message instead of cards:

> [book icon] "Read First, Then Study!"
>
> "Before you start flashcards, read Chapter 1: Jackson's America in the textbook. This will help you understand the terms!"
>
> [Button: "Go to Textbook" — navigates directly to the textbook activity]

If some categories are read but the next one isn't, flashcards work normally for the read categories, and the unread category's terms simply don't appear (same as current mastery gating behavior). A nudge toast appears when they finish the available terms: "Read the next chapter to unlock more terms!"

**When opening the Textbook:**

The textbook itself doesn't change behavior. Chapters for locked categories are still visible and readable (students can read ahead). The gate only affects flashcard access, not textbook access.

### Interaction with Existing Mastery Gating

The new reading gate adds a prerequisite BEFORE the existing mastery gate. The full chain becomes:

1. Read Chapter N (all sections) — NEW
2. Category N flashcards unlock
3. Master all must-know terms in Category N
4. Read Chapter N+1 (all sections) — NEW
5. Category N+1 flashcards unlock
6. ... and so on

The Bonus category (5th) has no textbook chapter, so it unlocks purely on mastery of all 4 main categories (existing behavior).

### Teacher Unlock Bypass

The existing `sessionStorage.getItem('teacher-unlock') === 'true'` bypass continues to skip ALL gating, including the new reading gate.

---

## Feature 3: Unlocked vs Locked Term Visibility

**Progress indicator at top of flashcards:**

When not all categories are unlocked yet, show a progress bar at the top:

> "7/25 key terms unlocked — read the next chapter to unlock more!"

The existing mastery progress bar (categories unlocked) stays. This new indicator sits below it and shows the term-level unlock count.

**Category filter dropdown:**

In the flashcard Options panel, the category filter already lists unlocked categories. Locked categories should appear greyed out with "(read chapter first)" appended, so students understand what's coming and why it's locked.

---

## Feature 4: "Read in Textbook" Link

**On the flashcard back face:**

After the definition and example, add a small link: "Read in textbook" with a book icon. Clicking it navigates directly to the textbook section where that term appears in context.

**How the mapping works:**

At flashcard render time, load the textbook JSON and scan each section's content (at the student's saved reading level) for each vocab term. Build a lookup: `term -> { segmentId, sectionId }`. Cache this so it's only computed once per session.

If a term isn't found in the textbook (e.g., new encounter terms not yet in text), the link simply doesn't appear for that term.

**Navigation:** Clicking the link switches to the textbook activity using deep-link params: `textbook/segment-id/section-id`. The textbook already supports deep linking via `_deepLinkParams`.

---

### Files Changed

| File | Change |
|------|--------|
| `mastery.js` | New `isChapterRead(unitId, config, categoryName)` method; update `getUnlockedCategories` to check chapter-read prerequisite; new `getTextbookSectionMap()` for term-to-section lookup |
| `flashcards.js` | Show gate message when no readable categories available; add unlock progress indicator; grey out locked categories in filter; add "Read in textbook" link on back face |
| `textbook.js` | Add reading level prompt screen for first-time users |
| `styles.css` | Styles for reading level prompt, gate message, locked category options, textbook link on flashcards |

### What Does NOT Change

- Textbook chapters remain accessible regardless of mastery (students can read ahead)
- Game activities still gate on first-category mastery (not reading)
- Learn mode remains always accessible
- The textbook's section-read tracking mechanism stays the same
- Early-republic unit is unaffected (no textbook file = gate skipped)
