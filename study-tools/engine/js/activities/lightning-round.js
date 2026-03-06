StudyEngine.registerActivity({
    id: 'lightning-round',
    name: 'Lightning Round',
    icon: 'fas fa-bolt',
    description: 'Answer as many questions as you can in 60 seconds',
    category: 'games',
    requires: ['vocabulary'],
    _score: 0,
    _timeLeft: 60,
    _timer: null,
    _currentVocab: null,
    _options: [],
    _missed: [],
    _answered: 0,
    _gameActive: false,
    _locked: false,
    _container: null,
    _config: null,
    _usedIndices: [],

    render(container, config) {
        this._container = container;
        this._config = config;

        var wrapper = document.createElement('div');
        wrapper.className = 'lightning-container';
        wrapper.id = 'lightning-wrapper';
        container.appendChild(wrapper);

        this._showStartScreen();
    },

    _showStartScreen() {
        var wrapper = document.getElementById('lightning-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        var icon = document.createElement('i');
        icon.className = 'fas fa-bolt';
        icon.style.fontSize = '3em';
        icon.style.color = 'var(--accent)';
        icon.style.marginBottom = '15px';
        wrapper.appendChild(icon);

        var title = document.createElement('h2');
        title.textContent = 'Lightning Round';
        title.style.color = 'var(--primary)';
        title.style.marginBottom = '10px';
        wrapper.appendChild(title);

        var desc = document.createElement('p');
        desc.textContent = 'See a definition, pick the correct term. Answer as many as you can in 60 seconds!';
        desc.style.color = '#4b5563';
        desc.style.marginBottom = '25px';
        wrapper.appendChild(desc);

        // Show best score if exists
        var saved = ProgressManager.getActivityProgress(
            this._config ? this._config.unit.id : '',
            'lightning-round'
        );
        if (saved && saved.bestScore !== undefined) {
            var bestEl = document.createElement('p');
            bestEl.style.color = '#4b5563';
            bestEl.style.fontSize = '0.9em';
            bestEl.style.marginBottom = '20px';
            bestEl.textContent = 'Best score: ' + saved.bestScore;
            wrapper.appendChild(bestEl);
        }

        // Leaderboard preview
        var lb = this._getLeaderboard();
        if (lb.length > 0) {
            var lbTitle = document.createElement('p');
            lbTitle.style.fontWeight = '600';
            lbTitle.style.marginBottom = '8px';
            lbTitle.style.color = 'var(--primary)';
            lbTitle.textContent = 'Leaderboard';
            wrapper.appendChild(lbTitle);

            var table = document.createElement('table');
            table.className = 'lightning-leaderboard-table';
            var thead = document.createElement('thead');
            var headRow = document.createElement('tr');
            var thRank = document.createElement('th');
            thRank.textContent = '#';
            headRow.appendChild(thRank);
            var thScore = document.createElement('th');
            thScore.textContent = 'Score';
            headRow.appendChild(thScore);
            var thDate = document.createElement('th');
            thDate.textContent = 'Date';
            headRow.appendChild(thDate);
            thead.appendChild(headRow);
            table.appendChild(thead);

            var tbody = document.createElement('tbody');
            for (var i = 0; i < Math.min(5, lb.length); i++) {
                var row = document.createElement('tr');
                var tdRank = document.createElement('td');
                tdRank.textContent = (i + 1);
                row.appendChild(tdRank);
                var tdScore = document.createElement('td');
                tdScore.textContent = lb[i].score;
                tdScore.style.fontWeight = '600';
                row.appendChild(tdScore);
                var tdDate = document.createElement('td');
                tdDate.textContent = lb[i].date;
                tdDate.style.color = '#4b5563';
                row.appendChild(tdDate);
                tbody.appendChild(row);
            }
            table.appendChild(tbody);

            var lbWrap = document.createElement('div');
            lbWrap.className = 'lightning-leaderboard';
            lbWrap.style.marginBottom = '20px';
            lbWrap.appendChild(table);
            wrapper.appendChild(lbWrap);
        }

        var self = this;
        var startBtn = document.createElement('button');
        startBtn.className = 'nav-button';
        startBtn.style.background = 'var(--primary)';
        startBtn.style.color = 'white';
        startBtn.style.fontSize = '1.2em';
        startBtn.style.padding = '12px 30px';
        var btnIcon = document.createElement('i');
        btnIcon.className = 'fas fa-bolt';
        startBtn.appendChild(btnIcon);
        startBtn.appendChild(document.createTextNode(' Ready?'));
        startBtn.addEventListener('click', function() {
            self._showCountdown(function() {
                self._startGame();
            });
        });
        wrapper.appendChild(startBtn);
    },

    _showCountdown(callback) {
        var wrapper = document.getElementById('lightning-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        var countdownEl = document.createElement('div');
        countdownEl.className = 'lightning-countdown';
        countdownEl.id = 'lightning-countdown';
        wrapper.appendChild(countdownEl);

        var steps = ['3', '2', '1', 'GO!'];
        var i = 0;

        function showNext() {
            if (i < steps.length) {
                countdownEl.textContent = steps[i];
                countdownEl.style.animation = 'none';
                // Force reflow to restart animation
                void countdownEl.offsetWidth;
                countdownEl.style.animation = 'pulse 0.5s ease-in-out';
                if (steps[i] === 'GO!') {
                    countdownEl.style.color = '#22c55e';
                }
                i++;
                setTimeout(showNext, 800);
            } else {
                callback();
            }
        }

        showNext();
    },

    _startGame() {
        this._score = 0;
        this._timeLeft = 60;
        this._missed = [];
        this._answered = 0;
        this._gameActive = true;
        this._locked = false;
        this._usedIndices = [];

        var wrapper = document.getElementById('lightning-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        // Timer bar
        var timerBar = document.createElement('div');
        timerBar.className = 'lightning-timer-bar';
        var timerFill = document.createElement('div');
        timerFill.className = 'lightning-timer-fill';
        timerFill.id = 'lightning-timer-fill';
        timerFill.style.width = '100%';
        timerBar.appendChild(timerFill);
        wrapper.appendChild(timerBar);

        // Score bar
        var scoreBar = document.createElement('div');
        scoreBar.className = 'lightning-score-bar';

        var scoreItem = document.createElement('div');
        scoreItem.className = 'lightning-score-item';
        var scoreLabel = document.createElement('span');
        scoreLabel.className = 'label';
        scoreLabel.textContent = 'Score';
        scoreItem.appendChild(scoreLabel);
        var scoreVal = document.createElement('span');
        scoreVal.id = 'lightning-score';
        scoreVal.textContent = '0';
        scoreItem.appendChild(scoreVal);
        scoreBar.appendChild(scoreItem);

        var timeItem = document.createElement('div');
        timeItem.className = 'lightning-score-item';
        var timeLabel = document.createElement('span');
        timeLabel.className = 'label';
        timeLabel.textContent = 'Time';
        timeItem.appendChild(timeLabel);
        var timeVal = document.createElement('span');
        timeVal.id = 'lightning-time';
        timeVal.textContent = '60s';
        timeItem.appendChild(timeVal);
        scoreBar.appendChild(timeItem);

        wrapper.appendChild(scoreBar);

        // Definition area
        var defBox = document.createElement('div');
        defBox.className = 'lightning-definition';
        var defText = document.createElement('div');
        defText.className = 'lightning-definition-text';
        defText.id = 'lightning-definition-text';
        defBox.appendChild(defText);
        wrapper.appendChild(defBox);

        // Options area
        var optionsGrid = document.createElement('div');
        optionsGrid.className = 'lightning-options';
        optionsGrid.id = 'lightning-options';
        wrapper.appendChild(optionsGrid);

        // Start timer
        var self = this;
        this._timer = setInterval(function() {
            self._updateTimer();
        }, 1000);

        this._nextQuestion();
    },

    _nextQuestion() {
        if (!this._gameActive) return;

        var vocab = this._config.vocabulary;
        if (vocab.length < 4) return;

        // Pick a term we haven't used yet
        var availableIndices = [];
        for (var i = 0; i < vocab.length; i++) {
            if (this._usedIndices.indexOf(i) === -1) {
                availableIndices.push(i);
            }
        }

        // If all used, reset the pool
        if (availableIndices.length === 0) {
            this._usedIndices = [];
            for (var j = 0; j < vocab.length; j++) {
                availableIndices.push(j);
            }
        }

        var correctIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        this._usedIndices.push(correctIdx);
        this._currentVocab = vocab[correctIdx];

        // Pick 3 distractors
        var distractorPool = [];
        for (var k = 0; k < vocab.length; k++) {
            if (k !== correctIdx) {
                distractorPool.push(k);
            }
        }

        // Shuffle and pick 3
        for (var d = distractorPool.length - 1; d > 0; d--) {
            var rand = Math.floor(Math.random() * (d + 1));
            var tmp = distractorPool[d];
            distractorPool[d] = distractorPool[rand];
            distractorPool[rand] = tmp;
        }
        var distractors = distractorPool.slice(0, 3);

        // Build options array: 1 correct + 3 distractors, then shuffle
        this._options = [correctIdx].concat(distractors);
        for (var s = this._options.length - 1; s > 0; s--) {
            var r = Math.floor(Math.random() * (s + 1));
            var t = this._options[s];
            this._options[s] = this._options[r];
            this._options[r] = t;
        }

        // Update definition
        var defText = document.getElementById('lightning-definition-text');
        if (defText) defText.textContent = this._currentVocab.definition;

        // Update option buttons
        var optionsGrid = document.getElementById('lightning-options');
        if (!optionsGrid) return;
        while (optionsGrid.firstChild) optionsGrid.removeChild(optionsGrid.firstChild);

        var self = this;
        this._locked = false;
        for (var o = 0; o < this._options.length; o++) {
            (function(index) {
                var btn = document.createElement('button');
                btn.className = 'lightning-option';
                btn.textContent = vocab[self._options[index]].term;
                btn.addEventListener('click', function() {
                    self._selectAnswer(index);
                });
                optionsGrid.appendChild(btn);
            })(o);
        }
    },

    _selectAnswer(index) {
        if (!this._gameActive || this._locked) return;
        this._locked = true;
        this._answered++;

        var vocab = this._config.vocabulary;
        var selectedVocabIdx = this._options[index];
        var isCorrect = (selectedVocabIdx === vocab.indexOf(this._currentVocab));

        var optionsGrid = document.getElementById('lightning-options');
        if (!optionsGrid) return;
        var buttons = optionsGrid.querySelectorAll('.lightning-option');

        var correctOptionIndex = -1;
        for (var i = 0; i < this._options.length; i++) {
            if (vocab[this._options[i]] === this._currentVocab) {
                correctOptionIndex = i;
                break;
            }
        }

        var self = this;

        if (isCorrect) {
            this._score++;
            buttons[index].classList.add('correct-flash');

            var scoreEl = document.getElementById('lightning-score');
            if (scoreEl) scoreEl.textContent = this._score;

            setTimeout(function() {
                self._nextQuestion();
            }, 500);
        } else {
            buttons[index].classList.add('wrong-flash');
            if (correctOptionIndex >= 0 && correctOptionIndex < buttons.length) {
                buttons[correctOptionIndex].classList.add('correct-flash');
            }

            this._missed.push({
                term: this._currentVocab.term,
                definition: this._currentVocab.definition
            });

            setTimeout(function() {
                self._nextQuestion();
            }, 1000);
        }
    },

    _updateTimer() {
        if (!this._gameActive) return;

        this._timeLeft--;

        var timeEl = document.getElementById('lightning-time');
        if (timeEl) timeEl.textContent = this._timeLeft + 's';

        var fillEl = document.getElementById('lightning-timer-fill');
        if (fillEl) {
            var pct = (this._timeLeft / 60) * 100;
            fillEl.style.width = pct + '%';

            if (this._timeLeft <= 10) {
                fillEl.classList.add('warning');
            }
        }

        if (this._timeLeft <= 0) {
            this._endGame();
        }
    },

    _endGame() {
        this._gameActive = false;
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
        this._updateLeaderboard();
        this._saveBestScore();

        if (typeof AchievementManager !== 'undefined') {
            AchievementManager.checkAndAward({ activity: 'lightning', score: this._score, event: 'complete' });
        }

        this._showResults();
    },

    _showResults() {
        var wrapper = document.getElementById('lightning-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        var results = document.createElement('div');
        results.className = 'lightning-results';

        var h2 = document.createElement('h2');
        h2.textContent = 'Time\'s Up!';
        h2.style.color = 'var(--primary)';
        results.appendChild(h2);

        var finalScore = document.createElement('div');
        finalScore.className = 'lightning-final-score';
        finalScore.textContent = this._score;
        results.appendChild(finalScore);

        var pct = this._answered > 0 ? Math.round((this._score / this._answered) * 100) : 0;
        var statsText = document.createElement('p');
        statsText.style.color = '#4b5563';
        statsText.style.marginBottom = '15px';
        statsText.textContent = this._score + ' correct out of ' + this._answered + ' answered (' + pct + '%)';
        results.appendChild(statsText);

        // Missed terms
        if (this._missed.length > 0) {
            var missedSection = document.createElement('div');
            missedSection.className = 'lightning-missed';

            var missedTitle = document.createElement('h3');
            missedTitle.textContent = 'Missed Terms';
            missedTitle.style.color = '#ef4444';
            missedTitle.style.marginBottom = '10px';
            missedSection.appendChild(missedTitle);

            for (var i = 0; i < this._missed.length; i++) {
                var item = document.createElement('div');
                item.className = 'lightning-missed-item';

                var termSpan = document.createElement('span');
                termSpan.style.fontWeight = '600';
                termSpan.textContent = this._missed[i].term;
                item.appendChild(termSpan);

                var defSpan = document.createElement('span');
                defSpan.style.color = '#4b5563';
                defSpan.style.fontSize = '0.9em';
                defSpan.textContent = this._missed[i].definition;
                item.appendChild(defSpan);

                missedSection.appendChild(item);
            }

            results.appendChild(missedSection);
        }

        // Leaderboard
        var lb = this._getLeaderboard();
        if (lb.length > 0) {
            var lbSection = document.createElement('div');
            lbSection.className = 'lightning-leaderboard';

            var lbTitle = document.createElement('h3');
            lbTitle.textContent = 'Leaderboard';
            lbTitle.style.color = 'var(--primary)';
            lbTitle.style.marginBottom = '10px';
            lbSection.appendChild(lbTitle);

            var table = document.createElement('table');
            table.className = 'lightning-leaderboard-table';

            var thead = document.createElement('thead');
            var headRow = document.createElement('tr');
            var thRank = document.createElement('th');
            thRank.textContent = '#';
            headRow.appendChild(thRank);
            var thScore = document.createElement('th');
            thScore.textContent = 'Score';
            headRow.appendChild(thScore);
            var thPct = document.createElement('th');
            thPct.textContent = 'Accuracy';
            headRow.appendChild(thPct);
            var thDate = document.createElement('th');
            thDate.textContent = 'Date';
            headRow.appendChild(thDate);
            thead.appendChild(headRow);
            table.appendChild(thead);

            var tbody = document.createElement('tbody');
            for (var j = 0; j < lb.length; j++) {
                var row = document.createElement('tr');

                var tdRank = document.createElement('td');
                tdRank.textContent = (j + 1);
                row.appendChild(tdRank);

                var tdScore = document.createElement('td');
                tdScore.textContent = lb[j].score;
                tdScore.style.fontWeight = '600';
                row.appendChild(tdScore);

                var tdPct = document.createElement('td');
                tdPct.textContent = lb[j].accuracy + '%';
                row.appendChild(tdPct);

                var tdDate = document.createElement('td');
                tdDate.textContent = lb[j].date;
                tdDate.style.color = '#4b5563';
                row.appendChild(tdDate);

                tbody.appendChild(row);
            }

            table.appendChild(tbody);
            lbSection.appendChild(table);
            results.appendChild(lbSection);
        }

        // Play Again button
        var self = this;
        var againBtn = document.createElement('button');
        againBtn.className = 'nav-button';
        againBtn.style.marginTop = '20px';
        againBtn.style.background = 'var(--primary)';
        againBtn.style.color = 'white';
        againBtn.style.fontSize = '1.1em';
        againBtn.style.padding = '10px 25px';
        var btnIcon = document.createElement('i');
        btnIcon.className = 'fas fa-redo';
        againBtn.appendChild(btnIcon);
        againBtn.appendChild(document.createTextNode(' Play Again'));
        againBtn.addEventListener('click', function() {
            self._showStartScreen();
        });
        results.appendChild(againBtn);

        wrapper.appendChild(results);
    },

    _updateLeaderboard() {
        var unitId = this._config.unit.id;
        var key = 'lightning-leaderboard-' + unitId;
        var lb = [];
        try {
            var stored = localStorage.getItem(key);
            if (stored) lb = JSON.parse(stored);
        } catch (e) {
            lb = [];
        }

        var pct = this._answered > 0 ? Math.round((this._score / this._answered) * 100) : 0;
        var now = new Date();
        var dateStr = (now.getMonth() + 1) + '/' + now.getDate() + '/' + now.getFullYear();

        lb.push({
            score: this._score,
            accuracy: pct,
            date: dateStr
        });

        // Sort descending by score
        lb.sort(function(a, b) { return b.score - a.score; });

        // Keep top 10
        if (lb.length > 10) lb = lb.slice(0, 10);

        try {
            localStorage.setItem(key, JSON.stringify(lb));
        } catch (e) {
            // Storage full or unavailable
        }
    },

    _getLeaderboard() {
        var unitId = this._config ? this._config.unit.id : '';
        var key = 'lightning-leaderboard-' + unitId;
        try {
            var stored = localStorage.getItem(key);
            if (stored) return JSON.parse(stored);
        } catch (e) {
            // ignore
        }
        return [];
    },

    _saveBestScore() {
        var saved = ProgressManager.getActivityProgress(this._config.unit.id, 'lightning-round') || {};
        if (!saved.bestScore || this._score > saved.bestScore) {
            saved.bestScore = this._score;
        }
        ProgressManager.saveActivityProgress(this._config.unit.id, 'lightning-round', saved);
    },

    activate() {},

    deactivate() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
        this._gameActive = false;
    },

    getProgress() {
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'lightning-round');
    },

    loadProgress(data) {
        // Progress is loaded directly from ProgressManager when needed
    }
});
