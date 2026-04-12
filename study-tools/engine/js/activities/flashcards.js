StudyEngine.registerActivity({
    id: 'flashcards',
    name: 'Flashcards',
    icon: 'fas fa-graduation-cap',
    description: 'Master vocabulary terms with spaced repetition flashcards',
    category: 'study',
    requires: ['vocabulary'],

    // Internal state
    _currentIndex: 0,
    _isFlipped: false,
    _displayedVocab: [],
    _allUnlockedVocab: [],
    _mastered: [],
    _keyHandler: null,
    _queue: [],        // SRS queue of term names
    _ratings: {},      // term -> last rating
    _roundIndex: 0,
    _mode: 'study',    // 'study' or 'weak'
    _weakTerms: [],

    render(container, config) {
        this._allUnlockedVocab = [...MasteryManager.getReadUnlockedVocabulary(config.unit.id, config)];
        this._displayedVocab = [...this._allUnlockedVocab];
        const saved = ProgressManager.getActivityProgress(config.unit.id, 'flashcards');
        this._mastered = saved?.mastered || [];
        this._ratings = saved?.ratings || {};
        this._currentIndex = 0;
        this._isFlipped = false;
        this._mode = 'study';
        this._container = container;
        this._config = config;

        // Build term -> textbook section map for deep-linking
        var textbook = MasteryManager._textbookCache[config.unit.id];
        var tbProgress = ProgressManager.getActivityProgress(config.unit.id, 'textbook') || {};
        this._termSectionMap = textbook
            ? MasteryManager.buildTermSectionMap(config, textbook, tbProgress.readingLevel || 'standard')
            : {};

        // If no vocab available, check if textbook reading is needed
        if (this._allUnlockedVocab.length === 0) {
            var nextChapter = MasteryManager.getNextUnreadChapter(config.unit.id, config);
            if (nextChapter) {
                this._showReadingGate(container, config, nextChapter);
                return;
            }
        }

        // Show tutorial on first use
        const tutorialSeen = localStorage.getItem('fc-tutorial-seen');
        if (!tutorialSeen) {
            this._showTutorial(container, config);
            return;
        }

        this._renderCards(container, config);
    },

    _showReadingGate(container, config, nextChapter) {
        var gate = document.createElement('div');
        gate.className = 'fc-reading-gate';

        var icon = document.createElement('i');
        icon.className = 'fas fa-book-open';
        icon.style.cssText = 'font-size:2.5em;color:var(--primary);margin-bottom:16px;display:block;';
        gate.appendChild(icon);

        var heading = document.createElement('h2');
        heading.textContent = 'Read First, Then Study!';
        heading.style.cssText = 'color:var(--text-primary);margin-bottom:12px;';
        gate.appendChild(heading);

        var desc = document.createElement('p');
        desc.textContent = 'Before you start flashcards, read Chapter ' + nextChapter.index + ': ' + nextChapter.category + ' in the textbook. This will help you understand the terms!';
        desc.style.cssText = 'color:var(--text-secondary);margin-bottom:24px;line-height:1.6;max-width:400px;margin-left:auto;margin-right:auto;';
        gate.appendChild(desc);

        var btn = document.createElement('button');
        btn.className = 'fc-reading-gate-btn';
        var btnIcon = document.createElement('i');
        btnIcon.className = 'fas fa-book-open';
        btn.appendChild(btnIcon);
        btn.appendChild(document.createTextNode(' Go to Textbook'));
        btn.addEventListener('click', function() {
            StudyEngine.activateActivity('textbook', [nextChapter.segmentId]);
        });
        gate.appendChild(btn);

        container.appendChild(gate);
    },

    _showTutorial(container, config) {
        const tutorial = document.createElement('div');
        tutorial.className = 'fc-tutorial';

        const icon = document.createElement('div');
        icon.className = 'fc-tutorial-icon';
        icon.innerHTML = '<i class="fas fa-graduation-cap"></i>';
        tutorial.appendChild(icon);

        const title = document.createElement('h2');
        title.textContent = 'How to Use Flashcards';
        tutorial.appendChild(title);

        const steps = [
            { icon: 'fas fa-mouse-pointer', text: 'Click the card (or press Space) to flip it and reveal the definition' },
            { icon: 'fas fa-brain', text: 'Before flipping, try to recall the definition from memory — this is what makes flashcards work' },
            { icon: 'fas fa-star', text: 'After flipping, rate how well you knew it: Again, Hard, Good, or Easy' },
            { icon: 'fas fa-redo', text: 'Cards you rate "Again" or "Hard" will come back sooner so you practice them more' },
            { icon: 'fas fa-check-circle', text: 'Rate "Good" or "Easy" to mark a term as mastered and unlock new categories' }
        ];

        const list = document.createElement('div');
        list.className = 'fc-tutorial-steps';
        steps.forEach(s => {
            const step = document.createElement('div');
            step.className = 'fc-tutorial-step';
            const stepIcon = document.createElement('i');
            stepIcon.className = s.icon;
            step.appendChild(stepIcon);
            const stepText = document.createElement('span');
            stepText.textContent = s.text;
            step.appendChild(stepText);
            list.appendChild(step);
        });
        tutorial.appendChild(list);

        const tip = document.createElement('div');
        tip.className = 'fc-tutorial-tip';
        tip.innerHTML = '<i class="fas fa-lightbulb"></i> <strong>Pro tip:</strong> Don\'t just read — actively try to remember before flipping. Struggling to recall is what makes the memory stick!';
        tutorial.appendChild(tip);

        const startBtn = document.createElement('button');
        startBtn.className = 'fc-tutorial-start';
        startBtn.textContent = 'Got it — start studying!';
        startBtn.addEventListener('click', () => {
            localStorage.setItem('fc-tutorial-seen', '1');
            container.textContent = '';
            this._renderCards(container, config);
        });
        tutorial.appendChild(startBtn);

        container.appendChild(tutorial);
    },

    _renderCards(container, config) {
        const categories = MasteryManager.getReadUnlockedCategories(config.unit.id, config);

        const wrapper = document.createElement('div');
        wrapper.className = 'fc-wrapper';

        // --- Mastery progress bar ---
        const unlockStatus = MasteryManager.getUnlockStatus(config.unit.id, config);
        if (!unlockStatus.allUnlocked) {
            const progressBar = document.createElement('div');
            progressBar.className = 'mastery-progress-bar';
            progressBar.id = 'fc-mastery-progress';
            const progressLabel = document.createElement('span');
            progressLabel.textContent = unlockStatus.unlockedCategories.length + '/' + unlockStatus.categories.length + ' categories unlocked';
            progressBar.appendChild(progressLabel);
            const bar = document.createElement('div');
            bar.className = 'progress-bar';
            const fill = document.createElement('div');
            fill.className = 'progress-fill';
            fill.style.width = Math.round((unlockStatus.unlockedCategories.length / unlockStatus.categories.length) * 100) + '%';
            bar.appendChild(fill);
            progressBar.appendChild(bar);
            wrapper.appendChild(progressBar);
        }

        // --- Term unlock progress ---
        var allMustKnow = config.vocabulary
            ? config.vocabulary.filter(function(v) { return !v.tier || v.tier === 'must-know'; })
            : [];
        var unlockedMustKnow = this._allUnlockedVocab.filter(function(v) { return !v.tier || v.tier === 'must-know'; });
        if (unlockedMustKnow.length < allMustKnow.length && allMustKnow.length > 0) {
            var termProgress = document.createElement('div');
            termProgress.className = 'fc-term-progress';
            var nextCh = MasteryManager.getNextUnreadChapter(config.unit.id, config);
            termProgress.textContent = unlockedMustKnow.length + '/' + allMustKnow.length + ' key terms unlocked';
            if (nextCh) {
                termProgress.textContent += ' \u2014 read the next chapter to unlock more!';
            }
            wrapper.appendChild(termProgress);
        }

        // --- Weak terms nudge ---
        this._weakTerms = this._getWeakTerms(config);
        if (this._weakTerms.length > 0) {
            const nudge = document.createElement('div');
            nudge.className = 'fc-weak-nudge';
            nudge.id = 'fc-weak-nudge';

            const nudgeIcon = document.createElement('i');
            nudgeIcon.className = 'fas fa-exclamation-triangle';
            nudge.appendChild(nudgeIcon);

            const nudgeText = document.createElement('span');
            const firstName = ProgressManager.getFirstName();
            const prefix = firstName ? firstName + ', you' : 'You';
            nudgeText.textContent = ' ' + prefix + ' missed ' + this._weakTerms.length + ' term' + (this._weakTerms.length > 1 ? 's' : '') + ' in other activities. ';
            nudge.appendChild(nudgeText);

            const reviewBtn = document.createElement('button');
            reviewBtn.className = 'fc-weak-btn';
            reviewBtn.textContent = 'Review Weak Terms';
            reviewBtn.addEventListener('click', () => this._startWeakReview());
            nudge.appendChild(reviewBtn);

            wrapper.appendChild(nudge);
        }

        // --- Controls row (collapsed behind Options toggle) ---
        const controls = document.createElement('div');
        controls.className = 'fc-controls';

        const optionsToggle = document.createElement('button');
        optionsToggle.className = 'fc-ctrl-btn fc-options-toggle';
        optionsToggle.id = 'fc-options-toggle';
        const optionsIcon = document.createElement('i');
        optionsIcon.className = 'fas fa-sliders-h';
        optionsToggle.appendChild(optionsIcon);
        optionsToggle.appendChild(document.createTextNode(' Options'));
        controls.appendChild(optionsToggle);

        const optionsPanel = document.createElement('div');
        optionsPanel.className = 'fc-options-panel';
        optionsPanel.id = 'fc-options-panel';
        optionsPanel.style.display = 'none';

        const filterSelect = document.createElement('select');
        filterSelect.className = 'fc-filter';
        filterSelect.id = 'fc-category-filter';
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'All Categories';
        filterSelect.appendChild(allOption);
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            filterSelect.appendChild(opt);
        });
        // Show locked categories as disabled options
        var allCats = MasteryManager.getCategories(config);
        allCats.forEach(function(cat) {
            if (!categories.includes(cat) && cat !== 'Bonus') {
                var opt = document.createElement('option');
                opt.value = '';
                opt.textContent = cat + ' (read chapter first)';
                opt.disabled = true;
                opt.style.color = '#9ca3af';
                filterSelect.appendChild(opt);
            }
        });
        filterSelect.addEventListener('change', () => this._filterByCategory(filterSelect.value));
        optionsPanel.appendChild(filterSelect);

        const shuffleBtn = document.createElement('button');
        shuffleBtn.className = 'fc-ctrl-btn';
        shuffleBtn.id = 'fc-shuffle-btn';
        const shuffleIcon = document.createElement('i');
        shuffleIcon.className = 'fas fa-random';
        shuffleBtn.appendChild(shuffleIcon);
        shuffleBtn.appendChild(document.createTextNode(' Shuffle'));
        shuffleBtn.addEventListener('click', () => this._shuffleCards());
        optionsPanel.appendChild(shuffleBtn);

        const helpBtn = document.createElement('button');
        helpBtn.className = 'fc-ctrl-btn fc-help-btn';
        helpBtn.title = 'How to use flashcards';
        const helpIcon = document.createElement('i');
        helpIcon.className = 'fas fa-question-circle';
        helpBtn.appendChild(helpIcon);
        helpBtn.appendChild(document.createTextNode(' Help'));
        helpBtn.addEventListener('click', () => {
            this._container.textContent = '';
            localStorage.removeItem('fc-tutorial-seen');
            this._showTutorial(this._container, this._config);
        });
        optionsPanel.appendChild(helpBtn);

        controls.appendChild(optionsPanel);

        optionsToggle.addEventListener('click', () => {
            var panel = document.getElementById('fc-options-panel');
            var showing = panel.style.display !== 'none';
            panel.style.display = showing ? 'none' : 'flex';
            optionsToggle.classList.toggle('active', !showing);
        });

        wrapper.appendChild(controls);

        // --- Progress indicator ---
        const progress = document.createElement('div');
        progress.className = 'fc-progress';
        progress.id = 'fc-progress';
        wrapper.appendChild(progress);

        // --- Card scene (3D container) ---
        const scene = document.createElement('div');
        scene.className = 'fc-scene';
        scene.id = 'fc-scene';
        scene.addEventListener('click', () => this._flip());

        const card = document.createElement('div');
        card.className = 'fc-card';
        card.id = 'fc-card';

        // Front face (term)
        const front = document.createElement('div');
        front.className = 'fc-face fc-front';
        front.id = 'fc-front';
        const frontLabel = document.createElement('div');
        frontLabel.className = 'fc-label';
        frontLabel.textContent = 'TERM';
        front.appendChild(frontLabel);
        const frontContent = document.createElement('div');
        frontContent.className = 'fc-content';
        frontContent.id = 'fc-front-content';
        front.appendChild(frontContent);
        const frontHint = document.createElement('div');
        frontHint.className = 'fc-flip-hint';
        frontHint.textContent = 'Click or press Space to reveal';
        front.appendChild(frontHint);
        card.appendChild(front);

        // Back face (definition)
        const back = document.createElement('div');
        back.className = 'fc-face fc-back';
        back.id = 'fc-back';
        const backLabel = document.createElement('div');
        backLabel.className = 'fc-label';
        backLabel.textContent = 'DEFINITION';
        back.appendChild(backLabel);
        const backContent = document.createElement('div');
        backContent.className = 'fc-content';
        backContent.id = 'fc-back-content';
        back.appendChild(backContent);
        card.appendChild(back);

        scene.appendChild(card);
        wrapper.appendChild(scene);

        // --- Confidence buttons (hidden until flipped) ---
        const confidence = document.createElement('div');
        confidence.className = 'fc-confidence';
        confidence.id = 'fc-confidence';

        const rateLabel = document.createElement('div');
        rateLabel.className = 'fc-rate-label';
        rateLabel.textContent = 'How well did you know it?';
        confidence.appendChild(rateLabel);

        const btnRow = document.createElement('div');
        btnRow.className = 'fc-rate-buttons';

        const ratingDefs = [
            { key: 'again', label: 'Again', shortcut: '1' },
            { key: 'hard', label: 'Hard', shortcut: '2' },
            { key: 'good', label: 'Good', shortcut: '3' },
            { key: 'easy', label: 'Easy', shortcut: '4' }
        ];

        ratingDefs.forEach(r => {
            const btn = document.createElement('button');
            btn.className = 'fc-rate-btn fc-rate-' + r.key;
            btn.dataset.rating = r.key;

            const labelSpan = document.createElement('span');
            labelSpan.className = 'fc-rate-btn-label';
            labelSpan.textContent = r.label;
            btn.appendChild(labelSpan);

            const shortcutSpan = document.createElement('span');
            shortcutSpan.className = 'fc-rate-shortcut';
            shortcutSpan.textContent = r.shortcut;
            btn.appendChild(shortcutSpan);

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._rate(r.key);
            });
            btnRow.appendChild(btn);
        });

        confidence.appendChild(btnRow);
        wrapper.appendChild(confidence);

        // --- Navigation ---
        const nav = document.createElement('div');
        nav.className = 'fc-nav';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'fc-nav-btn';
        prevBtn.id = 'fc-prev-btn';
        const prevIcon = document.createElement('i');
        prevIcon.className = 'fas fa-arrow-left';
        prevBtn.appendChild(prevIcon);
        prevBtn.addEventListener('click', () => this._prev());
        nav.appendChild(prevBtn);

        const counter = document.createElement('span');
        counter.className = 'fc-counter';
        counter.id = 'fc-counter';
        nav.appendChild(counter);

        const nextBtn = document.createElement('button');
        nextBtn.className = 'fc-nav-btn';
        nextBtn.id = 'fc-next-btn';
        const nextIcon = document.createElement('i');
        nextIcon.className = 'fas fa-arrow-right';
        nextBtn.appendChild(nextIcon);
        nextBtn.addEventListener('click', () => this._next());
        nav.appendChild(nextBtn);

        wrapper.appendChild(nav);

        // --- Keyboard tips ---
        const tips = document.createElement('div');
        tips.className = 'fc-tips';

        const tipItems = [
            { keys: ['Space'], action: 'flip' },
            { keys: ['\u2190', '\u2192'], action: 'navigate' },
            { keys: ['1', '2', '3', '4'], action: 'rate' }
        ];
        tipItems.forEach(tip => {
            const span = document.createElement('span');
            tip.keys.forEach(k => {
                const kbd = document.createElement('kbd');
                kbd.textContent = k;
                span.appendChild(kbd);
            });
            span.appendChild(document.createTextNode(' ' + tip.action));
            tips.appendChild(span);
        });

        wrapper.appendChild(tips);

        container.appendChild(wrapper);

        // Build SRS queue and display
        this._buildQueue();
        this._display();
    },

    // --- SRS Queue Logic ---

    _buildQueue() {
        const mustKnow = this._displayedVocab.filter(v => !v.tier || v.tier === 'must-know');
        const encounter = this._displayedVocab.filter(v => v.tier === 'encounter');
        const bonus = this._displayedVocab.filter(v => v.tier === 'bonus');
        this._queue = [
            ...StudyUtils.shuffle(mustKnow.map(v => v.term)),
            ...StudyUtils.shuffle(encounter.map(v => v.term)),
            ...StudyUtils.shuffle(bonus.map(v => v.term))
        ];
        this._roundIndex = 0;
    },

    _getCurrentTerm() {
        if (this._roundIndex >= this._queue.length) return null;
        const termName = this._queue[this._roundIndex];
        return this._displayedVocab.find(v => v.term === termName) || null;
    },

    _display() {
        const card = this._getCurrentTerm();
        const scene = document.getElementById('fc-scene');
        const cardEl = document.getElementById('fc-card');
        const frontContent = document.getElementById('fc-front-content');
        const backContent = document.getElementById('fc-back-content');
        const confidence = document.getElementById('fc-confidence');
        const counter = document.getElementById('fc-counter');
        const prevBtn = document.getElementById('fc-prev-btn');
        const progress = document.getElementById('fc-progress');

        if (!scene || !card) {
            this._showComplete();
            return;
        }

        // Reset flip state
        this._isFlipped = false;
        cardEl.classList.remove('fc-flipped');
        confidence.classList.remove('fc-visible');

        // Front
        frontContent.textContent = card.term;

        // Back
        backContent.textContent = '';
        if (card.imageUrl) {
            const img = document.createElement('img');
            img.className = 'fc-card-image';
            img.src = card.imageUrl;
            img.alt = card.term;
            img.loading = 'lazy';
            img.addEventListener('error', function() { this.style.display = 'none'; });
            backContent.appendChild(img);
        }
        const defText = document.createElement('div');
        defText.textContent = card.definition;
        backContent.appendChild(defText);
        if (card.example) {
            const exText = document.createElement('div');
            exText.className = 'fc-example';
            exText.textContent = card.example;
            backContent.appendChild(exText);
        }
        // "Read in textbook" deep-link
        var sectionInfo = this._termSectionMap[card.term];
        if (sectionInfo) {
            var tbLink = document.createElement('button');
            tbLink.className = 'fc-textbook-link';
            var tbLinkIcon = document.createElement('i');
            tbLinkIcon.className = 'fas fa-book-open';
            tbLink.appendChild(tbLinkIcon);
            tbLink.appendChild(document.createTextNode(' Read in textbook'));
            tbLink.addEventListener('click', function(e) {
                e.stopPropagation();
                StudyEngine.activateActivity('textbook', [sectionInfo.segmentId, sectionInfo.sectionId]);
            });
            backContent.appendChild(tbLink);
        }

        if (card.simpleExplanation) {
            const explainBtn = document.createElement('button');
            explainBtn.className = 'fc-explain-btn';
            var bulbIcon = document.createElement('i');
            bulbIcon.className = 'fas fa-lightbulb';
            explainBtn.appendChild(bulbIcon);
            explainBtn.appendChild(document.createTextNode(' Explain it to me'));
            var explainBox = document.createElement('div');
            explainBox.className = 'fc-explain-box';
            explainBox.textContent = card.simpleExplanation;
            explainBox.style.display = 'none';
            const self = this;
            explainBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                var showing = explainBox.style.display !== 'none';
                explainBox.style.display = showing ? 'none' : 'block';
                explainBtn.classList.toggle('active', !showing);
                setTimeout(() => self._syncSceneHeight(), 10);
            });
            backContent.appendChild(explainBtn);
            backContent.appendChild(explainBox);
        }

        // "Your Example" section
        const unitId = StudyEngine.config.unit.id;
        const myExamplesKey = 'fc-my-examples-' + unitId;
        const myExamples = JSON.parse(localStorage.getItem(myExamplesKey) || '{}');
        const myExBtn = document.createElement('button');
        myExBtn.className = 'fc-explain-btn fc-my-example-btn';
        const pencilIcon = document.createElement('i');
        pencilIcon.className = 'fas fa-pencil-alt';
        myExBtn.appendChild(pencilIcon);
        myExBtn.appendChild(document.createTextNode(myExamples[card.term] ? ' Your example' : ' Add your own example'));
        const myExBox = document.createElement('div');
        myExBox.className = 'fc-my-example-box';
        myExBox.style.display = 'none';
        const myExInput = document.createElement('textarea');
        myExInput.className = 'fc-my-example-input';
        myExInput.placeholder = 'Think of your own real-life example of "' + card.term + '"...';
        myExInput.rows = 2;
        myExInput.value = myExamples[card.term] || '';
        myExInput.addEventListener('click', function(e) { e.stopPropagation(); });
        myExInput.addEventListener('input', function() {
            var val = myExInput.value.trim();
            if (val) {
                myExamples[card.term] = val;
            } else {
                delete myExamples[card.term];
            }
            localStorage.setItem(myExamplesKey, JSON.stringify(myExamples));
        });
        myExBox.appendChild(myExInput);
        const selfRef = this;
        myExBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var showing = myExBox.style.display !== 'none';
            myExBox.style.display = showing ? 'none' : 'block';
            myExBtn.classList.toggle('active', !showing);
            if (!showing) myExInput.focus();
            setTimeout(() => selfRef._syncSceneHeight(), 10);
        });
        backContent.appendChild(myExBtn);
        backContent.appendChild(myExBox);

        // Category badge
        const existingBadge = scene.querySelector('.fc-cat-badge');
        if (existingBadge) existingBadge.remove();
        if (card.category) {
            const badge = document.createElement('div');
            badge.className = 'fc-cat-badge';
            badge.textContent = card.category;
            scene.appendChild(badge);
        }

        // Tier badge for encounter/bonus terms
        const existingTierBadge = scene.querySelector('.fc-tier-badge');
        if (existingTierBadge) existingTierBadge.remove();
        if (card.tier === 'encounter' || card.tier === 'bonus') {
            const tierBadge = document.createElement('div');
            tierBadge.className = 'fc-tier-badge';
            tierBadge.textContent = 'Bonus';
            scene.appendChild(tierBadge);
        }

        // Counter
        counter.textContent = (this._roundIndex + 1) + ' / ' + this._queue.length;

        // Progress dots
        this._updateProgress();

        // Nav buttons
        prevBtn.disabled = this._roundIndex === 0;

        // Disable next until card is rated (enforces engagement)
        var nextBtn = document.getElementById('fc-next-btn');
        if (nextBtn) {
            var currentTerm = this._getCurrentTerm();
            nextBtn.disabled = !currentTerm || !this._ratings[currentTerm.term];
        }

        // Sync scene height to content
        this._syncSceneHeight();
    },

    _flip() {
        const cardEl = document.getElementById('fc-card');
        const confidence = document.getElementById('fc-confidence');
        if (!cardEl) return;

        this._isFlipped = !this._isFlipped;

        if (this._isFlipped) {
            cardEl.classList.add('fc-flipped');
            confidence.classList.add('fc-visible');
        } else {
            cardEl.classList.remove('fc-flipped');
            confidence.classList.remove('fc-visible');
        }
        this._syncSceneHeight();
    },

    _syncSceneHeight() {
        const scene = document.getElementById('fc-scene');
        const front = document.getElementById('fc-front');
        const back = document.getElementById('fc-back');
        if (!scene || !front || !back) return;
        const face = this._isFlipped ? back : front;
        const h = Math.max(340, face.scrollHeight);
        scene.style.minHeight = h + 'px';
        document.getElementById('fc-card').style.minHeight = h + 'px';
    },

    _rate(rating) {
        const card = this._getCurrentTerm();
        if (!card) return;

        this._ratings[card.term] = rating;

        if (rating === 'again') {
            const insertAt = Math.min(this._roundIndex + 3, this._queue.length);
            this._queue.splice(insertAt, 0, card.term);
        } else if (rating === 'hard') {
            const insertAt = Math.min(this._roundIndex + 6, this._queue.length);
            this._queue.splice(insertAt, 0, card.term);
        } else if (rating === 'good' || rating === 'easy') {
            if (!this._mastered.includes(card.term)) {
                this._mastered.push(card.term);
                // Only check category mastery for must-know terms
                if (!card.tier || card.tier === 'must-know') {
                    const config = StudyEngine.config;
                    const unitId = config.unit.id;
                    if (MasteryManager.isCategoryMastered(unitId, config, card.category)) {
                        MasteryManager.showMasteryNudge(config, card.category);
                    }
                }
            }
        }

        this._saveProgress();
        this._roundIndex++;
        this._display();
    },

    _prev() {
        if (this._roundIndex > 0) {
            this._roundIndex--;
            this._display();
        }
    },

    _next() {
        // Only allow next if current card has been rated
        var currentTerm = this._getCurrentTerm();
        if (currentTerm && !this._ratings[currentTerm.term]) return;
        if (this._roundIndex < this._queue.length - 1) {
            this._roundIndex++;
            this._display();
        }
    },

    _shuffleCards() {
        this._queue = StudyUtils.shuffle([...this._displayedVocab.map(v => v.term)]);
        this._roundIndex = 0;
        this._display();
    },

    _filterByCategory(category) {
        const config = StudyEngine.config;
        const unlocked = MasteryManager.getReadUnlockedVocabulary(config.unit.id, config);
        this._displayedVocab = category
            ? unlocked.filter(v => v.category === category)
            : [...unlocked];
        this._buildQueue();
        this._display();
    },

    _updateProgress() {
        const progress = document.getElementById('fc-progress');
        if (!progress) return;
        progress.textContent = '';

        const total = this._queue.length;
        if (total > 30) {
            const hasTiers = this._allUnlockedVocab.some(v => v.tier);
            const mustKnowTotal = hasTiers
                ? this._allUnlockedVocab.filter(v => !v.tier || v.tier === 'must-know').length
                : this._allUnlockedVocab.length;
            const mustKnowMastered = hasTiers
                ? this._mastered.filter(t => {
                    const v = this._allUnlockedVocab.find(vv => vv.term === t);
                    return v && (!v.tier || v.tier === 'must-know');
                }).length
                : this._mastered.length;
            progress.textContent = mustKnowMastered + ' of ' + mustKnowTotal + ' key terms mastered';
            progress.className = 'fc-progress fc-progress-text';
            return;
        }

        progress.className = 'fc-progress';
        for (let i = 0; i < total; i++) {
            const dot = document.createElement('span');
            dot.className = 'fc-dot';
            const term = this._queue[i];
            if (this._mastered.includes(term)) {
                dot.classList.add('fc-dot-mastered');
            } else if (i < this._roundIndex) {
                const rating = this._ratings[term];
                if (rating === 'again') dot.classList.add('fc-dot-again');
                else if (rating === 'hard') dot.classList.add('fc-dot-hard');
            }
            if (i === this._roundIndex) dot.classList.add('fc-dot-current');
            progress.appendChild(dot);
        }
    },

    _showComplete() {
        const wrapper = document.querySelector('.fc-wrapper');
        if (!wrapper) return;

        const scene = document.getElementById('fc-scene');
        const confidence = document.getElementById('fc-confidence');
        const nav = document.querySelector('.fc-nav');
        if (scene) scene.style.display = 'none';
        if (confidence) confidence.style.display = 'none';
        if (nav) nav.style.display = 'none';

        const existing = document.getElementById('fc-complete');
        if (existing) existing.remove();

        const complete = document.createElement('div');
        complete.className = 'fc-complete';
        complete.id = 'fc-complete';

        const icon = document.createElement('i');
        icon.className = 'fas fa-check-circle';
        complete.appendChild(icon);

        const heading = document.createElement('h2');
        const firstName = ProgressManager.getFirstName();
        heading.textContent = firstName ? 'Nice work, ' + firstName + '!' : 'Nice work!';
        complete.appendChild(heading);

        const stats = document.createElement('div');
        stats.className = 'fc-complete-stats';

        const masteredCount = this._mastered.length;
        const totalCount = this._allUnlockedVocab.length;

        const mainStat = document.createElement('div');
        const mainVal = document.createElement('span');
        mainVal.className = 'fc-stat-value';
        mainVal.textContent = masteredCount + '/' + totalCount;
        mainStat.appendChild(mainVal);
        const mainLabel = document.createElement('span');
        mainLabel.className = 'fc-stat-label';
        mainLabel.textContent = 'Terms Mastered';
        mainStat.appendChild(mainLabel);
        stats.appendChild(mainStat);

        const ratingCounts = { again: 0, hard: 0, good: 0, easy: 0 };
        for (const r of Object.values(this._ratings)) {
            if (ratingCounts[r] !== undefined) ratingCounts[r]++;
        }

        if (ratingCounts.easy > 0) {
            const easyStat = document.createElement('div');
            const easyVal = document.createElement('span');
            easyVal.className = 'fc-stat-value';
            easyVal.textContent = ratingCounts.easy;
            easyStat.appendChild(easyVal);
            const easyLabel = document.createElement('span');
            easyLabel.className = 'fc-stat-label';
            easyLabel.textContent = 'Easy';
            easyStat.appendChild(easyLabel);
            stats.appendChild(easyStat);
        }
        if (ratingCounts.again > 0) {
            const againStat = document.createElement('div');
            const againVal = document.createElement('span');
            againVal.className = 'fc-stat-value';
            againVal.textContent = ratingCounts.again;
            againStat.appendChild(againVal);
            const againLabel = document.createElement('span');
            againLabel.className = 'fc-stat-label';
            againLabel.textContent = 'Struggled';
            againStat.appendChild(againLabel);
            stats.appendChild(againStat);
        }

        complete.appendChild(stats);

        const restartBtn = document.createElement('button');
        restartBtn.className = 'fc-ctrl-btn';
        const restartIcon = document.createElement('i');
        restartIcon.className = 'fas fa-redo';
        restartBtn.appendChild(restartIcon);
        restartBtn.appendChild(document.createTextNode(' Study Again'));
        restartBtn.addEventListener('click', () => {
            complete.remove();
            if (scene) scene.style.display = '';
            if (confidence) confidence.style.display = '';
            if (nav) nav.style.display = '';
            this._buildQueue();
            this._display();
        });
        complete.appendChild(restartBtn);

        if (this._weakTerms.length > 0) {
            const weakBtn = document.createElement('button');
            weakBtn.className = 'fc-ctrl-btn fc-weak-review-btn';
            const weakIcon = document.createElement('i');
            weakIcon.className = 'fas fa-exclamation-triangle';
            weakBtn.appendChild(weakIcon);
            weakBtn.appendChild(document.createTextNode(' Review ' + this._weakTerms.length + ' Weak Terms'));
            weakBtn.addEventListener('click', () => {
                complete.remove();
                if (scene) scene.style.display = '';
                if (confidence) confidence.style.display = '';
                if (nav) nav.style.display = '';
                this._startWeakReview();
            });
            complete.appendChild(weakBtn);
        }

        wrapper.appendChild(complete);

        if (typeof AchievementManager !== 'undefined') {
            AchievementManager.checkAndAward({ activity: 'flashcards', event: 'viewedAll' });
            AchievementManager.checkAndAward({ activity: 'flashcards', event: 'complete' });
        }
    },

    // --- Cross-Activity Weakness Tracking ---

    _getWeakTerms(config) {
        const unitId = config.unit.id;
        const weakMap = {};

        // Check lightning round missed terms
        const lightningProgress = ProgressManager.getActivityProgress(unitId, 'lightning-round');
        if (lightningProgress?.missed) {
            for (const m of lightningProgress.missed) {
                weakMap[m.term] = (weakMap[m.term] || 0) + 1;
            }
        }

        // Check weakness tracker (cross-activity store)
        const weaknessData = ProgressManager.load(unitId, 'weakness_tracker');
        if (weaknessData?.terms) {
            for (const [term, count] of Object.entries(weaknessData.terms)) {
                weakMap[term] = (weakMap[term] || 0) + count;
            }
        }

        // Filter to unlocked vocab that isn't mastered
        const unlocked = MasteryManager.getReadUnlockedVocabulary(unitId, config);
        const unlockedTerms = unlocked.map(v => v.term);
        return Object.keys(weakMap)
            .filter(t => unlockedTerms.includes(t) && !this._mastered.includes(t))
            .sort((a, b) => weakMap[b] - weakMap[a]);
    },

    _startWeakReview() {
        this._mode = 'weak';
        const config = StudyEngine.config;
        const unlocked = MasteryManager.getReadUnlockedVocabulary(config.unit.id, config);
        this._displayedVocab = unlocked.filter(v => this._weakTerms.includes(v.term));
        if (this._displayedVocab.length === 0) {
            this._displayedVocab = [...unlocked];
        }
        this._buildQueue();

        const nudge = document.getElementById('fc-weak-nudge');
        if (nudge) nudge.classList.add('fc-weak-active');

        const filter = document.getElementById('fc-category-filter');
        if (filter) filter.value = '';

        this._display();
    },

    _saveProgress() {
        ProgressManager.saveActivityProgress(StudyEngine.config.unit.id, 'flashcards', {
            mastered: this._mastered,
            ratings: this._ratings
        });
    },

    activate() {
        this._keyHandler = (e) => {
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
            if (e.key === 'ArrowRight' || e.key === 'd') this._next();
            if (e.key === 'ArrowLeft' || e.key === 'a') this._prev();
            if (e.code === 'Space') { e.preventDefault(); this._flip(); }
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); this._flip(); }
            if (this._isFlipped) {
                if (e.key === '1') this._rate('again');
                if (e.key === '2') this._rate('hard');
                if (e.key === '3') this._rate('good');
                if (e.key === '4') this._rate('easy');
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
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'flashcards');
    },

    loadProgress(data) {
        if (data?.mastered) this._mastered = data.mastered;
        if (data?.ratings) this._ratings = data.ratings;
    }
});
