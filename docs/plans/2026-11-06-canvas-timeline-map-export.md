# Canvas Export for Timelines and Maps

**Date:** 2026-11-06
**Request:** Add Canvas (QTI) export for the timeline and the maps to the Question Exporter. Short answer is already there (shipped as "Short-answer essays").

## Findings

- `engine/tools/question-exporter.html` has four sources: Practice, Vocabulary, Fill-in-the-blank, Short-answer essays. Canvas output comes from `question-export-core.js` (`buildCanvasPackage`), which currently writes text-only XML. It has no way to put an image in a question.
- **Timeline:** every unit has `timelineEvents` (`title`, `year`, `description`). Revolution 17, Early Republic 10, Westward 16, Civil War 19. Years are display strings ("Feb 1763", "1828-1833"), so they need a sort key parsed from the text. Civil War repeats 1861, 1863 and 1865, so wrong answers and ordering pairs must skip events from the same year.
- **Maps:** `engine/tools/map-exporter.html` already draws PNGs for four region maps: 1861 Civil War (42), Territorial Expansion (8), 50 States (50), 13 Colonies (13). Its drawing code lives inside the page, so the Question Exporter can't call it yet.
- Point-and-label maps (Civil War battles, Colonial Geography cities and rivers, Underground Railroad, Colonial Regions) are not region shapes in the exporter. They are left out of this pass.
- The QTI rules that Canvas has accepted in real imports: multiple choice, image multiple choice (map), and essay. Matching and ordering have **not** been tested in a real import.

## Proposed Changes

| # | Change | Why | Size |
|---|---|---|---|
| 1 | Add a **Timeline** source card. Each event becomes "When did this happen? *Stamp Act*" with 4 year choices (wrong answers are other events' years, never the same year). | Uses the multiple-choice format Canvas already accepts, and works for Blooket/GiMKit CSV too. | S |
| 2 | Optional second timeline style: "Which happened first?" with 4 events as choices (Canvas only, or CSV too). | Tests order, which is what the timeline game teaches. Still multiple choice. | S |
| 3 | Optional third style: one **matching** question per quiz (events on the left, years in a dropdown). | Closest to the timeline game, but it's a format we haven't tested in Canvas. Needs one test import. | M |
| 4 | Move the map drawing code out of `map-exporter.html` into a shared `map-render.js`, used by both tools. Map Exporter output stays the same. | The Question Exporter can't make map images without it. | M |
| 5 | Add a **Map Regions** source card (Canvas only): pick the map, then check regions grouped the way the map groups them. Each region becomes "Which region is highlighted on the map below?" with the image and 4 choices from the same map. | The format follows the scope notes from 2026-05-30 and the verified map-quiz format. | M |
| 6 | Let `buildCanvasPackage` add images: cropped PNGs in `<id>/images/`, each listed in the manifest, with the escaped `<img>` and `%24IMS-CC-FILEBASE%24` path. New checks: every image exists, every image is in the manifest, and no color words in prompts. | Canvas drops images that don't follow these rules. | M |
| 7 | Tests in `question-export-core.test.js`, a fixture `_canvas-fixtures/map-mc.zip`, plus README, TEACHER-GUIDE and CHANGELOG updates and a version bump on each commit. | Repo rules. | S |

## Decisions for the Teacher

1. Which timeline question styles (1, 2, 3)?
2. Should timeline questions export to Blooket/GiMKit too, or Canvas only?
3. Should the maps include all four region maps, and are the point maps (battles, cities, rivers) needed now or later?
4. Should the map answer choices be 4 options (the default) or a different number?

## Teacher Answers (2026-11-06)

- Timeline: build "When did it happen?" (item 1). Skip "Which happened first?" (item 2) and matching (item 3) for now.
- Timeline exports to Canvas **and** Blooket/GiMKit CSV.
- Maps: all four region maps. Point maps come later.
- Open: he asked about a drag-in-order question. Classic Quizzes has none. New Quizzes has an Ordering type, but no Canvas-accepted QTI pattern for it is on file. Next step is for him to make one Ordering question in New Quizzes, export it as QTI, and share the zip so the format can be copied from a known-good export.

## After Deploy

- Import one timeline .zip and one map .zip into a sandbox Canvas course. Check that the images show and that the right answer scores. Then commit the map zip as the golden fixture.
