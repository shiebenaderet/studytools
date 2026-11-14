const Dashboard = {
    supabase: null,
    currentTab: 'overview',
    _unitConfigCache: {},

    // ---- Helper: count only must-know mastered terms ----
    async _countMustKnowMastered(unitId, masteredArray) {
        if (!Array.isArray(masteredArray) || masteredArray.length === 0) return 0;
        var config = this._unitConfigCache[unitId];
        if (!config) {
            try {
                var resp = await fetch('../units/' + unitId + '/config.json', { cache: 'no-cache' });
                config = await resp.json();
                this._unitConfigCache[unitId] = config;
            } catch (e) {
                return masteredArray.length;
            }
        }
        var vocab = config.vocabulary || [];
        var hasTiers = vocab.some(function(v) { return v.tier; });
        if (!hasTiers) return masteredArray.length;
        return masteredArray.filter(function(t) {
            return vocab.some(function(v) { return v.term === t && (!v.tier || v.tier === 'must-know'); });
        }).length;
    },

    _countMustKnowMasteredSync(unitId, masteredArray) {
        if (!Array.isArray(masteredArray) || masteredArray.length === 0) return 0;
        var config = this._unitConfigCache[unitId];
        if (!config) return masteredArray.length;
        var vocab = config.vocabulary || [];
        var hasTiers = vocab.some(function(v) { return v.tier; });
        if (!hasTiers) return masteredArray.length;
        return masteredArray.filter(function(t) {
            return vocab.some(function(v) { return v.term === t && (!v.tier || v.tier === 'must-know'); });
        }).length;
    },

    // ---- Helper: preload unit configs for tier filtering ----
    async _preloadUnitConfigs(unitIds) {
        var self = this;
        await Promise.all(unitIds.map(async function(id) {
            if (self._unitConfigCache[id]) return;
            try {
                var resp = await fetch('../units/' + id + '/config.json', { cache: 'no-cache' });
                self._unitConfigCache[id] = await resp.json();
            } catch (e) { /* skip */ }
        }));
    },

    // ---- Schedule tab ----
    async renderSchedule() {
        var container = document.getElementById('schedule-container');
        if (!container) return;
        container.textContent = 'Loading…';

        var unitIds = [];
        var unitSel = document.getElementById('filter-unit');
        if (unitSel) {
            unitIds = Array.from(unitSel.options)
                .map(function(o){ return o.value; })
                .filter(function(v){ return v; });
        }
        // Cold-start fallback: dropdown may not be populated yet. Civil-war is
        // the only unit with categorySchedule today; add new scheduled units here.
        if (unitIds.length === 0) unitIds = ['civil-war'];

        await this._preloadUnitConfigs(unitIds);

        while (container.firstChild) container.removeChild(container.firstChild);

        var any = false;
        var self = this;
        unitIds.forEach(function(unitId) {
            var cfg = self._unitConfigCache[unitId];
            if (!cfg || !cfg.categorySchedule) return;
            any = true;
            container.appendChild(self._buildScheduleSection(unitId, cfg));
        });
        if (!any) {
            var p = document.createElement('p');
            p.textContent = 'No units have a categorySchedule configured.';
            container.appendChild(p);
        }
    },

    _buildScheduleSection(unitId, cfg) {
        var section = document.createElement('section');
        section.className = 'schedule-section';

        var h2 = document.createElement('h2');
        h2.textContent = (cfg.unit && cfg.unit.name) || unitId;
        section.appendChild(h2);

        var table = document.createElement('table');
        table.className = 'schedule-table';

        var thead = document.createElement('thead');
        var headRow = document.createElement('tr');
        ['Category','Scheduled date','Status',''].forEach(function(label){
            var th = document.createElement('th');
            th.textContent = label;
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        var today = new Date();
        today.setHours(0,0,0,0);
        var self = this;
        Object.keys(cfg.categorySchedule).forEach(function(cat) {
            var iso = cfg.categorySchedule[cat];
            var tr = document.createElement('tr');

            var tdCat = document.createElement('td');
            tdCat.textContent = cat;
            tr.appendChild(tdCat);

            var tdDate = document.createElement('td');
            tdDate.textContent = self._formatScheduleDate(iso);
            tr.appendChild(tdDate);

            var parts = iso.split('-');
            var unlockAt = new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10));
            var diffDays = Math.round((unlockAt - today) / 86400000);

            var tdStatus = document.createElement('td');
            if (diffDays <= 0) {
                tdStatus.textContent = '✓ Unlocked';
                tdStatus.className = 'status-unlocked';
            } else {
                tdStatus.textContent = 'Locked (in ' + diffDays + ' day' + (diffDays===1?'':'s') + ')';
                tdStatus.className = 'status-locked';
            }
            tr.appendChild(tdStatus);

            var tdAction = document.createElement('td');
            if (diffDays > 0) {
                var btn = document.createElement('button');
                btn.className = 'btn btn-primary btn-sm';
                btn.textContent = 'Unlock now';
                btn.addEventListener('click', function() {
                    self.openUnlockModal(unitId, cfg, cat);
                });
                tdAction.appendChild(btn);
            }
            tr.appendChild(tdAction);

            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        section.appendChild(table);
        return section;
    },

    _formatScheduleDate(iso) {
        var parts = iso.split('-');
        var d = new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10));
        return d.toLocaleDateString(undefined, { weekday:'short', year:'numeric', month:'long', day:'numeric' });
    },

    openUnlockModal(unitId, cfg, categoryName) {
        var d = new Date();
        var todayIso = d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
        var updated = Object.assign({}, cfg.categorySchedule);
        updated[categoryName] = todayIso;
        var snippet = '"categorySchedule": ' + JSON.stringify(updated, null, 4);

        var body = document.getElementById('schedule-unlock-body');
        while (body.firstChild) body.removeChild(body.firstChild);

        var p = document.createElement('p');
        p.textContent = 'Replace the existing categorySchedule block in study-tools/units/' + unitId + '/config.json with the snippet below, then commit and push. Students will see the unlock on their next page load.';
        body.appendChild(p);

        var pre = document.createElement('pre');
        pre.className = 'unlock-snippet';
        pre.textContent = snippet;
        body.appendChild(pre);

        var copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-primary';
        copyBtn.textContent = 'Copy snippet';
        copyBtn.addEventListener('click', function() {
            navigator.clipboard.writeText(snippet).then(function(){
                copyBtn.textContent = 'Copied ✓';
                setTimeout(function(){ copyBtn.textContent = 'Copy snippet'; }, 1500);
            }).catch(function() {
                copyBtn.textContent = 'Copy failed — select snippet manually';
            });
        });
        body.appendChild(copyBtn);

        document.getElementById('schedule-unlock-modal').classList.remove('hidden');
    },

    closeUnlockModal() {
        document.getElementById('schedule-unlock-modal').classList.add('hidden');
    },

    // ---- Helper: create an icon element ----
    // YYYY-MM-DD in the teacher's local time zone. Supabase timestamps are
    // UTC, and toISOString() is UTC too: after 5 pm Pacific both already read
    // as tomorrow, which shifted every day's sessions one bar to the left.
    // A stored time as a Date. The visits, progress and class tables keep times
    // in UTC with no zone marker ("2026-11-14T04:28:40"), and JavaScript reads
    // such a string as local time: eight hours late in Pacific time. A visit
    // from this afternoon then looked like it was still to come, so it showed
    // as "Just now", and evening study was counted on the next day. A time
    // that already carries a zone (the responses table) is left as it is.
    _when(ts) {
        if (ts instanceof Date) return ts;
        var s = String(ts == null ? '' : ts);
        if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s) && !/(Z|[+-]\d{2}(:?\d{2})?)$/.test(s)) {
            s = s.replace(' ', 'T') + 'Z';
        }
        return new Date(s);
    },

    _localDateKey(d) {
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var day = String(d.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + day;
    },

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

    // ---- Helper: score warning pills ----
    _scoreWarningBadges(entry) {
        var badges = [];
        // Inline tier calculation (mirrors LeaderboardManager.calculateTimePts).
        // Keep these tiers in sync with leaderboard.js: 1 / 0.5 / 0.25 pt/min
        // through 120 min, then 0.25 pt/min forever after (raised from 0.1 on
        // 2026-06-09 so long-haul study still earns a visible trickle).
        var mins = Math.floor((entry.study_time_seconds || 0) / 60);
        var timePts;
        if (mins <= 30) timePts = mins;
        else if (mins <= 60) timePts = 30 + Math.floor((mins - 30) * 0.5);
        else if (mins <= 120) timePts = 45 + Math.floor((mins - 60) * 0.25);
        else timePts = 60 + Math.floor((mins - 120) * 0.25);

        // Study time heavy: time pts > 60% of score
        if (entry.score > 0 && timePts / entry.score > 0.6) {
            badges.push({ label: 'Time-heavy', bg: '#fef3c7', color: '#92400e' });
        }
        // Missing milestones
        var noVocab = (entry.vocab_mastered || 0) === 0;
        var noTest = entry.best_test_score == null;
        if (noVocab && noTest) {
            badges.push({ label: 'No vocab or test', bg: '#fee2e2', color: '#991b1b' });
        } else if (noVocab) {
            badges.push({ label: 'No vocab', bg: '#fee2e2', color: '#991b1b' });
        } else if (noTest) {
            badges.push({ label: 'No test', bg: '#fee2e2', color: '#991b1b' });
        }
        return badges;
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

        // Listen for auth state changes (catches password recovery redirect)
        this.supabase.auth.onAuthStateChange(function(event, session) {
            if (event === 'PASSWORD_RECOVERY') {
                Dashboard._showPasswordUpdateForm();
            }
        });

        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session && this._allowedTeachers.indexOf(session.user.email.toLowerCase()) !== -1) {
                this.showDashboard();
            } else if (session) {
                // Could be a recovery session - check URL hash
                var hash = window.location.hash;
                if (hash && hash.indexOf('type=recovery') !== -1) {
                    this._showPasswordUpdateForm();
                    return;
                }
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

    _showPasswordUpdateForm() {
        var loginScreen = document.getElementById('login-screen');
        loginScreen.classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');

        var card = loginScreen.querySelector('.login-card');
        card.textContent = '';

        var title = document.createElement('h1');
        var icon = document.createElement('i');
        icon.className = 'fas fa-key';
        title.appendChild(icon);
        title.appendChild(document.createTextNode(' Set New Password'));
        title.style.cssText = 'color:var(--primary-text);margin-bottom:6px;font-size:1.5rem;';
        card.appendChild(title);

        var subtitle = document.createElement('p');
        subtitle.textContent = 'Enter your new password below.';
        subtitle.style.cssText = 'color:var(--text-light);margin-bottom:28px;font-size:0.95rem;';
        card.appendChild(subtitle);

        var group1 = document.createElement('div');
        group1.className = 'form-group';
        var label1 = document.createElement('label');
        label1.textContent = 'New Password';
        label1.setAttribute('for', 'new-password');
        group1.appendChild(label1);
        var input1 = document.createElement('input');
        input1.type = 'password';
        input1.id = 'new-password';
        input1.placeholder = 'Enter new password';
        input1.required = true;
        input1.minLength = 6;
        group1.appendChild(input1);
        card.appendChild(group1);

        var group2 = document.createElement('div');
        group2.className = 'form-group';
        var label2 = document.createElement('label');
        label2.textContent = 'Confirm Password';
        label2.setAttribute('for', 'confirm-password');
        group2.appendChild(label2);
        var input2 = document.createElement('input');
        input2.type = 'password';
        input2.id = 'confirm-password';
        input2.placeholder = 'Confirm new password';
        input2.required = true;
        group2.appendChild(input2);
        card.appendChild(group2);

        var errorEl = document.createElement('div');
        errorEl.id = 'pw-update-error';
        errorEl.className = 'login-error hidden';
        card.appendChild(errorEl);

        var successEl = document.createElement('div');
        successEl.id = 'pw-update-success';
        successEl.className = 'login-success hidden';
        card.appendChild(successEl);

        var btn = document.createElement('button');
        btn.className = 'btn btn-primary btn-block';
        btn.type = 'button';
        var btnIcon = document.createElement('i');
        btnIcon.className = 'fas fa-save';
        btn.appendChild(btnIcon);
        btn.appendChild(document.createTextNode(' Update Password'));
        btn.addEventListener('click', async function() {
            var pw = input1.value;
            var confirm = input2.value;
            errorEl.classList.add('hidden');
            successEl.classList.add('hidden');

            if (!pw || pw.length < 6) {
                errorEl.textContent = 'Password must be at least 6 characters.';
                errorEl.classList.remove('hidden');
                return;
            }
            if (pw !== confirm) {
                errorEl.textContent = 'Passwords do not match.';
                errorEl.classList.remove('hidden');
                return;
            }

            try {
                var { error } = await Dashboard.supabase.auth.updateUser({ password: pw });
                if (error) {
                    errorEl.textContent = error.message;
                    errorEl.classList.remove('hidden');
                    return;
                }
                successEl.textContent = 'Password updated! Redirecting to dashboard...';
                successEl.classList.remove('hidden');
                // Clear the hash and reload after a moment
                setTimeout(function() {
                    window.location.hash = '';
                    window.location.reload();
                }, 2000);
            } catch (err) {
                errorEl.textContent = 'Could not update password. Please try again.';
                errorEl.classList.remove('hidden');
            }
        });
        card.appendChild(btn);

        input1.focus();
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
        // The first tab waits for the Unit menu, so it opens on the current unit
        // and not on every unit mixed together.
        var self = this;
        var start = function() { self.switchTab('overview'); };
        Promise.all([this.loadClasses(), this.loadUnitFilter()]).then(start, start);
    },

    async loadVersion() {
        try {
            var resp = await fetch('../engine/version.json', { cache: 'no-cache' });
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

    async resetPassword() {
        const emailInput = document.getElementById('email');
        const email = emailInput.value.trim();
        const errorEl = document.getElementById('login-error');
        const successEl = document.getElementById('login-success');
        errorEl.classList.add('hidden');
        successEl.classList.add('hidden');

        if (!email) {
            errorEl.textContent = 'Enter your email address first, then click "Forgot password?"';
            errorEl.classList.remove('hidden');
            emailInput.focus();
            return;
        }

        try {
            var dashboardUrl = window.location.origin + '/study-tools/dashboard/';
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: dashboardUrl
            });
            if (error) {
                errorEl.textContent = error.message;
                errorEl.classList.remove('hidden');
                return;
            }
            successEl.textContent = 'Password reset email sent! Check your inbox.';
            successEl.classList.remove('hidden');
        } catch (err) {
            errorEl.textContent = 'Could not send reset email. Please try again.';
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

    // ---- Fetching ----

    // The database returns at most 1,000 rows per request. The progress and
    // sessions tables are far larger than that, so a plain select silently
    // dropped most of the class (the Overview's average session was the total
    // study time divided by exactly 1,000 sessions). This asks for page after
    // page until a short one comes back. `build` must return a fresh query
    // each time it is called, because a query can only be run once.
    async _fetchAll(build) {
        var PAGE = 1000, rows = [];
        for (var page = 0; page < 200; page++) {
            var res = await build().order('id').range(page * PAGE, page * PAGE + PAGE - 1);
            if (res.error) return { data: null, error: res.error };
            rows = rows.concat(res.data || []);
            if (!res.data || res.data.length < PAGE) break;
        }
        return { data: rows, error: null };
    },

    // Progress rows are stored as "activity_<id>"; older code here looked for the
    // bare id and so never found flashcard mastery or test scores.
    _isActivity(row, id) {
        return row.activity === 'activity_' + id || row.activity === id;
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

        // The Class, Unit and date filters do nothing on these two tabs, so they are hidden there
        var bar = document.querySelector('.filter-bar');
        if (bar) bar.classList.toggle('hidden', tabName === 'feedback' || tabName === 'setup');

        const filters = this.getFilters();

        switch (tabName) {
            case 'overview':
                this.loadOverview(filters);
                break;
            case 'students':
                this.loadStudents(filters);
                this.loadUnits(filters);
                this.loadVocabInsights(filters);
                break;
            case 'leaderboard':
                this.loadScores(filters);
                this.loadLeaderboardPreview(filters);
                this.loadGraphics(filters);
                // Class Standings, Top Students, the rankings chart and the Replay are
                // drawn by loadOverview() into containers that now live on this tab
                this.loadOverview(filters);
                break;
            case 'responses':
                this.loadResponses(filters);
                break;
            case 'feedback':
                this.loadFeedback();
                break;
            case 'setup':
                this.loadClassCodes();
                this.renderSchedule();
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
                this._classCodeById = {};
                data.forEach(cls => {
                    this._classCodeById[cls.id] = cls.code;
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
            var seen = {};
            var unitIds = [];

            // First: get units from units.json so all configured units show up
            try {
                var unitsResp = await fetch('../units/units.json', { cache: 'no-cache' });
                var unitsData = await unitsResp.json();
                Dashboard._unitsMeta = {};
                (unitsData.units || []).forEach(function(u) {
                    // Last year's units are hidden from students; leave them out here too.
                    // If old progress for one is still in the database it is added below.
                    if (u.hidden || u.draft) return;
                    Dashboard._unitsMeta[u.id] = u;
                    if (!seen[u.id]) {
                        seen[u.id] = true;
                        unitIds.push(u.id);
                    }
                });
            } catch (e) {
                // Fallback: ignore if units.json fails
            }

            // Also: add any unit IDs from progress data that might not be in units.json
            var { data, error } = await this.supabase
                .from('progress')
                .select('unit_id')
                .limit(1000);
            if (!error && data) {
                data.forEach(function(row) {
                    if (!seen[row.unit_id]) {
                        seen[row.unit_id] = true;
                        unitIds.push(row.unit_id);
                    }
                });
            }

            var current = this._currentUnitId();
            unitIds.forEach(function(uid) {
                var opt = document.createElement('option');
                opt.value = uid;
                opt.textContent = Dashboard._unitTitle(uid) + (uid === current ? ' (current)' : '');
                select.appendChild(opt);
            });
            // Scores are kept per unit, so the dashboard opens on the unit students
            // are in now. "All Units" is still in the menu.
            if (current) select.value = current;
        } catch (err) {
            console.error('Failed to load unit filter:', err);
        }
    },

    // The unit students are working in now: of the units students can see, the
    // one whose "opens" date is the latest that is not in the future. Null when
    // units.json could not be read or no unit has opened.
    _currentUnitId() {
        var meta = this._unitsMeta || {};
        var today = this._localDateKey(new Date());
        var best = null;
        Object.keys(meta).forEach(function(id) {
            var opens = meta[id].opens;
            if (!opens || opens > today) return;
            if (!best || opens > meta[best].opens) best = id;
        });
        return best;
    },

    async loadOverview(filters) {
        var container = document.getElementById('overview-stats');
        var lbContainer = document.getElementById('overview-leaderboard');
        var trendContainer = document.getElementById('overview-trend');
        var feedContainer = document.getElementById('overview-feed');
        var classLbContainer = document.getElementById('overview-class-lb');
        var vizContainer = document.getElementById('overview-rankings-viz');
        container.textContent = '';
        container.appendChild(this._loading());
        if (lbContainer) lbContainer.textContent = '';
        if (trendContainer) trendContainer.textContent = '';
        if (feedContainer) feedContainer.textContent = '';
        if (classLbContainer) classLbContainer.textContent = '';
        if (vizContainer) {
            if (vizContainer._raceCleanup) vizContainer._raceCleanup();
            vizContainer.textContent = '';
        }

        try {
            // Build all queries upfront
            var studentQuery = this.supabase.from('students').select('id', { count: 'exact', head: true });
            if (filters.classId) studentQuery = studentQuery.eq('class_id', filters.classId);

            var weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            var sb = this.supabase;
            // Each of these is a function so _fetchAll can run it once per page of 1,000 rows.
            var activeQuery = function() {
                var q = sb.from('sessions').select('student_id');
                q = q.gte('started_at', filters.dateStart ? filters.dateStart : weekAgo.toISOString());
                if (filters.dateEnd) q = q.lte('started_at', filters.dateEnd + 'T23:59:59');
                return q;
            };

            var hoursQuery = function() {
                var q = sb.from('sessions').select('duration_seconds, student_id');
                if (filters.unitId) q = q.eq('unit_id', filters.unitId);
                if (filters.dateStart) q = q.gte('started_at', filters.dateStart);
                if (filters.dateEnd) q = q.lte('started_at', filters.dateEnd + 'T23:59:59');
                return q;
            };

            var progressQuery = function() {
                var q = sb.from('progress').select('student_id, data, unit_id').eq('activity', 'studyTime');
                if (filters.unitId) q = q.eq('unit_id', filters.unitId);
                return q;
            };

            var lbQuery = this.supabase.from('leaderboard')
                .select('student_id, score, vocab_mastered, best_test_score, study_time_seconds, map_best_time, map_bonus, approved')
                .order('score', { ascending: false })
                .limit(10);
            if (filters.unitId) lbQuery = lbQuery.eq('unit_id', filters.unitId);

            // Trend query: sessions from the last 7 days
            var trendStart = new Date();
            trendStart.setDate(trendStart.getDate() - 6);
            trendStart.setHours(0, 0, 0, 0);
            var trendQuery = function() {
                return sb.from('sessions')
                    .select('student_id, started_at, duration_seconds, activities_used')
                    .gte('started_at', trendStart.toISOString())
                    .order('started_at', { ascending: false });
            };

            // Class leaderboard: all leaderboard + all students with class info + all classes
            var allLbQuery = this.supabase.from('leaderboard')
                .select('student_id, score, approved')
                .eq('approved', true);
            if (filters.unitId) allLbQuery = allLbQuery.eq('unit_id', filters.unitId);

            // Run ALL queries in parallel
            var [studentRes, activeRes, hoursRes, progressRes, lbRes, classStudentRes, allStudentRes, trendRes, allLbRes, classesRes, allStudentsWithClassRes] = await Promise.all([
                studentQuery,
                this._fetchAll(activeQuery),
                this._fetchAll(hoursQuery),
                this._fetchAll(progressQuery),
                lbQuery,
                filters.classId
                    ? this.supabase.from('students').select('id').eq('class_id', filters.classId)
                    : Promise.resolve({ data: null }),
                this.supabase.from('students').select('id, name'),
                this._fetchAll(trendQuery),
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

            // Study hours: the progress figure counts only active time (the timer
            // pauses when a student is idle). Session lengths run from opening the
            // site to closing the tab, idle time included, so they are used only
            // when a date range is set, since progress totals have no dates.
            var datesSet = !!(filters.dateStart || filters.dateEnd);
            var totalSeconds = datesSet ? sessionSeconds : (progressSeconds || sessionSeconds);
            var totalHours = (totalSeconds / 3600).toFixed(1);
            // A typical visit: the middle value of visits between one minute and
            // three hours. Unclosed visits (0) and tabs left open all day are left out.
            var visitLengths = (hoursRes.data || [])
                .filter(function(s) { return !classIdSet || classIdSet.has(s.student_id); })
                .map(function(s) { return s.duration_seconds || 0; })
                .filter(function(d) { return d >= 60 && d <= 3 * 3600; })
                .sort(function(a, b) { return a - b; });
            var avgMinutes = visitLengths.length ? Math.round(visitLengths[Math.floor(visitLengths.length / 2)] / 60) : 0;

            // Render stat cards
            container.textContent = '';
            // Every number says what it counts: the teacher could not tell
            // students from visits from hours when the cards showed bare numbers.
            var enrolled = studentRes.count || 0;
            var scope = (filters.classId ? 'this class' : 'all classes') + (filters.unitId ? ', this unit' : ', every unit');
            var stats = [
                { icon: 'fas fa-users', value: enrolled, unit: enrolled === 1 ? 'student' : 'students', label: 'Signed Up',
                  sub: filters.classId ? 'in this class' : 'in all classes' },
                { icon: 'fas fa-bolt', value: activeCount, unit: activeCount === 1 ? 'student' : 'students',
                  label: filters.dateStart ? 'Studied In These Dates' : 'Studied This Week',
                  sub: 'out of ' + enrolled + (filters.dateStart ? '' : ', in the last 7 days') },
                { icon: 'fas fa-clock', value: totalHours, unit: 'hours', label: 'Total Study Time',
                  sub: 'added together, ' + scope },
                { icon: 'fas fa-stopwatch', value: avgMinutes, unit: 'min', label: 'Typical Visit',
                  sub: 'how long one sitting lasts' }
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
                var unitSpan = document.createElement('span');
                unitSpan.className = 'stat-unit';
                unitSpan.textContent = ' ' + stat.unit;
                valueDiv.appendChild(unitSpan);

                var labelDiv = document.createElement('div');
                labelDiv.className = 'stat-label';
                labelDiv.textContent = stat.label;

                var subDiv = document.createElement('div');
                subDiv.className = 'stat-sub';
                subDiv.textContent = stat.sub;

                card.appendChild(iconDiv);
                card.appendChild(valueDiv);
                card.appendChild(labelDiv);
                card.appendChild(subDiv);
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
                    var key = Dashboard._localDateKey(day);
                    dayCounts[key] = { count: 0, visits: 0, seen: {}, label: dayNames[day.getDay()], isToday: d === 6 };
                }
                // The bar is the number of different students that day. Visits are
                // shown beside it: one student who opens the site three times is
                // three visits, which is what the bare number used to be.
                trendSessions.forEach(function(s) {
                    var dayKey = Dashboard._localDateKey(Dashboard._when(s.started_at));
                    var day = dayCounts[dayKey];
                    if (!day) return;
                    day.visits++;
                    if (!day.seen[s.student_id]) { day.seen[s.student_id] = true; day.count++; }
                });

                var maxCount = 0;
                var dayKeys = Object.keys(dayCounts);
                dayKeys.forEach(function(k) { if (dayCounts[k].count > maxCount) maxCount = dayCounts[k].count; });

                var heading = document.createElement('h3');
                heading.appendChild(self._icon('fas fa-chart-bar'));
                heading.appendChild(document.createTextNode(' Students Studying Each Day'));
                trendContainer.appendChild(heading);

                var trendNote = document.createElement('p');
                trendNote.className = 'panel-note';
                trendNote.textContent = 'The last 7 days' + (filters.classId ? ', this class' : ', all classes') + '. Each bar is how many different students opened the site that day. Today is orange.';
                trendContainer.appendChild(trendNote);

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
                    var day = dayCounts[k];
                    count.textContent = day.count + (day.count === 1 ? ' student' : ' students');
                    var visitsEl = document.createElement('span');
                    visitsEl.className = 'trend-visits';
                    visitsEl.textContent = day.visits + (day.visits === 1 ? ' visit' : ' visits');
                    count.appendChild(visitsEl);

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
                    var match = Dashboard._when(s.started_at) >= dayAgo;
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
                        var diffMs = now - Dashboard._when(s.started_at);
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
                var todayStr = Dashboard._localDateKey(new Date());
                (trendRes.data || []).forEach(function(s) {
                    if (Dashboard._localDateKey(Dashboard._when(s.started_at)) !== todayStr) return;
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
                        statsEl.textContent = cls.studentCount + (cls.studentCount === 1 ? ' student' : ' students') + ' with a score \u00B7 average ' + cls.avgScore + ' pts each';

                        info.appendChild(nameEl);
                        info.appendChild(statsEl);

                        var scoreDiv = document.createElement('div');
                        scoreDiv.className = 'class-lb-score';

                        var totalEl = document.createElement('div');
                        totalEl.className = 'class-lb-total';
                        totalEl.textContent = cls.totalScore.toLocaleString() + ' pts';
                        totalEl.title = 'Every approved student\'s score in this class, added together';

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

            // Render class rankings visualization
            if (vizContainer && typeof RankingsViz !== 'undefined') {
                if (vizContainer._raceCleanup) vizContainer._raceCleanup();

                // One row per student per day, so a unit passes 1,000 rows in about
                // ten days. Asking for 5,000 did not help: the server stops at 1,000,
                // and the chart showed only a unit's first days.
                var vizRes = await this._fetchAll(function() {
                    var q = sb.from('leaderboard_snapshots')
                        .select('student_id, score, class_id, snapshot_date')
                        .order('snapshot_date', { ascending: true });
                    if (filters.unitId) q = q.eq('unit_id', filters.unitId);
                    return q;
                });
                var vizData = vizRes.data || [];

                if (filters.classId) {
                    vizData = vizData.filter(function(r) { return r.class_id === filters.classId; });
                }

                var vizClassMap = {};
                (classesRes.data || []).forEach(function(c) { vizClassMap[c.id] = c.name || c.code; });
                if (typeof ClassGraphics !== 'undefined') {
                    RankingsViz.colorMap = ClassGraphics.classColors(classesRes.data || []);
                }

                RankingsViz.render(vizContainer, vizData, vizClassMap);
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
                    formula.textContent = 'Vocab (\u00d710) + Test Score + Study Time (diminishing) + Map Bonus = Total';
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
                        var warnings = self._scoreWarningBadges(entry);
                        for (var w = 0; w < warnings.length; w++) {
                            var pill = document.createElement('span');
                            pill.textContent = warnings[w].label;
                            pill.style.cssText = 'display:inline-block;margin-left:6px;padding:2px 8px;border-radius:10px;font-size:0.7em;font-weight:600;background:' + warnings[w].bg + ';color:' + warnings[w].color + ';vertical-align:middle;';
                            tdScore.appendChild(pill);
                        }
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

    // ---- Graphics for class ----

    // What the pictures need for one unit: the class periods, each student's
    // short name, and every approved score. A student whose score the teacher
    // has not approved never appears, the same rule as the students' leaderboard.
    async _graphicsData(filters) {
        var unitId = filters.unitId || this._currentUnitId();
        if (!unitId) throw new Error('Choose a unit in the Unit filter first.');
        var sb = this.supabase;
        var res = await Promise.all([
            sb.from('classes').select('id, code, name').order('name'),
            this._fetchAll(function() { return sb.from('students').select('id, name, class_id'); }),
            this._fetchAll(function() {
                return sb.from('leaderboard').select('id, student_id, score, approved').eq('unit_id', unitId).eq('approved', true);
            })
        ]);
        for (var i = 0; i < res.length; i++) { if (res[i].error) throw res[i].error; }

        var classes = (res[0].data || []).map(function(c) { return { id: c.id, name: c.name || c.code }; });
        var classNames = {};
        classes.forEach(function(c) { classNames[c.id] = c.name; });
        var students = {};
        (res[1].data || []).forEach(function(st) {
            if (!st.class_id || !classNames[st.class_id]) return;
            students[st.id] = { name: ClassGraphics.shortName(st.name), classId: st.class_id };
        });
        var scores = (res[2].data || []).filter(function(e) { return e.approved && students[e.student_id]; })
            .map(function(e) { return { studentId: e.student_id, score: e.score || 0 }; });

        var meta = (this._unitsMeta || {})[unitId] || {};
        return {
            unitId: unitId,
            unitTitle: String(meta.title || this._unitTitle(unitId)).replace(/\s*Study Tool$/i, ''),
            header: (meta.theme && meta.theme.primary) || '#0f766e',
            classes: classes,
            classNames: classNames,
            colors: ClassGraphics.classColors(classes),
            students: students,
            scores: scores
        };
    },

    // The class periods ranked, by points added together (what students see on
    // the site) or by average per student.
    _standingsScene(d, measure) {
        var byClass = {};
        d.scores.forEach(function(e) {
            var cid = d.students[e.studentId].classId;
            if (!byClass[cid]) byClass[cid] = { total: 0, count: 0 };
            byClass[cid].total += e.score;
            byClass[cid].count++;
        });
        var rows = d.classes.filter(function(c) { return byClass[c.id]; }).map(function(c) {
            var t = byClass[c.id], avg = t.total / t.count;
            var who = t.count + (t.count === 1 ? ' student' : ' students');
            return {
                name: c.name,
                color: d.colors[c.id],
                value: measure === 'average' ? avg : t.total,
                sub: measure === 'average' ? who + ' \u00B7 ' + ClassGraphics.points(t.total) + ' in all'
                                           : who + ' \u00B7 average ' + ClassGraphics.points(avg)
            };
        });
        if (!rows.length) throw new Error('No approved scores in ' + d.unitTitle + ' yet.');
        rows.sort(function(a, b) { return b.value - a.value || a.name.localeCompare(b.name); });
        rows.forEach(function(r, i) { r.pos = i; });
        return {
            title: 'Class Standings',
            subtitle: d.unitTitle,
            dateText: ClassGraphics.longDate(new Date()),
            header: d.header,
            footer: measure === 'average' ? 'Average points per student in this unit.'
                                          : 'Points earned in this unit by everyone in the period, added together.',
            legend: null,
            slots: Math.max(rows.length, 2),
            max: rows[0].value,
            rows: rows
        };
    },

    // The ten highest scores, for every class or for the class in the filter
    _topTenScene(d, classId) {
        var list = d.scores.filter(function(e) { return !classId || d.students[e.studentId].classId === classId; })
            .map(function(e) {
                var st = d.students[e.studentId];
                return { name: st.name, sub: classId ? '' : d.classNames[st.classId], color: d.colors[st.classId], value: e.score };
            });
        if (!list.length) throw new Error('No approved scores here yet.');
        list.sort(function(a, b) { return b.value - a.value || a.name.localeCompare(b.name); });
        var rows = list.slice(0, 10);
        rows.forEach(function(r, i) { r.pos = i; });
        return {
            title: 'Top Ten' + (classId ? ': ' + d.classNames[classId] : ''),
            subtitle: d.unitTitle,
            dateText: ClassGraphics.longDate(new Date()),
            header: d.header,
            footer: 'Points earned in this unit.',
            legend: classId ? null : d.classes.filter(function(c) {
                return rows.some(function(r) { return r.sub === c.name; });
            }).map(function(c) { return { name: c.name, color: d.colors[c.id] }; }),
            slots: Math.max(rows.length, 5),
            max: rows[0].value,
            rows: rows
        };
    },

    // Every day of scores for the unit, as the race needs them: one list of
    // days, and for each approved student a score on each day. A day with no
    // row for a student keeps the score from the day before. Today is taken
    // from the live leaderboard, so the last frame matches what students see now.
    async _raceDays(d, filters) {
        var sb = this.supabase;
        var res = await this._fetchAll(function() {
            var q = sb.from('leaderboard_snapshots').select('student_id, score, snapshot_date').eq('unit_id', d.unitId);
            if (filters.dateStart) q = q.gte('snapshot_date', filters.dateStart);
            if (filters.dateEnd) q = q.lte('snapshot_date', filters.dateEnd);
            return q;
        });
        if (res.error) throw res.error;

        var today = this._localDateKey(new Date());
        var live = {};
        d.scores.forEach(function(e) { live[e.studentId] = e.score; });
        var useToday = !filters.dateEnd || filters.dateEnd >= today;

        var daySet = {};
        var byStudent = {};
        (res.data || []).forEach(function(r) {
            if (!(r.student_id in live) || r.snapshot_date > today) return;
            if (useToday && r.snapshot_date === today) return;
            daySet[r.snapshot_date] = true;
            if (!byStudent[r.student_id]) byStudent[r.student_id] = {};
            byStudent[r.student_id][r.snapshot_date] = r.score || 0;
        });
        if (useToday) {
            daySet[today] = true;
            Object.keys(live).forEach(function(id) {
                if (!byStudent[id]) byStudent[id] = {};
                byStudent[id][today] = live[id];
            });
        }
        var days = Object.keys(daySet).sort();
        var series = {};
        Object.keys(byStudent).forEach(function(id) {
            var lastSeen = null;
            series[id] = days.map(function(day) {
                if (byStudent[id][day] != null) lastSeen = byStudent[id][day];
                return lastSeen;
            });
        });
        return { days: days, series: series };
    },

    // kind: 'classes' (the periods race) or 'students' (the top ten race)
    _raceModel(d, race, kind, measure, classId) {
        var items;
        if (kind === 'classes') {
            items = d.classes.map(function(c) {
                var values = race.days.map(function(_, day) {
                    var total = 0, count = 0;
                    Object.keys(race.series).forEach(function(id) {
                        var v = race.series[id][day];
                        if (v == null || d.students[id].classId !== c.id) return;
                        total += v;
                        count++;
                    });
                    return count ? (measure === 'average' ? total / count : total) : null;
                });
                return { name: c.name, sub: '', color: d.colors[c.id], values: values };
            }).filter(function(it) { return it.values.some(function(v) { return v != null; }); });
        } else {
            items = Object.keys(race.series).filter(function(id) {
                return !classId || d.students[id].classId === classId;
            }).map(function(id) {
                var st = d.students[id];
                return { name: st.name, sub: classId ? '' : d.classNames[st.classId], color: d.colors[st.classId], values: race.series[id] };
            });
        }
        if (!items.length) throw new Error('No approved scores here yet.');
        if (race.days.length < 2) {
            throw new Error('A race needs at least two days of scores, and ' + d.unitTitle + ' has ' + race.days.length + ' so far. Try again tomorrow, or clear the From and To dates if they are set.');
        }
        var students = kind === 'students';
        return {
            title: students ? 'Top Ten Race' + (classId ? ': ' + d.classNames[classId] : '') : 'Class Race',
            subtitle: d.unitTitle,
            header: d.header,
            footer: students ? 'Points earned in this unit.'
                : (measure === 'average' ? 'Average points per student in this unit.'
                                         : 'Points earned in this unit by everyone in the period, added together.'),
            legend: students && !classId ? d.classes.filter(function(c) {
                return items.some(function(it) { return it.sub === c.name; });
            }).map(function(c) { return { name: c.name, color: d.colors[c.id] }; }) : null,
            slots: students ? Math.min(10, Math.max(items.length, 5)) : Math.max(items.length, 2),
            days: race.days,
            items: items
        };
    },

    _slug(text) {
        return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    },

    // The "Graphics for class" panel on the Leaderboard tab
    loadGraphics(filters) {
        var container = document.getElementById('graphics-container');
        if (!container || typeof ClassGraphics === 'undefined') return;
        container.textContent = '';
        var self = this;

        var unitId = filters.unitId || this._currentUnitId();
        var meta = (this._unitsMeta || {})[unitId] || {};
        var unitName = unitId ? String(meta.title || this._unitTitle(unitId)).replace(/\s*Study Tool$/i, '') : '';

        var intro = document.createElement('p');
        intro.className = 'panel-note';
        intro.textContent = (unitName ? 'For ' + unitName + '. ' : '') +
            'Each button makes a file and saves it to your Downloads folder, ready to drop into a slide. ' +
            'Only approved students appear, by first name and last initial. ' +
            'The files are made on this computer; nothing is uploaded.';
        container.appendChild(intro);

        var controls = document.createElement('div');
        controls.className = 'graphics-controls';

        var measureWrap = document.createElement('label');
        measureWrap.className = 'graphics-measure';
        measureWrap.appendChild(document.createTextNode('Rank class periods by '));
        var measure = document.createElement('select');
        measure.id = 'graphics-measure';
        [['total', 'points added together (what students see)'], ['average', 'average points per student']].forEach(function(o) {
            var opt = document.createElement('option');
            opt.value = o[0];
            opt.textContent = o[1];
            measure.appendChild(opt);
        });
        measureWrap.appendChild(measure);
        controls.appendChild(measureWrap);

        var buttons = document.createElement('div');
        buttons.className = 'graphics-buttons';
        controls.appendChild(buttons);
        container.appendChild(controls);

        var status = document.createElement('p');
        status.className = 'graphics-status';
        status.setAttribute('role', 'status');
        container.appendChild(status);

        var preview = document.createElement('div');
        preview.className = 'graphics-preview';
        container.appendChild(preview);

        var previewUrl = null;
        function show(blob, alt) {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            previewUrl = URL.createObjectURL(blob);
            preview.textContent = '';
            var img = document.createElement('img');
            img.src = previewUrl;
            img.alt = alt;
            preview.appendChild(img);
        }

        // build() returns { blob, filename, alt }. One file at a time.
        function addButton(id, icon, label, build) {
            var btn = document.createElement('button');
            btn.className = 'btn btn-primary';
            btn.id = id;
            btn.appendChild(self._icon(icon));
            btn.appendChild(document.createTextNode(' ' + label));
            btn.addEventListener('click', async function() {
                var all = buttons.querySelectorAll('button');
                all.forEach(function(b) { b.disabled = true; });
                status.textContent = 'Making the file\u2026';
                try {
                    var out = await build(function(text) { status.textContent = text; });
                    show(out.blob, out.alt);
                    ClassGraphics.save(out.blob, out.filename);
                    status.textContent = 'Saved ' + out.filename + ' to your Downloads folder. A preview is below.';
                } catch (err) {
                    console.error('Graphic failed:', err);
                    status.textContent = (err && err.message) || 'The file could not be made. Please try again.';
                } finally {
                    all.forEach(function(b) { b.disabled = false; });
                }
            });
            buttons.appendChild(btn);
        }

        var stamp = function() { return self._localDateKey(new Date()); };

        addButton('graphic-standings', 'fas fa-image', 'Class standings picture', async function() {
            var d = await self._graphicsData(filters);
            var scene = self._standingsScene(d, measure.value);
            var blob = await ClassGraphics.pngBlob(ClassGraphics.still(scene));
            return { blob: blob, filename: 'class-standings-' + d.unitId + '-' + stamp() + '.png',
                     alt: 'Class standings for ' + d.unitTitle + ': ' + scene.rows.map(function(r) { return r.name + ', ' + ClassGraphics.points(r.value); }).join('; ') };
        });

        addButton('graphic-top-ten', 'fas fa-image', 'Top ten picture', async function() {
            var d = await self._graphicsData(filters);
            var scene = self._topTenScene(d, filters.classId);
            var blob = await ClassGraphics.pngBlob(ClassGraphics.still(scene));
            var who = filters.classId ? '-' + self._slug(d.classNames[filters.classId] || 'class') : '';
            return { blob: blob, filename: 'top-ten' + who + '-' + d.unitId + '-' + stamp() + '.png',
                     alt: scene.title + ' for ' + d.unitTitle + ': ' + scene.rows.map(function(r) { return r.name + ', ' + ClassGraphics.points(r.value); }).join('; ') };
        });

        // The races: about ten seconds, looping, from the unit's first day of
        // scores (or the From date) to today
        var forceMeasure = null;
        async function race(kind, name, progress) {
            var by = forceMeasure || measure.value;
            forceMeasure = null;
            var d = await self._graphicsData(filters);
            var days = await self._raceDays(d, filters);
            var classId = kind === 'students' ? filters.classId : null;
            var model = self._raceModel(d, days, kind, by, classId);
            var blob = await ClassGraphics.raceGif(model, function(done) {
                progress('Drawing the race\u2026 ' + Math.round(done * 100) + '%');
            });
            var end = ClassGraphics.raceScene(model, model.days.length - 1).rows
                .sort(function(a, b) { return a.pos - b.pos; }).slice(0, model.slots);
            var who = classId ? '-' + self._slug(d.classNames[classId] || 'class') : '';
            return { blob: blob, filename: name + who + '-' + d.unitId + '-' + stamp() + '.gif',
                     alt: model.title + ' for ' + d.unitTitle + ', ' + model.days.length + ' days. It ends: ' +
                          end.map(function(r) { return r.name + ', ' + ClassGraphics.points(r.value); }).join('; ') };
        }

        addButton('graphic-class-race', 'fas fa-film', 'Class race (GIF)', function(progress) {
            return race('classes', 'class-race', progress);
        });

        addButton('graphic-top-ten-race', 'fas fa-film', 'Top ten race (GIF)', function(progress) {
            return race('students', 'top-ten-race', progress);
        });

        // "Save as a GIF" under the Class Race further down the tab. That chart
        // shows averages, so this one file is made the same way whatever the
        // menu says, and the page moves up to this panel, where the progress
        // and the preview appear.
        if (typeof RankingsViz !== 'undefined') {
            RankingsViz.onSaveGif = function() {
                forceMeasure = 'average';
                container.scrollIntoView({ block: 'center' });
                document.getElementById('graphic-class-race').click();
            };
        }
    },

    async _renderReplay(container, filters, studentNameMap, studentClassMap, classes) {
        container.textContent = '';
        var self = this;

        // Check if snapshots table has data
        // Every day that has scores, for the unit chosen. This used to read the
        // newest 100 rows, which is one day of one class set, so the Replay
        // offered only the last day or two.
        var sbR = this.supabase;
        var datesRes = await this._fetchAll(function() {
            var q = sbR.from('leaderboard_snapshots')
                .select('snapshot_date')
                .order('snapshot_date', { ascending: false });
            if (filters.unitId) q = q.eq('unit_id', filters.unitId);
            return q;
        });

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

    // "Needs a nudge": students with no visit to the site in the last seven
    // days, by class period, with the day of their last visit. Students who
    // have never visited come first.
    _renderNudge(students, lastVisit) {
        var container = document.getElementById('nudge-container');
        if (!container) return;
        container.textContent = '';
        var self = this;
        var DAYS = 7;
        var cutoff = new Date(Date.now() - DAYS * 86400000);

        var groups = {}, order = [];
        students.forEach(function(st) {
            var name = st.classes ? (st.classes.name || st.classes.code) : 'No class';
            if (!groups[name]) { groups[name] = { name: name, enrolled: 0, idle: [] }; order.push(name); }
            groups[name].enrolled++;
            var last = lastVisit[st.id] || null;
            if (!last || last < cutoff) groups[name].idle.push({ name: st.name || 'Unknown', last: last });
        });
        order.sort(function(a, b) { return a.localeCompare(b, undefined, { numeric: true }); });

        var totalIdle = 0;
        order.forEach(function(n) { totalIdle += groups[n].idle.length; });

        var note = document.createElement('p');
        note.className = 'panel-note';
        note.textContent = totalIdle === 0
            ? 'Every student has visited the study site in the last ' + DAYS + ' days.'
            : totalIdle + (totalIdle === 1 ? ' student has' : ' students have') + ' not visited the study site in the last ' + DAYS +
              ' days. The date after each name is the last visit.';
        container.appendChild(note);
        if (totalIdle === 0) return;

        var listText = function(g) {
            return g.name + ': ' + g.idle.map(function(x) { return x.name; }).join(', ');
        };
        var copyButton = function(label, getText) {
            var btn = document.createElement('button');
            btn.className = 'btn nudge-copy';
            btn.appendChild(self._icon('fas fa-copy'));
            btn.appendChild(document.createTextNode(' ' + label));
            btn.addEventListener('click', function() {
                var done = function(ok) {
                    btn.lastChild.textContent = ok ? ' Copied' : ' Could not copy';
                    setTimeout(function() { btn.lastChild.textContent = ' ' + label; }, 1800);
                };
                try {
                    navigator.clipboard.writeText(getText()).then(function() { done(true); }, function() { done(false); });
                } catch (err) { done(false); }
            });
            return btn;
        };

        var grid = document.createElement('div');
        grid.className = 'nudge-grid';
        order.forEach(function(n) {
            var g = groups[n];
            g.idle.sort(function(a, b) {
                if (!a.last !== !b.last) return a.last ? 1 : -1;
                return (a.last ? a.last - b.last : 0) || a.name.localeCompare(b.name);
            });
            var card = document.createElement('div');
            card.className = 'nudge-card';

            var head = document.createElement('div');
            head.className = 'nudge-head';
            var title = document.createElement('strong');
            title.textContent = g.name;
            var count = document.createElement('span');
            count.className = 'nudge-count';
            count.textContent = g.idle.length + ' of ' + g.enrolled + (g.enrolled === 1 ? ' student' : ' students');
            head.appendChild(title);
            head.appendChild(count);
            card.appendChild(head);

            if (g.idle.length === 0) {
                var none = document.createElement('p');
                none.className = 'nudge-none';
                none.textContent = 'Everyone has visited this week.';
                card.appendChild(none);
            } else {
                var list = document.createElement('ul');
                list.className = 'nudge-list';
                g.idle.forEach(function(x) {
                    var li = document.createElement('li');
                    li.appendChild(document.createTextNode(x.name));
                    var when = document.createElement('span');
                    when.className = 'nudge-when';
                    when.textContent = x.last ? x.last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'never';
                    li.appendChild(when);
                    list.appendChild(li);
                });
                card.appendChild(list);
                card.appendChild(copyButton('Copy names', function() { return listText(g); }));
            }
            grid.appendChild(card);
        });
        container.appendChild(grid);

        if (order.length > 1) {
            container.appendChild(copyButton('Copy every period', function() {
                return order.filter(function(n) { return groups[n].idle.length; }).map(function(n) { return listText(groups[n]); }).join('\n');
            }));
        }
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
            var sbS = this.supabase;
            // Every visit, whatever the dates in the filter: the "needs a nudge"
            // list has to know each student's last visit ever. The date filter
            // is applied below, to the table's totals only.
            var sessionsQuery = function() {
                return sbS.from('sessions').select('student_id, started_at, duration_seconds').in('student_id', studentIds);
            };

            var [sessRes, progRes] = await Promise.all([
                this._fetchAll(sessionsQuery),
                this._fetchAll(function() { return sbS.from('progress').select('student_id, unit_id, activity, data').in('student_id', studentIds); })
            ]);
            if (sessRes.error) throw sessRes.error;
            if (progRes.error) throw progRes.error;

            // Preload unit configs for tier filtering
            var progUnitIds = {};
            (progRes.data || []).forEach(function(p) { if (p.unit_id) progUnitIds[p.unit_id] = true; });
            await this._preloadUnitConfigs(Object.keys(progUnitIds));

            var lastVisit = {};
            (sessRes.data || []).forEach(function(s) {
                var when = Dashboard._when(s.started_at);
                if (!lastVisit[s.student_id] || when > lastVisit[s.student_id]) lastVisit[s.student_id] = when;
            });
            this._renderNudge(students, lastVisit);

            var fromDate = filters.dateStart ? new Date(filters.dateStart) : null;
            var toDate = filters.dateEnd ? new Date(filters.dateEnd + 'T23:59:59') : null;
            var sessionMap = {};
            (sessRes.data || []).forEach(function(s) {
                var at = Dashboard._when(s.started_at);
                if ((fromDate && at < fromDate) || (toDate && at > toDate)) return;
                if (!sessionMap[s.student_id]) sessionMap[s.student_id] = { totalSeconds: 0, lastActive: null };
                sessionMap[s.student_id].totalSeconds += (s.duration_seconds || 0);
                var started = Dashboard._when(s.started_at);
                if (!sessionMap[s.student_id].lastActive || started > sessionMap[s.student_id].lastActive) {
                    sessionMap[s.student_id].lastActive = started;
                }
            });

            var self = this;
            var progressMap = {};
            (progRes.data || []).forEach(function(p) {
                if (!progressMap[p.student_id]) progressMap[p.student_id] = { vocabMastered: 0, bestTestScore: null, studyTimeMs: 0 };
                if (self._isActivity(p, 'flashcards') && p.data && p.data.mastered) {
                    progressMap[p.student_id].vocabMastered += self._countMustKnowMasteredSync(p.unit_id, p.data.mastered);
                }
                if (self._isActivity(p, 'practice-test') && p.data && typeof p.data.bestScore === 'number') {
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
                dateEl.textContent = 'Created ' + Dashboard._when(cls.created_at).toLocaleDateString();
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

    // Friendly names for the activity ids found in progress rows.
    ACTIVITY_NAMES: {
        'textbook': 'Textbook', 'flashcards': 'Flashcards', 'fill-in-blank': 'Fill in the Blank', 'typing-practice': 'Typing Practice',
        'practice-test': 'Practice Test', 'timeline': 'Timeline', 'power-sort': 'Power Sort', 'wordle': 'Wordle', 'hangman': 'Hangman',
        'flip-match': 'Flip Match', 'lightning-round': 'Lightning Round', 'crossword': 'Crossword', 'term-catcher': 'Term Catcher',
        'tower-defense': 'Tower Defense', 'quiz-race': 'Quiz Race', 'sort-it-out': 'Sort It Out', 'who-am-i': 'Who Am I?',
        'four-corners': 'Four Corners', 'learn-mode': 'Learn Mode', 'source-analysis': 'Source Analysis', 'short-answer': 'Short Answer',
        'response-builder': 'Response Builder', 'resources': 'Resources', 'sketch-match': 'Sketch & Match', 'sift-practice': 'SIFT Practice',
        'map-quiz': 'Map Quiz', 'maps-hub': 'Maps'
    },

    // Which activity a progress row belongs to, or null for the site's own
    // bookkeeping (streaks, study days, mastery lists and so on). A row is
    // written as "activity_<id>" when an activity saves, and as
    // "dailyActivityTime_<id>" or "lastUsed_<id>" whenever one is opened.
    _activityIdOf(key) {
        var m = /^(?:activity|dailyActivityTime|lastUsed)_(.+)$/.exec(key || '');
        if (!m) return null;
        var id = m[1].replace(/^short-answer-\d+$/, 'short-answer');
        if (id === 'practice-test-mastery') return 'practice-test';
        return id;
    },

    _unitTitle(unitId) {
        return String(unitId).replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    },

    // "By unit and class period": for each unit, who has started it in each
    // period, who has not, how they are doing, and which activities they use.
    async loadUnits(filters) {
        var container = document.getElementById('units-chart-container');
        container.textContent = '';
        container.appendChild(this._loading());

        try {
            var sb = this.supabase, self = this;
            var results = await Promise.all([
                this._fetchAll(function() {
                    var q = sb.from('progress').select('student_id, unit_id, activity, data');
                    if (filters.unitId) q = q.eq('unit_id', filters.unitId);
                    return q;
                }),
                this._fetchAll(function() { return sb.from('students').select('id, name, class_id'); }),
                sb.from('classes').select('id, code, name').order('name')
            ]);
            if (results[0].error) throw results[0].error;
            if (results[1].error) throw results[1].error;
            if (results[2].error) throw results[2].error;
            var progressData = results[0].data || [];
            var students = results[1].data || [];
            var classes = (results[2].data || []).filter(function(c) { return !filters.classId || c.id === filters.classId; });

            if (progressData.length === 0) {
                container.textContent = '';
                container.appendChild(this._emptyState('fas fa-chart-bar', filters.unitId ? 'No one has started this unit yet.' : 'No activity data yet.'));
                return;
            }

            var studentById = {};
            students.forEach(function(st) { studentById[st.id] = st; });
            var roster = {};      // class id -> students enrolled
            classes.forEach(function(c) { roster[c.id] = []; });
            students.forEach(function(st) { if (roster[st.class_id]) roster[st.class_id].push(st); });

            var unitIdsForConfig = {};
            progressData.forEach(function(p) { if (p.unit_id) unitIdsForConfig[p.unit_id] = true; });
            await this._preloadUnitConfigs(Object.keys(unitIdsForConfig));

            // Per unit, per student: what they used, vocabulary mastered, best test
            var units = {};
            progressData.forEach(function(p) {
                var st = studentById[p.student_id];
                if (!st) return;                                   // a row whose student was deleted
                if (filters.classId && st.class_id !== filters.classId) return;
                var u = units[p.unit_id] || (units[p.unit_id] = { per: {}, activities: {} });
                var mine = u.per[p.student_id] || (u.per[p.student_id] = { vocab: null, test: null });
                var act = self._activityIdOf(p.activity);
                if (act) (u.activities[act] || (u.activities[act] = new Set())).add(p.student_id);
                if (self._isActivity(p, 'flashcards') && p.data && p.data.mastered) {
                    mine.vocab = self._countMustKnowMasteredSync(p.unit_id, p.data.mastered);
                }
                if (self._isActivity(p, 'practice-test') && p.data && typeof p.data.bestScore === 'number') {
                    mine.test = p.data.bestScore;
                }
            });

            container.textContent = '';
            var unitIds = Object.keys(units).sort(function(a, b) { return Object.keys(units[b].per).length - Object.keys(units[a].per).length; });
            if (unitIds.length === 0) {
                container.appendChild(this._emptyState('fas fa-chart-bar', 'No activity data matches the current filters.'));
                return;
            }

            var avg = function(list) {
                var nums = list.filter(function(n) { return typeof n === 'number'; });
                return nums.length ? Math.round(nums.reduce(function(a, c) { return a + c; }, 0) / nums.length) : null;
            };
            var cell = function(tag, text, cls) { var e = document.createElement(tag); if (cls) e.className = cls; e.textContent = text; return e; };

            unitIds.forEach(function(unitId) {
                var unit = units[unitId];
                var started = Object.keys(unit.per);
                var section = document.createElement('div');
                section.className = 'unit-section';
                section.appendChild(cell('h3', self._unitTitle(unitId)));

                // Headline numbers for the unit
                var statsRow = document.createElement('div');
                statsRow.className = 'unit-stats-row';
                var vocabAvg = avg(started.map(function(id) { return unit.per[id].vocab; }));
                var testAvg = avg(started.map(function(id) { return unit.per[id].test; }));
                [
                    { value: started.length, label: 'Students who have started' },
                    { value: vocabAvg === null ? '-' : vocabAvg, label: 'Avg must-know terms mastered' },
                    { value: testAvg === null ? '-' : testAvg + '%', label: 'Avg best practice test' },
                    { value: Object.keys(unit.activities).length, label: 'Activities used' }
                ].forEach(function(item) {
                    var stat = document.createElement('div');
                    stat.className = 'unit-stat-mini';
                    stat.appendChild(cell('div', item.value, 'unit-stat-val'));
                    stat.appendChild(cell('div', item.label, 'unit-stat-lbl'));
                    statsRow.appendChild(stat);
                });
                section.appendChild(statsRow);

                // By class period: started, not started (with names), averages
                if (classes.length) {
                    section.appendChild(cell('h4', 'By class period', 'unit-subhead'));
                    var wrap = document.createElement('div');
                    wrap.className = 'data-table-wrapper';
                    var table = document.createElement('table');
                    table.className = 'data-table period-table';
                    var thead = document.createElement('thead'), hr = document.createElement('tr');
                    ['Class', 'Enrolled', 'Started', 'Not started', 'Avg terms mastered', 'Avg best test'].forEach(function(h) { hr.appendChild(cell('th', h)); });
                    thead.appendChild(hr); table.appendChild(thead);
                    var tbody = document.createElement('tbody');
                    classes.forEach(function(c) {
                        var enrolled = roster[c.id] || [];
                        var inUnit = enrolled.filter(function(st) { return unit.per[st.id]; });
                        var missing = enrolled.filter(function(st) { return !unit.per[st.id]; });
                        var tr = document.createElement('tr');
                        tr.appendChild(cell('td', c.name || c.code));
                        tr.appendChild(cell('td', enrolled.length));
                        tr.appendChild(cell('td', inUnit.length + (enrolled.length ? ' (' + Math.round(100 * inUnit.length / enrolled.length) + '%)' : '')));
                        var td = document.createElement('td');
                        if (!missing.length) td.textContent = enrolled.length ? 'Everyone has started' : '-';
                        else {
                            var det = document.createElement('details');
                            det.appendChild(cell('summary', missing.length + (missing.length === 1 ? ' student' : ' students')));
                            det.appendChild(cell('div', missing.map(function(st) { return st.name; }).sort().join(', '), 'period-names'));
                            td.appendChild(det);
                        }
                        tr.appendChild(td);
                        var v = avg(inUnit.map(function(st) { return unit.per[st.id].vocab; }));
                        var t = avg(inUnit.map(function(st) { return unit.per[st.id].test; }));
                        tr.appendChild(cell('td', v === null ? '-' : v));
                        tr.appendChild(cell('td', t === null ? '-' : t + '%'));
                        tbody.appendChild(tr);
                    });
                    table.appendChild(tbody); wrap.appendChild(table); section.appendChild(wrap);
                }

                // Which activities students have opened
                var sorted = Object.keys(unit.activities)
                    .map(function(id) { return [id, unit.activities[id].size]; })
                    .sort(function(a, b) { return b[1] - a[1]; });
                if (sorted.length) section.appendChild(cell('h4', 'Activities students have opened', 'unit-subhead'));
                sorted.forEach(function(pair) {
                    var row = document.createElement('div');
                    row.className = 'activity-bar-row';
                    row.appendChild(cell('div', self.ACTIVITY_NAMES[pair[0]] || self._unitTitle(pair[0]), 'activity-bar-label'));
                    var track = document.createElement('div');
                    track.className = 'activity-bar-track';
                    var fill = document.createElement('div');
                    fill.className = 'activity-bar-fill';
                    fill.style.width = Math.round((pair[1] / Math.max(1, started.length)) * 100) + '%';
                    track.appendChild(fill);
                    row.appendChild(track);
                    row.appendChild(cell('div', pair[1] + ' of ' + started.length, 'activity-bar-count'));
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
                var warnings = self._scoreWarningBadges(entry);
                for (var w = 0; w < warnings.length; w++) {
                    var pill = document.createElement('span');
                    pill.textContent = warnings[w].label;
                    pill.style.cssText = 'display:inline-block;margin-left:6px;padding:2px 8px;border-radius:10px;font-size:0.7em;font-weight:600;background:' + warnings[w].bg + ';color:' + warnings[w].color + ';vertical-align:middle;';
                    tdScore.appendChild(pill);
                }
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
        var self = this;

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
            desc.textContent = 'Vocab (\u00d710) + Test Score + Study Time (diminishing) + Map Bonus = Total';
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
                var warnings = self._scoreWarningBadges(entry);
                for (var w = 0; w < warnings.length; w++) {
                    var pill = document.createElement('span');
                    pill.textContent = warnings[w].label;
                    pill.style.cssText = 'display:inline-block;margin-left:6px;padding:2px 8px;border-radius:10px;font-size:0.7em;font-weight:600;background:' + warnings[w].bg + ';color:' + warnings[w].color + ';vertical-align:middle;';
                    tdScore.appendChild(pill);
                }
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

        // Recovery word status — best-effort lookup, doesn't block modal render
        var rwGroup = document.createElement('div');
        rwGroup.className = 'form-group';
        var rwLabel = document.createElement('label');
        rwLabel.textContent = 'Recovery word';
        rwGroup.appendChild(rwLabel);
        var rwStatus = document.createElement('div');
        rwStatus.style.cssText = 'display:flex;align-items:center;gap:10px;font-size:0.9em;';
        rwStatus.textContent = 'Checking…';
        rwGroup.appendChild(rwStatus);
        body.appendChild(rwGroup);

        (async function() {
            try {
                var res = await Dashboard.supabase
                    .from('students')
                    .select('recovery_word_hash, recovery_word_set_at')
                    .eq('id', student.id)
                    .maybeSingle();
                if (res.error || !res.data) {
                    rwStatus.textContent = 'Unknown';
                    return;
                }
                while (rwStatus.firstChild) rwStatus.removeChild(rwStatus.firstChild);
                var badge = document.createElement('span');
                if (res.data.recovery_word_hash) {
                    badge.textContent = '✓ Set';
                    badge.style.cssText = 'color:#2f855a;font-weight:600;';
                } else {
                    badge.textContent = 'Not set';
                    badge.style.cssText = 'color:#c0392b;font-weight:600;';
                }
                rwStatus.appendChild(badge);
                if (res.data.recovery_word_hash) {
                    var resetBtn = document.createElement('button');
                    resetBtn.type = 'button';
                    resetBtn.className = 'btn btn-danger-small';
                    resetBtn.textContent = 'Reset';
                    resetBtn.title = 'Clear the student’s recovery word so they can pick a new one';
                    var resetConfirmed = false;
                    resetBtn.addEventListener('click', async function() {
                        if (!resetConfirmed) {
                            resetConfirmed = true;
                            resetBtn.textContent = 'Click again to confirm';
                            setTimeout(function() {
                                resetConfirmed = false;
                                resetBtn.textContent = 'Reset';
                            }, 4000);
                            return;
                        }
                        resetBtn.disabled = true;
                        resetBtn.textContent = 'Resetting…';
                        try {
                            await Dashboard.supabase
                                .from('students')
                                .update({ recovery_word_hash: null, recovery_word_set_at: null })
                                .eq('id', student.id);
                            badge.textContent = 'Not set';
                            badge.style.cssText = 'color:#c0392b;font-weight:600;';
                            if (resetBtn.parentNode) resetBtn.parentNode.removeChild(resetBtn);
                        } catch (e) {
                            resetBtn.disabled = false;
                            resetBtn.textContent = 'Reset failed — try again';
                            console.error('Reset recovery word failed:', e);
                        }
                    });
                    rwStatus.appendChild(resetBtn);
                }
            } catch (e) {
                rwStatus.textContent = 'Could not load';
            }
        })();

        // Restore code (read-only) — for students who lose their browser session
        var restoreGroup = document.createElement('div');
        restoreGroup.className = 'form-group';
        var restoreLabel = document.createElement('label');
        restoreLabel.textContent = 'Restore code';
        restoreGroup.appendChild(restoreLabel);
        var restoreHelp = document.createElement('div');
        restoreHelp.style.cssText = 'font-size:0.85em;color:#718096;margin:-2px 0 6px;';
        restoreHelp.textContent = 'If this student loses their browser data, they can paste this code into the "Switching computers?" restore screen to recover their progress.';
        restoreGroup.appendChild(restoreHelp);
        var restoreRow = document.createElement('div');
        restoreRow.style.cssText = 'display:flex;gap:8px;align-items:center;';
        var restoreInput = document.createElement('input');
        restoreInput.type = 'text';
        restoreInput.value = student.id;
        restoreInput.readOnly = true;
        restoreInput.style.cssText = 'flex:1;font-family:ui-monospace,Consolas,monospace;font-size:0.85em;';
        restoreInput.addEventListener('click', function() { restoreInput.select(); });
        restoreRow.appendChild(restoreInput);
        var copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-primary btn-sm';
        copyBtn.type = 'button';
        copyBtn.textContent = 'Copy';
        copyBtn.addEventListener('click', function() {
            navigator.clipboard.writeText(student.id).then(function() {
                copyBtn.textContent = 'Copied ✓';
                setTimeout(function() { copyBtn.textContent = 'Copy'; }, 1500);
            }).catch(function() {
                restoreInput.select();
                copyBtn.textContent = 'Select + Cmd-C';
            });
        });
        restoreRow.appendChild(copyBtn);
        restoreGroup.appendChild(restoreRow);
        body.appendChild(restoreGroup);

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
    },

    // ---- Wiki Entries Tab ----

    async loadWikiEntries(filters) {
        var container = document.getElementById('wiki-container');
        container.textContent = '';
        container.appendChild(this._loading());

        try {
            // Query all wiki entry progress records
            var query = this.supabase
                .from('progress')
                .select('student_id, unit_id, data, updated_at')
                .eq('activity', 'learn-mode-wiki-entries');

            if (filters && filters.classId) {
                var studentIds = await this.supabase.from('students').select('id').eq('class_id', filters.classId);
                if (studentIds.error) throw studentIds.error;
                if (studentIds.data && studentIds.data.length > 0) {
                    query = query.in('student_id', studentIds.data.map(s => s.id));
                }
            }

            if (filters && filters.unitId) {
                query = query.eq('unit_id', filters.unitId);
            }

            var { data: progressRows, error } = await query;
            if (error) throw error;

            // Get student names
            var allStudentIds = (progressRows || []).map(r => r.student_id).filter(Boolean);
            var uniqueStudentIds = allStudentIds.filter((id, idx) => allStudentIds.indexOf(id) === idx);
            var studentNames = {};
            if (uniqueStudentIds.length > 0) {
                var { data: students } = await this.supabase
                    .from('students')
                    .select('id, name')
                    .in('id', uniqueStudentIds);
                if (students) {
                    students.forEach(s => {
                        studentNames[s.id] = s.name || 'Unknown';
                    });
                }
            }

            // Flatten all entries from all students
            var allEntries = [];
            (progressRows || []).forEach(row => {
                var entries = row.data;
                if (!Array.isArray(entries)) return;
                entries.forEach(entry => {
                    allEntries.push({
                        studentId: row.student_id,
                        studentName: studentNames[row.student_id] || entry.author || 'Unknown',
                        unitId: row.unit_id,
                        term: entry.term || 'Unknown term',
                        text: entry.text || '',
                        date: entry.date || new Date(entry.timestamp || 0).toLocaleDateString(),
                        timestamp: entry.timestamp || 0,
                        starred: entry.starred || false
                    });
                });
            });

            // Sort by most recent first
            allEntries.sort((a, b) => b.timestamp - a.timestamp);

            container.textContent = '';

            // Header
            var header = document.createElement('div');
            header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;';

            var title = document.createElement('h2');
            title.textContent = 'Wiki Entries (' + allEntries.length + ')';
            title.style.cssText = 'margin:0;font-size:1.3rem;color:var(--text);';
            header.appendChild(title);

            // Group by term selector
            var groupSelect = document.createElement('select');
            groupSelect.style.cssText = 'padding:8px 12px;border-radius:var(--radius);border:1px solid var(--border);font-family:inherit;font-size:0.9rem;';
            var allOption = document.createElement('option');
            allOption.value = '';
            allOption.textContent = 'All terms';
            groupSelect.appendChild(allOption);

            var termSet = {};
            allEntries.forEach(e => { termSet[e.term] = (termSet[e.term] || 0) + 1; });
            Object.keys(termSet).sort().forEach(term => {
                var opt = document.createElement('option');
                opt.value = term;
                opt.textContent = term + ' (' + termSet[term] + ')';
                groupSelect.appendChild(opt);
            });

            groupSelect.addEventListener('change', () => {
                this._renderWikiEntries(container, allEntries, groupSelect.value, header);
            });
            header.appendChild(groupSelect);

            container.appendChild(header);
            this._renderWikiEntries(container, allEntries, '', header);

        } catch (err) {
            container.textContent = '';
            container.appendChild(this._emptyState('fas fa-exclamation-circle', 'Could not load wiki entries: ' + (err.message || 'Unknown error')));
        }
    },

    // ---- Responses tab ----
    // Students' written answers from Short Answer, the Response Builder and the
    // textbook's Read More Checks (table `responses`, teacher-only reads; see
    // database/migrate-responses.sql). The unit and class filters at the top
    // apply; the star marks a response as a good example.

    async loadResponses(filters) {
        var container = document.getElementById('responses-container');
        container.textContent = '';
        container.appendChild(this._loading());
        try {
            var q = this.supabase
                .from('responses')
                .select('id, student_name, class_code, unit_id, source, item_key, question_text, answer_text, word_count, featured, updated_at')
                .order('updated_at', { ascending: false })
                .limit(1000);
            if (filters && filters.unitId) q = q.eq('unit_id', filters.unitId);
            var code = filters && filters.classId && this._classCodeById ? this._classCodeById[filters.classId] : null;
            if (code) q = q.eq('class_code', code);
            if (filters && filters.dateStart) q = q.gte('updated_at', filters.dateStart);
            if (filters && filters.dateEnd) q = q.lte('updated_at', filters.dateEnd + 'T23:59:59');
            var { data, error } = await q;
            if (error) throw error;
            container.textContent = '';
            this._renderResponses(container, data || []);
        } catch (err) {
            container.textContent = '';
            container.appendChild(this._emptyState('fas fa-exclamation-circle', 'Could not load responses: ' + (err.message || 'Unknown error') + '. If the table is missing, run database/migrate-responses.sql.'));
        }
    },

    _renderResponses(container, rows) {
        var self = this;
        var bar = document.createElement('div');
        bar.className = 'feedback-filter-bar responses-filter-bar';

        function addSelect(labelText, options) {
            var label = document.createElement('label');
            label.textContent = labelText;
            var sel = document.createElement('select');
            options.forEach(function(o) {
                var opt = document.createElement('option');
                opt.value = o.value; opt.textContent = o.label;
                sel.appendChild(opt);
            });
            label.appendChild(sel);
            bar.appendChild(label);
            return sel;
        }

        var sourceSel = addSelect('Source ', [
            { value: 'all', label: 'All' },
            { value: 'short-answer', label: 'Short Answer' },
            { value: 'read-more', label: 'Read More Checks' },
            { value: 'reading', label: 'Reading questions' },
            { value: 'wiki', label: 'Wiki entries' }
        ]);

        // One entry per question, labeled with its text, newest question first.
        var items = [], seen = {};
        rows.forEach(function(r) {
            var k = r.unit_id + '|' + r.source + '|' + r.item_key;
            if (seen[k]) return;
            seen[k] = true;
            var label = (r.source === 'read-more' ? 'Read More: ' : r.source === 'reading' ? 'Reading: ' : 'Short Answer ' + (parseInt(r.item_key, 10) + 1) + ': ') + (r.question_text || r.item_key);
            if (label.length > 90) label = label.slice(0, 87) + '...';
            items.push({ value: k, label: label, source: r.source });
        });
        items.sort(function(a, b) { return a.label.localeCompare(b.label); });
        var itemSel = addSelect('Question ', [{ value: 'all', label: 'All questions' }].concat(items));

        var featLabel = document.createElement('label');
        var featBox = document.createElement('input');
        featBox.type = 'checkbox';
        featLabel.appendChild(featBox);
        featLabel.appendChild(document.createTextNode(' Starred only'));
        bar.appendChild(featLabel);

        var countSpan = document.createElement('span');
        countSpan.className = 'feedback-count';
        bar.appendChild(countSpan);
        container.appendChild(bar);

        var empty = this._emptyState('fas fa-pen-nib', 'No responses yet. They appear here when signed-in students send a Short Answer, a Response Builder answer, a Read More Check or a reading question.');
        container.appendChild(empty);
        var list = document.createElement('div');
        list.className = 'feedback-list';
        container.appendChild(list);
        var wikiBox = document.getElementById('wiki-container');
        var itemLabel = itemSel.parentNode;

        function repaint() {
            var src = sourceSel.value, item = itemSel.value, feat = featBox.checked;
            // Wiki entries are a different kind of record (Learn Mode's bonus writing,
            // kept with progress). Choosing them swaps the list for the wiki view.
            var wiki = src === 'wiki';
            if (wikiBox) wikiBox.classList.toggle('hidden', !wiki);
            list.classList.toggle('hidden', wiki);
            itemLabel.classList.toggle('hidden', wiki);
            featLabel.classList.toggle('hidden', wiki);
            countSpan.classList.toggle('hidden', wiki);
            empty.classList.toggle('hidden', wiki || rows.length > 0);
            if (wiki) { self.loadWikiEntries(self.getFilters()); return; }
            Array.prototype.forEach.call(itemSel.options, function(o) {
                if (o.value === 'all') return;
                o.hidden = src !== 'all' && o.value.split('|')[1] !== src;
            });
            if (itemSel.selectedOptions[0] && itemSel.selectedOptions[0].hidden) { itemSel.value = 'all'; item = 'all'; }
            var shown = rows.filter(function(r) {
                if (src !== 'all' && r.source !== src) return false;
                if (item !== 'all' && (r.unit_id + '|' + r.source + '|' + r.item_key) !== item) return false;
                if (feat && !r.featured) return false;
                return true;
            });
            countSpan.textContent = '(' + shown.length + ')';
            list.textContent = '';
            shown.forEach(function(r) {
                list.appendChild(self._buildResponseRow(r, function() {
                    var at = rows.indexOf(r);
                    if (at !== -1) rows.splice(at, 1);
                    repaint();
                }));
            });
        }
        [sourceSel, itemSel, featBox].forEach(function(el) { el.addEventListener('change', repaint); });
        repaint();
    },

    _buildResponseRow(r, onDeleted) {
        var self = this;
        var row = document.createElement('div');
        row.className = 'feedback-row response-row' + (r.featured ? ' response-featured' : '');

        var header = document.createElement('div');
        header.className = 'feedback-row-header';

        var star = document.createElement('button');
        star.type = 'button';
        star.className = 'response-star';
        var paintStar = function() {
            star.textContent = '';
            var i = document.createElement('i');
            i.className = (r.featured ? 'fas' : 'far') + ' fa-star';
            star.appendChild(i);
            star.title = r.featured ? 'Starred as a good example. Click to unstar.' : 'Star as a good example';
            star.setAttribute('aria-pressed', r.featured ? 'true' : 'false');
            row.classList.toggle('response-featured', !!r.featured);
        };
        paintStar();
        star.addEventListener('click', async function() {
            star.disabled = true;
            var next = !r.featured;
            var { error } = await self.supabase.from('responses').update({ featured: next }).eq('id', r.id);
            star.disabled = false;
            if (error) { alert('Could not save the star: ' + error.message); return; }
            r.featured = next;
            paintStar();
        });
        header.appendChild(star);

        var badge = document.createElement('span');
        badge.className = 'feedback-type-badge response-source-' + r.source;
        badge.textContent = r.source === 'read-more' ? 'Read More' : r.source === 'reading' ? 'Reading' : 'Short Answer';
        header.appendChild(badge);

        var who = document.createElement('span');
        who.className = 'feedback-row-who';
        who.textContent = (r.student_name || 'Unnamed student') + (r.class_code ? ' · ' + r.class_code : '');
        header.appendChild(who);

        var meta = document.createElement('span');
        meta.className = 'feedback-row-meta';
        meta.textContent = [r.unit_id, r.word_count + ' words', this._formatFeedbackDate(r.updated_at)].join(' · ');
        header.appendChild(meta);

        // Delete one answer (a test, a mistake, something sent to the wrong class).
        // The database lets only a teacher do this.
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'response-delete';
        del.title = 'Delete this answer';
        del.setAttribute('aria-label', 'Delete this answer from ' + (r.student_name || 'this student'));
        var delIcon = document.createElement('i');
        delIcon.className = 'fas fa-trash-alt';
        del.appendChild(delIcon);
        del.addEventListener('click', async function() {
            if (!confirm('Delete this answer from ' + (r.student_name || 'this student') + '? This cannot be undone.')) return;
            del.disabled = true;
            // .select() returns the rows actually removed, so a refusal by the database is not mistaken for success
            var res = await self.supabase.from('responses').delete().eq('id', r.id).select('id');
            del.disabled = false;
            if (res.error) { alert('Could not delete the answer: ' + res.error.message); return; }
            if (!res.data || !res.data.length) { alert('The answer was not deleted. Sign in to the dashboard again and try once more.'); return; }
            if (onDeleted) onDeleted(); else row.remove();
        });
        header.appendChild(del);
        row.appendChild(header);

        if (r.question_text) {
            var qEl = document.createElement('div');
            qEl.className = 'response-question';
            qEl.textContent = r.question_text;
            row.appendChild(qEl);
        }
        var a = document.createElement('div');
        a.className = 'feedback-row-desc';
        a.textContent = r.answer_text;
        row.appendChild(a);
        return row;
    },

    // ---- Feedback tab ----

    async loadFeedback() {
        var container = document.getElementById('feedback-container');
        container.textContent = '';
        container.appendChild(this._loading());

        try {
            var { data, error } = await this.supabase
                .from('feedback')
                .select('id, student_name, class_code, class_name, type, description, context, activity, unit_id, app_version, created_at')
                .order('created_at', { ascending: false })
                .limit(500);
            if (error) throw error;

            container.textContent = '';
            this._renderFeedback(container, data || []);
        } catch (err) {
            container.textContent = '';
            container.appendChild(this._emptyState('fas fa-exclamation-circle', 'Could not load feedback: ' + (err.message || 'Unknown error')));
        }
    },

    _renderFeedback(container, entries) {
        // Filter row
        var filterBar = document.createElement('div');
        filterBar.className = 'feedback-filter-bar';
        var filterLabel = document.createElement('label');
        filterLabel.textContent = 'Show: ';
        filterBar.appendChild(filterLabel);
        var filterSelect = document.createElement('select');
        [
            { value: 'all', label: 'All' },
            { value: 'bug', label: 'Bugs only' },
            { value: 'suggestion', label: 'Suggestions only' }
        ].forEach(function(o) {
            var opt = document.createElement('option');
            opt.value = o.value;
            opt.textContent = o.label;
            filterSelect.appendChild(opt);
        });
        filterBar.appendChild(filterSelect);
        var countSpan = document.createElement('span');
        countSpan.className = 'feedback-count';
        filterBar.appendChild(countSpan);
        container.appendChild(filterBar);

        if (entries.length === 0) {
            container.appendChild(this._emptyState('fas fa-inbox', 'No feedback yet.'));
            return;
        }

        var listWrap = document.createElement('div');
        listWrap.className = 'feedback-list';
        container.appendChild(listWrap);

        var self = this;
        function repaint() {
            var which = filterSelect.value;
            var filtered = entries.filter(function(e) { return which === 'all' || e.type === which; });
            countSpan.textContent = '(' + filtered.length + ')';
            while (listWrap.firstChild) listWrap.removeChild(listWrap.firstChild);
            filtered.forEach(function(e) { listWrap.appendChild(self._buildFeedbackRow(e)); });
        }
        filterSelect.addEventListener('change', repaint);
        repaint();
    },

    _buildFeedbackRow(entry) {
        var row = document.createElement('div');
        row.className = 'feedback-row feedback-row-' + entry.type;

        var header = document.createElement('div');
        header.className = 'feedback-row-header';

        var typeBadge = document.createElement('span');
        typeBadge.className = 'feedback-type-badge feedback-type-' + entry.type;
        typeBadge.textContent = entry.type === 'bug' ? 'Bug' : 'Suggestion';
        header.appendChild(typeBadge);

        var who = document.createElement('span');
        who.className = 'feedback-row-who';
        who.textContent = entry.student_name || 'Anonymous';
        if (entry.class_code || entry.class_name) {
            who.textContent += ' · ' + (entry.class_name || entry.class_code);
        }
        header.appendChild(who);

        var meta = document.createElement('span');
        meta.className = 'feedback-row-meta';
        var metaParts = [];
        if (entry.unit_id) metaParts.push(entry.unit_id);
        if (entry.activity) metaParts.push(entry.activity);
        if (entry.app_version) metaParts.push('v' + entry.app_version);
        metaParts.push(this._formatFeedbackDate(entry.created_at));
        meta.textContent = metaParts.join(' · ');
        header.appendChild(meta);

        row.appendChild(header);

        var desc = document.createElement('div');
        desc.className = 'feedback-row-desc';
        desc.textContent = entry.description;
        row.appendChild(desc);

        if (entry.context) {
            var ctx = document.createElement('div');
            ctx.className = 'feedback-row-ctx';
            var ctxLabel = document.createElement('strong');
            ctxLabel.textContent = 'Context: ';
            ctx.appendChild(ctxLabel);
            ctx.appendChild(document.createTextNode(entry.context));
            row.appendChild(ctx);
        }

        return row;
    },

    _formatFeedbackDate(iso) {
        if (!iso) return '';
        var d = this._when(iso);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    },

    _renderWikiEntries(container, allEntries, filterTerm, header) {
        // Remove old entries list if present
        var oldList = container.querySelector('.wiki-entries-list');
        if (oldList) oldList.remove();

        var filtered = filterTerm ? allEntries.filter(e => e.term === filterTerm) : allEntries;

        if (filtered.length === 0) {
            var empty = this._emptyState('fas fa-pen-fancy', 'No wiki entries yet. Students can write entries after completing Learn Mode sessions.');
            empty.className = 'wiki-entries-list';
            container.appendChild(empty);
            return;
        }

        var list = document.createElement('div');
        list.className = 'wiki-entries-list';
        list.style.cssText = 'display:flex;flex-direction:column;gap:12px;';

        filtered.forEach(entry => {
            var card = document.createElement('div');
            card.style.cssText = 'background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:16px 20px;';

            // Top row: term + student + date
            var topRow = document.createElement('div');
            topRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;';

            var termBadge = document.createElement('span');
            termBadge.textContent = entry.term;
            termBadge.style.cssText = 'background:var(--primary);color:white;padding:3px 10px;border-radius:12px;font-size:0.8rem;font-weight:600;';
            topRow.appendChild(termBadge);

            var meta = document.createElement('span');
            meta.textContent = entry.studentName + ' \u00B7 ' + entry.date;
            meta.style.cssText = 'color:var(--text-light);font-size:0.85rem;';
            topRow.appendChild(meta);

            card.appendChild(topRow);

            // Entry text
            var textEl = document.createElement('p');
            textEl.textContent = entry.text;
            textEl.style.cssText = 'margin:0;line-height:1.6;color:var(--text);font-size:0.95rem;';
            card.appendChild(textEl);

            list.appendChild(card);
        });

        container.appendChild(list);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => Dashboard.init());
