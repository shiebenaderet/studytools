StudyEngine.registerActivity({
    id: 'practice-test',
    name: 'Practice Test',
    icon: 'fas fa-pencil',
    description: 'Take a multiple-choice practice test covering all topics',
    category: 'practice',
    requires: ['practiceQuestions'],

    _currentIndex: 0,
    _answers: {},
    _submitted: false,
    _keyHandler: null,
    _container: null,
    _config: null,
    _questions: null,
    _sessionQuestions: null,
    _shuffleMaps: {},
    _masteryData: null,

    QUESTIONS_PER_SESSION: 10,

    _shuffleArray(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
        return arr;
    },

    _getShuffleMap(index, q) {
        if (this._shuffleMaps[index]) return this._shuffleMaps[index];
        var indices = q.options.map(function(_, i) { return i; });
        this._shuffleArray(indices);
        this._shuffleMaps[index] = indices;
        return indices;
    },

    /**
     * Load persistent mastery data: which question indices have been answered correctly at least once.
     * Stored as { mastered: [questionIndex, ...], wrong: [questionIndex, ...], sessions: number }
     * Question indices refer to the FULL question pool (config.practiceQuestions).
     */
    _loadMasteryData() {
        var unitId = this._config.unit.id;
        var data = ProgressManager.getActivityProgress(unitId, 'practice-test-mastery');
        if (!data) {
            data = { mastered: [], wrong: [], sessions: 0 };
        }
        this._masteryData = data;
    },

    _saveMasteryData() {
        var unitId = this._config.unit.id;
        ProgressManager.saveActivityProgress(unitId, 'practice-test-mastery', this._masteryData);
    },

    /**
     * Build a question identifier from its text (first 80 chars) for stable tracking
     * across sessions even if question order changes in config.
     */
    _questionId(q) {
        return (q.question || '').substring(0, 80);
    },

    /**
     * Select questions for this session. Prioritize unmastered questions,
     * then fill with random mastered ones if needed.
     */
    _selectSessionQuestions() {
        var allQuestions = MasteryManager.getUnlockedQuestions(this._config.unit.id, this._config, 'practiceQuestions') || [];
        var masteredIds = this._masteryData.mastered || [];
        var self = this;

        var unmastered = [];
        var mastered = [];
        for (var i = 0; i < allQuestions.length; i++) {
            var qId = this._questionId(allQuestions[i]);
            if (masteredIds.indexOf(qId) !== -1) {
                mastered.push(allQuestions[i]);
            } else {
                unmastered.push(allQuestions[i]);
            }
        }

        this._shuffleArray(unmastered);
        this._shuffleArray(mastered);

        var selected = [];
        var count = Math.min(this.QUESTIONS_PER_SESSION, allQuestions.length);

        // Prioritize unmastered
        for (var i = 0; i < unmastered.length && selected.length < count; i++) {
            selected.push(unmastered[i]);
        }
        // Fill remaining with mastered (review)
        for (var i = 0; i < mastered.length && selected.length < count; i++) {
            selected.push(mastered[i]);
        }

        this._shuffleArray(selected);
        return selected;
    },

    render(container, config) {
        this._container = container;
        this._config = config;
        this._currentIndex = 0;
        this._submitted = false;
        this._shuffleMaps = {};
        this._answers = {};

        this._loadMasteryData();

        var allQuestions = MasteryManager.getUnlockedQuestions(config.unit.id, config, 'practiceQuestions') || [];
        this._questions = allQuestions;

        // Check if all mastered
        var masteredIds = this._masteryData.mastered || [];
        var allMastered = allQuestions.length > 0 && allQuestions.every(function(q) {
            return masteredIds.indexOf((q.question || '').substring(0, 80)) !== -1;
        });

        var wrapper = document.createElement('div');
        wrapper.className = 'practice-container';
        container.appendChild(wrapper);

        if (allMastered) {
            this._renderAllMastered(wrapper);
        } else {
            this._sessionQuestions = this._selectSessionQuestions();
            this._renderStartScreen(wrapper);
        }
    },

    _renderStartScreen(wrapper) {
        wrapper.textContent = '';

        var allQuestions = this._questions;
        var masteredCount = 0;
        var masteredIds = this._masteryData.mastered || [];
        for (var i = 0; i < allQuestions.length; i++) {
            if (masteredIds.indexOf(this._questionId(allQuestions[i])) !== -1) {
                masteredCount++;
            }
        }
        var totalCount = allQuestions.length;
        var sessionCount = this._sessionQuestions.length;

        // Mastery progress header
        var progressDiv = document.createElement('div');
        progressDiv.className = 'pt-mastery-header';

        var progressTitle = document.createElement('div');
        progressTitle.className = 'pt-mastery-title';
        progressTitle.textContent = 'Practice Test Progress';
        progressDiv.appendChild(progressTitle);

        var progressBarWrap = document.createElement('div');
        progressBarWrap.className = 'pt-mastery-bar-wrap';
        var progressBar = document.createElement('div');
        progressBar.className = 'pt-mastery-bar';
        var pct = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;
        progressBar.style.width = pct + '%';
        progressBarWrap.appendChild(progressBar);
        progressDiv.appendChild(progressBarWrap);

        var progressLabel = document.createElement('div');
        progressLabel.className = 'pt-mastery-label';
        progressLabel.textContent = masteredCount + ' / ' + totalCount + ' questions mastered (' + pct + '%)';
        progressDiv.appendChild(progressLabel);

        if (this._masteryData.sessions > 0) {
            var sessionsLabel = document.createElement('div');
            sessionsLabel.className = 'pt-sessions-label';
            sessionsLabel.textContent = this._masteryData.sessions + ' test' + (this._masteryData.sessions === 1 ? '' : 's') + ' completed so far';
            progressDiv.appendChild(sessionsLabel);
        }

        wrapper.appendChild(progressDiv);

        // Session info
        var sessionInfo = document.createElement('div');
        sessionInfo.className = 'pt-session-info';

        var unmasteredInSession = 0;
        var self = this;
        for (var i = 0; i < this._sessionQuestions.length; i++) {
            if (masteredIds.indexOf(this._questionId(this._sessionQuestions[i])) === -1) {
                unmasteredInSession++;
            }
        }

        var infoText = document.createElement('div');
        infoText.className = 'pt-info-text';
        infoText.textContent = 'This test has ' + sessionCount + ' questions';
        if (unmasteredInSession > 0 && unmasteredInSession < sessionCount) {
            infoText.textContent += ' (' + unmasteredInSession + ' new, ' + (sessionCount - unmasteredInSession) + ' review)';
        }
        sessionInfo.appendChild(infoText);

        var startBtn = document.createElement('button');
        startBtn.className = 'sa-save-btn';
        var startIcon = document.createElement('i');
        startIcon.className = 'fas fa-play';
        startBtn.appendChild(startIcon);
        startBtn.appendChild(document.createTextNode(' Start Test'));
        startBtn.addEventListener('click', this._startSession.bind(this));
        sessionInfo.appendChild(startBtn);

        wrapper.appendChild(sessionInfo);
    },

    _startSession() {
        this._currentIndex = 0;
        this._answers = {};
        this._submitted = false;
        this._shuffleMaps = {};
        this.displayQuestion();
    },

    _renderAllMastered(wrapper) {
        wrapper.textContent = '';

        var div = document.createElement('div');
        div.className = 'pt-all-mastered';

        var icon = document.createElement('i');
        icon.className = 'fas fa-trophy';
        icon.style.fontSize = '3rem';
        icon.style.color = 'var(--accent)';
        div.appendChild(icon);

        var title = document.createElement('div');
        title.className = 'pt-mastery-title';
        title.style.marginTop = '12px';
        title.textContent = 'All Questions Mastered!';
        div.appendChild(title);

        var sub = document.createElement('div');
        sub.className = 'pt-mastery-label';
        sub.textContent = 'You\'ve answered every question correctly at least once across ' + this._masteryData.sessions + ' test' + (this._masteryData.sessions === 1 ? '' : 's') + '.';
        div.appendChild(sub);

        var btnRow = document.createElement('div');
        btnRow.className = 'sa-btn-row';
        btnRow.style.marginTop = '20px';

        var reviewBtn = document.createElement('button');
        reviewBtn.className = 'sa-save-btn';
        var reviewIcon = document.createElement('i');
        reviewIcon.className = 'fas fa-redo';
        reviewBtn.appendChild(reviewIcon);
        reviewBtn.appendChild(document.createTextNode(' Take Another Test'));
        var self = this;
        reviewBtn.addEventListener('click', function() {
            self._sessionQuestions = self._selectSessionQuestions();
            self._renderStartScreen(wrapper);
        });
        btnRow.appendChild(reviewBtn);

        var resetBtn = document.createElement('button');
        resetBtn.className = 'sa-nav-btn';
        var resetIcon = document.createElement('i');
        resetIcon.className = 'fas fa-trash-alt';
        resetBtn.appendChild(resetIcon);
        resetBtn.appendChild(document.createTextNode(' Reset Progress'));
        resetBtn.addEventListener('click', function() {
            self._masteryData = { mastered: [], wrong: [], sessions: 0 };
            self._saveMasteryData();
            self._sessionQuestions = self._selectSessionQuestions();
            self._renderStartScreen(wrapper);
            StudyUtils.showToast('Practice test progress reset.', 'info');
        });
        btnRow.appendChild(resetBtn);

        div.appendChild(btnRow);
        wrapper.appendChild(div);
    },

    displayQuestion() {
        var wrapper = this._container.querySelector('.practice-container');
        if (!wrapper) return;
        wrapper.textContent = '';

        if (this._submitted) {
            this._renderScore(wrapper);
            return;
        }

        var questions = this._sessionQuestions;
        var index = this._currentIndex;
        var q = questions[index];
        if (!q) return;

        // Question number
        var numberEl = document.createElement('div');
        numberEl.className = 'question-number';
        numberEl.textContent = 'Question ' + (index + 1) + ' of ' + questions.length;
        wrapper.appendChild(numberEl);

        // Topic badge (if present)
        if (q.topic) {
            var topicEl = document.createElement('div');
            topicEl.className = 'question-topic';
            topicEl.textContent = q.topic;
            wrapper.appendChild(topicEl);
        }

        // Question text
        var textEl = document.createElement('div');
        textEl.className = 'question-text';
        textEl.textContent = q.question;
        wrapper.appendChild(textEl);

        // Options
        var optionsContainer = document.createElement('div');
        optionsContainer.className = 'options-container';

        var answered = this._answers.hasOwnProperty(index);
        var selectedIdx = this._answers[index];
        var shuffleMap = this._getShuffleMap(index, q);
        var shuffledCorrect = shuffleMap.indexOf(q.correct);

        for (var i = 0; i < shuffleMap.length; i++) {
            var origIdx = shuffleMap[i];
            var optBtn = document.createElement('button');
            optBtn.className = 'option';
            optBtn.textContent = q.options[origIdx];

            if (answered) {
                optBtn.disabled = true;
                if (i === shuffledCorrect) {
                    optBtn.classList.add('correct');
                }
                if (i === selectedIdx && selectedIdx !== shuffledCorrect) {
                    optBtn.classList.add('incorrect');
                }
            } else {
                optBtn.addEventListener('click', this.selectAnswer.bind(this, i));
            }

            optionsContainer.appendChild(optBtn);
        }

        wrapper.appendChild(optionsContainer);

        // Explanation (shown after answering)
        if (answered && q.explanation) {
            var explEl = document.createElement('div');
            explEl.className = 'explanation';
            explEl.textContent = q.explanation;
            wrapper.appendChild(explEl);
        }

        // "Explain it to me" button (shown after wrong answer)
        if (answered && selectedIdx !== shuffledCorrect) {
            this._renderExplainButton(wrapper, q);
        }

        // Navigation
        var navEl = document.createElement('div');
        navEl.className = 'flashcard-nav';

        var prevBtn = document.createElement('button');
        prevBtn.className = 'nav-button';
        prevBtn.textContent = 'Previous';
        prevBtn.disabled = index === 0;
        prevBtn.addEventListener('click', this.previousQuestion.bind(this));
        navEl.appendChild(prevBtn);

        // Submit button (only when all questions answered)
        var answeredCount = Object.keys(this._answers).length;
        if (answeredCount === questions.length) {
            var submitBtn = document.createElement('button');
            submitBtn.className = 'nav-button';
            submitBtn.textContent = 'Submit Test';
            submitBtn.addEventListener('click', this.finishTest.bind(this));
            navEl.appendChild(submitBtn);
        }

        var nextBtn = document.createElement('button');
        nextBtn.className = 'nav-button';
        nextBtn.textContent = 'Next';
        nextBtn.disabled = index === questions.length - 1;
        nextBtn.addEventListener('click', this.nextQuestion.bind(this));
        navEl.appendChild(nextBtn);

        wrapper.appendChild(navEl);
    },

    selectAnswer(index) {
        if (this._submitted) return;
        if (this._answers.hasOwnProperty(this._currentIndex)) return;

        this._answers[this._currentIndex] = index;
        this.displayQuestion();
    },

    nextQuestion() {
        if (this._currentIndex < this._sessionQuestions.length - 1) {
            this._currentIndex++;
            this.displayQuestion();
        }
    },

    previousQuestion() {
        if (this._currentIndex > 0) {
            this._currentIndex--;
            this.displayQuestion();
        }
    },

    _isAnswerCorrect(questionIdx) {
        if (!this._answers.hasOwnProperty(questionIdx)) return false;
        var shuffleMap = this._shuffleMaps[questionIdx];
        if (!shuffleMap) return false;
        var selectedDisplayIdx = this._answers[questionIdx];
        var selectedOrigIdx = shuffleMap[selectedDisplayIdx];
        return selectedOrigIdx === this._sessionQuestions[questionIdx].correct;
    },

    finishTest() {
        this._submitted = true;

        var questions = this._sessionQuestions;
        var correct = 0;
        var wrongQuestions = [];

        for (var i = 0; i < questions.length; i++) {
            var qId = this._questionId(questions[i]);
            if (this._isAnswerCorrect(i)) {
                correct++;
                // Mark as mastered if not already
                if (this._masteryData.mastered.indexOf(qId) === -1) {
                    this._masteryData.mastered.push(qId);
                }
                // Remove from wrong list if previously wrong
                var wrongIdx = this._masteryData.wrong.indexOf(qId);
                if (wrongIdx !== -1) {
                    this._masteryData.wrong.splice(wrongIdx, 1);
                }
            } else {
                wrongQuestions.push(questions[i]);
                // Add to wrong list if not already there
                if (this._masteryData.wrong.indexOf(qId) === -1) {
                    this._masteryData.wrong.push(qId);
                }
            }
        }

        this._masteryData.sessions = (this._masteryData.sessions || 0) + 1;
        this._saveMasteryData();

        // Feed wrong answers back to flashcard ratings
        this._markWrongTermsInFlashcards(wrongQuestions);

        var pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

        // Save best test score for leaderboard
        var unitId = this._config.unit.id;
        var existing = ProgressManager.getActivityProgress(unitId, 'practice-test') || {};
        var prevBest = typeof existing.bestScore === 'number' ? existing.bestScore : 0;
        ProgressManager.saveActivityProgress(unitId, 'practice-test', {
            ...existing,
            bestScore: Math.max(prevBest, pct),
            lastScore: pct,
            sessions: this._masteryData.sessions
        });

        if (typeof AchievementManager !== 'undefined') {
            AchievementManager.checkAndAward({ activity: 'test', score: pct, event: pct === 100 ? 'perfect' : 'complete', totalCorrect: correct });
        }

        this.displayQuestion();
    },

    /**
     * When a student gets a practice test question wrong, mark the related
     * vocabulary terms as 'again' in flashcard ratings and remove them from
     * the mastered list. This pushes those cards back into active study.
     */
    _markWrongTermsInFlashcards(wrongQuestions) {
        var config = this._config;
        if (!config || !config.vocabulary) return;
        var unitId = config.unit.id;
        var missedTerms = [];

        for (var i = 0; i < wrongQuestions.length; i++) {
            var q = wrongQuestions[i];

            if (q.topic) {
                for (var j = 0; j < config.vocabulary.length; j++) {
                    if (config.vocabulary[j].category === q.topic) {
                        missedTerms.push(config.vocabulary[j].term);
                    }
                }
            } else {
                var correctText = q.options[q.correct].toLowerCase();
                for (var j = 0; j < config.vocabulary.length; j++) {
                    var v = config.vocabulary[j];
                    if (v.term.toLowerCase() === correctText || correctText.indexOf(v.term.toLowerCase()) !== -1) {
                        missedTerms.push(v.term);
                    }
                }
            }
        }

        if (typeof NudgeManager !== 'undefined') {
            NudgeManager.trackMissedTerms(unitId, config, missedTerms);
        }
    },

    _renderExplainButton(parent, q) {
        var config = this._config;
        if (!config || !config.vocabulary) return;
        var relatedTerms = [];
        if (q.topic) {
            for (var i = 0; i < config.vocabulary.length; i++) {
                var v = config.vocabulary[i];
                if (v.category === q.topic && v.simpleExplanation) {
                    relatedTerms.push(v);
                }
            }
        }
        if (relatedTerms.length === 0) {
            var correctText = q.options[q.correct].toLowerCase();
            for (var i = 0; i < config.vocabulary.length; i++) {
                var v = config.vocabulary[i];
                if (v.simpleExplanation && correctText.indexOf(v.term.toLowerCase()) !== -1) {
                    relatedTerms.push(v);
                }
            }
        }
        if (relatedTerms.length === 0) return;

        var explainBtn = document.createElement('button');
        explainBtn.className = 'fc-explain-btn';
        var bulbIcon = document.createElement('i');
        bulbIcon.className = 'fas fa-lightbulb';
        explainBtn.appendChild(bulbIcon);
        explainBtn.appendChild(document.createTextNode(' Explain it to me'));

        var explainBox = document.createElement('div');
        explainBox.className = 'fc-explain-box';
        explainBox.style.display = 'none';

        for (var i = 0; i < relatedTerms.length && i < 3; i++) {
            var termDiv = document.createElement('div');
            if (i > 0) termDiv.style.marginTop = '8px';
            var termBold = document.createElement('strong');
            termBold.textContent = relatedTerms[i].term + ': ';
            termDiv.appendChild(termBold);
            termDiv.appendChild(document.createTextNode(relatedTerms[i].simpleExplanation));
            explainBox.appendChild(termDiv);
        }

        explainBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var showing = explainBox.style.display !== 'none';
            explainBox.style.display = showing ? 'none' : 'block';
            explainBtn.classList.toggle('active', !showing);
        });

        parent.appendChild(explainBtn);
        parent.appendChild(explainBox);
    },

    _renderScore(wrapper) {
        var questions = this._sessionQuestions;
        var correct = 0;
        for (var i = 0; i < questions.length; i++) {
            if (this._isAnswerCorrect(i)) {
                correct++;
            }
        }

        var pct = Math.round((correct / questions.length) * 100);

        // Overall mastery progress
        var allQuestions = this._questions;
        var masteredIds = this._masteryData.mastered || [];
        var totalMastered = 0;
        for (var i = 0; i < allQuestions.length; i++) {
            if (masteredIds.indexOf(this._questionId(allQuestions[i])) !== -1) {
                totalMastered++;
            }
        }
        var totalPct = allQuestions.length > 0 ? Math.round((totalMastered / allQuestions.length) * 100) : 0;

        // Score
        var scoreDiv = document.createElement('div');
        scoreDiv.className = 'test-score';

        var valueEl = document.createElement('div');
        valueEl.className = 'test-score-value';
        valueEl.textContent = pct + '%';
        scoreDiv.appendChild(valueEl);

        var labelEl = document.createElement('div');
        labelEl.className = 'test-score-label';
        labelEl.textContent = correct + ' out of ' + questions.length + ' correct';
        scoreDiv.appendChild(labelEl);

        wrapper.appendChild(scoreDiv);

        // Overall mastery bar
        var masteryDiv = document.createElement('div');
        masteryDiv.className = 'pt-mastery-header';
        masteryDiv.style.marginTop = '16px';

        var masteryBarWrap = document.createElement('div');
        masteryBarWrap.className = 'pt-mastery-bar-wrap';
        var masteryBar = document.createElement('div');
        masteryBar.className = 'pt-mastery-bar';
        masteryBar.style.width = totalPct + '%';
        masteryBarWrap.appendChild(masteryBar);
        masteryDiv.appendChild(masteryBarWrap);

        var masteryLabel = document.createElement('div');
        masteryLabel.className = 'pt-mastery-label';
        masteryLabel.textContent = 'Overall: ' + totalMastered + ' / ' + allQuestions.length + ' questions mastered (' + totalPct + '%)';
        masteryDiv.appendChild(masteryLabel);

        wrapper.appendChild(masteryDiv);

        // Feedback message
        if (pct === 100) {
            var msg = document.createElement('div');
            msg.className = 'pt-feedback-msg pt-feedback-perfect';
            msg.textContent = 'Perfect score! Keep it up!';
            wrapper.appendChild(msg);
        } else if (correct < questions.length) {
            var wrongCount = questions.length - correct;
            var msg = document.createElement('div');
            msg.className = 'pt-feedback-msg pt-feedback-study';
            var msgIcon = document.createElement('i');
            msgIcon.className = 'fas fa-book-open';
            msg.appendChild(msgIcon);
            msg.appendChild(document.createTextNode(' ' + wrongCount + ' missed question' + (wrongCount === 1 ? '' : 's') + ' sent back to your flashcards for review.'));
            wrapper.appendChild(msg);
        }

        // Review section
        for (var i = 0; i < questions.length; i++) {
            var q = questions[i];
            var isCorrect = this._isAnswerCorrect(i);
            var shuffleMap = this._shuffleMaps[i] || [];
            var selectedOrigIdx = shuffleMap[this._answers[i]];

            var reviewItem = document.createElement('div');
            reviewItem.className = 'question-review';

            var numEl = document.createElement('div');
            numEl.className = 'question-number';
            numEl.textContent = 'Question ' + (i + 1);
            reviewItem.appendChild(numEl);

            var textEl = document.createElement('div');
            textEl.className = 'question-text';
            textEl.textContent = q.question;
            reviewItem.appendChild(textEl);

            var resultEl = document.createElement('div');
            resultEl.className = isCorrect ? 'option correct' : 'option incorrect';
            resultEl.textContent = isCorrect
                ? 'Correct: ' + q.options[q.correct]
                : 'Your answer: ' + (q.options[selectedOrigIdx] || '(none)') + ' | Correct: ' + q.options[q.correct];
            reviewItem.appendChild(resultEl);

            if (q.explanation) {
                var explEl = document.createElement('div');
                explEl.className = 'explanation';
                explEl.textContent = q.explanation;
                reviewItem.appendChild(explEl);
            }

            if (!isCorrect) {
                this._renderExplainButton(reviewItem, q);
            }

            wrapper.appendChild(reviewItem);
        }

        // Action buttons
        var navEl = document.createElement('div');
        navEl.className = 'flashcard-nav';

        var nextTestBtn = document.createElement('button');
        nextTestBtn.className = 'nav-button';
        var nextIcon = document.createElement('i');
        nextIcon.className = 'fas fa-redo';
        nextTestBtn.appendChild(nextIcon);
        nextTestBtn.appendChild(document.createTextNode(' Next Test'));
        var self = this;
        nextTestBtn.addEventListener('click', function() {
            self._sessionQuestions = self._selectSessionQuestions();
            self._currentIndex = 0;
            self._answers = {};
            self._submitted = false;
            self._shuffleMaps = {};

            var allMastered = self._questions.length > 0 && self._questions.every(function(q) {
                return self._masteryData.mastered.indexOf(self._questionId(q)) !== -1;
            });

            if (allMastered) {
                self._renderAllMastered(self._container.querySelector('.practice-container'));
            } else {
                self._renderStartScreen(self._container.querySelector('.practice-container'));
            }
        });
        navEl.appendChild(nextTestBtn);

        wrapper.appendChild(navEl);
    },

    resetTest() {
        this._sessionQuestions = this._selectSessionQuestions();
        this._answers = {};
        this._submitted = false;
        this._currentIndex = 0;
        this._shuffleMaps = {};
        this.displayQuestion();
    },

    activate() {
        var self = this;
        this._keyHandler = function(e) {
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
            if (self._submitted || !self._sessionQuestions) return;
            if (e.key >= '1' && e.key <= '4') self.selectAnswer(parseInt(e.key) - 1);
            if (e.key === 'ArrowRight') self.nextQuestion();
            if (e.key === 'ArrowLeft') self.previousQuestion();
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
        return ProgressManager.getActivityProgress(this._config ? this._config.unit.id : '', 'practice-test');
    },

    loadProgress(data) {}
});
