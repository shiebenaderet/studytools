const Dashboard = {
    supabase: null,
    currentTab: 'overview',

    // ---- Helper: create an icon element ----
    _icon(className) {
        const i = document.createElement('i');
        className.split(' ').forEach(c => i.classList.add(c));
        return i;
    },

    // ---- Helper: create a loading indicator ----
    _loading() {
        const div = document.createElement('div');
        div.className = 'loading';
        div.appendChild(this._icon('fas fa-spinner'));
        const span = document.createElement('span');
        span.textContent = ' Loading...';
        div.appendChild(span);
        return div;
    },

    // ---- Helper: create an empty state ----
    _emptyState(iconClass, message) {
        const div = document.createElement('div');
        div.className = 'empty-state';
        div.appendChild(this._icon(iconClass));
        const p = document.createElement('p');
        p.textContent = message;
        div.appendChild(p);
        return div;
    },

    // ---- Initialization ----

    async init() {
        try {
            this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } catch (err) {
            console.error('Failed to create Supabase client:', err);
            return;
        }

        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                this.showDashboard();
            } else {
                this.showLogin();
            }
        } catch (err) {
            console.error('Session check failed:', err);
            this.showLogin();
        }
    },

    showLogin() {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
    },

    showDashboard() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        this.loadVersion();
        this.loadClasses();
        this.switchTab('overview');
    },

    async loadVersion() {
        try {
            var resp = await fetch('../engine/version.json');
            var data = await resp.json();
            var el = document.getElementById('dashboard-version');
            if (el && data.version) {
                el.textContent = 'v' + data.version;
            }
        } catch (err) {
            // Version file not critical
        }
    },

    // ---- Authentication ----

    async login(email, password) {
        const errorEl = document.getElementById('login-error');
        errorEl.classList.add('hidden');

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                errorEl.textContent = error.message;
                errorEl.classList.remove('hidden');
                return;
            }

            this.showDashboard();
        } catch (err) {
            errorEl.textContent = 'An unexpected error occurred. Please try again.';
            errorEl.classList.remove('hidden');
        }
    },

    async logout() {
        try {
            await this.supabase.auth.signOut();
        } catch (err) {
            console.error('Logout error:', err);
        }
        this.showLogin();
        document.getElementById('login-form').reset();
    },

    // ---- Filters ----

    getFilters() {
        return {
            classId: document.getElementById('filter-class').value || null,
            dateStart: document.getElementById('filter-date-start').value || null,
            dateEnd: document.getElementById('filter-date-end').value || null
        };
    },

    applyFilters() {
        this.switchTab(this.currentTab);
    },

    // ---- Tab Switching ----

    switchTab(tabName) {
        this.currentTab = tabName;

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-content').forEach(el => {
            el.classList.toggle('active', el.id === 'tab-' + tabName);
        });

        const filters = this.getFilters();

        switch (tabName) {
            case 'overview':
                this.loadOverview(filters);
                break;
            case 'students':
                this.loadStudents(filters);
                break;
            case 'units':
                this.loadUnits(filters);
                break;
            case 'classes':
                this.loadClassCodes();
                break;
            case 'scores':
                this.loadScores(filters);
                break;
        }
    },

    // ---- Data Loading ----

    async loadClasses() {
        const select = document.getElementById('filter-class');
        // Clear existing options and re-add the default
        while (select.options.length > 0) {
            select.remove(0);
        }
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'All Classes';
        select.appendChild(defaultOpt);

        try {
            const { data, error } = await this.supabase
                .from('classes')
                .select('id, code, name')
                .order('name');

            if (error) throw error;

            if (data) {
                data.forEach(cls => {
                    const opt = document.createElement('option');
                    opt.value = cls.id;
                    opt.textContent = cls.code + ' - ' + cls.name;
                    select.appendChild(opt);
                });
            }
        } catch (err) {
            console.error('Failed to load classes:', err);
        }
    },

    async loadOverview(filters) {
        const container = document.getElementById('overview-stats');
        container.textContent = '';
        container.appendChild(this._loading());

        try {
            // Total students
            let studentQuery = this.supabase.from('students').select('id', { count: 'exact', head: true });
            if (filters.classId) {
                studentQuery = studentQuery.eq('class_id', filters.classId);
            }
            const { count: totalStudents, error: studentErr } = await studentQuery;
            if (studentErr) throw studentErr;

            // Active this week (students with sessions in last 7 days)
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weekAgoISO = weekAgo.toISOString();

            let activeQuery = this.supabase
                .from('sessions')
                .select('student_id');

            if (filters.dateStart) {
                activeQuery = activeQuery.gte('started_at', filters.dateStart);
            } else {
                activeQuery = activeQuery.gte('started_at', weekAgoISO);
            }
            if (filters.dateEnd) {
                activeQuery = activeQuery.lte('started_at', filters.dateEnd + 'T23:59:59');
            }

            const { data: activeSessions, error: activeErr } = await activeQuery;
            if (activeErr) throw activeErr;

            // Unique active student IDs
            const activeStudentIds = new Set();
            if (activeSessions) {
                activeSessions.forEach(s => activeStudentIds.add(s.student_id));
            }

            // If filtering by class, intersect with class students
            let activeCount = activeStudentIds.size;
            if (filters.classId && activeSessions) {
                const { data: classStudents, error: csErr } = await this.supabase
                    .from('students')
                    .select('id')
                    .eq('class_id', filters.classId);
                if (csErr) throw csErr;
                const classStudentIds = new Set((classStudents || []).map(s => s.id));
                activeCount = [...activeStudentIds].filter(id => classStudentIds.has(id)).length;
            }

            // Total study hours
            let hoursQuery = this.supabase.from('sessions').select('duration_seconds, student_id');
            if (filters.dateStart) {
                hoursQuery = hoursQuery.gte('started_at', filters.dateStart);
            }
            if (filters.dateEnd) {
                hoursQuery = hoursQuery.lte('started_at', filters.dateEnd + 'T23:59:59');
            }

            const { data: hoursSessions, error: hoursErr } = await hoursQuery;
            if (hoursErr) throw hoursErr;

            let sessionSeconds = 0;
            if (hoursSessions) {
                if (filters.classId) {
                    const { data: classStudents } = await this.supabase
                        .from('students')
                        .select('id')
                        .eq('class_id', filters.classId);
                    const classIds = new Set((classStudents || []).map(s => s.id));
                    hoursSessions.forEach(s => {
                        if (classIds.has(s.student_id)) {
                            sessionSeconds += (s.duration_seconds || 0);
                        }
                    });
                } else {
                    hoursSessions.forEach(s => {
                        sessionSeconds += (s.duration_seconds || 0);
                    });
                }
            }

            // Also check progress table studyTime (more reliable source)
            let progressQuery = this.supabase.from('progress')
                .select('student_id, data')
                .eq('activity', 'studyTime');
            const { data: studyTimeRows } = await progressQuery;
            let progressSeconds = 0;
            if (studyTimeRows) {
                if (filters.classId) {
                    const { data: classStudents2 } = await this.supabase
                        .from('students')
                        .select('id')
                        .eq('class_id', filters.classId);
                    const classIds2 = new Set((classStudents2 || []).map(s => s.id));
                    studyTimeRows.forEach(r => {
                        if (classIds2.has(r.student_id) && typeof r.data === 'number') {
                            progressSeconds += Math.round(r.data / 1000);
                        }
                    });
                } else {
                    studyTimeRows.forEach(r => {
                        if (typeof r.data === 'number') {
                            progressSeconds += Math.round(r.data / 1000);
                        }
                    });
                }
            }

            // Use whichever source has more data
            const totalSeconds = Math.max(sessionSeconds, progressSeconds);
            const totalHours = (totalSeconds / 3600).toFixed(1);

            // Average session length
            const sessionCount = hoursSessions ? hoursSessions.length : 0;
            const avgMinutes = sessionCount > 0
                ? Math.round(totalSeconds / sessionCount / 60)
                : 0;

            // Render stat cards
            container.textContent = '';
            const stats = [
                { icon: 'fas fa-users', value: totalStudents || 0, label: 'Total Students' },
                { icon: 'fas fa-bolt', value: activeCount, label: 'Active This Week' },
                { icon: 'fas fa-clock', value: totalHours, label: 'Total Study Hours' },
                { icon: 'fas fa-stopwatch', value: avgMinutes + ' min', label: 'Avg Session Length' }
            ];

            stats.forEach(stat => {
                const card = document.createElement('div');
                card.className = 'stat-card';

                const iconDiv = document.createElement('div');
                iconDiv.className = 'stat-icon';
                iconDiv.appendChild(this._icon(stat.icon));

                const valueDiv = document.createElement('div');
                valueDiv.className = 'stat-value';
                valueDiv.textContent = stat.value;

                const labelDiv = document.createElement('div');
                labelDiv.className = 'stat-label';
                labelDiv.textContent = stat.label;

                card.appendChild(iconDiv);
                card.appendChild(valueDiv);
                card.appendChild(labelDiv);
                container.appendChild(card);
            });

        } catch (err) {
            console.error('Failed to load overview:', err);
            container.textContent = '';
            container.appendChild(
                this._emptyState('fas fa-exclamation-triangle', 'Failed to load overview data. Please try again.')
            );
        }
    },

    async loadStudents(filters) {
        const container = document.getElementById('students-table-container');
        container.textContent = '';
        container.appendChild(this._loading());

        try {
            // Fetch students with class info
            let studentQuery = this.supabase
                .from('students')
                .select('id, name, class_id, classes(code, name)');

            if (filters.classId) {
                studentQuery = studentQuery.eq('class_id', filters.classId);
            }

            const { data: students, error: studentErr } = await studentQuery;
            if (studentErr) throw studentErr;

            if (!students || students.length === 0) {
                container.textContent = '';
                container.appendChild(
                    this._emptyState('fas fa-user-slash', 'No students found.')
                );
                return;
            }

            // Fetch sessions for these students
            const studentIds = students.map(s => s.id);

            let sessionsQuery = this.supabase
                .from('sessions')
                .select('student_id, started_at, duration_seconds')
                .in('student_id', studentIds);

            if (filters.dateStart) {
                sessionsQuery = sessionsQuery.gte('started_at', filters.dateStart);
            }
            if (filters.dateEnd) {
                sessionsQuery = sessionsQuery.lte('started_at', filters.dateEnd + 'T23:59:59');
            }

            const { data: sessions, error: sessErr } = await sessionsQuery;
            if (sessErr) throw sessErr;

            // Fetch progress for vocab mastered and test scores
            const { data: progressData, error: progErr } = await this.supabase
                .from('progress')
                .select('student_id, activity, data')
                .in('student_id', studentIds);
            if (progErr) throw progErr;

            // Aggregate per student
            const sessionMap = {};
            (sessions || []).forEach(s => {
                if (!sessionMap[s.student_id]) {
                    sessionMap[s.student_id] = { totalSeconds: 0, lastActive: null };
                }
                sessionMap[s.student_id].totalSeconds += (s.duration_seconds || 0);
                const started = new Date(s.started_at);
                if (!sessionMap[s.student_id].lastActive || started > sessionMap[s.student_id].lastActive) {
                    sessionMap[s.student_id].lastActive = started;
                }
            });

            const progressMap = {};
            (progressData || []).forEach(p => {
                if (!progressMap[p.student_id]) {
                    progressMap[p.student_id] = { vocabMastered: 0, bestTestScore: null, studyTimeMs: 0 };
                }
                if (p.activity === 'flashcards' && p.data && p.data.mastered) {
                    progressMap[p.student_id].vocabMastered += (Array.isArray(p.data.mastered) ? p.data.mastered.length : 0);
                }
                if (p.activity === 'practice-test' && p.data && typeof p.data.bestScore === 'number') {
                    const current = progressMap[p.student_id].bestTestScore;
                    if (current === null || p.data.bestScore > current) {
                        progressMap[p.student_id].bestTestScore = p.data.bestScore;
                    }
                }
                if (p.activity === 'studyTime' && typeof p.data === 'number') {
                    progressMap[p.student_id].studyTimeMs = p.data;
                }
            });

            // Build enriched student list and sort by last active
            const enriched = students.map(s => {
                const sess = sessionMap[s.id] || { totalSeconds: 0, lastActive: null };
                const prog = progressMap[s.id] || { vocabMastered: 0, bestTestScore: null, studyTimeMs: 0 };
                // Use progress table studyTime (ms) if available, fall back to sessions
                const studyMinutes = prog.studyTimeMs > 0
                    ? Math.round(prog.studyTimeMs / 60000)
                    : Math.round(sess.totalSeconds / 60);
                return {
                    id: s.id,
                    name: s.name,
                    classId: s.class_id,
                    className: s.classes ? s.classes.name : null,
                    classCode: s.classes ? s.classes.code : '-',
                    lastActive: sess.lastActive,
                    studyMinutes: studyMinutes,
                    vocabMastered: prog.vocabMastered,
                    bestTestScore: prog.bestTestScore
                };
            });

            enriched.sort((a, b) => {
                if (!a.lastActive && !b.lastActive) return 0;
                if (!a.lastActive) return 1;
                if (!b.lastActive) return -1;
                return b.lastActive - a.lastActive;
            });

            // Build table
            container.textContent = '';
            const wrapper = document.createElement('div');
            wrapper.className = 'data-table-wrapper';

            const table = document.createElement('table');
            table.className = 'data-table';

            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            ['Name', 'Class', 'Last Active', 'Study Time', 'Vocab Mastered', 'Best Test Score', ''].forEach(text => {
                const th = document.createElement('th');
                th.textContent = text;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            enriched.forEach(student => {
                const tr = document.createElement('tr');

                const tdName = document.createElement('td');
                tdName.textContent = student.name;
                tr.appendChild(tdName);

                const tdClass = document.createElement('td');
                tdClass.textContent = student.classCode;
                tr.appendChild(tdClass);

                const tdActive = document.createElement('td');
                tdActive.textContent = student.lastActive
                    ? student.lastActive.toLocaleDateString()
                    : 'Never';
                tr.appendChild(tdActive);

                const tdTime = document.createElement('td');
                if (student.studyMinutes >= 60) {
                    tdTime.textContent = (student.studyMinutes / 60).toFixed(1) + ' hrs';
                } else {
                    tdTime.textContent = student.studyMinutes + ' min';
                }
                tr.appendChild(tdTime);

                const tdVocab = document.createElement('td');
                tdVocab.textContent = student.vocabMastered;
                tr.appendChild(tdVocab);

                const tdScore = document.createElement('td');
                tdScore.textContent = student.bestTestScore !== null
                    ? student.bestTestScore + '%'
                    : '-';
                tr.appendChild(tdScore);

                const tdEdit = document.createElement('td');
                const editBtn = document.createElement('button');
                editBtn.className = 'btn btn-edit-student';
                editBtn.appendChild(Dashboard._icon('fas fa-pen'));
                editBtn.addEventListener('click', function() {
                    Dashboard.openStudentModal(student);
                });
                tdEdit.appendChild(editBtn);
                tr.appendChild(tdEdit);

                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            wrapper.appendChild(table);
            container.appendChild(wrapper);

        } catch (err) {
            console.error('Failed to load students:', err);
            container.textContent = '';
            container.appendChild(
                this._emptyState('fas fa-exclamation-triangle', 'Failed to load student data. Please try again.')
            );
        }
    },

    async loadClassCodes() {
        var container = document.getElementById('classes-container');
        container.textContent = '';
        container.appendChild(this._loading());

        try {
            var { data: classes, error } = await this.supabase
                .from('classes')
                .select('id, code, name, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;

            container.textContent = '';

            // Create new class form
            var createSection = document.createElement('div');
            createSection.className = 'class-create-section';

            var createTitle = document.createElement('h3');
            createTitle.textContent = 'Create New Class Code';
            createSection.appendChild(createTitle);

            var createForm = document.createElement('div');
            createForm.className = 'class-create-form';

            var nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.placeholder = 'Class name (e.g. Period 3)';
            nameInput.className = 'class-input';
            nameInput.id = 'new-class-name';
            createForm.appendChild(nameInput);

            var codeInput = document.createElement('input');
            codeInput.type = 'text';
            codeInput.placeholder = 'Code (e.g. MRB-P3)';
            codeInput.className = 'class-input';
            codeInput.id = 'new-class-code';
            codeInput.maxLength = 20;
            createForm.appendChild(codeInput);

            var createBtn = document.createElement('button');
            createBtn.className = 'btn btn-primary';
            createBtn.appendChild(this._icon('fas fa-plus'));
            var btnText = document.createElement('span');
            btnText.textContent = ' Create';
            createBtn.appendChild(btnText);
            createBtn.addEventListener('click', function() { Dashboard.createClassCode(); });
            createForm.appendChild(createBtn);

            createSection.appendChild(createForm);

            var createError = document.createElement('div');
            createError.className = 'class-create-error hidden';
            createError.id = 'class-create-error';
            createSection.appendChild(createError);

            container.appendChild(createSection);

            // Existing classes list
            if (!classes || classes.length === 0) {
                container.appendChild(
                    this._emptyState('fas fa-key', 'No class codes yet. Create one above.')
                );
                return;
            }

            var self = this;
            classes.forEach(function(cls) {
                var card = document.createElement('div');
                card.className = 'class-code-card';

                var cardHeader = document.createElement('div');
                cardHeader.className = 'class-code-header';

                var codeEl = document.createElement('span');
                codeEl.className = 'class-code-value';
                codeEl.textContent = cls.code;
                cardHeader.appendChild(codeEl);

                var copyBtn = document.createElement('button');
                copyBtn.className = 'btn btn-copy';
                copyBtn.title = 'Copy code';
                copyBtn.appendChild(self._icon('fas fa-copy'));
                copyBtn.addEventListener('click', function() {
                    navigator.clipboard.writeText(cls.code).then(function() {
                        copyBtn.textContent = '';
                        copyBtn.appendChild(self._icon('fas fa-check'));
                        setTimeout(function() {
                            copyBtn.textContent = '';
                            copyBtn.appendChild(self._icon('fas fa-copy'));
                        }, 1500);
                    });
                });
                cardHeader.appendChild(copyBtn);

                card.appendChild(cardHeader);

                var nameEl = document.createElement('div');
                nameEl.className = 'class-code-name';
                nameEl.textContent = cls.name || 'Unnamed class';
                card.appendChild(nameEl);

                var dateEl = document.createElement('div');
                dateEl.className = 'class-code-date';
                dateEl.textContent = 'Created ' + new Date(cls.created_at).toLocaleDateString();
                card.appendChild(dateEl);

                // Delete button
                var deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-danger-small';
                deleteBtn.appendChild(self._icon('fas fa-trash'));
                var delText = document.createElement('span');
                delText.textContent = ' Delete';
                deleteBtn.appendChild(delText);
                var confirmState = false;
                deleteBtn.addEventListener('click', function() {
                    if (!confirmState) {
                        confirmState = true;
                        deleteBtn.textContent = '';
                        deleteBtn.appendChild(self._icon('fas fa-exclamation-triangle'));
                        var confirmText = document.createElement('span');
                        confirmText.textContent = ' Confirm delete?';
                        deleteBtn.appendChild(confirmText);
                        deleteBtn.classList.add('btn-danger-confirm');
                        setTimeout(function() {
                            confirmState = false;
                            deleteBtn.textContent = '';
                            deleteBtn.classList.remove('btn-danger-confirm');
                            deleteBtn.appendChild(self._icon('fas fa-trash'));
                            var resetText = document.createElement('span');
                            resetText.textContent = ' Delete';
                            deleteBtn.appendChild(resetText);
                        }, 4000);
                    } else {
                        Dashboard.deleteClassCode(cls.id);
                    }
                });
                card.appendChild(deleteBtn);

                container.appendChild(card);
            });

        } catch (err) {
            console.error('Failed to load class codes:', err);
            container.textContent = '';
            container.appendChild(
                this._emptyState('fas fa-exclamation-triangle', 'Failed to load class codes.')
            );
        }
    },

    async createClassCode() {
        var nameInput = document.getElementById('new-class-name');
        var codeInput = document.getElementById('new-class-code');
        var errorEl = document.getElementById('class-create-error');

        var name = (nameInput.value || '').trim();
        var code = (codeInput.value || '').trim().toUpperCase();

        errorEl.classList.add('hidden');

        if (!name || !code) {
            errorEl.textContent = 'Both class name and code are required.';
            errorEl.classList.remove('hidden');
            return;
        }

        if (code.length < 3) {
            errorEl.textContent = 'Code must be at least 3 characters.';
            errorEl.classList.remove('hidden');
            return;
        }

        try {
            var { error } = await this.supabase
                .from('classes')
                .insert({ name: name, code: code });

            if (error) {
                if (error.message && error.message.includes('duplicate')) {
                    errorEl.textContent = 'That code already exists. Try a different one.';
                } else {
                    errorEl.textContent = error.message || 'Failed to create class code.';
                }
                errorEl.classList.remove('hidden');
                return;
            }

            nameInput.value = '';
            codeInput.value = '';
            this.loadClassCodes();
            this.loadClasses(); // refresh filter dropdown
        } catch (err) {
            errorEl.textContent = 'An unexpected error occurred.';
            errorEl.classList.remove('hidden');
        }
    },

    async deleteClassCode(classId) {
        try {
            await this.supabase
                .from('classes')
                .delete()
                .eq('id', classId);

            this.loadClassCodes();
            this.loadClasses();
        } catch (err) {
            console.error('Failed to delete class:', err);
        }
    },

    async loadUnits(filters) {
        var container = document.getElementById('units-chart-container');
        container.textContent = '';
        container.appendChild(this._loading());

        try {
            // Fetch all progress records
            var { data: progressData, error: progErr } = await this.supabase
                .from('progress')
                .select('student_id, unit_id, activity, data');
            if (progErr) throw progErr;

            if (!progressData || progressData.length === 0) {
                container.textContent = '';
                container.appendChild(
                    this._emptyState('fas fa-chart-bar', 'No activity data yet.')
                );
                return;
            }

            // If filtering by class, get valid student IDs
            var validStudentIds = null;
            if (filters.classId) {
                var { data: classStudents, error: csErr } = await this.supabase
                    .from('students')
                    .select('id')
                    .eq('class_id', filters.classId);
                if (csErr) throw csErr;
                validStudentIds = new Set((classStudents || []).map(function(s) { return s.id; }));
            }

            // Group by unit
            var units = {};
            progressData.forEach(function(p) {
                if (validStudentIds && !validStudentIds.has(p.student_id)) return;
                if (!units[p.unit_id]) {
                    units[p.unit_id] = {
                        students: new Set(),
                        activities: {},
                        vocabMastered: 0,
                        testScores: [],
                        flashcardStudents: 0
                    };
                }
                var unit = units[p.unit_id];
                unit.students.add(p.student_id);

                // Count activity usage
                if (!unit.activities[p.activity]) unit.activities[p.activity] = new Set();
                unit.activities[p.activity].add(p.student_id);

                // Vocab mastery
                if (p.activity === 'flashcards' && p.data && p.data.mastered) {
                    unit.vocabMastered += (Array.isArray(p.data.mastered) ? p.data.mastered.length : 0);
                    unit.flashcardStudents++;
                }

                // Test scores
                if (p.activity === 'practice-test' && p.data && typeof p.data.bestScore === 'number') {
                    unit.testScores.push(p.data.bestScore);
                }
            });

            container.textContent = '';

            var unitIds = Object.keys(units).sort();
            if (unitIds.length === 0) {
                container.appendChild(
                    this._emptyState('fas fa-chart-bar', 'No activity data matches the current filters.')
                );
                return;
            }

            unitIds.forEach(function(unitId) {
                var unit = units[unitId];
                var section = document.createElement('div');
                section.className = 'unit-section';

                var heading = document.createElement('h3');
                heading.textContent = unitId.replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                section.appendChild(heading);

                // Summary stats
                var statsRow = document.createElement('div');
                statsRow.className = 'unit-stats-row';

                var studentCount = unit.students.size;
                var avgVocab = unit.flashcardStudents > 0 ? Math.round(unit.vocabMastered / unit.flashcardStudents) : 0;
                var avgTest = unit.testScores.length > 0 ? Math.round(unit.testScores.reduce(function(a, b) { return a + b; }, 0) / unit.testScores.length) : null;
                var activityCount = Object.keys(unit.activities).length;

                var summaryItems = [
                    { icon: 'fas fa-users', value: studentCount, label: 'Students' },
                    { icon: 'fas fa-book', value: avgVocab, label: 'Avg Vocab Mastered' },
                    { icon: 'fas fa-pen', value: avgTest !== null ? avgTest + '%' : '-', label: 'Avg Test Score' },
                    { icon: 'fas fa-puzzle-piece', value: activityCount, label: 'Activities Used' }
                ];

                summaryItems.forEach(function(item) {
                    var stat = document.createElement('div');
                    stat.className = 'unit-stat-mini';
                    var val = document.createElement('div');
                    val.className = 'unit-stat-val';
                    val.textContent = item.value;
                    stat.appendChild(val);
                    var lbl = document.createElement('div');
                    lbl.className = 'unit-stat-lbl';
                    lbl.textContent = item.label;
                    stat.appendChild(lbl);
                    statsRow.appendChild(stat);
                });

                section.appendChild(statsRow);

                // Activity engagement bars
                var sorted = Object.entries(unit.activities)
                    .map(function(pair) { return [pair[0], pair[1].size]; })
                    .sort(function(a, b) { return b[1] - a[1]; });
                var maxStudents = sorted.length > 0 ? sorted[0][1] : 1;

                sorted.forEach(function(pair) {
                    var activity = pair[0], count = pair[1];
                    var row = document.createElement('div');
                    row.className = 'activity-bar-row';

                    var label = document.createElement('div');
                    label.className = 'activity-bar-label';
                    label.textContent = activity.replace(/-/g, ' ');

                    var track = document.createElement('div');
                    track.className = 'activity-bar-track';

                    var fill = document.createElement('div');
                    fill.className = 'activity-bar-fill';
                    fill.style.width = Math.round((count / maxStudents) * 100) + '%';

                    track.appendChild(fill);

                    var countEl = document.createElement('div');
                    countEl.className = 'activity-bar-count';
                    countEl.textContent = count + ' student' + (count !== 1 ? 's' : '');

                    row.appendChild(label);
                    row.appendChild(track);
                    row.appendChild(countEl);
                    section.appendChild(row);
                });

                container.appendChild(section);
            });

        } catch (err) {
            console.error('Failed to load units:', err);
            container.textContent = '';
            container.appendChild(
                Dashboard._emptyState('fas fa-exclamation-triangle', 'Failed to load unit data. Please try again.')
            );
        }
    },

    // ---- Scores / Leaderboard Approval ----

    async loadScores(filters) {
        var container = document.getElementById('scores-container');
        container.textContent = '';
        container.appendChild(this._loading());

        try {
            // Get all leaderboard entries
            var { data: entries, error: lbErr } = await this.supabase
                .from('leaderboard')
                .select('id, student_id, unit_id, score, vocab_mastered, best_test_score, study_time_seconds, map_best_time, map_bonus, approved, updated_at')
                .order('updated_at', { ascending: false });

            if (lbErr) throw lbErr;

            container.textContent = '';

            if (!entries || entries.length === 0) {
                container.appendChild(
                    this._emptyState('fas fa-trophy', 'No leaderboard entries yet. Students will appear here as they study.')
                );
                return;
            }

            // Get student names
            var studentIds = entries.map(function(e) { return e.student_id; });
            var { data: studentData } = await this.supabase
                .from('students')
                .select('id, name, class_id, classes(code, name)')
                .in('id', studentIds);
            var studentMap = {};
            (studentData || []).forEach(function(s) { studentMap[s.id] = s; });

            // Filter by class if selected
            if (filters && filters.classId) {
                entries = entries.filter(function(e) {
                    var student = studentMap[e.student_id];
                    return student && student.class_id === filters.classId;
                });
            }

            // Action bar
            var actions = document.createElement('div');
            actions.className = 'scores-actions';

            var approveAllBtn = document.createElement('button');
            approveAllBtn.className = 'btn btn-primary';
            approveAllBtn.appendChild(this._icon('fas fa-check-double'));
            var approveText = document.createElement('span');
            approveText.textContent = ' Approve All Pending';
            approveAllBtn.appendChild(approveText);
            approveAllBtn.addEventListener('click', async function() {
                var pendingIds = entries.filter(function(e) { return !e.approved; }).map(function(e) { return e.id; });
                if (pendingIds.length > 0) {
                    await Dashboard.supabase
                        .from('leaderboard')
                        .update({ approved: true })
                        .in('id', pendingIds);
                }
                Dashboard.loadScores(Dashboard.getFilters());
            });
            actions.appendChild(approveAllBtn);

            container.appendChild(actions);

            if (entries.length === 0) {
                container.appendChild(
                    this._emptyState('fas fa-filter', 'No scores for this class yet.')
                );
                return;
            }

            var pendingCount = entries.filter(function(e) { return !e.approved; }).length;

            var summary = document.createElement('div');
            summary.className = 'scores-summary';
            summary.textContent = pendingCount + ' pending approval, ' + (entries.length - pendingCount) + ' approved';
            container.appendChild(summary);

            // Build table
            var wrapper = document.createElement('div');
            wrapper.className = 'data-table-wrapper';

            var table = document.createElement('table');
            table.className = 'data-table';

            var thead = document.createElement('thead');
            var headerRow = document.createElement('tr');
            ['Status', 'Name', 'Class', 'Score', 'Vocab', 'Test', 'Study Time', 'Map Time', 'Actions'].forEach(function(text) {
                var th = document.createElement('th');
                th.textContent = text;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            var tbody = document.createElement('tbody');
            var self = this;
            entries.forEach(function(entry) {
                var student = studentMap[entry.student_id] || {};
                var tr = document.createElement('tr');
                if (!entry.approved) tr.classList.add('score-pending');

                // Status
                var tdStatus = document.createElement('td');
                var badge = document.createElement('span');
                badge.className = entry.approved ? 'status-badge status-approved' : 'status-badge status-pending';
                badge.textContent = entry.approved ? 'Approved' : 'Pending';
                tdStatus.appendChild(badge);
                tr.appendChild(tdStatus);

                // Name
                var tdName = document.createElement('td');
                tdName.textContent = student.name || 'Unknown';
                tr.appendChild(tdName);

                // Class
                var tdClass = document.createElement('td');
                tdClass.textContent = student.classes ? (student.classes.name || student.classes.code) : '-';
                tr.appendChild(tdClass);

                // Score
                var tdScore = document.createElement('td');
                tdScore.className = 'score-value';
                tdScore.textContent = entry.score;
                tr.appendChild(tdScore);

                // Vocab
                var tdVocab = document.createElement('td');
                tdVocab.textContent = entry.vocab_mastered;
                tr.appendChild(tdVocab);

                // Test
                var tdTest = document.createElement('td');
                tdTest.textContent = entry.best_test_score !== null ? entry.best_test_score + '%' : '-';
                tr.appendChild(tdTest);

                // Study time
                var tdTime = document.createElement('td');
                var mins = Math.round((entry.study_time_seconds || 0) / 60);
                tdTime.textContent = mins >= 60 ? (mins / 60).toFixed(1) + ' hrs' : mins + ' min';
                tr.appendChild(tdTime);

                // Map time
                var tdMap = document.createElement('td');
                if (entry.map_best_time) {
                    var mm = Math.floor(entry.map_best_time / 60);
                    var ss = entry.map_best_time % 60;
                    tdMap.textContent = mm + ':' + (ss < 10 ? '0' : '') + ss + ' (+' + (entry.map_bonus || 0) + ')';
                } else {
                    tdMap.textContent = '-';
                }
                tr.appendChild(tdMap);

                // Actions
                var tdActions = document.createElement('td');
                tdActions.className = 'score-actions-cell';

                if (!entry.approved) {
                    var approveBtn = document.createElement('button');
                    approveBtn.className = 'btn btn-approve';
                    approveBtn.appendChild(self._icon('fas fa-check'));
                    approveBtn.title = 'Approve';
                    approveBtn.addEventListener('click', async function() {
                        await Dashboard.supabase
                            .from('leaderboard')
                            .update({ approved: true })
                            .eq('id', entry.id);
                        Dashboard.loadScores();
                    });
                    tdActions.appendChild(approveBtn);
                }

                var removeBtn = document.createElement('button');
                removeBtn.className = 'btn btn-remove';
                removeBtn.appendChild(self._icon('fas fa-trash'));
                removeBtn.title = 'Remove';
                var removeConfirm = false;
                removeBtn.addEventListener('click', async function() {
                    if (!removeConfirm) {
                        removeConfirm = true;
                        removeBtn.classList.add('btn-remove-confirm');
                        removeBtn.textContent = '';
                        removeBtn.appendChild(self._icon('fas fa-exclamation-triangle'));
                        setTimeout(function() {
                            removeConfirm = false;
                            removeBtn.classList.remove('btn-remove-confirm');
                            removeBtn.textContent = '';
                            removeBtn.appendChild(self._icon('fas fa-trash'));
                        }, 3000);
                    } else {
                        await Dashboard.supabase
                            .from('leaderboard')
                            .delete()
                            .eq('id', entry.id);
                        Dashboard.loadScores();
                    }
                });
                tdActions.appendChild(removeBtn);

                tr.appendChild(tdActions);
                tbody.appendChild(tr);
            });

            table.appendChild(tbody);
            wrapper.appendChild(table);
            container.appendChild(wrapper);

        } catch (err) {
            console.error('Failed to load scores:', err);
            container.textContent = '';
            container.appendChild(
                this._emptyState('fas fa-exclamation-triangle', 'Failed to load scores.')
            );
        }
    },

    // ---- Student Editing ----

    _allClasses: null,

    async openStudentModal(student) {
        var modal = document.getElementById('student-edit-modal');
        var body = document.getElementById('student-edit-body');
        body.textContent = '';

        // Load classes if not cached
        if (!this._allClasses) {
            var { data } = await this.supabase
                .from('classes')
                .select('id, code, name')
                .order('name');
            this._allClasses = data || [];
        }

        // Name field
        var nameGroup = document.createElement('div');
        nameGroup.className = 'form-group';
        var nameLabel = document.createElement('label');
        nameLabel.textContent = 'Student Name';
        nameGroup.appendChild(nameLabel);
        var nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = student.name;
        nameInput.id = 'edit-student-name';
        nameGroup.appendChild(nameInput);
        body.appendChild(nameGroup);

        // Class field
        var classGroup = document.createElement('div');
        classGroup.className = 'form-group';
        var classLabel = document.createElement('label');
        classLabel.textContent = 'Class';
        classGroup.appendChild(classLabel);
        var classSelect = document.createElement('select');
        classSelect.id = 'edit-student-class';
        var noClassOpt = document.createElement('option');
        noClassOpt.value = '';
        noClassOpt.textContent = 'No class';
        classSelect.appendChild(noClassOpt);
        this._allClasses.forEach(function(cls) {
            var opt = document.createElement('option');
            opt.value = cls.id;
            opt.textContent = cls.code + ' - ' + cls.name;
            if (student.classId === cls.id) opt.selected = true;
            classSelect.appendChild(opt);
        });
        classGroup.appendChild(classSelect);
        body.appendChild(classGroup);

        // Save button
        var saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-primary btn-block';
        saveBtn.appendChild(this._icon('fas fa-save'));
        var saveText = document.createElement('span');
        saveText.textContent = ' Save Changes';
        saveBtn.appendChild(saveText);
        saveBtn.addEventListener('click', function() {
            Dashboard.saveStudent(student.id);
        });
        body.appendChild(saveBtn);

        // Delete student button
        var deleteSection = document.createElement('div');
        deleteSection.className = 'modal-danger-section';
        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger-small';
        deleteBtn.appendChild(this._icon('fas fa-user-times'));
        var delText = document.createElement('span');
        delText.textContent = ' Delete Student';
        deleteBtn.appendChild(delText);
        var delConfirm = false;
        deleteBtn.addEventListener('click', async function() {
            if (!delConfirm) {
                delConfirm = true;
                deleteBtn.classList.add('btn-danger-confirm');
                deleteBtn.textContent = '';
                deleteBtn.appendChild(Dashboard._icon('fas fa-exclamation-triangle'));
                var confirmText = document.createElement('span');
                confirmText.textContent = ' This deletes all their data. Click again to confirm.';
                deleteBtn.appendChild(confirmText);
                setTimeout(function() {
                    delConfirm = false;
                    deleteBtn.classList.remove('btn-danger-confirm');
                    deleteBtn.textContent = '';
                    deleteBtn.appendChild(Dashboard._icon('fas fa-user-times'));
                    var resetText = document.createElement('span');
                    resetText.textContent = ' Delete Student';
                    deleteBtn.appendChild(resetText);
                }, 5000);
            } else {
                await Dashboard.deleteStudent(student.id);
            }
        });
        deleteSection.appendChild(deleteBtn);
        body.appendChild(deleteSection);

        modal.classList.remove('hidden');
    },

    closeStudentModal() {
        document.getElementById('student-edit-modal').classList.add('hidden');
    },

    async saveStudent(studentId) {
        var name = document.getElementById('edit-student-name').value.trim();
        var classId = document.getElementById('edit-student-class').value || null;

        if (!name) return;

        try {
            await this.supabase
                .from('students')
                .update({ name: name, class_id: classId })
                .eq('id', studentId);

            this.closeStudentModal();
            this._allClasses = null; // bust cache
            this.switchTab('students');
        } catch (err) {
            console.error('Failed to save student:', err);
        }
    },

    async deleteStudent(studentId) {
        try {
            // Delete related data first
            await this.supabase.from('progress').delete().eq('student_id', studentId);
            await this.supabase.from('sessions').delete().eq('student_id', studentId);
            await this.supabase.from('leaderboard').delete().eq('student_id', studentId);
            await this.supabase.from('students').delete().eq('id', studentId);

            this.closeStudentModal();
            this.switchTab('students');
        } catch (err) {
            console.error('Failed to delete student:', err);
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => Dashboard.init());
