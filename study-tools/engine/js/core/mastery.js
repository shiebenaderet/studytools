const MasteryManager = {

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
     * Returns true if ALL vocab terms in that category are in the flashcard mastered list.
     */
    isCategoryMastered(unitId, config, categoryName) {
        if (!config.vocabulary) return false;
        var categoryTerms = config.vocabulary.filter(function(v) { return v.category === categoryName; });
        if (categoryTerms.length === 0) return false;
        var self = this;
        return categoryTerms.every(function(v) {
            return self.isTermMastered(unitId, config, v.term);
        });
    },

    /**
     * Category 1 is always unlocked. Each subsequent category unlocks when the
     * previous one is mastered. Returns array of unlocked category names.
     */
    getUnlockedCategories(unitId, config) {
        const categories = this.getCategories(config);
        if (categories.length === 0) return [];
        // Teacher unlock bypasses mastery gating
        if (sessionStorage.getItem('teacher-unlock') === 'true') return categories.slice();
        const unlocked = [categories[0]];
        for (let i = 1; i < categories.length; i++) {
            if (this.isCategoryMastered(unitId, config, categories[i - 1])) {
                unlocked.push(categories[i]);
            } else {
                break;
            }
        }
        return unlocked;
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
     * to unlocked vocabulary terms.
     */
    getUnlockedFillInBlanks(unitId, config) {
        if (!config.fillInBlankSentences) return [];
        const unlockedVocab = this.getUnlockedVocabulary(unitId, config);
        const unlockedTermsLower = unlockedVocab.map(v => v.term.toLowerCase());
        return config.fillInBlankSentences.filter(s => {
            const answer = (s.answer || '').toLowerCase();
            return unlockedTermsLower.includes(answer);
        });
    },

    /**
     * Returns unlock status summary object.
     */
    getUnlockStatus(unitId, config) {
        const categories = this.getCategories(config);
        const unlockedCategories = this.getUnlockedCategories(unitId, config);
        const totalVocab = config.vocabulary ? config.vocabulary.length : 0;
        const unlockedVocab = this.getUnlockedVocabulary(unitId, config).length;
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
            const prefix = firstName ? `Nice work, ${firstName}!` : 'Nice!';
            StudyUtils.showToast(`${prefix} "${masteredCategory}" mastered! Now try "${next}" flashcards to unlock more.`, 'success');
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
