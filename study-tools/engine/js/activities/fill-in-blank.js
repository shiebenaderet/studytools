StudyEngine.registerActivity({
    id: 'fill-in-blank',
    name: 'Fill in the Blank',
    icon: 'fas fa-puzzle-piece',
    description: 'Use vocabulary terms to complete sentences',
    category: 'study',
    requires: ['fillInBlankSentences'],
    _selectedTerm: null,
    _placements: {},
    _checked: false,
    _container: null,
    _config: null,
    _sentences: [],
    _bestScore: 0,
    _attempts: 0,

    render(container, config) {
        this._container = container;
        this._config = config;
        this._selectedTerm = null;
        this._placements = {};
        this._checked = false;

        const sentences = MasteryManager.getUnlockedFillInBlanks(config.unit.id, config);
        if (!sentences || sentences.length === 0) return;
        this._sentences = sentences;

        // Load saved progress
        const saved = ProgressManager.getActivityProgress(config.unit.id, 'fill-in-blank');
        this._bestScore = saved?.bestScore || 0;
        this._attempts = saved?.attempts || 0;

        container.textContent = '';

        // Collect unique answers for the word bank
        const uniqueAnswers = [];
        const seen = new Set();
        sentences.forEach(s => {
            const lower = s.answer.toLowerCase();
            if (!seen.has(lower)) {
                seen.add(lower);
                uniqueAnswers.push(s.answer);
            }
        });
        // Shuffle the word bank
        for (let i = uniqueAnswers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [uniqueAnswers[i], uniqueAnswers[j]] = [uniqueAnswers[j], uniqueAnswers[i]];
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'fib-container';

        // Word bank
        const wordBank = document.createElement('div');
        wordBank.className = 'word-bank';

        const bankTitle = document.createElement('div');
        bankTitle.className = 'word-bank-title';
        bankTitle.textContent = 'Word Bank';
        wordBank.appendChild(bankTitle);

        const bankTerms = document.createElement('div');
        bankTerms.className = 'word-bank-terms';
        bankTerms.id = 'fib-word-bank';

        uniqueAnswers.forEach(answer => {
            const btn = document.createElement('button');
            btn.className = 'word-bank-term';
            btn.textContent = answer;
            btn.dataset.term = answer;
            btn.addEventListener('click', () => this._selectTerm(answer, btn));
            bankTerms.appendChild(btn);
        });

        wordBank.appendChild(bankTerms);
        wrapper.appendChild(wordBank);

        // Sentences
        const sentencesDiv = document.createElement('div');
        sentencesDiv.className = 'fib-sentences';

        sentences.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'fib-sentence-card';

            const parts = item.sentence.split('___');

            for (let p = 0; p < parts.length; p++) {
                const textSpan = document.createElement('span');
                textSpan.textContent = parts[p];
                card.appendChild(textSpan);

                if (p < parts.length - 1) {
                    const slot = document.createElement('span');
                    slot.className = 'blank-slot';
                    slot.id = 'fib-slot-' + index;
                    slot.dataset.index = String(index);
                    slot.textContent = '\u00A0\u00A0\u00A0\u00A0\u00A0';
                    slot.addEventListener('click', () => this._clickBlank(index, slot));
                    card.appendChild(slot);
                }
            }

            sentencesDiv.appendChild(card);
        });

        wrapper.appendChild(sentencesDiv);

        // Buttons
        const buttonRow = document.createElement('div');
        buttonRow.style.display = 'flex';
        buttonRow.style.gap = '12px';
        buttonRow.style.justifyContent = 'center';
        buttonRow.style.marginTop = '20px';

        const checkBtn = document.createElement('button');
        checkBtn.className = 'nav-button';
        checkBtn.id = 'fib-check-btn';
        checkBtn.textContent = 'Check Answers';
        checkBtn.addEventListener('click', () => this.checkAnswers());
        buttonRow.appendChild(checkBtn);

        const resetBtn = document.createElement('button');
        resetBtn.className = 'nav-button';
        resetBtn.id = 'fib-reset-btn';
        resetBtn.textContent = 'Reset';
        resetBtn.addEventListener('click', () => this.reset());
        buttonRow.appendChild(resetBtn);

        wrapper.appendChild(buttonRow);

        // Score area
        const scoreDiv = document.createElement('div');
        scoreDiv.className = 'fib-score';
        scoreDiv.id = 'fib-score';
        scoreDiv.style.display = 'none';
        wrapper.appendChild(scoreDiv);

        container.appendChild(wrapper);
    },

    _selectTerm(term, btnEl) {
        if (this._checked) return;

        // If same term is already selected, deselect
        if (this._selectedTerm === term) {
            this._selectedTerm = null;
            btnEl.classList.remove('selected');
            return;
        }

        // Clear previous selection
        const bank = document.getElementById('fib-word-bank');
        if (bank) {
            const allBtns = bank.querySelectorAll('.word-bank-term');
            allBtns.forEach(b => b.classList.remove('selected'));
        }

        this._selectedTerm = term;
        btnEl.classList.add('selected');
    },

    _clickBlank(index, slotEl) {
        if (this._checked) return;

        // If blank is already filled, remove the term
        if (this._placements[index] !== undefined) {
            this._removeTerm(index);
            return;
        }

        // If a term is selected, place it
        if (this._selectedTerm !== null) {
            this._placeTerm(index, this._selectedTerm);
        }
    },

    _placeTerm(index, term) {
        this._placements[index] = term;

        // Update the slot
        const slot = document.getElementById('fib-slot-' + index);
        if (slot) {
            slot.textContent = term;
            slot.classList.add('filled');
        }

        // Mark term as used in word bank & clear selection
        this._updateWordBankState();
        this._selectedTerm = null;
    },

    _removeTerm(index) {
        delete this._placements[index];

        const slot = document.getElementById('fib-slot-' + index);
        if (slot) {
            slot.textContent = '\u00A0\u00A0\u00A0\u00A0\u00A0';
            slot.classList.remove('filled');
        }

        this._updateWordBankState();
    },

    _updateWordBankState() {
        const bank = document.getElementById('fib-word-bank');
        if (!bank) return;

        const placedTerms = Object.values(this._placements);
        const btns = bank.querySelectorAll('.word-bank-term');

        btns.forEach(btn => {
            btn.classList.remove('selected', 'used');
            const term = btn.dataset.term;
            // Count how many times this term appears in placements
            const placedCount = placedTerms.filter(t => t === term).length;
            // Count how many times this term is a valid answer (allows duplicates)
            const availableCount = this._sentences.filter(s => s.answer === term).length;
            if (placedCount >= availableCount) {
                btn.classList.add('used');
            }
        });
    },

    checkAnswers() {
        if (this._checked) return;
        this._checked = true;

        let correct = 0;
        const total = this._sentences.length;

        this._sentences.forEach((item, index) => {
            const slot = document.getElementById('fib-slot-' + index);
            if (!slot) return;

            const placed = this._placements[index];
            if (placed && placed.toLowerCase() === item.answer.toLowerCase()) {
                correct++;
                slot.classList.add('correct');
            } else {
                slot.classList.add('incorrect');
                // Show correct answer
                const correctSpan = document.createElement('span');
                correctSpan.className = 'fib-correct-answer';
                correctSpan.textContent = '(' + item.answer + ')';
                slot.parentElement.insertBefore(correctSpan, slot.nextSibling);
            }
        });

        this._attempts++;
        if (correct > this._bestScore) {
            this._bestScore = correct;
        }

        // Show score
        const scoreDiv = document.getElementById('fib-score');
        if (scoreDiv) {
            scoreDiv.textContent = '';
            scoreDiv.style.display = 'block';

            const scoreText = document.createElement('div');
            scoreText.style.fontSize = '1.5em';
            scoreText.style.fontWeight = 'bold';
            scoreText.style.color = correct === total ? '#22c55e' : '#ef4444';
            scoreText.textContent = correct + '/' + total + ' correct';
            scoreDiv.appendChild(scoreText);

            if (correct === total) {
                const perfectMsg = document.createElement('div');
                perfectMsg.style.marginTop = '8px';
                perfectMsg.style.color = '#166534';
                perfectMsg.textContent = 'Perfect score!';
                scoreDiv.appendChild(perfectMsg);
            }
        }

        // Disable check button
        const checkBtn = document.getElementById('fib-check-btn');
        if (checkBtn) checkBtn.disabled = true;

        if (typeof AchievementManager !== 'undefined') {
            var pct = total > 0 ? Math.round((correct / total) * 100) : 0;
            AchievementManager.checkAndAward({ activity: 'fill-in-blank', score: pct, event: correct === total ? 'perfect' : 'complete', totalCorrect: correct });
        }

        this._saveProgress();
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
