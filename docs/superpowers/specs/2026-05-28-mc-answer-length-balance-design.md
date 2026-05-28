# Civil War MC Answer Length Balancing — Design

**Date:** 2026-05-28
**Unit:** civil-war
**Status:** Approved design, ready for implementation plan

## Problem

In the civil-war unit's `practiceQuestions`, the correct answer is almost
always the longest option. Measured:

- 58 of 63 questions: correct answer is the (tied-)longest option.
- **49 of 63 questions are "severe"**: the correct answer is 15+ characters
  longer than any distractor. The worst (#46, #44, #34, #24) run ~90–100
  characters longer.

A test-savvy 8th grader can score well by clicking the longest option without
reading any of them. This defeats the point of the practice test.

### Root cause

This is a **content** problem, not a code problem. Correct answers were
authored to carry full explanatory detail (often the textbook-accurate
definition), while distractors are short, plausible fragments. Length becomes
an unintended answer key.

### What is NOT the problem

Answer **shuffling is already fully implemented**. Every MC activity uses a
per-question Fisher-Yates shuffle:

- `practice-test.js:22-38` — per-question shuffle map
- `quiz-race.js:198-207`
- `lightning-round.js:286-301`
- `who-am-i.js:157-165`
- `four-corners.js:153-162, 202-203`

No shuffling work is needed. The original request mentioned shuffling, but the
audit shows position is already randomized; only the length tell remains.

## Goal

For every civil-war practice question, make the four option lengths similar
enough that length no longer signals the answer. Target: **the correct answer
is within ~10 characters of the longest distractor** (no longer the obvious
outlier). Preserve curriculum accuracy and 8th-grade reading level.

## Approach

For each flagged question, redistribute "length mass" two ways:

1. **Trim the correct answer** to its essential claim. Detail removed from the
   option is **folded into the existing `explanation` field**, which is shown
   to the student *after* they answer. Nothing pedagogical is lost — the detail
   moves from "free answer key" to "post-answer teaching moment."

2. **Strengthen distractors** with *specifically* wrong detail — real names,
   dates, places, or mechanisms that don't fit the question — so they are
   plausibly the same length, not vaguely padded.

### Two failure modes to avoid

- **Padding fluff** creates a new tell ("the wordy-but-vague one is wrong").
  Distractors must be specifically, confidently wrong — not long and waffly.
- **Over-trimming** the correct answer can strip curriculum accuracy. The
  `explanation` field absorbs the detail so accuracy is preserved.

## Data shape (unchanged)

Each question keeps its existing structure:

```json
{
  "question": "...",
  "options": ["...", "...", "...", "..."],
  "correct": 1,
  "explanation": "...",
  "topic": "..."
}
```

Only the strings inside `options` and `explanation` change. `correct` indices,
question text, topics, and array order are untouched. (Shuffle happens at
render time, so source order is irrelevant.)

## Scope

civil-war `practiceQuestions` only. By chapter/topic:

| Flagged/Total | Topic (chapter) |
|---|---|
| ~9/16 | Worlds of North & South |
| 7/12 | African Americans at Mid-Century |
| 14/19 | A Dividing Nation |
| 13/16 | The Civil War |

(Counts are approximate per-chapter; the per-question audit script is the
authoritative list. ~49 flagged across all chapters.)

Out of scope: early-republic, game-generated MC (lightning-round/who-am-i pull
distractors from vocab term names, where length tells are unlikely).

## Verification (regression gate)

A reusable audit script is the acceptance test. After edits, re-run it and
require **every** question to pass: correct answer within ~10 chars of the
longest distractor. The script reports any remaining offenders by index, so
"done" is measurable, not eyeballed.

Script logic (Node, reads `config.json`): for each question compute option
lengths, the correct length, and the max distractor length; flag any where
`correctLen - maxDistractorLen > 10` OR correct is the strict longest by a
meaningful margin.

## Execution plan

Batch by textbook chapter (4 batches). After each batch:
1. Rewrite that chapter's flagged questions (trim correct → explanation,
   strengthen distractors).
2. Re-run the audit on that chapter; confirm it passes.
3. Pause for user review of the diffs before the next batch.

Bump `study-tools/engine/version.json` when shipping (per project convention).

## Out of scope / non-goals

- No changes to rendering, shuffling, or scoring code.
- No new config fields.
- No changes to other units or to vocab-driven games.
