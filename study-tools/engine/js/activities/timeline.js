StudyEngine.registerActivity({
    id: 'timeline',
    name: 'Timeline',
    icon: 'fas fa-history',
    description: 'Put key events in chronological order',
    category: 'study',
    requires: ['timelineEvents'],

    _attempts: 0,
    _perfectCount: 0,
    _showYears: false,
    _container: null,
    _config: null,
    _selectedCard: null,
    _selectedSlot: null,

    // A unit with `timelineThreads` gets story threads: short chains of events
    // in cause order, with a "why" link to choose between each pair, and the
    // full dated timeline below as a bonus once every thread is done. A unit
    // without threads gets the dated timeline straight away, as before.
    render(container, config) {
        this._container = container;
        this._config = config;
        if ((config.timelineThreads || []).length) {
            this._showYears = false;
            this._showThreads();
            return;
        }
        this._renderClassic(container, config);
    },

    _renderClassic(container, config) {
        this._container = container;
        this._config = config;
        this._selectedCard = null;
        this._selectedSlot = null;

        var saved = ProgressManager.getActivityProgress(config.unit.id, 'timeline');
        this._attempts = saved?.attempts || 0;
        this._perfectCount = saved?.perfectCount || 0;

        var events = config.timelineEvents;
        if (!events || events.length === 0) return;

        var shuffled = this._shuffle([...events]);

        var wrapper = document.createElement('div');
        wrapper.className = 'tl-wrapper';
        wrapper.id = 'tl-wrapper';
        var self = this;

        if ((config.timelineThreads || []).length) {
            var backToThreads = document.createElement('button');
            backToThreads.className = 'tl-link-btn';
            var backIcon = document.createElement('i');
            backIcon.className = 'fas fa-chevron-left';
            backToThreads.appendChild(backIcon);
            backToThreads.appendChild(document.createTextNode(' Story threads'));
            backToThreads.addEventListener('click', function() { self._showThreads(); });
            wrapper.appendChild(backToThreads);
        }

        // Header
        var header = document.createElement('div');
        header.className = 'tl-header';

        var title = document.createElement('h2');
        var titleIcon = document.createElement('i');
        titleIcon.className = 'fas fa-history';
        title.appendChild(titleIcon);
        title.appendChild(document.createTextNode((config.timelineThreads || []).length ? ' Full Timeline' : ' Timeline Challenge'));
        header.appendChild(title);

        var controls = document.createElement('div');
        controls.className = 'tl-controls';

        var toggleBtn = document.createElement('button');
        toggleBtn.className = 'tl-toggle-btn';
        toggleBtn.id = 'tl-year-toggle';
        var eyeIcon = document.createElement('i');
        eyeIcon.className = this._showYears ? 'fas fa-eye-slash' : 'fas fa-eye';
        toggleBtn.appendChild(eyeIcon);
        toggleBtn.appendChild(document.createTextNode(this._showYears ? ' Hide Years' : ' Show Years'));
        toggleBtn.addEventListener('click', function() {
            self._showYears = !self._showYears;
            var oldWrapper = document.getElementById('tl-wrapper');
            if (oldWrapper) oldWrapper.remove();
            self._renderClassic(self._container, self._config);
        });
        controls.appendChild(toggleBtn);

        var shuffleBtn = document.createElement('button');
        shuffleBtn.className = 'tl-toggle-btn';
        var shuffleIcon = document.createElement('i');
        shuffleIcon.className = 'fas fa-random';
        shuffleBtn.appendChild(shuffleIcon);
        shuffleBtn.appendChild(document.createTextNode(' Shuffle'));
        shuffleBtn.addEventListener('click', function() {
            var pool = document.getElementById('tl-pool');
            if (!pool) return;
            var cards = Array.from(pool.querySelectorAll('.tl-card'));
            self._shuffle(cards);
            cards.forEach(function(c) { pool.appendChild(c); });
        });
        controls.appendChild(shuffleBtn);

        header.appendChild(controls);
        wrapper.appendChild(header);

        // Instructions
        var instEl = document.createElement('p');
        instEl.className = 'tl-instructions';
        instEl.textContent = 'Tap an event, then tap a slot to place it. Tap a placed event, then tap the events area to remove it. Arrange all events from earliest to latest.';
        wrapper.appendChild(instEl);

        // Stats
        var stats = document.createElement('div');
        stats.className = 'tl-stats';
        stats.id = 'tl-stats';
        stats.textContent = 'Attempts: ' + this._attempts + ' | Perfect: ' + this._perfectCount;
        wrapper.appendChild(stats);

        // Main layout
        var layout = document.createElement('div');
        layout.className = 'tl-layout';

        // Card pool
        var poolSection = document.createElement('div');
        poolSection.className = 'tl-pool-section';

        var poolLabel = document.createElement('div');
        poolLabel.className = 'tl-section-label';
        poolLabel.textContent = 'Events';
        poolSection.appendChild(poolLabel);

        var pool = document.createElement('div');
        pool.className = 'tl-pool';
        pool.id = 'tl-pool';

        for (var i = 0; i < shuffled.length; i++) {
            pool.appendChild(this._createCard(shuffled[i]));
        }

        // Clicking the pool area returns a selected placed card back to pool
        pool.addEventListener('click', function(e) {
            if (e.target.closest('.tl-card')) return; // handled by card click
            if (self._selectedCard && self._selectedSlot) {
                pool.appendChild(self._selectedCard);
                self._selectedSlot.querySelector('.tl-slot-drop').style.display = '';
                self._clearSelections();
                // Clear check result styling
                var slots = document.querySelectorAll('.tl-slot');
                slots.forEach(function(s) { s.classList.remove('tl-slot-correct', 'tl-slot-wrong'); });
                var resultArea = document.getElementById('tl-result');
                if (resultArea) { resultArea.style.display = 'none'; while (resultArea.firstChild) resultArea.removeChild(resultArea.firstChild); }
            }
        });

        poolSection.appendChild(pool);
        layout.appendChild(poolSection);

        // Timeline slots
        var slotsSection = document.createElement('div');
        slotsSection.className = 'tl-slots-section';

        var slotsLabel = document.createElement('div');
        slotsLabel.className = 'tl-section-label';
        slotsLabel.textContent = 'Timeline (Earliest \u2192 Latest)';
        slotsSection.appendChild(slotsLabel);

        var slotsContainer = document.createElement('div');
        slotsContainer.className = 'tl-slots';
        slotsContainer.id = 'tl-slots';

        for (var s = 0; s < events.length; s++) {
            slotsContainer.appendChild(this._createSlot(s + 1));
        }

        slotsSection.appendChild(slotsContainer);
        layout.appendChild(slotsSection);
        wrapper.appendChild(layout);

        // Buttons
        var btnRow = document.createElement('div');
        btnRow.className = 'tl-btn-row';

        var checkBtn = document.createElement('button');
        checkBtn.className = 'tl-btn tl-btn-check';
        var checkIcon = document.createElement('i');
        checkIcon.className = 'fas fa-check';
        checkBtn.appendChild(checkIcon);
        checkBtn.appendChild(document.createTextNode(' Check Answer'));
        checkBtn.addEventListener('click', function() { self.checkAnswer(); });
        btnRow.appendChild(checkBtn);

        var resetBtn = document.createElement('button');
        resetBtn.className = 'tl-btn tl-btn-reset';
        var resetIcon = document.createElement('i');
        resetIcon.className = 'fas fa-redo';
        resetBtn.appendChild(resetIcon);
        resetBtn.appendChild(document.createTextNode(' Reset'));
        resetBtn.addEventListener('click', function() { self.reset(); });
        btnRow.appendChild(resetBtn);

        wrapper.appendChild(btnRow);

        // Result area
        var result = document.createElement('div');
        result.id = 'tl-result';
        result.className = 'tl-result';
        wrapper.appendChild(result);

        container.appendChild(wrapper);
    },

    _createCard(event) {
        var card = document.createElement('div');
        card.className = 'tl-card';
        card.dataset.eventId = event.id;

        if (this._showYears) {
            var year = document.createElement('span');
            year.className = 'tl-card-year';
            year.textContent = event.year;
            card.appendChild(year);
        }

        var titleEl = document.createElement('span');
        titleEl.className = 'tl-card-title';
        titleEl.textContent = event.title;
        card.appendChild(titleEl);

        if (event.description) {
            card.title = event.description;
        }

        var self = this;
        card.addEventListener('click', function(e) {
            e.stopPropagation();
            self._handleCardClick(card);
        });

        return card;
    },

    _createSlot(num) {
        var slot = document.createElement('div');
        slot.className = 'tl-slot';
        slot.dataset.slotNum = num;

        var number = document.createElement('div');
        number.className = 'tl-slot-num';
        number.textContent = num;
        slot.appendChild(number);

        var dropArea = document.createElement('div');
        dropArea.className = 'tl-slot-drop';
        dropArea.textContent = 'Tap to place';
        slot.appendChild(dropArea);

        var self = this;
        slot.addEventListener('click', function(e) {
            e.stopPropagation();
            self._handleSlotClick(slot);
        });

        return slot;
    },

    _handleCardClick(card) {
        this._clearSelections();

        var parentSlot = card.closest('.tl-slot');
        if (parentSlot) {
            card.classList.add('tl-selected');
            parentSlot.classList.add('tl-slot-active');
            this._selectedCard = card;
            this._selectedSlot = parentSlot;
        } else {
            card.classList.add('tl-selected');
            this._selectedCard = card;
            this._selectedSlot = null;
        }
    },

    _handleSlotClick(slot) {
        var cardInSlot = slot.querySelector('.tl-card');

        if (!this._selectedCard) {
            if (cardInSlot) {
                this._clearSelections();
                cardInSlot.classList.add('tl-selected');
                slot.classList.add('tl-slot-active');
                this._selectedCard = cardInSlot;
                this._selectedSlot = slot;
            }
            return;
        }

        var pool = document.getElementById('tl-pool');

        if (this._selectedSlot) {
            if (cardInSlot && cardInSlot !== this._selectedCard) {
                // Swap cards between slots
                var tempSlot = this._selectedSlot;
                tempSlot.querySelector('.tl-slot-drop').style.display = 'none';
                slot.querySelector('.tl-slot-drop').style.display = 'none';
                tempSlot.appendChild(cardInSlot);
                slot.appendChild(this._selectedCard);
            } else if (!cardInSlot) {
                // Move to empty slot
                slot.querySelector('.tl-slot-drop').style.display = 'none';
                slot.appendChild(this._selectedCard);
                this._selectedSlot.querySelector('.tl-slot-drop').style.display = '';
            }
        } else {
            // From pool to slot
            if (cardInSlot) {
                cardInSlot.classList.remove('tl-selected');
                pool.appendChild(cardInSlot);
            }
            slot.querySelector('.tl-slot-drop').style.display = 'none';
            slot.appendChild(this._selectedCard);
        }

        this._clearSelections();
        // Clear check result styling when user changes placement
        var slots = document.querySelectorAll('.tl-slot');
        slots.forEach(function(s) { s.classList.remove('tl-slot-correct', 'tl-slot-wrong'); });
        var resultArea = document.getElementById('tl-result');
        if (resultArea) { resultArea.style.display = 'none'; while (resultArea.firstChild) resultArea.removeChild(resultArea.firstChild); }
    },

    _clearSelections() {
        var allCards = document.querySelectorAll('.tl-card.tl-selected');
        for (var i = 0; i < allCards.length; i++) allCards[i].classList.remove('tl-selected');
        var allSlots = document.querySelectorAll('.tl-slot.tl-slot-active');
        for (var j = 0; j < allSlots.length; j++) allSlots[j].classList.remove('tl-slot-active');
        this._selectedCard = null;
        this._selectedSlot = null;
    },

    checkAnswer() {
        var slotsContainer = document.getElementById('tl-slots');
        var resultArea = document.getElementById('tl-result');
        if (!slotsContainer || !resultArea) return;

        var events = this._config.timelineEvents;
        var slots = slotsContainer.querySelectorAll('.tl-slot');

        var allFilled = true;
        var placedIds = [];

        slots.forEach(function(slot) {
            var card = slot.querySelector('.tl-card');
            if (card) {
                placedIds.push(parseInt(card.dataset.eventId, 10));
            } else {
                allFilled = false;
            }
        });

        while (resultArea.firstChild) resultArea.removeChild(resultArea.firstChild);
        resultArea.style.display = 'block';

        if (!allFilled) {
            resultArea.className = 'tl-result tl-result-warn';
            resultArea.textContent = 'Place all events into the timeline before checking.';
            return;
        }

        var correctOrder = events.map(function(ev) { return ev.id; }).sort(function(a, b) { return a - b; });
        var correctCount = 0;

        for (var i = 0; i < placedIds.length; i++) {
            var isCorrect = placedIds[i] === correctOrder[i];
            if (isCorrect) correctCount++;
            slots[i].classList.remove('tl-slot-correct', 'tl-slot-wrong');
            slots[i].classList.add(isCorrect ? 'tl-slot-correct' : 'tl-slot-wrong');
        }

        this._attempts++;
        var isPerfect = correctCount === events.length;

        if (isPerfect) {
            resultArea.className = 'tl-result tl-result-success';

            // Only count as perfect and award achievement if years are hidden (challenge mode)
            if (!this._showYears) {
                this._perfectCount++;
                if (typeof AchievementManager !== 'undefined') {
                    AchievementManager.checkAndAward({ activity: 'timeline', event: 'perfect' });
                }
            }

            var successMsg = document.createElement('div');
            successMsg.textContent = this._showYears
                ? 'All correct! Try with years hidden for a real challenge.'
                : 'Perfect! All ' + events.length + ' events in the correct order!';
            successMsg.style.fontWeight = '600';
            successMsg.style.marginBottom = '10px';
            resultArea.appendChild(successMsg);

            var answerList = document.createElement('div');
            answerList.className = 'tl-answer-list';
            for (var a = 0; a < correctOrder.length; a++) {
                var ev = events.find(function(e) { return e.id === correctOrder[a]; });
                if (ev) {
                    var row = document.createElement('div');
                    row.className = 'tl-answer-row';
                    row.textContent = ev.year + ' \u2014 ' + ev.title;
                    answerList.appendChild(row);
                }
            }
            resultArea.appendChild(answerList);
        } else {
            resultArea.className = 'tl-result tl-result-error';
            resultArea.textContent = correctCount + ' of ' + events.length + ' correct. Green = right spot, red = wrong. Swap cards and try again!';
        }

        var statsEl = document.getElementById('tl-stats');
        if (statsEl) {
            statsEl.textContent = 'Attempts: ' + this._attempts + ' | Perfect: ' + this._perfectCount;
        }

        this._saveProgress();
    },

    reset() {
        if (this._container && this._config) {
            var wrapper = document.getElementById('tl-wrapper');
            if (wrapper) wrapper.remove();
            this._renderClassic(this._container, this._config);
        }
    },

    _saveProgress() {
        this._save({ attempts: this._attempts, perfectCount: this._perfectCount });
    },

    // Saving replaces the whole record, so merge into what is there: the dated
    // timeline's counts and the story threads share one record.
    _save(changes) {
        var unitId = (this._config || StudyEngine.config).unit.id;
        var saved = ProgressManager.getActivityProgress(unitId, 'timeline') || {};
        var next = Object.assign({}, saved, changes);
        delete next.updatedAt;
        ProgressManager.saveActivityProgress(unitId, 'timeline', next);
    },

    // ─── Story threads ─────────────────────────────────────

    _el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        return e;
    },

    _icon(cls) { var i = document.createElement('i'); i.className = cls; i.setAttribute('aria-hidden', 'true'); return i; },

    _event(id) {
        return (this._config.timelineEvents || []).filter(function(e) { return e.id === id; })[0];
    },

    _threadState() {
        var saved = ProgressManager.getActivityProgress(this._config.unit.id, 'timeline') || {};
        return saved.threads || {};
    },

    _allThreadsDone() {
        var st = this._threadState();
        return (this._config.timelineThreads || []).every(function(t) { return st[t.id] && st[t.id].done; });
    },

    _THREAD_COLORS: 3,

    _showThreads() {
        var self = this;
        var c = this._container;
        c.textContent = '';
        var wrap = this._el('div', 'tl-wrapper tl-threads');
        wrap.id = 'tl-wrapper';

        var head = this._el('div', 'tl-header');
        var h = this._el('h2');
        h.appendChild(this._icon('fas fa-project-diagram'));
        h.appendChild(document.createTextNode(' Story Threads'));
        head.appendChild(h);
        wrap.appendChild(head);
        wrap.appendChild(this._el('p', 'tl-instructions',
            'A timeline tells a story. Each thread is a short chain where every event led to the next. ' +
            'Put the events in story order by asking what had to happen first, then choose what connects each one to the next.'));

        var st = this._threadState();
        var list = this._el('div', 'tl-thread-list');
        this._config.timelineThreads.forEach(function(t, i) {
            var done = st[t.id] && st[t.id].done;
            var card = self._el('button', 'tl-thread-card tl-th' + (i % self._THREAD_COLORS) + (done ? ' tl-thread-done' : ''));
            card.type = 'button';
            var num = self._el('span', 'tl-thread-num', String(i + 1));
            num.setAttribute('aria-hidden', 'true');
            card.appendChild(num);
            var body = self._el('span', 'tl-thread-body');
            body.appendChild(self._el('span', 'tl-thread-title', t.title));
            body.appendChild(self._el('span', 'tl-thread-meta', t.events.length + ' events' + (done ? ' · done' + (st[t.id].firstTry ? ', right first time' : '') : '')));
            card.appendChild(body);
            if (done) card.appendChild(self._icon('fas fa-check-circle tl-thread-check'));
            card.addEventListener('click', function() { self._startThread(t, i); });
            list.appendChild(card);
        });
        wrap.appendChild(list);

        var allDone = this._allThreadsDone();
        var bonusOpen = allDone || sessionStorage.getItem('teacher-unlock') === 'true';
        var row = this._el('div', 'tl-thread-extra');
        if (allDone) {
            var story = this._el('button', 'tl-btn tl-btn-check', '');
            story.type = 'button';
            story.appendChild(this._icon('fas fa-stream'));
            story.appendChild(document.createTextNode(' See all three on one line of years'));
            story.addEventListener('click', function() { self._showOneLine(); });
            row.appendChild(story);
        }
        var bonus = this._el('button', 'tl-btn tl-btn-reset' + (bonusOpen ? '' : ' tl-locked'));
        bonus.type = 'button';
        bonus.disabled = !bonusOpen;
        bonus.appendChild(this._icon(bonusOpen ? 'fas fa-history' : 'fas fa-lock'));
        bonus.appendChild(document.createTextNode(' Full timeline: all ' + (this._config.timelineEvents || []).length + ' events by date' + (bonusOpen ? '' : ' (opens when all three threads are done)')));
        bonus.addEventListener('click', function() {
            self._showYears = true;
            c.textContent = '';
            self._renderClassic(c, self._config);
        });
        row.appendChild(bonus);
        wrap.appendChild(row);
        c.appendChild(wrap);
    },

    _startThread(thread, index) {
        this._thread = thread;
        this._threadIndex = index;
        this._order = this._shuffle(thread.events.slice());
        // Never start already in order: that would skip the thinking
        if (this._order.join() === thread.events.join()) this._order.push(this._order.shift());
        this._checks = 0;
        this._linkPos = 0;
        this._solved = false;
        this._choices = null;
        this._renderThread();
    },

    _renderThread(nudgeAt) {
        var self = this;
        var thread = this._thread;
        var solved = this._order.join() === thread.events.join() && this._checks > 0 && this._solved;
        var c = this._container;
        c.textContent = '';
        var wrap = this._el('div', 'tl-wrapper tl-threads tl-th' + (this._threadIndex % this._THREAD_COLORS));
        wrap.id = 'tl-wrapper';

        var back = this._el('button', 'tl-link-btn');
        back.type = 'button';
        back.appendChild(this._icon('fas fa-chevron-left'));
        back.appendChild(document.createTextNode(' All threads'));
        back.addEventListener('click', function() { self._showThreads(); });
        wrap.appendChild(back);

        var head = this._el('div', 'tl-header');
        var h = this._el('h2');
        var num = this._el('span', 'tl-thread-num', String(this._threadIndex + 1));
        num.setAttribute('aria-hidden', 'true');
        h.appendChild(num);
        h.appendChild(document.createTextNode(' ' + thread.title));
        head.appendChild(h);
        if (!solved) {
            var yearsBtn = this._el('button', 'tl-toggle-btn');
            yearsBtn.type = 'button';
            yearsBtn.appendChild(this._icon(this._showYears ? 'fas fa-eye-slash' : 'fas fa-eye'));
            yearsBtn.appendChild(document.createTextNode(this._showYears ? ' Hide years' : ' Show years'));
            yearsBtn.addEventListener('click', function() { self._showYears = !self._showYears; self._renderThread(); });
            head.appendChild(yearsBtn);
        }
        wrap.appendChild(head);

        wrap.appendChild(this._el('p', 'tl-instructions', solved
            ? 'In order. Now choose what connects each event to the next.'
            : 'Put these in story order, first at the top. Ask: what had to happen first? Use the arrows to move an event.'));

        var chain = this._el('ol', 'tl-chain');
        this._order.forEach(function(id, pos) {
            var ev = self._event(id);
            var li = self._el('li', 'tl-step' + (nudgeAt !== undefined && (pos === nudgeAt || pos === nudgeAt + 1) ? ' tl-step-nudge' : ''));
            var card = self._el('div', 'tl-step-card');
            var text = self._el('div', 'tl-step-text');
            if (self._showYears || solved) text.appendChild(self._el('span', 'tl-card-year', ev.year + ' '));
            text.appendChild(self._el('div', 'tl-step-title', ev.title));
            if (ev.description) text.appendChild(self._el('div', 'tl-step-desc', ev.description));
            card.appendChild(text);
            if (!solved) {
                var moves = self._el('div', 'tl-step-moves');
                [['up', -1, 'fas fa-arrow-up', 'Move up'], ['down', 1, 'fas fa-arrow-down', 'Move down']].forEach(function(m) {
                    var b = self._el('button', 'tl-move-btn');
                    b.type = 'button';
                    b.setAttribute('aria-label', m[3] + ': ' + ev.title);
                    b.appendChild(self._icon(m[2]));
                    var to = pos + m[1];
                    b.disabled = to < 0 || to >= self._order.length;
                    b.addEventListener('click', function() {
                        var t = self._order[to]; self._order[to] = self._order[pos]; self._order[pos] = t;
                        self._renderThread();
                        var again = self._container.querySelectorAll('.tl-step')[to];
                        if (again) { var btn = again.querySelector('.tl-move-btn:not(:disabled)'); if (btn) btn.focus(); }
                    });
                    moves.appendChild(b);
                });
                card.appendChild(moves);
            }
            li.appendChild(card);
            chain.appendChild(li);

            // Between this event and the next: the link, once the order is right
            if (solved && pos < self._order.length - 1) chain.appendChild(self._renderLink(pos));
        });
        wrap.appendChild(chain);

        var feedback = this._el('div', 'tl-thread-feedback');
        feedback.setAttribute('aria-live', 'polite');
        if (nudgeAt !== undefined) {
            var a = this._event(this._order[nudgeAt]), b = this._event(this._order[nudgeAt + 1]);
            feedback.className += ' tl-thread-nudge';
            feedback.appendChild(this._icon('fas fa-lightbulb'));
            feedback.appendChild(document.createTextNode(' Could \u201c' + a.title + '\u201d happen before \u201c' + b.title + '\u201d? Read both cards again.'));
        }
        wrap.appendChild(feedback);

        if (!solved) {
            var check = this._el('button', 'tl-btn tl-btn-check');
            check.type = 'button';
            check.appendChild(this._icon('fas fa-check'));
            check.appendChild(document.createTextNode(' Check the order'));
            check.addEventListener('click', function() { self._checkThread(); });
            var row = this._el('div', 'tl-btn-row');
            row.appendChild(check);
            wrap.appendChild(row);
        } else if (this._linkPos >= thread.links.length) {
            wrap.appendChild(this._renderThreadDone());
        }
        c.appendChild(wrap);
    },

    _checkThread() {
        var correct = this._thread.events;
        this._checks++;
        // The first link out of place: a pair whose two events are in the wrong order
        var rank = {};
        correct.forEach(function(id, i) { rank[id] = i; });
        for (var i = 0; i < this._order.length - 1; i++) {
            if (rank[this._order[i]] > rank[this._order[i + 1]]) {
                this._renderThread(i);
                return;
            }
        }
        this._solved = true;
        this._firstTry = this._checks === 1;
        this._linkPos = 0;
        this._linkMisses = 0;
        this._renderThread();
    },

    _renderLink(pos) {
        var self = this;
        var link = this._thread.links[pos];
        var li = this._el('li', 'tl-link' + (pos < this._linkPos ? ' tl-link-done' : pos === this._linkPos ? ' tl-link-open' : ' tl-link-waiting'));
        li.setAttribute('aria-label', 'What connects these two events');
        var arrow = this._el('div', 'tl-link-arrow');
        arrow.appendChild(this._icon('fas fa-arrow-down'));
        li.appendChild(arrow);
        var box = this._el('div', 'tl-link-box');
        if (pos < this._linkPos) {
            var lead = this._el('div', 'tl-link-label');
            lead.appendChild(this._icon('fas fa-link'));
            lead.appendChild(document.createTextNode(' Why it led to the next'));
            box.appendChild(lead);
            box.appendChild(this._el('p', 'tl-link-why', link.why));
        } else if (pos === this._linkPos) {
            box.appendChild(this._el('div', 'tl-link-label', 'What connects these two?'));
            if (!this._choices || this._choicesFor !== pos) {
                this._choices = this._shuffle([link.cause].concat(link.wrong || []));
                this._choicesFor = pos;
                this._wrongPicked = {};
            }
            var opts = this._el('div', 'tl-link-choices');
            this._choices.forEach(function(text) {
                var b = self._el('button', 'tl-link-choice' + (self._wrongPicked[text] ? ' tl-link-wrong' : ''));
                b.type = 'button';
                if (self._wrongPicked[text]) { b.disabled = true; b.appendChild(self._icon('fas fa-xmark')); b.appendChild(document.createTextNode(' ')); }
                b.appendChild(document.createTextNode(text));
                b.addEventListener('click', function() {
                    if (text === link.cause) {
                        self._linkPos++;
                        self._choices = null;
                        if (self._linkPos >= self._thread.links.length) self._finishThread();
                        self._renderThread();
                    } else {
                        self._wrongPicked[text] = true;
                        self._linkMisses++;
                        self._renderThread();
                        var fb = self._container.querySelector('.tl-link-open .tl-link-hint');
                        if (fb) fb.focus();
                    }
                });
                opts.appendChild(b);
            });
            box.appendChild(opts);
            if (Object.keys(this._wrongPicked).length) {
                var hint = this._el('p', 'tl-link-hint', 'Not that one. Read the event above and the one below it again.');
                hint.tabIndex = -1;
                box.appendChild(hint);
            }
        } else {
            box.appendChild(this._el('div', 'tl-link-label tl-link-muted', 'Connect the one above first'));
        }
        li.appendChild(box);
        return li;
    },

    _finishThread() {
        var threads = Object.assign({}, this._threadState());
        var before = threads[this._thread.id] || {};
        threads[this._thread.id] = {
            done: true,
            firstTry: !!(before.firstTry || (this._firstTry && this._linkMisses === 0)),
            plays: (before.plays || 0) + 1
        };
        this._save({ threads: threads });
        if (this._allThreadsDone() && typeof AchievementManager !== 'undefined') {
            AchievementManager.checkAndAward({ activity: 'timeline', event: 'perfect' });
        }
    },

    _renderThreadDone() {
        var self = this;
        var box = this._el('div', 'tl-result tl-result-success tl-thread-done-box');
        var perfect = this._firstTry && this._linkMisses === 0;
        box.appendChild(this._el('div', 'tl-thread-done-title', perfect ? 'Thread complete, right first time!' : 'Thread complete!'));
        box.appendChild(this._el('p', null, 'You can tell this part of the story from start to finish. The years are on the cards now.'));
        var row = this._el('div', 'tl-btn-row');
        var threads = this._config.timelineThreads;
        var next = threads[this._threadIndex + 1];
        if (next) {
            var n = this._el('button', 'tl-btn tl-btn-check');
            n.type = 'button';
            n.appendChild(document.createTextNode('Next thread: ' + next.title + ' '));
            n.appendChild(this._icon('fas fa-arrow-right'));
            n.addEventListener('click', function() { self._startThread(next, self._threadIndex + 1); });
            row.appendChild(n);
        } else if (this._allThreadsDone()) {
            var line = this._el('button', 'tl-btn tl-btn-check');
            line.type = 'button';
            line.appendChild(this._icon('fas fa-stream'));
            line.appendChild(document.createTextNode(' See all three on one line of years'));
            line.addEventListener('click', function() { self._showOneLine(); });
            row.appendChild(line);
        }
        var all = this._el('button', 'tl-btn tl-btn-reset', 'All threads');
        all.type = 'button';
        all.addEventListener('click', function() { self._showThreads(); });
        row.appendChild(all);
        box.appendChild(row);
        return box;
    },

    // Every thread's events on one line of years, to show that they overlap
    _MONTHS: { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 },

    _when(ev) {
        var m = /^(?:([A-Z][a-z]{2})\s+)?(\d{3,4})/.exec(String(ev.year || ''));
        return m ? Number(m[2]) * 100 + (m[1] ? this._MONTHS[m[1]] || 0 : 0) : 0;
    },

    _showOneLine() {
        var self = this;
        var c = this._container;
        c.textContent = '';
        var wrap = this._el('div', 'tl-wrapper tl-threads');
        wrap.id = 'tl-wrapper';
        var back = this._el('button', 'tl-link-btn');
        back.type = 'button';
        back.appendChild(this._icon('fas fa-chevron-left'));
        back.appendChild(document.createTextNode(' All threads'));
        back.addEventListener('click', function() { self._showThreads(); });
        wrap.appendChild(back);
        var head = this._el('div', 'tl-header');
        var h = this._el('h2');
        h.appendChild(this._icon('fas fa-stream'));
        h.appendChild(document.createTextNode(' One Line of Years'));
        head.appendChild(h);
        wrap.appendChild(head);
        wrap.appendChild(this._el('p', 'tl-instructions',
            'All three threads, by date. The stories overlap: while the delegates were writing the Constitution in 1787, Congress under the Articles passed the Northwest Ordinance.'));

        var items = [];
        this._config.timelineThreads.forEach(function(t, i) {
            t.events.forEach(function(id) { items.push({ ev: self._event(id), thread: t, index: i }); });
        });
        items.sort(function(a, b) { return self._when(a.ev) - self._when(b.ev); });
        var list = this._el('ol', 'tl-oneline');
        items.forEach(function(it) {
            var li = self._el('li', 'tl-oneline-row tl-th' + (it.index % self._THREAD_COLORS));
            li.appendChild(self._el('span', 'tl-oneline-year', it.ev.year));
            var num = self._el('span', 'tl-thread-num', String(it.index + 1));
            num.title = it.thread.title;
            li.appendChild(num);
            var t = self._el('span', 'tl-oneline-title', it.ev.title);
            li.appendChild(t);
            list.appendChild(li);
        });
        wrap.appendChild(list);
        var key = this._el('div', 'tl-oneline-key');
        this._config.timelineThreads.forEach(function(t, i) {
            var k = self._el('span', 'tl-oneline-keyitem tl-th' + (i % self._THREAD_COLORS));
            k.appendChild(self._el('span', 'tl-thread-num', String(i + 1)));
            k.appendChild(document.createTextNode(' ' + t.title));
            key.appendChild(k);
        });
        wrap.appendChild(key);
        c.appendChild(wrap);
    },

    _shuffle(array) {
        for (var i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = array[i];
            array[i] = array[j];
            array[j] = tmp;
        }
        return array;
    },

    activate() {},
    deactivate() {},

    getProgress() {
        return ProgressManager.getActivityProgress((this._config || StudyEngine.config).unit.id, 'timeline');
    },

    loadProgress(data) {
        if (data) {
            this._attempts = data.attempts || 0;
            this._perfectCount = data.perfectCount || 0;
        }
    }
});
