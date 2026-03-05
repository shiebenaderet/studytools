StudyEngine.registerActivity({
    id: 'short-answer',
    name: 'Short Answer',
    icon: 'fas fa-pen-fancy',
    description: 'Practice writing short-answer responses with rubrics and exemplars',
    category: 'practice',
    requires: ['shortAnswerQuestions'],

    render(container, config) {
        this.questions = config.shortAnswerQuestions || [];
        this.unitId = config.unit.id;

        const wrapper = document.createElement('div');
        wrapper.className = 'short-answer-container';

        // Title
        const title = document.createElement('h2');
        const icon = document.createElement('i');
        icon.className = 'fas fa-pen-fancy';
        title.appendChild(icon);
        title.appendChild(document.createTextNode(' Short Answer Practice'));
        wrapper.appendChild(title);

        // Instructions
        const instructions = document.createElement('div');
        instructions.className = 'short-answer-instructions';
        instructions.textContent = 'Select a question below, review the rubric to understand what to include, then write your response. Use the sentence starters and exemplar for guidance.';
        wrapper.appendChild(instructions);

        // Question selector
        const select = document.createElement('select');
        select.className = 'filter-select';
        select.id = 'sa-question-select';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '-- Choose a question --';
        select.appendChild(defaultOption);

        this.questions.forEach((q, i) => {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = q.topic + ': ' + q.question.substring(0, 80) + (q.question.length > 80 ? '...' : '');
            select.appendChild(option);
        });

        select.addEventListener('change', () => {
            const val = select.value;
            if (val !== '') {
                this.loadQuestion(parseInt(val, 10));
            } else {
                const content = document.getElementById('sa-content-area');
                if (content) content.textContent = '';
            }
        });

        wrapper.appendChild(select);

        // Content area (populated when question is selected)
        const contentArea = document.createElement('div');
        contentArea.id = 'sa-content-area';
        wrapper.appendChild(contentArea);

        container.appendChild(wrapper);
    },

    loadQuestion(index) {
        const q = this.questions[index];
        if (!q) return;

        const contentArea = document.getElementById('sa-content-area');
        if (!contentArea) return;
        contentArea.textContent = '';

        // Question text
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-text';
        const questionLabel = document.createElement('strong');
        questionLabel.textContent = 'Question: ';
        questionDiv.appendChild(questionLabel);
        questionDiv.appendChild(document.createTextNode(q.question));
        contentArea.appendChild(questionDiv);

        // Rubric
        const rubricDiv = document.createElement('div');
        rubricDiv.className = 'rubric';

        const rubricTitle = document.createElement('div');
        rubricTitle.className = 'rubric-title';
        const rubricIcon = document.createElement('i');
        rubricIcon.className = 'fas fa-clipboard-check';
        rubricTitle.appendChild(rubricIcon);
        rubricTitle.appendChild(document.createTextNode(' What to Include:'));
        rubricDiv.appendChild(rubricTitle);

        const rubricItems = document.createElement('ul');
        rubricItems.className = 'rubric-items';
        q.rubric.forEach(item => {
            const li = document.createElement('li');
            li.className = 'rubric-item';
            li.textContent = item;
            rubricItems.appendChild(li);
        });
        rubricDiv.appendChild(rubricItems);
        contentArea.appendChild(rubricDiv);

        // Sentence starters
        if (q.sentenceStarters && q.sentenceStarters.length > 0) {
            const startersDiv = document.createElement('div');
            startersDiv.className = 'sentence-starters';

            const startersTitle = document.createElement('div');
            startersTitle.className = 'sentence-starters-title';
            const startersIcon = document.createElement('i');
            startersIcon.className = 'fas fa-lightbulb';
            startersTitle.appendChild(startersIcon);
            startersTitle.appendChild(document.createTextNode(' Sentence Starters:'));
            startersDiv.appendChild(startersTitle);

            const starterList = document.createElement('div');
            starterList.className = 'starter-list';
            q.sentenceStarters.forEach(starter => {
                const span = document.createElement('span');
                span.className = 'starter';
                span.textContent = starter;
                span.addEventListener('click', () => {
                    const textarea = document.getElementById('sa-answer-text');
                    if (textarea) {
                        const current = textarea.value;
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
        const textarea = document.createElement('textarea');
        textarea.className = 'answer-textarea';
        textarea.id = 'sa-answer-text';
        textarea.placeholder = 'Write your response here...';
        textarea.rows = 8;
        contentArea.appendChild(textarea);

        // Save button
        const saveBtn = document.createElement('button');
        saveBtn.className = 'nav-button';
        saveBtn.textContent = 'Save Response';
        saveBtn.addEventListener('click', () => this.saveAnswer(index));
        contentArea.appendChild(saveBtn);

        // Exemplar (collapsible)
        if (q.exemplar) {
            const exemplarDiv = document.createElement('div');
            exemplarDiv.className = 'exemplar';

            const exemplarTitle = document.createElement('div');
            exemplarTitle.className = 'exemplar-title';
            const exemplarIcon = document.createElement('i');
            exemplarIcon.className = 'fas fa-star';
            exemplarTitle.appendChild(exemplarIcon);
            exemplarTitle.appendChild(document.createTextNode(' Example Strong Response (click to reveal):'));
            exemplarDiv.appendChild(exemplarTitle);

            const exemplarText = document.createElement('div');
            exemplarText.className = 'exemplar-text';
            exemplarText.textContent = q.exemplar;
            exemplarText.style.display = 'none';
            exemplarDiv.appendChild(exemplarText);

            exemplarTitle.style.cursor = 'pointer';
            exemplarTitle.addEventListener('click', () => {
                if (exemplarText.style.display === 'none') {
                    exemplarText.style.display = 'block';
                } else {
                    exemplarText.style.display = 'none';
                }
            });

            contentArea.appendChild(exemplarDiv);
        }

        // Load saved answer
        const saved = ProgressManager.getActivityProgress(this.unitId, 'short-answer-' + index);
        if (saved && saved.answer) {
            textarea.value = saved.answer;
        }
    },

    saveAnswer(index) {
        const text = document.getElementById('sa-answer-text')?.value || '';
        ProgressManager.saveActivityProgress(this.unitId, 'short-answer-' + index, {
            answer: text
        });
        alert('Your response has been saved!');
    },

    activate() {},
    deactivate() {},
    getProgress() { return null; },
    loadProgress(data) {}
});
