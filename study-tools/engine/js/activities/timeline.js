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

    render(container, config) {
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

        // Header
        var header = document.createElement('div');
        header.className = 'tl-header';

        var title = document.createElement('h2');
        var titleIcon = document.createElement('i');
        titleIcon.className = 'fas fa-history';
        title.appendChild(titleIcon);
        title.appendChild(document.createTextNode(' Timeline Challenge'));
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
        var self = this;
        toggleBtn.addEventListener('click', function() {
            self._showYears = !self._showYears;
            var oldWrapper = document.getElementById('tl-wrapper');
            if (oldWrapper) oldWrapper.remove();
            self.render(self._container, self._config);
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
            this.render(this._container, this._config);
        }
    },

    _saveProgress() {
        ProgressManager.saveActivityProgress(StudyEngine.config.unit.id, 'timeline', {
            attempts: this._attempts,
            perfectCount: this._perfectCount
        });
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
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'timeline');
    },

    loadProgress(data) {
        if (data) {
            this._attempts = data.attempts || 0;
            this._perfectCount = data.perfectCount || 0;
        }
    }
});
