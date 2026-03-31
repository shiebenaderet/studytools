StudyEngine.registerActivity({
    id: 'four-corners',
    name: 'Four Corners',
    icon: 'fas fa-th-large',
    description: 'Find the term that does not belong. Three share a category, one is the odd one out!',
    category: 'games',
    requires: ['vocabulary'],
    _score: 0,
    _round: 0,
    _totalRounds: 10,
    _correct: 0,
    _timerValue: 0,
    _timerInterval: null,
    _roundData: null,
    _results: [],
    _container: null,
    _config: null,
    _frozen: false,

    render(container, config) {
        this._container = container;
        this._config = config;

        var wrapper = document.createElement('div');
        wrapper.className = 'fc-game-container';
        wrapper.id = 'fc-game-wrapper';
        wrapper.style.cssText = 'max-width: 700px; margin: 0 auto; padding: 20px; text-align: center;';
        container.appendChild(wrapper);

        this._showStartScreen();
    },

    _showStartScreen() {
        var wrapper = document.getElementById('fc-game-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        var icon = document.createElement('i');
        icon.className = 'fas fa-th-large';
        icon.style.cssText = 'font-size: 3em; color: var(--accent); margin-bottom: 15px;';
        wrapper.appendChild(icon);

        var title = document.createElement('h2');
        title.textContent = 'Four Corners';
        title.style.cssText = 'color: var(--primary); margin-bottom: 10px;';
        wrapper.appendChild(title);

        var desc = document.createElement('p');
        desc.textContent = 'Three terms share a category. One does not belong. Can you find the odd one out?';
        desc.style.cssText = 'color: var(--text-secondary, #4b5563); margin-bottom: 25px;';
        wrapper.appendChild(desc);

        // Show best score if exists
        var saved = ProgressManager.getActivityProgress(
            this._config ? this._config.unit.id : '',
            'four-corners'
        );
        if (saved && saved.bestScore !== undefined) {
            var bestEl = document.createElement('p');
            bestEl.style.cssText = 'color: var(--text-secondary, #4b5563); font-size: 0.9em; margin-bottom: 5px;';
            bestEl.textContent = 'Best score: ' + saved.bestScore;
            wrapper.appendChild(bestEl);
        }
        if (saved && saved.bestAccuracy !== undefined) {
            var accEl = document.createElement('p');
            accEl.style.cssText = 'color: var(--text-secondary, #4b5563); font-size: 0.85em; margin-bottom: 5px;';
            accEl.textContent = 'Best accuracy: ' + saved.bestAccuracy + '%';
            wrapper.appendChild(accEl);
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
        this._correct = 0;
        this._results = [];
        this._frozen = false;
        this._validCategories = [];
        this._catMap = {};

        // Check we have at least 2 categories with 3+ terms each
        var categories = MasteryManager.getUnlockedCategories(this._config.unit.id, this._config);
        var vocab = MasteryManager.getUnlockedVocabulary(this._config.unit.id, this._config);

        // Group vocab by category
        var catMap = {};
        for (var i = 0; i < vocab.length; i++) {
            var cat = vocab[i].category;
            if (!catMap[cat]) catMap[cat] = [];
            catMap[cat].push(vocab[i]);
        }

        // Filter to categories with 3+ terms
        var validCats = [];
        for (var c = 0; c < categories.length; c++) {
            if (catMap[categories[c]] && catMap[categories[c]].length >= 3) {
                validCats.push(categories[c]);
            }
        }

        if (validCats.length < 2) {
            this._showNotEnoughTerms();
            return;
        }

        this._validCategories = validCats;
        this._catMap = catMap;
        this._totalRounds = 10;

        this._nextRound();
    },

    _showNotEnoughTerms() {
        var wrapper = document.getElementById('fc-game-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        var msg = document.createElement('p');
        msg.textContent = 'You need at least 2 unlocked categories with 3 or more terms each to play. Keep studying your flashcards!';
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

    _shuffle(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = a[i];
            a[i] = a[j];
            a[j] = tmp;
        }
        return a;
    },

    _truncate(text, maxLen) {
        if (!text) return '';
        if (text.length <= maxLen) return text;
        return text.substring(0, maxLen).replace(/\s+\S*$/, '') + '...';
    },

    _nextRound() {
        this._round++;
        if (this._round > this._totalRounds) {
            this._endGame();
            return;
        }

        this._frozen = false;

        // Pick majority category
        var shuffledCats = this._shuffle(this._validCategories);
        var majorityCat = shuffledCats[0];

        // Pick odd-one-out category (different from majority)
        var oddCat = null;
        for (var i = 1; i < shuffledCats.length; i++) {
            if (shuffledCats[i] !== majorityCat) {
                oddCat = shuffledCats[i];
                break;
            }
        }
        if (!oddCat) {
            // Shouldn't happen, but bail gracefully
            this._endGame();
            return;
        }

        // Pick 3 from majority
        var majorityTerms = this._shuffle(this._catMap[majorityCat]).slice(0, 3);
        // Pick 1 from odd category
        var oddTerm = this._shuffle(this._catMap[oddCat])[0];

        // Shuffle all 4
        var cards = this._shuffle(majorityTerms.concat([oddTerm]));

        this._roundData = {
            cards: cards,
            majorityCat: majorityCat,
            oddCat: oddCat,
            oddTerm: oddTerm,
            majorityTerms: majorityTerms
        };

        this._showRound();
    },

    _showRound() {
        var wrapper = document.getElementById('fc-game-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        var self = this;
        var data = this._roundData;

        // Header: score + round counter
        var header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';

        var scoreDisplay = document.createElement('div');
        scoreDisplay.style.cssText = 'font-weight: 600; color: var(--primary); font-size: 1.1em;';
        scoreDisplay.id = 'fc-game-score';
        scoreDisplay.textContent = 'Score: ' + this._score;
        header.appendChild(scoreDisplay);

        var roundDisplay = document.createElement('div');
        roundDisplay.style.cssText = 'color: var(--text-secondary, #4b5563); font-size: 0.95em;';
        roundDisplay.textContent = 'Round ' + this._round + ' / ' + this._totalRounds;
        header.appendChild(roundDisplay);

        wrapper.appendChild(header);

        // Timer bar
        var timerContainer = document.createElement('div');
        timerContainer.style.cssText = 'width: 100%; height: 6px; background: var(--bg-card, #e5e7eb); border-radius: 3px; margin-bottom: 16px; overflow: hidden;';

        var timerBar = document.createElement('div');
        timerBar.id = 'fc-game-timer-bar';
        timerBar.style.cssText = 'width: 100%; height: 100%; background: var(--accent); border-radius: 3px; transition: width 0.1s linear;';
        timerContainer.appendChild(timerBar);
        wrapper.appendChild(timerContainer);

        // Prompt
        var prompt = document.createElement('p');
        prompt.style.cssText = 'font-size: 1.1em; font-weight: 600; color: var(--text-primary, #1f2937); margin-bottom: 16px;';
        prompt.textContent = 'Which term does NOT belong?';
        wrapper.appendChild(prompt);

        // 2x2 grid
        var grid = document.createElement('div');
        grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;';
        grid.id = 'fc-game-grid';

        for (var c = 0; c < data.cards.length; c++) {
            (function(idx) {
                var card = document.createElement('button');
                card.className = 'fc-game-card';
                card.setAttribute('data-idx', idx);
                card.style.cssText = 'background: var(--bg-card, white); border: 2px solid var(--bg-card, #e5e7eb); border-radius: 12px; padding: 16px 12px; cursor: pointer; text-align: center; transition: border-color 0.2s, background 0.2s, transform 0.15s; display: flex; flex-direction: column; align-items: center; gap: 6px; min-height: 90px; justify-content: center;';

                var termEl = document.createElement('div');
                termEl.style.cssText = 'font-weight: 600; font-size: 1em; color: var(--text-primary, #1f2937); line-height: 1.3;';
                termEl.textContent = data.cards[idx].term;
                card.appendChild(termEl);

                var defEl = document.createElement('div');
                defEl.style.cssText = 'font-size: 0.8em; color: var(--text-secondary, #6b7280); line-height: 1.3;';
                defEl.textContent = self._truncate(data.cards[idx].definition || '', 60);
                card.appendChild(defEl);

                card.addEventListener('click', function() {
                    self._handleSelection(idx);
                });

                grid.appendChild(card);
            })(c);
        }

        wrapper.appendChild(grid);

        // Start timer
        this._startTimer();
    },

    _startTimer() {
        var self = this;
        this._timerValue = 80; // 80 ticks = 8 seconds (100ms per tick)

        if (this._timerInterval) {
            clearInterval(this._timerInterval);
        }

        this._timerInterval = setInterval(function() {
            self._timerValue--;
            var bar = document.getElementById('fc-game-timer-bar');
            if (bar) {
                var pct = (self._timerValue / 80) * 100;
                bar.style.width = pct + '%';

                // Change color when low
                if (self._timerValue <= 16) {
                    bar.style.background = '#ef4444';
                } else if (self._timerValue <= 32) {
                    bar.style.background = '#f59e0b';
                } else {
                    bar.style.background = 'var(--accent)';
                }
            }

            if (self._timerValue <= 0) {
                clearInterval(self._timerInterval);
                self._timerInterval = null;
                self._handleTimeout();
            }
        }, 100);
    },

    _stopTimer() {
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
    },

    _handleSelection(idx) {
        if (this._frozen) return;
        this._frozen = true;
        this._stopTimer();

        var data = this._roundData;
        var selectedTerm = data.cards[idx];
        var isCorrect = (selectedTerm.term === data.oddTerm.term);

        var timeBonus = Math.floor(this._timerValue / 10); // 0-8 bonus points
        var pointsEarned = 0;

        if (isCorrect) {
            pointsEarned = 10 + timeBonus;
            this._score += pointsEarned;
            this._correct++;

            // Record mastery for the 3 grouped terms
            for (var m = 0; m < data.majorityTerms.length; m++) {
                MasteryManager.recordTermCorrect(
                    this._config.unit.id,
                    data.majorityTerms[m].term,
                    'four-corners'
                );
            }
        }

        this._results.push({
            oddTerm: data.oddTerm.term,
            oddCat: data.oddCat,
            majorityCat: data.majorityCat,
            correct: isCorrect,
            pointsEarned: pointsEarned,
            timedOut: false
        });

        this._showFeedback(isCorrect, pointsEarned, idx);
    },

    _handleTimeout() {
        if (this._frozen) return;
        this._frozen = true;

        var data = this._roundData;

        this._results.push({
            oddTerm: data.oddTerm.term,
            oddCat: data.oddCat,
            majorityCat: data.majorityCat,
            correct: false,
            pointsEarned: 0,
            timedOut: true
        });

        this._showFeedback(false, 0, -1);
    },

    _showFeedback(isCorrect, pointsEarned, selectedIdx) {
        var data = this._roundData;
        var grid = document.getElementById('fc-game-grid');
        if (!grid) return;

        var cards = grid.querySelectorAll('.fc-game-card');

        for (var i = 0; i < cards.length; i++) {
            var cardIdx = parseInt(cards[i].getAttribute('data-idx'), 10);
            var term = data.cards[cardIdx];
            var isOdd = (term.term === data.oddTerm.term);

            // Disable pointer
            cards[i].style.cursor = 'default';
            cards[i].style.pointerEvents = 'none';

            if (isCorrect) {
                // Correct answer
                if (isOdd) {
                    // Selected card (odd one out) flashes green
                    cards[i].style.borderColor = '#22c55e';
                    cards[i].style.background = 'rgba(34, 197, 94, 0.12)';
                } else {
                    // Majority cards show category badge
                    var badge = document.createElement('div');
                    badge.style.cssText = 'font-size: 0.7em; color: var(--primary); font-weight: 600; margin-top: 4px; padding: 2px 8px; background: rgba(99, 102, 241, 0.1); border-radius: 10px;';
                    badge.textContent = data.majorityCat;
                    cards[i].appendChild(badge);
                }
            } else {
                // Wrong answer
                if (cardIdx === selectedIdx) {
                    // Tapped card flashes red
                    cards[i].style.borderColor = '#ef4444';
                    cards[i].style.background = 'rgba(239, 68, 68, 0.12)';
                }
                if (isOdd) {
                    // Correct answer highlighted in yellow
                    cards[i].style.borderColor = '#f59e0b';
                    cards[i].style.background = 'rgba(245, 158, 11, 0.15)';
                }
            }
        }

        // Show explanation below grid
        var wrapper = document.getElementById('fc-game-wrapper');
        if (!wrapper) return;

        var explanation = document.createElement('div');
        explanation.style.cssText = 'margin-top: 12px; text-align: center;';

        // Result icon + message
        var resultIcon = document.createElement('i');
        if (isCorrect) {
            resultIcon.className = 'fas fa-check-circle';
            resultIcon.style.cssText = 'font-size: 1.5em; color: #22c55e; margin-bottom: 8px;';
        } else {
            resultIcon.className = 'fas fa-times-circle';
            resultIcon.style.cssText = 'font-size: 1.5em; color: #ef4444; margin-bottom: 8px;';
        }
        explanation.appendChild(resultIcon);

        if (isCorrect) {
            var pointsMsg = document.createElement('p');
            pointsMsg.style.cssText = 'font-weight: 600; color: #22c55e; margin-bottom: 6px;';
            pointsMsg.textContent = '+' + pointsEarned + ' points';
            explanation.appendChild(pointsMsg);
        } else {
            var missMsg = document.createElement('p');
            missMsg.style.cssText = 'font-weight: 600; color: #ef4444; margin-bottom: 6px;';
            missMsg.textContent = this._results[this._results.length - 1].timedOut ? 'Time is up!' : 'Not quite!';
            explanation.appendChild(missMsg);
        }

        var groupMsg = document.createElement('p');
        groupMsg.style.cssText = 'color: var(--text-secondary, #4b5563); font-size: 0.95em; margin-bottom: 4px;';
        groupMsg.textContent = 'These three are from ' + data.majorityCat + '.';
        explanation.appendChild(groupMsg);

        var oddMsg = document.createElement('p');
        oddMsg.style.cssText = 'color: var(--text-secondary, #4b5563); font-size: 0.9em; margin-bottom: 16px;';
        oddMsg.textContent = data.oddTerm.term + ' is from ' + data.oddCat + '.';
        explanation.appendChild(oddMsg);

        // Next button
        var self = this;
        var nextBtn = document.createElement('button');
        nextBtn.className = 'nav-button';
        nextBtn.style.cssText = 'background: var(--primary); color: white; font-size: 1.05em; padding: 10px 28px;';
        var btnIcon = document.createElement('i');
        btnIcon.className = 'fas fa-arrow-right';
        nextBtn.appendChild(btnIcon);
        nextBtn.appendChild(document.createTextNode(this._round < this._totalRounds ? ' Next' : ' See Results'));
        nextBtn.addEventListener('click', function() {
            self._nextRound();
        });
        explanation.appendChild(nextBtn);

        wrapper.appendChild(explanation);

        // Update score display
        var scoreEl = document.getElementById('fc-game-score');
        if (scoreEl) {
            scoreEl.textContent = 'Score: ' + this._score;
        }
    },

    _endGame() {
        this._stopTimer();
        this._saveProgress();

        if (typeof AchievementManager !== 'undefined') {
            AchievementManager.checkAndAward({ activity: 'four-corners', score: this._score, event: 'complete' });
        }

        // Track missed terms for nudge system
        var missedTerms = [];
        for (var i = 0; i < this._results.length; i++) {
            if (!this._results[i].correct) {
                missedTerms.push(this._results[i].oddTerm);
            }
        }
        if (missedTerms.length > 0 && typeof NudgeManager !== 'undefined') {
            NudgeManager.trackMissedTerms(this._config.unit.id, this._config, missedTerms);
        }

        this._showEndScreen();
    },

    _showEndScreen() {
        var wrapper = document.getElementById('fc-game-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        // Title
        var h2 = document.createElement('h2');
        h2.textContent = 'Round Complete!';
        h2.style.cssText = 'color: var(--primary); margin-bottom: 10px;';
        wrapper.appendChild(h2);

        // Score
        var scoreEl = document.createElement('div');
        scoreEl.style.cssText = 'font-size: 2.5em; font-weight: 700; color: var(--accent); margin-bottom: 6px;';
        scoreEl.textContent = this._score;
        wrapper.appendChild(scoreEl);

        var scoreLabel = document.createElement('p');
        scoreLabel.style.cssText = 'color: var(--text-secondary, #4b5563); font-size: 0.9em; margin-bottom: 6px;';
        scoreLabel.textContent = 'points';
        wrapper.appendChild(scoreLabel);

        // Accuracy
        var accuracy = this._totalRounds > 0 ? Math.round((this._correct / this._totalRounds) * 100) : 0;
        var accEl = document.createElement('p');
        accEl.style.cssText = 'font-size: 1.1em; font-weight: 600; color: var(--primary); margin-bottom: 20px;';
        accEl.textContent = 'Accuracy: ' + accuracy + '%';
        wrapper.appendChild(accEl);

        // Encouragement
        var encourageEl = document.createElement('p');
        encourageEl.style.cssText = 'color: var(--text-secondary, #4b5563); margin-bottom: 20px;';
        if (accuracy >= 90) {
            encourageEl.textContent = 'Amazing! You really know your categories!';
        } else if (accuracy >= 70) {
            encourageEl.textContent = 'Great job! You are getting the hang of grouping these terms!';
        } else if (accuracy >= 50) {
            encourageEl.textContent = 'Nice effort! Keep studying and you will improve!';
        } else {
            encourageEl.textContent = 'Keep practicing! Each round helps you learn more.';
        }
        wrapper.appendChild(encourageEl);

        // Results breakdown
        var breakdownTitle = document.createElement('h3');
        breakdownTitle.style.cssText = 'color: var(--primary); margin-bottom: 12px; font-size: 1em;';
        breakdownTitle.textContent = 'Round Breakdown';
        wrapper.appendChild(breakdownTitle);

        var list = document.createElement('div');
        list.style.cssText = 'text-align: left; margin-bottom: 20px;';

        for (var i = 0; i < this._results.length; i++) {
            var r = this._results[i];
            var row = document.createElement('div');
            row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: 8px; margin-bottom: 4px;';

            if (r.correct) {
                row.style.background = 'rgba(34, 197, 94, 0.08)';
            } else {
                row.style.background = 'rgba(239, 68, 68, 0.08)';
            }

            var termSpan = document.createElement('span');
            termSpan.style.cssText = 'font-weight: 500; color: var(--text-primary, #1f2937); font-size: 0.9em;';
            termSpan.textContent = 'Odd: ' + r.oddTerm + ' (' + r.oddCat + ')';
            row.appendChild(termSpan);

            var detailSpan = document.createElement('span');
            detailSpan.style.cssText = 'font-size: 0.85em; color: var(--text-secondary, #6b7280); white-space: nowrap; margin-left: 12px;';
            if (r.correct) {
                detailSpan.textContent = '+' + r.pointsEarned + 'pts';
            } else if (r.timedOut) {
                detailSpan.textContent = 'Timed out';
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
        var saved = ProgressManager.getActivityProgress(unitId, 'four-corners') || {};
        var accuracy = this._totalRounds > 0 ? Math.round((this._correct / this._totalRounds) * 100) : 0;

        if (!saved.bestScore || this._score > saved.bestScore) {
            saved.bestScore = this._score;
        }
        if (!saved.bestAccuracy || accuracy > saved.bestAccuracy) {
            saved.bestAccuracy = accuracy;
        }
        saved.lastScore = this._score;
        saved.lastAccuracy = accuracy;
        saved.gamesPlayed = (saved.gamesPlayed || 0) + 1;
        saved.lastPlayed = new Date().toISOString();

        ProgressManager.saveActivityProgress(unitId, 'four-corners', saved);
    },

    activate() {},

    deactivate() {
        this._stopTimer();
    },

    cleanup() {
        this._stopTimer();
    },

    getProgress() {
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'four-corners');
    },

    loadProgress(data) {
        // Progress is loaded directly from ProgressManager when needed
    }
});
