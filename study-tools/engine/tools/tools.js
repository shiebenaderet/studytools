const StudyTools = {

    // ── Notes ────────────────────────────────────────────────────────────

    openNotes() {
        const config = StudyEngine.config;
        if (!config || !config.vocabulary) return;
        const unitId = config.unit.id;

        // Collect category and mastery data
        const categories = [];
        config.vocabulary.forEach(v => {
            if (v.category && !categories.includes(v.category)) {
                categories.push(v.category);
            }
        });

        const flashcardProgress = ProgressManager.getActivityProgress(unitId, 'flashcards') || {};
        const masteredTerms = flashcardProgress.mastered || [];

        // Sort terms into mastered vs needs-review
        const mastered = [];
        const needsReview = [];
        config.vocabulary.forEach(v => {
            if (masteredTerms.includes(v.term)) {
                mastered.push(v);
            } else {
                needsReview.push(v);
            }
        });

        // Load saved personal notes
        const savedNotes = ProgressManager.load(unitId, 'notes') || {};

        // Build the container
        const container = document.getElementById('activity-container');
        container.classList.add('active');
        document.getElementById('home-section').classList.remove('active');
        document.getElementById('sub-nav').classList.remove('active');
        container.textContent = '';

        // Back button
        const backBtn = document.createElement('button');
        backBtn.className = 'nav-button';
        backBtn.style.marginBottom = '16px';
        const backIcon = document.createElement('i');
        backIcon.className = 'fas fa-arrow-left';
        backBtn.appendChild(backIcon);
        backBtn.appendChild(document.createTextNode(' Back to Tools'));
        backBtn.addEventListener('click', () => {
            StudyEngine.showTools();
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.remove('active');
                if (b.dataset.group === 'tools') b.classList.add('active');
            });
        });
        container.appendChild(backBtn);

        const wrapper = document.createElement('div');
        wrapper.className = 'study-guide-container';

        // Header
        const header = document.createElement('div');
        header.className = 'study-guide-header';
        const h2 = document.createElement('h2');
        const hIcon = document.createElement('i');
        hIcon.className = 'fas fa-edit';
        h2.appendChild(hIcon);
        h2.appendChild(document.createTextNode(' My Study Guide'));
        h2.style.color = 'var(--primary)';
        header.appendChild(h2);

        const progress = document.createElement('p');
        progress.style.color = '#4b5563';
        progress.style.marginTop = '4px';
        progress.textContent = mastered.length + ' of ' + config.vocabulary.length + ' terms mastered';
        header.appendChild(progress);
        wrapper.appendChild(header);

        // Needs Review section
        if (needsReview.length > 0) {
            const reviewSection = document.createElement('div');
            reviewSection.className = 'study-guide-section review';

            const rTitle = document.createElement('h3');
            const rIcon = document.createElement('i');
            rIcon.className = 'fas fa-exclamation-circle';
            rTitle.appendChild(rIcon);
            rTitle.appendChild(document.createTextNode(' Needs Review (' + needsReview.length + ')'));
            rTitle.style.color = '#b45309';
            reviewSection.appendChild(rTitle);

            const rDesc = document.createElement('p');
            rDesc.textContent = 'These terms haven\'t been mastered yet. Use Flashcards to study them!';
            rDesc.style.color = '#4b5563';
            rDesc.style.fontSize = '0.9em';
            rDesc.style.marginBottom = '12px';
            reviewSection.appendChild(rDesc);

            // Group by category
            categories.forEach(cat => {
                const catTerms = needsReview.filter(v => v.category === cat);
                if (catTerms.length === 0) return;

                const catLabel = document.createElement('div');
                catLabel.className = 'study-guide-cat';
                catLabel.textContent = cat;
                reviewSection.appendChild(catLabel);

                catTerms.forEach(v => {
                    const termRow = document.createElement('div');
                    termRow.className = 'study-guide-term';

                    const termName = document.createElement('strong');
                    termName.textContent = v.term;
                    termRow.appendChild(termName);

                    const termDef = document.createElement('span');
                    termDef.textContent = ' — ' + v.definition;
                    termDef.style.color = '#555';
                    termRow.appendChild(termDef);

                    reviewSection.appendChild(termRow);
                });
            });

            wrapper.appendChild(reviewSection);
        }

        // Mastered section
        if (mastered.length > 0) {
            const masterSection = document.createElement('div');
            masterSection.className = 'study-guide-section mastered';

            const mTitle = document.createElement('h3');
            const mIcon = document.createElement('i');
            mIcon.className = 'fas fa-check-circle';
            mTitle.appendChild(mIcon);
            mTitle.appendChild(document.createTextNode(' Mastered (' + mastered.length + ')'));
            mTitle.style.color = '#166534';
            masterSection.appendChild(mTitle);

            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'study-guide-toggle';
            toggleBtn.textContent = 'Show mastered terms';
            const masteredList = document.createElement('div');
            masteredList.style.display = 'none';

            mastered.forEach(v => {
                const termRow = document.createElement('div');
                termRow.className = 'study-guide-term mastered';
                termRow.textContent = v.term;
                masteredList.appendChild(termRow);
            });

            toggleBtn.addEventListener('click', () => {
                const showing = masteredList.style.display !== 'none';
                masteredList.style.display = showing ? 'none' : 'block';
                toggleBtn.textContent = showing ? 'Show mastered terms' : 'Hide mastered terms';
            });

            masterSection.appendChild(toggleBtn);
            masterSection.appendChild(masteredList);
            wrapper.appendChild(masterSection);
        }

        // Personal notes section (still available)
        const notesSection = document.createElement('div');
        notesSection.className = 'study-guide-section notes';

        const nTitle = document.createElement('h3');
        const nIcon = document.createElement('i');
        nIcon.className = 'fas fa-sticky-note';
        nTitle.appendChild(nIcon);
        nTitle.appendChild(document.createTextNode(' My Notes'));
        nTitle.style.color = 'var(--primary)';
        notesSection.appendChild(nTitle);

        categories.forEach((cat, i) => {
            const catLabel = document.createElement('div');
            catLabel.className = 'study-guide-cat';
            catLabel.textContent = cat;
            notesSection.appendChild(catLabel);

            const ta = document.createElement('textarea');
            ta.id = 'notes-cat-' + i;
            ta.rows = 3;
            ta.className = 'study-guide-textarea';
            ta.placeholder = 'Your notes for ' + cat + '...';
            if (savedNotes[cat]) ta.value = savedNotes[cat];
            notesSection.appendChild(ta);
        });

        const btnRow = document.createElement('div');
        btnRow.style.display = 'flex';
        btnRow.style.gap = '10px';
        btnRow.style.marginTop = '12px';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'nav-button';
        saveBtn.style.flex = '1';
        saveBtn.textContent = 'Save Notes';
        saveBtn.addEventListener('click', () => {
            const notes = {};
            categories.forEach((cat, i) => {
                const t = document.getElementById('notes-cat-' + i);
                if (t) notes[cat] = t.value;
            });
            ProgressManager.save(unitId, 'notes', notes);
            saveBtn.textContent = 'Saved!';
            setTimeout(() => { saveBtn.textContent = 'Save Notes'; }, 1500);
        });
        btnRow.appendChild(saveBtn);

        const printBtn = document.createElement('button');
        printBtn.className = 'nav-button';
        printBtn.style.flex = '1';
        printBtn.style.background = 'var(--secondary, #1F90ED)';
        printBtn.textContent = 'Print Guide';
        printBtn.addEventListener('click', () => {
            const notes = {};
            categories.forEach((cat, i) => {
                const t = document.getElementById('notes-cat-' + i);
                if (t) notes[cat] = t.value;
            });
            this._printStudyGuide(config, needsReview, mastered, categories, notes);
        });
        btnRow.appendChild(printBtn);

        notesSection.appendChild(btnRow);
        wrapper.appendChild(notesSection);
        container.appendChild(wrapper);
    },

    _printStudyGuide(config, needsReview, mastered, categories, notes) {
        const win = window.open('', '_blank');
        if (!win) return;

        const doc = win.document;
        doc.open();
        doc.write('<!DOCTYPE html><html><head><meta charset="UTF-8">' +
            '<title>Study Guide</title>' +
            '<style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:0 20px;color:#222;}' +
            'h1{border-bottom:2px solid #333;padding-bottom:8px;}' +
            'h2{margin-top:24px;color:#444;}h3{margin-top:16px;color:#555;}' +
            '.term{margin-bottom:4px;}.term strong{color:#333;}' +
            'pre{white-space:pre-wrap;font-family:inherit;line-height:1.6;margin:0;padding:8px;background:#f9f9f9;border-radius:4px;}' +
            '@media print{pre{background:none;}}</style></head><body>');
        doc.close();

        const h1 = doc.createElement('h1');
        h1.textContent = config.unit.title + ' - Study Guide';
        doc.body.appendChild(h1);

        if (needsReview.length > 0) {
            const h2 = doc.createElement('h2');
            h2.textContent = 'Terms to Review (' + needsReview.length + ')';
            doc.body.appendChild(h2);

            needsReview.forEach(v => {
                const p = doc.createElement('div');
                p.className = 'term';
                const b = doc.createElement('strong');
                b.textContent = v.term + ': ';
                p.appendChild(b);
                p.appendChild(doc.createTextNode(v.definition));
                doc.body.appendChild(p);
            });
        }

        // Notes
        const hasNotes = categories.some(cat => notes[cat] && notes[cat].trim());
        if (hasNotes) {
            const h2 = doc.createElement('h2');
            h2.textContent = 'My Notes';
            doc.body.appendChild(h2);

            categories.forEach(cat => {
                if (!notes[cat] || !notes[cat].trim()) return;
                const h3 = doc.createElement('h3');
                h3.textContent = cat;
                doc.body.appendChild(h3);
                const pre = doc.createElement('pre');
                pre.textContent = notes[cat].trim();
                doc.body.appendChild(pre);
            });
        }

        win.print();
    },

    // ── Timer ────────────────────────────────────────────────────────────

    openTimer() {
        const html = '<div class="modal-header">' +
            '<h2>Focused Study Timer</h2>' +
            '<button class="close-btn" onclick="StudyEngine.closeModal()">&times;</button>' +
            '</div>' +
            '<div style="text-align:center;padding:20px;">' +
            '<div style="display:flex;gap:10px;justify-content:center;align-items:center;margin-bottom:20px;">' +
            '<input type="number" id="timer-min" value="25" min="0" max="120" ' +
            'style="width:70px;text-align:center;font-size:24px;padding:8px;border:1px solid #ccc;border-radius:6px;"> ' +
            '<span style="font-size:24px;font-weight:bold;">:</span> ' +
            '<input type="number" id="timer-sec" value="00" min="0" max="59" ' +
            'style="width:70px;text-align:center;font-size:24px;padding:8px;border:1px solid #ccc;border-radius:6px;">' +
            '</div>' +
            '<p style="color:#4b5563;margin-bottom:16px;">Set minutes and seconds, then start your focused session.</p>' +
            '<button class="nav-button" id="timer-start-btn" style="width:100%;font-size:18px;">Start Studying</button>' +
            '</div>';

        StudyEngine.showModal(html);

        document.getElementById('timer-start-btn').addEventListener('click', () => {
            const mins = parseInt(document.getElementById('timer-min').value, 10) || 0;
            const secs = parseInt(document.getElementById('timer-sec').value, 10) || 0;
            const totalSeconds = mins * 60 + secs;
            if (totalSeconds <= 0) return;
            StudyEngine.closeModal();
            this._startFocusedSession(totalSeconds);
        });
    },

    _timerInterval: null,
    _timerPaused: false,
    _timerRemaining: 0,
    _timerStartedAt: 0,
    _timerElapsed: 0,

    _startFocusedSession(totalSeconds) {
        this._timerRemaining = totalSeconds;
        this._timerPaused = false;
        this._timerStartedAt = Date.now();
        this._timerElapsed = 0;

        // Remove any existing timer bar
        var existing = document.getElementById('focus-timer-bar');
        if (existing) existing.parentNode.removeChild(existing);

        // Create persistent floating timer bar
        var bar = document.createElement('div');
        bar.id = 'focus-timer-bar';
        bar.className = 'focus-timer-bar';

        var display = document.createElement('span');
        display.id = 'timer-display';
        display.className = 'focus-timer-display';
        display.textContent = StudyUtils.formatTime(totalSeconds);
        bar.appendChild(display);

        var pauseBtn = document.createElement('button');
        pauseBtn.id = 'timer-pause-btn';
        pauseBtn.className = 'focus-timer-btn';
        var pauseIcon = document.createElement('i');
        pauseIcon.className = 'fas fa-pause';
        pauseIcon.id = 'timer-pause-icon';
        pauseBtn.appendChild(pauseIcon);
        pauseBtn.addEventListener('click', () => this._togglePause());
        bar.appendChild(pauseBtn);

        var exitBtn = document.createElement('button');
        exitBtn.className = 'focus-timer-btn exit';
        var exitIcon = document.createElement('i');
        exitIcon.className = 'fas fa-times';
        exitBtn.appendChild(exitIcon);
        exitBtn.addEventListener('click', () => this._stopTimer(true));
        bar.appendChild(exitBtn);

        document.body.appendChild(bar);
        document.body.classList.add('timer-active');

        this._timerInterval = setInterval(() => this._tick(), 1000);
    },

    _tick() {
        if (this._timerPaused) return;
        this._timerRemaining--;
        this._timerElapsed += 1000;

        const display = document.getElementById('timer-display');
        if (display) {
            display.textContent = StudyUtils.formatTime(Math.max(0, this._timerRemaining));
        }

        if (this._timerRemaining <= 0) {
            this._stopTimer(false);
            StudyUtils.showToast('Study session complete! Great work!', 'success');
            if (typeof AchievementManager !== 'undefined') {
                AchievementManager.showConfetti();
            }
        }
    },

    _togglePause() {
        this._timerPaused = !this._timerPaused;
        var icon = document.getElementById('timer-pause-icon');
        if (icon) icon.className = this._timerPaused ? 'fas fa-play' : 'fas fa-pause';
        var bar = document.getElementById('focus-timer-bar');
        if (bar) {
            if (this._timerPaused) {
                bar.classList.add('paused');
            } else {
                bar.classList.remove('paused');
            }
        }
    },

    _stopTimer(early) {
        clearInterval(this._timerInterval);
        this._timerInterval = null;

        const config = StudyEngine.config;
        if (config && this._timerElapsed > 0) {
            ProgressManager.addStudyTime(config.unit.id, this._timerElapsed);
        }

        var bar = document.getElementById('focus-timer-bar');
        if (bar) bar.parentNode.removeChild(bar);
        document.body.classList.remove('timer-active');
    },

    // ── Print ────────────────────────────────────────────────────────────

    openPrint() {
        const config = StudyEngine.config;
        if (!config) return;

        const html = '<div class="modal-header">' +
            '<h2>Print Study Guide</h2>' +
            '<button class="close-btn" onclick="StudyEngine.closeModal()">&times;</button>' +
            '</div>' +
            '<div style="padding:10px;">' +
            '<p style="color:#4b5563;margin-bottom:16px;">Choose what to include in your study guide:</p>' +
            '<label style="display:block;margin-bottom:10px;cursor:pointer;">' +
            '<input type="checkbox" id="print-vocab" checked> Vocabulary terms</label>' +
            '<label style="display:block;margin-bottom:10px;cursor:pointer;margin-left:24px;">' +
            '<input type="checkbox" id="print-vocab-defs" checked> Include definitions</label>' +
            '<label style="display:block;margin-bottom:10px;cursor:pointer;">' +
            '<input type="checkbox" id="print-timeline" checked> Timeline events</label>' +
            '<label style="display:block;margin-bottom:10px;cursor:pointer;">' +
            '<input type="checkbox" id="print-questions" checked> Practice questions</label>' +
            '<button class="nav-button" id="print-go-btn" style="width:100%;margin-top:14px;">Generate &amp; Print</button>' +
            '</div>';

        StudyEngine.showModal(html);

        document.getElementById('print-go-btn').addEventListener('click', () => {
            const includeVocab = document.getElementById('print-vocab').checked;
            const includeDefs = document.getElementById('print-vocab-defs').checked;
            const includeTimeline = document.getElementById('print-timeline').checked;
            const includeQuestions = document.getElementById('print-questions').checked;
            this._generatePrintPage(config, includeVocab, includeDefs, includeTimeline, includeQuestions);
        });
    },

    _generatePrintPage(config, includeVocab, includeDefs, includeTimeline, includeQuestions) {
        const win = window.open('', '_blank');
        if (!win) return;

        const doc = win.document;
        doc.open();
        doc.write('<!DOCTYPE html><html><head><meta charset="UTF-8">' +
            '<title>Study Guide</title>' +
            '<style>body{font-family:Georgia,serif;max-width:750px;margin:40px auto;padding:0 20px;color:#222;}' +
            'h1{border-bottom:2px solid #333;padding-bottom:8px;}' +
            'h2{margin-top:28px;color:#444;}' +
            'h3{margin-top:18px;margin-bottom:4px;color:#555;}' +
            'table{width:100%;border-collapse:collapse;margin-top:8px;}' +
            'th,td{border:1px solid #ccc;padding:6px 10px;text-align:left;vertical-align:top;}' +
            'th{background:#f0f0f0;}' +
            'ol{line-height:1.8;}' +
            '.tl-item{margin-bottom:6px;}' +
            '.tl-year{font-weight:bold;margin-right:6px;}' +
            '@media print{body{margin:20px;}}</style></head><body>');
        doc.close();

        const h1 = doc.createElement('h1');
        h1.textContent = config.unit.title + ' - Study Guide';
        doc.body.appendChild(h1);

        // Vocabulary
        if (includeVocab && config.vocabulary) {
            const h2 = doc.createElement('h2');
            h2.textContent = 'Vocabulary';
            doc.body.appendChild(h2);

            // Group by category
            const cats = {};
            config.vocabulary.forEach(v => {
                const cat = v.category || 'General';
                if (!cats[cat]) cats[cat] = [];
                cats[cat].push(v);
            });

            Object.keys(cats).forEach(cat => {
                const h3 = doc.createElement('h3');
                h3.textContent = cat;
                doc.body.appendChild(h3);

                const table = doc.createElement('table');
                const thead = doc.createElement('thead');
                const headerRow = doc.createElement('tr');
                const thTerm = doc.createElement('th');
                thTerm.textContent = 'Term';
                headerRow.appendChild(thTerm);
                if (includeDefs) {
                    const thDef = doc.createElement('th');
                    thDef.textContent = 'Definition';
                    headerRow.appendChild(thDef);
                }
                thead.appendChild(headerRow);
                table.appendChild(thead);

                const tbody = doc.createElement('tbody');
                cats[cat].forEach(v => {
                    const row = doc.createElement('tr');
                    const tdTerm = doc.createElement('td');
                    tdTerm.textContent = v.term;
                    row.appendChild(tdTerm);
                    if (includeDefs) {
                        const tdDef = doc.createElement('td');
                        tdDef.textContent = v.definition;
                        row.appendChild(tdDef);
                    }
                    tbody.appendChild(row);
                });
                table.appendChild(tbody);
                doc.body.appendChild(table);
            });
        }

        // Timeline
        if (includeTimeline && config.timelineEvents) {
            const h2 = doc.createElement('h2');
            h2.textContent = 'Timeline';
            doc.body.appendChild(h2);

            const list = doc.createElement('div');
            config.timelineEvents.forEach(evt => {
                const item = doc.createElement('div');
                item.className = 'tl-item';
                const year = doc.createElement('span');
                year.className = 'tl-year';
                year.textContent = evt.year;
                item.appendChild(year);
                const title = doc.createElement('strong');
                title.textContent = evt.title;
                item.appendChild(title);
                item.appendChild(doc.createTextNode(' - ' + evt.description));
                list.appendChild(item);
            });
            doc.body.appendChild(list);
        }

        // Practice questions
        if (includeQuestions && config.practiceQuestions) {
            const h2 = doc.createElement('h2');
            h2.textContent = 'Practice Questions';
            doc.body.appendChild(h2);

            const ol = doc.createElement('ol');
            config.practiceQuestions.forEach(q => {
                const li = doc.createElement('li');
                li.textContent = q.question;
                ol.appendChild(li);
            });
            doc.body.appendChild(ol);
        }

        win.print();
    },

    // ── Music Player ─────────────────────────────────────────────────────

    _musicPlayer: null,
    _musicAudio: null,
    _musicTracks: [],
    _musicArtists: {},
    _musicIndex: 0,
    _musicVolume: 0.5,

    openMusic() {
        // If player already exists, just toggle visibility
        if (this._musicPlayer) {
            const isHidden = this._musicPlayer.style.display === 'none';
            this._musicPlayer.style.display = isHidden ? 'flex' : 'none';
            return;
        }

        // Load tracks manifest
        fetch('audio/tracks.json')
            .then(r => r.json())
            .then(data => {
                this._musicTracks = data.tracks || data;
                this._musicArtists = data.artists || {};
                this._musicIndex = 0;
                this._buildMusicPlayer();
            })
            .catch(() => {
                StudyUtils.showToast('No music tracks found. Add MP3s to audio/ folder.', 'error');
            });
    },

    _buildMusicPlayer() {
        const player = document.createElement('div');
        player.className = 'music-player';
        player.id = 'music-player';

        // Collapse/expand toggle
        const collapseBtn = document.createElement('button');
        collapseBtn.className = 'music-collapse-btn';
        const collapseIcon = document.createElement('i');
        collapseIcon.className = 'fas fa-chevron-down';
        collapseIcon.id = 'music-collapse-icon';
        collapseBtn.appendChild(collapseIcon);
        collapseBtn.addEventListener('click', () => {
            const body = document.getElementById('music-body');
            const icon = document.getElementById('music-collapse-icon');
            const collapsed = body.style.display === 'none';
            body.style.display = collapsed ? 'flex' : 'none';
            icon.className = collapsed ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
        });
        player.appendChild(collapseBtn);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'music-close-btn';
        const closeIcon = document.createElement('i');
        closeIcon.className = 'fas fa-times';
        closeBtn.appendChild(closeIcon);
        closeBtn.addEventListener('click', () => {
            if (this._musicAudio) {
                this._musicAudio.pause();
                this._musicAudio = null;
            }
            player.style.display = 'none';
        });
        player.appendChild(closeBtn);

        // Title bar (always visible)
        const titleBar = document.createElement('div');
        titleBar.className = 'music-title-bar';
        const musicIcon = document.createElement('i');
        musicIcon.className = 'fas fa-music';
        titleBar.appendChild(musicIcon);
        const titleText = document.createElement('span');
        titleText.id = 'music-track-title';
        titleText.textContent = this._musicTracks.length > 0 ? this._musicTracks[0].title : 'No tracks';
        titleBar.appendChild(titleText);
        player.appendChild(titleBar);

        // Body (collapsible)
        const body = document.createElement('div');
        body.className = 'music-body';
        body.id = 'music-body';

        // Artist row with info button
        const artistRow = document.createElement('div');
        artistRow.className = 'music-artist-row';
        const artist = document.createElement('span');
        artist.className = 'music-artist';
        artist.id = 'music-track-artist';
        artist.textContent = this._musicTracks.length > 0 ? this._musicTracks[0].artist : '';
        artistRow.appendChild(artist);

        const infoBtn = document.createElement('button');
        infoBtn.className = 'music-info-btn';
        infoBtn.id = 'music-info-btn';
        infoBtn.title = 'About this artist';
        const infoBtnIcon = document.createElement('i');
        infoBtnIcon.className = 'fas fa-info-circle';
        infoBtn.appendChild(infoBtnIcon);
        infoBtn.addEventListener('click', () => this._toggleArtistInfo());
        artistRow.appendChild(infoBtn);
        body.appendChild(artistRow);

        // Artist info panel (hidden by default)
        const infoPanel = document.createElement('div');
        infoPanel.className = 'music-artist-info';
        infoPanel.id = 'music-artist-info';
        infoPanel.style.display = 'none';
        body.appendChild(infoPanel);

        // Progress bar
        const progressWrap = document.createElement('div');
        progressWrap.className = 'music-progress-wrap';
        const progressBar = document.createElement('div');
        progressBar.className = 'music-progress-bar';
        progressBar.id = 'music-progress-bar';
        progressWrap.appendChild(progressBar);
        progressWrap.addEventListener('click', (e) => {
            if (!this._musicAudio || !this._musicAudio.duration) return;
            const rect = progressWrap.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            this._musicAudio.currentTime = pct * this._musicAudio.duration;
        });
        body.appendChild(progressWrap);

        // Time display
        const timeRow = document.createElement('div');
        timeRow.className = 'music-time-row';
        const timeCurrent = document.createElement('span');
        timeCurrent.id = 'music-time-current';
        timeCurrent.textContent = '0:00';
        const timeDuration = document.createElement('span');
        timeDuration.id = 'music-time-duration';
        timeDuration.textContent = '0:00';
        timeRow.appendChild(timeCurrent);
        timeRow.appendChild(timeDuration);
        body.appendChild(timeRow);

        // Controls
        const controls = document.createElement('div');
        controls.className = 'music-controls';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'music-ctrl-btn';
        const prevIcon = document.createElement('i');
        prevIcon.className = 'fas fa-backward';
        prevBtn.appendChild(prevIcon);
        prevBtn.addEventListener('click', () => this._musicSkip(-1));

        const playBtn = document.createElement('button');
        playBtn.className = 'music-ctrl-btn music-play-btn';
        playBtn.id = 'music-play-btn';
        const playIcon = document.createElement('i');
        playIcon.className = 'fas fa-play';
        playIcon.id = 'music-play-icon';
        playBtn.appendChild(playIcon);
        playBtn.addEventListener('click', () => this._musicTogglePlay());

        const nextBtn = document.createElement('button');
        nextBtn.className = 'music-ctrl-btn';
        const nextIcon = document.createElement('i');
        nextIcon.className = 'fas fa-forward';
        nextBtn.appendChild(nextIcon);
        nextBtn.addEventListener('click', () => this._musicSkip(1));

        controls.appendChild(prevBtn);
        controls.appendChild(playBtn);
        controls.appendChild(nextBtn);
        body.appendChild(controls);

        // Volume
        const volRow = document.createElement('div');
        volRow.className = 'music-vol-row';
        const volIcon = document.createElement('i');
        volIcon.className = 'fas fa-volume-up';
        volIcon.id = 'music-vol-icon';
        volRow.appendChild(volIcon);
        const volSlider = document.createElement('input');
        volSlider.type = 'range';
        volSlider.min = '0';
        volSlider.max = '100';
        volSlider.value = String(this._musicVolume * 100);
        volSlider.className = 'music-vol-slider';
        volSlider.addEventListener('input', (e) => {
            this._musicVolume = parseInt(e.target.value, 10) / 100;
            if (this._musicAudio) this._musicAudio.volume = this._musicVolume;
            const vi = document.getElementById('music-vol-icon');
            if (vi) vi.className = this._musicVolume === 0 ? 'fas fa-volume-mute' : this._musicVolume < 0.5 ? 'fas fa-volume-down' : 'fas fa-volume-up';
        });
        volRow.appendChild(volSlider);
        body.appendChild(volRow);

        player.appendChild(body);
        document.body.appendChild(player);
        this._musicPlayer = player;

        // Load first track
        if (this._musicTracks.length > 0) {
            this._musicLoadTrack(0);
        }
    },

    _toggleArtistInfo() {
        const panel = document.getElementById('music-artist-info');
        if (!panel) return;
        if (panel.style.display !== 'none') {
            panel.style.display = 'none';
            return;
        }
        const track = this._musicTracks[this._musicIndex];
        const artistData = this._musicArtists[track.artist];
        panel.textContent = '';
        if (!artistData) {
            panel.style.display = 'none';
            return;
        }

        if (artistData.portrait) {
            const img = document.createElement('img');
            img.src = artistData.portrait;
            img.alt = track.artist;
            img.className = 'music-artist-portrait';
            panel.appendChild(img);
        }

        const name = document.createElement('div');
        name.className = 'music-artist-name';
        name.textContent = track.artist;
        if (artistData.years) {
            const years = document.createElement('span');
            years.className = 'music-artist-years';
            years.textContent = ' (' + artistData.years + ')';
            name.appendChild(years);
        }
        panel.appendChild(name);

        const bio = document.createElement('div');
        bio.className = 'music-artist-bio';
        bio.textContent = artistData.bio;
        panel.appendChild(bio);

        panel.style.display = 'flex';
    },

    _musicLoadTrack(index) {
        if (this._musicTracks.length === 0) return;
        this._musicIndex = ((index % this._musicTracks.length) + this._musicTracks.length) % this._musicTracks.length;
        const track = this._musicTracks[this._musicIndex];

        const titleEl = document.getElementById('music-track-title');
        if (titleEl) titleEl.textContent = track.title;
        const artistEl = document.getElementById('music-track-artist');
        if (artistEl) artistEl.textContent = track.artist || '';

        // Hide artist info panel on track change
        const infoPanel = document.getElementById('music-artist-info');
        if (infoPanel) infoPanel.style.display = 'none';

        // Show/hide info button based on whether artist data exists
        const infoBtn = document.getElementById('music-info-btn');
        if (infoBtn) infoBtn.style.display = this._musicArtists[track.artist] ? '' : 'none';

        const wasPlaying = this._musicAudio && !this._musicAudio.paused;
        if (this._musicAudio) {
            this._musicAudio.pause();
        }

        this._musicAudio = new Audio('audio/' + track.file);
        this._musicAudio.volume = this._musicVolume;

        this._musicAudio.addEventListener('timeupdate', () => {
            const bar = document.getElementById('music-progress-bar');
            const cur = document.getElementById('music-time-current');
            const dur = document.getElementById('music-time-duration');
            if (!this._musicAudio) return;
            const pct = this._musicAudio.duration ? (this._musicAudio.currentTime / this._musicAudio.duration) * 100 : 0;
            if (bar) bar.style.width = pct + '%';
            if (cur) cur.textContent = this._formatMusicTime(this._musicAudio.currentTime);
            if (dur) dur.textContent = this._formatMusicTime(this._musicAudio.duration || 0);
        });

        this._musicAudio.addEventListener('ended', () => {
            this._musicSkip(1);
        });

        if (wasPlaying) {
            this._musicAudio.play();
        }
    },

    _musicTogglePlay() {
        if (!this._musicAudio) return;
        const icon = document.getElementById('music-play-icon');
        if (this._musicAudio.paused) {
            this._musicAudio.play();
            if (icon) icon.className = 'fas fa-pause';
        } else {
            this._musicAudio.pause();
            if (icon) icon.className = 'fas fa-play';
        }
    },

    _musicSkip(dir) {
        const wasPlaying = this._musicAudio && !this._musicAudio.paused;
        this._musicLoadTrack(this._musicIndex + dir);
        if (wasPlaying) {
            this._musicAudio.play();
            const icon = document.getElementById('music-play-icon');
            if (icon) icon.className = 'fas fa-pause';
        }
    },

    _formatMusicTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    },

    // ── Export Progress ──────────────────────────────────────────────────

    exportProgress() {
        const config = StudyEngine.config;
        if (!config) return;
        const unitId = config.unit.id;

        // Gather data
        const studyTime = ProgressManager.load(unitId, 'studyTime') || 0;
        const streak = ProgressManager.load(unitId, 'streak') || { current: 0 };
        const vocabProgress = ProgressManager.getActivityProgress(unitId, 'flashcards') || {};
        const masteredCount = vocabProgress.mastered ? vocabProgress.mastered.length : 0;
        const totalVocab = config.vocabulary ? config.vocabulary.length : 0;

        const practiceProgress = ProgressManager.getActivityProgress(unitId, 'practice-test') || {};
        const practiceAnswered = practiceProgress.answered ? Object.keys(practiceProgress.answered).length : 0;
        const totalQuestions = config.practiceQuestions ? config.practiceQuestions.length : 0;
        const bestScore = practiceProgress.bestScore != null ? practiceProgress.bestScore : 'N/A';

        // Build print window using DOM methods
        const win = window.open('', '_blank');
        if (!win) return;

        const doc = win.document;
        doc.open();
        doc.write('<!DOCTYPE html><html><head><meta charset="UTF-8">' +
            '<title>Progress Report</title>' +
            '<style>body{font-family:Georgia,serif;max-width:600px;margin:40px auto;padding:0 20px;color:#222;}' +
            'h1{border-bottom:2px solid #333;padding-bottom:8px;}' +
            'table{width:100%;border-collapse:collapse;margin-top:16px;}' +
            'td{padding:10px 14px;border-bottom:1px solid #ddd;}' +
            'td:first-child{font-weight:bold;width:55%;}' +
            '@media print{body{margin:20px;}}</style></head><body>');
        doc.close();

        const h1 = doc.createElement('h1');
        h1.textContent = config.unit.title + ' - Progress Report';
        doc.body.appendChild(h1);

        const date = doc.createElement('p');
        date.style.color = '#4b5563';
        date.textContent = 'Generated: ' + new Date().toLocaleDateString();
        doc.body.appendChild(date);

        const table = doc.createElement('table');
        const rows = [
            ['Vocabulary Mastered', masteredCount + ' / ' + totalVocab],
            ['Practice Questions Attempted', practiceAnswered + ' / ' + totalQuestions],
            ['Best Test Score', bestScore === 'N/A' ? 'N/A' : bestScore + '%'],
            ['Total Study Time', StudyUtils.formatStudyTime(studyTime)],
            ['Current Streak', streak.current + ' days']
        ];

        rows.forEach(([label, value]) => {
            const tr = doc.createElement('tr');
            const tdLabel = doc.createElement('td');
            tdLabel.textContent = label;
            tr.appendChild(tdLabel);
            const tdValue = doc.createElement('td');
            tdValue.textContent = value;
            tr.appendChild(tdValue);
            table.appendChild(tr);
        });

        doc.body.appendChild(table);
        win.print();
    }
};
