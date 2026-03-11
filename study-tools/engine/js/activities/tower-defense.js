StudyEngine.registerActivity({
    id: 'tower-defense',
    name: 'Defend the Republic',
    icon: 'fas fa-chess-rook',
    description: 'Build defenses and answer vocab questions to protect the young nation!',
    category: 'games',
    requires: ['vocabulary'],

    // State
    _container: null,
    _config: null,
    _scene: null,
    _camera: null,
    _renderer: null,
    _animId: null,
    _clock: null,
    _running: false,
    _paused: false,
    _gameOver: false,

    // Game state
    _wave: 0,
    _maxWaves: 10,
    _coins: 100,
    _baseHP: 20,
    _maxHP: 20,
    _score: 0,
    _streak: 0,
    _bestWave: 0,
    _bestScore: 0,
    _noDamageTaken: true,

    // Entities
    _towers: [],
    _enemies: [],
    _projectiles: [],
    _particles: [],
    _rangeIndicator: null,
    _selectedTowerType: null,
    _placementMode: false,
    _gridCells: [],
    _hoveredCell: null,

    // Questions
    _questionQueue: [],
    _questionTimer: 0,
    _questionInterval: 15,
    _activeQuestion: null,
    _questionTimeLeft: 0,
    _questionTimerId: null,

    // Wave management
    _waveTimer: 0,
    _waveDelay: 3,
    _spawnTimer: 0,
    _enemiesToSpawn: 0,
    _waveActive: false,
    _betweenWaves: true,

    // Path
    _path: [],
    _pathMeshes: [],

    // Three.js loaded flag
    _threeLoaded: false,

    // Tower definitions — themed around the Early Republic era
    _towerDefs: {
        musket:   { name: 'Musket Post',     cost: 50,  color: 0x3b82f6, range: 3.5, damage: 2, fireRate: 0.4, aoe: false, slow: 0, icon: 'fa-crosshairs',
                    upgrades: ['Rifled Musket', 'Sharpshooter Tower'], desc: 'Minutemen fire quickly at single targets' },
        cannon:   { name: 'Cannon Battery',  cost: 100, color: 0xef4444, range: 2.5, damage: 5, fireRate: 1.2, aoe: true,  slow: 0, icon: 'fa-bomb',
                    upgrades: ['Heavy Cannon', 'Fort McHenry Guns'], desc: 'Area damage — blasts groups of enemies' },
        diplomat: { name: 'Diplomat\'s Hall', cost: 75,  color: 0x06b6d4, range: 3.0, damage: 1, fireRate: 0.8, aoe: false, slow: 0.5, icon: 'fa-scroll',
                    upgrades: ['Treaty Office', 'State Dept. HQ'], desc: 'Slows enemies with the power of negotiation' },
        eagle:    { name: 'Eagle\'s Nest',   cost: 125, color: 0xeab308, range: 5.0, damage: 3, fireRate: 0.9, aoe: false, slow: 0, icon: 'fa-dove',
                    upgrades: ['War Hawk Roost', 'Liberty Spire'], desc: 'Long range — spots enemies from far away' }
    },

    // Upgrade multipliers per level (level 1 = base, 2 = first upgrade, 3 = second)
    _upgradeCosts: [0, 75, 150],
    _upgradeMultipliers: {
        damage:   [1, 1.6, 2.5],
        range:    [1, 1.15, 1.3],
        fireRate: [1, 0.85, 0.7]
    },

    render(container, config) {
        this._container = container;
        this._config = config;
        container.textContent = '';

        // Block on small screens — game needs mouse/keyboard and a larger canvas
        if (window.innerWidth < 768) {
            var msg = document.createElement('div');
            msg.className = 'td-mobile-block';
            var icon = document.createElement('i');
            icon.className = 'fas fa-chess-rook';
            var heading = document.createElement('h3');
            heading.textContent = 'Defend the Republic';
            var p1 = document.createElement('p');
            p1.textContent = 'This game works best on a larger screen with a mouse or trackpad.';
            var p2 = document.createElement('p');
            var strong = document.createElement('strong');
            strong.textContent = 'Play on your Chromebook!';
            p2.appendChild(strong);
            msg.appendChild(icon);
            msg.appendChild(heading);
            msg.appendChild(p1);
            msg.appendChild(p2);
            container.appendChild(msg);
            return;
        }

        // Load saved progress
        var saved = ProgressManager.getActivityProgress(config.unit.id, 'tower-defense');
        this._bestWave = saved?.bestWave || 0;
        this._bestScore = saved?.bestScore || 0;

        // Build question queue
        this._buildQuestionQueue(config);

        // Load Three.js if not loaded
        if (typeof THREE === 'undefined') {
            var wrapper = document.createElement('div');
            wrapper.className = 'td-loading';
            wrapper.textContent = 'Loading 3D engine...';
            container.appendChild(wrapper);

            var script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
            script.onload = function() {
                this._threeLoaded = true;
                this._showStartScreen();
            }.bind(this);
            script.onerror = function() {
                wrapper.textContent = 'Failed to load 3D engine. Please check your internet connection.';
            };
            document.head.appendChild(script);
        } else {
            this._threeLoaded = true;
            this._showStartScreen();
        }
    },

    _showStartScreen() {
        var container = this._container;
        container.textContent = '';

        var wrapper = document.createElement('div');
        wrapper.className = 'td-start-screen';

        var title = document.createElement('h2');
        title.className = 'td-title';
        title.textContent = 'Defend the Republic';
        wrapper.appendChild(title);

        var desc = document.createElement('p');
        desc.className = 'td-desc';
        desc.textContent = 'Answer vocabulary questions to earn coins. Build defenses to protect the young nation against 10 waves of invaders!';
        wrapper.appendChild(desc);

        // Tower preview
        var towerPreview = document.createElement('div');
        towerPreview.className = 'td-tower-preview';
        var self = this;
        Object.keys(this._towerDefs).forEach(function(key) {
            var def = self._towerDefs[key];
            var card = document.createElement('div');
            card.className = 'td-preview-card';
            card.style.borderColor = '#' + def.color.toString(16).padStart(6, '0');

            var icon = document.createElement('i');
            icon.className = 'fas ' + def.icon;
            icon.style.color = '#' + def.color.toString(16).padStart(6, '0');
            card.appendChild(icon);

            var name = document.createElement('div');
            name.className = 'td-preview-name';
            name.textContent = def.name;
            card.appendChild(name);

            var cost = document.createElement('div');
            cost.className = 'td-preview-cost';
            cost.textContent = def.cost + ' coins';
            card.appendChild(cost);

            if (def.desc) {
                var descEl = document.createElement('div');
                descEl.className = 'td-preview-desc';
                descEl.textContent = def.desc;
                card.appendChild(descEl);
            }

            towerPreview.appendChild(card);
        });
        wrapper.appendChild(towerPreview);

        if (this._bestWave > 0) {
            var best = document.createElement('div');
            best.className = 'td-best';
            best.textContent = 'Best: Wave ' + this._bestWave + ' | Score: ' + this._bestScore;
            wrapper.appendChild(best);
        }

        var startBtn = document.createElement('button');
        startBtn.className = 'nav-button td-start-btn';
        startBtn.textContent = 'Start Game';
        startBtn.addEventListener('click', function() { self._startGame(); });
        wrapper.appendChild(startBtn);

        container.appendChild(wrapper);
    },

    _startGame() {
        // Reset state
        this._wave = 0;
        this._coins = 100;
        this._baseHP = this._maxHP;
        this._score = 0;
        this._streak = 0;
        this._towers = [];
        this._enemies = [];
        this._projectiles = [];
        this._particles = [];
        this._selectedTowerType = null;
        this._placementMode = false;
        this._hoveredCell = null;
        this._gameOver = false;
        this._running = true;
        this._paused = false;
        this._waveActive = false;
        this._betweenWaves = true;
        this._waveTimer = 0;
        this._spawnTimer = 0;
        this._enemiesToSpawn = 0;
        this._questionTimer = 0;
        this._activeQuestion = null;
        this._noDamageTaken = true;
        this._gridCells = [];

        this._container.textContent = '';
        this._buildUI();
        this._initThree();
        this._buildMap();
        this._clock = new THREE.Clock();

        // Start first wave after a brief delay
        this._askQuestion(); // Ask a question before wave 1
        this._animate();
    },

    _buildUI() {
        var container = this._container;
        var self = this;

        // Game wrapper
        var gameWrapper = document.createElement('div');
        gameWrapper.className = 'td-game-wrapper';
        gameWrapper.id = 'td-game-wrapper';

        // HUD
        var hud = document.createElement('div');
        hud.className = 'td-hud';

        var waveEl = document.createElement('span');
        waveEl.className = 'td-hud-item';
        waveEl.id = 'td-wave';
        waveEl.textContent = 'Wave 0/' + this._maxWaves;
        hud.appendChild(waveEl);

        var coinsEl = document.createElement('span');
        coinsEl.className = 'td-hud-item td-coins';
        coinsEl.id = 'td-coins';
        coinsEl.textContent = this._coins;
        hud.appendChild(coinsEl);

        var hpWrap = document.createElement('span');
        hpWrap.className = 'td-hud-item';
        var hpBar = document.createElement('div');
        hpBar.className = 'td-hp-bar';
        hpBar.id = 'td-hp-bar';
        var hpFill = document.createElement('div');
        hpFill.className = 'td-hp-fill';
        hpFill.id = 'td-hp-fill';
        hpFill.style.width = '100%';
        hpBar.appendChild(hpFill);
        hpWrap.appendChild(document.createTextNode('Base '));
        hpWrap.appendChild(hpBar);
        hud.appendChild(hpWrap);

        var scoreEl = document.createElement('span');
        scoreEl.className = 'td-hud-item';
        scoreEl.id = 'td-score';
        scoreEl.textContent = 'Score: 0';
        hud.appendChild(scoreEl);

        gameWrapper.appendChild(hud);

        // Canvas container
        var canvasWrap = document.createElement('div');
        canvasWrap.className = 'td-canvas-wrap';
        canvasWrap.id = 'td-canvas-wrap';
        gameWrapper.appendChild(canvasWrap);

        // Tower shop
        var shop = document.createElement('div');
        shop.className = 'td-shop';
        shop.id = 'td-shop';

        Object.keys(this._towerDefs).forEach(function(key) {
            var def = self._towerDefs[key];
            var btn = document.createElement('button');
            btn.className = 'td-shop-btn';
            btn.dataset.tower = key;
            btn.id = 'td-shop-' + key;

            var icon = document.createElement('i');
            icon.className = 'fas ' + def.icon;
            btn.appendChild(icon);

            var label = document.createElement('span');
            label.textContent = ' ' + def.name + ' ';
            btn.appendChild(label);

            var costSpan = document.createElement('span');
            costSpan.className = 'td-shop-cost';
            costSpan.textContent = '$' + def.cost;
            btn.appendChild(costSpan);

            btn.addEventListener('click', function() {
                self._selectTower(key);
            });

            shop.appendChild(btn);
        });

        // Upgrade hint
        var upgradeHint = document.createElement('span');
        upgradeHint.className = 'td-upgrade-hint';
        upgradeHint.textContent = 'Click a tower to upgrade';
        shop.appendChild(upgradeHint);

        // Wave button
        var waveBtn = document.createElement('button');
        waveBtn.className = 'td-wave-btn';
        waveBtn.id = 'td-wave-btn';
        waveBtn.textContent = 'Start Wave 1';
        waveBtn.addEventListener('click', function() { self._startNextWave(); });
        shop.appendChild(waveBtn);

        gameWrapper.appendChild(shop);

        // Question overlay (hidden)
        var qOverlay = document.createElement('div');
        qOverlay.className = 'td-question-overlay';
        qOverlay.id = 'td-question-overlay';
        qOverlay.style.display = 'none';
        gameWrapper.appendChild(qOverlay);

        // Game over overlay (hidden)
        var goOverlay = document.createElement('div');
        goOverlay.className = 'td-gameover-overlay';
        goOverlay.id = 'td-gameover-overlay';
        goOverlay.style.display = 'none';
        gameWrapper.appendChild(goOverlay);

        container.appendChild(gameWrapper);
    },

    _initThree() {
        var canvasWrap = document.getElementById('td-canvas-wrap');
        if (!canvasWrap) return;

        var w = canvasWrap.clientWidth;
        var h = canvasWrap.clientHeight || 400;

        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0x1a2332);

        // Camera — isometric-ish angle
        this._camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
        this._camera.position.set(0, 12, 10);
        this._camera.lookAt(0, 0, 0);

        this._renderer = new THREE.WebGLRenderer({ antialias: false });
        // Lower pixel ratio on low-end devices
        var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        this._renderer.setPixelRatio(dpr);
        this._renderer.setSize(w, h);
        canvasWrap.appendChild(this._renderer.domElement);

        // Lighting
        var ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this._scene.add(ambient);
        var directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(5, 10, 5);
        this._scene.add(directional);

        // Click handler for tower placement
        var self = this;
        this._renderer.domElement.addEventListener('click', function(e) {
            self._handleCanvasClick(e);
        });

        this._renderer.domElement.addEventListener('mousemove', function(e) {
            self._handleCanvasHover(e);
        });

        // Resize handler
        this._resizeHandler = function() {
            var w2 = canvasWrap.clientWidth;
            var h2 = canvasWrap.clientHeight || 400;
            self._camera.aspect = w2 / h2;
            self._camera.updateProjectionMatrix();
            self._renderer.setSize(w2, h2);
        };
        window.addEventListener('resize', this._resizeHandler);
    },

    _buildMap() {
        var scene = this._scene;

        // Ground plane
        var groundGeo = new THREE.PlaneGeometry(20, 14);
        var groundMat = new THREE.MeshLambertMaterial({ color: 0x2d4a2e });
        var ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.01;
        scene.add(ground);

        // Define S-curve path (waypoints)
        this._path = [
            { x: -9, z: -5 },
            { x: -5, z: -5 },
            { x: -5, z: -1 },
            { x: -1, z: -1 },
            { x: -1, z:  3 },
            { x:  3, z:  3 },
            { x:  3, z: -3 },
            { x:  7, z: -3 },
            { x:  7, z:  1 },
            { x:  9, z:  1 }
        ];

        // Draw path
        this._pathMeshes = [];
        for (var i = 0; i < this._path.length - 1; i++) {
            var p1 = this._path[i];
            var p2 = this._path[i + 1];
            var dx = p2.x - p1.x;
            var dz = p2.z - p1.z;
            var len = Math.sqrt(dx * dx + dz * dz);

            var pathGeo = new THREE.BoxGeometry(
                Math.abs(dx) > 0 ? len + 1 : 1,
                0.05,
                Math.abs(dz) > 0 ? len + 1 : 1
            );
            var pathMat = new THREE.MeshLambertMaterial({ color: 0x8b7355 });
            var pathMesh = new THREE.Mesh(pathGeo, pathMat);
            pathMesh.position.set((p1.x + p2.x) / 2, 0, (p1.z + p2.z) / 2);
            scene.add(pathMesh);
            this._pathMeshes.push(pathMesh);
        }

        // Spawn point marker (red)
        var spawnGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 8);
        var spawnMat = new THREE.MeshLambertMaterial({ color: 0xef4444 });
        var spawnMesh = new THREE.Mesh(spawnGeo, spawnMat);
        spawnMesh.position.set(this._path[0].x, 0.05, this._path[0].z);
        scene.add(spawnMesh);

        // Base marker (blue)
        var baseGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 8);
        var baseMat = new THREE.MeshLambertMaterial({ color: 0x3b82f6 });
        var baseMesh = new THREE.Mesh(baseGeo, baseMat);
        var lastP = this._path[this._path.length - 1];
        baseMesh.position.set(lastP.x, 0.15, lastP.z);
        scene.add(baseMesh);

        // Build placement grid (cells adjacent to path)
        this._buildGrid();
    },

    _buildGrid() {
        var scene = this._scene;
        var pathSet = new Set();
        var self = this;

        // Mark all path cells
        for (var i = 0; i < this._path.length - 1; i++) {
            var p1 = this._path[i];
            var p2 = this._path[i + 1];
            var steps = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.z - p1.z));
            for (var s = 0; s <= steps; s++) {
                var t = steps === 0 ? 0 : s / steps;
                var cx = Math.round(p1.x + (p2.x - p1.x) * t);
                var cz = Math.round(p1.z + (p2.z - p1.z) * t);
                pathSet.add(cx + ',' + cz);
            }
        }

        // Add cells adjacent to path
        var cellSet = new Set();
        var offsets = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

        pathSet.forEach(function(key) {
            var parts = key.split(',');
            var px = parseInt(parts[0]);
            var pz = parseInt(parts[1]);
            offsets.forEach(function(off) {
                var nx = px + off[0];
                var nz = pz + off[1];
                var nk = nx + ',' + nz;
                if (!pathSet.has(nk) && !cellSet.has(nk) && nx >= -9 && nx <= 9 && nz >= -6 && nz <= 6) {
                    cellSet.add(nk);
                }
            });
        });

        this._gridCells = [];
        cellSet.forEach(function(key) {
            var parts = key.split(',');
            var gx = parseInt(parts[0]);
            var gz = parseInt(parts[1]);

            var cellGeo = new THREE.BoxGeometry(0.9, 0.02, 0.9);
            var cellMat = new THREE.MeshLambertMaterial({ color: 0x3a5a3c, transparent: true, opacity: 0.3 });
            var cellMesh = new THREE.Mesh(cellGeo, cellMat);
            cellMesh.position.set(gx, 0.01, gz);
            scene.add(cellMesh);

            self._gridCells.push({ x: gx, z: gz, mesh: cellMesh, tower: null });
        });
    },

    _selectTower(type) {
        var def = this._towerDefs[type];
        if (!def || this._coins < def.cost) return;

        if (this._selectedTowerType === type) {
            this._selectedTowerType = null;
            this._placementMode = false;
            this._updateShopUI();
            this._clearGridHighlight();
            return;
        }

        this._selectedTowerType = type;
        this._placementMode = true;
        this._updateShopUI();
    },

    _updateShopUI() {
        var self = this;
        Object.keys(this._towerDefs).forEach(function(key) {
            var btn = document.getElementById('td-shop-' + key);
            if (!btn) return;
            var def = self._towerDefs[key];
            btn.classList.toggle('selected', self._selectedTowerType === key);
            btn.classList.toggle('disabled', self._coins < def.cost);
        });
    },

    _clearGridHighlight() {
        this._gridCells.forEach(function(cell) {
            if (!cell.tower) {
                cell.mesh.material.color.setHex(0x3a5a3c);
                cell.mesh.material.opacity = 0.3;
            }
        });
        this._hoveredCell = null;
    },

    _handleCanvasHover(e) {
        if (!this._placementMode || !this._selectedTowerType) return;
        var cell = this._getCellAtMouse(e);

        // Reset previous hover
        if (this._hoveredCell && this._hoveredCell !== cell) {
            if (!this._hoveredCell.tower) {
                this._hoveredCell.mesh.material.color.setHex(0x3a5a3c);
                this._hoveredCell.mesh.material.opacity = 0.3;
            }
        }

        // Remove old range indicator
        if (this._rangeIndicator) {
            this._scene.remove(this._rangeIndicator);
            this._rangeIndicator = null;
        }

        if (cell && !cell.tower) {
            var def = this._towerDefs[this._selectedTowerType];
            cell.mesh.material.color.setHex(def.color);
            cell.mesh.material.opacity = 0.6;
            this._hoveredCell = cell;

            // Show range indicator ring
            var ringGeo = new THREE.RingGeometry(def.range - 0.05, def.range + 0.05, 32);
            var ringMat = new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
            this._rangeIndicator = new THREE.Mesh(ringGeo, ringMat);
            this._rangeIndicator.rotation.x = -Math.PI / 2;
            this._rangeIndicator.position.set(cell.x, 0.05, cell.z);
            this._scene.add(this._rangeIndicator);
        }
    },

    _handleCanvasClick(e) {
        var cell = this._getCellAtMouse(e);
        if (!cell) return;

        // If clicking a tower, try to upgrade
        if (cell.tower) {
            this._upgradeTower(cell.tower);
            return;
        }

        // If in placement mode, place tower
        if (this._placementMode && this._selectedTowerType) {
            this._placeTower(cell, this._selectedTowerType);
        }
    },

    _getCellAtMouse(e) {
        var rect = this._renderer.domElement.getBoundingClientRect();
        var mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        var my = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        var raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(mx, my), this._camera);

        // Intersect with ground plane (y=0)
        var plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        var intersect = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersect);

        if (!intersect) return null;

        // Find nearest grid cell
        var best = null;
        var bestDist = 0.7;
        for (var i = 0; i < this._gridCells.length; i++) {
            var c = this._gridCells[i];
            var dx = intersect.x - c.x;
            var dz = intersect.z - c.z;
            var dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < bestDist) {
                bestDist = dist;
                best = c;
            }
        }
        return best;
    },

    _placeTower(cell, type) {
        var def = this._towerDefs[type];
        if (this._coins < def.cost) return;

        this._coins -= def.cost;

        // Build tower mesh
        var group = new THREE.Group();

        // Base cylinder
        var baseGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.4, 6);
        var baseMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
        var baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.y = 0.2;
        group.add(baseMesh);

        // Tower body
        var bodyGeo = new THREE.CylinderGeometry(0.2, 0.3, 0.6, 6);
        var bodyMat = new THREE.MeshLambertMaterial({ color: def.color });
        var bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.y = 0.7;
        group.add(bodyMesh);

        // Tower top
        var topGeo = new THREE.ConeGeometry(0.25, 0.3, 6);
        var topMat = new THREE.MeshLambertMaterial({ color: def.color });
        var topMesh = new THREE.Mesh(topGeo, topMat);
        topMesh.position.y = 1.15;
        group.add(topMesh);

        group.position.set(cell.x, 0, cell.z);
        this._scene.add(group);

        var tower = {
            type: type,
            def: def,
            level: 1,
            mesh: group,
            x: cell.x,
            z: cell.z,
            cooldown: 0,
            effectiveDamage: def.damage,
            effectiveRange: def.range,
            effectiveFireRate: def.fireRate
        };

        cell.tower = tower;
        cell.mesh.material.color.setHex(def.color);
        cell.mesh.material.opacity = 0.5;
        this._towers.push(tower);

        // Remove range indicator
        if (this._rangeIndicator) {
            this._scene.remove(this._rangeIndicator);
            this._rangeIndicator = null;
        }

        // Exit placement mode
        this._selectedTowerType = null;
        this._placementMode = false;
        this._updateHUD();
        this._updateShopUI();
        this._clearGridHighlight();
    },

    _upgradeTower(tower) {
        if (tower.level >= 3) {
            this._showUpgradeToast('Max level reached!');
            return;
        }

        var upgradeCost = this._upgradeCosts[tower.level];
        if (this._coins < upgradeCost) {
            this._showUpgradeToast('Need ' + upgradeCost + ' coins to upgrade');
            return;
        }

        this._coins -= upgradeCost;
        tower.level++;

        // Apply upgrade multipliers
        var mult = this._upgradeMultipliers;
        var baseDef = this._towerDefs[tower.type];
        tower.effectiveDamage = baseDef.damage * mult.damage[tower.level - 1];
        tower.effectiveRange = baseDef.range * mult.range[tower.level - 1];
        tower.effectiveFireRate = baseDef.fireRate * mult.fireRate[tower.level - 1];

        // Visual upgrade — make tower taller and add a glow ring
        var scale = 1 + (tower.level - 1) * 0.2;
        tower.mesh.scale.set(scale, scale, scale);

        // Add star on top for each upgrade level
        var starGeo = new THREE.OctahedronGeometry(0.12, 0);
        var starMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
        var star = new THREE.Mesh(starGeo, starMat);
        star.position.y = 1.15 * scale + 0.2;
        tower.mesh.add(star);

        var upgradeName = baseDef.upgrades ? baseDef.upgrades[tower.level - 2] : ('Level ' + tower.level);
        this._showUpgradeToast('Upgraded to ' + upgradeName + '!');
        this._updateHUD();
        this._updateShopUI();
    },

    _showUpgradeToast(msg) {
        // Remove existing toast
        var existing = document.getElementById('td-upgrade-toast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.id = 'td-upgrade-toast';
        toast.className = 'td-upgrade-toast';
        toast.textContent = msg;

        var wrapper = document.getElementById('td-game-wrapper');
        if (wrapper) wrapper.appendChild(toast);

        setTimeout(function() { toast.remove(); }, 2000);
    },

    _startNextWave() {
        if (this._waveActive || this._gameOver) return;
        this._wave++;
        this._waveActive = true;
        this._betweenWaves = false;
        this._spawnTimer = 0;

        // Wave scaling: more enemies, more HP, faster
        this._enemiesToSpawn = 3 + this._wave * 2;
        this._waveEnemyHP = 3 + this._wave * 2;
        this._waveEnemySpeed = 1.5 + this._wave * 0.15;
        this._spawnInterval = Math.max(0.6, 1.5 - this._wave * 0.08);

        this._updateHUD();

        var waveBtn = document.getElementById('td-wave-btn');
        if (waveBtn) waveBtn.style.display = 'none';
    },

    _spawnEnemy() {
        if (this._enemiesToSpawn <= 0) return;
        this._enemiesToSpawn--;

        var hp = this._waveEnemyHP;
        var speed = this._waveEnemySpeed;

        // Random enemy shape
        var shapes = [
            new THREE.BoxGeometry(0.4, 0.4, 0.4),
            new THREE.SphereGeometry(0.25, 6, 4),
            new THREE.DodecahedronGeometry(0.25, 0)
        ];
        var geo = shapes[Math.floor(Math.random() * shapes.length)];
        var colors = [0xdc2626, 0xf97316, 0xa855f7, 0xe11d48, 0xd946ef];
        var color = colors[Math.floor(Math.random() * colors.length)];
        var mat = new THREE.MeshLambertMaterial({ color: color });
        var mesh = new THREE.Mesh(geo, mat);

        var start = this._path[0];
        mesh.position.set(start.x, 0.3, start.z);
        this._scene.add(mesh);

        // HP bar (small box above enemy)
        var hpBarGeo = new THREE.BoxGeometry(0.5, 0.06, 0.06);
        var hpBarMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        var hpBarMesh = new THREE.Mesh(hpBarGeo, hpBarMat);
        hpBarMesh.position.y = 0.5;
        mesh.add(hpBarMesh);

        var enemy = {
            mesh: mesh,
            hpBar: hpBarMesh,
            hp: hp,
            maxHP: hp,
            speed: speed,
            pathIndex: 0,
            pathProgress: 0,
            slowTimer: 0,
            alive: true
        };

        this._enemies.push(enemy);
    },

    _animate() {
        if (!this._running) return;
        var self = this;
        this._animId = requestAnimationFrame(function() { self._animate(); });

        if (this._paused || this._gameOver) {
            this._renderer.render(this._scene, this._camera);
            return;
        }

        var dt = this._clock.getDelta();
        dt = Math.min(dt, 0.05); // Cap delta time

        // Spawn enemies
        if (this._waveActive && this._enemiesToSpawn > 0) {
            this._spawnTimer += dt;
            if (this._spawnTimer >= this._spawnInterval) {
                this._spawnTimer = 0;
                this._spawnEnemy();
            }
        }

        // Question timer (during waves)
        if (this._waveActive && !this._activeQuestion) {
            this._questionTimer += dt;
            if (this._questionTimer >= this._questionInterval) {
                this._questionTimer = 0;
                this._askQuestion();
            }
        }

        // Move enemies
        this._updateEnemies(dt);

        // Tower firing
        this._updateTowers(dt);

        // Update projectiles
        this._updateProjectiles(dt);

        // Update particles
        this._updateParticles(dt);

        // Check wave complete
        if (this._waveActive && this._enemiesToSpawn <= 0 && this._enemies.length === 0) {
            this._waveComplete();
        }

        this._renderer.render(this._scene, this._camera);
    },

    _updateEnemies(dt) {
        var self = this;
        for (var i = this._enemies.length - 1; i >= 0; i--) {
            var enemy = this._enemies[i];
            if (!enemy.alive) continue;

            var speed = enemy.speed;
            if (enemy.slowTimer > 0) {
                speed *= 0.5;
                enemy.slowTimer -= dt;
            }

            // Move along path
            var nextIdx = enemy.pathIndex + 1;
            if (nextIdx >= self._path.length) {
                // Reached base
                self._baseHP -= 1;
                self._noDamageTaken = false;
                self._removeEnemy(i);
                self._updateHUD();
                if (self._baseHP <= 0) {
                    self._endGame();
                }
                continue;
            }

            var target = self._path[nextIdx];
            var dx = target.x - enemy.mesh.position.x;
            var dz = target.z - enemy.mesh.position.z;
            var dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < 0.1) {
                enemy.pathIndex++;
            } else {
                var mx = (dx / dist) * speed * dt;
                var mz = (dz / dist) * speed * dt;
                enemy.mesh.position.x += mx;
                enemy.mesh.position.z += mz;
                // Rotate enemy to face movement direction
                enemy.mesh.rotation.y += dt * 2;
            }

            // Update HP bar
            var hpPct = enemy.hp / enemy.maxHP;
            enemy.hpBar.scale.x = Math.max(0.01, hpPct);
            if (hpPct < 0.3) enemy.hpBar.material.color.setHex(0xef4444);
            else if (hpPct < 0.6) enemy.hpBar.material.color.setHex(0xf59e0b);
        }
    },

    _updateTowers(dt) {
        var self = this;
        this._towers.forEach(function(tower) {
            tower.cooldown -= dt;
            if (tower.cooldown > 0) return;

            // Find nearest enemy in range
            var bestEnemy = null;
            var bestDist = tower.effectiveRange || tower.def.range;

            for (var i = 0; i < self._enemies.length; i++) {
                var enemy = self._enemies[i];
                if (!enemy.alive) continue;
                var dx = enemy.mesh.position.x - tower.x;
                var dz = enemy.mesh.position.z - tower.z;
                var dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestEnemy = enemy;
                }
            }

            if (bestEnemy) {
                tower.cooldown = tower.effectiveFireRate || tower.def.fireRate;
                // Rotate tower to face target
                var angle = Math.atan2(bestEnemy.mesh.position.x - tower.x, bestEnemy.mesh.position.z - tower.z);
                tower.mesh.rotation.y = angle;
                self._fireProjectile(tower, bestEnemy);
            }
        });
    },

    _fireProjectile(tower, target) {
        var geo = new THREE.SphereGeometry(0.08, 4, 4);
        var mat = new THREE.MeshBasicMaterial({ color: tower.def.color });
        var mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(tower.x, 1.0, tower.z);
        this._scene.add(mesh);

        this._projectiles.push({
            mesh: mesh,
            target: target,
            tower: tower,
            speed: 8,
            alive: true
        });
    },

    _updateProjectiles(dt) {
        var self = this;
        for (var i = this._projectiles.length - 1; i >= 0; i--) {
            var proj = this._projectiles[i];
            if (!proj.alive) {
                self._scene.remove(proj.mesh);
                self._projectiles.splice(i, 1);
                continue;
            }

            if (!proj.target.alive) {
                proj.alive = false;
                continue;
            }

            var tx = proj.target.mesh.position.x;
            var ty = proj.target.mesh.position.y;
            var tz = proj.target.mesh.position.z;

            var dx = tx - proj.mesh.position.x;
            var dy = ty - proj.mesh.position.y;
            var dz = tz - proj.mesh.position.z;
            var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < 0.2) {
                // Hit!
                proj.alive = false;
                var def = proj.tower.def;
                var effectiveDmg = proj.tower.effectiveDamage || def.damage;

                if (def.aoe) {
                    // Area damage
                    for (var j = 0; j < self._enemies.length; j++) {
                        var e = self._enemies[j];
                        if (!e.alive) continue;
                        var edx = e.mesh.position.x - tx;
                        var edz = e.mesh.position.z - tz;
                        var eDist = Math.sqrt(edx * edx + edz * edz);
                        if (eDist < 1.5) {
                            self._damageEnemy(j, effectiveDmg);
                        }
                    }
                } else {
                    var targetIdx = self._enemies.indexOf(proj.target);
                    if (targetIdx >= 0) {
                        self._damageEnemy(targetIdx, effectiveDmg);
                    }
                }

                // Apply slow
                if (def.slow > 0 && proj.target.alive) {
                    proj.target.slowTimer = 2;
                }
            } else {
                var speed = proj.speed * dt;
                proj.mesh.position.x += (dx / dist) * speed;
                proj.mesh.position.y += (dy / dist) * speed;
                proj.mesh.position.z += (dz / dist) * speed;
            }
        }
    },

    _damageEnemy(index, damage) {
        var enemy = this._enemies[index];
        if (!enemy || !enemy.alive) return;

        enemy.hp -= damage;
        if (enemy.hp <= 0) {
            enemy.alive = false;
            this._score += 10;
            // Spawn explosion particles
            this._spawnExplosion(enemy.mesh.position.x, enemy.mesh.position.z, enemy.mesh.material.color.getHex());
            this._removeEnemy(index);
            this._updateHUD();
        }
    },

    _spawnExplosion(x, z, color) {
        for (var i = 0; i < 8; i++) {
            var geo = new THREE.SphereGeometry(0.06, 4, 4);
            var mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 });
            var mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, 0.3, z);
            this._scene.add(mesh);

            var angle = (Math.PI * 2 / 8) * i;
            var speed = 1.5 + Math.random() * 2;
            this._particles.push({
                mesh: mesh,
                vx: Math.cos(angle) * speed,
                vy: 2 + Math.random() * 3,
                vz: Math.sin(angle) * speed,
                life: 0.6 + Math.random() * 0.3
            });
        }
    },

    _removeEnemy(index) {
        var enemy = this._enemies[index];
        if (enemy) {
            this._scene.remove(enemy.mesh);
            this._enemies.splice(index, 1);
        }
    },

    _updateParticles(dt) {
        for (var i = this._particles.length - 1; i >= 0; i--) {
            var p = this._particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this._scene.remove(p.mesh);
                this._particles.splice(i, 1);
                continue;
            }
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y += p.vy * dt;
            p.mesh.position.z += p.vz * dt;
            p.vy -= 9.8 * dt; // gravity
            p.mesh.material.opacity = Math.max(0, p.life / 0.8);
            p.mesh.scale.setScalar(Math.max(0.1, p.life));
        }
    },

    _waveComplete() {
        this._waveActive = false;
        this._betweenWaves = true;
        this._score += this._wave * 100;
        this._questionTimer = 0;

        if (this._wave >= this._maxWaves) {
            this._endGame(true);
            return;
        }

        // Show wave complete + ask question
        this._updateHUD();
        this._askQuestion();

        var waveBtn = document.getElementById('td-wave-btn');
        if (waveBtn) {
            waveBtn.style.display = '';
            waveBtn.textContent = 'Start Wave ' + (this._wave + 1);
        }
    },

    // Question system
    _buildQuestionQueue(config) {
        this._questionQueue = [];

        // Pull from practiceQuestions
        var pq = config.practiceQuestions || [];
        var self = this;
        pq.forEach(function(q) {
            self._questionQueue.push({
                question: q.question,
                options: q.options.slice(),
                correct: q.correct,
                topic: q.topic || ''
            });
        });

        // Generate from vocabulary definitions
        var vocab = config.vocabulary || [];
        if (vocab.length >= 4) {
            vocab.forEach(function(v) {
                var options = [v.term];
                var others = vocab.filter(function(o) { return o.term !== v.term; });
                // Shuffle others and pick 3
                for (var i = others.length - 1; i > 0; i--) {
                    var j = Math.floor(Math.random() * (i + 1));
                    var tmp = others[i]; others[i] = others[j]; others[j] = tmp;
                }
                for (var k = 0; k < 3 && k < others.length; k++) {
                    options.push(others[k].term);
                }
                // Shuffle options
                for (var i2 = options.length - 1; i2 > 0; i2--) {
                    var j2 = Math.floor(Math.random() * (i2 + 1));
                    var tmp2 = options[i2]; options[i2] = options[j2]; options[j2] = tmp2;
                }
                var correctIdx = options.indexOf(v.term);

                self._questionQueue.push({
                    question: v.definition,
                    options: options,
                    correct: correctIdx,
                    topic: v.category || ''
                });
            });
        }

        // Shuffle
        for (var i = this._questionQueue.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = this._questionQueue[i];
            this._questionQueue[i] = this._questionQueue[j];
            this._questionQueue[j] = tmp;
        }

        this._questionQueueIndex = 0;
    },

    _getNextQuestion() {
        if (this._questionQueueIndex >= this._questionQueue.length) {
            this._questionQueueIndex = 0;
            // Reshuffle
            for (var i = this._questionQueue.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var tmp = this._questionQueue[i];
                this._questionQueue[i] = this._questionQueue[j];
                this._questionQueue[j] = tmp;
            }
        }
        return this._questionQueue[this._questionQueueIndex++];
    },

    _askQuestion() {
        if (this._activeQuestion || this._gameOver) return;

        var q = this._getNextQuestion();
        if (!q) return;

        this._activeQuestion = q;
        this._paused = true;
        this._questionTimeLeft = 10;

        var overlay = document.getElementById('td-question-overlay');
        if (!overlay) return;
        overlay.textContent = '';
        overlay.style.display = 'flex';

        var card = document.createElement('div');
        card.className = 'td-question-card';

        // Timer
        var timerRow = document.createElement('div');
        timerRow.className = 'td-q-timer';
        timerRow.id = 'td-q-timer';
        timerRow.textContent = '10';
        card.appendChild(timerRow);

        // Streak indicator
        if (this._streak > 0) {
            var streakEl = document.createElement('div');
            streakEl.className = 'td-q-streak';
            streakEl.textContent = this._streak + ' streak!';
            card.appendChild(streakEl);
        }

        // Question text
        var qText = document.createElement('div');
        qText.className = 'td-q-text';
        qText.textContent = q.question;
        card.appendChild(qText);

        // Options
        var self = this;
        var optGrid = document.createElement('div');
        optGrid.className = 'td-q-options';

        q.options.forEach(function(opt, idx) {
            var btn = document.createElement('button');
            btn.className = 'td-q-option';
            btn.textContent = opt;
            btn.addEventListener('click', function() {
                self._answerQuestion(idx);
            });
            optGrid.appendChild(btn);
        });

        card.appendChild(optGrid);
        overlay.appendChild(card);

        // Start countdown
        var self2 = this;
        this._questionTimerId = setInterval(function() {
            self2._questionTimeLeft--;
            var timerEl = document.getElementById('td-q-timer');
            if (timerEl) timerEl.textContent = self2._questionTimeLeft;
            if (self2._questionTimeLeft <= 0) {
                self2._answerQuestion(-1); // Time's up = wrong
            }
        }, 1000);
    },

    _answerQuestion(selectedIdx) {
        if (!this._activeQuestion) return;

        clearInterval(this._questionTimerId);
        var q = this._activeQuestion;
        var correct = selectedIdx === q.correct;

        if (correct) {
            var reward = 50 + this._streak * 10;
            this._coins += reward;
            this._streak++;
            this._score += 25;
            this._showQuestionFeedback(true, '+' + reward + ' coins!');
        } else {
            this._streak = 0;
            this._showQuestionFeedback(false, 'Correct: ' + q.options[q.correct]);

            if (q.topic && typeof NudgeManager !== 'undefined' && this._config) {
                var vocab = this._config.vocabulary || [];
                var missed = [];
                for (var j = 0; j < vocab.length; j++) {
                    if (vocab[j].category === q.topic) {
                        missed.push(vocab[j].term);
                    }
                }
                NudgeManager.trackMissedTerms(this._config.unit.id, this._config, missed);
            }
        }

        this._activeQuestion = null;
        this._updateHUD();
        this._updateShopUI();
    },

    _showQuestionFeedback(correct, message) {
        var overlay = document.getElementById('td-question-overlay');
        if (!overlay) return;
        overlay.textContent = '';

        var feedback = document.createElement('div');
        feedback.className = 'td-q-feedback ' + (correct ? 'td-q-correct' : 'td-q-wrong');

        var icon = document.createElement('i');
        icon.className = correct ? 'fas fa-check-circle' : 'fas fa-times-circle';
        feedback.appendChild(icon);

        var msg = document.createElement('div');
        msg.textContent = message;
        feedback.appendChild(msg);

        overlay.appendChild(feedback);

        var self = this;
        setTimeout(function() {
            overlay.style.display = 'none';
            self._paused = false;
        }, 1500);
    },

    _endGame(won) {
        this._gameOver = true;
        this._running = false;

        // Final score
        this._score += this._coins;

        // Save progress
        if (this._wave > this._bestWave) this._bestWave = this._wave;
        if (this._score > this._bestScore) this._bestScore = this._score;
        this._saveProgress();

        // Achievements
        if (typeof AchievementManager !== 'undefined') {
            if (won) {
                AchievementManager.checkAndAward({ activity: 'tower-defense', event: 'tower-master' });
            }
            if (this._noDamageTaken && won) {
                AchievementManager.checkAndAward({ activity: 'tower-defense', event: 'perfect-defense' });
            }
        }

        // Show game over screen
        var goOverlay = document.getElementById('td-gameover-overlay');
        if (!goOverlay) return;
        goOverlay.textContent = '';
        goOverlay.style.display = 'flex';

        var card = document.createElement('div');
        card.className = 'td-gameover-card';

        var title = document.createElement('h2');
        title.textContent = won ? 'Victory!' : 'Game Over';
        title.className = won ? 'td-go-win' : 'td-go-lose';
        card.appendChild(title);

        var stats = document.createElement('div');
        stats.className = 'td-go-stats';

        var items = [
            ['Wave', this._wave + '/' + this._maxWaves],
            ['Score', this._score],
            ['Towers Built', this._towers.length],
            ['Streak Best', this._streak]
        ];
        items.forEach(function(item) {
            var row = document.createElement('div');
            row.className = 'td-go-stat';
            var label = document.createElement('span');
            label.textContent = item[0];
            row.appendChild(label);
            var val = document.createElement('strong');
            val.textContent = item[1];
            row.appendChild(val);
            stats.appendChild(row);
        });
        card.appendChild(stats);

        var self = this;
        var playAgainBtn = document.createElement('button');
        playAgainBtn.className = 'nav-button td-start-btn';
        playAgainBtn.textContent = 'Play Again';
        playAgainBtn.addEventListener('click', function() {
            self._cleanup();
            self._startGame();
        });
        card.appendChild(playAgainBtn);

        var menuBtn = document.createElement('button');
        menuBtn.className = 'nav-button';
        menuBtn.textContent = 'Back to Menu';
        menuBtn.style.marginTop = '8px';
        menuBtn.addEventListener('click', function() {
            self._cleanup();
            self._showStartScreen();
        });
        card.appendChild(menuBtn);

        goOverlay.appendChild(card);
    },

    _updateHUD() {
        var waveEl = document.getElementById('td-wave');
        if (waveEl) waveEl.textContent = 'Wave ' + this._wave + '/' + this._maxWaves;

        var coinsEl = document.getElementById('td-coins');
        if (coinsEl) coinsEl.textContent = this._coins;

        var hpFill = document.getElementById('td-hp-fill');
        if (hpFill) {
            var pct = Math.max(0, (this._baseHP / this._maxHP) * 100);
            hpFill.style.width = pct + '%';
            if (pct < 25) hpFill.style.background = '#ef4444';
            else if (pct < 50) hpFill.style.background = '#f59e0b';
            else hpFill.style.background = '#22c55e';
        }

        var scoreEl = document.getElementById('td-score');
        if (scoreEl) scoreEl.textContent = 'Score: ' + this._score;
    },

    _saveProgress() {
        ProgressManager.saveActivityProgress(StudyEngine.config.unit.id, 'tower-defense', {
            bestWave: this._bestWave,
            bestScore: this._bestScore
        });
    },

    _cleanup() {
        if (this._animId) cancelAnimationFrame(this._animId);
        if (this._questionTimerId) clearInterval(this._questionTimerId);
        if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);

        // Dispose Three.js
        if (this._renderer) {
            this._renderer.dispose();
            this._renderer = null;
        }
        this._scene = null;
        this._camera = null;
        this._towers = [];
        this._enemies = [];
        this._projectiles = [];
        this._particles = [];
        this._gridCells = [];
        this._rangeIndicator = null;
        this._running = false;
    },

    activate() {},

    deactivate() {
        this._cleanup();
    },

    getProgress() {
        return ProgressManager.getActivityProgress(StudyEngine.config.unit.id, 'tower-defense');
    },

    loadProgress(data) {
        if (data) {
            this._bestWave = data.bestWave || 0;
            this._bestScore = data.bestScore || 0;
        }
    }
});
