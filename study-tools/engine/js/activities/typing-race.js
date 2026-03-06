StudyEngine.registerActivity({
    id: 'typing-race',
    name: 'Typing Race',
    icon: 'fas fa-car',
    description: 'Race against AI opponents by typing vocabulary terms',
    category: 'games',
    requires: ['vocabulary'],
    _terms: [],
    _currentTermIndex: 0,
    _playerProgress: 0,
    _aiProgress: [0, 0, 0],
    _aiTimers: [],
    _startTime: null,
    _gameActive: false,
    _difficulty: 'medium',
    _container: null,
    _config: null,
    _correctCount: 0,
    _wrongCount: 0,
    _wrongStreak: 0,
    _finishOrder: [],

    render(container, config) {
        this._container = container;
        this._config = config;

        var wrapper = document.createElement('div');
        wrapper.className = 'race-container';
        wrapper.id = 'race-wrapper';

        // Start screen
        var startScreen = document.createElement('div');
        startScreen.className = 'race-start-screen';
        startScreen.id = 'race-start-screen';

        var title = document.createElement('h2');
        title.textContent = 'Typing Race';
        title.style.color = 'var(--primary)';
        title.style.marginBottom = '10px';
        startScreen.appendChild(title);

        var desc = document.createElement('p');
        desc.textContent = 'See a definition, type the term as fast as you can!';
        desc.style.color = '#4b5563';
        desc.style.marginBottom = '25px';
        startScreen.appendChild(desc);

        // Difficulty selector
        var diffLabel = document.createElement('p');
        diffLabel.textContent = 'Select Difficulty:';
        diffLabel.style.fontWeight = '600';
        diffLabel.style.marginBottom = '10px';
        startScreen.appendChild(diffLabel);

        var diffGroup = document.createElement('div');
        diffGroup.style.display = 'flex';
        diffGroup.style.justifyContent = 'center';
        diffGroup.style.gap = '10px';
        diffGroup.style.marginBottom = '25px';

        var difficulties = ['easy', 'medium', 'hard'];
        var self = this;
        difficulties.forEach(function(diff) {
            var btn = document.createElement('button');
            btn.className = 'nav-button';
            btn.textContent = diff.charAt(0).toUpperCase() + diff.slice(1);
            btn.dataset.difficulty = diff;
            if (diff === self._difficulty) {
                btn.style.background = 'var(--primary)';
                btn.style.color = 'white';
            }
            btn.addEventListener('click', function() {
                self._difficulty = diff;
                var allBtns = diffGroup.querySelectorAll('button');
                for (var i = 0; i < allBtns.length; i++) {
                    allBtns[i].style.background = '';
                    allBtns[i].style.color = '';
                }
                btn.style.background = 'var(--primary)';
                btn.style.color = 'white';
            });
            diffGroup.appendChild(btn);
        });
        startScreen.appendChild(diffGroup);

        // Best time display
        var bestTimeEl = document.createElement('p');
        bestTimeEl.id = 'race-best-time';
        bestTimeEl.style.color = '#6b7280';
        bestTimeEl.style.fontSize = '0.9em';
        bestTimeEl.style.marginBottom = '20px';
        startScreen.appendChild(bestTimeEl);
        this._updateBestTimeDisplay();

        // Start button
        var startBtn = document.createElement('button');
        startBtn.className = 'nav-button';
        startBtn.style.background = 'var(--primary)';
        startBtn.style.color = 'white';
        startBtn.style.fontSize = '1.2em';
        startBtn.style.padding = '12px 30px';
        var carIcon = document.createElement('i');
        carIcon.className = 'fas fa-flag-checkered';
        startBtn.appendChild(carIcon);
        startBtn.appendChild(document.createTextNode(' Start Race'));
        startBtn.addEventListener('click', function() {
            self._startRace();
        });
        startScreen.appendChild(startBtn);

        wrapper.appendChild(startScreen);

        // Race area (hidden initially)
        var raceArea = document.createElement('div');
        raceArea.id = 'race-area';
        raceArea.style.display = 'none';
        wrapper.appendChild(raceArea);

        // Results area (hidden initially)
        var resultsArea = document.createElement('div');
        resultsArea.id = 'race-results-area';
        resultsArea.style.display = 'none';
        wrapper.appendChild(resultsArea);

        container.appendChild(wrapper);
    },

    _startRace() {
        // Pick 10 random terms
        var vocab = this._config.vocabulary.slice();
        var count = Math.min(10, vocab.length);
        this._terms = [];
        for (var i = 0; i < count; i++) {
            var idx = Math.floor(Math.random() * vocab.length);
            this._terms.push(vocab.splice(idx, 1)[0]);
        }

        this._currentTermIndex = 0;
        this._playerProgress = 0;
        this._aiProgress = [0, 0, 0];
        this._correctCount = 0;
        this._wrongCount = 0;
        this._finishOrder = [];
        this._gameActive = false;

        // Hide start screen, show race area
        var startScreen = document.getElementById('race-start-screen');
        if (startScreen) startScreen.style.display = 'none';
        var resultsArea = document.getElementById('race-results-area');
        if (resultsArea) resultsArea.style.display = 'none';

        var raceArea = document.getElementById('race-area');
        if (raceArea) {
            raceArea.style.display = 'block';
            while (raceArea.firstChild) raceArea.removeChild(raceArea.firstChild);
        }

        this._buildRaceUI(raceArea);
        this._showCountdown(this._beginRace.bind(this));
    },

    _buildRaceUI(raceArea) {
        // Countdown overlay
        var countdown = document.createElement('div');
        countdown.id = 'race-countdown';
        countdown.className = 'race-countdown';
        countdown.style.textAlign = 'center';
        countdown.style.padding = '40px';
        raceArea.appendChild(countdown);

        // Race track
        var track = document.createElement('div');
        track.className = 'race-track';
        track.id = 'race-track';
        track.style.display = 'none';

        var racers = [
            { name: 'You', carClass: 'player', emoji: '\uD83D\uDE99' },
            { name: 'Quick Quinn', carClass: 'ai-1', emoji: '\uD83D\uDE97' },
            { name: 'Speedy Sam', carClass: 'ai-2', emoji: '\uD83D\uDE95' },
            { name: 'Fast Fiona', carClass: 'ai-3', emoji: '\uD83D\uDE93' }
        ];

        for (var i = 0; i < racers.length; i++) {
            var lane = document.createElement('div');
            lane.className = 'race-lane';

            var label = document.createElement('div');
            label.className = 'race-lane-label';
            label.textContent = racers[i].name;
            lane.appendChild(label);

            var car = document.createElement('div');
            car.className = 'race-car ' + racers[i].carClass;
            car.id = 'race-car-' + i;
            car.textContent = racers[i].emoji;
            lane.appendChild(car);

            var finishLine = document.createElement('div');
            finishLine.className = 'race-finish-line';
            lane.appendChild(finishLine);

            track.appendChild(lane);
        }

        raceArea.appendChild(track);

        // Progress text
        var progressText = document.createElement('div');
        progressText.className = 'race-progress-text';
        progressText.id = 'race-progress-text';
        progressText.style.display = 'none';
        raceArea.appendChild(progressText);

        // Definition display
        var defBox = document.createElement('div');
        defBox.className = 'race-definition';
        defBox.id = 'race-definition';
        defBox.style.display = 'none';

        var defLabel = document.createElement('div');
        defLabel.className = 'race-definition-label';
        defLabel.textContent = 'TYPE THE TERM FOR THIS DEFINITION:';
        defBox.appendChild(defLabel);

        var defText = document.createElement('div');
        defText.className = 'race-definition-text';
        defText.id = 'race-definition-text';
        defBox.appendChild(defText);

        raceArea.appendChild(defBox);

        // Input area
        var inputArea = document.createElement('div');
        inputArea.className = 'race-input-area';
        inputArea.id = 'race-input-area';
        inputArea.style.display = 'none';

        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'race-input';
        input.id = 'race-input';
        input.placeholder = 'Type your answer...';
        input.autocomplete = 'off';
        var self = this;
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                self._checkAnswer(input);
            }
        });
        inputArea.appendChild(input);

        // Hint area (shows after wrong attempts)
        var hintArea = document.createElement('div');
        hintArea.id = 'race-hint';
        hintArea.style.marginTop = '8px';
        hintArea.style.fontSize = '0.9em';
        hintArea.style.color = '#f59e0b';
        hintArea.style.minHeight = '1.2em';
        inputArea.appendChild(hintArea);

        // Skip button (shows after 3 wrong attempts)
        var skipBtn = document.createElement('button');
        skipBtn.className = 'nav-button';
        skipBtn.id = 'race-skip-btn';
        skipBtn.style.marginTop = '8px';
        skipBtn.style.display = 'none';
        skipBtn.style.background = '#ef4444';
        skipBtn.style.color = 'white';
        skipBtn.style.fontSize = '0.85em';
        skipBtn.style.padding = '6px 16px';
        skipBtn.textContent = 'Skip (reveal answer)';
        skipBtn.addEventListener('click', function() {
            self._skipTerm();
        });
        inputArea.appendChild(skipBtn);

        raceArea.appendChild(inputArea);
    },

    _showCountdown(callback) {
        var countdownEl = document.getElementById('race-countdown');
        if (!countdownEl) return;

        var steps = ['3', '2', '1', 'GO!'];
        var i = 0;

        function showNext() {
            if (i < steps.length) {
                while (countdownEl.firstChild) countdownEl.removeChild(countdownEl.firstChild);
                countdownEl.textContent = steps[i];
                if (steps[i] === 'GO!') {
                    countdownEl.style.color = '#22c55e';
                }
                i++;
                setTimeout(showNext, 800);
            } else {
                countdownEl.style.display = 'none';
                callback();
            }
        }

        showNext();
    },

    _beginRace() {
        this._gameActive = true;
        this._startTime = Date.now();

        // Show race elements
        var track = document.getElementById('race-track');
        if (track) track.style.display = 'block';
        var progressText = document.getElementById('race-progress-text');
        if (progressText) progressText.style.display = 'block';
        var defBox = document.getElementById('race-definition');
        if (defBox) defBox.style.display = 'block';
        var inputArea = document.getElementById('race-input-area');
        if (inputArea) inputArea.style.display = 'block';

        this._showDefinition();
        this._startAI();

        var input = document.getElementById('race-input');
        if (input) input.focus();
    },

    _showDefinition() {
        if (this._currentTermIndex >= this._terms.length) return;

        this._wrongStreak = 0;

        var term = this._terms[this._currentTermIndex];
        var defText = document.getElementById('race-definition-text');
        if (defText) defText.textContent = term.definition;

        var progressText = document.getElementById('race-progress-text');
        if (progressText) {
            progressText.textContent = 'Question ' + (this._currentTermIndex + 1) + ' of ' + this._terms.length;
        }

        // Clear hint and hide skip button
        var hintEl = document.getElementById('race-hint');
        if (hintEl) hintEl.textContent = '';
        var skipBtn = document.getElementById('race-skip-btn');
        if (skipBtn) skipBtn.style.display = 'none';
    },

    _checkAnswer(input) {
        if (!this._gameActive) return;
        var value = input.value;
        if (!value.trim()) return;

        var expected = this._terms[this._currentTermIndex].term;
        if (StudyUtils.normalizeTerm(value) === StudyUtils.normalizeTerm(expected)) {
            this._correctCount++;
            this._wrongStreak = 0;
            this._advancePlayer();
            input.value = '';

            if (this._playerProgress >= this._terms.length) {
                this._checkRaceEnd();
            } else {
                this._showDefinition();
                input.focus();
            }
        } else {
            this._wrongCount++;
            this._wrongStreak++;

            // Flash red border briefly
            input.style.borderColor = '#ef4444';
            setTimeout(function() {
                input.style.borderColor = '';
            }, 500);
            input.select();

            // Progressive hints
            var hintEl = document.getElementById('race-hint');
            var skipBtn = document.getElementById('race-skip-btn');

            if (this._wrongStreak === 1 && hintEl) {
                hintEl.textContent = 'Hint: The term has ' + expected.length + ' characters';
            } else if (this._wrongStreak === 2 && hintEl) {
                hintEl.textContent = 'Hint: Starts with "' + expected.charAt(0).toUpperCase() + '"';
            } else if (this._wrongStreak >= 3) {
                // Show first half of the term
                var revealed = expected.substring(0, Math.ceil(expected.length / 2));
                if (hintEl) hintEl.textContent = 'Hint: "' + revealed + '..."';
                if (skipBtn) skipBtn.style.display = 'inline-block';
            }
        }
    },

    _skipTerm() {
        if (!this._gameActive) return;
        var expected = this._terms[this._currentTermIndex].term;

        // Show the answer briefly
        var hintEl = document.getElementById('race-hint');
        if (hintEl) {
            hintEl.style.color = '#ef4444';
            hintEl.textContent = 'Answer: ' + expected;
        }

        var self = this;
        setTimeout(function() {
            if (hintEl) hintEl.style.color = '#f59e0b';
            self._wrongStreak = 0;
            self._advancePlayer();
            var input = document.getElementById('race-input');
            if (input) input.value = '';

            if (self._playerProgress >= self._terms.length) {
                self._checkRaceEnd();
            } else {
                self._showDefinition();
                if (input) input.focus();
            }
        }, 1500);
    },

    _advancePlayer() {
        this._playerProgress++;
        this._currentTermIndex++;

        var car = document.getElementById('race-car-0');
        if (car) {
            var pct = Math.min((this._playerProgress / this._terms.length) * 100, 100);
            car.style.left = 'calc(' + pct + '% - 40px)';
        }

        // Record finish
        if (this._playerProgress >= this._terms.length && !this._finishOrder.includes('player')) {
            this._finishOrder.push('player');
        }
    },

    _startAI() {
        var self = this;
        var aiNames = ['Quick Quinn', 'Speedy Sam', 'Fast Fiona'];
        var ranges = {
            easy: [4000, 6000],
            medium: [3000, 5000],
            hard: [2000, 4000]
        };
        var range = ranges[this._difficulty];

        for (var i = 0; i < 3; i++) {
            (function(index) {
                function scheduleAdvance() {
                    if (!self._gameActive) return;
                    var delay = range[0] + Math.random() * (range[1] - range[0]);
                    var timer = setTimeout(function() {
                        if (!self._gameActive) return;
                        self._advanceAI(index);
                        if (self._aiProgress[index] < self._terms.length) {
                            scheduleAdvance();
                        }
                    }, delay);
                    self._aiTimers.push(timer);
                }
                scheduleAdvance();
            })(i);
        }
    },

    _advanceAI(index) {
        if (!this._gameActive) return;

        this._aiProgress[index]++;
        var carId = 'race-car-' + (index + 1);
        var car = document.getElementById(carId);
        if (car) {
            var pct = Math.min((this._aiProgress[index] / this._terms.length) * 100, 100);
            car.style.left = 'calc(' + pct + '% - 40px)';
        }

        // Record finish
        var aiKey = 'ai-' + index;
        if (this._aiProgress[index] >= this._terms.length && !this._finishOrder.includes(aiKey)) {
            this._finishOrder.push(aiKey);
            this._checkRaceEnd();
        }
    },

    _checkRaceEnd() {
        // Check if player has finished
        var playerDone = this._playerProgress >= this._terms.length;
        // Check if all AI have finished
        var allAIDone = this._aiProgress.every(function(p) {
            return p >= this._terms.length;
        }.bind(this));

        // End if player finished or all racers finished
        if (playerDone || allAIDone) {
            // Make sure player is in the finish order
            if (playerDone && !this._finishOrder.includes('player')) {
                this._finishOrder.push('player');
            }
            this._stopRace();
            this._showResults();
        }
    },

    _showResults() {
        var raceArea = document.getElementById('race-area');
        if (raceArea) raceArea.style.display = 'none';

        var resultsArea = document.getElementById('race-results-area');
        if (resultsArea) {
            resultsArea.style.display = 'block';
            while (resultsArea.firstChild) resultsArea.removeChild(resultsArea.firstChild);
        }

        var results = document.createElement('div');
        results.className = 'race-results';

        var h2 = document.createElement('h2');
        h2.textContent = 'Race Complete!';
        results.appendChild(h2);

        // Determine player placement
        var placement = this._finishOrder.indexOf('player') + 1;
        if (placement === 0) {
            // Player didn't finish; they come after all who did
            placement = this._finishOrder.length + 1;
        }
        var placementLabels = ['1st', '2nd', '3rd', '4th'];
        var placementColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

        var placementEl = document.createElement('div');
        placementEl.className = 'race-placement';
        placementEl.textContent = placementLabels[placement - 1] || placement + 'th';
        placementEl.style.color = placementColors[placement - 1] || '#666';
        results.appendChild(placementEl);

        var placeText = document.createElement('p');
        placeText.textContent = placement === 1 ? 'You won the race!' : 'You finished ' + (placementLabels[placement - 1] || placement + 'th') + ' place';
        placeText.style.marginBottom = '15px';
        placeText.style.color = '#4b5563';
        results.appendChild(placeText);

        // Stats
        var timeTaken = ((Date.now() - this._startTime) / 1000).toFixed(1);
        var accuracy = this._correctCount + this._wrongCount > 0
            ? Math.round((this._correctCount / (this._correctCount + this._wrongCount)) * 100)
            : 0;

        var statsRow = document.createElement('div');
        statsRow.className = 'race-results-stats';

        var stats = [
            { label: 'Time', value: timeTaken + 's' },
            { label: 'Correct', value: this._correctCount + '/' + this._terms.length },
            { label: 'Accuracy', value: accuracy + '%' },
            { label: 'Difficulty', value: this._difficulty.charAt(0).toUpperCase() + this._difficulty.slice(1) }
        ];

        for (var i = 0; i < stats.length; i++) {
            var statEl = document.createElement('div');
            statEl.style.textAlign = 'center';

            var valEl = document.createElement('div');
            valEl.style.fontSize = '1.4em';
            valEl.style.fontWeight = 'bold';
            valEl.style.color = 'var(--primary)';
            valEl.textContent = stats[i].value;
            statEl.appendChild(valEl);

            var labelEl = document.createElement('div');
            labelEl.style.fontSize = '0.85em';
            labelEl.style.color = '#6b7280';
            labelEl.textContent = stats[i].label;
            statEl.appendChild(labelEl);

            statsRow.appendChild(statEl);
        }

        results.appendChild(statsRow);

        // Full standings
        var standingsTitle = document.createElement('p');
        standingsTitle.style.fontWeight = '600';
        standingsTitle.style.marginTop = '15px';
        standingsTitle.style.marginBottom = '8px';
        standingsTitle.textContent = 'Final Standings:';
        results.appendChild(standingsTitle);

        var nameMap = {
            'player': 'You',
            'ai-0': 'Quick Quinn',
            'ai-1': 'Speedy Sam',
            'ai-2': 'Fast Fiona'
        };

        for (var j = 0; j < this._finishOrder.length; j++) {
            var entry = document.createElement('p');
            entry.style.color = '#555';
            entry.textContent = (j + 1) + '. ' + nameMap[this._finishOrder[j]];
            if (this._finishOrder[j] === 'player') {
                entry.style.fontWeight = 'bold';
                entry.style.color = 'var(--primary)';
            }
            results.appendChild(entry);
        }

        // Save best time if player finished first
        if (this._playerProgress >= this._terms.length) {
            this._saveBestTime(parseFloat(timeTaken));
        }

        if (typeof AchievementManager !== 'undefined') {
            AchievementManager.checkAndAward({ activity: 'typing-race', event: placement === 1 ? 'win' : 'complete', score: accuracy, totalCorrect: this._correctCount });
        }

        // Race Again button
        var self = this;
        var againBtn = document.createElement('button');
        againBtn.className = 'nav-button';
        againBtn.style.marginTop = '20px';
        againBtn.style.background = 'var(--primary)';
        againBtn.style.color = 'white';
        againBtn.style.fontSize = '1.1em';
        againBtn.style.padding = '10px 25px';
        var icon = document.createElement('i');
        icon.className = 'fas fa-redo';
        againBtn.appendChild(icon);
        againBtn.appendChild(document.createTextNode(' Race Again'));
        againBtn.addEventListener('click', function() {
            resultsArea.style.display = 'none';
            var startScreen = document.getElementById('race-start-screen');
            if (startScreen) startScreen.style.display = 'block';
            self._updateBestTimeDisplay();
        });
        results.appendChild(againBtn);

        resultsArea.appendChild(results);
    },

    _saveBestTime(time) {
        var saved = ProgressManager.getActivityProgress(this._config.unit.id, 'typing-race') || {};
        var bestTimes = saved.bestTimes || {};
        if (!bestTimes[this._difficulty] || time < bestTimes[this._difficulty]) {
            bestTimes[this._difficulty] = time;
        }
        ProgressManager.saveActivityProgress(this._config.unit.id, 'typing-race', {
            bestTimes: bestTimes
        });
    },

    _updateBestTimeDisplay() {
        var el = document.getElementById('race-best-time');
        if (!el) return;

        var saved = ProgressManager.getActivityProgress(
            this._config ? this._config.unit.id : '',
            'typing-race'
        );

        if (saved && saved.bestTimes) {
            var parts = [];
            var diffs = ['easy', 'medium', 'hard'];
            for (var i = 0; i < diffs.length; i++) {
                if (saved.bestTimes[diffs[i]]) {
                    parts.push(diffs[i].charAt(0).toUpperCase() + diffs[i].slice(1) + ': ' + saved.bestTimes[diffs[i]] + 's');
                }
            }
            if (parts.length > 0) {
                el.textContent = 'Best times - ' + parts.join(' | ');
            } else {
                el.textContent = '';
            }
        } else {
            el.textContent = '';
        }
    },

    _stopRace() {
        this._gameActive = false;
        for (var i = 0; i < this._aiTimers.length; i++) {
            clearTimeout(this._aiTimers[i]);
        }
        this._aiTimers = [];
    },

    activate() {},

    deactivate() {
        this._stopRace();
    },

    getProgress() {
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'typing-race');
    },

    loadProgress(data) {
        // Progress is loaded directly from ProgressManager when needed
    }
});
