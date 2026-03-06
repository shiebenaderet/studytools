StudyEngine.registerActivity({
    id: 'term-catcher',
    name: 'Term Catcher',
    icon: 'fas fa-hand-pointer',
    description: 'Catch the falling term that matches the definition',
    category: 'games',
    requires: ['vocabulary'],

    _container: null,
    _config: null,
    _score: 0,
    _lives: 3,
    _combo: 0,
    _speed: 1,
    _correctCount: 0,
    _currentDefinition: null,
    _currentAnswer: null,
    _fallingTerms: [],
    _animationId: null,
    _spawnTimer: null,
    _gameActive: false,
    _highScore: 0,
    _lastTimestamp: 0,
    _usedIndices: [],
    _scoreEl: null,
    _livesEl: null,
    _comboEl: null,
    _definitionEl: null,
    _gameArea: null,

    render(container, config) {
        this._container = container;
        this._config = config;

        var saved = ProgressManager.getActivityProgress(config.unit.id, 'term-catcher');
        this._highScore = saved && saved.highScore ? saved.highScore : 0;

        container.textContent = '';

        var wrapper = document.createElement('div');
        wrapper.className = 'catcher-container';

        // Header bar
        var header = document.createElement('div');
        header.className = 'catcher-header';

        var scoreEl = document.createElement('span');
        scoreEl.className = 'catcher-score-display';
        scoreEl.textContent = 'Score: 0';
        this._scoreEl = scoreEl;

        var comboEl = document.createElement('span');
        comboEl.className = 'catcher-combo';
        comboEl.textContent = '';
        this._comboEl = comboEl;

        var livesEl = document.createElement('span');
        livesEl.className = 'catcher-lives';
        livesEl.textContent = '\u2764\uFE0F\u2764\uFE0F\u2764\uFE0F';
        this._livesEl = livesEl;

        header.appendChild(scoreEl);
        header.appendChild(comboEl);
        header.appendChild(livesEl);
        wrapper.appendChild(header);

        // Definition bar
        var defBar = document.createElement('div');
        defBar.className = 'catcher-definition';
        defBar.textContent = 'Click Start to begin!';
        this._definitionEl = defBar;
        wrapper.appendChild(defBar);

        // Game area
        var gameArea = document.createElement('div');
        gameArea.className = 'catcher-game-area';
        this._gameArea = gameArea;

        // Start screen
        var startScreen = document.createElement('div');
        startScreen.className = 'catcher-start-screen';

        var title = document.createElement('h2');
        title.textContent = 'Term Catcher';
        title.style.color = 'var(--primary)';
        title.style.marginBottom = '10px';
        startScreen.appendChild(title);

        var desc = document.createElement('p');
        desc.textContent = 'Catch the falling term that matches the definition!';
        desc.style.color = '#666';
        desc.style.marginBottom = '20px';
        startScreen.appendChild(desc);

        if (this._highScore > 0) {
            var highEl = document.createElement('p');
            highEl.textContent = 'High Score: ' + this._highScore;
            highEl.style.fontWeight = '600';
            highEl.style.color = 'var(--accent)';
            highEl.style.marginBottom = '15px';
            startScreen.appendChild(highEl);
        }

        var startBtn = document.createElement('button');
        startBtn.className = 'nav-button catcher-start-btn';
        startBtn.textContent = 'Start Game';
        startBtn.addEventListener('click', () => this._startGame());
        startScreen.appendChild(startBtn);

        gameArea.appendChild(startScreen);
        wrapper.appendChild(gameArea);

        container.appendChild(wrapper);
    },

    _startGame() {
        this._score = 0;
        this._lives = 3;
        this._combo = 0;
        this._speed = 1;
        this._correctCount = 0;
        this._fallingTerms = [];
        this._usedIndices = [];
        this._gameActive = true;
        this._lastTimestamp = 0;

        // Clear game area
        this._gameArea.textContent = '';

        this._updateDisplay();
        this._newQuestion();
        this._scheduleSpawn();

        this._animationId = requestAnimationFrame((ts) => this._gameLoop(ts));
    },

    _gameLoop(timestamp) {
        if (!this._gameActive) return;

        if (this._lastTimestamp === 0) {
            this._lastTimestamp = timestamp;
        }

        var delta = (timestamp - this._lastTimestamp) / 1000;
        this._lastTimestamp = timestamp;

        // Cap delta to prevent huge jumps (e.g. tab switch)
        if (delta > 0.1) delta = 0.1;

        var areaHeight = this._gameArea.clientHeight;
        var toRemove = [];

        for (var i = 0; i < this._fallingTerms.length; i++) {
            var ft = this._fallingTerms[i];
            ft.y += ft.fallSpeed * this._speed * delta;
            ft.el.style.top = ft.y + 'px';

            if (ft.y > areaHeight) {
                // Term reached the bottom
                if (ft.term === this._currentAnswer) {
                    // Correct answer fell off - lose a life
                    this._lives--;
                    this._combo = 0;
                    this._updateDisplay();
                    if (this._lives <= 0) {
                        this._endGame();
                        return;
                    }
                    // Clear all terms and spawn new question
                    this._clearAllTerms();
                    this._newQuestion();
                    this._scheduleSpawn();
                    this._animationId = requestAnimationFrame((ts) => this._gameLoop(ts));
                    return;
                }
                toRemove.push(i);
            }
        }

        // Remove terms that fell off (non-correct)
        for (var j = toRemove.length - 1; j >= 0; j--) {
            this._removeFallingTerm(toRemove[j]);
        }

        this._animationId = requestAnimationFrame((ts) => this._gameLoop(ts));
    },

    _scheduleSpawn() {
        if (this._spawnTimer) {
            clearTimeout(this._spawnTimer);
        }

        var doSpawn = () => {
            if (!this._gameActive) return;
            this._spawnTerms();
            var delay = 2000 + Math.random() * 1000;
            this._spawnTimer = setTimeout(doSpawn, delay);
        };

        // Initial spawn immediately
        this._spawnTerms();
        var delay = 2000 + Math.random() * 1000;
        this._spawnTimer = setTimeout(doSpawn, delay);
    },

    _spawnTerms() {
        if (!this._gameActive || !this._currentAnswer) return;

        var vocab = this._config.vocabulary;
        if (!vocab || vocab.length === 0) return;

        // Determine how many terms to spawn (3-4 total on screen at a time)
        var currentCount = this._fallingTerms.length;
        var targetCount = 3 + (Math.random() > 0.5 ? 1 : 0);
        var toSpawn = targetCount - currentCount;
        if (toSpawn <= 0) return;

        // Check if correct answer is already falling
        var hasCorrect = false;
        for (var i = 0; i < this._fallingTerms.length; i++) {
            if (this._fallingTerms[i].term === this._currentAnswer) {
                hasCorrect = true;
                break;
            }
        }

        // Collect terms to spawn
        var termsToSpawn = [];

        if (!hasCorrect) {
            termsToSpawn.push(this._currentAnswer);
            toSpawn--;
        }

        // Add distractors
        var distractors = [];
        for (var d = 0; d < vocab.length; d++) {
            var term = vocab[d].term;
            if (term !== this._currentAnswer) {
                // Check it's not already falling
                var alreadyFalling = false;
                for (var f = 0; f < this._fallingTerms.length; f++) {
                    if (this._fallingTerms[f].term === term) {
                        alreadyFalling = true;
                        break;
                    }
                }
                if (!alreadyFalling && termsToSpawn.indexOf(term) === -1) {
                    distractors.push(term);
                }
            }
        }

        // Shuffle distractors
        for (var s = distractors.length - 1; s > 0; s--) {
            var ri = Math.floor(Math.random() * (s + 1));
            var tmp = distractors[s];
            distractors[s] = distractors[ri];
            distractors[ri] = tmp;
        }

        for (var k = 0; k < toSpawn && k < distractors.length; k++) {
            termsToSpawn.push(distractors[k]);
        }

        // Shuffle the spawn order
        for (var sh = termsToSpawn.length - 1; sh > 0; sh--) {
            var rj = Math.floor(Math.random() * (sh + 1));
            var t = termsToSpawn[sh];
            termsToSpawn[sh] = termsToSpawn[rj];
            termsToSpawn[rj] = t;
        }

        // Calculate X positions with spacing
        var areaWidth = this._gameArea.clientWidth;
        var bubbleWidth = 150;
        var spacing = Math.max(20, (areaWidth - bubbleWidth * termsToSpawn.length) / (termsToSpawn.length + 1));

        for (var p = 0; p < termsToSpawn.length; p++) {
            var termText = termsToSpawn[p];
            var el = document.createElement('div');
            el.className = 'falling-term';
            el.textContent = termText;

            // Calculate X with some randomness but ensure within bounds
            var baseX = spacing + p * (bubbleWidth + spacing);
            var x = Math.max(5, Math.min(areaWidth - bubbleWidth, baseX + (Math.random() - 0.5) * 30));
            var y = -(30 + Math.random() * 60);

            el.style.left = x + 'px';
            el.style.top = y + 'px';

            var fallSpeed = 50 + Math.random() * 30;

            var ftObj = {
                term: termText,
                el: el,
                x: x,
                y: y,
                fallSpeed: fallSpeed
            };

            el.addEventListener('click', ((term, element, obj) => {
                return () => this._clickTerm(term, element, obj);
            })(termText, el, ftObj));

            this._gameArea.appendChild(el);
            this._fallingTerms.push(ftObj);
        }
    },

    _newQuestion() {
        var vocab = this._config.vocabulary;
        if (!vocab || vocab.length === 0) return;

        // Pick a random term we haven't used recently
        var available = [];
        for (var i = 0; i < vocab.length; i++) {
            if (this._usedIndices.indexOf(i) === -1) {
                available.push(i);
            }
        }

        // Reset if we've used all
        if (available.length === 0) {
            this._usedIndices = [];
            for (var j = 0; j < vocab.length; j++) {
                available.push(j);
            }
        }

        var idx = available[Math.floor(Math.random() * available.length)];
        this._usedIndices.push(idx);

        // Keep used list from growing too large
        if (this._usedIndices.length > Math.floor(vocab.length * 0.7)) {
            this._usedIndices = this._usedIndices.slice(-Math.floor(vocab.length * 0.3));
        }

        this._currentDefinition = vocab[idx].definition;
        this._currentAnswer = vocab[idx].term;

        if (this._definitionEl) {
            this._definitionEl.textContent = this._currentDefinition;
        }
    },

    _clickTerm(term, el, ftObj) {
        if (!this._gameActive) return;

        if (term === this._currentAnswer) {
            // Correct!
            el.classList.add('flash-green');
            this._combo++;
            this._correctCount++;
            var multiplier = this._getMultiplier();
            this._score += multiplier;

            // Speed increase every 5 correct
            if (this._correctCount % 5 === 0) {
                this._speed += 0.15;
            }

            this._updateDisplay();

            // Clear all terms after brief flash
            setTimeout(() => {
                this._clearAllTerms();
                this._newQuestion();
                this._scheduleSpawn();
            }, 300);
        } else {
            // Wrong!
            el.classList.add('flash-red');
            this._combo = 0;
            this._lives--;
            this._updateDisplay();

            setTimeout(() => {
                if (el.parentNode) {
                    el.classList.remove('flash-red');
                }
            }, 400);

            if (this._lives <= 0) {
                setTimeout(() => this._endGame(), 300);
            }
        }
    },

    _removeFallingTerm(index) {
        var ft = this._fallingTerms[index];
        if (ft && ft.el && ft.el.parentNode) {
            ft.el.parentNode.removeChild(ft.el);
        }
        this._fallingTerms.splice(index, 1);
    },

    _clearAllTerms() {
        for (var i = 0; i < this._fallingTerms.length; i++) {
            var ft = this._fallingTerms[i];
            if (ft.el && ft.el.parentNode) {
                ft.el.parentNode.removeChild(ft.el);
            }
        }
        this._fallingTerms = [];

        if (this._spawnTimer) {
            clearTimeout(this._spawnTimer);
            this._spawnTimer = null;
        }
    },

    _updateDisplay() {
        if (this._scoreEl) {
            this._scoreEl.textContent = 'Score: ' + this._score;
        }

        if (this._livesEl) {
            var hearts = '';
            for (var i = 0; i < this._lives; i++) {
                hearts += '\u2764\uFE0F';
            }
            for (var j = this._lives; j < 3; j++) {
                hearts += '\uD83E\uDD0D';
            }
            this._livesEl.textContent = hearts;
        }

        if (this._comboEl) {
            var mult = this._getMultiplier();
            if (this._combo >= 3) {
                this._comboEl.textContent = 'Combo: ' + this._combo + ' (x' + mult + ')';
            } else if (this._combo > 0) {
                this._comboEl.textContent = 'Combo: ' + this._combo;
            } else {
                this._comboEl.textContent = '';
            }
        }
    },

    _getMultiplier() {
        if (this._combo >= 8) return 4;
        if (this._combo >= 5) return 3;
        if (this._combo >= 3) return 2;
        return 1;
    },

    _endGame() {
        this._gameActive = false;
        this._stopGame();

        // Update high score
        var isNewHigh = false;
        if (this._score > this._highScore) {
            this._highScore = this._score;
            isNewHigh = true;
            this._saveProgress();
        }

        // Show game over screen
        var overlay = document.createElement('div');
        overlay.className = 'catcher-game-over';

        var heading = document.createElement('h2');
        heading.textContent = 'Game Over';
        heading.style.color = 'var(--primary)';
        heading.style.marginBottom = '10px';
        overlay.appendChild(heading);

        var finalScore = document.createElement('div');
        finalScore.className = 'catcher-final-score';
        finalScore.textContent = this._score;
        overlay.appendChild(finalScore);

        var label = document.createElement('p');
        label.textContent = 'Points';
        label.style.color = '#666';
        label.style.marginBottom = '15px';
        overlay.appendChild(label);

        if (isNewHigh) {
            var newHighEl = document.createElement('p');
            newHighEl.textContent = 'New High Score!';
            newHighEl.style.color = 'var(--accent)';
            newHighEl.style.fontWeight = 'bold';
            newHighEl.style.fontSize = '1.2em';
            newHighEl.style.marginBottom = '10px';
            overlay.appendChild(newHighEl);
        } else {
            var highEl = document.createElement('p');
            highEl.textContent = 'High Score: ' + this._highScore;
            highEl.style.color = '#666';
            highEl.style.marginBottom = '10px';
            overlay.appendChild(highEl);
        }

        var statsEl = document.createElement('p');
        statsEl.textContent = 'Correct answers: ' + this._correctCount;
        statsEl.style.color = '#666';
        statsEl.style.marginBottom = '20px';
        overlay.appendChild(statsEl);

        var playAgain = document.createElement('button');
        playAgain.className = 'nav-button catcher-start-btn';
        playAgain.textContent = 'Play Again';
        playAgain.addEventListener('click', () => this._startGame());
        overlay.appendChild(playAgain);

        this._gameArea.appendChild(overlay);
    },

    _stopGame() {
        this._gameActive = false;

        if (this._animationId) {
            cancelAnimationFrame(this._animationId);
            this._animationId = null;
        }

        if (this._spawnTimer) {
            clearTimeout(this._spawnTimer);
            this._spawnTimer = null;
        }
    },

    _saveProgress() {
        ProgressManager.saveActivityProgress(StudyEngine.config.unit.id, 'term-catcher', {
            highScore: this._highScore
        });
    },

    activate() {},

    deactivate() {
        this._stopGame();
    },

    getProgress() {
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'term-catcher');
    },

    loadProgress(data) {
        if (data) {
            this._highScore = data.highScore || 0;
        }
    }
});
