StudyEngine.registerActivity({
    id: 'crossword',
    name: 'Crossword',
    icon: 'fas fa-th',
    description: 'Solve a crossword puzzle using vocabulary definitions as clues',
    category: 'games',
    requires: ['vocabulary'],
    _grid: [],
    _words: [],
    _clues: { across: [], down: [] },
    _activeClue: null,
    _gridSize: 20,
    _container: null,
    _config: null,
    _stats: { completed: 0 },
    _keyHandler: null,

    render(container, config) {
        this._container = container;
        this._config = config;

        var saved = ProgressManager.getActivityProgress(config.unit.id, 'crossword');
        if (saved) {
            this._stats = { completed: saved.completed || 0 };
        }

        var wrapper = document.createElement('div');
        wrapper.id = 'crossword-wrapper';
        container.appendChild(wrapper);

        this._generatePuzzle(config.vocabulary);
        this._renderUI();
    },

    _generatePuzzle(vocabulary) {
        this._grid = [];
        this._words = [];
        this._clues = { across: [], down: [] };
        this._activeClue = null;

        for (var i = 0; i < this._gridSize; i++) {
            this._grid.push(new Array(this._gridSize).fill(null));
        }

        var candidates = vocabulary
            .map(function(v) {
                var word = v.term.replace(/[^a-zA-Z]/g, '').toUpperCase();
                return { word: word, vocab: v };
            })
            .filter(function(item) { return item.word.length >= 3 && item.word.length <= 18; });

        candidates.sort(function(a, b) { return b.word.length - a.word.length; });

        if (candidates.length === 0) return;

        var first = candidates[0];
        var startRow = Math.floor(this._gridSize / 2);
        var startCol = Math.floor((this._gridSize - first.word.length) / 2);

        for (var c = 0; c < first.word.length; c++) {
            this._grid[startRow][startCol + c] = first.word[c];
        }
        this._words.push({
            word: first.word,
            vocab: first.vocab,
            row: startRow,
            col: startCol,
            direction: 'across'
        });

        for (var i = 1; i < candidates.length; i++) {
            if (this._words.length >= 12) break;
            this._placeWord(candidates[i]);
        }

        this._numberCells();
    },

    _placeWord(candidate) {
        var intersections = this._findIntersections(candidate.word);

        for (var i = 0; i < intersections.length; i++) {
            var spot = intersections[i];
            if (this._canPlace(candidate.word, spot.row, spot.col, spot.direction)) {
                for (var c = 0; c < candidate.word.length; c++) {
                    if (spot.direction === 'across') {
                        this._grid[spot.row][spot.col + c] = candidate.word[c];
                    } else {
                        this._grid[spot.row + c][spot.col] = candidate.word[c];
                    }
                }
                this._words.push({
                    word: candidate.word,
                    vocab: candidate.vocab,
                    row: spot.row,
                    col: spot.col,
                    direction: spot.direction
                });
                return true;
            }
        }
        return false;
    },

    _findIntersections(word) {
        var results = [];
        for (var wi = 0; wi < this._words.length; wi++) {
            var placed = this._words[wi];
            for (var pi = 0; pi < placed.word.length; pi++) {
                for (var ni = 0; ni < word.length; ni++) {
                    if (word[ni] === placed.word[pi]) {
                        var newDir = placed.direction === 'across' ? 'down' : 'across';
                        var row, col;
                        if (newDir === 'across') {
                            row = placed.row + pi;
                            col = placed.col - ni;
                        } else {
                            row = placed.row - ni;
                            col = placed.col + pi;
                        }
                        results.push({ row: row, col: col, direction: newDir });
                    }
                }
            }
        }
        // Shuffle to add variety
        for (var i = results.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = results[i];
            results[i] = results[j];
            results[j] = temp;
        }
        return results;
    },

    _canPlace(word, row, col, direction) {
        var size = this._gridSize;

        // Check bounds
        if (direction === 'across') {
            if (col < 0 || col + word.length > size || row < 0 || row >= size) return false;
        } else {
            if (row < 0 || row + word.length > size || col < 0 || col >= size) return false;
        }

        // Check cell before start
        if (direction === 'across') {
            if (col > 0 && this._grid[row][col - 1] !== null) return false;
            if (col + word.length < size && this._grid[row][col + word.length] !== null) return false;
        } else {
            if (row > 0 && this._grid[row - 1][col] !== null) return false;
            if (row + word.length < size && this._grid[row + word.length][col] !== null) return false;
        }

        var hasIntersection = false;

        for (var i = 0; i < word.length; i++) {
            var r = direction === 'across' ? row : row + i;
            var c = direction === 'across' ? col + i : col;
            var existing = this._grid[r][c];

            if (existing !== null) {
                if (existing !== word[i]) return false;
                hasIntersection = true;

                // The intersecting cell must belong to a word going the other direction
                // (we don't want two words going the same direction overlapping)
                var sameDir = false;
                for (var w = 0; w < this._words.length; w++) {
                    var pw = this._words[w];
                    if (pw.direction !== direction) continue;
                    if (direction === 'across') {
                        if (pw.row === r && c >= pw.col && c < pw.col + pw.word.length) {
                            sameDir = true;
                            break;
                        }
                    } else {
                        if (pw.col === c && r >= pw.row && r < pw.row + pw.word.length) {
                            sameDir = true;
                            break;
                        }
                    }
                }
                if (sameDir) return false;
            } else {
                // Check adjacent cells perpendicular to direction
                if (direction === 'across') {
                    if (r > 0 && this._grid[r - 1][c] !== null) return false;
                    if (r < size - 1 && this._grid[r + 1][c] !== null) return false;
                } else {
                    if (c > 0 && this._grid[r][c - 1] !== null) return false;
                    if (c < size - 1 && this._grid[r][c + 1] !== null) return false;
                }
            }
        }

        return hasIntersection;
    },

    _numberCells() {
        // Sort words by position (top-to-bottom, left-to-right)
        this._words.sort(function(a, b) {
            if (a.row !== b.row) return a.row - b.row;
            return a.col - b.col;
        });

        var numberMap = {};
        var num = 1;

        for (var i = 0; i < this._words.length; i++) {
            var w = this._words[i];
            var key = w.row + ',' + w.col;
            if (!numberMap[key]) {
                numberMap[key] = num++;
            }
            w.number = numberMap[key];

            var clue = {
                number: w.number,
                direction: w.direction,
                definition: w.vocab.definition,
                word: w.word,
                row: w.row,
                col: w.col,
                length: w.word.length
            };

            if (w.direction === 'across') {
                this._clues.across.push(clue);
            } else {
                this._clues.down.push(clue);
            }
        }

        this._clues.across.sort(function(a, b) { return a.number - b.number; });
        this._clues.down.sort(function(a, b) { return a.number - b.number; });
    },

    _renderUI() {
        var wrapper = document.getElementById('crossword-wrapper');
        if (!wrapper) return;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);

        // Find bounding box of used cells
        var minR = this._gridSize, maxR = 0, minC = this._gridSize, maxC = 0;
        for (var r = 0; r < this._gridSize; r++) {
            for (var c = 0; c < this._gridSize; c++) {
                if (this._grid[r][c] !== null) {
                    if (r < minR) minR = r;
                    if (r > maxR) maxR = r;
                    if (c < minC) minC = c;
                    if (c > maxC) maxC = c;
                }
            }
        }

        // Add 1 cell padding
        minR = Math.max(0, minR - 1);
        maxR = Math.min(this._gridSize - 1, maxR + 1);
        minC = Math.max(0, minC - 1);
        maxC = Math.min(this._gridSize - 1, maxC + 1);

        this._viewMinR = minR;
        this._viewMinC = minC;
        this._viewMaxR = maxR;
        this._viewMaxC = maxC;

        var container = document.createElement('div');
        container.className = 'crossword-container';

        // Grid wrapper
        var gridWrapper = document.createElement('div');
        gridWrapper.className = 'crossword-grid-wrapper';

        this._renderGrid(gridWrapper, minR, maxR, minC, maxC);

        // Controls
        var controls = document.createElement('div');
        controls.className = 'crossword-controls';

        var checkBtn = document.createElement('button');
        checkBtn.className = 'nav-button';
        var checkIcon = document.createElement('i');
        checkIcon.className = 'fas fa-check';
        checkBtn.appendChild(checkIcon);
        checkBtn.appendChild(document.createTextNode(' Check'));
        checkBtn.addEventListener('click', this._checkAnswers.bind(this));
        controls.appendChild(checkBtn);

        var revealBtn = document.createElement('button');
        revealBtn.className = 'nav-button';
        var revealIcon = document.createElement('i');
        revealIcon.className = 'fas fa-eye';
        revealBtn.appendChild(revealIcon);
        revealBtn.appendChild(document.createTextNode(' Reveal Word'));
        revealBtn.addEventListener('click', this._revealWord.bind(this));
        controls.appendChild(revealBtn);

        var newBtn = document.createElement('button');
        newBtn.className = 'nav-button';
        var newIcon = document.createElement('i');
        newIcon.className = 'fas fa-redo';
        newBtn.appendChild(newIcon);
        newBtn.appendChild(document.createTextNode(' New Puzzle'));
        newBtn.addEventListener('click', this._newPuzzle.bind(this));
        controls.appendChild(newBtn);

        gridWrapper.appendChild(controls);

        // Stats
        var statsEl = document.createElement('div');
        statsEl.id = 'crossword-stats';
        statsEl.style.marginTop = '10px';
        statsEl.style.color = '#6b7280';
        statsEl.style.fontSize = '0.85em';
        statsEl.textContent = 'Puzzles completed: ' + this._stats.completed;
        gridWrapper.appendChild(statsEl);

        container.appendChild(gridWrapper);

        // Clues panel
        this._renderClues(container);

        wrapper.appendChild(container);
    },

    _renderGrid(gridWrapper, minR, maxR, minC, maxC) {
        var table = document.createElement('table');
        table.className = 'crossword-grid';

        // Build number lookup
        var numberMap = {};
        for (var i = 0; i < this._words.length; i++) {
            var w = this._words[i];
            var key = w.row + ',' + w.col;
            if (!numberMap[key]) {
                numberMap[key] = w.number;
            }
        }

        var self = this;

        for (var r = minR; r <= maxR; r++) {
            var tr = document.createElement('tr');
            for (var c = minC; c <= maxC; c++) {
                var td = document.createElement('td');
                td.className = 'crossword-cell';
                td.setAttribute('data-row', r);
                td.setAttribute('data-col', c);

                if (this._grid[r][c] === null) {
                    td.classList.add('black');
                    var hiddenInput = document.createElement('input');
                    hiddenInput.type = 'text';
                    td.appendChild(hiddenInput);
                } else {
                    var numKey = r + ',' + c;
                    if (numberMap[numKey]) {
                        var numSpan = document.createElement('span');
                        numSpan.className = 'cell-number';
                        numSpan.textContent = numberMap[numKey];
                        td.appendChild(numSpan);
                    }

                    var input = document.createElement('input');
                    input.type = 'text';
                    input.maxLength = 1;
                    input.setAttribute('data-row', r);
                    input.setAttribute('data-col', c);
                    input.setAttribute('autocomplete', 'off');
                    input.setAttribute('autocapitalize', 'characters');

                    (function(row, col, inp) {
                        inp.addEventListener('input', function() {
                            inp.value = inp.value.toUpperCase().replace(/[^A-Z]/g, '');
                            if (inp.value.length === 1) {
                                self._advanceToNext(row, col);
                            }
                        });

                        inp.addEventListener('keydown', function(e) {
                            if (e.key === 'Backspace' && inp.value === '') {
                                e.preventDefault();
                                self._moveToPrevious(row, col);
                            } else if (e.key === 'Tab') {
                                e.preventDefault();
                                self._moveToNextWord(e.shiftKey);
                            }
                        });

                        inp.addEventListener('focus', function() {
                            self._highlightWordAt(row, col);
                        });
                    })(r, c, input);

                    td.appendChild(input);
                }

                tr.appendChild(td);
            }
            table.appendChild(tr);
        }

        gridWrapper.appendChild(table);
    },

    _renderClues(container) {
        var cluesPanel = document.createElement('div');
        cluesPanel.className = 'crossword-clues';

        var self = this;

        // Across
        if (this._clues.across.length > 0) {
            var acrossH = document.createElement('h3');
            acrossH.textContent = 'Across';
            cluesPanel.appendChild(acrossH);

            for (var i = 0; i < this._clues.across.length; i++) {
                (function(clue) {
                    var div = document.createElement('div');
                    div.className = 'crossword-clue';
                    div.setAttribute('data-direction', 'across');
                    div.setAttribute('data-number', clue.number);

                    var numSpan = document.createElement('span');
                    numSpan.className = 'crossword-clue-number';
                    numSpan.textContent = clue.number + '.';
                    div.appendChild(numSpan);

                    var textNode = document.createTextNode(' ');
                    div.appendChild(textNode);

                    var defSpan = document.createElement('span');
                    defSpan.textContent = clue.definition + ' (' + clue.length + ')';
                    div.appendChild(defSpan);

                    div.addEventListener('click', function() {
                        self._selectClue(clue);
                    });

                    cluesPanel.appendChild(div);
                })(this._clues.across[i]);
            }
        }

        // Down
        if (this._clues.down.length > 0) {
            var downH = document.createElement('h3');
            downH.textContent = 'Down';
            cluesPanel.appendChild(downH);

            for (var i = 0; i < this._clues.down.length; i++) {
                (function(clue) {
                    var div = document.createElement('div');
                    div.className = 'crossword-clue';
                    div.setAttribute('data-direction', 'down');
                    div.setAttribute('data-number', clue.number);

                    var numSpan = document.createElement('span');
                    numSpan.className = 'crossword-clue-number';
                    numSpan.textContent = clue.number + '.';
                    div.appendChild(numSpan);

                    var textNode = document.createTextNode(' ');
                    div.appendChild(textNode);

                    var defSpan = document.createElement('span');
                    defSpan.textContent = clue.definition + ' (' + clue.length + ')';
                    div.appendChild(defSpan);

                    div.addEventListener('click', function() {
                        self._selectClue(clue);
                    });

                    cluesPanel.appendChild(div);
                })(this._clues.down[i]);
            }
        }

        container.appendChild(cluesPanel);
    },

    _selectClue(clue) {
        this._activeClue = clue;
        this._clearHighlights();

        // Highlight clue in panel
        var allClues = document.querySelectorAll('.crossword-clue');
        for (var i = 0; i < allClues.length; i++) {
            allClues[i].classList.remove('active');
            if (allClues[i].getAttribute('data-direction') === clue.direction &&
                parseInt(allClues[i].getAttribute('data-number')) === clue.number) {
                allClues[i].classList.add('active');
            }
        }

        // Highlight cells
        for (var i = 0; i < clue.length; i++) {
            var r = clue.direction === 'across' ? clue.row : clue.row + i;
            var c = clue.direction === 'across' ? clue.col + i : clue.col;
            var cell = this._getCellElement(r, c);
            if (cell) {
                cell.classList.add('highlighted');
            }
        }

        // Focus first empty cell, or first cell
        var focused = false;
        for (var i = 0; i < clue.length; i++) {
            var r = clue.direction === 'across' ? clue.row : clue.row + i;
            var c = clue.direction === 'across' ? clue.col + i : clue.col;
            var input = this._getInputElement(r, c);
            if (input && input.value === '') {
                input.focus();
                var cell = this._getCellElement(r, c);
                if (cell) cell.classList.add('active');
                focused = true;
                break;
            }
        }
        if (!focused) {
            var r = clue.row;
            var c = clue.col;
            var input = this._getInputElement(r, c);
            if (input) {
                input.focus();
                var cell = this._getCellElement(r, c);
                if (cell) cell.classList.add('active');
            }
        }
    },

    _highlightWordAt(row, col) {
        // Find a word that contains this cell, preferring the active clue direction
        var preferredDir = this._activeClue ? this._activeClue.direction : 'across';
        var match = null;

        for (var i = 0; i < this._words.length; i++) {
            var w = this._words[i];
            var inWord = false;
            if (w.direction === 'across') {
                inWord = (row === w.row && col >= w.col && col < w.col + w.word.length);
            } else {
                inWord = (col === w.col && row >= w.row && row < w.row + w.word.length);
            }
            if (inWord) {
                if (!match || w.direction === preferredDir) {
                    match = w;
                }
            }
        }

        if (match) {
            var clueList = match.direction === 'across' ? this._clues.across : this._clues.down;
            for (var i = 0; i < clueList.length; i++) {
                if (clueList[i].number === match.number) {
                    this._activeClue = clueList[i];
                    break;
                }
            }
            this._clearHighlights();

            // Highlight clue
            var allClues = document.querySelectorAll('.crossword-clue');
            for (var i = 0; i < allClues.length; i++) {
                allClues[i].classList.remove('active');
                if (allClues[i].getAttribute('data-direction') === match.direction &&
                    parseInt(allClues[i].getAttribute('data-number')) === match.number) {
                    allClues[i].classList.add('active');
                }
            }

            for (var i = 0; i < match.word.length; i++) {
                var r = match.direction === 'across' ? match.row : match.row + i;
                var c = match.direction === 'across' ? match.col + i : match.col;
                var cell = this._getCellElement(r, c);
                if (cell) cell.classList.add('highlighted');
            }

            var activeCell = this._getCellElement(row, col);
            if (activeCell) activeCell.classList.add('active');
        }
    },

    _clearHighlights() {
        var cells = document.querySelectorAll('.crossword-cell');
        for (var i = 0; i < cells.length; i++) {
            cells[i].classList.remove('highlighted', 'active');
        }
    },

    _advanceToNext(row, col) {
        if (!this._activeClue) return;
        var clue = this._activeClue;
        var idx = clue.direction === 'across' ? col - clue.col : row - clue.row;
        if (idx + 1 < clue.length) {
            var nextR = clue.direction === 'across' ? clue.row : clue.row + idx + 1;
            var nextC = clue.direction === 'across' ? clue.col + idx + 1 : clue.col;
            var input = this._getInputElement(nextR, nextC);
            if (input) input.focus();
        }
    },

    _moveToPrevious(row, col) {
        if (!this._activeClue) return;
        var clue = this._activeClue;
        var idx = clue.direction === 'across' ? col - clue.col : row - clue.row;
        if (idx - 1 >= 0) {
            var prevR = clue.direction === 'across' ? clue.row : clue.row + idx - 1;
            var prevC = clue.direction === 'across' ? clue.col + idx - 1 : clue.col;
            var input = this._getInputElement(prevR, prevC);
            if (input) {
                input.focus();
                input.value = '';
            }
        }
    },

    _moveToNextWord(reverse) {
        var allClues = this._clues.across.concat(this._clues.down);
        if (allClues.length === 0) return;

        var currentIdx = -1;
        if (this._activeClue) {
            for (var i = 0; i < allClues.length; i++) {
                if (allClues[i].number === this._activeClue.number &&
                    allClues[i].direction === this._activeClue.direction) {
                    currentIdx = i;
                    break;
                }
            }
        }

        var nextIdx;
        if (reverse) {
            nextIdx = currentIdx <= 0 ? allClues.length - 1 : currentIdx - 1;
        } else {
            nextIdx = currentIdx >= allClues.length - 1 ? 0 : currentIdx + 1;
        }

        this._selectClue(allClues[nextIdx]);
    },

    _getCellElement(row, col) {
        return document.querySelector('.crossword-cell[data-row="' + row + '"][data-col="' + col + '"]');
    },

    _getInputElement(row, col) {
        return document.querySelector('.crossword-cell[data-row="' + row + '"][data-col="' + col + '"] input');
    },

    _checkAnswers() {
        var allCorrect = true;

        for (var i = 0; i < this._words.length; i++) {
            var w = this._words[i];
            for (var j = 0; j < w.word.length; j++) {
                var r = w.direction === 'across' ? w.row : w.row + j;
                var c = w.direction === 'across' ? w.col + j : w.col;
                var input = this._getInputElement(r, c);
                if (!input) continue;

                input.classList.remove('correct', 'incorrect');
                if (input.value.toUpperCase() === w.word[j]) {
                    input.classList.add('correct');
                } else {
                    input.classList.add('incorrect');
                    allCorrect = false;
                }
            }
        }

        if (allCorrect) {
            this._stats.completed++;
            this._saveProgress();
            var statsEl = document.getElementById('crossword-stats');
            if (statsEl) {
                statsEl.textContent = 'Puzzles completed: ' + this._stats.completed;
            }
        }
    },

    _revealWord() {
        if (!this._activeClue) return;
        var clue = this._activeClue;

        for (var i = 0; i < clue.length; i++) {
            var r = clue.direction === 'across' ? clue.row : clue.row + i;
            var c = clue.direction === 'across' ? clue.col + i : clue.col;
            var input = this._getInputElement(r, c);
            if (input) {
                input.value = clue.word[i];
                input.classList.remove('incorrect');
                input.classList.add('correct');
            }
        }
    },

    _newPuzzle() {
        if (!this._config) return;
        this._generatePuzzle(this._config.vocabulary);
        this._renderUI();
    },

    _saveProgress() {
        ProgressManager.saveActivityProgress(StudyEngine.config.unit.id, 'crossword', {
            completed: this._stats.completed
        });
    },

    activate() {
        // No global key handler needed; inputs handle their own events
    },

    deactivate() {
        // Nothing to clean up
    },

    getProgress() {
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'crossword');
    },

    loadProgress(data) {
        if (data) {
            this._stats = { completed: data.completed || 0 };
        }
    }
});
