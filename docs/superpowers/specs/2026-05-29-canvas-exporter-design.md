# Canvas QTI Exporter — Design

**Date:** 2026-05-29
**Status:** Approved design, ready for implementation plan
**Extends:** `docs/superpowers/specs/2026-05-28-question-exporter-design.md`,
`docs/superpowers/specs/2026-05-29-exporter-fib-vocab-design.md`
**Conformance reference:** the user-supplied QTI spec
("Canvas QTI Exporter — Engineering Specification"). Every §-reference in this
document points back to that spec.

---

## Purpose

Add Canvas as a third export destination in the existing Question Export Tool.
Teachers can already export practice MC, vocab, and FIB to Blooket and GiMKit
as CSV; this lets them export to Canvas LMS as a QTI 1.2 / IMS Content Package
1.1.3 .zip that imports cleanly on the first try.

This is also the moment we refactor the exporter UI from a stacked-toolbar
layout into a **wizard** (Option C from the 2026-05-29 UX mockups), because
adding Canvas's settings + validation to the toolbar would push it over and
because the long-run plan is "all units, one workbench."

## Scope (locked during brainstorming)

- **Placement:** extend the existing exporter; Canvas is a third Platform
  alongside Blooket / GiMKit.
- **Zip library:** vendor [JSZip](https://stuk.github.io/jszip/) at
  `study-tools/engine/vendor/jszip.min.js` (MIT, ~100KB, self-hosted to match
  the project's no-CDN posture).
- **v1 question types:** `multiple_choice` (from practice MC + vocab),
  `short_answer` (from FIB), `essay` (from `shortAnswerQuestions`).
- **Out of v1:** `multiple_answer`, `true_false`, `file_upload`, `map`/`image`,
  multi-assessment-per-zip, saved drafts, recent exports, multi-unit dashboard,
  localStorage persistence.
- **Packaging:** one `.zip` per export. Quiz Title + Max Attempts collected on
  Step 3 (Send). To make per-chapter Canvas quizzes, select that chapter and
  export once per chapter.
- **Essay prompt content:** question + keyTerms + sentenceStarters. Never
  the `rubric` or `exemplar` (that's the answer key — stays out of student
  view).
- **Validation:** block + explain. Invalid exports do not download.

## Why this is mostly extension, not new architecture

The tool already normalizes every source (practice / vocab / FIB) into the
canonical question shape `{ id, question, options:[4], correctIndex, topic }`.
Canvas adds three things:

1. A new **format adapter** (`buildCanvasPackage`) that emits a file map
   (`{path: string|Blob}`) instead of a single CSV string.
2. A tiny **zip wrapper** (`packageZip`) that turns the file map into a
   `Promise<Blob>` via JSZip.
3. A **wizard** UI refactor of the page so the Canvas-specific settings and
   validation surface have a real home (Step 3), without crowding the toolbar.

The pure logic stays Node-testable. The zip step is the only browser-only
piece.

---

## Architecture & file layout (Section 1)

### New / changed files

```
study-tools/engine/vendor/
└── jszip.min.js                    (NEW; self-hosted JSZip)

study-tools/engine/tools/
├── question-export-core.js         (EXTENDED)
├── question-exporter-zip.js        (NEW; tiny — JSZip wrapper)
├── question-exporter.html          (REFACTORED to wizard)
└── question-export-core.test.js    (EXTENDED with Canvas tests)

study-tools/engine/tools/_canvas-fixtures/   (NEW)
├── mc.zip                          (golden: known-good MC quiz)
├── short-answer.zip                (golden: known-good short-answer quiz)
└── essay.zip                       (golden: known-good essay quiz)

docs/superpowers/specs/
└── 2026-05-29-canvas-exporter-design.md   (this file)
```

### Extended core module API (additions)

```js
// Pure XML / data; no browser, no JSZip.
QExport.validateForCanvas(questions, opts)
  -> { ok: boolean, errors: [{ ruleId, message, questionIds: [...] }] }

QExport.buildCanvasPackage(questions, opts)
  -> { fileMap: { [path]: string|Blob }, assessmentId }
  // fileMap example:
  //   "imsmanifest.xml": "<?xml ...>",
  //   "civil-war-vocab/civil-war-vocab.xml": "<?xml ...>"
  // (no images/ in v1)
```

`buildCanvasPackage` orchestrates: build assessment id (slug), call per-type
renderers (one per question), assemble assessment XML, assemble manifest XML,
return the file map. Internally uses these renderers (all pure, all exported
for testing):

```js
QExport.renderMCItem(q, idx, opts)            // returns <item> XML string
QExport.renderShortAnswerItem(q, idx, opts)
QExport.renderEssayItem(q, idx, opts)
QExport.buildAssessmentXml(items, opts)       // wraps items in <questestinterop>
QExport.buildManifestXml(assessmentId, opts)
QExport.xmlEscape(str)                        // exported helper
```

### Zip wrapper (`question-exporter-zip.js`)

```js
// The ONLY file in this codebase that depends on JSZip.
// fileMap entries are string (treated as UTF-8) or Blob (binary).
window.QExportZip = {
  packageZip(fileMap) -> Promise<Blob>
};
```

Browser-only. Loaded by the page after `jszip.min.js` and
`question-export-core.js`. Pure logic stays unit-testable in Node without
touching this file.

### Why this split

- **Node-testable pure logic.** `question-export-core.js` runs in Node (no
  DOM, no JSZip), so the renderers, validation, and `buildCanvasPackage` are
  unit-tested the same way as the existing Blooket/GiMKit formatters.
- **Zip dependency isolated.** Swapping JSZip later, or building zips
  server-side in some future world, only touches `question-exporter-zip.js`.
- **Single seam to the UI.** The wizard page calls
  `validateForCanvas` (sync), then `buildCanvasPackage` (sync), then
  `packageZip(fileMap)` (async). Three boundaries the UI can reason about.

---

## Per-type Canvas renderers (Section 2, approved)

Three renderers, each a pure function from a canonical question + index → XML
string for one `<item>` element. The assessment shell wraps them.

| Source | Canvas type | Renderer | Key §-conformance |
|---|---|---|---|
| Practice MC + Vocab MC | `multiple_choice` | `renderMCItem` | §4.2 named idents (`q<idx>_a<n>`), §4.3 `setvar=100` on correct |
| FIB | `short_answer` | `renderShortAnswerItem` | §4.4 `case="No"` per accepted, `response_str` + `render_fib` |
| `shortAnswerQuestions` | `essay` | `renderEssayItem` | §4.5 `text/plain`, single combined block, no `respcondition` |

### Conformance baked into every renderer

- **§4.1** package format set by `buildManifestXml`: schemaversion 1.1.3,
  `imscc_v1p1` namespace, empty `<organizations/>`, hybrid resource type
  `imsqti_xmlv1p2/imscc_xmlv1p1/assessment`.
- **§4.2** every `<response_label>` ident is a named string unique within the
  item (`q1_a0`, `q1_a1`, ...). Every `<varequal>` references that string. Never
  a bare integer.
- **§4.3** `<decvar maxvalue="100" minvalue="0"/>` and `<setvar>100</setvar>`
  on correct paths.
- **§4.4** short_answer emits one `<respcondition>` per accepted answer with
  `case="No"`.
- **§4.5** essay uses `response_str` + `render_fib`, single combined `mattext`
  block with `texttype="text/plain"`, NO `<respcondition>`. `itemmetadata`
  still declares `question_type=essay_question` and `points_possible=100`.
- **§4.6 / §6.1 / §4.8** not in scope for v1 (no images).

### Essay prompt template (combined `text/plain` block)

```
<question.question>

Key terms to consider: <question.keyTerms.join(", ")>

Suggested sentence starters:
- <starter 1>
- <starter 2>
- <starter n>
```

If `keyTerms` is missing or empty, the "Key terms" line is omitted. Same for
`sentenceStarters`. The `rubric` and `exemplar` fields are never included —
those are the answer key.

### XML escaping

A single `xmlEscape(str)` helper handles `&`, `<`, `>`, `"`, `'`. Applied to
every interpolated value. Tested directly and round-tripped through `DOMParser`
in `question-export-core.test.js`.

### Stable IDs

- `assessmentId` = `<unitId>-<source>` slugified (e.g. `civil-war-vocab`,
  `civil-war-fib`, `civil-war-practice`). Filename-safe (kebab, alphanumeric).
- Folder name = inner XML filename = assessment `ident` (§3 rule, §8 check #7).
- Per-question item idents: `q1`, `q2`, ... (1-based).
- Per-option label idents: `q<idx>_a<n>` (0-based option position).

---

## Validation (Section 3, approved)

A rule registry. Each rule:
```js
{ id: 'mc-has-correct',
  message: 'Multiple-choice questions need at least one correct option.',
  check(questions, opts) -> failingQuestionIds[] }
```

Runs every time the user enters Step 3, and any time selection or edits
change. UI shows a live checklist (✅ passing rules muted, ❌ failing rules
expanded with the message + count). Clicking a failing row jumps back to
Step 2 with that question highlighted (first failure scrolled into view).

The Send button reflects state:
- **All pass** → "Build .zip ▸" (enabled, primary).
- **Any fail** → "Fix N issues ▸" (enabled but ghost-styled; clicking jumps to
  the first failing rule).
- No download is ever produced from a failing state.

### V1 rules (mapped to QTI spec §8)

| ID | Maps to | Description |
|---|---|---|
| `title-present` | §8.1 | Quiz Title (opts.title) is non-empty after trim. |
| `at-least-one-selected` | (new) | ≥1 question selected. |
| `mc-has-correct` | §8.2 | Every MC question has ≥1 correct option. |
| `short-answer-has-accepted` | §8.3 | Every short_answer has ≥1 accepted answer. |
| `essay-no-scoring` | §8.4 | Essays carry no scoring data. (Defense-in-depth; the renderer enforces this, but we re-check post-build.) |
| `idents-unique-non-numeric` | §8.6 | Every response-label ident in every item is unique within that item and non-numeric. |
| `xml-well-formed` | §8.10 | Every generated XML string parses via `DOMParser`. |
| `ids-match` | §8.7 | Folder name = inner XML filename = assessment `ident`. |

Rules #6, #7, #8 run *after* `buildCanvasPackage` produces the file map (they
inspect the actual output). Rules #1–#5 run against the selection + opts before
build. The UI runs both phases; if any fails, no zip ever forms.

### Image-related rules (deferred to v2)

§8.5 (image referenced in zip + manifest), §8.8 (color word warning), §4.6 /
§4.8 (image path + cropping) all defer to v2 when images land.

---

## Wizard UI (Section 4, approved)

A 4-step wizard with a persistent left rail showing progress. Carries the
visual language from `docs/superpowers/mockups/2026-05-29-exporter-ux.html`
(Fraunces display, Inter Tight body, JetBrains Mono for data, warm-paper
neutral, hot-coral accent for destination actions).

### State machine

```js
state = {
  step: 0,  // 0 Unit | 1 Source | 2 Refine | 3 Send
  unitId: null,
  rawConfig: null,
  source: 'practice',  // 'practice' | 'vocab' | 'fib' | 'shortAnswer'
  sourceOpts: {
    vocabDirection: 'definition-term',
    includeEncounter: false,
    fibTyped: false
  },
  questions: [],       // normalized for current source
  selected: {},
  edits: {},
  destination: 'blooket',  // 'blooket' | 'gimkit' | 'canvas'
  canvasOpts: { title: '', maxAttempts: 1 }
};
```

Transitions are explicit (only rail clicks + Next/Back/destination chip move
between steps). Clicking a past step jumps back without losing selection or
edits. Forward steps are gated: Step 1 requires a unit, Step 2 requires a
source, Step 3 requires ≥1 selected question.

### Step 0 — Pick a unit

Grid of unit cards from `units.json`. Each card shows:
- A 4px theme-color stripe (using `units.json` `theme.primary`).
- Unit title + a one-line subtitle.
- Source counts on one row: `63 practice · 70 vocab · 15 FIB · 6 short answer`
  (the count for each source is computed from that unit's config; sources with
  0 are omitted).
- Last-updated stamp (from git mtime of `config.json`, or version.json date as
  a fallback).

Retired units (per `units.json`) appear in a muted "Archived" section at the
bottom. Clicking a card loads its config and advances to Step 1.

### Step 1 — Pick a source

Three (or four — see below) big source cards: Practice, Vocab, FIB, plus
shortAnswer when applicable.

- **shortAnswer card** is always rendered in Step 1 but **disabled with a
  tooltip "Essays export only to Canvas. Switch destination to Canvas."** when
  `destination !== 'canvas'`. The tooltip has an inline "Switch destination to
  Canvas" link that performs the switch in place. (No magic appearance /
  disappearance — surfaces the constraint honestly.)

The **destination chip** lives in the rail (or above the source grid),
visible from Step 1 onward, so users can change destination at any time
without jumping to Step 3.

Below the chosen source card, source-specific options appear (current
behavior preserved):
- Vocab → Direction (Definition→Term / Term→Definition) + Include encounter
  tier toggle.
- FIB → Typed answers (GiMKit only) toggle, disabled and explained when
  destination ≠ GiMKit.

Clicking a source card sets `state.source`, calls the appropriate normalizer,
and advances to Step 2.

### Step 2 — Refine selection

Today's question list, grouped by chapter, with:
- Per-chapter select toggle (existing behavior).
- Per-question checkbox + inline editor (existing behavior).
- Text filter (existing behavior).
- "Show selected only" / "Show edited only" quick filters (new, small).

The destination chip remains in the rail. Bottom of the screen: "Continue to
Send ▸" CTA (disabled if 0 selected).

### Step 3 — Send (branches by destination)

The destination determines what's on this screen.

**Blooket / GiMKit branch:** a thin panel showing filename
(e.g. `civil-war-vocab-blooket.csv`), a "Download CSV ▸" button, and any
existing source-specific notes (auto-distractor note for vocab/FIB MC).

**Canvas branch:** the settings + validation surface.
- Quiz Title input (defaults to `<unit title> — <Source label>`,
  e.g. "The Civil War Study Tool — Vocabulary"; editable).
- Max Attempts number input (defaults to 1).
- Validation checklist (live; updates as Quiz Title is typed).
- Filename preview: `<unitId>-<source>-canvas.zip`
  (e.g. `civil-war-vocab-canvas.zip`).
- Build button:
  - All pass → "Build .zip ▸" (primary).
  - Any fail → "Fix N issues ▸" (ghost; click jumps to first failure).
- After successful build: "Built ✓ — Download" affordance. The Blob URL is
  revoked when the user navigates away from Step 3.

### Rail

Persistent left rail (carries the mockup look):
- Step badges (✓ done, ring + label current, muted future).
- Destination chip (clickable, opens a small popover with Blooket / GiMKit /
  Canvas).
- "Unit: The Civil War" chip at the top, clickable to jump back to Step 0.

---

## Out of scope / non-goals (Section 5)

- **No images / maps in v1.** §4.6, §4.8 of the QTI spec defer to v2,
  alongside integration with the existing map exporter.
- **No `multiple_answer`, `true_false`, `file_upload` in v1.** Add when there's
  real source content for them.
- **No multi-assessment-per-zip.** One assessment per .zip, one .zip per
  click.
- **No saved drafts, recent exports, multi-unit dashboard.** Separate
  brainstorm once the wizard has been used with 2+ units.
- **No localStorage persistence.** Consistent with the existing exporter
  ("reset each session").
- **No essay rubric or exemplar in student-facing prompts.** Those fields stay
  internal — they're the answer key.
- **No per-question variable point values in v1.** Every question is worth
  100 internally (§4.3). The QTI spec §10 open question about non-uniform
  points defers to v2.

---

## Testing (Section 6)

### Unit tests (`question-export-core.test.js`)

Per-renderer round-trip: build the item XML, parse via a minimal regex/string
inspector built for the test file (the project has no npm dependencies and
we're not introducing `@xmldom/xmldom` just for tests). The "round-trip parse"
in the production validation rule (§3 rule #7, `xml-well-formed`) runs in the
browser via the built-in `DOMParser` and is exercised by the page's
`buildCanvasPackage` smoke test; the Node tests instead assert structure via
focused string/regex checks tight enough to catch escaping bugs (e.g. "every
`<varequal>` matches `/q\d+_a\d+/`", "exactly one `<setvar>100</setvar>` per
correct response", "no `--` outside comments"). Tests already use only
`process.exit(1)`-on-failure (no framework). Assert:
- Item has correct `<item>` `ident`, `title`, `itemmetadata`.
- MC: 4 `<response_label>`s with named string idents, exactly one
  `<respcondition>` whose `<varequal>` matches the correct ident, and a
  `<setvar>100</setvar>`.
- short_answer: N `<respcondition>` blocks (one per accepted answer), each
  with `case="No"`.
- essay: single `<mattext texttype="text/plain">` block; zero
  `<respcondition>` blocks; `question_type=essay_question` in
  `itemmetadata`.

Validation rule tests: positive + negative cases per rule. Use synthetic
questions for each failure mode (MC with zero correct, essay with bogus
respcondition, ident collision, etc.).

`buildCanvasPackage` against real `civil-war/config.json` for each source:
- 63 practice MC questions → 64 items in file map (manifest + assessment).
- 47 must-know vocab → manifest cross-refs intact.
- 15 FIB → short_answer items.
- 6 shortAnswer → essay items, prompt body contains question + keyTerms +
  sentenceStarters, contains no rubric/exemplar text.

### Golden zip fixtures

Three checked-in `.zip` files under
`study-tools/engine/tools/_canvas-fixtures/`:
- `mc.zip` — built from a known 4-question MC set, imported into Canvas
  manually once, verified to pass.
- `short-answer.zip` — built from a 2-question short-answer set, imported and
  verified.
- `essay.zip` — built from a 2-question essay set, imported and verified.

A test compares freshly-built zip contents against these goldens (string
compare per file in the zip). Any drift fails before reaching Canvas. The
goldens are deterministic because the renderers are pure and IDs are stable.

### Round-trip validator script

A small Node script `study-tools/engine/tools/validate-package.js`:
- Unzips a `.zip`.
- Runs the QTI §8 checks (every rule from the registry plus deferred image
  rules for completeness).
- Parses every XML file in the package.
- Confirms folder name = inner XML filename = assessment `ident`.
- Confirms every file in `imsmanifest.xml`'s `<resource>` exists in the zip
  and vice versa.

Used by the dev when adding a new question type or before regenerating
goldens.

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Canvas import quietly fails on an edge case we didn't anticipate | Golden zips + post-import manual verification before locking each fixture. Validation registry blocks anything that looks structurally wrong. |
| JSZip API drift across versions | Vendor a specific minified version; pin it. Document the version in a `VERSION.txt` next to `jszip.min.js`. |
| Wizard refactor breaks existing Blooket/GiMKit users mid-flight | Build wizard chrome around current behavior first; smoke-test all three CSV paths in headless Chrome before the Canvas plumbing lands. |
| Essay prompt accidentally leaks `exemplar` | The renderer never reads `q.exemplar`; renderer test asserts the rendered prompt doesn't contain the exemplar substring from a fixture. |
| XML escaping bug breaks one obscure question | `xmlEscape` is its own tested function; every interpolation site uses it; round-trip parse via `DOMParser` is part of validation rule #7. |
| Canvas updates its QTI tolerance | Goldens are versioned with a comment ("verified against Canvas as of YYYY-MM-DD"); if a future re-verification fails we know exactly what changed. |

---

## Open questions (deferred)

These are explicitly out of scope for v1; listed here so they don't get
forgotten:

1. Images / maps (QTI spec §4.6, §4.8). Will integrate with the existing
   map-exporter — likely a new "Maps" source.
2. `multiple_answer`, `true_false`, `file_upload` — drop-in additions once
   there's source content that maps to them.
3. Multi-assessment-per-zip — defer until proven painful in practice.
4. Per-question variable point values — needs a UI for editing points
   per-question; defer until requested.
5. Question groups / randomized banks (QTI `selection_ordering`) — v2.
6. Saved drafts, recent exports, multi-unit dashboard — separate brainstorm.
