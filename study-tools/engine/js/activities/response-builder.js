// Response Builder: a guided 5-step wizard that helps a student who is stuck on
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
    _transitioning: false,
    _planRowRoles: null,
    _planPlacements: null,
    _planPicked: null,

    render: function (container, config) {
        this._config = config;
        this._container = container;
        var params = this._deepLinkParams || [];
        this._qIndex = params.length >= 1 ? parseInt(params[0], 10) : -1;
        var all = (config.shortAnswerQuestions || []);
        this._question = (this._qIndex >= 0 && this._qIndex < all.length) ? all[this._qIndex] : null;
        this._step = 1;
        if (!this._question) {
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
        else if (this._step === 4) this._renderPlan(body);
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
            if (self._transitioning) return;
            self._transitioning = true;
            if (self._step === 1) { self._exitToQuestion(); return; } // tearing down; no need to clear
            self._step--;
            self._renderStep();
            // Clear on the next tick so a second click queued in the SAME tick
            // (a fast double-click on the freshly-rendered button) is dropped.
            setTimeout(function () { self._transitioning = false; }, 0);
        });
        nav.appendChild(back);
        var next = document.createElement('button');
        next.className = 'rb-btn rb-btn-primary';
        next.id = 'rb-next';
        next.textContent = this._step === this._maxStep ? 'Finish →' : 'Next: ' + this._stepTitles[this._step] + ' →';
        // Step 4 (the CER plan builder) gates Next until the plan is correctly
        // assembled. The body is rendered BEFORE this nav is appended, so when
        // _renderPlan() calls _refreshPlanNext() the #rb-next button does not yet
        // exist in the DOM. We set the initial disabled state here, at creation,
        // where _planRowRoles/_planPlacements are already populated. Subsequent
        // placements re-enable it via _refreshPlanNext() once the button is live.
        if (this._step === 4 && this._planRowRoles) {
            var complete = window.ResponseBuilderCore.isPlanComplete(this._planRowRoles, this._planPlacements);
            next.disabled = !complete;
            if (!complete) next.classList.add('rb-btn-disabled');
        }
        next.addEventListener('click', function () {
            if (self._transitioning) return;
            self._transitioning = true;
            if (self._step === self._maxStep) { self._exitToQuestion(); return; } // tearing down; no need to clear
            self._step++;
            self._renderStep();
            // Clear on the next tick so a second click queued in the SAME tick
            // (a fast double-click on the freshly-rendered button) is dropped.
            setTimeout(function () { self._transitioning = false; }, 0);
        });
        nav.appendChild(next);
        return nav;
    },

    _exitToQuestion: function () {
        StudyEngine.activateActivity('short-answer', [this._qIndex]);
    },

    _renderUnpack: function (body) {
        var self = this;
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
        var savedRestate = ProgressManager.getActivityProgress(this._config.unit.id, 'response-builder-restate-' + this._qIndex);
        if (savedRestate && savedRestate.text) ta.value = savedRestate.text;
        ta.addEventListener('input', function () {
            ProgressManager.saveActivityProgress(self._config.unit.id, 'response-builder-restate-' + self._qIndex, { text: ta.value });
        });
        body.appendChild(ta);
    },

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

    _renderPlan: function (body) {
        var self = this;
        var plan = this._question.plan || [];
        if (!plan.length) {
            // Safety: a question with no plan skips Step 4. Defer the advance to the
            // next tick so the current _renderStep call fully unwinds first;
            // re-rendering synchronously here would corrupt the container (the outer
            // _renderStep would append a stale body/nav onto the rebuilt step).
            var selfSkip = this;
            setTimeout(function () { selfSkip._step++; selfSkip._renderStep(); }, 0);
            return;
        }

        var RB = window.ResponseBuilderCore;
        var rowRoles = RB.rowRolesFor(plan);
        this._planRowRoles = rowRoles;
        // Note: placements reset on every Step 4 entry (Back->Next re-solves the
        // short puzzle from scratch; the scramble is deterministic so pieces land
        // in the same spots). Intentional, not persisted like the draft.
        this._planPlacements = rowRoles.map(function () { return null; });
        this._planPicked = null;

        var h = document.createElement('div'); h.className = 'rb-h'; h.textContent = 'Build the skeleton of your answer';
        body.appendChild(h);
        var sub = document.createElement('div'); sub.className = 'rb-sub';
        sub.textContent = 'Every strong answer follows Claim, then Evidence, then Reasoning. Tap a piece below, then tap the part it belongs to.';
        body.appendChild(sub);

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

        var coach = document.createElement('div'); coach.className = 'rb-coach'; coach.id = 'rb-coach'; coach.style.display = 'none';
        body.appendChild(coach);

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
        if (!this._planPicked) return;
        if (this._planPlacements[rowIdx]) return; // row already filled
        var piece = this._planPicked._piece;
        var rowRole = this._planRowRoles[rowIdx];
        if (window.ResponseBuilderCore.checkPlacement(piece, rowRole)) {
            this._planPlacements[rowIdx] = piece;
            drop.textContent = piece.text;
            drop.classList.add('rb-cer-drop-filled', 'rb-cer-drop-correct');
            this._planPicked.classList.add('rb-pool-chip-placed');
            this._planPicked.classList.remove('rb-pool-chip-picked');
            this._planPicked = null;
            this._hideCoach();
            this._refreshPlanNext();
        } else {
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
        txt.textContent = 'That piece is ' + pieceRole.toUpperCase() + '. ' + window.ResponseBuilderCore.roleCoaching(pieceRole) +
            ' It does not belong in the ' + attemptedRole.toUpperCase() + ' row. Try again.';
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

    _renderDraft: function (body) {
        var self = this;
        var h = document.createElement('div'); h.className = 'rb-h'; h.textContent = 'Write your draft';
        body.appendChild(h);
        var sub = document.createElement('div'); sub.className = 'rb-sub';
        sub.textContent = 'Use your plan and the sentence starters to write your answer. It saves automatically when you finish.';
        body.appendChild(sub);
        var cols = document.createElement('div'); cols.className = 'rb-draft-cols';
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
