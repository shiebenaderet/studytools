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
    _questions: null,
    _shuffleMaps: {},

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

    render(container, config) {
        this._container = container;
        this._questions = this._shuffleArray((config.practiceQuestions || []).slice());
        this._currentIndex = 0;
        this._submitted = false;
        this._shuffleMaps = {};
        this._answers = {};

        const wrapper = document.createElement('div');
        wrapper.className = 'practice-container';
        container.appendChild(wrapper);

        this.displayQuestion();
    },

    displayQuestion() {
        var wrapper = this._container.querySelector('.practice-container');
        if (!wrapper) return;
        wrapper.textContent = '';

        if (this._submitted) {
            this._renderScore(wrapper);
            return;
        }

        var questions = this._questions;
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
        this._saveProgress();
        this.displayQuestion();
    },

    nextQuestion() {
        if (this._currentIndex < this._questions.length - 1) {
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
        return selectedOrigIdx === this._questions[questionIdx].correct;
    },

    finishTest() {
        this._submitted = true;
        this._saveProgress();

        // Calculate score for achievements
        var questions = this._questions;
        var correct = 0;
        for (var i = 0; i < questions.length; i++) {
            if (this._isAnswerCorrect(i)) {
                correct++;
            }
        }
        var pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

        if (typeof AchievementManager !== 'undefined') {
            AchievementManager.checkAndAward({ activity: 'test', score: pct, event: pct === 100 ? 'perfect' : 'complete', totalCorrect: correct });
        }

        this.displayQuestion();
    },

    _renderScore(wrapper) {
        var questions = this._questions;
        var correct = 0;
        for (var i = 0; i < questions.length; i++) {
            if (this._isAnswerCorrect(i)) {
                correct++;
            }
        }

        var pct = Math.round((correct / questions.length) * 100);

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

        // Review section - show each question with result
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

            wrapper.appendChild(reviewItem);
        }

        // Reset button
        var navEl = document.createElement('div');
        navEl.className = 'flashcard-nav';

        var resetBtn = document.createElement('button');
        resetBtn.className = 'nav-button';
        resetBtn.textContent = 'Retake Test';
        resetBtn.addEventListener('click', this.resetTest.bind(this));
        navEl.appendChild(resetBtn);

        wrapper.appendChild(navEl);
    },

    resetTest() {
        this._answers = {};
        this._submitted = false;
        this._currentIndex = 0;
        this._shuffleArray(this._questions);
        this._saveProgress();
        this.displayQuestion();
    },

    _saveProgress() {
        ProgressManager.saveActivityProgress(StudyEngine.config.unit.id, 'practice-test', {
            answered: this._answers,
            submitted: this._submitted,
            currentIndex: this._currentIndex
        });
    },

    activate() {
        var self = this;
        this._keyHandler = function(e) {
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
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
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'practice-test');
    },

    loadProgress(data) {
        if (data && data.answered) {
            this._answers = data.answered;
        }
        if (data && data.submitted) {
            this._submitted = data.submitted;
        }
        if (data && data.currentIndex !== undefined) {
            this._currentIndex = data.currentIndex;
        }
    }
});
