StudyEngine.registerActivity({
    id: 'resources',
    name: 'Resource Library',
    icon: 'fas fa-book-open',
    description: 'Explore terms with links to learn more',
    category: 'study',
    requires: ['vocabulary'],

    render: function(container, config) {
        var vocabulary = config.vocabulary || [];

        // Load flashcard mastery data
        var fcProgress = ProgressManager.getActivityProgress(config.unit.id, 'flashcards') || {};
        var masteredTerms = fcProgress.mastered || [];
        var ratings = fcProgress.ratings || {};

        // Group terms by category
        var categoryMap = {};
        var categoryOrder = [];
        vocabulary.forEach(function(item) {
            var cat = item.category || 'Uncategorized';
            if (!categoryMap[cat]) {
                categoryMap[cat] = [];
                categoryOrder.push(cat);
            }
            categoryMap[cat].push(item);
        });

        // Main wrapper
        var wrapper = document.createElement('div');
        wrapper.className = 'res-container';

        // Search bar
        var searchWrap = document.createElement('div');
        searchWrap.className = 'res-search-wrap';

        var searchIcon = document.createElement('i');
        searchIcon.className = 'fas fa-search res-search-icon';
        searchWrap.appendChild(searchIcon);

        var searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'res-search-input';
        searchInput.placeholder = 'Search terms...';
        searchInput.setAttribute('aria-label', 'Search terms');
        searchWrap.appendChild(searchInput);

        wrapper.appendChild(searchWrap);

        // Sections container
        var sectionsContainer = document.createElement('div');
        sectionsContainer.className = 'res-sections';

        // Build category sections
        categoryOrder.forEach(function(cat) {
            var terms = categoryMap[cat];

            var section = document.createElement('div');
            section.className = 'res-section';
            section.setAttribute('data-category', cat);

            // Category header
            var header = document.createElement('div');
            header.className = 'res-category-header';
            header.setAttribute('role', 'button');
            header.setAttribute('tabindex', '0');

            var headerLeft = document.createElement('div');
            headerLeft.className = 'res-header-left';

            var chevron = document.createElement('i');
            chevron.className = 'fas fa-chevron-down res-chevron';
            headerLeft.appendChild(chevron);

            var headerTitle = document.createElement('span');
            headerTitle.className = 'res-header-title';
            headerTitle.textContent = cat;
            headerLeft.appendChild(headerTitle);

            header.appendChild(headerLeft);

            var masteredCount = 0;
            terms.forEach(function(t) {
                if (masteredTerms.indexOf(t.term) !== -1 || ratings[t.term] === 'easy') masteredCount++;
            });

            var countBadge = document.createElement('span');
            countBadge.className = 'res-count-badge';
            countBadge.textContent = masteredCount + '/' + terms.length + ' mastered';
            header.appendChild(countBadge);

            section.appendChild(header);

            // Terms list
            var termsList = document.createElement('div');
            termsList.className = 'res-terms-list';

            terms.forEach(function(item) {
                var card = document.createElement('div');
                card.className = 'res-term-card';
                card.setAttribute('data-term', item.term.toLowerCase());

                if (item.imageUrl) {
                    var thumb = document.createElement('img');
                    thumb.className = 'res-term-thumb';
                    thumb.src = item.imageUrl;
                    thumb.alt = item.term;
                    thumb.loading = 'lazy';
                    thumb.addEventListener('error', function() { this.style.display = 'none'; });
                    card.appendChild(thumb);
                }

                var termInfo = document.createElement('div');
                termInfo.className = 'res-term-info';

                var termNameRow = document.createElement('div');
                termNameRow.className = 'res-term-name-row';

                var termName = document.createElement('span');
                termName.className = 'res-term-name';
                termName.textContent = item.term;
                termNameRow.appendChild(termName);

                // Mastery indicator
                var rating = ratings[item.term];
                var isMastered = masteredTerms.indexOf(item.term) !== -1;
                if (isMastered || rating === 'easy') {
                    var badge = document.createElement('span');
                    badge.className = 'res-mastery-badge res-mastery-mastered';
                    badge.title = 'Mastered';
                    var badgeIcon = document.createElement('i');
                    badgeIcon.className = 'fas fa-check-circle';
                    badge.appendChild(badgeIcon);
                    badge.appendChild(document.createTextNode(' Mastered'));
                    termNameRow.appendChild(badge);
                } else if (rating === 'again' || rating === 'hard') {
                    var badge = document.createElement('span');
                    badge.className = 'res-mastery-badge res-mastery-study';
                    badge.title = 'Needs review';
                    var badgeIcon = document.createElement('i');
                    badgeIcon.className = 'fas fa-redo';
                    badge.appendChild(badgeIcon);
                    badge.appendChild(document.createTextNode(' Study'));
                    termNameRow.appendChild(badge);
                } else if (rating === 'good') {
                    var badge = document.createElement('span');
                    badge.className = 'res-mastery-badge res-mastery-learning';
                    badge.title = 'Learning';
                    var badgeIcon = document.createElement('i');
                    badgeIcon.className = 'fas fa-book-open';
                    badge.appendChild(badgeIcon);
                    badge.appendChild(document.createTextNode(' Learning'));
                    termNameRow.appendChild(badge);
                }

                termInfo.appendChild(termNameRow);

                var termDef = document.createElement('div');
                termDef.className = 'res-term-def';
                termDef.textContent = item.definition;
                termInfo.appendChild(termDef);

                if (item.simpleExplanation) {
                    var explainBtn = document.createElement('button');
                    explainBtn.className = 'fc-explain-btn';
                    var bulbIcon = document.createElement('i');
                    bulbIcon.className = 'fas fa-lightbulb';
                    explainBtn.appendChild(bulbIcon);
                    explainBtn.appendChild(document.createTextNode(' Explain it to me'));
                    var explainBox = document.createElement('div');
                    explainBox.className = 'fc-explain-box';
                    explainBox.textContent = item.simpleExplanation;
                    explainBox.style.display = 'none';
                    explainBtn.addEventListener('click', (function(btn, box) {
                        return function(e) {
                            e.stopPropagation();
                            var showing = box.style.display !== 'none';
                            box.style.display = showing ? 'none' : 'block';
                            btn.classList.toggle('active', !showing);
                        };
                    })(explainBtn, explainBox));
                    termInfo.appendChild(explainBtn);
                    termInfo.appendChild(explainBox);
                }

                card.appendChild(termInfo);

                // Link buttons
                var links = document.createElement('div');
                links.className = 'res-links';

                // Kids encyclopedia link
                var kiddle = document.createElement('a');
                kiddle.className = 'res-link-btn res-link-kiddle';
                kiddle.href = 'https://wiki.kiddle.co/' + encodeURIComponent(item.term.replace(/ /g, '_'));
                kiddle.target = '_blank';
                kiddle.rel = 'noopener noreferrer';
                var kiddleIcon = document.createElement('i');
                kiddleIcon.className = 'fas fa-child';
                kiddle.appendChild(kiddleIcon);
                kiddle.appendChild(document.createTextNode(' Kids Wiki'));
                links.appendChild(kiddle);

                // Wikipedia link
                var wiki = document.createElement('a');
                wiki.className = 'res-link-btn res-link-wiki';
                wiki.href = item.wikiUrl || ('https://en.wikipedia.org/wiki/' + encodeURIComponent(item.term.replace(/ /g, '_')));
                wiki.target = '_blank';
                wiki.rel = 'noopener noreferrer';
                var wikiIcon = document.createElement('i');
                wikiIcon.className = 'fas fa-globe';
                wiki.appendChild(wikiIcon);
                wiki.appendChild(document.createTextNode(' Wikipedia'));
                links.appendChild(wiki);

                // YouTube link
                var yt = document.createElement('a');
                yt.className = 'res-link-btn res-link-youtube';
                yt.href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(item.term + ' history for kids');
                yt.target = '_blank';
                yt.rel = 'noopener noreferrer';
                var ytIcon = document.createElement('i');
                ytIcon.className = 'fab fa-youtube';
                yt.appendChild(ytIcon);
                yt.appendChild(document.createTextNode(' YouTube'));
                links.appendChild(yt);

                card.appendChild(links);
                termsList.appendChild(card);
            });

            section.appendChild(termsList);

            // Toggle collapse
            header.addEventListener('click', function() {
                var isCollapsed = section.classList.contains('res-collapsed');
                if (isCollapsed) {
                    section.classList.remove('res-collapsed');
                } else {
                    section.classList.add('res-collapsed');
                }
            });

            header.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    header.click();
                }
            });

            sectionsContainer.appendChild(section);
        });

        wrapper.appendChild(sectionsContainer);

        // Search filtering
        searchInput.addEventListener('input', function() {
            var query = searchInput.value.toLowerCase().trim();
            var sections = sectionsContainer.querySelectorAll('.res-section');

            for (var i = 0; i < sections.length; i++) {
                var sec = sections[i];
                var cards = sec.querySelectorAll('.res-term-card');
                var visibleCount = 0;

                for (var j = 0; j < cards.length; j++) {
                    var cardTerm = cards[j].getAttribute('data-term') || '';
                    var defEl = cards[j].querySelector('.res-term-def');
                    var defText = defEl ? defEl.textContent.toLowerCase() : '';

                    if (!query || cardTerm.indexOf(query) !== -1 || defText.indexOf(query) !== -1) {
                        cards[j].style.display = '';
                        visibleCount++;
                    } else {
                        cards[j].style.display = 'none';
                    }
                }

                if (query && visibleCount === 0) {
                    sec.style.display = 'none';
                } else {
                    sec.style.display = '';
                    // Update count badge to show visible
                    var badge = sec.querySelector('.res-count-badge');
                    if (badge) {
                        if (query) {
                            badge.textContent = visibleCount + ' of ' + cards.length + (cards.length === 1 ? ' term' : ' terms');
                        } else {
                            badge.textContent = cards.length + (cards.length === 1 ? ' term' : ' terms');
                        }
                    }
                    // Auto-expand when searching
                    if (query) {
                        sec.classList.remove('res-collapsed');
                    }
                }
            }
        });

        container.appendChild(wrapper);
    },

    activate: function() {},
    deactivate: function() {},

    getProgress: function() {
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'resources');
    },

    loadProgress: function(data) {}
});
