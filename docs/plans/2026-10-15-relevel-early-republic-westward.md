# Re-level the Early Republic and Westward Expansion textbooks: plan

> **Status (2026-10-15):** the teacher approved this on Oct 15 ("yes to fixing
> the other units on study tools as needed"). Built the same day in 8.55.47 to
> 8.55.49 on branch `claude/quick-clear-full-deep`. Not merged.

## Findings

Reading levels are defined once in [READING-LEVELS.md](../READING-LEVELS.md), and
`study-tools/engine/tools/check-levels.js` measures them (Flesch-Kincaid grade,
whole tier and each section). A name always means one difficulty, so a tier that
measures outside its band is rewritten, not relabeled.

Before this change, the two units still labeled Easier / On Grade / Challenge
measured too hard for any clean set of names:

| Unit | Easier (`simplified`) | On Grade (`standard`) | Challenge (`advanced`) |
|---|---|---|---|
| Early Republic | 8.3 (sections 6.0 to 14.0) | 10.8 (7.6 to 15.5) | 16.4 (12.6 to 21.3) |
| Westward Expansion | 7.9 (6.5 to 9.6) | 11.1 (9.1 to 13.8) | 13.9 (12.5 to 17.1) |

Both easier tiers measured as Full and both on-grade tiers as Deep, so
`check-levels.js` could not name them. Civil War (Clear 7.0, Full 8.1, Deep 12.4)
is the model: three tiers named Clear / Full / Deep, not Quick.

## Targets

| Tier | Becomes | Whole tier | Every section |
|---|---|---|---|
| `simplified` | Clear | about 6 to 6.5 | 7.5 or below |
| `standard` | Full (the default) | about 9 | 10.5 or below |
| `advanced` | Deep | unchanged | must stay above Full (it does: 16.4 and 13.9) |

## What changes

- The text of the `simplified` and `standard` tiers, section by section, using the
  leveled-reading rule: level the **language**, never the facts. Shorter sentences,
  plainer words, terms defined inline. Every name, date and number stays; no fact is
  added.
- Sections that already measured inside their target are left exactly as they were,
  so the fewest highlights are touched.
- Then, as its own commit, the tier labels become Clear / Full / Deep with the
  shared blurbs word for word and the same grade ranges Civil War uses.

## What cannot change

- Section ids and their order (highlights and reading progress are keyed by
  `segment-id/section-id`).
- The level keys `simplified` / `standard` / `advanced`, so saved level choices
  still work.
- Every vocabulary term that appeared in a section still appears in it verbatim,
  because tap-to-define (`.tb-vocab`) finds terms by whole-word match against the
  unit's vocabulary list. Bold key terms stay bold.
- The `advanced` tier, key ideas, check-ins and every other field.

## The highlight trade-off

Highlights are saved per section and reading level by character offset. When a
section's words change, highlights on the changed words are dropped (the rest of
the section's highlights and the "read" checkmarks stay). This is unavoidable when
text is rewritten.

**Are these units live?** No. In `units.json` both carry `hidden: true` and no
`opens` date, and neither config has a `categorySchedule`. `unit-access-core.js`
describes hidden units as last year's units, which students cannot open without the
teacher unlock. So no 2026-27 student has highlights in them. Any highlights a
2025-26 student left on changed words are dropped.

## Checks

- A script compared every rewritten section with the saved original: the same set
  of numbers and years, no capitalized name lost or added (sentence-start words
  reviewed by hand), every vocabulary term and bold term still present.
- `check-levels.js`, every `*.test.js`, `unit-content-check.js` for both units, and
  a browser smoke test of the textbook level cards.

## For the teacher to read

- Westward Expansion, On Grade "Polk and the Push to the Pacific": the original says Polk
  settled Oregon because he "needed his southern flank secure." The wording is kept
  as written, but the Oregon deal secured his northern border while he turned south
  toward Mexico; you may want to change it.
- Westward Expansion, Easier "The Fight for Women's Rights": the original had a broken sentence
  ("...end slavery completely. reminding people that Black women faced double the
  discrimination"). The rewrite makes it a sentence: "She reminded people that Black
  women were treated unfairly twice as much."
- Early Republic, Easier "Federalists vs. Democratic-Republicans": to keep the long party name from
  making every line hard, the rewrite says "Hamilton's side" and "Jefferson's side"
  in some rows and reminds readers that the Democratic-Republicans were also called
  Republicans (as the section before says).
