# Response Builder — Design Spec

**Date:** 2026-06-02
**Status:** Approved design, pending implementation plan
**Author:** Shie Benaderet (with Claude)

## Summary

A guided, 5-step wizard that helps students who feel stuck on a short-answer
question ("I don't know what to write"). Launched from a **"Help me build a
response"** button inside the existing Short Answer activity, it walks the
student through a linear, scaffolded flow — Unpack → Read → Terms → Plan →
Draft — and returns them to the Short Answer draft box with a completed argument
plan in hand.

The wizard introduces **no new content burden beyond one new per-question field**
(`plan`): every other step reuses data the unit already carries (the question
text, the topic's typing passage, the question's key terms, the existing
sentence starters). The plan step teaches the school's **Claim · Evidence ·
Reasoning (CER)** framework.

## Goals

- Give a stuck 8th grader a finite, reassuring path from "blank page" to "I have
  an outline and a draft started."
- Reinforce the CER argument framework students are already taught.
- Reuse existing unit data wherever possible; minimize per-question authoring.
- Live where students actually write (inside Short Answer), not as a disconnected
  tool.

## Non-Goals

- No auto-grading of the student's written draft (the existing exemplar already
  serves as a self-check reference).
- No mobile-specific responsive mode. Students study almost entirely on
  Chromebooks (laptop width); a cramped phone view is an acceptable edge case.
- No generic/reusable "wizard engine." There is exactly one wizard; building an
  abstraction for hypothetical future wizards is out of scope (YAGNI).
- Reconstruction or any other unit — this ships for **civil-war** first.

## User Experience

### Entry point

In `short-answer.js`'s `openQuestion(index)` detail panel, a prominent **"Help
me build a response"** button is added directly under the question text (before
the existing Key Terms / Rubric / Sentence Starters reference sections). Clicking
it launches the wizard for that question.

### The wizard shell (Option A — top stepper)

A horizontal stepper bar across the top shows all five steps at once, with a
connector line: completed steps show a green check, the current step is
highlighted in the unit primary color, upcoming steps are dimmed. The question
being worked on is pinned below the stepper as context ("Building your response
to: …"). Below that is the current step's content and a Back / Next nav row.

Rationale: showing the whole journey at once is the most reassuring framing for a
stuck student — it makes the path finite and visible ("step 2 of 5, almost a
third done"). Optimized for laptop width per the Chromebook audience; no phone
fallback.

### The five steps

1. **What's it asking? (Unpack)** — The question is shown with its "task words"
   (e.g., *explain*, *use at least two examples*) highlighted, plus a
   "restate it in your own words" text box. Helps students who misread prompts
   before they invest effort. *(Assembles existing data: the question text.)*

2. **Read about it** — Shows the topic's typing passage (matched by
   `passage.category === question.topic`). A short, ~200-300 word, 8th-grade
   refresher already written for the unit. *(Reuses `typingPassages`.)*

3. **Know the key terms** — Reuses the existing clickable key-term chips
   (term → definition + simpleExplanation + example, looked up from
   `config.vocabulary`) as a quick flip-and-check. *(Reuses `question.keyTerms`
   + existing `_renderTermDetails` logic.)*

4. **Make a plan (CER skeleton)** — The novel step. A pre-drawn, **labeled**
   skeleton with role rows: **CLAIM** ("your main point"), **EVIDENCE** ("an
   example that proves it"), **EVIDENCE** ("another example"), **REASONING**
   ("why the evidence proves your claim"). The question's plan pieces appear
   jumbled in a pool below. The student taps a piece, then taps the role row it
   belongs in.
   - **Correct placement:** the piece locks into the row (green, ✓), removed from
     the pool.
   - **Wrong placement:** the piece bounces back (shake, brief red ✕), the slot
     stays open, and a coaching callout explains the role it actually is and what
     the target role means — e.g. "That sentence is **Evidence** — a specific
     example that proves your claim. **Reasoning** is the sentence that explains
     *why* your examples add up to your claim. Try the empty **Evidence** row."
   - The **Next** button stays disabled until all rows are correctly filled.

5. **Write your draft** — The Short Answer textarea, with the student's completed
   CER plan pinned beside it as their outline, plus the existing clickable
   sentence starters. *(Reuses `question.sentenceStarters` and the existing
   draft textarea + save behavior.)*

On finishing Step 5, the student is returned to the normal Short Answer detail
panel for that question, with their draft text preserved in the usual
`short-answer-<index>` progress slot.

## Data Model

### New per-question field: `plan`

Added (optional) to each entry in `shortAnswerQuestions`. Shape:

```json
"plan": [
  { "role": "claim",     "text": "Geography pushed the North and the South down two very different paths." },
  { "role": "evidence",  "text": "The North had cold winters, rocky soil, and fast rivers, so it built factories powered by water and steam during the Industrial Revolution." },
  { "role": "evidence",  "text": "The South had warm weather and rich soil, so it grew cotton on huge plantations worked by enslaved people." },
  { "role": "reasoning", "text": "By 1850, these opposite economies had grown into two societies with completely different needs, and that split helped pull the country toward war." }
]
```

- `role` is one of exactly `"claim" | "evidence" | "reasoning"`.
- Order in the array is the canonical correct order. The wizard scrambles a copy
  for display; correctness is checked against each piece's `role` matching the
  row it's placed in (with the two `evidence` pieces interchangeable between the
  two evidence rows).
- A question **without** a `plan` field simply does not show the wizard's
  "Help me build a response" button (or shows it without Step 4 — see Open
  Questions). Backwards compatible: westward-expansion and any plan-less question
  are unaffected.

### Role coaching copy (authored once, reused everywhere)

Three short, generic, 8th-grade explanations — one per role — used in the Step 4
coaching callout. These are **not** per-question; they live in the
response-builder code/constants and are reused for every question in every unit.
Draft copy below (final wording to be refined during planning, in the warm,
encouraging tone used elsewhere in the tools):

- **Claim:** "your main point — the one-sentence answer to the question."
- **Evidence:** "a specific example or fact that proves your claim."
- **Reasoning:** "the sentence that explains why your evidence adds up to your
  claim."

### Authoring cost

Per short-answer question: author the 4 (or so) CER `plan` sentences. Civil-war
has 6 short-answer questions → ~6 plans.

**Primary authoring method: derive the plan from the existing `exemplar`.** Every
civil-war short-answer question already has an `exemplar` — a full sample strong
answer whose prose opens with the claim, walks through specific examples
(evidence), and closes with the big-picture reasoning. The `plan` pieces are
extracted/condensed directly from that exemplar rather than written from scratch.
Workflow: decompose each exemplar into its CER pieces, then review for anything
that doesn't split cleanly (e.g., an exemplar with one long evidence paragraph
that should become two evidence pieces, or a missing explicit reasoning sentence)
and patch those by hand. The sentence-starters and key-terms steps already draw
on existing fields, so the exemplar-derived plan is the only new authored content.

## Architecture

Approach A — a self-contained activity (chosen over building into `short-answer.js`
to keep that file lean, and over a generic wizard engine per YAGNI).

### Components

- **`study-tools/engine/js/activities/response-builder.js`** (new) — a
  `StudyEngine.registerActivity({ id: 'response-builder', hidden: true, … })`.
  Owns the 5-step flow as a small step state machine (`_step = 1..5`), rendering
  into the activity container. Reads the target question from a deep-link param
  (see Handoff). Reuses the term-details rendering pattern from `short-answer.js`
  (extracted or duplicated minimally — see Open Questions).

- **`study-tools/engine/tools/response-builder-core.js`** (new) — a pure,
  testable module (mirrors the `question-export-core.js` / `map-quiz-guard-core.js`
  pattern: `module.exports` for node + `window.ResponseBuilderCore` for browser).
  Holds the logic worth testing in isolation:
  - `scramblePlan(plan, seedIndex)` — returns a display order (deterministic given
    an index, so no `Math.random` in the tested core).
  - `checkPlacement(piece, targetRole)` — returns whether a piece's role matches
    the row (evidence pieces valid in either evidence row).
  - `isPlanComplete(placements)` — all rows correctly filled.
  - `roleCoaching(role)` — returns the generic coaching copy for a role.

- **`study-tools/engine/js/activities/short-answer.js`** (modified) — adds the
  "Help me build a response" button in `openQuestion()` under the question text;
  the button calls `StudyEngine.activateActivity('response-builder', [index])`.

- **`study-tools/engine/index.html`** (modified) — loads
  `tools/response-builder-core.js` as a global `<script>` before activities mount
  (same slot pattern as `map-quiz-guard-core.js`), and ensures
  `response-builder.js` is loadable (it is auto-loaded by `app.js` like other
  activities).

- **`study-tools/units/civil-war/config.json`** (modified) — adds `plan` arrays to
  the 6 short-answer questions. Adds `response-builder` to the unit `activities`
  array (as a hidden, deep-linked activity).

- **`study-tools/engine/css/styles.css`** (modified) — adds `.rb-*`-namespaced
  styles for the stepper, the CER skeleton, the coaching callout, etc.

### Handoff (Short Answer ↔ Response Builder)

`activateActivity(activityId, deepLinkParams)` already accepts a second
parameter (used today for hash deep-linking, `app.js:741` / `:459`). The Short
Answer button passes the question index:
`StudyEngine.activateActivity('response-builder', [index])`. The wizard reads
that index, loads `config.shortAnswerQuestions[index]`, and runs.

On finish (or a "back to question" exit), the wizard calls
`StudyEngine.activateActivity('short-answer', [index])` (or the existing return
path) so the student lands back on that question's detail panel. The draft itself
is saved through the **existing** `short-answer-<index>` ProgressManager slot and
`#sa-answer-text` textarea, so Step 5 writes to the same place the normal panel
reads from — no separate draft storage, no sync problem.

### Gating

`response-builder` is `hidden: true`, so it never appears on the home grid or in
nav (`app.js` skips hidden activities). It is reached only via the Short Answer
button. It inherits whatever gating already governs which short-answer questions
are unlocked (the button only appears on already-open questions).

## Error Handling / Edge Cases

- **Question has no `plan`:** the wizard either hides the button or runs without
  Step 4 (decide in Open Questions). Either way, no crash; plan-less questions
  and units are unaffected.
- **No matching typing passage for the topic:** Step 2 shows a graceful fallback
  ("Review your guided notes on this topic") instead of a blank screen.
- **Missing key terms / vocabulary lookups:** Step 3 degrades the same way the
  existing Short Answer panel already does (chip with no details).
- **Re-entry / spam:** Step transitions are guarded so a double-tap on Next can't
  skip a step (single render per transition; mirror the re-entrancy care from the
  recent map-quiz fix).
- **No `Math.random()` / `Date.now()` in the tested core** — scrambling is
  seeded by an index so the pure logic stays deterministic and testable.

## Testing

Follow the project's established vanilla-node core-test pattern
(`question-export-core.test.js`, `map-quiz-guard-core.test.js`):

- **`study-tools/engine/tools/response-builder-core.test.js`** — tests
  `checkPlacement` (claim/evidence/reasoning matching, evidence interchangeability,
  wrong-role rejection), `isPlanComplete`, `scramblePlan` (deterministic, returns
  a permutation of the input), and `roleCoaching` (returns copy for each role).
  Written test-first (red → green), run with `node …core.test.js`.
- Manual verification in-browser: launch the wizard from a civil-war short-answer
  question, walk all 5 steps, confirm a wrong placement coaches and blocks Next,
  confirm finishing returns to the draft with text preserved.
- Version bump in `version.json` and the README badge on ship.

## Rollout

1. Build core + tests (red/green).
2. Build `response-builder.js` + CSS, wire the Short Answer button + handoff.
3. Author the 6 `plan` arrays for civil-war (adapted from each `exemplar`).
4. Manual walkthrough; version bump; README; ship to civil-war.
5. Future units add `plan` fields to opt in; no engine changes needed.

## Open Questions (resolve during planning)

1. **Plan-less questions:** hide the "Help me build a response" button entirely,
   or show the wizard but skip Step 4? (Leaning: hide the button when no `plan`,
   so the wizard is always the full 5 steps.)
2. **Term-details reuse:** extract the existing `_renderTermDetails` from
   `short-answer.js` into a shared helper, or duplicate the small amount of logic
   in the wizard? (Leaning: extract a tiny shared helper to avoid drift.)
3. **Number of evidence rows:** fixed at 2, or driven by how many `evidence`
   pieces the `plan` contains? (Leaning: drive from the data — render one row per
   evidence piece — so questions can have 1 or 3 evidence pieces.)
