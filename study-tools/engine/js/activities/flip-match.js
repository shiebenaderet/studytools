StudyEngine.registerActivity({
    id: 'flip-match',
    name: 'Flip Match',
    icon: 'fas fa-clone',
    description: 'Match vocabulary terms with their definitions',
    category: 'games',
    requires: ['vocabulary'],

    _container: null,
    _config: null,
    _cards: [],
    _flippedCards: [],
    _matchedPairs: 0,
    _totalPairs: 0,
    _moves: 0,
    _timer: null,
    _seconds: 0,
    _locked: false,
    _bestScores: {},

    render(container, config) {
        this._container = container;
        this._config = config;

        // Load saved progress
        const saved = ProgressManager.getActivityProgress(config.unit.id, 'flip-match');
        this._bestScores = saved?.bestScores || {};

        container.textContent = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'flip-match-container';

        // Title
        const title = document.createElement('h2');
        title.textContent = 'Flip Match';
        title.style.textAlign = 'center';
        title.style.color = 'var(--primary)';
        title.style.marginBottom = '20px';
        wrapper.appendChild(title);

        // Difficulty controls
        const controls = document.createElement('div');
        controls.className = 'flip-match-controls';

        const label = document.createElement('span');
        label.textContent = 'Difficulty:';
        label.style.fontWeight = '600';
        controls.appendChild(label);

        const difficulties = [
            { name: 'Easy', pairs: 6 },
            { name: 'Medium', pairs: 8 },
            { name: 'Hard', pairs: 12 }
        ];

        difficulties.forEach(diff => {
            const btn = document.createElement('button');
            btn.className = 'nav-button';
            btn.textContent = diff.name + ' (' + diff.pairs + ' pairs)';
            btn.addEventListener('click', () => this._startGame(diff.name.toLowerCase()));
            controls.appendChild(btn);
        });

        wrapper.appendChild(controls);

        // Best scores display
        const bestInfo = document.createElement('div');
        bestInfo.className = 'explanation';
        bestInfo.style.marginBottom = '16px';
        const bestText = document.createElement('p');
        bestText.id = 'flip-match-best';
        const parts = [];
        for (const d of ['easy', 'medium', 'hard']) {
            const score = this._bestScores[d];
            if (score) {
                parts.push(d.charAt(0).toUpperCase() + d.slice(1) + ': ' + score.moves + ' moves, ' + this._formatTime(score.time));
            }
        }
        bestText.textContent = parts.length > 0 ? 'Best Scores - ' + parts.join(' | ') : 'No scores yet. Select a difficulty to start!';
        bestInfo.appendChild(bestText);
        wrapper.appendChild(bestInfo);

        // Stats row (hidden until game starts)
        const stats = document.createElement('div');
        stats.className = 'flip-match-stats';
        stats.id = 'flip-match-stats';
        stats.style.display = 'none';

        const movesStat = document.createElement('div');
        movesStat.className = 'flip-match-stat';
        movesStat.id = 'flip-match-moves';
        movesStat.textContent = 'Moves: 0';
        stats.appendChild(movesStat);

        const timerStat = document.createElement('div');
        timerStat.className = 'flip-match-stat';
        timerStat.id = 'flip-match-timer';
        timerStat.textContent = 'Time: 0:00';
        stats.appendChild(timerStat);

        wrapper.appendChild(stats);

        // Grid container
        const grid = document.createElement('div');
        grid.className = 'match-grid';
        grid.id = 'flip-match-grid';
        wrapper.appendChild(grid);

        // Win message area
        const winArea = document.createElement('div');
        winArea.id = 'flip-match-win';
        winArea.style.display = 'none';
        wrapper.appendChild(winArea);

        container.appendChild(wrapper);
    },

    _startGame(difficulty) {
        this._stopTimer();
        this._flippedCards = [];
        this._matchedPairs = 0;
        this._moves = 0;
        this._seconds = 0;
        this._locked = false;

        const pairCounts = { easy: 6, medium: 8, hard: 12 };
        this._totalPairs = pairCounts[difficulty] || 6;

        const vocab = this._config.vocabulary;
        if (!vocab || vocab.length === 0) return;

        // Randomly select N terms (or fewer if not enough vocab)
        const shuffledVocab = this._shuffle([...vocab]);
        const selected = shuffledVocab.slice(0, Math.min(this._totalPairs, shuffledVocab.length));
        this._totalPairs = selected.length;

        // Create card pairs
        this._cards = [];
        selected.forEach((item, index) => {
            // Term card
            this._cards.push({
                pairId: index,
                type: 'term',
                text: item.term
            });
            // Definition card
            const defText = item.definition.length > 60
                ? item.definition.substring(0, 57) + '...'
                : item.definition;
            this._cards.push({
                pairId: index,
                type: 'definition',
                text: defText
            });
        });

        // Shuffle all cards
        this._shuffle(this._cards);

        // Show stats
        const statsEl = document.getElementById('flip-match-stats');
        if (statsEl) statsEl.style.display = 'flex';

        const movesEl = document.getElementById('flip-match-moves');
        if (movesEl) movesEl.textContent = 'Moves: 0';

        const timerEl = document.getElementById('flip-match-timer');
        if (timerEl) timerEl.textContent = 'Time: 0:00';

        // Hide win area
        const winArea = document.getElementById('flip-match-win');
        if (winArea) {
            winArea.style.display = 'none';
            winArea.textContent = '';
        }

        // Build grid
        const grid = document.getElementById('flip-match-grid');
        if (!grid) return;
        grid.textContent = '';
        grid.className = 'match-grid ' + difficulty;

        this._cards.forEach((cardData, i) => {
            const card = document.createElement('div');
            card.className = 'match-card';
            card.dataset.index = String(i);

            const inner = document.createElement('div');
            inner.className = 'match-card-inner';

            // Front (face-down) - shows "?"
            const front = document.createElement('div');
            front.className = 'match-card-front';
            front.textContent = '?';

            // Back (face-up) - shows term or definition
            const back = document.createElement('div');
            back.className = 'match-card-back';
            back.textContent = cardData.text;

            inner.appendChild(front);
            inner.appendChild(back);
            card.appendChild(inner);

            card.addEventListener('click', () => this._flipCard(card, cardData));

            grid.appendChild(card);
        });

        // Start timer
        this._startTimer();

        // Store difficulty for saving scores
        this._currentDifficulty = difficulty;
    },

    _flipCard(cardEl, cardData) {
        // Ignore clicks when locked, already flipped, or already matched
        if (this._locked) return;
        if (cardEl.classList.contains('flipped')) return;
        if (cardEl.classList.contains('matched')) return;

        // Flip the card
        cardEl.classList.add('flipped');
        this._flippedCards.push({ el: cardEl, data: cardData });

        // If two cards are flipped, check for match
        if (this._flippedCards.length === 2) {
            this._moves++;
            const movesEl = document.getElementById('flip-match-moves');
            if (movesEl) movesEl.textContent = 'Moves: ' + this._moves;

            this._checkMatch();
        }
    },

    _checkMatch() {
        const [first, second] = this._flippedCards;
        const isMatch = first.data.pairId === second.data.pairId &&
                        first.data.type !== second.data.type;

        if (isMatch) {
            // Mark as matched
            first.el.classList.add('matched');
            second.el.classList.add('matched');
            this._flippedCards = [];
            this._matchedPairs++;
            this._checkWin();
        } else {
            // Flip back after delay
            this._locked = true;
            setTimeout(() => {
                this._resetFlipped();
            }, 1000);
        }
    },

    _resetFlipped() {
        this._flippedCards.forEach(card => {
            card.el.classList.remove('flipped');
        });
        this._flippedCards = [];
        this._locked = false;
    },

    _checkWin() {
        if (this._matchedPairs < this._totalPairs) return;

        this._stopTimer();

        // Save best score
        const difficulty = this._currentDifficulty;
        const current = this._bestScores[difficulty];
        if (!current || this._moves < current.moves || (this._moves === current.moves && this._seconds < current.time)) {
            this._bestScores[difficulty] = { moves: this._moves, time: this._seconds };
            this._saveProgress();
        }

        // Update best scores display
        const bestEl = document.getElementById('flip-match-best');
        if (bestEl) {
            const parts = [];
            for (const d of ['easy', 'medium', 'hard']) {
                const score = this._bestScores[d];
                if (score) {
                    parts.push(d.charAt(0).toUpperCase() + d.slice(1) + ': ' + score.moves + ' moves, ' + this._formatTime(score.time));
                }
            }
            bestEl.textContent = parts.length > 0 ? 'Best Scores - ' + parts.join(' | ') : '';
        }

        if (typeof AchievementManager !== 'undefined') {
            AchievementManager.checkAndAward({ activity: 'flip-match', event: 'complete' });
        }

        // Show win message
        const winArea = document.getElementById('flip-match-win');
        if (!winArea) return;

        winArea.className = 'flip-match-win';
        winArea.style.display = 'block';
        winArea.textContent = '';

        const heading = document.createElement('h2');
        heading.textContent = 'Congratulations!';
        winArea.appendChild(heading);

        const statsText = document.createElement('p');
        statsText.textContent = 'You matched all ' + this._totalPairs + ' pairs in ' + this._moves + ' moves and ' + this._formatTime(this._seconds) + '.';
        winArea.appendChild(statsText);

        const playAgain = document.createElement('button');
        playAgain.className = 'nav-button';
        playAgain.textContent = 'Play Again';
        playAgain.style.marginTop = '15px';
        playAgain.addEventListener('click', () => this._startGame(this._currentDifficulty));
        winArea.appendChild(playAgain);
    },

    _startTimer() {
        this._stopTimer();
        this._seconds = 0;
        this._timer = setInterval(() => {
            this._seconds++;
            const timerEl = document.getElementById('flip-match-timer');
            if (timerEl) timerEl.textContent = 'Time: ' + this._formatTime(this._seconds);
        }, 1000);
    },

    _stopTimer() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
    },

    _formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    },

    _saveProgress() {
        ProgressManager.saveActivityProgress(StudyEngine.config.unit.id, 'flip-match', {
            bestScores: this._bestScores
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

    deactivate() {
        this._stopTimer();
    },

    getProgress() {
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'flip-match');
    },

    loadProgress(data) {
        if (data) {
            this._bestScores = data.bestScores || {};
        }
    }
});
