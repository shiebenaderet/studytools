const ProgressManager = {
    prefix: 'studytool_',
    studentInfo: null,
    dirty: {},

    // --- localStorage tier ---

    getKey(unitId, key) {
        return `${this.prefix}${unitId}_${key}`;
    },

    save(unitId, key, value) {
        localStorage.setItem(this.getKey(unitId, key), JSON.stringify(value));
        this.markDirty(unitId, key);
    },

    load(unitId, key) {
        const stored = localStorage.getItem(this.getKey(unitId, key));
        return stored ? JSON.parse(stored) : null;
    },

    getActivityProgress(unitId, activityId) {
        return this.load(unitId, `activity_${activityId}`);
    },

    saveActivityProgress(unitId, activityId, data) {
        this.save(unitId, `activity_${activityId}`, {
            ...data,
            updatedAt: Date.now()
        });
    },

    // --- Streaks ---

    updateStreak(unitId) {
        const streak = this.load(unitId, 'streak') || { current: 0, lastDate: null };
        const today = new Date().toDateString();
        if (streak.lastDate !== today) {
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            streak.current = (streak.lastDate === yesterday) ? streak.current + 1 : 1;
            streak.lastDate = today;
            this.save(unitId, 'streak', streak);
        }
        return streak;
    },

    // --- Study time ---

    addStudyTime(unitId, ms) {
        const total = (this.load(unitId, 'studyTime') || 0) + ms;
        this.save(unitId, 'studyTime', total);
        return total;
    },

    // --- Badges ---

    getBadges(unitId) {
        return this.load(unitId, 'badges') || [];
    },

    unlockBadge(unitId, badgeId) {
        const badges = this.getBadges(unitId);
        if (!badges.includes(badgeId)) {
            badges.push(badgeId);
            this.save(unitId, 'badges', badges);
        }
    },

    // --- Home stats rendering ---

    renderHomeStats(config) {
        const unitId = config.unit.id;
        const statsContainer = document.getElementById('stats-container');
        if (!statsContainer) return;

        const studyTime = this.load(unitId, 'studyTime') || 0;
        const streak = this.load(unitId, 'streak') || { current: 0 };
        const vocabProgress = this.getActivityProgress(unitId, 'flashcards') || {};
        const masteredCount = vocabProgress.mastered ? vocabProgress.mastered.length : 0;
        const totalVocab = config.vocabulary ? config.vocabulary.length : 0;
        const practiceProgress = this.getActivityProgress(unitId, 'practice-test') || {};
        const practiceCount = practiceProgress.answered ? Object.keys(practiceProgress.answered).length : 0;
        const totalQuestions = config.practiceQuestions ? config.practiceQuestions.length : 0;

        const vocabPct = totalVocab > 0 ? Math.round((masteredCount / totalVocab) * 100) : 0;
        const practicePct = totalQuestions > 0 ? Math.round((practiceCount / totalQuestions) * 100) : 0;

        // Build stats using DOM methods
        statsContainer.textContent = '';

        const heading = document.createElement('h2');
        heading.textContent = 'Your Progress';
        statsContainer.appendChild(heading);

        const grid = document.createElement('div');
        grid.className = 'stats-grid';

        // Helper to create stat boxes
        const createStatBox = (label, value, showProgress, pct) => {
            const box = document.createElement('div');
            box.className = 'stat-box';

            const labelEl = document.createElement('div');
            labelEl.className = 'stat-label';
            labelEl.textContent = label;
            box.appendChild(labelEl);

            const valueEl = document.createElement('div');
            valueEl.className = 'stat-value';
            valueEl.textContent = value;
            box.appendChild(valueEl);

            if (showProgress) {
                const bar = document.createElement('div');
                bar.className = 'progress-bar';
                const fill = document.createElement('div');
                fill.className = 'progress-fill';
                fill.style.width = pct + '%';
                fill.textContent = pct + '%';
                bar.appendChild(fill);
                box.appendChild(bar);
            }

            return box;
        };

        grid.appendChild(createStatBox('Study Time', StudyUtils.formatStudyTime(studyTime), false));
        grid.appendChild(createStatBox('Vocabulary Mastered', `${masteredCount}/${totalVocab}`, true, vocabPct));
        grid.appendChild(createStatBox('Practice Questions', `${practiceCount}/${totalQuestions}`, true, practicePct));
        grid.appendChild(createStatBox('Current Streak', `${streak.current} days`, false));

        statsContainer.appendChild(grid);

        // Login prompt visibility
        const loginPrompt = document.getElementById('login-prompt');
        if (loginPrompt) {
            if (!this.studentInfo) {
                loginPrompt.classList.remove('hidden');
            } else {
                loginPrompt.classList.add('hidden');
            }
        }
    },

    // --- Supabase sync (placeholder) ---

    markDirty(unitId, key) {
        this.dirty[`${unitId}:${key}`] = Date.now();
    },

    // --- Login ---

    showLoginModal() {
        StudyEngine.showModal(`
            <div class="modal-header">
                <h2>Save Your Progress</h2>
                <button class="close-btn" onclick="StudyEngine.closeModal()">&times;</button>
            </div>
            <p style="color: #666; margin-bottom: 20px;">Enter your name and class code to save progress across devices.</p>
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <input type="text" id="student-name" placeholder="Your Name" class="login-input">
                <input type="text" id="class-code" placeholder="Class Code (from your teacher)" class="login-input">
                <button class="nav-button" onclick="ProgressManager.login()" style="width: 100%;">Save &amp; Continue</button>
            </div>
        `);
    },

    async login() {
        const nameInput = document.getElementById('student-name');
        const codeInput = document.getElementById('class-code');
        if (!nameInput || !codeInput) return;

        const name = nameInput.value.trim();
        const code = codeInput.value.trim();
        if (!name || !code) return;

        this.studentInfo = { name, classCode: code };
        localStorage.setItem(`${this.prefix}studentInfo`, JSON.stringify(this.studentInfo));
        StudyEngine.closeModal();

        // Supabase registration will be added later
        if (StudyEngine.config) {
            this.renderHomeStats(StudyEngine.config);
        }
    },

    loadStudentInfo() {
        const stored = localStorage.getItem(`${this.prefix}studentInfo`);
        if (stored) {
            try {
                this.studentInfo = JSON.parse(stored);
            } catch (e) {
                this.studentInfo = null;
            }
        }
    }
};

// Load student info immediately
ProgressManager.loadStudentInfo();
