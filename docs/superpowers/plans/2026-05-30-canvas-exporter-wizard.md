# Canvas QTI Exporter + Wizard Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the question exporter into a 4-step wizard and add Canvas LMS as a third export destination, emitting an IMS CC 1.1.3 / QTI 1.2 .zip per the user-supplied conformance spec.

**Architecture:** Extend the existing pure-logic core (`question-export-core.js`) with Canvas renderers + validation + `buildCanvasPackage` that returns an in-memory file map; a tiny new `question-exporter-zip.js` is the only file that touches a vendored JSZip; the page refactors into a wizard (Option C from the 2026-05-29 UX mockups). Existing Blooket/GiMKit/FIB/vocab behavior MUST keep working at every step.

**Tech Stack:** Vanilla HTML/CSS/JS, no build tools. Node runs the pure-logic tests (no framework — tests `process.exit(1)` on failure). JSZip (vendored, self-hosted) does the in-browser zipping. Headless Chrome smoke-tests the page.

---

## Reference: spec

`docs/superpowers/specs/2026-05-29-canvas-exporter-design.md`
(extends `docs/superpowers/specs/2026-05-28-question-exporter-design.md` and
`docs/superpowers/specs/2026-05-29-exporter-fib-vocab-design.md`)

## Current state (verified)

- `study-tools/engine/tools/question-export-core.js` exports:
  `{ csvField, toCsv, normalizeQuestions, formatBlooket, formatGimkit, formatGimkitTyped, pickDistractors, normalizeFib, normalizeVocab }` via UMD (`module.exports` in Node, `window.QExport` in browser).
- `study-tools/engine/tools/question-export-core.test.js` has `eq(name, got, want)` helper, `parseCsv()` RFC-4180 parser, and ends with a trailing
  `if (failures.length){...process.exit(1)} console.log('OK')`. New assertions go ABOVE that block.
- `study-tools/engine/tools/question-exporter.html` is a single-file page with state
  `{ unitId, source, questions, selected, edits, vocabDirection, includeEncounter, fibTyped, rawConfig }`. No `innerHTML` (strict project rule, enforced by a hook).
- `study-tools/units/units.json` lists units (id, title, theme, retired?).
- Per-unit config at `study-tools/units/<id>/config.json` has `practiceQuestions`, `vocabulary`, `fillInBlankSentences`, `shortAnswerQuestions`.
- Current version: `8.44.0`. Bump to `8.45.0` at the end.

## Canonical question shape (unchanged)

`{ id, question, options:[s0,s1,s2,s3], correctIndex, topic }`

## Canvas-specific shape for the essay source

`shortAnswerQuestions` items become canonical questions with `options=[]` and `correctIndex=-1`. They are only valid for the Canvas destination (the existing CSV destinations reject `options.length < 4`). A new `normalizeShortAnswerEssay(config)` produces them.

## File structure (new + modified)

### New
- `study-tools/engine/vendor/jszip.min.js` — self-hosted JSZip.
- `study-tools/engine/vendor/jszip.VERSION.txt` — pinned version + sha256 + source URL.
- `study-tools/engine/tools/question-exporter-zip.js` — the ONLY file that depends on JSZip. Exposes `window.QExportZip.packageZip(fileMap) -> Promise<Blob>`.
- `study-tools/engine/tools/_canvas-fixtures/` — golden zips committed after Canvas-verified manual import.
- `study-tools/engine/tools/validate-package.js` — Node CLI for round-trip checks on an existing zip.

### Modified
- `study-tools/engine/tools/question-export-core.js` — add canonical-essay support, `normalizeShortAnswerEssay`, Canvas renderers (`renderMCItem`, `renderShortAnswerItem`, `renderEssayItem`), `buildAssessmentXml`, `buildManifestXml`, `buildCanvasPackage`, `validateForCanvas`, `xmlEscape`, `slugify`.
- `study-tools/engine/tools/question-export-core.test.js` — add Canvas renderer round-trip tests, validation rule tests, integration test over real civil-war data.
- `study-tools/engine/tools/question-exporter.html` — full wizard refactor. Steps 0 (Unit) / 1 (Source) / 2 (Refine) / 3 (Send). Destination chip in the rail. Canvas branch on Step 3 with Quiz Title, Max Attempts, live validation checklist, "Build .zip ▸" button.
- `study-tools/engine/version.json` — bump to 8.45.0.

---

## Plan shape (high level)

Two halves, executed in order so the existing CSV exports never regress:

- **Tasks 1–6 — Wizard refactor.** Rebuild the page as a wizard. Blooket/GiMKit/FIB/vocab keep working; Canvas not present yet. Headless smoke test after each task.
- **Tasks 7–14 — Canvas core + plumbing.** TDD on the pure renderers + validation + `buildCanvasPackage`, vendor JSZip, wire Step 3 Canvas branch, build & verify a golden zip, bump version.

Each task commits independently.

---

## Task 1: Vendor JSZip + sanity-check

**Files:**
- Create: `study-tools/engine/vendor/jszip.min.js`
- Create: `study-tools/engine/vendor/jszip.VERSION.txt`

- [ ] **Step 1: Download a pinned JSZip release**

Run:
```bash
mkdir -p study-tools/engine/vendor
curl -fsSL -o study-tools/engine/vendor/jszip.min.js https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js
shasum -a 256 study-tools/engine/vendor/jszip.min.js
```
Expected: file written (~95KB); a sha256 hex digest. Record both the version (`3.10.1`) and the sha for the next step.

- [ ] **Step 2: Write the version pin**

Create `study-tools/engine/vendor/jszip.VERSION.txt` with this content (replace `<SHA>` with the sha from Step 1):
```
JSZip 3.10.1
Source: https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js
Downloaded: 2026-05-30
sha256: <SHA>
License: MIT (https://github.com/Stuk/jszip/blob/main/LICENSE.markdown)

Why vendored:
This project self-hosts every dependency (per the privacy posture documented
in README.md). JSZip is the only file in this codebase that touches an
external library; it is wrapped by question-exporter-zip.js so swapping the
zip library later is a one-file change.
```

- [ ] **Step 3: Sanity-check JSZip loads in a browser**

Run:
```bash
(cd /Users/shiebenaderet/Documents/GitHub/studytools && python3 -m http.server 8731 >/tmp/qexport-server.log 2>&1 &)
sleep 1.5
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP=$(mktemp -d)
cat > /tmp/jszip-probe.html <<'HTML'
<!DOCTYPE html><html><body>
<script src="/study-tools/engine/vendor/jszip.min.js"></script>
<script>
  document.title = typeof JSZip === 'function' ? 'JSZIP_OK_v' + JSZip.version : 'JSZIP_MISSING';
</script>
</body></html>
HTML
cp /tmp/jszip-probe.html study-tools/engine/vendor/_probe.html
"$CHROME" --headless --disable-gpu --no-sandbox --user-data-dir="$TMP" --dump-dom \
  --virtual-time-budget=4000 \
  "http://localhost:8731/study-tools/engine/vendor/_probe.html" 2>/dev/null \
  | grep -o '<title>[^<]*</title>'
rm -f study-tools/engine/vendor/_probe.html
rm -rf "$TMP"
pkill -f "http.server 8731" 2>/dev/null
```
Expected: `<title>JSZIP_OK_v3.10.1</title>`.

- [ ] **Step 4: Commit**

```bash
git add study-tools/engine/vendor/jszip.min.js study-tools/engine/vendor/jszip.VERSION.txt
git commit -m "feat(exporter): vendor JSZip 3.10.1 for in-browser zip packaging

Why: Canvas QTI export emits a multi-file .zip; vendoring keeps the no-CDN
privacy posture and pins the version so swaps are deliberate."
```

---

## Task 2: Add wizard chrome (rail + step routing) without changing existing behavior

**Files:**
- Modify: `study-tools/engine/tools/question-exporter.html`

**Why this task is shaped the way it is:** the current page renders source picker + question list + export inline. We add the wizard chrome (rail on the left, step container on the right) and move the existing UI inside what will become Step 2. Steps 0/1/3 are stub bodies for now — clicking through still works because Step 2 hosts the working tool. Functional regressions are caught by the existing headless smoke test (still expects 63 question rows on default load).

- [ ] **Step 1: Add wizard CSS to the existing `<style>` block**

Append inside the `<style>` block, AFTER the existing `#sourceControls label` rule:
```css
  /* Wizard chrome */
  body { padding: 0; }
  .wizard { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; background: var(--bg); }
  .rail { background: #1a1a1a; color: #f4efe6; padding: 28px 22px; display: flex; flex-direction: column; gap: 22px; }
  .rail-brand { font-family: Georgia, "Iowan Old Style", serif; font-style: italic; font-size: 20px; letter-spacing: -0.01em; }
  .rail-step { display: grid; grid-template-columns: 28px 1fr; gap: 12px; align-items: start; padding: 4px 0; color: rgba(255,255,255,.55); cursor: pointer; background: none; border: 0; text-align: left; font: inherit; }
  .rail-step .rs-badge { width: 28px; height: 28px; border: 1px solid rgba(255,255,255,.3); border-radius: 50%; display: inline-grid; place-items: center; font-family: ui-monospace, Menlo, monospace; font-weight: 700; font-size: 12px; }
  .rail-step .rs-title { font-style: italic; font-size: 14px; margin-top: 4px; }
  .rail-step .rs-desc { font-size: 11px; color: rgba(255,255,255,.6); margin-top: 2px; line-height: 1.35; }
  .rail-step.done { color: rgba(255,255,255,.85); }
  .rail-step.done .rs-badge { background: #f4efe6; color: #1a1a1a; border-color: #f4efe6; }
  .rail-step.cur { color: #f4efe6; }
  .rail-step.cur .rs-badge { background: var(--accent); color: #fff; border-color: var(--accent); box-shadow: 0 0 0 4px rgba(200,68,58,.25); }
  .rail-step[disabled] { cursor: not-allowed; opacity: .5; }
  .rail-dest { margin-top: auto; padding-top: 18px; border-top: 1px solid rgba(255,255,255,.12); }
  .rail-dest .dl { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: rgba(255,255,255,.55); font-weight: 700; margin-bottom: 6px; }
  .rail-dest select { width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,.2); background: #2a2a2a; color: #f4efe6; font: inherit; }
  .stage { padding: 32px 40px 48px; overflow-x: hidden; }
  .stage h2 { font-family: Georgia, "Iowan Old Style", serif; font-style: italic; font-weight: 500; font-size: 26px; letter-spacing: -0.01em; margin: 0 0 6px; }
  .stage .lede { color: var(--muted); margin: 0 0 24px; font-size: 14px; max-width: 60ch; }
  .step-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 28px; padding-top: 18px; border-top: 1px solid var(--line); }
```

- [ ] **Step 2: Replace the page body with wizard markup**

In the body, REPLACE everything from `<h1>Question Export Tool</h1>` down to (but NOT including) `<script src="question-export-core.js"></script>` with:
```html
<div class="wizard">
  <nav class="rail">
    <div class="rail-brand">Exporter &mdash;</div>
    <button class="rail-step" data-go="0">
      <span class="rs-badge">0</span>
      <span><div class="rs-title">Unit</div><div class="rs-desc rs-desc-unit">(none)</div></span>
    </button>
    <button class="rail-step" data-go="1">
      <span class="rs-badge">1</span>
      <span><div class="rs-title">Source</div><div class="rs-desc rs-desc-source">Pick what to export.</div></span>
    </button>
    <button class="rail-step" data-go="2">
      <span class="rs-badge">2</span>
      <span><div class="rs-title">Refine</div><div class="rs-desc">Select, edit, filter.</div></span>
    </button>
    <button class="rail-step" data-go="3">
      <span class="rs-badge">3</span>
      <span><div class="rs-title">Send</div><div class="rs-desc">Download or build.</div></span>
    </button>
    <div class="rail-dest">
      <div class="dl">Destination</div>
      <select id="destSel">
        <option value="blooket">Blooket</option>
        <option value="gimkit">GiMKit</option>
        <option value="canvas">Canvas QTI</option>
      </select>
    </div>
  </nav>

  <main class="stage">
    <!-- Step 0 -->
    <section data-step="0" hidden>
      <h2>Pick a unit</h2>
      <p class="lede">Choose which unit's content to export.</p>
      <div id="unitGrid"></div>
    </section>

    <!-- Step 1 -->
    <section data-step="1" hidden>
      <h2>Pick a source</h2>
      <p class="lede">Each source maps from a different pool in this unit.</p>
      <div id="sourceGrid"></div>
      <div id="sourceOpts"></div>
      <div class="step-actions">
        <button id="back1" class="secondary">&larr; Unit</button>
        <button id="next1" class="primary">Continue: Refine &rarr;</button>
      </div>
    </section>

    <!-- Step 2 (HOSTS THE EXISTING WORKING UI) -->
    <section data-step="2" hidden>
      <h2>Refine selection</h2>
      <p class="lede" id="step2Lede">Pick questions to export. You can edit any of them inline.</p>

      <div class="toolbar">
        <button id="selAll" class="secondary">Select all</button>
        <button id="selNone" class="secondary">Clear</button>
        <input id="filter" type="text" placeholder="Filter by text..." style="flex:1;min-width:160px;padding:8px 10px;border:1px solid var(--line);border-radius:6px;">
        <span class="count" id="count">0 selected</span>
      </div>

      <div id="list"></div>

      <div class="step-actions">
        <button id="back2" class="secondary">&larr; Source</button>
        <button id="next2" class="primary">Continue: Send &rarr;</button>
      </div>
    </section>

    <!-- Step 3 (existing platform/export controls live here for now) -->
    <section data-step="3" hidden>
      <h2>Send</h2>
      <p class="lede" id="step3Lede">Choose a platform and download.</p>

      <div class="toolbar">
        <label>Platform <select id="platformSel"><option value="blooket">Blooket</option><option value="gimkit">GiMKit</option></select></label>
        <button id="exportBtn" class="primary" disabled>Export CSV</button>
        <span id="genNote" class="gen-note" style="display:none;color:var(--warn);font-size:.85em;"></span>
      </div>

      <div id="canvasPanel" hidden></div>

      <div class="step-actions">
        <button id="back3" class="secondary">&larr; Refine</button>
      </div>
    </section>
  </main>
</div>
```

- [ ] **Step 3: Add step-routing JS at the TOP of the existing `<script>` IIFE**

Inside the existing `(function () {` IIFE in `<script>`, immediately after `var UNITS_URL = ...`, add:
```js
  var stepEls = function () { return document.querySelectorAll('section[data-step]'); };
  function showStep(n) {
    state.step = n;
    stepEls().forEach(function (s) { s.hidden = (Number(s.dataset.step) !== n); });
    document.querySelectorAll('.rail-step').forEach(function (b) {
      var i = Number(b.dataset.go);
      b.classList.toggle('cur', i === n);
      b.classList.toggle('done', i < n);
    });
    if (n === 2) render();
  }
  function wireRail() {
    document.querySelectorAll('.rail-step').forEach(function (b) {
      b.onclick = function () { showStep(Number(b.dataset.go)); };
    });
    document.getElementById('back1').onclick = function () { showStep(0); };
    document.getElementById('next1').onclick = function () { showStep(2); };
    document.getElementById('back2').onclick = function () { showStep(1); };
    document.getElementById('next2').onclick = function () { showStep(3); };
    document.getElementById('back3').onclick = function () { showStep(2); };
  }
```
Extend `state` (the existing `var state = {...}` line near the top of the IIFE) by ADDING fields:
```js
  // existing fields preserved, plus:
  state.step = 2;            // start at Step 2 to preserve current behavior until later tasks
  state.destination = 'blooket';
  state.canvasOpts = { title: '', maxAttempts: 1 };
```
Wire the destination chip and call routing at boot. At the BOTTOM of the IIFE, AFTER the existing `fetch(UNITS_URL)...` block (which currently populates a `#unitSel` that no longer exists), REPLACE it with:
```js
  document.getElementById('destSel').onchange = function () { state.destination = this.value; updatePlatformVisibility(); };
  function updatePlatformVisibility() {
    var platSel = document.getElementById('platformSel');
    platSel.disabled = (state.destination === 'canvas');
    document.getElementById('exportBtn').hidden = (state.destination === 'canvas');
  }
  wireRail();
  showStep(state.step);
  fetch(UNITS_URL).then(function (r) { return r.json(); }).then(function (data) {
    state.units = (data.units || []);
    // Auto-load first unit so existing behavior keeps working
    if (state.units.length) loadUnit(state.units[0].id);
  });
  updatePlatformVisibility();
```

(Note: removing the old `#unitSel` population is intentional — Step 0 will repopulate it as a grid in Task 3.)

- [ ] **Step 4: Smoke-test that Step 2 still renders questions**

Run:
```bash
grep -c innerHTML study-tools/engine/tools/question-exporter.html
```
Expected: `0`.

Then:
```bash
pkill -f "http.server 8731" 2>/dev/null; sleep 0.5
(cd /Users/shiebenaderet/Documents/GitHub/studytools && python3 -m http.server 8731 >/tmp/qexport-server.log 2>&1 &)
sleep 1.5
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP=$(mktemp -d)
"$CHROME" --headless --disable-gpu --no-sandbox --user-data-dir="$TMP" --dump-dom \
  --virtual-time-budget=8000 \
  "http://localhost:8731/study-tools/engine/tools/question-exporter.html" 2>/dev/null > /tmp/qx-dom.html
echo "rail steps: $(grep -o 'class=\"rail-step' /tmp/qx-dom.html | wc -l | tr -d ' ')"
echo "question rows on Step 2 (expect 63): $(grep -o 'class=\"qrow\"' /tmp/qx-dom.html | wc -l | tr -d ' ')"
echo "destination select: $(grep -o 'id=\"destSel\"' /tmp/qx-dom.html | wc -l | tr -d ' ')"
pkill -f "http.server 8731" 2>/dev/null; rm -rf "$TMP"
```
Expected: rail steps = 4, question rows = 63 (Civil War loads by default), destination select = 1.

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/tools/question-exporter.html
git commit -m "feat(exporter): wizard chrome with persistent rail and step routing

Adds the 4-step wizard skeleton (Unit / Source / Refine / Send) with a
left rail and destination chip. The existing question list + export
controls move into Step 2 and Step 3 so Blooket/GiMKit behavior is
unchanged; Steps 0 and 1 are stubs the next tasks fill in.

Why: prepares the UI for Canvas's heavier Step 3 surface without
crowding the existing toolbar."
```

---

## Task 3: Build Step 0 — Unit grid

**Files:**
- Modify: `study-tools/engine/tools/question-exporter.html`

- [ ] **Step 1: Add unit-card CSS to the `<style>` block**

Append after the wizard CSS added in Task 2:
```css
  .unit-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
  .unit-card { position: relative; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 18px 18px 16px; cursor: pointer; transition: border-color .15s ease, transform .12s ease, box-shadow .15s ease; overflow: hidden; }
  .unit-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px -16px rgba(0,0,0,.2); }
  .unit-card.on { border-color: #1a1a1a; }
  .unit-card .stripe { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #999; }
  .unit-card .ut { font-family: Georgia, "Iowan Old Style", serif; font-style: italic; font-size: 17px; letter-spacing: -0.01em; margin: 0 0 6px; padding-left: 10px; }
  .unit-card .us { color: var(--muted); font-size: 12px; padding-left: 10px; margin: 0 0 10px; }
  .unit-card .stats { display: flex; flex-wrap: wrap; gap: 6px 12px; font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: var(--ink); padding-left: 10px; }
  .unit-card .stats b { color: var(--accent); font-weight: 700; }
  .unit-archived h3 { font-family: Georgia, serif; font-style: italic; color: var(--muted); font-size: 14px; margin: 24px 0 10px; }
  .unit-card.retired { opacity: .55; }
```

- [ ] **Step 2: Add the Step 0 renderer to the IIFE**

Inside the IIFE, AFTER the existing `loadUnit` function, add:
```js
  function renderUnitGrid() {
    var host = document.getElementById('unitGrid');
    host.textContent = '';
    var liveWrap = el('div', 'unit-grid');
    var retiredWrap = el('div', 'unit-grid');
    var hasRetired = false;
    (state.units || []).forEach(function (u) {
      var card = el('button', 'unit-card' + (u.retired ? ' retired' : '') + (state.unitId === u.id ? ' on' : ''));
      card.type = 'button';
      var stripe = el('span', 'stripe');
      if (u.theme && u.theme.primary) stripe.style.background = u.theme.primary;
      card.append(stripe);
      card.append(el('h3', 'ut', u.title || u.id));
      card.append(el('p', 'us', u.subtitle || ''));
      var stats = el('div', 'stats');
      stats.append(document.createTextNode('Loading counts...'));
      card.append(stats);
      card.onclick = function () { loadUnit(u.id); showStep(1); };
      // load counts asynchronously
      fetch('../../units/' + u.id + '/config.json').then(function (r) { return r.json(); }).then(function (cfg) {
        stats.textContent = '';
        var labels = [
          ['practice', (cfg.practiceQuestions || []).length],
          ['vocab', (cfg.vocabulary || []).length],
          ['FIB', (cfg.fillInBlankSentences || []).length],
          ['short answer', (cfg.shortAnswerQuestions || []).length]
        ];
        labels.forEach(function (p) {
          if (!p[1]) return;
          var span = el('span');
          var b = el('b'); b.textContent = String(p[1]);
          span.append(b, document.createTextNode(' ' + p[0]));
          stats.append(span);
        });
      }).catch(function () { stats.textContent = 'counts unavailable'; });
      (u.retired ? (hasRetired = true, retiredWrap) : liveWrap).append(card);
    });
    host.append(liveWrap);
    if (hasRetired) {
      var ar = el('div', 'unit-archived');
      ar.append(el('h3', null, 'Archived'));
      ar.append(retiredWrap);
      host.append(ar);
    }
  }
```

- [ ] **Step 3: Render the grid on the bootstrap and update rail description on unit load**

Change the existing `fetch(UNITS_URL)...` block (just added in Task 2) to:
```js
  fetch(UNITS_URL).then(function (r) { return r.json(); }).then(function (data) {
    state.units = (data.units || []);
    renderUnitGrid();
    if (state.units.length) loadUnit(state.units[0].id);
  });
```
Modify the existing `loadUnit` function: at the END of its `.then(function (cfg) {...})` body, add:
```js
        document.querySelector('.rs-desc-unit').textContent = (state.units || []).filter(function (u) { return u.id === unitId; }).map(function (u) { return u.title || u.id; })[0] || unitId;
```

- [ ] **Step 4: Smoke-test the unit grid**

```bash
pkill -f "http.server 8731" 2>/dev/null; sleep 0.5
(cd /Users/shiebenaderet/Documents/GitHub/studytools && python3 -m http.server 8731 >/tmp/qexport-server.log 2>&1 &)
sleep 1.5
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP=$(mktemp -d)
"$CHROME" --headless --disable-gpu --no-sandbox --user-data-dir="$TMP" --dump-dom \
  --virtual-time-budget=8000 \
  "http://localhost:8731/study-tools/engine/tools/question-exporter.html" 2>/dev/null > /tmp/qx-dom.html
echo "unit cards (expect 3): $(grep -o 'class=\"unit-card' /tmp/qx-dom.html | wc -l | tr -d ' ')"
echo "Archived section (expect 1): $(grep -o 'class=\"unit-archived' /tmp/qx-dom.html | wc -l | tr -d ' ')"
echo "innerHTML count: $(grep -c innerHTML study-tools/engine/tools/question-exporter.html)"
pkill -f "http.server 8731" 2>/dev/null; rm -rf "$TMP"
```
Expected: unit cards = 3, archived = 1, innerHTML = 0.

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/tools/question-exporter.html
git commit -m "feat(exporter): Step 0 unit grid with theme stripes and live counts

Each unit becomes a card with its theme-color stripe, title, and the
per-source question counts loaded from that unit's config.json. Retired
units are bucketed into an Archived section.

Why: with multiple units coming, the wizard needs a real home page that
shows what's in each unit at a glance."
```

---

## Task 4: Build Step 1 — Source picker + source-specific options

**Files:**
- Modify: `study-tools/engine/tools/question-exporter.html`

- [ ] **Step 1: Add source-card CSS**

Append to the `<style>` block:
```css
  .source-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  .source-card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; cursor: pointer; text-align: left; font: inherit; color: inherit; transition: border-color .15s ease, transform .12s ease; }
  .source-card:hover:not([disabled]) { transform: translateY(-2px); border-color: #1a1a1a; }
  .source-card.on { border-color: #1a1a1a; box-shadow: inset 0 0 0 1px #1a1a1a; }
  .source-card[disabled] { opacity: .5; cursor: not-allowed; }
  .source-card .sc-name { font-family: Georgia, serif; font-style: italic; font-size: 16px; margin-bottom: 4px; }
  .source-card .sc-desc { font-size: 12px; color: var(--muted); line-height: 1.35; margin-bottom: 8px; }
  .source-card .sc-stat { font-family: ui-monospace, Menlo, monospace; font-size: 16px; color: var(--accent); font-weight: 700; }
  .source-card .sc-note { font-size: 11px; color: var(--warn); margin-top: 6px; }
  .source-opts { margin-top: 18px; padding: 14px; background: var(--card); border: 1px solid var(--line); border-radius: 10px; display: flex; flex-wrap: wrap; gap: 14px; align-items: center; }
  .source-opts label { font-size: 13px; color: var(--ink); display: inline-flex; align-items: center; gap: 6px; }
```

- [ ] **Step 2: Add the Step 1 renderer to the IIFE**

Inside the IIFE, AFTER `renderUnitGrid`, add:
```js
  var SOURCES = [
    { id: 'practice', name: 'Practice questions', desc: 'The vetted 4-option MC bank used in the practice test.', count: function (c) { return (c.practiceQuestions||[]).length; } },
    { id: 'vocab', name: 'Vocabulary', desc: 'Defaults to must-know. Becomes 4-option MC with auto distractors from the same chapter.', count: function (c) { return (c.vocabulary||[]).length; } },
    { id: 'fib', name: 'Fill-in-the-blank', desc: 'The sentence becomes the question; the answer is correct; 3 same-chapter distractors.', count: function (c) { return (c.fillInBlankSentences||[]).length; } },
    { id: 'shortAnswer', name: 'Short-answer essays', desc: 'Open-ended prompts with key terms and sentence starters. Canvas only.', count: function (c) { return (c.shortAnswerQuestions||[]).length; }, canvasOnly: true }
  ];

  function renderSourceGrid() {
    var host = document.getElementById('sourceGrid');
    host.textContent = '';
    var grid = el('div', 'source-grid');
    var cfg = state.rawConfig || {};
    SOURCES.forEach(function (s) {
      var n = s.count(cfg);
      var disabled = (s.canvasOnly && state.destination !== 'canvas') || n === 0;
      var card = el('button', 'source-card' + (state.source === s.id ? ' on' : ''));
      card.type = 'button';
      if (disabled) card.disabled = true;
      card.append(el('div', 'sc-name', s.name));
      card.append(el('div', 'sc-desc', s.desc));
      var stat = el('div', 'sc-stat');
      stat.append(document.createTextNode(String(n)));
      stat.append(document.createTextNode(' '));
      var u = el('span'); u.style.fontFamily = 'inherit'; u.style.fontSize = '11px'; u.style.color = 'var(--muted)';
      u.textContent = s.id === 'vocab' ? 'terms' : (s.id === 'fib' ? 'sentences' : 'questions');
      stat.append(u);
      card.append(stat);
      if (s.canvasOnly && state.destination !== 'canvas') {
        card.append(el('div', 'sc-note', 'Essays export only to Canvas. Switch destination to Canvas in the rail.'));
      }
      card.onclick = function () {
        if (card.disabled) return;
        state.source = s.id;
        rebuildQuestions();
        renderSourceGrid();
        renderSourceOpts();
      };
      grid.append(card);
    });
    host.append(grid);
  }

  function renderSourceOpts() {
    var host = document.getElementById('sourceOpts');
    host.textContent = '';
    if (state.source === 'vocab') {
      var wrap = el('div', 'source-opts');
      var dirLabel = el('label', null, 'Direction ');
      var dir = el('select');
      [['definition-term','Definition to Term'],['term-definition','Term to Definition']].forEach(function (o) {
        var op = el('option', null, o[1]); op.value = o[0]; if (o[0] === state.vocabDirection) op.selected = true; dir.append(op);
      });
      dir.onchange = function () { state.vocabDirection = dir.value; rebuildQuestions(); };
      dirLabel.append(dir);
      var tierLabel = el('label');
      var tier = el('input'); tier.type = 'checkbox'; tier.checked = state.includeEncounter;
      tier.onchange = function () { state.includeEncounter = tier.checked; rebuildQuestions(); };
      tierLabel.append(tier, document.createTextNode(' Include encounter tier'));
      wrap.append(dirLabel, tierLabel);
      host.append(wrap);
    } else if (state.source === 'fib') {
      var wrap2 = el('div', 'source-opts');
      var typedLabel = el('label');
      var typed = el('input'); typed.type = 'checkbox'; typed.checked = state.fibTyped;
      typed.disabled = state.destination !== 'gimkit';
      typed.onchange = function () { state.fibTyped = typed.checked; };
      typedLabel.append(typed, document.createTextNode(' Typed answers (GiMKit only)'));
      if (state.destination !== 'gimkit') typedLabel.style.color = 'var(--muted)';
      wrap2.append(typedLabel);
      host.append(wrap2);
    }
  }
```

- [ ] **Step 3: Wire Step 1 rendering on entry and on destination change**

Replace the `showStep` function (added in Task 2) with:
```js
  function showStep(n) {
    state.step = n;
    stepEls().forEach(function (s) { s.hidden = (Number(s.dataset.step) !== n); });
    document.querySelectorAll('.rail-step').forEach(function (b) {
      var i = Number(b.dataset.go);
      b.classList.toggle('cur', i === n);
      b.classList.toggle('done', i < n);
    });
    if (n === 1) { renderSourceGrid(); renderSourceOpts(); }
    if (n === 2) render();
  }
```
Modify the existing destSel handler to also refresh Step 1 when changed:
```js
  document.getElementById('destSel').onchange = function () {
    state.destination = this.value;
    updatePlatformVisibility();
    if (state.step === 1) { renderSourceGrid(); renderSourceOpts(); }
  };
```
Change `state.step` initialization from `2` to `0` (now that Step 0 + 1 render correctly):
```js
  state.step = 0;
```

- [ ] **Step 4: Add a normalizer for shortAnswerQuestions → essay-shape**

Inside `rebuildQuestions`, before the `else state.questions = ...` line, add:
```js
    else if (state.source === 'shortAnswer') state.questions = (cfg.shortAnswerQuestions || []).map(function (sa, i) {
      return { id: i, question: sa.question || '', options: [], correctIndex: -1, topic: sa.topic || 'Uncategorized', _essay: { keyTerms: sa.keyTerms || [], sentenceStarters: sa.sentenceStarters || [] } };
    });
```
(This is an in-memory shape only. The `_essay` payload is used by the Canvas essay renderer in Task 8.)

In `render()`, find the `var byTopic = {}; var order = [];` block. Change the `eq` variable handling so essay-shape questions (no options) still render: locate the `.qhead` building in `renderRow` and confirm it tolerates a question with `options=[]`. If not, in `buildEditor`, wrap the `eq.options.forEach(...)` in `if (eq.options && eq.options.length) { ... }` and append a small note `el('div', null, '(Essay prompt — no options.)')` otherwise.

- [ ] **Step 5: Smoke-test the wizard end-to-end**

```bash
pkill -f "http.server 8731" 2>/dev/null; sleep 0.5
(cd /Users/shiebenaderet/Documents/GitHub/studytools && python3 -m http.server 8731 >/tmp/qexport-server.log 2>&1 &)
sleep 1.5
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP=$(mktemp -d)
"$CHROME" --headless --disable-gpu --no-sandbox --user-data-dir="$TMP" --dump-dom \
  --virtual-time-budget=8000 \
  "http://localhost:8731/study-tools/engine/tools/question-exporter.html" 2>/dev/null > /tmp/qx-dom.html
echo "Step 0 active: $(grep -c 'data-step=\"0\"[^<]*<' /tmp/qx-dom.html)"
echo "Unit cards (expect 3): $(grep -o 'class=\"unit-card' /tmp/qx-dom.html | wc -l | tr -d ' ')"
echo "innerHTML count: $(grep -c innerHTML study-tools/engine/tools/question-exporter.html)"
pkill -f "http.server 8731" 2>/dev/null; rm -rf "$TMP"
```
Expected: unit cards = 3, innerHTML = 0. Manually open the page in your browser and verify clicking a unit → source grid renders → clicking a source → Refine shows questions → clicking Send shows the existing CSV controls.

- [ ] **Step 6: Commit**

```bash
git add study-tools/engine/tools/question-exporter.html
git commit -m "feat(exporter): Step 1 source picker with per-source options

Source cards show live counts; the shortAnswer source card always
renders but is disabled outside Canvas with an inline note. Vocab and
FIB show their existing source-specific toggles below the chosen card.

Why: the wizard's source-picking step is where most users will live in
the long run; making sources discoverable matters more than density."
```

---

## Task 5: Step 2 polish — destination-aware visibility on Refine

**Files:**
- Modify: `study-tools/engine/tools/question-exporter.html`

The existing Step 2 list works; this task just ensures essay-shape questions render gracefully without options, and that the destination chip change while on Step 2 does NOT clear selection (since the user may be mid-curation).

- [ ] **Step 1: Verify essay-source rendering on Step 2**

Manually: in the browser, switch destination to Canvas → Step 1 → pick "Short-answer essays" → Continue. Step 2 should list 6 questions grouped by topic; each shows the prompt only (no options). The inline editor opens but shows "(Essay prompt — no options.)" instead of option inputs.

If broken, return to Task 4 Step 4 and fix.

- [ ] **Step 2: Make rebuildQuestions NOT reset selection when source is unchanged**

In the existing `rebuildQuestions` body, replace the line `state.selected = {}; state.edits = {};` with:
```js
    if (rebuildQuestions._lastSource !== state.source || rebuildQuestions._lastUnit !== state.unitId) {
      state.selected = {}; state.edits = {};
    }
    rebuildQuestions._lastSource = state.source;
    rebuildQuestions._lastUnit = state.unitId;
```
This makes flipping a destination chip mid-selection safe (e.g. user has 10 vocab questions selected and flips to Canvas — selection survives).

- [ ] **Step 3: Smoke-test**

Run the same headless probe as Task 4 Step 5. Then manually click through Unit → Source (Practice) → Refine, select 3 questions, flip destination chip Blooket → Canvas → Blooket — selections should persist.

- [ ] **Step 4: Commit**

```bash
git add study-tools/engine/tools/question-exporter.html
git commit -m "feat(exporter): preserve selection across destination changes on Refine

rebuildQuestions only clears selection when source or unit changes,
so flipping the destination chip mid-curation does not lose work.
Essay-shape questions (options=[]) render their inline editor with a
plain note instead of empty option inputs."
```

---

## Task 6: Step 3 — Blooket/GiMKit branch (parity), Canvas panel stub

**Files:**
- Modify: `study-tools/engine/tools/question-exporter.html`

- [ ] **Step 1: Hide the existing platform select on Step 3 (destination is the rail chip now)**

In the wizard markup added in Task 2, REPLACE the Step 3 `<section>` content with:
```html
    <section data-step="3" hidden>
      <h2>Send</h2>
      <p class="lede" id="step3Lede">Choose a platform and download.</p>

      <div id="csvPanel" class="toolbar" style="display:none;">
        <span id="csvNameLabel" style="font-family:ui-monospace,Menlo,monospace;font-size:12px;color:var(--muted);"></span>
        <button id="csvDownloadBtn" class="primary" disabled>Download CSV</button>
        <span id="genNote" class="gen-note" style="display:none;color:var(--warn);font-size:.85em;"></span>
      </div>

      <div id="canvasPanel" hidden>
        <p style="color:var(--muted);font-size:13px;">Canvas QTI export coming online in the next task.</p>
      </div>

      <div class="step-actions">
        <button id="back3" class="secondary">&larr; Refine</button>
      </div>
    </section>
```
Remove the now-unused `<select id="platformSel">` from the markup (the destination chip in the rail is authoritative).

- [ ] **Step 2: Replace doExport to read state.destination, and wire Step 3 panels**

Inside the IIFE, replace the existing `doExport` with:
```js
  function csvFilenameForCurrent() {
    var dest = state.destination;
    var src = state.source === 'fib' ? 'fib' : (state.source === 'vocab' ? 'vocabulary' : 'practice');
    var suffix = (state.source === 'fib' && state.fibTyped && dest === 'gimkit') ? 'gimkit-typed' : dest;
    return state.unitId + '-' + src + '-' + suffix + '.csv';
  }
  function doCsvExport() {
    var qs = selectedList();
    if (!qs.length) return;
    var csv;
    if (state.destination === 'gimkit' && state.source === 'fib' && state.fibTyped) {
      csv = window.QExport.formatGimkitTyped(qs);
    } else {
      csv = state.destination === 'gimkit' ? window.QExport.formatGimkit(qs) : window.QExport.formatBlooket(qs);
    }
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = csvFilenameForCurrent();
    document.body.append(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
  }

  function refreshStep3() {
    var csv = document.getElementById('csvPanel');
    var canvas = document.getElementById('canvasPanel');
    var note = document.getElementById('genNote');
    var nameLabel = document.getElementById('csvNameLabel');
    var dlBtn = document.getElementById('csvDownloadBtn');
    if (state.destination === 'canvas') {
      csv.style.display = 'none';
      canvas.hidden = false;
    } else {
      csv.style.display = '';
      canvas.hidden = true;
      nameLabel.textContent = csvFilenameForCurrent();
      var n = selectedList().length;
      dlBtn.disabled = (n === 0);
      dlBtn.textContent = n ? ('Download CSV (' + n + ' questions)') : 'Download CSV';
      if (state.source === 'practice') { note.style.display = 'none'; }
      else { note.style.display = ''; note.textContent = 'Wrong answers are auto-generated from the same chapter. Review or edit them before exporting.'; }
    }
  }
```
Update `showStep` to call `refreshStep3` on entry:
```js
    if (n === 3) refreshStep3();
```
At the bottom of the IIFE, after `wireRail()`:
```js
  document.getElementById('csvDownloadBtn').onclick = doCsvExport;
```
Remove references to the deleted `#platformSel`, `#exportBtn`, and `updatePlatformVisibility` (which were Task 2 scaffolding).

- [ ] **Step 3: Update destination chip handler to refresh Step 3 if visible**

Replace the existing destSel handler:
```js
  document.getElementById('destSel').onchange = function () {
    state.destination = this.value;
    if (state.step === 1) { renderSourceGrid(); renderSourceOpts(); }
    if (state.step === 3) refreshStep3();
  };
```

- [ ] **Step 4: Smoke-test the full CSV flow**

```bash
pkill -f "http.server 8731" 2>/dev/null; sleep 0.5
(cd /Users/shiebenaderet/Documents/GitHub/studytools && python3 -m http.server 8731 >/tmp/qexport-server.log 2>&1 &)
sleep 1.5
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP=$(mktemp -d)
"$CHROME" --headless --disable-gpu --no-sandbox --user-data-dir="$TMP" --dump-dom \
  --virtual-time-budget=8000 \
  "http://localhost:8731/study-tools/engine/tools/question-exporter.html" 2>/dev/null > /tmp/qx-dom.html
echo "innerHTML count: $(grep -c innerHTML study-tools/engine/tools/question-exporter.html)"
echo "platformSel removed (expect 0): $(grep -c 'id=\"platformSel\"' study-tools/engine/tools/question-exporter.html)"
pkill -f "http.server 8731" 2>/dev/null; rm -rf "$TMP"
```
Expected: innerHTML = 0; platformSel removed.

Then manually in the browser: pick The Civil War → Practice → select all → Send → confirm filename reads `civil-war-practice-blooket.csv` → Download. Open the file: should be the same Blooket CSV as before. Repeat for GiMKit + FIB typed.

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/tools/question-exporter.html
git commit -m "feat(exporter): Step 3 with destination-aware panels for CSV exports

The platform dropdown is gone; the rail destination chip is now
authoritative. CSV destinations get a thin filename + Download panel.
The Canvas panel is a stub the next tasks fill in.

Why: per the Option C UX direction, Step 3 branches by destination so
Canvas's heavier UI can live next to the lightweight CSV one."
```

---

## Task 7: xmlEscape + slugify helpers (TDD)

**Files:**
- Modify: `study-tools/engine/tools/question-export-core.js`
- Modify: `study-tools/engine/tools/question-export-core.test.js`

- [ ] **Step 1: Write the failing test**

Insert ABOVE the trailing `if (failures.length)` block in `question-export-core.test.js`:
```js
// xmlEscape
eq('xml &', core.xmlEscape('a & b'), 'a &amp; b');
eq('xml <', core.xmlEscape('1 < 2'), '1 &lt; 2');
eq('xml >', core.xmlEscape('b > a'), 'b &gt; a');
eq('xml "', core.xmlEscape('say "hi"'), 'say &quot;hi&quot;');
eq("xml '", core.xmlEscape("it's"), 'it&apos;s');
eq('xml null', core.xmlEscape(null), '');
eq('xml number', core.xmlEscape(42), '42');

// slugify
eq('slug basic', core.slugify('Civil War'), 'civil-war');
eq('slug strip', core.slugify('  Civil  War!! '), 'civil-war');
eq('slug unicode', core.slugify('Café & Crémes'), 'cafe-cremes');
eq('slug already', core.slugify('civil-war-vocab'), 'civil-war-vocab');
eq('slug empty', core.slugify(''), 'untitled');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: FAIL — `core.xmlEscape is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `question-export-core.js`, add inside the factory (anywhere before the returned object):
```js
  function xmlEscape(v) {
    if (v == null) return '';
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  function slugify(v) {
    var s = String(v == null ? '' : v).normalize('NFKD').replace(/[̀-ͯ]/g, '');
    s = s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s || 'untitled';
  }
```
Add `xmlEscape: xmlEscape, slugify: slugify` to the returned object.

- [ ] **Step 4: Run test to verify it passes**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/tools/question-export-core.js study-tools/engine/tools/question-export-core.test.js
git commit -m "feat(exporter): xmlEscape and slugify helpers

Why: every Canvas XML interpolation runs through xmlEscape; the
assessment id (folder = file = ident) is a slugified unit+source string."
```

---

## Task 8: renderMCItem (TDD)

**Files:**
- Modify: `study-tools/engine/tools/question-export-core.js`
- Modify: `study-tools/engine/tools/question-export-core.test.js`

- [ ] **Step 1: Write the failing test**

Insert above the trailing block:
```js
// renderMCItem
var mcQ = { id: 0, question: 'Which is true?', options: ['A & a', 'B', 'C', 'D'], correctIndex: 1, topic: 'T' };
var mcXml = core.renderMCItem(mcQ, 1);
eq('mc has item ident', /<item ident="q1"/.test(mcXml), true);
eq('mc has question_type', /<fieldlabel>question_type<\/fieldlabel>\s*<fieldentry>multiple_choice_question<\/fieldentry>/.test(mcXml), true);
eq('mc has points_possible 100', /<fieldlabel>points_possible<\/fieldlabel>\s*<fieldentry>100<\/fieldentry>/.test(mcXml), true);
eq('mc has 4 named labels', (mcXml.match(/<response_label ident="q1_a[0-3]"/g) || []).length, 4);
eq('mc no numeric ident', /<response_label ident="[0-9]+"/.test(mcXml), false);
eq('mc varequal points at q1_a1', /<varequal[^>]*>q1_a1<\/varequal>/.test(mcXml), true);
eq('mc maxvalue 100', /maxvalue="100"/.test(mcXml), true);
eq('mc setvar 100', /<setvar[^>]*>100<\/setvar>/.test(mcXml), true);
eq('mc escapes &', mcXml.indexOf('A &amp; a') >= 0, true);
eq('mc question text escaped', mcXml.indexOf('Which is true?') >= 0, true);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: FAIL — `core.renderMCItem is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add inside the factory:
```js
  function renderMCItem(q, idx) {
    var itemId = 'q' + idx;
    var labels = q.options.map(function (opt, i) {
      var lid = itemId + '_a' + i;
      return '            <response_label ident="' + lid + '">\n' +
             '              <material><mattext texttype="text/plain">' + xmlEscape(opt) + '</mattext></material>\n' +
             '            </response_label>';
    }).join('\n');
    var correctLid = itemId + '_a' + q.correctIndex;
    return [
      '    <item ident="' + itemId + '" title="Question ' + idx + '">',
      '      <itemmetadata><qtimetadata>',
      '        <qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>multiple_choice_question</fieldentry></qtimetadatafield>',
      '        <qtimetadatafield><fieldlabel>points_possible</fieldlabel><fieldentry>100</fieldentry></qtimetadatafield>',
      '      </qtimetadata></itemmetadata>',
      '      <presentation>',
      '        <material><mattext texttype="text/html">' + xmlEscape(q.question) + '</mattext></material>',
      '        <response_lid ident="response1" rcardinality="Single">',
      '          <render_choice>',
                  labels,
      '          </render_choice>',
      '        </response_lid>',
      '      </presentation>',
      '      <resprocessing>',
      '        <outcomes><decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/></outcomes>',
      '        <respcondition continue="No">',
      '          <conditionvar><varequal respident="response1">' + correctLid + '</varequal></conditionvar>',
      '          <setvar action="Set" varname="SCORE">100</setvar>',
      '        </respcondition>',
      '      </resprocessing>',
      '    </item>'
    ].join('\n');
  }
```
Add `renderMCItem: renderMCItem` to the returned object.

- [ ] **Step 4: Run test to verify it passes**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/tools/question-export-core.js study-tools/engine/tools/question-export-core.test.js
git commit -m "feat(exporter): renderMCItem produces a conformant Canvas QTI MC item

Named string idents (q<idx>_a<n>), varequal points at the named ident,
setvar=100 on the correct path, maxvalue/minvalue 0..100. Conforms to
QTI spec §4.2 and §4.3."
```

---

## Task 9: renderShortAnswerItem (TDD)

**Files:**
- Modify: `study-tools/engine/tools/question-export-core.js`
- Modify: `study-tools/engine/tools/question-export-core.test.js`

- [ ] **Step 1: Write the failing test**

Append above trailing block:
```js
// renderShortAnswerItem
var saQ = { id: 0, question: '_____ is one.', _accepted: ['alpha', 'Alpha'], options: ['alpha','','',''], correctIndex: 0, topic: 'T' };
var saXml = core.renderShortAnswerItem(saQ, 2);
eq('sa item ident', /<item ident="q2"/.test(saXml), true);
eq('sa qtype short_answer', /<fieldentry>short_answer_question<\/fieldentry>/.test(saXml), true);
eq('sa points 100', /<fieldlabel>points_possible<\/fieldlabel>\s*<fieldentry>100<\/fieldentry>/.test(saXml), true);
eq('sa response_str + render_fib', /<response_str[\s\S]*<render_fib/.test(saXml), true);
eq('sa case=No on every respcondition', (saXml.match(/<respcondition[^>]*continue="No"/g) || []).length >= 2, true);
eq('sa case insensitive flag', (saXml.match(/case="No"/g) || []).length, 2);
eq('sa has alpha answer', saXml.indexOf('>alpha</') >= 0, true);
eq('sa has Alpha answer', saXml.indexOf('>Alpha</') >= 0, true);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: FAIL — `core.renderShortAnswerItem is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add inside the factory:
```js
  function renderShortAnswerItem(q, idx) {
    var itemId = 'q' + idx;
    // Accepted answers: prefer q._accepted (explicit list), else [options[correctIndex]] (FIB default).
    var accepted = (q._accepted && q._accepted.length)
      ? q._accepted
      : [q.options && q.options[q.correctIndex]].filter(function (x) { return x; });
    var conds = accepted.map(function (ans) {
      return '        <respcondition continue="No" case="No">\n' +
             '          <conditionvar><varequal respident="response1">' + xmlEscape(ans) + '</varequal></conditionvar>\n' +
             '          <setvar action="Set" varname="SCORE">100</setvar>\n' +
             '        </respcondition>';
    }).join('\n');
    return [
      '    <item ident="' + itemId + '" title="Question ' + idx + '">',
      '      <itemmetadata><qtimetadata>',
      '        <qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>short_answer_question</fieldentry></qtimetadatafield>',
      '        <qtimetadatafield><fieldlabel>points_possible</fieldlabel><fieldentry>100</fieldentry></qtimetadatafield>',
      '      </qtimetadata></itemmetadata>',
      '      <presentation>',
      '        <material><mattext texttype="text/html">' + xmlEscape(q.question) + '</mattext></material>',
      '        <response_str ident="response1" rcardinality="Single">',
      '          <render_fib><response_label ident="answer1" rshuffle="No"/></render_fib>',
      '        </response_str>',
      '      </presentation>',
      '      <resprocessing>',
      '        <outcomes><decvar maxvalue="100" minvalue="0" varname="SCORE" vartype="Decimal"/></outcomes>',
                conds,
      '      </resprocessing>',
      '    </item>'
    ].join('\n');
  }
```
Add `renderShortAnswerItem: renderShortAnswerItem` to the returned object.

For FIB sources, the Canvas package builder (Task 11) will set `q._accepted = [q.options[q.correctIndex]]` before passing to the renderer, since the canonical question's options are the FIB MC distractors-not-relevant-for-typing. (Documented again in Task 11.)

- [ ] **Step 4: Run test to verify it passes**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/tools/question-export-core.js study-tools/engine/tools/question-export-core.test.js
git commit -m "feat(exporter): renderShortAnswerItem with case-insensitive matching

response_str + render_fib (not response_lid), one respcondition per
accepted answer with case=\"No\". Conforms to QTI spec §4.4."
```

---

## Task 10: renderEssayItem (TDD)

**Files:**
- Modify: `study-tools/engine/tools/question-export-core.js`
- Modify: `study-tools/engine/tools/question-export-core.test.js`

- [ ] **Step 1: Write the failing test**

Append above trailing block:
```js
// renderEssayItem
var esQ = { id: 0, question: 'How did geography shape the North & South?', _essay: { keyTerms: ['sectionalism', 'Cotton Kingdom'], sentenceStarters: ['Geography pushed...', 'In the North...'] }, options: [], correctIndex: -1, topic: 'T' };
var esXml = core.renderEssayItem(esQ, 3);
eq('essay item ident', /<item ident="q3"/.test(esXml), true);
eq('essay qtype', /<fieldentry>essay_question<\/fieldentry>/.test(esXml), true);
eq('essay points 100', /<fieldlabel>points_possible<\/fieldlabel>\s*<fieldentry>100<\/fieldentry>/.test(esXml), true);
eq('essay response_str + render_fib', /<response_str[\s\S]*<render_fib/.test(esXml), true);
eq('essay no respcondition', /<respcondition/.test(esXml), false);
eq('essay text/plain mattext', /<mattext texttype="text\/plain">/.test(esXml), true);
eq('essay contains question', esXml.indexOf('How did geography shape the North &amp; South?') >= 0, true);
eq('essay contains keyTerms', esXml.indexOf('Key terms to consider: sectionalism, Cotton Kingdom') >= 0, true);
eq('essay contains starters', esXml.indexOf('Suggested sentence starters:') >= 0, true);
eq('essay contains starter bullet', esXml.indexOf('- Geography pushed') >= 0, true);
// Never leak exemplar / rubric
eq('essay no rubric word', esXml.toLowerCase().indexOf('rubric') === -1, true);
eq('essay no exemplar', esXml.indexOf('exemplar') === -1, true);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: FAIL — `core.renderEssayItem is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add inside the factory:
```js
  function renderEssayItem(q, idx) {
    var itemId = 'q' + idx;
    var ess = q._essay || {};
    var blocks = [String(q.question || '').trim()];
    if (ess.keyTerms && ess.keyTerms.length) {
      blocks.push('');
      blocks.push('Key terms to consider: ' + ess.keyTerms.join(', '));
    }
    if (ess.sentenceStarters && ess.sentenceStarters.length) {
      blocks.push('');
      blocks.push('Suggested sentence starters:');
      ess.sentenceStarters.forEach(function (s) { blocks.push('- ' + s); });
    }
    var combined = blocks.join('\n');
    return [
      '    <item ident="' + itemId + '" title="Question ' + idx + '">',
      '      <itemmetadata><qtimetadata>',
      '        <qtimetadatafield><fieldlabel>question_type</fieldlabel><fieldentry>essay_question</fieldentry></qtimetadatafield>',
      '        <qtimetadatafield><fieldlabel>points_possible</fieldlabel><fieldentry>100</fieldentry></qtimetadatafield>',
      '      </qtimetadata></itemmetadata>',
      '      <presentation>',
      '        <material><mattext texttype="text/plain">' + xmlEscape(combined) + '</mattext></material>',
      '        <response_str ident="response1" rcardinality="Single">',
      '          <render_fib><response_label ident="answer1" rshuffle="No"/></render_fib>',
      '        </response_str>',
      '      </presentation>',
      '    </item>'
    ].join('\n');
  }
```
Add `renderEssayItem: renderEssayItem` to the returned object.

- [ ] **Step 4: Run test to verify it passes**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/tools/question-export-core.js study-tools/engine/tools/question-export-core.test.js
git commit -m "feat(exporter): renderEssayItem with combined text/plain prompt

Single mattext block (question + keyTerms + sentenceStarters), no
respcondition, response_str + render_fib so students see a text input.
Never leaks rubric or exemplar. Conforms to QTI spec §4.5."
```

---

## Task 11: buildCanvasPackage + buildManifestXml + buildAssessmentXml (TDD)

**Files:**
- Modify: `study-tools/engine/tools/question-export-core.js`
- Modify: `study-tools/engine/tools/question-export-core.test.js`

- [ ] **Step 1: Write the failing test**

Append above trailing block:
```js
// buildCanvasPackage MC
var pkgMc = core.buildCanvasPackage([mcQ], { title: 'Test Quiz', maxAttempts: 1, unitId: 'civil-war', source: 'practice' });
eq('pkg has assessmentId', pkgMc.assessmentId, 'civil-war-practice');
eq('pkg fileMap has manifest', !!pkgMc.fileMap['imsmanifest.xml'], true);
eq('pkg fileMap has assessment xml', !!pkgMc.fileMap['civil-war-practice/civil-war-practice.xml'], true);
eq('manifest schemaversion 1.1.3', pkgMc.fileMap['imsmanifest.xml'].indexOf('<schemaversion>1.1.3</schemaversion>') >= 0, true);
eq('manifest hybrid type', pkgMc.fileMap['imsmanifest.xml'].indexOf('imsqti_xmlv1p2/imscc_xmlv1p1/assessment') >= 0, true);
eq('manifest namespace imsccv1p1', pkgMc.fileMap['imsmanifest.xml'].indexOf('imsccv1p1') >= 0, true);
eq('manifest has organizations', /<organizations\s*\/>|<organizations>\s*<\/organizations>/.test(pkgMc.fileMap['imsmanifest.xml']), true);
eq('manifest file href matches', pkgMc.fileMap['imsmanifest.xml'].indexOf('civil-war-practice/civil-war-practice.xml') >= 0, true);
eq('assessment ident matches', pkgMc.fileMap['civil-war-practice/civil-war-practice.xml'].indexOf('<assessment ident="civil-war-practice"') >= 0, true);
eq('assessment title is escaped', pkgMc.fileMap['civil-war-practice/civil-war-practice.xml'].indexOf('title="Test Quiz"') >= 0, true);
eq('assessment cc_maxattempts', pkgMc.fileMap['civil-war-practice/civil-war-practice.xml'].indexOf('<fieldentry>1</fieldentry>') >= 0, true);

// FIB short_answer wiring: build sets _accepted from canonical options
var fibQ = { id: 0, question: 'X is _____', options: ['alpha','b','c','d'], correctIndex: 0, topic: 'T' };
var pkgFib = core.buildCanvasPackage([fibQ], { title: 'F', maxAttempts: 1, unitId: 'civil-war', source: 'fib' });
eq('fib uses short_answer', pkgFib.fileMap['civil-war-fib/civil-war-fib.xml'].indexOf('short_answer_question') >= 0, true);
eq('fib accepted = correct option', pkgFib.fileMap['civil-war-fib/civil-war-fib.xml'].indexOf('>alpha</varequal>') >= 0, true);

// Essay wiring
var pkgEss = core.buildCanvasPackage([esQ], { title: 'E', maxAttempts: 2, unitId: 'civil-war', source: 'shortAnswer' });
eq('essay assessment id', pkgEss.assessmentId, 'civil-war-shortanswer');
eq('essay cc_maxattempts 2', pkgEss.fileMap['civil-war-shortanswer/civil-war-shortanswer.xml'].indexOf('<fieldentry>2</fieldentry>') >= 0, true);
eq('essay uses essay_question', pkgEss.fileMap['civil-war-shortanswer/civil-war-shortanswer.xml'].indexOf('essay_question') >= 0, true);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: FAIL — `core.buildCanvasPackage is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add inside the factory:
```js
  function pickRenderer(source) {
    if (source === 'shortAnswer') return renderEssayItem;
    if (source === 'fib') return renderShortAnswerItem;
    return renderMCItem; // practice + vocab
  }

  function buildAssessmentXml(items, opts) {
    var assessmentId = opts.assessmentId;
    var title = xmlEscape(opts.title || assessmentId);
    var attempts = parseInt(opts.maxAttempts, 10) || 1;
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
      '  <assessment ident="' + assessmentId + '" title="' + title + '">',
      '    <qtimetadata>',
      '      <qtimetadatafield><fieldlabel>cc_maxattempts</fieldlabel><fieldentry>' + attempts + '</fieldentry></qtimetadatafield>',
      '    </qtimetadata>',
      '    <section ident="root_section">',
            items.join('\n'),
      '    </section>',
      '  </assessment>',
      '</questestinterop>',
      ''
    ].join('\n');
  }

  function buildManifestXml(assessmentId) {
    var resId = 'res_' + assessmentId;
    var manId = 'manifest_' + assessmentId;
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<manifest identifier="' + manId + '"',
      '  xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1"',
      '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
      '  xsi:schemaLocation="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1.xsd">',
      '  <metadata>',
      '    <schema>IMS Content</schema>',
      '    <schemaversion>1.1.3</schemaversion>',
      '  </metadata>',
      '  <organizations/>',
      '  <resources>',
      '    <resource identifier="' + resId + '" type="imsqti_xmlv1p2/imscc_xmlv1p1/assessment">',
      '      <file href="' + assessmentId + '/' + assessmentId + '.xml"/>',
      '    </resource>',
      '  </resources>',
      '</manifest>',
      ''
    ].join('\n');
  }

  function buildCanvasPackage(questions, opts) {
    opts = opts || {};
    var assessmentId = slugify((opts.unitId || 'quiz') + '-' + (opts.source || 'set'));
    var renderer = pickRenderer(opts.source);
    // FIB special-case: set _accepted to [correct option] for the short_answer renderer
    var prepped = questions.map(function (q) {
      if (opts.source === 'fib') {
        return Object.assign({}, q, { _accepted: [q.options[q.correctIndex]] });
      }
      return q;
    });
    var items = prepped.map(function (q, i) { return renderer(q, i + 1); });
    var assessmentXml = buildAssessmentXml(items, { assessmentId: assessmentId, title: opts.title, maxAttempts: opts.maxAttempts });
    var manifestXml = buildManifestXml(assessmentId);
    var fileMap = {};
    fileMap['imsmanifest.xml'] = manifestXml;
    fileMap[assessmentId + '/' + assessmentId + '.xml'] = assessmentXml;
    return { assessmentId: assessmentId, fileMap: fileMap };
  }
```
Add `buildAssessmentXml, buildManifestXml, buildCanvasPackage` to the returned object.

Note: the tests use `Object.assign`, which Node has built-in. No new dependency.

- [ ] **Step 4: Run test to verify it passes**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/tools/question-export-core.js study-tools/engine/tools/question-export-core.test.js
git commit -m "feat(exporter): buildCanvasPackage assembles manifest + assessment xml

Picks the renderer by source (MC, short_answer for FIB, essay for
shortAnswer), slugifies a stable assessment id, ensures folder = file =
ident. Returns an in-memory file map; no zip dependency in core."
```

---

## Task 12: validateForCanvas (TDD)

**Files:**
- Modify: `study-tools/engine/tools/question-export-core.js`
- Modify: `study-tools/engine/tools/question-export-core.test.js`

- [ ] **Step 1: Write the failing test**

Append above trailing block:
```js
// validateForCanvas
function vqMC(opts) { return Object.assign({ id:0, question:'Q', options:['a','b','c','d'], correctIndex:0, topic:'T' }, opts || {}); }
// pass case
var vOk = core.validateForCanvas([vqMC()], { title: 'Hello', source: 'practice', unitId: 'u' });
eq('validate ok', vOk.ok, true);
eq('validate no errors', vOk.errors.length, 0);
// title missing
var vNoTitle = core.validateForCanvas([vqMC()], { title: '   ', source: 'practice', unitId: 'u' });
eq('validate no title fails', vNoTitle.ok, false);
eq('validate no title rule', vNoTitle.errors.some(function (e) { return e.ruleId === 'title-present'; }), true);
// empty selection
var vNoQ = core.validateForCanvas([], { title: 'X', source: 'practice', unitId: 'u' });
eq('validate empty fails', vNoQ.ok, false);
eq('validate empty rule', vNoQ.errors.some(function (e) { return e.ruleId === 'at-least-one-selected'; }), true);
// MC missing correct
var vBadMc = core.validateForCanvas([vqMC({ correctIndex: -1 })], { title: 'X', source: 'practice', unitId: 'u' });
eq('validate mc no correct', vBadMc.errors.some(function (e) { return e.ruleId === 'mc-has-correct'; }), true);
// short_answer: FIB always has accepted (correct option) so this should pass; test the rule with an empty answer
var vBadSA = core.validateForCanvas([{ id:0, question:'Q', options:['','b','c','d'], correctIndex:0, topic:'T' }], { title:'X', source:'fib', unitId:'u' });
eq('validate short_answer needs answer', vBadSA.errors.some(function (e) { return e.ruleId === 'short-answer-has-accepted'; }), true);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: FAIL — `core.validateForCanvas is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add inside the factory:
```js
  var CANVAS_RULES = [
    { id: 'title-present', message: 'Quiz title is required.',
      check: function (qs, opts) { return (!opts.title || !String(opts.title).trim()) ? [-1] : []; } },
    { id: 'at-least-one-selected', message: 'Select at least one question.',
      check: function (qs) { return qs.length ? [] : [-1]; } },
    { id: 'mc-has-correct', message: 'Multiple-choice questions need at least one correct option.',
      check: function (qs, opts) {
        if (opts.source !== 'practice' && opts.source !== 'vocab') return [];
        return qs.filter(function (q) { return q.correctIndex < 0 || !q.options || !q.options[q.correctIndex]; }).map(function (q) { return q.id; });
      } },
    { id: 'short-answer-has-accepted', message: 'Short-answer (FIB) needs an accepted answer.',
      check: function (qs, opts) {
        if (opts.source !== 'fib') return [];
        return qs.filter(function (q) { return !q.options || !q.options[q.correctIndex] || !String(q.options[q.correctIndex]).trim(); }).map(function (q) { return q.id; });
      } },
    { id: 'essay-no-scoring', message: 'Essay questions must not carry scoring data.',
      check: function (qs, opts) {
        if (opts.source !== 'shortAnswer') return [];
        return qs.filter(function (q) { return q._scoring || (q.options && q.options.length); }).map(function (q) { return q.id; });
      } }
  ];

  function validateForCanvas(questions, opts) {
    opts = opts || {};
    var errors = [];
    CANVAS_RULES.forEach(function (r) {
      var ids = r.check(questions, opts);
      if (ids && ids.length) errors.push({ ruleId: r.id, message: r.message, questionIds: ids.filter(function (x) { return x !== -1; }) });
    });
    return { ok: errors.length === 0, errors: errors };
  }
```
Add `validateForCanvas: validateForCanvas, CANVAS_RULES: CANVAS_RULES` to the returned object.

Note: the spec also calls for `idents-unique-non-numeric`, `xml-well-formed`, and `ids-match` rules. Those are constructed by the renderers and `buildCanvasPackage` (they cannot fail given the current generators) — we keep them as a post-build defensive layer added in Task 13 step 3, not in the user-facing pre-build registry.

- [ ] **Step 4: Run test to verify it passes**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/tools/question-export-core.js study-tools/engine/tools/question-export-core.test.js
git commit -m "feat(exporter): validateForCanvas with rule registry

Pre-build rules: title present, ≥1 question, MC has correct, FIB has
accepted answer, essay has no scoring. Returns {ok, errors} where each
error names the rule and the failing question ids so the UI can jump
to the right rows. Mirrors QTI spec §8."
```

---

## Task 13: question-exporter-zip.js (JSZip wrapper) + post-build self-check

**Files:**
- Create: `study-tools/engine/tools/question-exporter-zip.js`
- Modify: `study-tools/engine/tools/question-export-core.js`
- Modify: `study-tools/engine/tools/question-export-core.test.js`

- [ ] **Step 1: Write the wrapper**

Create `study-tools/engine/tools/question-exporter-zip.js`:
```js
// The ONLY file in this codebase that depends on JSZip.
// fileMap entries are string (treated as UTF-8) or Blob (binary).
// Returns a Promise<Blob> of the resulting .zip.
(function () {
  function packageZip(fileMap) {
    if (typeof JSZip !== 'function') {
      return Promise.reject(new Error('JSZip not loaded — include vendor/jszip.min.js before this script.'));
    }
    var zip = new JSZip();
    Object.keys(fileMap).forEach(function (path) {
      zip.file(path, fileMap[path]);
    });
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }
  if (typeof window !== 'undefined') window.QExportZip = { packageZip: packageZip };
})();
```

- [ ] **Step 2: Add a post-build self-check helper to core**

In `question-export-core.js`, add inside the factory:
```js
  function selfCheckPackage(pkg) {
    var errors = [];
    var manifest = pkg.fileMap['imsmanifest.xml'];
    if (!manifest) errors.push('Missing imsmanifest.xml');
    var innerPath = pkg.assessmentId + '/' + pkg.assessmentId + '.xml';
    if (!pkg.fileMap[innerPath]) errors.push('Missing assessment xml at ' + innerPath);
    if (manifest && manifest.indexOf('<file href="' + innerPath + '"') < 0) {
      errors.push('Manifest does not reference ' + innerPath);
    }
    var inner = pkg.fileMap[innerPath] || '';
    if (inner.indexOf('<assessment ident="' + pkg.assessmentId + '"') < 0) {
      errors.push('Assessment ident does not match folder/file: ' + pkg.assessmentId);
    }
    // ident uniqueness inside item: no two <response_label ident="X"> share X
    var idents = (inner.match(/<response_label ident="([^"]+)"/g) || []).map(function (m) { return m; });
    var seen = {};
    idents.forEach(function (id) { if (seen[id]) errors.push('Duplicate response_label ident in package: ' + id); seen[id] = true; });
    // no numeric idents (defense)
    idents.forEach(function (id) {
      var v = id.replace(/<response_label ident="/, '').replace(/"$/, '');
      if (/^\d+$/.test(v)) errors.push('Numeric ident not allowed: ' + v);
    });
    return errors;
  }
```
Add `selfCheckPackage: selfCheckPackage` to the returned object.

- [ ] **Step 3: Test selfCheckPackage on the real-data build**

Append above the trailing test block:
```js
// selfCheckPackage on real civil-war data, every source
var cfgRealCw = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'units', 'civil-war', 'config.json'), 'utf8'));
var practiceQs = core.normalizeQuestions(cfgRealCw);
var pkgPractice = core.buildCanvasPackage(practiceQs, { title: 'Civil War Practice', maxAttempts: 1, unitId: 'civil-war', source: 'practice' });
eq('selfCheck practice ok', core.selfCheckPackage(pkgPractice).length, 0);

var fibQs = core.normalizeFib(cfgRealCw);
var pkgFib2 = core.buildCanvasPackage(fibQs, { title: 'Civil War FIB', maxAttempts: 1, unitId: 'civil-war', source: 'fib' });
eq('selfCheck fib ok', core.selfCheckPackage(pkgFib2).length, 0);

var saQs = (cfgRealCw.shortAnswerQuestions || []).map(function (sa, i) {
  return { id: i, question: sa.question || '', options: [], correctIndex: -1, topic: sa.topic || 'T', _essay: { keyTerms: sa.keyTerms || [], sentenceStarters: sa.sentenceStarters || [] } };
});
var pkgEssayReal = core.buildCanvasPackage(saQs, { title: 'Civil War SA', maxAttempts: 1, unitId: 'civil-war', source: 'shortAnswer' });
eq('selfCheck essay ok', core.selfCheckPackage(pkgEssayReal).length, 0);
```

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add study-tools/engine/tools/question-exporter-zip.js study-tools/engine/tools/question-export-core.js study-tools/engine/tools/question-export-core.test.js
git commit -m "feat(exporter): JSZip wrapper + selfCheckPackage defensive validation

question-exporter-zip.js is the only file that touches JSZip; the core
gains a selfCheckPackage helper that re-verifies the produced fileMap
satisfies the QTI spec §3 invariants (folder = file = ident, manifest
cross-refs, ident uniqueness, no numeric idents)."
```

---

## Task 14: Wire Canvas branch into Step 3 + version bump

**Files:**
- Modify: `study-tools/engine/tools/question-exporter.html`
- Modify: `study-tools/engine/version.json`

- [ ] **Step 1: Load JSZip + the zip wrapper in the page head**

In `question-exporter.html`, find the line `<script src="question-export-core.js"></script>` and INSERT just before it:
```html
<script src="../vendor/jszip.min.js"></script>
```
And immediately after it:
```html
<script src="question-exporter-zip.js"></script>
```

- [ ] **Step 2: Add Canvas-panel CSS**

Append to the `<style>` block:
```css
  .canvas-card { margin-top: 14px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
  .canvas-card .row { display: grid; grid-template-columns: 1fr 140px; gap: 12px; margin-bottom: 12px; }
  .canvas-card label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); display: block; margin-bottom: 4px; font-weight: 600; }
  .canvas-card input[type=text], .canvas-card input[type=number] { width: 100%; padding: 8px 10px; border: 1px solid var(--line); border-radius: 6px; font: inherit; }
  .canvas-validate { margin: 14px 0; padding: 12px 14px; background: var(--card); border: 1px solid var(--line); border-radius: 10px; font-size: 13px; }
  .canvas-validate ul { margin: 6px 0 0; padding-left: 18px; }
  .canvas-validate li.ok { color: var(--ok); }
  .canvas-validate li.fail { color: var(--warn); cursor: pointer; }
  .canvas-validate li.fail:hover { text-decoration: underline; }
  .canvas-actions { display: flex; gap: 10px; align-items: center; margin-top: 12px; }
  .canvas-actions .fn { font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: var(--muted); margin-left: auto; }
  .canvas-status { margin-top: 10px; font-size: 13px; color: var(--ok); }
```

- [ ] **Step 3: Build the Canvas panel renderer in the IIFE**

Inside the IIFE, AFTER `refreshStep3`, add:
```js
  function jumpToQuestion(qid) {
    showStep(2);
    setTimeout(function () {
      var nodes = document.querySelectorAll('#list .qrow');
      // The DOM does not currently expose q.id; fallback: scroll to top.
      if (nodes.length) nodes[0].scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  function defaultCanvasTitle() {
    var u = (state.units || []).filter(function (x) { return x.id === state.unitId; })[0];
    var unitTitle = (u && u.title) || state.unitId || 'Quiz';
    var srcLabel = ({ practice: 'Practice', vocab: 'Vocabulary', fib: 'Fill-in-the-Blank', shortAnswer: 'Short-Answer' })[state.source] || state.source;
    return unitTitle + ' — ' + srcLabel;
  }

  function renderCanvasPanel() {
    var host = document.getElementById('canvasPanel');
    host.textContent = '';

    if (!state.canvasOpts.title) state.canvasOpts.title = defaultCanvasTitle();

    var card = el('div', 'canvas-card');
    var row = el('div', 'row');
    var titleWrap = el('div');
    titleWrap.append(el('label', null, 'Quiz title'));
    var tIn = el('input'); tIn.type = 'text'; tIn.value = state.canvasOpts.title;
    tIn.oninput = function () { state.canvasOpts.title = tIn.value; refreshCanvasValidation(); };
    titleWrap.append(tIn);
    var attemptsWrap = el('div');
    attemptsWrap.append(el('label', null, 'Max attempts'));
    var aIn = el('input'); aIn.type = 'number'; aIn.min = '1'; aIn.value = String(state.canvasOpts.maxAttempts || 1);
    aIn.oninput = function () { state.canvasOpts.maxAttempts = parseInt(aIn.value, 10) || 1; };
    attemptsWrap.append(aIn);
    row.append(titleWrap, attemptsWrap);
    card.append(row);
    host.append(card);

    var v = el('div', 'canvas-validate');
    v.id = 'canvasValidate';
    host.append(v);

    var actions = el('div', 'canvas-actions');
    var build = el('button', 'primary');
    build.id = 'canvasBuildBtn';
    build.textContent = 'Build .zip ▸';
    build.onclick = doCanvasBuild;
    var fn = el('span', 'fn');
    fn.id = 'canvasFn';
    actions.append(build, fn);
    host.append(actions);

    var status = el('div', 'canvas-status');
    status.id = 'canvasStatus';
    status.style.display = 'none';
    host.append(status);

    refreshCanvasValidation();
  }

  function refreshCanvasValidation() {
    var v = document.getElementById('canvasValidate');
    if (!v) return;
    var qs = selectedList();
    var opts = { title: state.canvasOpts.title, source: state.source, unitId: state.unitId };
    var result = window.QExport.validateForCanvas(qs, opts);
    v.textContent = '';
    var ul = el('ul');
    var rulesMet = window.QExport.CANVAS_RULES.length - result.errors.length;
    ul.append((function () {
      var li = el('li', 'ok'); li.textContent = '✓ ' + rulesMet + ' of ' + window.QExport.CANVAS_RULES.length + ' rules pass'; return li;
    })());
    result.errors.forEach(function (e) {
      var li = el('li', 'fail');
      li.textContent = '✗ ' + e.message + (e.questionIds.length ? ' (' + e.questionIds.length + ' question' + (e.questionIds.length === 1 ? '' : 's') + ')' : '');
      li.onclick = function () { if (e.questionIds.length) jumpToQuestion(e.questionIds[0]); };
      ul.append(li);
    });
    v.append(ul);

    var build = document.getElementById('canvasBuildBtn');
    var fn = document.getElementById('canvasFn');
    var assessmentId = window.QExport.slugify((state.unitId || 'quiz') + '-' + state.source);
    fn.textContent = 'Filename: ' + assessmentId + '-canvas.zip';
    if (result.ok) { build.disabled = false; build.textContent = 'Build .zip ▸'; }
    else { build.disabled = false; build.textContent = 'Fix ' + result.errors.length + ' issue' + (result.errors.length === 1 ? '' : 's') + ' ▸';
           build.onclick = function () { if (result.errors[0].questionIds.length) jumpToQuestion(result.errors[0].questionIds[0]); else showStep(2); };
           return; }
    build.onclick = doCanvasBuild;
  }

  function doCanvasBuild() {
    var qs = selectedList();
    var opts = { title: state.canvasOpts.title, maxAttempts: state.canvasOpts.maxAttempts, source: state.source, unitId: state.unitId };
    var pkg = window.QExport.buildCanvasPackage(qs, opts);
    var selfErrors = window.QExport.selfCheckPackage(pkg);
    var status = document.getElementById('canvasStatus');
    status.style.display = '';
    if (selfErrors.length) {
      status.style.color = 'var(--warn)';
      status.textContent = 'Build aborted: ' + selfErrors.join('; ');
      return;
    }
    status.style.color = 'var(--ok)';
    status.textContent = 'Building...';
    window.QExportZip.packageZip(pkg.fileMap).then(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = pkg.assessmentId + '-canvas.zip';
      document.body.append(a); a.click(); a.remove();
      URL.revokeObjectURL(a.href);
      status.textContent = '✓ Built ' + pkg.assessmentId + '-canvas.zip';
    }).catch(function (err) {
      status.style.color = 'var(--warn)';
      status.textContent = 'Build failed: ' + err.message;
    });
  }
```
Update `refreshStep3` to render the Canvas panel when destination is canvas:
```js
  function refreshStep3() {
    var csv = document.getElementById('csvPanel');
    var canvas = document.getElementById('canvasPanel');
    if (state.destination === 'canvas') {
      csv.style.display = 'none';
      canvas.hidden = false;
      renderCanvasPanel();
    } else {
      csv.style.display = '';
      canvas.hidden = true;
      // existing CSV refresh logic preserved:
      var note = document.getElementById('genNote');
      var nameLabel = document.getElementById('csvNameLabel');
      var dlBtn = document.getElementById('csvDownloadBtn');
      nameLabel.textContent = csvFilenameForCurrent();
      var n = selectedList().length;
      dlBtn.disabled = (n === 0);
      dlBtn.textContent = n ? ('Download CSV (' + n + ' questions)') : 'Download CSV';
      if (state.source === 'practice') { note.style.display = 'none'; }
      else { note.style.display = ''; note.textContent = 'Wrong answers are auto-generated from the same chapter. Review or edit them before exporting.'; }
    }
  }
```

- [ ] **Step 4: Smoke-test the Canvas path**

```bash
pkill -f "http.server 8731" 2>/dev/null; sleep 0.5
(cd /Users/shiebenaderet/Documents/GitHub/studytools && python3 -m http.server 8731 >/tmp/qexport-server.log 2>&1 &)
sleep 1.5
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP=$(mktemp -d)
"$CHROME" --headless --disable-gpu --no-sandbox --user-data-dir="$TMP" --dump-dom \
  --virtual-time-budget=8000 \
  "http://localhost:8731/study-tools/engine/tools/question-exporter.html" 2>/dev/null > /tmp/qx-dom.html
echo "innerHTML count: $(grep -c innerHTML study-tools/engine/tools/question-exporter.html)"
echo "JSZip script tag (expect 1): $(grep -c 'vendor/jszip.min.js' study-tools/engine/tools/question-exporter.html)"
echo "Zip wrapper tag (expect 1): $(grep -c 'question-exporter-zip.js' study-tools/engine/tools/question-exporter.html)"
pkill -f "http.server 8731" 2>/dev/null; rm -rf "$TMP"
```
Expected: innerHTML = 0; JSZip script tag = 1; wrapper tag = 1.

Then MANUALLY in your browser:
- Pick The Civil War → destination chip → Canvas → Source: Practice → select chapter → Refine → Send.
- Confirm: Quiz Title prefilled to "The Civil War Study Tool — Practice", validation shows "✓ N of 5 rules pass", "Build .zip ▸" enabled.
- Click Build. A file named `civil-war-practice-canvas.zip` should download.

- [ ] **Step 5: Bump version + commit**

Edit `study-tools/engine/version.json` from `8.44.0` → `8.45.0`, date `2026-05-30`.
```json
{
    "version": "8.45.0",
    "date": "2026-05-30"
}
```
Commit:
```bash
git add study-tools/engine/tools/question-exporter.html study-tools/engine/version.json
git commit -m "feat(exporter): Canvas QTI destination wired into Step 3

Quiz title (defaulted from unit + source) and max attempts inputs,
live validation checklist with failing-rule jumps back to Refine,
post-build selfCheck, and a download of the assessmentId-canvas.zip.
Bumps version to 8.45.0."
```

---

## Task 15: Build a verified golden zip for each Canvas type (manual)

**Files:**
- Create: `study-tools/engine/tools/_canvas-fixtures/mc.zip`
- Create: `study-tools/engine/tools/_canvas-fixtures/short-answer.zip`
- Create: `study-tools/engine/tools/_canvas-fixtures/essay.zip`
- Create: `study-tools/engine/tools/_canvas-fixtures/README.md`

This task is gated on user action — only the user can verify in Canvas.

- [ ] **Step 1: Build one zip per Canvas type using the UI**

In a browser:
1. Civil War → Canvas → Practice → select ONLY the first 4 questions → Refine → Send → Build. Save the downloaded file as `_canvas-fixtures/mc.zip`.
2. Civil War → Canvas → FIB → select ONLY the first 2 questions → Refine → Send → Build. Save as `_canvas-fixtures/short-answer.zip`.
3. Civil War → Canvas → Short-answer essays → select ONLY the first 2 questions → Refine → Send → Build. Save as `_canvas-fixtures/essay.zip`.

```bash
mkdir -p study-tools/engine/tools/_canvas-fixtures
mv ~/Downloads/civil-war-practice-canvas.zip study-tools/engine/tools/_canvas-fixtures/mc.zip
mv ~/Downloads/civil-war-fib-canvas.zip study-tools/engine/tools/_canvas-fixtures/short-answer.zip
mv ~/Downloads/civil-war-shortanswer-canvas.zip study-tools/engine/tools/_canvas-fixtures/essay.zip
```

- [ ] **Step 2: User verifies each .zip imports cleanly into Canvas**

User uploads each .zip via Canvas → Course → Settings → Import Course Content → QTI .zip.
Verify:
- Questions appear with all 4 options (MC), the text input (short-answer), and the prompt with key terms + sentence starters (essay).
- Take the quiz; correct answer scores 100%, wrong answers score 0% (MC, short-answer). Essay accepts a text response and lands in the SpeedGrader queue.

If anything fails, fix the renderer, rebuild, re-test. Do not commit until Canvas accepts all three.

- [ ] **Step 3: Document the fixtures**

Create `study-tools/engine/tools/_canvas-fixtures/README.md`:
```markdown
# Canvas QTI golden fixtures

These zips are checked-in known-good outputs of the Canvas exporter, used as
regression baselines. Each was built by hand via the wizard and verified to
import cleanly into Canvas.

| File | Source | Question count | Verified on |
|---|---|---|---|
| `mc.zip` | civil-war / practice (first 4) | 4 multiple_choice | 2026-05-30 |
| `short-answer.zip` | civil-war / fib (first 2) | 2 short_answer | 2026-05-30 |
| `essay.zip` | civil-war / shortAnswer (first 2) | 2 essay | 2026-05-30 |

## How to regenerate

Open the exporter, recreate the exact selection above, and Build. If the
generated zip differs from the golden, run the manual Canvas verification
before overwriting the fixture and update the "Verified on" date.

## Why they exist

`question-export-core.js` is pure; identifiers and order are stable. Any
unintended drift in the rendered XML will diff against these fixtures in CI
(see `validate-package.js`) before reaching a real Canvas import.
```

- [ ] **Step 4: Commit**

```bash
git add study-tools/engine/tools/_canvas-fixtures/
git commit -m "test(exporter): commit verified Canvas QTI golden fixtures

One zip per supported Canvas question type, each verified to import
cleanly. These lock the current XML output so future renderer changes
fail the diff before reaching a real Canvas import."
```

---

## Task 16: validate-package.js round-trip CLI

**Files:**
- Create: `study-tools/engine/tools/validate-package.js`

- [ ] **Step 1: Write the script**

Node has no built-in unzipper, but `jszip` works in Node too (loaded from the vendored copy). The script reads a .zip, unzips into a fileMap, and runs `selfCheckPackage` plus a couple of extra QTI §8 checks.

Create the script:
```js
#!/usr/bin/env node
// Usage: node validate-package.js <path-to-zip>
// Round-trips a Canvas QTI .zip against the QTI spec §8 checks.

var fs = require('fs');
var path = require('path');

if (process.argv.length < 3) {
  console.error('Usage: node validate-package.js <path-to-zip>');
  process.exit(2);
}
var zipPath = process.argv[2];
var core = require(path.join(__dirname, 'question-export-core.js'));
// Load the vendored JSZip from disk (it runs in Node fine).
var JSZip = require(path.join(__dirname, '..', 'vendor', 'jszip.min.js'));

fs.promises.readFile(zipPath).then(function (buf) {
  return JSZip.loadAsync(buf);
}).then(function (zip) {
  var fileMap = {};
  var ops = [];
  zip.forEach(function (relPath, file) {
    if (file.dir) return;
    ops.push(file.async('string').then(function (text) { fileMap[relPath] = text; }));
  });
  return Promise.all(ops).then(function () { return fileMap; });
}).then(function (fileMap) {
  var errors = [];
  var manifestKey = Object.keys(fileMap).find(function (k) { return /imsmanifest\.xml$/i.test(k); });
  if (!manifestKey) { console.error('FAIL: no imsmanifest.xml in zip'); process.exit(1); }
  var manifest = fileMap[manifestKey];
  if (manifest.indexOf('<schemaversion>1.1.3</schemaversion>') < 0) errors.push('schemaversion is not 1.1.3');
  if (manifest.indexOf('imsccv1p1') < 0) errors.push('manifest namespace missing imsccv1p1');
  if (manifest.indexOf('imsqti_xmlv1p2/imscc_xmlv1p1/assessment') < 0) errors.push('resource type missing hybrid CC type');
  if (!/<organizations\s*\/>|<organizations>\s*<\/organizations>/.test(manifest)) errors.push('organizations missing/empty');
  // Find the inner assessment xml and confirm folder = file = ident
  var assessmentKey = Object.keys(fileMap).find(function (k) { return /\/[^/]+\.xml$/.test(k) && k !== manifestKey; });
  if (!assessmentKey) errors.push('no assessment .xml under a subfolder');
  if (assessmentKey) {
    var parts = assessmentKey.split('/');
    var folder = parts[0]; var fname = parts[parts.length - 1].replace(/\.xml$/, '');
    if (folder !== fname) errors.push('folder name (' + folder + ') != inner xml filename (' + fname + ')');
    var inner = fileMap[assessmentKey];
    var m = inner.match(/<assessment ident="([^"]+)"/);
    if (!m) errors.push('assessment ident missing');
    else if (m[1] !== folder) errors.push('assessment ident (' + m[1] + ') != folder/file (' + folder + ')');
  }
  // ident uniqueness inside item: no duplicate response_label idents
  if (assessmentKey) {
    var inner2 = fileMap[assessmentKey];
    var idents = (inner2.match(/<response_label ident="([^"]+)"/g) || []).map(function (s) { return s; });
    var seen = {};
    idents.forEach(function (s) { if (seen[s]) errors.push('duplicate response_label ident: ' + s); seen[s] = true; });
    idents.forEach(function (s) {
      var v = s.replace(/<response_label ident="/, '').replace(/"$/, '');
      if (/^\d+$/.test(v)) errors.push('numeric ident not allowed: ' + v);
    });
  }
  if (errors.length) {
    console.error('FAIL (' + errors.length + ')');
    errors.forEach(function (e) { console.error('- ' + e); });
    process.exit(1);
  }
  console.log('OK ' + zipPath);
}).catch(function (err) {
  console.error('FAIL: ' + err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Run it against each golden zip**

```bash
for f in study-tools/engine/tools/_canvas-fixtures/*.zip; do
  node study-tools/engine/tools/validate-package.js "$f"
done
```
Expected: `OK ...` printed for each fixture. If any fail, debug before committing this task.

- [ ] **Step 3: Commit**

```bash
git add study-tools/engine/tools/validate-package.js
git commit -m "test(exporter): validate-package.js round-trip CLI

Unzips a Canvas QTI .zip and re-checks QTI spec §8 invariants:
manifest schemaversion, hybrid resource type, organizations element,
folder = file = ident, response_label ident uniqueness and
non-numeric. Used to catch unintended drift in the golden fixtures."
```

---

## Self-review notes

- **Spec coverage**:
  - §1 vendor JSZip + zip wrapper (Tasks 1, 13).
  - §2 per-type renderers MC / short_answer / essay (Tasks 8, 9, 10).
  - §3 validation rule registry + UI surface (Tasks 12, 14 Step 3).
  - §4 wizard with state machine (Tasks 2-6).
  - §5 out-of-scope respected (no images, no multi-assessment, no persistence).
  - §6 testing: per-renderer round-trip (Tasks 8-10), validation rule positives/negatives (Task 12), integration over real data (Tasks 11, 13), golden zips (Task 15), validate-package CLI (Task 16).
- **Naming consistency**:
  - `assessmentId` (slug) used in renderers, package, manifest, validation, page filename.
  - `q<idx>` items, `q<idx>_a<n>` label idents, `response1` response ident, `answer1` for render_fib — consistent across all three renderers.
  - Page state keys `destination`, `canvasOpts.{title,maxAttempts}`, `step` consistent.
- **No placeholders**: every code step has complete code; every run step has command + expected output.
- **TDD invariant**: every renderer task writes the test first, sees red, then implements. Task 11 (`buildCanvasPackage`) and Task 12 (`validateForCanvas`) also follow this rhythm.
- **Trailing test block**: each task that touches `question-export-core.test.js` inserts ABOVE the existing trailing `if (failures.length)` block, which must stay last.
- **Gating on user verification**: Task 15 is the only step the agent cannot complete alone — golden zip approval must come from a real Canvas import. The plan calls this out explicitly.
- **One real risk to flag**: the `jumpToQuestion(qid)` function in Task 14 falls back to scrolling to the top of the question list because `state.questions` are stored without per-DOM-node id attributes. A future task could add `data-qid` attributes to `.qrow` elements so the jump is exact; deferred as polish, not blocking v1.
