const StudyTools = {

    // ── Notes ────────────────────────────────────────────────────────────

    openNotes() {
        const config = StudyEngine.config;
        if (!config || !config.vocabulary) return;
        const unitId = config.unit.id;

        // Collect unique categories in order of first appearance
        const categories = [];
        config.vocabulary.forEach(v => {
            if (v.category && !categories.includes(v.category)) {
                categories.push(v.category);
            }
        });

        // Load saved notes
        const saved = ProgressManager.load(unitId, 'notes') || {};

        // Build modal HTML (categories come from teacher config, safe)
        let html = '<div class="modal-header">' +
            '<h2>Note-Taking Guide</h2>' +
            '<button class="close-btn" onclick="StudyEngine.closeModal()">&times;</button>' +
            '</div>' +
            '<div class="notes-container" style="max-height:60vh;overflow-y:auto;padding:10px;">';

        categories.forEach((cat, i) => {
            html += '<h4 style="margin-top:' + (i === 0 ? '0' : '18px') + ';margin-bottom:6px;">' +
                StudyUtils.escapeHtml(cat) + '</h4>' +
                '<textarea id="notes-cat-' + i + '" rows="4" ' +
                'style="width:100%;box-sizing:border-box;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:14px;resize:vertical;" ' +
                'placeholder="Your notes for ' + StudyUtils.escapeHtml(cat) + '..."></textarea>';
        });

        html += '</div>' +
            '<div style="display:flex;gap:10px;margin-top:14px;">' +
            '<button class="nav-button" id="notes-save-btn" style="flex:1;">Save Notes</button>' +
            '<button class="nav-button" id="notes-print-btn" style="flex:1;background:var(--secondary,#1F90ED);">Print Notes</button>' +
            '</div>';

        StudyEngine.showModal(html);

        // Populate saved notes using textContent-safe path (value is safe for textarea)
        categories.forEach((cat, i) => {
            const ta = document.getElementById('notes-cat-' + i);
            if (ta && saved[cat]) {
                ta.value = saved[cat];
            }
        });

        // Wire up save button
        document.getElementById('notes-save-btn').addEventListener('click', () => {
            const notes = {};
            categories.forEach((cat, i) => {
                const ta = document.getElementById('notes-cat-' + i);
                if (ta) notes[cat] = ta.value;
            });
            ProgressManager.save(unitId, 'notes', notes);
            const btn = document.getElementById('notes-save-btn');
            btn.textContent = 'Saved!';
            setTimeout(() => { btn.textContent = 'Save Notes'; }, 1500);
        });

        // Wire up print button
        document.getElementById('notes-print-btn').addEventListener('click', () => {
            const notes = {};
            categories.forEach((cat, i) => {
                const ta = document.getElementById('notes-cat-' + i);
                if (ta) notes[cat] = ta.value;
            });
            this._printNotes(config.unit.title, categories, notes);
        });
    },

    _printNotes(title, categories, notes) {
        const win = window.open('', '_blank');
        if (!win) return;

        const doc = win.document;
        doc.open();
        doc.write('<!DOCTYPE html><html><head><meta charset="UTF-8">' +
            '<title>Study Notes</title>' +
            '<style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:0 20px;color:#222;}' +
            'h1{border-bottom:2px solid #333;padding-bottom:8px;}' +
            'h3{margin-top:24px;margin-bottom:4px;color:#444;}' +
            'pre{white-space:pre-wrap;font-family:inherit;line-height:1.6;margin:0;padding:8px;background:#f9f9f9;border-radius:4px;}' +
            '@media print{pre{background:none;}}</style></head><body>');
        doc.close();

        const h1 = doc.createElement('h1');
        h1.textContent = title + ' - Study Notes';
        doc.body.appendChild(h1);

        categories.forEach(cat => {
            const h3 = doc.createElement('h3');
            h3.textContent = cat;
            doc.body.appendChild(h3);

            const pre = doc.createElement('pre');
            pre.textContent = (notes[cat] || '').trim() || '(no notes)';
            doc.body.appendChild(pre);
        });

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
            '<p style="color:#666;margin-bottom:16px;">Set minutes and seconds, then start your focused session.</p>' +
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

        const tips = [
            'Focus on one topic at a time.',
            'Try to explain concepts in your own words.',
            'Take a short break after this session.',
            'Write down questions you have as you study.',
            'Review your notes from class alongside this tool.'
        ];
        const tip = tips[Math.floor(Math.random() * tips.length)];

        const html = '<div class="modal-header">' +
            '<h2>Focused Study Session</h2>' +
            '</div>' +
            '<div style="text-align:center;padding:20px;">' +
            '<div id="timer-display" style="font-size:64px;font-weight:bold;font-family:monospace;margin:20px 0;">' +
            StudyUtils.formatTime(totalSeconds) + '</div>' +
            '<p style="color:#888;font-style:italic;margin-bottom:24px;">' +
            StudyUtils.escapeHtml(tip) + '</p>' +
            '<div style="display:flex;gap:10px;justify-content:center;">' +
            '<button class="nav-button" id="timer-pause-btn" style="flex:1;">Pause</button>' +
            '<button class="nav-button" id="timer-exit-btn" style="flex:1;background:#dc2626;">Exit</button>' +
            '</div></div>';

        StudyEngine.showModal(html);

        document.getElementById('timer-pause-btn').addEventListener('click', () => {
            this._togglePause();
        });

        document.getElementById('timer-exit-btn').addEventListener('click', () => {
            this._stopTimer(true);
        });

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
            StudyUtils.showToast('Study session complete!', 'success');
        }
    },

    _togglePause() {
        this._timerPaused = !this._timerPaused;
        const btn = document.getElementById('timer-pause-btn');
        if (btn) btn.textContent = this._timerPaused ? 'Resume' : 'Pause';
    },

    _stopTimer(early) {
        clearInterval(this._timerInterval);
        this._timerInterval = null;

        const config = StudyEngine.config;
        if (config && this._timerElapsed > 0) {
            ProgressManager.addStudyTime(config.unit.id, this._timerElapsed);
        }

        StudyEngine.closeModal();
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
            '<p style="color:#666;margin-bottom:16px;">Choose what to include in your study guide:</p>' +
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
        date.style.color = '#888';
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
