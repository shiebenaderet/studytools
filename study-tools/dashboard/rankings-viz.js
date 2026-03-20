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

    _renderLineChart(container, data) {},

    _renderBarRace(container, data) {},
};
