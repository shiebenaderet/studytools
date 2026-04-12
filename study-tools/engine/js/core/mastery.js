const MasteryManager = {

    _textbookCache: {},

    /**
     * Fetches and caches textbook data for a unit. Returns null if no textbook.
     */
    async _loadTextbook(unitId) {
        if (this._textbookCache[unitId] !== undefined) return this._textbookCache[unitId];
        try {
            var resp = await fetch('../units/' + unitId + '/textbook.json');
            if (!resp.ok) { this._textbookCache[unitId] = null; return null; }
            var data = await resp.json();
            this._textbookCache[unitId] = data.textbookContent || data;
            return this._textbookCache[unitId];
        } catch (e) {
            this._textbookCache[unitId] = null;
            return null;
        }
    },

    /**
     * Returns segment info for a textbook chapter matching the given category name.
     */
    getChapterSectionIds(textbookContent, categoryName) {
        if (!textbookContent || !textbookContent.segments) return null;
        for (var i = 0; i < textbookContent.segments.length; i++) {
            var seg = textbookContent.segments[i];
            if (seg.title === categoryName) {
                return { segmentId: seg.id, sectionIds: seg.sections.map(function(s) { return s.id; }) };
            }
        }
        return null;
    },

    /**
     * Returns true if all sections in the category's textbook chapter have been read.
     * Returns true if the unit has no textbook (backwards compat).
     */
    isChapterRead(unitId, textbookContent, categoryName) {
        if (!textbookContent) return true;
        var chapter = this.getChapterSectionIds(textbookContent, categoryName);
        if (!chapter) return true;
        var tbProgress = ProgressManager.getActivityProgress(unitId, 'textbook') || {};
        var sectionsRead = tbProgress.sectionsRead || {};
        return chapter.sectionIds.every(function(secId) {
            return sectionsRead[chapter.segmentId + '/' + secId] === true;
        });
    },

    /**
     * Returns info about the next chapter that needs reading, or null if all read.
     */
    getNextUnreadChapter(unitId, config) {
        var textbook = this._textbookCache[unitId];
        if (!textbook) return null;
        var categories = this.getCategories(config);
        for (var i = 0; i < categories.length; i++) {
            if (!this.isChapterRead(unitId, textbook, categories[i])) {
                var chapter = this.getChapterSectionIds(textbook, categories[i]);
                return chapter ? { category: categories[i], segmentId: chapter.segmentId, index: i + 1 } : null;
            }
            if (!this.isCategoryMastered(unitId, config, categories[i])) break;
        }
        return null;
    },

    /**
     * Builds a map of term -> { segmentId, sectionId } for deep-linking from flashcards.
     */
    buildTermSectionMap(config, textbookContent, readingLevel) {
        var map = {};
        if (!textbookContent || !textbookContent.segments || !config.vocabulary) return map;
        var level = readingLevel || 'standard';
        config.vocabulary.forEach(function(v) {
            var termLower = v.term.toLowerCase();
            for (var si = 0; si < textbookContent.segments.length; si++) {
                var seg = textbookContent.segments[si];
                for (var sci = 0; sci < seg.sections.length; sci++) {
                    var sec = seg.sections[sci];
                    var content = (sec.content && sec.content[level]) || '';
                    if (content.toLowerCase().indexOf(termLower) !== -1) {
                        map[v.term] = { segmentId: seg.id, sectionId: sec.id };
                        return;
                    }
                }
            }
        });
        return map;
    },

    /**
     * Returns ordered list of unique category names from config.vocabulary,
     * preserving first-appearance order.
     */
    getCategories(config) {
        if (!config.vocabulary || !Array.isArray(config.vocabulary)) return [];
        const seen = new Set();
        const categories = [];
        for (const item of config.vocabulary) {
            if (item.category && !seen.has(item.category)) {
                seen.add(item.category);
                categories.push(item.category);
            }
        }
        return categories;
    },

    /**
     * Returns true if all must-know terms in that category are mastered.
     * Falls back to all terms for units without tiers (backwards compat).
     */
    isCategoryMastered(unitId, config, categoryName) {
        if (!config.vocabulary) return false;
        var categoryTerms = config.vocabulary.filter(function(v) {
            return v.category === categoryName && (!v.tier || v.tier === 'must-know');
        });
        if (categoryTerms.length === 0) return false;
        var self = this;
        return categoryTerms.every(function(v) {
            return self.isTermMastered(unitId, config, v.term);
        });
    },

    /**
     * Category unlocks when: its textbook chapter is read AND the previous category is mastered.
     * Category 1 unlocks when its chapter is read (no mastery prerequisite).
     * Falls back to mastery-only gating if no textbook exists.
     */
    getUnlockedCategories(unitId, config) {
        const categories = this.getCategories(config);
        if (categories.length === 0) return [];
        if (sessionStorage.getItem('teacher-unlock') === 'true') return categories.slice();

        var textbook = this._textbookCache[unitId] !== undefined ? this._textbookCache[unitId] : null;
        const unlocked = [];
        for (let i = 0; i < categories.length; i++) {
            var chapterRead = this.isChapterRead(unitId, textbook, categories[i]);
            if (i === 0) {
                if (chapterRead) unlocked.push(categories[i]);
                else break;
            } else {
                if (this.isCategoryMastered(unitId, config, categories[i - 1]) && chapterRead) {
                    unlocked.push(categories[i]);
                } else {
                    break;
                }
            }
        }
        return unlocked;
    },

    /**
     * Returns unlocked vocabulary filtered to must-know tier only.
     * Falls back to all vocab for units without tiers (backwards compat).
     */
    getMustKnowVocabulary(unitId, config) {
        const unlocked = this.getUnlockedVocabulary(unitId, config);
        const hasTiers = unlocked.some(v => v.tier);
        if (!hasTiers) return unlocked;
        return unlocked.filter(v => !v.tier || v.tier === 'must-know');
    },

    /**
     * Returns config.vocabulary filtered to only unlocked categories.
     */
    getUnlockedVocabulary(unitId, config) {
        if (!config.vocabulary) return [];
        const unlocked = this.getUnlockedCategories(unitId, config);
        return config.vocabulary.filter(v => unlocked.includes(v.category));
    },

    /**
     * Returns config[questionsKey] filtered to unlocked categories.
     * Items with topic "Connections" or no topic only show when ALL categories are mastered.
     */
    getUnlockedQuestions(unitId, config, questionsKey) {
        const questions = config[questionsKey];
        if (!questions || !Array.isArray(questions)) return [];
        const unlocked = this.getUnlockedCategories(unitId, config);
        const allCategories = this.getCategories(config);
        const allUnlocked = unlocked.length === allCategories.length;
        return questions.filter(q => {
            if (!q.topic || q.topic === 'Connections') {
                return allUnlocked;
            }
            return unlocked.includes(q.topic);
        });
    },

    /**
     * Returns config.fillInBlankSentences filtered by matching answer (case-insensitive)
     * to unlocked must-know vocabulary terms.
     */
    getUnlockedFillInBlanks(unitId, config) {
        if (!config.fillInBlankSentences) return [];
        const unlockedVocab = this.getMustKnowVocabulary(unitId, config);
        const unlockedTermsLower = unlockedVocab.map(v => v.term.toLowerCase());
        return config.fillInBlankSentences.filter(s => {
            const answer = (s.answer || '').toLowerCase();
            return unlockedTermsLower.includes(answer);
        });
    },

    /**
     * Returns unlock status summary object. Progress counts use must-know terms only.
     */
    getUnlockStatus(unitId, config) {
        const categories = this.getCategories(config);
        const unlockedCategories = this.getUnlockedCategories(unitId, config);
        const hasTiers = config.vocabulary && config.vocabulary.some(v => v.tier);
        const coreVocab = hasTiers
            ? config.vocabulary.filter(v => !v.tier || v.tier === 'must-know')
            : config.vocabulary || [];
        const totalVocab = coreVocab.length;
        const unlockedVocab = this.getUnlockedVocabulary(unitId, config)
            .filter(v => !hasTiers || !v.tier || v.tier === 'must-know').length;
        return {
            categories,
            unlockedCategories,
            totalVocab,
            unlockedVocab,
            allUnlocked: categories.length > 0 && categories.length === unlockedCategories.length && this.isCategoryMastered(unitId, config, categories[categories.length - 1])
        };
    },

    /**
     * Returns the next locked category name, or null if all are unlocked.
     */
    getNextLockedCategory(unitId, config) {
        const categories = this.getCategories(config);
        const unlocked = this.getUnlockedCategories(unitId, config);
        if (unlocked.length >= categories.length) return null;
        return categories[unlocked.length];
    },

    /**
     * Shows a toast nudge about mastery progress.
     */
    showMasteryNudge(config, masteredCategory) {
        const unitId = config.unit ? config.unit.id : null;
        if (!unitId) return;
        const next = this.getNextLockedCategory(unitId, config);
        const firstName = ProgressManager.getFirstName();
        if (next) {
            var nextChapter = this.getNextUnreadChapter(unitId, config);
            const prefix = firstName ? `Nice work, ${firstName}!` : 'Nice!';
            if (nextChapter) {
                StudyUtils.showToast(`${prefix} "${masteredCategory}" mastered! Read the next chapter in the textbook to unlock "${next}" terms.`, 'success');
            } else {
                StudyUtils.showToast(`${prefix} "${masteredCategory}" mastered! Now try "${next}" flashcards to unlock more.`, 'success');
            }
        } else {
            const prefix = firstName ? `Amazing, ${firstName}!` : 'Amazing!';
            StudyUtils.showToast(`${prefix} All categories mastered! Every activity is now fully unlocked!`, 'success');
        }
    },

    /**
     * Records that a student answered a term correctly in an activity.
     * Tracks mastery evidence from multiple sources.
     * A term is mastered when: flashcard Good/Easy (instant),
     * OR correct in 2+ different activities, OR correct 3+ times in same activity.
     */
    recordTermCorrect(unitId, term, activityId) {
        if (!unitId || !term || !activityId) return;
        var data = ProgressManager.load(unitId, 'term-mastery') || {};
        if (!data[term]) {
            data[term] = { sources: [], count: {} };
        }
        // Add activity to sources if not already there
        if (data[term].sources.indexOf(activityId) === -1) {
            data[term].sources.push(activityId);
        }
        // Increment count for this activity
        data[term].count[activityId] = (data[term].count[activityId] || 0) + 1;
        ProgressManager.save(unitId, 'term-mastery', data);
    },

    /**
     * Returns true if a term is mastered via multi-source evidence.
     * Checks: flashcard mastered list, OR 2+ activity sources, OR 3+ times in one activity.
     */
    isTermMastered(unitId, config, term) {
        // Check flashcard mastery first (instant, existing behavior)
        var flashcardProgress = ProgressManager.getActivityProgress(unitId, 'flashcards') || {};
        var mastered = flashcardProgress.mastered || [];
        if (mastered.indexOf(term) !== -1) return true;

        // Check multi-source mastery
        var data = ProgressManager.load(unitId, 'term-mastery') || {};
        var termData = data[term];
        if (!termData) return false;

        // 2+ different activity sources
        if (termData.sources.length >= 2) return true;

        // 3+ times in same activity
        var counts = termData.count || {};
        for (var key in counts) {
            if (counts[key] >= 3) return true;
        }

        return false;
    },

    /**
     * Study activities (flashcards, typing-practice) are always accessible.
     * Games/Practice require at least 1 category mastered.
     */
    isActivityAccessible(unitId, config, activityId) {
        // Teacher unlock bypasses all activity gating
        if (sessionStorage.getItem('teacher-unlock') === 'true') return true;
        const alwaysAccessible = ['flashcards', 'typing-practice', 'map-quiz', 'textbook', 'sift-practice', 'learn-mode'];
        if (alwaysAccessible.includes(activityId)) return true;
        const categories = this.getCategories(config);
        if (categories.length === 0) return true;
        return this.isCategoryMastered(unitId, config, categories[0]);
    },

    /**
     * Returns a lock message indicating what the user needs to master next.
     */
    getLockMessage(unitId, config) {
        const categories = this.getCategories(config);
        if (categories.length === 0) return '';
        // Find the first category that isn't mastered
        for (const cat of categories) {
            if (!this.isCategoryMastered(unitId, config, cat)) {
                return `Learn the "${cat}" terms first \u2014 then this unlocks!`;
            }
        }
        return '';
    }
};
