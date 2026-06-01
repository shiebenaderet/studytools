// 50 States Map — identify all 50 US states by clicking their outlines.
// Learn mode: hover/tap shows the state name; click pins it with a fact panel.
// Quiz mode: a state name is shown; student clicks the matching state on the map.
//
// Geometry comes from window.FIFTY_STATES_DATA. Each state has one or more
// SVG path strings (state polygon), an optional labelBox for label placement,
// and an optional extended hitbox for tiny northeastern states.
//
// Hidden by default so it's reached through the maps-hub chooser, not the
// home grid directly. Add to a unit's `mapsHub.maps` to expose it.
StudyEngine.registerActivity({
    id: 'fifty-states-map',
    name: '50 States',
    icon: 'fas fa-flag',
    description: 'Identify every US state on a map of the country.',
    category: 'study',
    hidden: true,

    _container: null,
    _config: null,
    _mode: null,             // 'menu' | 'learn' | 'quiz'
    _selectedState: null,    // Learn-mode current selection
    _quizStates: null,       // Shuffled queue in Quiz mode
    _quizIndex: 0,
    _quizScore: 0,
    _quizStartTime: null,

    render(container, config) {
        this._container = container;
        this._config = config;
        this._showMenu();
    },

    _showMenu() {
        var c = this._container;
        c.textContent = '';
        c.className = 'cw-map-screen';

        var wrap = document.createElement('div');
        wrap.className = 'cw-map-menu';

        var title = document.createElement('h2');
        title.textContent = '50 States';
        wrap.appendChild(title);

        var desc = document.createElement('p');
        desc.className = 'cw-map-menu-desc';
        desc.textContent = 'All fifty US states. Use Learn mode to explore the map, or take the quiz to test yourself.';
        wrap.appendChild(desc);

        var modes = document.createElement('div');
        modes.className = 'cw-map-modes';
        var self = this;
        modes.appendChild(this._modeCard('Learn Mode', 'Hover or click any state to read a quick fact. No scoring.', 'fas fa-book-open', function() { self._startLearn(); }));
        modes.appendChild(this._modeCard('Quiz Mode', 'You\'ll be given a state name. Click it on the map. Track your score.', 'fas fa-bullseye', function() { self._startQuiz(); }));
        wrap.appendChild(modes);

        var saved = ProgressManager.getActivityProgress(this._config.unit.id, 'fifty-states-map') || {};
        if (typeof saved.bestScore === 'number') {
            var best = document.createElement('div');
            best.className = 'cw-map-best';
            var total = window.FIFTY_STATES_DATA.length;
            best.textContent = 'Personal best: ' + saved.bestScore + '/' + total +
                (saved.bestTime ? ' in ' + this._formatTime(saved.bestTime) : '');
            wrap.appendChild(best);
        }

        c.appendChild(wrap);
    },

    _modeCard(title, desc, iconClass, onClick) {
        var card = document.createElement('button');
        card.className = 'cw-map-mode-card';
        var iconWrap = document.createElement('div');
        iconWrap.className = 'cw-map-mode-icon';
        var icon = document.createElement('i');
        icon.className = iconClass;
        iconWrap.appendChild(icon);
        card.appendChild(iconWrap);
        var h = document.createElement('h3');
        h.textContent = title;
        card.appendChild(h);
        var p = document.createElement('p');
        p.textContent = desc;
        card.appendChild(p);
        card.addEventListener('click', onClick);
        return card;
    },

    // ─── Learn ────────────────────────────────────────────

    _startLearn() {
        this._mode = 'learn';
        this._selectedState = null;
        this._renderMap('learn');
    },

    // ─── Quiz ─────────────────────────────────────────────

    _startQuiz() {
        this._mode = 'quiz';
        var states = window.FIFTY_STATES_DATA.slice();
        for (var i = states.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = states[i]; states[i] = states[j]; states[j] = t;
        }
        this._quizStates = states;
        this._quizIndex = 0;
        this._quizScore = 0;
        this._quizStartTime = Date.now();
        this._renderMap('quiz');
    },

    // ─── Map render ───────────────────────────────────────

    _renderMap(mode) {
        var c = this._container;
        c.textContent = '';
        c.className = 'cw-map-screen cw-map-' + mode + ' fs-map';

        var header = document.createElement('div');
        header.className = 'cw-map-header';
        var backBtn = document.createElement('button');
        backBtn.className = 'cw-map-back-btn';
        var backIcon = document.createElement('i');
        backIcon.className = 'fas fa-arrow-left';
        backBtn.appendChild(backIcon);
        backBtn.appendChild(document.createTextNode(' Back'));
        backBtn.addEventListener('click', this._showMenu.bind(this));
        header.appendChild(backBtn);
        var headerInfo = document.createElement('div');
        headerInfo.className = 'cw-map-header-info';
        headerInfo.id = 'fs-map-header-info';
        header.appendChild(headerInfo);
        c.appendChild(header);

        var svgWrap = document.createElement('div');
        svgWrap.className = 'cw-map-svg-wrap';

        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 900 700');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.setAttribute('class', 'fs-map-svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        // State polygons (each state is a <g> with one or more <path>s).
        var statesData = window.FIFTY_STATES_DATA || [];
        for (var s = 0; s < statesData.length; s++) {
            this._renderState(svg, statesData[s], mode);
        }

        // Learn mode: clicking blank space dismisses the fact panel.
        // Quiz mode: clicking blank space does nothing — misclicks should not
        // be marked wrong (reported by Tianyu, 2026-05-30).
        if (mode === 'learn') {
            svg.addEventListener('click', this._dismissLearnSelection.bind(this));
        }

        svgWrap.appendChild(svg);
        c.appendChild(svgWrap);

        if (mode === 'learn') this._renderLearnPanel();
        else this._renderQuizPanel();
    },

    _renderState(parent, state, mode) {
        var self = this;
        var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'fs-state');
        g.dataset.stateId = state.id;

        // Extended hitbox (transparent, drawn first so it sits under the visible
        // polygon and catches clicks for tiny states like Delaware/Rhode Island).
        if (state.hitbox) {
            var hb;
            if (state.hitbox.type === 'ellipse') {
                hb = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                hb.setAttribute('cx', state.hitbox.cx);
                hb.setAttribute('cy', state.hitbox.cy);
                hb.setAttribute('rx', state.hitbox.rx);
                hb.setAttribute('ry', state.hitbox.ry);
            } else if (state.hitbox.type === 'path') {
                hb = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                hb.setAttribute('d', state.hitbox.d);
            }
            if (hb) {
                hb.setAttribute('class', 'fs-state-hitbox');
                hb.setAttribute('fill', 'transparent');
                g.appendChild(hb);
            }
        }

        // Visible polygon(s). Multi-path states (Maryland, Michigan with its
        // upper peninsula, Hawaii's islands, etc.) all join the same group so
        // they highlight together.
        for (var i = 0; i < state.paths.length; i++) {
            var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p.setAttribute('d', state.paths[i]);
            p.setAttribute('class', 'fs-state-path');
            g.appendChild(p);
        }

        // Label box → text positioned over the state's labelBox center, but
        // only in Learn mode. Quiz mode hides labels so students actually have
        // to identify states by shape and position.
        if (mode === 'learn' && state.labelBox) {
            var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('x', state.labelBox.x + state.labelBox.w / 2);
            t.setAttribute('y', state.labelBox.y + state.labelBox.h / 2 + 4);
            t.setAttribute('class', 'fs-state-label');
            t.setAttribute('text-anchor', 'middle');
            t.setAttribute('pointer-events', 'none');
            t.textContent = self._shortLabel(state.name);
            g.appendChild(t);
        }

        if (mode === 'learn') {
            g.addEventListener('click', function(e) {
                e.stopPropagation();
                self._selectLearnState(state);
            });
            g.addEventListener('mouseenter', function() {
                g.classList.add('hover');
            });
            g.addEventListener('mouseleave', function() {
                g.classList.remove('hover');
            });
        } else {
            g.addEventListener('click', function(e) {
                e.stopPropagation();
                self._onStateClickQuiz(state);
            });
        }

        parent.appendChild(g);
    },

    // Short labels for tightly clustered states so they fit inside the polygon.
    _shortLabel(name) {
        var short = {
            'Rhode Island': 'RI', 'Connecticut': 'CT', 'Massachusetts': 'MA',
            'New Hampshire': 'NH', 'Vermont': 'VT', 'New Jersey': 'NJ',
            'Delaware': 'DE', 'Maryland': 'MD'
        };
        return short[name] || name;
    },

    // ─── Learn mode interactions ─────────────────────────

    _selectLearnState(state) {
        this._selectedState = state;
        var groups = this._container.querySelectorAll('.fs-state');
        for (var i = 0; i < groups.length; i++) {
            groups[i].classList.toggle('selected', groups[i].dataset.stateId === state.id);
        }
        this._renderLearnPanel();
    },

    _dismissLearnSelection() {
        if (this._mode !== 'learn') return;
        this._selectedState = null;
        var groups = this._container.querySelectorAll('.fs-state');
        for (var i = 0; i < groups.length; i++) groups[i].classList.remove('selected');
        this._renderLearnPanel();
    },

    _renderLearnPanel() {
        var existing = document.getElementById('fs-map-panel');
        if (existing) existing.remove();

        var panel = document.createElement('div');
        panel.id = 'fs-map-panel';
        panel.className = 'cw-map-panel';

        if (!this._selectedState) {
            var hint = document.createElement('p');
            hint.className = 'cw-map-panel-hint';
            hint.textContent = 'Click any state to see its name and a quick fact.';
            panel.appendChild(hint);
        } else {
            var s = this._selectedState;
            var name = document.createElement('h3');
            name.className = 'cw-map-panel-name';
            name.textContent = s.name;
            panel.appendChild(name);

            var fact = window.FIFTY_STATES_FACTS && window.FIFTY_STATES_FACTS[s.id];
            var factText = document.createElement('p');
            factText.className = 'cw-map-panel-desc';
            factText.textContent = fact || ('Capital, region, and admission-year fact for ' + s.name + ' coming soon.');
            panel.appendChild(factText);
        }

        this._container.appendChild(panel);
    },

    // ─── Quiz mode interactions ─────────────────────────

    _onStateClickQuiz(clicked) {
        if (this._quizIndex >= this._quizStates.length) return;
        var target = this._quizStates[this._quizIndex];
        var correct = clicked.id === target.id;
        if (correct) this._quizScore++;
        this._showQuizFeedback(correct, target, clicked);
    },

    _showQuizFeedback(correct, target, clicked) {
        var targetEl = this._container.querySelector('.fs-state[data-state-id="' + target.id + '"]');
        if (targetEl) targetEl.classList.add('fs-flash-correct');
        if (!correct && clicked) {
            var wrongEl = this._container.querySelector('.fs-state[data-state-id="' + clicked.id + '"]');
            if (wrongEl) wrongEl.classList.add('fs-flash-wrong');
        }

        var msg = document.createElement('div');
        msg.className = 'cw-map-feedback ' + (correct ? 'correct' : 'wrong');
        if (correct) msg.textContent = 'Correct! ' + target.name + '.';
        else if (clicked) msg.textContent = 'That was ' + clicked.name + '. ' + target.name + ' is highlighted.';
        else msg.textContent = target.name + ' is highlighted.';
        this._container.appendChild(msg);

        var self = this;
        setTimeout(function() {
            msg.remove();
            if (targetEl) {
                targetEl.classList.remove('fs-flash-correct');
                // Mark the target state as answered so it dims for the rest of
                // the quiz. We don't distinguish right vs wrong here — both look
                // the same — to avoid leaving a visual map of mistakes that
                // could discourage students mid-quiz.
                targetEl.classList.add('fs-answered');
            }
            var w = self._container.querySelector('.fs-flash-wrong');
            if (w) w.classList.remove('fs-flash-wrong');
            self._quizIndex++;
            self._renderQuizPanel();
        }, 1400);
    },

    _renderQuizPanel() {
        var existing = document.getElementById('fs-map-panel');
        if (existing) existing.remove();

        var panel = document.createElement('div');
        panel.id = 'fs-map-panel';
        panel.className = 'cw-map-panel cw-map-panel-quiz';

        var info = document.getElementById('fs-map-header-info');
        if (info) {
            info.textContent = '';
            var scoreEl = document.createElement('span');
            scoreEl.className = 'cw-map-score';
            scoreEl.textContent = 'Score: ' + this._quizScore + ' / ' + this._quizStates.length;
            info.appendChild(scoreEl);
            var progEl = document.createElement('span');
            progEl.className = 'cw-map-progress';
            progEl.textContent = 'Question ' + Math.min(this._quizIndex + 1, this._quizStates.length) + ' of ' + this._quizStates.length;
            info.appendChild(progEl);
        }

        if (this._quizIndex >= this._quizStates.length) {
            this._renderQuizResults(panel);
        } else {
            // Progress bar: shows how many states have been asked so far.
            // Doesn't reveal right vs wrong — just "asked so far / total" so
            // students get glanceable progress without seeing their mistakes.
            var total = this._quizStates.length;
            var done = this._quizIndex;
            var progWrap = document.createElement('div');
            progWrap.className = 'fs-progress';

            var progLabel = document.createElement('div');
            progLabel.className = 'fs-progress-label';
            progLabel.textContent = done + ' of ' + total + ' states asked';
            progWrap.appendChild(progLabel);

            var progBar = document.createElement('div');
            progBar.className = 'fs-progress-bar';
            var progFill = document.createElement('div');
            progFill.className = 'fs-progress-fill';
            progFill.style.width = ((done / total) * 100).toFixed(1) + '%';
            progBar.appendChild(progFill);
            progWrap.appendChild(progBar);

            panel.appendChild(progWrap);

            var current = this._quizStates[this._quizIndex];
            var prompt = document.createElement('div');
            prompt.className = 'cw-map-prompt';
            var promptLabel = document.createElement('div');
            promptLabel.className = 'cw-map-prompt-label';
            promptLabel.textContent = 'Find:';
            prompt.appendChild(promptLabel);
            var promptName = document.createElement('div');
            promptName.className = 'cw-map-prompt-name';
            promptName.textContent = current.name;
            prompt.appendChild(promptName);
            panel.appendChild(prompt);
        }

        this._container.appendChild(panel);
    },

    _renderQuizResults(panel) {
        var elapsed = Math.floor((Date.now() - this._quizStartTime) / 1000);
        var total = this._quizStates.length;
        var pct = Math.round((this._quizScore / total) * 100);

        var unitId = this._config.unit.id;
        var saved = ProgressManager.getActivityProgress(unitId, 'fifty-states-map') || {};
        var prevBest = typeof saved.bestScore === 'number' ? saved.bestScore : -1;
        var prevTime = saved.bestTime || null;
        ProgressManager.saveActivityProgress(unitId, 'fifty-states-map', {
            bestScore: Math.max(prevBest, this._quizScore),
            bestTime: pct === 100 ? (prevTime === null ? elapsed : Math.min(prevTime, elapsed)) : prevTime,
            attempts: (saved.attempts || 0) + 1,
            lastPlayed: new Date().toISOString()
        });

        var heading = document.createElement('h2');
        heading.className = 'cw-map-results-heading';
        heading.textContent = pct === 100 ? 'Perfect Score!' : 'Quiz Complete';
        panel.appendChild(heading);

        var summary = document.createElement('p');
        summary.className = 'cw-map-results-summary';
        summary.textContent = this._quizScore + ' of ' + total + ' correct in ' + this._formatTime(elapsed) + '.';
        panel.appendChild(summary);

        var actions = document.createElement('div');
        actions.className = 'cw-map-results-actions';
        var self = this;
        var again = document.createElement('button');
        again.className = 'cw-map-results-btn primary';
        again.textContent = 'Try Again';
        again.addEventListener('click', function() { self._startQuiz(); });
        actions.appendChild(again);
        var menu = document.createElement('button');
        menu.className = 'cw-map-results-btn';
        menu.textContent = 'Back to Menu';
        menu.addEventListener('click', function() { self._showMenu(); });
        actions.appendChild(menu);
        panel.appendChild(actions);
    },

    _formatTime(seconds) {
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }
});
