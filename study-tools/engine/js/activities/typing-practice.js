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
        title.textContent = 'Typing Practice';
        title.style.color = 'var(--primary)';
        title.style.marginBottom = '8px';
        title.style.textAlign = 'center';
        wrapper.appendChild(title);

        var desc = document.createElement('p');
        desc.textContent = 'Select a passage to practice typing. Vocabulary terms are highlighted in bold.';
        desc.style.color = '#666';
        desc.style.marginBottom = '20px';
        desc.style.textAlign = 'center';
        wrapper.appendChild(desc);

        // Category selector
        var selectWrapper = document.createElement('div');
        selectWrapper.className = 'typing-category-select';

        var select = document.createElement('select');
        select.className = 'filter-select';
        select.id = 'typing-category-select';

        var defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = '-- Choose a passage --';
        select.appendChild(defaultOpt);

        // Filter passages to only unlocked categories
        var availablePassages = [];
        for (var i = 0; i < passages.length; i++) {
            if (categories.indexOf(passages[i].category) !== -1) {
                availablePassages.push(passages[i]);
            }
        }

        for (var j = 0; j < availablePassages.length; j++) {
            var p = availablePassages[j];
            var opt = document.createElement('option');
            opt.value = p.category;
            var label = p.title || p.category;
            if (completed[p.category]) {
                label += ' \u2713';
            }
            opt.textContent = label;
            select.appendChild(opt);
        }

        select.addEventListener('change', function() {
            var cat = select.value;
            if (cat) {
                self._startPassage(cat);
            }
        });

        selectWrapper.appendChild(select);
        wrapper.appendChild(selectWrapper);

        // Passage area placeholder
        var passageArea = document.createElement('div');
        passageArea.id = 'typing-passage-area';
        wrapper.appendChild(passageArea);
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

        // Stats bar
        var statsBar = document.createElement('div');
        statsBar.className = 'typing-stats';
        statsBar.id = 'typing-stats';

        var statItems = [
            { id: 'typing-stat-wpm', label: 'WPM', value: '0' },
            { id: 'typing-stat-accuracy', label: 'Accuracy', value: '100%' },
            { id: 'typing-stat-progress', label: 'Progress', value: '0/' + this._words.length }
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
            labelEl.textContent = ' ' + statItems[s].label;
            stat.appendChild(labelEl);

            statsBar.appendChild(stat);
        }

        passageArea.appendChild(statsBar);

        // Passage display
        var display = document.createElement('div');
        display.className = 'typing-passage-display';
        display.id = 'typing-passage-display';

        for (var w = 0; w < this._words.length; w++) {
            var span = document.createElement('span');
            span.className = 'word';
            span.textContent = this._words[w];
            span.dataset.index = w;

            // Check if this word (stripped of punctuation) is a vocab term
            if (this._isVocabTerm(this._words[w])) {
                span.classList.add('vocab-term');
            }

            if (w === 0) {
                span.classList.add('current');
            }

            display.appendChild(span);

            // Add space text node between words
            if (w < this._words.length - 1) {
                display.appendChild(document.createTextNode(' '));
            }
        }

        passageArea.appendChild(display);

        // Input area
        var inputArea = document.createElement('div');
        inputArea.className = 'typing-input-area';

        var input = document.createElement('input');
        input.type = 'text';
        input.id = 'typing-input';
        input.placeholder = 'Start typing...';
        input.autocomplete = 'off';
        input.autocapitalize = 'off';
        input.spellcheck = false;

        input.addEventListener('keydown', function(e) {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                self._submitWord(input);
            }
        });

        inputArea.appendChild(input);
        passageArea.appendChild(inputArea);

        // Focus the input
        setTimeout(function() {
            input.focus();
        }, 50);
    },

    _stripPunctuation(word) {
        return word.replace(/[.,!?;:'")\]}/]+$/g, '').replace(/^['"(\[{]+/g, '');
    },

    _isVocabTerm(word) {
        var stripped = this._stripPunctuation(word).toLowerCase();
        for (var i = 0; i < this._vocabTerms.length; i++) {
            // Check single-word vocab terms
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
            var wordSpans = display.querySelectorAll('.word');
            var currentSpan = wordSpans[this._currentWordIndex];
            if (currentSpan) {
                currentSpan.classList.remove('current');
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
                    // Auto-scroll to keep current word visible
                    nextSpan.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

        // Progress
        var progEl = document.getElementById('typing-stat-progress');
        if (progEl) progEl.textContent = this._currentWordIndex + '/' + this._words.length;
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

        // Update the select dropdown to show checkmark
        var select = document.getElementById('typing-category-select');
        if (select) {
            for (var i = 0; i < select.options.length; i++) {
                if (select.options[i].value === this._selectedCategory) {
                    var text = select.options[i].textContent;
                    if (text.indexOf('\u2713') === -1) {
                        select.options[i].textContent = text + ' \u2713';
                    }
                    break;
                }
            }
        }

        // Show completion UI
        var passageArea = document.getElementById('typing-passage-area');
        if (!passageArea) return;

        // Hide input
        var input = document.getElementById('typing-input');
        if (input) input.style.display = 'none';

        // Completion message
        var completeDiv = document.createElement('div');
        completeDiv.style.textAlign = 'center';
        completeDiv.style.marginTop = '20px';
        completeDiv.style.padding = '20px';

        var completeTitle = document.createElement('h3');
        completeTitle.textContent = 'Passage Complete!';
        completeTitle.style.color = 'var(--primary)';
        completeTitle.style.marginBottom = '15px';
        completeDiv.appendChild(completeTitle);

        var statsRow = document.createElement('div');
        statsRow.style.display = 'flex';
        statsRow.style.justifyContent = 'center';
        statsRow.style.gap = '30px';
        statsRow.style.marginBottom = '20px';

        var finalStats = [
            { label: 'WPM', value: String(wpm) },
            { label: 'Accuracy', value: accuracy + '%' }
        ];

        for (var s = 0; s < finalStats.length; s++) {
            var statDiv = document.createElement('div');
            statDiv.style.textAlign = 'center';

            var valEl = document.createElement('div');
            valEl.style.fontSize = '1.8em';
            valEl.style.fontWeight = 'bold';
            valEl.style.color = 'var(--primary)';
            valEl.textContent = finalStats[s].value;
            statDiv.appendChild(valEl);

            var labelEl = document.createElement('div');
            labelEl.style.fontSize = '0.9em';
            labelEl.style.color = '#999';
            labelEl.textContent = finalStats[s].label;
            statDiv.appendChild(labelEl);

            statsRow.appendChild(statDiv);
        }

        completeDiv.appendChild(statsRow);

        // Try Again button
        var self = this;
        var tryAgainBtn = document.createElement('button');
        tryAgainBtn.className = 'nav-button';
        tryAgainBtn.style.background = 'var(--primary)';
        tryAgainBtn.style.color = 'white';
        tryAgainBtn.style.fontSize = '1.1em';
        tryAgainBtn.style.padding = '10px 25px';

        var icon = document.createElement('i');
        icon.className = 'fas fa-redo';
        tryAgainBtn.appendChild(icon);
        tryAgainBtn.appendChild(document.createTextNode(' Try Again'));

        tryAgainBtn.addEventListener('click', function() {
            self._startPassage(self._selectedCategory);
        });

        completeDiv.appendChild(tryAgainBtn);
        passageArea.appendChild(completeDiv);

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
