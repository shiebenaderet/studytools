var NudgeManager = {

    _sessionActivityCounts: {},
    _sessionNudgeCount: 0,
    _lastActivityId: null,
    MAX_NUDGES_PER_SESSION: 3,
    STALE_ACTIVITY_DAYS: 3,

    STUDY_FLOW: ['textbook', 'flashcards', 'fill-in-blank', 'typing-practice', 'practice-test'],

    ACTIVITY_INFO: {
        'textbook':         { icon: 'fas fa-book-open',       name: 'Textbook',          group: 'study' },
        'flashcards':       { icon: 'fas fa-graduation-cap',  name: 'Flashcards',        group: 'study' },
        'fill-in-blank':    { icon: 'fas fa-puzzle-piece',    name: 'Fill in the Blank', group: 'study' },
        'typing-practice':  { icon: 'fas fa-keyboard',        name: 'Typing Practice',   group: 'study' },
        'practice-test':    { icon: 'fas fa-pencil',          name: 'Practice Test',     group: 'practice' },
        'timeline':         { icon: 'fas fa-clock',           name: 'Timeline',          group: 'practice' },
        'wordle':           { icon: 'fas fa-th',              name: 'Wordle',            group: 'games' },
        'hangman':          { icon: 'fas fa-skull-crossbones',name: 'Hangman',           group: 'games' },
        'flip-match':       { icon: 'fas fa-clone',           name: 'Flip Match',        group: 'games' },
        'lightning-round':  { icon: 'fas fa-bolt',            name: 'Lightning Round',   group: 'games' },
        'crossword':        { icon: 'fas fa-border-all',      name: 'Crossword',         group: 'games' },
        'term-catcher':     { icon: 'fas fa-hand-paper',      name: 'Term Catcher',      group: 'games' },
        'tower-defense':    { icon: 'fas fa-chess-rook',      name: 'Tower Defense',     group: 'games' },
        'quiz-race':        { icon: 'fas fa-flag-checkered',  name: 'Quiz Race',         group: 'games' }
    },

    trackMissedTerms(unitId, config, missedTermNames) {
        if (!missedTermNames || missedTermNames.length === 0) return;
        var vocab = config.vocabulary || [];

        var weakData = ProgressManager.load(unitId, 'weakness_tracker') || { terms: {} };
        for (var i = 0; i < missedTermNames.length; i++) {
            var termName = missedTermNames[i];
            for (var j = 0; j < vocab.length; j++) {
                if (vocab[j].term.toLowerCase() === termName.toLowerCase()) {
                    weakData.terms[vocab[j].term] = (weakData.terms[vocab[j].term] || 0) + 1;
                    break;
                }
            }
        }
        ProgressManager.save(unitId, 'weakness_tracker', weakData);

        var fcProgress = ProgressManager.getActivityProgress(unitId, 'flashcards') || {};
        var mastered = fcProgress.mastered ? fcProgress.mastered.slice() : [];
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
                ratings: ratings
            });
        }
    },

    getSuggestions(config) {
        if (!config || !config.unit) return [];
        var unitId = config.unit.id;
        var suggestions = [];

        var weakCount = this._getWeakTermCount(unitId);
        var triedActivities = this._getTriedActivities(unitId);
        var fcProgress = ProgressManager.getActivityProgress(unitId, 'flashcards') || {};
        var masteredCount = fcProgress.mastered ? fcProgress.mastered.length : 0;
        var totalVocab = config.vocabulary ? config.vocabulary.length : 0;

        if (weakCount > 0) {
            var remediation = this._pickRemediationActivity(unitId, triedActivities);
            if (remediation) {
                var info = this.ACTIVITY_INFO[remediation];
                suggestions.push({
                    activityId: remediation,
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
                        icon: info.icon,
                        name: info.name,
                        group: info.group,
                        reason: 'Next step in your study plan'
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

    _pickRemediationActivity(unitId, triedActivities) {
        var options = ['typing-practice', 'fill-in-blank', 'flashcards'];
        for (var i = 0; i < options.length; i++) {
            if (triedActivities[options[i]]) return options[i];
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

    renderSuggestions(container, config) {
        var existing = document.getElementById('nudge-suggestions');
        if (existing) existing.remove();

        var suggestions = this.getSuggestions(config);
        if (suggestions.length === 0) return;

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
                card.addEventListener('click', function() {
                    var navBtn = document.querySelector('.nav-btn[data-group="' + suggestion.group + '"]');
                    if (navBtn) navBtn.click();
                    setTimeout(function() {
                        var actBtn = document.querySelector('[data-activity="' + suggestion.activityId + '"]');
                        if (actBtn) actBtn.click();
                    }, 100);
                });
            })(s);

            grid.appendChild(card);
        }

        section.appendChild(grid);
        container.appendChild(section);
    },

    onActivityComplete(activityId, config) {
        if (!config || !config.unit) return;
        var unitId = config.unit.id;
        ProgressManager.save(unitId, 'lastUsed_' + activityId, Date.now());

        this._sessionActivityCounts[activityId] = (this._sessionActivityCounts[activityId] || 0) + 1;
        var consecutiveCount = this._sessionActivityCounts[activityId];
        var wasConsecutive = this._lastActivityId === activityId;
        this._lastActivityId = activityId;

        if (this._sessionNudgeCount >= this.MAX_NUDGES_PER_SESSION) return;
        var firstName = ProgressManager.getFirstName();
        var prefix = firstName ? firstName + ', ' : '';

        if (wasConsecutive && consecutiveCount >= 2) {
            var suggestion = this._pickDifferentActivity(activityId, unitId, config);
            if (suggestion) {
                var info = this.ACTIVITY_INFO[suggestion];
                if (info) {
                    this._sessionNudgeCount++;
                    StudyUtils.showToast(prefix + 'great practice! Try ' + info.name + ' to mix things up.', 'info', 6000);
                    return;
                }
            }
        }

        var weakCount = this._getWeakTermCount(unitId);
        if (weakCount > 0) {
            var remediation = this._pickRemediationActivity(unitId, this._getTriedActivities(unitId));
            if (remediation && remediation !== activityId) {
                var info = this.ACTIVITY_INFO[remediation];
                if (info) {
                    this._sessionNudgeCount++;
                    StudyUtils.showToast(prefix + 'you missed a few \u2014 ' + info.name + ' will help lock them in.', 'info', 6000);
                    return;
                }
            }
        }

        var fcProgress = ProgressManager.getActivityProgress(unitId, 'flashcards') || {};
        var masteredCount = fcProgress.mastered ? fcProgress.mastered.length : 0;
        var totalVocab = config.vocabulary ? config.vocabulary.length : 0;
        var flowNext = this._findFlowGap(unitId, this._getTriedActivities(unitId), masteredCount, totalVocab);
        if (flowNext && flowNext !== activityId) {
            var info = this.ACTIVITY_INFO[flowNext];
            if (info) {
                this._sessionNudgeCount++;
                StudyUtils.showToast(prefix + 'nice work! Ready to try ' + info.name + '?', 'info', 6000);
                return;
            }
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
