StudyEngine.registerActivity({
    id: 'hangman',
    name: 'Hangman',
    icon: 'fas fa-user',
    description: 'Guess the term letter by letter before the hangman is complete',
    category: 'games',
    requires: ['vocabulary'],
    _targetWord: '',
    _currentDefinition: '',
    _guessedLetters: [],
    _wrongCount: 0,
    _wins: 0,
    _losses: 0,
    _gameOver: false,
    _keyHandler: null,
    _container: null,
    _config: null,

    render(container, config) {
        this._container = container;
        this._config = config;

        const saved = ProgressManager.getActivityProgress(config.unit.id, 'hangman');
        if (saved) {
            this._wins = saved.wins || 0;
            this._losses = saved.losses || 0;
        }

        // Main wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'hangman-container';
        wrapper.id = 'hangman-wrapper';

        // Stats
        const stats = document.createElement('div');
        stats.className = 'hangman-stats';

        const winStat = document.createElement('div');
        winStat.className = 'hangman-stat';
        winStat.id = 'hangman-wins';
        winStat.textContent = 'Wins: ' + this._wins;
        stats.appendChild(winStat);

        const lossStat = document.createElement('div');
        lossStat.className = 'hangman-stat';
        lossStat.id = 'hangman-losses';
        lossStat.textContent = 'Losses: ' + this._losses;
        stats.appendChild(lossStat);

        wrapper.appendChild(stats);

        // Clue
        const clue = document.createElement('div');
        clue.className = 'hangman-clue';
        clue.id = 'hangman-clue';

        const clueLabel = document.createElement('strong');
        clueLabel.textContent = 'Clue: ';
        clue.appendChild(clueLabel);

        const clueText = document.createElement('span');
        clueText.id = 'hangman-clue-text';
        clue.appendChild(clueText);

        wrapper.appendChild(clue);

        // Hangman figure
        const figure = document.createElement('div');
        figure.className = 'hangman-figure';
        figure.id = 'hangman-figure';

        const partClasses = [
            'hangman-base',
            'hangman-pole',
            'hangman-top',
            'hangman-rope',
            'hangman-head',
            'hangman-body-part',
            'hangman-left-arm',
            'hangman-right-arm',
            'hangman-left-leg',
            'hangman-right-leg'
        ];

        partClasses.forEach(function(cls) {
            const part = document.createElement('div');
            part.className = 'hangman-part ' + cls;
            figure.appendChild(part);
        });

        wrapper.appendChild(figure);

        // Word display
        const wordDisplay = document.createElement('div');
        wordDisplay.className = 'hangman-word';
        wordDisplay.id = 'hangman-word';
        wrapper.appendChild(wordDisplay);

        // Message area
        const message = document.createElement('div');
        message.id = 'hangman-message';
        message.style.fontSize = '1.2em';
        message.style.fontWeight = '600';
        message.style.marginBottom = '15px';
        message.style.minHeight = '1.5em';
        wrapper.appendChild(message);

        // Letter buttons
        const letters = document.createElement('div');
        letters.className = 'hangman-letters';
        letters.id = 'hangman-letters';

        for (var i = 65; i <= 90; i++) {
            var letter = String.fromCharCode(i);
            var btn = document.createElement('button');
            btn.className = 'hangman-letter-btn';
            btn.textContent = letter;
            btn.dataset.letter = letter;
            btn.addEventListener('click', this._onLetterClick.bind(this));
            letters.appendChild(btn);
        }

        wrapper.appendChild(letters);

        // New Word button
        const newWordBtn = document.createElement('button');
        newWordBtn.className = 'nav-button';
        newWordBtn.id = 'hangman-new-word';
        const icon = document.createElement('i');
        icon.className = 'fas fa-redo';
        newWordBtn.appendChild(icon);
        newWordBtn.appendChild(document.createTextNode(' New Word'));
        newWordBtn.addEventListener('click', this._newGame.bind(this));
        wrapper.appendChild(newWordBtn);

        // Tip
        const tip = document.createElement('p');
        tip.style.textAlign = 'center';
        tip.style.color = '#6b7280';
        tip.style.fontSize = '0.85rem';
        tip.style.marginTop = '12px';
        tip.textContent = 'Type A-Z on your keyboard or click the letters above';
        wrapper.appendChild(tip);

        container.appendChild(wrapper);

        this._newGame();
    },

    _onLetterClick(e) {
        var letter = e.currentTarget.dataset.letter;
        this._guessLetter(letter);
    },

    _newGame() {
        var vocab = this._config.vocabulary;
        var item = vocab[Math.floor(Math.random() * vocab.length)];
        this._targetWord = item.term.toUpperCase();
        this._currentDefinition = item.definition;
        this._guessedLetters = [];
        this._wrongCount = 0;
        this._gameOver = false;

        // Reset clue
        var clueText = document.getElementById('hangman-clue-text');
        if (clueText) clueText.textContent = this._currentDefinition;

        // Reset figure parts
        var figure = document.getElementById('hangman-figure');
        if (figure) {
            var parts = figure.querySelectorAll('.hangman-part');
            for (var i = 0; i < parts.length; i++) {
                parts[i].classList.remove('visible');
            }
        }

        // Reset letter buttons
        var buttons = document.querySelectorAll('.hangman-letter-btn');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].disabled = false;
            buttons[i].classList.remove('correct-letter', 'wrong-letter');
        }

        // Clear message
        var message = document.getElementById('hangman-message');
        if (message) {
            message.textContent = '';
            message.style.color = '';
        }

        this._updateDisplay();
    },

    _guessLetter(letter) {
        if (this._gameOver) return;
        if (this._guessedLetters.includes(letter)) return;

        this._guessedLetters.push(letter);

        var btn = document.querySelector('.hangman-letter-btn[data-letter="' + letter + '"]');

        if (this._targetWord.includes(letter)) {
            if (btn) btn.classList.add('correct-letter');
        } else {
            if (btn) btn.classList.add('wrong-letter');
            this._showPart(this._wrongCount);
            this._wrongCount++;
        }

        if (btn) btn.disabled = true;

        this._updateDisplay();
        this._checkWin();
    },

    _updateDisplay() {
        var wordEl = document.getElementById('hangman-word');
        if (!wordEl) return;

        // Clear previous content
        while (wordEl.firstChild) {
            wordEl.removeChild(wordEl.firstChild);
        }

        for (var i = 0; i < this._targetWord.length; i++) {
            var ch = this._targetWord[i];
            if (ch === ' ') {
                wordEl.appendChild(document.createTextNode('  '));
            } else if (this._guessedLetters.includes(ch)) {
                wordEl.appendChild(document.createTextNode(ch));
            } else {
                wordEl.appendChild(document.createTextNode('_'));
            }
        }
    },

    _showPart(index) {
        var figure = document.getElementById('hangman-figure');
        if (!figure) return;
        var parts = figure.querySelectorAll('.hangman-part');
        if (index < parts.length) {
            parts[index].classList.add('visible');
        }
    },

    _checkWin() {
        // Check if all letters are guessed
        var won = true;
        for (var i = 0; i < this._targetWord.length; i++) {
            var ch = this._targetWord[i];
            if (ch !== ' ' && !this._guessedLetters.includes(ch)) {
                won = false;
                break;
            }
        }

        if (won) {
            this._endGame(true);
        } else if (this._wrongCount >= 8) {
            this._endGame(false);
        }
    },

    _endGame(won) {
        this._gameOver = true;

        // Disable all remaining buttons
        var buttons = document.querySelectorAll('.hangman-letter-btn');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].disabled = true;
        }

        var message = document.getElementById('hangman-message');
        if (won) {
            this._wins++;
            if (message) {
                message.textContent = 'You got it!';
                message.style.color = '#22c55e';
            }
        } else {
            this._losses++;
            if (message) {
                message.style.color = '#ef4444';
                // Reveal the word on loss
                while (message.firstChild) {
                    message.removeChild(message.firstChild);
                }
                var lossText = document.createTextNode('The word was: ');
                message.appendChild(lossText);
                var wordSpan = document.createElement('span');
                wordSpan.style.textDecoration = 'underline';
                wordSpan.textContent = this._targetWord;
                message.appendChild(wordSpan);
            }

            // Reveal full word in display
            this._guessedLetters = this._targetWord.split('');
            this._updateDisplay();
        }

        // Update stats display
        var winsEl = document.getElementById('hangman-wins');
        if (winsEl) winsEl.textContent = 'Wins: ' + this._wins;
        var lossesEl = document.getElementById('hangman-losses');
        if (lossesEl) lossesEl.textContent = 'Losses: ' + this._losses;

        // Save progress
        this._saveProgress();

        if (typeof AchievementManager !== 'undefined') {
            AchievementManager.checkAndAward({ activity: 'hangman', event: won ? 'win' : 'complete' });
        }
    },

    _saveProgress() {
        ProgressManager.saveActivityProgress(StudyEngine.config.unit.id, 'hangman', {
            wins: this._wins,
            losses: this._losses
        });
    },

    activate() {
        this._keyHandler = function(e) {
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
            var key = e.key.toUpperCase();
            if (key.length === 1 && key >= 'A' && key <= 'Z') {
                e.preventDefault();
                this._guessLetter(key);
            }
        }.bind(this);
        document.addEventListener('keydown', this._keyHandler);
    },

    deactivate() {
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
    },

    getProgress() {
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'hangman');
    },

    loadProgress(data) {
        if (data) {
            this._wins = data.wins || 0;
            this._losses = data.losses || 0;
        }
    }
});
