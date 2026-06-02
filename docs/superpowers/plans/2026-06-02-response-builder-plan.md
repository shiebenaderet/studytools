# Response Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 5-step guided wizard ("Help me build a response") launched from inside the Short Answer activity that walks a stuck student through Unpack → Read → Terms → Plan (Claim/Evidence/Reasoning) → Draft, then returns them to their draft.

**Architecture:** A self-contained hidden `response-builder` activity reads the target question via `_deepLinkParams` (the existing deep-link mechanism). Its pure decision logic lives in a separate testable `response-builder-core.js` module (mirroring `question-export-core.js` / `map-quiz-guard-core.js`). Short Answer gains a launch button and a deep-link auto-open for the return trip. The only new authored data is an optional per-question `plan` field, derived from each question's existing `exemplar`.

**Tech Stack:** Vanilla ES5-style JS (no build tools, no frameworks), DOM creation only (no innerHTML), CSS custom-property theming, vanilla-node test scripts run with `node file.test.js`.

**Design spec:** `docs/superpowers/specs/2026-06-02-response-builder-design.md`

**Resolved open questions (from spec):**
1. A question with no `plan` field → the "Help me build a response" button is hidden for it. The wizard is always the full 5 steps.
2. Evidence rows in Step 4 are driven by the data: one EVIDENCE row per `evidence` piece in the `plan` (supports 1–3 evidence pieces).
3. The key-term-details rendering is extracted into a tiny shared helper so Short Answer and the wizard don't drift.

---

## File Structure

- **Create** `study-tools/engine/tools/response-builder-core.js` — pure logic: scramble, placement check, completion, role coaching copy.
- **Create** `study-tools/engine/tools/response-builder-core.test.js` — vanilla-node tests for the core.
- **Create** `study-tools/engine/js/activities/response-builder.js` — the hidden wizard activity (5-step state machine).
- **Create** `study-tools/engine/js/core/term-details.js` — shared key-term-details renderer extracted from short-answer.js.
- **Modify** `study-tools/engine/js/activities/short-answer.js` — use the shared term-details helper; add the launch button; add deep-link auto-open for the return path.
- **Modify** `study-tools/engine/index.html` — load the two new `tools/` and `js/core/` scripts before `app.js`.
- **Modify** `study-tools/units/civil-war/config.json` — add `response-builder` to the `activities` array; add `plan` arrays to the 6 short-answer questions.
- **Modify** `study-tools/engine/css/styles.css` — add `.rb-*` styles for the stepper, CER skeleton, coaching callout.
- **Modify** `study-tools/engine/version.json` + `README.md` — version bump on ship.

---

## Task 1: Response Builder core — placement & completion logic

**Files:**
- Create: `study-tools/engine/tools/response-builder-core.js`
- Test: `study-tools/engine/tools/response-builder-core.test.js`

- [ ] **Step 1: Write the failing test**

Create `study-tools/engine/tools/response-builder-core.test.js`:

```javascript
#!/usr/bin/env node
// Tests for the response-builder wizard's pure decision logic (Step 4 CER plan).
var core = require('./response-builder-core.js');

var failures = [];
function eq(name, got, want) {
  if (got !== want) failures.push(name + '\n  got:  ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want));
}
function deepEq(name, got, want) {
  if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(name + '\n  got:  ' + JSON.stringify(got) + '\n  want: ' + JSON.stringify(want));
}

var PLAN = [
  { role: 'claim',     text: 'Geography pushed the regions apart.' },
  { role: 'evidence',  text: 'The North built factories.' },
  { role: 'evidence',  text: 'The South built plantations.' },
  { role: 'reasoning', text: 'So the two regions grew into different societies.' }
];

// checkPlacement: a piece matches a row when its role equals the row's role.
eq('claim into claim row', core.checkPlacement({ role: 'claim' }, 'claim'), true);
eq('claim into evidence row', core.checkPlacement({ role: 'claim' }, 'evidence'), false);
eq('evidence into evidence row', core.checkPlacement({ role: 'evidence' }, 'evidence'), true);
eq('evidence into reasoning row', core.checkPlacement({ role: 'evidence' }, 'reasoning'), false);
eq('reasoning into reasoning row', core.checkPlacement({ role: 'reasoning' }, 'reasoning'), true);

// rowRolesFor: the ordered list of row roles, one evidence row per evidence piece.
deepEq('row roles for 2-evidence plan', core.rowRolesFor(PLAN), ['claim', 'evidence', 'evidence', 'reasoning']);
deepEq('row roles for 1-evidence plan', core.rowRolesFor([
  { role: 'claim', text: 'c' }, { role: 'evidence', text: 'e' }, { role: 'reasoning', text: 'r' }
]), ['claim', 'evidence', 'reasoning']);

// isPlanComplete: every row has a correctly-roled piece.
// placements is an array aligned to rowRolesFor; each entry is the placed piece or null.
eq('incomplete when a row empty', core.isPlanComplete(['claim','evidence','evidence','reasoning'],
  [{role:'claim'}, {role:'evidence'}, null, {role:'reasoning'}]), false);
eq('complete when all rows correct', core.isPlanComplete(['claim','evidence','evidence','reasoning'],
  [{role:'claim'}, {role:'evidence'}, {role:'evidence'}, {role:'reasoning'}]), true);
eq('incomplete when a placement is wrong-role', core.isPlanComplete(['claim','evidence','evidence','reasoning'],
  [{role:'claim'}, {role:'reasoning'}, {role:'evidence'}, {role:'evidence'}]), false);

// roleCoaching: returns non-empty copy for each real role, '' for unknown.
eq('coaching claim non-empty', core.roleCoaching('claim').length > 0, true);
eq('coaching evidence non-empty', core.roleCoaching('evidence').length > 0, true);
eq('coaching reasoning non-empty', core.roleCoaching('reasoning').length > 0, true);
eq('coaching unknown empty', core.roleCoaching('nonsense'), '');

// scramblePlan: deterministic given a seed, returns a permutation (same multiset).
var s1 = core.scramblePlan(PLAN, 0);
eq('scramble length', s1.length, PLAN.length);
deepEq('scramble is a permutation',
  s1.map(function (p) { return p.text; }).sort(),
  PLAN.map(function (p) { return p.text; }).sort());
deepEq('scramble deterministic for same seed',
  core.scramblePlan(PLAN, 3).map(function (p) { return p.text; }),
  core.scramblePlan(PLAN, 3).map(function (p) { return p.text; }));

if (failures.length) {
  console.log('FAIL (' + failures.length + ')');
  failures.forEach(function (f) { console.log('- ' + f); });
  process.exit(1);
}
console.log('OK');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd study-tools/engine && node tools/response-builder-core.test.js`
Expected: FAIL — `Cannot find module './response-builder-core.js'`

- [ ] **Step 3: Write minimal implementation**

Create `study-tools/engine/tools/response-builder-core.js`:

```javascript
// Pure decision logic for the response-builder wizard's Step 4 (Claim/Evidence/
// Reasoning plan builder). No DOM, no Math.random, no Date.now — so it stays
// deterministic and testable like question-export-core.js / map-quiz-guard-core.js.
(function () {
  var api = {};

  var COACHING = {
    claim: 'A claim is your main point: the one-sentence answer to the question.',
    evidence: 'Evidence is a specific example or fact from the unit that proves your claim.',
    reasoning: 'Reasoning is the sentence that explains why your evidence adds up to your claim.'
  };

  // True when a piece belongs in a row of the given role.
  api.checkPlacement = function (piece, rowRole) {
    if (!piece || !rowRole) return false;
    return piece.role === rowRole;
  };

  // The ordered row roles for a plan: claim first, one evidence row per evidence
  // piece, reasoning last. Driven by the data so a plan can have 1–3 evidence.
  api.rowRolesFor = function (plan) {
    var roles = [];
    var evidence = 0;
    for (var i = 0; i < plan.length; i++) {
      if (plan[i].role === 'evidence') evidence++;
    }
    roles.push('claim');
    for (var e = 0; e < evidence; e++) roles.push('evidence');
    roles.push('reasoning');
    return roles;
  };

  // placements is aligned to rowRoles; each entry is the placed piece or null.
  api.isPlanComplete = function (rowRoles, placements) {
    if (!placements || placements.length !== rowRoles.length) return false;
    for (var i = 0; i < rowRoles.length; i++) {
      if (!api.checkPlacement(placements[i], rowRoles[i])) return false;
    }
    return true;
  };

  api.roleCoaching = function (role) {
    return COACHING[role] || '';
  };

  // Deterministic shuffle (seeded by an integer) so the tested core never calls
  // Math.random. Simple index-rotation + swap based on the seed.
  api.scramblePlan = function (plan, seed) {
    var a = plan.slice();
    var s = (typeof seed === 'number' ? seed : 0) + 1;
    for (var i = a.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff; // LCG step
      var j = s % (i + 1);
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ResponseBuilderCore = api;
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd study-tools/engine && node tools/response-builder-core.test.js`
Expected: `OK`

Also confirm no regression: `node tools/question-export-core.test.js && node tools/map-quiz-guard-core.test.js`
Expected: `OK` for both.

- [ ] **Step 5: Commit**

```bash
git add study-tools/engine/tools/response-builder-core.js study-tools/engine/tools/response-builder-core.test.js
git commit -m "feat(response-builder): pure CER plan logic + tests

Step 4 placement/completion/coaching/scramble logic, tested with the
established vanilla-node core pattern. No DOM dependency."
```

---

## Task 2: Extract shared key-term-details helper

The wizard's Step 3 and Short Answer both show term → definition/example. Extract the existing renderer so they share one implementation (resolves open question 3).

**Files:**
- Create: `study-tools/engine/js/core/term-details.js`
- Modify: `study-tools/engine/js/activities/short-answer.js` (replace its `_renderTermDetails` body with a call to the shared helper)
- Modify: `study-tools/engine/index.html` (load the new script)

- [ ] **Step 1: Read the current `_renderTermDetails`**

Run: `sed -n '52,123p' study-tools/engine/js/activities/short-answer.js`
This is the source of truth to extract. Copy its exact logic into the helper in Step 2 (do not rewrite behavior).

- [ ] **Step 2: Create the shared helper**

Create `study-tools/engine/js/core/term-details.js`. Move the body of short-answer's `_renderTermDetails(panel, term)` here as `TermDetails.render(panel, term, config)`. It must:
- Look up the term in `config.vocabulary` case-insensitively.
- Render definition, simpleExplanation, example, and (if present) the textbook deep-link, using DOM creation only (no innerHTML), exactly as short-answer.js does today.

```javascript
// Shared renderer for "key term -> definition + example" detail panels.
// Extracted from short-answer.js so the response-builder wizard reuses the exact
// same behavior. DOM creation only (no innerHTML).
(function () {
  var api = {};

  // panel: the container element to fill. term: the term string. config: the unit config.
  api.render = function (panel, term, config) {
    // PORTING NOTE: paste the exact body of short-answer.js _renderTermDetails here,
    // replacing `this._config`/`this.` references with the `config` argument and
    // local vars. Behavior must be identical to the current implementation read in Step 1.
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.TermDetails = api;
})();
```

(The engineer fills the `render` body by moving the verified-current logic from Step 1 verbatim, adapting `this._config` → `config`.)

- [ ] **Step 3: Point short-answer.js at the helper**

In `study-tools/engine/js/activities/short-answer.js`, replace the body of `_renderTermDetails` with a delegation:

```javascript
    _renderTermDetails: function (panel, term) {
        if (typeof TermDetails !== 'undefined') {
            TermDetails.render(panel, term, this._config);
            return;
        }
        // (fallback retained below only if TermDetails is unavailable)
    },
```

Keep the original body as the fallback after the early return, OR delete it once the helper is confirmed loaded. Prefer deleting after Step 5 verification to avoid drift.

- [ ] **Step 4: Load the helper in index.html**

In `study-tools/engine/index.html`, add after line 90 (`tools/map-quiz-guard-core.js`):

```html
    <script src="js/core/term-details.js"></script>
```

- [ ] **Step 5: Verify in browser (manual)**

Serve the engine locally and open a civil-war short-answer question. Click a key-term chip. Confirm the definition/example panel renders exactly as before. Run `node --check` on the edited files:

Run: `node --check study-tools/engine/js/core/term-details.js && node --check study-tools/engine/js/activities/short-answer.js`
Expected: no output (syntax OK).

- [ ] **Step 6: Commit**

```bash
git add study-tools/engine/js/core/term-details.js study-tools/engine/js/activities/short-answer.js study-tools/engine/index.html
git commit -m "refactor(short-answer): extract shared TermDetails renderer

So the response-builder wizard can reuse the exact key-term detail panel
without duplicating logic."
```

---

## Task 3: The response-builder wizard activity (shell + steps 1–3, 5)

Build the activity with the Option-A stepper shell and the four non-novel steps. Step 4 (CER plan) is wired in Task 4.

**Files:**
- Create: `study-tools/engine/js/activities/response-builder.js`
- Modify: `study-tools/engine/css/styles.css` (stepper + step styling)

- [ ] **Step 1: Create the activity skeleton**

Create `study-tools/engine/js/activities/response-builder.js`:

```javascript
// Response Builder — a guided 5-step wizard that helps a student who is stuck on
// a short-answer question. Launched (hidden) from short-answer.js via
// activateActivity('response-builder', [questionIndex]). Steps:
//   1 Unpack  2 Read  3 Terms  4 Plan (CER)  5 Draft
StudyEngine.registerActivity({
    id: 'response-builder',
    name: 'Response Builder',
    icon: 'fas fa-pen-ruler',
    description: 'Build a short-answer response step by step.',
    category: 'practice',
    hidden: true, // launched from the Short Answer activity, not the home grid

    _config: null,
    _container: null,
    _qIndex: -1,
    _question: null,
    _step: 1,
    _maxStep: 5,

    render: function (container, config) {
        this._config = config;
        this._container = container;
        var params = this._deepLinkParams || [];
        this._qIndex = params.length >= 1 ? parseInt(params[0], 10) : -1;
        var all = (config.shortAnswerQuestions || []);
        this._question = (this._qIndex >= 0 && this._qIndex < all.length) ? all[this._qIndex] : null;
        this._step = 1;
        if (!this._question) {
            // Defensive: no valid question -> bounce back to short-answer grid.
            StudyEngine.activateActivity('short-answer');
            return;
        }
        this._renderStep();
    },

    _stepTitles: ["What's it asking?", 'Read about it', 'Key terms', 'Make a plan', 'Write your draft'],

    _renderStep: function () {
        var c = this._container;
        c.textContent = '';
        c.className = 'rb-screen';
        c.appendChild(this._buildStepper());
        c.appendChild(this._buildQuestionContext());

        var body = document.createElement('div');
        body.className = 'rb-step-body';
        if (this._step === 1) this._renderUnpack(body);
        else if (this._step === 2) this._renderRead(body);
        else if (this._step === 3) this._renderTerms(body);
        else if (this._step === 4) this._renderPlan(body);   // wired in Task 4
        else if (this._step === 5) this._renderDraft(body);
        c.appendChild(body);
        c.appendChild(this._buildNav());
    },

    _buildStepper: function () {
        var self = this;
        var bar = document.createElement('div');
        bar.className = 'rb-steps';
        for (var i = 0; i < this._maxStep; i++) {
            var stepNum = i + 1;
            var step = document.createElement('div');
            step.className = 'rb-step' + (stepNum < self._step ? ' rb-done' : stepNum === self._step ? ' rb-active' : '');
            var dot = document.createElement('div');
            dot.className = 'rb-dot';
            dot.textContent = stepNum < self._step ? '✓' : String(stepNum);
            step.appendChild(dot);
            var label = document.createElement('div');
            label.className = 'rb-step-label';
            label.textContent = self._stepTitles[i];
            step.appendChild(label);
            bar.appendChild(step);
        }
        return bar;
    },

    _buildQuestionContext: function () {
        var wrap = document.createElement('div');
        wrap.className = 'rb-q-context';
        var lbl = document.createElement('div');
        lbl.className = 'rb-q-label';
        lbl.textContent = 'Building your response to';
        wrap.appendChild(lbl);
        var q = document.createElement('div');
        q.className = 'rb-q-text';
        q.textContent = this._question.question;
        wrap.appendChild(q);
        return wrap;
    },

    _buildNav: function () {
        var self = this;
        var nav = document.createElement('div');
        nav.className = 'rb-nav';
        var back = document.createElement('button');
        back.className = 'rb-btn';
        back.textContent = this._step === 1 ? '← Back to question' : '← Back';
        back.addEventListener('click', function () {
            if (self._step === 1) self._exitToQuestion();
            else { self._step--; self._renderStep(); }
        });
        nav.appendChild(back);

        var next = document.createElement('button');
        next.className = 'rb-btn rb-btn-primary';
        next.id = 'rb-next';
        next.textContent = this._step === this._maxStep ? 'Finish →' : 'Next: ' + this._stepTitles[this._step] + ' →';
        // Step 4 disables this until the plan is complete (Task 4).
        next.addEventListener('click', function () {
            if (self._step === self._maxStep) self._exitToQuestion();
            else { self._step++; self._renderStep(); }
        });
        nav.appendChild(next);
        return nav;
    },

    _exitToQuestion: function () {
        // Return to the Short Answer activity, deep-linked to this question.
        StudyEngine.activateActivity('short-answer', [this._qIndex]);
    },

    // ---- Step 1: Unpack ----
    _renderUnpack: function (body) {
        var h = document.createElement('div'); h.className = 'rb-h'; h.textContent = "What's this question asking?";
        body.appendChild(h);
        var sub = document.createElement('div'); sub.className = 'rb-sub';
        sub.textContent = 'Read it carefully. Look for the task words that tell you what to do, then say it back in your own words.';
        body.appendChild(sub);

        var qBox = document.createElement('div'); qBox.className = 'rb-unpack-q';
        qBox.textContent = this._question.question;
        body.appendChild(qBox);

        var label = document.createElement('label'); label.className = 'rb-restate-label';
        label.textContent = 'In your own words, what is this question asking you to do?';
        body.appendChild(label);
        var ta = document.createElement('textarea'); ta.className = 'rb-restate'; ta.rows = 3;
        ta.placeholder = 'This question wants me to...';
        body.appendChild(ta);
    },

    // ---- Step 2: Read ----
    _renderRead: function (body) {
        var h = document.createElement('div'); h.className = 'rb-h'; h.textContent = 'Read about it';
        body.appendChild(h);
        var passages = (this._config.typingPassages || []);
        var topic = this._question.topic;
        var match = null;
        for (var i = 0; i < passages.length; i++) {
            if (passages[i].category === topic) { match = passages[i]; break; }
        }
        if (match) {
            var title = document.createElement('div'); title.className = 'rb-read-title'; title.textContent = match.title || topic;
            body.appendChild(title);
            var p = document.createElement('div'); p.className = 'rb-read-passage'; p.textContent = match.passage;
            body.appendChild(p);
        } else {
            var fb = document.createElement('div'); fb.className = 'rb-read-fallback';
            fb.textContent = 'Look back through your guided notes on "' + topic + '" before you keep going.';
            body.appendChild(fb);
        }
    },

    // ---- Step 3: Terms ----
    _renderTerms: function (body) {
        var self = this;
        var h = document.createElement('div'); h.className = 'rb-h'; h.textContent = 'Know the key terms';
        body.appendChild(h);
        var sub = document.createElement('div'); sub.className = 'rb-sub';
        sub.textContent = 'Tap each term to check what it means. You will want these in your answer.';
        body.appendChild(sub);

        var details = document.createElement('div'); details.className = 'rb-term-details'; details.style.display = 'none';
        var list = document.createElement('div'); list.className = 'rb-term-list';
        var active = null;
        (this._question.keyTerms || []).forEach(function (term) {
            var chip = document.createElement('button');
            chip.type = 'button'; chip.className = 'rb-term-chip'; chip.textContent = term;
            chip.addEventListener('click', function () {
                if (active === chip) { details.style.display = 'none'; chip.classList.remove('rb-term-chip-active'); active = null; return; }
                if (active) active.classList.remove('rb-term-chip-active');
                chip.classList.add('rb-term-chip-active'); active = chip;
                details.style.display = '';
                if (typeof TermDetails !== 'undefined') TermDetails.render(details, term, self._config);
            });
            list.appendChild(chip);
        });
        body.appendChild(list);
        body.appendChild(details);
    },

    // ---- Step 4: Plan (wired in Task 4) ----
    _renderPlan: function (body) {
        var note = document.createElement('div'); note.className = 'rb-sub';
        note.textContent = '(plan step wired in Task 4)';
        body.appendChild(note);
    },

    // ---- Step 5: Draft ----
    _renderDraft: function (body) {
        var self = this;
        var h = document.createElement('div'); h.className = 'rb-h'; h.textContent = 'Write your draft';
        body.appendChild(h);
        var sub = document.createElement('div'); sub.className = 'rb-sub';
        sub.textContent = 'Use your plan and the sentence starters to write your answer. It saves automatically when you finish.';
        body.appendChild(sub);

        var cols = document.createElement('div'); cols.className = 'rb-draft-cols';

        // Left: the plan they built (read-only outline), if present.
        var outline = document.createElement('div'); outline.className = 'rb-draft-outline';
        var oTitle = document.createElement('div'); oTitle.className = 'rb-outline-title'; oTitle.textContent = 'Your plan';
        outline.appendChild(oTitle);
        var plan = this._question.plan || [];
        plan.forEach(function (piece) {
            var row = document.createElement('div'); row.className = 'rb-outline-row rb-outline-' + piece.role;
            var role = document.createElement('span'); role.className = 'rb-outline-role'; role.textContent = piece.role.toUpperCase();
            row.appendChild(role);
            var t = document.createElement('span'); t.textContent = piece.text;
            row.appendChild(t);
            outline.appendChild(row);
        });
        cols.appendChild(outline);

        // Right: the draft textarea + sentence starters.
        var right = document.createElement('div'); right.className = 'rb-draft-right';
        var ta = document.createElement('textarea'); ta.className = 'rb-draft-text'; ta.id = 'rb-draft-text'; ta.rows = 12;
        ta.placeholder = 'Write your response here...';
        var savedDraft = ProgressManager.getActivityProgress(this._config.unit.id, 'short-answer-' + this._qIndex);
        if (savedDraft && savedDraft.answer) ta.value = savedDraft.answer;
        ta.addEventListener('input', function () {
            ProgressManager.saveActivityProgress(self._config.unit.id, 'short-answer-' + self._qIndex, { answer: ta.value });
        });
        right.appendChild(ta);

        var starters = document.createElement('div'); starters.className = 'rb-starters';
        (this._question.sentenceStarters || []).forEach(function (s) {
            var chip = document.createElement('button'); chip.type = 'button'; chip.className = 'rb-starter'; chip.textContent = s;
            chip.addEventListener('click', function () {
                if (ta.value.length > 0 && !/\s$/.test(ta.value)) ta.value += ' ';
                ta.value += s; ta.focus();
                ProgressManager.saveActivityProgress(self._config.unit.id, 'short-answer-' + self._qIndex, { answer: ta.value });
            });
            starters.appendChild(chip);
        });
        right.appendChild(starters);
        cols.appendChild(right);
        body.appendChild(cols);
    },

    deactivate: function () { this._question = null; }
});
```

- [ ] **Step 2: Add the CSS**

In `study-tools/engine/css/styles.css`, append a `.rb-*` block. Mirror the mockup: `.rb-steps` is a flex row; `.rb-step` is a flex column with a `.rb-dot` (28px circle) and `.rb-step-label`; `.rb-done .rb-dot` uses `var(--success)`, `.rb-active .rb-dot` uses `var(--primary)`; a connector line via `.rb-step:not(:last-child)::after`. Style `.rb-q-context`, `.rb-step-body`, `.rb-h`, `.rb-sub`, `.rb-read-passage` (comfortable line-height ~1.6, max readable width), `.rb-term-chip(-active)`, `.rb-draft-cols` (grid 1fr 1.4fr), `.rb-outline-row` color-coded by role, `.rb-nav` (space-between), `.rb-btn(-primary)`. Use the existing CSS custom properties so it themes per unit. No fixed pixel widths that break < 900px laptop screens.

- [ ] **Step 3: Load the activity + register in config**

In `study-tools/engine/index.html`, the activity is auto-loaded by app.js (no static tag needed). But add `response-builder` to the civil-war `activities` array so it is registered. In `study-tools/units/civil-war/config.json`, add `"response-builder"` to the `activities` array (e.g., right after `"short-answer"`).

- [ ] **Step 4: Syntax check**

Run: `node --check study-tools/engine/js/activities/response-builder.js`
Expected: no output (OK).

- [ ] **Step 5: Manual smoke test**

Temporarily, from the browser console on a civil-war page: `StudyEngine.activateActivity('response-builder', [0])`. Confirm the stepper renders, steps 1→2→3→5 navigate (step 4 shows the placeholder), Read shows the matching passage, Terms chips reveal details, Draft shows the textarea and saves. Back from step 1 returns to short-answer.

- [ ] **Step 6: Commit**

```bash
git add study-tools/engine/js/activities/response-builder.js study-tools/engine/css/styles.css study-tools/units/civil-war/config.json
git commit -m "feat(response-builder): wizard shell + steps Unpack/Read/Terms/Draft

Option-A top stepper; reuses typing passages, key terms, and sentence
starters. Step 4 (CER plan) wired next."
```

---

## Task 4: Step 4 — the CER plan builder

Wire `_renderPlan` to use the core logic: labeled skeleton (claim / N evidence / reasoning), tap-a-piece-then-tap-a-row, reject-and-coach on wrong placement, gate Next until complete.

**Files:**
- Modify: `study-tools/engine/js/activities/response-builder.js` (`_renderPlan` + helpers)
- Modify: `study-tools/engine/css/styles.css` (`.rb-cer-*`, `.rb-coach`)
- Modify: `study-tools/engine/index.html` (load `tools/response-builder-core.js`)

- [ ] **Step 1: Load the core globally**

In `study-tools/engine/index.html`, after line 90 (`tools/map-quiz-guard-core.js`), add:

```html
    <script src="tools/response-builder-core.js"></script>
```

- [ ] **Step 2: Implement `_renderPlan`**

Replace the placeholder `_renderPlan` in `response-builder.js` with:

```javascript
    _renderPlan: function (body) {
        var self = this;
        var plan = this._question.plan || [];
        if (!plan.length) { this._step++; this._renderStep(); return; } // safety: no plan -> skip

        var RB = window.ResponseBuilderCore;
        var rowRoles = RB.rowRolesFor(plan);
        this._planRowRoles = rowRoles;
        this._planPlacements = rowRoles.map(function () { return null; });
        this._planPicked = null; // currently picked-up pool piece (element + data)

        var h = document.createElement('div'); h.className = 'rb-h'; h.textContent = 'Build the skeleton of your answer';
        body.appendChild(h);
        var sub = document.createElement('div'); sub.className = 'rb-sub';
        sub.textContent = 'Every strong answer follows Claim → Evidence → Reasoning. Tap a piece below, then tap the part it belongs to.';
        body.appendChild(sub);

        // Skeleton rows
        var skel = document.createElement('div'); skel.className = 'rb-cer-skel';
        var roleHints = { claim: 'your main point', evidence: 'an example that proves it', reasoning: 'why the evidence proves your claim' };
        rowRoles.forEach(function (role, idx) {
            var row = document.createElement('div'); row.className = 'rb-cer-row';
            var roleBox = document.createElement('div'); roleBox.className = 'rb-cer-role rb-cer-role-' + role;
            var rName = document.createElement('div'); rName.textContent = role.toUpperCase(); roleBox.appendChild(rName);
            var rHint = document.createElement('div'); rHint.className = 'rb-cer-role-hint'; rHint.textContent = roleHints[role]; roleBox.appendChild(rHint);
            row.appendChild(roleBox);
            var drop = document.createElement('div'); drop.className = 'rb-cer-drop'; drop.dataset.row = String(idx);
            drop.textContent = 'Tap a piece, then tap here';
            drop.addEventListener('click', function () { self._tryPlace(idx, drop); });
            row.appendChild(drop);
            skel.appendChild(row);
        });
        body.appendChild(skel);

        // Coaching callout (hidden until a wrong placement)
        var coach = document.createElement('div'); coach.className = 'rb-coach'; coach.id = 'rb-coach'; coach.style.display = 'none';
        body.appendChild(coach);

        // Pool (scrambled, deterministic by question index)
        var poolH = document.createElement('div'); poolH.className = 'rb-pool-h'; poolH.textContent = 'Pieces left to place';
        body.appendChild(poolH);
        var pool = document.createElement('div'); pool.className = 'rb-pool'; pool.id = 'rb-pool';
        var scrambled = RB.scramblePlan(plan, this._qIndex >= 0 ? this._qIndex : 0);
        scrambled.forEach(function (piece) {
            var chip = document.createElement('button'); chip.type = 'button'; chip.className = 'rb-pool-chip';
            chip.textContent = piece.text;
            chip._piece = piece;
            chip.addEventListener('click', function () { self._pickPiece(chip); });
            pool.appendChild(chip);
        });
        body.appendChild(pool);

        // Next stays disabled until complete.
        this._refreshPlanNext();
    },

    _pickPiece: function (chip) {
        if (chip.classList.contains('rb-pool-chip-placed')) return;
        var pool = document.getElementById('rb-pool');
        var chips = pool.querySelectorAll('.rb-pool-chip');
        for (var i = 0; i < chips.length; i++) chips[i].classList.remove('rb-pool-chip-picked');
        chip.classList.add('rb-pool-chip-picked');
        this._planPicked = chip;
        this._hideCoach();
    },

    _tryPlace: function (rowIdx, drop) {
        var self = this;
        if (!this._planPicked) return;                 // nothing picked
        if (this._planPlacements[rowIdx]) return;      // row already filled
        var piece = this._planPicked._piece;
        var rowRole = this._planRowRoles[rowIdx];
        if (window.ResponseBuilderCore.checkPlacement(piece, rowRole)) {
            // correct
            this._planPlacements[rowIdx] = piece;
            drop.textContent = piece.text;
            drop.classList.add('rb-cer-drop-filled', 'rb-cer-drop-correct');
            this._planPicked.classList.add('rb-pool-chip-placed');
            this._planPicked.classList.remove('rb-pool-chip-picked');
            this._planPicked = null;
            this._hideCoach();
            this._refreshPlanNext();
        } else {
            // wrong -> shake the drop, coach, leave row open
            drop.classList.add('rb-cer-drop-shake');
            setTimeout(function () { drop.classList.remove('rb-cer-drop-shake'); }, 450);
            this._showCoach(piece.role, rowRole);
        }
    },

    _showCoach: function (pieceRole, attemptedRole) {
        var coach = document.getElementById('rb-coach');
        if (!coach) return;
        coach.textContent = '';
        var ic = document.createElement('span'); ic.className = 'rb-coach-ic'; ic.textContent = '💡';
        coach.appendChild(ic);
        var txt = document.createElement('span'); txt.className = 'rb-coach-txt';
        var msg = 'That piece is ' + pieceRole.toUpperCase() + '. ' + window.ResponseBuilderCore.roleCoaching(pieceRole) +
                  ' It does not belong in the ' + attemptedRole.toUpperCase() + ' row. Try again.';
        txt.textContent = msg;
        coach.appendChild(txt);
        coach.style.display = '';
    },

    _hideCoach: function () {
        var coach = document.getElementById('rb-coach');
        if (coach) coach.style.display = 'none';
    },

    _refreshPlanNext: function () {
        var complete = window.ResponseBuilderCore.isPlanComplete(this._planRowRoles, this._planPlacements);
        var next = document.getElementById('rb-next');
        if (next) {
            next.disabled = !complete;
            next.classList.toggle('rb-btn-disabled', !complete);
        }
    },
```

- [ ] **Step 3: Add Step-4 CSS**

In `styles.css`, add `.rb-cer-skel` (column gap), `.rb-cer-row` (grid `150px 1fr`), `.rb-cer-role(-claim/-evidence/-reasoning)` colored boxes with `.rb-cer-role-hint`, `.rb-cer-drop` (dashed → solid `.rb-cer-drop-filled`, green `.rb-cer-drop-correct`, red shake `.rb-cer-drop-shake` with a `@keyframes rb-shake`), `.rb-coach` (danger-tinted callout) with `.rb-coach-ic`/`.rb-coach-txt`, `.rb-pool`/`.rb-pool-chip(-picked/-placed)`. Reuse the recent map-quiz shake keyframe shape. Use theme custom properties; greens/reds can reuse `--success`/`--danger`.

- [ ] **Step 4: Syntax check + core tests**

Run: `node --check study-tools/engine/js/activities/response-builder.js && cd study-tools/engine && node tools/response-builder-core.test.js`
Expected: OK / `OK`.

- [ ] **Step 5: Manual test of Step 4**

From a civil-war page console: `StudyEngine.activateActivity('response-builder', [0])`, advance to step 4. Verify: (a) correct placement locks green and removes the chip from the pool; (b) a wrong placement shakes and shows the coaching line naming the real role; (c) Next is disabled until all rows are correctly filled; (d) reaching step 5 shows the built plan beside the textarea.

- [ ] **Step 6: Commit**

```bash
git add study-tools/engine/js/activities/response-builder.js study-tools/engine/css/styles.css study-tools/engine/index.html
git commit -m "feat(response-builder): Step 4 CER plan builder with reject-and-coach

Labeled Claim/Evidence/Reasoning skeleton; tap-to-place; wrong placements
shake and explain the role; Next gated until the plan is complete."
```

---

## Task 5: Launch button in Short Answer + return deep-link

**Files:**
- Modify: `study-tools/engine/js/activities/short-answer.js`

- [ ] **Step 1: Add the launch button in `openQuestion`**

In `openQuestion(index)`, immediately after the question text is appended (after `contentArea.appendChild(questionDiv);`, ~line 276), add the button only when the question has a `plan`:

```javascript
        // "Help me build a response" — launches the guided wizard for this
        // question. Only shown when the question has a plan to build (Step 4).
        if (q.plan && q.plan.length) {
            var helpBtn = document.createElement('button');
            helpBtn.className = 'sa-help-btn';
            var helpIcon = document.createElement('i');
            helpIcon.className = 'fas fa-pen-ruler';
            helpBtn.appendChild(helpIcon);
            helpBtn.appendChild(document.createTextNode(' Help me build a response'));
            helpBtn.addEventListener('click', function () {
                StudyEngine.activateActivity('response-builder', [index]);
            });
            contentArea.appendChild(helpBtn);
        }
```

- [ ] **Step 2: Add deep-link auto-open for the return trip**

In `render(container, config)`, after `this._activeIndex = -1;` (~line 134), read the deep-link param and auto-open that question after the grid is built. At the end of `render` (after the grid is appended), add:

```javascript
        // If launched/returned with a deep-link question index, open it directly.
        var rbParams = this._deepLinkParams || [];
        if (rbParams.length >= 1) {
            var openIdx = parseInt(rbParams[0], 10);
            if (!isNaN(openIdx) && openIdx >= 0 && openIdx < this.questions.length) {
                var grid = document.getElementById('sa-card-grid');
                if (grid) grid.style.display = 'none';
                var ca = document.getElementById('sa-content-area');
                if (ca) ca.classList.add('sa-active');
                this.openQuestion(openIdx);
            }
            this._deepLinkParams = []; // consume so a later plain open shows the grid
        }
```

(Confirm the exact element ids `sa-card-grid` / `sa-content-area` against the current file before wiring; they are referenced in the existing back-button handler.)

- [ ] **Step 3: Add the button CSS**

In `styles.css`, add `.sa-help-btn` — a prominent call-to-action using `var(--primary)` background, white text, full-ish width, a little vertical margin so it sits clearly between the question and the reference sections.

- [ ] **Step 4: Syntax check**

Run: `node --check study-tools/engine/js/activities/short-answer.js`
Expected: OK.

- [ ] **Step 5: Manual round-trip test**

On a civil-war short-answer question that has a `plan`: click "Help me build a response" → wizard opens at step 1 → walk to Finish → lands back on that same question's detail panel with the draft preserved. Also confirm a question with NO `plan` shows no button.

- [ ] **Step 6: Commit**

```bash
git add study-tools/engine/js/activities/short-answer.js study-tools/engine/css/styles.css
git commit -m "feat(short-answer): launch + return for the response-builder wizard

Adds the 'Help me build a response' button (only when the question has a
plan) and deep-link auto-open so finishing the wizard returns to the question."
```

---

## Task 6: Author the 6 CER plans for civil-war

Derive each `plan` from the question's existing `exemplar` (primary method), then patch anything that does not split cleanly.

**Files:**
- Modify: `study-tools/units/civil-war/config.json`

- [ ] **Step 1: Read each exemplar**

Run: `python3 -c "import json; sa=json.load(open('study-tools/units/civil-war/config.json'))['shortAnswerQuestions']; [print('--- Q'+str(i)+' ---\n', q['question'], '\nEXEMPLAR:\n', q['exemplar'], '\n') for i,q in enumerate(sa)]"`

- [ ] **Step 2: For each question, write a `plan` array**

Decompose each exemplar into: 1 `claim` (the opening main-point sentence), 2 `evidence` pieces (the specific examples), 1 `reasoning` (the big-picture "why it mattered" sentence). Keep each piece one student-readable sentence; condense long exemplar sentences. Add the `plan` field to each question object. Example shape (Q0, geography):

```json
"plan": [
  { "role": "claim", "text": "Geography pushed the North and the South down two very different paths." },
  { "role": "evidence", "text": "The North had cold winters, rocky soil, and fast rivers, so it built factories during the Industrial Revolution." },
  { "role": "evidence", "text": "The South had warm weather and rich soil, so it grew cotton on huge plantations worked by enslaved people." },
  { "role": "reasoning", "text": "By 1850 these opposite economies had grown into two societies with completely different needs." }
]
```

Note questions whose exemplar lacks a clear claim or reasoning sentence; write those pieces by hand (these are the "address anything missing" cases the teacher flagged).

- [ ] **Step 3: Validate the config still parses + plan shape is sound**

Run:
```bash
python3 -c "
import json
sa = json.load(open('study-tools/units/civil-war/config.json'))['shortAnswerQuestions']
for i,q in enumerate(sa):
    p = q.get('plan')
    assert p, 'Q%d missing plan' % i
    roles = [x['role'] for x in p]
    assert roles[0]=='claim' and roles[-1]=='reasoning', 'Q%d bad order: %s' % (i, roles)
    assert roles.count('evidence')>=1, 'Q%d needs evidence' % i
    assert all(x.get('text','').strip() for x in p), 'Q%d empty text' % i
print('all 6 plans valid')
"
```
Expected: `all 6 plans valid`

- [ ] **Step 4: Manual content review (teacher)**

Have the teacher read the 6 plans for accuracy and 8th-grade clarity; fix wording. (This is a content-quality gate, not a code gate.)

- [ ] **Step 5: Commit**

```bash
git add study-tools/units/civil-war/config.json
git commit -m "content(civil-war): add CER plans to short-answer questions

Powers the response-builder Step 4. Derived from each question's exemplar."
```

---

## Task 7: Ship — version, README, full verification

**Files:**
- Modify: `study-tools/engine/version.json`, `README.md`

- [ ] **Step 1: Full test + syntax sweep**

```bash
cd study-tools/engine
node tools/response-builder-core.test.js
node tools/question-export-core.test.js
node tools/map-quiz-guard-core.test.js
for f in js/activities/response-builder.js js/activities/short-answer.js js/core/term-details.js tools/response-builder-core.js; do node --check "$f" && echo "OK $f"; done
```
Expected: `OK` for each test and each file.

- [ ] **Step 2: End-to-end manual walkthrough**

On civil-war, for at least 2 questions: open question → "Help me build a response" → all 5 steps (unpack restate, read passage, term details, CER plan with a deliberate wrong placement to see coaching, draft with plan + starters) → Finish → back on the question with draft saved. Confirm a plan-less question (if any added later) shows no button.

- [ ] **Step 3: Bump version + README**

`study-tools/engine/version.json` → bump patch/minor (this is a feature → minor bump, e.g. `8.46.0`, date `2026-06-02`). Update the README version badge to match.

- [ ] **Step 4: Commit**

```bash
git add study-tools/engine/version.json README.md
git commit -m "chore: response-builder wizard for short-answer, vX.Y.Z

Guided 5-step Claim/Evidence/Reasoning response builder, live for civil-war."
```

- [ ] **Step 5: Stop — confirm with the teacher before pushing**

Do not push. Summarize what shipped and ask whether to push to `main` (the teacher decides pushes).

---

## Self-Review notes

- **Spec coverage:** entry button (T5), Option-A shell (T3), all 5 steps (T3 + T4), `plan` field + derivation (T6), role coaching reused (T1/T4), handoff via deep-link both directions (T3/T5), pure testable core (T1), term-details reuse (T2), CSS namespacing (T3/T4), version/README (T7). Non-goals respected (no auto-grade, no mobile mode, civil-war only).
- **Open questions:** all three resolved at the top and reflected in tasks (button hidden when no plan — T5 Step 1; evidence rows data-driven — T1 `rowRolesFor` + T4; term-details extracted — T2).
- **Type consistency:** `rowRolesFor`, `checkPlacement`, `isPlanComplete(rowRoles, placements)`, `roleCoaching`, `scramblePlan(plan, seed)` are defined in T1 and used with the same signatures in T4. `_deepLinkParams[0]` is the question index in both directions. Progress key `short-answer-<index>` is shared between the wizard draft (T3 Step 5) and the existing Short Answer save.
- **Verify-before-claim:** element ids `sa-card-grid` / `sa-content-area` are flagged for confirmation against the live file in T5 Step 2.
