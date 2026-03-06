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
