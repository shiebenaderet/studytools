StudyEngine.registerActivity({
    id: 'flashcards',
    name: 'Flashcards',
    icon: 'fas fa-graduation-cap',
    description: 'Master vocabulary terms with spaced repetition flashcards',
    category: 'study',
    requires: ['vocabulary'],

    // Internal state
    _currentIndex: 0,
    _isFlipped: false,
    _displayedVocab: [],
    _allUnlockedVocab: [],
    _mastered: [],
    _keyHandler: null,
    _queue: [],        // SRS queue of term names
    _ratings: {},      // term -> last rating
    _roundIndex: 0,
    _mode: 'study',    // 'study' or 'weak'
    _weakTerms: [],

    render(container, config) {
        this._allUnlockedVocab = [...MasteryManager.getUnlockedVocabulary(config.unit.id, config)];
        this._displayedVocab = [...this._allUnlockedVocab];
        const saved = ProgressManager.getActivityProgress(config.unit.id, 'flashcards');
        this._mastered = saved?.mastered || [];
        this._ratings = saved?.ratings || {};
        this._currentIndex = 0;
        this._isFlipped = false;
        this._mode = 'study';

        const categories = MasteryManager.getUnlockedCategories(config.unit.id, config);

        const wrapper = document.createElement('div');
        wrapper.className = 'fc-wrapper';

        // --- Mastery progress bar ---
        const unlockStatus = MasteryManager.getUnlockStatus(config.unit.id, config);
        if (!unlockStatus.allUnlocked) {
            const progressBar = document.createElement('div');
            progressBar.className = 'mastery-progress-bar';
            progressBar.id = 'fc-mastery-progress';
            const progressLabel = document.createElement('span');
            progressLabel.textContent = unlockStatus.unlockedCategories.length + '/' + unlockStatus.categories.length + ' categories unlocked';
            progressBar.appendChild(progressLabel);
            const bar = document.createElement('div');
            bar.className = 'progress-bar';
            const fill = document.createElement('div');
            fill.className = 'progress-fill';
            fill.style.width = Math.round((unlockStatus.unlockedCategories.length / unlockStatus.categories.length) * 100) + '%';
            bar.appendChild(fill);
            progressBar.appendChild(bar);
            wrapper.appendChild(progressBar);
        }

        // --- Weak terms nudge ---
        this._weakTerms = this._getWeakTerms(config);
        if (this._weakTerms.length > 0) {
            const nudge = document.createElement('div');
            nudge.className = 'fc-weak-nudge';
            nudge.id = 'fc-weak-nudge';

            const nudgeIcon = document.createElement('i');
            nudgeIcon.className = 'fas fa-exclamation-triangle';
            nudge.appendChild(nudgeIcon);

            const nudgeText = document.createElement('span');
            const firstName = ProgressManager.getFirstName();
            const prefix = firstName ? firstName + ', you' : 'You';
            nudgeText.textContent = ' ' + prefix + ' missed ' + this._weakTerms.length + ' term' + (this._weakTerms.length > 1 ? 's' : '') + ' in other activities. ';
            nudge.appendChild(nudgeText);

            const reviewBtn = document.createElement('button');
            reviewBtn.className = 'fc-weak-btn';
            reviewBtn.textContent = 'Review Weak Terms';
            reviewBtn.addEventListener('click', () => this._startWeakReview());
            nudge.appendChild(reviewBtn);

            wrapper.appendChild(nudge);
        }

        // --- Controls row ---
        const controls = document.createElement('div');
        controls.className = 'fc-controls';

        const filterSelect = document.createElement('select');
        filterSelect.className = 'fc-filter';
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
        filterSelect.addEventListener('change', () => this._filterByCategory(filterSelect.value));
        controls.appendChild(filterSelect);

        const shuffleBtn = document.createElement('button');
        shuffleBtn.className = 'fc-ctrl-btn';
        shuffleBtn.id = 'fc-shuffle-btn';
        const shuffleIcon = document.createElement('i');
        shuffleIcon.className = 'fas fa-random';
        shuffleBtn.appendChild(shuffleIcon);
        shuffleBtn.appendChild(document.createTextNode(' Shuffle'));
        shuffleBtn.addEventListener('click', () => this._shuffleCards());
        controls.appendChild(shuffleBtn);

        wrapper.appendChild(controls);

        // --- Progress indicator ---
        const progress = document.createElement('div');
        progress.className = 'fc-progress';
        progress.id = 'fc-progress';
        wrapper.appendChild(progress);

        // --- Card scene (3D container) ---
        const scene = document.createElement('div');
        scene.className = 'fc-scene';
        scene.id = 'fc-scene';
        scene.addEventListener('click', () => this._flip());

        const card = document.createElement('div');
        card.className = 'fc-card';
        card.id = 'fc-card';

        // Front face (term)
        const front = document.createElement('div');
        front.className = 'fc-face fc-front';
        front.id = 'fc-front';
        const frontLabel = document.createElement('div');
        frontLabel.className = 'fc-label';
        frontLabel.textContent = 'TERM';
        front.appendChild(frontLabel);
        const frontContent = document.createElement('div');
        frontContent.className = 'fc-content';
        frontContent.id = 'fc-front-content';
        front.appendChild(frontContent);
        const frontHint = document.createElement('div');
        frontHint.className = 'fc-flip-hint';
        frontHint.textContent = 'Click or press Space to reveal';
        front.appendChild(frontHint);
        card.appendChild(front);

        // Back face (definition)
        const back = document.createElement('div');
        back.className = 'fc-face fc-back';
        back.id = 'fc-back';
        const backLabel = document.createElement('div');
        backLabel.className = 'fc-label';
        backLabel.textContent = 'DEFINITION';
        back.appendChild(backLabel);
        const backContent = document.createElement('div');
        backContent.className = 'fc-content';
        backContent.id = 'fc-back-content';
        back.appendChild(backContent);
        card.appendChild(back);

        scene.appendChild(card);
        wrapper.appendChild(scene);

        // --- Confidence buttons (hidden until flipped) ---
        const confidence = document.createElement('div');
        confidence.className = 'fc-confidence';
        confidence.id = 'fc-confidence';

        const rateLabel = document.createElement('div');
        rateLabel.className = 'fc-rate-label';
        rateLabel.textContent = 'How well did you know it?';
        confidence.appendChild(rateLabel);

        const btnRow = document.createElement('div');
        btnRow.className = 'fc-rate-buttons';

        const ratingDefs = [
            { key: 'again', label: 'Again', shortcut: '1' },
            { key: 'hard', label: 'Hard', shortcut: '2' },
            { key: 'good', label: 'Good', shortcut: '3' },
            { key: 'easy', label: 'Easy', shortcut: '4' }
        ];

        ratingDefs.forEach(r => {
            const btn = document.createElement('button');
            btn.className = 'fc-rate-btn fc-rate-' + r.key;
            btn.dataset.rating = r.key;

            const labelSpan = document.createElement('span');
            labelSpan.className = 'fc-rate-btn-label';
            labelSpan.textContent = r.label;
            btn.appendChild(labelSpan);

            const shortcutSpan = document.createElement('span');
            shortcutSpan.className = 'fc-rate-shortcut';
            shortcutSpan.textContent = r.shortcut;
            btn.appendChild(shortcutSpan);

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._rate(r.key);
            });
            btnRow.appendChild(btn);
        });

        confidence.appendChild(btnRow);
        wrapper.appendChild(confidence);

        // --- Navigation ---
        const nav = document.createElement('div');
        nav.className = 'fc-nav';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'fc-nav-btn';
        prevBtn.id = 'fc-prev-btn';
        const prevIcon = document.createElement('i');
        prevIcon.className = 'fas fa-arrow-left';
        prevBtn.appendChild(prevIcon);
        prevBtn.addEventListener('click', () => this._prev());
        nav.appendChild(prevBtn);

        const counter = document.createElement('span');
        counter.className = 'fc-counter';
        counter.id = 'fc-counter';
        nav.appendChild(counter);

        const nextBtn = document.createElement('button');
        nextBtn.className = 'fc-nav-btn';
        nextBtn.id = 'fc-next-btn';
        const nextIcon = document.createElement('i');
        nextIcon.className = 'fas fa-arrow-right';
        nextBtn.appendChild(nextIcon);
        nextBtn.addEventListener('click', () => this._next());
        nav.appendChild(nextBtn);

        wrapper.appendChild(nav);

        // --- Keyboard tips ---
        const tips = document.createElement('div');
        tips.className = 'fc-tips';

        const tipItems = [
            { keys: ['Space'], action: 'flip' },
            { keys: ['\u2190', '\u2192'], action: 'navigate' },
            { keys: ['1', '2', '3', '4'], action: 'rate' }
        ];
        tipItems.forEach(tip => {
            const span = document.createElement('span');
            tip.keys.forEach(k => {
                const kbd = document.createElement('kbd');
                kbd.textContent = k;
                span.appendChild(kbd);
            });
            span.appendChild(document.createTextNode(' ' + tip.action));
            tips.appendChild(span);
        });

        wrapper.appendChild(tips);

        container.appendChild(wrapper);

        // Build SRS queue and display
        this._buildQueue();
        this._display();
    },

    // --- SRS Queue Logic ---

    _buildQueue() {
        const cards = this._displayedVocab.map(v => v.term);
        this._queue = StudyUtils.shuffle([...cards]);
        this._roundIndex = 0;
    },

    _getCurrentTerm() {
        if (this._roundIndex >= this._queue.length) return null;
        const termName = this._queue[this._roundIndex];
        return this._displayedVocab.find(v => v.term === termName) || null;
    },

    _display() {
        const card = this._getCurrentTerm();
        const scene = document.getElementById('fc-scene');
        const cardEl = document.getElementById('fc-card');
        const frontContent = document.getElementById('fc-front-content');
        const backContent = document.getElementById('fc-back-content');
        const confidence = document.getElementById('fc-confidence');
        const counter = document.getElementById('fc-counter');
        const prevBtn = document.getElementById('fc-prev-btn');
        const progress = document.getElementById('fc-progress');

        if (!scene || !card) {
            this._showComplete();
            return;
        }

        // Reset flip state
        this._isFlipped = false;
        cardEl.classList.remove('fc-flipped');
        confidence.classList.remove('fc-visible');

        // Front
        frontContent.textContent = card.term;

        // Back
        backContent.textContent = '';
        const defText = document.createElement('div');
        defText.textContent = card.definition;
        backContent.appendChild(defText);
        if (card.example) {
            const exText = document.createElement('div');
            exText.className = 'fc-example';
            exText.textContent = card.example;
            backContent.appendChild(exText);
        }

        // Category badge
        const existingBadge = scene.querySelector('.fc-cat-badge');
        if (existingBadge) existingBadge.remove();
        if (card.category) {
            const badge = document.createElement('div');
            badge.className = 'fc-cat-badge';
            badge.textContent = card.category;
            scene.appendChild(badge);
        }

        // Counter
        counter.textContent = (this._roundIndex + 1) + ' / ' + this._queue.length;

        // Progress dots
        this._updateProgress();

        // Nav buttons
        prevBtn.disabled = this._roundIndex === 0;
    },

    _flip() {
        const cardEl = document.getElementById('fc-card');
        const confidence = document.getElementById('fc-confidence');
        if (!cardEl) return;

        this._isFlipped = !this._isFlipped;

        if (this._isFlipped) {
            cardEl.classList.add('fc-flipped');
            confidence.classList.add('fc-visible');
        } else {
            cardEl.classList.remove('fc-flipped');
            confidence.classList.remove('fc-visible');
        }
    },

    _rate(rating) {
        const card = this._getCurrentTerm();
        if (!card) return;

        this._ratings[card.term] = rating;

        if (rating === 'again') {
            const insertAt = Math.min(this._roundIndex + 3, this._queue.length);
            this._queue.splice(insertAt, 0, card.term);
        } else if (rating === 'hard') {
            const insertAt = Math.min(this._roundIndex + 6, this._queue.length);
            this._queue.splice(insertAt, 0, card.term);
        } else if (rating === 'good' || rating === 'easy') {
            if (!this._mastered.includes(card.term)) {
                this._mastered.push(card.term);
                const config = StudyEngine.config;
                const unitId = config.unit.id;
                if (MasteryManager.isCategoryMastered(unitId, config, card.category)) {
                    MasteryManager.showMasteryNudge(config, card.category);
                }
            }
        }

        this._saveProgress();
        this._roundIndex++;
        this._display();
    },

    _prev() {
        if (this._roundIndex > 0) {
            this._roundIndex--;
            this._display();
        }
    },

    _next() {
        if (this._roundIndex < this._queue.length - 1) {
            this._roundIndex++;
            this._display();
        }
    },

    _shuffleCards() {
        this._queue = StudyUtils.shuffle([...this._displayedVocab.map(v => v.term)]);
        this._roundIndex = 0;
        this._display();
    },

    _filterByCategory(category) {
        const config = StudyEngine.config;
        const unlocked = MasteryManager.getUnlockedVocabulary(config.unit.id, config);
        this._displayedVocab = category
            ? unlocked.filter(v => v.category === category)
            : [...unlocked];
        this._buildQueue();
        this._display();
    },

    _updateProgress() {
        const progress = document.getElementById('fc-progress');
        if (!progress) return;
        progress.textContent = '';

        const total = this._queue.length;
        if (total > 30) {
            progress.textContent = this._mastered.length + ' of ' + this._allUnlockedVocab.length + ' mastered';
            progress.className = 'fc-progress fc-progress-text';
            return;
        }

        progress.className = 'fc-progress';
        for (let i = 0; i < total; i++) {
            const dot = document.createElement('span');
            dot.className = 'fc-dot';
            const term = this._queue[i];
            if (this._mastered.includes(term)) {
                dot.classList.add('fc-dot-mastered');
            } else if (i < this._roundIndex) {
                const rating = this._ratings[term];
                if (rating === 'again') dot.classList.add('fc-dot-again');
                else if (rating === 'hard') dot.classList.add('fc-dot-hard');
            }
            if (i === this._roundIndex) dot.classList.add('fc-dot-current');
            progress.appendChild(dot);
        }
    },

    _showComplete() {
        const wrapper = document.querySelector('.fc-wrapper');
        if (!wrapper) return;

        const scene = document.getElementById('fc-scene');
        const confidence = document.getElementById('fc-confidence');
        const nav = document.querySelector('.fc-nav');
        if (scene) scene.style.display = 'none';
        if (confidence) confidence.style.display = 'none';
        if (nav) nav.style.display = 'none';

        const existing = document.getElementById('fc-complete');
        if (existing) existing.remove();

        const complete = document.createElement('div');
        complete.className = 'fc-complete';
        complete.id = 'fc-complete';

        const icon = document.createElement('i');
        icon.className = 'fas fa-check-circle';
        complete.appendChild(icon);

        const heading = document.createElement('h2');
        const firstName = ProgressManager.getFirstName();
        heading.textContent = firstName ? 'Nice work, ' + firstName + '!' : 'Nice work!';
        complete.appendChild(heading);

        const stats = document.createElement('div');
        stats.className = 'fc-complete-stats';

        const masteredCount = this._mastered.length;
        const totalCount = this._allUnlockedVocab.length;

        const mainStat = document.createElement('div');
        const mainVal = document.createElement('span');
        mainVal.className = 'fc-stat-value';
        mainVal.textContent = masteredCount + '/' + totalCount;
        mainStat.appendChild(mainVal);
        const mainLabel = document.createElement('span');
        mainLabel.className = 'fc-stat-label';
        mainLabel.textContent = 'Terms Mastered';
        mainStat.appendChild(mainLabel);
        stats.appendChild(mainStat);

        const ratingCounts = { again: 0, hard: 0, good: 0, easy: 0 };
        for (const r of Object.values(this._ratings)) {
            if (ratingCounts[r] !== undefined) ratingCounts[r]++;
        }

        if (ratingCounts.easy > 0) {
            const easyStat = document.createElement('div');
            const easyVal = document.createElement('span');
            easyVal.className = 'fc-stat-value';
            easyVal.textContent = ratingCounts.easy;
            easyStat.appendChild(easyVal);
            const easyLabel = document.createElement('span');
            easyLabel.className = 'fc-stat-label';
            easyLabel.textContent = 'Easy';
            easyStat.appendChild(easyLabel);
            stats.appendChild(easyStat);
        }
        if (ratingCounts.again > 0) {
            const againStat = document.createElement('div');
            const againVal = document.createElement('span');
            againVal.className = 'fc-stat-value';
            againVal.textContent = ratingCounts.again;
            againStat.appendChild(againVal);
            const againLabel = document.createElement('span');
            againLabel.className = 'fc-stat-label';
            againLabel.textContent = 'Struggled';
            againStat.appendChild(againLabel);
            stats.appendChild(againStat);
        }

        complete.appendChild(stats);

        const restartBtn = document.createElement('button');
        restartBtn.className = 'fc-ctrl-btn';
        const restartIcon = document.createElement('i');
        restartIcon.className = 'fas fa-redo';
        restartBtn.appendChild(restartIcon);
        restartBtn.appendChild(document.createTextNode(' Study Again'));
        restartBtn.addEventListener('click', () => {
            complete.remove();
            if (scene) scene.style.display = '';
            if (confidence) confidence.style.display = '';
            if (nav) nav.style.display = '';
            this._buildQueue();
            this._display();
        });
        complete.appendChild(restartBtn);

        if (this._weakTerms.length > 0) {
            const weakBtn = document.createElement('button');
            weakBtn.className = 'fc-ctrl-btn fc-weak-review-btn';
            const weakIcon = document.createElement('i');
            weakIcon.className = 'fas fa-exclamation-triangle';
            weakBtn.appendChild(weakIcon);
            weakBtn.appendChild(document.createTextNode(' Review ' + this._weakTerms.length + ' Weak Terms'));
            weakBtn.addEventListener('click', () => {
                complete.remove();
                if (scene) scene.style.display = '';
                if (confidence) confidence.style.display = '';
                if (nav) nav.style.display = '';
                this._startWeakReview();
            });
            complete.appendChild(weakBtn);
        }

        wrapper.appendChild(complete);

        if (typeof AchievementManager !== 'undefined') {
            AchievementManager.checkAndAward({ activity: 'flashcards', event: 'viewedAll' });
            AchievementManager.checkAndAward({ activity: 'flashcards', event: 'complete' });
        }
    },

    // --- Cross-Activity Weakness Tracking ---

    _getWeakTerms(config) {
        const unitId = config.unit.id;
        const weakMap = {};

        // Check lightning round missed terms
        const lightningProgress = ProgressManager.getActivityProgress(unitId, 'lightning-round');
        if (lightningProgress?.missed) {
            for (const m of lightningProgress.missed) {
                weakMap[m.term] = (weakMap[m.term] || 0) + 1;
            }
        }

        // Check weakness tracker (cross-activity store)
        const weaknessData = ProgressManager.load(unitId, 'weakness_tracker');
        if (weaknessData?.terms) {
            for (const [term, count] of Object.entries(weaknessData.terms)) {
                weakMap[term] = (weakMap[term] || 0) + count;
            }
        }

        // Filter to unlocked vocab that isn't mastered
        const unlocked = MasteryManager.getUnlockedVocabulary(unitId, config);
        const unlockedTerms = unlocked.map(v => v.term);
        return Object.keys(weakMap)
            .filter(t => unlockedTerms.includes(t) && !this._mastered.includes(t))
            .sort((a, b) => weakMap[b] - weakMap[a]);
    },

    _startWeakReview() {
        this._mode = 'weak';
        const config = StudyEngine.config;
        const unlocked = MasteryManager.getUnlockedVocabulary(config.unit.id, config);
        this._displayedVocab = unlocked.filter(v => this._weakTerms.includes(v.term));
        if (this._displayedVocab.length === 0) {
            this._displayedVocab = [...unlocked];
        }
        this._buildQueue();

        const nudge = document.getElementById('fc-weak-nudge');
        if (nudge) nudge.classList.add('fc-weak-active');

        const filter = document.getElementById('fc-category-filter');
        if (filter) filter.value = '';

        this._display();
    },

    _saveProgress() {
        ProgressManager.saveActivityProgress(StudyEngine.config.unit.id, 'flashcards', {
            mastered: this._mastered,
            ratings: this._ratings
        });
    },

    activate() {
        this._keyHandler = (e) => {
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
            if (e.key === 'ArrowRight' || e.key === 'd') this._next();
            if (e.key === 'ArrowLeft' || e.key === 'a') this._prev();
            if (e.code === 'Space') { e.preventDefault(); this._flip(); }
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); this._flip(); }
            if (this._isFlipped) {
                if (e.key === '1') this._rate('again');
                if (e.key === '2') this._rate('hard');
                if (e.key === '3') this._rate('good');
                if (e.key === '4') this._rate('easy');
            }
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
        if (data?.ratings) this._ratings = data.ratings;
    }
});
