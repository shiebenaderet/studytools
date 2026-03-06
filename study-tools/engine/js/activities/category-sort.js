StudyEngine.registerActivity({
    id: 'category-sort',
    name: 'Category Sort',
    icon: 'fas fa-layer-group',
    description: 'Sort items into the correct categories',
    category: 'practice',
    requires: ['vocabulary'],

    _container: null,
    _config: null,
    _categories: [],
    _items: [],
    _bestScore: 0,
    _attempts: 0,

    render(container, config) {
        this._container = container;
        this._config = config;

        // Load saved progress
        const saved = ProgressManager.getActivityProgress(config.unit.id, 'category-sort');
        this._bestScore = saved?.bestScore || 0;
        this._attempts = saved?.attempts || 0;

        // Determine data source: explicit sortingData or auto-generate from vocabulary
        let categories, items;

        if (config.sortingData) {
            categories = config.sortingData.categories;
            items = config.sortingData.items.map((item, i) => ({
                id: i,
                text: item.text,
                category: item.category
            }));
        } else {
            // Auto-generate from vocabulary grouped by category field
            const vocab = MasteryManager.getUnlockedVocabulary(config.unit.id, config);
            if (!vocab || vocab.length === 0) return;

            const categoryMap = {};
            vocab.forEach((term, i) => {
                const cat = term.category || 'Uncategorized';
                if (!categoryMap[cat]) categoryMap[cat] = [];
                categoryMap[cat].push({
                    id: i,
                    text: term.term,
                    category: cat
                });
            });

            categories = Object.keys(categoryMap);
            items = [];
            for (const cat of categories) {
                items.push(...categoryMap[cat]);
            }
        }

        if (!categories || categories.length === 0 || !items || items.length === 0) return;

        this._categories = categories;
        this._items = items;

        container.textContent = '';

        // Main wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'category-sort-container';

        // Title
        const title = document.createElement('h2');
        title.textContent = config.sortingData?.title || 'Category Sort';
        wrapper.appendChild(title);

        // Instructions
        const instructions = document.createElement('div');
        instructions.className = 'timeline-instructions';
        const instructionText = document.createElement('p');
        instructionText.textContent = config.sortingData?.instruction || 'Sort each item into the correct category. Drag and drop, or tap an item to select it then tap a category to place it. Tap a placed item to remove it.';
        instructions.appendChild(instructionText);
        wrapper.appendChild(instructions);

        // Progress display
        const progressInfo = document.createElement('div');
        progressInfo.className = 'explanation';
        progressInfo.style.marginBottom = '16px';
        const progressText = document.createElement('p');
        progressText.id = 'category-sort-progress';
        progressText.textContent = 'Attempts: ' + this._attempts + ' | Best score: ' + this._bestScore + '/' + items.length;
        progressInfo.appendChild(progressText);
        wrapper.appendChild(progressInfo);

        // Items pool (shuffled draggable cards)
        const poolLabel = document.createElement('h3');
        poolLabel.textContent = 'Items to Sort:';
        wrapper.appendChild(poolLabel);

        const pool = document.createElement('div');
        pool.className = 'timeline-items-container';
        pool.id = 'category-sort-pool';

        const shuffled = this._shuffle([...items]);
        shuffled.forEach(item => {
            const card = this._createItemCard(item);
            pool.appendChild(card);
        });

        wrapper.appendChild(pool);

        // Category buckets
        const bucketsLabel = document.createElement('h3');
        bucketsLabel.textContent = 'Categories:';
        bucketsLabel.style.marginTop = '24px';
        wrapper.appendChild(bucketsLabel);

        const bucketsContainer = document.createElement('div');
        bucketsContainer.id = 'category-sort-buckets';
        bucketsContainer.style.display = 'grid';
        bucketsContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(220px, 1fr))';
        bucketsContainer.style.gap = '16px';
        bucketsContainer.style.marginTop = '12px';

        categories.forEach(cat => {
            const bucket = document.createElement('div');
            bucket.className = 'card';
            bucket.dataset.category = cat;
            bucket.style.border = '2px dashed var(--border, #d1d5db)';
            bucket.style.minHeight = '120px';
            bucket.style.padding = '12px';
            bucket.style.transition = 'border-color 0.2s';

            const bucketLabel = document.createElement('div');
            bucketLabel.style.fontWeight = 'bold';
            bucketLabel.style.marginBottom = '8px';
            bucketLabel.style.textAlign = 'center';
            bucketLabel.style.color = 'var(--primary, #1669C5)';
            bucketLabel.textContent = cat;
            bucket.appendChild(bucketLabel);

            const dropZone = document.createElement('div');
            dropZone.className = 'category-sort-dropzone';
            dropZone.dataset.category = cat;
            dropZone.style.minHeight = '60px';
            bucket.appendChild(dropZone);

            // Tap-to-select: click a bucket/dropzone to place the selected card
            dropZone.addEventListener('click', function() {
                var selected = document.querySelector('.timeline-item.tap-selected');
                if (!selected) return;

                selected.classList.remove('tap-selected');
                selected.classList.add('placed');
                dropZone.appendChild(selected);
            });

            bucketsContainer.appendChild(bucket);
        });

        wrapper.appendChild(bucketsContainer);

        // Buttons
        const buttonRow = document.createElement('div');
        buttonRow.style.display = 'flex';
        buttonRow.style.gap = '12px';
        buttonRow.style.justifyContent = 'center';
        buttonRow.style.marginTop = '20px';

        const checkBtn = document.createElement('button');
        checkBtn.className = 'nav-button';
        checkBtn.id = 'category-sort-check-btn';
        checkBtn.textContent = 'Check Answer';
        checkBtn.addEventListener('click', () => this.checkAnswer());
        buttonRow.appendChild(checkBtn);

        const resetBtn = document.createElement('button');
        resetBtn.className = 'nav-button';
        resetBtn.id = 'category-sort-reset-btn';
        resetBtn.textContent = 'Reset';
        resetBtn.addEventListener('click', () => this.reset());
        buttonRow.appendChild(resetBtn);

        wrapper.appendChild(buttonRow);

        // Result display
        const resultArea = document.createElement('div');
        resultArea.id = 'category-sort-result';
        resultArea.className = 'explanation';
        resultArea.style.marginTop = '16px';
        resultArea.style.display = 'none';
        wrapper.appendChild(resultArea);

        container.appendChild(wrapper);

        // Initialize drag and drop
        this._initDragDrop();
    },

    _createItemCard(item) {
        const card = document.createElement('div');
        card.className = 'timeline-item';
        card.id = 'category-sort-item-' + item.id;
        card.draggable = true;
        card.dataset.itemId = String(item.id);
        card.dataset.correctCategory = item.category;

        const textEl = document.createElement('div');
        textEl.className = 'timeline-item-title';
        textEl.textContent = item.text;
        card.appendChild(textEl);

        // Tap-to-select: click/tap to select a card or remove a placed card
        card.addEventListener('click', function(e) {
            // Don't interfere with drag
            if (e.defaultPrevented) return;

            // If this card is already placed, remove it back to pool
            if (card.classList.contains('placed')) {
                card.classList.remove('placed', 'tap-selected');
                var pool = document.getElementById('category-sort-pool');
                if (pool) pool.appendChild(card);
                return;
            }

            // Toggle selection
            var allCards = document.querySelectorAll('#category-sort-pool .timeline-item, .category-sort-dropzone .timeline-item');
            for (var i = 0; i < allCards.length; i++) {
                allCards[i].classList.remove('tap-selected');
            }
            card.classList.add('tap-selected');
        });

        return card;
    },

    _initDragDrop() {
        const pool = document.getElementById('category-sort-pool');
        const bucketsContainer = document.getElementById('category-sort-buckets');
        if (!pool || !bucketsContainer) return;

        // Dragstart on all item cards
        const cards = pool.querySelectorAll('.timeline-item');
        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', card.id);
                card.style.opacity = '0.5';
            });
            card.addEventListener('dragend', () => {
                card.style.opacity = '1';
            });
        });

        // Drop zones in each bucket
        const dropZones = bucketsContainer.querySelectorAll('.category-sort-dropzone');
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.parentElement.style.borderColor = 'var(--primary, #1669C5)';
            });
            zone.addEventListener('dragleave', () => {
                zone.parentElement.style.borderColor = '';
            });
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.parentElement.style.borderColor = '';
                const cardId = e.dataTransfer.getData('text/plain');
                const card = document.getElementById(cardId);
                if (!card) return;

                // Re-attach drag listeners since card may have moved
                card.classList.add('placed');
                zone.appendChild(card);
            });
        });

        // Allow dropping back to pool
        pool.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        pool.addEventListener('drop', (e) => {
            e.preventDefault();
            const cardId = e.dataTransfer.getData('text/plain');
            const card = document.getElementById(cardId);
            if (!card) return;
            card.classList.remove('placed');
            pool.appendChild(card);
        });
    },

    checkAnswer() {
        const bucketsContainer = document.getElementById('category-sort-buckets');
        const resultArea = document.getElementById('category-sort-result');
        const pool = document.getElementById('category-sort-pool');
        if (!bucketsContainer || !resultArea) return;

        // Check if all items have been placed
        const unplacedCards = pool ? pool.querySelectorAll('.timeline-item') : [];
        resultArea.style.display = 'block';
        resultArea.textContent = '';

        if (unplacedCards.length > 0) {
            const msg = document.createElement('p');
            msg.textContent = 'Please sort all items into categories before checking your answer.';
            msg.style.color = '#e74c3c';
            resultArea.appendChild(msg);
            return;
        }

        let correctCount = 0;
        const totalItems = this._items.length;

        // Check each drop zone
        const dropZones = bucketsContainer.querySelectorAll('.category-sort-dropzone');
        dropZones.forEach(zone => {
            const bucketCategory = zone.dataset.category;
            const cards = zone.querySelectorAll('.timeline-item');
            cards.forEach(card => {
                const correctCategory = card.dataset.correctCategory;
                if (correctCategory === bucketCategory) {
                    correctCount++;
                    card.style.borderLeft = '4px solid #27ae60';
                } else {
                    card.style.borderLeft = '4px solid #e74c3c';
                    // Show correct category
                    const hint = document.createElement('div');
                    hint.style.fontSize = '0.8em';
                    hint.style.color = '#e74c3c';
                    hint.style.marginTop = '4px';
                    hint.textContent = 'Correct: ' + correctCategory;
                    card.appendChild(hint);
                }
            });
        });

        this._attempts++;

        // Update best score
        if (correctCount > this._bestScore) {
            this._bestScore = correctCount;
        }

        // Show score
        const scoreMsg = document.createElement('p');
        if (correctCount === totalItems) {
            scoreMsg.textContent = 'Perfect! You sorted all ' + totalItems + ' items correctly!';
            scoreMsg.style.color = '#27ae60';
            scoreMsg.style.fontWeight = 'bold';
        } else {
            scoreMsg.textContent = 'You got ' + correctCount + ' out of ' + totalItems + ' correct. Green borders show correct placements, red borders show incorrect ones.';
            scoreMsg.style.color = '#e74c3c';
        }
        resultArea.appendChild(scoreMsg);

        // Update progress display
        const progressEl = document.getElementById('category-sort-progress');
        if (progressEl) {
            progressEl.textContent = 'Attempts: ' + this._attempts + ' | Best score: ' + this._bestScore + '/' + totalItems;
        }

        // Disable check button after answering
        const checkBtn = document.getElementById('category-sort-check-btn');
        if (checkBtn) checkBtn.disabled = true;

        if (typeof AchievementManager !== 'undefined') {
            var pct = totalItems > 0 ? Math.round((correctCount / totalItems) * 100) : 0;
            AchievementManager.checkAndAward({ activity: 'category-sort', score: pct, event: correctCount === totalItems ? 'perfect' : 'complete', totalCorrect: correctCount });
        }

        this._saveProgress();
    },

    reset() {
        if (this._container && this._config) {
            this.render(this._container, this._config);
        }
    },

    _saveProgress() {
        ProgressManager.saveActivityProgress(StudyEngine.config.unit.id, 'category-sort', {
            bestScore: this._bestScore,
            attempts: this._attempts
        });
    },

    _shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    activate() {},
    deactivate() {},

    getProgress() {
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'category-sort');
    },

    loadProgress(data) {
        if (data) {
            this._bestScore = data.bestScore || 0;
            this._attempts = data.attempts || 0;
        }
    }
});
