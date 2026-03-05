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
        this.loadClasses();
        this.switchTab('overview');
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

            let totalSeconds = 0;
            if (hoursSessions) {
                if (filters.classId) {
                    const { data: classStudents } = await this.supabase
                        .from('students')
                        .select('id')
                        .eq('class_id', filters.classId);
                    const classIds = new Set((classStudents || []).map(s => s.id));
                    hoursSessions.forEach(s => {
                        if (classIds.has(s.student_id)) {
                            totalSeconds += (s.duration_seconds || 0);
                        }
                    });
                } else {
                    hoursSessions.forEach(s => {
                        totalSeconds += (s.duration_seconds || 0);
                    });
                }
            }
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
                    progressMap[p.student_id] = { vocabMastered: 0, bestTestScore: null };
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
            });

            // Build enriched student list and sort by last active
            const enriched = students.map(s => {
                const sess = sessionMap[s.id] || { totalSeconds: 0, lastActive: null };
                const prog = progressMap[s.id] || { vocabMastered: 0, bestTestScore: null };
                return {
                    name: s.name,
                    classCode: s.classes ? s.classes.code : '-',
                    lastActive: sess.lastActive,
                    studyMinutes: Math.round(sess.totalSeconds / 60),
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
            ['Name', 'Class', 'Last Active', 'Study Time', 'Vocab Mastered', 'Best Test Score'].forEach(text => {
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

    async loadUnits(filters) {
        const container = document.getElementById('units-chart-container');
        container.textContent = '';
        container.appendChild(this._loading());

        try {
            // Fetch progress records grouped by unit and activity
            let query = this.supabase
                .from('progress')
                .select('unit_id, activity, student_id');

            const { data: progressData, error: progErr } = await query;
            if (progErr) throw progErr;

            if (!progressData || progressData.length === 0) {
                container.textContent = '';
                container.appendChild(
                    this._emptyState('fas fa-chart-bar', 'No activity data yet.')
                );
                return;
            }

            // If filtering by class, get student IDs for that class
            let validStudentIds = null;
            if (filters.classId) {
                const { data: classStudents, error: csErr } = await this.supabase
                    .from('students')
                    .select('id')
                    .eq('class_id', filters.classId);
                if (csErr) throw csErr;
                validStudentIds = new Set((classStudents || []).map(s => s.id));
            }

            // Group by unit_id -> activity -> count
            const units = {};
            progressData.forEach(p => {
                if (validStudentIds && !validStudentIds.has(p.student_id)) return;

                if (!units[p.unit_id]) {
                    units[p.unit_id] = {};
                }
                if (!units[p.unit_id][p.activity]) {
                    units[p.unit_id][p.activity] = 0;
                }
                units[p.unit_id][p.activity]++;
            });

            // Find max count across all for scaling bars
            let maxCount = 0;
            Object.values(units).forEach(activities => {
                Object.values(activities).forEach(count => {
                    if (count > maxCount) maxCount = count;
                });
            });
            if (maxCount === 0) maxCount = 1;

            // Render
            container.textContent = '';

            const unitIds = Object.keys(units).sort();
            if (unitIds.length === 0) {
                container.appendChild(
                    this._emptyState('fas fa-chart-bar', 'No activity data matches the current filters.')
                );
                return;
            }

            unitIds.forEach(unitId => {
                const section = document.createElement('div');
                section.className = 'unit-section';

                const heading = document.createElement('h3');
                heading.textContent = unitId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                section.appendChild(heading);

                const activities = units[unitId];
                const sorted = Object.entries(activities).sort((a, b) => b[1] - a[1]);

                sorted.forEach(([activity, count]) => {
                    const row = document.createElement('div');
                    row.className = 'activity-bar-row';

                    const label = document.createElement('div');
                    label.className = 'activity-bar-label';
                    label.textContent = activity.replace(/-/g, ' ');

                    const track = document.createElement('div');
                    track.className = 'activity-bar-track';

                    const fill = document.createElement('div');
                    fill.className = 'activity-bar-fill';
                    fill.style.width = Math.round((count / maxCount) * 100) + '%';

                    track.appendChild(fill);

                    const countEl = document.createElement('div');
                    countEl.className = 'activity-bar-count';
                    countEl.textContent = count;

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
                this._emptyState('fas fa-exclamation-triangle', 'Failed to load unit data. Please try again.')
            );
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => Dashboard.init());
