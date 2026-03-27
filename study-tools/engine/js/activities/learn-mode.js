StudyEngine.registerActivity({
    id: 'learn-mode',
    name: 'Learn Mode',
    icon: 'fas fa-brain',
    description: 'Guided study sessions that teach, test, and adapt to how you learn',
    category: 'study',
    requires: ['vocabulary', 'practiceQuestions', 'fillInBlankSentences'],

    _container: null,
    _config: null,
    _textbookData: null,
    _mode: null,
    _scope: null,
    _slideSequence: null,
    _slideIndex: 0,
    _preResults: null,
    _postResults: null,
    _questionsUsed: null,
    _tierData: null,
    _reflections: null,
    _sessionStartTime: null,

    REFLECTION_PROMPTS: [
        'Think about {term}. Can you connect it to anything happening in the world today?',
        'How would you explain {term} to a 5th grader? Try to keep it simple.',
        'You just learned about {term}. What is one thing you want to remember about it?',
        'If you were alive during the time of {term}, how might your life be different?',
        'What do you think was the most important effect of {term}? Why?',
        'What questions do you still have about {term}? Write them down for class discussion.',
        'How does {term} relate to something else we have studied this year?',
        'Do you think {term} was fair or unfair? Explain your thinking.'
    ],

    // ─── Utility helpers ────────────────────────────────────────

    _shuffleArray: function(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
        return arr;
    },

    _el: function(tag, className, textContent) {
        var el = document.createElement(tag);
        if (className) el.className = className;
        if (textContent !== undefined && textContent !== null) el.textContent = textContent;
        return el;
    },

    _icon: function(cls) {
        var i = document.createElement('i');
        i.className = cls;
        return i;
    },

    _getMasteryPercent: function(category) {
        var config = this._config;
        var unitId = config.unit.id;
        var progress = ProgressManager.getActivityProgress(unitId, 'flashcards') || {};
        var mastered = progress.mastered || [];
        var terms = (config.vocabulary || []).filter(function(v) { return v.category === category; });
        if (terms.length === 0) return 0;
        var count = 0;
        for (var i = 0; i < terms.length; i++) {
            if (mastered.indexOf(terms[i].term) !== -1) count++;
        }
        return Math.round((count / terms.length) * 100);
    },

    _allCategoriesMastered: function() {
        var config = this._config;
        var categories = MasteryManager.getCategories(config);
        var unlocked = MasteryManager.getUnlockedCategories(config.unit.id, config);
        if (categories.length === 0) return false;
        return unlocked.length === categories.length && MasteryManager.isCategoryMastered(config.unit.id, config, categories[categories.length - 1]);
    },

    _loadTiers: function() {
        var unitId = this._config.unit.id;
        var data = ProgressManager.load(unitId, 'learn-mode-tiers');
        this._tierData = data || {};
    },

    _saveTiers: function() {
        var unitId = this._config.unit.id;
        ProgressManager.save(unitId, 'learn-mode-tiers', this._tierData);
    },

    _getTier: function(term) {
        if (!this._tierData) return 1;
        return this._tierData[term] || 1;
    },

    _setTier: function(term, tier) {
        if (!this._tierData) this._tierData = {};
        this._tierData[term] = tier;
    },

    _loadReflections: function() {
        var unitId = this._config.unit.id;
        var data = ProgressManager.load(unitId, 'learn-mode-reflections');
        this._reflections = data || [];
    },

    _saveReflection: function(text, context) {
        if (!text || !text.trim()) return;
        this._loadReflections();
        this._reflections.push({
            text: text.trim(),
            context: context || '',
            timestamp: Date.now()
        });
        // Keep last 50
        if (this._reflections.length > 50) {
            this._reflections = this._reflections.slice(this._reflections.length - 50);
        }
        var unitId = this._config.unit.id;
        ProgressManager.save(unitId, 'learn-mode-reflections', this._reflections);
    },

    _loadSessions: function() {
        var unitId = this._config.unit.id;
        return ProgressManager.load(unitId, 'learn-mode-sessions') || [];
    },

    _hasPriorSessions: function() {
        return this._loadSessions().length > 0;
    },

    _saveCurrentSession: function() {
        var unitId = this._config.unit.id;
        var sessionData = {
            mode: this._mode,
            scope: this._scope,
            slideIndex: this._slideIndex,
            preResults: this._preResults,
            questionsUsed: this._questionsUsed,
            tierOverrides: this._tierData,
            reflections: this._reflections,
            timestamp: Date.now(),
            slideSequence: this._serializeSlides(this._slideSequence)
        };
        ProgressManager.save(unitId, 'learn-mode-current-session', sessionData);
    },

    _loadCurrentSession: function() {
        var unitId = this._config.unit.id;
        var data = ProgressManager.load(unitId, 'learn-mode-current-session');
        if (!data) return null;
        // Check if less than 7 days old
        var sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - (data.timestamp || 0) > sevenDays) {
            ProgressManager.save(unitId, 'learn-mode-current-session', null);
            return null;
        }
        return data;
    },

    _clearCurrentSession: function() {
        var unitId = this._config.unit.id;
        ProgressManager.save(unitId, 'learn-mode-current-session', null);
    },

    _serializeSlides: function(slides) {
        if (!slides) return [];
        return slides.map(function(s) {
            return { type: s.type, data: s.data, tier: s.tier };
        });
    },

    // ─── Render entry point ──────────────────────────────────────

    render: function(container, config) {
        this._container = container;
        this._config = config;
        this._questionsUsed = [];
        this._sessionStartTime = Date.now();

        this._loadTiers();
        this._loadReflections();

        // Fetch textbook data asynchronously
        var self = this;
        this._textbookData = null;
        try {
            fetch('../units/' + config.unit.id + '/textbook.json')
                .then(function(resp) {
                    if (resp.ok) return resp.json();
                    return null;
                })
                .then(function(data) {
                    if (data && data.textbookContent && data.textbookContent.segments) {
                        self._textbookData = data.textbookContent.segments;
                    }
                })
                .catch(function() {
                    self._textbookData = null;
                });
        } catch (e) {
            this._textbookData = null;
        }

        // Defensive check
        var vocab = config.vocabulary;
        var pq = config.practiceQuestions;
        var fib = config.fillInBlankSentences;
        if (!vocab || !vocab.length || !pq || !pq.length || !fib || !fib.length) {
            var msg = this._el('div', 'lm-empty');
            msg.style.cssText = 'text-align:center;padding:60px 20px;color:var(--text-secondary);';
            var emptyIcon = this._icon('fas fa-brain');
            emptyIcon.style.cssText = 'font-size:2.5rem;opacity:0.4;display:block;margin-bottom:16px;';
            msg.appendChild(emptyIcon);
            var emptyText = this._el('div', null, 'Not enough content for Learn Mode yet');
            emptyText.style.cssText = 'font-size:1.1rem;';
            msg.appendChild(emptyText);
            container.appendChild(msg);
            return;
        }

        // Check for saved session
        var saved = this._loadCurrentSession();
        if (saved) {
            this._renderResumePrompt(container, saved);
        } else {
            this._renderSetup(container);
        }
    },

    // ─── Resume prompt ───────────────────────────────────────────

    _renderResumePrompt: function(container, saved) {
        container.textContent = '';
        var self = this;

        var wrap = this._el('div', 'lm-resume');
        wrap.style.cssText = 'max-width:480px;margin:40px auto;text-align:center;padding:30px 20px;';

        var icon = this._icon('fas fa-bookmark');
        icon.style.cssText = 'font-size:2.5rem;color:var(--primary);margin-bottom:16px;display:block;';
        wrap.appendChild(icon);

        var title = this._el('h2', null, 'Session in Progress');
        title.style.cssText = 'color:var(--text-primary);margin-bottom:8px;font-size:1.3rem;';
        wrap.appendChild(title);

        var modeLabel = saved.mode === 'category' ? 'Category: ' + (saved.scope ? saved.scope.join(', ') : '') :
                        saved.mode === 'full' ? 'Full Unit' : 'Smart Review';
        var desc = this._el('div', null, modeLabel);
        desc.style.cssText = 'color:var(--text-secondary);margin-bottom:24px;font-size:0.95rem;';
        wrap.appendChild(desc);

        var btnRow = this._el('div');
        btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center;';

        var resumeBtn = this._el('button', null, 'Resume');
        resumeBtn.style.cssText = 'padding:10px 28px;border-radius:var(--radius-md);background:var(--primary);color:#fff;border:none;font-size:1rem;cursor:pointer;font-weight:600;';
        resumeBtn.addEventListener('click', function() {
            self._resumeSession(saved);
        });
        btnRow.appendChild(resumeBtn);

        var freshBtn = this._el('button', null, 'Start Fresh');
        freshBtn.style.cssText = 'padding:10px 28px;border-radius:var(--radius-md);background:var(--bg-elevated);color:var(--text-primary);border:1px solid rgba(255,255,255,0.1);font-size:1rem;cursor:pointer;';
        freshBtn.addEventListener('click', function() {
            self._clearCurrentSession();
            self._renderSetup(container);
        });
        btnRow.appendChild(freshBtn);

        wrap.appendChild(btnRow);
        container.appendChild(wrap);
    },

    _resumeSession: function(saved) {
        this._mode = saved.mode;
        this._scope = saved.scope;
        this._preResults = saved.preResults;
        this._questionsUsed = saved.questionsUsed || [];
        if (saved.tierOverrides) {
            this._tierData = saved.tierOverrides;
        }
        this._slideSequence = saved.slideSequence || [];
        this._slideIndex = saved.slideIndex || 0;
        this._renderSlideContainer();
    },

    // ─── Setup screen ────────────────────────────────────────────

    _renderSetup: function(container) {
        container.textContent = '';
        var self = this;
        var config = this._config;

        var wrap = this._el('div', 'lm-setup');
        wrap.style.cssText = 'max-width:560px;margin:0 auto;padding:20px;';

        // Title
        var header = this._el('div');
        header.style.cssText = 'text-align:center;margin-bottom:28px;';
        var titleIcon = this._icon('fas fa-brain');
        titleIcon.style.cssText = 'font-size:2rem;color:var(--primary);margin-bottom:8px;display:block;';
        header.appendChild(titleIcon);
        var title = this._el('h2', null, 'Learn Mode');
        title.style.cssText = 'color:var(--text-primary);margin:0 0 4px 0;font-size:1.4rem;';
        header.appendChild(title);
        var sub = this._el('div', null, 'Choose how you want to study');
        sub.style.cssText = 'color:var(--text-secondary);font-size:0.95rem;';
        header.appendChild(sub);
        wrap.appendChild(header);

        // Mode cards
        var modes = [
            { id: 'category', icon: 'fas fa-layer-group', name: 'By Category', desc: 'Focus on one category at a time' },
            { id: 'full', icon: 'fas fa-book-open', name: 'Full Unit', desc: 'Study everything in one session' },
            { id: 'smart', icon: 'fas fa-magic', name: 'Smart Review', desc: 'AI picks what you need most' }
        ];

        var hasPrior = this._hasPriorSessions();

        for (var m = 0; m < modes.length; m++) {
            (function(mode) {
                var card = self._el('div');
                var isDisabled = mode.id === 'smart' && !hasPrior;
                card.style.cssText = 'background:var(--bg-card);border-radius:var(--radius-md);padding:18px 20px;margin-bottom:12px;cursor:' +
                    (isDisabled ? 'default' : 'pointer') + ';border:1px solid rgba(255,255,255,0.06);transition:transform 0.15s,border-color 0.15s;' +
                    (isDisabled ? 'opacity:0.5;' : '');

                if (!isDisabled) {
                    card.addEventListener('mouseenter', function() { card.style.borderColor = 'var(--primary)'; card.style.transform = 'translateY(-1px)'; });
                    card.addEventListener('mouseleave', function() { card.style.borderColor = 'rgba(255,255,255,0.06)'; card.style.transform = 'none'; });
                }

                var row = self._el('div');
                row.style.cssText = 'display:flex;align-items:center;gap:14px;';

                var ic = self._icon(mode.icon);
                ic.style.cssText = 'font-size:1.4rem;color:var(--primary);width:32px;text-align:center;';
                row.appendChild(ic);

                var text = self._el('div');
                var nm = self._el('div', null, mode.name);
                nm.style.cssText = 'color:var(--text-primary);font-weight:600;font-size:1.05rem;';
                text.appendChild(nm);
                var ds = self._el('div', null, isDisabled ? 'Complete a session first' : mode.desc);
                ds.style.cssText = 'color:var(--text-secondary);font-size:0.85rem;margin-top:2px;';
                text.appendChild(ds);
                row.appendChild(text);

                card.appendChild(row);

                if (!isDisabled) {
                    card.addEventListener('click', function() {
                        self._selectMode(mode.id);
                    });
                }

                wrap.appendChild(card);
            })(modes[m]);
        }

        // Category list container (hidden until By Category is selected)
        var catListWrap = self._el('div', 'lm-cat-list');
        catListWrap.style.cssText = 'display:none;margin-top:16px;';
        catListWrap.setAttribute('id', 'lm-cat-list');
        wrap.appendChild(catListWrap);

        container.appendChild(wrap);
    },

    _selectMode: function(modeId) {
        var self = this;
        var config = this._config;

        if (modeId === 'category') {
            this._renderCategoryList();
        } else if (modeId === 'full') {
            var unlocked = MasteryManager.getUnlockedCategories(config.unit.id, config);
            if (unlocked.length === 0) {
                StudyUtils.showToast('No categories unlocked yet.', 'info');
                return;
            }
            this._mode = 'full';
            this._scope = unlocked.slice();
            this._startPreAssessment(this._scope);
        } else if (modeId === 'smart') {
            this._mode = 'smart';
            this._scope = this._buildSmartReviewScope();
            this._startPreAssessment(this._scope);
        }
    },

    _renderCategoryList: function() {
        var self = this;
        var config = this._config;
        var catListWrap = this._container.querySelector('#lm-cat-list');
        if (!catListWrap) return;
        catListWrap.textContent = '';
        catListWrap.style.display = 'block';

        var unlocked = MasteryManager.getUnlockedCategories(config.unit.id, config);
        var allCats = MasteryManager.getCategories(config);

        var heading = this._el('div', null, 'Choose a category');
        heading.style.cssText = 'color:var(--text-secondary);font-size:0.9rem;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;';
        catListWrap.appendChild(heading);

        for (var c = 0; c < allCats.length; c++) {
            (function(cat, isUnlocked) {
                var row = self._el('div');
                row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg-card);border-radius:var(--radius-md);margin-bottom:8px;' +
                    'cursor:' + (isUnlocked ? 'pointer' : 'default') + ';border:1px solid rgba(255,255,255,0.06);' +
                    (isUnlocked ? '' : 'opacity:0.4;');

                var left = self._el('div');
                var catName = self._el('div', null, cat);
                catName.style.cssText = 'color:var(--text-primary);font-weight:500;font-size:0.95rem;';
                left.appendChild(catName);

                if (isUnlocked) {
                    var pct = self._getMasteryPercent(cat);
                    var pctLabel = self._el('div', null, pct + '% mastered');
                    pctLabel.style.cssText = 'color:var(--text-secondary);font-size:0.8rem;margin-top:2px;';
                    left.appendChild(pctLabel);
                } else {
                    var lockLabel = self._el('div', null, 'Locked');
                    lockLabel.style.cssText = 'color:var(--text-secondary);font-size:0.8rem;margin-top:2px;';
                    var lockIcon = self._icon('fas fa-lock');
                    lockIcon.style.cssText = 'margin-right:4px;font-size:0.7rem;';
                    lockLabel.insertBefore(lockIcon, lockLabel.firstChild);
                    left.appendChild(lockLabel);
                }

                row.appendChild(left);

                if (isUnlocked) {
                    var arrow = self._icon('fas fa-chevron-right');
                    arrow.style.cssText = 'color:var(--text-secondary);font-size:0.85rem;';
                    row.appendChild(arrow);

                    row.addEventListener('mouseenter', function() { row.style.borderColor = 'var(--primary)'; });
                    row.addEventListener('mouseleave', function() { row.style.borderColor = 'rgba(255,255,255,0.06)'; });
                    row.addEventListener('click', function() {
                        self._mode = 'category';
                        self._scope = [cat];
                        self._startPreAssessment([cat]);
                    });
                }

                catListWrap.appendChild(row);
            })(allCats[c], unlocked.indexOf(allCats[c]) !== -1);
        }
    },

    // ─── Smart Review scope builder ──────────────────────────────

    _buildSmartReviewScope: function() {
        var config = this._config;
        var unlocked = MasteryManager.getUnlockedCategories(config.unit.id, config);
        var sessions = this._loadSessions();
        var tiers = this._tierData || {};
        var vocab = config.vocabulary || [];

        // Build priority buckets
        var priority1 = []; // wrong in most recent session
        var priority2 = []; // never seen
        var priority3 = []; // tier 1
        var priority4 = []; // all other

        // Get terms wrong in last session
        var lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
        var wrongTerms = {};
        if (lastSession && lastSession.wrongTerms) {
            for (var w = 0; w < lastSession.wrongTerms.length; w++) {
                wrongTerms[lastSession.wrongTerms[w]] = true;
            }
        }

        for (var i = 0; i < vocab.length; i++) {
            var t = vocab[i];
            if (unlocked.indexOf(t.category) === -1) continue;
            var term = t.term;
            if (wrongTerms[term]) {
                priority1.push(term);
            } else if (tiers[term] === undefined) {
                priority2.push(term);
            } else if (tiers[term] === 1) {
                priority3.push(term);
            } else {
                priority4.push(term);
            }
        }

        // Collect unique categories from prioritized terms
        var allPriority = priority1.concat(priority2, priority3, priority4);
        var scopeCategories = [];
        var seen = {};
        for (var j = 0; j < allPriority.length; j++) {
            var v = this._findVocabByTerm(allPriority[j]);
            if (v && v.category && !seen[v.category]) {
                seen[v.category] = true;
                scopeCategories.push(v.category);
            }
        }

        return scopeCategories.length > 0 ? scopeCategories : unlocked.slice();
    },

    _findVocabByTerm: function(term) {
        var vocab = this._config.vocabulary || [];
        for (var i = 0; i < vocab.length; i++) {
            if (vocab[i].term === term) return vocab[i];
        }
        return null;
    },

    // ─── Pre-Assessment ──────────────────────────────────────────

    _startPreAssessment: function(scope) {
        this._container.textContent = '';
        var config = this._config;
        var allMastered = this._allCategoriesMastered();

        // Build question pool from practiceQuestions and fillInBlankSentences
        var pool = [];
        var pq = config.practiceQuestions || [];
        for (var i = 0; i < pq.length; i++) {
            var q = pq[i];
            if (!q.topic) continue;
            if (q.topic === 'Connections' && !allMastered) continue;
            if (scope.indexOf(q.topic) !== -1) {
                pool.push({ type: 'mc', data: q, index: i });
            }
        }
        var fib = config.fillInBlankSentences || [];
        for (var j = 0; j < fib.length; j++) {
            var f = fib[j];
            if (!f.category) continue;
            if (scope.indexOf(f.category) !== -1) {
                pool.push({ type: 'fib', data: f, index: j + 10000 }); // offset to distinguish
            }
        }

        // Ensure at least 1 per topic
        var topicCovered = {};
        var ensured = [];
        var remainder = [];
        for (var k = 0; k < pool.length; k++) {
            var topic = pool[k].data.topic || pool[k].data.category;
            if (!topicCovered[topic]) {
                topicCovered[topic] = true;
                ensured.push(pool[k]);
            } else {
                remainder.push(pool[k]);
            }
        }
        this._shuffleArray(ensured);
        this._shuffleArray(remainder);
        var assessPool = ensured.concat(remainder);

        // Cap at reasonable number
        var maxQ = Math.min(assessPool.length, Math.max(scope.length * 2, 6));
        assessPool = assessPool.slice(0, maxQ);

        this._preResults = { correct: {}, wrong: {}, total: {}, score: 0, count: 0, wrongTerms: [] };
        this._questionsUsed = [];

        var self = this;
        var qIdx = 0;
        var consecutiveWrong = 0;

        var showNext = function() {
            if (qIdx >= assessPool.length || consecutiveWrong >= 3) {
                self._showPreResults();
                return;
            }
            var item = assessPool[qIdx];
            self._questionsUsed.push(item.index);
            var topic = item.data.topic || item.data.category || 'General';
            if (!self._preResults.total[topic]) self._preResults.total[topic] = 0;
            self._preResults.total[topic]++;

            if (item.type === 'mc') {
                self._renderAssessmentMC(item.data, function(correct) {
                    if (correct) {
                        if (!self._preResults.correct[topic]) self._preResults.correct[topic] = 0;
                        self._preResults.correct[topic]++;
                        self._preResults.score++;
                        consecutiveWrong = 0;
                    } else {
                        if (!self._preResults.wrong[topic]) self._preResults.wrong[topic] = 0;
                        self._preResults.wrong[topic]++;
                        consecutiveWrong++;
                        // Track wrong terms
                        if (item.data.topic) {
                            var relatedTerms = self._getTermsForTopic(item.data.topic);
                            self._preResults.wrongTerms = self._preResults.wrongTerms.concat(relatedTerms);
                        }
                    }
                    self._preResults.count++;
                    qIdx++;
                    showNext();
                });
            } else {
                self._renderAssessmentFIB(item.data, function(correct) {
                    if (correct) {
                        if (!self._preResults.correct[topic]) self._preResults.correct[topic] = 0;
                        self._preResults.correct[topic]++;
                        self._preResults.score++;
                        consecutiveWrong = 0;
                    } else {
                        if (!self._preResults.wrong[topic]) self._preResults.wrong[topic] = 0;
                        self._preResults.wrong[topic]++;
                        consecutiveWrong++;
                        if (item.data.answer) {
                            self._preResults.wrongTerms.push(item.data.answer);
                        }
                    }
                    self._preResults.count++;
                    qIdx++;
                    showNext();
                });
            }
        };

        showNext();
    },

    _getTermsForTopic: function(topic) {
        var vocab = this._config.vocabulary || [];
        var terms = [];
        for (var i = 0; i < vocab.length; i++) {
            if (vocab[i].category === topic) terms.push(vocab[i].term);
        }
        return terms;
    },

    _renderAssessmentMC: function(q, callback) {
        var container = this._container;
        container.textContent = '';
        var self = this;

        var wrap = this._el('div');
        wrap.style.cssText = 'max-width:560px;margin:0 auto;padding:20px;';

        var label = this._el('div', null, 'Quick Check');
        label.style.cssText = 'color:var(--accent);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:12px;';
        wrap.appendChild(label);

        var qText = this._el('div', null, q.question);
        qText.style.cssText = 'color:var(--text-primary);font-size:1.1rem;line-height:1.5;margin-bottom:20px;';
        wrap.appendChild(qText);

        var shuffled = q.options.map(function(_, i) { return i; });
        self._shuffleArray(shuffled);

        for (var i = 0; i < shuffled.length; i++) {
            (function(origIdx, displayIdx) {
                var btn = self._el('button', null, q.options[origIdx]);
                btn.style.cssText = 'display:block;width:100%;text-align:left;padding:14px 18px;margin-bottom:10px;border-radius:var(--radius-md);' +
                    'background:var(--bg-card);color:var(--text-primary);border:1px solid rgba(255,255,255,0.08);cursor:pointer;font-size:0.95rem;transition:border-color 0.15s;';
                btn.addEventListener('mouseenter', function() { btn.style.borderColor = 'var(--primary)'; });
                btn.addEventListener('mouseleave', function() { btn.style.borderColor = 'rgba(255,255,255,0.08)'; });
                btn.addEventListener('click', function() {
                    var isCorrect = origIdx === q.correct;
                    // Disable all buttons
                    var btns = wrap.querySelectorAll('button');
                    for (var b = 0; b < btns.length; b++) {
                        btns[b].disabled = true;
                        btns[b].style.cursor = 'default';
                    }
                    if (isCorrect) {
                        btn.style.background = '#1a5c2a';
                        btn.style.borderColor = '#2ecc71';
                    } else {
                        btn.style.background = '#5c1a1a';
                        btn.style.borderColor = '#e74c3c';
                        // Highlight correct
                        for (var b2 = 0; b2 < shuffled.length; b2++) {
                            if (shuffled[b2] === q.correct) {
                                var correctBtn = wrap.querySelectorAll('button')[b2];
                                if (correctBtn) {
                                    correctBtn.style.background = '#1a5c2a';
                                    correctBtn.style.borderColor = '#2ecc71';
                                }
                            }
                        }
                    }
                    setTimeout(function() { callback(isCorrect); }, 1500);
                });
                wrap.appendChild(btn);
            })(shuffled[i], i);
        }

        container.appendChild(wrap);
    },

    _renderAssessmentFIB: function(fib, callback) {
        var container = this._container;
        container.textContent = '';
        var self = this;

        var wrap = this._el('div');
        wrap.style.cssText = 'max-width:560px;margin:0 auto;padding:20px;';

        var label = this._el('div', null, 'Fill in the Blank');
        label.style.cssText = 'color:var(--accent);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:12px;';
        wrap.appendChild(label);

        var sentence = this._el('div', null, fib.sentence);
        sentence.style.cssText = 'color:var(--text-primary);font-size:1.1rem;line-height:1.6;margin-bottom:20px;';
        wrap.appendChild(sentence);

        var distractors = this._getDistractors(fib.answer, fib.category, 2);
        var options = [fib.answer].concat(distractors);
        this._shuffleArray(options);

        var chipWrap = this._el('div');
        chipWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;';

        for (var i = 0; i < options.length; i++) {
            (function(opt) {
                var chip = self._el('button', null, opt);
                chip.style.cssText = 'padding:10px 20px;border-radius:20px;background:var(--bg-elevated);color:var(--text-primary);border:1px solid rgba(255,255,255,0.1);cursor:pointer;font-size:0.95rem;transition:border-color 0.15s;';
                chip.addEventListener('click', function() {
                    var isCorrect = opt.toLowerCase() === fib.answer.toLowerCase();
                    var chips = chipWrap.querySelectorAll('button');
                    for (var c = 0; c < chips.length; c++) {
                        chips[c].disabled = true;
                        chips[c].style.cursor = 'default';
                    }
                    if (isCorrect) {
                        chip.style.background = '#1a5c2a';
                        chip.style.borderColor = '#2ecc71';
                    } else {
                        chip.style.background = '#5c1a1a';
                        chip.style.borderColor = '#e74c3c';
                        // Highlight correct
                        for (var c2 = 0; c2 < chips.length; c2++) {
                            if (chips[c2].textContent.toLowerCase() === fib.answer.toLowerCase()) {
                                chips[c2].style.background = '#1a5c2a';
                                chips[c2].style.borderColor = '#2ecc71';
                            }
                        }
                    }
                    setTimeout(function() { callback(isCorrect); }, 1500);
                });
                chipWrap.appendChild(chip);
            })(options[i]);
        }

        wrap.appendChild(chipWrap);
        container.appendChild(wrap);
    },

    _getDistractors: function(correctAnswer, category, count) {
        var vocab = this._config.vocabulary || [];
        var correctWordCount = (correctAnswer || '').split(/\s+/).length;
        var candidates = [];
        for (var i = 0; i < vocab.length; i++) {
            var v = vocab[i];
            if (v.term.toLowerCase() === (correctAnswer || '').toLowerCase()) continue;
            if (v.category === category) {
                var wc = v.term.split(/\s+/).length;
                candidates.push({ term: v.term, diff: Math.abs(wc - correctWordCount) });
            }
        }
        // Sort by word-count similarity
        candidates.sort(function(a, b) { return a.diff - b.diff; });
        var result = [];
        for (var j = 0; j < Math.min(count, candidates.length); j++) {
            result.push(candidates[j].term);
        }
        // If not enough from same category, pull from others
        if (result.length < count) {
            for (var k = 0; k < vocab.length && result.length < count; k++) {
                var t = vocab[k].term;
                if (t.toLowerCase() === (correctAnswer || '').toLowerCase()) continue;
                if (result.indexOf(t) !== -1) continue;
                result.push(t);
            }
        }
        return result;
    },

    _showPreResults: function() {
        var container = this._container;
        container.textContent = '';
        var self = this;
        var results = this._preResults;

        var pct = results.count > 0 ? Math.round((results.score / results.count) * 100) : 0;

        var wrap = this._el('div');
        wrap.style.cssText = 'max-width:480px;margin:40px auto;text-align:center;padding:20px;';

        var icon = this._icon('fas fa-chart-bar');
        icon.style.cssText = 'font-size:2rem;color:var(--primary);margin-bottom:12px;display:block;';
        wrap.appendChild(icon);

        var heading = this._el('h2', null, 'You know ' + pct + '%!');
        heading.style.cssText = 'color:var(--text-primary);margin:0 0 8px 0;font-size:1.4rem;';
        wrap.appendChild(heading);

        var msg = pct >= 80 ? 'Great foundation! Let\'s strengthen what you know.' :
                  pct >= 50 ? 'Good start! Let\'s learn the rest.' :
                  'No worries! Let\'s build your knowledge step by step.';
        var sub = this._el('div', null, msg);
        sub.style.cssText = 'color:var(--text-secondary);margin-bottom:24px;font-size:0.95rem;';
        wrap.appendChild(sub);

        // Per-topic breakdown
        var topics = Object.keys(results.total);
        if (topics.length > 0) {
            var breakdown = this._el('div');
            breakdown.style.cssText = 'text-align:left;margin-bottom:24px;';
            for (var i = 0; i < topics.length; i++) {
                var topic = topics[i];
                var correct = results.correct[topic] || 0;
                var total = results.total[topic] || 0;
                var topicPct = total > 0 ? Math.round((correct / total) * 100) : 0;

                var row = this._el('div');
                row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);';

                var tName = this._el('span', null, topic);
                tName.style.cssText = 'color:var(--text-primary);font-size:0.9rem;';
                row.appendChild(tName);

                var tPct = this._el('span', null, topicPct + '%');
                tPct.style.cssText = 'color:' + (topicPct >= 70 ? '#2ecc71' : 'var(--accent)') + ';font-weight:600;font-size:0.9rem;';
                row.appendChild(tPct);

                breakdown.appendChild(row);
            }
            wrap.appendChild(breakdown);
        }

        var startBtn = this._el('button', null, 'Start Learning');
        startBtn.style.cssText = 'padding:12px 36px;border-radius:var(--radius-md);background:var(--primary);color:#fff;border:none;font-size:1.05rem;cursor:pointer;font-weight:600;';
        startBtn.addEventListener('click', function() {
            self._beginLearning();
        });
        wrap.appendChild(startBtn);

        container.appendChild(wrap);
    },

    // ─── Slide Sequencer ─────────────────────────────────────────

    _beginLearning: function() {
        this._slideSequence = this._buildSlideSequence(this._scope, this._preResults);
        this._slideIndex = 0;
        this._renderSlideContainer();
    },

    _buildSlideSequence: function(scope, preResults) {
        var config = this._config;
        var vocab = config.vocabulary || [];
        var self = this;

        // Get unlocked vocab for scope
        var scopeVocab = [];
        for (var i = 0; i < vocab.length; i++) {
            if (scope.indexOf(vocab[i].category) !== -1) {
                scopeVocab.push(vocab[i]);
            }
        }

        // Deprioritize terms student got right (by topic)
        var rightTopics = preResults && preResults.correct ? preResults.correct : {};
        var wrongTermsList = preResults && preResults.wrongTerms ? preResults.wrongTerms : [];

        // Sort: wrong terms first, then by tier (higher = more help needed), then rest
        var prioritized = scopeVocab.slice();
        prioritized.sort(function(a, b) {
            var aWrong = wrongTermsList.indexOf(a.term) !== -1 ? 0 : 1;
            var bWrong = wrongTermsList.indexOf(b.term) !== -1 ? 0 : 1;
            if (aWrong !== bWrong) return aWrong - bWrong;
            var aTier = self._getTier(a.term);
            var bTier = self._getTier(b.term);
            return bTier - aTier;
        });

        var slides = [];
        var slidesSinceReflection = 0;

        // Group terms (2-3 at a time)
        var groupSize = 2;
        for (var g = 0; g < prioritized.length; g += groupSize) {
            var group = prioritized.slice(g, g + groupSize + 1);
            if (group.length > 3) group = group.slice(0, 3);

            // Term cards for this group
            for (var t = 0; t < group.length; t++) {
                var term = group[t];
                var tier = this._getTier(term.term);
                var keyIdea = this._getKeyIdeaForTerm(term.term);

                slides.push({
                    type: 'term',
                    data: term,
                    tier: tier,
                    keyIdea: keyIdea
                });
                slidesSinceReflection++;
            }

            // Add a question (MC or FIB) after each group
            var question = this._pickQuestionForGroup(group);
            if (question) {
                slides.push(question);
                slidesSinceReflection++;
            }

            // Add key idea card if available
            var ki = this._getKeyIdeaForCategory(group[0] ? group[0].category : null);
            if (ki) {
                slides.push({
                    type: 'keyIdea',
                    data: ki
                });
                slidesSinceReflection++;
            }

            // Reflection every 5-7 slides
            if (slidesSinceReflection >= 5) {
                var recentTerm = group[group.length - 1] ? group[group.length - 1].term : 'this topic';
                var promptTemplate = this.REFLECTION_PROMPTS[Math.floor(Math.random() * this.REFLECTION_PROMPTS.length)];
                slides.push({
                    type: 'reflection',
                    data: { prompt: promptTemplate.replace('{term}', recentTerm), term: recentTerm }
                });
                slidesSinceReflection = 0;
            }
        }

        return slides;
    },

    _getKeyIdeaForTerm: function(termName) {
        if (!this._textbookData) return null;
        for (var s = 0; s < this._textbookData.length; s++) {
            var segment = this._textbookData[s];
            if (!segment.sections) continue;
            for (var sec = 0; sec < segment.sections.length; sec++) {
                var section = segment.sections[sec];
                if (section.vocabTerms && section.vocabTerms.indexOf(termName) !== -1) {
                    return section.keyIdea || null;
                }
            }
        }
        return null;
    },

    _getKeyIdeaForCategory: function(category) {
        if (!this._textbookData || !category) return null;
        for (var s = 0; s < this._textbookData.length; s++) {
            var segment = this._textbookData[s];
            if (segment.title === category && segment.sections && segment.sections.length > 0) {
                // Pick a random section's key idea
                var sections = segment.sections.filter(function(sec) { return sec.keyIdea; });
                if (sections.length === 0) return null;
                var picked = sections[Math.floor(Math.random() * sections.length)];
                return {
                    heading: picked.heading || segment.title,
                    keyIdea: picked.keyIdea,
                    vocabTerms: picked.vocabTerms || []
                };
            }
        }
        return null;
    },

    _pickQuestionForGroup: function(group) {
        var config = this._config;
        var self = this;
        var categories = group.map(function(v) { return v.category; });
        var termNames = group.map(function(v) { return v.term.toLowerCase(); });

        // Try MC first
        var pq = config.practiceQuestions || [];
        var mcCandidates = [];
        for (var i = 0; i < pq.length; i++) {
            if (this._questionsUsed.indexOf(i) !== -1) continue;
            if (pq[i].topic && categories.indexOf(pq[i].topic) !== -1) {
                mcCandidates.push({ type: 'mc', data: pq[i], index: i });
            }
        }

        // Try FIB
        var fib = config.fillInBlankSentences || [];
        var fibCandidates = [];
        for (var j = 0; j < fib.length; j++) {
            var idx = j + 10000;
            if (this._questionsUsed.indexOf(idx) !== -1) continue;
            if (fib[j].category && categories.indexOf(fib[j].category) !== -1) {
                fibCandidates.push({ type: 'fib', data: fib[j], index: idx });
            }
        }

        // Alternate between MC and FIB
        var allCandidates = mcCandidates.concat(fibCandidates);
        this._shuffleArray(allCandidates);

        if (allCandidates.length > 0) {
            var picked = allCandidates[0];
            this._questionsUsed.push(picked.index);
            return picked;
        }
        return null;
    },

    // ─── Slide container + navigation ────────────────────────────

    _renderSlideContainer: function() {
        var container = this._container;
        container.textContent = '';
        var self = this;

        var wrap = this._el('div', 'lm-slide-container');
        wrap.style.cssText = 'max-width:600px;margin:0 auto;padding:0 16px;position:relative;min-height:400px;';

        // Progress bar
        var progBar = this._el('div', 'lm-progress-bar');
        progBar.style.cssText = 'height:3px;background:rgba(255,255,255,0.08);border-radius:2px;margin-bottom:20px;overflow:hidden;';
        var progFill = this._el('div', 'lm-progress-fill');
        var pct = this._slideSequence.length > 0 ? Math.round(((this._slideIndex) / this._slideSequence.length) * 100) : 0;
        progFill.style.cssText = 'height:100%;background:var(--primary);border-radius:2px;transition:width 0.3s;width:' + pct + '%;';
        progBar.appendChild(progFill);
        wrap.appendChild(progBar);

        // Slide content area
        var slideArea = this._el('div', 'lm-slide-area');
        slideArea.setAttribute('id', 'lm-slide-area');
        wrap.appendChild(slideArea);

        container.appendChild(wrap);

        // Wonder button (fixed bottom-right)
        this._addWonderButton(container);

        // Render current slide
        this._renderCurrentSlide();
    },

    _updateProgressBar: function() {
        var fill = this._container.querySelector('.lm-progress-fill');
        if (!fill || !this._slideSequence) return;
        var pct = this._slideSequence.length > 0 ? Math.round(((this._slideIndex) / this._slideSequence.length) * 100) : 0;
        fill.style.width = pct + '%';
    },

    _renderCurrentSlide: function() {
        var slideArea = this._container.querySelector('#lm-slide-area');
        if (!slideArea) return;
        slideArea.textContent = '';

        // Check if we've reached the end
        if (this._slideIndex >= this._slideSequence.length) {
            this._startPostAssessment();
            return;
        }

        var slide = this._slideSequence[this._slideIndex];
        if (!slide) return;

        this._updateProgressBar();
        this._saveCurrentSession();

        if (slide.type === 'term') {
            this._renderTermCard(slideArea, slide.data, slide.tier, slide.keyIdea);
        } else if (slide.type === 'mc') {
            this._renderMCCard(slideArea, slide.data);
        } else if (slide.type === 'fib') {
            this._renderFIBCard(slideArea, slide.data);
        } else if (slide.type === 'keyIdea') {
            this._renderKeyIdeaCard(slideArea, slide.data);
        } else if (slide.type === 'reflection') {
            this._renderReflectionCard(slideArea, slide.data);
        }
    },

    _advanceSlide: function() {
        this._slideIndex++;
        this._renderCurrentSlide();
    },

    // ─── Card renderers ──────────────────────────────────────────

    _renderTermCard: function(slideArea, term, tier, keyIdea) {
        var self = this;
        var theme = this._config.unit.theme || {};
        var primary = theme.primary || '#4a90d9';
        var secondary = theme.secondary || '#64b5f6';

        var card = this._el('div');
        card.style.cssText = 'background:linear-gradient(135deg, ' + primary + '22, ' + secondary + '18);border:1px solid ' + primary + '44;' +
            'border-radius:var(--radius-md);padding:28px 24px;position:relative;';

        // Category label
        var catLabel = this._el('div', null, term.category || '');
        catLabel.style.cssText = 'text-transform:uppercase;font-size:0.75rem;letter-spacing:1.2px;color:' + primary + ';font-weight:600;margin-bottom:12px;';
        card.appendChild(catLabel);

        // Term name
        var termName = this._el('h2', null, term.term);
        termName.style.cssText = 'color:var(--text-primary);font-size:1.5rem;font-weight:700;margin:0 0 16px 0;';
        card.appendChild(termName);

        // Image if exists
        if (term.imageUrl) {
            var img = document.createElement('img');
            img.src = term.imageUrl;
            img.alt = term.term;
            img.style.cssText = 'max-height:120px;float:right;border-radius:8px;margin:0 0 12px 16px;';
            card.appendChild(img);
        }

        // Content based on tier
        var content = this._el('div');
        content.style.cssText = 'color:var(--text-secondary);font-size:1rem;line-height:1.6;';

        if (tier === 3 && keyIdea) {
            var kiText = this._el('p', null, keyIdea);
            kiText.style.cssText = 'margin:0 0 12px 0;font-style:italic;color:var(--text-primary);';
            content.appendChild(kiText);
            var connectPrompt = this._el('p', null, 'How does this connect to other topics you\'ve studied?');
            connectPrompt.style.cssText = 'margin:0;color:var(--text-secondary);font-size:0.9rem;';
            content.appendChild(connectPrompt);
        } else if (tier === 2) {
            var defText = this._el('p', null, term.definition || '');
            defText.style.cssText = 'margin:0 0 10px 0;';
            content.appendChild(defText);
            if (term.example) {
                var exText = this._el('p', null, 'For example: ' + term.example);
                exText.style.cssText = 'margin:0;font-style:italic;color:var(--text-secondary);font-size:0.9rem;';
                content.appendChild(exText);
            }
        } else {
            // Tier 1
            var simpleText = this._el('p', null, term.simpleExplanation || term.definition || '');
            simpleText.style.cssText = 'margin:0;';
            content.appendChild(simpleText);
        }

        card.appendChild(content);

        // Clear float
        var clearDiv = this._el('div');
        clearDiv.style.cssText = 'clear:both;';
        card.appendChild(clearDiv);

        // Got it button
        var btnWrap = this._el('div');
        btnWrap.style.cssText = 'text-align:center;margin-top:24px;';
        var gotItBtn = this._el('button', null, 'Got it');
        gotItBtn.style.cssText = 'padding:10px 36px;border-radius:var(--radius-md);background:var(--primary);color:#fff;border:none;font-size:1rem;cursor:pointer;font-weight:600;';
        gotItBtn.addEventListener('click', function() {
            self._advanceSlide();
        });
        btnWrap.appendChild(gotItBtn);
        card.appendChild(btnWrap);

        slideArea.appendChild(card);
    },

    _renderKeyIdeaCard: function(slideArea, data) {
        var self = this;
        if (!data) { this._advanceSlide(); return; }

        var card = this._el('div');
        card.style.cssText = 'background:var(--bg-deep);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-md);padding:28px 24px;';

        var label = this._el('div', null, 'Key Idea');
        label.style.cssText = 'color:var(--accent);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:6px;';
        card.appendChild(label);

        if (data.heading) {
            var heading = this._el('div', null, data.heading);
            heading.style.cssText = 'color:var(--text-secondary);font-size:0.85rem;margin-bottom:14px;';
            card.appendChild(heading);
        }

        var ideaText = this._el('div', null, data.keyIdea || '');
        ideaText.style.cssText = 'color:var(--text-primary);font-size:1.15rem;line-height:1.6;font-weight:500;margin-bottom:20px;';
        card.appendChild(ideaText);

        // Vocab term chips
        if (data.vocabTerms && data.vocabTerms.length > 0) {
            var chipWrap = this._el('div');
            chipWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;';
            for (var i = 0; i < data.vocabTerms.length; i++) {
                var chip = this._el('span', null, data.vocabTerms[i]);
                chip.style.cssText = 'padding:4px 12px;border-radius:12px;background:var(--primary);color:#fff;font-size:0.8rem;font-weight:500;opacity:0.85;';
                chipWrap.appendChild(chip);
            }
            card.appendChild(chipWrap);
        }

        var btnWrap = this._el('div');
        btnWrap.style.cssText = 'text-align:center;';
        var contBtn = this._el('button', null, 'Continue');
        contBtn.style.cssText = 'padding:10px 36px;border-radius:var(--radius-md);background:var(--accent);color:#fff;border:none;font-size:1rem;cursor:pointer;font-weight:600;';
        contBtn.addEventListener('click', function() {
            self._advanceSlide();
        });
        btnWrap.appendChild(contBtn);
        card.appendChild(btnWrap);

        slideArea.appendChild(card);
    },

    _renderMCCard: function(slideArea, q) {
        var self = this;
        if (!q) { this._advanceSlide(); return; }

        var card = this._el('div');
        card.style.cssText = 'background:var(--bg-deep);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-md);padding:28px 24px;';

        var label = this._el('div', null, 'Quick Check');
        label.style.cssText = 'color:var(--accent);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:12px;';
        card.appendChild(label);

        var qText = this._el('div', null, q.question);
        qText.style.cssText = 'color:var(--text-primary);font-size:1.05rem;line-height:1.5;margin-bottom:18px;';
        card.appendChild(qText);

        var shuffled = q.options.map(function(_, i) { return i; });
        this._shuffleArray(shuffled);

        var optWrap = this._el('div');

        for (var i = 0; i < shuffled.length; i++) {
            (function(origIdx, displayIdx) {
                var btn = self._el('button', null, q.options[origIdx]);
                btn.style.cssText = 'display:block;width:100%;text-align:left;padding:12px 16px;margin-bottom:8px;border-radius:var(--radius-md);' +
                    'background:var(--bg-card);color:var(--text-primary);border:1px solid rgba(255,255,255,0.06);cursor:pointer;font-size:0.95rem;transition:border-color 0.15s;';
                btn.addEventListener('mouseenter', function() { if (!btn.disabled) btn.style.borderColor = 'var(--primary)'; });
                btn.addEventListener('mouseleave', function() { if (!btn.disabled) btn.style.borderColor = 'rgba(255,255,255,0.06)'; });
                btn.addEventListener('click', function() {
                    var isCorrect = origIdx === q.correct;
                    var allBtns = optWrap.querySelectorAll('button');
                    for (var b = 0; b < allBtns.length; b++) {
                        allBtns[b].disabled = true;
                        allBtns[b].style.cursor = 'default';
                    }

                    if (isCorrect) {
                        btn.style.background = '#1a5c2a';
                        btn.style.borderColor = '#2ecc71';
                        // Update tiers - mark related terms as learning
                        var topic = q.topic;
                        if (topic) {
                            var related = self._getTermsForTopic(topic);
                            for (var r = 0; r < related.length; r++) {
                                // Right answer -> mark learning (tier stays or goes down)
                            }
                        }

                        var correctMsg = self._el('div', null, 'Correct!');
                        correctMsg.style.cssText = 'color:#2ecc71;font-weight:600;text-align:center;margin-top:12px;font-size:1rem;';
                        card.appendChild(correctMsg);

                        setTimeout(function() { self._advanceSlide(); }, 1500);
                    } else {
                        btn.style.background = '#5c1a1a';
                        btn.style.borderColor = '#e74c3c';
                        // Highlight correct
                        for (var b2 = 0; b2 < shuffled.length; b2++) {
                            if (shuffled[b2] === q.correct) {
                                allBtns[b2].style.background = '#1a5c2a';
                                allBtns[b2].style.borderColor = '#2ecc71';
                            }
                        }
                        // Update tiers - wrong answer bumps tier
                        if (q.topic) {
                            var wrongRelated = self._getTermsForTopic(q.topic);
                            for (var wr = 0; wr < wrongRelated.length; wr++) {
                                var currentTier = self._getTier(wrongRelated[wr]);
                                if (currentTier < 2) {
                                    self._setTier(wrongRelated[wr], 2);
                                }
                            }
                            self._saveTiers();
                        }

                        // Show explanation
                        if (q.explanation) {
                            var explEl = self._el('div', null, q.explanation);
                            explEl.style.cssText = 'color:var(--text-secondary);font-size:0.9rem;margin-top:12px;line-height:1.5;padding:10px;background:rgba(255,255,255,0.03);border-radius:8px;';
                            card.appendChild(explEl);
                        }

                        var contBtn = self._el('button', null, 'Continue');
                        contBtn.style.cssText = 'display:block;margin:16px auto 0;padding:10px 36px;border-radius:var(--radius-md);background:var(--primary);color:#fff;border:none;font-size:1rem;cursor:pointer;font-weight:600;';
                        contBtn.addEventListener('click', function() { self._advanceSlide(); });
                        card.appendChild(contBtn);
                    }
                });
                optWrap.appendChild(btn);
            })(shuffled[i], i);
        }

        card.appendChild(optWrap);
        slideArea.appendChild(card);
    },

    _renderFIBCard: function(slideArea, fib) {
        var self = this;
        if (!fib) { this._advanceSlide(); return; }

        var card = this._el('div');
        var theme = this._config.unit.theme || {};
        var primary = theme.primary || '#4a90d9';
        var secondary = theme.secondary || '#64b5f6';
        card.style.cssText = 'background:linear-gradient(135deg, var(--bg-deep), ' + primary + '10);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-md);padding:28px 24px;';

        var label = this._el('div', null, 'Fill in the Blank');
        label.style.cssText = 'color:var(--accent);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:12px;';
        card.appendChild(label);

        var sentence = this._el('div', null, fib.sentence);
        sentence.style.cssText = 'color:var(--text-primary);font-size:1.05rem;line-height:1.6;margin-bottom:20px;';
        card.appendChild(sentence);

        var distractors = this._getDistractors(fib.answer, fib.category, 3);
        var options = [fib.answer].concat(distractors);
        this._shuffleArray(options);

        var chipWrap = this._el('div');
        chipWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;';

        for (var i = 0; i < options.length; i++) {
            (function(opt) {
                var chip = self._el('button', null, opt);
                chip.style.cssText = 'padding:10px 20px;border-radius:20px;background:var(--bg-elevated);color:var(--text-primary);border:1px solid rgba(255,255,255,0.1);cursor:pointer;font-size:0.95rem;transition:border-color 0.15s,background 0.15s;';
                chip.addEventListener('mouseenter', function() { if (!chip.disabled) chip.style.borderColor = 'var(--primary)'; });
                chip.addEventListener('mouseleave', function() { if (!chip.disabled) chip.style.borderColor = 'rgba(255,255,255,0.1)'; });
                chip.addEventListener('click', function() {
                    var isCorrect = opt.toLowerCase() === fib.answer.toLowerCase();
                    var allChips = chipWrap.querySelectorAll('button');
                    for (var c = 0; c < allChips.length; c++) {
                        allChips[c].disabled = true;
                        allChips[c].style.cursor = 'default';
                    }

                    if (isCorrect) {
                        chip.style.background = '#1a5c2a';
                        chip.style.borderColor = '#2ecc71';

                        var correctMsg = self._el('div', null, 'Correct!');
                        correctMsg.style.cssText = 'color:#2ecc71;font-weight:600;text-align:center;margin-top:14px;font-size:1rem;';
                        card.appendChild(correctMsg);

                        setTimeout(function() { self._advanceSlide(); }, 1500);
                    } else {
                        chip.style.background = '#5c1a1a';
                        chip.style.borderColor = '#e74c3c';
                        // Highlight correct
                        for (var c2 = 0; c2 < allChips.length; c2++) {
                            if (allChips[c2].textContent.toLowerCase() === fib.answer.toLowerCase()) {
                                allChips[c2].style.background = '#1a5c2a';
                                allChips[c2].style.borderColor = '#2ecc71';
                            }
                        }

                        // Tier update
                        if (fib.answer) {
                            var currentTier = self._getTier(fib.answer);
                            if (currentTier < 2) {
                                self._setTier(fib.answer, 2);
                            }
                            self._saveTiers();
                        }

                        var contBtn = self._el('button', null, 'Continue');
                        contBtn.style.cssText = 'display:block;margin:16px auto 0;padding:10px 36px;border-radius:var(--radius-md);background:var(--primary);color:#fff;border:none;font-size:1rem;cursor:pointer;font-weight:600;';
                        contBtn.addEventListener('click', function() { self._advanceSlide(); });
                        card.appendChild(contBtn);
                    }
                });
                chipWrap.appendChild(chip);
            })(options[i]);
        }

        card.appendChild(chipWrap);
        slideArea.appendChild(card);
    },

    // ─── Reflection cards ────────────────────────────────────────

    _renderReflectionCard: function(slideArea, data) {
        var self = this;

        var card = this._el('div');
        card.style.cssText = 'background:var(--bg-card);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-md);padding:28px 24px;text-align:center;';

        var icon = this._icon('fas fa-lightbulb');
        icon.style.cssText = 'font-size:1.8rem;color:var(--accent);margin-bottom:12px;display:block;';
        card.appendChild(icon);

        var label = this._el('div', null, 'Reflection');
        label.style.cssText = 'color:var(--accent);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:14px;';
        card.appendChild(label);

        var prompt = this._el('div', null, data.prompt || 'What have you learned so far?');
        prompt.style.cssText = 'color:var(--text-primary);font-size:1.05rem;line-height:1.5;margin-bottom:18px;text-align:left;';
        card.appendChild(prompt);

        var textarea = document.createElement('textarea');
        textarea.placeholder = 'Type your reflection here...';
        textarea.style.cssText = 'width:100%;min-height:80px;padding:12px;border-radius:var(--radius-md);background:var(--bg-deep);color:var(--text-primary);border:1px solid rgba(255,255,255,0.1);font-size:0.95rem;resize:vertical;font-family:inherit;box-sizing:border-box;';
        card.appendChild(textarea);

        var btnRow = this._el('div');
        btnRow.style.cssText = 'display:flex;justify-content:center;gap:12px;margin-top:16px;';

        var shareBtn = this._el('button', null, 'Share & Continue');
        shareBtn.style.cssText = 'padding:10px 28px;border-radius:var(--radius-md);background:var(--primary);color:#fff;border:none;font-size:1rem;cursor:pointer;font-weight:600;';
        shareBtn.addEventListener('click', function() {
            var val = textarea.value;
            if (val && val.trim()) {
                self._saveReflection(val, data.term || '');
                StudyUtils.showToast('Reflection saved!', 'success', 2000);
            }
            self._advanceSlide();
        });
        btnRow.appendChild(shareBtn);

        var skipLink = this._el('button', null, 'Skip');
        skipLink.style.cssText = 'padding:10px 20px;border-radius:var(--radius-md);background:none;color:var(--text-secondary);border:none;font-size:0.9rem;cursor:pointer;text-decoration:underline;';
        skipLink.addEventListener('click', function() {
            self._advanceSlide();
        });
        btnRow.appendChild(skipLink);

        card.appendChild(btnRow);
        slideArea.appendChild(card);
    },

    // ─── Wonder button ───────────────────────────────────────────

    _addWonderButton: function(container) {
        var self = this;

        // Remove existing wonder button if any
        var existing = container.querySelector('.lm-wonder-btn');
        if (existing) existing.remove();

        var wonderBtn = this._el('button');
        wonderBtn.className = 'lm-wonder-btn';
        wonderBtn.style.cssText = 'position:fixed;bottom:24px;right:24px;width:44px;height:44px;border-radius:50%;background:var(--bg-elevated);border:1px solid rgba(255,255,255,0.1);' +
            'cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:100;transition:transform 0.15s;box-shadow:var(--shadow-card);';
        var bulb = this._icon('fas fa-lightbulb');
        bulb.style.cssText = 'color:var(--accent);font-size:1rem;';
        wonderBtn.appendChild(bulb);

        wonderBtn.addEventListener('mouseenter', function() { wonderBtn.style.transform = 'scale(1.1)'; });
        wonderBtn.addEventListener('mouseleave', function() { wonderBtn.style.transform = 'scale(1)'; });

        wonderBtn.addEventListener('click', function() {
            self._showWonderOverlay(container);
        });

        container.appendChild(wonderBtn);
    },

    _showWonderOverlay: function(container) {
        var self = this;

        // Remove existing overlay
        var existing = container.querySelector('.lm-wonder-overlay');
        if (existing) existing.remove();

        var overlay = this._el('div', 'lm-wonder-overlay');
        overlay.style.cssText = 'position:fixed;bottom:80px;right:24px;width:280px;background:var(--bg-elevated);border:1px solid rgba(255,255,255,0.12);' +
            'border-radius:var(--radius-md);padding:16px;z-index:101;box-shadow:var(--shadow-card);';

        var title = this._el('div', null, 'I wonder...');
        title.style.cssText = 'color:var(--text-primary);font-weight:600;font-size:0.95rem;margin-bottom:10px;';
        overlay.appendChild(title);

        var textarea = document.createElement('textarea');
        textarea.placeholder = 'What are you wondering about?';
        textarea.style.cssText = 'width:100%;min-height:60px;padding:10px;border-radius:8px;background:var(--bg-deep);color:var(--text-primary);border:1px solid rgba(255,255,255,0.08);font-size:0.9rem;resize:none;font-family:inherit;box-sizing:border-box;';
        overlay.appendChild(textarea);

        var btnRow = this._el('div');
        btnRow.style.cssText = 'display:flex;gap:8px;margin-top:10px;justify-content:flex-end;';

        var cancelBtn = this._el('button', null, 'Cancel');
        cancelBtn.style.cssText = 'padding:6px 14px;border-radius:6px;background:none;color:var(--text-secondary);border:none;cursor:pointer;font-size:0.85rem;';
        cancelBtn.addEventListener('click', function() {
            overlay.remove();
        });
        btnRow.appendChild(cancelBtn);

        var submitBtn = this._el('button', null, 'Save');
        submitBtn.style.cssText = 'padding:6px 14px;border-radius:6px;background:var(--primary);color:#fff;border:none;cursor:pointer;font-size:0.85rem;font-weight:600;';
        submitBtn.addEventListener('click', function() {
            var val = textarea.value;
            if (val && val.trim()) {
                self._saveReflection(val, 'wonder');
                StudyUtils.showToast('Wonder saved!', 'success', 2000);
            }
            overlay.remove();
        });
        btnRow.appendChild(submitBtn);

        overlay.appendChild(btnRow);
        container.appendChild(overlay);

        textarea.focus();
    },

    // ─── Post-Assessment ─────────────────────────────────────────

    _startPostAssessment: function() {
        var container = this._container;
        container.textContent = '';
        var self = this;
        var config = this._config;
        var scope = this._scope;
        var allMastered = this._allCategoriesMastered();

        // Build question pool excluding questions used in pre-assessment
        var pool = [];
        var pq = config.practiceQuestions || [];
        for (var i = 0; i < pq.length; i++) {
            if (this._questionsUsed.indexOf(i) !== -1) continue;
            var q = pq[i];
            if (!q.topic) continue;
            if (q.topic === 'Connections' && !allMastered) continue;
            if (scope.indexOf(q.topic) !== -1) {
                pool.push({ type: 'mc', data: q, index: i });
            }
        }
        var fib = config.fillInBlankSentences || [];
        for (var j = 0; j < fib.length; j++) {
            var idx = j + 10000;
            if (this._questionsUsed.indexOf(idx) !== -1) continue;
            var f = fib[j];
            if (!f.category) continue;
            if (scope.indexOf(f.category) !== -1) {
                pool.push({ type: 'fib', data: f, index: idx });
            }
        }

        // Ensure at least 1 per topic
        var topicCovered = {};
        var ensured = [];
        var remainder = [];
        for (var k = 0; k < pool.length; k++) {
            var topic = pool[k].data.topic || pool[k].data.category;
            if (!topicCovered[topic]) {
                topicCovered[topic] = true;
                ensured.push(pool[k]);
            } else {
                remainder.push(pool[k]);
            }
        }
        this._shuffleArray(ensured);
        this._shuffleArray(remainder);
        var assessPool = ensured.concat(remainder);
        var maxQ = Math.min(assessPool.length, Math.max(scope.length * 2, 6));
        assessPool = assessPool.slice(0, maxQ);

        // If no questions available for post, skip to growth
        if (assessPool.length === 0) {
            this._postResults = { correct: {}, wrong: {}, total: {}, score: 0, count: 0, wrongTerms: [] };
            this._showGrowthScreen();
            return;
        }

        this._postResults = { correct: {}, wrong: {}, total: {}, score: 0, count: 0, wrongTerms: [] };
        var qIdx = 0;

        var showNext = function() {
            if (qIdx >= assessPool.length) {
                self._showGrowthScreen();
                return;
            }
            var item = assessPool[qIdx];
            self._questionsUsed.push(item.index);
            var topic = item.data.topic || item.data.category || 'General';
            if (!self._postResults.total[topic]) self._postResults.total[topic] = 0;
            self._postResults.total[topic]++;

            if (item.type === 'mc') {
                self._renderAssessmentMC(item.data, function(correct) {
                    if (correct) {
                        if (!self._postResults.correct[topic]) self._postResults.correct[topic] = 0;
                        self._postResults.correct[topic]++;
                        self._postResults.score++;
                    } else {
                        if (!self._postResults.wrong[topic]) self._postResults.wrong[topic] = 0;
                        self._postResults.wrong[topic]++;
                        if (item.data.topic) {
                            var relatedTerms = self._getTermsForTopic(item.data.topic);
                            self._postResults.wrongTerms = self._postResults.wrongTerms.concat(relatedTerms);
                        }
                    }
                    self._postResults.count++;
                    qIdx++;
                    showNext();
                });
            } else {
                self._renderAssessmentFIB(item.data, function(correct) {
                    if (correct) {
                        if (!self._postResults.correct[topic]) self._postResults.correct[topic] = 0;
                        self._postResults.correct[topic]++;
                        self._postResults.score++;
                    } else {
                        if (!self._postResults.wrong[topic]) self._postResults.wrong[topic] = 0;
                        self._postResults.wrong[topic]++;
                        if (item.data.answer) {
                            self._postResults.wrongTerms.push(item.data.answer);
                        }
                    }
                    self._postResults.count++;
                    qIdx++;
                    showNext();
                });
            }
        };

        showNext();
    },

    // ─── Growth screen ───────────────────────────────────────────

    _showGrowthScreen: function() {
        var container = this._container;
        container.textContent = '';
        var self = this;

        var pre = this._preResults || { score: 0, count: 0, correct: {}, total: {} };
        var post = this._postResults || { score: 0, count: 0, correct: {}, total: {} };

        var prePct = pre.count > 0 ? Math.round((pre.score / pre.count) * 100) : 0;
        var postPct = post.count > 0 ? Math.round((post.score / post.count) * 100) : 0;
        var growth = postPct - prePct;

        var wrap = this._el('div');
        wrap.style.cssText = 'max-width:500px;margin:30px auto;padding:24px 20px;text-align:center;';

        var trophy = this._icon('fas fa-trophy');
        trophy.style.cssText = 'font-size:2.5rem;color:var(--accent);margin-bottom:12px;display:block;';
        wrap.appendChild(trophy);

        var heading = this._el('h2', null, 'Session Complete!');
        heading.style.cssText = 'color:var(--text-primary);margin:0 0 20px 0;font-size:1.4rem;';
        wrap.appendChild(heading);

        // Before/After bars
        var barsWrap = this._el('div');
        barsWrap.style.cssText = 'display:flex;gap:20px;justify-content:center;margin-bottom:24px;';

        var beforeCol = this._el('div');
        beforeCol.style.cssText = 'text-align:center;flex:1;';
        var beforeLabel = this._el('div', null, 'Before');
        beforeLabel.style.cssText = 'color:var(--text-secondary);font-size:0.8rem;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;';
        beforeCol.appendChild(beforeLabel);
        var beforePctEl = this._el('div', null, prePct + '%');
        beforePctEl.style.cssText = 'color:var(--text-primary);font-size:2rem;font-weight:700;';
        beforeCol.appendChild(beforePctEl);
        barsWrap.appendChild(beforeCol);

        var arrow = this._icon('fas fa-arrow-right');
        arrow.style.cssText = 'color:var(--primary);font-size:1.5rem;align-self:center;';
        barsWrap.appendChild(arrow);

        var afterCol = this._el('div');
        afterCol.style.cssText = 'text-align:center;flex:1;';
        var afterLabel = this._el('div', null, 'After');
        afterLabel.style.cssText = 'color:var(--text-secondary);font-size:0.8rem;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;';
        afterCol.appendChild(afterLabel);
        var afterPctEl = this._el('div', null, postPct + '%');
        afterPctEl.style.cssText = 'color:' + (postPct >= prePct ? '#2ecc71' : 'var(--accent)') + ';font-size:2rem;font-weight:700;';
        afterCol.appendChild(afterPctEl);
        barsWrap.appendChild(afterCol);

        wrap.appendChild(barsWrap);

        // Growth message
        var msg = growth > 0 ? 'You improved by ' + growth + '%. Great work!' :
                  growth === 0 ? 'You held steady. Keep practicing!' :
                  'Keep going! Every session builds understanding.';
        var msgEl = this._el('div', null, msg);
        msgEl.style.cssText = 'color:var(--text-secondary);font-size:1rem;margin-bottom:20px;';
        wrap.appendChild(msgEl);

        // Per-topic breakdown
        var allTopics = {};
        var topics = Object.keys(pre.total || {}).concat(Object.keys(post.total || {}));
        for (var i = 0; i < topics.length; i++) {
            allTopics[topics[i]] = true;
        }
        var uniqueTopics = Object.keys(allTopics);

        if (uniqueTopics.length > 0) {
            var breakdown = this._el('div');
            breakdown.style.cssText = 'text-align:left;margin-bottom:24px;';

            var bTitle = this._el('div', null, 'By Topic');
            bTitle.style.cssText = 'color:var(--text-secondary);font-size:0.8rem;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;';
            breakdown.appendChild(bTitle);

            for (var j = 0; j < uniqueTopics.length; j++) {
                var topic = uniqueTopics[j];
                var preTopicPct = (pre.total[topic] || 0) > 0 ? Math.round(((pre.correct[topic] || 0) / pre.total[topic]) * 100) : 0;
                var postTopicPct = (post.total[topic] || 0) > 0 ? Math.round(((post.correct[topic] || 0) / post.total[topic]) * 100) : 0;

                var row = this._el('div');
                row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);';

                var tName = this._el('span', null, topic);
                tName.style.cssText = 'color:var(--text-primary);font-size:0.9rem;';
                row.appendChild(tName);

                var tScore = this._el('span', null, preTopicPct + '% → ' + postTopicPct + '%');
                tScore.style.cssText = 'color:' + (postTopicPct >= preTopicPct ? '#2ecc71' : 'var(--accent)') + ';font-size:0.9rem;font-weight:500;';
                row.appendChild(tScore);

                breakdown.appendChild(row);
            }
            wrap.appendChild(breakdown);
        }

        // Save session
        this._saveSessionRecord();

        // Completion bonus
        this._checkCompletionBonus(wrap);

        // Action buttons
        var btnRow = this._el('div');
        btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center;margin-top:20px;';

        var doneBtn = this._el('button', null, 'Done');
        doneBtn.style.cssText = 'padding:10px 32px;border-radius:var(--radius-md);background:var(--primary);color:#fff;border:none;font-size:1rem;cursor:pointer;font-weight:600;';
        doneBtn.addEventListener('click', function() {
            self._clearCurrentSession();
            self._renderSetup(container);
        });
        btnRow.appendChild(doneBtn);

        wrap.appendChild(btnRow);
        container.appendChild(wrap);
    },

    _saveSessionRecord: function() {
        var unitId = this._config.unit.id;
        var sessions = this._loadSessions();
        var pre = this._preResults || {};
        var post = this._postResults || {};

        sessions.push({
            mode: this._mode,
            scope: this._scope,
            timestamp: Date.now(),
            preScore: pre.score || 0,
            preCount: pre.count || 0,
            postScore: post.score || 0,
            postCount: post.count || 0,
            wrongTerms: (post.wrongTerms || []).concat(pre.wrongTerms || [])
        });

        // Keep last 20 sessions
        if (sessions.length > 20) {
            sessions = sessions.slice(sessions.length - 20);
        }

        ProgressManager.save(unitId, 'learn-mode-sessions', sessions);
        this._saveTiers();
        this._clearCurrentSession();
    },

    _checkCompletionBonus: function(wrap) {
        var unitId = this._config.unit.id;
        var today = new Date().toISOString().slice(0, 10);
        var bonusKey = 'learn-mode-bonus-' + today;
        var alreadyAwarded = ProgressManager.load(unitId, bonusKey);

        if (!alreadyAwarded) {
            // Award 5 min (300000ms) bonus
            if (typeof ProgressManager.addStudyTime === 'function') {
                ProgressManager.addStudyTime(unitId, 300000);
            }
            ProgressManager.save(unitId, bonusKey, true);

            var bonusMsg = this._el('div');
            bonusMsg.style.cssText = 'background:linear-gradient(135deg, #2ecc7122, #27ae6022);border:1px solid #2ecc7144;border-radius:var(--radius-md);padding:14px 18px;margin-top:16px;';

            var bonusIcon = this._icon('fas fa-star');
            bonusIcon.style.cssText = 'color:#f1c40f;margin-right:8px;';
            bonusMsg.appendChild(bonusIcon);

            var bonusText = document.createTextNode('+5 min study time bonus! Great job completing a Learn Mode session today.');
            bonusMsg.appendChild(bonusText);
            bonusMsg.style.color = '#2ecc71';
            bonusMsg.style.fontSize = '0.95rem';

            wrap.appendChild(bonusMsg);

            StudyUtils.showToast('Bonus: +5 min study time!', 'success', 3000);
        }
    },

    // ─── Cleanup ─────────────────────────────────────────────────

    destroy: function() {
        // Remove wonder button and overlay if present
        var wonderBtn = document.querySelector('.lm-wonder-btn');
        if (wonderBtn) wonderBtn.remove();
        var overlay = document.querySelector('.lm-wonder-overlay');
        if (overlay) overlay.remove();
    }
});
