StudyEngine.registerActivity({
    id: 'fill-in-blank',
    name: 'Fill in the Blank',
    icon: 'fas fa-puzzle-piece',
    description: 'Use vocabulary terms to complete sentences',
    category: 'study',
    requires: ['fillInBlankSentences'],
    _container: null,
    _config: null,
    _sentences: [],
    _currentIndex: 0,
    _answers: {},
    _checked: false,
    _bestScore: 0,
    _attempts: 0,
    _mode: 'bank',
    _uniqueAnswers: [],
    _selectedTerm: null,

    render(container, config) {
        this._container = container;
        this._config = config;
        this._currentIndex = 0;
        this._answers = {};
        this._checked = false;
        this._selectedTerm = null;

        const sentences = MasteryManager.getUnlockedFillInBlanks(config.unit.id, config);
        if (!sentences || sentences.length === 0) return;

        // Shuffle sentences
        this._sentences = [...sentences];
        for (let i = this._sentences.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this._sentences[i], this._sentences[j]] = [this._sentences[j], this._sentences[i]];
        }

        // Load saved progress
        const saved = ProgressManager.getActivityProgress(config.unit.id, 'fill-in-blank');
        this._bestScore = saved?.bestScore || 0;
        this._attempts = saved?.attempts || 0;

        // Build unique answers for word bank
        const seen = new Set();
        this._uniqueAnswers = [];
        this._sentences.forEach(s => {
            const lower = s.answer.toLowerCase();
            if (!seen.has(lower)) {
                seen.add(lower);
                this._uniqueAnswers.push(s.answer);
            }
        });
        for (let i = this._uniqueAnswers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this._uniqueAnswers[i], this._uniqueAnswers[j]] = [this._uniqueAnswers[j], this._uniqueAnswers[i]];
        }

        container.textContent = '';
        this._renderModeSelector(container);
    },

    _renderModeSelector(container) {
        var wrapper = document.createElement('div');
        wrapper.className = 'fib-container';

        var heading = document.createElement('h2');
        heading.className = 'fib-heading';
        heading.textContent = 'Fill in the Blank';
        wrapper.appendChild(heading);

        var desc = document.createElement('p');
        desc.className = 'fib-mode-desc';
        desc.textContent = 'How do you want to answer?';
        wrapper.appendChild(desc);

        var btnRow = document.createElement('div');
        btnRow.className = 'fib-mode-row';

        var bankIcon = document.createElement('i');
        bankIcon.className = 'fas fa-hand-pointer';
        var bankBtn = document.createElement('button');
        bankBtn.className = 'fib-mode-btn';
        bankBtn.appendChild(bankIcon);
        bankBtn.appendChild(document.createTextNode(' Word Bank'));
        bankBtn.addEventListener('click', () => {
            this._mode = 'bank';
            this._startQuiz();
        });

        var typeIcon = document.createElement('i');
        typeIcon.className = 'fas fa-keyboard';
        var typeBtn = document.createElement('button');
        typeBtn.className = 'fib-mode-btn';
        typeBtn.appendChild(typeIcon);
        typeBtn.appendChild(document.createTextNode(' Type It'));
        typeBtn.addEventListener('click', () => {
            this._mode = 'type';
            this._startQuiz();
        });

        btnRow.appendChild(bankBtn);
        btnRow.appendChild(typeBtn);
        wrapper.appendChild(btnRow);

        var hint = document.createElement('p');
        hint.className = 'fib-mode-hint';
        hint.textContent = 'Word Bank: tap a word, then tap the blank. Type It: type your answer.';
        wrapper.appendChild(hint);

        container.appendChild(wrapper);
    },

    _startQuiz() {
        this._currentIndex = 0;
        this._answers = {};
        this._checked = false;
        this._selectedTerm = null;
        this._renderQuestion();
    },

    _renderQuestion() {
        var container = this._container;
        container.textContent = '';

        var total = this._sentences.length;
        var idx = this._currentIndex;
        var item = this._sentences[idx];
        var self = this;

        var wrapper = document.createElement('div');
        wrapper.className = 'fib-container';

        // Progress bar
        var progressRow = document.createElement('div');
        progressRow.className = 'fib-progress-row';

        var progressText = document.createElement('span');
        progressText.className = 'fib-progress-text';
        progressText.textContent = (idx + 1) + ' of ' + total;
        progressRow.appendChild(progressText);

        var progressBar = document.createElement('div');
        progressBar.className = 'fib-progress-bar';
        var progressFill = document.createElement('div');
        progressFill.className = 'fib-progress-fill';
        progressFill.style.width = Math.round(((idx + 1) / total) * 100) + '%';
        progressBar.appendChild(progressFill);
        progressRow.appendChild(progressBar);

        wrapper.appendChild(progressRow);

        // Sentence card
        var card = document.createElement('div');
        card.className = 'fib-sentence-card fib-single';

        var parts = item.sentence.split('___');
        for (var p = 0; p < parts.length; p++) {
            var textSpan = document.createElement('span');
            textSpan.textContent = parts[p];
            card.appendChild(textSpan);

            if (p < parts.length - 1) {
                var slot = document.createElement('span');
                slot.className = 'blank-slot';
                slot.id = 'fib-slot-0';
                slot.textContent = self._answers[idx] || '\u00A0\u00A0\u00A0\u00A0\u00A0';
                if (self._answers[idx]) slot.classList.add('filled');
                slot.addEventListener('click', (function() {
                    if (self._checked) return;
                    if (self._mode === 'bank') {
                        if (self._selectedTerm && !self._answers[idx]) {
                            // Place selected term
                            self._answers[idx] = self._selectedTerm;
                            self._selectedTerm = null;
                            self._renderQuestion();
                        } else if (self._answers[idx]) {
                            // Remove placed term
                            delete self._answers[idx];
                            self._selectedTerm = null;
                            self._renderQuestion();
                        }
                    }
                }));
                card.appendChild(slot);
            }
        }

        wrapper.appendChild(card);

        // Answer input area
        if (self._mode === 'type') {
            var inputRow = document.createElement('div');
            inputRow.className = 'fib-type-row';

            var input = document.createElement('input');
            input.type = 'text';
            input.className = 'fib-type-input';
            input.placeholder = 'Type your answer...';
            input.id = 'fib-type-input';
            input.value = self._answers[idx] || '';
            input.addEventListener('input', function() {
                self._answers[idx] = input.value.trim();
                var s = document.getElementById('fib-slot-0');
                if (s) {
                    s.textContent = input.value.trim() || '\u00A0\u00A0\u00A0\u00A0\u00A0';
                    s.classList.toggle('filled', !!input.value.trim());
                }
            });
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && self._answers[idx]) {
                    self._nextQuestion();
                }
            });

            inputRow.appendChild(input);
            wrapper.appendChild(inputRow);

            setTimeout(function() { input.focus(); }, 50);
        } else {
            // Word bank
            var wordBank = document.createElement('div');
            wordBank.className = 'word-bank';

            var bankTitle = document.createElement('div');
            bankTitle.className = 'word-bank-title';
            var handIcon = document.createElement('i');
            handIcon.className = 'fas fa-hand-pointer';
            bankTitle.appendChild(handIcon);
            bankTitle.appendChild(document.createTextNode(' Tap a word, then tap the blank'));
            wordBank.appendChild(bankTitle);

            var bankTerms = document.createElement('div');
            bankTerms.className = 'word-bank-terms';

            // Figure out which terms are already used
            var usedTerms = {};
            Object.values(self._answers).forEach(function(a) {
                var lower = a.toLowerCase();
                usedTerms[lower] = (usedTerms[lower] || 0) + 1;
            });

            self._uniqueAnswers.forEach(function(answer) {
                var btn = document.createElement('button');
                btn.className = 'word-bank-term';
                btn.textContent = answer;
                btn.dataset.term = answer;

                var lower = answer.toLowerCase();
                var availableCount = self._sentences.filter(function(s) { return s.answer.toLowerCase() === lower; }).length;
                var usedCount = usedTerms[lower] || 0;
                if (usedCount >= availableCount) {
                    btn.classList.add('used');
                }

                btn.addEventListener('click', function() {
                    if (btn.classList.contains('used')) return;

                    bankTerms.querySelectorAll('.word-bank-term').forEach(function(b) { b.classList.remove('selected'); });

                    if (!self._answers[idx]) {
                        self._answers[idx] = answer;
                        self._selectedTerm = null;
                        self._renderQuestion();
                    } else {
                        btn.classList.add('selected');
                        self._selectedTerm = answer;
                    }
                });

                bankTerms.appendChild(btn);
            });

            wordBank.appendChild(bankTerms);
            wrapper.appendChild(wordBank);
        }

        // Navigation buttons
        var navRow = document.createElement('div');
        navRow.className = 'fib-nav-row';

        if (idx > 0) {
            var prevIcon = document.createElement('i');
            prevIcon.className = 'fas fa-arrow-left';
            var prevBtn = document.createElement('button');
            prevBtn.className = 'nav-button fib-nav-btn';
            prevBtn.appendChild(prevIcon);
            prevBtn.appendChild(document.createTextNode(' Previous'));
            prevBtn.addEventListener('click', function() {
                self._currentIndex--;
                self._renderQuestion();
            });
            navRow.appendChild(prevBtn);
        } else {
            navRow.appendChild(document.createElement('span'));
        }

        if (idx < total - 1) {
            var nextBtn = document.createElement('button');
            nextBtn.className = 'nav-button fib-nav-btn';
            nextBtn.appendChild(document.createTextNode('Next '));
            var nextIcon = document.createElement('i');
            nextIcon.className = 'fas fa-arrow-right';
            nextBtn.appendChild(nextIcon);
            if (!self._answers[idx]) nextBtn.classList.add('fib-btn-disabled');
            nextBtn.addEventListener('click', function() { self._nextQuestion(); });
            navRow.appendChild(nextBtn);
        } else {
            var checkIcon = document.createElement('i');
            checkIcon.className = 'fas fa-check-circle';
            var checkBtn = document.createElement('button');
            checkBtn.className = 'nav-button fib-nav-btn fib-check-btn';
            checkBtn.appendChild(checkIcon);
            checkBtn.appendChild(document.createTextNode(' Check Answers'));
            checkBtn.addEventListener('click', function() { self._checkAllAnswers(); });
            navRow.appendChild(checkBtn);
        }

        wrapper.appendChild(navRow);

        // Dot indicators
        var dots = document.createElement('div');
        dots.className = 'fib-dots';
        for (var i = 0; i < total; i++) {
            var dot = document.createElement('span');
            dot.className = 'fib-dot';
            if (i === idx) dot.classList.add('active');
            if (self._answers[i]) dot.classList.add('answered');
            (function(di) {
                dot.addEventListener('click', function() {
                    self._currentIndex = di;
                    self._renderQuestion();
                });
            })(i);
            dots.appendChild(dot);
        }
        wrapper.appendChild(dots);

        container.appendChild(wrapper);
    },

    _nextQuestion() {
        if (this._currentIndex < this._sentences.length - 1) {
            this._currentIndex++;
            this._renderQuestion();
        }
    },

    _checkAllAnswers() {
        this._checked = true;
        var container = this._container;
        container.textContent = '';

        var total = this._sentences.length;
        var correct = 0;
        var self = this;

        var wrapper = document.createElement('div');
        wrapper.className = 'fib-container';

        var heading = document.createElement('h2');
        heading.className = 'fib-heading';
        heading.textContent = 'Results';
        wrapper.appendChild(heading);

        var list = document.createElement('div');
        list.className = 'fib-results-list';

        this._sentences.forEach(function(item, index) {
            var row = document.createElement('div');
            row.className = 'fib-result-row';

            var placed = self._answers[index] || '';
            var isCorrect = placed.toLowerCase() === item.answer.toLowerCase();
            if (isCorrect) correct++;

            row.classList.add(isCorrect ? 'fib-result-correct' : 'fib-result-incorrect');

            var numSpan = document.createElement('span');
            numSpan.className = 'fib-result-num';
            numSpan.textContent = (index + 1) + '.';
            row.appendChild(numSpan);

            var contentDiv = document.createElement('div');
            contentDiv.className = 'fib-result-content';

            var parts = item.sentence.split('___');
            var sentenceSpan = document.createElement('div');
            sentenceSpan.className = 'fib-result-sentence';
            for (var p = 0; p < parts.length; p++) {
                sentenceSpan.appendChild(document.createTextNode(parts[p]));
                if (p < parts.length - 1) {
                    var answerSpan = document.createElement('span');
                    answerSpan.className = isCorrect ? 'fib-answer-correct' : 'fib-answer-incorrect';
                    answerSpan.textContent = placed || '(empty)';
                    sentenceSpan.appendChild(answerSpan);
                }
            }
            contentDiv.appendChild(sentenceSpan);

            if (!isCorrect) {
                var correctLabel = document.createElement('div');
                correctLabel.className = 'fib-correct-label';
                correctLabel.textContent = 'Correct: ' + item.answer;
                contentDiv.appendChild(correctLabel);
            }

            row.appendChild(contentDiv);

            var icon = document.createElement('span');
            icon.className = 'fib-result-icon';
            var iconEl = document.createElement('i');
            iconEl.className = isCorrect ? 'fas fa-check' : 'fas fa-times';
            icon.appendChild(iconEl);
            row.appendChild(icon);

            list.appendChild(row);
        });

        wrapper.appendChild(list);

        // Score summary
        var scoreDiv = document.createElement('div');
        scoreDiv.className = 'fib-score-summary';

        var pct = total > 0 ? Math.round((correct / total) * 100) : 0;
        var scoreText = document.createElement('div');
        scoreText.className = 'fib-score-big';
        scoreText.style.color = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning, #f59e0b)' : 'var(--error)';
        scoreText.textContent = correct + '/' + total + ' (' + pct + '%)';
        scoreDiv.appendChild(scoreText);

        if (correct === total) {
            var perfect = document.createElement('div');
            perfect.className = 'fib-perfect';
            perfect.textContent = 'Perfect score!';
            scoreDiv.appendChild(perfect);
        } else {
            var feedbackMsg = document.createElement('div');
            feedbackMsg.className = 'fib-feedback-msg';
            feedbackMsg.textContent = 'Missed terms have been sent back to your flashcards for review.';
            scoreDiv.appendChild(feedbackMsg);
        }

        wrapper.appendChild(scoreDiv);

        // Retry button
        var btnRow = document.createElement('div');
        btnRow.className = 'fib-nav-row';

        var retryIcon = document.createElement('i');
        retryIcon.className = 'fas fa-redo';
        var retryBtn = document.createElement('button');
        retryBtn.className = 'nav-button fib-nav-btn';
        retryBtn.appendChild(retryIcon);
        retryBtn.appendChild(document.createTextNode(' Try Again'));
        retryBtn.addEventListener('click', function() { self.reset(); });
        btnRow.appendChild(retryBtn);

        wrapper.appendChild(btnRow);

        container.appendChild(wrapper);

        // Save progress
        this._attempts++;
        if (pct > this._bestScore) this._bestScore = pct;

        // Track wrong answers in weakness tracker and flashcards
        this._trackWrongAnswers();

        if (typeof AchievementManager !== 'undefined') {
            AchievementManager.checkAndAward({ activity: 'fill-in-blank', score: pct, event: correct === total ? 'perfect' : 'complete', totalCorrect: correct });
        }

        this._saveProgress();
    },

    _trackWrongAnswers() {
        var config = this._config;
        if (!config || !config.vocabulary) return;
        var unitId = config.unit.id;
        var vocab = config.vocabulary;
        var self = this;

        // Collect wrong answer terms
        var wrongTerms = [];
        this._sentences.forEach(function(item, index) {
            var placed = self._answers[index] || '';
            if (placed.toLowerCase() !== item.answer.toLowerCase()) {
                wrongTerms.push(item.answer);
            }
        });

        if (wrongTerms.length === 0) return;

        // Update weakness tracker
        var weakData = ProgressManager.load(unitId, 'weakness_tracker') || { terms: {} };
        for (var i = 0; i < wrongTerms.length; i++) {
            // Find matching vocab term (case-insensitive)
            for (var j = 0; j < vocab.length; j++) {
                if (vocab[j].term.toLowerCase() === wrongTerms[i].toLowerCase()) {
                    weakData.terms[vocab[j].term] = (weakData.terms[vocab[j].term] || 0) + 1;
                }
            }
        }
        ProgressManager.save(unitId, 'weakness_tracker', weakData);

        // Mark wrong terms in flashcards as 'again'
        var fcProgress = ProgressManager.getActivityProgress(unitId, 'flashcards') || {};
        var mastered = fcProgress.mastered ? fcProgress.mastered.slice() : [];
        var ratings = fcProgress.ratings ? Object.assign({}, fcProgress.ratings) : {};
        var changed = false;

        for (var i = 0; i < wrongTerms.length; i++) {
            for (var j = 0; j < vocab.length; j++) {
                if (vocab[j].term.toLowerCase() === wrongTerms[i].toLowerCase()) {
                    ratings[vocab[j].term] = 'again';
                    var mIdx = mastered.indexOf(vocab[j].term);
                    if (mIdx !== -1) {
                        mastered.splice(mIdx, 1);
                    }
                    changed = true;
                }
            }
        }

        if (changed) {
            ProgressManager.saveActivityProgress(unitId, 'flashcards', {
                mastered: mastered,
                ratings: ratings
            });
        }
    },

    _saveProgress() {
        ProgressManager.saveActivityProgress(StudyEngine.config.unit.id, 'fill-in-blank', {
            bestScore: this._bestScore,
            attempts: this._attempts
        });
    },

    reset() {
        if (this._container && this._config) {
            this.render(this._container, this._config);
        }
    },

    activate() {},
    deactivate() {},

    getProgress() {
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'fill-in-blank');
    },

    loadProgress(data) {
        if (data) {
            this._bestScore = data.bestScore || 0;
            this._attempts = data.attempts || 0;
        }
    }
});
