StudyEngine.registerActivity({
    id: 'map-quiz',
    name: 'Map Quiz',
    icon: 'fas fa-map-marked-alt',
    description: 'Click the correct state or territory on the 1802 map of the United States',
    category: 'study',
    requires: ['vocabulary'],

    _container: null,
    _config: null,
    _regions: [],
    _queue: [],
    _currentRegion: null,
    _score: 0,
    _total: 0,
    _mistakes: 0,
    _startTime: null,
    _bestScore: 0,
    _bestTime: null,
    _attempts: 0,
    _hintUsed: false,

    // All 24 regions with SVG path data for the 1802-1803 U.S. map
    // Coordinate system: roughly 0-1000 x, 0-650 y, representing continental North America
    // Paths are simplified polygons — not cartographically precise but recognizable
    _mapRegions: [
        // ── NEW ENGLAND ──
        { id: 'nh', name: 'New Hampshire', color: '#4a90d9',
          path: 'M 868,95 L 878,68 L 885,55 L 895,62 L 900,80 L 895,95 L 888,110 L 878,115 L 868,110 Z' },
        { id: 'vt', name: 'Vermont', color: '#5ba55b',
          path: 'M 850,68 L 868,95 L 868,110 L 878,115 L 872,130 L 852,130 L 848,95 Z' },
        { id: 'ma', name: 'Massachusetts', color: '#d4a843',
          path: 'M 878,115 L 888,110 L 895,95 L 900,80 L 920,90 L 925,105 L 918,115 L 905,120 L 895,125 L 878,125 Z' },
        { id: 'ri', name: 'Rhode Island', color: '#c75050',
          path: 'M 905,120 L 918,115 L 920,125 L 910,130 L 905,128 Z' },
        { id: 'ct', name: 'Connecticut', color: '#7b68ae',
          path: 'M 878,125 L 895,125 L 905,128 L 905,140 L 878,140 Z' },

        // ── MID-ATLANTIC ──
        { id: 'ny', name: 'New York', color: '#4a90d9',
          path: 'M 822,100 L 850,68 L 852,130 L 872,130 L 878,125 L 878,140 L 870,155 L 862,160 L 855,155 L 850,160 L 840,155 L 830,145 L 822,130 Z' },
        { id: 'nj', name: 'New Jersey', color: '#d4a843',
          path: 'M 862,160 L 870,155 L 878,165 L 875,180 L 865,190 L 858,180 L 860,170 Z' },
        { id: 'pa', name: 'Pennsylvania', color: '#5ba55b',
          path: 'M 800,145 L 822,130 L 830,145 L 840,155 L 855,155 L 860,170 L 858,180 L 800,180 Z' },
        { id: 'de', name: 'Delaware', color: '#c75050',
          path: 'M 865,190 L 875,185 L 878,195 L 870,200 L 862,198 Z' },
        { id: 'md', name: 'Maryland', color: '#7b68ae',
          path: 'M 818,185 L 858,180 L 865,190 L 862,198 L 855,205 L 840,200 L 830,198 L 818,195 Z' },

        // ── SOUTH ──
        { id: 'va', name: 'Virginia', color: '#4a90d9',
          path: 'M 760,190 L 800,180 L 818,185 L 818,195 L 830,198 L 840,200 L 855,205 L 870,210 L 860,225 L 840,230 L 810,225 L 785,220 L 760,215 Z' },
        { id: 'nc', name: 'North Carolina', color: '#d4a843',
          path: 'M 760,215 L 785,220 L 810,225 L 840,230 L 860,225 L 875,235 L 870,250 L 840,260 L 810,260 L 780,255 L 755,245 L 750,230 Z' },
        { id: 'sc', name: 'South Carolina', color: '#5ba55b',
          path: 'M 755,245 L 780,255 L 810,260 L 820,270 L 810,290 L 790,295 L 770,285 L 755,270 Z' },
        { id: 'ga', name: 'Georgia', color: '#c75050',
          path: 'M 730,270 L 755,245 L 755,270 L 770,285 L 790,295 L 785,320 L 770,340 L 755,345 L 740,330 L 730,310 Z' },
        { id: 'ky', name: 'Kentucky', color: '#7b68ae',
          path: 'M 680,215 L 760,190 L 760,215 L 750,230 L 740,235 L 720,238 L 700,240 L 680,235 Z' },
        { id: 'tn', name: 'Tennessee', color: '#d4a843',
          path: 'M 668,240 L 740,235 L 750,230 L 755,245 L 730,270 L 668,270 Z' },

        // ── TERRITORIES ──
        { id: 'northwest', name: 'Northwest Territory', color: '#6aaa6a',
          path: 'M 620,100 L 680,80 L 740,85 L 800,100 L 822,100 L 822,130 L 800,145 L 800,180 L 760,190 L 680,215 L 680,180 L 650,160 L 620,140 Z' },
        { id: 'indiana', name: 'Indiana Territory', color: '#88b8e8',
          path: 'M 520,110 L 620,100 L 620,140 L 650,160 L 680,180 L 680,215 L 680,235 L 668,240 L 668,270 L 640,270 L 600,250 L 560,220 L 530,180 L 520,150 Z' },
        { id: 'mississippi', name: 'Mississippi Territory', color: '#d4a890',
          path: 'M 640,270 L 668,270 L 730,270 L 730,310 L 740,330 L 735,350 L 720,370 L 700,380 L 680,375 L 660,360 L 640,340 L 640,310 Z' },

        // ── FOREIGN TERRITORIES ──
        { id: 'louisiana', name: 'Colony of Louisiana (France)', color: '#c9a84c',
          path: 'M 300,80 L 520,110 L 520,150 L 530,180 L 560,220 L 600,250 L 640,270 L 640,310 L 640,340 L 660,360 L 680,375 L 700,380 L 700,400 L 680,410 L 650,400 L 600,395 L 550,380 L 500,370 L 450,360 L 400,340 L 350,300 L 310,260 L 290,220 L 280,180 L 285,130 Z' },
        { id: 'west-florida', name: 'West Florida (Spain)', color: '#e8a0a0',
          path: 'M 640,340 L 660,360 L 680,375 L 700,380 L 700,400 L 680,410 L 660,410 L 640,400 L 620,395 L 620,380 L 630,360 Z' },
        { id: 'east-florida', name: 'East Florida (Spain)', color: '#e8b0b0',
          path: 'M 735,350 L 755,345 L 770,340 L 790,350 L 810,370 L 820,400 L 810,430 L 790,450 L 770,445 L 760,430 L 750,410 L 740,390 L 735,370 Z' },
        { id: 'new-spain', name: 'Viceroyalty of New Spain (Spain)', color: '#d9c490',
          path: 'M 100,180 L 280,180 L 290,220 L 310,260 L 350,300 L 400,340 L 450,360 L 500,370 L 550,380 L 600,395 L 620,395 L 620,380 L 600,400 L 550,420 L 500,430 L 400,440 L 300,430 L 200,400 L 150,360 L 120,300 L 100,250 Z' },
        { id: 'unorganized', name: 'Unorganized Territory', color: '#b8c8b8',
          path: 'M 300,80 L 285,130 L 280,180 L 100,180 L 100,100 L 150,60 L 200,40 L 250,30 L 300,40 Z' },
    ],

    render(container, config) {
        this._container = container;
        this._config = config;
        container.textContent = '';

        var saved = ProgressManager.getActivityProgress(config.unit.id, 'map-quiz');
        this._bestScore = saved?.bestScore || 0;
        this._bestTime = saved?.bestTime || null;
        this._attempts = saved?.attempts || 0;

        this._showStartScreen();
    },

    _showStartScreen() {
        var container = this._container;
        container.textContent = '';

        var wrapper = document.createElement('div');
        wrapper.className = 'mq-start-screen';

        var title = document.createElement('h2');
        title.className = 'mq-title';
        title.textContent = 'Map Quiz: The United States, 1802';

        var desc = document.createElement('p');
        desc.className = 'mq-desc';
        desc.textContent = 'Click the correct state or territory on the map. Identify all 24 regions of the early United States before the Louisiana Purchase.';

        wrapper.appendChild(title);
        wrapper.appendChild(desc);

        if (this._bestScore > 0) {
            var best = document.createElement('p');
            best.className = 'mq-best';
            best.textContent = 'Best: ' + this._bestScore + '% correct';
            if (this._bestTime) {
                best.textContent += ' in ' + this._formatTime(this._bestTime);
            }
            wrapper.appendChild(best);
        }

        var startBtn = document.createElement('button');
        startBtn.className = 'nav-button mq-start-btn';
        startBtn.textContent = 'Start Quiz';
        var self = this;
        startBtn.addEventListener('click', function() {
            self._startGame();
        });
        wrapper.appendChild(startBtn);

        container.appendChild(wrapper);
    },

    _startGame() {
        this._score = 0;
        this._total = this._mapRegions.length;
        this._mistakes = 0;
        this._hintUsed = false;
        this._startTime = Date.now();

        // Shuffle the queue
        this._queue = this._mapRegions.slice();
        for (var i = this._queue.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = this._queue[i];
            this._queue[i] = this._queue[j];
            this._queue[j] = temp;
        }

        this._regions = [];
        this._buildGameUI();
        this._nextRegion();
    },

    _buildGameUI() {
        var container = this._container;
        container.textContent = '';

        var wrapper = document.createElement('div');
        wrapper.className = 'mq-game-wrapper';

        // Top bar: prompt + score
        var topBar = document.createElement('div');
        topBar.className = 'mq-topbar';

        var prompt = document.createElement('div');
        prompt.className = 'mq-prompt';
        prompt.id = 'mq-prompt';
        prompt.textContent = 'Loading...';
        topBar.appendChild(prompt);

        var scoreArea = document.createElement('div');
        scoreArea.className = 'mq-score-area';

        var scoreEl = document.createElement('span');
        scoreEl.className = 'mq-score';
        scoreEl.id = 'mq-score';
        scoreEl.textContent = '0/' + this._total;
        scoreArea.appendChild(scoreEl);

        var timerEl = document.createElement('span');
        timerEl.className = 'mq-timer';
        timerEl.id = 'mq-timer';
        timerEl.textContent = '0:00';
        scoreArea.appendChild(timerEl);

        topBar.appendChild(scoreArea);
        wrapper.appendChild(topBar);

        // SVG map
        var svgWrap = document.createElement('div');
        svgWrap.className = 'mq-map-wrap';

        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '80 20 870 460');
        svg.setAttribute('class', 'mq-map');
        svg.id = 'mq-map';

        // Background
        var bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('x', '80');
        bg.setAttribute('y', '20');
        bg.setAttribute('width', '870');
        bg.setAttribute('height', '460');
        bg.setAttribute('fill', '#1a3a5c');
        bg.setAttribute('rx', '8');
        svg.appendChild(bg);

        // Water label
        var waterLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        waterLabel.setAttribute('x', '920');
        waterLabel.setAttribute('y', '160');
        waterLabel.setAttribute('fill', 'rgba(255,255,255,0.15)');
        waterLabel.setAttribute('font-size', '14');
        waterLabel.setAttribute('font-style', 'italic');
        waterLabel.textContent = 'Atlantic Ocean';
        svg.appendChild(waterLabel);

        var gulfLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        gulfLabel.setAttribute('x', '600');
        gulfLabel.setAttribute('y', '440');
        gulfLabel.setAttribute('fill', 'rgba(255,255,255,0.15)');
        gulfLabel.setAttribute('font-size', '14');
        gulfLabel.setAttribute('font-style', 'italic');
        gulfLabel.textContent = 'Gulf of Mexico';
        svg.appendChild(gulfLabel);

        // Draw regions (large territories first, small states on top)
        var drawOrder = [
            'new-spain', 'louisiana', 'unorganized',
            'northwest', 'indiana', 'mississippi',
            'east-florida', 'west-florida',
            'ga', 'va', 'nc', 'sc', 'ky', 'tn',
            'ny', 'pa',
            'md', 'nj', 'de',
            'ct', 'ma', 'nh', 'vt', 'ri'
        ];

        var self = this;
        drawOrder.forEach(function(regionId) {
            var region = null;
            for (var i = 0; i < self._mapRegions.length; i++) {
                if (self._mapRegions[i].id === regionId) {
                    region = self._mapRegions[i];
                    break;
                }
            }
            if (!region) return;

            var group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('class', 'mq-region');
            group.setAttribute('data-id', region.id);

            var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', region.path);
            path.setAttribute('fill', region.color);
            path.setAttribute('stroke', '#0d1b2a');
            path.setAttribute('stroke-width', '1.5');
            path.setAttribute('class', 'mq-region-path');
            path.setAttribute('data-id', region.id);

            group.appendChild(path);

            // Add label for larger regions
            var largeRegions = ['louisiana', 'new-spain', 'unorganized', 'northwest', 'indiana', 'mississippi', 'east-florida'];
            if (largeRegions.indexOf(region.id) !== -1) {
                var center = self._getPathCenter(region.path);
                var label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', center.x);
                label.setAttribute('y', center.y);
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('fill', 'rgba(0,0,0,0.4)');
                label.setAttribute('font-size', region.id === 'louisiana' || region.id === 'new-spain' ? '11' : '8');
                label.setAttribute('font-weight', '600');
                label.setAttribute('pointer-events', 'none');
                label.setAttribute('class', 'mq-region-label');
                label.setAttribute('data-id', region.id);
                label.textContent = '';
                group.appendChild(label);
            }

            group.addEventListener('click', function() {
                self._handleClick(region.id);
            });

            svg.appendChild(group);
        });

        svgWrap.appendChild(svg);
        wrapper.appendChild(svgWrap);

        // Feedback area
        var feedback = document.createElement('div');
        feedback.className = 'mq-feedback';
        feedback.id = 'mq-feedback';
        wrapper.appendChild(feedback);

        container.appendChild(wrapper);

        // Start timer
        this._timerId = setInterval(function() {
            var elapsed = Math.floor((Date.now() - self._startTime) / 1000);
            var el = document.getElementById('mq-timer');
            if (el) el.textContent = self._formatTime(elapsed);
        }, 1000);
    },

    _nextRegion() {
        if (this._queue.length === 0) {
            this._endGame();
            return;
        }

        this._currentRegion = this._queue.shift();
        this._hintUsed = false;

        var prompt = document.getElementById('mq-prompt');
        if (prompt) {
            prompt.textContent = 'Click on: ';
            var strong = document.createElement('strong');
            strong.textContent = this._currentRegion.name;
            prompt.appendChild(strong);
        }

        var feedback = document.getElementById('mq-feedback');
        if (feedback) feedback.textContent = '';

        // Reset hover states
        var paths = document.querySelectorAll('.mq-region-path');
        for (var i = 0; i < paths.length; i++) {
            if (!paths[i].classList.contains('mq-correct')) {
                paths[i].classList.remove('mq-wrong', 'mq-hint');
            }
        }
    },

    _handleClick(clickedId) {
        if (!this._currentRegion) return;

        var correctId = this._currentRegion.id;
        var isCorrect = clickedId === correctId;

        var clickedPath = document.querySelector('.mq-region-path[data-id="' + clickedId + '"]');
        var correctPath = document.querySelector('.mq-region-path[data-id="' + correctId + '"]');
        var feedback = document.getElementById('mq-feedback');

        if (isCorrect) {
            this._score++;

            // Mark as correct permanently
            if (correctPath) {
                correctPath.classList.add('mq-correct');
                correctPath.setAttribute('fill', '#22c55e');
            }

            // Show label on correct region
            var label = document.querySelector('.mq-region-label[data-id="' + correctId + '"]');
            if (label) {
                label.textContent = this._currentRegion.name;
                label.setAttribute('fill', 'rgba(255,255,255,0.9)');
            }

            // For small states without labels, add one
            if (!label) {
                var center = this._getPathCenter(this._currentRegion.path);
                var svg = document.getElementById('mq-map');
                var newLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                newLabel.setAttribute('x', center.x);
                newLabel.setAttribute('y', center.y);
                newLabel.setAttribute('text-anchor', 'middle');
                newLabel.setAttribute('fill', 'rgba(255,255,255,0.9)');
                newLabel.setAttribute('font-size', '7');
                newLabel.setAttribute('font-weight', '600');
                newLabel.setAttribute('pointer-events', 'none');
                // Use abbreviation for small states
                var abbrevs = {
                    'nh': 'NH', 'vt': 'VT', 'ma': 'MA', 'ri': 'RI', 'ct': 'CT',
                    'ny': 'NY', 'nj': 'NJ', 'pa': 'PA', 'de': 'DE', 'md': 'MD',
                    'va': 'VA', 'nc': 'NC', 'sc': 'SC', 'ga': 'GA', 'ky': 'KY', 'tn': 'TN'
                };
                newLabel.textContent = abbrevs[correctId] || this._currentRegion.name;
                svg.appendChild(newLabel);
            }

            if (feedback) {
                feedback.className = 'mq-feedback mq-feedback-correct';
                feedback.textContent = 'Correct!';
            }

            var scoreEl = document.getElementById('mq-score');
            if (scoreEl) scoreEl.textContent = this._score + '/' + this._total;

            var self = this;
            setTimeout(function() {
                self._nextRegion();
            }, 600);

        } else {
            this._mistakes++;

            // Flash wrong
            if (clickedPath && !clickedPath.classList.contains('mq-correct')) {
                clickedPath.classList.add('mq-wrong');
                setTimeout(function() {
                    clickedPath.classList.remove('mq-wrong');
                }, 500);
            }

            if (feedback) {
                feedback.className = 'mq-feedback mq-feedback-wrong';
                feedback.textContent = 'Try again!';
            }

            // After 2 mistakes on the same region, show a hint pulse
            if (this._mistakes > 1 && !this._hintUsed) {
                this._hintUsed = true;
                if (correctPath) {
                    correctPath.classList.add('mq-hint');
                    var self2 = this;
                    setTimeout(function() {
                        correctPath.classList.remove('mq-hint');
                    }, 1500);
                }
            }
        }
    },

    _endGame() {
        if (this._timerId) clearInterval(this._timerId);
        var elapsed = Math.floor((Date.now() - this._startTime) / 1000);
        var pct = Math.round((this._score / this._total) * 100);

        this._attempts++;

        // Save progress
        var saveData = {
            bestScore: Math.max(this._bestScore, pct),
            bestTime: this._bestTime === null ? elapsed : (pct >= this._bestScore ? Math.min(this._bestTime, elapsed) : this._bestTime),
            attempts: this._attempts,
            lastPlayed: new Date().toISOString()
        };
        ProgressManager.saveActivityProgress(this._config.unit.id, 'map-quiz', saveData);

        // Achievements
        if (pct === 100) {
            AchievementManager.checkAndAward({ activity: 'map-quiz', event: 'perfect', score: 100 });
            AchievementManager.checkAndAward({ activity: 'map-quiz', event: 'cartographer' });
        }
        AchievementManager.checkAndAward({ activity: 'map-quiz', event: 'complete' });

        // Show results
        var container = this._container;
        container.textContent = '';

        var wrapper = document.createElement('div');
        wrapper.className = 'mq-results';

        var icon = document.createElement('i');
        icon.className = pct === 100 ? 'fas fa-trophy mq-results-icon gold' : 'fas fa-map-marked-alt mq-results-icon';
        wrapper.appendChild(icon);

        var title = document.createElement('h2');
        title.className = 'mq-results-title';
        title.textContent = pct === 100 ? 'Perfect Score!' : 'Quiz Complete!';
        wrapper.appendChild(title);

        var stats = document.createElement('div');
        stats.className = 'mq-results-stats';

        var statItems = [
            ['Score', pct + '%'],
            ['Time', this._formatTime(elapsed)],
            ['Mistakes', String(this._mistakes)],
            ['Attempts', String(this._attempts)]
        ];

        statItems.forEach(function(item) {
            var stat = document.createElement('div');
            stat.className = 'mq-stat';
            var label = document.createElement('span');
            label.className = 'mq-stat-label';
            label.textContent = item[0];
            var value = document.createElement('span');
            value.className = 'mq-stat-value';
            value.textContent = item[1];
            stat.appendChild(label);
            stat.appendChild(value);
            stats.appendChild(stat);
        });
        wrapper.appendChild(stats);

        if (pct === 100 && (this._bestTime === null || elapsed < this._bestTime)) {
            var newBest = document.createElement('p');
            newBest.className = 'mq-new-best';
            newBest.textContent = 'New best time!';
            wrapper.appendChild(newBest);
        }

        var btnRow = document.createElement('div');
        btnRow.className = 'mq-btn-row';

        var retryBtn = document.createElement('button');
        retryBtn.className = 'nav-button mq-start-btn';
        retryBtn.textContent = 'Play Again';
        var self = this;
        retryBtn.addEventListener('click', function() {
            self._startGame();
        });
        btnRow.appendChild(retryBtn);

        var backBtn = document.createElement('button');
        backBtn.className = 'nav-button';
        backBtn.textContent = 'Back to Home';
        backBtn.addEventListener('click', function() {
            if (typeof StudyEngine !== 'undefined') StudyEngine.showHome();
        });
        btnRow.appendChild(backBtn);

        wrapper.appendChild(btnRow);
        container.appendChild(wrapper);
    },

    _getPathCenter(pathData) {
        // Parse path to find approximate center
        var coords = pathData.match(/[\d.]+/g);
        if (!coords || coords.length < 2) return { x: 500, y: 300 };
        var sumX = 0, sumY = 0, count = 0;
        for (var i = 0; i < coords.length - 1; i += 2) {
            sumX += parseFloat(coords[i]);
            sumY += parseFloat(coords[i + 1]);
            count++;
        }
        return { x: Math.round(sumX / count), y: Math.round(sumY / count) };
    },

    _formatTime(seconds) {
        var m = Math.floor(seconds / 60);
        var s = seconds % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    },

    cleanup() {
        if (this._timerId) clearInterval(this._timerId);
        this._currentRegion = null;
        this._queue = [];
    },

    getProgress() {
        return ProgressManager.getActivityProgress(
            StudyEngine.config.unit.id, 'map-quiz'
        );
    }
});
