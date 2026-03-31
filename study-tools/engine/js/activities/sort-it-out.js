StudyEngine.registerActivity({
    id: 'sort-it-out',
    name: 'Sort It Out',
    icon: 'fas fa-layer-group',
    description: 'Sort vocabulary terms into their correct categories',
    category: 'games',
    requires: ['vocabulary'],
    _score: 0,
    _streak: 0,
    _longestStreak: 0,
    _correct: 0,
    _wrong: 0,
    _termIndex: 0,
    _terms: [],
    _categories: [],
    _timer: null,
    _timerDuration: 10,
    _timerRemaining: 10,
    _timerInterval: null,
    _container: null,
    _config: null,
    _bucketColors: ['#4a7fb5', '#b05a5a', '#c9a84c', '#6a8a6a'],
    _isProcessing: false,

    render(container, config) {
        this._container = container;
        this._config = config;

        var wrapper = document.createElement('div');
        wrapper.className = 'sio-container';
        wrapper.id = 'sio-wrapper';
        wrapper.style.cssText = 'max-width: 700px; margin: 0 auto; padding: 20px; text-align: center;';
        container.appendChild(wrapper);

        this._showStartScreen();
    },

    _showStartScreen() {
        var wrapper = document.getElementById('sio-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        var icon = document.createElement('i');
        icon.className = 'fas fa-layer-group';
        icon.style.cssText = 'font-size: 3em; color: var(--accent); margin-bottom: 15px;';
        wrapper.appendChild(icon);

        var title = document.createElement('h2');
        title.textContent = 'Sort It Out';
        title.style.cssText = 'color: var(--primary); margin-bottom: 10px;';
        wrapper.appendChild(title);

        var desc = document.createElement('p');
        desc.textContent = 'Sort vocabulary terms into their correct categories before time runs out!';
        desc.style.cssText = 'color: var(--text-secondary, #4b5563); margin-bottom: 25px;';
        wrapper.appendChild(desc);

        // Show best score/streak if exists
        var saved = ProgressManager.getActivityProgress(
            this._config ? this._config.unit.id : '',
            'sort-it-out'
        );
        if (saved && saved.bestScore !== undefined) {
            var bestEl = document.createElement('p');
            bestEl.style.cssText = 'color: var(--text-secondary, #4b5563); font-size: 0.9em; margin-bottom: 5px;';
            bestEl.textContent = 'Best score: ' + saved.bestScore;
            wrapper.appendChild(bestEl);
        }
        if (saved && saved.longestStreak !== undefined) {
            var streakEl = document.createElement('p');
            streakEl.style.cssText = 'color: var(--text-secondary, #4b5563); font-size: 0.85em; margin-bottom: 5px;';
            streakEl.textContent = 'Longest streak: ' + saved.longestStreak;
            wrapper.appendChild(streakEl);
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
        this._streak = 0;
        this._longestStreak = 0;
        this._correct = 0;
        this._wrong = 0;
        this._termIndex = 0;
        this._timerDuration = 10;
        this._isProcessing = false;

        // Get unlocked categories
        var categories = MasteryManager.getUnlockedCategories(this._config.unit.id, this._config);
        if (categories.length < 2) {
            this._showNotEnoughCategories();
            return;
        }

        // Limit to 4 categories max
        this._categories = categories.slice(0, 4);

        // Get unlocked vocab filtered to our categories
        var vocab = MasteryManager.getUnlockedVocabulary(this._config.unit.id, this._config);
        var categorySet = {};
        for (var c = 0; c < this._categories.length; c++) {
            categorySet[this._categories[c]] = true;
        }

        var filtered = [];
        for (var v = 0; v < vocab.length; v++) {
            if (vocab[v].category && categorySet[vocab[v].category]) {
                filtered.push(vocab[v]);
            }
        }

        if (filtered.length < 4) {
            this._showNotEnoughCategories();
            return;
        }

        // Shuffle terms
        for (var i = filtered.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = filtered[i];
            filtered[i] = filtered[j];
            filtered[j] = tmp;
        }

        this._terms = filtered;
        this._showGameScreen();
    },

    _showNotEnoughCategories() {
        var wrapper = document.getElementById('sio-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        var msg = document.createElement('p');
        msg.textContent = 'You need at least 2 unlocked categories to play Sort It Out. Keep studying your flashcards to unlock more!';
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

    _showGameScreen() {
        if (this._termIndex >= this._terms.length) {
            this._endGame();
            return;
        }

        var wrapper = document.getElementById('sio-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        var currentTerm = this._terms[this._termIndex];

        // Header: score, streak, progress
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';

        var scoreDisplay = document.createElement('div');
        scoreDisplay.style.cssText = 'font-weight: 600; color: var(--primary); font-size: 1.1em;';
        scoreDisplay.textContent = 'Score: ' + this._score;
        header.appendChild(scoreDisplay);

        var streakDisplay = document.createElement('div');
        streakDisplay.id = 'sio-streak';
        streakDisplay.style.cssText = 'font-weight: 600; color: var(--accent); font-size: 1em;';
        streakDisplay.textContent = this._streak > 0 ? 'Streak: ' + this._streak : '';
        header.appendChild(streakDisplay);

        var progressDisplay = document.createElement('div');
        progressDisplay.style.cssText = 'color: var(--text-secondary, #4b5563); font-size: 0.95em;';
        progressDisplay.textContent = (this._termIndex + 1) + ' / ' + this._terms.length + ' sorted';
        header.appendChild(progressDisplay);

        wrapper.appendChild(header);

        // Timer bar
        var timerContainer = document.createElement('div');
        timerContainer.style.cssText = 'width: 100%; height: 6px; background: var(--bg-card, #e5e7eb); border-radius: 3px; margin-bottom: 20px; overflow: hidden;';

        var timerBar = document.createElement('div');
        timerBar.id = 'sio-timer-bar';
        timerBar.style.cssText = 'width: 100%; height: 100%; background: var(--accent); border-radius: 3px; transition: width 0.1s linear;';
        timerContainer.appendChild(timerBar);
        wrapper.appendChild(timerContainer);

        // Category buckets
        var bucketsRow = document.createElement('div');
        bucketsRow.style.cssText = 'display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 30px;';
        bucketsRow.id = 'sio-buckets';

        var self = this;
        for (var b = 0; b < this._categories.length; b++) {
            (function(catIndex) {
                var bucket = document.createElement('button');
                bucket.className = 'nav-button sio-bucket';
                bucket.setAttribute('data-category', self._categories[catIndex]);
                var color = self._bucketColors[catIndex % self._bucketColors.length];
                bucket.style.cssText = 'background: ' + color + '; color: white; font-size: 0.95em; padding: 14px 18px; border-radius: 12px; cursor: pointer; flex: 1; min-width: 100px; max-width: 200px; font-weight: 600; transition: transform 0.15s, box-shadow 0.15s; border: 3px solid transparent;';

                var bucketIcon = document.createElement('i');
                bucketIcon.className = 'fas fa-inbox';
                bucketIcon.style.cssText = 'display: block; font-size: 1.3em; margin-bottom: 4px;';
                bucket.appendChild(bucketIcon);

                var bucketLabel = document.createElement('span');
                bucketLabel.textContent = self._categories[catIndex];
                bucket.appendChild(bucketLabel);

                bucket.addEventListener('click', function() {
                    self._handleSort(self._categories[catIndex]);
                });
                bucketsRow.appendChild(bucket);
            })(b);
        }
        wrapper.appendChild(bucketsRow);

        // Term card
        var termCard = document.createElement('div');
        termCard.id = 'sio-term-card';
        termCard.style.cssText = 'background: var(--bg-card, #f9fafb); border-radius: 14px; padding: 28px 24px; margin-bottom: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); transition: background 0.3s, transform 0.3s;';

        var termName = document.createElement('h3');
        termName.style.cssText = 'color: var(--text-primary, #1f2937); font-size: 1.3em; margin-bottom: 10px; margin-top: 0;';
        termName.textContent = currentTerm.term;
        termCard.appendChild(termName);

        var termDef = document.createElement('p');
        termDef.style.cssText = 'color: var(--text-secondary, #4b5563); font-size: 1em; line-height: 1.5; margin: 0;';
        termDef.textContent = currentTerm.definition || currentTerm.simpleExplanation || '';
        termCard.appendChild(termDef);

        wrapper.appendChild(termCard);

        // Start timer
        this._startTimer();
    },

    _startTimer() {
        this._clearTimer();
        this._timerRemaining = this._timerDuration;

        var self = this;
        var startTime = Date.now();
        var duration = this._timerDuration * 1000;

        this._timerInterval = setInterval(function() {
            var elapsed = Date.now() - startTime;
            var fraction = 1 - (elapsed / duration);
            if (fraction <= 0) {
                fraction = 0;
                self._clearTimer();
                self._handleTimeout();
            }

            var bar = document.getElementById('sio-timer-bar');
            if (bar) {
                bar.style.width = (fraction * 100) + '%';
                // Change color when low on time
                if (fraction < 0.25) {
                    bar.style.background = '#ef4444';
                } else if (fraction < 0.5) {
                    bar.style.background = '#f59e0b';
                } else {
                    bar.style.background = 'var(--accent)';
                }
            }
        }, 50);
    },

    _clearTimer() {
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
    },

    _handleTimeout() {
        if (this._isProcessing) return;
        this._isProcessing = true;

        this._wrong++;
        this._streak = 0;

        this._showFeedback(false, null);
    },

    _handleSort(selectedCategory) {
        if (this._isProcessing) return;
        this._isProcessing = true;
        this._clearTimer();

        var currentTerm = this._terms[this._termIndex];
        var isCorrect = (selectedCategory === currentTerm.category);

        if (isCorrect) {
            var points = 10 + (this._streak * 2);
            this._score += points;
            this._streak++;
            this._correct++;
            if (this._streak > this._longestStreak) {
                this._longestStreak = this._streak;
            }

            MasteryManager.recordTermCorrect(
                this._config.unit.id,
                currentTerm.term,
                'sort-it-out'
            );

            // Speed up every 5 correct answers
            if (this._correct % 5 === 0 && this._timerDuration > 3) {
                this._timerDuration = Math.max(3, this._timerDuration - 0.5);
            }
        } else {
            this._wrong++;
            this._streak = 0;
        }

        this._showFeedback(isCorrect, selectedCategory);
    },

    _showFeedback(isCorrect, selectedCategory) {
        var currentTerm = this._terms[this._termIndex];
        var termCard = document.getElementById('sio-term-card');
        var bucketsRow = document.getElementById('sio-buckets');

        // Flash term card green or red
        if (termCard) {
            if (isCorrect) {
                termCard.style.background = 'rgba(34, 197, 94, 0.15)';
                termCard.style.transform = 'scale(0.95)';
            } else {
                termCard.style.background = 'rgba(239, 68, 68, 0.15)';
                termCard.style.transform = 'scale(1.02)';
            }
        }

        // Highlight correct bucket
        if (bucketsRow) {
            var buckets = bucketsRow.querySelectorAll('.sio-bucket');
            for (var b = 0; b < buckets.length; b++) {
                var cat = buckets[b].getAttribute('data-category');
                if (cat === currentTerm.category) {
                    buckets[b].style.borderColor = '#22c55e';
                    buckets[b].style.transform = 'scale(1.08)';
                    buckets[b].style.boxShadow = '0 0 12px rgba(34, 197, 94, 0.4)';
                } else if (!isCorrect && cat === selectedCategory) {
                    buckets[b].style.borderColor = '#ef4444';
                }
            }
        }

        // Update streak display
        var streakEl = document.getElementById('sio-streak');
        if (streakEl) {
            streakEl.textContent = this._streak > 0 ? 'Streak: ' + this._streak : '';
        }

        // Auto-advance after 0.5s
        var self = this;
        setTimeout(function() {
            self._termIndex++;
            self._isProcessing = false;
            self._showGameScreen();
        }, 500);
    },

    _endGame() {
        this._clearTimer();
        this._saveProgress();

        if (typeof AchievementManager !== 'undefined') {
            AchievementManager.checkAndAward({ activity: 'sort-it-out', score: this._score, event: 'complete' });
        }

        // Track missed terms for nudge system
        // (we don't track individual misses in this game, so skip missed-term nudges)
        this._showEndScreen();
    },

    _showEndScreen() {
        var wrapper = document.getElementById('sio-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        // Title
        var h2 = document.createElement('h2');
        h2.textContent = 'All Sorted!';
        h2.style.cssText = 'color: var(--primary); margin-bottom: 10px;';
        wrapper.appendChild(h2);

        // Score
        var scoreEl = document.createElement('div');
        scoreEl.style.cssText = 'font-size: 2.5em; font-weight: 700; color: var(--accent); margin-bottom: 12px;';
        scoreEl.textContent = this._score + ' points';
        wrapper.appendChild(scoreEl);

        // Stats row
        var statsRow = document.createElement('div');
        statsRow.style.cssText = 'display: flex; justify-content: center; gap: 24px; margin-bottom: 20px; flex-wrap: wrap;';

        var total = this._correct + this._wrong;
        var accuracy = total > 0 ? Math.round((this._correct / total) * 100) : 0;

        var stats = [
            { label: 'Accuracy', value: accuracy + '%' },
            { label: 'Longest Streak', value: String(this._longestStreak) },
            { label: 'Correct', value: this._correct + ' / ' + total }
        ];

        for (var s = 0; s < stats.length; s++) {
            var statBox = document.createElement('div');
            statBox.style.cssText = 'text-align: center;';

            var statValue = document.createElement('div');
            statValue.style.cssText = 'font-size: 1.5em; font-weight: 700; color: var(--primary);';
            statValue.textContent = stats[s].value;
            statBox.appendChild(statValue);

            var statLabel = document.createElement('div');
            statLabel.style.cssText = 'font-size: 0.85em; color: var(--text-secondary, #6b7280);';
            statLabel.textContent = stats[s].label;
            statBox.appendChild(statLabel);

            statsRow.appendChild(statBox);
        }

        wrapper.appendChild(statsRow);

        // Encouragement
        var encourageEl = document.createElement('p');
        encourageEl.style.cssText = 'color: var(--text-secondary, #4b5563); margin-bottom: 25px;';
        if (accuracy >= 90) {
            encourageEl.textContent = 'Outstanding! You really know where everything belongs!';
        } else if (accuracy >= 70) {
            encourageEl.textContent = 'Great sorting! You are getting a solid handle on these categories!';
        } else if (accuracy >= 50) {
            encourageEl.textContent = 'Nice effort! Keep practicing and the categories will click!';
        } else {
            encourageEl.textContent = 'Keep at it! Each round helps you learn the categories better.';
        }
        wrapper.appendChild(encourageEl);

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
        var saved = ProgressManager.getActivityProgress(unitId, 'sort-it-out') || {};

        if (!saved.bestScore || this._score > saved.bestScore) {
            saved.bestScore = this._score;
        }
        if (!saved.longestStreak || this._longestStreak > saved.longestStreak) {
            saved.longestStreak = this._longestStreak;
        }
        saved.gamesPlayed = (saved.gamesPlayed || 0) + 1;
        saved.lastPlayed = new Date().toISOString();

        ProgressManager.saveActivityProgress(unitId, 'sort-it-out', saved);
    },

    activate() {},

    deactivate() {},

    cleanup() {
        this._clearTimer();
    },

    getProgress() {
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'sort-it-out');
    },

    loadProgress(data) {
        // Progress is loaded directly from ProgressManager when needed
    }
});
