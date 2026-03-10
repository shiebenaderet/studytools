// Leaderboard — student rankings with teacher approval
var LeaderboardManager = {

    // Calculate composite score: vocab mastered * 10 + best test score + study minutes + map bonus
    calculateScore(vocabMastered, bestTestScore, studyTimeSeconds, mapBonus) {
        var vocabPts = (vocabMastered || 0) * 10;
        var testPts = bestTestScore || 0;
        var timePts = Math.floor((studyTimeSeconds || 0) / 60); // 1 pt per minute
        var mapPts = mapBonus || 0;
        return vocabPts + testPts + timePts + mapPts;
    },

    // Submit or update student's leaderboard entry
    async submitScore() {
        if (!ProgressManager.supabase || !ProgressManager.studentId) return;
        var config = StudyEngine.config;
        if (!config) return;
        var unitId = config.unit.id;

        // Gather stats
        var vocabProgress = ProgressManager.getActivityProgress(unitId, 'flashcards') || {};
        var vocabMastered = vocabProgress.mastered ? vocabProgress.mastered.length : 0;

        var practiceProgress = ProgressManager.getActivityProgress(unitId, 'practice-test') || {};
        var bestTestScore = typeof practiceProgress.bestScore === 'number' ? practiceProgress.bestScore : null;

        var studyTime = ProgressManager.load(unitId, 'studyTime') || 0;
        var studyTimeSeconds = Math.floor(studyTime / 1000);

        var mapProgress = ProgressManager.getActivityProgress(unitId, 'map-quiz') || {};
        var mapBestTime = (mapProgress.bestScore === 100 && mapProgress.bestTime) ? mapProgress.bestTime : null;
        var mapBonus = mapBestTime ? Math.max(0, 180 - mapBestTime) : 0;

        var score = this.calculateScore(vocabMastered, bestTestScore, studyTimeSeconds, mapBonus);

        try {
            await ProgressManager.supabase.from('leaderboard').upsert({
                student_id: ProgressManager.studentId,
                unit_id: unitId,
                score: score,
                vocab_mastered: vocabMastered,
                best_test_score: bestTestScore,
                study_time_seconds: studyTimeSeconds,
                map_best_time: mapBestTime,
                map_bonus: mapBonus,
                updated_at: new Date().toISOString()
            }, { onConflict: 'student_id,unit_id' });
        } catch (err) {
            console.error('Leaderboard submit error:', err);
        }
    },

    // Render full leaderboard page (called from nav)
    async renderPage(container) {
        container.textContent = '';

        var heading = document.createElement('h2');
        heading.style.cssText = 'color:var(--text-primary);margin-bottom:16px;';
        var icon = document.createElement('i');
        icon.className = 'fas fa-trophy';
        icon.style.color = 'var(--accent)';
        heading.appendChild(icon);
        heading.appendChild(document.createTextNode(' Leaderboard'));
        container.appendChild(heading);

        // Tab bar: Students | Classes | Achievements
        var tabBar = document.createElement('div');
        tabBar.className = 'lb-tabs';
        var tabs = [
            { id: 'students', label: 'Top Students', icon: 'fas fa-user' },
            { id: 'map', label: 'Map Speed Run', icon: 'fas fa-map-marked-alt' },
            { id: 'classes', label: 'Class Battle', icon: 'fas fa-users' },
            { id: 'achievements', label: 'Achievements', icon: 'fas fa-medal' }
        ];
        var contentArea = document.createElement('div');
        contentArea.className = 'lb-content';

        var self = this;
        tabs.forEach(function(tab, i) {
            var btn = document.createElement('button');
            btn.className = 'lb-tab' + (i === 0 ? ' active' : '');
            btn.dataset.tab = tab.id;
            var tabIcon = document.createElement('i');
            tabIcon.className = tab.icon;
            btn.appendChild(tabIcon);
            btn.appendChild(document.createTextNode(' ' + tab.label));
            btn.addEventListener('click', function() {
                tabBar.querySelectorAll('.lb-tab').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                if (tab.id === 'students') self.renderStudentRankings(contentArea);
                else if (tab.id === 'map') self.renderMapSpeedRun(contentArea);
                else if (tab.id === 'classes') self.renderClassRankings(contentArea);
                else if (tab.id === 'achievements') self.renderAchievements(contentArea);
            });
            tabBar.appendChild(btn);
        });

        container.appendChild(tabBar);
        container.appendChild(contentArea);

        // Default: show student rankings
        await this.renderStudentRankings(contentArea);
    },

    async renderStudentRankings(container) {
        container.textContent = '';
        var loading = document.createElement('div');
        loading.style.cssText = 'text-align:center;padding:30px;color:var(--text-muted);';
        var spinner = document.createElement('i');
        spinner.className = 'fas fa-spinner fa-spin';
        loading.appendChild(spinner);
        loading.appendChild(document.createTextNode(' Loading rankings...'));
        container.appendChild(loading);

        if (!ProgressManager.supabase) {
            container.textContent = '';
            var msg = document.createElement('p');
            msg.style.cssText = 'text-align:center;color:var(--text-muted);padding:30px;';
            msg.textContent = 'Leaderboard requires an internet connection.';
            container.appendChild(msg);
            return;
        }

        try {
            var config = StudyEngine.config;
            var unitId = config ? config.unit.id : null;

            var query = ProgressManager.supabase
                .from('leaderboard')
                .select('student_id, score, vocab_mastered, best_test_score, study_time_seconds, map_best_time, map_bonus, updated_at')
                .eq('approved', true)
                .order('score', { ascending: false })
                .limit(50);
            if (unitId) query = query.eq('unit_id', unitId);

            var result = await query;
            if (result.error) throw result.error;
            var entries = result.data || [];

            // Get student names
            var studentIds = entries.map(function(e) { return e.student_id; });
            var studentNames = {};
            if (studentIds.length > 0) {
                var sResult = await ProgressManager.supabase
                    .from('students')
                    .select('id, name, class_id')
                    .in('id', studentIds);
                if (sResult.data) {
                    sResult.data.forEach(function(s) { studentNames[s.id] = s; });
                }
            }

            container.textContent = '';

            var explainer = document.createElement('p');
            explainer.className = 'lb-explainer';
            explainer.textContent = 'Vocab (\u00d710) + Test Score + Study Min + Map Bonus = Total';
            container.appendChild(explainer);

            if (entries.length === 0) {
                var empty = document.createElement('div');
                empty.style.cssText = 'text-align:center;padding:40px;color:var(--text-muted);';
                var emptyIcon = document.createElement('i');
                emptyIcon.className = 'fas fa-trophy';
                emptyIcon.style.cssText = 'font-size:2em;display:block;margin-bottom:12px;opacity:0.3;';
                empty.appendChild(emptyIcon);
                var emptyText = document.createElement('p');
                emptyText.textContent = 'No approved rankings yet. Keep studying!';
                empty.appendChild(emptyText);
                container.appendChild(empty);
                return;
            }

            // Podium for top 3
            if (entries.length >= 3) {
                var podium = document.createElement('div');
                podium.className = 'lb-podium';
                var podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd for visual layout
                podiumOrder.forEach(function(idx) {
                    var entry = entries[idx];
                    var student = studentNames[entry.student_id] || {};
                    var place = document.createElement('div');
                    place.className = 'lb-podium-place lb-place-' + (idx + 1);

                    var medal = document.createElement('div');
                    medal.className = 'lb-medal';
                    var medals = ['🥇', '🥈', '🥉'];
                    medal.textContent = medals[idx];
                    place.appendChild(medal);

                    var name = document.createElement('div');
                    name.className = 'lb-podium-name';
                    name.textContent = student.name || 'Unknown';
                    place.appendChild(name);

                    var score = document.createElement('div');
                    score.className = 'lb-podium-score';
                    score.textContent = entry.score + ' pts';
                    place.appendChild(score);

                    podium.appendChild(place);
                });
                container.appendChild(podium);
            }

            // Full list
            var list = document.createElement('div');
            list.className = 'lb-list';

            entries.forEach(function(entry, i) {
                var student = studentNames[entry.student_id] || {};
                var row = document.createElement('div');
                row.className = 'lb-row';
                if (ProgressManager.studentId === entry.student_id) row.classList.add('lb-row-me');

                var rank = document.createElement('div');
                rank.className = 'lb-rank';
                rank.textContent = '#' + (i + 1);
                row.appendChild(rank);

                var nameEl = document.createElement('div');
                nameEl.className = 'lb-name';
                nameEl.textContent = student.name || 'Unknown';
                if (ProgressManager.studentId === entry.student_id) {
                    var youTag = document.createElement('span');
                    youTag.className = 'lb-you-tag';
                    youTag.textContent = 'YOU';
                    nameEl.appendChild(youTag);
                }
                row.appendChild(nameEl);

                var stats = document.createElement('div');
                stats.className = 'lb-stats';
                var vocabStat = document.createElement('span');
                vocabStat.title = 'Vocab mastered';
                vocabStat.textContent = entry.vocab_mastered + ' vocab';
                stats.appendChild(vocabStat);
                if (entry.best_test_score !== null) {
                    var testStat = document.createElement('span');
                    testStat.title = 'Best test score';
                    testStat.textContent = entry.best_test_score + '%';
                    stats.appendChild(testStat);
                }
                var mapStat = document.createElement('span');
                mapStat.title = 'Map bonus';
                mapStat.textContent = entry.map_bonus ? '+' + entry.map_bonus + ' map' : '';
                if (mapStat.textContent) stats.appendChild(mapStat);
                row.appendChild(stats);

                var scoreEl = document.createElement('div');
                scoreEl.className = 'lb-score';
                scoreEl.textContent = entry.score + ' pts';
                row.appendChild(scoreEl);

                list.appendChild(row);
            });

            container.appendChild(list);

        } catch (err) {
            console.error('Leaderboard load error:', err);
            container.textContent = '';
            var errEl = document.createElement('p');
            errEl.style.cssText = 'text-align:center;color:var(--danger);padding:20px;';
            errEl.textContent = 'Failed to load leaderboard.';
            container.appendChild(errEl);
        }
    },

    async renderMapSpeedRun(container) {
        container.textContent = '';
        var loading = document.createElement('div');
        loading.style.cssText = 'text-align:center;padding:30px;color:var(--text-muted);';
        var spinner = document.createElement('i');
        spinner.className = 'fas fa-spinner fa-spin';
        loading.appendChild(spinner);
        loading.appendChild(document.createTextNode(' Loading map times...'));
        container.appendChild(loading);

        if (!ProgressManager.supabase) {
            container.textContent = '';
            var msg = document.createElement('p');
            msg.style.cssText = 'text-align:center;color:var(--text-muted);padding:30px;';
            msg.textContent = 'Speed run board requires an internet connection.';
            container.appendChild(msg);
            return;
        }

        try {
            var config = StudyEngine.config;
            var unitId = config ? config.unit.id : null;

            var query = ProgressManager.supabase
                .from('leaderboard')
                .select('student_id, map_best_time, map_bonus')
                .eq('approved', true)
                .not('map_best_time', 'is', null)
                .order('map_best_time', { ascending: true })
                .limit(50);
            if (unitId) query = query.eq('unit_id', unitId);

            var result = await query;
            if (result.error) throw result.error;
            var entries = result.data || [];

            var studentIds = entries.map(function(e) { return e.student_id; });
            var studentNames = {};
            if (studentIds.length > 0) {
                var sResult = await ProgressManager.supabase
                    .from('students')
                    .select('id, name')
                    .in('id', studentIds);
                if (sResult.data) {
                    sResult.data.forEach(function(s) { studentNames[s.id] = s; });
                }
            }

            container.textContent = '';

            var desc = document.createElement('p');
            desc.className = 'lb-explainer';
            desc.textContent = 'Get 100% on the Map Quiz to post your time. Faster = more bonus points!';
            container.appendChild(desc);

            if (entries.length === 0) {
                var empty = document.createElement('div');
                empty.style.cssText = 'text-align:center;padding:40px;color:var(--text-muted);';
                var emptyIcon = document.createElement('i');
                emptyIcon.className = 'fas fa-map-marked-alt';
                emptyIcon.style.cssText = 'font-size:2em;display:block;margin-bottom:12px;opacity:0.3;';
                empty.appendChild(emptyIcon);
                var emptyText = document.createElement('p');
                emptyText.textContent = 'No perfect map runs yet. Get 100% to post your time!';
                empty.appendChild(emptyText);
                container.appendChild(empty);
                return;
            }

            if (entries.length >= 3) {
                var podium = document.createElement('div');
                podium.className = 'lb-podium';
                var podiumOrder = [1, 0, 2];
                podiumOrder.forEach(function(idx) {
                    var entry = entries[idx];
                    var student = studentNames[entry.student_id] || {};
                    var place = document.createElement('div');
                    place.className = 'lb-podium-place lb-place-' + (idx + 1);

                    var medal = document.createElement('div');
                    medal.className = 'lb-medal';
                    var medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
                    medal.textContent = medals[idx];
                    place.appendChild(medal);

                    var name = document.createElement('div');
                    name.className = 'lb-podium-name';
                    name.textContent = student.name || 'Unknown';
                    place.appendChild(name);

                    var time = document.createElement('div');
                    time.className = 'lb-podium-score';
                    var m = Math.floor(entry.map_best_time / 60);
                    var s = entry.map_best_time % 60;
                    time.textContent = m + ':' + (s < 10 ? '0' : '') + s;
                    place.appendChild(time);

                    podium.appendChild(place);
                });
                container.appendChild(podium);
            }

            var list = document.createElement('div');
            list.className = 'lb-list';

            entries.forEach(function(entry, i) {
                var student = studentNames[entry.student_id] || {};
                var row = document.createElement('div');
                row.className = 'lb-row';
                if (ProgressManager.studentId === entry.student_id) row.classList.add('lb-row-me');

                var rank = document.createElement('div');
                rank.className = 'lb-rank';
                rank.textContent = '#' + (i + 1);
                row.appendChild(rank);

                var nameEl = document.createElement('div');
                nameEl.className = 'lb-name';
                nameEl.textContent = student.name || 'Unknown';
                if (ProgressManager.studentId === entry.student_id) {
                    var youTag = document.createElement('span');
                    youTag.className = 'lb-you-tag';
                    youTag.textContent = 'YOU';
                    nameEl.appendChild(youTag);
                }
                row.appendChild(nameEl);

                var stats = document.createElement('div');
                stats.className = 'lb-stats';
                var timeStat = document.createElement('span');
                var m = Math.floor(entry.map_best_time / 60);
                var s = entry.map_best_time % 60;
                timeStat.textContent = m + ':' + (s < 10 ? '0' : '') + s;
                stats.appendChild(timeStat);
                row.appendChild(stats);

                var scoreEl = document.createElement('div');
                scoreEl.className = 'lb-score';
                scoreEl.textContent = '+' + (entry.map_bonus || 0) + ' pts';
                row.appendChild(scoreEl);

                list.appendChild(row);
            });

            container.appendChild(list);

        } catch (err) {
            console.error('Map speed run error:', err);
            container.textContent = '';
            var errEl = document.createElement('p');
            errEl.style.cssText = 'text-align:center;color:var(--danger);padding:20px;';
            errEl.textContent = 'Failed to load map speed runs.';
            container.appendChild(errEl);
        }
    },

    async renderClassRankings(container) {
        container.textContent = '';
        var loading = document.createElement('div');
        loading.style.cssText = 'text-align:center;padding:30px;color:var(--text-muted);';
        var spinner = document.createElement('i');
        spinner.className = 'fas fa-spinner fa-spin';
        loading.appendChild(spinner);
        loading.appendChild(document.createTextNode(' Loading class rankings...'));
        container.appendChild(loading);

        if (!ProgressManager.supabase) {
            container.textContent = '';
            var msg = document.createElement('p');
            msg.style.cssText = 'text-align:center;color:var(--text-muted);padding:30px;';
            msg.textContent = 'Class rankings require an internet connection.';
            container.appendChild(msg);
            return;
        }

        try {
            var config = StudyEngine.config;
            var unitId = config ? config.unit.id : null;

            // Get approved leaderboard entries
            var query = ProgressManager.supabase
                .from('leaderboard')
                .select('student_id, score')
                .eq('approved', true);
            if (unitId) query = query.eq('unit_id', unitId);
            var result = await query;
            if (result.error) throw result.error;
            var entries = result.data || [];

            // Get students with class_id
            var studentIds = entries.map(function(e) { return e.student_id; });
            var studentMap = {};
            if (studentIds.length > 0) {
                var sResult = await ProgressManager.supabase
                    .from('students')
                    .select('id, class_id')
                    .in('id', studentIds);
                if (sResult.data) {
                    sResult.data.forEach(function(s) { studentMap[s.id] = s; });
                }
            }

            // Get class names
            var classResult = await ProgressManager.supabase
                .from('classes')
                .select('id, code, name');
            var classMap = {};
            if (classResult.data) {
                classResult.data.forEach(function(c) { classMap[c.id] = c; });
            }

            // Aggregate by class
            var classScores = {};
            entries.forEach(function(entry) {
                var student = studentMap[entry.student_id];
                if (!student || !student.class_id) return;
                if (!classScores[student.class_id]) {
                    classScores[student.class_id] = { total: 0, count: 0 };
                }
                classScores[student.class_id].total += entry.score;
                classScores[student.class_id].count++;
            });

            // Sort by average score
            var sorted = Object.keys(classScores).map(function(classId) {
                var c = classScores[classId];
                return {
                    classId: classId,
                    total: c.total,
                    count: c.count,
                    avg: Math.round(c.total / c.count)
                };
            }).sort(function(a, b) { return b.avg - a.avg; });

            container.textContent = '';

            if (sorted.length === 0) {
                var empty = document.createElement('div');
                empty.style.cssText = 'text-align:center;padding:40px;color:var(--text-muted);';
                var emptyIcon = document.createElement('i');
                emptyIcon.className = 'fas fa-users';
                emptyIcon.style.cssText = 'font-size:2em;display:block;margin-bottom:12px;opacity:0.3;';
                empty.appendChild(emptyIcon);
                var emptyText = document.createElement('p');
                emptyText.textContent = 'No class rankings yet.';
                empty.appendChild(emptyText);
                container.appendChild(empty);
                return;
            }

            var desc = document.createElement('p');
            desc.style.cssText = 'color:var(--text-secondary);font-size:0.85em;margin-bottom:16px;text-align:center;';
            desc.textContent = 'Which period will come out on top?';
            container.appendChild(desc);

            // Bar chart visualization
            var maxAvg = sorted[0] ? sorted[0].avg : 1;
            var barChart = document.createElement('div');
            barChart.className = 'lb-class-bar-wrap';

            sorted.forEach(function(item, i) {
                var cls = classMap[item.classId] || {};
                var barItem = document.createElement('div');
                barItem.className = 'lb-class-bar-item';

                var label = document.createElement('div');
                label.className = 'lb-class-bar-label';
                var medals = ['🏆 ', '🥈 ', '🥉 '];
                label.textContent = (i < 3 ? medals[i] : '') + (cls.name || cls.code || 'Unknown');
                barItem.appendChild(label);

                var track = document.createElement('div');
                track.className = 'lb-class-bar-track';

                var fill = document.createElement('div');
                fill.className = 'lb-class-bar-fill bar-' + ((i % 6) + 1);
                var pct = maxAvg > 0 ? Math.round((item.avg / maxAvg) * 100) : 0;
                // Animate in with delay
                fill.style.width = '0%';
                fill.textContent = item.avg + ' avg';
                setTimeout(function(f, p) { return function() { f.style.width = Math.max(p, 15) + '%'; }; }(fill, pct), 100 + i * 150);

                track.appendChild(fill);
                barItem.appendChild(track);

                var countLabel = document.createElement('div');
                countLabel.style.cssText = 'flex-shrink:0;font-size:0.75em;color:var(--text-muted);width:70px;';
                countLabel.textContent = item.count + ' students';
                barItem.appendChild(countLabel);

                barChart.appendChild(barItem);
            });

            container.appendChild(barChart);

        } catch (err) {
            console.error('Class rankings error:', err);
            container.textContent = '';
            var errEl = document.createElement('p');
            errEl.style.cssText = 'text-align:center;color:var(--danger);padding:20px;';
            errEl.textContent = 'Failed to load class rankings.';
            container.appendChild(errEl);
        }
    },

    renderAchievements(container) {
        container.textContent = '';
        if (typeof AchievementManager !== 'undefined') {
            AchievementManager.renderBadges(container);
        }
    },

    // Teacher: render approval queue and controls
    async renderTeacherSection(container) {
        var section = document.createElement('div');
        section.style.marginTop = '24px';

        var heading = document.createElement('h3');
        heading.style.cssText = 'color:var(--text-primary);margin-bottom:16px;';
        var icon = document.createElement('i');
        icon.className = 'fas fa-trophy';
        icon.style.color = 'var(--accent)';
        heading.appendChild(icon);
        heading.appendChild(document.createTextNode(' Leaderboard Management'));
        section.appendChild(heading);

        // Action buttons
        var actions = document.createElement('div');
        actions.style.cssText = 'display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;';

        var approveAllBtn = document.createElement('button');
        approveAllBtn.className = 'nav-button';
        approveAllBtn.style.cssText = 'font-size:0.85em;padding:8px 16px;background:rgba(34,197,94,0.15);color:var(--success);border:1px solid var(--success);';
        var approveIcon = document.createElement('i');
        approveIcon.className = 'fas fa-check-double';
        approveAllBtn.appendChild(approveIcon);
        approveAllBtn.appendChild(document.createTextNode(' Approve All'));
        approveAllBtn.addEventListener('click', async function() {
            await LeaderboardManager.approveAll();
            await LeaderboardManager.loadPendingEntries(pendingContainer);
        });
        actions.appendChild(approveAllBtn);

        var resetBtn = document.createElement('button');
        resetBtn.className = 'nav-button';
        resetBtn.style.cssText = 'font-size:0.85em;padding:8px 16px;background:rgba(239,68,68,0.15);color:var(--danger);border:1px solid var(--danger);';
        var resetIcon = document.createElement('i');
        resetIcon.className = 'fas fa-trash-alt';
        resetBtn.appendChild(resetIcon);
        resetBtn.appendChild(document.createTextNode(' Reset Leaderboard'));
        resetBtn.addEventListener('click', async function() {
            if (confirm('Reset the entire leaderboard? This cannot be undone.')) {
                await LeaderboardManager.resetAll();
                await LeaderboardManager.loadPendingEntries(pendingContainer);
                StudyUtils.showToast('Leaderboard reset', 'info');
            }
        });
        actions.appendChild(resetBtn);

        section.appendChild(actions);

        // Pending entries
        var pendingContainer = document.createElement('div');
        pendingContainer.id = 'teacher-leaderboard-pending';
        section.appendChild(pendingContainer);

        container.appendChild(section);
        await this.loadPendingEntries(pendingContainer);
    },

    async loadPendingEntries(container) {
        container.textContent = '';

        try {
            // Get all entries (pending first, then approved)
            var result = await ProgressManager.supabase
                .from('leaderboard')
                .select('id, student_id, score, vocab_mastered, best_test_score, study_time_seconds, approved, updated_at')
                .order('approved', { ascending: true })
                .order('score', { ascending: false });
            if (result.error) throw result.error;
            var entries = result.data || [];

            if (entries.length === 0) {
                var empty = document.createElement('p');
                empty.style.cssText = 'color:var(--text-muted);text-align:center;padding:20px;';
                empty.textContent = 'No leaderboard entries yet.';
                container.appendChild(empty);
                return;
            }

            // Get student names
            var studentIds = entries.map(function(e) { return e.student_id; });
            var sResult = await ProgressManager.supabase
                .from('students')
                .select('id, name, class_id')
                .in('id', studentIds);
            var studentMap = {};
            if (sResult.data) {
                sResult.data.forEach(function(s) { studentMap[s.id] = s; });
            }

            // Get class names
            var classResult = await ProgressManager.supabase
                .from('classes')
                .select('id, name, code');
            var classMap = {};
            if (classResult.data) {
                classResult.data.forEach(function(c) { classMap[c.id] = c; });
            }

            var pendingCount = entries.filter(function(e) { return !e.approved; }).length;
            var approvedCount = entries.length - pendingCount;

            var summary = document.createElement('p');
            summary.style.cssText = 'color:var(--text-secondary);font-size:0.85em;margin-bottom:12px;';
            summary.textContent = pendingCount + ' pending approval, ' + approvedCount + ' approved';
            container.appendChild(summary);

            var table = document.createElement('table');
            table.style.cssText = 'width:100%;border-collapse:collapse;';

            var thead = document.createElement('thead');
            var hr = document.createElement('tr');
            ['Status', 'Name', 'Class', 'Score', 'Vocab', 'Test', 'Action'].forEach(function(h) {
                var th = document.createElement('th');
                th.style.cssText = 'text-align:left;padding:10px;border-bottom:2px solid var(--border-card);color:var(--text-secondary);font-size:0.8em;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;';
                th.textContent = h;
                hr.appendChild(th);
            });
            thead.appendChild(hr);
            table.appendChild(thead);

            var tbody = document.createElement('tbody');
            entries.forEach(function(entry) {
                var student = studentMap[entry.student_id] || {};
                var cls = student.class_id ? (classMap[student.class_id] || {}) : {};

                var tr = document.createElement('tr');
                tr.style.cssText = 'border-bottom:1px solid var(--border-subtle);';
                if (!entry.approved) tr.style.background = 'rgba(251,191,36,0.06)';

                var statusTd = document.createElement('td');
                statusTd.style.cssText = 'padding:10px;';
                var statusBadge = document.createElement('span');
                statusBadge.style.cssText = 'padding:2px 8px;border-radius:10px;font-size:0.75em;font-weight:600;';
                if (entry.approved) {
                    statusBadge.style.background = 'rgba(34,197,94,0.15)';
                    statusBadge.style.color = 'var(--success)';
                    statusBadge.textContent = 'Approved';
                } else {
                    statusBadge.style.background = 'rgba(251,191,36,0.15)';
                    statusBadge.style.color = 'var(--accent)';
                    statusBadge.textContent = 'Pending';
                }
                statusTd.appendChild(statusBadge);
                tr.appendChild(statusTd);

                var nameTd = document.createElement('td');
                nameTd.style.cssText = 'padding:10px;color:var(--text-primary);font-weight:600;font-size:0.9em;';
                nameTd.textContent = student.name || 'Unknown';
                tr.appendChild(nameTd);

                var classTd = document.createElement('td');
                classTd.style.cssText = 'padding:10px;color:var(--text-secondary);font-size:0.85em;';
                classTd.textContent = cls.name || cls.code || '-';
                tr.appendChild(classTd);

                var scoreTd = document.createElement('td');
                scoreTd.style.cssText = 'padding:10px;color:var(--primary);font-weight:700;';
                scoreTd.textContent = entry.score;
                tr.appendChild(scoreTd);

                var vocabTd = document.createElement('td');
                vocabTd.style.cssText = 'padding:10px;color:var(--text-primary);font-size:0.9em;';
                vocabTd.textContent = entry.vocab_mastered;
                tr.appendChild(vocabTd);

                var testTd = document.createElement('td');
                testTd.style.cssText = 'padding:10px;color:var(--text-primary);font-size:0.9em;';
                testTd.textContent = entry.best_test_score !== null ? entry.best_test_score + '%' : '-';
                tr.appendChild(testTd);

                var actionTd = document.createElement('td');
                actionTd.style.cssText = 'padding:10px;';
                if (!entry.approved) {
                    var approveBtn = document.createElement('button');
                    approveBtn.style.cssText = 'padding:4px 10px;border:none;border-radius:6px;background:var(--success);color:white;cursor:pointer;font-size:0.8em;font-weight:600;margin-right:6px;';
                    approveBtn.textContent = 'Approve';
                    approveBtn.addEventListener('click', async function() {
                        await LeaderboardManager.approveEntry(entry.id);
                        await LeaderboardManager.loadPendingEntries(container);
                    });
                    actionTd.appendChild(approveBtn);
                }
                var removeBtn = document.createElement('button');
                removeBtn.style.cssText = 'padding:4px 10px;border:none;border-radius:6px;background:var(--danger);color:white;cursor:pointer;font-size:0.8em;font-weight:600;';
                removeBtn.textContent = 'Remove';
                removeBtn.addEventListener('click', async function() {
                    await LeaderboardManager.removeEntry(entry.id);
                    await LeaderboardManager.loadPendingEntries(container);
                });
                actionTd.appendChild(removeBtn);
                tr.appendChild(actionTd);

                tbody.appendChild(tr);
            });

            table.appendChild(tbody);

            var wrapper = document.createElement('div');
            wrapper.style.cssText = 'overflow-x:auto;background:var(--bg-card);border-radius:12px;border:1px solid var(--border-card);box-shadow:var(--shadow-card);';
            wrapper.appendChild(table);
            container.appendChild(wrapper);

        } catch (err) {
            console.error('Teacher leaderboard error:', err);
            var errEl = document.createElement('p');
            errEl.style.cssText = 'color:var(--danger);text-align:center;padding:20px;';
            errEl.textContent = 'Failed to load leaderboard entries.';
            container.appendChild(errEl);
        }
    },

    async approveEntry(entryId) {
        try {
            await ProgressManager.supabase
                .from('leaderboard')
                .update({ approved: true })
                .eq('id', entryId);
            StudyUtils.showToast('Entry approved', 'success');
        } catch (err) {
            console.error('Approve error:', err);
        }
    },

    async approveAll() {
        try {
            await ProgressManager.supabase
                .from('leaderboard')
                .update({ approved: true })
                .eq('approved', false);
            StudyUtils.showToast('All entries approved', 'success');
        } catch (err) {
            console.error('Approve all error:', err);
        }
    },

    async removeEntry(entryId) {
        try {
            await ProgressManager.supabase
                .from('leaderboard')
                .delete()
                .eq('id', entryId);
            StudyUtils.showToast('Entry removed', 'info');
        } catch (err) {
            console.error('Remove error:', err);
        }
    },

    async resetAll() {
        try {
            await ProgressManager.supabase
                .from('leaderboard')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
        } catch (err) {
            console.error('Reset error:', err);
        }
    }
};
