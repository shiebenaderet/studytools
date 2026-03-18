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

    // ---- Helper: build a sortable table ----
    // columns: [{ label, key, getValue(row) }]  — key=null means non-sortable
    // rows: array of data objects
    // renderRow(row): returns a <tr> element
    _sortableTable(columns, rows, renderRow) {
        var wrapper = document.createElement('div');
        wrapper.className = 'data-table-wrapper';
        var table = document.createElement('table');
        table.className = 'data-table';
        var thead = document.createElement('thead');
        var headerRow = document.createElement('tr');
        var tbody = document.createElement('tbody');
        var currentSort = { key: null, asc: true };

        function render() {
            tbody.textContent = '';
            rows.forEach(function(row) { tbody.appendChild(renderRow(row)); });
        }

        function doSort(col) {
            if (currentSort.key === col.key) {
                currentSort.asc = !currentSort.asc;
            } else {
                currentSort.key = col.key;
                currentSort.asc = col.defaultAsc !== undefined ? col.defaultAsc : false;
            }
            rows.sort(function(a, b) {
                var va = col.getValue(a), vb = col.getValue(b);
                if (va == null) va = typeof vb === 'string' ? '' : -Infinity;
                if (vb == null) vb = typeof va === 'string' ? '' : -Infinity;
                var cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
                return currentSort.asc ? cmp : -cmp;
            });
            headerRow.querySelectorAll('th').forEach(function(th) {
                th.classList.remove('sort-asc', 'sort-desc');
            });
            var idx = columns.indexOf(col);
            if (idx >= 0) headerRow.children[idx].classList.add(currentSort.asc ? 'sort-asc' : 'sort-desc');
            render();
        }

        columns.forEach(function(col) {
            var th = document.createElement('th');
            th.textContent = col.label;
            if (col.key) {
                th.style.cursor = 'pointer';
                th.addEventListener('click', function() { doSort(col); });
            }
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);
        render();
        table.appendChild(tbody);
        wrapper.appendChild(table);
        return wrapper;
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
            if (session && this._allowedTeachers.indexOf(session.user.email.toLowerCase()) !== -1) {
                this.showDashboard();
            } else if (session) {
                await this.supabase.auth.signOut();
                this.showLogin();
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
        // Run all init tasks in parallel
        this.loadVersion();
        Promise.all([this.loadClasses(), this.loadUnitFilter()]);
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

    _allowedTeachers: ['benaderets885@edmonds.wednet.edu'],

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

            // Restrict dashboard access to allowed teachers
            if (this._allowedTeachers.indexOf(email.toLowerCase()) === -1) {
                await this.supabase.auth.signOut();
                errorEl.textContent = 'Access denied. Contact the site administrator.';
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
            unitId: document.getElementById('filter-unit').value || null,
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
            case 'vocab':
                this.loadVocabInsights(filters);
                break;
            case 'leaderboard':
                this.loadLeaderboardPreview(filters);
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

    async loadUnitFilter() {
        var select = document.getElementById('filter-unit');
        while (select.options.length > 0) select.remove(0);
        var defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'All Units';
        select.appendChild(defaultOpt);

        try {
            // Only fetch unit_id column with minimal data
            var { data, error } = await this.supabase
                .from('progress')
                .select('unit_id')
                .limit(1000);
            if (error) throw error;
            var seen = {};
            var unitIds = [];
            (data || []).forEach(function(row) {
                if (!seen[row.unit_id]) {
                    seen[row.unit_id] = true;
                    unitIds.push(row.unit_id);
                }
            });
            unitIds.sort();
            unitIds.forEach(function(uid) {
                var opt = document.createElement('option');
                opt.value = uid;
                opt.textContent = uid.replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                select.appendChild(opt);
            });
        } catch (err) {
            console.error('Failed to load unit filter:', err);
        }
    },

    async loadOverview(filters) {
        var container = document.getElementById('overview-stats');
        var lbContainer = document.getElementById('overview-leaderboard');
        var trendContainer = document.getElementById('overview-trend');
        var feedContainer = document.getElementById('overview-feed');
        var classLbContainer = document.getElementById('overview-class-lb');
        container.textContent = '';
        container.appendChild(this._loading());
        if (lbContainer) lbContainer.textContent = '';
        if (trendContainer) trendContainer.textContent = '';
        if (feedContainer) feedContainer.textContent = '';
        if (classLbContainer) classLbContainer.textContent = '';

        try {
            // Build all queries upfront
            var studentQuery = this.supabase.from('students').select('id', { count: 'exact', head: true });
            if (filters.classId) studentQuery = studentQuery.eq('class_id', filters.classId);

            var weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            var activeQuery = this.supabase.from('sessions').select('student_id');
            if (filters.dateStart) {
                activeQuery = activeQuery.gte('started_at', filters.dateStart);
            } else {
                activeQuery = activeQuery.gte('started_at', weekAgo.toISOString());
            }
            if (filters.dateEnd) activeQuery = activeQuery.lte('started_at', filters.dateEnd + 'T23:59:59');

            var hoursQuery = this.supabase.from('sessions').select('duration_seconds, student_id');
            if (filters.dateStart) hoursQuery = hoursQuery.gte('started_at', filters.dateStart);
            if (filters.dateEnd) hoursQuery = hoursQuery.lte('started_at', filters.dateEnd + 'T23:59:59');

            var progressQuery = this.supabase.from('progress').select('student_id, data').eq('activity', 'studyTime');

            var lbQuery = this.supabase.from('leaderboard')
                .select('student_id, score, vocab_mastered, best_test_score, study_time_seconds, map_best_time, map_bonus, approved')
                .order('score', { ascending: false })
                .limit(10);
            if (filters.unitId) lbQuery = lbQuery.eq('unit_id', filters.unitId);

            // Trend query: sessions from the last 7 days
            var trendStart = new Date();
            trendStart.setDate(trendStart.getDate() - 6);
            trendStart.setHours(0, 0, 0, 0);
            var trendQuery = this.supabase.from('sessions')
                .select('student_id, started_at, duration_seconds, activities_used')
                .gte('started_at', trendStart.toISOString())
                .order('started_at', { ascending: false });

            // Class leaderboard: all leaderboard + all students with class info + all classes
            var allLbQuery = this.supabase.from('leaderboard')
                .select('student_id, score, approved')
                .eq('approved', true);
            if (filters.unitId) allLbQuery = allLbQuery.eq('unit_id', filters.unitId);

            // Run ALL queries in parallel
            var [studentRes, activeRes, hoursRes, progressRes, lbRes, classStudentRes, allStudentRes, trendRes, allLbRes, classesRes, allStudentsWithClassRes] = await Promise.all([
                studentQuery,
                activeQuery,
                hoursQuery,
                progressQuery,
                lbQuery,
                filters.classId
                    ? this.supabase.from('students').select('id').eq('class_id', filters.classId)
                    : Promise.resolve({ data: null }),
                this.supabase.from('students').select('id, name'),
                trendQuery,
                allLbQuery,
                this.supabase.from('classes').select('id, code, name').order('name'),
                this.supabase.from('students').select('id, name, class_id')
            ]);

            if (studentRes.error) throw studentRes.error;
            if (activeRes.error) throw activeRes.error;
            if (hoursRes.error) throw hoursRes.error;

            var classIdSet = null;
            if (filters.classId && classStudentRes.data) {
                classIdSet = new Set(classStudentRes.data.map(function(s) { return s.id; }));
            }

            var studentNameMap = {};
            (allStudentRes.data || []).forEach(function(s) { studentNameMap[s.id] = s.name; });

            // Build student->class map
            var studentClassMap = {};
            (allStudentsWithClassRes.data || []).forEach(function(s) {
                studentClassMap[s.id] = s.class_id;
            });

            // Active this week
            var activeStudentIds = new Set();
            (activeRes.data || []).forEach(function(s) { activeStudentIds.add(s.student_id); });
            var activeCount = activeStudentIds.size;
            if (classIdSet) {
                activeCount = 0;
                activeStudentIds.forEach(function(id) { if (classIdSet.has(id)) activeCount++; });
            }

            // Study hours from sessions
            var sessionSeconds = 0;
            (hoursRes.data || []).forEach(function(s) {
                if (!classIdSet || classIdSet.has(s.student_id)) {
                    sessionSeconds += (s.duration_seconds || 0);
                }
            });

            // Study hours from progress table (more reliable)
            var progressSeconds = 0;
            (progressRes.data || []).forEach(function(r) {
                if ((!classIdSet || classIdSet.has(r.student_id)) && typeof r.data === 'number') {
                    progressSeconds += Math.round(r.data / 1000);
                }
            });

            var totalSeconds = Math.max(sessionSeconds, progressSeconds);
            var totalHours = (totalSeconds / 3600).toFixed(1);
            var sessionCount = hoursRes.data ? hoursRes.data.length : 0;
            var avgMinutes = sessionCount > 0 ? Math.round(totalSeconds / sessionCount / 60) : 0;

            // Render stat cards
            container.textContent = '';
            var stats = [
                { icon: 'fas fa-users', value: studentRes.count || 0, label: 'Total Students' },
                { icon: 'fas fa-bolt', value: activeCount, label: 'Active This Week' },
                { icon: 'fas fa-clock', value: totalHours, label: 'Total Study Hours' },
                { icon: 'fas fa-stopwatch', value: avgMinutes + ' min', label: 'Avg Session Length' }
            ];

            var self = this;
            stats.forEach(function(stat) {
                var card = document.createElement('div');
                card.className = 'stat-card';

                var iconDiv = document.createElement('div');
                iconDiv.className = 'stat-icon';
                iconDiv.appendChild(self._icon(stat.icon));

                var valueDiv = document.createElement('div');
                valueDiv.className = 'stat-value';
                valueDiv.textContent = stat.value;

                var labelDiv = document.createElement('div');
                labelDiv.className = 'stat-label';
                labelDiv.textContent = stat.label;

                card.appendChild(iconDiv);
                card.appendChild(valueDiv);
                card.appendChild(labelDiv);
                container.appendChild(card);
            });

            // ---- Render Daily Trend Chart ----
            if (trendContainer && trendRes.data) {
                var trendSessions = trendRes.data;
                if (classIdSet) {
                    trendSessions = trendSessions.filter(function(s) { return classIdSet.has(s.student_id); });
                }

                // Group by day
                var dayCounts = {};
                var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                for (var d = 0; d < 7; d++) {
                    var day = new Date();
                    day.setDate(day.getDate() - (6 - d));
                    var key = day.toISOString().slice(0, 10);
                    dayCounts[key] = { count: 0, label: dayNames[day.getDay()], isToday: d === 6 };
                }
                trendSessions.forEach(function(s) {
                    var dayKey = s.started_at.slice(0, 10);
                    if (dayCounts[dayKey]) dayCounts[dayKey].count++;
                });

                var maxCount = 0;
                var dayKeys = Object.keys(dayCounts);
                dayKeys.forEach(function(k) { if (dayCounts[k].count > maxCount) maxCount = dayCounts[k].count; });

                var heading = document.createElement('h3');
                heading.appendChild(self._icon('fas fa-chart-bar'));
                heading.appendChild(document.createTextNode(' Daily Activity'));
                trendContainer.appendChild(heading);

                dayKeys.forEach(function(k) {
                    var row = document.createElement('div');
                    row.className = 'trend-row';

                    var label = document.createElement('span');
                    label.className = 'trend-label';
                    label.textContent = dayCounts[k].label;

                    var track = document.createElement('div');
                    track.className = 'trend-bar-track';

                    var fill = document.createElement('div');
                    fill.className = 'trend-bar-fill' + (dayCounts[k].isToday ? ' trend-today' : '');
                    var pct = maxCount > 0 ? (dayCounts[k].count / maxCount * 100) : 0;
                    fill.style.width = pct + '%';

                    var count = document.createElement('span');
                    count.className = 'trend-count';
                    count.textContent = dayCounts[k].count;

                    track.appendChild(fill);
                    row.appendChild(label);
                    row.appendChild(track);
                    row.appendChild(count);
                    trendContainer.appendChild(row);
                });
            }

            // ---- Render Recently Active Feed ----
            if (feedContainer && trendRes.data) {
                var now = new Date();
                var dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                var recentSessions = trendRes.data.filter(function(s) {
                    var match = new Date(s.started_at) >= dayAgo;
                    if (classIdSet) match = match && classIdSet.has(s.student_id);
                    return match;
                }).slice(0, 8);

                var heading = document.createElement('h3');
                heading.appendChild(self._icon('fas fa-stream'));
                heading.appendChild(document.createTextNode(' Recently Active'));
                feedContainer.appendChild(heading);

                if (recentSessions.length === 0) {
                    var empty = document.createElement('p');
                    empty.style.cssText = 'color:var(--text-light);font-size:0.875rem;text-align:center;padding:20px 0;';
                    empty.textContent = 'No activity in the last 24 hours';
                    feedContainer.appendChild(empty);
                } else {
                    // Activity name prettifier
                    var activityNames = {
                        flashcards: 'Flashcards', 'practice-test': 'Practice Test',
                        'fill-in-blank': 'Fill in the Blank', 'typing-practice': 'Typing Practice',
                        textbook: 'Textbook', 'source-analysis': 'Source Analysis',
                        'lightning-round': 'Lightning Round', wordle: 'Wordle',
                        hangman: 'Hangman', 'flip-match': 'Flip Match',
                        'term-catcher': 'Term Catcher', 'tower-defense': 'Tower Defense',
                        crossword: 'Crossword', 'quiz-race': 'Quiz Race',
                        'map-quiz': 'Map Quiz', timeline: 'Timeline',
                        'resource-library': 'Resource Library', 'how-to-study': 'How to Study'
                    };

                    recentSessions.forEach(function(s) {
                        var item = document.createElement('div');
                        item.className = 'feed-item';

                        var name = studentNameMap[s.student_id] || 'Unknown';
                        var avatar = document.createElement('div');
                        avatar.className = 'feed-avatar';
                        avatar.textContent = name.charAt(0).toUpperCase();

                        var details = document.createElement('div');
                        details.className = 'feed-details';

                        var nameEl = document.createElement('div');
                        nameEl.className = 'feed-name';
                        nameEl.textContent = name;

                        var actEl = document.createElement('div');
                        actEl.className = 'feed-activity';
                        var activities = s.activities_used || [];
                        var prettyActivities = activities.map(function(a) { return activityNames[a] || a; });
                        actEl.textContent = prettyActivities.length > 0 ? prettyActivities.join(', ') : 'Studying';

                        details.appendChild(nameEl);
                        details.appendChild(actEl);

                        var meta = document.createElement('div');
                        meta.className = 'feed-meta';

                        var durEl = document.createElement('div');
                        durEl.className = 'feed-duration';
                        var durMin = Math.round((s.duration_seconds || 0) / 60);
                        durEl.textContent = durMin > 0 ? durMin + ' min' : '<1 min';

                        var timeEl = document.createElement('div');
                        timeEl.className = 'feed-time';
                        var diffMs = now - new Date(s.started_at);
                        var diffMin = Math.max(0, Math.round(diffMs / 60000));
                        if (diffMin < 2) {
                            timeEl.textContent = 'Just now';
                        } else if (diffMin < 60) {
                            timeEl.textContent = diffMin + 'm ago';
                        } else {
                            var diffHr = Math.round(diffMin / 60);
                            timeEl.textContent = diffHr + 'h ago';
                        }

                        meta.appendChild(durEl);
                        meta.appendChild(timeEl);

                        item.appendChild(avatar);
                        item.appendChild(details);
                        item.appendChild(meta);
                        feedContainer.appendChild(item);
                    });
                }
            }

            // ---- Render Class Leaderboard ----
            if (classLbContainer && classesRes.data && classesRes.data.length > 0 && allLbRes.data) {
                // Build class name map
                var classMap = {};
                classesRes.data.forEach(function(c) { classMap[c.id] = c; });

                // Aggregate scores per class
                var classScores = {};
                allLbRes.data.forEach(function(entry) {
                    var cid = studentClassMap[entry.student_id];
                    if (!cid) return;
                    if (!classScores[cid]) classScores[cid] = { total: 0, count: 0 };
                    classScores[cid].total += (entry.score || 0);
                    classScores[cid].count++;
                });

                // Calculate daily study minutes per class from trend sessions
                var classDailyMinutes = {};
                var todayStr = new Date().toISOString().slice(0, 10);
                (trendRes.data || []).forEach(function(s) {
                    if (s.started_at.slice(0, 10) !== todayStr) return;
                    var cid = studentClassMap[s.student_id];
                    if (!cid) return;
                    if (!classDailyMinutes[cid]) classDailyMinutes[cid] = 0;
                    classDailyMinutes[cid] += Math.round((s.duration_seconds || 0) / 60);
                });

                // Build sorted class list
                var classList = classesRes.data.map(function(c) {
                    var scores = classScores[c.id] || { total: 0, count: 0 };
                    return {
                        id: c.id,
                        name: c.name || c.code,
                        code: c.code,
                        totalScore: scores.total,
                        studentCount: scores.count,
                        avgScore: scores.count > 0 ? Math.round(scores.total / scores.count) : 0,
                        dailyMinutes: classDailyMinutes[c.id] || 0
                    };
                }).filter(function(c) { return c.studentCount > 0; });

                classList.sort(function(a, b) { return b.totalScore - a.totalScore; });

                if (classList.length > 0) {
                    var heading = document.createElement('h3');
                    heading.appendChild(self._icon('fas fa-flag'));
                    heading.appendChild(document.createTextNode(' Class Standings'));
                    classLbContainer.appendChild(heading);

                    var grid = document.createElement('div');
                    grid.className = 'class-lb-grid';

                    classList.forEach(function(cls, idx) {
                        var card = document.createElement('div');
                        card.className = 'class-lb-card';
                        if (idx < 3) card.classList.add('rank-' + (idx + 1));

                        var rank = document.createElement('div');
                        rank.className = 'class-lb-rank';
                        rank.textContent = '#' + (idx + 1);

                        var info = document.createElement('div');
                        info.className = 'class-lb-info';

                        var nameEl = document.createElement('div');
                        nameEl.className = 'class-lb-name';
                        nameEl.textContent = cls.name;

                        var statsEl = document.createElement('div');
                        statsEl.className = 'class-lb-stats';
                        statsEl.textContent = cls.studentCount + ' students \u00B7 avg ' + cls.avgScore + ' pts';

                        info.appendChild(nameEl);
                        info.appendChild(statsEl);

                        var scoreDiv = document.createElement('div');
                        scoreDiv.className = 'class-lb-score';

                        var totalEl = document.createElement('div');
                        totalEl.className = 'class-lb-total';
                        totalEl.textContent = cls.totalScore.toLocaleString();

                        var dailyEl = document.createElement('div');
                        dailyEl.className = 'class-lb-daily';
                        if (cls.dailyMinutes > 0) {
                            var span = document.createElement('span');
                            span.className = 'up';
                            span.textContent = '\u25B2 ' + cls.dailyMinutes + ' min today';
                            dailyEl.appendChild(span);
                        } else {
                            var span = document.createElement('span');
                            span.className = 'flat';
                            span.textContent = '\u2014 no activity today';
                            dailyEl.appendChild(span);
                        }

                        scoreDiv.appendChild(totalEl);
                        scoreDiv.appendChild(dailyEl);

                        card.appendChild(rank);
                        card.appendChild(info);
                        card.appendChild(scoreDiv);
                        grid.appendChild(card);
                    });

                    classLbContainer.appendChild(grid);
                }
            }

            // Render leaderboard replay
            var replayContainer = document.getElementById('overview-replay');
            if (replayContainer) {
                this._renderReplay(replayContainer, filters, studentNameMap, studentClassMap, classesRes.data || []);
            }

            // Render inline leaderboard
            if (lbContainer) {
                var lbEntries = lbRes.data || [];
                if (classIdSet) {
                    lbEntries = lbEntries.filter(function(e) { return classIdSet.has(e.student_id); });
                }

                if (lbEntries.length > 0) {
                    var heading = document.createElement('h3');
                    heading.style.cssText = 'margin:24px 0 12px;color:var(--primary-dark);';
                    heading.textContent = 'Top Students';
                    lbContainer.appendChild(heading);

                    var formula = document.createElement('p');
                    formula.style.cssText = 'color:var(--text-muted);font-size:0.85em;margin-bottom:8px;';
                    formula.textContent = 'Vocab (\u00d710) + Test Score + Study Min + Map Bonus = Total';
                    lbContainer.appendChild(formula);

                    var lbCols = [
                        { label: '#', key: null, getValue: function() { return 0; } },
                        { label: 'Name', key: 'name', defaultAsc: true, getValue: function(r) { return studentNameMap[r.student_id] || ''; } },
                        { label: 'Score', key: 'score', getValue: function(r) { return r.score || 0; } },
                        { label: 'Vocab', key: 'vocab', getValue: function(r) { return r.vocab_mastered || 0; } },
                        { label: 'Test', key: 'test', getValue: function(r) { return r.best_test_score != null ? r.best_test_score : -1; } },
                        { label: 'Study', key: 'study', getValue: function(r) { return r.study_time_seconds || 0; } },
                        { label: 'Map', key: 'map', getValue: function(r) { return r.map_best_time || Infinity; } }
                    ];

                    lbContainer.appendChild(self._sortableTable(lbCols, lbEntries, function(entry) {
                        var tr = document.createElement('tr');
                        var idx = lbEntries.indexOf(entry);
                        if (!entry.approved) tr.style.opacity = '0.5';

                        var tdRank = document.createElement('td');
                        tdRank.style.fontWeight = '700';
                        if (idx < 3) tdRank.style.color = ['#FFD700', '#C0C0C0', '#CD7F32'][idx];
                        tdRank.textContent = idx + 1;
                        tr.appendChild(tdRank);

                        var tdName = document.createElement('td');
                        tdName.textContent = (studentNameMap[entry.student_id] || 'Unknown') + (entry.approved ? '' : ' (pending)');
                        tr.appendChild(tdName);

                        var tdScore = document.createElement('td');
                        tdScore.className = 'score-value';
                        tdScore.textContent = entry.score;
                        tr.appendChild(tdScore);

                        var tdVocab = document.createElement('td');
                        tdVocab.textContent = entry.vocab_mastered;
                        tr.appendChild(tdVocab);

                        var tdTest = document.createElement('td');
                        tdTest.textContent = entry.best_test_score != null ? entry.best_test_score + '%' : '-';
                        tr.appendChild(tdTest);

                        var tdTime = document.createElement('td');
                        var mins = Math.round((entry.study_time_seconds || 0) / 60);
                        tdTime.textContent = mins + ' min';
                        tr.appendChild(tdTime);

                        var tdMap = document.createElement('td');
                        if (entry.map_best_time) {
                            var mm = Math.floor(entry.map_best_time / 60);
                            var ss = entry.map_best_time % 60;
                            tdMap.textContent = mm + ':' + (ss < 10 ? '0' : '') + ss;
                        } else {
                            tdMap.textContent = '-';
                        }
                        tr.appendChild(tdMap);

                        return tr;
                    }));
                }
            }

        } catch (err) {
            console.error('Failed to load overview:', err);
            container.textContent = '';
            container.appendChild(
                this._emptyState('fas fa-exclamation-triangle', 'Failed to load overview data. Please try again.')
            );
        }
    },

    async _renderReplay(container, filters, studentNameMap, studentClassMap, classes) {
        container.textContent = '';
        var self = this;

        // Check if snapshots table has data
        var datesRes = await this.supabase
            .from('leaderboard_snapshots')
            .select('snapshot_date')
            .order('snapshot_date', { ascending: false })
            .limit(100);

        if (datesRes.error || !datesRes.data || datesRes.data.length === 0) return;

        // Get unique dates
        var dateSet = {};
        datesRes.data.forEach(function(r) { dateSet[r.snapshot_date] = true; });
        var availableDates = Object.keys(dateSet).sort();
        if (availableDates.length === 0) return;

        var currentIdx = availableDates.length - 1;

        // Build class name map
        var classNameMap = {};
        classes.forEach(function(c) { classNameMap[c.id] = c.name || c.code; });

        // Header with controls
        var header = document.createElement('div');
        header.className = 'replay-header';

        var heading = document.createElement('h3');
        heading.appendChild(self._icon('fas fa-history'));
        heading.appendChild(document.createTextNode(' Leaderboard Replay'));
        header.appendChild(heading);

        var controls = document.createElement('div');
        controls.className = 'replay-controls';

        var prevBtn = document.createElement('button');
        prevBtn.appendChild(self._icon('fas fa-chevron-left'));
        prevBtn.title = 'Previous day';
        controls.appendChild(prevBtn);

        var dateLabel = document.createElement('span');
        dateLabel.className = 'replay-date-label';
        controls.appendChild(dateLabel);

        var nextBtn = document.createElement('button');
        nextBtn.appendChild(self._icon('fas fa-chevron-right'));
        nextBtn.title = 'Next day';
        controls.appendChild(nextBtn);

        header.appendChild(controls);
        container.appendChild(header);

        var panelsWrap = document.createElement('div');
        panelsWrap.className = 'replay-panels';
        container.appendChild(panelsWrap);

        async function loadDay(idx) {
            currentIdx = idx;
            var date = availableDates[idx];
            var prevDate = idx > 0 ? availableDates[idx - 1] : null;

            // Format date for display
            var d = new Date(date + 'T12:00:00');
            var today = new Date().toISOString().slice(0, 10);
            var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            var label = date === today ? 'Today' : date === yesterday ? 'Yesterday' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dateLabel.textContent = label;

            prevBtn.disabled = idx === 0;
            nextBtn.disabled = idx === availableDates.length - 1;

            // Fetch current day + previous day snapshots in parallel
            var queries = [
                self.supabase.from('leaderboard_snapshots')
                    .select('student_id, score, class_id')
                    .eq('snapshot_date', date)
            ];
            if (filters.unitId) queries[0] = queries[0].eq('unit_id', filters.unitId);

            if (prevDate) {
                var prevQuery = self.supabase.from('leaderboard_snapshots')
                    .select('student_id, score, class_id')
                    .eq('snapshot_date', prevDate);
                if (filters.unitId) prevQuery = prevQuery.eq('unit_id', filters.unitId);
                queries.push(prevQuery);
            }

            var results = await Promise.all(queries);
            var currentData = results[0].data || [];
            var prevData = prevDate && results[1] ? (results[1].data || []) : [];

            // Filter by class if needed
            if (filters.classId) {
                currentData = currentData.filter(function(r) { return r.class_id === filters.classId; });
                prevData = prevData.filter(function(r) { return r.class_id === filters.classId; });
            }

            // Build previous day score maps
            var prevStudentScores = {};
            prevData.forEach(function(r) { prevStudentScores[r.student_id] = r.score; });

            var prevClassTotals = {};
            prevData.forEach(function(r) {
                if (!r.class_id) return;
                if (!prevClassTotals[r.class_id]) prevClassTotals[r.class_id] = 0;
                prevClassTotals[r.class_id] += r.score;
            });

            // Current day: student rankings
            var studentRanks = currentData.slice().sort(function(a, b) { return b.score - a.score; });

            // Current day: class rankings
            var classTotals = {};
            currentData.forEach(function(r) {
                if (!r.class_id) return;
                if (!classTotals[r.class_id]) classTotals[r.class_id] = { total: 0, count: 0 };
                classTotals[r.class_id].total += r.score;
                classTotals[r.class_id].count++;
            });
            var classRanks = Object.keys(classTotals).map(function(cid) {
                return { classId: cid, total: classTotals[cid].total, count: classTotals[cid].count };
            }).sort(function(a, b) { return b.total - a.total; });

            // Build previous class rank order for position change
            var prevClassRanks = Object.keys(prevClassTotals).map(function(cid) {
                return { classId: cid, total: prevClassTotals[cid] };
            }).sort(function(a, b) { return b.total - a.total; });
            var prevClassPositions = {};
            prevClassRanks.forEach(function(c, i) { prevClassPositions[c.classId] = i + 1; });

            // Build previous student rank order
            var prevStudentRanks = prevData.slice().sort(function(a, b) { return b.score - a.score; });
            var prevStudentPositions = {};
            prevStudentRanks.forEach(function(r, i) { prevStudentPositions[r.student_id] = i + 1; });

            // Render panels
            panelsWrap.textContent = '';

            // Class panel
            var classPanel = document.createElement('div');
            classPanel.className = 'replay-panel';
            var classTitle = document.createElement('h4');
            classTitle.appendChild(self._icon('fas fa-flag'));
            classTitle.appendChild(document.createTextNode(' Class Standings'));
            classPanel.appendChild(classTitle);

            if (classRanks.length === 0) {
                var empty = document.createElement('div');
                empty.className = 'replay-empty';
                empty.textContent = 'No data for this day';
                classPanel.appendChild(empty);
            } else {
                classRanks.forEach(function(cls, i) {
                    var row = document.createElement('div');
                    row.className = 'replay-row';

                    var rank = document.createElement('span');
                    rank.className = 'replay-rank';
                    rank.textContent = '#' + (i + 1);

                    var name = document.createElement('span');
                    name.className = 'replay-name';
                    name.textContent = classNameMap[cls.classId] || 'Unknown';

                    var score = document.createElement('span');
                    score.className = 'replay-score';
                    score.textContent = cls.total.toLocaleString();

                    var change = document.createElement('span');
                    change.className = 'replay-change';
                    var prevPos = prevClassPositions[cls.classId];
                    if (prevPos && prevDate) {
                        var diff = prevPos - (i + 1);
                        if (diff > 0) {
                            change.className += ' up';
                            change.textContent = '\u25B2' + diff;
                        } else if (diff < 0) {
                            change.className += ' down';
                            change.textContent = '\u25BC' + Math.abs(diff);
                        } else {
                            change.className += ' flat';
                            change.textContent = '\u2014';
                        }
                    }

                    row.appendChild(rank);
                    row.appendChild(name);
                    row.appendChild(score);
                    row.appendChild(change);
                    classPanel.appendChild(row);
                });
            }
            panelsWrap.appendChild(classPanel);

            // Student panel
            var studentPanel = document.createElement('div');
            studentPanel.className = 'replay-panel';
            var studentTitle = document.createElement('h4');
            studentTitle.appendChild(self._icon('fas fa-trophy'));
            studentTitle.appendChild(document.createTextNode(' Top Students'));
            studentPanel.appendChild(studentTitle);

            var topStudents = studentRanks.slice(0, 10);
            if (topStudents.length === 0) {
                var empty = document.createElement('div');
                empty.className = 'replay-empty';
                empty.textContent = 'No data for this day';
                studentPanel.appendChild(empty);
            } else {
                topStudents.forEach(function(entry, i) {
                    var row = document.createElement('div');
                    row.className = 'replay-row';

                    var rank = document.createElement('span');
                    rank.className = 'replay-rank';
                    rank.textContent = '#' + (i + 1);

                    var name = document.createElement('span');
                    name.className = 'replay-name';
                    name.textContent = studentNameMap[entry.student_id] || 'Unknown';

                    var score = document.createElement('span');
                    score.className = 'replay-score';
                    score.textContent = entry.score;

                    var change = document.createElement('span');
                    change.className = 'replay-change';
                    var prevPos = prevStudentPositions[entry.student_id];
                    if (prevPos && prevDate) {
                        var diff = prevPos - (i + 1);
                        if (diff > 0) {
                            change.className += ' up';
                            change.textContent = '\u25B2' + diff;
                        } else if (diff < 0) {
                            change.className += ' down';
                            change.textContent = '\u25BC' + Math.abs(diff);
                        } else {
                            change.className += ' flat';
                            change.textContent = '\u2014';
                        }
                    }

                    row.appendChild(rank);
                    row.appendChild(name);
                    row.appendChild(score);
                    row.appendChild(change);
                    studentPanel.appendChild(row);
                });
            }
            panelsWrap.appendChild(studentPanel);
        }

        prevBtn.addEventListener('click', function() {
            if (currentIdx > 0) loadDay(currentIdx - 1);
        });
        nextBtn.addEventListener('click', function() {
            if (currentIdx < availableDates.length - 1) loadDay(currentIdx + 1);
        });

        // Load most recent day
        loadDay(currentIdx);
    },

    async loadStudents(filters) {
        var container = document.getElementById('students-table-container');
        container.textContent = '';
        container.appendChild(this._loading());

        try {
            var studentQuery = this.supabase
                .from('students')
                .select('id, name, class_id, classes(code, name)');
            if (filters.classId) studentQuery = studentQuery.eq('class_id', filters.classId);

            var { data: students, error: studentErr } = await studentQuery;
            if (studentErr) throw studentErr;

            if (!students || students.length === 0) {
                container.textContent = '';
                container.appendChild(this._emptyState('fas fa-user-slash', 'No students found.'));
                return;
            }

            var studentIds = students.map(function(s) { return s.id; });

            // Run sessions + progress queries in parallel
            var sessionsQuery = this.supabase
                .from('sessions')
                .select('student_id, started_at, duration_seconds')
                .in('student_id', studentIds);
            if (filters.dateStart) sessionsQuery = sessionsQuery.gte('started_at', filters.dateStart);
            if (filters.dateEnd) sessionsQuery = sessionsQuery.lte('started_at', filters.dateEnd + 'T23:59:59');

            var [sessRes, progRes] = await Promise.all([
                sessionsQuery,
                this.supabase.from('progress').select('student_id, activity, data').in('student_id', studentIds)
            ]);
            if (sessRes.error) throw sessRes.error;
            if (progRes.error) throw progRes.error;

            var sessionMap = {};
            (sessRes.data || []).forEach(function(s) {
                if (!sessionMap[s.student_id]) sessionMap[s.student_id] = { totalSeconds: 0, lastActive: null };
                sessionMap[s.student_id].totalSeconds += (s.duration_seconds || 0);
                var started = new Date(s.started_at);
                if (!sessionMap[s.student_id].lastActive || started > sessionMap[s.student_id].lastActive) {
                    sessionMap[s.student_id].lastActive = started;
                }
            });

            var progressMap = {};
            (progRes.data || []).forEach(function(p) {
                if (!progressMap[p.student_id]) progressMap[p.student_id] = { vocabMastered: 0, bestTestScore: null, studyTimeMs: 0 };
                if (p.activity === 'flashcards' && p.data && p.data.mastered) {
                    progressMap[p.student_id].vocabMastered += (Array.isArray(p.data.mastered) ? p.data.mastered.length : 0);
                }
                if (p.activity === 'practice-test' && p.data && typeof p.data.bestScore === 'number') {
                    var current = progressMap[p.student_id].bestTestScore;
                    if (current === null || p.data.bestScore > current) progressMap[p.student_id].bestTestScore = p.data.bestScore;
                }
                if (p.activity === 'studyTime' && typeof p.data === 'number') {
                    progressMap[p.student_id].studyTimeMs = p.data;
                }
            });

            var enriched = students.map(function(s) {
                var sess = sessionMap[s.id] || { totalSeconds: 0, lastActive: null };
                var prog = progressMap[s.id] || { vocabMastered: 0, bestTestScore: null, studyTimeMs: 0 };
                var studyMinutes = prog.studyTimeMs > 0 ? Math.round(prog.studyTimeMs / 60000) : Math.round(sess.totalSeconds / 60);
                return {
                    id: s.id, name: s.name, classId: s.class_id,
                    className: s.classes ? s.classes.name : null,
                    classCode: s.classes ? s.classes.code : '-',
                    lastActive: sess.lastActive,
                    studyMinutes: studyMinutes,
                    vocabMastered: prog.vocabMastered,
                    bestTestScore: prog.bestTestScore
                };
            });

            enriched.sort(function(a, b) {
                if (!a.lastActive && !b.lastActive) return 0;
                if (!a.lastActive) return 1;
                if (!b.lastActive) return -1;
                return b.lastActive - a.lastActive;
            });

            container.textContent = '';

            var columns = [
                { label: 'Name', key: 'name', defaultAsc: true, getValue: function(r) { return r.name || ''; } },
                { label: 'Class', key: 'class', defaultAsc: true, getValue: function(r) { return r.classCode || ''; } },
                { label: 'Last Active', key: 'lastActive', getValue: function(r) { return r.lastActive ? r.lastActive.getTime() : -Infinity; } },
                { label: 'Study Time', key: 'studyMinutes', getValue: function(r) { return r.studyMinutes; } },
                { label: 'Vocab Mastered', key: 'vocabMastered', getValue: function(r) { return r.vocabMastered; } },
                { label: 'Best Test', key: 'bestTestScore', getValue: function(r) { return r.bestTestScore != null ? r.bestTestScore : -1; } },
                { label: '', key: null, getValue: function() { return 0; } }
            ];

            var tableWrapper = this._sortableTable(columns, enriched, function(student) {
                var tr = document.createElement('tr');

                var tdName = document.createElement('td');
                tdName.textContent = student.name;
                tr.appendChild(tdName);

                var tdClass = document.createElement('td');
                tdClass.textContent = student.classCode;
                tr.appendChild(tdClass);

                var tdActive = document.createElement('td');
                tdActive.textContent = student.lastActive ? student.lastActive.toLocaleDateString() : 'Never';
                tr.appendChild(tdActive);

                var tdTime = document.createElement('td');
                tdTime.textContent = student.studyMinutes >= 60 ? (student.studyMinutes / 60).toFixed(1) + ' hrs' : student.studyMinutes + ' min';
                tr.appendChild(tdTime);

                var tdVocab = document.createElement('td');
                tdVocab.textContent = student.vocabMastered;
                tr.appendChild(tdVocab);

                var tdScore = document.createElement('td');
                tdScore.textContent = student.bestTestScore !== null ? student.bestTestScore + '%' : '-';
                tr.appendChild(tdScore);

                var tdEdit = document.createElement('td');
                var editBtn = document.createElement('button');
                editBtn.className = 'btn btn-edit-student';
                editBtn.appendChild(Dashboard._icon('fas fa-pen'));
                editBtn.addEventListener('click', function() { Dashboard.openStudentModal(student); });
                tdEdit.appendChild(editBtn);
                tr.appendChild(tdEdit);

                return tr;
            });

            container.appendChild(tableWrapper);

        } catch (err) {
            console.error('Failed to load students:', err);
            container.textContent = '';
            container.appendChild(this._emptyState('fas fa-exclamation-triangle', 'Failed to load student data. Please try again.'));
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
            // If filtering by class, get student IDs first so we can filter server-side
            var classStudentIds = null;
            if (filters && filters.classId) {
                var { data: classStudents, error: csErr } = await this.supabase
                    .from('students')
                    .select('id')
                    .eq('class_id', filters.classId);
                if (csErr) throw csErr;
                classStudentIds = (classStudents || []).map(function(s) { return s.id; });
                if (classStudentIds.length === 0) {
                    container.textContent = '';
                    container.appendChild(
                        this._emptyState('fas fa-filter', 'No scores for this class yet.')
                    );
                    return;
                }
            }

            // Build leaderboard query with server-side filters
            var lbQuery = this.supabase
                .from('leaderboard')
                .select('id, student_id, unit_id, score, vocab_mastered, best_test_score, study_time_seconds, map_best_time, map_bonus, approved, updated_at')
                .order('updated_at', { ascending: false });

            if (filters && filters.unitId) {
                lbQuery = lbQuery.eq('unit_id', filters.unitId);
            }
            if (classStudentIds) {
                lbQuery = lbQuery.in('student_id', classStudentIds);
            }

            // Run leaderboard + all students queries in parallel
            var [lbResult, studentResult] = await Promise.all([
                lbQuery,
                this.supabase.from('students').select('id, name, class_id, classes(code, name)')
            ]);

            if (lbResult.error) throw lbResult.error;
            var entries = lbResult.data || [];

            var studentMap = {};
            (studentResult.data || []).forEach(function(s) { studentMap[s.id] = s; });

            container.textContent = '';

            if (entries.length === 0) {
                container.appendChild(
                    this._emptyState('fas fa-trophy', 'No leaderboard entries yet. Students will appear here as they study.')
                );
                return;
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
            var sortableColumns = [
                { label: 'Status', key: 'approved' },
                { label: 'Name', key: 'name' },
                { label: 'Class', key: 'class' },
                { label: 'Score', key: 'score' },
                { label: 'Vocab', key: 'vocab_mastered' },
                { label: 'Test', key: 'best_test_score' },
                { label: 'Study Time', key: 'study_time_seconds' },
                { label: 'Map Time', key: 'map_best_time' },
                { label: 'Actions', key: null }
            ];
            var currentSort = { key: null, asc: true };

            function sortEntries(key) {
                if (currentSort.key === key) {
                    currentSort.asc = !currentSort.asc;
                } else {
                    currentSort.key = key;
                    currentSort.asc = key === 'name' || key === 'class' || key === 'approved';
                }
                entries.sort(function(a, b) {
                    var va, vb;
                    if (key === 'name') {
                        va = (studentMap[a.student_id] || {}).name || '';
                        vb = (studentMap[b.student_id] || {}).name || '';
                    } else if (key === 'class') {
                        var ca = (studentMap[a.student_id] || {}).classes;
                        var cb = (studentMap[b.student_id] || {}).classes;
                        va = ca ? (ca.name || ca.code || '') : '';
                        vb = cb ? (cb.name || cb.code || '') : '';
                    } else {
                        va = a[key]; vb = b[key];
                    }
                    if (va == null) va = key === 'approved' ? false : -Infinity;
                    if (vb == null) vb = key === 'approved' ? false : -Infinity;
                    if (typeof va === 'string') return currentSort.asc ? va.localeCompare(vb) : vb.localeCompare(va);
                    return currentSort.asc ? va - vb : vb - va;
                });
                renderRows();
                // Update header indicators
                headerRow.querySelectorAll('th').forEach(function(th) {
                    th.classList.remove('sort-asc', 'sort-desc');
                });
                var idx = sortableColumns.findIndex(function(c) { return c.key === key; });
                if (idx >= 0) headerRow.children[idx].classList.add(currentSort.asc ? 'sort-asc' : 'sort-desc');
            }

            sortableColumns.forEach(function(col) {
                var th = document.createElement('th');
                th.textContent = col.label;
                if (col.key) {
                    th.style.cursor = 'pointer';
                    th.addEventListener('click', function() { sortEntries(col.key); });
                }
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            var tbody = document.createElement('tbody');
            var self = this;

            function renderRows() {
                tbody.textContent = '';
                entries.forEach(renderRow);
            }

            function renderRow(entry) {
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
                        Dashboard.loadScores(Dashboard.getFilters());
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
                        Dashboard.loadScores(Dashboard.getFilters());
                    }
                });
                tdActions.appendChild(removeBtn);

                tr.appendChild(tdActions);
                tbody.appendChild(tr);
            }

            renderRows();
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

    // ---- Vocab Insights ----

    async loadVocabInsights(filters) {
        var container = document.getElementById('vocab-container');
        container.textContent = '';
        container.appendChild(this._loading());

        try {
            // Get all flashcard progress rows
            var query = this.supabase
                .from('progress')
                .select('student_id, unit_id, data')
                .eq('activity', 'activity_flashcards');

            if (filters && filters.unitId) {
                query = query.eq('unit_id', filters.unitId);
            }

            // Run progress + class filter queries in parallel
            var queries = [query];
            if (filters && filters.classId) {
                queries.push(this.supabase.from('students').select('id').eq('class_id', filters.classId));
            }
            var vocabResults = await Promise.all(queries);

            var classStudentSet = null;
            if (vocabResults[1] && vocabResults[1].data) {
                classStudentSet = new Set(vocabResults[1].data.map(function(s) { return s.id; }));
            }

            var progressRows = vocabResults[0].data;
            var error = vocabResults[0].error;
            if (error) throw error;

            container.textContent = '';

            if (!progressRows || progressRows.length === 0) {
                container.appendChild(
                    this._emptyState('fas fa-brain', 'No flashcard data yet. Students will appear here once they start studying.')
                );
                return;
            }

            // Aggregate ratings per unit per term
            var units = {};
            progressRows.forEach(function(row) {
                if (classStudentSet && !classStudentSet.has(row.student_id)) return;
                var data = row.data || {};
                var ratings = data.ratings || {};
                if (!units[row.unit_id]) units[row.unit_id] = {};
                var unit = units[row.unit_id];
                Object.keys(ratings).forEach(function(term) {
                    if (!unit[term]) unit[term] = { hard: 0, medium: 0, easy: 0, total: 0 };
                    var r = ratings[term];
                    // Flashcards rates: 'again', 'hard', 'good', 'easy'
                    if (r === 'again' || r === 'hard') unit[term].hard++;
                    else if (r === 'good') unit[term].medium++;
                    else if (r === 'easy') unit[term].easy++;
                    unit[term].total++;
                });
            });

            var unitIds = Object.keys(units).sort();

            if (unitIds.length === 0) {
                container.appendChild(
                    this._emptyState('fas fa-brain', 'No rating data yet. Students need to rate flashcards.')
                );
                return;
            }

            var desc = document.createElement('p');
            desc.style.cssText = 'color:var(--text-muted);margin-bottom:16px;font-size:0.9em;';
            desc.textContent = 'Terms students find difficult based on flashcard ratings. Higher difficulty % means more students rated a term as "hard."';
            container.appendChild(desc);

            var self = this;
            unitIds.forEach(function(unitId) {
                var terms = units[unitId];
                var termList = Object.keys(terms).map(function(term) {
                    var t = terms[term];
                    var diffPct = t.total > 0 ? Math.round((t.hard / t.total) * 100) : 0;
                    return { term: term, hard: t.hard, medium: t.medium, easy: t.easy, total: t.total, diffPct: diffPct };
                });
                // Sort by difficulty descending
                termList.sort(function(a, b) { return b.diffPct - a.diffPct || b.hard - a.hard; });

                var section = document.createElement('div');
                section.style.cssText = 'margin-bottom:24px;';

                var heading = document.createElement('h3');
                heading.style.cssText = 'margin-bottom:12px;color:var(--primary-dark);';
                heading.textContent = unitId.replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                section.appendChild(heading);

                // Summary stats
                var hardTerms = termList.filter(function(t) { return t.diffPct >= 40; });
                if (hardTerms.length > 0) {
                    var alert = document.createElement('div');
                    alert.style.cssText = 'background:var(--danger-light, #fef2f2);border:1px solid var(--danger, #ef4444);border-radius:8px;padding:12px 16px;margin-bottom:12px;color:var(--danger, #ef4444);font-size:0.9em;';
                    var alertIcon = document.createElement('i');
                    alertIcon.className = 'fas fa-exclamation-circle';
                    alert.appendChild(alertIcon);
                    var alertText = document.createElement('strong');
                    alertText.textContent = ' ' + hardTerms.length + ' term' + (hardTerms.length > 1 ? 's' : '');
                    alert.appendChild(alertText);
                    alert.appendChild(document.createTextNode(' rated hard by 40%+ of students'));
                    section.appendChild(alert);
                }

                var wrapper = document.createElement('div');
                wrapper.className = 'data-table-wrapper';
                var table = document.createElement('table');
                table.className = 'data-table';

                var thead = document.createElement('thead');
                var hr = document.createElement('tr');
                ['Term', 'Hard', 'Medium', 'Easy', 'Responses', 'Difficulty'].forEach(function(text) {
                    var th = document.createElement('th');
                    th.textContent = text;
                    hr.appendChild(th);
                });
                thead.appendChild(hr);
                table.appendChild(thead);

                var tbody = document.createElement('tbody');
                termList.forEach(function(t) {
                    var tr = document.createElement('tr');
                    if (t.diffPct >= 40) tr.style.background = 'var(--danger-light, #fef2f2)';

                    var tdTerm = document.createElement('td');
                    tdTerm.style.fontWeight = '600';
                    tdTerm.textContent = t.term;
                    tr.appendChild(tdTerm);

                    var tdHard = document.createElement('td');
                    tdHard.textContent = t.hard;
                    tdHard.style.color = t.hard > 0 ? 'var(--danger, #ef4444)' : '';
                    tr.appendChild(tdHard);

                    var tdMed = document.createElement('td');
                    tdMed.textContent = t.medium;
                    tr.appendChild(tdMed);

                    var tdEasy = document.createElement('td');
                    tdEasy.textContent = t.easy;
                    tr.appendChild(tdEasy);

                    var tdTotal = document.createElement('td');
                    tdTotal.textContent = t.total;
                    tr.appendChild(tdTotal);

                    var tdDiff = document.createElement('td');
                    var bar = document.createElement('div');
                    bar.style.cssText = 'display:flex;align-items:center;gap:8px;';
                    var barBg = document.createElement('div');
                    barBg.style.cssText = 'flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden;';
                    var barFill = document.createElement('div');
                    var color = t.diffPct >= 40 ? 'var(--danger, #ef4444)' : t.diffPct >= 20 ? 'var(--warning, #f59e0b)' : 'var(--success, #22c55e)';
                    barFill.style.cssText = 'height:100%;border-radius:4px;background:' + color + ';width:' + t.diffPct + '%;';
                    barBg.appendChild(barFill);
                    bar.appendChild(barBg);
                    var pct = document.createElement('span');
                    pct.style.cssText = 'font-size:0.85em;min-width:36px;text-align:right;';
                    pct.textContent = t.diffPct + '%';
                    bar.appendChild(pct);
                    tdDiff.appendChild(bar);
                    tr.appendChild(tdDiff);

                    tbody.appendChild(tr);
                });

                table.appendChild(tbody);
                wrapper.appendChild(table);
                section.appendChild(wrapper);
                container.appendChild(section);
            });

        } catch (err) {
            console.error('Failed to load vocab insights:', err);
            container.textContent = '';
            container.appendChild(
                this._emptyState('fas fa-exclamation-triangle', 'Failed to load vocab insights.')
            );
        }
    },

    // ---- Leaderboard Preview ----

    async loadLeaderboardPreview(filters) {
        var container = document.getElementById('leaderboard-container');
        container.textContent = '';
        container.appendChild(this._loading());

        try {
            var lbQuery = this.supabase
                .from('leaderboard')
                .select('student_id, unit_id, score, vocab_mastered, best_test_score, study_time_seconds, map_best_time, map_bonus, approved')
                .order('score', { ascending: false })
                .limit(50);

            if (filters && filters.unitId) lbQuery = lbQuery.eq('unit_id', filters.unitId);

            // Run class filter + leaderboard + students all in parallel
            var queries = [
                lbQuery,
                this.supabase.from('students').select('id, name, class_id, classes(code, name)')
            ];
            if (filters && filters.classId) {
                queries.push(this.supabase.from('students').select('id').eq('class_id', filters.classId));
            }
            var results = await Promise.all(queries);
            var lbResult = results[0], studentResult = results[1];
            var classStudentIds = results[2] ? (results[2].data || []).map(function(s) { return s.id; }) : null;

            if (lbResult.error) throw lbResult.error;
            var entries = lbResult.data || [];

            var studentMap = {};
            (studentResult.data || []).forEach(function(s) { studentMap[s.id] = s; });

            if (classStudentIds) {
                var idSet = new Set(classStudentIds);
                entries = entries.filter(function(e) { return idSet.has(e.student_id); });
            }

            container.textContent = '';

            if (entries.length === 0) {
                container.appendChild(this._emptyState('fas fa-medal', 'No approved leaderboard entries yet.'));
                return;
            }

            var desc = document.createElement('p');
            desc.style.cssText = 'color:var(--text-muted);margin-bottom:4px;font-size:0.85em;';
            desc.textContent = 'Vocab (\u00d710) + Test Score + Study Min + Map Bonus = Total';
            container.appendChild(desc);

            var columns = [
                { label: '#', key: null, getValue: function() { return 0; } },
                { label: 'Name', key: 'name', defaultAsc: true, getValue: function(r) { return (studentMap[r.student_id] || {}).name || ''; } },
                { label: 'Class', key: 'class', defaultAsc: true, getValue: function(r) { var s = studentMap[r.student_id]; return s && s.classes ? (s.classes.name || s.classes.code) : ''; } },
                { label: 'Score', key: 'score', getValue: function(r) { return r.score || 0; } },
                { label: 'Vocab', key: 'vocab', getValue: function(r) { return r.vocab_mastered || 0; } },
                { label: 'Test', key: 'test', getValue: function(r) { return r.best_test_score != null ? r.best_test_score : -1; } },
                { label: 'Study Time', key: 'study', getValue: function(r) { return r.study_time_seconds || 0; } },
                { label: 'Map Time', key: 'map', getValue: function(r) { return r.map_best_time || Infinity; } }
            ];

            container.appendChild(this._sortableTable(columns, entries, function(entry) {
                var student = studentMap[entry.student_id] || {};
                var tr = document.createElement('tr');
                if (!entry.approved) tr.style.opacity = '0.5';

                var tdRank = document.createElement('td');
                tdRank.style.fontWeight = '700';
                var idx = entries.indexOf(entry);
                if (idx < 3) tdRank.style.color = ['#FFD700', '#C0C0C0', '#CD7F32'][idx];
                tdRank.textContent = idx + 1;
                tr.appendChild(tdRank);

                var tdName = document.createElement('td');
                tdName.textContent = (student.name || 'Unknown') + (entry.approved ? '' : ' (pending)');
                tr.appendChild(tdName);

                var tdClass = document.createElement('td');
                tdClass.textContent = student.classes ? (student.classes.name || student.classes.code) : '-';
                tr.appendChild(tdClass);

                var tdScore = document.createElement('td');
                tdScore.className = 'score-value';
                tdScore.textContent = entry.score;
                tr.appendChild(tdScore);

                var tdVocab = document.createElement('td');
                tdVocab.textContent = entry.vocab_mastered;
                tr.appendChild(tdVocab);

                var tdTest = document.createElement('td');
                tdTest.textContent = entry.best_test_score != null ? entry.best_test_score + '%' : '-';
                tr.appendChild(tdTest);

                var tdTime = document.createElement('td');
                var mins = Math.round((entry.study_time_seconds || 0) / 60);
                tdTime.textContent = mins >= 60 ? (mins / 60).toFixed(1) + ' hrs' : mins + ' min';
                tr.appendChild(tdTime);

                var tdMap = document.createElement('td');
                if (entry.map_best_time) {
                    var mm = Math.floor(entry.map_best_time / 60);
                    var ss = entry.map_best_time % 60;
                    tdMap.textContent = mm + ':' + (ss < 10 ? '0' : '') + ss + ' (+' + (entry.map_bonus || 0) + ')';
                } else {
                    tdMap.textContent = '-';
                }
                tr.appendChild(tdMap);

                return tr;
            }));

        } catch (err) {
            console.error('Failed to load leaderboard preview:', err);
            container.textContent = '';
            container.appendChild(this._emptyState('fas fa-exclamation-triangle', 'Failed to load leaderboard.'));
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
            // Delete related data in parallel first (FK references to students)
            var [r1, r2, r3] = await Promise.all([
                this.supabase.from('progress').delete().eq('student_id', studentId),
                this.supabase.from('sessions').delete().eq('student_id', studentId),
                this.supabase.from('leaderboard').delete().eq('student_id', studentId)
            ]);
            if (r1.error) throw r1.error;
            if (r2.error) throw r2.error;
            if (r3.error) throw r3.error;

            // Now delete the student row
            var r4 = await this.supabase.from('students').delete().eq('id', studentId);
            if (r4.error) throw r4.error;

            this.closeStudentModal();
            this.switchTab('students');
        } catch (err) {
            console.error('Failed to delete student:', err);
            alert('Failed to delete student: ' + (err.message || 'Unknown error'));
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => Dashboard.init());
