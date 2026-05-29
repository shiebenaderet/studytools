# Question Export Tool — Design

**Date:** 2026-05-28
**Status:** Approved design, ready for implementation plan

## Purpose

Give the teacher a self-contained page to select practice questions from a
unit, optionally tweak them in memory, and download a CSV ready to import into
Blooket or GiMKit. This replaces the one-off CSV-generation script with a
reusable, visual tool.

## Scope (locked during brainstorming)

- **Edit scope: export-only.** Edits live in memory and affect ONLY the
  downloaded CSV. The unit's `config.json` and the live study site are never
  modified. This is the key constraint that keeps the tool simple and safe: no
  save logic, no GitHub commit flow, no auth.
- **Sources: practice MC only** (the `practiceQuestions` array). A source
  adapter seam is built so fill-in-the-blank / short-answer can be added later,
  but they are out of scope now.
- **Platforms: Blooket and GiMKit**, chosen at export time from one selection.
- **Placement: standalone page** at `study-tools/engine/tools/question-exporter.html`,
  mirroring the existing `map-exporter.html` (unlinked from student nav).
- **Persistence: none.** Selections and edits reset on page refresh.

## User flow

1. **Pick a unit** — dropdown of available units; loads that unit's
   `config.json`. Reusable beyond Civil War.
2. **Select questions** — all practice MC questions listed, grouped by
   `topic` (chapter). Per-question checkbox, plus select-all and
   select-by-chapter. Text filter to find a question fast.
3. **Edit inline (export-only)** — expand a question to edit its text, any of
   the 4 options, or which option is correct. A "modified" badge marks changed
   questions. Edits are held in memory only.
4. **Choose platform and export** — pick Blooket or GiMKit, click Export,
   download the CSV. Filename: `<unit-id>-<platform>.csv`
   (e.g. `civil-war-blooket.csv`).

## Architecture — three seams

The whole tool is a pipeline: load -> normalize -> select/edit -> format ->
download. Three clean boundaries:

### 1. Source adapter
`loadQuestions(unitConfig)` returns a normalized list:
```
{ id, question, options: [s0, s1, s2, s3], correctIndex, topic }
```
Today it reads `config.practiceQuestions` only. This function is the single
place where future question types (FIB, short-answer) would plug in.

### 2. In-memory edit model
A working copy of the normalized list plus a selection set. Edits mutate the
working copy, never the loaded config. No localStorage. A per-question "dirty"
flag drives the modified badge.

### 3. Format adapter
`formatAs(platform, selectedQuestions)` returns CSV text. The ONLY
platform-specific code. Two implementations:

**Blooket** (positional correct-answer):
Columns: `Question #, Question Text, Answer 1, Answer 2, Answer 3, Answer 4,
Time Limit (sec), Correct Answer(s)`
- Options written in their normalized order.
- `Correct Answer(s)` = `correctIndex + 1` (1-based number).
- Default time limit: 20s.

**GiMKit** (column-role correct-answer):
Columns: `Question, Correct Answer, Incorrect Answer 1, Incorrect Answer 2,
Incorrect Answer 3`
- `Correct Answer` = `options[correctIndex]`.
- The three Incorrect columns = the remaining options in order.

Both share one RFC-4180 CSV writer (quote every field, double internal quotes)
because question/answer text contains commas, apostrophes, and quotation marks
(e.g. `"Bleeding Kansas"`, `"invisible institution"`).

## Constraints baked in

- **CSV correctness:** RFC-4180 quoting on every field. Verified by round-trip
  parsing in the plan.
- **Length caps:** Blooket answers import cleanly under ~100 chars and
  questions under ~250. The editor shows a non-blocking warning if an edit
  pushes a field over the cap. (Current Civil War content already fits: longest
  answer 99, longest question 123.)
- **Security:** no `innerHTML` anywhere; DOM built with `createElement` /
  `textContent` (project rule). The map-exporter is the style reference.
- **Theme:** match the tools' existing look; Civil War is Crimson & Slate but
  the page is unit-agnostic, so use a neutral tool chrome like map-exporter.
- **Exactly 4 options** assumed for MC; the source adapter pads/guards if a
  question has fewer.

## Cleanup

Delete the 4 one-off CSVs in `study-tools/units/civil-war/_tools/blooket/` and
the temporary generator script — this tool replaces them. (Those CSVs were
never committed.)

## Out of scope / non-goals

- No write-back to `config.json`; no saving the study site.
- No FIB or short-answer export yet (seam only).
- No persistence across refresh.
- No multi-correct-answer questions (both platforms' basic import is
  single-correct MC; our data is single-correct anyway).

## Format references

- Blooket CSV import: positional, numeric `Correct Answer(s)` column (1-4),
  per Blooket's spreadsheet import help.
- GiMKit CSV import: `Question, Correct Answer, Incorrect Answer 1-3`
  (their "Template 1"), per GiMKit's create-a-kit-with-a-csv help.
