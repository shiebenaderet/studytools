StudyEngine.registerActivity({
    id: 'flashcards',
    name: 'Flashcards',
    icon: 'fas fa-graduation-cap',
    description: 'Master vocabulary terms with interactive flashcards',
    category: 'study',
    requires: ['vocabulary'],

    // Internal state
    _currentIndex: 0,
    _isFlipped: false,
    _displayedVocab: [],
    _mastered: [],
    _keyHandler: null,

    render(container, config) {
        // Initialize state
        this._displayedVocab = [...config.vocabulary];
        const saved = ProgressManager.getActivityProgress(config.unit.id, 'flashcards');
        this._mastered = saved?.mastered || [];
        this._currentIndex = 0;
        this._isFlipped = false;

        // Build category filter options
        const categories = [...new Set(config.vocabulary.map(v => v.category))];

        // Main wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'flashcard-container';

        // --- Controls row ---
        const controls = document.createElement('div');
        controls.className = 'flashcard-controls';

        // Category filter
        const filterSelect = document.createElement('select');
        filterSelect.className = 'filter-select';
        filterSelect.id = 'fc-category-filter';

        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'All Categories';
        filterSelect.appendChild(allOption);

        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            filterSelect.appendChild(opt);
        });

        filterSelect.addEventListener('change', () => {
            this.filterByCategory(filterSelect.value);
        });
        controls.appendChild(filterSelect);

        // Shuffle button
        const shuffleBtn = document.createElement('button');
        shuffleBtn.className = 'nav-button';
        shuffleBtn.id = 'fc-shuffle-btn';
        const shuffleIcon = document.createElement('i');
        shuffleIcon.className = 'fas fa-random';
        shuffleBtn.appendChild(shuffleIcon);
        shuffleBtn.appendChild(document.createTextNode(' Shuffle'));
        shuffleBtn.addEventListener('click', () => this.shuffleCards());
        controls.appendChild(shuffleBtn);

        // Flip all button
        const flipAllBtn = document.createElement('button');
        flipAllBtn.className = 'nav-button';
        flipAllBtn.id = 'fc-flip-all-btn';
        const flipIcon = document.createElement('i');
        flipIcon.className = 'fas fa-sync-alt';
        flipAllBtn.appendChild(flipIcon);
        flipAllBtn.appendChild(document.createTextNode(' Flip'));
        flipAllBtn.addEventListener('click', () => this.flip());
        controls.appendChild(flipAllBtn);

        wrapper.appendChild(controls);

        // --- Stats row ---
        const stats = document.createElement('div');
        stats.className = 'flashcard-stats';

        const termCounter = document.createElement('span');
        termCounter.id = 'fc-term-counter';
        termCounter.textContent = 'Term: 1/' + this._displayedVocab.length;
        stats.appendChild(termCounter);

        const masteredCounter = document.createElement('span');
        masteredCounter.id = 'fc-mastered-counter';
        masteredCounter.textContent = 'Mastered: ' + this._mastered.length;
        stats.appendChild(masteredCounter);

        wrapper.appendChild(stats);

        // --- Flashcard ---
        const flashcard = document.createElement('div');
        flashcard.className = 'flashcard';
        flashcard.id = 'fc-card';
        flashcard.addEventListener('click', () => this.flip());

        const label = document.createElement('div');
        label.className = 'flashcard-label';
        label.id = 'fc-label';
        label.textContent = 'TERM';
        flashcard.appendChild(label);

        const content = document.createElement('div');
        content.className = 'flashcard-content';
        content.id = 'fc-content';
        flashcard.appendChild(content);

        wrapper.appendChild(flashcard);

        // --- Navigation ---
        const nav = document.createElement('div');
        nav.className = 'flashcard-nav';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'nav-button';
        prevBtn.id = 'fc-prev-btn';
        const prevIcon = document.createElement('i');
        prevIcon.className = 'fas fa-arrow-left';
        prevBtn.appendChild(prevIcon);
        prevBtn.appendChild(document.createTextNode(' Previous'));
        prevBtn.addEventListener('click', () => this.prev());
        nav.appendChild(prevBtn);

        const masterBtn = document.createElement('button');
        masterBtn.className = 'nav-button';
        masterBtn.id = 'fc-master-btn';
        const masterIcon = document.createElement('i');
        masterIcon.className = 'fas fa-check';
        masterBtn.appendChild(masterIcon);
        masterBtn.appendChild(document.createTextNode(' Mark as Mastered'));
        masterBtn.addEventListener('click', () => this.master());
        nav.appendChild(masterBtn);

        const nextBtn = document.createElement('button');
        nextBtn.className = 'nav-button';
        nextBtn.id = 'fc-next-btn';
        nextBtn.appendChild(document.createTextNode('Next '));
        const nextIcon = document.createElement('i');
        nextIcon.className = 'fas fa-arrow-right';
        nextBtn.appendChild(nextIcon);
        nextBtn.addEventListener('click', () => this.next());
        nav.appendChild(nextBtn);

        wrapper.appendChild(nav);

        // --- Tip text ---
        const tip = document.createElement('p');
        tip.style.textAlign = 'center';
        tip.style.color = '#6b7280';
        tip.style.fontSize = '0.85rem';
        tip.style.marginTop = '12px';
        tip.textContent = 'Keyboard shortcuts: Arrow keys or A/D to navigate, Space to flip, M to master';
        wrapper.appendChild(tip);

        container.appendChild(wrapper);

        // Initial display
        this.display();
    },

    display() {
        const card = this._displayedVocab[this._currentIndex];
        if (!card) return;

        const flashcardEl = document.getElementById('fc-card');
        const labelEl = document.getElementById('fc-label');
        const contentEl = document.getElementById('fc-content');
        const termCounter = document.getElementById('fc-term-counter');
        const masteredCounter = document.getElementById('fc-mastered-counter');
        const prevBtn = document.getElementById('fc-prev-btn');
        const nextBtn = document.getElementById('fc-next-btn');
        const masterBtn = document.getElementById('fc-master-btn');

        if (!flashcardEl) return;

        // Update card flip state
        if (this._isFlipped) {
            flashcardEl.classList.add('flipped');
            labelEl.textContent = 'DEFINITION';
            contentEl.textContent = '';

            const defText = document.createElement('div');
            defText.textContent = card.definition;
            contentEl.appendChild(defText);

            if (card.example) {
                const exText = document.createElement('div');
                exText.style.marginTop = '12px';
                exText.style.fontStyle = 'italic';
                exText.style.fontSize = '0.9em';
                exText.style.opacity = '0.85';
                exText.textContent = card.example;
                contentEl.appendChild(exText);
            }
        } else {
            flashcardEl.classList.remove('flipped');
            labelEl.textContent = 'TERM';
            contentEl.textContent = card.term;
        }

        // Update stats
        termCounter.textContent = 'Term: ' + (this._currentIndex + 1) + '/' + this._displayedVocab.length;
        masteredCounter.textContent = 'Mastered: ' + this._mastered.length;

        // Update button states
        prevBtn.disabled = this._currentIndex === 0;
        nextBtn.disabled = this._currentIndex >= this._displayedVocab.length - 1;

        // Update mastered button
        const isMastered = this._mastered.includes(card.term);
        if (isMastered) {
            masterBtn.style.opacity = '0.5';
            masterBtn.textContent = '';
            const checkIcon = document.createElement('i');
            checkIcon.className = 'fas fa-check-double';
            masterBtn.appendChild(checkIcon);
            masterBtn.appendChild(document.createTextNode(' Mastered'));
        } else {
            masterBtn.style.opacity = '1';
            masterBtn.textContent = '';
            const checkIcon = document.createElement('i');
            checkIcon.className = 'fas fa-check';
            masterBtn.appendChild(checkIcon);
            masterBtn.appendChild(document.createTextNode(' Mark as Mastered'));
        }
    },

    flip() {
        this._isFlipped = !this._isFlipped;
        this.display();
    },

    next() {
        if (this._currentIndex < this._displayedVocab.length - 1) {
            this._currentIndex++;
            this._isFlipped = false;
            this.display();
        } else {
            // Reached the last card — viewedAll
            if (typeof AchievementManager !== 'undefined') {
                AchievementManager.checkAndAward({ activity: 'flashcards', event: 'viewedAll' });
                AchievementManager.checkAndAward({ activity: 'flashcards', event: 'complete' });
            }
        }
    },

    prev() {
        if (this._currentIndex > 0) {
            this._currentIndex--;
            this._isFlipped = false;
            this.display();
        }
    },

    master() {
        const card = this._displayedVocab[this._currentIndex];
        if (!card) return;
        const term = card.term;
        if (!this._mastered.includes(term)) {
            this._mastered.push(term);
            this._saveProgress();
        }
        this.next();
        // If we were on the last card, just refresh display
        if (this._currentIndex === this._displayedVocab.length - 1) {
            this.display();
        }
    },

    shuffleCards() {
        this._displayedVocab = StudyUtils.shuffle(this._displayedVocab);
        this._currentIndex = 0;
        this._isFlipped = false;
        this.display();
    },

    filterByCategory(category) {
        const config = StudyEngine.config;
        this._displayedVocab = category
            ? config.vocabulary.filter(v => v.category === category)
            : [...config.vocabulary];
        this._currentIndex = 0;
        this._isFlipped = false;
        this.display();
    },

    _saveProgress() {
        ProgressManager.saveActivityProgress(StudyEngine.config.unit.id, 'flashcards', {
            mastered: this._mastered
        });
    },

    activate() {
        this._keyHandler = (e) => {
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
            if (e.key === 'ArrowRight' || e.key === 'd') this.next();
            if (e.key === 'ArrowLeft' || e.key === 'a') this.prev();
            if (e.code === 'Space') { e.preventDefault(); this.flip(); }
            if (e.key === 'm' || e.key === 'M') this.master();
        };
        document.addEventListener('keydown', this._keyHandler);
    },

    deactivate() {
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
    },

    getProgress() {
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'flashcards');
    },

    loadProgress(data) {
        if (data?.mastered) this._mastered = data.mastered;
    }
});
