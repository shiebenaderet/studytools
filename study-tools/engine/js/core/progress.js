const ProgressManager = {
    prefix: 'studytool_',
    studentInfo: null,
    dirty: {},
    supabase: null,
    studentId: null,
    syncTimer: null,
    sessionId: null,
    _sessionStartedAt: null,

    // --- Recovery word helpers ---

    // Normalizes a recovery word for hashing: trimmed, lowercased, collapsed whitespace.
    // Same normalization at signup and at restore so the hash compares correctly.
    _normalizeRecoveryWord(raw) {
        return (raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
    },

    // SHA-256 hex hash. Browser-native via SubtleCrypto — no library needed.
    async _hashRecoveryWord(raw) {
        const normalized = this._normalizeRecoveryWord(raw);
        if (!normalized) return null;
        const buf = new TextEncoder().encode(normalized);
        const digest = await crypto.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(digest))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },

    // --- localStorage tier ---

    getKey(unitId, key) {
        return `${this.prefix}${unitId}_${key}`;
    },

    save(unitId, key, value) {
        localStorage.setItem(this.getKey(unitId, key), JSON.stringify(value));
        this.markDirty(unitId, key);
    },

    load(unitId, key) {
        const stored = localStorage.getItem(this.getKey(unitId, key));
        return stored ? JSON.parse(stored) : null;
    },

    getActivityProgress(unitId, activityId) {
        return this.load(unitId, `activity_${activityId}`);
    },

    saveActivityProgress(unitId, activityId, data) {
        this.save(unitId, `activity_${activityId}`, {
            ...data,
            updatedAt: Date.now()
        });
        // Auto-submit to leaderboard on every save
        if (typeof LeaderboardManager !== 'undefined') {
            LeaderboardManager.submitScore();
        }
    },

    // --- Streaks ---

    updateStreak(unitId) {
        const streak = this.load(unitId, 'streak') || { current: 0, lastDate: null };
        const today = new Date().toDateString();
        if (streak.lastDate !== today) {
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            streak.current = (streak.lastDate === yesterday) ? streak.current + 1 : 1;
            streak.lastDate = today;
            this.save(unitId, 'streak', streak);
            // Also append to the distinct-days set used by the consistency
            // multiplier on the leaderboard. Separate from `streak.current`,
            // which resets on a missed day — this one only grows.
            this._recordStudyDay(unitId, today);
        }
        return streak;
    },

    // Append today (date string) to the unit's distinct study days, if not
    // already present. Used by the leaderboard consistency multiplier so a
    // student who studied over many days outscores one who crammed last night.
    _recordStudyDay(unitId, dateString) {
        const days = this.load(unitId, 'studyDays') || [];
        if (days.indexOf(dateString) === -1) {
            days.push(dateString);
            this.save(unitId, 'studyDays', days);
        }
    },

    getStudyDayCount(unitId) {
        const days = this.load(unitId, 'studyDays') || [];
        // Backfill from streak.lastDate for students who studied before the
        // studyDays field existed — they don't get retroactive credit for old
        // sessions but they shouldn't drop to 0 either.
        if (days.length === 0) {
            const streak = this.load(unitId, 'streak');
            if (streak && streak.lastDate) return 1;
        }
        return days.length;
    },

    // --- Study time ---

    addStudyTime(unitId, ms) {
        const total = (this.load(unitId, 'studyTime') || 0) + ms;
        this.save(unitId, 'studyTime', total);
        return total;
    },

    // --- Badges ---

    getBadges(unitId) {
        return this.load(unitId, 'badges') || [];
    },

    unlockBadge(unitId, badgeId) {
        const badges = this.getBadges(unitId);
        if (!badges.includes(badgeId)) {
            badges.push(badgeId);
            this.save(unitId, 'badges', badges);
        }
    },

    // --- Home stats rendering ---

    renderHomeStats(config) {
        const unitId = config.unit.id;
        const statsContainer = document.getElementById('stats-container');
        if (!statsContainer) return;

        const studyTime = this.load(unitId, 'studyTime') || 0;
        const streak = this.load(unitId, 'streak') || { current: 0 };
        var learnStreak = this.load(unitId, 'learn-mode-streak') || { currentStreak: 0 };
        const vocabProgress = this.getActivityProgress(unitId, 'flashcards') || {};
        const hasTiers = config.vocabulary && config.vocabulary.some(v => v.tier);
        // Show the high-water mark so the count matches the leaderboard score
        // and never moves backward after a missed game answer.
        const masteredList = vocabProgress.everMastered || vocabProgress.mastered || [];
        const masteredCount = hasTiers
            ? masteredList.filter(t => config.vocabulary.some(v => v.term === t && (!v.tier || v.tier === 'must-know'))).length
            : masteredList.length;
        const totalVocab = hasTiers
            ? config.vocabulary.filter(v => !v.tier || v.tier === 'must-know').length
            : (config.vocabulary ? config.vocabulary.length : 0);
        const practiceMastery = this.getActivityProgress(unitId, 'practice-test-mastery') || {};
        const practiceCount = (practiceMastery.mastered || []).length;
        const totalQuestions = config.practiceQuestions ? config.practiceQuestions.length : 0;

        const vocabPct = totalVocab > 0 ? Math.round((masteredCount / totalVocab) * 100) : 0;
        const practicePct = totalQuestions > 0 ? Math.round((practiceCount / totalQuestions) * 100) : 0;

        // Build stats using DOM methods
        statsContainer.textContent = '';

        const heading = document.createElement('h2');
        heading.textContent = 'Your Progress';
        statsContainer.appendChild(heading);

        const grid = document.createElement('div');
        grid.className = 'stats-grid';

        // Helper to create stat boxes
        const createStatBox = (label, value, showProgress, pct) => {
            const box = document.createElement('div');
            box.className = 'stat-box';

            const labelEl = document.createElement('div');
            labelEl.className = 'stat-label';
            labelEl.textContent = label;
            box.appendChild(labelEl);

            const valueEl = document.createElement('div');
            valueEl.className = 'stat-value';
            valueEl.textContent = value;
            box.appendChild(valueEl);

            if (showProgress) {
                const bar = document.createElement('div');
                bar.className = 'progress-bar';
                const fill = document.createElement('div');
                fill.className = 'progress-fill';
                fill.style.width = pct + '%';
                bar.appendChild(fill);
                box.appendChild(bar);

                const progLabel = document.createElement('div');
                progLabel.className = 'progress-label';
                const progText = document.createElement('span');
                progText.className = 'progress-label-text';
                progText.textContent = value;
                progLabel.appendChild(progText);
                const progPct = document.createElement('span');
                progPct.className = 'progress-label-pct';
                progPct.textContent = pct + '%';
                progLabel.appendChild(progPct);
                box.appendChild(progLabel);
            }

            return box;
        };

        grid.appendChild(createStatBox('Study Time', StudyUtils.formatStudyTime(studyTime), false));
        grid.appendChild(createStatBox('Vocabulary Mastered', `${masteredCount}/${totalVocab}`, true, vocabPct));
        grid.appendChild(createStatBox('Questions Mastered', `${practiceCount}/${totalQuestions}`, true, practicePct));
        grid.appendChild(createStatBox('Current Streak', `${streak.current} days`, false));
        // Consistency multiplier: distinct days studied for this unit.
        // Surfaces the same value the leaderboard uses, so students can see
        // the multiplier grow as they study across more days.
        var consistencyDays = this.getStudyDayCount(unitId);
        if (consistencyDays > 0 && typeof LeaderboardManager !== 'undefined') {
            var consMult = LeaderboardManager.consistencyMultiplier(consistencyDays);
            var multLabel = consMult.toFixed(2).replace(/\.?0+$/, '') + 'x';
            var dayLabel = consistencyDays + ' day' + (consistencyDays !== 1 ? 's' : '');
            grid.appendChild(createStatBox('Consistency', dayLabel + ' (' + multLabel + ')', false));
        }
            if (learnStreak.currentStreak > 0) {
                var multiplier = learnStreak.currentStreak >= 3 ? '2x' : learnStreak.currentStreak >= 2 ? '1.75x' : '1.5x';
                grid.appendChild(createStatBox('Learn Streak', learnStreak.currentStreak + ' day' + (learnStreak.currentStreak !== 1 ? 's' : '') + ' (' + multiplier + ')', false));
            }

        statsContainer.appendChild(grid);

        // Login prompt visibility — show when not synced to Supabase
        const loginPrompt = document.getElementById('login-prompt');
        if (loginPrompt) {
            if (!this.studentId) {
                loginPrompt.classList.remove('hidden');
            } else {
                loginPrompt.classList.add('hidden');
            }
        }

        // Restore-progress link. Always visible so a student on a fresh
        // device (where localStorage is empty) can pull their cloud progress
        // back without having to type the same name+period and accidentally
        // create a new row. Also visible when already logged in, in case
        // they're on the wrong account.
        const existingRestore = document.getElementById('restore-progress-link');
        if (existingRestore && existingRestore.parentNode) {
            existingRestore.parentNode.removeChild(existingRestore);
        }
        const restoreWrap = document.createElement('div');
        restoreWrap.id = 'restore-progress-link';
        restoreWrap.style.cssText = 'text-align:center;margin-top:14px;font-size:0.85rem;color:var(--text-muted);';
        const restoreBtn = document.createElement('button');
        restoreBtn.type = 'button';
        restoreBtn.textContent = 'Switching computers? Restore your progress';
        restoreBtn.style.cssText = 'background:none;border:none;padding:0;color:var(--primary);text-decoration:underline;cursor:pointer;font:inherit;';
        restoreBtn.addEventListener('click', () => this.showRestoreModal());
        restoreWrap.appendChild(restoreBtn);
        statsContainer.appendChild(restoreWrap);
    },

    // --- Supabase sync ---

    markDirty(unitId, key) {
        this.dirty[`${unitId}:${key}`] = Date.now();
    },

    initSupabase() {
        if (typeof SUPABASE_URL === 'undefined' || SUPABASE_URL === 'YOUR_SUPABASE_URL') return;
        if (typeof supabase === 'undefined') return;
        this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    },

    async syncToSupabase() {
        if (!this.supabase || !this.studentId) return;
        try {
            const dirtyKeys = Object.keys(this.dirty);
            for (const compositeKey of dirtyKeys) {
                const [unitId, key] = compositeKey.split(':');
                const data = this.load(unitId, key);
                if (data === null) continue;
                const { error } = await this.supabase
                    .from('progress')
                    .upsert({
                        student_id: this.studentId,
                        unit_id: unitId,
                        activity: key,
                        data: data,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'student_id,unit_id,activity' });
                if (!error) {
                    delete this.dirty[compositeKey];
                }
            }
        } catch (err) {
            console.error('Supabase sync error:', err);
        }
    },

    // Merge remote and local activity data, keeping the best of both
    mergeActivityData(activity, local, remote) {
        if (!local) return remote;
        if (!remote) return local;

        // For flashcards: union mastered arrays, merge ratings keeping latest
        if (activity === 'activity_flashcards') {
            var localMastered = local.mastered || [];
            var remoteMastered = remote.mastered || [];
            var mergedMastered = [...new Set([...localMastered, ...remoteMastered])];

            // everMastered is a high-water mark — union and never drop entries.
            // Backfill from each side's mastered for records predating the field.
            var localEver = local.everMastered || local.mastered || [];
            var remoteEver = remote.everMastered || remote.mastered || [];
            var mergedEver = [...new Set([...localEver, ...remoteEver])];

            var mergedRatings = { ...(remote.ratings || {}), ...(local.ratings || {}) };

            return {
                ...remote,
                ...local,
                mastered: mergedMastered,
                everMastered: mergedEver,
                ratings: mergedRatings,
                updatedAt: Math.max(local.updatedAt || 0, remote.updatedAt || 0)
            };
        }

        // For practice-test-mastery: union mastered arrays, keep higher sessions
        if (activity === 'activity_practice-test-mastery') {
            var localMastered = local.mastered || [];
            var remoteMastered = remote.mastered || [];
            var mergedMastered = [...new Set([...localMastered, ...remoteMastered])];
            var localWrong = local.wrong || [];
            var remoteWrong = remote.wrong || [];
            // Wrong list: union, then remove anything now in mastered
            var mergedWrong = [...new Set([...localWrong, ...remoteWrong])].filter(function(q) {
                return mergedMastered.indexOf(q) === -1;
            });
            return {
                mastered: mergedMastered,
                wrong: mergedWrong,
                sessions: Math.max(local.sessions || 0, remote.sessions || 0),
                updatedAt: Math.max(local.updatedAt || 0, remote.updatedAt || 0)
            };
        }

        // For practice-test: keep the higher bestScore
        if (activity === 'activity_practice-test') {
            var localBest = typeof local.bestScore === 'number' ? local.bestScore : 0;
            var remoteBest = typeof remote.bestScore === 'number' ? remote.bestScore : 0;
            return {
                ...remote,
                ...local,
                bestScore: Math.max(localBest, remoteBest),
                updatedAt: Math.max(local.updatedAt || 0, remote.updatedAt || 0)
            };
        }

        // For map-quiz: keep the better bestScore and bestTime
        if (activity === 'activity_map-quiz') {
            return {
                ...remote,
                ...local,
                bestScore: Math.max(local.bestScore || 0, remote.bestScore || 0),
                bestTime: (local.bestTime && remote.bestTime)
                    ? Math.min(local.bestTime, remote.bestTime)
                    : local.bestTime || remote.bestTime,
                updatedAt: Math.max(local.updatedAt || 0, remote.updatedAt || 0)
            };
        }

        // For studyDays: union the two arrays of date strings so a student
        // who studied on different devices accumulates all their days.
        // Stored at the raw `studyDays` key (no `activity_` prefix), so it
        // arrives as a plain array, not an object.
        if (activity === 'studyDays') {
            var localDays = Array.isArray(local) ? local : [];
            var remoteDays = Array.isArray(remote) ? remote : [];
            return [...new Set([...localDays, ...remoteDays])];
        }

        // Default: newer wins (original behavior)
        var remoteTime = remote.updatedAt || 0;
        var localTime = local.updatedAt || 0;
        return remoteTime > localTime ? remote : local;
    },

    async syncFromSupabase() {
        if (!this.supabase || !this.studentId) return;
        try {
            const { data: rows, error } = await this.supabase
                .from('progress')
                .select('*')
                .eq('student_id', this.studentId);
            if (error || !rows) return;
            for (const row of rows) {
                const localData = this.load(row.unit_id, row.activity);
                const merged = this.mergeActivityData(row.activity, localData, row.data);
                if (merged !== localData) {
                    localStorage.setItem(this.getKey(row.unit_id, row.activity), JSON.stringify(merged));
                    // Mark dirty so the merged result syncs back to Supabase
                    this.dirty[`${row.unit_id}:${row.activity}`] = Date.now();
                }
            }
        } catch (err) {
            console.error('Supabase fetch error:', err);
        }
    },

    startSyncLoop() {
        if (this.syncTimer) clearInterval(this.syncTimer);
        this.syncTimer = setInterval(() => {
            this.syncToSupabase();
            // Also sync study time to leaderboard periodically
            if (typeof LeaderboardManager !== 'undefined') {
                LeaderboardManager.submitScore();
            }
        }, 30000);
    },

    async startSession() {
        if (!this.supabase || !this.studentId) return;
        try {
            const unitId = (typeof StudyEngine !== 'undefined' && StudyEngine.config && StudyEngine.config.unit)
                ? StudyEngine.config.unit.id
                : 'unknown';
            const { data, error } = await this.supabase
                .from('sessions')
                .insert({
                    student_id: this.studentId,
                    unit_id: unitId
                })
                .select('id')
                .single();
            if (!error && data) {
                this.sessionId = data.id;
                this._sessionStartedAt = Date.now();
            }
        } catch (err) {
            console.error('Session start error:', err);
        }
    },

    async endSession() {
        if (!this.supabase || !this.sessionId) return;
        try {
            const activitiesUsed = Object.keys(this.dirty).map(k => k.split(':')[1]);
            const uniqueActivities = [...new Set(activitiesUsed)];
            const sessionRow = await this.supabase
                .from('sessions')
                .select('started_at')
                .eq('id', this.sessionId)
                .single();
            let durationSeconds = 0;
            if (sessionRow.data && sessionRow.data.started_at) {
                durationSeconds = Math.round((Date.now() - new Date(sessionRow.data.started_at).getTime()) / 1000);
            }
            await this.supabase
                .from('sessions')
                .update({
                    duration_seconds: durationSeconds,
                    activities_used: uniqueActivities
                })
                .eq('id', this.sessionId);
        } catch (err) {
            console.error('Session end error:', err);
        }
    },

    // --- Helpers ---

    getFirstName() {
        if (!this.studentInfo || !this.studentInfo.name) return null;
        if (this.studentInfo.isGuest) return null;
        return this.studentInfo.name.trim().split(/\s+/)[0];
    },

    // Normalize a name for *matching only*. The display name keeps original
    // casing — this just collapses whitespace and folds case so "Madison "
    // and "madison" find each other.
    _normalizeName(name) {
        return (name || '').trim().replace(/\s+/g, ' ').toLowerCase();
    },

    // Levenshtein distance — only used for near-match prompts when the
    // typed name doesn't already exist in the class. Small candidate set,
    // so an O(m*n) implementation is fine.
    _editDistance(a, b) {
        if (a === b) return 0;
        if (!a.length) return b.length;
        if (!b.length) return a.length;
        var prev = [];
        for (var j = 0; j <= b.length; j++) prev[j] = j;
        for (var i = 1; i <= a.length; i++) {
            var curr = [i];
            for (var j2 = 1; j2 <= b.length; j2++) {
                var cost = a[i - 1] === b[j2 - 1] ? 0 : 1;
                curr[j2] = Math.min(curr[j2 - 1] + 1, prev[j2] + 1, prev[j2 - 1] + cost);
            }
            prev = curr;
        }
        return prev[b.length];
    },

    // Look up a class by code (case-insensitive). Returns class id or null.
    async _findClassId(code) {
        if (!this.supabase) return null;
        try {
            var result = await this.supabase
                .from('classes')
                .select('id')
                .ilike('code', code.trim())
                .limit(1);
            if (result.error || !result.data || result.data.length === 0) return null;
            return result.data[0].id;
        } catch (err) {
            console.error('Class lookup error:', err);
            return null;
        }
    },

    // Find students in a class whose name matches (case-insensitive exact).
    async _findExactStudent(name, classId) {
        if (!this.supabase) return null;
        try {
            var result = await this.supabase
                .from('students')
                .select('id, name, recovery_word_hash')
                .eq('class_id', classId)
                .ilike('name', name.trim());
            if (result.error || !result.data || result.data.length === 0) return null;
            // If somehow >1 returned (e.g. legacy rows differing only by case),
            // pick the one whose case best matches the user's input so they
            // continue under their own name.
            for (var i = 0; i < result.data.length; i++) {
                if (result.data[i].name === name.trim()) return result.data[i];
            }
            return result.data[0];
        } catch (err) {
            console.error('Student exact lookup error:', err);
            return null;
        }
    },

    // Find near-matches in a class — used to prompt "Did you mean Madison F.?"
    // when the typed name has no exact match. Returns up to 3 candidates with
    // edit-distance ≤ 2 (or substring overlap), excluding the exact match.
    async _findSimilarStudents(name, classId) {
        if (!this.supabase) return [];
        try {
            var result = await this.supabase
                .from('students')
                .select('id, name')
                .eq('class_id', classId);
            if (result.error || !result.data) return [];
            var typed = this._normalizeName(name);
            var self = this;
            var candidates = [];
            for (var i = 0; i < result.data.length; i++) {
                var row = result.data[i];
                var rowNorm = this._normalizeName(row.name);
                if (rowNorm === typed) continue;
                var dist = self._editDistance(typed, rowNorm);
                // Only suggest names that are close enough to plausibly be a
                // typo: short distance, OR one is a prefix of the other (e.g.
                // student typed "Madi" but registered as "Madison").
                var prefix = typed.length >= 3 && (rowNorm.indexOf(typed) === 0 || typed.indexOf(rowNorm) === 0);
                if (dist <= 2 || prefix) {
                    candidates.push({ id: row.id, name: row.name, dist: dist });
                }
            }
            candidates.sort(function(a, b) { return a.dist - b.dist; });
            return candidates.slice(0, 3);
        } catch (err) {
            console.error('Similar students lookup error:', err);
            return [];
        }
    },

    // Modal: "Did you mean Madison F.?" — resolves to one of:
    //   { action: 'use', candidate: {id, name} }   (yes, that's me)
    //   { action: 'new' }                           (no, I'm new)
    //   { action: 'cancel' }                        (close without choosing)
    _promptDidYouMean(candidates, typedName) {
        return new Promise(function(resolve) {
            var overlay = document.createElement('div');
            overlay.className = 'welcome-overlay didyoumean-overlay';

            var card = document.createElement('div');
            card.className = 'welcome-card';
            card.style.maxWidth = '420px';

            var title = document.createElement('h2');
            title.textContent = 'Is one of these you?';
            card.appendChild(title);

            var sub = document.createElement('p');
            sub.className = 'welcome-subtitle';
            sub.textContent = 'You typed "' + typedName + '". We found a similar name already in your class.';
            card.appendChild(sub);

            candidates.forEach(function(c) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'welcome-period-btn';
                btn.style.cssText = 'display:block;width:100%;text-align:left;margin-bottom:8px;';
                btn.textContent = 'Yes — I\'m ' + c.name;
                btn.addEventListener('click', function() {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    resolve({ action: 'use', candidate: c });
                });
                card.appendChild(btn);
            });

            var newBtn = document.createElement('button');
            newBtn.type = 'button';
            newBtn.className = 'welcome-go-btn';
            newBtn.style.marginTop = '12px';
            newBtn.textContent = 'No — I\'m new, use "' + typedName + '"';
            newBtn.addEventListener('click', function() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                resolve({ action: 'new' });
            });
            card.appendChild(newBtn);

            var cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'welcome-guest-link';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', function() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                resolve({ action: 'cancel' });
            });
            card.appendChild(cancelBtn);

            overlay.appendChild(card);
            document.body.appendChild(overlay);
        });
    },

    // Resolve (or create) a student row. Used by welcome screen, login modal,
    // and the restore-progress flow. Handles fuzzy matching:
    //   1. Look up by case-insensitive exact name.
    //   2. If no match, look for near-matches; ask the student to pick.
    //   3. If they say "I'm new" (or no candidates), insert a fresh row.
    // Returns { id, name } of the resolved student, or null on error/cancel.
    //
    // Open issue: two genuinely different students with the same name in the
    // same period (e.g. two Madisons) will both resolve to the first row,
    // overwriting each other. A 4-digit recovery PIN per row (Phase 3) fixes
    // this — until then, teachers should rename collisions explicitly.
    async _resolveStudent(name, classId, opts) {
        opts = opts || {};
        var trimmed = name.trim().replace(/\s+/g, ' ');
        var exact = await this._findExactStudent(trimmed, classId);
        if (exact) return exact;

        // Don't prompt for near-matches in restore-only mode — restore should
        // only succeed when the student exists, not silently create new rows.
        if (opts.restoreOnly) return null;

        var similar = await this._findSimilarStudents(trimmed, classId);
        if (similar.length > 0) {
            var choice = await this._promptDidYouMean(similar, trimmed);
            if (choice.action === 'use') return choice.candidate;
            if (choice.action === 'cancel') return null;
            // 'new' falls through to insert below
        }

        try {
            var insertPayload = { name: trimmed, class_id: classId };
            if (opts.recoveryWordHash) {
                insertPayload.recovery_word_hash = opts.recoveryWordHash;
                insertPayload.recovery_word_set_at = new Date().toISOString();
            }
            var insertResult = await this.supabase
                .from('students')
                .insert(insertPayload)
                .select('id, name, recovery_word_hash')
                .single();
            if (insertResult.error) throw insertResult.error;
            return insertResult.data;
        } catch (err) {
            console.error('Student insert error:', err);
            return null;
        }
    },

    // --- Welcome Screen ---

    showWelcomeScreen() {
        var self = this;
        var selectedCode = null;

        // Overlay
        var overlay = document.createElement('div');
        overlay.className = 'welcome-overlay';

        // Card
        var card = document.createElement('div');
        card.className = 'welcome-card';

        // Title
        var title = document.createElement('h1');
        title.textContent = 'Welcome! \uD83D\uDC4B';
        card.appendChild(title);

        // Subtitle
        var subtitle = document.createElement('p');
        subtitle.className = 'welcome-subtitle';
        subtitle.textContent = 'Let\u2019s get you set up so your progress is saved.';
        card.appendChild(subtitle);

        // Name label
        var nameLabel = document.createElement('label');
        nameLabel.setAttribute('for', 'welcome-name');
        nameLabel.textContent = 'What\u2019s your name?';
        card.appendChild(nameLabel);

        // Name input
        var nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'welcome-name';
        nameInput.className = 'welcome-name-input';
        nameInput.placeholder = 'First name only';
        nameInput.autocomplete = 'given-name';
        nameInput.maxLength = 20;
        card.appendChild(nameInput);

        // Period label
        var periodLabel = document.createElement('label');
        periodLabel.textContent = 'Which period are you in?';
        card.appendChild(periodLabel);

        // Period buttons
        var periodContainer = document.createElement('div');
        periodContainer.className = 'welcome-period-buttons';

        var periods = [
            { label: 'Period 1', code: 'period1' },
            { label: 'Period 2', code: 'period2' },
            { label: 'Period 4', code: 'period4' },
            { label: 'Period 5', code: 'period5' }
        ];

        var periodButtons = [];

        periods.forEach(function(p) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'welcome-period-btn';
            btn.textContent = p.label;
            btn.addEventListener('click', function() {
                selectedCode = p.code;
                periodButtons.forEach(function(b) { b.classList.remove('selected'); });
                btn.classList.add('selected');
                updateGoBtn();
            });
            periodButtons.push(btn);
            periodContainer.appendChild(btn);
        });

        card.appendChild(periodContainer);

        // Recovery word label + input
        var recoveryLabel = document.createElement('label');
        recoveryLabel.setAttribute('for', 'welcome-recovery');
        recoveryLabel.textContent = 'Pick a recovery word';
        card.appendChild(recoveryLabel);
        var recoveryHelp = document.createElement('p');
        recoveryHelp.className = 'welcome-subtitle';
        recoveryHelp.style.cssText = 'margin:-6px 0 6px;font-size:0.85rem;';
        recoveryHelp.textContent = 'Pick a word you\u2019ll remember (favorite food, pet name). You\u2019ll only need it if you switch computers or clear your browser.';
        card.appendChild(recoveryHelp);
        var recoveryInput = document.createElement('input');
        recoveryInput.type = 'text';
        recoveryInput.id = 'welcome-recovery';
        recoveryInput.className = 'welcome-name-input';
        recoveryInput.placeholder = 'e.g. pizza';
        recoveryInput.autocomplete = 'off';
        recoveryInput.maxLength = 40;
        card.appendChild(recoveryInput);

        // Go button
        var goBtn = document.createElement('button');
        goBtn.type = 'button';
        goBtn.className = 'welcome-go-btn';
        goBtn.textContent = 'Let\u2019s Go! \u2192';
        goBtn.disabled = true;
        card.appendChild(goBtn);

        // Guest mode link
        var guestLink = document.createElement('button');
        guestLink.type = 'button';
        guestLink.className = 'welcome-guest-link';
        guestLink.textContent = 'Just browsing? Continue as guest';
        card.appendChild(guestLink);

        guestLink.addEventListener('click', function() {
            self.studentInfo = { name: 'Guest', classCode: 'guest', isGuest: true };
            localStorage.setItem(self.prefix + 'studentInfo', JSON.stringify(self.studentInfo));
            overlay.classList.add('fade-out');
            setTimeout(function() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                if (StudyEngine.config) {
                    StudyEngine.renderHeader();
                    StudyEngine.renderHomeStats();
                }
            }, 400);
        });

        function updateGoBtn() {
            var hasName = nameInput.value.trim().length > 0;
            var hasRecovery = recoveryInput.value.trim().length > 0;
            goBtn.disabled = !(hasName && selectedCode && hasRecovery);
        }

        nameInput.addEventListener('input', updateGoBtn);
        recoveryInput.addEventListener('input', updateGoBtn);

        goBtn.addEventListener('click', async function() {
            var name = nameInput.value.trim().split(/\s+/)[0]; // First name only
            var recoveryRaw = recoveryInput.value.trim();
            if (!name || !selectedCode || !recoveryRaw) return;
            goBtn.disabled = true;
            goBtn.textContent = 'Setting up...';

            // Hash the recovery word client-side. Stored alongside the student on insert.
            var recoveryWordHash = null;
            try {
                recoveryWordHash = await self._hashRecoveryWord(recoveryRaw);
            } catch (e) {
                // Hashing failure shouldn't block signup — proceed without it
                console.warn('Recovery word hash failed:', e);
            }

            // Store info and run login logic
            self.studentInfo = { name: name, classCode: selectedCode };
            localStorage.setItem(self.prefix + 'studentInfo', JSON.stringify(self.studentInfo));

            // Supabase registration (mirrors login() logic)
            var afterLogin = function() {
                // Redirect first-time students to How to Study page
                if (!localStorage.getItem('how-to-study-seen') && typeof StudyEngine !== 'undefined' && StudyEngine.config) {
                    StudyEngine.redirectToHowToStudy();
                    return;
                }
                // Fade out
                overlay.classList.add('fade-out');
                setTimeout(function() {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    // Re-render header and stats with name
                    if (StudyEngine.config) {
                        StudyEngine.renderHeader();
                        StudyEngine.renderHomeStats();
                    }
                }, 400);
            };

            if (self.supabase) {
                (async function() {
                    try {
                        var classId = await self._findClassId(selectedCode);
                        if (!classId) {
                            // Class not found — still proceed with local save
                            afterLogin();
                            return;
                        }

                        var resolved = await self._resolveStudent(name, classId, { recoveryWordHash: recoveryWordHash });
                        if (!resolved) {
                            afterLogin();
                            return;
                        }
                        // If they confirmed an existing student, update local
                        // display name to that row's casing for consistency.
                        if (resolved.name && resolved.name !== name) {
                            self.studentInfo.name = resolved.name;
                            localStorage.setItem(self.prefix + 'studentInfo', JSON.stringify(self.studentInfo));
                        }
                        self.studentId = resolved.id;

                        // If this is a returning student (matched by name) who never
                        // set a recovery word, attach the one they just provided.
                        // Never overwrite an existing hash.
                        if (recoveryWordHash && resolved.recovery_word_hash == null) {
                            try {
                                await self.supabase
                                    .from('students')
                                    .update({ recovery_word_hash: recoveryWordHash, recovery_word_set_at: new Date().toISOString() })
                                    .eq('id', resolved.id)
                                    .is('recovery_word_hash', null);
                            } catch (e) {
                                console.warn('Recovery word attach failed:', e);
                            }
                        }

                        localStorage.setItem(self.prefix + 'studentId', self.studentId);
                        // Pull any existing cloud progress before starting the
                        // periodic sync, so a returning student's data isn't
                        // overwritten by an empty local state.
                        await self.syncFromSupabase();
                        self.startSyncLoop();
                        self.startSession();
                        self.syncToSupabase();
                    } catch (err) {
                        console.error('Welcome screen Supabase error:', err);
                    }
                    afterLogin();
                })();
            } else {
                afterLogin();
            }
        });

        // Allow Enter key to submit
        nameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !goBtn.disabled) {
                goBtn.click();
            }
        });

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        // Focus name input after animation
        setTimeout(function() { nameInput.focus(); }, 400);
    },

    // --- Login ---

    showLoginModal() {
        StudyEngine.showModal(`
            <div class="modal-header">
                <h2>Save Your Progress</h2>
                <button class="close-btn" onclick="StudyEngine.closeModal()">&times;</button>
            </div>
            <p style="color: #4b5563; margin-bottom: 20px;">Enter your name and class code to save progress across devices.</p>
            <div style="display: flex; flex-direction: column; gap: 15px;">
                <input type="text" id="student-name" placeholder="Your Name" class="login-input">
                <input type="text" id="class-code" placeholder="Class Code (from your teacher)" class="login-input">
                <button class="nav-button" onclick="ProgressManager.login()" style="width: 100%;">Save &amp; Continue</button>
            </div>
        `);
    },

    async login() {
        const nameInput = document.getElementById('student-name');
        const codeInput = document.getElementById('class-code');
        if (!nameInput || !codeInput) return;

        const name = nameInput.value.trim();
        const code = codeInput.value.trim();
        if (!name || !code) return;

        this.studentInfo = { name, classCode: code };
        localStorage.setItem(`${this.prefix}studentInfo`, JSON.stringify(this.studentInfo));
        StudyEngine.closeModal();

        if (this.supabase) {
            try {
                const classId = await this._findClassId(code);
                if (!classId) {
                    StudyUtils.showToast('Invalid class code', 'error');
                    return;
                }

                const resolved = await this._resolveStudent(name, classId);
                if (!resolved) return;
                if (resolved.name && resolved.name !== name) {
                    this.studentInfo.name = resolved.name;
                    localStorage.setItem(`${this.prefix}studentInfo`, JSON.stringify(this.studentInfo));
                }
                this.studentId = resolved.id;

                localStorage.setItem(`${this.prefix}studentId`, this.studentId);
                // Fetch + merge before the periodic upload kicks in so the
                // student's existing cloud progress isn't clobbered by a
                // fresher-but-emptier localStorage on a new device.
                await this.syncFromSupabase();
                this.startSyncLoop();
                this.startSession();
                this.syncToSupabase();
            } catch (err) {
                console.error('Supabase login error:', err);
            }
        }

        if (StudyEngine.config) {
            this.renderHomeStats(StudyEngine.config);
        }
    },

    // --- Restore Progress (Phase 2) ---

    // Shown when a student lands on a fresh device or after localStorage
    // was wiped. Looks like the welcome screen but DOES NOT create a new
    // student row if the name isn't found — it tells them so, and lets
    // them edit and try again. This is what saves a returning student
    // from accidentally starting over.
    showRestoreModal() {
        var self = this;
        var selectedCode = null;

        var overlay = document.createElement('div');
        overlay.className = 'welcome-overlay';

        var card = document.createElement('div');
        card.className = 'welcome-card';

        var title = document.createElement('h1');
        title.textContent = 'Welcome back!';
        card.appendChild(title);

        var subtitle = document.createElement('p');
        subtitle.className = 'welcome-subtitle';
        subtitle.textContent = 'Enter the same name and period you used before, and we’ll bring your progress back.';
        card.appendChild(subtitle);

        var nameLabel = document.createElement('label');
        nameLabel.setAttribute('for', 'restore-name');
        nameLabel.textContent = 'Your name';
        card.appendChild(nameLabel);

        var nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'restore-name';
        nameInput.className = 'welcome-name-input';
        nameInput.placeholder = 'First name only';
        nameInput.autocomplete = 'given-name';
        nameInput.maxLength = 20;
        // Pre-fill if we already have a name in localStorage (helps when
        // localStorage is intact but cloud sync got disconnected).
        if (this.studentInfo && this.studentInfo.name && !this.studentInfo.isGuest) {
            nameInput.value = this.studentInfo.name;
        }
        card.appendChild(nameInput);

        var periodLabel = document.createElement('label');
        periodLabel.textContent = 'Which period?';
        card.appendChild(periodLabel);

        var periodContainer = document.createElement('div');
        periodContainer.className = 'welcome-period-buttons';
        var periods = [
            { label: 'Period 1', code: 'period1' },
            { label: 'Period 2', code: 'period2' },
            { label: 'Period 4', code: 'period4' },
            { label: 'Period 5', code: 'period5' }
        ];
        var periodButtons = [];
        periods.forEach(function(p) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'welcome-period-btn';
            btn.textContent = p.label;
            // Pre-select if we have a stored period.
            if (self.studentInfo && self.studentInfo.classCode === p.code) {
                btn.classList.add('selected');
                selectedCode = p.code;
            }
            btn.addEventListener('click', function() {
                selectedCode = p.code;
                periodButtons.forEach(function(b) { b.classList.remove('selected'); });
                btn.classList.add('selected');
                updateGoBtn();
            });
            periodButtons.push(btn);
            periodContainer.appendChild(btn);
        });
        card.appendChild(periodContainer);

        var statusLine = document.createElement('p');
        statusLine.className = 'welcome-subtitle';
        statusLine.style.cssText = 'min-height:1.4em;margin-top:8px;font-size:0.9rem;';
        statusLine.textContent = '';
        card.appendChild(statusLine);

        var goBtn = document.createElement('button');
        goBtn.type = 'button';
        goBtn.className = 'welcome-go-btn';
        goBtn.textContent = 'Restore my progress';
        goBtn.disabled = !(nameInput.value.trim() && selectedCode);
        card.appendChild(goBtn);

        var cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'welcome-guest-link';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', function() {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        });
        card.appendChild(cancelBtn);

        // --- Restore-code (UUID) expander: secondary path for when name/period
        // matching fails (e.g. teacher had to rename or merge the student). ---
        var codeWrap = document.createElement('div');
        codeWrap.style.cssText = 'margin-top:18px;text-align:center;font-size:0.85rem;';
        var codeToggle = document.createElement('button');
        codeToggle.type = 'button';
        codeToggle.style.cssText = 'background:none;border:none;color:var(--text-muted);text-decoration:underline;cursor:pointer;font:inherit;';
        codeToggle.textContent = 'Have a restore code from your teacher?';
        codeWrap.appendChild(codeToggle);

        var codePanel = document.createElement('div');
        codePanel.style.cssText = 'display:none;margin-top:10px;text-align:left;';
        var codeLabel = document.createElement('label');
        codeLabel.setAttribute('for', 'restore-code-input');
        codeLabel.textContent = 'Restore code';
        codeLabel.style.cssText = 'display:block;margin-bottom:4px;';
        codePanel.appendChild(codeLabel);
        var codeInput = document.createElement('input');
        codeInput.type = 'text';
        codeInput.id = 'restore-code-input';
        codeInput.placeholder = 'Paste your code here';
        codeInput.autocomplete = 'off';
        codeInput.className = 'welcome-name-input';
        codeInput.style.cssText = 'font-family:ui-monospace,Consolas,monospace;font-size:0.9em;';
        codePanel.appendChild(codeInput);
        var codeStatus = document.createElement('p');
        codeStatus.style.cssText = 'min-height:1.2em;margin:6px 0;font-size:0.85rem;';
        codePanel.appendChild(codeStatus);
        var codeGoBtn = document.createElement('button');
        codeGoBtn.type = 'button';
        codeGoBtn.className = 'welcome-go-btn';
        codeGoBtn.textContent = 'Restore with code';
        codePanel.appendChild(codeGoBtn);
        codeWrap.appendChild(codePanel);
        card.appendChild(codeWrap);

        codeToggle.addEventListener('click', function() {
            var isOpen = codePanel.style.display !== 'none';
            codePanel.style.display = isOpen ? 'none' : 'block';
            if (!isOpen) setTimeout(function() { codeInput.focus(); }, 50);
        });

        codeGoBtn.addEventListener('click', async function() {
            var code = codeInput.value.trim();
            if (!code) return;
            codeGoBtn.disabled = true;
            codeGoBtn.textContent = 'Looking you up...';
            codeStatus.textContent = '';
            var result = await self.restoreProgressById(code);
            if (result.ok) {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                if (typeof StudyUtils !== 'undefined') {
                    StudyUtils.showToast('Welcome back, ' + result.name + '! Your progress is back.', 'success', 4500);
                }
                if (StudyEngine.config) {
                    StudyEngine.renderHeader();
                    StudyEngine.renderHomeStats();
                }
            } else {
                codeGoBtn.disabled = false;
                codeGoBtn.textContent = 'Try again';
                codeStatus.style.color = 'var(--danger, #c33)';
                codeStatus.textContent = result.message || 'That code didn’t match. Ask your teacher to double-check.';
            }
        });

        codeInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !codeGoBtn.disabled) codeGoBtn.click();
        });

        // --- Recovery-word expander: third recovery path. Uses name + period
        // (from the fields above) plus the recovery word the student set at
        // signup. Useful when the name spelling drifted but they remember the
        // word they picked. ---
        var rwWrap = document.createElement('div');
        rwWrap.style.cssText = 'margin-top:10px;text-align:center;font-size:0.85rem;';
        var rwToggle = document.createElement('button');
        rwToggle.type = 'button';
        rwToggle.style.cssText = 'background:none;border:none;color:var(--text-muted);text-decoration:underline;cursor:pointer;font:inherit;';
        rwToggle.textContent = 'Forgot your spelling? Use your recovery word';
        rwWrap.appendChild(rwToggle);

        var rwPanel = document.createElement('div');
        rwPanel.style.cssText = 'display:none;margin-top:10px;text-align:left;';
        var rwHelp = document.createElement('p');
        rwHelp.className = 'welcome-subtitle';
        rwHelp.style.cssText = 'margin:0 0 6px;font-size:0.85rem;';
        rwHelp.textContent = 'Fill in your name and period above, then enter the recovery word you picked when you signed up.';
        rwPanel.appendChild(rwHelp);
        var rwLabel = document.createElement('label');
        rwLabel.setAttribute('for', 'restore-recovery-input');
        rwLabel.textContent = 'Recovery word';
        rwLabel.style.cssText = 'display:block;margin-bottom:4px;';
        rwPanel.appendChild(rwLabel);
        var rwInput = document.createElement('input');
        rwInput.type = 'text';
        rwInput.id = 'restore-recovery-input';
        rwInput.placeholder = 'The word you picked at signup';
        rwInput.autocomplete = 'off';
        rwInput.className = 'welcome-name-input';
        rwPanel.appendChild(rwInput);
        var rwStatus = document.createElement('p');
        rwStatus.style.cssText = 'min-height:1.2em;margin:6px 0;font-size:0.85rem;';
        rwPanel.appendChild(rwStatus);
        var rwGoBtn = document.createElement('button');
        rwGoBtn.type = 'button';
        rwGoBtn.className = 'welcome-go-btn';
        rwGoBtn.textContent = 'Restore with recovery word';
        rwPanel.appendChild(rwGoBtn);
        rwWrap.appendChild(rwPanel);
        card.appendChild(rwWrap);

        rwToggle.addEventListener('click', function() {
            var isOpen = rwPanel.style.display !== 'none';
            rwPanel.style.display = isOpen ? 'none' : 'block';
            if (!isOpen) setTimeout(function() { rwInput.focus(); }, 50);
        });

        rwGoBtn.addEventListener('click', async function() {
            var name = nameInput.value.trim();
            var word = rwInput.value.trim();
            if (!name || !selectedCode || !word) {
                rwStatus.style.color = 'var(--danger, #c33)';
                rwStatus.textContent = 'Fill in name, period, and recovery word.';
                return;
            }
            rwGoBtn.disabled = true;
            rwGoBtn.textContent = 'Looking you up...';
            rwStatus.textContent = '';
            var result = await self.restoreProgressByRecoveryWord(name, selectedCode, word);
            if (result.ok) {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                if (typeof StudyUtils !== 'undefined') {
                    StudyUtils.showToast('Welcome back, ' + result.name + '! Your progress is back.', 'success', 4500);
                }
                if (StudyEngine.config) {
                    StudyEngine.renderHeader();
                    StudyEngine.renderHomeStats();
                }
            } else {
                rwGoBtn.disabled = false;
                rwGoBtn.textContent = 'Try again';
                rwStatus.style.color = 'var(--danger, #c33)';
                rwStatus.textContent = result.message || 'No match.';
            }
        });

        rwInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !rwGoBtn.disabled) rwGoBtn.click();
        });

        function updateGoBtn() {
            var hasName = nameInput.value.trim().length > 0;
            goBtn.disabled = !(hasName && selectedCode);
            statusLine.textContent = '';
        }
        nameInput.addEventListener('input', updateGoBtn);

        goBtn.addEventListener('click', async function() {
            var name = nameInput.value.trim();
            if (!name || !selectedCode) return;
            goBtn.disabled = true;
            goBtn.textContent = 'Looking you up...';
            statusLine.textContent = '';

            var result = await self.restoreProgress(name, selectedCode);
            if (result.ok) {
                statusLine.style.color = '';
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                if (typeof StudyUtils !== 'undefined') {
                    StudyUtils.showToast('Welcome back, ' + (result.name || name) + '! Your progress is back.', 'success', 4500);
                }
                if (StudyEngine.config) {
                    StudyEngine.renderHeader();
                    StudyEngine.renderHomeStats();
                }
            } else {
                goBtn.disabled = false;
                goBtn.textContent = 'Try again';
                statusLine.style.color = 'var(--danger, #c33)';
                statusLine.textContent = result.message || 'We couldn’t find that name in this period.';
            }
        });

        nameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !goBtn.disabled) goBtn.click();
        });

        overlay.appendChild(card);
        document.body.appendChild(overlay);
        setTimeout(function() { nameInput.focus(); }, 400);
    },

    // Look up an existing student and pull their cloud progress. Returns
    // { ok: true, name } on success or { ok: false, message } on failure.
    // Will NOT create a new row — that's the welcome screen's job.
    async restoreProgress(name, code) {
        if (!this.supabase) {
            this.initSupabase();
        }
        if (!this.supabase) {
            return { ok: false, message: 'Couldn’t connect. Check your internet and try again.' };
        }

        try {
            var classId = await this._findClassId(code);
            if (!classId) {
                return { ok: false, message: 'That period wasn’t found. Ask your teacher to double-check.' };
            }

            // Restore-only: case-insensitive exact match. We don't auto-create
            // here so a student doesn't accidentally start fresh thinking
            // they restored.
            var existing = await this._findExactStudent(name, classId);
            if (!existing) {
                // Offer near-matches if any, since this is exactly the case
                // where "Maddie vs Madison" would bite a returning student.
                var similar = await this._findSimilarStudents(name, classId);
                if (similar.length > 0) {
                    var choice = await this._promptDidYouMean(similar, name);
                    if (choice.action === 'use') {
                        existing = choice.candidate;
                    } else {
                        return { ok: false, message: 'No match. Make sure the name is spelled exactly the way you registered.' };
                    }
                } else {
                    return { ok: false, message: 'No match. Make sure the name is spelled exactly the way you registered.' };
                }
            }

            this.studentId = existing.id;
            this.studentInfo = { name: existing.name, classCode: code };
            localStorage.setItem(this.prefix + 'studentInfo', JSON.stringify(this.studentInfo));
            localStorage.setItem(this.prefix + 'studentId', this.studentId);

            await this.syncFromSupabase();
            this.startSyncLoop();
            this.startSession();
            // Sync up immediately so any local progress that was already on
            // this device merges into the cloud row.
            this.syncToSupabase();
            if (typeof LeaderboardManager !== 'undefined') {
                LeaderboardManager.submitScore();
            }

            return { ok: true, name: existing.name };
        } catch (err) {
            console.error('Restore error:', err);
            return { ok: false, message: 'Something went wrong. Try again in a moment.' };
        }
    },

    // Restore by UUID — the teacher reads the code out of the dashboard and the
    // student pastes it in. Bypasses name/period fuzzy matching for cases where
    // the student's record was renamed or where they typed the wrong variant.
    async restoreProgressById(rawId) {
        if (!this.supabase) this.initSupabase();
        if (!this.supabase) {
            return { ok: false, message: 'Couldn’t connect. Check your internet and try again.' };
        }

        var id = (rawId || '').trim().toLowerCase();
        // UUID v4 sanity check: 8-4-4-4-12 hex pattern.
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
            return { ok: false, message: 'That code doesn’t look right. Double-check it with your teacher.' };
        }

        try {
            var result = await this.supabase
                .from('students')
                .select('id, name, class_id, classes(code, name)')
                .eq('id', id)
                .maybeSingle();
            if (result.error) throw result.error;
            var student = result.data;
            if (!student) {
                return { ok: false, message: 'No student found for that code. Ask your teacher to read it again.' };
            }

            var classCode = (student.classes && student.classes.code) ? student.classes.code : null;
            if (!classCode) {
                return { ok: false, message: 'That student isn’t in a class. Ask your teacher to fix it.' };
            }

            this.studentId = student.id;
            this.studentInfo = { name: student.name, classCode: classCode };
            localStorage.setItem(this.prefix + 'studentInfo', JSON.stringify(this.studentInfo));
            localStorage.setItem(this.prefix + 'studentId', this.studentId);

            await this.syncFromSupabase();
            return { ok: true, name: student.name };
        } catch (err) {
            console.error('Restore-by-id error:', err);
            return { ok: false, message: 'Something went wrong. Try again in a moment.' };
        }
    },

    // Restore by name + period + recovery word. Used when the student
    // remembers their period and their recovery word but their name spelling
    // doesn't match exactly (and fuzzy "did you mean" would create a duplicate).
    // Returns { ok: true, name } on success or { ok: false, message } on failure.
    async restoreProgressByRecoveryWord(name, code, recoveryWord) {
        if (!this.supabase) this.initSupabase();
        if (!this.supabase) {
            return { ok: false, message: 'Couldn’t connect. Check your internet and try again.' };
        }
        if (!name || !code || !recoveryWord) {
            return { ok: false, message: 'Please fill in all three fields.' };
        }

        try {
            var hash = await this._hashRecoveryWord(recoveryWord);
            if (!hash) return { ok: false, message: 'Recovery word looks empty.' };

            var classId = await this._findClassId(code);
            if (!classId) {
                return { ok: false, message: 'That period wasn’t found. Ask your teacher to double-check.' };
            }

            // Look up by class + recovery word hash. Name is used as a hint
            // when multiple rows match the hash (rare: two kids picked the
            // same word). Case-insensitive name match.
            var result = await this.supabase
                .from('students')
                .select('id, name, recovery_word_hash')
                .eq('class_id', classId)
                .eq('recovery_word_hash', hash);
            if (result.error) throw result.error;
            var matches = result.data || [];
            if (matches.length === 0) {
                return { ok: false, message: 'No match. Check your period and recovery word.' };
            }

            var student = matches[0];
            if (matches.length > 1) {
                // Disambiguate by name (case-insensitive)
                var nameLower = name.trim().toLowerCase();
                var byName = matches.find(function(s) { return (s.name || '').toLowerCase() === nameLower; });
                if (byName) {
                    student = byName;
                } else {
                    return { ok: false, message: 'Multiple matches. Try again with the exact name your teacher has.' };
                }
            }

            this.studentId = student.id;
            this.studentInfo = { name: student.name, classCode: code };
            localStorage.setItem(this.prefix + 'studentInfo', JSON.stringify(this.studentInfo));
            localStorage.setItem(this.prefix + 'studentId', this.studentId);

            await this.syncFromSupabase();
            return { ok: true, name: student.name };
        } catch (err) {
            console.error('Restore-by-recovery-word error:', err);
            return { ok: false, message: 'Something went wrong. Try again in a moment.' };
        }
    },

    // Checks if the signed-in student has a recovery word set; if not, shows
    // a one-time modal asking them to pick one. Purely additive: failure or
    // dismissal leaves the student record untouched, and they'll be prompted
    // again on the next visit.
    async promptForRecoveryWordIfMissing() {
        if (!this.supabase || !this.studentId) return;
        if (!this.studentInfo || this.studentInfo.isGuest) return;
        // Skip if we already prompted this session
        if (sessionStorage.getItem('recovery-word-prompted')) return;
        sessionStorage.setItem('recovery-word-prompted', '1');

        try {
            var result = await this.supabase
                .from('students')
                .select('recovery_word_hash')
                .eq('id', this.studentId)
                .maybeSingle();
            if (result.error || !result.data) return;
            if (result.data.recovery_word_hash) return; // already set — done forever
            this._showRecoveryWordPrompt();
        } catch (e) {
            // Silent: this is a best-effort retroactive nudge.
        }
    },

    _showRecoveryWordPrompt() {
        var self = this;
        var overlay = document.createElement('div');
        overlay.className = 'welcome-overlay';

        var card = document.createElement('div');
        card.className = 'welcome-card';

        var title = document.createElement('h1');
        title.textContent = 'Quick add: recovery word';
        card.appendChild(title);

        var subtitle = document.createElement('p');
        subtitle.className = 'welcome-subtitle';
        subtitle.textContent = 'Pick a word you’ll remember (favorite food, pet name). You’ll only need it if you switch computers or clear your browser. Takes 5 seconds.';
        card.appendChild(subtitle);

        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'welcome-name-input';
        input.placeholder = 'e.g. pizza';
        input.autocomplete = 'off';
        input.maxLength = 40;
        card.appendChild(input);

        var status = document.createElement('p');
        status.className = 'welcome-subtitle';
        status.style.cssText = 'min-height:1.2em;margin:6px 0;font-size:0.85rem;';
        card.appendChild(status);

        var saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'welcome-go-btn';
        saveBtn.textContent = 'Save';
        saveBtn.disabled = true;
        card.appendChild(saveBtn);

        var laterBtn = document.createElement('button');
        laterBtn.type = 'button';
        laterBtn.className = 'welcome-guest-link';
        laterBtn.textContent = 'Remind me later';
        laterBtn.addEventListener('click', function() {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        });
        card.appendChild(laterBtn);

        input.addEventListener('input', function() {
            saveBtn.disabled = input.value.trim().length === 0;
        });
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !saveBtn.disabled) saveBtn.click();
        });

        saveBtn.addEventListener('click', async function() {
            var raw = input.value.trim();
            if (!raw) return;
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            try {
                var hash = await self._hashRecoveryWord(raw);
                if (!hash) throw new Error('hash failed');
                var res = await self.supabase
                    .from('students')
                    .update({ recovery_word_hash: hash, recovery_word_set_at: new Date().toISOString() })
                    .eq('id', self.studentId)
                    .is('recovery_word_hash', null);
                if (res.error) throw res.error;
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                if (typeof StudyUtils !== 'undefined') {
                    StudyUtils.showToast('Saved! You’re all set.', 'success', 3000);
                }
            } catch (e) {
                console.warn('Recovery word save failed:', e);
                saveBtn.disabled = false;
                saveBtn.textContent = 'Try again';
                status.style.color = 'var(--danger, #c33)';
                status.textContent = 'Couldn’t save. Try again in a moment.';
            }
        });

        overlay.appendChild(card);
        document.body.appendChild(overlay);
        setTimeout(function() { input.focus(); }, 200);
    },

    loadStudentInfo() {
        const stored = localStorage.getItem(`${this.prefix}studentInfo`);
        if (stored) {
            try {
                this.studentInfo = JSON.parse(stored);
            } catch (e) {
                this.studentInfo = null;
            }
        }
        const storedId = localStorage.getItem(`${this.prefix}studentId`);
        if (storedId) {
            this.studentId = storedId;
            this.initSupabase();
            if (this.supabase) {
                // Await remote sync before starting the periodic sync loop
                // to prevent stale remote data from overwriting local progress
                this.syncFromSupabase().then(() => {
                    this.startSyncLoop();
                    if (typeof LeaderboardManager !== 'undefined') {
                        LeaderboardManager.submitScore();
                    }
                });
                this.startSession();
            }
        }
    },

    showEditProfile() {
        var self = this;
        var currentName = (this.studentInfo && this.studentInfo.name) || '';
        var currentCode = (this.studentInfo && this.studentInfo.classCode) || '';
        var selectedCode = currentCode;

        var overlay = document.createElement('div');
        overlay.className = 'welcome-overlay';

        var card = document.createElement('div');
        card.className = 'welcome-card';

        var title = document.createElement('h1');
        title.textContent = 'Edit Profile';
        card.appendChild(title);

        var subtitle = document.createElement('p');
        subtitle.className = 'welcome-subtitle';
        subtitle.textContent = 'Fix your name or switch your period.';
        card.appendChild(subtitle);

        // Name
        var nameLabel = document.createElement('label');
        nameLabel.setAttribute('for', 'edit-profile-name');
        nameLabel.textContent = 'Your name';
        card.appendChild(nameLabel);

        var nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'edit-profile-name';
        nameInput.className = 'welcome-name-input';
        nameInput.placeholder = 'First name';
        nameInput.value = currentName;
        card.appendChild(nameInput);

        // Period
        var periodLabel = document.createElement('label');
        periodLabel.textContent = 'Your period';
        card.appendChild(periodLabel);

        var periodContainer = document.createElement('div');
        periodContainer.className = 'welcome-period-buttons';

        var periods = [
            { label: 'Period 1', code: 'period1' },
            { label: 'Period 2', code: 'period2' },
            { label: 'Period 4', code: 'period4' },
            { label: 'Period 5', code: 'period5' }
        ];

        var periodButtons = [];
        periods.forEach(function(p) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'welcome-period-btn';
            if (p.code === currentCode) btn.classList.add('selected');
            btn.textContent = p.label;
            btn.addEventListener('click', function() {
                selectedCode = p.code;
                periodButtons.forEach(function(b) { b.classList.remove('selected'); });
                btn.classList.add('selected');
            });
            periodButtons.push(btn);
            periodContainer.appendChild(btn);
        });
        card.appendChild(periodContainer);

        // Button row
        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:10px;margin-top:16px;';

        var cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'welcome-go-btn';
        cancelBtn.style.cssText = 'flex:1;background:var(--bg-elevated);color:var(--text-primary);border:1px solid var(--border-card);';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', function() {
            overlay.classList.add('fade-out');
            setTimeout(function() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 400);
        });
        btnRow.appendChild(cancelBtn);

        var saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'welcome-go-btn';
        saveBtn.style.flex = '1';
        saveBtn.textContent = 'Save Changes';
        saveBtn.addEventListener('click', function() {
            var newName = nameInput.value.trim();
            if (!newName || !selectedCode) return;

            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            var oldName = currentName;
            var oldCode = currentCode;

            self.studentInfo = { name: newName, classCode: selectedCode };
            localStorage.setItem(self.prefix + 'studentInfo', JSON.stringify(self.studentInfo));

            // Update Supabase if name or class changed
            var updateSupabase = function() {
                overlay.classList.add('fade-out');
                setTimeout(function() {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    if (StudyEngine.config) {
                        StudyEngine.renderHeader();
                        StudyEngine.renderHomeStats();
                    }
                    StudyUtils.showToast('Profile updated!', 'success');
                }, 400);
            };

            if (self.supabase && self.studentId && (newName !== oldName || selectedCode !== oldCode)) {
                (async function() {
                    try {
                        // Update name in students table
                        if (newName !== oldName) {
                            await self.supabase
                                .from('students')
                                .update({ name: newName })
                                .eq('id', self.studentId);
                        }

                        // If period changed, look up new class and update
                        if (selectedCode !== oldCode) {
                            var classResult = await self.supabase
                                .from('classes')
                                .select('id')
                                .ilike('code', selectedCode)
                                .limit(1);
                            if (classResult.data && classResult.data.length > 0) {
                                await self.supabase
                                    .from('students')
                                    .update({ class_id: classResult.data[0].id })
                                    .eq('id', self.studentId);
                            }
                        }
                    } catch (err) {
                        console.error('Profile update error:', err);
                    }
                    updateSupabase();
                })();
            } else {
                updateSupabase();
            }
        });
        btnRow.appendChild(saveBtn);

        card.appendChild(btnRow);

        // Allow Enter to save
        nameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') saveBtn.click();
        });

        // Reset progress section
        var resetSection = document.createElement('div');
        resetSection.style.cssText = 'margin-top:20px;padding-top:16px;border-top:1px solid var(--border-subtle);text-align:center;';

        var resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'welcome-go-btn';
        resetBtn.style.cssText = 'background:transparent;color:var(--text-muted);border:1px solid var(--border-card);font-size:0.85em;padding:8px 16px;';
        var resetIcon = document.createElement('i');
        resetIcon.className = 'fas fa-redo';
        resetIcon.style.marginRight = '6px';
        resetBtn.appendChild(resetIcon);
        resetBtn.appendChild(document.createTextNode('Reset My Progress'));
        resetBtn.addEventListener('click', function() {
            if (resetBtn.dataset.confirmed) {
                self._resetProgress();
                overlay.classList.add('fade-out');
                setTimeout(function() {
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    StudyUtils.showToast('Progress has been reset. Start fresh!', 'success');
                    if (StudyEngine.config) {
                        StudyEngine.renderHomeStats();
                    }
                }, 400);
                return;
            }
            resetBtn.dataset.confirmed = '1';
            resetBtn.style.cssText = 'background:#ef4444;color:#fff;border:1px solid #ef4444;font-size:0.85em;padding:8px 16px;';
            resetBtn.textContent = '';
            var warnIcon = document.createElement('i');
            warnIcon.className = 'fas fa-exclamation-triangle';
            warnIcon.style.marginRight = '6px';
            resetBtn.appendChild(warnIcon);
            resetBtn.appendChild(document.createTextNode('Are you sure? Click again to confirm'));
            setTimeout(function() {
                if (resetBtn.dataset.confirmed) {
                    delete resetBtn.dataset.confirmed;
                    resetBtn.style.cssText = 'background:transparent;color:var(--text-muted);border:1px solid var(--border-card);font-size:0.85em;padding:8px 16px;';
                    resetBtn.textContent = '';
                    var redoIcon = document.createElement('i');
                    redoIcon.className = 'fas fa-redo';
                    redoIcon.style.marginRight = '6px';
                    resetBtn.appendChild(redoIcon);
                    resetBtn.appendChild(document.createTextNode('Reset My Progress'));
                }
            }, 5000);
        });
        resetSection.appendChild(resetBtn);
        card.appendChild(resetSection);

        overlay.appendChild(card);
        document.body.appendChild(overlay);
        setTimeout(function() { nameInput.focus(); nameInput.select(); }, 400);
    },

    _resetProgress() {
        var unitId = StudyEngine.config ? StudyEngine.config.unit.id : null;
        if (!unitId) return;

        var prefix = this.prefix + unitId + '_';
        var keysToRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(function(k) { localStorage.removeItem(k); });

        localStorage.removeItem('fc-tutorial-seen');

        if (this.supabase && this.studentId) {
            (async () => {
                try {
                    await this.supabase
                        .from('progress')
                        .delete()
                        .eq('student_id', this.studentId)
                        .eq('unit_id', unitId);
                } catch (err) {
                    console.error('Failed to clear cloud progress:', err);
                }
            })();
        }
    }
};

// Load student info immediately
ProgressManager.initSupabase();
ProgressManager.loadStudentInfo();

// Save session and sync on page unload
window.addEventListener('beforeunload', () => {
    // Flush ActivityTimer elapsed time to localStorage before syncing
    if (typeof ActivityTimer !== 'undefined') {
        try { ActivityTimer.stop(); } catch (e) { /* best-effort */ }
    }

    if (!ProgressManager.supabase || !ProgressManager.studentId) return;

    var headers = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
    };

    // End session with keepalive fetch (async endSession won't complete during unload)
    if (ProgressManager.sessionId) {
        try {
            var sessionStart = ProgressManager._sessionStartedAt;
            var durationSeconds = sessionStart ? Math.round((Date.now() - sessionStart) / 1000) : 0;
            var activitiesUsed = Object.keys(ProgressManager.dirty).map(function(k) { return k.split(':')[1]; });
            var uniqueActivities = activitiesUsed.filter(function(v, i, a) { return a.indexOf(v) === i; });
            fetch(SUPABASE_URL + '/rest/v1/sessions?id=eq.' + ProgressManager.sessionId, {
                method: 'PATCH',
                headers: headers,
                body: JSON.stringify({
                    duration_seconds: durationSeconds,
                    activities_used: uniqueActivities
                }),
                keepalive: true
            });
        } catch (e) {
            // best-effort
        }
    }

    // Sync dirty progress
    try {
        var dirtyKeys = Object.keys(ProgressManager.dirty);
        for (var i = 0; i < dirtyKeys.length; i++) {
            var compositeKey = dirtyKeys[i];
            var parts = compositeKey.split(':');
            var unitId = parts[0];
            var key = parts[1];
            var data = ProgressManager.load(unitId, key);
            if (data === null) continue;
            fetch(SUPABASE_URL + '/rest/v1/progress', {
                method: 'POST',
                headers: Object.assign({}, headers, { 'Prefer': 'resolution=merge-duplicates' }),
                body: JSON.stringify({
                    student_id: ProgressManager.studentId,
                    unit_id: unitId,
                    activity: key,
                    data: data,
                    updated_at: new Date().toISOString()
                }),
                keepalive: true
            });
        }
    } catch (e) {
        // best-effort
    }

    // Update leaderboard study_time_seconds with keepalive fetch
    try {
        var config = typeof StudyEngine !== 'undefined' && StudyEngine.config;
        if (config) {
            var uid = config.unit.id;
            var studyTime = ProgressManager.load(uid, 'studyTime') || 0;
            var studyTimeSeconds = Math.floor(studyTime / 1000);
            var vocabProgress = ProgressManager.getActivityProgress(uid, 'flashcards') || {};
            var tjHasTiers = config.vocabulary && config.vocabulary.some(function(v) { return v.tier; });
            var tjMasteredList = vocabProgress.everMastered || vocabProgress.mastered || [];
            var vocabMastered = tjHasTiers
                ? tjMasteredList.filter(function(t) { return config.vocabulary.some(function(v) { return v.term === t && (!v.tier || v.tier === 'must-know'); }); }).length
                : tjMasteredList.length;
            var practiceProgress = ProgressManager.getActivityProgress(uid, 'practice-test') || {};
            var bestTestScore = typeof practiceProgress.bestScore === 'number' ? practiceProgress.bestScore : null;
            var mapProgress = ProgressManager.getActivityProgress(uid, 'map-quiz') || {};
            var mapBestTime = (mapProgress.bestScore >= 100 && mapProgress.bestTime) ? Math.max(30, mapProgress.bestTime) : null;
            var mapBonus = mapBestTime ? Math.max(0, 180 - mapBestTime) : 0;
            var score = LeaderboardManager.calculateScore(vocabMastered, bestTestScore, studyTimeSeconds, mapBonus);
            fetch(SUPABASE_URL + '/rest/v1/leaderboard', {
                method: 'POST',
                headers: Object.assign({}, headers, { 'Prefer': 'resolution=merge-duplicates' }),
                body: JSON.stringify({
                    student_id: ProgressManager.studentId,
                    unit_id: uid,
                    score: score,
                    vocab_mastered: vocabMastered,
                    best_test_score: bestTestScore,
                    study_time_seconds: studyTimeSeconds,
                    map_best_time: mapBestTime,
                    map_bonus: mapBonus,
                    updated_at: new Date().toISOString()
                }),
                keepalive: true
            });
        }
    } catch (e) {
        // best-effort
    }
});
