var AchievementManager = {
    achievements: [
        { id: 'first-steps', name: 'First Steps', description: 'Complete any activity for the first time.', icon: 'fas fa-shoe-prints', unlocked: false, unlockedAt: null },
        { id: 'bookworm', name: 'Bookworm', description: 'View all flashcards in a session.', icon: 'fas fa-book-reader', unlocked: false, unlockedAt: null },
        { id: 'perfect-score', name: 'Perfect Score', description: 'Get 100% on any quiz or test.', icon: 'fas fa-star', unlocked: false, unlockedAt: null },
        { id: 'speed-demon', name: 'Speed Demon', description: 'Score 15+ in Lightning Round.', icon: 'fas fa-bolt', unlocked: false, unlockedAt: null },
        { id: 'word-wizard', name: 'Word Wizard', description: 'Win 5 Wordle games.', icon: 'fas fa-hat-wizard', unlocked: false, unlockedAt: null },
        { id: 'streak-3', name: 'On a Roll', description: 'Get a 3-game winning streak in any game.', icon: 'fas fa-fire', unlocked: false, unlockedAt: null },
        { id: 'streak-7', name: 'Unstoppable', description: 'Get a 7-game winning streak.', icon: 'fas fa-fire-alt', unlocked: false, unlockedAt: null },
        { id: 'timeline-master', name: 'Timeline Master', description: 'Get a perfect timeline score.', icon: 'fas fa-history', unlocked: false, unlockedAt: null },
        { id: 'source-sleuth', name: 'Source Sleuth', description: 'Score 90%+ on Source Analysis.', icon: 'fas fa-search', unlocked: false, unlockedAt: null },
        { id: 'night-owl', name: 'Night Owl', description: 'Study after 8 PM.', icon: 'fas fa-moon', unlocked: false, unlockedAt: null },
        { id: 'early-bird', name: 'Early Bird', description: 'Study before 7 AM.', icon: 'fas fa-sun', unlocked: false, unlockedAt: null },
        { id: 'dedicated', name: 'Dedicated', description: 'Study 3 days in a row.', icon: 'fas fa-calendar-check', unlocked: false, unlockedAt: null },
        { id: 'completionist', name: 'Completionist', description: 'Try every activity at least once.', icon: 'fas fa-trophy', unlocked: false, unlockedAt: null },
        { id: 'half-century', name: 'Half Century', description: 'Answer 50 questions correctly total.', icon: 'fas fa-medal', unlocked: false, unlockedAt: null },
        { id: 'century', name: 'Century Club', description: 'Answer 100 questions correctly total.', icon: 'fas fa-award', unlocked: false, unlockedAt: null },
        { id: 'email-mr-b', name: 'Reaching Out', description: 'You studied enough to email Mr. B!', icon: 'fas fa-envelope', unlocked: false, unlockedAt: null },
        { id: 'konami', name: 'Cheat Code', description: 'Found the Konami Code!', icon: 'fas fa-gamepad', unlocked: false, unlockedAt: null, secret: true },
        { id: 'founding-facts', name: 'History Buff', description: 'Discovered the 1776 secret.', icon: 'fas fa-flag-usa', unlocked: false, unlockedAt: null, secret: true },
        { id: 'book-tap', name: 'Curious Mind', description: 'Found the hidden header secret.', icon: 'fas fa-eye', unlocked: false, unlockedAt: null, secret: true },
        { id: 'we-the-people', name: 'We The People', description: 'Typed the famous preamble opening.', icon: 'fas fa-scroll', unlocked: false, unlockedAt: null, secret: true },
        { id: 'eagle-eye', name: 'Eagle Eye', description: 'Found the hidden eagle.', icon: 'fas fa-dove', unlocked: false, unlockedAt: null, secret: true },
        { id: 'midnight-scholar', name: 'Midnight Scholar', description: 'Studying at midnight! True dedication.', icon: 'fas fa-hat-wizard', unlocked: false, unlockedAt: null, secret: true },
        { id: 'top-student', name: 'Top Student', description: 'Reached #1 on the leaderboard!', icon: 'fas fa-crown', unlocked: false, unlockedAt: null },
        { id: 'cartographer', name: 'Cartographer', description: 'Got 100% on the Map Quiz with no mistakes.', icon: 'fas fa-map-marked-alt', unlocked: false, unlockedAt: null },
        { id: 'study-smart', name: 'Study Smart', description: 'Passed the How to Study comprehension quiz.', icon: 'fas fa-graduation-cap', unlocked: false, unlockedAt: null }
    ],

    unitId: null,

    init: function(unitId) {
        this.unitId = unitId;
        var storageKey = 'achievements-' + unitId;
        var saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                var data = JSON.parse(saved);
                for (var i = 0; i < this.achievements.length; i++) {
                    var ach = this.achievements[i];
                    if (data[ach.id]) {
                        ach.unlocked = data[ach.id].unlocked || false;
                        ach.unlockedAt = data[ach.id].unlockedAt || null;
                    }
                }
            } catch (e) {
                console.warn('Could not parse achievements data:', e);
            }
        }
    },

    _save: function() {
        var storageKey = 'achievements-' + this.unitId;
        var data = {};
        for (var i = 0; i < this.achievements.length; i++) {
            var ach = this.achievements[i];
            if (ach.unlocked) {
                data[ach.id] = { unlocked: true, unlockedAt: ach.unlockedAt };
            }
        }
        localStorage.setItem(storageKey, JSON.stringify(data));
    },

    check: function(achievementId) {
        for (var i = 0; i < this.achievements.length; i++) {
            if (this.achievements[i].id === achievementId) {
                return this.achievements[i].unlocked;
            }
        }
        return false;
    },

    unlock: function(achievementId) {
        for (var i = 0; i < this.achievements.length; i++) {
            var ach = this.achievements[i];
            if (ach.id === achievementId && !ach.unlocked) {
                ach.unlocked = true;
                ach.unlockedAt = new Date().toISOString();
                this._save();
                if (typeof StudyUtils !== 'undefined' && StudyUtils.showToast) {
                    StudyUtils.showToast('Achievement Unlocked: ' + ach.name, 'success');
                }
                this.showConfetti();
                return true;
            }
        }
        return false;
    },

    getAll: function() {
        return this.achievements;
    },

    getUnlocked: function() {
        var result = [];
        for (var i = 0; i < this.achievements.length; i++) {
            if (this.achievements[i].unlocked) {
                result.push(this.achievements[i]);
            }
        }
        return result;
    },

    checkAndAward: function(context) {
        if (!context) return;

        // First Steps - complete any activity
        if (context.event === 'complete' || context.event === 'win' || context.event === 'finish') {
            this.unlock('first-steps');
        }

        // Bookworm - view all flashcards
        if (context.activity === 'flashcards' && context.event === 'viewedAll') {
            this.unlock('bookworm');
        }

        // Perfect Score - 100% on quiz or test
        if (context.score === 100 && (context.activity === 'quiz' || context.activity === 'test' || context.event === 'perfect')) {
            this.unlock('perfect-score');
        }

        // Speed Demon - 15+ in Lightning Round
        if (context.activity === 'lightning' && context.score >= 15) {
            this.unlock('speed-demon');
        }

        // Word Wizard - win 5 Wordle games
        if (context.activity === 'wordle' && context.event === 'win' && context.totalWins >= 5) {
            this.unlock('word-wizard');
        }

        // Streak achievements
        if (context.streak >= 3) {
            this.unlock('streak-3');
        }
        if (context.streak >= 7) {
            this.unlock('streak-7');
        }

        // Timeline Master - perfect timeline
        if (context.activity === 'timeline' && context.event === 'perfect') {
            this.unlock('timeline-master');
        }

        // Source Sleuth - 90%+ on Source Analysis
        if (context.activity === 'source-analysis' && context.score >= 90) {
            this.unlock('source-sleuth');
        }

        // Cartographer - perfect map quiz
        if (context.activity === 'map-quiz' && context.event === 'cartographer') {
            this.unlock('cartographer');
        }

        // Night Owl - study after 8 PM
        var hour = new Date().getHours();
        if (hour >= 20) {
            this.unlock('night-owl');
        }

        // Early Bird - study before 7 AM
        if (hour < 7) {
            this.unlock('early-bird');
        }

        // Dedicated - 3 days in a row
        if (context.studyStreak >= 3) {
            this.unlock('dedicated');
        }

        // Completionist - tried every activity
        if (context.event === 'allActivitiesTried') {
            this.unlock('completionist');
        }

        // Half Century - 50 correct answers
        if (context.totalCorrect >= 50) {
            this.unlock('half-century');
        }

        // Century Club - 100 correct answers
        if (context.totalCorrect >= 100) {
            this.unlock('century');
        }

        // Email Mr. B - after 5 activity completions
        if (context.event === 'complete' || context.event === 'win' || context.event === 'finish' || context.event === 'perfect') {
            var countKey = 'completion-count-' + this.unitId;
            var count = parseInt(localStorage.getItem(countKey) || '0', 10) + 1;
            localStorage.setItem(countKey, String(count));
            if (count >= 5 && !this.check('email-mr-b')) {
                this.unlock('email-mr-b');
            }
        }
    },

    showConfetti: function() {
        var container = document.createElement('div');
        container.className = 'confetti';
        var colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#00bcd4', '#4caf50', '#ffeb3b', '#ff9800'];
        var pieceCount = 25;

        for (var i = 0; i < pieceCount; i++) {
            var piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + '%';
            piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDelay = Math.random() * 0.5 + 's';
            piece.style.animationDuration = (1 + Math.random()) + 's';
            if (Math.random() > 0.5) {
                piece.style.borderRadius = '50%';
            }
            container.appendChild(piece);
        }

        document.body.appendChild(container);
        setTimeout(function() {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }, 2000);
    },

    renderBadges: function(container) {
        container.textContent = '';

        var unlockedCount = this.getUnlocked().length;
        var visibleCount = 0;
        var secretUnlocked = 0;
        for (var j = 0; j < this.achievements.length; j++) {
            if (!this.achievements[j].secret) visibleCount++;
            if (this.achievements[j].secret && this.achievements[j].unlocked) secretUnlocked++;
        }

        var heading = document.createElement('div');
        heading.style.display = 'flex';
        heading.style.alignItems = 'center';
        heading.style.justifyContent = 'space-between';
        heading.style.marginBottom = '6px';

        var title = document.createElement('span');
        title.style.color = 'var(--primary)';
        title.style.fontWeight = '700';
        title.style.fontSize = '0.85em';
        title.textContent = 'Achievements';
        heading.appendChild(title);

        var summary = document.createElement('span');
        summary.style.color = 'var(--text-muted)';
        summary.style.fontSize = '0.75em';
        var summaryText = unlockedCount + '/' + visibleCount;
        if (secretUnlocked > 0) summaryText += ' + ' + secretUnlocked + ' secret';
        summary.textContent = summaryText;
        heading.appendChild(summary);

        container.appendChild(heading);

        var grid = document.createElement('div');
        grid.className = 'ach-grid';

        var self = this;
        for (var i = 0; i < this.achievements.length; i++) {
            (function(ach) {
                // Hide locked secret badges entirely
                if (ach.secret && !ach.unlocked) return;

                var badge = document.createElement('div');
                badge.className = 'ach-badge ' + (ach.unlocked ? 'unlocked' : 'locked');
                if (ach.secret && ach.unlocked) badge.classList.add('secret');

                var iconWrap = document.createElement('div');
                iconWrap.className = 'ach-icon';
                var icon = document.createElement('i');
                if (ach.unlocked) {
                    icon.className = ach.icon;
                } else {
                    icon.className = 'fas fa-question';
                }
                iconWrap.appendChild(icon);
                badge.appendChild(iconWrap);

                var name = document.createElement('div');
                name.className = 'ach-name';
                name.textContent = ach.unlocked ? ach.name : '???';
                badge.appendChild(name);

                if (ach.unlocked) {
                    badge.addEventListener('click', function() {
                        var earnedDate = ach.unlockedAt ? new Date(ach.unlockedAt).toLocaleDateString() : 'Unknown';
                        if (typeof StudyUtils !== 'undefined' && StudyUtils.showToast) {
                            StudyUtils.showToast(ach.name + ' - Earned ' + earnedDate, 'info');
                        }
                    });
                    badge.style.cursor = 'pointer';
                }

                grid.appendChild(badge);
            })(this.achievements[i]);
        }

        container.appendChild(grid);
    }
};
