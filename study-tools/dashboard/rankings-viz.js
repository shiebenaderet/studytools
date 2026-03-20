// Class Rankings Visualization — line chart + bar chart race
var RankingsViz = {

    COLORS: ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#9c755f'],

    _icon(className) {
        var i = document.createElement('i');
        i.className = className;
        return i;
    },

    // Process raw snapshot rows into per-class, per-date averages
    // Input: array of { student_id, score, class_id, snapshot_date }
    // Output: { dates: ['2026-03-15', ...], classes: { classId: { name, color, averages: [avg, ...] } } }
    processData(snapshots, classNameMap) {
        var dateSet = {};
        for (var i = 0; i < snapshots.length; i++) {
            dateSet[snapshots[i].snapshot_date] = true;
        }
        var dates = Object.keys(dateSet).sort();

        var classDateTotals = {};
        for (var i = 0; i < snapshots.length; i++) {
            var s = snapshots[i];
            if (!s.class_id) continue;
            if (!classDateTotals[s.class_id]) classDateTotals[s.class_id] = {};
            if (!classDateTotals[s.class_id][s.snapshot_date]) {
                classDateTotals[s.class_id][s.snapshot_date] = { total: 0, count: 0 };
            }
            classDateTotals[s.class_id][s.snapshot_date].total += s.score;
            classDateTotals[s.class_id][s.snapshot_date].count++;
        }

        var classIds = Object.keys(classDateTotals);
        var classes = {};
        for (var c = 0; c < classIds.length; c++) {
            var cid = classIds[c];
            var averages = [];
            for (var d = 0; d < dates.length; d++) {
                var entry = classDateTotals[cid][dates[d]];
                averages.push(entry ? Math.round(entry.total / entry.count) : null);
            }
            classes[cid] = {
                name: classNameMap[cid] || 'Unknown',
                color: this.COLORS[c % this.COLORS.length],
                averages: averages
            };
        }

        return { dates: dates, classes: classes };
    },

    render(container, snapshots, classNameMap) {
        container.textContent = '';

        if (!snapshots || snapshots.length === 0) return;

        var data = this.processData(snapshots, classNameMap);
        var classIds = Object.keys(data.classes);

        if (classIds.length === 0) {
            var msg = document.createElement('p');
            msg.style.cssText = 'color:var(--text-muted);text-align:center;padding:24px;';
            msg.textContent = 'No class data available for this unit.';
            container.appendChild(msg);
            return;
        }

        var heading = document.createElement('h3');
        heading.style.cssText = 'color:var(--text);margin-bottom:16px;';
        heading.appendChild(this._icon('fas fa-chart-line'));
        heading.appendChild(document.createTextNode(' Class Rankings Over Time'));
        container.appendChild(heading);

        var lineContainer = document.createElement('div');
        lineContainer.className = 'rankings-line-chart';
        container.appendChild(lineContainer);
        this._renderLineChart(lineContainer, data);

        var raceContainer = document.createElement('div');
        raceContainer.className = 'rankings-bar-race';
        container.appendChild(raceContainer);
        this._renderBarRace(raceContainer, data);
    },

    _renderLineChart(container, data) {
        var classIds = Object.keys(data.classes);
        var dates = data.dates;
        if (dates.length === 0) return;

        var canvas = document.createElement('canvas');
        var dpr = window.devicePixelRatio || 1;
        var width = container.clientWidth || 600;
        var height = 250;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        var pad = { top: 20, right: 20, bottom: 40, left: 50 };
        var chartW = width - pad.left - pad.right;
        var chartH = height - pad.top - pad.bottom;

        var yMax = 0;
        for (var c = 0; c < classIds.length; c++) {
            var avgs = data.classes[classIds[c]].averages;
            for (var d = 0; d < avgs.length; d++) {
                if (avgs[d] !== null && avgs[d] > yMax) yMax = avgs[d];
            }
        }
        yMax = Math.ceil(yMax / 10) * 10 || 10;

        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad.left, pad.top);
        ctx.lineTo(pad.left, pad.top + chartH);
        ctx.lineTo(pad.left + chartW, pad.top + chartH);
        ctx.stroke();

        ctx.fillStyle = '#888';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'right';
        var yTicks = 5;
        for (var i = 0; i <= yTicks; i++) {
            var val = Math.round(yMax * i / yTicks);
            var y = pad.top + chartH - (chartH * i / yTicks);
            ctx.fillText(val, pad.left - 8, y + 4);
            if (i > 0) {
                ctx.strokeStyle = '#eee';
                ctx.beginPath();
                ctx.moveTo(pad.left, y);
                ctx.lineTo(pad.left + chartW, y);
                ctx.stroke();
            }
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = '#888';
        var maxLabels = Math.min(dates.length, 10);
        var labelStep = Math.max(1, Math.floor(dates.length / maxLabels));
        for (var d = 0; d < dates.length; d += labelStep) {
            var x = pad.left + (chartW * d / Math.max(dates.length - 1, 1));
            var parts = dates[d].split('-');
            var label = parseInt(parts[1]) + '/' + parseInt(parts[2]);
            ctx.fillText(label, x, pad.top + chartH + 20);
        }

        var dataPoints = [];

        for (var c = 0; c < classIds.length; c++) {
            var cls = data.classes[classIds[c]];
            ctx.strokeStyle = cls.color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            var started = false;
            for (var d = 0; d < dates.length; d++) {
                if (cls.averages[d] === null) { started = false; continue; }
                var x = pad.left + (chartW * d / Math.max(dates.length - 1, 1));
                var y = pad.top + chartH - (chartH * cls.averages[d] / yMax);
                if (!started) { ctx.moveTo(x, y); started = true; }
                else ctx.lineTo(x, y);
                dataPoints.push({ x: x, y: y, classId: classIds[c], date: dates[d], avg: cls.averages[d] });
            }
            ctx.stroke();

            ctx.fillStyle = cls.color;
            for (var d = 0; d < dates.length; d++) {
                if (cls.averages[d] === null) continue;
                var x = pad.left + (chartW * d / Math.max(dates.length - 1, 1));
                var y = pad.top + chartH - (chartH * cls.averages[d] / yMax);
                ctx.beginPath();
                ctx.arc(x, y, 3.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        container.appendChild(canvas);

        var tooltip = document.createElement('div');
        tooltip.className = 'rankings-tooltip';
        tooltip.style.display = 'none';
        container.appendChild(tooltip);
        container.style.position = 'relative';

        canvas.addEventListener('mousemove', function(e) {
            var rect = canvas.getBoundingClientRect();
            var mx = e.clientX - rect.left;
            var my = e.clientY - rect.top;
            var closest = null;
            var closestDist = 20;
            for (var i = 0; i < dataPoints.length; i++) {
                var dx = dataPoints[i].x - mx;
                var dy = dataPoints[i].y - my;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = dataPoints[i];
                }
            }
            if (closest) {
                var cls = data.classes[closest.classId];
                var parts = closest.date.split('-');
                var dateStr = parseInt(parts[1]) + '/' + parseInt(parts[2]);
                tooltip.textContent = '';
                var nameSpan = document.createElement('strong');
                nameSpan.style.color = cls.color;
                nameSpan.textContent = cls.name;
                tooltip.appendChild(nameSpan);
                tooltip.appendChild(document.createElement('br'));
                tooltip.appendChild(document.createTextNode(dateStr + ': ' + closest.avg + ' avg'));
                tooltip.style.display = 'block';
                tooltip.style.left = Math.min(closest.x + 12, width - 120) + 'px';
                tooltip.style.top = (closest.y - 10) + 'px';
            } else {
                tooltip.style.display = 'none';
            }
        });

        canvas.addEventListener('mouseleave', function() {
            tooltip.style.display = 'none';
        });

        var legend = document.createElement('div');
        legend.className = 'rankings-legend';
        for (var c = 0; c < classIds.length; c++) {
            var cls = data.classes[classIds[c]];
            var item = document.createElement('span');
            item.className = 'rankings-legend-item';
            var swatch = document.createElement('span');
            swatch.className = 'rankings-legend-swatch';
            swatch.style.backgroundColor = cls.color;
            item.appendChild(swatch);
            item.appendChild(document.createTextNode(cls.name));
            legend.appendChild(item);
        }
        container.appendChild(legend);

        var self = this;
        var resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                self._renderLineChart(container, data);
            }, 200);
        });

        if (dates.length === 1) {
            var note = document.createElement('p');
            note.className = 'rankings-note';
            note.textContent = 'More days of data needed to show trends.';
            container.appendChild(note);
        }
    },

    _renderBarRace(container, data) {
        var classIds = Object.keys(data.classes);
        var dates = data.dates;
        if (dates.length === 0 || classIds.length === 0) return;

        var self = this;

        var heading = document.createElement('h4');
        heading.style.cssText = 'color:var(--text);margin-bottom:12px;';
        heading.appendChild(self._icon('fas fa-play-circle'));
        heading.appendChild(document.createTextNode(' Class Race'));
        container.appendChild(heading);

        var dateDisplay = document.createElement('div');
        dateDisplay.className = 'race-date-display';
        container.appendChild(dateDisplay);

        var canvas = document.createElement('canvas');
        var dpr = window.devicePixelRatio || 1;
        var width = container.clientWidth || 600;
        var barHeight = 36;
        var barGap = 8;
        var height = classIds.length * (barHeight + barGap) + 20;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        container.appendChild(canvas);

        var controls = document.createElement('div');
        controls.className = 'race-controls';

        var playBtn = document.createElement('button');
        playBtn.className = 'btn race-play-btn';
        playBtn.appendChild(self._icon('fas fa-play'));
        controls.appendChild(playBtn);

        function setPlayIcon(iconClass) {
            playBtn.textContent = '';
            playBtn.appendChild(self._icon(iconClass));
        }

        var speedWrap = document.createElement('div');
        speedWrap.className = 'race-speed-wrap';
        var speedLabel = document.createElement('label');
        speedLabel.textContent = 'Speed ';
        var speedSlider = document.createElement('input');
        speedSlider.type = 'range';
        speedSlider.min = '0.5';
        speedSlider.max = '3';
        speedSlider.step = '0.5';
        speedSlider.value = '1';
        speedSlider.className = 'race-speed-slider';
        var speedReadout = document.createElement('span');
        speedReadout.className = 'race-speed-readout';
        speedReadout.textContent = '1x';
        speedSlider.addEventListener('input', function() {
            speedReadout.textContent = speedSlider.value + 'x';
        });
        speedWrap.appendChild(speedLabel);
        speedWrap.appendChild(speedSlider);
        speedWrap.appendChild(speedReadout);
        controls.appendChild(speedWrap);

        var progress = document.createElement('span');
        progress.className = 'race-progress';
        controls.appendChild(progress);

        container.appendChild(controls);

        if (dates.length <= 1) {
            playBtn.disabled = true;
            progress.textContent = 'Day 1 of 1';
        }

        var currentDay = 0;
        var playing = false;
        var animFrame = null;
        var transitioning = false;

        var daySnapshots = [];
        for (var d = 0; d < dates.length; d++) {
            var snap = [];
            for (var c = 0; c < classIds.length; c++) {
                var cls = data.classes[classIds[c]];
                var avg = cls.averages[d];
                if (avg !== null) {
                    snap.push({ classId: classIds[c], name: cls.name, color: cls.color, avg: avg });
                }
            }
            snap.sort(function(a, b) { return b.avg - a.avg; });
            daySnapshots.push(snap);
        }

        var maxAvg = 1;
        for (var d = 0; d < daySnapshots.length; d++) {
            for (var i = 0; i < daySnapshots[d].length; i++) {
                if (daySnapshots[d][i].avg > maxAvg) maxAvg = daySnapshots[d][i].avg;
            }
        }

        var positions = {};
        var labelWidth = 100;
        var barAreaW = width - labelWidth - 60;

        function initPositions(dayIdx) {
            var snap = daySnapshots[dayIdx] || [];
            positions = {};
            for (var i = 0; i < snap.length; i++) {
                positions[snap[i].classId] = {
                    y: i * (barHeight + barGap),
                    barW: (snap[i].avg / maxAvg) * barAreaW,
                    avg: snap[i].avg,
                    name: snap[i].name,
                    color: snap[i].color
                };
            }
        }

        function formatDate(dateStr) {
            var d = new Date(dateStr + 'T12:00:00');
            var today = new Date().toISOString().slice(0, 10);
            var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            if (dateStr === today) return 'Today';
            if (dateStr === yesterday) return 'Yesterday';
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        function drawFrame() {
            ctx.clearRect(0, 0, width, height);
            var classIdsDrawn = Object.keys(positions);
            for (var i = 0; i < classIdsDrawn.length; i++) {
                var p = positions[classIdsDrawn[i]];

                ctx.fillStyle = p.color;
                ctx.beginPath();
                var radius = 4;
                var bx = labelWidth;
                var by = p.y + 2;
                var bw = Math.max(p.barW, 2);
                var bh = barHeight - 4;
                ctx.moveTo(bx + radius, by);
                ctx.lineTo(bx + bw - radius, by);
                ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + radius);
                ctx.lineTo(bx + bw, by + bh - radius);
                ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - radius, by + bh);
                ctx.lineTo(bx + radius, by + bh);
                ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - radius);
                ctx.lineTo(bx, by + radius);
                ctx.quadraticCurveTo(bx, by, bx + radius, by);
                ctx.fill();

                ctx.fillStyle = '#333';
                ctx.font = '13px system-ui, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(p.name, labelWidth - 8, p.y + barHeight / 2 + 5);

                ctx.fillStyle = '#666';
                ctx.textAlign = 'left';
                ctx.fillText(Math.round(p.avg), labelWidth + bw + 8, p.y + barHeight / 2 + 5);
            }
        }

        function updateProgress() {
            progress.textContent = 'Day ' + (currentDay + 1) + ' of ' + dates.length;
            dateDisplay.textContent = formatDate(dates[currentDay]);
        }

        function easeInOut(t) {
            return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        }

        function transitionToDay(targetDay, callback) {
            var fromPos = {};
            for (var k in positions) fromPos[k] = { y: positions[k].y, barW: positions[k].barW, avg: positions[k].avg };

            var toSnap = daySnapshots[targetDay] || [];
            var targetPos = {};
            for (var i = 0; i < toSnap.length; i++) {
                targetPos[toSnap[i].classId] = {
                    y: i * (barHeight + barGap),
                    barW: (toSnap[i].avg / maxAvg) * barAreaW,
                    avg: toSnap[i].avg,
                    name: toSnap[i].name,
                    color: toSnap[i].color
                };
            }

            for (var cid in targetPos) {
                if (!fromPos[cid]) {
                    fromPos[cid] = { y: targetPos[cid].y, barW: 0, avg: 0 };
                    positions[cid] = {
                        y: targetPos[cid].y, barW: 0, avg: 0,
                        name: targetPos[cid].name, color: targetPos[cid].color
                    };
                }
            }

            var duration = 2000 / parseFloat(speedSlider.value);
            var start = performance.now();
            transitioning = true;

            function step(now) {
                var elapsed = now - start;
                var t = Math.min(elapsed / duration, 1);
                var et = easeInOut(t);

                for (var cid in targetPos) {
                    var from = fromPos[cid] || { y: 0, barW: 0, avg: 0 };
                    positions[cid].y = from.y + (targetPos[cid].y - from.y) * et;
                    positions[cid].barW = from.barW + (targetPos[cid].barW - from.barW) * et;
                    positions[cid].avg = from.avg + (targetPos[cid].avg - from.avg) * et;
                }

                drawFrame();

                if (t < 1) {
                    animFrame = requestAnimationFrame(step);
                } else {
                    currentDay = targetDay;
                    transitioning = false;
                    updateProgress();
                    if (callback) callback();
                }
            }
            animFrame = requestAnimationFrame(step);
        }

        function playNext() {
            if (!playing) return;
            if (currentDay >= dates.length - 1) {
                playing = false;
                setPlayIcon('fas fa-play');
                return;
            }
            transitionToDay(currentDay + 1, playNext);
        }

        playBtn.addEventListener('click', function() {
            if (playing) {
                playing = false;
                if (animFrame) cancelAnimationFrame(animFrame);
                transitioning = false;
                setPlayIcon('fas fa-play');
            } else {
                if (currentDay >= dates.length - 1) {
                    currentDay = 0;
                    initPositions(0);
                    updateProgress();
                    drawFrame();
                }
                playing = true;
                setPlayIcon('fas fa-pause');
                playNext();
            }
        });

        container._raceCleanup = function() {
            playing = false;
            if (animFrame) cancelAnimationFrame(animFrame);
        };

        initPositions(0);
        updateProgress();
        drawFrame();
    },
};
