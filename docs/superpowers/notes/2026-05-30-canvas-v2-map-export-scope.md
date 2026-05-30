# Canvas QTI Exporter v2 — Map Region-ID export (scope notes)

**Date:** 2026-05-30
**Status:** Scope settled, brainstorm/spec/plan pending. Pick up here next session.
**Builds on:** v1 design `docs/superpowers/specs/2026-05-29-canvas-exporter-design.md` and implementation `docs/superpowers/plans/2026-05-30-canvas-exporter-wizard.md` (shipped, version 8.45.0).

## Why this document exists

After v1 shipped (Canvas QTI export with multiple_choice / short_answer / essay), we discussed image-backed Canvas questions sourced from the existing map data. v1 deferred this per QTI spec §4.6 and §4.8. We locked the high-level shape in conversation but stopped short of a full brainstorm so context could stay fresh for a future dedicated session. These are the decisions already settled — the next session's brainstorm starts from here, not from scratch.

## Settled decisions

### Scope of v2

- **Source coverage:** all three maps currently in `study-tools/engine/tools/map-exporter.html` — 1861 Civil War (42 states/territories), Territorial Expansion (8 regions), 50 US States.
- **Question type (one only):** "Which region is highlighted on the map below?" — multiple_choice with 4 options (correct region + 3 same-map distractors).
- **Allegiance and other question types** (e.g. "Which side did this state fight for?" using the Union/Confederate/Border/Territory data already in `map-1861-data.js`) **defer to v2.1** if real-classroom use shows the need. Adding multiple question types per map needs a per-map question-type picker, which is more UI than v2 should carry.

### UI integration (extends the v1 wizard)

- **New source card in Step 1:** "Map regions". Visible only when destination = Canvas (same gating pattern as the short-answer essays card from v1; greyed with tooltip otherwise).
- **Source-specific control:** a dropdown to pick which of the 3 maps (1861 / Territorial / 50 States).
- **Step 2 (Refine):** checklist of regions for the selected map, grouped naturally (Union / Confederate / Border / Territory for 1861; the 8 territorial regions; the 50 states alphabetically or by region). Per-group + individual toggles + filter — same affordances as today's chapter toggles.
- **Step 3 (Send):** same Canvas panel as v1 — Quiz Title, Max Attempts, validation, Build .zip.

### Build pipeline (at click time)

- **On-demand PNG generation:** when the user clicks Build .zip, the page renders each selected region's PNG via the existing map-exporter rendering code, factored into a shared module both tools call.
- **Per-region image processing per QTI §4.8:** auto-crop to bounding box of non-white pixels, pad ~5–10%, re-encode as PNG, write into `<assessmentId>/images/<region-slug>.png`.
- **Manifest:** one `<file href="<assessmentId>/images/<slug>.png"/>` per image, per QTI §4.6.
- **Item prompt:** uses the escaped `<img src="%24IMS-CC-FILEBASE%24/<assessmentId>/images/<slug>.png">` form per §4.6, wrapped in `<mattext texttype="text/html">`. Color-neutral wording per §4.7 ("Which region is highlighted on the map below?" — never "the area shaded in red", because the export shifts highlight color).
- **4 options:** correct region name + 3 distractors picked from the same map's region list via the existing `QExport.pickDistractors` from the v1 core. No cross-map distractors.
- **Rationale for on-demand vs. pre-cached:** keeps the no-build / static-site posture; avoids ~MB of binary churn in the repo; a few seconds of "Building..." for a typical 10-state quiz is acceptable.

## What this means for the architecture

Most of v2 is **extension** of seams v1 already built. The work concentrates in three places:

### 1. New shared SVG→PNG renderer module
- Factor out the map-exporter's existing rendering pipeline (`map-exporter-territorial.js`, the per-state rendering in `map-exporter.html`) into a shared module the Canvas exporter can call too.
- Public API roughly: `renderRegionPng({ mapId, regionId, options }) -> Promise<Blob>`.
- Both tools (map-exporter + question-exporter Canvas v2) consume it.

### 2. New normalizer and source for "map"
- `normalizeMapRegionId({ mapId, regionIds }) -> canonical[]` produces canonical questions with `question="Which region is highlighted on the map below?"`, `_image: { mapId, regionId }`, `options=[correctName, ...3 distractors]`, `correctIndex=0` (or whatever post-shuffle index).
- The `_image` payload signals to `renderMCItem` (or a new `renderImageMCItem`) that it needs to (a) render the PNG into the file map and (b) emit the escaped `<img>` HTML in the prompt.

### 3. Extended renderer + buildCanvasPackage
- Either extend `renderMCItem` to handle an optional `_image` field, or add a new `renderImageMCItem` that the source-to-renderer picker routes to. The latter is cleaner because the prompt mattext switches from `text/plain` to `text/html`.
- `buildCanvasPackage` becomes async (returns `Promise<{ assessmentId, fileMap }>`) because image rendering is async. fileMap values gain Blob support alongside strings (the existing zip wrapper already handles both).
- New manifest builder variant that lists every image file under the assessment resource.

### 4. New validation rules
- `image-present`: every `_image`-bearing question successfully rendered a PNG into the file map.
- `image-referenced`: every image file in the file map has a corresponding `<file>` entry in the manifest.
- `prompt-color-neutral` (warn, don't fail): scan prompts for color words ("red", "blue", "shaded"). Per §4.7.
- Image preprocessing parameter (crop padding %) exposed per QTI §4.8.

## Golden fixture for v2

Same pattern as v1: build a 4-question 1861 region-ID quiz from the wizard, save as `_canvas-fixtures/map-mc.zip`, manually verify in Canvas (image renders, correct answer scores), commit with README updated. The v1 fixtures stay unchanged.

## Out of scope for v2

- **Allegiance and acquisition-year question types.** Defer to v2.1.
- **Interactive click-on-map selection UI** in Step 2. Defer to v2.1; checklist-grouped-by-map is enough for the first cut.
- **Per-region thumbnails next to checklist rows.** Nice but not necessary; defer.
- **Image preprocessing as a user-visible parameter.** Use the spec's recommended ~8% padding default; expose later if needed.
- **Cross-source distractors** (e.g. mixing region names from different maps as wrong answers). Less plausible distractors; keep distractor pools per-map.

## When this picks up

Next session opener: *"Let's do Canvas map v2."* I read this file, propose 2-3 architectural approaches for the SVG→PNG shared module (since map-exporter today wasn't designed to be embedded — that's the one real unknown), and we proceed through the normal brainstorm → spec → plan → subagent build cycle from there.

The decisions in this doc do not need to be re-litigated unless real-classroom use of v1 surfaces something we did not anticipate.
