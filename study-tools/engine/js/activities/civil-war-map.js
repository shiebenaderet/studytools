// Civil War Map activity — point-click city quiz.
// Different mechanic from the 1861 map quiz (which clicks state polygons):
// here students identify cities by clicking dots on a continental US background.
//
// Modes:
//   Learn — click any city dot to see info. No scoring.
//   Quiz  — student is shown a city name and clicks where it is on the map.
//           Points awarded for correct picks within tolerance radius.
StudyEngine.registerActivity({
    id: 'civil-war-map',
    name: 'Civil War Map',
    icon: 'fas fa-flag-usa',
    description: 'Find Civil War battles, capitals, and strategic cities on the map.',
    category: 'study',
    hidden: true, // launched via the maps-hub chooser

    _container: null,
    _config: null,
    _mode: null,        // 'menu' | 'learn' | 'quiz'
    _quizCities: null,  // queue of cities to ask in quiz mode
    _quizIndex: 0,
    _quizScore: 0,
    _quizMistakes: 0,
    _quizStartTime: null,
    _selectedCity: null, // for Learn mode tooltip

    render(container, config) {
        this._container = container;
        this._config = config;
        this._showMenu();
    },

    _showMenu() {
        var c = this._container;
        c.textContent = '';
        c.className = 'cw-map-screen';

        var wrapper = document.createElement('div');
        wrapper.className = 'cw-map-menu';

        var title = document.createElement('h2');
        title.textContent = 'Civil War Map';
        wrapper.appendChild(title);

        var desc = document.createElement('p');
        desc.className = 'cw-map-menu-desc';
        desc.textContent = '19 places that shaped the Civil War: 13 battles, 3 capitals, and 3 strategic cities. Pick a mode to begin.';
        wrapper.appendChild(desc);

        var modes = document.createElement('div');
        modes.className = 'cw-map-modes';

        var learnBtn = this._modeCard('Learn Mode', 'Explore the map. Click any place to read about it. No scoring.', 'fas fa-book-open', function() {
            this._startLearn();
        }.bind(this));
        modes.appendChild(learnBtn);

        var quizBtn = this._modeCard('Quiz Mode', 'You\'ll be given a place to find. Click where it is on the map. Track your score.', 'fas fa-bullseye', function() {
            this._startQuiz();
        }.bind(this));
        modes.appendChild(quizBtn);

        wrapper.appendChild(modes);

        // Show personal best if any
        var saved = ProgressManager.getActivityProgress(this._config.unit.id, 'civil-war-map') || {};
        if (typeof saved.bestScore === 'number') {
            var best = document.createElement('div');
            best.className = 'cw-map-best';
            best.textContent = 'Personal best: ' + saved.bestScore + '/' + (window.CIVIL_WAR_MAP_CITIES.length) +
                (saved.bestTime ? ' in ' + this._formatTime(saved.bestTime) : '');
            wrapper.appendChild(best);
        }

        c.appendChild(wrapper);
    },

    _modeCard(title, desc, iconClass, onClick) {
        var card = document.createElement('button');
        card.className = 'cw-map-mode-card';

        var iconWrap = document.createElement('div');
        iconWrap.className = 'cw-map-mode-icon';
        var icon = document.createElement('i');
        icon.className = iconClass;
        iconWrap.appendChild(icon);
        card.appendChild(iconWrap);

        var h = document.createElement('h3');
        h.textContent = title;
        card.appendChild(h);

        var p = document.createElement('p');
        p.textContent = desc;
        card.appendChild(p);

        card.addEventListener('click', onClick);
        return card;
    },

    // ─── Learn Mode ───────────────────────────────────────

    _startLearn() {
        this._mode = 'learn';
        this._selectedCity = null;
        this._renderMap('learn');
    },

    // ─── Quiz Mode ────────────────────────────────────────

    _startQuiz() {
        this._mode = 'quiz';
        var cities = window.CIVIL_WAR_MAP_CITIES.slice();
        // Shuffle
        for (var i = cities.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = cities[i]; cities[i] = cities[j]; cities[j] = tmp;
        }
        this._quizCities = cities;
        this._quizIndex = 0;
        this._quizScore = 0;
        this._quizMistakes = 0;
        this._quizStartTime = Date.now();
        this._renderMap('quiz');
    },

    _renderMap(mode) {
        var c = this._container;
        c.textContent = '';
        c.className = 'cw-map-screen cw-map-' + mode;

        // Header bar
        var header = document.createElement('div');
        header.className = 'cw-map-header';

        var backBtn = document.createElement('button');
        backBtn.className = 'cw-map-back-btn';
        var backIcon = document.createElement('i');
        backIcon.className = 'fas fa-arrow-left';
        backBtn.appendChild(backIcon);
        backBtn.appendChild(document.createTextNode(' Back'));
        backBtn.addEventListener('click', this._showMenu.bind(this));
        header.appendChild(backBtn);

        var headerInfo = document.createElement('div');
        headerInfo.className = 'cw-map-header-info';
        headerInfo.id = 'cw-map-header-info';
        header.appendChild(headerInfo);

        c.appendChild(header);

        // Map SVG
        var svgWrap = document.createElement('div');
        svgWrap.className = 'cw-map-svg-wrap';

        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 900 725');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.setAttribute('class', 'cw-map-svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        // Base map: states (filled), lakes (water-colored), rivers (blue lines).
        // Drawn back to front: states → lakes → rivers → cities.
        var base = window.CIVIL_WAR_MAP_BASE || { states: [], lakes: [], rivers: [] };

        var statesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        statesGroup.setAttribute('class', 'cw-map-states');
        for (var s = 0; s < base.states.length; s++) {
            var state = base.states[s];
            var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', state.d);
            path.setAttribute('class', 'cw-map-state cw-map-state-' + state.admin);
            statesGroup.appendChild(path);
        }
        svg.appendChild(statesGroup);

        var lakesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        lakesGroup.setAttribute('class', 'cw-map-lakes');
        for (var l = 0; l < base.lakes.length; l++) {
            var lake = base.lakes[l];
            var lakePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            lakePath.setAttribute('d', lake.d);
            lakePath.setAttribute('class', 'cw-map-lake');
            lakesGroup.appendChild(lakePath);
        }
        svg.appendChild(lakesGroup);

        var riversGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        riversGroup.setAttribute('class', 'cw-map-rivers');
        for (var r = 0; r < base.rivers.length; r++) {
            var river = base.rivers[r];
            var riverLine = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            riverLine.setAttribute('points', river.points);
            riverLine.setAttribute('class', 'cw-map-river');
            riversGroup.appendChild(riverLine);
        }
        svg.appendChild(riversGroup);

        // City layer
        var cityGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        cityGroup.setAttribute('class', 'cw-map-cities');

        var cities = window.CIVIL_WAR_MAP_CITIES;
        for (var i = 0; i < cities.length; i++) {
            this._renderCity(cityGroup, cities[i], mode);
        }

        svg.appendChild(cityGroup);

        // Learn mode: clicking outside a city group dismisses the tooltip.
        // Quiz mode: clicking blank background does nothing — misclicks should
        // not be marked wrong (reported by Tianyu, 2026-05-30).
        if (mode === 'learn') {
            svg.addEventListener('click', function(e) {
                // City clicks have stopPropagation, so anything reaching here is a non-city click
                this._dismissLearnTooltip();
            }.bind(this));
        }

        svgWrap.appendChild(svg);
        c.appendChild(svgWrap);

        // Mode-specific footer / panels
        if (mode === 'learn') {
            this._renderLearnPanel();
        } else {
            this._renderQuizPanel();
        }
    },

    _renderCity(parent, city, mode) {
        var self = this;
        var color = window.CIVIL_WAR_MAP_TYPE_COLORS[city.type] || '#5a7a9a';

        var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'cw-map-city cw-map-city-' + city.type);
        g.dataset.cityId = city.id;

        // Outer ring (hit target, larger than visible dot)
        var hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        hitbox.setAttribute('cx', city.x);
        hitbox.setAttribute('cy', city.y);
        hitbox.setAttribute('r', 16);
        hitbox.setAttribute('fill', 'transparent');
        hitbox.setAttribute('class', 'cw-map-city-hit');
        g.appendChild(hitbox);

        // Visible dot
        var dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', city.x);
        dot.setAttribute('cy', city.y);
        dot.setAttribute('r', 7);
        dot.setAttribute('fill', color);
        dot.setAttribute('stroke', '#fff');
        dot.setAttribute('stroke-width', 2);
        dot.setAttribute('class', 'cw-map-city-dot');
        g.appendChild(dot);

        // In learn mode: city labels rendered always
        if (mode === 'learn') {
            this._addCityLabel(g, city);
        }

        if (mode === 'learn') {
            g.addEventListener('click', function(e) {
                e.stopPropagation();
                self._selectLearnCity(city);
            });
        } else {
            // Quiz mode: hits handled by group click
            g.addEventListener('click', function(e) {
                e.stopPropagation();
                self._onCityClickQuiz(city);
            });
        }

        parent.appendChild(g);
    },

    _addCityLabel(parent, city) {
        var labelOffset = city.labelOffset || { x: 0, y: -14 };
        var leader = city.labelLeader;

        if (leader) {
            // Cities clustered tightly use leader-line labels
            var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', city.x);
            line.setAttribute('y1', city.y);
            line.setAttribute('x2', leader.x);
            line.setAttribute('y2', leader.y);
            line.setAttribute('class', 'cw-map-leader');
            parent.appendChild(line);

            var leaderText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            leaderText.setAttribute('x', leader.x);
            leaderText.setAttribute('y', leader.y - 4);
            leaderText.setAttribute('class', 'cw-map-label');
            leaderText.setAttribute('text-anchor', leader.x > 600 ? 'start' : 'end');
            leaderText.textContent = city.shortName || city.name;
            parent.appendChild(leaderText);
        } else {
            var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', city.x + labelOffset.x);
            text.setAttribute('y', city.y + labelOffset.y);
            text.setAttribute('class', 'cw-map-label');
            text.setAttribute('text-anchor', 'middle');
            text.textContent = city.shortName || city.name;
            parent.appendChild(text);
        }
    },

    _selectLearnCity(city) {
        this._selectedCity = city;
        // Highlight the selected dot
        var dots = this._container.querySelectorAll('.cw-map-city');
        for (var i = 0; i < dots.length; i++) {
            dots[i].classList.toggle('selected', dots[i].dataset.cityId === city.id);
        }
        this._renderLearnPanel();
    },

    _dismissLearnTooltip() {
        this._selectedCity = null;
        var dots = this._container.querySelectorAll('.cw-map-city');
        for (var i = 0; i < dots.length; i++) {
            dots[i].classList.remove('selected');
        }
        this._renderLearnPanel();
    },

    _renderLearnPanel() {
        var existing = document.getElementById('cw-map-panel');
        if (existing) existing.remove();

        var panel = document.createElement('div');
        panel.id = 'cw-map-panel';
        panel.className = 'cw-map-panel';

        // Legend is always visible so students can decode the colors at any time
        var legend = document.createElement('div');
        legend.className = 'cw-map-legend';
        legend.appendChild(this._legendItem('battle', 'Battle'));
        legend.appendChild(this._legendItem('capital', 'Capital'));
        legend.appendChild(this._legendItem('strategic', 'Strategic city'));
        panel.appendChild(legend);

        if (!this._selectedCity) {
            var hint = document.createElement('p');
            hint.className = 'cw-map-panel-hint';
            hint.textContent = 'Click any place on the map to read about it.';
            panel.appendChild(hint);
        } else {
            var c = this._selectedCity;
            var nameRow = document.createElement('div');
            nameRow.className = 'cw-map-panel-name-row';

            var name = document.createElement('h3');
            name.className = 'cw-map-panel-name';
            name.textContent = c.name;
            nameRow.appendChild(name);

            var badge = document.createElement('span');
            badge.className = 'cw-map-panel-badge cw-map-badge-' + c.type;
            var typeLabel = c.type === 'battle' ? (c.year ? 'Battle, ' + c.year : 'Battle')
                : c.type === 'capital' ? 'Capital'
                : 'Strategic city';
            badge.textContent = typeLabel;
            nameRow.appendChild(badge);

            panel.appendChild(nameRow);

            var desc = document.createElement('p');
            desc.className = 'cw-map-panel-desc';
            desc.textContent = c.description;
            panel.appendChild(desc);

            var close = document.createElement('button');
            close.className = 'cw-map-panel-close';
            close.textContent = 'Close';
            close.addEventListener('click', this._dismissLearnTooltip.bind(this));
            panel.appendChild(close);
        }

        this._container.appendChild(panel);
    },

    _legendItem(type, label) {
        var item = document.createElement('div');
        item.className = 'cw-map-legend-item';
        var dot = document.createElement('span');
        dot.className = 'cw-map-legend-dot cw-map-legend-' + type;
        dot.style.background = window.CIVIL_WAR_MAP_TYPE_COLORS[type];
        item.appendChild(dot);
        var t = document.createElement('span');
        t.textContent = label;
        item.appendChild(t);
        return item;
    },

    // ─── Quiz Mode ──────────────────────────────────────

    _renderQuizPanel() {
        var existing = document.getElementById('cw-map-panel');
        if (existing) existing.remove();

        var panel = document.createElement('div');
        panel.id = 'cw-map-panel';
        panel.className = 'cw-map-panel cw-map-panel-quiz';

        // Header info: score and progress
        var info = document.getElementById('cw-map-header-info');
        if (info) {
            info.textContent = '';
            var scoreEl = document.createElement('span');
            scoreEl.className = 'cw-map-score';
            scoreEl.textContent = 'Score: ' + this._quizScore + ' / ' + this._quizCities.length;
            info.appendChild(scoreEl);
            var progressEl = document.createElement('span');
            progressEl.className = 'cw-map-progress';
            progressEl.textContent = 'Question ' + Math.min(this._quizIndex + 1, this._quizCities.length) + ' of ' + this._quizCities.length;
            info.appendChild(progressEl);
        }

        if (this._quizIndex >= this._quizCities.length) {
            this._renderQuizResults(panel);
        } else {
            var current = this._quizCities[this._quizIndex];
            var prompt = document.createElement('div');
            prompt.className = 'cw-map-prompt';

            var promptLabel = document.createElement('div');
            promptLabel.className = 'cw-map-prompt-label';
            promptLabel.textContent = 'Find:';
            prompt.appendChild(promptLabel);

            var promptName = document.createElement('div');
            promptName.className = 'cw-map-prompt-name';
            promptName.textContent = current.name;
            prompt.appendChild(promptName);

            var hint = document.createElement('div');
            hint.className = 'cw-map-prompt-hint';
            hint.textContent = current.type === 'battle' ? 'Battle in ' + (current.year || '')
                : current.type === 'capital' ? 'Capital city'
                : 'Strategic city';
            prompt.appendChild(hint);

            panel.appendChild(prompt);
        }

        this._container.appendChild(panel);
    },

    _onCityClickQuiz(clickedCity) {
        if (this._quizIndex >= this._quizCities.length) return;
        var target = this._quizCities[this._quizIndex];
        if (clickedCity.id === target.id) {
            this._quizScore++;
            this._showQuizFeedback(true, target, null);
        } else {
            this._quizMistakes++;
            this._showQuizFeedback(false, target, clickedCity);
        }
    },

    _showQuizFeedback(correct, target, clickedCity) {
        // Highlight target green; if wrong, highlight clicked red
        var targetEl = this._container.querySelector('.cw-map-city[data-city-id="' + target.id + '"]');
        if (targetEl) targetEl.classList.add('cw-map-flash-correct');

        if (!correct && clickedCity) {
            var wrongEl = this._container.querySelector('.cw-map-city[data-city-id="' + clickedCity.id + '"]');
            if (wrongEl) wrongEl.classList.add('cw-map-flash-wrong');
        }

        var msg = document.createElement('div');
        msg.className = 'cw-map-feedback ' + (correct ? 'correct' : 'wrong');
        if (correct) {
            msg.textContent = 'Correct! ' + target.name + '.';
        } else if (clickedCity) {
            msg.textContent = 'That was ' + clickedCity.name + '. ' + target.name + ' is highlighted.';
        } else {
            msg.textContent = target.name + ' is highlighted.';
        }
        this._container.appendChild(msg);

        var self = this;
        setTimeout(function() {
            msg.remove();
            if (targetEl) targetEl.classList.remove('cw-map-flash-correct');
            var wrong = self._container.querySelector('.cw-map-flash-wrong');
            if (wrong) wrong.classList.remove('cw-map-flash-wrong');
            self._quizIndex++;
            self._renderQuizPanel();
        }, 1400);
    },

    _renderQuizResults(panel) {
        var elapsed = Math.floor((Date.now() - this._quizStartTime) / 1000);
        var pct = Math.round((this._quizScore / this._quizCities.length) * 100);

        // Save best
        var unitId = this._config.unit.id;
        var saved = ProgressManager.getActivityProgress(unitId, 'civil-war-map') || {};
        var prevBest = typeof saved.bestScore === 'number' ? saved.bestScore : -1;
        var prevTime = saved.bestTime || null;
        var newBest = this._quizScore > prevBest;
        ProgressManager.saveActivityProgress(unitId, 'civil-war-map', {
            bestScore: Math.max(prevBest, this._quizScore),
            bestTime: pct === 100 ? (prevTime === null ? elapsed : Math.min(prevTime, elapsed)) : prevTime,
            attempts: (saved.attempts || 0) + 1,
            lastPlayed: new Date().toISOString()
        });

        var heading = document.createElement('h2');
        heading.className = 'cw-map-results-heading';
        heading.textContent = pct === 100 ? 'Perfect Score!' : 'Quiz Complete';
        panel.appendChild(heading);

        var stats = document.createElement('div');
        stats.className = 'cw-map-results-stats';

        function makeStat(label, value) {
            var s = document.createElement('div');
            s.className = 'cw-map-stat';
            var l = document.createElement('span');
            l.className = 'cw-map-stat-label';
            l.textContent = label;
            var v = document.createElement('span');
            v.className = 'cw-map-stat-value';
            v.textContent = value;
            s.appendChild(l);
            s.appendChild(v);
            return s;
        }

        stats.appendChild(makeStat('Score', this._quizScore + ' / ' + this._quizCities.length + ' (' + pct + '%)'));
        stats.appendChild(makeStat('Time', this._formatTime(elapsed)));
        stats.appendChild(makeStat('Mistakes', String(this._quizMistakes)));

        panel.appendChild(stats);

        if (newBest) {
            var newBestMsg = document.createElement('div');
            newBestMsg.className = 'cw-map-results-newbest';
            newBestMsg.textContent = 'New personal best!';
            panel.appendChild(newBestMsg);
        }

        var btnRow = document.createElement('div');
        btnRow.className = 'cw-map-results-buttons';

        var againBtn = document.createElement('button');
        againBtn.className = 'cw-map-btn cw-map-btn-primary';
        againBtn.textContent = 'Play Again';
        againBtn.addEventListener('click', this._startQuiz.bind(this));
        btnRow.appendChild(againBtn);

        var menuBtn = document.createElement('button');
        menuBtn.className = 'cw-map-btn cw-map-btn-secondary';
        menuBtn.textContent = 'Back to Menu';
        menuBtn.addEventListener('click', this._showMenu.bind(this));
        btnRow.appendChild(menuBtn);

        panel.appendChild(btnRow);

        // Award achievement on perfect score
        if (pct === 100 && typeof AchievementManager !== 'undefined') {
            AchievementManager.checkAndAward({ activity: 'civil-war-map', event: 'perfect', score: 100 });
        }
        if (typeof AchievementManager !== 'undefined') {
            AchievementManager.checkAndAward({ activity: 'civil-war-map', event: 'complete' });
        }
    },

    _formatTime(seconds) {
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    },

    deactivate() {
        this._mode = null;
        this._selectedCity = null;
        this._quizCities = null;
    }
});
