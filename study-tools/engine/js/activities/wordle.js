StudyEngine.registerActivity({
    id: 'wordle',
    name: 'Wordle',
    icon: 'fas fa-spell-check',
    description: 'Guess the vocabulary term in 6 tries',
    category: 'games',
    requires: ['vocabulary'],

    // Internal state
    _targetWord: '',
    _targetVocab: null,
    _guesses: [],
    _currentGuess: '',
    _maxGuesses: 6,
    _gameOver: false,
    _won: false,
    _keyboardState: {},
    _filteredVocab: [],
    _stats: { wins: 0, losses: 0, streak: 0 },
    _keyHandler: null,
    _container: null,

    render(container, config) {
        this._container = container;
        this._filteredVocab = config.vocabulary
            .filter(v => {
                const cleaned = v.term.replace(/[^a-zA-Z]/g, '');
                // Only single-word terms (no spaces) that are 4-12 letters
                return !/\s/.test(v.term.trim()) && cleaned.length >= 4 && cleaned.length <= 12;
            })
            .map(v => {
                const word = v.term.replace(/[^a-zA-Z]/g, '').toUpperCase();
                return { vocab: v, word: word };
            });

        // Load saved stats
        const saved = ProgressManager.getActivityProgress(config.unit.id, 'wordle');
        if (saved) {
            this._stats = { wins: saved.wins || 0, losses: saved.losses || 0, streak: saved.streak || 0 };
        }

        // Main wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'wordle-container';
        wrapper.id = 'wordle-wrapper';

        container.appendChild(wrapper);

        this._newGame();
    },

    _newGame() {
        // Reset state
        this._guesses = [];
        this._currentGuess = '';
        this._gameOver = false;
        this._won = false;
        this._keyboardState = {};

        // Pick random word
        if (this._filteredVocab.length === 0) return;
        const pick = this._filteredVocab[Math.floor(Math.random() * this._filteredVocab.length)];
        this._targetWord = pick.word;
        this._targetVocab = pick.vocab;

        this._renderUI();
    },

    _renderUI() {
        const wrapper = document.getElementById('wordle-wrapper');
        if (!wrapper) return;

        // Clear
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        // Clue box
        const clueBox = document.createElement('div');
        clueBox.className = 'wordle-clue';

        const clueLabel = document.createElement('div');
        clueLabel.className = 'wordle-clue-label';
        clueLabel.textContent = 'Definition Clue';
        clueBox.appendChild(clueLabel);

        const clueDef = document.createElement('div');
        clueDef.textContent = this._targetVocab.definition;
        clueBox.appendChild(clueDef);

        const lengthHint = document.createElement('div');
        lengthHint.style.marginTop = '10px';
        lengthHint.style.color = '#4b5563';
        lengthHint.style.fontSize = '0.9em';
        lengthHint.textContent = 'Word length: ' + this._targetWord.length + ' letters';
        clueBox.appendChild(lengthHint);

        wrapper.appendChild(clueBox);

        // Grid
        const grid = document.createElement('div');
        grid.className = 'wordle-grid';
        grid.id = 'wordle-grid';

        for (let r = 0; r < this._maxGuesses; r++) {
            const row = document.createElement('div');
            row.className = 'wordle-row';
            row.id = 'wordle-row-' + r;

            for (let c = 0; c < this._targetWord.length; c++) {
                const cell = document.createElement('div');
                cell.className = 'wordle-cell';
                cell.id = 'wordle-cell-' + r + '-' + c;
                row.appendChild(cell);
            }
            grid.appendChild(row);
        }
        wrapper.appendChild(grid);

        // Input area
        const inputArea = document.createElement('div');
        inputArea.className = 'wordle-input-area';
        inputArea.id = 'wordle-input-area';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'wordle-input';
        input.id = 'wordle-input';
        input.maxLength = this._targetWord.length;
        input.placeholder = this._targetWord.length + ' letters';
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocapitalize', 'characters');

        input.addEventListener('input', () => {
            input.value = input.value.toUpperCase().replace(/[^A-Z]/g, '');
            this._currentGuess = input.value;
            this._updateCurrentRow();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this._submitGuess();
            }
        });

        inputArea.appendChild(input);

        const submitBtn = document.createElement('button');
        submitBtn.className = 'nav-button';
        submitBtn.style.marginTop = '10px';
        submitBtn.textContent = 'Submit Guess';
        submitBtn.addEventListener('click', () => this._submitGuess());
        inputArea.appendChild(submitBtn);

        wrapper.appendChild(inputArea);

        // Message area
        const msgArea = document.createElement('div');
        msgArea.id = 'wordle-message';
        wrapper.appendChild(msgArea);

        // Keyboard
        const keyboard = document.createElement('div');
        keyboard.className = 'wordle-keyboard';
        keyboard.id = 'wordle-keyboard';

        const rows = [
            ['Q','W','E','R','T','Y','U','I','O','P'],
            ['A','S','D','F','G','H','J','K','L'],
            ['ENTER','Z','X','C','V','B','N','M','DEL']
        ];

        rows.forEach(keyRow => {
            const rowEl = document.createElement('div');
            rowEl.className = 'wordle-keyboard-row';

            keyRow.forEach(key => {
                const keyBtn = document.createElement('button');
                keyBtn.className = 'wordle-key';
                keyBtn.id = 'wordle-key-' + key;
                keyBtn.textContent = key;

                if (key === 'ENTER' || key === 'DEL') {
                    keyBtn.classList.add('wide');
                }

                keyBtn.addEventListener('click', () => {
                    if (this._gameOver) return;
                    const inputEl = document.getElementById('wordle-input');
                    if (!inputEl) return;

                    if (key === 'ENTER') {
                        this._submitGuess();
                    } else if (key === 'DEL') {
                        this._currentGuess = this._currentGuess.slice(0, -1);
                        inputEl.value = this._currentGuess;
                        this._updateCurrentRow();
                    } else if (this._currentGuess.length < this._targetWord.length) {
                        this._currentGuess += key;
                        inputEl.value = this._currentGuess;
                        this._updateCurrentRow();
                    }
                });

                rowEl.appendChild(keyBtn);
            });

            keyboard.appendChild(rowEl);
        });

        wrapper.appendChild(keyboard);

        // Stats display
        const statsBar = document.createElement('div');
        statsBar.style.marginTop = '15px';
        statsBar.style.color = '#4b5563';
        statsBar.style.fontSize = '0.85em';
        statsBar.id = 'wordle-stats';
        statsBar.textContent = 'Wins: ' + this._stats.wins + ' | Losses: ' + this._stats.losses + ' | Streak: ' + this._stats.streak;
        wrapper.appendChild(statsBar);

        // Re-render previous guesses
        for (let i = 0; i < this._guesses.length; i++) {
            const guess = this._guesses[i];
            const result = this._checkGuess(guess);
            for (let c = 0; c < guess.length; c++) {
                const cell = document.getElementById('wordle-cell-' + i + '-' + c);
                if (cell) {
                    cell.textContent = guess[c];
                    cell.classList.add(result[c]);
                }
            }
        }
        this._updateKeyboard();

        // Focus input
        setTimeout(() => {
            const inputEl = document.getElementById('wordle-input');
            if (inputEl) inputEl.focus();
        }, 100);
    },

    _updateCurrentRow() {
        const rowIdx = this._guesses.length;
        if (rowIdx >= this._maxGuesses) return;

        for (let c = 0; c < this._targetWord.length; c++) {
            const cell = document.getElementById('wordle-cell-' + rowIdx + '-' + c);
            if (!cell) continue;
            if (c < this._currentGuess.length) {
                cell.textContent = this._currentGuess[c];
                cell.classList.add('filled');
            } else {
                cell.textContent = '';
                cell.classList.remove('filled');
            }
        }
    },

    _submitGuess() {
        if (this._gameOver) return;
        if (this._currentGuess.length !== this._targetWord.length) return;

        const guess = this._currentGuess.toUpperCase();
        const rowIdx = this._guesses.length;
        const result = this._checkGuess(guess);

        // Fill row cells with result colors
        for (let c = 0; c < guess.length; c++) {
            const cell = document.getElementById('wordle-cell-' + rowIdx + '-' + c);
            if (cell) {
                cell.textContent = guess[c];
                cell.classList.remove('filled');
                cell.classList.add(result[c]);
            }
        }

        // Update keyboard state
        for (let c = 0; c < guess.length; c++) {
            const letter = guess[c];
            const current = this._keyboardState[letter];
            const newState = result[c];
            // Priority: correct > present > absent
            if (newState === 'correct') {
                this._keyboardState[letter] = 'correct';
            } else if (newState === 'present' && current !== 'correct') {
                this._keyboardState[letter] = 'present';
            } else if (!current) {
                this._keyboardState[letter] = 'absent';
            }
        }
        this._updateKeyboard();

        this._guesses.push(guess);
        this._currentGuess = '';

        const inputEl = document.getElementById('wordle-input');
        if (inputEl) {
            inputEl.value = '';
        }

        // Check win/lose
        if (guess === this._targetWord) {
            this._endGame(true);
        } else if (this._guesses.length >= this._maxGuesses) {
            this._endGame(false);
        }
    },

    _checkGuess(guess) {
        const target = this._targetWord;
        const result = new Array(guess.length).fill('absent');
        const targetCounts = {};

        // Count letters in target
        for (let i = 0; i < target.length; i++) {
            targetCounts[target[i]] = (targetCounts[target[i]] || 0) + 1;
        }

        // First pass: mark correct (green)
        for (let i = 0; i < guess.length; i++) {
            if (guess[i] === target[i]) {
                result[i] = 'correct';
                targetCounts[guess[i]]--;
            }
        }

        // Second pass: mark present (yellow)
        for (let i = 0; i < guess.length; i++) {
            if (result[i] === 'correct') continue;
            if (targetCounts[guess[i]] && targetCounts[guess[i]] > 0) {
                result[i] = 'present';
                targetCounts[guess[i]]--;
            }
        }

        return result;
    },

    _updateKeyboard() {
        const letters = 'QWERTYUIOPASDFGHJKLZXCVBNM'.split('');
        letters.forEach(letter => {
            const keyEl = document.getElementById('wordle-key-' + letter);
            if (!keyEl) return;
            keyEl.classList.remove('correct', 'present', 'absent');
            if (this._keyboardState[letter]) {
                keyEl.classList.add(this._keyboardState[letter]);
            }
        });
    },

    _endGame(won) {
        this._gameOver = true;
        this._won = won;

        if (won) {
            this._stats.wins++;
            this._stats.streak++;
        } else {
            this._stats.losses++;
            this._stats.streak = 0;
        }

        this._saveProgress();

        if (typeof AchievementManager !== 'undefined') {
            if (won) {
                AchievementManager.checkAndAward({ activity: 'wordle', event: 'win', totalWins: this._stats.wins });
            }
            AchievementManager.checkAndAward({ activity: 'wordle', event: won ? 'win' : 'complete' });
        }

        // Hide input area
        const inputArea = document.getElementById('wordle-input-area');
        if (inputArea) inputArea.style.display = 'none';

        // Show message
        const msgArea = document.getElementById('wordle-message');
        if (msgArea) {
            while (msgArea.firstChild) msgArea.removeChild(msgArea.firstChild);

            const msg = document.createElement('div');
            msg.className = 'wordle-message ' + (won ? 'win' : 'lose');

            if (won) {
                msg.textContent = 'Congratulations! You guessed it in ' + this._guesses.length + ' ' + (this._guesses.length === 1 ? 'try' : 'tries') + '!';
            } else {
                msg.textContent = 'The word was: ' + this._targetWord;
            }
            msgArea.appendChild(msg);

            const nextBtn = document.createElement('button');
            nextBtn.className = 'nav-button';
            nextBtn.style.marginTop = '15px';
            const nextIcon = document.createElement('i');
            nextIcon.className = 'fas fa-redo';
            nextBtn.appendChild(nextIcon);
            nextBtn.appendChild(document.createTextNode(' Next Word'));
            nextBtn.addEventListener('click', () => this._newGame());
            msgArea.appendChild(nextBtn);
        }

        // Update stats display
        const statsEl = document.getElementById('wordle-stats');
        if (statsEl) {
            statsEl.textContent = 'Wins: ' + this._stats.wins + ' | Losses: ' + this._stats.losses + ' | Streak: ' + this._stats.streak;
        }
    },

    _saveProgress() {
        ProgressManager.saveActivityProgress(StudyEngine.config.unit.id, 'wordle', {
            wins: this._stats.wins,
            losses: this._stats.losses,
            streak: this._stats.streak
        });
    },

    activate() {
        this._keyHandler = (e) => {
            if (this._gameOver) return;
            const inputEl = document.getElementById('wordle-input');
            if (!inputEl) return;
            // Only handle keyboard events when not focused on input (input handles its own events)
            if (document.activeElement === inputEl) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                this._submitGuess();
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                this._currentGuess = this._currentGuess.slice(0, -1);
                inputEl.value = this._currentGuess;
                this._updateCurrentRow();
            } else if (/^[a-zA-Z]$/.test(e.key) && this._currentGuess.length < this._targetWord.length) {
                e.preventDefault();
                this._currentGuess += e.key.toUpperCase();
                inputEl.value = this._currentGuess;
                this._updateCurrentRow();
            }
        };
        document.addEventListener('keydown', this._keyHandler);
    },

    deactivate() {
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
    },

    getProgress() {
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'wordle');
    },

    loadProgress(data) {
        if (data) {
            this._stats = { wins: data.wins || 0, losses: data.losses || 0, streak: data.streak || 0 };
        }
    }
});
