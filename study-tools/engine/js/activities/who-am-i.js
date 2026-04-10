StudyEngine.registerActivity({
    id: 'who-am-i',
    name: 'Who Am I?',
    icon: 'fas fa-question-circle',
    description: 'Guess the term from progressive clues. Fewer clues = more points!',
    category: 'games',
    requires: ['vocabulary'],
    _score: 0,
    _round: 0,
    _totalRounds: 10,
    _currentTerm: null,
    _currentClue: 0,
    _results: [],
    _options: [],
    _container: null,
    _config: null,
    _roundTerms: [],

    render(container, config) {
        this._container = container;
        this._config = config;

        var wrapper = document.createElement('div');
        wrapper.className = 'wai-container';
        wrapper.id = 'wai-wrapper';
        wrapper.style.cssText = 'max-width: 700px; margin: 0 auto; padding: 20px; text-align: center;';
        container.appendChild(wrapper);

        this._showStartScreen();
    },

    _showStartScreen() {
        var wrapper = document.getElementById('wai-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        var icon = document.createElement('i');
        icon.className = 'fas fa-question-circle';
        icon.style.cssText = 'font-size: 3em; color: var(--accent); margin-bottom: 15px;';
        wrapper.appendChild(icon);

        var title = document.createElement('h2');
        title.textContent = 'Who Am I?';
        title.style.cssText = 'color: var(--primary); margin-bottom: 10px;';
        wrapper.appendChild(title);

        var desc = document.createElement('p');
        desc.textContent = 'Guess the term from progressive clues. Fewer clues needed means more points!';
        desc.style.cssText = 'color: var(--text-secondary, #4b5563); margin-bottom: 25px;';
        wrapper.appendChild(desc);

        // Show best score if exists
        var saved = ProgressManager.getActivityProgress(
            this._config ? this._config.unit.id : '',
            'who-am-i'
        );
        if (saved && saved.bestScore !== undefined) {
            var bestEl = document.createElement('p');
            bestEl.style.cssText = 'color: var(--text-secondary, #4b5563); font-size: 0.9em; margin-bottom: 5px;';
            bestEl.textContent = 'Best score: ' + saved.bestScore + ' / 50';
            wrapper.appendChild(bestEl);
        }
        if (saved && saved.gamesPlayed !== undefined) {
            var gamesEl = document.createElement('p');
            gamesEl.style.cssText = 'color: var(--text-secondary, #4b5563); font-size: 0.85em; margin-bottom: 20px;';
            gamesEl.textContent = 'Games played: ' + saved.gamesPlayed;
            wrapper.appendChild(gamesEl);
        }

        var self = this;
        var startBtn = document.createElement('button');
        startBtn.className = 'nav-button';
        startBtn.style.cssText = 'background: var(--primary); color: white; font-size: 1.2em; padding: 12px 30px;';
        var btnIcon = document.createElement('i');
        btnIcon.className = 'fas fa-play';
        startBtn.appendChild(btnIcon);
        startBtn.appendChild(document.createTextNode(' Start'));
        startBtn.addEventListener('click', function() {
            self._startGame();
        });
        wrapper.appendChild(startBtn);
    },

    _startGame() {
        this._score = 0;
        this._round = 0;
        this._results = [];

        // Get unlocked vocab and pick 10 terms
        var vocab = MasteryManager.getMustKnowVocabulary(this._config.unit.id, this._config);
        if (vocab.length < 4) {
            this._showNotEnoughTerms();
            return;
        }

        // Shuffle and pick up to 10
        var shuffled = vocab.slice();
        for (var i = shuffled.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = tmp;
        }
        this._totalRounds = Math.min(10, shuffled.length);
        this._roundTerms = shuffled.slice(0, this._totalRounds);

        this._nextRound();
    },

    _showNotEnoughTerms() {
        var wrapper = document.getElementById('wai-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        var msg = document.createElement('p');
        msg.textContent = 'You need at least 4 unlocked vocabulary terms to play. Keep studying your flashcards!';
        msg.style.cssText = 'color: var(--text-secondary, #4b5563); padding: 40px 20px;';
        wrapper.appendChild(msg);

        var self = this;
        var backBtn = document.createElement('button');
        backBtn.className = 'nav-button';
        backBtn.style.cssText = 'background: var(--primary); color: white; padding: 10px 25px;';
        backBtn.textContent = 'Back';
        backBtn.addEventListener('click', function() {
            self._showStartScreen();
        });
        wrapper.appendChild(backBtn);
    },

    _nextRound() {
        this._round++;
        if (this._round > this._totalRounds) {
            this._endGame();
            return;
        }

        this._currentTerm = this._roundTerms[this._round - 1];
        this._currentClue = 0;

        // Build distractor options from full unlocked vocab
        var vocab = MasteryManager.getMustKnowVocabulary(this._config.unit.id, this._config);
        var distractorPool = [];
        for (var i = 0; i < vocab.length; i++) {
            if (vocab[i].term !== this._currentTerm.term) {
                distractorPool.push(vocab[i]);
            }
        }
        // Shuffle distractors
        for (var d = distractorPool.length - 1; d > 0; d--) {
            var r = Math.floor(Math.random() * (d + 1));
            var tmp = distractorPool[d];
            distractorPool[d] = distractorPool[r];
            distractorPool[r] = tmp;
        }

        // Build options: correct + 3 distractors
        this._options = [this._currentTerm].concat(distractorPool.slice(0, 3));
        // Shuffle options
        for (var s = this._options.length - 1; s > 0; s--) {
            var ri = Math.floor(Math.random() * (s + 1));
            var t = this._options[s];
            this._options[s] = this._options[ri];
            this._options[ri] = t;
        }

        this._showClue();
    },

    _getClueText(clueIndex) {
        var term = this._currentTerm;
        if (clueIndex === 0) {
            // Distinguishing hint: use example (catchy, specific) or first sentence of simpleExplanation
            var hint = term.example || '';
            if (!hint) {
                var explanation = term.simpleExplanation || term.definition || '';
                hint = explanation.split(/[.!?]/)[0].trim() + '.';
            }
            return hint;
        } else if (clueIndex === 1) {
            // Full simple explanation
            return term.simpleExplanation || term.definition || '';
        } else if (clueIndex === 2) {
            // Category + keyword from definition
            var cat = term.category || 'this unit';
            var defWords = (term.definition || '').split(' ').slice(0, 8).join(' ');
            return 'From "' + cat + '" — ' + defWords + '...';
        } else {
            // Full definition (safety net)
            return term.definition || '';
        }
    },

    _getClueLabel(clueIndex) {
        var labels = ['Clue 1: Quick Hint', 'Clue 2: Explanation', 'Clue 3: Category + Keyword', 'Clue 4: Full Definition'];
        return labels[clueIndex] || '';
    },

    _getCluePoints(clueIndex) {
        var points = [5, 4, 3, 2];
        return points[clueIndex] || 0;
    },

    _showClue() {
        var wrapper = document.getElementById('wai-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        // Header bar: score and round counter
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;';

        var scoreDisplay = document.createElement('div');
        scoreDisplay.style.cssText = 'font-weight: 600; color: var(--primary); font-size: 1.1em;';
        scoreDisplay.textContent = 'Score: ' + this._score;
        header.appendChild(scoreDisplay);

        var roundDisplay = document.createElement('div');
        roundDisplay.style.cssText = 'color: var(--text-secondary, #4b5563); font-size: 0.95em;';
        roundDisplay.textContent = this._round + ' / ' + this._totalRounds;
        header.appendChild(roundDisplay);

        wrapper.appendChild(header);

        // Clue tier indicators
        var tierBar = document.createElement('div');
        tierBar.style.cssText = 'display: flex; gap: 6px; justify-content: center; margin-bottom: 16px;';
        for (var t = 0; t < 4; t++) {
            var dot = document.createElement('div');
            dot.style.cssText = 'width: 10px; height: 10px; border-radius: 50%;';
            if (t <= this._currentClue) {
                dot.style.background = 'var(--accent)';
            } else {
                dot.style.background = 'var(--bg-card, #e5e7eb)';
                dot.style.border = '1px solid #d1d5db';
            }
            tierBar.appendChild(dot);
        }
        wrapper.appendChild(tierBar);

        // Clue card
        var clueCard = document.createElement('div');
        clueCard.style.cssText = 'background: var(--bg-card, #f9fafb); border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); text-align: left;';

        var clueLabel = document.createElement('div');
        clueLabel.style.cssText = 'font-size: 0.8em; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;';
        clueLabel.textContent = this._getClueLabel(this._currentClue);
        clueCard.appendChild(clueLabel);

        var pointsHint = document.createElement('div');
        pointsHint.style.cssText = 'font-size: 0.8em; color: var(--text-secondary, #4b5563); margin-bottom: 12px;';
        pointsHint.textContent = 'Worth ' + this._getCluePoints(this._currentClue) + ' points if you guess now';
        clueCard.appendChild(pointsHint);

        var clueText = document.createElement('p');
        clueText.style.cssText = 'font-size: 1.1em; color: var(--text-primary, #1f2937); line-height: 1.5; margin: 0;';
        clueText.textContent = this._getClueText(this._currentClue);
        clueCard.appendChild(clueText);

        wrapper.appendChild(clueCard);

        // Answer buttons
        var optionsArea = document.createElement('div');
        optionsArea.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;';
        optionsArea.id = 'wai-options';

        var self = this;
        for (var o = 0; o < this._options.length; o++) {
            (function(idx) {
                var btn = document.createElement('button');
                btn.className = 'nav-button wai-option';
                btn.style.cssText = 'background: var(--bg-card, white); color: var(--text-primary, #1f2937); border: 2px solid var(--bg-card, #e5e7eb); padding: 14px 12px; font-size: 1em; border-radius: 10px; cursor: pointer; transition: border-color 0.2s, background 0.2s; text-align: center; font-weight: 500;';
                btn.textContent = self._options[idx].term;
                btn.addEventListener('click', function() {
                    self._handleGuess(idx);
                });
                optionsArea.appendChild(btn);
            })(o);
        }

        wrapper.appendChild(optionsArea);

        // Skip / more clues button (not on last clue)
        if (this._currentClue < 3) {
            var skipBtn = document.createElement('button');
            skipBtn.style.cssText = 'background: none; border: none; color: var(--text-secondary, #6b7280); cursor: pointer; font-size: 0.9em; padding: 8px 16px; text-decoration: underline;';
            skipBtn.textContent = 'Show another clue';
            skipBtn.addEventListener('click', function() {
                self._currentClue++;
                self._showClue();
            });
            wrapper.appendChild(skipBtn);
        }
    },

    _handleGuess(selectedIdx) {
        var selected = this._options[selectedIdx];
        var isCorrect = (selected.term === this._currentTerm.term);

        var cluesUsed = this._currentClue + 1;
        var pointsEarned = 0;

        if (isCorrect) {
            pointsEarned = this._getCluePoints(this._currentClue);
            this._score += pointsEarned;

            // Record mastery if guessed on clues 1-3 (not clue 4, too easy)
            if (this._currentClue < 3) {
                MasteryManager.recordTermCorrect(
                    this._config.unit.id,
                    this._currentTerm.term,
                    'who-am-i'
                );
            }
        }

        this._results.push({
            term: this._currentTerm.term,
            correct: isCorrect,
            cluesUsed: cluesUsed,
            pointsEarned: pointsEarned
        });

        this._showFeedback(isCorrect, pointsEarned, selectedIdx);
    },

    _showFeedback(isCorrect, pointsEarned, selectedIdx) {
        var wrapper = document.getElementById('wai-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        // Result icon
        var iconEl = document.createElement('i');
        if (isCorrect) {
            iconEl.className = 'fas fa-check-circle';
            iconEl.style.cssText = 'font-size: 2.5em; color: #22c55e; margin-bottom: 12px;';
        } else {
            iconEl.className = 'fas fa-times-circle';
            iconEl.style.cssText = 'font-size: 2.5em; color: #ef4444; margin-bottom: 12px;';
        }
        wrapper.appendChild(iconEl);

        // Result message
        var msgEl = document.createElement('h3');
        if (isCorrect) {
            msgEl.textContent = 'Correct!';
            msgEl.style.cssText = 'color: #22c55e; margin-bottom: 8px;';
        } else {
            msgEl.textContent = 'Not quite!';
            msgEl.style.cssText = 'color: #ef4444; margin-bottom: 8px;';
        }
        wrapper.appendChild(msgEl);

        // Show the term
        var termEl = document.createElement('p');
        termEl.style.cssText = 'font-size: 1.2em; font-weight: 600; color: var(--primary); margin-bottom: 6px;';
        termEl.textContent = this._currentTerm.term;
        wrapper.appendChild(termEl);

        // Points earned
        var pointsEl = document.createElement('p');
        pointsEl.style.cssText = 'color: var(--text-secondary, #4b5563); margin-bottom: 6px;';
        if (isCorrect) {
            var cluesUsed = this._currentClue + 1;
            pointsEl.textContent = '+' + pointsEarned + ' points (guessed on clue ' + cluesUsed + ' of 4)';
        } else {
            pointsEl.textContent = '+0 points';
        }
        wrapper.appendChild(pointsEl);

        // Running score
        var runningEl = document.createElement('p');
        runningEl.style.cssText = 'font-size: 0.9em; color: var(--text-secondary, #6b7280); margin-bottom: 20px;';
        runningEl.textContent = 'Total score: ' + this._score;
        wrapper.appendChild(runningEl);

        // Next button
        var self = this;
        var nextBtn = document.createElement('button');
        nextBtn.className = 'nav-button';
        nextBtn.style.cssText = 'background: var(--primary); color: white; font-size: 1.1em; padding: 12px 30px;';
        var btnIcon = document.createElement('i');
        btnIcon.className = 'fas fa-arrow-right';
        nextBtn.appendChild(btnIcon);
        nextBtn.appendChild(document.createTextNode(this._round < this._totalRounds ? ' Next' : ' See Results'));
        nextBtn.addEventListener('click', function() {
            self._nextRound();
        });
        wrapper.appendChild(nextBtn);
    },

    _endGame() {
        this._saveProgress();

        if (typeof AchievementManager !== 'undefined') {
            AchievementManager.checkAndAward({ activity: 'who-am-i', score: this._score, event: 'complete' });
        }

        // Track missed terms for nudge system
        var missedTerms = [];
        for (var i = 0; i < this._results.length; i++) {
            if (!this._results[i].correct) {
                missedTerms.push(this._results[i].term);
            }
        }
        if (missedTerms.length > 0 && typeof NudgeManager !== 'undefined') {
            NudgeManager.trackMissedTerms(this._config.unit.id, this._config, missedTerms);
        }

        this._showEndScreen();
    },

    _showEndScreen() {
        var wrapper = document.getElementById('wai-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        // Title
        var h2 = document.createElement('h2');
        h2.textContent = 'Round Complete!';
        h2.style.cssText = 'color: var(--primary); margin-bottom: 10px;';
        wrapper.appendChild(h2);

        // Score display
        var maxScore = this._totalRounds * 5;
        var scoreEl = document.createElement('div');
        scoreEl.style.cssText = 'font-size: 2.5em; font-weight: 700; color: var(--accent); margin-bottom: 6px;';
        scoreEl.textContent = this._score + ' / ' + maxScore;
        wrapper.appendChild(scoreEl);

        // Encouragement
        var pct = maxScore > 0 ? Math.round((this._score / maxScore) * 100) : 0;
        var encourageEl = document.createElement('p');
        encourageEl.style.cssText = 'color: var(--text-secondary, #4b5563); margin-bottom: 20px;';
        if (pct >= 90) {
            encourageEl.textContent = 'Amazing! You really know your stuff!';
        } else if (pct >= 70) {
            encourageEl.textContent = 'Great job! You are getting the hang of these terms!';
        } else if (pct >= 50) {
            encourageEl.textContent = 'Nice effort! Keep studying and you will improve!';
        } else {
            encourageEl.textContent = 'Keep practicing! Each round helps you learn more.';
        }
        wrapper.appendChild(encourageEl);

        // Results breakdown
        var breakdownTitle = document.createElement('h3');
        breakdownTitle.style.cssText = 'color: var(--primary); margin-bottom: 12px; font-size: 1em;';
        breakdownTitle.textContent = 'Term Breakdown';
        wrapper.appendChild(breakdownTitle);

        var list = document.createElement('div');
        list.style.cssText = 'text-align: left; margin-bottom: 20px;';

        // Sort results: most clues needed first
        var sorted = this._results.slice().sort(function(a, b) {
            return b.cluesUsed - a.cluesUsed;
        });

        for (var i = 0; i < sorted.length; i++) {
            var row = document.createElement('div');
            row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: 8px; margin-bottom: 4px;';

            if (sorted[i].correct) {
                row.style.background = 'rgba(34, 197, 94, 0.08)';
            } else {
                row.style.background = 'rgba(239, 68, 68, 0.08)';
            }

            var termSpan = document.createElement('span');
            termSpan.style.cssText = 'font-weight: 500; color: var(--text-primary, #1f2937);';
            termSpan.textContent = sorted[i].term;
            row.appendChild(termSpan);

            var detailSpan = document.createElement('span');
            detailSpan.style.cssText = 'font-size: 0.85em; color: var(--text-secondary, #6b7280); white-space: nowrap; margin-left: 12px;';
            if (sorted[i].correct) {
                detailSpan.textContent = 'Clue ' + sorted[i].cluesUsed + ' / +' + sorted[i].pointsEarned + 'pts';
            } else {
                detailSpan.textContent = 'Missed';
            }
            row.appendChild(detailSpan);

            list.appendChild(row);
        }
        wrapper.appendChild(list);

        // Play Again button
        var self = this;
        var againBtn = document.createElement('button');
        againBtn.className = 'nav-button';
        againBtn.style.cssText = 'background: var(--primary); color: white; font-size: 1.1em; padding: 12px 30px;';
        var btnIcon = document.createElement('i');
        btnIcon.className = 'fas fa-redo';
        againBtn.appendChild(btnIcon);
        againBtn.appendChild(document.createTextNode(' Play Again'));
        againBtn.addEventListener('click', function() {
            self._showStartScreen();
        });
        wrapper.appendChild(againBtn);
    },

    _saveProgress() {
        var unitId = this._config.unit.id;
        var saved = ProgressManager.getActivityProgress(unitId, 'who-am-i') || {};

        if (!saved.bestScore || this._score > saved.bestScore) {
            saved.bestScore = this._score;
        }
        saved.lastScore = this._score;
        saved.gamesPlayed = (saved.gamesPlayed || 0) + 1;
        saved.lastPlayed = new Date().toISOString();

        ProgressManager.saveActivityProgress(unitId, 'who-am-i', saved);
    },

    activate() {},

    deactivate() {},

    cleanup() {},

    getProgress() {
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'who-am-i');
    },

    loadProgress(data) {
        // Progress is loaded directly from ProgressManager when needed
    }
});
