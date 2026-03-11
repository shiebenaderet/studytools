StudyEngine.registerActivity({
    id: 'quiz-race',
    name: '1v1 Quiz Race',
    icon: 'fas fa-users',
    description: 'Challenge a friend! Race to answer questions on the same screen.',
    category: 'games',
    requires: ['practiceQuestions'],

    _container: null,
    _config: null,
    _questions: [],
    _currentQ: 0,
    _scores: [0, 0],
    _answered: false,
    _timer: null,
    _timeLeft: 5,
    _totalQuestions: 10,
    _gameActive: false,

    // Player 1: keys 1-4, Player 2: keys 7-0 (on number row)
    _p1Keys: ['1', '2', '3', '4'],
    _p2Keys: ['7', '8', '9', '0'],
    _keyHandler: null,

    render(container, config) {
        this._container = container;
        this._config = config;
        this._showStartScreen();
    },

    _showStartScreen() {
        var wrapper = this._container;
        wrapper.textContent = '';

        var card = document.createElement('div');
        card.style.cssText = 'max-width:700px;margin:0 auto;text-align:center;';

        var title = document.createElement('h2');
        title.style.cssText = 'color:var(--primary);margin-bottom:12px;font-size:1.8em;';
        var icon = document.createElement('i');
        icon.className = 'fas fa-users';
        title.appendChild(icon);
        title.appendChild(document.createTextNode(' 1v1 Quiz Race'));
        card.appendChild(title);

        var desc = document.createElement('p');
        desc.style.cssText = 'color:var(--text-secondary);margin-bottom:24px;line-height:1.6;';
        desc.textContent = 'Two players, one screen! Race to pick the correct answer first. Each correct answer scores a point. Wrong answers lose a point.';
        card.appendChild(desc);

        // Controls explanation
        var controls = document.createElement('div');
        controls.style.cssText = 'display:flex;gap:20px;justify-content:center;margin-bottom:24px;flex-wrap:wrap;';

        var p1Card = this._createPlayerCard('Player 1', 'var(--primary)', ['1', '2', '3', '4'], 'Left side');
        controls.appendChild(p1Card);

        var vsEl = document.createElement('div');
        vsEl.style.cssText = 'display:flex;align-items:center;font-size:1.5em;font-weight:800;color:var(--text-muted);';
        vsEl.textContent = 'VS';
        controls.appendChild(vsEl);

        var p2Card = this._createPlayerCard('Player 2', 'var(--accent)', ['7', '8', '9', '0'], 'Right side');
        controls.appendChild(p2Card);

        card.appendChild(controls);

        var startBtn = document.createElement('button');
        startBtn.style.cssText = 'padding:14px 40px;border:none;border-radius:10px;background:var(--primary);color:white;font-size:1.2em;font-weight:700;cursor:pointer;font-family:var(--font-body);transition:transform 0.2s;';
        startBtn.textContent = 'Start Race!';
        startBtn.addEventListener('mouseenter', function() { startBtn.style.transform = 'scale(1.05)'; });
        startBtn.addEventListener('mouseleave', function() { startBtn.style.transform = 'scale(1)'; });
        var self = this;
        startBtn.addEventListener('click', function() { self._startGame(); });
        card.appendChild(startBtn);

        wrapper.appendChild(card);
    },

    _createPlayerCard(name, color, keys, side) {
        var card = document.createElement('div');
        card.style.cssText = 'background:var(--bg-elevated);border:2px solid var(--border-card);border-radius:12px;padding:16px 20px;min-width:180px;';

        var nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-weight:700;font-size:1.1em;color:' + color + ';margin-bottom:8px;';
        nameEl.textContent = name;
        card.appendChild(nameEl);

        var keysRow = document.createElement('div');
        keysRow.style.cssText = 'display:flex;gap:6px;justify-content:center;';
        keys.forEach(function(key) {
            var kbd = document.createElement('kbd');
            kbd.style.cssText = 'display:inline-block;padding:6px 12px;background:var(--bg-surface);border:1px solid var(--border-card);border-radius:6px;font-weight:700;font-size:1em;color:var(--text-primary);font-family:var(--font-mono);';
            kbd.textContent = key;
            keysRow.appendChild(kbd);
        });
        card.appendChild(keysRow);

        var sideLabel = document.createElement('div');
        sideLabel.style.cssText = 'font-size:0.75em;color:var(--text-muted);margin-top:6px;';
        sideLabel.textContent = side;
        card.appendChild(sideLabel);

        return card;
    },

    _startGame() {
        // Shuffle and pick questions
        var allQ = this._config.practiceQuestions.slice();
        for (var i = allQ.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = allQ[i]; allQ[i] = allQ[j]; allQ[j] = tmp;
        }
        this._questions = allQ.slice(0, this._totalQuestions);
        this._currentQ = 0;
        this._scores = [0, 0];
        this._gameActive = true;

        this._renderGameUI();
        this._showQuestion();
        this._bindKeys();
    },

    _renderGameUI() {
        this._container.textContent = '';

        var wrapper = document.createElement('div');
        wrapper.id = 'qr-wrapper';
        wrapper.style.cssText = 'max-width:800px;margin:0 auto;';

        // Scoreboard
        var scoreboard = document.createElement('div');
        scoreboard.id = 'qr-scoreboard';
        scoreboard.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:12px 16px;background:var(--bg-elevated);border-radius:var(--radius-md);border:1px solid var(--border-card);';

        var p1Score = document.createElement('div');
        p1Score.id = 'qr-p1-score';
        p1Score.style.cssText = 'font-size:1.4em;font-weight:800;color:var(--primary);';
        p1Score.textContent = 'P1: 0';
        scoreboard.appendChild(p1Score);

        var qCounter = document.createElement('div');
        qCounter.id = 'qr-counter';
        qCounter.style.cssText = 'font-size:0.9em;color:var(--text-muted);font-weight:600;';
        qCounter.textContent = '1/' + this._questions.length;
        scoreboard.appendChild(qCounter);

        var p2Score = document.createElement('div');
        p2Score.id = 'qr-p2-score';
        p2Score.style.cssText = 'font-size:1.4em;font-weight:800;color:var(--accent);';
        p2Score.textContent = 'P2: 0';
        scoreboard.appendChild(p2Score);

        wrapper.appendChild(scoreboard);

        // Question area
        var questionArea = document.createElement('div');
        questionArea.id = 'qr-question-area';
        wrapper.appendChild(questionArea);

        // Timer bar
        var timerWrap = document.createElement('div');
        timerWrap.id = 'qr-timer-wrap';
        timerWrap.style.cssText = 'height:6px;background:var(--bg-surface);border-radius:3px;margin-top:12px;overflow:hidden;';
        var timerFill = document.createElement('div');
        timerFill.id = 'qr-timer-fill';
        timerFill.style.cssText = 'height:100%;background:var(--primary);border-radius:3px;width:100%;transition:width 1s linear;';
        timerWrap.appendChild(timerFill);
        wrapper.appendChild(timerWrap);

        // Feedback area
        var feedback = document.createElement('div');
        feedback.id = 'qr-feedback';
        feedback.style.cssText = 'text-align:center;padding:12px;min-height:40px;font-weight:600;font-size:1.1em;';
        wrapper.appendChild(feedback);

        this._container.appendChild(wrapper);
    },

    _showQuestion() {
        if (this._currentQ >= this._questions.length) {
            this._endGame();
            return;
        }

        this._answered = false;
        var q = this._questions[this._currentQ];

        var area = document.getElementById('qr-question-area');
        area.textContent = '';

        // Question text
        var qText = document.createElement('div');
        qText.style.cssText = 'font-size:1.2em;font-weight:600;color:var(--text-primary);text-align:center;margin-bottom:20px;padding:16px;background:var(--bg-elevated);border-radius:var(--radius-md);border:1px solid var(--border-card);';
        qText.textContent = q.question;
        area.appendChild(qText);

        // Shuffle options
        var options = q.options.slice();
        var correctAnswer = q.options[q.correct];
        // Fisher-Yates shuffle
        for (var i = options.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = options[i]; options[i] = options[j]; options[j] = tmp;
        }
        this._shuffledOptions = options;
        this._correctIndex = options.indexOf(correctAnswer);

        // Options grid: 2x2
        var grid = document.createElement('div');
        grid.id = 'qr-options';
        grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;';

        var self = this;
        options.forEach(function(opt, i) {
            var optEl = document.createElement('div');
            optEl.className = 'qr-option';
            optEl.dataset.index = String(i);
            optEl.style.cssText = 'padding:14px;background:var(--bg-surface);border:2px solid var(--border-card);border-radius:10px;text-align:center;font-weight:500;color:var(--text-primary);font-size:0.95em;line-height:1.4;position:relative;transition:all 0.2s;';

            // Key hints for both players
            var p1Key = document.createElement('span');
            p1Key.style.cssText = 'position:absolute;top:6px;left:8px;font-size:0.65em;padding:2px 5px;background:var(--primary);color:white;border-radius:4px;font-weight:700;opacity:0.7;';
            p1Key.textContent = self._p1Keys[i] || '';
            optEl.appendChild(p1Key);

            var p2Key = document.createElement('span');
            p2Key.style.cssText = 'position:absolute;top:6px;right:8px;font-size:0.65em;padding:2px 5px;background:var(--accent);color:white;border-radius:4px;font-weight:700;opacity:0.7;';
            p2Key.textContent = self._p2Keys[i] || '';
            optEl.appendChild(p2Key);

            optEl.appendChild(document.createTextNode(opt));
            grid.appendChild(optEl);
        });

        area.appendChild(grid);

        // Update counter
        var counter = document.getElementById('qr-counter');
        if (counter) counter.textContent = (this._currentQ + 1) + '/' + this._questions.length;

        // Clear feedback
        var feedback = document.getElementById('qr-feedback');
        if (feedback) feedback.textContent = '';

        // Start countdown timer
        this._timeLeft = 6;
        this._startTimer();
    },

    _startTimer() {
        var self = this;
        var fill = document.getElementById('qr-timer-fill');
        if (fill) fill.style.width = '100%';

        clearInterval(this._timer);
        this._timer = setInterval(function() {
            self._timeLeft--;
            if (fill) fill.style.width = Math.max(0, (self._timeLeft / 6) * 100) + '%';
            if (self._timeLeft <= 0) {
                clearInterval(self._timer);
                if (!self._answered) {
                    self._handleTimeout();
                }
            }
        }, 1000);
    },

    _handleTimeout() {
        this._answered = true;
        this._showCorrectAnswer(-1, -1);
        var feedback = document.getElementById('qr-feedback');
        if (feedback) {
            feedback.style.color = 'var(--text-muted)';
            feedback.textContent = 'Time\u2019s up! No one scored.';
        }
        var self = this;
        setTimeout(function() { self._nextQuestion(); }, 1500);
    },

    _bindKeys() {
        var self = this;
        this._keyHandler = function(e) {
            if (!self._gameActive || self._answered) return;

            var p1Index = self._p1Keys.indexOf(e.key);
            var p2Index = self._p2Keys.indexOf(e.key);

            if (p1Index >= 0 && p1Index < self._shuffledOptions.length) {
                self._handleAnswer(0, p1Index);
            } else if (p2Index >= 0 && p2Index < self._shuffledOptions.length) {
                self._handleAnswer(1, p2Index);
            }
        };
        document.addEventListener('keydown', this._keyHandler);
    },

    _handleAnswer(player, chosenIndex) {
        if (this._answered) return;
        this._answered = true;
        clearInterval(this._timer);

        var correct = chosenIndex === this._correctIndex;
        var playerName = player === 0 ? 'Player 1' : 'Player 2';
        var feedback = document.getElementById('qr-feedback');

        if (correct) {
            this._scores[player]++;
            if (feedback) {
                feedback.style.color = 'var(--success)';
                feedback.textContent = playerName + ' scores! \uD83C\uDF89';
            }
        } else {
            var q = this._questions[this._currentQ];
            if (q && q.topic && typeof NudgeManager !== 'undefined' && this._config) {
                var vocab = this._config.vocabulary || [];
                var missed = [];
                for (var j = 0; j < vocab.length; j++) {
                    if (vocab[j].category === q.topic) {
                        missed.push(vocab[j].term);
                    }
                }
                NudgeManager.trackMissedTerms(this._config.unit.id, this._config, missed);
            }
            this._scores[player] = Math.max(0, this._scores[player] - 1);
            if (feedback) {
                feedback.style.color = 'var(--danger)';
                feedback.textContent = playerName + ' got it wrong! -1 point';
            }
        }

        this._showCorrectAnswer(player, chosenIndex);
        this._updateScores();

        var self = this;
        setTimeout(function() { self._nextQuestion(); }, 1500);
    },

    _showCorrectAnswer(player, chosenIndex) {
        var options = document.querySelectorAll('.qr-option');
        var self = this;
        options.forEach(function(opt) {
            var idx = parseInt(opt.dataset.index, 10);
            if (idx === self._correctIndex) {
                opt.style.background = 'rgba(34,197,94,0.2)';
                opt.style.borderColor = 'var(--success)';
            } else if (idx === chosenIndex) {
                opt.style.background = 'rgba(239,68,68,0.2)';
                opt.style.borderColor = 'var(--danger)';
            }
            opt.style.pointerEvents = 'none';
        });
    },

    _updateScores() {
        var p1 = document.getElementById('qr-p1-score');
        var p2 = document.getElementById('qr-p2-score');
        if (p1) p1.textContent = 'P1: ' + this._scores[0];
        if (p2) p2.textContent = 'P2: ' + this._scores[1];
    },

    _nextQuestion() {
        this._currentQ++;
        this._showQuestion();
    },

    _endGame() {
        this._gameActive = false;
        clearInterval(this._timer);
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }

        var wrapper = document.getElementById('qr-wrapper');
        if (!wrapper) wrapper = this._container;
        wrapper.textContent = '';

        var result = document.createElement('div');
        result.style.cssText = 'text-align:center;padding:30px;';

        var winner;
        if (this._scores[0] > this._scores[1]) winner = 'Player 1 Wins!';
        else if (this._scores[1] > this._scores[0]) winner = 'Player 2 Wins!';
        else winner = 'It\u2019s a Tie!';

        var winnerEl = document.createElement('h2');
        winnerEl.style.cssText = 'font-size:2em;margin-bottom:16px;';
        if (this._scores[0] > this._scores[1]) winnerEl.style.color = 'var(--primary)';
        else if (this._scores[1] > this._scores[0]) winnerEl.style.color = 'var(--accent)';
        else winnerEl.style.color = 'var(--text-primary)';
        winnerEl.textContent = winner;
        result.appendChild(winnerEl);

        // Score display
        var scoreDisplay = document.createElement('div');
        scoreDisplay.style.cssText = 'display:flex;justify-content:center;gap:40px;margin-bottom:24px;';

        var p1Box = document.createElement('div');
        p1Box.style.cssText = 'text-align:center;';
        var p1Label = document.createElement('div');
        p1Label.style.cssText = 'font-weight:600;color:var(--primary);margin-bottom:4px;';
        p1Label.textContent = 'Player 1';
        p1Box.appendChild(p1Label);
        var p1Score = document.createElement('div');
        p1Score.style.cssText = 'font-size:3em;font-weight:800;color:var(--primary);';
        p1Score.textContent = String(this._scores[0]);
        p1Box.appendChild(p1Score);
        scoreDisplay.appendChild(p1Box);

        var dash = document.createElement('div');
        dash.style.cssText = 'display:flex;align-items:center;font-size:2em;color:var(--text-muted);font-weight:300;';
        dash.textContent = '\u2014';
        scoreDisplay.appendChild(dash);

        var p2Box = document.createElement('div');
        p2Box.style.cssText = 'text-align:center;';
        var p2Label = document.createElement('div');
        p2Label.style.cssText = 'font-weight:600;color:var(--accent);margin-bottom:4px;';
        p2Label.textContent = 'Player 2';
        p2Box.appendChild(p2Label);
        var p2Score = document.createElement('div');
        p2Score.style.cssText = 'font-size:3em;font-weight:800;color:var(--accent);';
        p2Score.textContent = String(this._scores[1]);
        p2Box.appendChild(p2Score);
        scoreDisplay.appendChild(p2Box);

        result.appendChild(scoreDisplay);

        var playAgain = document.createElement('button');
        playAgain.style.cssText = 'padding:12px 30px;border:none;border-radius:10px;background:var(--primary);color:white;font-size:1.1em;font-weight:700;cursor:pointer;font-family:var(--font-body);margin-right:12px;';
        playAgain.textContent = 'Play Again';
        var self = this;
        playAgain.addEventListener('click', function() { self._startGame(); });
        result.appendChild(playAgain);

        wrapper.appendChild(result);
    },

    activate() {},

    deactivate() {
        this._gameActive = false;
        clearInterval(this._timer);
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
    },

    getProgress() {
        return {};
    },

    loadProgress() {}
});
