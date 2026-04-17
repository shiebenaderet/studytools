const ProgressManager = {
    prefix: 'studytool_',
    studentInfo: null,
    dirty: {},
    supabase: null,
    studentId: null,
    syncTimer: null,
    sessionId: null,
    _sessionStartedAt: null,

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
        // Auto-submit to leaderboard on every save
        if (typeof LeaderboardManager !== 'undefined') {
            LeaderboardManager.submitScore();
        }
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
        var learnStreak = this.load(unitId, 'learn-mode-streak') || { currentStreak: 0 };
        const vocabProgress = this.getActivityProgress(unitId, 'flashcards') || {};
        const hasTiers = config.vocabulary && config.vocabulary.some(v => v.tier);
        const masteredList = vocabProgress.mastered || [];
        const masteredCount = hasTiers
            ? masteredList.filter(t => config.vocabulary.some(v => v.term === t && (!v.tier || v.tier === 'must-know'))).length
            : masteredList.length;
        const totalVocab = hasTiers
            ? config.vocabulary.filter(v => !v.tier || v.tier === 'must-know').length
            : (config.vocabulary ? config.vocabulary.length : 0);
        const practiceMastery = this.getActivityProgress(unitId, 'practice-test-mastery') || {};
        const practiceCount = (practiceMastery.mastered || []).length;
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
                bar.appendChild(fill);
                box.appendChild(bar);

                const progLabel = document.createElement('div');
                progLabel.className = 'progress-label';
                const progText = document.createElement('span');
                progText.className = 'progress-label-text';
                progText.textContent = value;
                progLabel.appendChild(progText);
                const progPct = document.createElement('span');
                progPct.className = 'progress-label-pct';
                progPct.textContent = pct + '%';
                progLabel.appendChild(progPct);
                box.appendChild(progLabel);
            }

            return box;
        };

        grid.appendChild(createStatBox('Study Time', StudyUtils.formatStudyTime(studyTime), false));
        grid.appendChild(createStatBox('Vocabulary Mastered', `${masteredCount}/${totalVocab}`, true, vocabPct));
        grid.appendChild(createStatBox('Questions Mastered', `${practiceCount}/${totalQuestions}`, true, practicePct));
        grid.appendChild(createStatBox('Current Streak', `${streak.current} days`, false));
            if (learnStreak.currentStreak > 0) {
                var multiplier = learnStreak.currentStreak >= 3 ? '2x' : learnStreak.currentStreak >= 2 ? '1.75x' : '1.5x';
                grid.appendChild(createStatBox('Learn Streak', learnStreak.currentStreak + ' day' + (learnStreak.currentStreak !== 1 ? 's' : '') + ' (' + multiplier + ')', false));
            }

        statsContainer.appendChild(grid);

        // Login prompt visibility — show when not synced to Supabase
        const loginPrompt = document.getElementById('login-prompt');
        if (loginPrompt) {
            if (!this.studentId) {
                loginPrompt.classList.remove('hidden');
            } else {
                loginPrompt.classList.add('hidden');
            }
        }
    },

    // --- Supabase sync ---

    markDirty(unitId, key) {
        this.dirty[`${unitId}:${key}`] = Date.now();
    },

    initSupabase() {
        if (typeof SUPABASE_URL === 'undefined' || SUPABASE_URL === 'YOUR_SUPABASE_URL') return;
        if (typeof supabase === 'undefined') return;
        this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    },

    async syncToSupabase() {
        if (!this.supabase || !this.studentId) return;
        try {
            const dirtyKeys = Object.keys(this.dirty);
            for (const compositeKey of dirtyKeys) {
                const [unitId, key] = compositeKey.split(':');
                const data = this.load(unitId, key);
                if (data === null) continue;
                const { error } = await this.supabase
                    .from('progress')
                    .upsert({
                        student_id: this.studentId,
                        unit_id: unitId,
                        activity: key,
                        data: data,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'student_id,unit_id,activity' });
                if (!error) {
                    delete this.dirty[compositeKey];
                }
            }
        } catch (err) {
            console.error('Supabase sync error:', err);
        }
    },

    // Merge remote and local activity data, keeping the best of both
    mergeActivityData(activity, local, remote) {
        if (!local) return remote;
        if (!remote) return local;

        // For flashcards: union mastered arrays, merge ratings keeping latest
        if (activity === 'activity_flashcards') {
            var localMastered = local.mastered || [];
            var remoteMastered = remote.mastered || [];
            var mergedMastered = [...new Set([...localMastered, ...remoteMastered])];

            var mergedRatings = { ...(remote.ratings || {}), ...(local.ratings || {}) };

            return {
                ...remote,
                ...local,
                mastered: mergedMastered,
                ratings: mergedRatings,
                updatedAt: Math.max(local.updatedAt || 0, remote.updatedAt || 0)
            };
        }

        // For practice-test-mastery: union mastered arrays, keep higher sessions
        if (activity === 'activity_practice-test-mastery') {
            var localMastered = local.mastered || [];
            var remoteMastered = remote.mastered || [];
            var mergedMastered = [...new Set([...localMastered, ...remoteMastered])];
            var localWrong = local.wrong || [];
            var remoteWrong = remote.wrong || [];
            // Wrong list: union, then remove anything now in mastered
            var mergedWrong = [...new Set([...localWrong, ...remoteWrong])].filter(function(q) {
                return mergedMastered.indexOf(q) === -1;
            });
            return {
                mastered: mergedMastered,
                wrong: mergedWrong,
                sessions: Math.max(local.sessions || 0, remote.sessions || 0),
                updatedAt: Math.max(local.updatedAt || 0, remote.updatedAt || 0)
            };
        }

        // For practice-test: keep the higher bestScore
        if (activity === 'activity_practice-test') {
            var localBest = typeof local.bestScore === 'number' ? local.bestScore : 0;
            var remoteBest = typeof remote.bestScore === 'number' ? remote.bestScore : 0;
            return {
                ...remote,
                ...local,
                bestScore: Math.max(localBest, remoteBest),
                updatedAt: Math.max(local.updatedAt || 0, remote.updatedAt || 0)
            };
        }

        // For map-quiz: keep the better bestScore and bestTime
        if (activity === 'activity_map-quiz') {
            return {
                ...remote,
                ...local,
                bestScore: Math.max(local.bestScore || 0, remote.bestScore || 0),
                bestTime: (local.bestTime && remote.bestTime)
                    ? Math.min(local.bestTime, remote.bestTime)
                    : local.bestTime || remote.bestTime,
                updatedAt: Math.max(local.updatedAt || 0, remote.updatedAt || 0)
            };
        }

        // Default: newer wins (original behavior)
        var remoteTime = remote.updatedAt || 0;
        var localTime = local.updatedAt || 0;
        return remoteTime > localTime ? remote : local;
    },

    async syncFromSupabase() {
        if (!this.supabase || !this.studentId) return;
        try {
            const { data: rows, error } = await this.supabase
                .from('progress')
                .select('*')
                .eq('student_id', this.studentId);
            if (error || !rows) return;
            for (const row of rows) {
                const localData = this.load(row.unit_id, row.activity);
                const merged = this.mergeActivityData(row.activity, localData, row.data);
                if (merged !== localData) {
                    localStorage.setItem(this.getKey(row.unit_id, row.activity), JSON.stringify(merged));
                    // Mark dirty so the merged result syncs back to Supabase
                    this.dirty[`${row.unit_id}:${row.activity}`] = Date.now();
                }
            }
        } catch (err) {
            console.error('Supabase fetch error:', err);
        }
    },

    startSyncLoop() {
        if (this.syncTimer) clearInterval(this.syncTimer);
        this.syncTimer = setInterval(() => {
            this.syncToSupabase();
            // Also sync study time to leaderboard periodically
            if (typeof LeaderboardManager !== 'undefined') {
                LeaderboardManager.submitScore();
            }
        }, 30000);
    },

    async startSession() {
        if (!this.supabase || !this.studentId) return;
        try {
            const unitId = (typeof StudyEngine !== 'undefined' && StudyEngine.config && StudyEngine.config.unit)
                ? StudyEngine.config.unit.id
                : 'unknown';
            const { data, error } = await this.supabase
                .from('sessions')
                .insert({
                    student_id: this.studentId,
                    unit_id: unitId
                })
                .select('id')
                .single();
            if (!error && data) {
                this.sessionId = data.id;
                this._sessionStartedAt = Date.now();
            }
        } catch (err) {
            console.error('Session start error:', err);
        }
    },

    async endSession() {
        if (!this.supabase || !this.sessionId) return;
        try {
            const activitiesUsed = Object.keys(this.dirty).map(k => k.split(':')[1]);
            const uniqueActivities = [...new Set(activitiesUsed)];
            const sessionRow = await this.supabase
                .from('sessions')
                .select('started_at')
                .eq('id', this.sessionId)
                .single();
            let durationSeconds = 0;
            if (sessionRow.data && sessionRow.data.started_at) {
                durationSeconds = Math.round((Date.now() - new Date(sessionRow.data.started_at).getTime()) / 1000);
            }
            await this.supabase
                .from('sessions')
                .update({
                    duration_seconds: durationSeconds,
                    activities_used: uniqueActivities
                })
                .eq('id', this.sessionId);
        } catch (err) {
            console.error('Session end error:', err);
        }
    },

    // --- Helper ---

    getFirstName() {
        if (!this.studentInfo || !this.studentInfo.name) return null;
        if (this.studentInfo.isGuest) return null;
        return this.studentInfo.name.trim().split(/\s+/)[0];
    },

    // --- Welcome Screen ---

    showWelcomeScreen() {
        var self = this;
        var selectedCode = null;

        // Overlay
        var overlay = document.createElement('div');
        overlay.className = 'welcome-overlay';

        // Card
        var card = document.createElement('div');
        card.className = 'welcome-card';

        // Title
        var title = document.createElement('h1');
        title.textContent = 'Welcome! \uD83D\uDC4B';
        card.appendChild(title);

        // Subtitle
        var subtitle = document.createElement('p');
        subtitle.className = 'welcome-subtitle';
        subtitle.textContent = 'Let\u2019s get you set up so your progress is saved.';
        card.appendChild(subtitle);

        // Name label
        var nameLabel = document.createElement('label');
        nameLabel.setAttribute('for', 'welcome-name');
        nameLabel.textContent = 'What\u2019s your name?';
        card.appendChild(nameLabel);

        // Name input
        var nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'welcome-name';
        nameInput.className = 'welcome-name-input';
        nameInput.placeholder = 'First name only';
        nameInput.autocomplete = 'given-name';
        nameInput.maxLength = 20;
        card.appendChild(nameInput);

        // Period label
        var periodLabel = document.createElement('label');
        periodLabel.textContent = 'Which period are you in?';
        card.appendChild(periodLabel);

        // Period buttons
        var periodContainer = document.createElement('div');
        periodContainer.className = 'welcome-period-buttons';

        var periods = [
            { label: 'Period 1', code: 'period1' },
            { label: 'Period 2', code: 'period2' },
            { label: 'Period 4', code: 'period4' },
            { label: 'Period 5', code: 'period5' }
        ];

        var periodButtons = [];

        periods.forEach(function(p) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'welcome-period-btn';
            btn.textContent = p.label;
            btn.addEventListener('click', function() {
                selectedCode = p.code;
                periodButtons.forEach(function(b) { b.classList.remove('selected'); });
                btn.classList.add('selected');
                updateGoBtn();
            });
            periodButtons.push(btn);
            periodContainer.appendChild(btn);
        });

        card.appendChild(periodContainer);

        // Go button
        var goBtn = document.createElement('button');
        goBtn.type = 'button';
        goBtn.className = 'welcome-go-btn';
        goBtn.textContent = 'Let\u2019s Go! \u2192';
        goBtn.disabled = true;
        card.appendChild(goBtn);

        // Guest mode link
        var guestLink = document.createElement('button');
        guestLink.type = 'button';
        guestLink.className = 'welcome-guest-link';
        guestLink.textContent = 'Just browsing? Continue as guest';
        card.appendChild(guestLink);

        guestLink.addEventListener('click', function() {
            self.studentInfo = { name: 'Guest', classCode: 'guest', isGuest: true };
            localStorage.setItem(self.prefix + 'studentInfo', JSON.stringify(self.studentInfo));
            overlay.classList.add('fade-out');
            setTimeout(function() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                if (StudyEngine.config) {
                    StudyEngine.renderHeader();
                    StudyEngine.renderHomeStats();
                }
            }, 400);
        });

        function updateGoBtn() {
            var hasName = nameInput.value.trim().length > 0;
            goBtn.disabled = !(hasName && selectedCode);
        }

        nameInput.addEventListener('input', updateGoBtn);

        goBtn.addEventListener('click', function() {
            var name = nameInput.value.trim().split(/\s+/)[0]; // First name only
            if (!name || !selectedCode) return;
            goBtn.disabled = true;
            goBtn.textContent = 'Setting up...';

            // Store info and run login logic
            self.studentInfo = { name: name, classCode: selectedCode };
            localStorage.setItem(self.prefix + 'studentInfo', JSON.stringify(self.studentInfo));

            // Supabase registration (mirrors login() logic)
            var afterLogin = function() {
                // Redirect first-time students to How to Study page
                if (!localStorage.getItem('how-to-study-seen') && typeof StudyEngine !== 'undefined' && StudyEngine.config) {
                    StudyEngine.redirectToHowToStudy();
                    return;
                }
                // Fade out
                overlay.classList.add('fade-out');
                setTimeout(function() {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    // Re-render header and stats with name
                    if (StudyEngine.config) {
                        StudyEngine.renderHeader();
                        StudyEngine.renderHomeStats();
                    }
                }, 400);
            };

            if (self.supabase) {
                (async function() {
                    try {
                        var classResult = await self.supabase
                            .from('classes')
                            .select('id')
                            .ilike('code', selectedCode)
                            .limit(1);
                        if (classResult.error || !classResult.data || classResult.data.length === 0) {
                            // Class not found — still proceed with local save
                            afterLogin();
                            return;
                        }
                        var classId = classResult.data[0].id;

                        var studentResult = await self.supabase
                            .from('students')
                            .select('id')
                            .eq('name', name)
                            .eq('class_id', classId)
                            .limit(1);
                        if (studentResult.error) throw studentResult.error;

                        if (studentResult.data && studentResult.data.length > 0) {
                            self.studentId = studentResult.data[0].id;
                        } else {
                            var insertResult = await self.supabase
                                .from('students')
                                .insert({ name: name, class_id: classId })
                                .select('id')
                                .single();
                            if (insertResult.error) throw insertResult.error;
                            self.studentId = insertResult.data.id;
                        }

                        localStorage.setItem(self.prefix + 'studentId', self.studentId);
                        self.startSyncLoop();
                        self.startSession();
                        self.syncToSupabase();
                    } catch (err) {
                        console.error('Welcome screen Supabase error:', err);
                    }
                    afterLogin();
                })();
            } else {
                afterLogin();
            }
        });

        // Allow Enter key to submit
        nameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !goBtn.disabled) {
                goBtn.click();
            }
        });

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        // Focus name input after animation
        setTimeout(function() { nameInput.focus(); }, 400);
    },

    // --- Login ---

    showLoginModal() {
        StudyEngine.showModal(`
            <div class="modal-header">
                <h2>Save Your Progress</h2>
                <button class="close-btn" onclick="StudyEngine.closeModal()">&times;</button>
            </div>
            <p style="color: #4b5563; margin-bottom: 20px;">Enter your name and class code to save progress across devices.</p>
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

        // Supabase registration
        if (this.supabase) {
            try {
                const { data: classRows, error: classError } = await this.supabase
                    .from('classes')
                    .select('id')
                    .ilike('code', code)
                    .limit(1);
                if (classError || !classRows || classRows.length === 0) {
                    StudyUtils.showToast('Invalid class code', 'error');
                    return;
                }
                const classId = classRows[0].id;

                const { data: existingStudents, error: studentError } = await this.supabase
                    .from('students')
                    .select('id')
                    .eq('name', name)
                    .eq('class_id', classId)
                    .limit(1);
                if (studentError) throw studentError;

                if (existingStudents && existingStudents.length > 0) {
                    this.studentId = existingStudents[0].id;
                } else {
                    const { data: newStudent, error: insertError } = await this.supabase
                        .from('students')
                        .insert({ name, class_id: classId })
                        .select('id')
                        .single();
                    if (insertError) throw insertError;
                    this.studentId = newStudent.id;
                }

                localStorage.setItem(`${this.prefix}studentId`, this.studentId);
                this.startSyncLoop();
                this.startSession();
                this.syncToSupabase();
            } catch (err) {
                console.error('Supabase login error:', err);
            }
        }

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
        const storedId = localStorage.getItem(`${this.prefix}studentId`);
        if (storedId) {
            this.studentId = storedId;
            this.initSupabase();
            if (this.supabase) {
                // Await remote sync before starting the periodic sync loop
                // to prevent stale remote data from overwriting local progress
                this.syncFromSupabase().then(() => {
                    this.startSyncLoop();
                    if (typeof LeaderboardManager !== 'undefined') {
                        LeaderboardManager.submitScore();
                    }
                });
                this.startSession();
            }
        }
    },

    showEditProfile() {
        var self = this;
        var currentName = (this.studentInfo && this.studentInfo.name) || '';
        var currentCode = (this.studentInfo && this.studentInfo.classCode) || '';
        var selectedCode = currentCode;

        var overlay = document.createElement('div');
        overlay.className = 'welcome-overlay';

        var card = document.createElement('div');
        card.className = 'welcome-card';

        var title = document.createElement('h1');
        title.textContent = 'Edit Profile';
        card.appendChild(title);

        var subtitle = document.createElement('p');
        subtitle.className = 'welcome-subtitle';
        subtitle.textContent = 'Fix your name or switch your period.';
        card.appendChild(subtitle);

        // Name
        var nameLabel = document.createElement('label');
        nameLabel.setAttribute('for', 'edit-profile-name');
        nameLabel.textContent = 'Your name';
        card.appendChild(nameLabel);

        var nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'edit-profile-name';
        nameInput.className = 'welcome-name-input';
        nameInput.placeholder = 'First name';
        nameInput.value = currentName;
        card.appendChild(nameInput);

        // Period
        var periodLabel = document.createElement('label');
        periodLabel.textContent = 'Your period';
        card.appendChild(periodLabel);

        var periodContainer = document.createElement('div');
        periodContainer.className = 'welcome-period-buttons';

        var periods = [
            { label: 'Period 1', code: 'period1' },
            { label: 'Period 2', code: 'period2' },
            { label: 'Period 4', code: 'period4' },
            { label: 'Period 5', code: 'period5' }
        ];

        var periodButtons = [];
        periods.forEach(function(p) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'welcome-period-btn';
            if (p.code === currentCode) btn.classList.add('selected');
            btn.textContent = p.label;
            btn.addEventListener('click', function() {
                selectedCode = p.code;
                periodButtons.forEach(function(b) { b.classList.remove('selected'); });
                btn.classList.add('selected');
            });
            periodButtons.push(btn);
            periodContainer.appendChild(btn);
        });
        card.appendChild(periodContainer);

        // Button row
        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:10px;margin-top:16px;';

        var cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'welcome-go-btn';
        cancelBtn.style.cssText = 'flex:1;background:var(--bg-elevated);color:var(--text-primary);border:1px solid var(--border-card);';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', function() {
            overlay.classList.add('fade-out');
            setTimeout(function() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 400);
        });
        btnRow.appendChild(cancelBtn);

        var saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'welcome-go-btn';
        saveBtn.style.flex = '1';
        saveBtn.textContent = 'Save Changes';
        saveBtn.addEventListener('click', function() {
            var newName = nameInput.value.trim();
            if (!newName || !selectedCode) return;

            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            var oldName = currentName;
            var oldCode = currentCode;

            self.studentInfo = { name: newName, classCode: selectedCode };
            localStorage.setItem(self.prefix + 'studentInfo', JSON.stringify(self.studentInfo));

            // Update Supabase if name or class changed
            var updateSupabase = function() {
                overlay.classList.add('fade-out');
                setTimeout(function() {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    if (StudyEngine.config) {
                        StudyEngine.renderHeader();
                        StudyEngine.renderHomeStats();
                    }
                    StudyUtils.showToast('Profile updated!', 'success');
                }, 400);
            };

            if (self.supabase && self.studentId && (newName !== oldName || selectedCode !== oldCode)) {
                (async function() {
                    try {
                        // Update name in students table
                        if (newName !== oldName) {
                            await self.supabase
                                .from('students')
                                .update({ name: newName })
                                .eq('id', self.studentId);
                        }

                        // If period changed, look up new class and update
                        if (selectedCode !== oldCode) {
                            var classResult = await self.supabase
                                .from('classes')
                                .select('id')
                                .ilike('code', selectedCode)
                                .limit(1);
                            if (classResult.data && classResult.data.length > 0) {
                                await self.supabase
                                    .from('students')
                                    .update({ class_id: classResult.data[0].id })
                                    .eq('id', self.studentId);
                            }
                        }
                    } catch (err) {
                        console.error('Profile update error:', err);
                    }
                    updateSupabase();
                })();
            } else {
                updateSupabase();
            }
        });
        btnRow.appendChild(saveBtn);

        card.appendChild(btnRow);

        // Allow Enter to save
        nameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') saveBtn.click();
        });

        // Reset progress section
        var resetSection = document.createElement('div');
        resetSection.style.cssText = 'margin-top:20px;padding-top:16px;border-top:1px solid var(--border-subtle);text-align:center;';

        var resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'welcome-go-btn';
        resetBtn.style.cssText = 'background:transparent;color:var(--text-muted);border:1px solid var(--border-card);font-size:0.85em;padding:8px 16px;';
        var resetIcon = document.createElement('i');
        resetIcon.className = 'fas fa-redo';
        resetIcon.style.marginRight = '6px';
        resetBtn.appendChild(resetIcon);
        resetBtn.appendChild(document.createTextNode('Reset My Progress'));
        resetBtn.addEventListener('click', function() {
            if (resetBtn.dataset.confirmed) {
                self._resetProgress();
                overlay.classList.add('fade-out');
                setTimeout(function() {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    StudyUtils.showToast('Progress has been reset. Start fresh!', 'success');
                    if (StudyEngine.config) {
                        StudyEngine.renderHomeStats();
                    }
                }, 400);
                return;
            }
            resetBtn.dataset.confirmed = '1';
            resetBtn.style.cssText = 'background:#ef4444;color:#fff;border:1px solid #ef4444;font-size:0.85em;padding:8px 16px;';
            resetBtn.textContent = '';
            var warnIcon = document.createElement('i');
            warnIcon.className = 'fas fa-exclamation-triangle';
            warnIcon.style.marginRight = '6px';
            resetBtn.appendChild(warnIcon);
            resetBtn.appendChild(document.createTextNode('Are you sure? Click again to confirm'));
            setTimeout(function() {
                if (resetBtn.dataset.confirmed) {
                    delete resetBtn.dataset.confirmed;
                    resetBtn.style.cssText = 'background:transparent;color:var(--text-muted);border:1px solid var(--border-card);font-size:0.85em;padding:8px 16px;';
                    resetBtn.textContent = '';
                    var redoIcon = document.createElement('i');
                    redoIcon.className = 'fas fa-redo';
                    redoIcon.style.marginRight = '6px';
                    resetBtn.appendChild(redoIcon);
                    resetBtn.appendChild(document.createTextNode('Reset My Progress'));
                }
            }, 5000);
        });
        resetSection.appendChild(resetBtn);
        card.appendChild(resetSection);

        overlay.appendChild(card);
        document.body.appendChild(overlay);
        setTimeout(function() { nameInput.focus(); nameInput.select(); }, 400);
    },

    _resetProgress() {
        var unitId = StudyEngine.config ? StudyEngine.config.unit.id : null;
        if (!unitId) return;

        var prefix = this.prefix + unitId + '_';
        var keysToRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(function(k) { localStorage.removeItem(k); });

        localStorage.removeItem('fc-tutorial-seen');

        if (this.supabase && this.studentId) {
            (async () => {
                try {
                    await this.supabase
                        .from('progress')
                        .delete()
                        .eq('student_id', this.studentId)
                        .eq('unit_id', unitId);
                } catch (err) {
                    console.error('Failed to clear cloud progress:', err);
                }
            })();
        }
    }
};

// Load student info immediately
ProgressManager.initSupabase();
ProgressManager.loadStudentInfo();

// Save session and sync on page unload
window.addEventListener('beforeunload', () => {
    // Flush ActivityTimer elapsed time to localStorage before syncing
    if (typeof ActivityTimer !== 'undefined') {
        try { ActivityTimer.stop(); } catch (e) { /* best-effort */ }
    }

    if (!ProgressManager.supabase || !ProgressManager.studentId) return;

    var headers = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
    };

    // End session with keepalive fetch (async endSession won't complete during unload)
    if (ProgressManager.sessionId) {
        try {
            var sessionStart = ProgressManager._sessionStartedAt;
            var durationSeconds = sessionStart ? Math.round((Date.now() - sessionStart) / 1000) : 0;
            var activitiesUsed = Object.keys(ProgressManager.dirty).map(function(k) { return k.split(':')[1]; });
            var uniqueActivities = activitiesUsed.filter(function(v, i, a) { return a.indexOf(v) === i; });
            fetch(SUPABASE_URL + '/rest/v1/sessions?id=eq.' + ProgressManager.sessionId, {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify({
                    duration_seconds: durationSeconds,
                    activities_used: uniqueActivities
                }),
                keepalive: true
            });
        } catch (e) {
            // best-effort
        }
    }

    // Sync dirty progress
    try {
        var dirtyKeys = Object.keys(ProgressManager.dirty);
        for (var i = 0; i < dirtyKeys.length; i++) {
            var compositeKey = dirtyKeys[i];
            var parts = compositeKey.split(':');
            var unitId = parts[0];
            var key = parts[1];
            var data = ProgressManager.load(unitId, key);
            if (data === null) continue;
            fetch(SUPABASE_URL + '/rest/v1/progress', {
                method: 'POST',
                headers: Object.assign({}, headers, { 'Prefer': 'resolution=merge-duplicates' }),
                body: JSON.stringify({
                    student_id: ProgressManager.studentId,
                    unit_id: unitId,
                    activity: key,
                    data: data,
                    updated_at: new Date().toISOString()
                }),
                keepalive: true
            });
        }
    } catch (e) {
        // best-effort
    }

    // Update leaderboard study_time_seconds with keepalive fetch
    try {
        var config = typeof StudyEngine !== 'undefined' && StudyEngine.config;
        if (config) {
            var uid = config.unit.id;
            var studyTime = ProgressManager.load(uid, 'studyTime') || 0;
            var studyTimeSeconds = Math.floor(studyTime / 1000);
            var vocabProgress = ProgressManager.getActivityProgress(uid, 'flashcards') || {};
            var tjHasTiers = config.vocabulary && config.vocabulary.some(function(v) { return v.tier; });
            var tjMasteredList = vocabProgress.mastered || [];
            var vocabMastered = tjHasTiers
                ? tjMasteredList.filter(function(t) { return config.vocabulary.some(function(v) { return v.term === t && (!v.tier || v.tier === 'must-know'); }); }).length
                : tjMasteredList.length;
            var practiceProgress = ProgressManager.getActivityProgress(uid, 'practice-test') || {};
            var bestTestScore = typeof practiceProgress.bestScore === 'number' ? practiceProgress.bestScore : null;
            var mapProgress = ProgressManager.getActivityProgress(uid, 'map-quiz') || {};
            var mapBestTime = (mapProgress.bestScore >= 100 && mapProgress.bestTime) ? Math.max(30, mapProgress.bestTime) : null;
            var mapBonus = mapBestTime ? Math.max(0, 180 - mapBestTime) : 0;
            var score = LeaderboardManager.calculateScore(vocabMastered, bestTestScore, studyTimeSeconds, mapBonus);
            fetch(SUPABASE_URL + '/rest/v1/leaderboard', {
                method: 'POST',
                headers: Object.assign({}, headers, { 'Prefer': 'resolution=merge-duplicates' }),
                body: JSON.stringify({
                    student_id: ProgressManager.studentId,
                    unit_id: uid,
                    score: score,
                    vocab_mastered: vocabMastered,
                    best_test_score: bestTestScore,
                    study_time_seconds: studyTimeSeconds,
                    map_best_time: mapBestTime,
                    map_bonus: mapBonus,
                    updated_at: new Date().toISOString()
                }),
                keepalive: true
            });
        }
    } catch (e) {
        // best-effort
    }
});
