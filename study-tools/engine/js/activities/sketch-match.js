StudyEngine.registerActivity({
    id: 'sketch-match',
    name: 'Sketch & Match',
    icon: 'fas fa-images',
    description: 'Match vocabulary images to their terms — dual coding in action',
    category: 'games',
    requires: ['vocabulary'],

    _container: null,
    _config: null,
    _pool: [],
    _queue: [],
    _current: null,
    _score: 0,
    _total: 0,
    _streak: 0,
    _bestStreak: 0,
    _mode: 'image-to-term', // or 'term-to-image'
    _answered: false,

    render(container, config) {
        this._container = container;
        this._config = config;

        // Filter vocab to only terms with images
        const unlocked = MasteryManager.getUnlockedVocabulary(config.unit.id, config);
        this._pool = unlocked.filter(v => v.imageUrl);

        if (this._pool.length < 4) {
            const msg = document.createElement('div');
            msg.style.cssText = 'text-align:center;padding:60px 20px;color:var(--text-secondary);';
            msg.textContent = 'Sketch & Match needs at least 4 vocabulary terms with images. Add imageUrl to your vocabulary in config.json.';
            container.appendChild(msg);
            return;
        }

        this._score = 0;
        this._total = 0;
        this._streak = 0;
        this._bestStreak = 0;
        this._answered = false;

        this._buildUI();
        this._buildQueue();
        this._showRound();
    },

    _buildUI() {
        const wrapper = document.createElement('div');
        wrapper.className = 'sm-wrapper';
        wrapper.id = 'sm-wrapper';

        // Header with mode toggle and score
        const header = document.createElement('div');
        header.className = 'sm-header';

        const modeToggle = document.createElement('button');
        modeToggle.className = 'sm-mode-btn';
        modeToggle.id = 'sm-mode-btn';
        const modeIcon = document.createElement('i');
        modeIcon.className = 'fas fa-exchange-alt';
        modeToggle.appendChild(modeIcon);
        modeToggle.appendChild(document.createTextNode(' Switch Mode'));
        modeToggle.addEventListener('click', () => this._toggleMode());
        header.appendChild(modeToggle);

        const scoreEl = document.createElement('div');
        scoreEl.className = 'sm-score';
        scoreEl.id = 'sm-score';
        header.appendChild(scoreEl);

        wrapper.appendChild(header);

        // Mode label
        const modeLabel = document.createElement('div');
        modeLabel.className = 'sm-mode-label';
        modeLabel.id = 'sm-mode-label';
        wrapper.appendChild(modeLabel);

        // Prompt area (image or term)
        const prompt = document.createElement('div');
        prompt.className = 'sm-prompt';
        prompt.id = 'sm-prompt';
        wrapper.appendChild(prompt);

        // Choices grid
        const choices = document.createElement('div');
        choices.className = 'sm-choices';
        choices.id = 'sm-choices';
        wrapper.appendChild(choices);

        // Feedback area
        const feedback = document.createElement('div');
        feedback.className = 'sm-feedback';
        feedback.id = 'sm-feedback';
        wrapper.appendChild(feedback);

        // Streak indicator
        const streakEl = document.createElement('div');
        streakEl.className = 'sm-streak';
        streakEl.id = 'sm-streak';
        wrapper.appendChild(streakEl);

        this._container.appendChild(wrapper);
    },

    _buildQueue() {
        this._queue = StudyUtils.shuffle([...this._pool]);
        if (this._queue.length > 15) {
            this._queue = this._queue.slice(0, 15);
        }
        this._total = this._queue.length;
    },

    _showRound() {
        if (this._queue.length === 0) {
            this._showResults();
            return;
        }

        this._current = this._queue.shift();
        this._answered = false;

        const prompt = document.getElementById('sm-prompt');
        const choices = document.getElementById('sm-choices');
        const feedback = document.getElementById('sm-feedback');
        const scoreEl = document.getElementById('sm-score');
        const modeLabel = document.getElementById('sm-mode-label');
        const streakEl = document.getElementById('sm-streak');

        prompt.textContent = '';
        choices.textContent = '';
        feedback.textContent = '';
        feedback.className = 'sm-feedback';

        scoreEl.textContent = this._score + ' / ' + this._total;

        if (this._streak >= 2) {
            const fireIcon = document.createElement('i');
            fireIcon.className = 'fas fa-fire';
            streakEl.textContent = '';
            streakEl.appendChild(fireIcon);
            streakEl.appendChild(document.createTextNode(' ' + this._streak + ' in a row!'));
            streakEl.style.display = '';
        } else {
            streakEl.style.display = 'none';
        }

        if (this._mode === 'image-to-term') {
            modeLabel.textContent = 'Which term matches this image?';
            // Show image as prompt
            const img = document.createElement('img');
            img.className = 'sm-prompt-image';
            img.src = this._current.imageUrl;
            img.alt = 'Vocabulary image';
            img.addEventListener('error', function() {
                this.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'sm-prompt-fallback';
                fallback.textContent = '(Image not available)';
                prompt.appendChild(fallback);
            });
            prompt.appendChild(img);

            // Show term choices (text buttons)
            this._renderTextChoices();
        } else {
            modeLabel.textContent = 'Which image matches this term?';
            // Show term as prompt
            const termEl = document.createElement('div');
            termEl.className = 'sm-prompt-term';
            termEl.textContent = this._current.term;
            prompt.appendChild(termEl);

            const defEl = document.createElement('div');
            defEl.className = 'sm-prompt-def';
            defEl.textContent = this._current.definition;
            prompt.appendChild(defEl);

            // Show image choices
            this._renderImageChoices();
        }
    },

    _renderTextChoices() {
        const choices = document.getElementById('sm-choices');
        choices.className = 'sm-choices sm-choices-text';

        // Pick 3 wrong answers
        const wrong = this._pool
            .filter(v => v.term !== this._current.term)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

        const options = StudyUtils.shuffle([this._current, ...wrong]);

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'sm-choice-btn';
            btn.textContent = opt.term;
            btn.addEventListener('click', () => this._handleAnswer(opt.term === this._current.term, btn, opt.term));
            choices.appendChild(btn);
        });
    },

    _renderImageChoices() {
        const choices = document.getElementById('sm-choices');
        choices.className = 'sm-choices sm-choices-images';

        const wrong = this._pool
            .filter(v => v.term !== this._current.term)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

        const options = StudyUtils.shuffle([this._current, ...wrong]);

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'sm-choice-img-btn';
            const img = document.createElement('img');
            img.src = opt.imageUrl;
            img.alt = 'Choice';
            img.loading = 'lazy';
            btn.appendChild(img);
            btn.addEventListener('click', () => this._handleAnswer(opt.term === this._current.term, btn, opt.term));
            choices.appendChild(btn);
        });
    },

    _handleAnswer(correct, btn, chosenTerm) {
        if (this._answered) return;
        this._answered = true;

        const feedback = document.getElementById('sm-feedback');
        const choices = document.getElementById('sm-choices');

        // Disable all buttons
        choices.querySelectorAll('button').forEach(b => {
            b.disabled = true;
            // Highlight correct answer
            if (this._mode === 'image-to-term') {
                if (b.textContent === this._current.term) b.classList.add('sm-correct');
            } else {
                const bImg = b.querySelector('img');
                if (bImg && bImg.src.includes(this._current.imageUrl.split('/').pop())) {
                    b.classList.add('sm-correct');
                }
            }
        });

        if (correct) {
            this._score++;
            this._streak++;
            if (this._streak > this._bestStreak) this._bestStreak = this._streak;
            btn.classList.add('sm-correct');
            feedback.textContent = 'Correct!';
            feedback.className = 'sm-feedback sm-feedback-correct';
        } else {
            this._streak = 0;
            btn.classList.add('sm-wrong');
            feedback.className = 'sm-feedback sm-feedback-wrong';

            const wrongText = document.createElement('span');
            wrongText.textContent = 'Not quite. The answer is ';
            feedback.appendChild(wrongText);
            const correctTerm = document.createElement('strong');
            correctTerm.textContent = this._current.term;
            feedback.appendChild(correctTerm);

            // Track weakness
            if (typeof ProgressManager !== 'undefined') {
                const weakData = ProgressManager.load(this._config.unit.id, 'weakness_tracker') || { terms: {} };
                weakData.terms[this._current.term] = (weakData.terms[this._current.term] || 0) + 1;
                ProgressManager.save(this._config.unit.id, 'weakness_tracker', weakData);
            }
        }

        document.getElementById('sm-score').textContent = this._score + ' / ' + this._total;

        // Auto-advance after delay
        setTimeout(() => this._showRound(), correct ? 1200 : 2200);
    },

    _toggleMode() {
        this._mode = this._mode === 'image-to-term' ? 'term-to-image' : 'image-to-term';
        this._score = 0;
        this._streak = 0;
        this._bestStreak = 0;
        this._buildQueue();
        this._showRound();

        const modeBtn = document.getElementById('sm-mode-btn');
        if (modeBtn) {
            modeBtn.classList.add('sm-mode-flash');
            setTimeout(() => modeBtn.classList.remove('sm-mode-flash'), 400);
        }
    },

    _showResults() {
        const wrapper = document.getElementById('sm-wrapper');
        if (!wrapper) return;
        wrapper.textContent = '';

        const results = document.createElement('div');
        results.className = 'sm-results';

        const icon = document.createElement('i');
        icon.className = this._score >= this._total * 0.8 ? 'fas fa-trophy' : 'fas fa-chart-line';
        icon.style.cssText = 'font-size:2.5em;color:var(--accent);margin-bottom:12px;display:block;';
        results.appendChild(icon);

        const title = document.createElement('h2');
        const firstName = ProgressManager.getFirstName();
        title.textContent = this._score >= this._total * 0.8
            ? (firstName ? 'Great job, ' + firstName + '!' : 'Great job!')
            : (firstName ? 'Keep practicing, ' + firstName + '!' : 'Keep practicing!');
        results.appendChild(title);

        const scoreText = document.createElement('div');
        scoreText.className = 'sm-result-score';
        scoreText.textContent = this._score + ' out of ' + this._total + ' correct';
        results.appendChild(scoreText);

        if (this._bestStreak >= 3) {
            const streakText = document.createElement('div');
            streakText.className = 'sm-result-streak';
            const fireIcon = document.createElement('i');
            fireIcon.className = 'fas fa-fire';
            streakText.appendChild(fireIcon);
            streakText.appendChild(document.createTextNode(' Best streak: ' + this._bestStreak + ' in a row'));
            results.appendChild(streakText);
        }

        const pct = Math.round((this._score / this._total) * 100);
        const modeText = document.createElement('div');
        modeText.style.cssText = 'color:var(--text-muted);font-size:0.85em;margin-top:8px;';
        modeText.textContent = 'Mode: ' + (this._mode === 'image-to-term' ? 'Image → Term' : 'Term → Image');
        results.appendChild(modeText);

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:10px;margin-top:20px;justify-content:center;flex-wrap:wrap;';

        const playAgainBtn = document.createElement('button');
        playAgainBtn.className = 'sm-result-btn';
        const replayIcon = document.createElement('i');
        replayIcon.className = 'fas fa-redo';
        playAgainBtn.appendChild(replayIcon);
        playAgainBtn.appendChild(document.createTextNode(' Play Again'));
        playAgainBtn.addEventListener('click', () => {
            this._score = 0;
            this._streak = 0;
            this._bestStreak = 0;
            wrapper.textContent = '';
            this._buildUI();
            this._buildQueue();
            this._showRound();
        });
        btnRow.appendChild(playAgainBtn);

        const switchBtn = document.createElement('button');
        switchBtn.className = 'sm-result-btn sm-result-btn-alt';
        const switchIcon = document.createElement('i');
        switchIcon.className = 'fas fa-exchange-alt';
        switchBtn.appendChild(switchIcon);
        switchBtn.appendChild(document.createTextNode(this._mode === 'image-to-term' ? ' Try Term → Image' : ' Try Image → Term'));
        switchBtn.addEventListener('click', () => {
            this._mode = this._mode === 'image-to-term' ? 'term-to-image' : 'image-to-term';
            this._score = 0;
            this._streak = 0;
            this._bestStreak = 0;
            wrapper.textContent = '';
            this._buildUI();
            this._buildQueue();
            this._showRound();
        });
        btnRow.appendChild(switchBtn);

        results.appendChild(btnRow);
        wrapper.appendChild(results);

        // Save progress
        ProgressManager.saveActivityProgress(this._config.unit.id, 'sketch-match', {
            lastScore: this._score,
            lastTotal: this._total,
            lastPct: pct,
            bestStreak: this._bestStreak
        });

        if (typeof AchievementManager !== 'undefined') {
            AchievementManager.checkAndAward({ activity: 'sketch-match', event: 'complete' });
        }
    },

    activate() {},
    deactivate() {},

    getProgress() {
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'sketch-match');
    },

    loadProgress(data) {}
});
