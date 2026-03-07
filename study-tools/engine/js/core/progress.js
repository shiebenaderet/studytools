const ProgressManager = {
    prefix: 'studytool_',
    studentInfo: null,
    dirty: {},
    supabase: null,
    studentId: null,
    syncTimer: null,
    sessionId: null,

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
        const firstName = this.getFirstName();
        heading.textContent = firstName ? firstName + '\u2019s Progress' : 'Your Progress';
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
        grid.appendChild(createStatBox('Practice Questions', `${practiceCount}/${totalQuestions}`, true, practicePct));
        grid.appendChild(createStatBox('Current Streak', `${streak.current} days`, false));

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
                const remoteTime = new Date(row.updated_at).getTime();
                const localTime = localData && localData.updatedAt ? localData.updatedAt : 0;
                if (remoteTime > localTime) {
                    localStorage.setItem(this.getKey(row.unit_id, row.activity), JSON.stringify(row.data));
                }
            }
        } catch (err) {
            console.error('Supabase fetch error:', err);
        }
    },

    startSyncLoop() {
        if (this.syncTimer) clearInterval(this.syncTimer);
        this.syncTimer = setInterval(() => this.syncToSupabase(), 30000);
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
        nameInput.placeholder = 'First name';
        nameInput.autocomplete = 'given-name';
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

        function updateGoBtn() {
            var hasName = nameInput.value.trim().length > 0;
            goBtn.disabled = !(hasName && selectedCode);
        }

        nameInput.addEventListener('input', updateGoBtn);

        goBtn.addEventListener('click', function() {
            var name = nameInput.value.trim();
            if (!name || !selectedCode) return;
            goBtn.disabled = true;
            goBtn.textContent = 'Setting up...';

            // Store info and run login logic
            self.studentInfo = { name: name, classCode: selectedCode };
            localStorage.setItem(self.prefix + 'studentInfo', JSON.stringify(self.studentInfo));

            // Supabase registration (mirrors login() logic)
            var afterLogin = function() {
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
                this.startSyncLoop();
                this.syncFromSupabase();
            }
        }
    }
};

// Load student info immediately
ProgressManager.initSupabase();
ProgressManager.loadStudentInfo();

// Save session and sync on page unload
window.addEventListener('beforeunload', () => {
    if (ProgressManager.supabase && ProgressManager.sessionId) {
        try {
            ProgressManager.endSession();
        } catch (e) {
            // best-effort
        }
    }
    if (ProgressManager.supabase && ProgressManager.studentId) {
        try {
            const dirtyKeys = Object.keys(ProgressManager.dirty);
            for (const compositeKey of dirtyKeys) {
                const [unitId, key] = compositeKey.split(':');
                const data = ProgressManager.load(unitId, key);
                if (data === null) continue;
                const body = JSON.stringify({
                    student_id: ProgressManager.studentId,
                    unit_id: unitId,
                    activity: key,
                    data: data,
                    updated_at: new Date().toISOString()
                });
                fetch(`${SUPABASE_URL}/rest/v1/progress`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Prefer': 'resolution=merge-duplicates'
                    },
                    body: body,
                    keepalive: true
                });
            }
        } catch (e) {
            // best-effort
        }
    }
});
