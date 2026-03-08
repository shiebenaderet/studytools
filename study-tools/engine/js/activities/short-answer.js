StudyEngine.registerActivity({
    id: 'short-answer',
    name: 'Short Answer',
    icon: 'fas fa-pen-fancy',
    description: 'Practice writing short-answer responses with rubrics and exemplars',
    category: 'practice',
    requires: ['shortAnswerQuestions'],

    _activeIndex: -1,

    render(container, config) {
        this.questions = MasteryManager.getUnlockedQuestions(config.unit.id, config, 'shortAnswerQuestions') || [];
        this.unitId = config.unit.id;
        this._activeIndex = -1;

        var wrapper = document.createElement('div');
        wrapper.className = 'short-answer-container';
        wrapper.id = 'sa-wrapper';

        // Question cards grid
        var grid = document.createElement('div');
        grid.className = 'sa-card-grid';
        grid.id = 'sa-card-grid';

        var self = this;
        this.questions.forEach(function(q, i) {
            var saved = ProgressManager.getActivityProgress(self.unitId, 'short-answer-' + i);
            var completed = saved && saved.answer && saved.answer.trim().length > 0;

            var card = document.createElement('button');
            card.className = 'sa-question-card';
            card.dataset.index = i;
            if (completed) card.classList.add('sa-completed');

            var topRow = document.createElement('div');
            topRow.className = 'sa-card-top';

            var num = document.createElement('span');
            num.className = 'sa-card-num';
            num.textContent = (i + 1);
            topRow.appendChild(num);

            if (completed) {
                var check = document.createElement('i');
                check.className = 'fas fa-check-circle sa-card-check';
                topRow.appendChild(check);
            }

            card.appendChild(topRow);

            var topic = document.createElement('div');
            topic.className = 'sa-card-topic';
            topic.textContent = q.topic || 'Question ' + (i + 1);
            card.appendChild(topic);

            var preview = document.createElement('div');
            preview.className = 'sa-card-preview';
            preview.textContent = q.question.length > 90 ? q.question.substring(0, 90) + '...' : q.question;
            card.appendChild(preview);

            card.addEventListener('click', function() {
                self.openQuestion(i);
            });

            grid.appendChild(card);
        });

        wrapper.appendChild(grid);

        // Content area (shows when question is selected)
        var contentArea = document.createElement('div');
        contentArea.id = 'sa-content-area';
        contentArea.className = 'sa-content-area';
        wrapper.appendChild(contentArea);

        container.appendChild(wrapper);
    },

    openQuestion(index) {
        var q = this.questions[index];
        if (!q) return;
        this._activeIndex = index;

        var contentArea = document.getElementById('sa-content-area');
        if (!contentArea) return;
        contentArea.textContent = '';

        // Back button
        var self = this;
        var backBtn = document.createElement('button');
        backBtn.className = 'sa-back-btn';
        var backIcon = document.createElement('i');
        backIcon.className = 'fas fa-arrow-left';
        backBtn.appendChild(backIcon);
        backBtn.appendChild(document.createTextNode(' All Questions'));
        backBtn.addEventListener('click', function() {
            self._activeIndex = -1;
            contentArea.textContent = '';
            contentArea.classList.remove('sa-active');
            document.getElementById('sa-card-grid').style.display = '';
        });
        contentArea.appendChild(backBtn);

        // Question header
        var qHeader = document.createElement('div');
        qHeader.className = 'sa-q-header';
        var qNum = document.createElement('span');
        qNum.className = 'sa-q-num';
        qNum.textContent = 'Question ' + (index + 1) + ' of ' + this.questions.length;
        qHeader.appendChild(qNum);
        var qTopic = document.createElement('span');
        qTopic.className = 'sa-q-topic-badge';
        qTopic.textContent = q.topic || '';
        qHeader.appendChild(qTopic);
        contentArea.appendChild(qHeader);

        // Question text
        var questionDiv = document.createElement('div');
        questionDiv.className = 'sa-question-text';
        questionDiv.textContent = q.question;
        contentArea.appendChild(questionDiv);

        // Key Terms
        if (q.keyTerms && q.keyTerms.length > 0) {
            var termsDiv = document.createElement('div');
            termsDiv.className = 'key-terms-box';

            var termsTitle = document.createElement('div');
            termsTitle.className = 'key-terms-title';
            var termsIcon = document.createElement('i');
            termsIcon.className = 'fas fa-key';
            termsTitle.appendChild(termsIcon);
            termsTitle.appendChild(document.createTextNode(' Key Terms to Use:'));
            termsDiv.appendChild(termsTitle);

            var termsList = document.createElement('div');
            termsList.className = 'key-terms-list';
            q.keyTerms.forEach(function(term) {
                var chip = document.createElement('span');
                chip.className = 'key-term-chip';
                chip.textContent = term;
                termsList.appendChild(chip);
            });
            termsDiv.appendChild(termsList);
            contentArea.appendChild(termsDiv);
        }

        // Connection Pairings
        if (q.connectionPairings && q.connectionPairings.length > 0) {
            var pairDiv = document.createElement('div');
            pairDiv.className = 'connection-pairings';

            var pairTitle = document.createElement('div');
            pairTitle.className = 'connection-pairings-title';
            var pairIcon = document.createElement('i');
            pairIcon.className = 'fas fa-link';
            pairTitle.appendChild(pairIcon);
            pairTitle.appendChild(document.createTextNode(' Choose One Pairing:'));
            pairDiv.appendChild(pairTitle);

            q.connectionPairings.forEach(function(pairing) {
                var item = document.createElement('div');
                item.className = 'connection-pairing-item';
                item.textContent = pairing;
                pairDiv.appendChild(item);
            });
            contentArea.appendChild(pairDiv);
        }

        // Rubric
        var rubricDiv = document.createElement('div');
        rubricDiv.className = 'rubric';

        var rubricTitle = document.createElement('div');
        rubricTitle.className = 'rubric-title';
        var rubricIcon = document.createElement('i');
        rubricIcon.className = 'fas fa-clipboard-check';
        rubricTitle.appendChild(rubricIcon);
        rubricTitle.appendChild(document.createTextNode(' What to Include:'));
        rubricDiv.appendChild(rubricTitle);

        var rubricItems = document.createElement('ul');
        rubricItems.className = 'rubric-items';
        q.rubric.forEach(function(item) {
            var li = document.createElement('li');
            li.className = 'rubric-item';
            li.textContent = item;
            rubricItems.appendChild(li);
        });
        rubricDiv.appendChild(rubricItems);
        contentArea.appendChild(rubricDiv);

        // Sentence starters
        if (q.sentenceStarters && q.sentenceStarters.length > 0) {
            var startersDiv = document.createElement('div');
            startersDiv.className = 'sentence-starters';

            var startersTitle = document.createElement('div');
            startersTitle.className = 'sentence-starters-title';
            var startersIcon = document.createElement('i');
            startersIcon.className = 'fas fa-lightbulb';
            startersTitle.appendChild(startersIcon);
            startersTitle.appendChild(document.createTextNode(' Sentence Starters:'));
            startersDiv.appendChild(startersTitle);

            var starterList = document.createElement('div');
            starterList.className = 'starter-list';
            q.sentenceStarters.forEach(function(starter) {
                var span = document.createElement('span');
                span.className = 'starter';
                span.textContent = starter;
                span.addEventListener('click', function() {
                    var textarea = document.getElementById('sa-answer-text');
                    if (textarea) {
                        var current = textarea.value;
                        if (current.length > 0 && !current.endsWith(' ') && !current.endsWith('\n')) {
                            textarea.value += ' ';
                        }
                        textarea.value += starter;
                        textarea.focus();
                    }
                });
                starterList.appendChild(span);
            });
            startersDiv.appendChild(starterList);
            contentArea.appendChild(startersDiv);
        }

        // Textarea
        var textarea = document.createElement('textarea');
        textarea.className = 'answer-textarea';
        textarea.id = 'sa-answer-text';
        textarea.placeholder = 'Write your response here...';
        textarea.rows = 8;
        contentArea.appendChild(textarea);

        // Button row
        var btnRow = document.createElement('div');
        btnRow.className = 'sa-btn-row';

        var saveBtn = document.createElement('button');
        saveBtn.className = 'sa-save-btn';
        var saveIcon = document.createElement('i');
        saveIcon.className = 'fas fa-save';
        saveBtn.appendChild(saveIcon);
        saveBtn.appendChild(document.createTextNode(' Save Response'));
        saveBtn.addEventListener('click', function() { self.saveAnswer(index); });
        btnRow.appendChild(saveBtn);

        // Nav buttons
        if (this.questions.length > 1) {
            var navDiv = document.createElement('div');
            navDiv.className = 'sa-nav-btns';

            if (index > 0) {
                var prevBtn = document.createElement('button');
                prevBtn.className = 'sa-nav-btn';
                var prevIcon = document.createElement('i');
                prevIcon.className = 'fas fa-chevron-left';
                prevBtn.appendChild(prevIcon);
                prevBtn.appendChild(document.createTextNode(' Prev'));
                prevBtn.addEventListener('click', function() { self.openQuestion(index - 1); });
                navDiv.appendChild(prevBtn);
            }

            if (index < this.questions.length - 1) {
                var nextBtn = document.createElement('button');
                nextBtn.className = 'sa-nav-btn';
                nextBtn.appendChild(document.createTextNode('Next '));
                var nextIcon = document.createElement('i');
                nextIcon.className = 'fas fa-chevron-right';
                nextBtn.appendChild(nextIcon);
                nextBtn.addEventListener('click', function() { self.openQuestion(index + 1); });
                navDiv.appendChild(nextBtn);
            }

            btnRow.appendChild(navDiv);
        }

        contentArea.appendChild(btnRow);

        // Exemplar (collapsible)
        if (q.exemplar) {
            var exemplarDiv = document.createElement('div');
            exemplarDiv.className = 'exemplar';

            var exemplarTitle = document.createElement('div');
            exemplarTitle.className = 'exemplar-title';
            var exemplarIcon = document.createElement('i');
            exemplarIcon.className = 'fas fa-star';
            exemplarTitle.appendChild(exemplarIcon);
            exemplarTitle.appendChild(document.createTextNode(' Example Strong Response (click to reveal):'));
            exemplarDiv.appendChild(exemplarTitle);

            var exemplarText = document.createElement('div');
            exemplarText.className = 'exemplar-text';
            exemplarText.textContent = q.exemplar;
            exemplarText.style.display = 'none';
            exemplarDiv.appendChild(exemplarText);

            exemplarTitle.style.cursor = 'pointer';
            exemplarTitle.addEventListener('click', function() {
                exemplarText.style.display = exemplarText.style.display === 'none' ? 'block' : 'none';
            });

            contentArea.appendChild(exemplarDiv);
        }

        // Load saved answer
        var saved = ProgressManager.getActivityProgress(this.unitId, 'short-answer-' + index);
        if (saved && saved.answer) {
            textarea.value = saved.answer;
        }

        // Hide card grid, show content
        document.getElementById('sa-card-grid').style.display = 'none';
        contentArea.classList.add('sa-active');

        // Scroll to top of content
        contentArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    saveAnswer(index) {
        var text = document.getElementById('sa-answer-text');
        var answer = text ? text.value : '';
        ProgressManager.saveActivityProgress(this.unitId, 'short-answer-' + index, {
            answer: answer
        });
        StudyUtils.showToast('Response saved!', 'success');

        // Update the card's checkmark in the grid
        var card = document.querySelector('.sa-question-card[data-index="' + index + '"]');
        if (card && answer.trim().length > 0 && !card.classList.contains('sa-completed')) {
            card.classList.add('sa-completed');
            var topRow = card.querySelector('.sa-card-top');
            if (topRow && !topRow.querySelector('.sa-card-check')) {
                var check = document.createElement('i');
                check.className = 'fas fa-check-circle sa-card-check';
                topRow.appendChild(check);
            }
        }

        if (typeof AchievementManager !== 'undefined') {
            AchievementManager.checkAndAward({ activity: 'short-answer', event: 'complete' });
        }
    },

    activate() {},
    deactivate() {},
    getProgress() { return null; },
    loadProgress(data) {}
});
