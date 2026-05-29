# Question Exporter: Fill-in-the-Blank + Vocabulary Sources — Design

**Date:** 2026-05-29
**Status:** Approved design, ready for implementation plan
**Extends:** `docs/superpowers/specs/2026-05-28-question-exporter-design.md`

## Purpose

Add two new export sources to the existing Question Export Tool
(`study-tools/engine/tools/question-exporter.html`): Fill-in-the-Blank
sentences and Vocabulary terms. Teachers can already export practice MC
questions to Blooket/GiMKit; this lets them build games from the FIB and vocab
banks too.

## Why this is mostly reuse, not new architecture

The tool already normalizes practice questions into a canonical shape and runs
them through platform formatters, a selection UI, and an inline editor. The
canonical shape is:
```
{ id, question, options: [s0,s1,s2,s3], correctIndex, topic }
```
FIB and vocab just need their own normalizer functions that emit this same
shape. Selection, per-chapter toggles, inline editing, CSV formatters, and
download all work unchanged. The only genuinely new logic is distractor
generation.

## Source data shapes (verified in civil-war/config.json)

- `fillInBlankSentences`: `[{ sentence: "… _____ …", answer, category }]` (15 items)
- `vocabulary`: `[{ term, definition, category, tier?, … }]` (70 items; `tier`
  is either absent = must-know, or `"encounter"`). 47 must-know, 23 encounter.

## New UI controls

A **source picker** dropdown next to the unit picker:
- `Practice Questions` (default; existing behavior, unchanged)
- `Fill-in-the-Blank`
- `Vocabulary`

Switching source re-normalizes and re-renders the question list and **resets
selection and edits** (same rule as switching units).

Source-specific controls appear only when relevant:

- **Vocabulary** shows two toggles:
  - **Direction** (`Definition → Term` default | `Term → Definition`):
    chosen per export.
  - **Tier** (`Must-know only` default | `Include encounter`).
- **Fill-in-the-Blank** shows one toggle:
  - **Typed answers (GiMKit)** (default off). See FIB export rules below.

A small persistent note near the export button when source is FIB or Vocab:
"Wrong answers are auto-generated from the same chapter. Review or edit them
before exporting."

### Review happens inside the exporter (no separate review tool)
The exporter already renders every question with its four options, marks the
correct one, and allows inline editing. That IS the review surface for the
auto-generated FIB/vocab questions — the teacher reviews exactly what will be
exported and can fix any weak distractor in place. We deliberately do NOT
extend the separate `question-review.html` tool, which only reads
`practiceQuestions` from config and would duplicate rendering the exporter
already does.

To support that review, each option shows a **length warning** when it exceeds
the platform answer cap (~100 chars, the Blooket limit). This matters most for
`Term → Definition` vocab, where definitions can run long. The warning is
non-blocking (a visual marker on the option, e.g. an amber length badge); the
teacher trims inline if they care. Export is never prevented.

## Normalizers (source adapter seam)

### FIB normalizer
For each `{sentence, answer, category}`:
- `question` = `sentence` (keep the `_____` blank as-is)
- correct answer = `answer`
- 3 distractors via `pickDistractors` from other FIB `answer`s in the same
  `category`
- `topic` = `category`

### Vocab normalizer
Filtered by tier toggle first (must-know = items without `tier` or with a
non-"encounter" tier; encounter = `tier === "encounter"`). Default excludes
encounter.

For `Definition → Term` (default):
- `question` = `definition`, correct = `term`, distractors = 3 other `term`s
  from same category.

For `Term → Definition`:
- `question` = `term`, correct = `definition`, distractors = 3 other
  `definition`s from same category.

`topic` = `category` either way.

### pickDistractors (new pure function)
`pickDistractors(candidates, correctValue, n=3)`:
- candidates = the values (terms/answers/definitions) from the SAME category,
  excluding the correct one and excluding duplicates of it.
- shuffle, take up to `n`.
- if fewer than `n` available in-category, pad from other categories
  (shuffled), still excluding the correct value and avoiding duplicates.
- returns exactly `n` strings when the pool is large enough; fewer only if the
  whole pool is too small (then the MC will have blank options, which the
  editor can fill).
Pure, deterministic given a seeded/!injected shuffle for testability; in the
browser it uses `Math.random`. Unit-tested in Node with an injected shuffle.

## Export rules

Output goes through the EXISTING `formatBlooket` / `formatGimkit` for MC.

- **Practice Questions:** unchanged.
- **Vocabulary:** always 4-option MC (correct + 3 distractors), both platforms.
- **Fill-in-the-Blank:**
  - Blooket: always 4-option MC (typed toggle ignored; Blooket basic import is
    MC-only).
  - GiMKit + typed toggle OFF: 4-option MC.
  - GiMKit + typed toggle ON: typed-answer export using GiMKit's two-column
    `Question, Answer` flashcard template (see below). The answer is the EXACT
    `answer` string (GiMKit matches case-insensitively). No distractors. A
    teacher can adjust the accepted answer by editing it inline before export.

### GiMKit typed-answer format
GiMKit offers two separate import templates: the 4-answer multiple-choice
template (`Question, Correct Answer, Incorrect Answer 1-3`) and a two-column
"Question and answer" flashcard-style template. GiMKit's own guidance says all
four answer fields in the MC template should be filled, so blanking the
Incorrect columns is NOT a reliable way to make a typed question.

Therefore typed FIB uses the **two-column flashcard template**:
`Question, Answer`
A new `formatGimkitTyped(questions)` emits exactly two columns: the sentence and
the exact `answer`. This is GiMKit's documented path for non-MC questions.

(Verified against GiMKit help/community docs, 2026-05-29: MC template requires
all four answers filled; the Question+Answer template is the flashcard/typed
path.)

## Filenames

Include the source so files never collide:
`<unitId>-<source>-<platform>.csv`
e.g. `civil-war-vocabulary-blooket.csv`, `civil-war-fib-gimkit.csv`,
`civil-war-practice-blooket.csv`. (Practice filename changes from the current
`<unit>-<platform>.csv`; acceptable, this is an unreleased-to-others tool.)

## Architecture summary (seams)

1. **Source adapter** — `normalizeQuestions` (existing) +
   `normalizeFib(config)` + `normalizeVocab(config, {direction, includeEncounter})`.
   All emit the canonical shape. `pickDistractors` is shared helper logic.
2. **In-memory edit model** — unchanged; edits/selection reset on source or
   unit switch.
3. **Format adapter** — `formatBlooket`, `formatGimkit` (existing) +
   `formatGimkitTyped` for FIB typed mode.

All new pure logic lives in the existing `question-export-core.js` and is
Node-tested in `question-export-core.test.js`. The page wires the new controls.

## Constraints (carried from the base tool)

- No `innerHTML`; DOM via `createElement`/`textContent`.
- RFC-4180 CSV escaping (existing `csvField`/`toCsv`).
- No persistence; reset each session.
- No write-back to config; export-only.
- Vocab definitions can be long; Term→Definition MC may exceed Blooket's ~100
  char answer cap. A non-blocking length warning marks over-cap options so the
  teacher can trim inline. Export is never prevented. (See "Review happens
  inside the exporter" above.)

## Out of scope / non-goals

- No auto-generated answer variants for typed FIB (exact answer only; edit
  inline if needed).
- No short-answer source (open-ended; not a clean MC fit).
- No cross-pool distractors (e.g. vocab terms as FIB distractors).
- No multi-correct questions.
- No new platforms beyond Blooket/GiMKit.

## Testing

- `pickDistractors`: returns n, excludes correct value, no dupes, pads across
  categories when in-category pool is short (injected deterministic shuffle).
- `normalizeFib`: shape, blank preserved, distractors are same-category answers.
- `normalizeVocab`: both directions; tier filter excludes/includes encounter;
  distractors are same-category.
- `formatGimkitTyped`: emits exactly two columns (`Question, Answer`) with the
  exact answer present.
- Round-trip: FIB-MC and vocab-MC parse back with correct answer intact on real
  civil-war data; FIB-typed parses as two columns with the answer intact.
