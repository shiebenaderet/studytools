# Blank Map Handout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Full map handout" tab to the existing Map Image Exporter that produces a configurable, landscape-printable PNG of either the 1861 Civil War map or the territorial expansion map.

**Architecture:** Add a tab system to `map-exporter.html` — the existing per-state UI becomes Tab 1, a new full-map UI becomes Tab 2. A new `map-handout.js` module handles all handout-tab logic. Render output is a layered SVG built bottom-to-top (background → labels → title → legend), serialized to PNG using the existing `svgToPNG` helper. Maintains the same 900×700 viewBox so output prints cleanly on landscape letter paper.

**Tech Stack:** Vanilla HTML/CSS/JavaScript. No build step. No package manager. No test runner. Verification is visual: load page in a browser, interact with controls, inspect preview, download PNG, open it.

**Spec:** `docs/superpowers/specs/2026-05-03-blank-map-template-design.md`

---

## How verification works in this codebase

This project has **no automated test runner**. Every "verify" step in this plan is a manual browser check:

1. Open `study-tools/engine/tools/map-exporter.html` in a browser by double-clicking it (or running `open study-tools/engine/tools/map-exporter.html` from the repo root on macOS).
2. Open the browser DevTools console (Cmd-Option-J on Chrome). The page should load with **zero red errors**.
3. Interact with the UI as the step describes.
4. Inspect the rendered preview / downloaded PNG against the expected output described in the step.

When a step says "Run: ... / Expected: ..." it means do that interaction and compare to that expected outcome. There is no `npm test`. There is no `pytest`. The browser is the test runner.

---

## File map

| File | Responsibility | Status |
|------|----------------|--------|
| `study-tools/engine/tools/map-exporter.html` | Hosts the tabbed UI; per-state tab is unchanged behaviorally | Modify |
| `study-tools/engine/tools/map-handout.js` | All handout-tab logic: state, render pipeline, layer builders, event wiring | **Create** |
| `study-tools/engine/tools/map-exporter-territorial.js` | Source of `window.TERRITORIAL_REGIONS`; gains `yearAcquired` and `labelOffset` per region | Modify |
| `study-tools/engine/js/data/map-1861-data.js` | Source of `window.MAP_1861_REGIONS`; gains `abbr`, optional `labelOffset`, optional `isTiny` per region | Modify |
| `study-tools/engine/version.json` | Version bump | Modify (last task) |

---

## Task 1: Add tab UI scaffolding to map-exporter.html

This task introduces the tab structure but does not yet add any handout content. The Per-state tab keeps everything that's there today; the Full map handout tab is empty (a placeholder paragraph). This isolates the structural change from the feature work.

**Files:**
- Modify: `study-tools/engine/tools/map-exporter.html`

- [ ] **Step 1: Add CSS for tabs**

In `map-exporter.html`, inside the `<style>` block (before the closing `</style>` near line 136), append:

```css
.tabs {
    display: flex;
    gap: 4px;
    border-bottom: 2px solid #d0c8b6;
    margin-bottom: 20px;
}
.tab-btn {
    padding: 10px 18px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.95em;
    color: var(--muted);
}
.tab-btn.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
    font-weight: 600;
}
.tab-panel { display: none; }
.tab-panel.active { display: block; }
```

- [ ] **Step 2: Wrap existing UI in a tab panel and add the second tab panel**

Find the lines after the `<div class="sub">` (around line 141) and before the existing `<div class="toolbar">`. Insert the tab buttons. Then wrap the existing toolbar, preview-pair, hr, and grid (everything from the `<div class="toolbar">` through the closing `</div>` of `<div class="grid" id="grid">`) inside a `<div class="tab-panel active" id="tab-perstate">`. After that closing div, add a second tab panel for handout.

The structure after this change should look like:

```html
<h1>Map Image Exporter</h1>
<div class="sub">Export individual states/territories as PNG images for quizzes and worksheets.</div>

<div class="tabs">
  <button class="tab-btn active" data-tab="perstate">Per-state images</button>
  <button class="tab-btn" data-tab="handout">Full map handout</button>
</div>

<div class="tab-panel active" id="tab-perstate">
  <!-- ALL existing toolbar / preview-pair / hr / grid markup goes here, unchanged -->
</div>

<div class="tab-panel" id="tab-handout">
  <p style="color: var(--muted); padding: 20px;">Coming soon (Task 2).</p>
</div>
```

Do not change any of the markup inside `#tab-perstate` — only wrap it.

- [ ] **Step 3: Add tab-switching JavaScript**

Inside the existing `<script>` block, just before `window.addEventListener('load', rerender);` (near line 465), add:

```javascript
// ── Tab switching ──────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetTab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tab-panel').forEach(p => {
      p.classList.toggle('active', p.id === `tab-${targetTab}`);
    });
  });
});
```

- [ ] **Step 4: Verify**

1. Open `study-tools/engine/tools/map-exporter.html` in a browser.
2. Expected: page loads with zero console errors. Two tabs visible at top: "Per-state images" (active, accent color) and "Full map handout".
3. Click "Per-state images" tab. Expected: the existing UI shows — toolbar, style preview pair, "All regions" grid populated. Behaves exactly as before.
4. Click "Full map handout" tab. Expected: previous content disappears; only the placeholder text "Coming soon (Task 2)." is shown.
5. Click back to "Per-state images". Expected: existing UI returns and still works (try changing the Map dropdown — preview should re-render).

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/tools/map-exporter.html
git commit -m "feat(map-exporter): add tab scaffolding for handout feature"
```

---

## Task 2: Add `abbr` field to all 1861 regions

The handout's "State abbreviations" label option needs a 2-letter code per region. We add this data field first so all later rendering work can rely on it. This is a pure data change — no logic touched.

**Files:**
- Modify: `study-tools/engine/js/data/map-1861-data.js`

The 42 regions and their abbreviations:

| id | abbr | id | abbr |
|---|---|---|---|
| washington-territory | WT | dakota-territory | DT |
| nebraska-territory | NT | colorado-territory | CT* |
| utah-territory | UT | nevada-territory | NV |
| new-mexico-territory | NM | indian-territory | IT |
| maine | ME | new-hampshire | NH |
| vermont | VT | massachusetts | MA |
| rhode-island | RI | connecticut | CN* |
| new-york | NY | new-jersey | NJ |
| pennsylvania | PA | delaware | DE |
| maryland | MD | virginia | VA |
| north-carolina | NC | south-carolina | SC |
| georgia | GA | florida | FL |
| ohio | OH | indiana | IN |
| illinois | IL | michigan | MI |
| wisconsin | WI | minnesota | MN |
| iowa | IA | missouri | MO |
| kentucky | KY | tennessee | TN |
| alabama | AL | mississippi | MS |
| arkansas | AR | louisiana | LA |
| texas | TX | oregon | OR |
| california | CA | kansas | KS |
| west-virginia | WV | (none — not formed until 1863) |

*Note: CT for Connecticut conflicts with the Connecticut state's modern USPS code. To avoid confusion with "Colorado Territory" we use **CN** for Connecticut and **CT** for Colorado Territory in this map. Document this choice inline.

(West Virginia did not exist in 1861 — it was carved out of Virginia in 1863. If the data file does not contain a `west-virginia` region, skip that row; if it does, the abbr is WV.)

- [ ] **Step 1: Verify which regions exist in the data file**

Run from the repo root:

```bash
grep -E "id: '" study-tools/engine/js/data/map-1861-data.js | sed -E "s/.*id: '([^']+)'.*/\1/" | sort
```

Expected: prints exactly 42 ids. Use the output to confirm the table above matches reality.

- [ ] **Step 2: Add an `abbr` field to each region object**

For each of the 42 regions in `study-tools/engine/js/data/map-1861-data.js`, add an `abbr: 'XX'` field on the same object literal, on the same logical line as `allegiance: '...'`. Pattern:

```javascript
// Before:
{ id: 'virginia', name: 'Virginia', status: 'state', year: 1788, capital: 'Richmond', allegiance: 'confederate',
      paths: ['M ...'] },

// After:
{ id: 'virginia', name: 'Virginia', status: 'state', year: 1788, capital: 'Richmond', allegiance: 'confederate', abbr: 'VA',
      paths: ['M ...'] },
```

Apply this to all 42 regions using the table above. Add `abbr` immediately after `allegiance` and before `paths`. Note the Connecticut/Colorado Territory choice (`CN` and `CT`) — add a `// Note: CT = Colorado Territory; Connecticut uses CN to avoid clash` comment near the colorado-territory entry.

- [ ] **Step 3: Verify the change**

Run:

```bash
grep -c "abbr: '" study-tools/engine/js/data/map-1861-data.js
```

Expected output: `42`.

Then open the map-exporter.html page and click around the Per-state tab. Expected: the existing exporter still works exactly as before — adding new fields hasn't broken anything (the existing code accesses fields by name, never via `for...in`).

Also open the live engine site (`study-tools/engine/index.html`) → westward expansion unit → 1861 map quiz, if it's loaded. Click around. Expected: tooltips, fills, and quiz behavior unchanged. (`map-quiz.js` reads `allegiance`, `year`, `capital`, `status`, `name`, `paths`, `id` — `abbr` is invisible to it.)

- [ ] **Step 4: Commit**

```bash
git add study-tools/engine/js/data/map-1861-data.js
git commit -m "data(map-1861): add 2-letter abbreviation to each region"
```

---

## Task 3: Add `yearAcquired` to territorial regions

Same idea, smaller scale — 8 regions only.

**Files:**
- Modify: `study-tools/engine/tools/map-exporter-territorial.js`

The 8 regions and their acquisition years (already implied by the names):

| id | yearAcquired |
|---|---|
| thirteen-colonies | 1776 |
| treaty-of-paris | 1783 |
| louisiana-purchase | 1803 |
| florida | 1819 |
| texas | 1845 |
| oregon | 1846 |
| mexican-cession | 1848 |
| gadsden | 1853 |

- [ ] **Step 1: Add `yearAcquired` to each region object**

In `study-tools/engine/tools/map-exporter-territorial.js`, add a `yearAcquired` field on each of the 8 region objects, between the `color: '...'` and `path: '...'` fields. Pattern:

```javascript
// Before:
{ id: 'louisiana-purchase', name: 'Louisiana Purchase 1803', color: '#B5651D',
  path: 'M203.47,81.61L...' },

// After:
{ id: 'louisiana-purchase', name: 'Louisiana Purchase 1803', color: '#B5651D', yearAcquired: '1803',
  path: 'M203.47,81.61L...' },
```

Use the table above for the year strings. Keep them as strings (not numbers) so they can be rendered directly in SVG `<text>` without coercion.

- [ ] **Step 2: Verify**

Run:

```bash
grep -c "yearAcquired:" study-tools/engine/tools/map-exporter-territorial.js
```

Expected: `8`.

Open `map-exporter.html`. Switch the Map dropdown to "Territorial Expansion (8 regions)". Expected: existing per-state tab still renders all 8 regions correctly. No console errors.

- [ ] **Step 3: Commit**

```bash
git add study-tools/engine/tools/map-exporter-territorial.js
git commit -m "data(map-territorial): add yearAcquired to each region"
```

---

## Task 4: Create map-handout.js with handout state and the empty render pipeline

Wire up the script file, define state, and stub out the render functions so the page loads cleanly. Subsequent tasks fill in each layer.

**Files:**
- Create: `study-tools/engine/tools/map-handout.js`
- Modify: `study-tools/engine/tools/map-exporter.html`

- [ ] **Step 1: Create `map-handout.js` with the skeleton**

Create a new file at `study-tools/engine/tools/map-handout.js`:

```javascript
// study-tools/engine/tools/map-handout.js
// Logic for the "Full map handout" tab in map-exporter.html.
// Builds a layered SVG (background, labels, title, legend) and exports as PNG.

(function() {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const VIEWBOX = { w: 900, h: 700 };

  const ALLEGIANCE_COLORS = {
    union:       '#3b6cb3',
    confederate: '#a83232',
    border:      '#a37a30',
    territory:   '#7a8a7a',
  };
  const ALLEGIANCE_LABELS = {
    union:       'Union',
    confederate: 'Confederate',
    border:      'Border',
    territory:   'Territory',
  };

  const handoutState = {
    mapKey:     'map1861',
    fillStyle:  'outlined',  // 'blank' | 'shaded' | 'outlined'
    labels:     true,
    showDate:   false,
    showTitle:  true,
    showLegend: true,
    size:       1200,
  };

  // ── Region access ──────────────────────────────────────────
  function getRegionsForHandout(mapKey) {
    if (mapKey === 'map1861') {
      return window.MAP_1861_REGIONS.map(r => ({
        id:           r.id,
        name:         r.name,
        paths:        r.paths,
        allegiance:   r.allegiance,
        abbr:         r.abbr,
        labelOffset:  r.labelOffset || { x: 0, y: 0 },
        isTiny:       r.isTiny || false,
      }));
    }
    return window.TERRITORIAL_REGIONS.map(r => ({
      id:           r.id,
      name:         r.name,
      paths:        [r.path],
      color:        r.color,
      yearAcquired: r.yearAcquired,
      labelOffset:  r.labelOffset || { x: 0, y: 0 },
    }));
  }

  // ── Layer builders (stubbed; filled in later tasks) ────────
  function buildBackgroundLayer(regions, mapKey, fillStyle) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('data-layer', 'background');
    // Filled in Task 5
    return g;
  }

  function buildLabelsLayer(regions, mapKey, opts) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('data-layer', 'labels');
    // Filled in Task 7
    return g;
  }

  function buildTitleLayer(mapKey) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('data-layer', 'title');
    // Filled in Task 8
    return g;
  }

  function buildLegendLayer(regions, mapKey, opts) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('data-layer', 'legend');
    // Filled in Task 9
    return g;
  }

  // ── Top-level builder ──────────────────────────────────────
  function buildHandoutSVG(state) {
    const regions = getRegionsForHandout(state.mapKey);
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('xmlns', SVG_NS);
    svg.setAttribute('viewBox', `0 0 ${VIEWBOX.w} ${VIEWBOX.h}`);
    svg.appendChild(buildBackgroundLayer(regions, state.mapKey, state.fillStyle));
    if (state.labels)     svg.appendChild(buildLabelsLayer(regions, state.mapKey, { showDate: state.showDate }));
    if (state.showTitle)  svg.appendChild(buildTitleLayer(state.mapKey));
    if (state.showLegend) svg.appendChild(buildLegendLayer(regions, state.mapKey, { showDate: state.showDate }));
    return svg;
  }

  // Expose for use by inline page script (UI wiring in later tasks).
  window.MapHandout = {
    state:           handoutState,
    buildHandoutSVG: buildHandoutSVG,
  };
})();
```

- [ ] **Step 2: Load the new script in map-exporter.html**

In `map-exporter.html`, find the `<script src="map-exporter-territorial.js"></script>` line (around line 189). Add the new script tag immediately after:

```html
<!-- Embed territorial expansion regions inline (extracted from map-quiz.js). -->
<script src="map-exporter-territorial.js"></script>

<!-- Handout-tab logic. -->
<script src="map-handout.js"></script>
```

- [ ] **Step 3: Verify the page still loads**

Open `map-exporter.html` in a browser. Expected:
- No console errors.
- Per-state tab works exactly as before.
- `window.MapHandout` exists in the console (type `window.MapHandout` and Enter — should print an object with `state` and `buildHandoutSVG`).
- Type `window.MapHandout.buildHandoutSVG(window.MapHandout.state)` in the console. Expected: returns an `<svg>` DOM element with one empty `<g data-layer="background">` child (no errors thrown).

- [ ] **Step 4: Commit**

```bash
git add study-tools/engine/tools/map-handout.js study-tools/engine/tools/map-exporter.html
git commit -m "feat(handout): scaffold map-handout.js module and load it"
```

---

## Task 5: Implement the Background layer

This is the only layer needed to produce a recognizable map (just shapes, no labels/title/legend). Implementing it first means we can verify the rest of the pipeline visually as soon as the UI exists.

**Files:**
- Modify: `study-tools/engine/tools/map-handout.js`

- [ ] **Step 1: Replace the `buildBackgroundLayer` stub with the real implementation**

In `map-handout.js`, replace the entire `buildBackgroundLayer` function with:

```javascript
function buildBackgroundLayer(regions, mapKey, fillStyle) {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('data-layer', 'background');

  for (const r of regions) {
    const regionColor = mapKey === 'map1861'
      ? ALLEGIANCE_COLORS[r.allegiance]
      : r.color;

    let fill, stroke, strokeWidth;
    switch (fillStyle) {
      case 'blank':
        fill = '#ffffff'; stroke = '#2a2a2a'; strokeWidth = 1.0;
        break;
      case 'shaded':
        fill = regionColor; stroke = '#2a2a2a'; strokeWidth = 0.8;
        break;
      case 'outlined':
      default:
        fill = '#ffffff'; stroke = regionColor; strokeWidth = 1.8;
        break;
    }

    for (const d of r.paths) {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('fill', fill);
      p.setAttribute('stroke', stroke);
      p.setAttribute('stroke-width', String(strokeWidth));
      p.setAttribute('stroke-linejoin', 'round');
      g.appendChild(p);
    }
  }
  return g;
}
```

- [ ] **Step 2: Verify in the console**

Open `map-exporter.html`. In the browser console:

```javascript
const svg = window.MapHandout.buildHandoutSVG(window.MapHandout.state);
document.body.appendChild(svg);
svg.style.cssText = 'position:fixed;top:10px;right:10px;width:400px;height:auto;background:#fff;border:1px solid #888;z-index:9999;';
```

Expected: a small thumbnail of the 1861 map appears in the top-right corner of the page, showing all states with white fill and colored outlines (because `fillStyle` defaults to `'outlined'` and `mapKey` defaults to `'map1861'`).

Then test the other two fill styles:

```javascript
window.MapHandout.state.fillStyle = 'shaded';
svg.replaceWith(window.MapHandout.buildHandoutSVG(window.MapHandout.state));
```

Refresh and try `'blank'` similarly. Verify three distinct visual results.

Now switch maps:

```javascript
window.MapHandout.state.mapKey = 'territorial';
window.MapHandout.state.fillStyle = 'shaded';
const svg2 = window.MapHandout.buildHandoutSVG(window.MapHandout.state);
document.body.appendChild(svg2);
svg2.style.cssText = 'position:fixed;top:10px;left:10px;width:400px;height:auto;background:#fff;border:1px solid #888;z-index:9999;';
```

Expected: the 8-region territorial map shows in shaded mode with the brown/tan/red palette from the data.

- [ ] **Step 3: Commit**

```bash
git add study-tools/engine/tools/map-handout.js
git commit -m "feat(handout): implement background layer with three fill styles"
```

---

## Task 6: Build the handout tab UI and wire up the live preview

The Background layer alone is enough to show a meaningful preview. We build the full tab UI now — radio + checkboxes + size + download — wired to call `buildHandoutSVG()` on every change. Labels, title, and legend will activate as their layers are filled in by later tasks.

**Files:**
- Modify: `study-tools/engine/tools/map-exporter.html`

- [ ] **Step 1: Add CSS for the handout tab layout**

In the `<style>` block of `map-exporter.html`, append:

```css
.handout-layout {
    display: grid;
    grid-template-columns: minmax(280px, 360px) 1fr;
    gap: 20px;
    background: var(--card);
    padding: 16px;
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,.06);
}
.handout-controls fieldset {
    border: 1px solid #e0d8c4;
    border-radius: 8px;
    padding: 10px 14px;
    margin: 0 0 14px 0;
}
.handout-controls legend {
    padding: 0 6px;
    font-size: 0.85em;
    color: var(--muted);
}
.handout-controls label.row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    font-size: 0.9em;
    cursor: pointer;
}
.handout-controls label.row.disabled {
    opacity: 0.45;
    cursor: not-allowed;
}
.handout-preview-wrap {
    background: #fff;
    border: 1px dashed #b8ad94;
    border-radius: 6px;
    padding: 10px;
    align-self: start;
}
.handout-preview-wrap svg {
    display: block;
    width: 100%;
    height: auto;
}
.handout-preview-wrap .printhint {
    text-align: center;
    color: var(--muted);
    font-size: 0.75em;
    margin-top: 8px;
}
.handout-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    margin-bottom: 16px;
}
.handout-toolbar select {
    padding: 8px 14px;
    border: 1px solid #d0c8b6;
    border-radius: 6px;
    background: #fff;
    font-size: 0.9em;
    font-family: inherit;
}
.handout-toolbar button {
    padding: 8px 14px;
    border: 1px solid var(--accent);
    border-radius: 6px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
}
```

- [ ] **Step 2: Replace the Tab 2 placeholder with the real UI**

Find `<div class="tab-panel" id="tab-handout">` and its placeholder paragraph. Replace its contents with:

```html
<div class="tab-panel" id="tab-handout">
  <div class="handout-toolbar">
    <label>Map:</label>
    <select id="hMap">
      <option value="map1861">1861 Civil War Map</option>
      <option value="territorial">Territorial Expansion</option>
    </select>
    <label>Export size:</label>
    <select id="hSize">
      <option value="1200">1200 px</option>
      <option value="1600">1600 px</option>
      <option value="2000" selected>2000 px (recommended for print)</option>
    </select>
    <button id="hDownload">Download PNG</button>
    <span class="status" id="hStatus" style="margin-left:auto;"></span>
  </div>

  <div class="handout-layout">
    <div class="handout-controls">
      <fieldset>
        <legend>Fill style</legend>
        <label class="row"><input type="radio" name="hFill" value="blank">Blank (white interiors)</label>
        <label class="row"><input type="radio" name="hFill" value="shaded">Shaded (full color fill)</label>
        <label class="row"><input type="radio" name="hFill" value="outlined" checked>Outlined-only (no fill, color borders)</label>
      </fieldset>

      <fieldset>
        <legend>Overlays</legend>
        <label class="row"><input type="checkbox" id="hLabels" checked> <span id="hLabelsText">State abbreviations</span></label>
        <label class="row" id="hDateRow"><input type="checkbox" id="hDate"> Date acquired</label>
        <label class="row"><input type="checkbox" id="hTitle" checked> Title</label>
        <label class="row"><input type="checkbox" id="hLegend" checked> Color key / legend</label>
      </fieldset>
    </div>

    <div class="handout-preview-wrap">
      <div id="hPreview"></div>
      <div class="printhint">Best printed: 8.5×11 landscape</div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Add the wiring script**

In the existing `<script>` block, just before `window.addEventListener('load', rerender);` (the last line before the closing `</script>`), add:

```javascript
// ── Handout tab wiring ─────────────────────────────────────
function applyHandoutMapDependencies() {
  const isMap1861 = window.MapHandout.state.mapKey === 'map1861';
  document.getElementById('hLabelsText').textContent = isMap1861
    ? 'State abbreviations'
    : 'Region names';
  const dateRow = document.getElementById('hDateRow');
  const dateInput = document.getElementById('hDate');
  if (isMap1861) {
    dateRow.classList.add('disabled');
    dateInput.checked = false;
    dateInput.disabled = true;
    window.MapHandout.state.showDate = false;
  } else {
    dateRow.classList.remove('disabled');
    dateInput.disabled = false;
  }
}

function renderHandoutPreview() {
  const previewEl = document.getElementById('hPreview');
  previewEl.textContent = '';
  const svg = window.MapHandout.buildHandoutSVG(window.MapHandout.state);
  previewEl.appendChild(svg);
}

document.getElementById('hMap').addEventListener('change', e => {
  window.MapHandout.state.mapKey = e.target.value;
  applyHandoutMapDependencies();
  renderHandoutPreview();
});
document.getElementById('hSize').addEventListener('change', e => {
  window.MapHandout.state.size = parseInt(e.target.value, 10);
});
document.querySelectorAll('input[name="hFill"]').forEach(input => {
  input.addEventListener('change', e => {
    if (e.target.checked) {
      window.MapHandout.state.fillStyle = e.target.value;
      renderHandoutPreview();
    }
  });
});
document.getElementById('hLabels').addEventListener('change', e => {
  window.MapHandout.state.labels = e.target.checked;
  renderHandoutPreview();
});
document.getElementById('hDate').addEventListener('change', e => {
  window.MapHandout.state.showDate = e.target.checked;
  renderHandoutPreview();
});
document.getElementById('hTitle').addEventListener('change', e => {
  window.MapHandout.state.showTitle = e.target.checked;
  renderHandoutPreview();
});
document.getElementById('hLegend').addEventListener('change', e => {
  window.MapHandout.state.showLegend = e.target.checked;
  renderHandoutPreview();
});

document.getElementById('hDownload').addEventListener('click', async () => {
  const status = document.getElementById('hStatus');
  status.textContent = 'Generating PNG…';
  const svg = window.MapHandout.buildHandoutSVG(window.MapHandout.state);
  // Reuse svgToPNG defined for the per-state tab.
  const blob = await svgToPNG(svg, window.MapHandout.state.size);
  const filename = `${window.MapHandout.state.mapKey}-handout-${window.MapHandout.state.fillStyle}.png`;
  downloadBlob(blob, filename);
  status.textContent = `Downloaded ${filename}`;
});

// Initial handout-tab render so switching to the tab shows something immediately.
applyHandoutMapDependencies();
renderHandoutPreview();
```

- [ ] **Step 4: Verify**

Reload `map-exporter.html` in the browser and click the "Full map handout" tab. Expected:
- Full UI shows: Map dropdown, Size dropdown, Download PNG button, two fieldsets on the left ("Fill style" and "Overlays"), and a preview pane on the right showing the 1861 map in outlined-only mode (with allegiance-colored borders).
- Print hint "Best printed: 8.5×11 landscape" appears below the preview.

Test interactions:
- Change Fill style to "Shaded": preview re-renders with allegiance-colored fills.
- Change Fill style to "Blank": preview shows white states with thin black borders.
- Change Map to "Territorial Expansion": preview switches to the 8-region map. The "State abbreviations" label changes to "Region names". The "Date acquired" row becomes enabled (no longer greyed).
- Change Map back to "1861 Civil War Map": "Date acquired" greys out and unchecks itself.
- Toggle "Title" and "Color key / legend": no visual change yet (those layers are stubs); but no console errors.
- Click "Download PNG". Expected: a `.png` file downloads with the current map and fill style. Open it. It should show the map only (no title/legend yet because those layers are stubs).

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/tools/map-exporter.html
git commit -m "feat(handout): build handout tab UI with live preview"
```

---

## Task 7: Implement the Labels layer

Place text at each region's bbox center. For the 1861 map, render the `abbr` (e.g., "VA"). For territorial, render `name` and/or `yearAcquired` according to checkbox state. Apply each region's `labelOffset` for hand-tuned nudges.

**Files:**
- Modify: `study-tools/engine/tools/map-handout.js`

- [ ] **Step 1: Replace `buildLabelsLayer` with the real implementation**

Replace the stub with:

```javascript
function getRegionBBox(region) {
  // Render paths into an offscreen SVG, measure, then remove.
  const probe = document.createElementNS(SVG_NS, 'svg');
  probe.setAttribute('viewBox', `0 0 ${VIEWBOX.w} ${VIEWBOX.h}`);
  probe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:900px;height:700px;';
  for (const d of region.paths) {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', d);
    probe.appendChild(p);
  }
  document.body.appendChild(probe);
  let bbox;
  try { bbox = probe.getBBox(); }
  finally { document.body.removeChild(probe); }
  return bbox;
}

function buildLabelsLayer(regions, mapKey, opts) {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('data-layer', 'labels');
  g.setAttribute('font-family', '-apple-system, "Segoe UI", system-ui, sans-serif');
  g.setAttribute('text-anchor', 'middle');
  g.setAttribute('fill', '#1a1a1a');

  for (const r of regions) {
    const lines = [];
    if (mapKey === 'map1861') {
      if (r.abbr) lines.push(r.abbr);
    } else {
      // territorial — labels checkbox shows region name; date checkbox shows year.
      // Caller controls whether we're called at all (only if `labels` is on),
      // but the date piece is independent from labels in the UI; here we
      // always include name when this layer is on, and year if showDate is on.
      lines.push(r.name);
      if (opts.showDate) lines.push(r.yearAcquired);
    }
    if (lines.length === 0) continue;

    const bbox = getRegionBBox(r);
    if (!bbox || bbox.width === 0) continue;

    const cx = bbox.x + bbox.width / 2 + (r.labelOffset?.x || 0);
    const cy = bbox.y + bbox.height / 2 + (r.labelOffset?.y || 0);

    // Auto-size: clamp to a sensible range based on bbox.
    const fitWidth = Math.min(bbox.width, bbox.height * 1.6);
    let fontSize = mapKey === 'map1861'
      ? Math.max(6, Math.min(16, fitWidth * 0.35))
      : Math.max(8, Math.min(20, fitWidth * 0.13));

    // Tiny states get a leader line out into surrounding whitespace, with
    // their label placed there. We treat very small bboxes the same way.
    const isTinyByBbox = bbox.width < 14;
    if (mapKey === 'map1861' && (r.isTiny || isTinyByBbox)) {
      // Place label to the right + slightly down; draw a short leader.
      const leadX = bbox.x + bbox.width + 14;
      const leadY = cy + 4;
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', cx);
      line.setAttribute('y1', cy);
      line.setAttribute('x2', leadX - 2);
      line.setAttribute('y2', leadY - 4);
      line.setAttribute('stroke', '#444');
      line.setAttribute('stroke-width', '0.6');
      g.appendChild(line);

      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('x', String(leadX));
      t.setAttribute('y', String(leadY));
      t.setAttribute('font-size', String(Math.max(8, fontSize)));
      t.setAttribute('text-anchor', 'start');
      t.textContent = lines.join(' ');
      g.appendChild(t);
      continue;
    }

    const lineHeight = fontSize * 1.1;
    const totalHeight = lineHeight * lines.length;
    const startY = cy - totalHeight / 2 + lineHeight * 0.85;

    lines.forEach((text, i) => {
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('x', String(cx));
      t.setAttribute('y', String(startY + i * lineHeight));
      t.setAttribute('font-size', String(fontSize));
      t.setAttribute('font-weight', i === 0 ? '600' : '400');
      t.textContent = text;
      g.appendChild(t);
    });
  }
  return g;
}
```

- [ ] **Step 2: Update the top-level `buildHandoutSVG` to also call labels when only `showDate` is on for territorial**

The spec allows "Region names off, Date on" → just years on territorial. Currently `buildHandoutSVG` only calls `buildLabelsLayer` when `state.labels` is true. Update it:

```javascript
function buildHandoutSVG(state) {
  const regions = getRegionsForHandout(state.mapKey);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', `0 0 ${VIEWBOX.w} ${VIEWBOX.h}`);
  svg.appendChild(buildBackgroundLayer(regions, state.mapKey, state.fillStyle));

  // Labels layer runs if either the labels checkbox is on, OR (territorial
  // only) the showDate checkbox is on without labels.
  const wantLabels = state.labels || (state.mapKey === 'territorial' && state.showDate);
  if (wantLabels) {
    svg.appendChild(buildLabelsLayer(regions, state.mapKey, {
      showDate:  state.showDate,
      showName:  state.labels,    // allow caller to render only year
    }));
  }
  if (state.showTitle)  svg.appendChild(buildTitleLayer(state.mapKey));
  if (state.showLegend) svg.appendChild(buildLegendLayer(regions, state.mapKey, { showDate: state.showDate }));
  return svg;
}
```

Then update `buildLabelsLayer` to honor `opts.showName === false` for territorial (default true):

```javascript
// Inside buildLabelsLayer, replace the territorial block:
} else {
  // territorial map
  if (opts.showName !== false) lines.push(r.name);
  if (opts.showDate) lines.push(r.yearAcquired);
}
```

- [ ] **Step 3: Verify in the browser**

Reload `map-exporter.html`, click "Full map handout" tab. Expected:
- With "State abbreviations" checked (default) on the 1861 map: each state shows its 2-letter code at its center. Most are readable; some tiny states (RI, DE, CN) have a small leader line out to the right with the label.
- Florida's label may sit awkwardly because of its shape — that's expected and we'll fix it via `labelOffset` in Task 10. Note any others that look bad.
- Switch Map to Territorial Expansion. With "Region names" checked: each region shows its full name centered. Toggle "Date acquired" on: each region now shows name above, year below.
- Toggle "Region names" off but keep "Date acquired" on: only the year shows for each territorial region.
- Toggle both off: no labels.
- 1861 + uncheck labels: no labels show.

Open the browser console. Confirm zero errors.

- [ ] **Step 4: Commit**

```bash
git add study-tools/engine/tools/map-handout.js
git commit -m "feat(handout): implement labels layer with auto-sizing and tiny-state leader lines"
```

---

## Task 8: Implement the Title layer

Render the title text inside a small white-with-border rectangle, placed in the empty corner appropriate to each map.

**Files:**
- Modify: `study-tools/engine/tools/map-handout.js`

- [ ] **Step 1: Replace the `buildTitleLayer` stub**

```javascript
const TITLE_TEXT = {
  map1861:     'United States in 1861',
  territorial: 'Territorial Expansion of the United States',
};

const TITLE_PLACEMENT = {
  // For 1861: top-left over Canadian border / upper Atlantic empty space.
  map1861:     { x: 10,  y: 10, anchor: 'start' },
  // For territorial: top-right over Atlantic east of the 13 colonies
  // (Oregon already occupies the top-left).
  territorial: { x: 890, y: 10, anchor: 'end'   },
};

function buildTitleLayer(mapKey) {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('data-layer', 'title');

  const text = TITLE_TEXT[mapKey];
  const place = TITLE_PLACEMENT[mapKey];
  if (!text || !place) return g;

  // Approximate text width to size the background rect. SVG can't measure
  // before render, but at font-size 18 a roughly-monospace estimate of
  // 0.55em per char is close enough for letterforms in this title.
  const fontSize = 18;
  const padX = 10, padY = 6;
  const estTextWidth = text.length * fontSize * 0.55;
  const boxW = estTextWidth + padX * 2;
  const boxH = fontSize + padY * 2;
  const boxX = place.anchor === 'end' ? place.x - boxW : place.x;
  const boxY = place.y;

  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(boxX));
  rect.setAttribute('y', String(boxY));
  rect.setAttribute('width', String(boxW));
  rect.setAttribute('height', String(boxH));
  rect.setAttribute('fill', '#ffffff');
  rect.setAttribute('stroke', '#2a2a2a');
  rect.setAttribute('stroke-width', '0.8');
  rect.setAttribute('rx', '4');
  g.appendChild(rect);

  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('x', String(boxX + boxW / 2));
  t.setAttribute('y', String(boxY + boxH / 2 + fontSize * 0.35));
  t.setAttribute('font-family', '-apple-system, "Segoe UI", system-ui, sans-serif');
  t.setAttribute('font-size', String(fontSize));
  t.setAttribute('font-weight', '700');
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('fill', '#1a1a1a');
  t.textContent = text;
  g.appendChild(t);

  return g;
}
```

- [ ] **Step 2: Verify**

Reload `map-exporter.html`, click the handout tab. Expected:
- 1861 map with Title checked: a small white rounded rectangle in the top-left containing "United States in 1861" appears above/over the Canadian border area.
- Toggle Title off: rectangle disappears.
- Switch to Territorial: title moves to the top-right, reading "Territorial Expansion of the United States". Should sit over the Atlantic east of the 13 Colonies, not overlap the colonies themselves.
- Title is readable in all three fill styles.

If the territorial title overlaps the 13 Colonies visibly, note it but don't fix here — Task 10 covers placement adjustments.

- [ ] **Step 3: Commit**

```bash
git add study-tools/engine/tools/map-handout.js
git commit -m "feat(handout): implement title layer with placement-per-map"
```

---

## Task 9: Implement the Legend layer

Vertical stack of swatches with labels, in a white-with-border box at the bottom-right of the map (over the Gulf of Mexico for 1861, over Mexico for territorial).

**Files:**
- Modify: `study-tools/engine/tools/map-handout.js`

- [ ] **Step 1: Replace the `buildLegendLayer` stub**

```javascript
function buildLegendItems(regions, mapKey, opts) {
  if (mapKey === 'map1861') {
    // 4 fixed allegiance entries.
    return [
      { color: ALLEGIANCE_COLORS.union,       label: 'Union' },
      { color: ALLEGIANCE_COLORS.confederate, label: 'Confederate' },
      { color: ALLEGIANCE_COLORS.border,      label: 'Border' },
      { color: ALLEGIANCE_COLORS.territory,   label: 'Territory' },
    ];
  }
  // Territorial: one entry per region, in the order they appear in the data
  // (which is roughly chronological).
  return regions.map(r => ({
    color: r.color,
    label: opts.showDate ? `${r.name} (${r.yearAcquired})` : r.name,
  }));
}

function buildLegendLayer(regions, mapKey, opts) {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('data-layer', 'legend');

  const items = buildLegendItems(regions, mapKey, opts);
  if (items.length === 0) return g;

  const fontSize = 11;
  const swatch = 12;
  const rowH = swatch + 4;
  const padX = 10, padY = 8;
  const labelWidth = Math.max(
    ...items.map(it => it.label.length * fontSize * 0.55)
  );
  const boxW = padX * 2 + swatch + 6 + labelWidth;
  const boxH = padY * 2 + rowH * items.length;

  // Bottom-right of the 900x700 viewBox.
  const boxX = 900 - boxW - 10;
  const boxY = 700 - boxH - 10;

  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(boxX));
  rect.setAttribute('y', String(boxY));
  rect.setAttribute('width', String(boxW));
  rect.setAttribute('height', String(boxH));
  rect.setAttribute('fill', '#ffffff');
  rect.setAttribute('stroke', '#2a2a2a');
  rect.setAttribute('stroke-width', '0.8');
  rect.setAttribute('rx', '4');
  g.appendChild(rect);

  items.forEach((item, i) => {
    const rowY = boxY + padY + i * rowH;

    const sw = document.createElementNS(SVG_NS, 'rect');
    sw.setAttribute('x', String(boxX + padX));
    sw.setAttribute('y', String(rowY));
    sw.setAttribute('width', String(swatch));
    sw.setAttribute('height', String(swatch));
    sw.setAttribute('fill', item.color);
    sw.setAttribute('stroke', '#2a2a2a');
    sw.setAttribute('stroke-width', '0.5');
    g.appendChild(sw);

    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('x', String(boxX + padX + swatch + 6));
    t.setAttribute('y', String(rowY + swatch * 0.85));
    t.setAttribute('font-family', '-apple-system, "Segoe UI", system-ui, sans-serif');
    t.setAttribute('font-size', String(fontSize));
    t.setAttribute('fill', '#1a1a1a');
    t.textContent = item.label;
    g.appendChild(t);
  });

  return g;
}
```

- [ ] **Step 2: Verify**

Reload `map-exporter.html`, click handout tab. Expected:
- 1861 map with Legend checked: bottom-right corner shows a small box with 4 rows — colored swatch + label for Union, Confederate, Border, Territory.
- Toggle Legend off: box disappears.
- Toggle Title off and Legend on: legend still renders (independent layers).
- Switch to Territorial: legend now shows 8 rows, one per region, with their colors. Toggle "Date acquired" on: each row's label gains "(year)".
- Try Fill: Blank with Legend on — students see no shading on the map but full color key in the corner. This is the "fill-in handout" use case.

- [ ] **Step 3: Commit**

```bash
git add study-tools/engine/tools/map-handout.js
git commit -m "feat(handout): implement color key / legend layer"
```

---

## Task 10: Tune label positions for awkward shapes

Add per-region `labelOffset` and `isTiny` overrides for states whose centroid label landed in a bad spot. This is a polish pass — the engineer reviews the 1861 + abbreviations rendering and the territorial + names rendering, identifies any labels that look wrong, and fixes them by editing the data files.

**Files:**
- Modify: `study-tools/engine/js/data/map-1861-data.js`
- Modify: `study-tools/engine/tools/map-exporter-territorial.js`

- [ ] **Step 1: Visually review 1861 + state abbreviations**

Open `map-exporter.html`, handout tab, set:
- Map: 1861 Civil War Map
- Fill style: Outlined-only
- Labels: State abbreviations checked
- Title and Legend: unchecked (so labels are the only thing being judged)

Inspect every state. For each one whose label is poorly placed, note the state id and roughly the offset that would help (e.g., "florida: needs to nudge right by ~15 and down ~10 because the panhandle pulls bbox center too far west"). Likely candidates based on shape:

- **florida** — bbox center sits over the Gulf because of the panhandle; nudge label southeast.
- **maryland** — narrow east-west slice; centroid falls roughly fine, but check.
- **louisiana** — boot shape; label may overlap the toe.
- **michigan** — two peninsulas; bbox center is in Lake Michigan. Definitely needs offset south to land in the lower peninsula.
- **virginia** — usually OK but check it's not overlapping NC or WV.
- **rhode-island, delaware, connecticut** — already get leader lines via `isTiny`-by-bbox detection; verify they look acceptable. If not, add explicit `isTiny: true` and consider further offset.

- [ ] **Step 2: Apply offsets to 1861 data**

For each problem state, edit its entry in `map-1861-data.js` to add a `labelOffset`:

```javascript
{ id: 'michigan', ..., abbr: 'MI', labelOffset: { x: 8, y: 60 },
      paths: ['...'] },
```

The handout-tab live preview updates on reload, so iterate: tweak, save, reload, judge, repeat. There is no test loop to break — only your eyes.

Realistic time budget: 5–10 minutes for the whole 1861 map. You're aiming for "all 42 labels are inside their state and readable," not pixel-perfect typography.

- [ ] **Step 3: Visually review territorial + names**

Switch Map to Territorial Expansion, keep Labels checked, Title/Legend off. Walk the 8 regions:

- **thirteen-colonies, treaty-of-paris** — these are oddly shaped strips (the colonies coastal strip and the post-1783 territory north of it). Check their labels don't collide with each other.
- **louisiana-purchase** — huge region, label should land roughly over modern Nebraska/Kansas.
- **florida, gadsden** — small slivers, likely need offsets.

- [ ] **Step 4: Apply offsets to territorial data**

Edit `map-exporter-territorial.js` similarly:

```javascript
{ id: 'gadsden', ..., yearAcquired: '1853', labelOffset: { x: 0, y: -8 },
  path: '...' },
```

- [ ] **Step 5: Verify**

Reload one more time. Walk through both maps with all overlays on (Labels + Title + Legend, in each fill style). Confirm nothing overlaps badly, all text is legible, no label sits outside its region.

Also test the territorial map with "Region names off, Date acquired on" — just years should appear, properly placed.

- [ ] **Step 6: Commit**

```bash
git add study-tools/engine/js/data/map-1861-data.js study-tools/engine/tools/map-exporter-territorial.js
git commit -m "data(maps): tune labelOffset for awkward shapes"
```

---

## Task 11: Final pass — printed output check, version bump, changelog

Verify a printed-quality export is actually print-quality, then bump the version.

**Files:**
- Modify: `study-tools/engine/version.json`

- [ ] **Step 1: Export and inspect a print-quality PNG**

In the handout tab, set:
- Map: 1861 Civil War Map
- Size: 2000 px (recommended for print)
- Fill style: Outlined-only
- All overlays on (Labels, Title, Legend)

Click Download PNG. Open the file. Expected:
- Image is exactly 2000 px wide.
- Aspect ratio is roughly 1.286 (roughly 2000 × 1556).
- Text is sharp, not pixelated.
- White rectangles for title and legend are clean with thin borders.
- Allegiance colors on borders are clearly distinguishable.

Optional but recommended: print it on actual 8.5×11 landscape. Confirm the map fills the page.

Repeat for territorial. Repeat for "Blank + Legend only" (the fill-in handout use case).

- [ ] **Step 2: Bump version**

Edit `study-tools/engine/version.json`:

```json
{
    "version": "8.9.0",
    "date": "2026-05-03"
}
```

(Use a minor bump because this is a new feature, not a fix. Today's date 2026-05-03 — adjust if implementing on a different day.)

- [ ] **Step 3: Update memory note**

Append to or update `/Users/shiebenaderet/.claude/projects/-Users-shiebenaderet-Documents-GitHub-studytools/memory/project_map_exporter.md` to mention the new handout tab. Add a "Handout tab (added v8.9.0)" section noting the file structure (`map-handout.js`) and overlay options.

- [ ] **Step 4: Final commit**

```bash
git add study-tools/engine/version.json
git commit -m "chore: bump version to 8.9.0 — full map handout feature"
```

- [ ] **Step 5: Smoke test the engine**

Open `study-tools/engine/index.html` (the main app, not the exporter). Click into the westward expansion unit, into the 1861 map quiz activity. Expected: zero regression — the activity reads `MAP_1861_REGIONS` and our additive field changes are invisible to it.

Open the territorial expansion map activity if accessible the same way. Same expectation.

If anything broke: revert. Otherwise, done.

---

## Done criteria

All checkboxes above are checked. Manual checklist before declaring complete:

1. Per-state tab in `map-exporter.html` works exactly as it did before this work — same UI, same behavior, same downloads.
2. Full map handout tab renders a live preview that updates on every control change.
3. All three fill styles (Blank, Shaded, Outlined-only) produce visually distinct, sensible output.
4. Labels appear at sensible positions in every region.
5. Title appears in its corner without obscuring the map's main content.
6. Legend appears in its corner with all entries.
7. Disabled "Date acquired" checkbox when 1861 is active is visibly greyed and does not affect output.
8. 2000px PNG export is sharp at 8.5×11 landscape.
9. Engine site (`index.html`) — westward expansion unit — 1861 map quiz works without regression.
10. Version bumped in `version.json`.
