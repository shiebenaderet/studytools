StudyEngine.registerActivity({
    id: 'textbook',
    name: 'Textbook',
    icon: 'fas fa-book-open',
    description: 'Read about the Early Republic in an interactive textbook',
    category: 'study',
    requires: [],

    _container: null,
    _config: null,
    _content: null,
    _currentSegment: 0,
    _currentSection: 0,
    _readingLevel: 'standard',
    _progress: null,
    _vocabMap: null,
    _popupEl: null,

    // Reading level definitions — labels are non-stigmatizing
    _LEVELS: [
        { id: 'simplified', label: 'Easier', icon: 'fas fa-feather' },
        { id: 'standard', label: 'On Grade', icon: 'fas fa-book' },
        { id: 'advanced', label: 'Challenge', icon: 'fas fa-graduation-cap' }
    ],

    // Allowlist of safe HTML tags for content rendering
    _SAFE_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'h4', 'h5', 'h6', 'span', 'div', 'blockquote', 'hr'],

    render(container, config) {
        this._container = container;
        this._config = config;
        this._currentSegment = 0;
        this._currentSection = 0;

        // Build vocab lookup map (lowercase term -> vocab entry)
        this._vocabMap = {};
        if (config.vocabulary) {
            config.vocabulary.forEach(function(v) {
                this._vocabMap[v.term.toLowerCase()] = v;
            }.bind(this));
        }

        // Load saved progress
        this._progress = ProgressManager.getActivityProgress(config.unit.id, 'textbook') || {
            sectionsRead: {},
            quickChecks: {},
            readingLevel: 'standard'
        };
        this._readingLevel = this._progress.readingLevel || 'standard';

        container.textContent = '';
        this._loadContent();
    },

    _loadContent() {
        var self = this;
        var unitId = this._config.unit.id;
        var url = '../units/' + unitId + '/textbook.json';

        fetch(url)
            .then(function(res) {
                if (!res.ok) throw new Error('Failed to load textbook content');
                return res.json();
            })
            .then(function(data) {
                // Support both { segments: [...] } and { textbookContent: { segments: [...] } }
                self._content = data.textbookContent || data;
                // Deep link: #textbook/segment-id/section-id
                var params = self._deepLinkParams || [];
                var deepLinked = false;
                if (params.length >= 1 && self._content.segments) {
                    var segId = params[0];
                    var secId = params[1];
                    for (var si = 0; si < self._content.segments.length; si++) {
                        if (self._content.segments[si].id === segId) {
                            self._currentSegment = si;
                            if (secId) {
                                for (var sci = 0; sci < self._content.segments[si].sections.length; sci++) {
                                    if (self._content.segments[si].sections[sci].id === secId) {
                                        self._currentSection = sci;
                                        break;
                                    }
                                }
                            }
                            deepLinked = true;
                            break;
                        }
                    }
                }
                // Fall back to saved position if no deep link
                if (!deepLinked && self._progress.lastSegment !== undefined) {
                    self._currentSegment = self._progress.lastSegment;
                    self._currentSection = self._progress.lastSection || 0;
                }
                self._renderTextbook();
                self._updateHash();
            })
            .catch(function() {
                var msg = document.createElement('div');
                msg.style.cssText = 'text-align:center;padding:60px 20px;color:var(--text-secondary);';
                var icon = document.createElement('i');
                icon.className = 'fas fa-book-open';
                icon.style.cssText = 'font-size:2.5em;color:var(--text-muted);margin-bottom:16px;display:block;';
                msg.appendChild(icon);
                var text = document.createElement('p');
                text.textContent = 'Textbook content is not available yet. Check back soon!';
                msg.appendChild(text);
                self._container.appendChild(msg);
            });
    },

    /**
     * Sanitizes HTML content by only allowing safe tags.
     * Content comes from teacher-authored textbook.json, but we sanitize
     * defensively to prevent XSS if the file were ever tampered with.
     */
    _sanitizeHTML(html) {
        var div = document.createElement('div');
        div.textContent = html; // Escape everything first
        var escaped = div.textContent;

        // Now selectively re-enable safe tags
        var safeTags = this._SAFE_TAGS;
        safeTags.forEach(function(tag) {
            // Opening tags (with optional attributes stripped)
            var openPattern = new RegExp('&lt;' + tag + '(\\s[^&]*?)?&gt;', 'gi');
            escaped = escaped.replace(openPattern, '<' + tag + '>');
            // Closing tags
            var closePattern = new RegExp('&lt;/' + tag + '&gt;', 'gi');
            escaped = escaped.replace(closePattern, '</' + tag + '>');
        });
        // Allow <br/> and <br /> self-closing
        escaped = escaped.replace(/&lt;br\s*\/?&gt;/gi, '<br>');
        // Allow <hr/> and <hr /> self-closing
        escaped = escaped.replace(/&lt;hr\s*\/?&gt;/gi, '<hr>');
        return escaped;
    },

    _renderTextbook() {
        var container = this._container;
        container.textContent = '';
        var self = this;
        var segments = this._content.segments;
        if (!segments || segments.length === 0) return;

        var wrapper = document.createElement('div');
        wrapper.className = 'tb-wrapper';
        wrapper.id = 'tb-wrapper';

        // Top bar: segment nav + level picker in one row
        var topBar = document.createElement('div');
        topBar.className = 'tb-top-bar';

        // Segment nav (left side)
        var segNav = document.createElement('div');
        segNav.className = 'tb-seg-nav';
        segNav.id = 'tb-seg-nav';

        segments.forEach(function(seg, i) {
            var btn = document.createElement('button');
            btn.className = 'tb-seg-btn' + (i === self._currentSegment ? ' active' : '');
            var segIcon = document.createElement('i');
            segIcon.className = seg.icon || 'fas fa-bookmark';
            btn.appendChild(segIcon);
            btn.appendChild(document.createTextNode(' ' + seg.title));

            // Show completion badge
            var readCount = self._getSegmentReadCount(seg);
            if (readCount === seg.sections.length && seg.sections.length > 0) {
                var checkmark = document.createElement('i');
                checkmark.className = 'fas fa-check-circle';
                checkmark.style.cssText = 'margin-left:6px;color:var(--success);';
                btn.appendChild(checkmark);
            }

            btn.addEventListener('click', function() {
                self._currentSegment = i;
                self._currentSection = 0;
                self._renderTextbook();
            });
            segNav.appendChild(btn);
        });
        topBar.appendChild(segNav);

        // Reading level picker (right side)
        var levelPicker = document.createElement('div');
        levelPicker.className = 'tb-level-picker';
        this._LEVELS.forEach(function(level) {
            var btn = document.createElement('button');
            btn.className = 'tb-level-btn' + (level.id === self._readingLevel ? ' active' : '');
            btn.title = level.label;
            var lvlIcon = document.createElement('i');
            lvlIcon.className = level.icon;
            btn.appendChild(lvlIcon);
            btn.appendChild(document.createTextNode(' ' + level.label));
            btn.addEventListener('click', function() {
                self._readingLevel = level.id;
                self._progress.readingLevel = level.id;
                self._saveProgress();
                self._renderSection(wrapper);
                levelPicker.querySelectorAll('.tb-level-btn').forEach(function(b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
            });
            levelPicker.appendChild(btn);
        });
        topBar.appendChild(levelPicker);
        wrapper.appendChild(topBar);

        // Body: sidebar tabs + reading area
        var seg = segments[this._currentSegment];
        var body = document.createElement('div');
        body.className = 'tb-body';

        // Sidebar with section tabs
        var sidebar = document.createElement('div');
        sidebar.className = 'tb-sidebar';
        sidebar.id = 'tb-sidebar';

        // Toggle button to collapse/expand
        var toggle = document.createElement('button');
        toggle.className = 'tb-sidebar-toggle';
        toggle.title = 'Toggle sections';
        var toggleIcon = document.createElement('i');
        toggleIcon.className = 'fas fa-bars';
        toggle.appendChild(toggleIcon);
        toggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            toggleIcon.className = sidebar.classList.contains('collapsed') ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
        });
        sidebar.appendChild(toggle);

        // Section tab list
        var tabList = document.createElement('div');
        tabList.className = 'tb-tab-list';

        seg.sections.forEach(function(section, si) {
            var tab = document.createElement('button');
            tab.className = 'tb-tab' + (si === self._currentSection ? ' active' : '');
            var isRead = self._isSectionRead(seg.id, section.id);
            if (isRead) tab.classList.add('read');

            var num = document.createElement('span');
            num.className = 'tb-tab-num';
            num.textContent = (si + 1);
            tab.appendChild(num);

            var tabText = document.createElement('span');
            tabText.className = 'tb-tab-label';
            tabText.textContent = section.heading;
            tab.appendChild(tabText);

            if (isRead) {
                var readIcon = document.createElement('i');
                readIcon.className = 'fas fa-check';
                readIcon.style.cssText = 'margin-left:auto;color:var(--success);font-size:0.7em;flex-shrink:0;';
                tab.appendChild(readIcon);
            }

            tab.addEventListener('click', function() {
                self._currentSection = si;
                self._renderSection(wrapper);
                self._scrollToReading();
                tabList.querySelectorAll('.tb-tab').forEach(function(t) { t.classList.remove('active'); });
                tab.classList.add('active');
                // Auto-collapse sidebar on mobile
                if (window.innerWidth <= 768) {
                    sidebar.classList.add('collapsed');
                }
            });
            tabList.appendChild(tab);
        });
        sidebar.appendChild(tabList);
        body.appendChild(sidebar);

        // Reading area
        var readingArea = document.createElement('div');
        readingArea.className = 'tb-reading';
        readingArea.id = 'tb-reading';
        body.appendChild(readingArea);

        wrapper.appendChild(body);

        // Progress bar
        var progressWrap = document.createElement('div');
        progressWrap.className = 'tb-progress-wrap';
        progressWrap.id = 'tb-progress-wrap';
        wrapper.appendChild(progressWrap);

        container.appendChild(wrapper);

        // Render current section
        this._renderSection(wrapper);
        this._renderProgress();
    },

    _renderSection(wrapper) {
        var readingArea = document.getElementById('tb-reading');
        if (!readingArea) return;
        readingArea.textContent = '';
        var self = this;

        var seg = this._content.segments[this._currentSegment];
        var section = seg.sections[this._currentSection];
        if (!section) return;

        // Section heading with copy-link button
        var heading = document.createElement('h3');
        heading.className = 'tb-section-heading';
        var headingText = document.createElement('span');
        headingText.textContent = section.heading;
        heading.appendChild(headingText);

        var linkBtn = document.createElement('button');
        linkBtn.className = 'tb-link-btn';
        linkBtn.title = 'Copy link to this section';
        var linkIcon = document.createElement('i');
        linkIcon.className = 'fas fa-link';
        linkBtn.appendChild(linkIcon);
        linkBtn.addEventListener('click', function() {
            var url = window.location.origin + window.location.pathname + window.location.search + '#textbook/' + seg.id + '/' + section.id;
            navigator.clipboard.writeText(url).then(function() {
                linkIcon.className = 'fas fa-check';
                linkBtn.classList.add('copied');
                setTimeout(function() {
                    linkIcon.className = 'fas fa-link';
                    linkBtn.classList.remove('copied');
                }, 2000);
            });
        });
        heading.appendChild(linkBtn);
        readingArea.appendChild(heading);

        // Section image (figure with caption)
        if (section.image) {
            var figure = document.createElement('figure');
            figure.className = 'tb-figure';
            if (section.image.float) figure.classList.add('tb-figure-' + section.image.float);
            var img = document.createElement('img');
            img.className = 'tb-figure-img';
            img.src = section.image.src;
            img.alt = section.image.caption || section.heading;
            img.loading = 'lazy';
            figure.appendChild(img);
            if (section.image.caption) {
                var figcaption = document.createElement('figcaption');
                figcaption.className = 'tb-figure-caption';
                figcaption.textContent = section.image.caption;
                if (section.image.credit) {
                    var credit = document.createElement('span');
                    credit.className = 'tb-figure-credit';
                    credit.textContent = ' ' + section.image.credit;
                    figcaption.appendChild(credit);
                }
                figure.appendChild(figcaption);
            }
            readingArea.appendChild(figure);
        }

        // Source note
        if (section.sourceNote) {
            var sourceNote = document.createElement('div');
            sourceNote.className = 'tb-source-note';
            var noteIcon = document.createElement('i');
            noteIcon.className = 'fas fa-info-circle';
            sourceNote.appendChild(noteIcon);
            sourceNote.appendChild(document.createTextNode(' ' + section.sourceNote));
            readingArea.appendChild(sourceNote);
        }

        // Main content — sanitize, then highlight vocab
        var contentDiv = document.createElement('div');
        contentDiv.className = 'tb-content';
        var rawContent = typeof section.content === 'object' ? (section.content[this._readingLevel] || section.content.standard || '') : (section.content || '');
        var sanitized = this._sanitizeHTML(rawContent);
        var highlighted = this._highlightVocab(sanitized);
        contentDiv.innerHTML = highlighted;
        readingArea.appendChild(contentDiv);

        // Attach vocab popup listeners
        this._attachVocabListeners(contentDiv);

        // Key Idea callout (if present)
        if (section.keyIdea) {
            var keyBox = document.createElement('div');
            keyBox.className = 'tb-callout tb-callout-key';
            var keyTitle = document.createElement('div');
            keyTitle.className = 'tb-callout-title';
            var keyIcon = document.createElement('i');
            keyIcon.className = 'fas fa-key';
            keyTitle.appendChild(keyIcon);
            keyTitle.appendChild(document.createTextNode(' Key Idea'));
            keyBox.appendChild(keyTitle);
            var keyText = document.createElement('div');
            keyText.className = 'tb-callout-text';
            keyText.textContent = section.keyIdea;
            keyBox.appendChild(keyText);
            readingArea.appendChild(keyBox);
        }

        // Primary Source quote (if present)
        if (section.primarySource) {
            var quoteBox = document.createElement('div');
            quoteBox.className = 'tb-callout tb-callout-source';
            var quoteTitle = document.createElement('div');
            quoteTitle.className = 'tb-callout-title';
            var quoteIcon = document.createElement('i');
            quoteIcon.className = 'fas fa-quote-left';
            quoteTitle.appendChild(quoteIcon);
            quoteTitle.appendChild(document.createTextNode(' Primary Source'));
            quoteBox.appendChild(quoteTitle);
            var quoteText = document.createElement('blockquote');
            quoteText.className = 'tb-quote';
            quoteText.textContent = section.primarySource.text;
            quoteBox.appendChild(quoteText);
            if (section.primarySource.attribution) {
                var attr = document.createElement('div');
                attr.className = 'tb-quote-attr';
                attr.textContent = '\u2014 ' + section.primarySource.attribution;
                quoteBox.appendChild(attr);
            }
            readingArea.appendChild(quoteBox);
        }

        // Check-in: Stop & Think (reflection, no tracking)
        if (section.checkIn && section.checkIn.type === 'stop-and-think') {
            var thinkBox = document.createElement('div');
            thinkBox.className = 'tb-callout tb-callout-think';
            var thinkTitle = document.createElement('div');
            thinkTitle.className = 'tb-callout-title';
            var thinkIcon = document.createElement('i');
            thinkIcon.className = 'fas fa-lightbulb';
            thinkTitle.appendChild(thinkIcon);
            thinkTitle.appendChild(document.createTextNode(' Stop & Think'));
            thinkBox.appendChild(thinkTitle);
            var thinkPrompt = document.createElement('div');
            thinkPrompt.className = 'tb-callout-text';
            thinkPrompt.textContent = section.checkIn.prompt;
            thinkBox.appendChild(thinkPrompt);
            if (section.checkIn.hint) {
                var hintEl = document.createElement('div');
                hintEl.className = 'tb-think-hint';
                var hintIcon = document.createElement('i');
                hintIcon.className = 'fas fa-hand-point-right';
                hintEl.appendChild(hintIcon);
                hintEl.appendChild(document.createTextNode(' Hint: ' + section.checkIn.hint));
                thinkBox.appendChild(hintEl);
            }
            readingArea.appendChild(thinkBox);
        }

        // Check-in: Quick Check (MC, tracked)
        if (section.checkIn && section.checkIn.type === 'quick-check') {
            this._renderQuickCheck(readingArea, section, seg.id);
        }

        // Mark as Read button
        var isRead = this._isSectionRead(seg.id, section.id);
        var markBtn = document.createElement('button');
        markBtn.className = 'tb-mark-read' + (isRead ? ' read' : '');
        markBtn.id = 'tb-mark-read';
        var markIcon = document.createElement('i');
        markIcon.className = isRead ? 'fas fa-check-circle' : 'far fa-circle';
        markBtn.appendChild(markIcon);
        markBtn.appendChild(document.createTextNode(isRead ? ' Section Complete' : ' Mark as Read'));
        if (!isRead) {
            markBtn.addEventListener('click', function() {
                self._markSectionRead(seg.id, section.id);
                markBtn.className = 'tb-mark-read read';
                markBtn.textContent = '';
                var doneIcon = document.createElement('i');
                doneIcon.className = 'fas fa-check-circle';
                markBtn.appendChild(doneIcon);
                markBtn.appendChild(document.createTextNode(' Section Complete'));
                self._renderProgress();
                self._updateTocState();
            });
        }
        readingArea.appendChild(markBtn);

        // Section navigation
        var navRow = document.createElement('div');
        navRow.className = 'tb-nav-row';

        if (this._currentSection > 0) {
            var prevBtn = document.createElement('button');
            prevBtn.className = 'tb-nav-btn';
            var prevIcon = document.createElement('i');
            prevIcon.className = 'fas fa-arrow-left';
            prevBtn.appendChild(prevIcon);
            prevBtn.appendChild(document.createTextNode(' Previous'));
            prevBtn.addEventListener('click', function() {
                self._currentSection--;
                self._renderSection(wrapper);
                self._scrollToReading();
                self._updateTocState();
            });
            navRow.appendChild(prevBtn);
        } else {
            navRow.appendChild(document.createElement('span'));
        }

        var posText = document.createElement('span');
        posText.className = 'tb-nav-pos';
        posText.textContent = (this._currentSection + 1) + ' of ' + seg.sections.length;
        navRow.appendChild(posText);

        if (this._currentSection < seg.sections.length - 1) {
            var nextBtn = document.createElement('button');
            nextBtn.className = 'tb-nav-btn';
            nextBtn.appendChild(document.createTextNode('Next '));
            var nextIcon = document.createElement('i');
            nextIcon.className = 'fas fa-arrow-right';
            nextBtn.appendChild(nextIcon);
            nextBtn.addEventListener('click', function() {
                self._currentSection++;
                self._renderSection(wrapper);
                self._scrollToReading();
                self._updateTocState();
            });
            navRow.appendChild(nextBtn);
        } else if (this._currentSegment < this._content.segments.length - 1) {
            var nextSegBtn = document.createElement('button');
            nextSegBtn.className = 'tb-nav-btn tb-nav-next-seg';
            nextSegBtn.appendChild(document.createTextNode('Next Segment '));
            var nextSegIcon = document.createElement('i');
            nextSegIcon.className = 'fas fa-arrow-right';
            nextSegBtn.appendChild(nextSegIcon);
            nextSegBtn.addEventListener('click', function() {
                self._currentSegment++;
                self._currentSection = 0;
                self._renderTextbook();
            });
            navRow.appendChild(nextSegBtn);
        } else {
            navRow.appendChild(document.createElement('span'));
        }

        readingArea.appendChild(navRow);

        // Save position
        this._progress.lastSegment = this._currentSegment;
        this._progress.lastSection = this._currentSection;
        this._saveProgress();
    },

    _renderQuickCheck(parent, section, segId) {
        var self = this;
        var checkIn = section.checkIn;
        var checkKey = segId + '/' + section.id;
        var savedAnswer = this._progress.quickChecks[checkKey];

        var qcBox = document.createElement('div');
        qcBox.className = 'tb-callout tb-callout-qc';
        var qcTitle = document.createElement('div');
        qcTitle.className = 'tb-callout-title';
        var qcIcon = document.createElement('i');
        qcIcon.className = 'fas fa-clipboard-check';
        qcTitle.appendChild(qcIcon);
        qcTitle.appendChild(document.createTextNode(' Quick Check'));
        qcBox.appendChild(qcTitle);

        var qcQuestion = document.createElement('div');
        qcQuestion.className = 'tb-qc-question';
        qcQuestion.textContent = checkIn.question;
        qcBox.appendChild(qcQuestion);

        var optionsDiv = document.createElement('div');
        optionsDiv.className = 'tb-qc-options';

        checkIn.options.forEach(function(opt, oi) {
            var optBtn = document.createElement('button');
            optBtn.className = 'tb-qc-option';

            if (savedAnswer !== undefined) {
                optBtn.disabled = true;
                if (oi === checkIn.correct) optBtn.classList.add('correct');
                if (savedAnswer === oi && savedAnswer !== checkIn.correct) optBtn.classList.add('wrong');
            }

            optBtn.textContent = opt;
            optBtn.addEventListener('click', function() {
                if (savedAnswer !== undefined) return;
                self._progress.quickChecks[checkKey] = oi;
                self._saveProgress();

                // Disable all and show result
                optionsDiv.querySelectorAll('.tb-qc-option').forEach(function(b, bi) {
                    b.disabled = true;
                    if (bi === checkIn.correct) b.classList.add('correct');
                });
                if (oi !== checkIn.correct) {
                    optBtn.classList.add('wrong');
                }

                // Show explanation
                var explEl = document.createElement('div');
                explEl.className = 'tb-qc-explanation ' + (oi === checkIn.correct ? 'correct' : 'wrong');
                var explIcon = document.createElement('i');
                explIcon.className = oi === checkIn.correct ? 'fas fa-check-circle' : 'fas fa-times-circle';
                explEl.appendChild(explIcon);
                explEl.appendChild(document.createTextNode(' ' + checkIn.explanation));
                qcBox.appendChild(explEl);
            });
            optionsDiv.appendChild(optBtn);
        });

        qcBox.appendChild(optionsDiv);

        // Show explanation if already answered
        if (savedAnswer !== undefined) {
            var explEl = document.createElement('div');
            explEl.className = 'tb-qc-explanation ' + (savedAnswer === checkIn.correct ? 'correct' : 'wrong');
            var explIcon = document.createElement('i');
            explIcon.className = savedAnswer === checkIn.correct ? 'fas fa-check-circle' : 'fas fa-times-circle';
            explEl.appendChild(explIcon);
            explEl.appendChild(document.createTextNode(' ' + checkIn.explanation));
            qcBox.appendChild(explEl);
        }

        parent.appendChild(qcBox);
    },

    _highlightVocab(html) {
        if (!this._vocabMap) return html;
        var self = this;
        var terms = Object.keys(this._vocabMap).sort(function(a, b) {
            return b.length - a.length; // Longest first to avoid partial matches
        });
        if (terms.length === 0) return html;

        // Build regex that matches whole words, case-insensitive
        var escaped = terms.map(function(t) {
            return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        });
        var pattern = new RegExp('\\b(' + escaped.join('|') + ')\\b', 'gi');

        // Split on HTML tags to avoid replacing inside tags
        var parts = html.split(/(<[^>]+>)/);
        for (var i = 0; i < parts.length; i++) {
            // Only process text nodes (odd indices are tags)
            if (i % 2 === 0) {
                parts[i] = parts[i].replace(pattern, function(match) {
                    var key = match.toLowerCase();
                    if (self._vocabMap[key]) {
                        return '<span class="tb-vocab" data-term="' + self._escapeAttr(key) + '">' + match + '</span>';
                    }
                    return match;
                });
            }
        }
        return parts.join('');
    },

    _escapeAttr(str) {
        return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

    _attachVocabListeners(contentDiv) {
        var self = this;
        var vocabSpans = contentDiv.querySelectorAll('.tb-vocab');

        vocabSpans.forEach(function(span) {
            span.addEventListener('click', function(e) {
                e.stopPropagation();
                var termKey = span.dataset.term;
                var entry = self._vocabMap[termKey];
                if (!entry) return;
                self._showVocabPopup(span, entry);
            });
        });

        // Close popup on click outside (remove previous listener to prevent leaks)
        if (this._docClickHandler) {
            document.removeEventListener('click', this._docClickHandler);
        }
        this._docClickHandler = function(e) {
            if (self._popupEl && !self._popupEl.contains(e.target) && !e.target.classList.contains('tb-vocab')) {
                self._removePopup();
            }
        };
        document.addEventListener('click', this._docClickHandler);
    },

    _showVocabPopup(anchor, entry) {
        this._removePopup();

        var popup = document.createElement('div');
        popup.className = 'tb-vocab-popup';

        var termEl = document.createElement('div');
        termEl.className = 'tb-popup-term';
        termEl.textContent = entry.term;
        popup.appendChild(termEl);

        var defEl = document.createElement('div');
        defEl.className = 'tb-popup-def';
        defEl.textContent = entry.definition;
        popup.appendChild(defEl);

        if (entry.simpleExplanation) {
            var simpleEl = document.createElement('div');
            simpleEl.className = 'tb-popup-simple';
            var bulbIcon = document.createElement('i');
            bulbIcon.className = 'fas fa-lightbulb';
            simpleEl.appendChild(bulbIcon);
            simpleEl.appendChild(document.createTextNode(' ' + entry.simpleExplanation));
            popup.appendChild(simpleEl);
        }

        // Position near anchor
        document.body.appendChild(popup);
        var rect = anchor.getBoundingClientRect();
        var popupRect = popup.getBoundingClientRect();

        var top = rect.bottom + 8;
        var left = rect.left + (rect.width / 2) - (popupRect.width / 2);

        // Keep on screen
        if (left < 8) left = 8;
        if (left + popupRect.width > window.innerWidth - 8) left = window.innerWidth - popupRect.width - 8;
        if (top + popupRect.height > window.innerHeight - 8) {
            top = rect.top - popupRect.height - 8;
        }

        popup.style.top = top + 'px';
        popup.style.left = left + 'px';
        popup.classList.add('visible');

        this._popupEl = popup;
    },

    _removePopup() {
        if (this._popupEl) {
            this._popupEl.remove();
            this._popupEl = null;
        }
    },

    _isSectionRead(segId, sectionId) {
        return this._progress.sectionsRead[segId + '/' + sectionId] === true;
    },

    _markSectionRead(segId, sectionId) {
        this._progress.sectionsRead[segId + '/' + sectionId] = true;
        this._saveProgress();
    },

    _getSegmentReadCount(seg) {
        var self = this;
        var count = 0;
        seg.sections.forEach(function(s) {
            if (self._isSectionRead(seg.id, s.id)) count++;
        });
        return count;
    },

    _renderProgress() {
        var wrap = document.getElementById('tb-progress-wrap');
        if (!wrap) return;
        wrap.textContent = '';

        var seg = this._content.segments[this._currentSegment];
        var readCount = this._getSegmentReadCount(seg);
        var total = seg.sections.length;
        var pct = total > 0 ? Math.round((readCount / total) * 100) : 0;

        var bar = document.createElement('div');
        bar.className = 'tb-progress-bar';
        var fill = document.createElement('div');
        fill.className = 'tb-progress-fill';
        fill.style.width = pct + '%';
        bar.appendChild(fill);
        wrap.appendChild(bar);

        var label = document.createElement('div');
        label.className = 'tb-progress-label';
        label.textContent = readCount + ' of ' + total + ' sections read';
        wrap.appendChild(label);
    },

    _updateTocState() {
        var seg = this._content.segments[this._currentSegment];
        var self = this;
        var tocItems = document.querySelectorAll('.tb-tab');
        tocItems.forEach(function(item, i) {
            item.classList.toggle('active', i === self._currentSection);
            var isRead = self._isSectionRead(seg.id, seg.sections[i].id);
            item.classList.toggle('read', isRead);
        });

        // Update segment nav badges
        var segBtns = document.querySelectorAll('.tb-seg-btn');
        segBtns.forEach(function(btn, i) {
            btn.classList.toggle('active', i === self._currentSegment);
        });
    },

    _scrollToReading() {
        var el = document.getElementById('tb-reading');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    _updateHash() {
        if (!this._content || !this._content.segments) return;
        var seg = this._content.segments[this._currentSegment];
        var sec = seg.sections[this._currentSection];
        if (seg && sec) {
            history.replaceState(null, '', '#textbook/' + seg.id + '/' + sec.id);
        }
    },

    _saveProgress() {
        this._updateHash();
        ProgressManager.saveActivityProgress(this._config.unit.id, 'textbook', this._progress);
    },

    activate() {},

    deactivate() {
        this._removePopup();
        if (this._docClickHandler) {
            document.removeEventListener('click', this._docClickHandler);
            this._docClickHandler = null;
        }
    },

    getProgress() {
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'textbook');
    },

    loadProgress(data) {
        if (data) {
            this._progress = data;
        }
    }
});
