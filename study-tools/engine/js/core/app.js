const StudyEngine = {
    config: null,
    activities: {},
    activeActivity: null,

    async init() {
        const unitId = new URLSearchParams(window.location.search).get('unit');
        if (!unitId) {
            this.showUnitError('No unit specified. Add ?unit=unit-name to the URL.');
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

        // Hide loading screen
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';

        this.applyTheme();
        if (typeof AchievementManager !== 'undefined') AchievementManager.init(this.config.unit.id);
        this.renderHeader();
        await this.loadActivities();
    },

    applyTheme() {
        const theme = this.config.unit.theme;
        document.documentElement.style.setProperty('--primary', theme.primary);
        document.documentElement.style.setProperty('--secondary', theme.secondary);
        document.documentElement.style.setProperty('--accent', theme.accent);
        document.title = `${this.config.unit.title} - Study Tool`;
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
        this.showHome();
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

        // Group activities by category
        const groups = { study: [], practice: [], games: [] };
        Object.values(this.activities).forEach(a => {
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

        // Tools button
        const toolsBtn = this.createNavButton('Tools', 'tools', () => this.showTools());
        nav.appendChild(toolsBtn);
    },

    createNavButton(label, id, onClick) {
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.dataset.group = id;

        // Add icon if available
        const icons = { home: 'fas fa-home', study: 'fas fa-book', practice: 'fas fa-clipboard-check', games: 'fas fa-gamepad', tools: 'fas fa-tools' };
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

                if (a.category !== 'study') {
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

    activateActivity(activityId) {
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
        const container = document.getElementById('activity-container');
        container.textContent = '';
        container.classList.add('active');
        document.getElementById('home-section').classList.remove('active');
        document.getElementById('sub-nav').classList.remove('active');

        // Add back button
        const backBtn = document.createElement('button');
        backBtn.className = 'nav-button';
        backBtn.style.marginBottom = '16px';
        const backIcon = document.createElement('i');
        backIcon.className = 'fas fa-arrow-left';
        backBtn.appendChild(backIcon);
        backBtn.appendChild(document.createTextNode(' Back to Activities'));
        backBtn.addEventListener('click', () => {
            // Find which group this activity belongs to
            const groups = { study: [], practice: [], games: [] };
            Object.values(this.activities).forEach(a => {
                const cat = a.category || 'games';
                if (groups[cat]) groups[cat].push(a);
            });
            const groupId = activity.category || 'games';
            this.showSubNav(groupId, groups[groupId]);
            // Update nav active state
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.remove('active');
                if (b.dataset.group === groupId) b.classList.add('active');
            });
        });
        container.appendChild(backBtn);

        // Render and activate
        activity.render(container, this.config);

        // Load saved progress
        const saved = ProgressManager.getActivityProgress(this.config.unit.id, activityId);
        if (saved) activity.loadProgress?.(saved);

        activity.activate?.();

        // Update streak
        ProgressManager.updateStreak(this.config.unit.id);
    },

    showHome() {
        document.getElementById('sub-nav').classList.remove('active');
        document.getElementById('activity-container').classList.remove('active');
        document.getElementById('home-section').classList.add('active');

        if (this.activeActivity && this.activities[this.activeActivity]) {
            this.activities[this.activeActivity].deactivate?.();
            this.activeActivity = null;
        }

        this.renderHomeStats();
    },

    showTools() {
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
            { icon: 'fas fa-download', title: 'Export Progress', desc: 'Download your study progress.', action: 'StudyTools.exportProgress()' }
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

        var badgesContainer = document.getElementById('badges-container');
        if (badgesContainer) {
            AchievementManager.renderBadges(badgesContainer);
        }

        const homeCards = document.getElementById('home-cards');
        if (homeCards && homeCards.children.length === 0) {
            homeCards.textContent = '';

            const welcome = document.createElement('div');
            welcome.className = 'card';
            welcome.style.marginBottom = '20px';
            welcome.style.textAlign = 'center';
            welcome.style.padding = '24px';

            const welcomeTitle = document.createElement('h2');
            const homeFirstName = ProgressManager.getFirstName();
            welcomeTitle.textContent = homeFirstName
                ? 'Ready to study, ' + homeFirstName + '? Here\u2019s your game plan:'
                : 'Ready to study? Here\u2019s your game plan:';
            welcomeTitle.style.color = 'var(--primary)';
            welcome.appendChild(welcomeTitle);

            const steps = [
                { icon: 'fas fa-book', text: 'Start with Flashcards to learn the terms', group: 'study' },
                { icon: 'fas fa-clipboard-check', text: 'Test yourself with Practice activities', group: 'practice' },
                { icon: 'fas fa-gamepad', text: 'Play Games to reinforce what you learned', group: 'games' }
            ];

            const stepsDiv = document.createElement('div');
            stepsDiv.style.display = 'flex';
            stepsDiv.style.flexWrap = 'wrap';
            stepsDiv.style.gap = '16px';
            stepsDiv.style.justifyContent = 'center';
            stepsDiv.style.marginTop = '16px';

            steps.forEach((step) => {
                const stepCard = document.createElement('div');
                stepCard.className = 'card activity-card';
                stepCard.style.cursor = 'pointer';
                stepCard.style.flex = '1';
                stepCard.style.minWidth = '200px';
                stepCard.style.maxWidth = '280px';

                const num = document.createElement('div');
                num.style.fontSize = '2em';
                num.style.color = 'var(--primary)';
                const icon = document.createElement('i');
                icon.className = step.icon;
                num.appendChild(icon);
                stepCard.appendChild(num);

                const text = document.createElement('p');
                text.textContent = step.text;
                text.style.marginTop = '8px';
                stepCard.appendChild(text);

                stepCard.addEventListener('click', () => {
                    const navBtn = document.querySelector('.nav-btn[data-group="' + step.group + '"]');
                    if (navBtn) navBtn.click();
                });

                stepsDiv.appendChild(stepCard);
            });

            welcome.appendChild(stepsDiv);
            homeCards.appendChild(welcome);
        }
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
    }
};

// Boot on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    StudyEngine.init().then(() => {
        // Show welcome screen on first visit (after app has loaded)
        if (!ProgressManager.studentInfo) {
            ProgressManager.showWelcomeScreen();
        }
    });

    // Load version info
    fetch('version.json')
        .then(r => r.ok ? r.json() : null)
        .then(v => {
            if (v) {
                const footer = document.getElementById('app-footer');
                if (footer) footer.textContent = 'v' + v.version;
            }
        })
        .catch(() => {});
});

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
        StudyEngine.showModal(
            '<div class="modal-header"><h2>Keyboard Shortcuts</h2>' +
            '<button class="close-btn" onclick="StudyEngine.closeModal()">&times;</button></div>' +
            '<div class="shortcuts-list">' +
            '<div class="shortcut-item"><span class="shortcut-key">?</span><div class="shortcut-description">Show this help</div></div>' +
            '<div class="shortcut-item"><span class="shortcut-key">Esc</span><div class="shortcut-description">Close any open modal</div></div>' +
            '<div class="shortcut-item"><span class="shortcut-key">1</span><div class="shortcut-description">Go to Home</div></div>' +
            '<div class="shortcut-item"><span class="shortcut-key">2</span><div class="shortcut-description">Go to Study</div></div>' +
            '<div class="shortcut-item"><span class="shortcut-key">3</span><div class="shortcut-description">Go to Practice</div></div>' +
            '<div class="shortcut-item"><span class="shortcut-key">4</span><div class="shortcut-description">Go to Games</div></div>' +
            '<div class="shortcut-item"><span class="shortcut-key">5</span><div class="shortcut-description">Go to Tools</div></div>' +
            '</div>'
        );
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
