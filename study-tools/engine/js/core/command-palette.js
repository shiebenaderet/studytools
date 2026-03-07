const CommandPalette = {
    isOpen: false,
    selectedIndex: 0,
    commands: [],
    filteredCommands: [],
    teacherMode: false,
    teacherSecret: 'teacher',

    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.selectedIndex = 0;
        this.commands = this.buildCommands();
        this.filteredCommands = this.commands;
        this.render();
    },

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        const overlay = document.getElementById('command-palette-overlay');
        if (overlay) overlay.remove();
    },

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    },

    buildCommands() {
        const cmds = [];

        // Navigation
        cmds.push({ id: 'nav-home', label: 'Go to Home', icon: 'fas fa-home', category: 'Navigation', action: () => { document.querySelector('.nav-btn[data-group="home"]')?.click(); } });
        cmds.push({ id: 'nav-study', label: 'Go to Study', icon: 'fas fa-book', category: 'Navigation', action: () => { document.querySelector('.nav-btn[data-group="study"]')?.click(); } });
        cmds.push({ id: 'nav-practice', label: 'Go to Practice', icon: 'fas fa-clipboard-check', category: 'Navigation', action: () => { document.querySelector('.nav-btn[data-group="practice"]')?.click(); } });
        cmds.push({ id: 'nav-games', label: 'Go to Games', icon: 'fas fa-gamepad', category: 'Navigation', action: () => { document.querySelector('.nav-btn[data-group="games"]')?.click(); } });
        cmds.push({ id: 'nav-tools', label: 'Go to Tools', icon: 'fas fa-tools', category: 'Navigation', action: () => { document.querySelector('.nav-btn[data-group="tools"]')?.click(); } });

        // Activities
        if (typeof StudyEngine !== 'undefined' && StudyEngine.activities) {
            Object.values(StudyEngine.activities).forEach(a => {
                cmds.push({
                    id: 'activity-' + a.id,
                    label: a.name,
                    icon: a.icon,
                    category: (a.category || 'games').charAt(0).toUpperCase() + (a.category || 'games').slice(1),
                    action: () => { StudyEngine.activateActivity(a.id); }
                });
            });
        }

        // Tools
        cmds.push({ id: 'tool-notes', label: 'My Study Guide', icon: 'fas fa-edit', category: 'Tools', action: () => { StudyTools.openNotes(); } });
        cmds.push({ id: 'tool-timer', label: 'Focused Study Timer', icon: 'fas fa-hourglass', category: 'Tools', action: () => { StudyTools.openTimer(); } });
        cmds.push({ id: 'tool-print', label: 'Print Study Guide', icon: 'fas fa-print', category: 'Tools', action: () => { StudyTools.openPrint(); } });
        cmds.push({ id: 'tool-export', label: 'Export Progress', icon: 'fas fa-download', category: 'Tools', action: () => { StudyTools.exportProgress(); } });

        // Shortcuts help
        cmds.push({ id: 'shortcuts', label: 'Keyboard Shortcuts', icon: 'fas fa-keyboard', category: 'Help', action: () => { this.showShortcuts(); } });

        // Dyslexic font toggle
        cmds.push({ id: 'dyslexic', label: 'Toggle Dyslexic Font', icon: 'fas fa-font', category: 'Accessibility', action: () => { document.getElementById('dyslexic-toggle')?.click(); } });

        return cmds;
    },

    render() {
        const existing = document.getElementById('command-palette-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'command-palette-overlay';
        overlay.className = 'cmd-palette-overlay';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.close();
        });

        const palette = document.createElement('div');
        palette.className = 'cmd-palette';

        // Search input row
        const inputWrap = document.createElement('div');
        inputWrap.className = 'cmd-palette-input-wrap';

        const searchIcon = document.createElement('i');
        searchIcon.className = 'fas fa-search cmd-palette-search-icon';
        inputWrap.appendChild(searchIcon);

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'cmd-palette-input';
        input.placeholder = 'Type a command...';
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('spellcheck', 'false');
        inputWrap.appendChild(input);

        const hint = document.createElement('span');
        hint.className = 'cmd-palette-hint';
        hint.textContent = 'esc to close';
        inputWrap.appendChild(hint);

        palette.appendChild(inputWrap);

        // Results list
        const list = document.createElement('div');
        list.className = 'cmd-palette-list';
        list.id = 'cmd-palette-list';
        palette.appendChild(list);

        overlay.appendChild(palette);
        document.body.appendChild(overlay);

        this.renderList(list);

        requestAnimationFrame(() => input.focus());

        // Input handler
        input.addEventListener('input', () => {
            const query = input.value.trim().toLowerCase();

            // Check for teacher secret code
            if (query === this.teacherSecret) {
                this.close();
                this.openTeacherLogin();
                return;
            }

            if (query === '') {
                this.filteredCommands = this.commands;
            } else {
                this.filteredCommands = this.commands.filter(cmd => {
                    return cmd.label.toLowerCase().includes(query) ||
                           cmd.category.toLowerCase().includes(query);
                });
            }
            this.selectedIndex = 0;
            this.renderList(list);
        });

        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredCommands.length - 1);
                this.renderList(list);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
                this.renderList(list);
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                const cmd = this.filteredCommands[this.selectedIndex];
                if (cmd) {
                    this.close();
                    cmd.action();
                }
                return;
            }
        });
    },

    renderList(container) {
        container.textContent = '';

        if (this.filteredCommands.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'cmd-palette-empty';
            empty.textContent = 'No commands found';
            container.appendChild(empty);
            return;
        }

        let lastCategory = '';
        this.filteredCommands.forEach((cmd, idx) => {
            if (cmd.category !== lastCategory) {
                lastCategory = cmd.category;
                const header = document.createElement('div');
                header.className = 'cmd-palette-category';
                header.textContent = cmd.category;
                container.appendChild(header);
            }

            const item = document.createElement('div');
            item.className = 'cmd-palette-item' + (idx === this.selectedIndex ? ' selected' : '');

            const icon = document.createElement('i');
            icon.className = cmd.icon + ' cmd-palette-item-icon';
            item.appendChild(icon);

            const label = document.createElement('span');
            label.className = 'cmd-palette-item-label';
            label.textContent = cmd.label;
            item.appendChild(label);

            item.addEventListener('click', () => {
                this.close();
                cmd.action();
            });

            item.addEventListener('mouseenter', () => {
                this.selectedIndex = idx;
                container.querySelectorAll('.cmd-palette-item').forEach((el, i) => {
                    el.classList.toggle('selected', i === idx);
                });
            });

            container.appendChild(item);
        });

        const selected = container.querySelector('.cmd-palette-item.selected');
        if (selected) selected.scrollIntoView({ block: 'nearest' });
    },

    showShortcuts() {
        const shortcuts = [
            { key: '/ or Cmd+K', desc: 'Open command palette' },
            { key: '?', desc: 'Keyboard shortcuts' },
            { key: 'Esc', desc: 'Close modal / palette' },
            { key: '1', desc: 'Go to Home' },
            { key: '2', desc: 'Go to Study' },
            { key: '3', desc: 'Go to Practice' },
            { key: '4', desc: 'Go to Games' },
            { key: '5', desc: 'Go to Tools' }
        ];

        if (StudyEngine.activeActivity) {
            const activityShortcuts = this.getActivityShortcuts(StudyEngine.activeActivity);
            if (activityShortcuts.length > 0) {
                shortcuts.push(...activityShortcuts);
            }
        }

        // Build modal content using DOM methods
        const wrapper = document.createElement('div');

        // Header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'modal-header';
        const h2 = document.createElement('h2');
        const kbIcon = document.createElement('i');
        kbIcon.className = 'fas fa-keyboard';
        h2.appendChild(kbIcon);
        h2.appendChild(document.createTextNode(' Keyboard Shortcuts'));
        headerDiv.appendChild(h2);
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.textContent = '\u00D7';
        closeBtn.addEventListener('click', () => StudyEngine.closeModal());
        headerDiv.appendChild(closeBtn);
        wrapper.appendChild(headerDiv);

        // Shortcuts grid
        const grid = document.createElement('div');
        grid.className = 'shortcuts-list';

        shortcuts.forEach(s => {
            const item = document.createElement('div');
            item.className = 'shortcut-item';

            const keyEl = document.createElement('span');
            keyEl.className = 'shortcut-key';
            keyEl.textContent = s.key;
            item.appendChild(keyEl);

            const descEl = document.createElement('div');
            descEl.className = 'shortcut-description';
            descEl.textContent = s.desc;
            item.appendChild(descEl);

            grid.appendChild(item);
        });

        wrapper.appendChild(grid);

        // Tip
        const tip = document.createElement('div');
        tip.style.cssText = 'margin-top:16px;text-align:center;color:var(--text-muted);font-size:0.85em;';
        tip.textContent = 'Tip: Press / anytime to search commands';
        wrapper.appendChild(tip);

        // Show in modal
        const overlay = document.getElementById('modal-overlay');
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.appendChild(wrapper);
        overlay.textContent = '';
        overlay.appendChild(content);
        overlay.classList.add('active');
    },

    getActivityShortcuts(activityId) {
        const map = {
            'flashcards': [
                { key: 'Space', desc: 'Flip card' },
                { key: '1-4', desc: 'Rate: Again / Hard / Good / Easy' }
            ],
            'practice-test': [
                { key: '1-4', desc: 'Select answer A-D' },
                { key: 'Enter', desc: 'Next question' }
            ],
            'hangman': [
                { key: 'A-Z', desc: 'Guess a letter' }
            ],
            'wordle': [
                { key: 'A-Z', desc: 'Type a letter' },
                { key: 'Enter', desc: 'Submit guess' },
                { key: 'Backspace', desc: 'Delete letter' }
            ]
        };
        return map[activityId] || [];
    },

    // --- Teacher Dashboard ---

    openTeacherLogin() {
        // Build modal using DOM methods
        const overlay = document.getElementById('modal-overlay');
        const content = document.createElement('div');
        content.className = 'modal-content';

        // Header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'modal-header';
        const h2 = document.createElement('h2');
        const tchIcon = document.createElement('i');
        tchIcon.className = 'fas fa-chalkboard-teacher';
        h2.appendChild(tchIcon);
        h2.appendChild(document.createTextNode(' Teacher Dashboard'));
        headerDiv.appendChild(h2);
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.textContent = '\u00D7';
        closeBtn.addEventListener('click', () => StudyEngine.closeModal());
        headerDiv.appendChild(closeBtn);
        content.appendChild(headerDiv);

        // Description
        const desc = document.createElement('p');
        desc.style.cssText = 'color:var(--text-secondary);margin-bottom:20px;';
        desc.textContent = 'Enter your email to receive a login link.';
        content.appendChild(desc);

        // Form
        const form = document.createElement('div');
        form.style.cssText = 'display:flex;flex-direction:column;gap:15px;';

        const emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.id = 'teacher-email';
        emailInput.placeholder = 'teacher@school.edu';
        emailInput.style.cssText = 'background:var(--bg-surface);color:var(--text-primary);border:2px solid var(--border-card);padding:12px;border-radius:8px;font-size:1em;';
        form.appendChild(emailInput);

        const loginBtn = document.createElement('button');
        loginBtn.className = 'nav-button';
        loginBtn.id = 'teacher-login-btn';
        loginBtn.style.cssText = 'width:100%;padding:12px;font-size:1em;';
        loginBtn.textContent = 'Send Magic Link';
        form.appendChild(loginBtn);

        const statusEl = document.createElement('div');
        statusEl.id = 'teacher-login-status';
        statusEl.style.cssText = 'text-align:center;color:var(--text-secondary);display:none;';
        form.appendChild(statusEl);

        content.appendChild(form);

        overlay.textContent = '';
        overlay.appendChild(content);
        overlay.classList.add('active');

        // Wire up
        requestAnimationFrame(() => {
            emailInput.focus();
            emailInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') loginBtn.click();
            });

            loginBtn.addEventListener('click', async () => {
                const email = emailInput.value.trim();
                if (!email) return;

                loginBtn.disabled = true;
                loginBtn.textContent = 'Sending...';

                try {
                    await this.sendMagicLink(email);
                    statusEl.style.display = 'block';
                    statusEl.style.color = 'var(--success)';
                    statusEl.textContent = 'Check your email for the login link!';
                    loginBtn.textContent = 'Link Sent';
                } catch (err) {
                    statusEl.style.display = 'block';
                    statusEl.style.color = 'var(--danger)';
                    statusEl.textContent = err.message || 'Failed to send link. Try again.';
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Send Magic Link';
                }
            });
        });
    },

    // Allowed email domains for teacher access
    allowedDomains: ['edmonds.wednet.edu'],

    async sendMagicLink(email) {
        if (!ProgressManager.supabase) {
            this.showPasswordFallback(email);
            return;
        }

        // Validate email domain
        var domain = email.split('@')[1];
        if (!domain || this.allowedDomains.indexOf(domain.toLowerCase()) === -1) {
            throw new Error('Access restricted to approved school email addresses.');
        }

        const { error } = await ProgressManager.supabase.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: window.location.href
            }
        });

        if (error) {
            // If OTP not enabled, fall back to password
            if (error.message && error.message.includes('not enabled')) {
                this.showPasswordFallback(email);
                return;
            }
            throw error;
        }
    },

    showPasswordFallback(email) {
        const emailInput = document.getElementById('teacher-email');
        const statusEl = document.getElementById('teacher-login-status');
        const loginBtn = document.getElementById('teacher-login-btn');

        if (emailInput) {
            emailInput.type = 'password';
            emailInput.placeholder = 'Password';
            emailInput.value = '';
            emailInput.focus();
        }

        if (statusEl) {
            statusEl.style.display = 'block';
            statusEl.style.color = 'var(--text-secondary)';
            statusEl.textContent = 'Enter password to log in.';
        }

        if (loginBtn) {
            loginBtn.textContent = 'Log In';
            loginBtn.disabled = false;

            const newBtn = loginBtn.cloneNode(true);
            loginBtn.parentNode.replaceChild(newBtn, loginBtn);

            newBtn.addEventListener('click', async () => {
                const password = emailInput?.value.trim();
                if (!password) return;

                newBtn.disabled = true;
                newBtn.textContent = 'Logging in...';

                try {
                    const { error } = await ProgressManager.supabase.auth.signInWithPassword({
                        email: email,
                        password: password
                    });

                    if (error) throw error;

                    StudyEngine.closeModal();
                    this.teacherMode = true;
                    this.openTeacherDashboard();
                } catch (err) {
                    statusEl.style.display = 'block';
                    statusEl.style.color = 'var(--danger)';
                    statusEl.textContent = err.message || 'Login failed.';
                    newBtn.disabled = false;
                    newBtn.textContent = 'Log In';
                }
            });
        }
    },

    async openTeacherDashboard() {
        if (!ProgressManager.supabase) {
            StudyUtils.showToast('Supabase not configured', 'error');
            return;
        }

        const { data: { session } } = await ProgressManager.supabase.auth.getSession();
        if (!session) {
            this.openTeacherLogin();
            return;
        }

        this.teacherMode = true;

        document.getElementById('home-section').classList.remove('active');
        document.getElementById('sub-nav').classList.remove('active');
        const container = document.getElementById('activity-container');
        container.classList.add('active');
        container.textContent = '';

        // Back button
        const backBtn = document.createElement('button');
        backBtn.className = 'nav-button';
        backBtn.style.marginBottom = '16px';
        const backIcon = document.createElement('i');
        backIcon.className = 'fas fa-arrow-left';
        backBtn.appendChild(backIcon);
        backBtn.appendChild(document.createTextNode(' Back to Student View'));
        backBtn.addEventListener('click', () => {
            this.teacherMode = false;
            if (StudyEngine.config) {
                StudyEngine.showHome();
            } else {
                window.location.href = '../';
            }
        });
        container.appendChild(backBtn);

        // Dashboard header
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;';

        const title = document.createElement('h2');
        title.style.color = 'var(--text-primary)';
        const tchIcon = document.createElement('i');
        tchIcon.className = 'fas fa-chalkboard-teacher';
        title.appendChild(tchIcon);
        title.appendChild(document.createTextNode(' Teacher Dashboard'));
        header.appendChild(title);

        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'nav-button';
        logoutBtn.style.cssText = 'background:var(--bg-surface);font-size:0.85em;padding:8px 16px;';
        logoutBtn.textContent = 'Log Out';
        logoutBtn.addEventListener('click', async () => {
            await ProgressManager.supabase.auth.signOut();
            this.teacherMode = false;
            StudyUtils.showToast('Logged out', 'info');
            StudyEngine.showHome();
        });
        header.appendChild(logoutBtn);
        container.appendChild(header);

        // Filter bar
        const filterBar = document.createElement('div');
        filterBar.style.cssText = 'display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;';

        const classSelect = document.createElement('select');
        classSelect.id = 'teacher-filter-class';
        classSelect.style.cssText = 'background:var(--bg-surface);color:var(--text-primary);border:1px solid var(--border-card);padding:8px 12px;border-radius:8px;font-size:0.9em;';
        const allOpt = document.createElement('option');
        allOpt.value = '';
        allOpt.textContent = 'All Classes';
        classSelect.appendChild(allOpt);
        filterBar.appendChild(classSelect);

        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'nav-button';
        refreshBtn.style.cssText = 'font-size:0.85em;padding:8px 16px;';
        const refreshIcon = document.createElement('i');
        refreshIcon.className = 'fas fa-sync-alt';
        refreshBtn.appendChild(refreshIcon);
        refreshBtn.appendChild(document.createTextNode(' Refresh'));
        refreshBtn.addEventListener('click', () => this.loadDashboardData(container));
        filterBar.appendChild(refreshBtn);

        container.appendChild(filterBar);

        // Stats row
        const statsRow = document.createElement('div');
        statsRow.id = 'teacher-stats';
        statsRow.className = 'stats-grid';
        container.appendChild(statsRow);

        // Students table
        const tableSection = document.createElement('div');
        tableSection.id = 'teacher-students';
        tableSection.style.marginTop = '24px';
        container.appendChild(tableSection);

        // Analytics section
        var analyticsSection = document.createElement('div');
        analyticsSection.id = 'teacher-analytics';
        analyticsSection.style.marginTop = '24px';
        container.appendChild(analyticsSection);

        // Leaderboard management section
        var leaderboardSection = document.createElement('div');
        leaderboardSection.id = 'teacher-leaderboard';
        container.appendChild(leaderboardSection);

        await this.loadClasses(classSelect);
        classSelect.addEventListener('change', () => {
            this.loadDashboardData(container);
            this.loadAnalytics();
        });
        await this.loadDashboardData(container);
        await this.loadAnalytics();

        // Load leaderboard management
        if (typeof LeaderboardManager !== 'undefined') {
            await LeaderboardManager.renderTeacherSection(leaderboardSection);
        }
    },

    async loadClasses(select) {
        try {
            const { data, error } = await ProgressManager.supabase
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

    async loadDashboardData() {
        const statsRow = document.getElementById('teacher-stats');
        const tableSection = document.getElementById('teacher-students');
        const classId = document.getElementById('teacher-filter-class')?.value || null;

        if (statsRow) {
            statsRow.textContent = '';
            const loading = document.createElement('div');
            loading.style.cssText = 'grid-column:1/-1;text-align:center;color:var(--text-muted);padding:20px;';
            const spinner = document.createElement('i');
            spinner.className = 'fas fa-spinner fa-spin';
            loading.appendChild(spinner);
            loading.appendChild(document.createTextNode(' Loading...'));
            statsRow.appendChild(loading);
        }

        try {
            let studentQuery = ProgressManager.supabase.from('students').select('id, name, class_id');
            if (classId) studentQuery = studentQuery.eq('class_id', classId);
            const { data: students, error: sErr } = await studentQuery;
            if (sErr) throw sErr;

            const studentIds = (students || []).map(s => s.id);

            let sessQuery = ProgressManager.supabase
                .from('sessions')
                .select('student_id, started_at, duration_seconds');
            if (studentIds.length > 0) {
                sessQuery = sessQuery.in('student_id', studentIds);
            }
            const { data: sessions, error: sessErr } = await sessQuery;
            if (sessErr) throw sessErr;

            let progQuery = ProgressManager.supabase
                .from('progress')
                .select('student_id, activity, data');
            if (studentIds.length > 0) {
                progQuery = progQuery.in('student_id', studentIds);
            }
            const { data: progressData, error: progErr } = await progQuery;
            if (progErr) throw progErr;

            // Active this week
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const activeIds = new Set();
            let totalSeconds = 0;
            (sessions || []).forEach(s => {
                if (new Date(s.started_at) >= weekAgo) activeIds.add(s.student_id);
                totalSeconds += (s.duration_seconds || 0);
            });

            // Render stats
            if (statsRow) {
                statsRow.textContent = '';
                var statData = [
                    { label: 'Total Students', value: (students || []).length },
                    { label: 'Active This Week', value: activeIds.size },
                    { label: 'Total Study Hours', value: (totalSeconds / 3600).toFixed(1) },
                    { label: 'Avg Session', value: sessions && sessions.length > 0 ? Math.round(totalSeconds / sessions.length / 60) + ' min' : '0 min' }
                ];
                statData.forEach(function(stat) {
                    var box = document.createElement('div');
                    box.className = 'stat-box';
                    var lbl = document.createElement('div');
                    lbl.className = 'stat-label';
                    lbl.textContent = stat.label;
                    box.appendChild(lbl);
                    var val = document.createElement('div');
                    val.className = 'stat-value';
                    val.textContent = stat.value;
                    box.appendChild(val);
                    statsRow.appendChild(box);
                });
            }

            // Student table
            if (tableSection) {
                tableSection.textContent = '';

                if (!students || students.length === 0) {
                    const empty = document.createElement('p');
                    empty.style.cssText = 'text-align:center;color:var(--text-muted);padding:40px;';
                    empty.textContent = 'No students found.';
                    tableSection.appendChild(empty);
                    return;
                }

                const tableHeading = document.createElement('h3');
                tableHeading.style.cssText = 'color:var(--text-primary);margin-bottom:16px;';
                tableHeading.textContent = 'Students';
                tableSection.appendChild(tableHeading);

                // Aggregate session data
                const sessionMap = {};
                (sessions || []).forEach(s => {
                    if (!sessionMap[s.student_id]) sessionMap[s.student_id] = { total: 0, last: null };
                    sessionMap[s.student_id].total += (s.duration_seconds || 0);
                    const d = new Date(s.started_at);
                    if (!sessionMap[s.student_id].last || d > sessionMap[s.student_id].last) sessionMap[s.student_id].last = d;
                });

                // Aggregate progress data
                const progMap = {};
                (progressData || []).forEach(p => {
                    if (!progMap[p.student_id]) progMap[p.student_id] = { vocab: 0, score: null };
                    if (p.activity === 'activity_flashcards' && p.data && p.data.mastered) {
                        progMap[p.student_id].vocab += (Array.isArray(p.data.mastered) ? p.data.mastered.length : 0);
                    }
                    if (p.activity === 'activity_practice-test' && p.data && typeof p.data.bestScore === 'number') {
                        if (progMap[p.student_id].score === null || p.data.bestScore > progMap[p.student_id].score) {
                            progMap[p.student_id].score = p.data.bestScore;
                        }
                    }
                });

                const table = document.createElement('table');
                table.style.cssText = 'width:100%;border-collapse:collapse;';

                const thead = document.createElement('thead');
                const hr = document.createElement('tr');
                ['Name', 'Last Active', 'Study Time', 'Vocab', 'Best Score'].forEach(h => {
                    const th = document.createElement('th');
                    th.style.cssText = 'text-align:left;padding:12px;border-bottom:2px solid var(--border-card);color:var(--text-secondary);font-size:0.85em;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;';
                    th.textContent = h;
                    hr.appendChild(th);
                });
                thead.appendChild(hr);
                table.appendChild(thead);

                const tbody = document.createElement('tbody');
                const sorted = [...students].sort((a, b) => {
                    const la = sessionMap[a.id]?.last;
                    const lb = sessionMap[b.id]?.last;
                    if (!la && !lb) return 0;
                    if (!la) return 1;
                    if (!lb) return -1;
                    return lb - la;
                });

                sorted.forEach(student => {
                    const sess = sessionMap[student.id] || { total: 0, last: null };
                    const prog = progMap[student.id] || { vocab: 0, score: null };

                    const tr = document.createElement('tr');
                    tr.style.cssText = 'border-bottom:1px solid var(--border-subtle);';

                    const cells = [
                        student.name,
                        sess.last ? sess.last.toLocaleDateString() : 'Never',
                        sess.total >= 3600 ? (sess.total / 3600).toFixed(1) + ' hrs' : Math.round(sess.total / 60) + ' min',
                        String(prog.vocab),
                        prog.score !== null ? prog.score + '%' : '-'
                    ];

                    cells.forEach(text => {
                        const td = document.createElement('td');
                        td.style.cssText = 'padding:12px;color:var(--text-primary);font-size:0.95em;';
                        td.textContent = text;
                        tr.appendChild(td);
                    });

                    tbody.appendChild(tr);
                });

                table.appendChild(tbody);

                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'overflow-x:auto;background:var(--bg-card);border-radius:12px;border:1px solid var(--border-card);box-shadow:var(--shadow-card);';
                wrapper.appendChild(table);
                tableSection.appendChild(wrapper);
            }

        } catch (err) {
            console.error('Dashboard load error:', err);
            if (statsRow) {
                statsRow.textContent = '';
                const errEl = document.createElement('div');
                errEl.style.cssText = 'grid-column:1/-1;text-align:center;color:var(--danger);padding:20px;';
                errEl.textContent = 'Failed to load data. ' + (err.message || '');
                statsRow.appendChild(errEl);
            }
        }
    },

    async loadAnalytics() {
        var section = document.getElementById('teacher-analytics');
        if (!section) return;
        section.textContent = '';

        var heading = document.createElement('h3');
        heading.style.cssText = 'color:var(--text-primary);margin-bottom:16px;';
        var icon = document.createElement('i');
        icon.className = 'fas fa-chart-bar';
        icon.style.color = 'var(--primary)';
        heading.appendChild(icon);
        heading.appendChild(document.createTextNode(' Insights & Analytics'));
        section.appendChild(heading);

        var classId = document.getElementById('teacher-filter-class')?.value || null;

        try {
            // Get students
            var studentQuery = ProgressManager.supabase.from('students').select('id, name, class_id');
            if (classId) studentQuery = studentQuery.eq('class_id', classId);
            var sResult = await studentQuery;
            var students = sResult.data || [];
            var studentIds = students.map(function(s) { return s.id; });

            if (studentIds.length === 0) {
                var empty = document.createElement('p');
                empty.style.cssText = 'color:var(--text-muted);text-align:center;padding:20px;';
                empty.textContent = 'No student data to analyze.';
                section.appendChild(empty);
                return;
            }

            // Get sessions (for activity popularity)
            var sessQuery = ProgressManager.supabase
                .from('sessions')
                .select('student_id, activities_used, duration_seconds')
                .in('student_id', studentIds);
            var sessResult = await sessQuery;
            var sessions = sessResult.data || [];

            // Get progress data (for question/term analysis)
            var progQuery = ProgressManager.supabase
                .from('progress')
                .select('student_id, activity, data')
                .in('student_id', studentIds);
            var progResult = await progQuery;
            var progressData = progResult.data || [];

            // Layout: 3-column grid
            var grid = document.createElement('div');
            grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;';

            // === 1. ACTIVITY POPULARITY ===
            var activityCounts = {};
            var allActivities = StudyEngine.config ? StudyEngine.config.activities || [] : [];
            allActivities.forEach(function(a) { activityCounts[a] = 0; });

            sessions.forEach(function(s) {
                if (s.activities_used) {
                    s.activities_used.forEach(function(a) {
                        // Strip "activity_" prefix if present
                        var key = a.replace(/^activity_/, '');
                        activityCounts[key] = (activityCounts[key] || 0) + 1;
                    });
                }
            });

            var activityNames = {
                'flashcards': 'Flashcards', 'practice-test': 'Practice Test', 'short-answer': 'Short Answer',
                'fill-in-blank': 'Fill-in-the-Blank', 'timeline': 'Timeline', 'category-sort': 'Category Sort',
                'wordle': 'Wordle', 'hangman': 'Hangman', 'flip-match': 'Flip Match',
                'typing-race': 'Typing Race', 'typing-practice': 'Typing Practice',
                'term-catcher': 'Term Catcher', 'lightning-round': 'Lightning Round',
                'crossword': 'Crossword', 'source-analysis': 'Source Analysis', 'resources': 'Resource Library'
            };

            var popCard = this._createAnalyticsCard('Popular Activities', 'fas fa-fire', 'var(--danger)');
            var sortedActivities = Object.entries(activityCounts).sort(function(a, b) { return b[1] - a[1]; });
            var maxCount = sortedActivities.length > 0 ? sortedActivities[0][1] : 1;

            sortedActivities.forEach(function(item) {
                var name = activityNames[item[0]] || item[0];
                var count = item[1];
                var bar = document.createElement('div');
                bar.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;';

                var label = document.createElement('span');
                label.style.cssText = 'font-size:0.8em;color:var(--text-primary);width:110px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
                label.textContent = name;
                bar.appendChild(label);

                var track = document.createElement('div');
                track.style.cssText = 'flex:1;height:16px;background:var(--bg-surface);border-radius:8px;overflow:hidden;';
                var fill = document.createElement('div');
                var pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                fill.style.cssText = 'height:100%;border-radius:8px;background:linear-gradient(90deg,var(--primary),var(--secondary));transition:width 0.4s;width:' + Math.max(pct, 2) + '%;';
                track.appendChild(fill);
                bar.appendChild(track);

                var countEl = document.createElement('span');
                countEl.style.cssText = 'font-size:0.75em;color:var(--text-muted);width:30px;text-align:right;';
                countEl.textContent = String(count);
                bar.appendChild(countEl);

                popCard.querySelector('.analytics-body').appendChild(bar);
            });

            // Underused warning
            var underused = sortedActivities.filter(function(a) { return a[1] === 0; });
            if (underused.length > 0) {
                var warning = document.createElement('div');
                warning.style.cssText = 'margin-top:10px;padding:8px 10px;background:rgba(251,191,36,0.1);border-radius:8px;border-left:3px solid var(--accent);';
                var warnIcon = document.createElement('i');
                warnIcon.className = 'fas fa-exclamation-triangle';
                warnIcon.style.cssText = 'color:var(--accent);margin-right:6px;font-size:0.8em;';
                warning.appendChild(warnIcon);
                var warnText = document.createElement('span');
                warnText.style.cssText = 'font-size:0.8em;color:var(--text-secondary);';
                warnText.textContent = 'Not used yet: ' + underused.map(function(a) { return activityNames[a[0]] || a[0]; }).join(', ');
                warning.appendChild(warnText);
                popCard.querySelector('.analytics-body').appendChild(warning);
            }

            grid.appendChild(popCard);

            // === 2. CONFUSING TERMS (from weakness tracker + flashcard ratings) ===
            var termDifficulty = {};
            var totalVocab = StudyEngine.config && StudyEngine.config.vocabulary ? StudyEngine.config.vocabulary.length : 0;

            progressData.forEach(function(p) {
                // Weakness tracker
                if (p.activity === 'weakness_tracker' && p.data && p.data.terms) {
                    Object.entries(p.data.terms).forEach(function(entry) {
                        if (!termDifficulty[entry[0]]) termDifficulty[entry[0]] = { missed: 0, mastered: 0 };
                        termDifficulty[entry[0]].missed += entry[1];
                    });
                }
                // Flashcard ratings
                if (p.activity === 'activity_flashcards' && p.data) {
                    if (p.data.ratings) {
                        Object.entries(p.data.ratings).forEach(function(entry) {
                            if (!termDifficulty[entry[0]]) termDifficulty[entry[0]] = { missed: 0, mastered: 0 };
                            if (entry[1] === 'again' || entry[1] === 'hard') termDifficulty[entry[0]].missed++;
                            if (entry[1] === 'easy' || entry[1] === 'good') termDifficulty[entry[0]].mastered++;
                        });
                    }
                    if (p.data.mastered && Array.isArray(p.data.mastered)) {
                        p.data.mastered.forEach(function(term) {
                            if (!termDifficulty[term]) termDifficulty[term] = { missed: 0, mastered: 0 };
                            termDifficulty[term].mastered++;
                        });
                    }
                }
            });

            var confusingCard = this._createAnalyticsCard('Tricky Terms', 'fas fa-question-circle', 'var(--accent)');
            var sortedTerms = Object.entries(termDifficulty)
                .map(function(e) { return { term: e[0], missed: e[1].missed, mastered: e[1].mastered, ratio: e[1].missed / Math.max(e[1].missed + e[1].mastered, 1) }; })
                .sort(function(a, b) { return b.missed - a.missed; })
                .slice(0, 10);

            if (sortedTerms.length === 0) {
                var noData = document.createElement('p');
                noData.style.cssText = 'color:var(--text-muted);font-size:0.85em;text-align:center;padding:16px;';
                noData.textContent = 'No term difficulty data yet.';
                confusingCard.querySelector('.analytics-body').appendChild(noData);
            } else {
                sortedTerms.forEach(function(item) {
                    var row = document.createElement('div');
                    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-subtle);';

                    var term = document.createElement('span');
                    term.style.cssText = 'font-size:0.85em;color:var(--text-primary);font-weight:600;';
                    term.textContent = item.term;
                    row.appendChild(term);

                    var badges = document.createElement('div');
                    badges.style.cssText = 'display:flex;gap:6px;';
                    var missedBadge = document.createElement('span');
                    missedBadge.style.cssText = 'font-size:0.7em;padding:2px 6px;border-radius:8px;background:rgba(239,68,68,0.15);color:var(--danger);font-weight:600;';
                    missedBadge.textContent = item.missed + ' missed';
                    badges.appendChild(missedBadge);
                    if (item.mastered > 0) {
                        var masteredBadge = document.createElement('span');
                        masteredBadge.style.cssText = 'font-size:0.7em;padding:2px 6px;border-radius:8px;background:rgba(34,197,94,0.15);color:var(--success);font-weight:600;';
                        masteredBadge.textContent = item.mastered + ' got it';
                        badges.appendChild(masteredBadge);
                    }
                    row.appendChild(badges);

                    confusingCard.querySelector('.analytics-body').appendChild(row);
                });
            }

            grid.appendChild(confusingCard);

            // === 3. REVIEW RECOMMENDATIONS ===
            var recCard = this._createAnalyticsCard('Review Recommendations', 'fas fa-clipboard-list', 'var(--success)');
            var recBody = recCard.querySelector('.analytics-body');

            // Mastery overview
            var masteredCounts = {};
            progressData.forEach(function(p) {
                if (p.activity === 'activity_flashcards' && p.data && p.data.mastered) {
                    masteredCounts[p.student_id] = Array.isArray(p.data.mastered) ? p.data.mastered.length : 0;
                }
            });
            var avgMastered = 0;
            var masteredValues = Object.values(masteredCounts);
            if (masteredValues.length > 0) {
                avgMastered = Math.round(masteredValues.reduce(function(a, b) { return a + b; }, 0) / masteredValues.length);
            }

            var recs = [];

            if (totalVocab > 0 && avgMastered < totalVocab * 0.5) {
                recs.push({ icon: 'fas fa-book', text: 'Most students haven\u2019t mastered half the vocab yet. Assign Flashcards review.', priority: 'high' });
            }

            if (sortedTerms.length > 3) {
                var topConfusing = sortedTerms.slice(0, 3).map(function(t) { return t.term; }).join(', ');
                recs.push({ icon: 'fas fa-exclamation-circle', text: 'Focus review on: ' + topConfusing, priority: 'high' });
            }

            var practiceTestUsers = progressData.filter(function(p) { return p.activity === 'activity_practice-test'; }).length;
            if (practiceTestUsers < students.length * 0.5) {
                recs.push({ icon: 'fas fa-clipboard-check', text: 'Less than half your students have taken the Practice Test.', priority: 'medium' });
            }

            if (underused.length > 0) {
                recs.push({ icon: 'fas fa-gamepad', text: 'Try assigning: ' + underused.slice(0, 3).map(function(a) { return activityNames[a[0]] || a[0]; }).join(', '), priority: 'low' });
            }

            var sourceUsers = progressData.filter(function(p) { return p.activity === 'activity_source-analysis'; }).length;
            if (sourceUsers < students.length * 0.3) {
                recs.push({ icon: 'fas fa-search', text: 'Source Analysis is underused \u2014 great for critical thinking skills.', priority: 'medium' });
            }

            if (recs.length === 0) {
                recs.push({ icon: 'fas fa-check-circle', text: 'Students are well-engaged across activities!', priority: 'low' });
            }

            recs.forEach(function(rec) {
                var row = document.createElement('div');
                var bgColor = rec.priority === 'high' ? 'rgba(239,68,68,0.08)' : rec.priority === 'medium' ? 'rgba(251,191,36,0.08)' : 'rgba(34,197,94,0.08)';
                var borderColor = rec.priority === 'high' ? 'var(--danger)' : rec.priority === 'medium' ? 'var(--accent)' : 'var(--success)';
                row.style.cssText = 'display:flex;align-items:flex-start;gap:8px;padding:8px 10px;margin-bottom:6px;border-radius:8px;border-left:3px solid ' + borderColor + ';background:' + bgColor + ';';

                var recIcon = document.createElement('i');
                recIcon.className = rec.icon;
                recIcon.style.cssText = 'color:' + borderColor + ';margin-top:2px;flex-shrink:0;';
                row.appendChild(recIcon);

                var recText = document.createElement('span');
                recText.style.cssText = 'font-size:0.85em;color:var(--text-primary);line-height:1.4;';
                recText.textContent = rec.text;
                row.appendChild(recText);

                recBody.appendChild(row);
            });

            grid.appendChild(recCard);
            section.appendChild(grid);

        } catch (err) {
            console.error('Analytics error:', err);
            var errEl = document.createElement('p');
            errEl.style.cssText = 'color:var(--danger);text-align:center;padding:20px;';
            errEl.textContent = 'Failed to load analytics.';
            section.appendChild(errEl);
        }
    },

    _createAnalyticsCard(title, iconClass, iconColor) {
        var card = document.createElement('div');
        card.style.cssText = 'background:var(--bg-elevated);border:1px solid var(--border-card);border-radius:var(--radius-md);box-shadow:var(--shadow-card);overflow:hidden;';

        var header = document.createElement('div');
        header.style.cssText = 'padding:12px 14px;border-bottom:1px solid var(--border-subtle);display:flex;align-items:center;gap:8px;';
        var icon = document.createElement('i');
        icon.className = iconClass;
        icon.style.color = iconColor;
        header.appendChild(icon);
        var titleEl = document.createElement('span');
        titleEl.style.cssText = 'font-weight:700;font-size:0.9em;color:var(--text-primary);';
        titleEl.textContent = title;
        header.appendChild(titleEl);
        card.appendChild(header);

        var body = document.createElement('div');
        body.className = 'analytics-body';
        body.style.cssText = 'padding:12px 14px;';
        card.appendChild(body);

        return card;
    },

    // Returns true if this is a magic link redirect (hash contains access_token)
    isMagicLinkRedirect() {
        return window.location.hash.includes('access_token');
    },

    // Check for magic link redirect on page load.
    // Called from app.js AFTER engine init, before welcome screen.
    async checkAuthRedirect() {
        if (!ProgressManager.supabase) return false;
        if (!this.isMagicLinkRedirect()) return false;

        try {
            // Wait for Supabase to process the hash fragment
            const { data, error } = await ProgressManager.supabase.auth.getSession();
            if (error) throw error;

            if (data.session) {
                // Clean up URL — remove hash entirely
                var cleanUrl = window.location.pathname + window.location.search;
                history.replaceState(null, '', cleanUrl);

                this.teacherMode = true;
                // Small delay to let the app finish rendering
                setTimeout(() => this.openTeacherDashboard(), 300);
                return true;
            }

            // If no session yet, listen for auth state change (Supabase processes hash async)
            return new Promise((resolve) => {
                var timeout = setTimeout(() => { resolve(false); }, 5000);
                ProgressManager.supabase.auth.onAuthStateChange((event, session) => {
                    if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
                        clearTimeout(timeout);
                        var cleanUrl = window.location.pathname + window.location.search;
                        history.replaceState(null, '', cleanUrl);
                        this.teacherMode = true;
                        setTimeout(() => this.openTeacherDashboard(), 300);
                        resolve(true);
                    }
                });
            });
        } catch (err) {
            console.error('Auth redirect check error:', err);
            return false;
        }
    }
};

// Global keyboard shortcuts: Cmd+K, Ctrl+K, and /
document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        CommandPalette.toggle();
        return;
    }

    // "/" opens palette when not typing in an input
    if (e.key === '/' && !CommandPalette.isOpen) {
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
        e.preventDefault();
        CommandPalette.open();
    }
});

// Visible button click
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('cmd-palette-btn');
    if (btn) btn.addEventListener('click', () => CommandPalette.open());
});
