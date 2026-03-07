StudyEngine.registerActivity({
    id: 'typing-practice',
    name: 'Typing Practice',
    icon: 'fas fa-keyboard',
    description: 'Read and type historical passages to learn vocabulary in context',
    category: 'study',
    requires: ['vocabulary'],

    _container: null,
    _config: null,
    _words: [],
    _currentWordIndex: 0,
    _correctCount: 0,
    _incorrectCount: 0,
    _startTime: null,
    _active: false,
    _selectedCategory: null,
    _vocabTerms: [],
    _availablePassages: [],

    render(container, config) {
        this._container = container;
        this._config = config;
        this._active = false;
        this._selectedCategory = null;

        var wrapper = document.createElement('div');
        wrapper.className = 'typing-container';
        wrapper.id = 'typing-practice-wrapper';

        this._buildCategorySelect(wrapper);

        container.appendChild(wrapper);
    },

    _buildCategorySelect(wrapper) {
        var self = this;
        var config = this._config;
        var categories = MasteryManager.getUnlockedCategories(config.unit.id, config);
        var passages = config.typingPassages || [];
        var saved = ProgressManager.getActivityProgress(config.unit.id, 'typing-practice') || {};
        var completed = saved.completed || {};

        // Title
        var title = document.createElement('h2');
        title.className = 'typing-title';
        title.textContent = 'Typing Practice';
        wrapper.appendChild(title);

        var desc = document.createElement('p');
        desc.className = 'typing-description';
        desc.textContent = 'Select a passage to practice typing. Vocabulary terms are highlighted in bold.';
        wrapper.appendChild(desc);

        // Filter passages to only unlocked categories
        this._availablePassages = [];
        for (var i = 0; i < passages.length; i++) {
            if (categories.indexOf(passages[i].category) !== -1) {
                this._availablePassages.push(passages[i]);
            }
        }

        // Category pill buttons
        var pillContainer = document.createElement('div');
        pillContainer.className = 'typing-pill-container';
        pillContainer.id = 'typing-pill-container';

        for (var j = 0; j < this._availablePassages.length; j++) {
            var p = this._availablePassages[j];
            var pill = document.createElement('button');
            pill.className = 'typing-pill';
            pill.dataset.category = p.category;

            var pillText = document.createTextNode(p.title || p.category);
            pill.appendChild(pillText);

            if (completed[p.category]) {
                pill.classList.add('completed');
                var check = document.createElement('span');
                check.className = 'typing-pill-check';
                check.textContent = ' \u2713';
                pill.appendChild(check);
            }

            pill.addEventListener('click', (function(cat) {
                return function() {
                    self._selectPill(cat);
                    self._startPassage(cat);
                };
            })(p.category));

            pillContainer.appendChild(pill);
        }

        wrapper.appendChild(pillContainer);

        // Passage area placeholder
        var passageArea = document.createElement('div');
        passageArea.id = 'typing-passage-area';
        wrapper.appendChild(passageArea);
    },

    _selectPill(category) {
        var pills = document.querySelectorAll('.typing-pill');
        for (var i = 0; i < pills.length; i++) {
            pills[i].classList.remove('active');
            if (pills[i].dataset.category === category) {
                pills[i].classList.add('active');
            }
        }
    },

    _startPassage(category) {
        var self = this;
        var config = this._config;
        var passages = config.typingPassages || [];
        var passage = null;

        for (var i = 0; i < passages.length; i++) {
            if (passages[i].category === category) {
                passage = passages[i];
                break;
            }
        }

        if (!passage) return;

        this._selectedCategory = category;
        this._active = true;
        this._currentWordIndex = 0;
        this._correctCount = 0;
        this._incorrectCount = 0;
        this._startTime = null;

        // Collect vocab terms for this category (lowercase for matching)
        var vocab = MasteryManager.getUnlockedVocabulary(config.unit.id, config);
        this._vocabTerms = [];
        for (var v = 0; v < vocab.length; v++) {
            if (vocab[v].category === category) {
                this._vocabTerms.push(vocab[v].term.toLowerCase());
            }
        }

        // Split passage into words
        this._words = passage.passage.split(/\s+/).filter(function(w) { return w.length > 0; });

        // Clear passage area
        var passageArea = document.getElementById('typing-passage-area');
        if (!passageArea) return;
        while (passageArea.firstChild) passageArea.removeChild(passageArea.firstChild);

        // Dark typing box
        var darkBox = document.createElement('div');
        darkBox.className = 'typing-dark-box';
        darkBox.id = 'typing-dark-box';

        // Stats bar
        var statsBar = document.createElement('div');
        statsBar.className = 'typing-stats';
        statsBar.id = 'typing-stats';

        var statItems = [
            { id: 'typing-stat-wpm', label: 'wpm', value: '0' },
            { id: 'typing-stat-accuracy', label: 'acc', value: '100%' }
        ];

        for (var s = 0; s < statItems.length; s++) {
            var stat = document.createElement('div');
            stat.className = 'typing-stat';

            var valEl = document.createElement('span');
            valEl.className = 'typing-stat-value';
            valEl.id = statItems[s].id;
            valEl.textContent = statItems[s].value;
            stat.appendChild(valEl);

            var labelEl = document.createElement('span');
            labelEl.className = 'typing-stat-label';
            labelEl.textContent = ' ' + statItems[s].label;
            stat.appendChild(labelEl);

            statsBar.appendChild(stat);
        }

        darkBox.appendChild(statsBar);

        // Click-to-focus hint (shown when not focused)
        var focusHint = document.createElement('div');
        focusHint.className = 'typing-focus-hint';
        focusHint.id = 'typing-focus-hint';
        focusHint.textContent = 'Click here or start typing to focus';

        // Passage display (constrained to ~3 lines)
        var display = document.createElement('div');
        display.className = 'typing-passage-display';
        display.id = 'typing-passage-display';

        for (var w = 0; w < this._words.length; w++) {
            var span = document.createElement('span');
            span.className = 'typing-word';
            span.textContent = this._words[w];
            span.dataset.index = w;

            // Check if this word is a vocab term
            if (this._isVocabTerm(this._words[w])) {
                span.classList.add('vocab-term');
            }

            if (w === 0) {
                span.classList.add('current');
            }

            display.appendChild(span);

            // Add space between words
            if (w < this._words.length - 1) {
                display.appendChild(document.createTextNode(' '));
            }
        }

        darkBox.appendChild(display);
        darkBox.appendChild(focusHint);

        // Hidden input
        var input = document.createElement('input');
        input.type = 'text';
        input.id = 'typing-input';
        input.className = 'typing-hidden-input';
        input.autocomplete = 'off';
        input.autocapitalize = 'off';
        input.spellcheck = false;

        input.addEventListener('keydown', function(e) {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                self._submitWord(input);
            }
        });

        input.addEventListener('input', function() {
            self._updateLiveTyping(input);
        });

        input.addEventListener('focus', function() {
            darkBox.classList.add('focused');
            focusHint.style.display = 'none';
        });

        input.addEventListener('blur', function() {
            darkBox.classList.remove('focused');
            if (self._active) {
                focusHint.style.display = '';
            }
        });

        darkBox.appendChild(input);

        // Click on dark box focuses input
        darkBox.addEventListener('click', function() {
            input.focus();
        });

        passageArea.appendChild(darkBox);

        // Source citation
        var source = passage.source || 'Content adapted from The American Yawp (americanyawp.com) and Wikipedia for educational use.';
        var citation = document.createElement('p');
        citation.className = 'typing-citation';
        citation.textContent = source + ' Vocabulary terms appear in bold.';
        passageArea.appendChild(citation);

        // Focus the input
        setTimeout(function() {
            input.focus();
        }, 50);
    },

    _updateLiveTyping(input) {
        if (!this._active) return;
        var display = document.getElementById('typing-passage-display');
        if (!display) return;

        var wordSpans = display.querySelectorAll('.typing-word');
        var currentSpan = wordSpans[this._currentWordIndex];
        if (!currentSpan) return;

        var typed = input.value;
        var expected = this._words[this._currentWordIndex];

        // Check character-by-character if the typed text matches the beginning of expected
        if (typed.length > 0) {
            var matchSoFar = true;
            for (var c = 0; c < typed.length; c++) {
                if (c >= expected.length || typed[c] !== expected[c]) {
                    matchSoFar = false;
                    break;
                }
            }
            if (matchSoFar) {
                currentSpan.classList.remove('typing-error');
                currentSpan.classList.add('typing-active');
            } else {
                currentSpan.classList.remove('typing-active');
                currentSpan.classList.add('typing-error');
            }
        } else {
            currentSpan.classList.remove('typing-active', 'typing-error');
        }
    },

    _stripPunctuation(word) {
        return word.replace(/[.,!?;:'")\]}/]+$/g, '').replace(/^['"(\[{]+/g, '');
    },

    _isVocabTerm(word) {
        var stripped = this._stripPunctuation(word).toLowerCase();
        for (var i = 0; i < this._vocabTerms.length; i++) {
            if (stripped === this._vocabTerms[i].toLowerCase()) {
                return true;
            }
        }
        return false;
    },

    _submitWord(input) {
        if (!this._active) return;
        var typed = input.value;
        if (!typed.trim()) return;

        // Start timer on first word
        if (this._startTime === null) {
            this._startTime = Date.now();
        }

        var expected = this._words[this._currentWordIndex];

        // Compare: case-insensitive, strip trailing punctuation for leniency
        var typedClean = this._stripPunctuation(typed.trim()).toLowerCase();
        var expectedClean = this._stripPunctuation(expected).toLowerCase();

        var isCorrect = typedClean === expectedClean;

        // Update word styling
        var display = document.getElementById('typing-passage-display');
        if (display) {
            var wordSpans = display.querySelectorAll('.typing-word');
            var currentSpan = wordSpans[this._currentWordIndex];
            if (currentSpan) {
                currentSpan.classList.remove('current', 'typing-active', 'typing-error');
                if (isCorrect) {
                    currentSpan.classList.add('correct');
                    this._correctCount++;
                } else {
                    currentSpan.classList.add('incorrect');
                    this._incorrectCount++;
                }
            }

            this._currentWordIndex++;

            // Highlight next word
            if (this._currentWordIndex < this._words.length) {
                var nextSpan = wordSpans[this._currentWordIndex];
                if (nextSpan) {
                    nextSpan.classList.add('current');
                    // Scroll to keep current word visible within display
                    this._scrollToWord(display, nextSpan);
                }
            }
        }

        input.value = '';

        // Update stats
        this._updateStats();

        // Check completion
        if (this._currentWordIndex >= this._words.length) {
            this._completePassage();
        }
    },

    _scrollToWord(display, wordSpan) {
        // Get position of word relative to display container
        var wordTop = wordSpan.offsetTop;
        var wordHeight = wordSpan.offsetHeight;
        var displayHeight = display.clientHeight;
        var scrollTop = display.scrollTop;

        // If the word is below the visible area, scroll down
        // Keep one line of context above
        var lineHeight = wordHeight;
        if (wordTop + wordHeight > scrollTop + displayHeight) {
            display.scrollTop = wordTop - lineHeight;
        }
        // If the word is above the visible area, scroll up
        if (wordTop < scrollTop) {
            display.scrollTop = wordTop - lineHeight;
        }
    },

    _updateStats() {
        var totalTyped = this._correctCount + this._incorrectCount;

        // WPM
        var wpm = 0;
        if (this._startTime) {
            var elapsedMinutes = (Date.now() - this._startTime) / 60000;
            if (elapsedMinutes > 0) {
                wpm = Math.round(totalTyped / elapsedMinutes);
            }
        }
        var wpmEl = document.getElementById('typing-stat-wpm');
        if (wpmEl) wpmEl.textContent = wpm;

        // Accuracy
        var accuracy = totalTyped > 0 ? Math.round((this._correctCount / totalTyped) * 100) : 100;
        var accEl = document.getElementById('typing-stat-accuracy');
        if (accEl) accEl.textContent = accuracy + '%';
    },

    _completePassage() {
        this._active = false;

        var totalTyped = this._correctCount + this._incorrectCount;
        var elapsedMinutes = (Date.now() - this._startTime) / 60000;
        var wpm = elapsedMinutes > 0 ? Math.round(totalTyped / elapsedMinutes) : 0;
        var accuracy = totalTyped > 0 ? Math.round((this._correctCount / totalTyped) * 100) : 100;

        // Save progress
        var saved = ProgressManager.getActivityProgress(this._config.unit.id, 'typing-practice') || {};
        var completed = saved.completed || {};
        completed[this._selectedCategory] = {
            wpm: wpm,
            accuracy: accuracy,
            completedAt: new Date().toISOString()
        };
        ProgressManager.saveActivityProgress(this._config.unit.id, 'typing-practice', {
            completed: completed
        });

        // Update pill button to show checkmark
        var pills = document.querySelectorAll('.typing-pill');
        for (var i = 0; i < pills.length; i++) {
            if (pills[i].dataset.category === this._selectedCategory && !pills[i].classList.contains('completed')) {
                pills[i].classList.add('completed');
                var check = document.createElement('span');
                check.className = 'typing-pill-check';
                check.textContent = ' \u2713';
                pills[i].appendChild(check);
            }
        }

        // Show completion UI inside the dark box
        var darkBox = document.getElementById('typing-dark-box');
        if (!darkBox) return;

        // Hide display, input, focus hint, stats
        var display = document.getElementById('typing-passage-display');
        if (display) display.style.display = 'none';
        var input = document.getElementById('typing-input');
        if (input) input.style.display = 'none';
        var focusHint = document.getElementById('typing-focus-hint');
        if (focusHint) focusHint.style.display = 'none';
        var stats = document.getElementById('typing-stats');
        if (stats) stats.style.display = 'none';

        // Completion message
        var completeDiv = document.createElement('div');
        completeDiv.className = 'typing-complete';

        var completeTitle = document.createElement('h3');
        completeTitle.className = 'typing-complete-title';
        completeTitle.textContent = 'Passage Complete!';
        completeDiv.appendChild(completeTitle);

        var statsRow = document.createElement('div');
        statsRow.className = 'typing-complete-stats';

        var finalStats = [
            { label: 'WPM', value: String(wpm) },
            { label: 'Accuracy', value: accuracy + '%' }
        ];

        for (var s = 0; s < finalStats.length; s++) {
            var statDiv = document.createElement('div');
            statDiv.className = 'typing-complete-stat';

            var valEl = document.createElement('div');
            valEl.className = 'typing-complete-stat-value';
            valEl.textContent = finalStats[s].value;
            statDiv.appendChild(valEl);

            var labelEl = document.createElement('div');
            labelEl.className = 'typing-complete-stat-label';
            labelEl.textContent = finalStats[s].label;
            statDiv.appendChild(labelEl);

            statsRow.appendChild(statDiv);
        }

        completeDiv.appendChild(statsRow);

        // Try Again button
        var self = this;
        var tryAgainBtn = document.createElement('button');
        tryAgainBtn.className = 'typing-retry-btn';

        var icon = document.createElement('i');
        icon.className = 'fas fa-redo';
        tryAgainBtn.appendChild(icon);
        tryAgainBtn.appendChild(document.createTextNode(' Try Again'));

        tryAgainBtn.addEventListener('click', function() {
            self._startPassage(self._selectedCategory);
        });

        completeDiv.appendChild(tryAgainBtn);
        darkBox.appendChild(completeDiv);

        // Show toast
        StudyUtils.showToast('Passage completed! ' + wpm + ' WPM, ' + accuracy + '% accuracy', 'success');
    },

    activate() {},

    deactivate() {
        this._active = false;
    },

    getProgress() {
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'typing-practice');
    },

    loadProgress(data) {
        // Progress is loaded directly from ProgressManager when needed
    }
});
