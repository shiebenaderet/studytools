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

        this.applyTheme();
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
        btn.textContent = label;
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
        heading.textContent = 'Choose an activity:';
        picker.appendChild(heading);

        const grid = document.createElement('div');
        grid.className = 'activity-card-grid';

        items.forEach(a => {
            const card = document.createElement('div');
            card.className = 'card activity-card';
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

            const btn = document.createElement('button');
            btn.className = 'card-button';
            btn.textContent = 'Start';
            card.appendChild(btn);

            grid.appendChild(card);
        });

        picker.appendChild(grid);
        container.appendChild(picker);
    },

    activateActivity(activityId) {
        const activity = this.activities[activityId];
        if (!activity) return;

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
            { icon: 'fas fa-edit', title: 'Note-Taking Guide', desc: 'Organized notes by topic to help you study effectively.', action: 'StudyTools.openNotes()' },
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
    },

    showUnitError(message) {
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
document.addEventListener('DOMContentLoaded', () => StudyEngine.init());

// Close modals on overlay click
document.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') StudyEngine.closeModal();
});
