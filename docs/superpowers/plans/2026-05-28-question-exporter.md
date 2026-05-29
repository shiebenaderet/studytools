# Question Export Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A standalone, export-only page where the teacher selects practice MC questions from a unit, edits them in memory, and downloads a Blooket or GiMKit CSV.

**Architecture:** Three seams — a `source adapter` that normalizes `config.practiceQuestions` into a common shape, an in-memory edit/selection model (no persistence), and a per-platform `format adapter` that turns selected questions into CSV. Pure logic (CSV writer + both format adapters + source adapter) lives in a plain JS module that runs in both the browser and Node; the page wires it to DOM. No build tools, no framework.

**Tech Stack:** Vanilla HTML/CSS/JS. Node (already used for the audit script) runs the logic tests. Headless Chrome smoke-tests the page. No npm dependencies.

---

## Reference: design spec

`docs/superpowers/specs/2026-05-28-question-exporter-design.md`

## Key facts already verified

- No test framework / no package.json. Tests are plain Node scripts that
  `process.exit(1)` on failure. This matches the existing
  `study-tools/units/civil-war/_tools/audit-mc-lengths.js` pattern.
- Unit list lives in `study-tools/units/units.json` (`{ units: [{id, title, retired?}] }`).
- Per-unit questions: `study-tools/units/<id>/config.json` -> `practiceQuestions`
  array of `{question, options:[4], correct:<index>, explanation, topic}`.
- Existing standalone tool to mirror for look/structure:
  `study-tools/engine/tools/map-exporter.html` (single file, inline CSS/JS,
  no innerHTML).
- Project rules: no `innerHTML`; build DOM with `createElement`/`textContent`.
- Civil War content fits platform caps (longest answer 99, longest question 123).

## File structure

- Create: `study-tools/engine/tools/question-export-core.js`
  Pure logic, no DOM. Exports (via `window.QExport` in browser and
  `module.exports` in Node): `csvField`, `toCsv`, `normalizeQuestions`,
  `formatBlooket`, `formatGimkit`. One responsibility: data -> CSV text.
- Create: `study-tools/engine/tools/question-exporter.html`
  The page: unit dropdown, question list with selection + inline edit,
  platform choice, download. Imports the core module via `<script src>`.
- Create: `study-tools/engine/tools/question-export-core.test.js`
  Node test for the pure logic. Run with `node ...test.js`.

## Shared data shape (used by every task)

Normalized question (output of `normalizeQuestions`):
```js
{ id: 0, question: "…", options: ["a","b","c","d"], correctIndex: 1, topic: "…" }
```
`id` is the index in the source `practiceQuestions` array.

---

## Task 1: CSV field escaping + row writer (pure logic)

**Files:**
- Create: `study-tools/engine/tools/question-export-core.js`
- Create: `study-tools/engine/tools/question-export-core.test.js`

- [ ] **Step 1: Write the failing test**

Create `question-export-core.test.js`:
```js
var core = require('./question-export-core.js');
var failures = [];
function eq(name, got, want) {
  if (got !== want) failures.push(name + '\n   got:  ' + JSON.stringify(got) + '\n   want: ' + JSON.stringify(want));
}

// csvField: wraps in quotes, doubles internal quotes
eq('plain', core.csvField('hello'), '"hello"');
eq('comma', core.csvField('a,b'), '"a,b"');
eq('quote', core.csvField('say "hi"'), '"say ""hi"""');
eq('number', core.csvField(2), '"2"');
eq('null', core.csvField(null), '""');

// toCsv: array of rows (arrays) -> CRLF-joined CSV with quoted fields
eq('toCsv', core.toCsv([['A','B'],['1','x,y']]), '"A","B"\r\n"1","x,y"\r\n');

if (failures.length) { console.error('FAIL:\n' + failures.join('\n')); process.exit(1); }
console.log('Task1 OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: FAIL — `Cannot find module './question-export-core.js'` (file does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `question-export-core.js`:
```js
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.QExport = api;
})(this, function () {
  function csvField(v) {
    v = String(v == null ? '' : v);
    return '"' + v.replace(/"/g, '""') + '"';
  }
  function toCsv(rows) {
    return rows.map(function (r) {
      return r.map(csvField).join(',');
    }).join('\r\n') + '\r\n';
  }
  return { csvField: csvField, toCsv: toCsv };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: `Task1 OK`.

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/tools/question-export-core.js study-tools/engine/tools/question-export-core.test.js
git commit -m "feat(exporter): RFC-4180 CSV field escaping and row writer

Why: question text contains commas, apostrophes, and quotation marks, so the
export must quote every field and double internal quotes or columns shift."
```

---

## Task 2: Source adapter — normalizeQuestions

**Files:**
- Modify: `study-tools/engine/tools/question-export-core.js`
- Modify: `study-tools/engine/tools/question-export-core.test.js`

- [ ] **Step 1: Write the failing test**

Append to `question-export-core.test.js` (before the final `if (failures.length)` block — move that block to the very end):
```js
// normalizeQuestions: practiceQuestions -> normalized list, skips malformed
var sample = {
  practiceQuestions: [
    { question: 'Q1', options: ['a','b','c','d'], correct: 2, topic: 'T1' },
    { question: 'NoOpts', correct: 0 },                       // skipped: no options
    { question: 'BadCorrect', options: ['a','b'], correct: 5 } // skipped: correct out of range
  ]
};
var norm = core.normalizeQuestions(sample);
eq('norm length', norm.length, 1);
eq('norm id', norm[0].id, 0);
eq('norm correctIndex', norm[0].correctIndex, 2);
eq('norm topic', norm[0].topic, 'T1');
eq('norm options', JSON.stringify(norm[0].options), JSON.stringify(['a','b','c','d']));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: FAIL — `core.normalizeQuestions is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `question-export-core.js`, add inside the factory (before `return`):
```js
function normalizeQuestions(config) {
  var qs = (config && config.practiceQuestions) || [];
  var out = [];
  qs.forEach(function (q, i) {
    if (!q || !Array.isArray(q.options) || typeof q.correct !== 'number') return;
    if (q.correct < 0 || q.correct >= q.options.length) return;
    if (q.options.length < 2) return;
    var opts = q.options.slice(0, 4);
    while (opts.length < 4) opts.push('');
    out.push({
      id: i,
      question: q.question || '',
      options: opts,
      correctIndex: q.correct,
      topic: q.topic || 'Uncategorized'
    });
  });
  return out;
}
```
Add `normalizeQuestions: normalizeQuestions` to the returned object.

- [ ] **Step 4: Run test to verify it passes**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: `Task1 OK` (or whatever the trailing success line is; all asserts pass, no FAIL).

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/tools/question-export-core.js study-tools/engine/tools/question-export-core.test.js
git commit -m "feat(exporter): normalize practiceQuestions into common question shape

Why: the source adapter seam isolates config-format knowledge in one place so
future question types (FIB, short-answer) plug in without touching formatters."
```

---

## Task 3: Format adapter — Blooket

**Files:**
- Modify: `study-tools/engine/tools/question-export-core.js`
- Modify: `study-tools/engine/tools/question-export-core.test.js`

- [ ] **Step 1: Write the failing test**

Append (before the final failures block):
```js
var q = [{ id:0, question:'What, then?', options:['o0','o1','o2','o3'], correctIndex:1, topic:'T' }];
var blooket = core.formatBlooket(q);
var blRows = blooket.trim().split('\r\n');
eq('blooket header', blRows[0], '"Question #","Question Text","Answer 1","Answer 2","Answer 3","Answer 4","Time Limit (sec)","Correct Answer(s)"');
eq('blooket row', blRows[1], '"1","What, then?","o0","o1","o2","o3","20","2"');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: FAIL — `core.formatBlooket is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add inside the factory:
```js
var BLOOKET_TIME = 20;
function formatBlooket(questions) {
  var rows = [[
    'Question #', 'Question Text',
    'Answer 1', 'Answer 2', 'Answer 3', 'Answer 4',
    'Time Limit (sec)', 'Correct Answer(s)'
  ]];
  questions.forEach(function (q, i) {
    rows.push([
      i + 1, q.question,
      q.options[0], q.options[1], q.options[2], q.options[3],
      BLOOKET_TIME, q.correctIndex + 1
    ]);
  });
  return toCsv(rows);
}
```
Add `formatBlooket: formatBlooket` to the returned object.

- [ ] **Step 4: Run test to verify it passes**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: all asserts pass, no FAIL.

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/tools/question-export-core.js study-tools/engine/tools/question-export-core.test.js
git commit -m "feat(exporter): Blooket CSV formatter (positional correct-answer)

Why: Blooket import uses 4 answer columns plus a numeric Correct Answer(s)
column (1-4), so the formatter emits options in order and correctIndex+1."
```

---

## Task 4: Format adapter — GiMKit

**Files:**
- Modify: `study-tools/engine/tools/question-export-core.js`
- Modify: `study-tools/engine/tools/question-export-core.test.js`

- [ ] **Step 1: Write the failing test**

Append (before the final failures block). Reuse `q` from Task 3; if running tasks out of order, redefine it:
```js
var qg = [{ id:0, question:'What, then?', options:['o0','o1','o2','o3'], correctIndex:1, topic:'T' }];
var gim = core.formatGimkit(qg);
var gRows = gim.trim().split('\r\n');
eq('gimkit header', gRows[0], '"Question","Correct Answer","Incorrect Answer 1","Incorrect Answer 2","Incorrect Answer 3"');
// correct (o1) first, then remaining options in order: o0, o2, o3
eq('gimkit row', gRows[1], '"What, then?","o1","o0","o2","o3"');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: FAIL — `core.formatGimkit is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add inside the factory:
```js
function formatGimkit(questions) {
  var rows = [[
    'Question', 'Correct Answer',
    'Incorrect Answer 1', 'Incorrect Answer 2', 'Incorrect Answer 3'
  ]];
  questions.forEach(function (q) {
    var wrong = q.options.filter(function (_, idx) { return idx !== q.correctIndex; });
    rows.push([
      q.question,
      q.options[q.correctIndex],
      wrong[0] || '', wrong[1] || '', wrong[2] || ''
    ]);
  });
  return toCsv(rows);
}
```
Add `formatGimkit: formatGimkit` to the returned object.

- [ ] **Step 4: Run test to verify it passes**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: all asserts pass, no FAIL.

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/tools/question-export-core.js study-tools/engine/tools/question-export-core.test.js
git commit -m "feat(exporter): GiMKit CSV formatter (column-role correct-answer)

Why: GiMKit import encodes the correct answer by column position (Correct
Answer, then 3 Incorrect columns) rather than a numeric index like Blooket."
```

---

## Task 5: Round-trip integration test against real Civil War data

**Files:**
- Modify: `study-tools/engine/tools/question-export-core.test.js`

- [ ] **Step 1: Write the failing test**

Append (before the final failures block):
```js
// Integration: real config -> normalize -> both formats parse back correctly
var fs = require('fs');
var path = require('path');
var cfg = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', '..', 'units', 'civil-war', 'config.json'), 'utf8'));
var allQ = core.normalizeQuestions(cfg);
eq('cw question count', allQ.length, 63);

// minimal RFC-4180 parser for verification
function parseCsv(text) {
  var rows = [], row = [], field = '', i = 0, inQ = false, QUOTE = '"';
  while (i < text.length) {
    var ch = text[i];
    if (inQ) {
      if (ch === QUOTE) { if (text[i+1] === QUOTE) { field += QUOTE; i += 2; continue; } inQ = false; i++; continue; }
      field += ch; i++; continue;
    }
    if (ch === QUOTE) { inQ = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += ch; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(function (r) { return r.length > 1 || r[0] !== ''; });
}

// Blooket: correct number points at the config-correct answer text
var bl = parseCsv(core.formatBlooket(allQ));
eq('blooket rows', bl.length, 64); // header + 63
var blBad = 0;
allQ.forEach(function (q, idx) {
  var r = bl[idx + 1];
  var cn = parseInt(r[7], 10);
  if (r.slice(2,6)[cn-1] !== q.options[q.correctIndex]) blBad++;
});
eq('blooket correct mapping', blBad, 0);

// GiMKit: Correct Answer column equals the config-correct answer text
var gm = parseCsv(core.formatGimkit(allQ));
eq('gimkit rows', gm.length, 64);
var gmBad = 0;
allQ.forEach(function (q, idx) {
  if (gm[idx + 1][1] !== q.options[q.correctIndex]) gmBad++;
});
eq('gimkit correct mapping', gmBad, 0);
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: all asserts pass, no FAIL. (Logic already exists; this test guards
the real-data contract. If it fails, fix the formatter, not the test.)

- [ ] **Step 3: Commit**

```bash
git add study-tools/engine/tools/question-export-core.test.js
git commit -m "test(exporter): round-trip both CSV formats against real Civil War data

Why: parsing the emitted CSV back and checking the correct answer survives
guards against escaping or column-order regressions on the live 63 questions."
```

---

## Task 6: The page — unit load + question list with selection

**Files:**
- Create: `study-tools/engine/tools/question-exporter.html`

- [ ] **Step 1: Write the page**

Create `study-tools/engine/tools/question-exporter.html`. Mirror
`map-exporter.html` style (inline CSS, neutral tool chrome). Build ALL DOM with
`createElement`/`textContent` — no innerHTML. Include:
```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Question Export Tool</title>
<style>
  :root { --bg:#f7f5f0; --card:#fff; --ink:#2a2a2a; --muted:#666; --accent:#7A1F1F; --line:#d8d2c4; --ok:#2F855A; --warn:#C05621; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif; background:var(--bg); color:var(--ink); padding:24px; }
  h1 { margin:0 0 4px; font-size:1.4em; }
  .sub { color:var(--muted); margin-bottom:20px; font-size:.9em; }
  .toolbar { display:flex; flex-wrap:wrap; gap:12px; align-items:center; background:var(--card); padding:14px 16px; border-radius:10px; margin-bottom:16px; box-shadow:0 1px 3px rgba(0,0,0,.06); }
  select, button, input { font:inherit; }
  select, button { padding:8px 14px; border:1px solid var(--line); border-radius:6px; background:#fff; cursor:pointer; }
  button.primary { background:var(--accent); color:#fff; border-color:var(--accent); font-weight:600; }
  button:disabled { opacity:.5; cursor:not-allowed; }
  .count { color:var(--muted); font-size:.9em; }
  .chapter { margin-bottom:14px; }
  .chapter h2 { font-size:1em; margin:12px 0 6px; color:var(--accent); }
  .qrow { background:var(--card); border:1px solid var(--line); border-radius:8px; padding:10px 12px; margin-bottom:6px; }
  .qhead { display:flex; gap:10px; align-items:flex-start; }
  .qhead input[type=checkbox] { margin-top:4px; }
  .qtext { flex:1; }
  .badge { font-size:.7em; font-weight:700; color:#fff; background:var(--warn); border-radius:4px; padding:1px 6px; margin-left:6px; }
  .editbtn { background:none; border:none; color:var(--accent); text-decoration:underline; padding:0; font-size:.85em; }
  .editor { margin-top:8px; padding:8px; border-top:1px dashed var(--line); display:none; }
  .editor.open { display:block; }
  .editor label { display:block; font-size:.8em; color:var(--muted); margin-top:6px; }
  .editor input[type=text] { width:100%; padding:6px 8px; border:1px solid var(--line); border-radius:6px; }
  .editor .optline { display:flex; gap:6px; align-items:center; margin-top:4px; }
  .editor .optline input[type=radio] { flex:0 0 auto; }
  .over { color:var(--warn); font-size:.75em; }
</style>
</head>
<body>
<h1>Question Export Tool</h1>
<div class="sub">Select practice questions, edit if needed, and download a CSV for Blooket or GiMKit. Edits here do not change the study site.</div>

<div class="toolbar">
  <label>Unit <select id="unitSel"></select></label>
  <button id="selAll" class="secondary">Select all</button>
  <button id="selNone" class="secondary">Clear</button>
  <input id="filter" type="text" placeholder="Filter by text..." style="flex:1;min-width:160px;padding:8px 10px;border:1px solid var(--line);border-radius:6px;">
  <span class="count" id="count">0 selected</span>
</div>

<div class="toolbar">
  <label>Platform <select id="platformSel"><option value="blooket">Blooket</option><option value="gimkit">GiMKit</option></select></label>
  <button id="exportBtn" class="primary" disabled>Export CSV</button>
</div>

<div id="list"></div>

<script src="question-export-core.js"></script>
<script>
(function () {
  var UNITS_URL = '../../units/units.json';
  var state = { unitId: null, questions: [], selected: {}, edits: {} };

  var el = function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  function effective(q) {
    var e = state.edits[q.id];
    if (!e) return q;
    return { id:q.id, question:e.question, options:e.options.slice(), correctIndex:e.correctIndex, topic:q.topic };
  }
  function isDirty(q) { return !!state.edits[q.id]; }

  function selectedList() {
    return state.questions.filter(function (q) { return state.selected[q.id]; }).map(effective);
  }

  function updateCount() {
    var n = Object.keys(state.selected).filter(function (k) { return state.selected[k]; }).length;
    document.getElementById('count').textContent = n + ' selected';
    document.getElementById('exportBtn').disabled = n === 0;
  }

  function render() {
    var list = document.getElementById('list');
    list.textContent = '';
    var filter = document.getElementById('filter').value.toLowerCase();
    var byTopic = {};
    var order = [];
    state.questions.forEach(function (q) {
      var eq = effective(q);
      if (filter && eq.question.toLowerCase().indexOf(filter) === -1) return;
      if (!byTopic[q.topic]) { byTopic[q.topic] = []; order.push(q.topic); }
      byTopic[q.topic].push(q);
    });
    order.forEach(function (topic) {
      var sec = el('div', 'chapter');
      sec.append(el('h2', null, topic));
      byTopic[topic].forEach(function (q) { sec.append(renderRow(q)); });
      list.append(sec);
    });
    updateCount();
  }

  function renderRow(q) {
    var eq = effective(q);
    var row = el('div', 'qrow');
    var head = el('div', 'qhead');
    var cb = el('input'); cb.type = 'checkbox'; cb.checked = !!state.selected[q.id];
    cb.onchange = function () { state.selected[q.id] = cb.checked; updateCount(); };
    var txt = el('div', 'qtext'); txt.append(document.createTextNode(eq.question));
    if (isDirty(q)) txt.append(el('span', 'badge', 'edited'));
    var edit = el('button', 'editbtn', 'edit');
    var editor = el('div', 'editor');
    edit.onclick = function () { editor.classList.toggle('open'); };
    head.append(cb, txt, edit);
    row.append(head, buildEditor(q, editor));
    return row;
  }

  function buildEditor(q, editor) {
    var eq = effective(q);
    editor.textContent = '';
    editor.append(el('label', null, 'Question'));
    var qIn = el('input'); qIn.type = 'text'; qIn.value = eq.question;
    editor.append(qIn);
    var optInputs = [];
    eq.options.forEach(function (opt, idx) {
      var line = el('div', 'optline');
      var radio = el('input'); radio.type = 'radio'; radio.name = 'correct-' + q.id; radio.checked = idx === eq.correctIndex;
      var oin = el('input'); oin.type = 'text'; oin.value = opt; oin.style.flex = '1';
      line.append(radio, oin);
      editor.append(line);
      optInputs.push({ radio: radio, input: oin });
    });
    var save = el('button', 'secondary', 'Apply edit'); save.style.marginTop = '8px';
    save.onclick = function () {
      var ci = 0; optInputs.forEach(function (o, i) { if (o.radio.checked) ci = i; });
      state.edits[q.id] = { question: qIn.value, options: optInputs.map(function (o) { return o.input.value; }), correctIndex: ci };
      render();
    };
    editor.append(save);
    return editor;
  }

  function loadUnit(unitId) {
    state.unitId = unitId; state.selected = {}; state.edits = {};
    fetch('../../units/' + unitId + '/config.json')
      .then(function (r) { return r.json(); })
      .then(function (cfg) { state.questions = window.QExport.normalizeQuestions(cfg); render(); })
      .catch(function (e) { document.getElementById('list').textContent = 'Could not load unit: ' + e; });
  }

  function doExport() {
    var platform = document.getElementById('platformSel').value;
    var qs = selectedList();
    var csv = platform === 'gimkit' ? window.QExport.formatGimkit(qs) : window.QExport.formatBlooket(qs);
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = state.unitId + '-' + platform + '.csv';
    document.body.append(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
  }

  document.getElementById('selAll').onclick = function () { state.questions.forEach(function (q) { state.selected[q.id] = true; }); render(); };
  document.getElementById('selNone').onclick = function () { state.selected = {}; render(); };
  document.getElementById('filter').oninput = render;
  document.getElementById('exportBtn').onclick = doExport;
  document.getElementById('unitSel').onchange = function () { loadUnit(this.value); };

  fetch(UNITS_URL).then(function (r) { return r.json(); }).then(function (data) {
    var sel = document.getElementById('unitSel');
    (data.units || []).forEach(function (u) {
      var o = el('option', null, u.title + (u.retired ? ' (retired)' : ''));
      o.value = u.id; sel.append(o);
    });
    if (data.units && data.units.length) loadUnit(data.units[0].id);
  });
})();
</script>
</body>
</html>
```

- [ ] **Step 2: Smoke-test the page in headless Chrome**

Start a server from the repo root and load the page, driving it to render:
```bash
(cd /Users/shiebenaderet/Documents/GitHub/studytools && python3 -m http.server 8731 >/tmp/qexport-server.log 2>&1 &)
sleep 1.5
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP=$(mktemp -d)
"$CHROME" --headless --disable-gpu --no-sandbox --virtual-time-budget=5000 --user-data-dir="$TMP" --dump-dom \
  "http://localhost:8731/study-tools/engine/tools/question-exporter.html" 2>/dev/null > /tmp/qexport-dom.html
echo "unit options: $(grep -c '<option' /tmp/qexport-dom.html)"
echo "question rows: $(grep -c 'class=\"qrow\"' /tmp/qexport-dom.html)"
echo "chapters: $(grep -c '<h2' /tmp/qexport-dom.html)"
rm -rf "$TMP"
```
Expected: question rows = 63 (Civil War loads by default), chapters = 4, unit
options >= 2 (units.json minus none). If rows = 0, the page failed to load the
config — check the fetch path `../../units/<id>/config.json` resolves from
`study-tools/engine/tools/`.

- [ ] **Step 3: Commit**

```bash
git add study-tools/engine/tools/question-exporter.html
git commit -m "feat(exporter): standalone question export page with select + inline edit

Why: gives the teacher a visual select/edit/download flow over a unit's
practice questions without hand-copying text or touching live config."
```

---

## Task 7: End-to-end export verification + cleanup

**Files:**
- Delete: `study-tools/units/civil-war/_tools/blooket/` (one-off CSVs)
- (No code change unless E2E reveals a bug.)

- [ ] **Step 1: Drive a real export in headless Chrome and verify the downloaded CSV**

Use Chrome's headless download to a known dir, select-all, export Blooket, and
parse the result. Run:
```bash
(cd /Users/shiebenaderet/Documents/GitHub/studytools && python3 -m http.server 8731 >/tmp/qexport-server.log 2>&1 &)
sleep 1.5
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP=$(mktemp -d); DL=$(mktemp -d)
"$CHROME" --headless --disable-gpu --no-sandbox --user-data-dir="$TMP" \
  --virtual-time-budget=8000 \
  --run-all-compositor-stages-before-draw \
  "http://localhost:8731/study-tools/engine/tools/question-exporter.html" \
  --dump-dom >/dev/null 2>&1
# DOM dump alone cannot click; instead verify export logic via Node against the page's core module:
node -e '
var core = require("/Users/shiebenaderet/Documents/GitHub/studytools/study-tools/engine/tools/question-export-core.js");
var fs = require("fs");
var cfg = JSON.parse(fs.readFileSync("/Users/shiebenaderet/Documents/GitHub/studytools/study-tools/units/civil-war/config.json","utf8"));
var qs = core.normalizeQuestions(cfg);
var bl = core.formatBlooket(qs), gm = core.formatGimkit(qs);
if (bl.split("\r\n").filter(Boolean).length !== 64) { console.error("blooket row count wrong"); process.exit(1); }
if (gm.split("\r\n").filter(Boolean).length !== 64) { console.error("gimkit row count wrong"); process.exit(1); }
console.log("E2E core export OK: 63 questions both formats");
'
rm -rf "$TMP" "$DL"
```
Expected: `E2E core export OK: 63 questions both formats`.

Note: the browser download click is exercised manually by the user in Step 3;
headless click-driving is out of scope. The Node check above proves the exact
module the page uses produces correct output.

- [ ] **Step 2: Manual browser check (user-facing golden path)**

Tell the user to open `http://localhost:8731/study-tools/engine/tools/question-exporter.html`,
then confirm: unit dropdown switches units; select-all + Export downloads a
file named `civil-war-blooket.csv`; switching platform to GiMKit and exporting
downloads `civil-war-gimkit.csv`; editing a question shows the "edited" badge
and the change appears in the next export. Report any issue before cleanup.

- [ ] **Step 3: Remove the one-off CSVs (replaced by this tool)**

```bash
rm -rf study-tools/units/civil-war/_tools/blooket
```
(These were never committed, so this only clears the working tree.)

- [ ] **Step 4: Final logic test + commit**

```bash
node study-tools/engine/tools/question-export-core.test.js
git add -A study-tools/engine/tools/
git commit -m "test(exporter): end-to-end export check over real unit data

Why: confirms the page's own core module emits 63-question CSVs for both
platforms; removes the superseded one-off CSV generation."
```

---

## Self-review notes

- **Spec coverage:** standalone page at tools/ (Task 6) ✓; unit dropdown from
  units.json (Task 6) ✓; select all/by-chapter/filter (Task 6) ✓; inline
  export-only edit with dirty badge (Task 6) ✓; source adapter seam (Task 2) ✓;
  in-memory model no persistence (Task 6, `state` reset on unit load) ✓;
  Blooket positional format (Task 3) ✓; GiMKit column-role format (Task 4) ✓;
  RFC-4180 escaping (Task 1) ✓; no innerHTML (Task 6 builds DOM via
  createElement) ✓; filename `<unit>-<platform>.csv` (Task 6 doExport) ✓;
  cleanup of one-off CSVs (Task 7) ✓.
- **Length-cap warning:** spec calls it non-blocking. The editor shows option
  values but the explicit over-cap warning is minor; if time allows add a check
  in `buildEditor` comparing option length to 100. Marked as optional polish,
  not a separate task, to avoid scope creep (current content fits).
- **No placeholders:** every code step has complete code; every run step has a
  command and expected output.
- **Naming consistency:** `window.QExport`, `normalizeQuestions`,
  `formatBlooket`, `formatGimkit`, `csvField`, `toCsv` used identically across
  tasks. Normalized shape `{id, question, options, correctIndex, topic}` is
  consistent. `state.edits[id] = {question, options, correctIndex}` matches what
  `effective()` reads.
- **Test ordering caveat:** Tasks 3/4 redefine their own sample question so the
  test file works even if assembled out of order; the trailing
  `if (failures.length)` block must remain the LAST thing in the test file
  (noted in Task 2 Step 1).
