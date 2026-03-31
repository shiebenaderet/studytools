// Tracks active study time based on user interaction
const ActivityTimer = {
    _active: false,
    _elapsed: 0,
    _lastTick: 0,
    _lastInteraction: 0,
    _interval: null,
    _unitId: null,
    _activityId: null,
    _shownThresholds: {},  // track which study-time toasts have fired this session
    _shownCapWarning: false,
    _shownCapReached: false,
    IDLE_TIMEOUT: 60000, // pause after 60s of no interaction
    DAILY_ACTIVITY_CAP_MS: 15 * 60 * 1000, // 15 min per activity per day (default)
    LEARN_MODE_CAP_MS: 30 * 60 * 1000, // 30 min for learn-mode
    LEARN_MODE_MULTIPLIER: 1.5, // 1.5x points for learn-mode

    // Scoring tiers: higher-order activities earn more points per minute
    // Only applied when unit config has scoringTiers: true
    SCORING_TIERS: {
        // Deep Study (1.5x) — handled by LEARN_MODE_MULTIPLIER
        // Analysis (1.25x)
        'sort-it-out': 1.25,
        'who-am-i': 1.25,
        'four-corners': 1.25,
        'map-quiz': 1.25,
        'source-analysis': 1.25,
        'sift-practice': 1.25,
        // Recall (1.0x) — default, no entry needed
        // Recognition (0.75x)
        'term-catcher': 0.75,
        'flip-match': 0.75,
        'hangman': 0.75,
        'tower-defense': 0.75
    },

    _getScoringMultiplier(activityId) {
        if (activityId === 'learn-mode') {
            return typeof this._getLearnModeMultiplier === 'function'
                ? this._getLearnModeMultiplier()
                : this.LEARN_MODE_MULTIPLIER;
        }
        if (typeof StudyEngine !== 'undefined' && StudyEngine.config && StudyEngine.config.unit) {
            if (!StudyEngine.config.scoringTiers) return 1.0;
        }
        return this.SCORING_TIERS[activityId] || 1.0;
    },

    start(unitId, activityId) {
        this.stop(); // save any previous session
        this._unitId = unitId;
        this._activityId = activityId || null;
        this._elapsed = 0;
        this._shownThresholds = {};
        this._shownCapWarning = false;
        this._shownCapReached = false;
        this._active = true;
        this._lastTick = Date.now();
        this._lastInteraction = Date.now();
        this._interval = setInterval(() => this._tick(), 1000);
        this._addListeners();

        // Show banner if activity already capped today
        if (this._activityId && this._isActivityCappedToday(unitId, this._activityId)) {
            this._showCapBanner();
        }
    },

    stop() {
        if (this._interval) {
            this._tick(); // capture final partial second
            clearInterval(this._interval);
            this._interval = null;
        }
        this._removeListeners();
        this._removeCapBanner();
        if (this._unitId && this._elapsed > 0) {
            this._addCappedStudyTime(this._unitId, this._activityId, this._elapsed);
        }
        this._active = false;
        this._elapsed = 0;
        this._unitId = null;
        this._activityId = null;
    },

    _getActivityCapMs(activityId) {
        if (activityId === 'learn-mode') return this.LEARN_MODE_CAP_MS;
        return this.DAILY_ACTIVITY_CAP_MS;
    },

    // Add study time respecting per-activity daily cap
    _addCappedStudyTime(unitId, activityId, ms) {
        if (!activityId) {
            ProgressManager.addStudyTime(unitId, ms);
            return;
        }
        var today = new Date().toDateString();
        var key = 'dailyActivityTime_' + activityId;
        var data = ProgressManager.load(unitId, key) || { date: null, ms: 0 };
        if (data.date !== today) {
            data = { date: today, ms: 0 };
        }
        var capMs = this._getActivityCapMs(activityId);
        var remaining = Math.max(0, capMs - data.ms);
        var credited = Math.min(ms, remaining);
        // Apply scoring tier multiplier (cap is on real time, multiplier on credited points)
        if (credited > 0) {
            var multiplier = this._getScoringMultiplier(activityId);
            var multiplied = multiplier !== 1.0 ? Math.round(credited * multiplier) : credited;
            ProgressManager.addStudyTime(unitId, multiplied);
        }
        data.ms += ms; // track total time even past cap (for display)
        ProgressManager.save(unitId, key, data);
    },

    _isActivityCappedToday(unitId, activityId) {
        var today = new Date().toDateString();
        var key = 'dailyActivityTime_' + activityId;
        var data = ProgressManager.load(unitId, key) || { date: null, ms: 0 };
        return data.date === today && data.ms >= this._getActivityCapMs(activityId);
    },

    _getActivityTodayMs(unitId, activityId) {
        var today = new Date().toDateString();
        var key = 'dailyActivityTime_' + activityId;
        var data = ProgressManager.load(unitId, key) || { date: null, ms: 0 };
        return data.date === today ? data.ms : 0;
    },

    _tick() {
        var now = Date.now();
        var idle = now - this._lastInteraction > this.IDLE_TIMEOUT;
        var hidden = document.hidden;
        if (!idle && !hidden && this._active) {
            this._elapsed += Math.max(0, now - this._lastTick);
        }
        this._lastTick = now;
        this._checkActivityCap();
        this._checkStudyTimeThresholds();
    },

    _checkActivityCap() {
        if (!this._activityId || !this._unitId) return;
        var todayMs = this._getActivityTodayMs(this._unitId, this._activityId) + this._elapsed;
        var capMs = this._getActivityCapMs(this._activityId);
        var firstName = typeof ProgressManager !== 'undefined' ? ProgressManager.getFirstName() : '';
        var prefix = firstName ? firstName + ', ' : '';

        // At 80% (12 min), warn approaching cap
        if (todayMs >= capMs * 0.8 && todayMs < capMs && !this._shownCapWarning) {
            this._shownCapWarning = true;
            var actName = this._getActivityName(this._activityId);
            if (typeof StudyUtils !== 'undefined') {
                var remainMin = Math.max(1, Math.round((capMs - todayMs) / 60000));
                StudyUtils.showToast(prefix + 'heads up! You have about ' + remainMin + ' minutes of point-earning time left on ' + actName + ' today. You can still practice after that, but switch to a different activity to keep earning points!', 'info', 10000);
            }
        }

        // At 100% (15 min), notify cap reached and show banner
        if (todayMs >= capMs && !this._shownCapReached) {
            this._shownCapReached = true;
            var actName = this._getActivityName(this._activityId);
            if (typeof StudyUtils !== 'undefined') {
                StudyUtils.showToast(prefix + 'you\'ve earned all the points you can on ' + actName + ' for today! You can still practice here, but switch to a different activity to keep earning points.', 'warning', 12000);
            }
            this._showCapBanner();
        }
    },

    _getActivityName(activityId) {
        if (typeof NudgeManager !== 'undefined' && NudgeManager.ACTIVITY_INFO[activityId]) {
            return NudgeManager.ACTIVITY_INFO[activityId].name;
        }
        return activityId;
    },

    _showCapBanner() {
        this._removeCapBanner();
        var container = document.getElementById('activity-container');
        if (!container) return;

        var actName = this._getActivityName(this._activityId);

        // Get a suggestion for a different activity
        var suggestion = '';
        if (typeof NudgeManager !== 'undefined' && typeof StudyEngine !== 'undefined' && StudyEngine.config) {
            var suggestions = NudgeManager.getSuggestions(StudyEngine.config);
            for (var i = 0; i < suggestions.length; i++) {
                if (suggestions[i].activityId !== this._activityId) {
                    suggestion = suggestions[i].name;
                    break;
                }
            }
        }

        var banner = document.createElement('div');
        banner.id = 'activity-cap-banner';
        banner.style.cssText = 'background:#fef3cd;border:1px solid #ffc107;border-radius:8px;padding:10px 16px;margin-bottom:12px;display:flex;align-items:center;gap:10px;font-size:0.9rem;color:#856404;';

        var icon = document.createElement('i');
        icon.className = 'fas fa-clock';
        icon.style.fontSize = '1.1rem';
        banner.appendChild(icon);

        var text = document.createElement('span');
        var capMin = Math.round(this._getActivityCapMs(this._activityId) / 60000);
        text.textContent = 'No more points available on ' + actName + ' today (' + capMin + ' min daily limit). You can still practice here, but switch to ' + (suggestion || 'a different activity') + ' to keep earning points!';
        banner.appendChild(text);

        if (suggestion) {
            var tryBtn = document.createElement('button');
            tryBtn.style.cssText = 'margin-left:auto;background:#ffc107;border:none;border-radius:4px;padding:6px 12px;cursor:pointer;font-size:0.85rem;font-weight:600;color:#856404;white-space:nowrap;';
            tryBtn.textContent = 'Try ' + suggestion;
            tryBtn.addEventListener('click', function() {
                // Find and click the suggestion
                if (typeof NudgeManager !== 'undefined' && typeof StudyEngine !== 'undefined' && StudyEngine.config) {
                    var sugs = NudgeManager.getSuggestions(StudyEngine.config);
                    for (var i = 0; i < sugs.length; i++) {
                        if (sugs[i].name === suggestion) {
                            StudyEngine.activateActivity(sugs[i].activityId);
                            return;
                        }
                    }
                }
            });
            banner.appendChild(tryBtn);
        }

        container.insertBefore(banner, container.firstChild);
    },

    _removeCapBanner() {
        var existing = document.getElementById('activity-cap-banner');
        if (existing) existing.remove();
    },

    _checkStudyTimeThresholds() {
        var elapsedMin = Math.floor(this._elapsed / 60000);
        var firstName = typeof ProgressManager !== 'undefined' ? ProgressManager.getFirstName() : '';
        var prefix = firstName ? firstName + ', ' : '';

        if (elapsedMin >= 100 && !this._shownThresholds[100]) {
            this._shownThresholds[100] = true;
            if (typeof StudyUtils !== 'undefined') {
                StudyUtils.showToast(prefix + 'you\'ve hit the study time point cap! Focus on vocab and practice tests to keep climbing the leaderboard!', 'info', 8000);
            }
        } else if (elapsedMin >= 60 && !this._shownThresholds[60]) {
            this._shownThresholds[60] = true;
            if (typeof StudyUtils !== 'undefined') {
                StudyUtils.showToast(prefix + '60 minutes of studying \u2014 impressive! Your study time points are slowing down. Try mastering vocab or taking a practice test to keep your score growing!', 'info', 8000);
            }
        } else if (elapsedMin >= 30 && !this._shownThresholds[30]) {
            this._shownThresholds[30] = true;
            if (typeof StudyUtils !== 'undefined') {
                StudyUtils.showToast(prefix + 'you\'ve been studying for 30 minutes \u2014 nice! Points are building up a bit slower now. Great time for a break!', 'info', 6000);
            }
        }
    },

    _onInteraction() {
        ActivityTimer._lastInteraction = Date.now();
    },

    _onVisibility() {
        if (!document.hidden) {
            ActivityTimer._lastTick = Date.now();
            ActivityTimer._lastInteraction = Date.now();
        }
    },

    _addListeners() {
        document.addEventListener('click', this._onInteraction);
        document.addEventListener('keydown', this._onInteraction);
        document.addEventListener('scroll', this._onInteraction, true);
        document.addEventListener('touchstart', this._onInteraction);
        document.addEventListener('visibilitychange', this._onVisibility);
    },

    _removeListeners() {
        document.removeEventListener('click', this._onInteraction);
        document.removeEventListener('keydown', this._onInteraction);
        document.removeEventListener('scroll', this._onInteraction, true);
        document.removeEventListener('touchstart', this._onInteraction);
        document.removeEventListener('visibilitychange', this._onVisibility);
    }
};

const StudyEngine = {
    config: null,
    activities: {},
    activeActivity: null,

    async init() {
        const unitId = new URLSearchParams(window.location.search).get('unit');
        if (!unitId) {
            // No unit — hide loading, show minimal UI (command palette still works for teacher access)
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) loadingScreen.style.display = 'none';
            document.getElementById('title-text').textContent = 'Study Tools';
            document.getElementById('site-subtitle').textContent = 'Use the search button or press / to open the command palette.';
            document.getElementById('site-question').textContent = '';
            return;
        }

        try {
            const response = await fetch(`../units/${unitId}/config.json`);
            if (!response.ok) throw new Error(`Unit "${unitId}" not found`);
            this.config = await response.json();
        } catch (err) {
            this.showUnitError(`Could not load unit: ${err.message}`);
            return;
        }

        // Password gate for locked units
        if (this.config.unit && this.config.unit.id) {
            const gateUnitId = this.config.unit.id;
            try {
                const unitsResp = await fetch('../units/units.json');
                const unitsData = await unitsResp.json();
                const unitMeta = unitsData.units.find(u => u.id === gateUnitId);
                if (unitMeta && unitMeta.locked && !sessionStorage.getItem('unit_access_' + gateUnitId)) {
                    this._showEnginePasswordGate(gateUnitId);
                    return;
                }
            } catch (e) {
                // If units.json fails to load, skip gate check
            }
        }

        // Hide loading screen
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';

        this.applyTheme();
        if (typeof AchievementManager !== 'undefined') AchievementManager.init(this.config.unit.id);
        this.renderHeader();
        this.renderFooterFact();
        await this.loadActivities();
    },

    _showEnginePasswordGate(unitId) {
        // Hide loading screen
        var loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';

        var container = document.getElementById('app-container') || document.body;
        container.textContent = '';

        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;align-items:center;justify-content:center;min-height:80vh;';

        var box = document.createElement('div');
        box.style.cssText = 'background:white;border-radius:12px;padding:32px;max-width:400px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.15);';

        // Heading with lock icon
        var heading = document.createElement('h3');
        heading.style.marginBottom = '8px';
        var hIcon = document.createElement('i');
        hIcon.className = 'fas fa-lock';
        heading.appendChild(hIcon);
        heading.appendChild(document.createTextNode(' Password Required'));
        box.appendChild(heading);

        // Description
        var desc = document.createElement('p');
        desc.style.cssText = 'color:#666;margin-bottom:16px;font-size:0.9rem;';
        desc.textContent = 'This unit is not yet available to students.';
        box.appendChild(desc);

        // Input
        var input = document.createElement('input');
        input.type = 'password';
        input.placeholder = 'Enter password';
        input.autocomplete = 'off';
        input.style.cssText = 'width:100%;padding:10px 14px;border:2px solid #ddd;border-radius:8px;font-size:1rem;margin-bottom:12px;outline:none;';
        box.appendChild(input);

        // Error
        var errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'color:#C0392B;font-size:0.85rem;margin-bottom:8px;display:none;';
        errorDiv.textContent = 'Incorrect password';
        box.appendChild(errorDiv);

        // Buttons
        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:10px;justify-content:center;margin-top:8px;';

        var backLink = document.createElement('a');
        backLink.href = '../';
        backLink.textContent = 'Back';
        backLink.style.cssText = 'padding:10px 24px;background:#eee;color:#333;border-radius:8px;text-decoration:none;display:inline-block;';
        btnRow.appendChild(backLink);

        var submitBtn = document.createElement('button');
        submitBtn.textContent = 'Submit';
        submitBtn.style.cssText = 'padding:10px 24px;border:none;border-radius:8px;font-size:1rem;cursor:pointer;background:#B5651D;color:white;';
        btnRow.appendChild(submitBtn);

        box.appendChild(btnRow);
        wrapper.appendChild(box);
        container.appendChild(wrapper);
        input.focus();

        function tryPassword() {
            if (input.value === 'americanprogress') {
                sessionStorage.setItem('unit_access_' + unitId, 'true');
                window.location.reload();
            } else {
                errorDiv.style.display = 'block';
                input.value = '';
                input.focus();
            }
        }

        submitBtn.addEventListener('click', tryPassword);
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') tryPassword();
        });
    },

    applyTheme() {
        const theme = this.config.unit.theme;
        document.documentElement.style.setProperty('--primary', theme.primary);
        document.documentElement.style.setProperty('--secondary', theme.secondary);
        document.documentElement.style.setProperty('--accent', theme.accent);
        document.title = `${this.config.unit.title} - Study Tool`;

        // Unit-specific background colors for visual distinction
        if (theme.bgDeep) {
            document.documentElement.style.setProperty('--bg-deep', theme.bgDeep);
            document.documentElement.style.setProperty('--bg-card', theme.bgCard || theme.bgDeep);
            document.documentElement.style.setProperty('--bg-elevated', theme.bgElevated || theme.bgCard || theme.bgDeep);
            document.documentElement.style.setProperty('--bg-surface', theme.bgSurface || theme.bgElevated || theme.bgDeep);
        }
    },

    renderHeader() {
        document.getElementById('title-text').textContent = this.config.unit.title;
        document.getElementById('site-subtitle').textContent = this.config.unit.subtitle;
        const questionEl = document.getElementById('site-question');
        questionEl.textContent = '"' + this.config.unit.essentialQuestion + '"';

        // Personalized greeting
        const existingGreeting = document.getElementById('student-greeting');
        if (existingGreeting) existingGreeting.remove();
        const firstName = ProgressManager.getFirstName();
        if (firstName) {
            const greeting = document.createElement('div');
            greeting.id = 'student-greeting';
            greeting.className = 'student-greeting';
            greeting.textContent = 'Hey, ' + firstName + '!';
            const header = document.getElementById('site-header');
            const subtitle = document.getElementById('site-subtitle');
            header.insertBefore(greeting, subtitle);
        }
    },

    async loadActivities() {
        const enabledActivities = this.config.activities || [];
        const loadPromises = enabledActivities.map(id => {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = `js/activities/${id}.js`;
                script.onload = resolve;
                script.onerror = () => {
                    console.warn(`Failed to load activity: ${id}`);
                    resolve(); // Don't fail the whole app if one activity is missing
                };
                document.head.appendChild(script);
            });
        });

        await Promise.all(loadPromises);
        this.buildNav();

        // Check for deep link: #activity-id or #activity-id/param/param in URL hash
        var hash = window.location.hash.replace('#', '');
        var hashParts = hash.split('/');
        var activityId = hashParts[0];
        if (activityId && this.activities[activityId]) {
            this.activateActivity(activityId, hashParts.slice(1));
        } else {
            this.showHome();
        }
    },

    registerActivity(activity) {
        this.activities[activity.id] = activity;
    },

    buildNav() {
        const nav = document.getElementById('main-nav');
        nav.textContent = ''; // Clear

        // Home button
        const homeBtn = this.createNavButton('Home', 'home', () => this.showHome());
        homeBtn.classList.add('active');
        nav.appendChild(homeBtn);

        // Group activities by category, preserving config order
        const groups = { study: [], practice: [], games: [] };
        const configOrder = (this.config && this.config.activities) || [];
        var sortedActivities = Object.values(this.activities).sort(function(a, b) {
            var ai = configOrder.indexOf(a.id);
            var bi = configOrder.indexOf(b.id);
            if (ai === -1) ai = 999;
            if (bi === -1) bi = 999;
            return ai - bi;
        });
        sortedActivities.forEach(a => {
            const cat = a.category || 'games';
            if (groups[cat]) groups[cat].push(a);
        });

        const groupLabels = { study: 'Study', practice: 'Practice', games: 'Games' };
        const groupIcons = { study: 'fas fa-book', practice: 'fas fa-clipboard-check', games: 'fas fa-gamepad' };

        Object.entries(groups).forEach(([groupId, items]) => {
            if (items.length === 0) return;
            const btn = this.createNavButton(groupLabels[groupId], groupId, () => this.showSubNav(groupId, items));
            nav.appendChild(btn);
        });

        // Leaderboard button
        const lbBtn = this.createNavButton('Leaderboard', 'leaderboard', () => this.showLeaderboard());
        nav.appendChild(lbBtn);

        // Tools button
        const toolsBtn = this.createNavButton('Tools', 'tools', () => this.showTools());
        nav.appendChild(toolsBtn);
    },

    createNavButton(label, id, onClick) {
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.dataset.group = id;

        // Add icon if available
        const icons = { home: 'fas fa-home', study: 'fas fa-book', practice: 'fas fa-clipboard-check', games: 'fas fa-gamepad', leaderboard: 'fas fa-trophy', tools: 'fas fa-tools' };
        if (icons[id]) {
            const icon = document.createElement('i');
            icon.className = icons[id];
            btn.appendChild(icon);
            btn.appendChild(document.createTextNode(' '));
        }
        btn.appendChild(document.createTextNode(label));

        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            onClick();
        });
        return btn;
    },

    showSubNav(groupId, items) {
        // Restore full header when browsing categories
        document.body.classList.remove('activity-active');
        var topbar = document.getElementById('activity-topbar');
        if (topbar) topbar.textContent = '';

        if (this.activeActivity && this.activities[this.activeActivity]) {
            this.activities[this.activeActivity].deactivate?.();
            this.activeActivity = null;
        }

        const subNav = document.getElementById('sub-nav');
        subNav.textContent = '';
        subNav.classList.add('active');

        items.forEach(activity => {
            const btn = document.createElement('button');
            btn.className = 'sub-nav-btn';
            const icon = document.createElement('i');
            icon.className = activity.icon;
            btn.appendChild(icon);
            btn.appendChild(document.createTextNode(' ' + activity.name));
            btn.addEventListener('click', () => this.activateActivity(activity.id));
            subNav.appendChild(btn);
        });

        // Show activity picker cards
        document.getElementById('home-section').classList.remove('active');
        const container = document.getElementById('activity-container');
        container.textContent = '';
        container.classList.add('active');

        const picker = document.createElement('div');
        picker.className = 'activity-picker';

        const heading = document.createElement('h2');
        heading.textContent = 'What do you want to work on?';
        picker.appendChild(heading);

        const grid = document.createElement('div');
        grid.className = 'activity-card-grid';

        items.forEach(a => {
            const card = document.createElement('div');
            const accessible = MasteryManager.isActivityAccessible(this.config.unit.id, this.config, a.id);

            if (!accessible) {
                card.className = 'card activity-card category-' + (a.category || 'games') + ' locked';

                const cardTitle = document.createElement('h2');
                const cardIcon = document.createElement('i');
                cardIcon.className = 'fas fa-lock';
                cardTitle.appendChild(cardIcon);
                cardTitle.appendChild(document.createTextNode(' ' + a.name));
                card.appendChild(cardTitle);

                const desc = document.createElement('p');
                desc.textContent = MasteryManager.getLockMessage(this.config.unit.id, this.config);
                card.appendChild(desc);

                const btn = document.createElement('button');
                btn.className = 'card-button';
                btn.textContent = 'Locked';
                btn.disabled = true;
                card.appendChild(btn);
            } else {
                card.className = 'card activity-card category-' + (a.category || 'games');
                card.addEventListener('click', () => this.activateActivity(a.id));

                const cardTitle = document.createElement('h2');
                const cardIcon = document.createElement('i');
                cardIcon.className = a.icon;
                cardTitle.appendChild(cardIcon);
                cardTitle.appendChild(document.createTextNode(' ' + a.name));
                card.appendChild(cardTitle);

                const desc = document.createElement('p');
                desc.textContent = a.description;
                card.appendChild(desc);

                // Show term count only on flashcards card
                if (a.id === 'flashcards') {
                    const status = MasteryManager.getUnlockStatus(this.config.unit.id, this.config);
                    if (!status.allUnlocked) {
                        const unlockCount = document.createElement('div');
                        unlockCount.className = 'unlock-count';
                        unlockCount.textContent = status.unlockedVocab + '/' + status.totalVocab + ' terms available';
                        card.appendChild(unlockCount);
                    }
                }

                const btn = document.createElement('button');
                btn.className = 'card-button';
                btn.textContent = 'Start';
                card.appendChild(btn);
            }

            grid.appendChild(card);
        });

        picker.appendChild(grid);
        container.appendChild(picker);
    },

    activateActivity(activityId, deepLinkParams) {
        const activity = this.activities[activityId];
        if (!activity) return;

        if (!MasteryManager.isActivityAccessible(this.config.unit.id, this.config, activityId)) {
            StudyUtils.showToast(MasteryManager.getLockMessage(this.config.unit.id, this.config), 'info');
            return;
        }

        // Deactivate current
        if (this.activeActivity && this.activities[this.activeActivity]) {
            this.activities[this.activeActivity].deactivate?.();
        }

        this.activeActivity = activityId;
        // Update URL hash for deep linking (replace state to avoid polluting history)
        history.replaceState(null, '', '#' + activityId);

        const container = document.getElementById('activity-container');
        container.textContent = '';
        container.classList.add('active');
        document.getElementById('home-section').classList.remove('active');
        document.getElementById('sub-nav').classList.remove('active');

        // Collapse header, show compact topbar
        document.body.classList.add('activity-active');
        this._renderActivityTopbar(activity);

        // Store deep link params for the activity to pick up
        activity._deepLinkParams = deepLinkParams || [];

        // Render and activate
        activity.render(container, this.config);

        // Load saved progress
        const saved = ProgressManager.getActivityProgress(this.config.unit.id, activityId);
        if (saved) activity.loadProgress?.(saved);

        activity.activate?.();

        // Track active study time (pass activity ID for per-activity daily cap)
        ActivityTimer.start(this.config.unit.id, activityId);

        // Update streak
        ProgressManager.updateStreak(this.config.unit.id);
    },

    _goBackToGroup(activity) {
        const groups = { study: [], practice: [], games: [] };
        const configOrder = (this.config && this.config.activities) || [];
        var sortedActivities = Object.values(this.activities).sort(function(a, b) {
            var ai = configOrder.indexOf(a.id);
            var bi = configOrder.indexOf(b.id);
            if (ai === -1) ai = 999;
            if (bi === -1) bi = 999;
            return ai - bi;
        });
        sortedActivities.forEach(a => {
            const cat = a.category || 'games';
            if (groups[cat]) groups[cat].push(a);
        });
        const groupId = activity.category || 'games';
        this.showSubNav(groupId, groups[groupId]);
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('active');
            if (b.dataset.group === groupId) b.classList.add('active');
        });
    },

    _renderActivityTopbar(activity) {
        const topbar = document.getElementById('activity-topbar');
        if (!topbar) return;
        topbar.textContent = '';

        // Back button
        const backBtn = document.createElement('button');
        backBtn.className = 'activity-topbar-back';
        const backIcon = document.createElement('i');
        backIcon.className = 'fas fa-arrow-left';
        backBtn.appendChild(backIcon);
        backBtn.appendChild(document.createTextNode(' Back'));
        backBtn.addEventListener('click', () => this._goBackToGroup(activity));
        topbar.appendChild(backBtn);

        // Activity name
        const title = document.createElement('span');
        title.className = 'activity-topbar-title';
        const actIcon = document.createElement('i');
        actIcon.className = activity.icon;
        actIcon.style.marginRight = '6px';
        actIcon.style.color = 'var(--primary)';
        title.appendChild(actIcon);
        title.appendChild(document.createTextNode(activity.name));
        topbar.appendChild(title);

        // Quick nav buttons
        const nav = document.createElement('div');
        nav.className = 'activity-topbar-nav';
        const groupLabels = { study: 'Study', practice: 'Practice', games: 'Games' };
        Object.keys(groupLabels).forEach(groupId => {
            const btn = document.createElement('button');
            btn.textContent = groupLabels[groupId];
            if (activity.category === groupId) btn.style.color = 'var(--primary)';
            btn.addEventListener('click', () => {
                const navBtn = document.querySelector('.nav-btn[data-group="' + groupId + '"]');
                if (navBtn) navBtn.click();
            });
            nav.appendChild(btn);
        });
        topbar.appendChild(nav);
    },

    showHome() {
        ActivityTimer.stop();
        document.getElementById('sub-nav').classList.remove('active');
        document.getElementById('activity-container').classList.remove('active');
        document.getElementById('home-section').classList.add('active');

        // Clear URL hash
        if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);

        // Restore full header
        document.body.classList.remove('activity-active');
        var topbar = document.getElementById('activity-topbar');
        if (topbar) topbar.textContent = '';

        // Smart nudge toast when leaving an activity
        if (this.activeActivity && typeof NudgeManager !== 'undefined' && this.config) {
            NudgeManager.onActivityComplete(this.activeActivity, this.config);
        }

        if (this.activeActivity && this.activities[this.activeActivity]) {
            this.activities[this.activeActivity].deactivate?.();
            this.activeActivity = null;
        }

        this.renderHomeStats();
    },

    async showLeaderboard() {
        ActivityTimer.stop();
        document.body.classList.remove('activity-active');
        var topbar = document.getElementById('activity-topbar');
        if (topbar) topbar.textContent = '';
        if (this.activeActivity && this.activities[this.activeActivity]) {
            this.activities[this.activeActivity].deactivate?.();
            this.activeActivity = null;
        }
        document.getElementById('sub-nav').classList.remove('active');
        document.getElementById('home-section').classList.remove('active');
        const container = document.getElementById('activity-container');
        container.classList.add('active');
        container.textContent = '';

        if (typeof LeaderboardManager !== 'undefined') {
            // Submit latest score before showing — await so rankings reflect current data
            await LeaderboardManager.submitScore();
            await LeaderboardManager.renderPage(container);
        }
    },

    showTools() {
        ActivityTimer.stop();
        document.body.classList.remove('activity-active');
        var topbar = document.getElementById('activity-topbar');
        if (topbar) topbar.textContent = '';
        if (this.activeActivity && this.activities[this.activeActivity]) {
            this.activities[this.activeActivity].deactivate?.();
            this.activeActivity = null;
        }
        document.getElementById('sub-nav').classList.remove('active');
        document.getElementById('home-section').classList.remove('active');
        const container = document.getElementById('activity-container');
        container.classList.add('active');
        container.textContent = '';

        const grid = document.createElement('div');
        grid.className = 'tools-grid';

        const tools = [
            { icon: 'fas fa-edit', title: 'My Study Guide', desc: 'See what you\'ve mastered, what needs review, and add personal notes.', action: 'StudyTools.openNotes()' },
            { icon: 'fas fa-hourglass', title: 'Focused Study Timer', desc: 'Set a timer for focused study sessions.', action: 'StudyTools.openTimer()' },
            { icon: 'fas fa-print', title: 'Print Study Guide', desc: 'Print a formatted study guide.', action: 'StudyTools.openPrint()' },
            { icon: 'fas fa-download', title: 'Export Progress', desc: 'Download your study progress.', action: 'StudyTools.exportProgress()' },
            { icon: 'fas fa-music', title: 'Study Music', desc: 'Listen to music while you study.', action: 'StudyTools.openMusic()' }
        ];

        tools.forEach(tool => {
            const card = document.createElement('div');
            card.className = 'tool-card';

            const title = document.createElement('h2');
            const icon = document.createElement('i');
            icon.className = tool.icon;
            title.appendChild(icon);
            title.appendChild(document.createTextNode(' ' + tool.title));
            card.appendChild(title);

            const desc = document.createElement('p');
            desc.textContent = tool.desc;
            card.appendChild(desc);

            const btn = document.createElement('button');
            btn.className = 'tool-button';
            btn.textContent = tool.title.split(' ').pop(); // Last word as button text
            btn.setAttribute('onclick', tool.action);
            card.appendChild(btn);

            grid.appendChild(card);
        });

        container.appendChild(grid);
    },

    renderHomeStats() {
        if (this.config) {
            ProgressManager.renderHomeStats(this.config);
        }

        // Auto-submit leaderboard score
        if (typeof LeaderboardManager !== 'undefined') {
            LeaderboardManager.submitScore();
        }

        const homeCards = document.getElementById('home-cards');
        if (homeCards && homeCards.children.length === 0) {
            homeCards.textContent = '';

            // Smart "What to Do Next" suggestions
            if (typeof NudgeManager !== 'undefined') {
                NudgeManager.renderSuggestions(homeCards, this.config);
            }

            // Step-by-step flow
            const flow = document.createElement('div');
            flow.className = 'home-flow';

            const flowTitle = document.createElement('h2');
            flowTitle.className = 'home-flow-title';
            flowTitle.textContent = 'Here\u2019s how to study:';
            flow.appendChild(flowTitle);

            const steps = [
                { num: '1', icon: 'fas fa-book', title: 'Learn', desc: 'Read through Flashcards to learn key terms and definitions.', group: 'study', cta: 'Open Study' },
                { num: '2', icon: 'fas fa-clipboard-check', title: 'Practice', desc: 'Take the Practice Test and Fill-in-the-Blank to check yourself.', group: 'practice', cta: 'Open Practice' },
                { num: '3', icon: 'fas fa-gamepad', title: 'Play', desc: 'Play Wordle, Crossword, and more to lock it in.', group: 'games', cta: 'Open Games' }
            ];

            const stepsDiv = document.createElement('div');
            stepsDiv.className = 'home-steps';

            steps.forEach((step) => {
                const stepEl = document.createElement('div');
                stepEl.className = 'home-step';

                const numBadge = document.createElement('div');
                numBadge.className = 'home-step-num';
                numBadge.textContent = step.num;
                stepEl.appendChild(numBadge);

                const content = document.createElement('div');
                content.className = 'home-step-content';

                const titleRow = document.createElement('div');
                titleRow.className = 'home-step-title';
                var icon = document.createElement('i');
                icon.className = step.icon;
                titleRow.appendChild(icon);
                titleRow.appendChild(document.createTextNode(' ' + step.title));
                content.appendChild(titleRow);

                const desc = document.createElement('div');
                desc.className = 'home-step-desc';
                desc.textContent = step.desc;
                content.appendChild(desc);

                stepEl.appendChild(content);

                const ctaBtn = document.createElement('button');
                ctaBtn.className = 'home-step-cta';
                ctaBtn.textContent = step.cta;
                ctaBtn.addEventListener('click', () => {
                    const navBtn = document.querySelector('.nav-btn[data-group="' + step.group + '"]');
                    if (navBtn) navBtn.click();
                });
                stepEl.appendChild(ctaBtn);

                stepsDiv.appendChild(stepEl);
            });

            flow.appendChild(stepsDiv);
            homeCards.appendChild(flow);

            // Historical flavor: random quote card
            this._renderHistoricalQuote(homeCards);
        }
    },

    _quoteIndex: -1,

    _renderHistoricalQuote(container) {
        if (!this.config || !this.config.historicalFlavor) return;
        const flavor = this.config.historicalFlavor;
        if (!flavor.quotes || flavor.quotes.length === 0) return;

        // Pick initial random quote
        if (this._quoteIndex < 0) {
            this._quoteIndex = Math.floor(Math.random() * flavor.quotes.length);
        }

        const card = document.createElement('div');
        card.className = 'card historical-quote-card';
        card.style.cursor = 'pointer';
        card.title = 'Click for next quote';

        this._fillQuoteCard(card, flavor.quotes[this._quoteIndex]);

        // Click to cycle
        var self = this;
        card.addEventListener('click', function(e) {
            // Don't cycle if they clicked a source link
            if (e.target.tagName === 'A') return;
            self._quoteIndex = (self._quoteIndex + 1) % flavor.quotes.length;
            card.style.opacity = '0';
            card.style.transform = 'translateX(20px)';
            setTimeout(function() {
                self._fillQuoteCard(card, flavor.quotes[self._quoteIndex]);
                card.style.opacity = '1';
                card.style.transform = 'translateX(0)';
            }, 200);
        });

        // Hint
        var hint = document.createElement('div');
        hint.className = 'quote-cycle-hint';
        hint.textContent = 'Tap for more quotes';
        card.appendChild(hint);

        container.appendChild(card);
    },

    _fillQuoteCard(card, quote) {
        // Clear existing content but keep event listeners
        var existing = card.querySelector('.historical-quote-inner');
        if (existing) existing.remove();
        var existingHint = card.querySelector('.quote-cycle-hint');

        const inner = document.createElement('div');
        inner.className = 'historical-quote-inner';

        if (quote.portrait) {
            const imgWrap = document.createElement('div');
            imgWrap.className = 'historical-quote-portrait';
            const img = document.createElement('img');
            const unitId = this.config.unit.id;
            if (quote.portrait.startsWith('http')) {
                img.src = quote.portrait;
            } else {
                img.src = '../units/' + unitId + '/' + quote.portrait;
            }
            img.alt = quote.author || '';
            img.loading = 'lazy';
            imgWrap.appendChild(img);
            inner.appendChild(imgWrap);
        }

        const textWrap = document.createElement('div');
        textWrap.className = 'historical-quote-text';

        const quoteText = document.createElement('blockquote');
        quoteText.textContent = '\u201C' + quote.text + '\u201D';
        textWrap.appendChild(quoteText);

        const attribution = document.createElement('div');
        attribution.className = 'historical-quote-author';
        attribution.textContent = '\u2014 ' + quote.author;
        if (quote.source) {
            if (quote.sourceUrl) {
                const srcLink = document.createElement('a');
                srcLink.className = 'historical-quote-source';
                srcLink.href = quote.sourceUrl;
                srcLink.target = '_blank';
                srcLink.rel = 'noopener noreferrer';
                srcLink.textContent = ', ' + quote.source;
                attribution.appendChild(srcLink);
            } else {
                const src = document.createElement('span');
                src.className = 'historical-quote-source';
                src.textContent = ', ' + quote.source;
                attribution.appendChild(src);
            }
        }
        textWrap.appendChild(attribution);
        inner.appendChild(textWrap);

        if (existingHint) {
            card.insertBefore(inner, existingHint);
        } else {
            card.appendChild(inner);
        }
    },

    renderFooterFact() {
        if (!this.config || !this.config.historicalFlavor) return;
        var facts = this.config.historicalFlavor.funFacts;
        if (!facts || facts.length === 0) return;
        var footer = document.getElementById('app-footer');
        if (!footer || footer.querySelector('.footer-fun-fact')) return;
        var fact = facts[Math.floor(Math.random() * facts.length)];
        var factEl = document.createElement('div');
        factEl.className = 'footer-fun-fact';
        var bulb = document.createElement('i');
        bulb.className = 'fas fa-lightbulb';
        factEl.appendChild(bulb);
        var factText = typeof fact === 'string' ? fact : fact.text;
        factEl.appendChild(document.createTextNode(factText));
        footer.insertBefore(factEl, footer.firstChild);
    },

    showUnitError(message) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';
        const titleEl = document.getElementById('title-text');
        titleEl.textContent = 'Error';
        const headerIcon = document.querySelector('#site-title i');
        if (headerIcon) headerIcon.className = 'fas fa-exclamation-triangle';
        document.getElementById('site-subtitle').textContent = message;
    },

    // showModal uses innerHTML for trusted content only (our own code/teacher config data)
    showModal(contentHtml) {
        const overlay = document.getElementById('modal-overlay');
        const wrapper = document.createElement('div');
        wrapper.className = 'modal-content';
        wrapper.innerHTML = contentHtml; // trusted source: internal template strings only
        overlay.textContent = '';
        overlay.appendChild(wrapper);
        overlay.classList.add('active');
    },

    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('active');
        overlay.textContent = '';
    },

    showLoginModal() {
        ProgressManager.showLoginModal();
    },

    // Redirect new students to How to Study page after first sign-in
    redirectToHowToStudy() {
        var unitParam = this.config ? this.config.unit.id : '';
        var suffix = unitParam ? '?unit=' + encodeURIComponent(unitParam) : '';
        localStorage.setItem('how-to-study-seen', '1');
        window.location.href = 'how-to-study.html' + suffix;
    },

    // Show a rare nudge toast pointing to How to Study (once per session, only if badge not earned)
    _scheduleHowToStudyNudge() {
        if (!this.config) return;
        var unitId = this.config.unit.id;

        // Don't nudge if they already earned the badge
        var achKey = 'achievements-' + unitId;
        try {
            var achData = JSON.parse(localStorage.getItem(achKey) || '{}');
            if (achData['study-smart']) return;
        } catch (e) { return; }

        // Don't nudge if already seen How to Study page
        if (localStorage.getItem('how-to-study-seen')) return;

        // Show nudge after 90 seconds of using the app
        var self = this;
        setTimeout(function() {
            // Re-check badge in case they earned it in the meantime
            try {
                var fresh = JSON.parse(localStorage.getItem(achKey) || '{}');
                if (fresh['study-smart']) return;
            } catch (e) { return; }

            if (typeof StudyUtils !== 'undefined' && StudyUtils.showToast) {
                StudyUtils.showToast('Tip: Check out "How to Study" to earn a badge and learn study strategies that actually work!', 'info', 8000);
            }
            // Mark as nudged so we don't keep showing it
            localStorage.setItem('how-to-study-seen', '1');
        }, 90000);
    }
};

// Boot on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    StudyEngine.init().then(async () => {
        // Check for magic link redirect first — skip welcome screen if teacher is logging in
        if (typeof CommandPalette !== 'undefined' && CommandPalette.isMagicLinkRedirect()) {
            await CommandPalette.checkAuthRedirect();
            return;
        }

        // Show welcome screen on first visit (after app has loaded)
        if (!ProgressManager.studentInfo) {
            ProgressManager.showWelcomeScreen();
        } else {
            // Schedule a rare nudge to How to Study page (if badge not yet earned)
            StudyEngine._scheduleHowToStudyNudge();
        }
    });

    // Load version info and edit profile link
    // Auto-update: bust cache on version change
    fetch('version.json?_=' + Date.now())
        .then(r => r.ok ? r.json() : null)
        .then(v => {
            if (!v) return;
            var storedVersion = localStorage.getItem('st_app_version');
            if (storedVersion && storedVersion !== v.version) {
                localStorage.setItem('st_app_version', v.version);
                // Clear service worker caches and reload
                if ('caches' in window) {
                    caches.keys().then(function(keys) {
                        return Promise.all(keys.map(function(k) { return caches.delete(k); }));
                    }).then(function() {
                        window.location.reload();
                    });
                } else {
                    window.location.reload();
                }
                return;
            }
            localStorage.setItem('st_app_version', v.version);
        })
        .catch(function() {});

    fetch('version.json')
        .then(r => r.ok ? r.json() : null)
        .then(v => {
            if (v) {
                const footer = document.getElementById('app-footer');
                if (footer) {
                    var versionEl = footer.querySelector('.footer-version');
                    if (!versionEl) {
                        versionEl = document.createElement('span');
                        versionEl.className = 'footer-version';
                        footer.appendChild(versionEl);
                    }
                    versionEl.textContent = 'v' + v.version;

                    // Add footer links (How to Study, Privacy)
                    var unitParam = new URLSearchParams(window.location.search).get('unit');
                    var unitSuffix = unitParam ? '?unit=' + encodeURIComponent(unitParam) : '';

                    if (!footer.querySelector('.footer-how-to-study')) {
                        var studyLink = document.createElement('a');
                        studyLink.className = 'footer-privacy footer-how-to-study';
                        studyLink.href = 'how-to-study.html' + unitSuffix;
                        var studyIcon = document.createElement('i');
                        studyIcon.className = 'fas fa-brain';
                        studyLink.appendChild(studyIcon);
                        studyLink.appendChild(document.createTextNode(' How to Study'));
                        footer.appendChild(studyLink);
                    }

                    if (!footer.querySelector('.footer-privacy-link')) {
                        var privacyLink = document.createElement('a');
                        privacyLink.className = 'footer-privacy footer-privacy-link';
                        privacyLink.href = 'privacy.html' + unitSuffix;
                        var privacyIcon = document.createElement('i');
                        privacyIcon.className = 'fas fa-shield-alt';
                        privacyLink.appendChild(privacyIcon);
                        privacyLink.appendChild(document.createTextNode(' Privacy'));
                        footer.appendChild(privacyLink);
                    }

                    // Add edit profile link if student is signed in
                    if (ProgressManager.studentInfo && !footer.querySelector('.footer-edit-profile')) {
                        var editLink = document.createElement('button');
                        editLink.className = 'footer-edit-profile';
                        editLink.addEventListener('click', function() {
                            ProgressManager.showEditProfile();
                        });
                        var userIcon = document.createElement('i');
                        userIcon.className = 'fas fa-user-edit';
                        editLink.appendChild(userIcon);
                        editLink.appendChild(document.createTextNode(' Edit Profile'));
                        footer.appendChild(editLink);
                    }
                }
            }
        })
        .catch(() => {});
});

// Save study time when tab closes
window.addEventListener('beforeunload', () => ActivityTimer.stop());

// Close modals on overlay click
document.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') StudyEngine.closeModal();
});

// Accessibility: keyboard shortcuts
document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    const isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;

    // Escape closes any open modal
    if (e.key === 'Escape') {
        StudyEngine.closeModal();
        return;
    }

    // Don't process shortcuts when typing in an input
    if (isInput) return;

    // ? key shows keyboard shortcuts help modal
    if (e.key === '?') {
        e.preventDefault();
        if (typeof CommandPalette !== 'undefined') {
            CommandPalette.showShortcuts();
        }
        return;
    }

    // Number keys 1-5 switch nav groups (only when no activity is active)
    if (!StudyEngine.activeActivity && e.key >= '1' && e.key <= '5') {
        const navButtons = document.querySelectorAll('#main-nav .nav-btn');
        const index = parseInt(e.key) - 1;
        if (navButtons[index]) {
            navButtons[index].click();
        }
    }
});

// Easter eggs
(function() {
    // Konami Code: ↑↑↓↓←→←→BA
    var konamiSeq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    var konamiIdx = 0;

    // 1776 sequence
    var yearSeq = ['1','7','7','6'];
    var yearIdx = 0;

    // "we the people" sequence
    var preambleSeq = ['w','e','t','h','e','p','e','o','p','l','e'];
    var preambleIdx = 0;

    document.addEventListener('keydown', function(e) {
        var tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;

        var key = e.key.toLowerCase();

        // Konami code
        if (e.key === konamiSeq[konamiIdx]) {
            konamiIdx++;
            if (konamiIdx === konamiSeq.length) {
                konamiIdx = 0;
                if (typeof StudyUtils !== 'undefined') StudyUtils.showToast('You found a secret! The Founding Fathers approve.', 'success');
                if (typeof AchievementManager !== 'undefined') {
                    AchievementManager.unlock('konami');
                }
            }
        } else {
            konamiIdx = 0;
        }

        // 1776 easter egg
        if (e.key === yearSeq[yearIdx]) {
            yearIdx++;
            if (yearIdx === yearSeq.length) {
                yearIdx = 0;
                var facts = [
                    'Fun fact: The Declaration of Independence was signed by 56 delegates!',
                    'Fun fact: John Adams and Thomas Jefferson both died on July 4, 1826 — the 50th anniversary!',
                    'Fun fact: George Washington never lived in the White House!',
                    'Fun fact: Benjamin Franklin was 70 years old when he signed the Declaration!',
                    'Fun fact: The original US flag had 13 stars in a circle!'
                ];
                if (typeof StudyUtils !== 'undefined') StudyUtils.showToast(facts[Math.floor(Math.random() * facts.length)], 'info');
                if (typeof AchievementManager !== 'undefined') {
                    AchievementManager.unlock('founding-facts');
                }
            }
        } else if (e.key >= '0' && e.key <= '9') {
            yearIdx = (e.key === '1') ? 1 : 0;
        }

        // "wethepeople" easter egg
        if (key === preambleSeq[preambleIdx]) {
            preambleIdx++;
            if (preambleIdx === preambleSeq.length) {
                preambleIdx = 0;
                if (typeof StudyUtils !== 'undefined') StudyUtils.showToast('"We the People of the United States, in Order to form a more perfect Union..." You know your Constitution!', 'success');
                if (typeof AchievementManager !== 'undefined') {
                    AchievementManager.unlock('we-the-people');
                }
            }
        } else {
            preambleIdx = (key === 'w') ? 1 : 0;
        }
    });

    // Header icon tap: 5 rapid clicks
    var headerClicks = 0;
    var headerTimer = null;
    document.addEventListener('click', function(e) {
        var headerIcon = e.target.closest('#site-title i');
        if (!headerIcon) return;
        headerClicks++;
        if (headerTimer) clearTimeout(headerTimer);
        headerTimer = setTimeout(function() { headerClicks = 0; }, 2000);
        if (headerClicks >= 5) {
            headerClicks = 0;
            headerIcon.style.transition = 'transform 0.5s';
            headerIcon.style.transform = 'rotate(360deg)';
            setTimeout(function() { headerIcon.style.transform = ''; }, 600);
            if (typeof StudyUtils !== 'undefined') StudyUtils.showToast('You\'re a history detective! Keep exploring!', 'success');
            if (typeof AchievementManager !== 'undefined') {
                AchievementManager.unlock('book-tap');
            }
        }
    });

    // Hidden eagle in footer: triple-click
    document.addEventListener('click', function(e) {
        var footer = e.target.closest('#app-footer');
        if (!footer) return;
        if (e.detail === 3) {
            if (typeof StudyUtils !== 'undefined') StudyUtils.showToast('You spotted the hidden eagle! E Pluribus Unum!', 'success');
            if (typeof AchievementManager !== 'undefined') {
                AchievementManager.unlock('eagle-eye');
            }
        }
    });

    // Midnight Scholar: check on any interaction at midnight
    document.addEventListener('click', function() {
        var hour = new Date().getHours();
        if (hour === 0 && typeof AchievementManager !== 'undefined') {
            AchievementManager.unlock('midnight-scholar');
        }
    });
})();
