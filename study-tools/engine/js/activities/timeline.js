StudyEngine.registerActivity({
    id: 'timeline',
    name: 'Timeline',
    icon: 'fas fa-history',
    description: 'Put key events in chronological order',
    category: 'practice',
    requires: ['timelineEvents'],

    _attempts: 0,
    _perfectCount: 0,
    _container: null,
    _config: null,

    render(container, config) {
        this._container = container;
        this._config = config;

        // Load saved progress
        const saved = ProgressManager.getActivityProgress(config.unit.id, 'timeline');
        this._attempts = saved?.attempts || 0;
        this._perfectCount = saved?.perfectCount || 0;

        const events = config.timelineEvents;
        if (!events || events.length === 0) return;

        container.textContent = '';

        // Main wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'timeline-container';

        // Title
        const title = document.createElement('h2');
        title.textContent = 'Timeline Challenge';
        wrapper.appendChild(title);

        // Instructions
        const instructions = document.createElement('div');
        instructions.className = 'timeline-instructions';
        const instructionText = document.createElement('p');
        instructionText.textContent = 'Drag the event cards from the list below and drop them into the numbered slots in the correct chronological order. When all slots are filled, click "Check Answer" to see how you did!';
        instructions.appendChild(instructionText);
        wrapper.appendChild(instructions);

        // Progress display
        const progressInfo = document.createElement('div');
        progressInfo.className = 'explanation';
        progressInfo.style.marginBottom = '16px';
        const progressText = document.createElement('p');
        progressText.id = 'timeline-progress';
        progressText.textContent = 'Attempts: ' + this._attempts + ' | Perfect scores: ' + this._perfectCount;
        progressInfo.appendChild(progressText);
        wrapper.appendChild(progressInfo);

        // Unordered container (shuffled event cards)
        const unorderedLabel = document.createElement('h3');
        unorderedLabel.textContent = 'Events to Place:';
        wrapper.appendChild(unorderedLabel);

        const unorderedContainer = document.createElement('div');
        unorderedContainer.className = 'timeline-items-container';
        unorderedContainer.id = 'timeline-unordered';

        // Shuffle events
        const shuffled = this._shuffle([...events]);

        shuffled.forEach(event => {
            const card = this._createEventCard(event);
            unorderedContainer.appendChild(card);
        });

        wrapper.appendChild(unorderedContainer);

        // Ordered container (drop slots)
        const orderedLabel = document.createElement('h3');
        orderedLabel.textContent = 'Timeline (Earliest to Latest):';
        orderedLabel.style.marginTop = '24px';
        wrapper.appendChild(orderedLabel);

        const orderedContainer = document.createElement('div');
        orderedContainer.className = 'timeline-ordered-container';
        orderedContainer.id = 'timeline-ordered';

        for (let i = 1; i <= events.length; i++) {
            const slot = document.createElement('div');
            slot.className = 'timeline-ordered-item';
            slot.id = 'timeline-slot-' + i;
            slot.dataset.slotIndex = i;

            const number = document.createElement('div');
            number.className = 'timeline-number';
            number.textContent = i;
            slot.appendChild(number);

            orderedContainer.appendChild(slot);
        }

        wrapper.appendChild(orderedContainer);

        // Buttons
        const buttonRow = document.createElement('div');
        buttonRow.style.display = 'flex';
        buttonRow.style.gap = '12px';
        buttonRow.style.justifyContent = 'center';
        buttonRow.style.marginTop = '20px';

        const checkBtn = document.createElement('button');
        checkBtn.className = 'nav-button';
        checkBtn.id = 'timeline-check-btn';
        checkBtn.textContent = 'Check Answer';
        checkBtn.addEventListener('click', () => this.checkAnswer());
        buttonRow.appendChild(checkBtn);

        const resetBtn = document.createElement('button');
        resetBtn.className = 'nav-button';
        resetBtn.id = 'timeline-reset-btn';
        resetBtn.textContent = 'Reset';
        resetBtn.addEventListener('click', () => this.reset());
        buttonRow.appendChild(resetBtn);

        wrapper.appendChild(buttonRow);

        // Result display
        const resultArea = document.createElement('div');
        resultArea.id = 'timeline-result';
        resultArea.className = 'explanation';
        resultArea.style.marginTop = '16px';
        resultArea.style.display = 'none';
        wrapper.appendChild(resultArea);

        container.appendChild(wrapper);

        // Initialize drag and drop
        this.initDragDrop();
    },

    _createEventCard(event) {
        const card = document.createElement('div');
        card.className = 'timeline-item';
        card.id = 'timeline-event-' + event.id;
        card.draggable = true;
        card.dataset.eventId = event.id;

        const year = document.createElement('div');
        year.className = 'timeline-item-year';
        year.textContent = event.year;
        card.appendChild(year);

        const titleEl = document.createElement('div');
        titleEl.className = 'timeline-item-title';
        titleEl.textContent = event.title;
        card.appendChild(titleEl);

        const desc = document.createElement('div');
        desc.className = 'timeline-item-desc';
        desc.textContent = event.description;
        card.appendChild(desc);

        return card;
    },

    initDragDrop() {
        const unordered = document.getElementById('timeline-unordered');
        const ordered = document.getElementById('timeline-ordered');
        if (!unordered || !ordered) return;

        // Dragstart on all event cards
        const cards = document.querySelectorAll('.timeline-item');
        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', card.id);
                card.style.opacity = '0.5';
            });
            card.addEventListener('dragend', (e) => {
                card.style.opacity = '1';
            });
        });

        // Drop slots in the ordered container
        const slots = ordered.querySelectorAll('.timeline-ordered-item');
        slots.forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.style.borderColor = 'var(--primary, #0d9488)';
            });
            slot.addEventListener('dragleave', (e) => {
                slot.style.borderColor = '';
            });
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.style.borderColor = '';
                const cardId = e.dataTransfer.getData('text/plain');
                const card = document.getElementById(cardId);
                if (!card) return;

                // Check if slot already has an event card (not counting the number label)
                const existingCard = slot.querySelector('.timeline-item');
                if (existingCard) {
                    // Move existing card back to unordered container
                    existingCard.classList.remove('placed');
                    unordered.appendChild(existingCard);
                }

                // If the card was in another slot, that slot is now free
                const previousSlot = card.closest('.timeline-ordered-item');
                // No cleanup needed; we just move the card

                card.classList.add('placed');
                slot.appendChild(card);
            });
        });

        // Allow dropping back to unordered container
        unordered.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        unordered.addEventListener('drop', (e) => {
            e.preventDefault();
            const cardId = e.dataTransfer.getData('text/plain');
            const card = document.getElementById(cardId);
            if (!card) return;
            card.classList.remove('placed');
            unordered.appendChild(card);
        });
    },

    checkAnswer() {
        const ordered = document.getElementById('timeline-ordered');
        const resultArea = document.getElementById('timeline-result');
        if (!ordered || !resultArea) return;

        const events = this._config.timelineEvents;
        const slots = ordered.querySelectorAll('.timeline-ordered-item');

        // Check if all slots are filled
        let allFilled = true;
        const placedIds = [];

        slots.forEach(slot => {
            const card = slot.querySelector('.timeline-item');
            if (card) {
                placedIds.push(parseInt(card.dataset.eventId, 10));
            } else {
                allFilled = false;
            }
        });

        resultArea.style.display = 'block';
        resultArea.textContent = '';

        if (!allFilled) {
            const msg = document.createElement('p');
            msg.textContent = 'Please place all events into the timeline slots before checking your answer.';
            msg.style.color = '#e74c3c';
            resultArea.appendChild(msg);
            return;
        }

        // Compare against correct order (ids 1, 2, 3, ... in order)
        const correctOrder = events.map(ev => ev.id).sort((a, b) => a - b);
        let correctCount = 0;

        placedIds.forEach((id, index) => {
            if (id === correctOrder[index]) {
                correctCount++;
                // Mark slot as correct
                slots[index].style.borderColor = '#27ae60';
            } else {
                slots[index].style.borderColor = '#e74c3c';
            }
        });

        this._attempts++;
        const isPerfect = correctCount === events.length;

        if (isPerfect) {
            this._perfectCount++;
            const msg = document.createElement('p');
            msg.textContent = 'Perfect! You placed all ' + events.length + ' events in the correct order!';
            msg.style.color = '#27ae60';
            msg.style.fontWeight = 'bold';
            resultArea.appendChild(msg);
        } else {
            const msg = document.createElement('p');
            msg.textContent = 'You got ' + correctCount + ' out of ' + events.length + ' correct. Green borders show correct placements, red borders show incorrect ones. Try again!';
            msg.style.color = '#e74c3c';
            resultArea.appendChild(msg);
        }

        // Update progress display
        const progressEl = document.getElementById('timeline-progress');
        if (progressEl) {
            progressEl.textContent = 'Attempts: ' + this._attempts + ' | Perfect scores: ' + this._perfectCount;
        }

        this._saveProgress();
    },

    reset() {
        if (this._container && this._config) {
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
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
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
