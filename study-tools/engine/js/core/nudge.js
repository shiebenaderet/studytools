var NudgeManager = {

    _sessionActivityCounts: {},
    _sessionNudgeCount: 0,
    _lastActivityId: null,
    MAX_NUDGES_PER_SESSION: 3,
    _smartNudgeCount: 0,
    MAX_SMART_NUDGES: 2,
    _learnModeDoneToday: false,

    RECOGNITION_GAMES: ['term-catcher', 'flip-match', 'hangman', 'tower-defense'],
    ANALYSIS_GAMES: ['sort-it-out', 'who-am-i', 'four-corners', 'map-quiz', 'source-analysis'],
    STALE_ACTIVITY_DAYS: 3,

    STUDY_FLOW: ['textbook', 'flashcards', 'fill-in-blank', 'typing-practice', 'practice-test'],

    ACTIVITY_INFO: {
        'textbook':         { icon: 'fas fa-book-open',       name: 'Textbook',          group: 'study' },
        'flashcards':       { icon: 'fas fa-graduation-cap',  name: 'Flashcards',        group: 'study' },
        'fill-in-blank':    { icon: 'fas fa-puzzle-piece',    name: 'Fill in the Blank', group: 'study' },
        'typing-practice':  { icon: 'fas fa-keyboard',        name: 'Typing Practice',   group: 'study' },
        'practice-test':    { icon: 'fas fa-pencil',          name: 'Practice Test',     group: 'practice' },
        'timeline':         { icon: 'fas fa-clock',           name: 'Timeline',          group: 'practice' },
        'power-sort':       { icon: 'fas fa-sitemap',         name: 'Power Sort',        group: 'practice' },
        'wordle':           { icon: 'fas fa-th',              name: 'Wordle',            group: 'games' },
        'hangman':          { icon: 'fas fa-skull-crossbones',name: 'Hangman',           group: 'games' },
        'flip-match':       { icon: 'fas fa-clone',           name: 'Flip Match',        group: 'games' },
        'lightning-round':  { icon: 'fas fa-bolt',            name: 'Lightning Round',   group: 'games' },
        'crossword':        { icon: 'fas fa-border-all',      name: 'Crossword',         group: 'games' },
        'term-catcher':     { icon: 'fas fa-hand-paper',      name: 'Term Catcher',      group: 'games' },
        'tower-defense':    { icon: 'fas fa-chess-rook',      name: 'Tower Defense',     group: 'games' },
        'quiz-race':        { icon: 'fas fa-flag-checkered',  name: 'Quiz Race',         group: 'games' },
        'sort-it-out':      { icon: 'fas fa-layer-group',    name: 'Sort It Out',       group: 'games' },
        'who-am-i':         { icon: 'fas fa-question-circle',name: 'Who Am I?',         group: 'games' },
        'four-corners':     { icon: 'fas fa-th-large',       name: 'Four Corners',      group: 'games' },
        'learn-mode':       { icon: 'fas fa-brain',          name: 'Learn Mode',        group: 'study' },
        'source-analysis':  { icon: 'fas fa-search',         name: 'Source Analysis',   group: 'study' }
    },

    // ── Nudge log helpers ──
    // Every toast, card and home-screen note is logged (NudgeCore): shown at
    // most once a day, and counted as followed when the student acts on it.

    _loadLog(unitId) {
        return ProgressManager.load(unitId, 'nudge_log') || {};
    },

    // "Name, text" or "Text", so a message reads right with or without a name.
    _say(text) {
        var firstName = ProgressManager.getFirstName();
        return firstName ? firstName + ', ' + text : text.charAt(0).toUpperCase() + text.slice(1);
    },

    _openTarget(target) {
        if (target === 'notebook') {
            if (typeof NotebookCompanion !== 'undefined') NotebookCompanion.open();
        } else if (typeof StudyEngine !== 'undefined') {
            StudyEngine.activateActivity(target);
        }
    },

    // Show a toast unless this nudge was already shown today. A toast with a
    // target gets an Open button. Returns true if it was shown.
    _toast(unitId, id, message, target) {
        var now = Date.now();
        var duration = typeof NudgeCore !== 'undefined' ? NudgeCore.toastDuration(message) : 6000;
        if (typeof NudgeCore !== 'undefined') {
            var log = this._loadLog(unitId);
            if (!NudgeCore.markShown(log, id, target, now)) return false;
            ProgressManager.save(unitId, 'nudge_log', log);
        }
        var self = this;
        StudyUtils.showToast(message, 'info', duration, target ? {
            actionLabel: 'Open', onAction: function() { self._openTarget(target); }
        } : null);
        return true;
    },

    // A student opened an activity (or Notebook Companion): any toast that
    // pointed there in the last 15 minutes was followed.
    noteOpened(unitId, target) {
        if (typeof NudgeCore === 'undefined' || !unitId) return;
        var log = this._loadLog(unitId), now = Date.now();
        var ids = NudgeCore.followedBy(log, target, now);
        if (!ids.length) return;
        ids.forEach(function(id) { NudgeCore.markFollowed(log, id, now); });
        ProgressManager.save(unitId, 'nudge_log', log);
    },

    // Cards and home-screen notes: shown (once a day) and followed (clicked).
    logShown(unitId, id) {
        if (typeof NudgeCore === 'undefined' || !unitId || !id) return;
        var log = this._loadLog(unitId);
        if (NudgeCore.markShown(log, id, null, Date.now())) ProgressManager.save(unitId, 'nudge_log', log);
    },
    logFollowed(unitId, id) {
        if (typeof NudgeCore === 'undefined' || !unitId || !id) return;
        var log = this._loadLog(unitId);
        if (NudgeCore.markFollowed(log, id, Date.now())) ProgressManager.save(unitId, 'nudge_log', log);
    },

    _missedCount(unitId) {
        var pt = ProgressManager.getActivityProgress(unitId, 'practice-test-mastery') || {};
        return (pt.wrong || []).length;
    },

    // Activities whose missed questions land on the Notebook Companion list.
    QUESTION_ACTIVITIES: ['practice-test', 'learn-mode', 'tower-defense'],

    _pickAnalysisGame(config) {
        var games = this.ANALYSIS_GAMES.filter(function(g) {
            return config.activities && config.activities.indexOf(g) !== -1;
        });
        return games.length ? games[Math.floor(Math.random() * games.length)] : null;
    },

    // ── Opening an activity: at most one toast ──
    checkSmartNudge(activityId, config) {
        var unitId = config && config.unit ? config.unit.id : null;
        if (!unitId) return;

        // "Last used" is saved on opening too, so a student who goes straight
        // from one activity to another still has a date.
        ProgressManager.save(unitId, 'lastUsed_' + activityId, Date.now());
        this.noteOpened(unitId, activityId);
        // Remember the missed-question count, to tell on leaving whether this
        // activity added any.
        this._wrongAtOpen = { activity: activityId, count: this._missedCount(unitId) };

        // Track how many times this activity was used this session
        this._sessionActivityCounts[activityId] = (this._sessionActivityCounts[activityId] || 0) + 1;

        // Don't nudge if teacher-unlock is active or guest
        if (sessionStorage.getItem('teacher-unlock') === 'true') return;
        if (!ProgressManager.studentInfo || ProgressManager.studentInfo.isGuest) return;
        if (this._smartNudgeCount >= this.MAX_SMART_NUDGES) return;

        var today = new Date().toDateString();
        var learnStreak = ProgressManager.load(unitId, 'learn-mode-streak') || {};
        this._learnModeDoneToday = learnStreak.lastSessionDate === today;
        var actInfo = this.ACTIVITY_INFO[activityId];
        var isGame = actInfo && actInfo.group === 'games';

        // Opening a game without doing Learn Mode today
        if (isGame && !this._learnModeDoneToday && config.activities && config.activities.indexOf('learn-mode') !== -1) {
            var streak = learnStreak.currentStreak || 0;
            var multiplier = streak >= 3 ? '2x' : streak >= 2 ? '1.75x' : '1.5x';
            var streakNote = streak >= 1 ? ' (day ' + (streak + 1) + ' of your streak)' : '';
            if (this._toast(unitId, 'learn-first', this._say('start with Learn Mode. It brings back the terms you are still learning, so the games after it stick better.\nToday it also earns ' + multiplier + ' points' + streakNote + '.'), 'learn-mode')) {
                this._smartNudgeCount++;
                return;
            }
        }

        // Opening a game with no short answers written yet this unit
        if (isGame && typeof ResponseCapture !== 'undefined'
            && config.activities && config.activities.indexOf('short-answer') !== -1
            && (config.shortAnswerQuestions || []).length
            && ResponseCapture.answeredCount(unitId, config) === 0) {
            if (this._toast(unitId, 'short-answer', this._say('try writing a short answer. Explaining an idea in your own words is one of the best ways to remember it.\nEach finished answer earns study points.'), 'short-answer')) {
                this._smartNudgeCount++;
                return;
            }
        }

        // Playing a recognition game twice in a session
        if (this.RECOGNITION_GAMES.indexOf(activityId) !== -1 && this._sessionActivityCounts[activityId] >= 2) {
            var game = this._pickAnalysisGame(config);
            if (game) {
                var name = this.ACTIVITY_INFO[game] ? this.ACTIVITY_INFO[game].name : game;
                if (this._toast(unitId, 'harder-game', this._say('ready for a harder kind of practice? ' + name + ' makes you use the terms, not just recognize them.\nIt earns 1.25x points.'), game)) {
                    this._smartNudgeCount++;
                }
            }
        }
    },

    checkPostLearnNudge(config) {
        if (this._smartNudgeCount >= this.MAX_SMART_NUDGES) return;
        if (sessionStorage.getItem('teacher-unlock') === 'true') return;
        var game = this._pickAnalysisGame(config);
        if (!game) return;
        var name = this.ACTIVITY_INFO[game] ? this.ACTIVITY_INFO[game].name : game;
        if (this._toast(config.unit.id, 'after-learn', this._say('want to test what you just learned? Try ' + name + ' while it is fresh.'), game)) {
            this._smartNudgeCount++;
        }
    },

    trackMissedTerms(unitId, config, missedTermNames) {
        if (!missedTermNames || missedTermNames.length === 0) return;
        var vocab = config.vocabulary || [];

        var weakData = ProgressManager.load(unitId, 'weakness_tracker') || { terms: {} };
        for (var i = 0; i < missedTermNames.length; i++) {
            var termName = missedTermNames[i];
            for (var j = 0; j < vocab.length; j++) {
                if (vocab[j].term.toLowerCase() === termName.toLowerCase()) {
                    weakData = ProgressManager.markWeakTerm(unitId, vocab[j].term);
                    break;
                }
            }
        }

        var fcProgress = ProgressManager.getActivityProgress(unitId, 'flashcards') || {};
        var mastered = fcProgress.mastered ? fcProgress.mastered.slice() : [];
        // Preserve the everMastered high-water mark so the leaderboard score
        // doesn't drop when a term gets pushed back into the study queue.
        var everMastered = fcProgress.everMastered
            ? fcProgress.everMastered.slice()
            : mastered.slice();
        var ratings = fcProgress.ratings ? Object.assign({}, fcProgress.ratings) : {};
        var changed = false;

        for (var i = 0; i < missedTermNames.length; i++) {
            var termName = missedTermNames[i];
            for (var j = 0; j < vocab.length; j++) {
                if (vocab[j].term.toLowerCase() === termName.toLowerCase()) {
                    ratings[vocab[j].term] = 'again';
                    var mIdx = mastered.indexOf(vocab[j].term);
                    if (mIdx !== -1) {
                        mastered.splice(mIdx, 1);
                    }
                    changed = true;
                    break;
                }
            }
        }

        if (changed) {
            ProgressManager.saveActivityProgress(unitId, 'flashcards', {
                mastered: mastered,
                everMastered: everMastered,
                ratings: ratings
            });
        }
    },

    getSuggestions(config) {
        if (!config || !config.unit) return [];
        var unitId = config.unit.id;
        var suggestions = [];

        // Highest priority: if last activity was capped for the day, suggest an uncapped alternative
        if (typeof ActivityTimer !== 'undefined' && typeof StudyEngine !== 'undefined') {
            var lastAct = StudyEngine.activeActivity;
            if (lastAct && ActivityTimer._isActivityCappedToday(unitId, lastAct)) {
                var alt = this._pickUncappedActivity(unitId, lastAct, config);
                if (alt) {
                    var info = this.ACTIVITY_INFO[alt];
                    if (info) {
                        var cappedName = this.ACTIVITY_INFO[lastAct] ? this.ACTIVITY_INFO[lastAct].name : lastAct;
                        suggestions.push({
                            activityId: alt,
                            nudgeId: 'card-capped',
                            icon: info.icon,
                            name: info.name,
                            group: info.group,
                            reason: 'You\'ve maxed out ' + cappedName + ' for today \u2014 try this instead!'
                        });
                    }
                }
            }
        }

        // Read before study: an unread chapter is the best first step, though
        // nothing is locked behind it anymore.
        if (typeof MasteryManager !== 'undefined' && MasteryManager.getNextUnreadChapter) {
            var unread = MasteryManager.getNextUnreadChapter(unitId, config);
            var earned = MasteryManager.getEarnedCategories ? MasteryManager.getEarnedCategories(unitId, config) : [];
            if (unread && earned.indexOf(unread.category) !== -1 && this.ACTIVITY_INFO.textbook
                && !suggestions.some(function(s) { return s.activityId === 'textbook'; })) {
                suggestions.unshift({
                    activityId: 'textbook',
                    nudgeId: 'card-read',
                    icon: this.ACTIVITY_INFO.textbook.icon,
                    name: 'Read Chapter ' + unread.index,
                    params: [unread.segmentId],   // open the textbook at that chapter
                    group: this.ACTIVITY_INFO.textbook.group,
                    reason: 'Read it before you study the "' + unread.category + '" terms'
                });
            }
        }

        // Notebook Companion: top of the list in quiz week, otherwise after
        // the reading card.
        var nbCard = this._notebookCard(config);
        if (nbCard) {
            if (nbCard.quizWeek) suggestions.unshift(nbCard);
            else suggestions.push(nbCard);
        }

        var weakCount = this._getWeakTermCount(unitId);
        var triedActivities = this._getTriedActivities(unitId);
        var fcProgress = ProgressManager.getActivityProgress(unitId, 'flashcards') || {};
        var nudgeHasTiers = config.vocabulary && config.vocabulary.some(function(v) { return v.tier; });
        var nudgeMasteredList = fcProgress.mastered || [];
        var masteredCount = nudgeHasTiers
            ? nudgeMasteredList.filter(function(t) { return config.vocabulary.some(function(v) { return v.term === t && (!v.tier || v.tier === 'must-know'); }); }).length
            : nudgeMasteredList.length;
        var totalVocab = nudgeHasTiers
            ? config.vocabulary.filter(function(v) { return !v.tier || v.tier === 'must-know'; }).length
            : (config.vocabulary ? config.vocabulary.length : 0);

        if (weakCount > 0) {
            var remediation = this._pickRemediationActivity(unitId, triedActivities);
            if (remediation) {
                var info = this.ACTIVITY_INFO[remediation];
                suggestions.push({
                    activityId: remediation,
                    nudgeId: 'card-review',
                    icon: info.icon,
                    name: info.name,
                    group: info.group,
                    reason: weakCount + ' term' + (weakCount > 1 ? 's' : '') + ' need' + (weakCount === 1 ? 's' : '') + ' review'
                });
            }
        }

        if (suggestions.length < 2) {
            var flowGap = this._findFlowGap(unitId, triedActivities, masteredCount, totalVocab);
            if (flowGap && !suggestions.some(function(s) { return s.activityId === flowGap; })) {
                var info = this.ACTIVITY_INFO[flowGap];
                if (info) {
                    suggestions.push({
                        activityId: flowGap,
                        nudgeId: 'card-next',
                        icon: info.icon,
                        name: info.name,
                        group: info.group,
                        reason: 'Next step in your study plan'
                    });
                }
            }
        }

        if (suggestions.length < 2) {
            var stale = this._getStaleActivity(unitId, config);
            if (stale && !suggestions.some(function(s) { return s.activityId === stale.id; })) {
                var info = this.ACTIVITY_INFO[stale.id];
                if (info) {
                    suggestions.push({
                        activityId: stale.id,
                        nudgeId: 'card-stale',
                        icon: info.icon,
                        name: info.name,
                        group: info.group,
                        reason: 'You haven\'t tried ' + info.name + ' in ' + stale.days + ' day' + (stale.days !== 1 ? 's' : '') + ' \u2014 give it another go!'
                    });
                }
            }
        }

        if (suggestions.length < 2) {
            var untried = this._getUntriedActivity(unitId, triedActivities, config);
            if (untried && !suggestions.some(function(s) { return s.activityId === untried; })) {
                var info = this.ACTIVITY_INFO[untried];
                if (info) {
                    suggestions.push({
                        activityId: untried,
                        nudgeId: 'card-untried',
                        icon: info.icon,
                        name: info.name,
                        group: info.group,
                        reason: 'You haven\'t tried this yet'
                    });
                }
            }
        }

        return suggestions;
    },

    // "Get your notebook ready": when a reread is due, a practice question
    // is on the missed list, or the quiz is a week away or less.
    _notebookCard(config) {
        if (typeof NotebookCore === 'undefined' || typeof NotebookCompanion === 'undefined') return null;
        var unitId = config.unit.id;
        var textbook = typeof MasteryManager !== 'undefined' ? MasteryManager._textbookCache[unitId] : null;
        var rereads = 0;
        if (textbook) {
            rereads = NotebookCore.readingPlan({
                config: config, textbook: textbook,
                tbProgress: ProgressManager.getActivityProgress(unitId, 'textbook') || {},
                weak: ProgressManager.load(unitId, 'weakness_tracker') || {},
                openCategories: MasteryManager.getEarnedCategories(unitId, config)
            }).reread.length;
        }
        var missed = NotebookCore.missedQuestions(config, ProgressManager.getActivityProgress(unitId, 'practice-test-mastery')).length;
        var days = typeof QuizCountdown !== 'undefined' ? QuizCountdown.daysUntil(config.unit.quizDate) : null;
        var quizWeek = days !== null && days >= 0 && days <= 7;
        if (!rereads && !missed && !quizWeek) return null;
        var parts = [];
        if (rereads) parts.push(rereads + ' section' + (rereads === 1 ? '' : 's') + ' to reread');
        if (missed) parts.push(missed + ' missed question' + (missed === 1 ? '' : 's') + ' to copy');
        var reason = parts.join(', ');
        if (quizWeek) {
            var when = days === 0 ? 'Quiz today' : days === 1 ? 'Quiz tomorrow' : 'Quiz in ' + days + ' days';
            reason = when + ': ' + (reason || 'check your notebook');
        } else {
            reason = reason.charAt(0).toUpperCase() + reason.slice(1);
        }
        return {
            activityId: 'notebook', nudgeId: 'card-notebook', icon: 'fas fa-book',
            name: 'Get your notebook ready', group: 'tools', reason: reason, quizWeek: quizWeek,
            action: function() { NotebookCompanion.open(); }
        };
    },

    _getWeakTermCount(unitId) {
        var weakData = ProgressManager.load(unitId, 'weakness_tracker');
        if (!weakData || !weakData.terms) return 0;
        var count = 0;
        for (var term in weakData.terms) {
            if (weakData.terms[term] >= 2) count++;
        }
        return count;
    },

    _getTriedActivities(unitId) {
        var tried = {};
        var activities = Object.keys(this.ACTIVITY_INFO);
        for (var i = 0; i < activities.length; i++) {
            var progress = ProgressManager.getActivityProgress(unitId, activities[i]);
            if (progress) tried[activities[i]] = true;
        }
        var ptMastery = ProgressManager.getActivityProgress(unitId, 'practice-test-mastery');
        if (ptMastery && ptMastery.sessions > 0) tried['practice-test'] = true;
        return tried;
    },

    // Missed terms: Flashcards first, because it reviews exactly the terms
    // missed; then Fill in the Blank and Typing Practice.
    _pickRemediationActivity(unitId, triedActivities) {
        var options = ['flashcards', 'fill-in-blank', 'typing-practice'];
        for (var i = 0; i < options.length; i++) {
            var id = options[i];
            if (typeof StudyEngine !== 'undefined' && StudyEngine.activities && !StudyEngine.activities[id]) continue;
            if (typeof MasteryManager !== 'undefined' && typeof StudyEngine !== 'undefined' && StudyEngine.config
                && !MasteryManager.isActivityAccessible(unitId, StudyEngine.config, id)) continue;
            return id;
        }
        return 'flashcards';
    },

    _findFlowGap(unitId, triedActivities, masteredCount, totalVocab) {
        if (masteredCount === 0) return 'flashcards';

        for (var i = 0; i < this.STUDY_FLOW.length; i++) {
            var activity = this.STUDY_FLOW[i];
            if (!triedActivities[activity]) {
                if (typeof MasteryManager !== 'undefined' && typeof StudyEngine !== 'undefined' && StudyEngine.config) {
                    if (!MasteryManager.isActivityAccessible(unitId, StudyEngine.config, activity)) continue;
                }
                return activity;
            }
        }
        return null;
    },

    _getUntriedActivity(unitId, triedActivities, config) {
        var activities = Object.keys(this.ACTIVITY_INFO);
        for (var i = 0; i < activities.length; i++) {
            var id = activities[i];
            if (triedActivities[id]) continue;
            if (typeof MasteryManager !== 'undefined') {
                if (!MasteryManager.isActivityAccessible(unitId, config, id)) continue;
            }
            if (typeof StudyEngine !== 'undefined' && StudyEngine.activities && !StudyEngine.activities[id]) continue;
            return id;
        }
        return null;
    },

    _getStaleActivity(unitId, config) {
        var now = Date.now();
        var threshold = this.STALE_ACTIVITY_DAYS * 24 * 60 * 60 * 1000;
        var activities = Object.keys(this.ACTIVITY_INFO);
        var stalest = null;
        var stalestAge = 0;

        for (var i = 0; i < activities.length; i++) {
            var id = activities[i];
            var lastUsed = ProgressManager.load(unitId, 'lastUsed_' + id);
            if (!lastUsed) continue; // never used — handled by _getUntriedActivity
            var age = now - lastUsed;
            if (age < threshold) continue;
            if (typeof MasteryManager !== 'undefined' && !MasteryManager.isActivityAccessible(unitId, config, id)) continue;
            if (typeof StudyEngine !== 'undefined' && StudyEngine.activities && !StudyEngine.activities[id]) continue;
            if (age > stalestAge) {
                stalest = id;
                stalestAge = age;
            }
        }
        return stalest ? { id: stalest, days: Math.floor(stalestAge / (24 * 60 * 60 * 1000)) } : null;
    },

    _pickUncappedActivity(unitId, excludeId, config) {
        var activities = Object.keys(this.ACTIVITY_INFO);
        for (var i = 0; i < activities.length; i++) {
            var id = activities[i];
            if (id === excludeId) continue;
            if (typeof MasteryManager !== 'undefined' && !MasteryManager.isActivityAccessible(unitId, config, id)) continue;
            if (typeof StudyEngine !== 'undefined' && StudyEngine.activities && !StudyEngine.activities[id]) continue;
            if (typeof ActivityTimer !== 'undefined' && ActivityTimer._isActivityCappedToday(unitId, id)) continue;
            return id;
        }
        return null;
    },

    renderSuggestions(container, config) {
        var existing = document.getElementById('nudge-suggestions');
        if (existing) existing.remove();

        var suggestions = this.getSuggestions(config);
        if (suggestions.length === 0) return;
        var unitId = config.unit.id;
        var self = this;

        var section = document.createElement('div');
        section.id = 'nudge-suggestions';
        section.className = 'nudge-section';

        var title = document.createElement('h2');
        title.className = 'nudge-title';
        title.textContent = 'What to Do Next';
        section.appendChild(title);

        var grid = document.createElement('div');
        grid.className = 'nudge-grid';

        for (var i = 0; i < suggestions.length; i++) {
            var s = suggestions[i];
            var card = document.createElement('button');
            card.className = 'nudge-card';
            card.dataset.group = s.group;
            card.dataset.activity = s.activityId;

            var iconEl = document.createElement('i');
            iconEl.className = s.icon + ' nudge-card-icon';
            card.appendChild(iconEl);

            var textDiv = document.createElement('div');
            textDiv.className = 'nudge-card-text';

            var nameEl = document.createElement('div');
            nameEl.className = 'nudge-card-name';
            nameEl.textContent = s.name;
            textDiv.appendChild(nameEl);

            var reasonEl = document.createElement('div');
            reasonEl.className = 'nudge-card-reason';
            reasonEl.textContent = s.reason;
            textDiv.appendChild(reasonEl);

            card.appendChild(textDiv);

            var arrow = document.createElement('i');
            arrow.className = 'fas fa-chevron-right nudge-card-arrow';
            card.appendChild(arrow);

            (function(suggestion) {
                self.logShown(unitId, suggestion.nudgeId);
                card.addEventListener('click', function() {
                    self.logFollowed(unitId, suggestion.nudgeId);
                    if (suggestion.action) { suggestion.action(); return; }
                    // Open the activity directly. This used to click the group
                    // tab and then look for a button tagged with the activity,
                    // but the only element with that tag was this card, so it
                    // clicked itself every 100 ms and kept throwing the student
                    // back to the group menu.
                    if (typeof StudyEngine !== 'undefined' && StudyEngine.activateActivity) {
                        StudyEngine.activateActivity(suggestion.activityId, suggestion.params || []);
                    }
                });
            })(s);

            grid.appendChild(card);
        }

        section.appendChild(grid);
        // Drawn at the top of the home cards, and redrawn each time Home opens.
        container.insertBefore(section, container.firstChild);
    },

    // ── Leaving an activity: at most one toast ──
    onActivityComplete(activityId, config) {
        if (!config || !config.unit) return;
        var unitId = config.unit.id;
        ProgressManager.save(unitId, 'lastUsed_' + activityId, Date.now());

        var consecutiveCount = this._sessionActivityCounts[activityId] || 0;
        var wasConsecutive = this._lastActivityId === activityId;
        this._lastActivityId = activityId;
        var opened = this._wrongAtOpen;
        this._wrongAtOpen = null;

        if (sessionStorage.getItem('teacher-unlock') === 'true') return;
        if (this._sessionNudgeCount >= this.MAX_NUDGES_PER_SESSION) return;
        var self = this;
        var shown = function(id, text, target) {
            if (self._toast(unitId, id, self._say(text), target)) { self._sessionNudgeCount++; return true; }
            return false;
        };

        // New missed questions: they are on the Notebook Companion list.
        if (this.QUESTION_ACTIVITIES.indexOf(activityId) !== -1 && opened && opened.activity === activityId
            && this._missedCount(unitId) > opened.count && typeof NotebookCompanion !== 'undefined') {
            if (shown('notebook-missed', 'the questions you missed are on your Notebook Companion list. Copy them into your notebook with the right answers.', 'notebook')) return;
        }

        if (wasConsecutive && consecutiveCount >= 2) {
            var other = this._pickDifferentActivity(activityId, unitId, config);
            if (other && this.ACTIVITY_INFO[other]
                && shown('mix-it-up', 'switching activities helps you remember more than repeating one. Try ' + this.ACTIVITY_INFO[other].name + ' next.', other)) return;
        }

        if (this._getWeakTermCount(unitId) > 0) {
            var remediation = this._pickRemediationActivity(unitId, this._getTriedActivities(unitId));
            if (remediation && remediation !== activityId && this.ACTIVITY_INFO[remediation]) {
                var how = remediation === 'flashcards' ? ' goes over exactly those terms.' : ' will help you practice them.';
                if (shown('review-missed', 'you have missed a few terms more than once. ' + this.ACTIVITY_INFO[remediation].name + how, remediation)) return;
            }
        }

        var fcProgress2 = ProgressManager.getActivityProgress(unitId, 'flashcards') || {};
        var ht2 = config.vocabulary && config.vocabulary.some(function(v) { return v.tier; });
        var ml2 = fcProgress2.mastered || [];
        var masteredCount = ht2
            ? ml2.filter(function(t) { return config.vocabulary.some(function(v) { return v.term === t && (!v.tier || v.tier === 'must-know'); }); }).length
            : ml2.length;
        var totalVocab = ht2
            ? config.vocabulary.filter(function(v) { return !v.tier || v.tier === 'must-know'; }).length
            : (config.vocabulary ? config.vocabulary.length : 0);
        var flowNext = this._findFlowGap(unitId, this._getTriedActivities(unitId), masteredCount, totalVocab);
        if (flowNext && flowNext !== activityId && this.ACTIVITY_INFO[flowNext]) {
            if (shown('next-step', 'nice work! Next step in your study plan: ' + this.ACTIVITY_INFO[flowNext].name + '.', flowNext)) return;
        }

        var stale = this._getStaleActivity(unitId, config);
        if (stale && stale.id !== activityId && this.ACTIVITY_INFO[stale.id]) {
            shown('come-back', 'it has been ' + stale.days + ' days since you tried ' + this.ACTIVITY_INFO[stale.id].name + '. Coming back to it after a break helps it stick.', stale.id);
        }
    },

    _pickDifferentActivity(currentId, unitId, config) {
        var all = Object.keys(this.ACTIVITY_INFO);
        for (var i = 0; i < all.length; i++) {
            var id = all[i];
            if (id === currentId) continue;
            if (typeof MasteryManager !== 'undefined' && !MasteryManager.isActivityAccessible(unitId, config, id)) continue;
            if (typeof StudyEngine !== 'undefined' && StudyEngine.activities && !StudyEngine.activities[id]) continue;
            if ((this._sessionActivityCounts[id] || 0) < 2) return id;
        }
        return null;
    }
};
