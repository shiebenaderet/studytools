# Blank Map Handout — Design Spec

**Date:** 2026-05-03
**Status:** Drafted, pending user review
**Tool affected:** `study-tools/engine/tools/map-exporter.html`

## Goal

Add the ability to export a full-map PNG handout from the Map Image Exporter, with configurable overlays (fill style, labels, title, legend), suitable for printing on 8.5×11 paper in landscape mode and giving to students as an in-class reference or fillable worksheet.

The existing per-state image export (used to build digital quizzes) is unchanged.

## Use cases

1. **Quiz materials** (existing, unchanged) — per-state PNGs for Google Forms, Quizizz, printed worksheets.
2. **Paper reference handout** (new) — one full-map PNG, printed landscape, given to students for in-class work. May be partially labeled (reference) or blank with legend (fill-in).

## UI shape

The exporter gains two tabs at the top:

- **Per-state images** — exactly the existing UI; no behavioral change.
- **Full map handout** — new UI described below.

### Full map handout tab layout

```
Toolbar:  Map: [1861 ▾]   Size: [1200px ▾]   [Download PNG]

Configuration card (two columns):

  Left — controls:
    Fill style: ( ) Blank   ( ) Shaded   (•) Outlined-only
    Labels:
      [✓] State abbreviations  (1861)
          / Region names       (territorial)
      [ ] Date acquired        (territorial only — disabled for 1861)
      [✓] Title
      [✓] Color key / legend

  Right — live preview:
    Full map at scaled-down size, updates on every setting change.
    Thin dashed border shows the 8.5×11 landscape printable area.

Hint near download button: "Best printed: 8.5×11 landscape."
```

Switching the map dropdown swaps which label checkboxes apply. The "Date acquired" checkbox is disabled (greyed) when the 1861 map is selected.

## Overlay options

### 1861 Civil War map

| Option | Effect |
|--------|--------|
| Fill: Blank | All states `fill: #fff`, `stroke: #2a2a2a` 1.0px |
| Fill: Shaded | All states filled with their allegiance color (Union/Confederate/Border/Territory), `stroke: #2a2a2a` 0.8px |
| Fill: Outlined-only | All states `fill: #fff`, `stroke: <allegiance color>` 1.8px (printer-friendly, no ink fill) |
| Labels: State abbreviations | Two-letter code (VA, NY) at each state's centroid; tiny states get a leader line to whitespace |
| Title | Top-left corner over Atlantic / Canadian border: "United States in 1861" |
| Legend | Bottom-right corner over Gulf of Mexico: 4 swatches — Union, Confederate, Border, Territory |

### Territorial expansion map

| Option | Effect |
|--------|--------|
| Fill: Blank | All regions `fill: #fff`, `stroke: #2a2a2a` 1.0px |
| Fill: Shaded | All regions filled with their assigned `color`, `stroke: #2a2a2a` 0.8px |
| Fill: Outlined-only | All regions `fill: #fff`, `stroke: <region color>` 1.8px |
| Labels: Region names | Full region name at centroid (e.g., "Louisiana Purchase") |
| Labels: Date acquired | Year on its own line under the name (e.g., "1803"); standalone if "Region names" is off |
| Title | Top-right corner over Atlantic east of 13 Colonies: "Territorial Expansion of the United States" |
| Legend | Bottom-right corner over Mexico: 8 swatches, one per acquisition (with year if "Date acquired" is on) |

### Control interactions

- Fill style is mutually exclusive (radio).
- All other overlays are independent checkboxes.
- "Date acquired" is disabled when 1861 is the active map.
- Any combination of label checkboxes is valid (e.g., "Region names off, Date on" → just years on the territorial map).

## Rendering: layered SVG

ViewBox stays at 900×700 (landscape, aspect 1.286, near-perfect for letter-landscape's 1.294). Title and legend are drawn **over** the map in natural empty space (oceans, Mexico) rather than as separate bands above/below — this preserves the landscape aspect and maximizes the map's footprint on the printed page.

```
Layer 1 — Background (always)
  All region paths in chosen fill style.

Layer 2 — Labels (if any label checkbox is on)
  Centroid placement using getBBox() of each path.
  Tiny shapes (Rhode Island, Delaware, Connecticut) get a leader line
  out to whitespace and the label is placed there.
  Per-region labelOffset {x, y} from data file applied if present.
  Auto-sized text scaled to the bbox of the region (with min/max bounds).

Layer 3 — Title (if checkbox on)
  Top-left or top-right corner over empty space:
    1861         → top-left over Canadian border / upper Atlantic
    territorial  → top-right over the empty area east of the 13 Colonies
                   (Atlantic) — Oregon already occupies the top-left.
  White rectangle with thin border behind text so it reads cleanly
  even when overlapping a path edge.

Layer 4 — Color key / legend (if checkbox on)
  Bottom-right corner:
    1861         → over Gulf of Mexico / Atlantic
    territorial  → over Mexico
  Vertical stack of swatches (each: small color square + label text).
  Same white-box-with-border treatment as title.
```

Each `build*Layer` function returns a `<g>` element. They're appended in order to a fresh `<svg>` in `buildHandoutSVG(state)`. The render is pure: same state in → same SVG out, no dirty-tracking.

### Print-friendliness notes

- **Outlined-only mode** uses zero ink fill — kindest on school printer toner.
- **All text is real SVG `<text>`** — rasterizes crisp at any output size.
- **Recommended export size for printing: 2000px** wide (~180 DPI on landscape letter — print-quality without absurd file size). The toolbar default stays at 1200px for the live preview but the dropdown goes up to 2000px.

## File structure

```
study-tools/engine/tools/
├── map-exporter.html              gains tabs + handout tab UI; existing
│                                  per-state code unchanged
├── map-exporter-territorial.js    gains yearAcquired and labelOffset on
│                                  each region
└── map-handout.js                 NEW: handout tab logic only
```

`map-handout.js` is loaded by `map-exporter.html` alongside the existing scripts. The shared helpers (`MAP_1861_REGIONS`, `TERRITORIAL_REGIONS`, `svgToPNG`, `allegianceColor`) are exposed at the window scope so the handout module can use them without duplication. Existing helpers stay where they are; we just don't inline-scope them inside the per-state IIFE.

The existing `getRegions()` function in map-exporter.html is split into:

- `getRegionsForExport(mapKey)` — returns the shape today's per-state code expects (id, name, paths, color). Behavior unchanged.
- `getRegionsForHandout(mapKey)` — returns paths + the new metadata (abbr, yearAcquired, labelOffset, isTiny, allegiance).

Splitting (rather than generalizing) ensures the per-state tab can't be broken by handout work.

## Data additions

Both data files gain optional fields. Older code paths ignore them — backwards compatible.

```js
// map-1861-data.js — each region gains:
{
  // ...existing fields (id, name, paths, allegiance)...
  abbr: "VA",                    // required for new feature
  labelOffset: { x: 0, y: 0 },   // optional, default {0,0}
  isTiny: false,                 // optional, true → forces leader-line label
}

// map-exporter-territorial.js — each region gains:
{
  // ...existing fields (id, name, color, path)...
  yearAcquired: "1803",          // required for new feature; string
  labelOffset: { x: 0, y: 0 },   // optional
}
```

The `abbr` field for 1861 is the standard USPS two-letter code. For territories that don't have a USPS code (e.g., "New Mexico Territory"), use a sensible short form ("NMT") or skip the abbr label feature for those regions (the data has many full-name territories where the user would likely choose "Region names" instead anyway).

## Handout tab state

```js
const handoutState = {
  mapKey:     'map1861',     // 'map1861' | 'territorial'
  fillStyle:  'outlined',    // 'blank' | 'shaded' | 'outlined'
  labels:     true,          // shows abbr (1861) or name (territorial)
  showDate:   false,         // territorial only; UI-disabled for 1861
  showTitle:  true,
  showLegend: true,
  size:       1200,          // export width in px
};
```

Any state change re-runs `buildHandoutSVG(handoutState)` and replaces the preview pane's contents. Download serializes the current SVG to PNG via the existing `svgToPNG` helper.

## Out of scope

The following are intentionally not part of this work:

- PDF export (PNG only — students/teachers print the PNG from the browser).
- Multi-page worksheets, answer keys, or quiz-question generation.
- Custom legend ordering or color picking.
- Editable post-export annotation (the SVG is rasterized to PNG; teachers wanting to edit further use Preview/Word).
- Linking the tool from main site nav (stays unlinked, teacher-only).
- The 1861 map's existing per-state grid behavior — completely untouched.

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Centroid label placement is bad for stretched shapes (Florida, Maryland, Louisiana) | Per-region `labelOffset` field in data lets us nudge specific labels by hand. Cost is small (a few entries per map). |
| Tiny states overflow with abbreviation labels | Leader-line fallback for `isTiny: true` regions. Threshold can also be auto-detected by bbox width. |
| Title/legend boxes overlap a region path | White rectangle background with thin border on each — readable regardless of overlap. |
| Splitting `getRegions()` introduces a regression in the per-state tab | Per-state tab continues to call the unchanged `getRegionsForExport()`. The new `getRegionsForHandout()` is only called by the new tab. No shared mutation. |
| Adding fields to data files breaks unit code that consumes them | Both data files are only read by the exporter tool and (for `MAP_1861_REGIONS`) the `map-quiz` activity, which iterates known fields. Unknown fields are ignored. Verified by reading `map-quiz.js` consumers. |

## Acceptance criteria

1. Existing per-state tab works exactly as before — no visual or behavioral change.
2. Full map handout tab renders a live preview that updates instantly on any control change.
3. Download PNG produces a file that, when printed on 8.5×11 landscape, fills the printable area and is legible.
4. All listed overlay combinations work and produce valid output.
5. Disabled controls (e.g., "Date acquired" with 1861 selected) are visibly greyed and don't affect output.
6. The version in `study-tools/engine/version.json` is bumped on release.
