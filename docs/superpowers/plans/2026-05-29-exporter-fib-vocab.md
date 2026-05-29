# Exporter: FIB + Vocabulary Sources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Fill-in-the-Blank and Vocabulary as export sources to the existing Question Export Tool, with auto-generated same-category distractors, a vocab direction toggle, a must-know-default tier toggle, a GiMKit typed-answer mode for FIB, and an inline per-option length warning.

**Architecture:** Extend the existing pure-logic module `question-export-core.js` with three new functions (`pickDistractors`, `normalizeFib`, `normalizeVocab`) plus one new formatter (`formatGimkitTyped`). All normalizers emit the existing canonical shape `{ id, question, options:[4], correctIndex, topic }`, so the page's selection UI, per-chapter toggle, inline editor, and CSV download are reused. The page (`question-exporter.html`) gains a source picker, vocab/FIB toggles, a length warning, and source-aware export/filename logic.

**Tech Stack:** Vanilla HTML/CSS/JS, no build tools. Node runs the logic tests (no framework — tests `process.exit(1)` on failure). Headless Chrome smoke-tests the page.

---

## Reference: spec

`docs/superpowers/specs/2026-05-29-exporter-fib-vocab-design.md`
(extends `docs/superpowers/specs/2026-05-28-question-exporter-design.md`)

## Current state (verified)

- `study-tools/engine/tools/question-export-core.js` exports (line 42):
  `{ csvField, toCsv, normalizeQuestions, formatBlooket, formatGimkit }` via a
  UMD wrapper (`module.exports` in Node, `window.QExport` in browser).
- `question-export-core.test.js` ends with a trailing
  `if (failures.length) {...process.exit(1)} console.log('OK')` block that MUST
  stay last; new assertions go ABOVE it. Helper `eq(name, got, want)` exists.
- `question-exporter.html`: `state = { unitId, questions, selected:{}, edits:{} }`
  (line 61); `loadUnit` (157) fetches config and calls
  `window.QExport.normalizeQuestions`; `doExport` (166) picks formatter by
  `platformSel`; `renderChapterHead`/`renderRow`/`buildEditor`/`effective`
  already exist. No innerHTML anywhere (strict rule).

## Source data shapes (verified in civil-war/config.json)

- `config.fillInBlankSentences`: `[{ sentence:"… _____ …", answer, category }]` (15)
- `config.vocabulary`: `[{ term, definition, category, tier?, … }]` (70; tier
  absent = must-know, or `"encounter"`. 47 must-know, 23 encounter)

## Canonical shape (unchanged)

`{ id, question, options:[s0,s1,s2,s3], correctIndex, topic }`

---

## Task 1: pickDistractors helper (pure logic)

**Files:**
- Modify: `study-tools/engine/tools/question-export-core.js`
- Modify: `study-tools/engine/tools/question-export-core.test.js`

- [ ] **Step 1: Write the failing test**

Insert ABOVE the trailing `if (failures.length)` block in
`question-export-core.test.js`:
```js
// pickDistractors(items, correctValue, n, shuffleFn)
// items: [{ value, category }]; returns n wrong values, same-category first,
// excludes correctValue and duplicates, pads from other categories if short.
var identityShuffle = function (a) { return a.slice(); }; // deterministic for tests
var pdItems = [
  { value: 'a', category: 'C1' }, { value: 'b', category: 'C1' },
  { value: 'c', category: 'C1' }, { value: 'd', category: 'C1' },
  { value: 'x', category: 'C2' }, { value: 'y', category: 'C2' }
];
// correct 'a' in C1 -> 3 same-category distractors b,c,d (identity shuffle keeps order)
var d1 = core.pickDistractors(pdItems, 'a', 'C1', 3, identityShuffle);
eq('pd count', d1.length, 3);
eq('pd same-cat', JSON.stringify(d1), JSON.stringify(['b','c','d']));
eq('pd excludes correct', d1.indexOf('a'), -1);
// small category C2 (only x,y besides correct) -> pad from other categories
var d2 = core.pickDistractors(pdItems, 'x', 'C2', 3, identityShuffle);
eq('pd pad count', d2.length, 3);
eq('pd pad excludes correct', d2.indexOf('x'), -1);
eq('pd pad no dupes', new Set(d2).size, 3);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: FAIL — `core.pickDistractors is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `question-export-core.js`, add inside the factory (before `return`):
```js
function pickDistractors(items, correctValue, category, n, shuffleFn) {
  shuffleFn = shuffleFn || defaultShuffle;
  var seen = {};
  seen[correctValue] = true;
  function collect(pool) {
    var out = [];
    shuffleFn(pool).forEach(function (it) {
      if (out.length >= n) return;
      if (seen[it.value]) return;
      seen[it.value] = true;
      out.push(it.value);
    });
    return out;
  }
  var sameCat = items.filter(function (it) { return it.category === category; });
  var result = collect(sameCat);
  if (result.length < n) {
    var others = items.filter(function (it) { return it.category !== category; });
    result = result.concat(collect(others).slice(0, n - result.length));
  }
  return result.slice(0, n);
}
```
Also add a `defaultShuffle` near the top of the factory (Fisher-Yates, copies):
```js
function defaultShuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
```
Add `pickDistractors: pickDistractors` to the returned object.

- [ ] **Step 4: Run test to verify it passes**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/tools/question-export-core.js study-tools/engine/tools/question-export-core.test.js
git commit -m "feat(exporter): pickDistractors helper for same-category wrong answers

Why: FIB and vocab have one correct answer, so building 4-option MC for Blooket
needs generated distractors; same-category picks are plausible and pad from
other categories when a chapter is too small."
```

---

## Task 2: normalizeFib (source adapter)

**Files:**
- Modify: `study-tools/engine/tools/question-export-core.js`
- Modify: `study-tools/engine/tools/question-export-core.test.js`

- [ ] **Step 1: Write the failing test**

Insert above the trailing block:
```js
var fibCfg = { fillInBlankSentences: [
  { sentence: '_____ is one.', answer: 'alpha', category: 'G1' },
  { sentence: '_____ is two.', answer: 'beta', category: 'G1' },
  { sentence: '_____ is three.', answer: 'gamma', category: 'G1' },
  { sentence: '_____ is four.', answer: 'delta', category: 'G1' }
] };
var fibNorm = core.normalizeFib(fibCfg, identityShuffle);
eq('fib count', fibNorm.length, 4);
eq('fib question keeps blank', fibNorm[0].question, '_____ is one.');
eq('fib topic', fibNorm[0].topic, 'G1');
// correct answer present among options, at correctIndex
eq('fib correct value', fibNorm[0].options[fibNorm[0].correctIndex], 'alpha');
// exactly 4 options, all distinct
eq('fib 4 options', fibNorm[0].options.length, 4);
eq('fib distinct', new Set(fibNorm[0].options).size, 4);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: FAIL — `core.normalizeFib is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add inside the factory:
```js
function normalizeFib(config, shuffleFn) {
  var items = (config && config.fillInBlankSentences) || [];
  var pool = items.map(function (it) { return { value: it.answer, category: it.category || 'Uncategorized' }; });
  var out = [];
  items.forEach(function (it, i) {
    if (!it || !it.sentence || !it.answer) return;
    var cat = it.category || 'Uncategorized';
    var distractors = pickDistractors(pool, it.answer, cat, 3, shuffleFn);
    var options = [it.answer].concat(distractors);
    while (options.length < 4) options.push('');
    var order = (shuffleFn || defaultShuffle)([0, 1, 2, 3]);
    var shuffled = order.map(function (idx) { return options[idx]; });
    out.push({
      id: i, question: it.sentence, options: shuffled,
      correctIndex: order.indexOf(0), topic: cat
    });
  });
  return out;
}
```
Add `normalizeFib: normalizeFib` to the returned object.
Note: with `identityShuffle`, `order` = [0,1,2,3] so `correctIndex` = 0 and
options = [answer, d0, d1, d2]; the test asserts via
`options[correctIndex] === answer`, which holds for any shuffle.

- [ ] **Step 4: Run test to verify it passes**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/tools/question-export-core.js study-tools/engine/tools/question-export-core.test.js
git commit -m "feat(exporter): normalizeFib turns fill-in-blank sentences into MC questions

Why: keeps the sentence (with its blank) as the prompt, the answer as correct,
and 3 same-category answers as distractors, all in the canonical shape so the
existing UI and formatters handle it unchanged."
```

---

## Task 3: normalizeVocab (source adapter, both directions + tier filter)

**Files:**
- Modify: `study-tools/engine/tools/question-export-core.js`
- Modify: `study-tools/engine/tools/question-export-core.test.js`

- [ ] **Step 1: Write the failing test**

Insert above the trailing block:
```js
var vocabCfg = { vocabulary: [
  { term: 'aterm', definition: 'adef', category: 'V1' },
  { term: 'bterm', definition: 'bdef', category: 'V1' },
  { term: 'cterm', definition: 'cdef', category: 'V1' },
  { term: 'dterm', definition: 'ddef', category: 'V1' },
  { term: 'eterm', definition: 'edef', category: 'V1', tier: 'encounter' }
] };
// default: definition->term, must-know only (excludes the encounter item)
var vDefTerm = core.normalizeVocab(vocabCfg, { direction: 'definition-term', includeEncounter: false }, identityShuffle);
eq('vocab mustknow count', vDefTerm.length, 4);
eq('vocab def->term question', vDefTerm[0].question, 'adef');
eq('vocab def->term correct', vDefTerm[0].options[vDefTerm[0].correctIndex], 'aterm');
eq('vocab topic', vDefTerm[0].topic, 'V1');
// term->definition
var vTermDef = core.normalizeVocab(vocabCfg, { direction: 'term-definition', includeEncounter: false }, identityShuffle);
eq('vocab term->def question', vTermDef[0].question, 'aterm');
eq('vocab term->def correct', vTermDef[0].options[vTermDef[0].correctIndex], 'adef');
// includeEncounter adds the 5th
var vAll = core.normalizeVocab(vocabCfg, { direction: 'definition-term', includeEncounter: true }, identityShuffle);
eq('vocab all count', vAll.length, 5);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: FAIL — `core.normalizeVocab is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add inside the factory:
```js
function normalizeVocab(config, opts, shuffleFn) {
  opts = opts || {};
  var direction = opts.direction || 'definition-term';
  var includeEncounter = !!opts.includeEncounter;
  var vocab = (config && config.vocabulary) || [];
  var filtered = vocab.filter(function (v) {
    if (!v || !v.term || !v.definition) return false;
    if (v.tier === 'encounter' && !includeEncounter) return false;
    return true;
  });
  var pool = filtered.map(function (v) {
    return {
      value: direction === 'term-definition' ? v.definition : v.term,
      category: v.category || 'Uncategorized'
    };
  });
  var out = [];
  filtered.forEach(function (v, i) {
    var cat = v.category || 'Uncategorized';
    var promptVal = direction === 'term-definition' ? v.term : v.definition;
    var correctVal = direction === 'term-definition' ? v.definition : v.term;
    var distractors = pickDistractors(pool, correctVal, cat, 3, shuffleFn);
    var options = [correctVal].concat(distractors);
    while (options.length < 4) options.push('');
    var order = (shuffleFn || defaultShuffle)([0, 1, 2, 3]);
    var shuffled = order.map(function (idx) { return options[idx]; });
    out.push({
      id: i, question: promptVal, options: shuffled,
      correctIndex: order.indexOf(0), topic: cat
    });
  });
  return out;
}
```
Add `normalizeVocab: normalizeVocab` to the returned object.

- [ ] **Step 4: Run test to verify it passes**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/tools/question-export-core.js study-tools/engine/tools/question-export-core.test.js
git commit -m "feat(exporter): normalizeVocab with direction + must-know tier filter

Why: vocab becomes MC either definition->term (default) or term->definition,
defaulting to must-know terms and optionally including the encounter tier;
same-category distractors keep wrong answers plausible."
```

---

## Task 4: formatGimkitTyped (two-column flashcard CSV)

**Files:**
- Modify: `study-tools/engine/tools/question-export-core.js`
- Modify: `study-tools/engine/tools/question-export-core.test.js`

- [ ] **Step 1: Write the failing test**

Insert above the trailing block:
```js
var typedQ = [{ id:0, question:'_____ is one.', options:['alpha','b','c','d'], correctIndex:0, topic:'G1' }];
var typed = core.formatGimkitTyped(typedQ);
var tRows = typed.trim().split('\r\n');
eq('typed header', tRows[0], '"Question","Answer"');
eq('typed row', tRows[1], '"_____ is one.","alpha"');
eq('typed two cols', tRows[1].split('","').length, 2);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: FAIL — `core.formatGimkitTyped is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add inside the factory:
```js
function formatGimkitTyped(questions) {
  var rows = [['Question', 'Answer']];
  questions.forEach(function (q) {
    rows.push([q.question, q.options[q.correctIndex]]);
  });
  return toCsv(rows);
}
```
Add `formatGimkitTyped: formatGimkitTyped` to the returned object.

- [ ] **Step 4: Run test to verify it passes**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/tools/question-export-core.js study-tools/engine/tools/question-export-core.test.js
git commit -m "feat(exporter): GiMKit two-column typed-answer formatter

Why: GiMKit's MC template needs all four answers filled, so typed FIB uses its
separate Question/Answer flashcard template instead of blank distractor columns."
```

---

## Task 5: Integration test over real FIB + vocab data

**Files:**
- Modify: `study-tools/engine/tools/question-export-core.test.js`

- [ ] **Step 1: Write the failing test**

Insert above the trailing block (the `parseCsv` helper already exists in this
file from the base build — reuse it; if not present, this task adds it):
```js
var cfgReal = JSON.parse(require('fs').readFileSync(
  require('path').join(__dirname, '..', '..', 'units', 'civil-war', 'config.json'), 'utf8'));

// FIB -> MC: 15 questions, every correct answer present in its options
var fibReal = core.normalizeFib(cfgReal);
eq('real fib count', fibReal.length, 15);
var fibBad = 0;
fibReal.forEach(function (q) { if (q.options[q.correctIndex] == null || q.options.indexOf(q.options[q.correctIndex]) === -1) fibBad++; });
eq('real fib correct present', fibBad, 0);

// FIB typed: two columns, answer intact
var typedReal = core.formatGimkitTyped(fibReal);
eq('real typed cols', typedReal.trim().split('\r\n')[1].split('","').length, 2);

// Vocab must-know default: fewer than full 70 (encounter excluded), correct present
var vocabReal = core.normalizeVocab(cfgReal, { direction: 'definition-term', includeEncounter: false });
eq('real vocab mustknow only', vocabReal.length, 47);
var vBad = 0;
vocabReal.forEach(function (q) { if (q.options[q.correctIndex] !== q.question && q.options.indexOf(q.options[q.correctIndex]) === -1) vBad++; });
eq('real vocab correct present', vBad, 0);
var vocabAll = core.normalizeVocab(cfgReal, { direction: 'definition-term', includeEncounter: true });
eq('real vocab all', vocabAll.length, 70);
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: `OK`. (Logic already exists; this guards the real-data contract. If
`real vocab mustknow only` is not 47, re-check the tier filter — must-know =
not `tier === 'encounter'`.)

- [ ] **Step 3: Commit**

```bash
git add study-tools/engine/tools/question-export-core.test.js
git commit -m "test(exporter): FIB + vocab normalizers over real Civil War data

Why: locks the real-data contract (15 FIB, 47 must-know / 70 all vocab) and that
the correct answer survives normalization and the typed two-column format."
```

---

## Task 6: Page — source picker + source-specific toggles + source-aware export

**Files:**
- Modify: `study-tools/engine/tools/question-exporter.html`

- [ ] **Step 1: Add the source picker and toggle controls to the toolbar**

In the first `.toolbar` div (currently holds the Unit select, Select all,
Clear, filter, count), add a source select right after the Unit label, and a
container for source-specific controls. Insert after the Unit `<label>`:
```html
  <label>Source <select id="sourceSel">
    <option value="practice">Practice Questions</option>
    <option value="fib">Fill-in-the-Blank</option>
    <option value="vocab">Vocabulary</option>
  </select></label>
  <span id="sourceControls"></span>
```
In the platform `.toolbar` div, after the Export button, add the note span:
```html
  <span id="genNote" class="gen-note" style="display:none;color:var(--warn);font-size:.85em;"></span>
```
Add CSS in the `<style>` block (after `.over` rule):
```css
  .over-badge { color:var(--warn); font-size:.72em; font-weight:700; margin-left:6px; }
  .gen-note { max-width:320px; }
  #sourceControls label { font-size:.85em; color:var(--muted); margin-left:8px; }
```

- [ ] **Step 2: Extend state and add source-aware load + controls rendering**

In the `<script>`, change the state line (currently
`var state = { unitId: null, questions: [], selected: {}, edits: {} };`) to:
```js
  var state = { unitId: null, source: 'practice', questions: [], selected: {}, edits: {},
                vocabDirection: 'definition-term', includeEncounter: false, fibTyped: false,
                rawConfig: null };
```
Replace `loadUnit` so it stores the raw config and rebuilds questions through
the active source, and add `rebuildQuestions` + `renderSourceControls`:
```js
  function loadUnit(unitId) {
    state.unitId = unitId; state.selected = {}; state.edits = {};
    fetch('../../units/' + unitId + '/config.json')
      .then(function (r) { return r.json(); })
      .then(function (cfg) { state.rawConfig = cfg; rebuildQuestions(); })
      .catch(function (e) { document.getElementById('list').textContent = 'Could not load unit: ' + e; });
  }

  function rebuildQuestions() {
    state.selected = {}; state.edits = {};
    var cfg = state.rawConfig;
    if (!cfg) { state.questions = []; }
    else if (state.source === 'fib') state.questions = window.QExport.normalizeFib(cfg);
    else if (state.source === 'vocab') state.questions = window.QExport.normalizeVocab(cfg, { direction: state.vocabDirection, includeEncounter: state.includeEncounter });
    else state.questions = window.QExport.normalizeQuestions(cfg);
    renderSourceControls();
    render();
    var note = document.getElementById('genNote');
    if (state.source === 'practice') { note.style.display = 'none'; }
    else { note.style.display = ''; note.textContent = 'Wrong answers are auto-generated from the same chapter. Review or edit them before exporting.'; }
  }

  function renderSourceControls() {
    var c = document.getElementById('sourceControls');
    c.textContent = '';
    if (state.source === 'vocab') {
      var dirLabel = el('label', null, 'Direction ');
      var dir = el('select');
      [['definition-term','Definition to Term'],['term-definition','Term to Definition']].forEach(function (o) {
        var op = el('option', null, o[1]); op.value = o[0]; if (o[0] === state.vocabDirection) op.selected = true; dir.append(op);
      });
      dir.onchange = function () { state.vocabDirection = dir.value; rebuildQuestions(); };
      dirLabel.append(dir);
      var tierLabel = el('label', null, ' ');
      var tier = el('input'); tier.type = 'checkbox'; tier.checked = state.includeEncounter;
      tier.onchange = function () { state.includeEncounter = tier.checked; rebuildQuestions(); };
      tierLabel.append(tier, document.createTextNode(' Include encounter tier'));
      c.append(dirLabel, tierLabel);
    } else if (state.source === 'fib') {
      var typedLabel = el('label', null, ' ');
      var typed = el('input'); typed.type = 'checkbox'; typed.checked = state.fibTyped;
      typed.onchange = function () { state.fibTyped = typed.checked; };
      typedLabel.append(typed, document.createTextNode(' Typed answers (GiMKit only)'));
      c.append(typedLabel);
    }
  }
```
Wire the source select near the other handlers (after the `unitSel` handler):
```js
  document.getElementById('sourceSel').onchange = function () { state.source = this.value; rebuildQuestions(); };
```

- [ ] **Step 3: Add the length warning to option rows in the editor view**

The list rows show only the question text today; the spec wants per-option
length visibility. Add an over-cap badge in `buildEditor` next to each option
input. In `buildEditor`, inside the `eq.options.forEach`, after creating `oin`,
add:
```js
      if ((opt || '').length > 100) {
        line.append(el('span', 'over-badge', opt.length + ' chars'));
      }
```
(100 = Blooket answer cap. Non-blocking; just a visual marker.)

- [ ] **Step 4: Make export source-aware (filename + typed FIB)**

Replace `doExport` with:
```js
  function doExport() {
    var platform = document.getElementById('platformSel').value;
    var qs = selectedList();
    var csv, suffix;
    if (state.source === 'fib' && state.fibTyped && platform === 'gimkit') {
      csv = window.QExport.formatGimkitTyped(qs); suffix = 'gimkit-typed';
    } else {
      csv = platform === 'gimkit' ? window.QExport.formatGimkit(qs) : window.QExport.formatBlooket(qs);
      suffix = platform;
    }
    var sourceName = state.source === 'fib' ? 'fib' : (state.source === 'vocab' ? 'vocabulary' : 'practice');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = state.unitId + '-' + sourceName + '-' + suffix + '.csv';
    document.body.append(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
  }
```

- [ ] **Step 5: Verify no innerHTML and smoke-test all three sources**

Run:
```bash
grep -c innerHTML study-tools/engine/tools/question-exporter.html
```
Expected: `0`.

Then:
```bash
(cd /Users/shiebenaderet/Documents/GitHub/studytools && python3 -m http.server 8731 >/tmp/qexport-server.log 2>&1 &)
sleep 1.5
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP=$(mktemp -d)
"$CHROME" --headless --disable-gpu --no-sandbox --virtual-time-budget=6000 --user-data-dir="$TMP" --dump-dom \
  "http://localhost:8731/study-tools/engine/tools/question-exporter.html" 2>/dev/null > /tmp/qx-dom.html
echo "source options: $(grep -o 'id=.sourceSel.' /tmp/qx-dom.html | wc -l | tr -d ' ')"
echo "practice rows on load: $(grep -o 'class=.qrow.' /tmp/qx-dom.html | wc -l | tr -d ' ')"
pkill -f "http.server 8731" 2>/dev/null; rm -rf "$TMP"
```
Expected: source select present (1), practice rows = 63 on default load.
(The FIB/vocab render is exercised by the user manually in Task 7, since it
requires changing the dropdown; the Node integration test in Task 5 already
proves the normalizers produce correct data.)

- [ ] **Step 6: Commit**

```bash
git add study-tools/engine/tools/question-exporter.html
git commit -m "feat(exporter): source picker for FIB and vocab with toggles and length warning

Why: lets the teacher export fill-in-blank and vocabulary as Blooket/GiMKit
games, with a vocab direction toggle, must-know-default tier toggle, GiMKit
typed-answer mode for FIB, and an inline over-cap length badge for review."
```

---

## Task 7: Manual verification + version bump

**Files:**
- Modify: `study-tools/engine/version.json`

- [ ] **Step 1: Run the full logic test**

Run: `node study-tools/engine/tools/question-export-core.test.js`
Expected: `OK`.

- [ ] **Step 2: Manual browser check (golden path the user runs)**

Start the server, then have the user open
`http://localhost:8731/study-tools/engine/tools/question-exporter.html` and
confirm:
- Switching Source to Fill-in-the-Blank shows 15 questions grouped by chapter,
  each with 4 options and one marked correct; the "auto-generated" note shows.
- The "Typed answers (GiMKit only)" checkbox appears for FIB; with platform
  GiMKit + typed on, Export downloads `civil-war-fib-gimkit-typed.csv` (open it:
  two columns, Question + Answer).
- FIB with platform Blooket downloads `civil-war-fib-blooket.csv` (4-option MC).
- Switching Source to Vocabulary shows the Direction dropdown + "Include
  encounter tier" checkbox; default shows 47 questions; checking encounter shows
  70; switching direction flips question/answer.
- A long Term-to-Definition option shows the amber char-count badge in its editor.
- Editing a distractor and re-exporting reflects the edit.

Report any issue before the version bump.

- [ ] **Step 3: Bump the version**

Edit `study-tools/engine/version.json` from `8.43.0` to `8.44.0`, set `date`
to today (`2026-05-29`):
```json
{
    "version": "8.44.0",
    "date": "2026-05-29"
}
```

- [ ] **Step 4: Commit**

```bash
git add study-tools/engine/version.json
git commit -m "chore: bump version to 8.44.0 for FIB + vocabulary export sources"
```

---

## Self-review notes

- **Spec coverage:** source picker (Task 6) ✓; FIB normalizer (Task 2) ✓; vocab
  normalizer with direction + tier (Task 3) ✓; pickDistractors same-category +
  pad (Task 1) ✓; typed GiMKit two-column (Task 4) ✓; export rules incl.
  typed-only-for-GiMKit and MC-for-Blooket (Task 6 doExport) ✓; filename
  `<unit>-<source>-<platform>.csv` plus `-typed` suffix (Task 6) ✓; review
  inside exporter + length warning (Task 6 Step 3) ✓; reset on source switch
  (Task 6 rebuildQuestions resets selected/edits) ✓; no innerHTML (Task 6 uses
  el()/textContent + checked in Step 5) ✓; no persistence (state in memory) ✓.
- **Naming consistency:** `pickDistractors(items, correctValue, category, n, shuffleFn)`,
  `normalizeFib(config, shuffleFn)`, `normalizeVocab(config, {direction, includeEncounter}, shuffleFn)`,
  `formatGimkitTyped(questions)` used identically in core, tests, and page.
  Direction strings `'definition-term'` / `'term-definition'` consistent across
  Task 3 and Task 6. State keys (`source`, `vocabDirection`, `includeEncounter`,
  `fibTyped`, `rawConfig`) consistent across Task 6 steps.
- **No placeholders:** every code step has complete code; every run step has a
  command + expected output.
- **Filename note:** practice exports now become `<unit>-practice-<platform>.csv`
  (was `<unit>-<platform>.csv` in the base tool). Consistent with the spec's
  filename rule; acceptable since the tool is internal/unlinked-from-students.
- **Test file invariant:** every new assertion block is inserted ABOVE the
  trailing `if (failures.length){...}` block, which stays last (noted per task).
- **Shuffle injection:** normalizers accept an optional `shuffleFn` so tests are
  deterministic (`identityShuffle`); the page calls them without it, so they use
  `defaultShuffle` (Math.random). `pickDistractors` and the option-order shuffle
  both honor the injected fn.
