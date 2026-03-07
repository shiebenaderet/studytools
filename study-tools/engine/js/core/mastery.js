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
        const progress = ProgressManager.getActivityProgress(unitId, 'flashcards') || {};
        const mastered = progress.mastered || [];
        const categoryTerms = config.vocabulary.filter(v => v.category === categoryName);
        if (categoryTerms.length === 0) return false;
        return categoryTerms.every(v => mastered.includes(v.term));
    },

    /**
     * Category 1 is always unlocked. Each subsequent category unlocks when the
     * previous one is mastered. Returns array of unlocked category names.
     */
    getUnlockedCategories(unitId, config) {
        const categories = this.getCategories(config);
        if (categories.length === 0) return [];
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
     * Study activities (flashcards, typing-practice) are always accessible.
     * Games/Practice require at least 1 category mastered.
     */
    isActivityAccessible(unitId, config, activityId) {
        const alwaysAccessible = ['flashcards', 'typing-practice'];
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
