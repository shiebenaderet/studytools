// Graphics to show a class: slide-sized pictures of the standings.
// Everything is drawn in this browser and saved as a file on this computer;
// nothing is sent to another service.
//
// One routine, draw(), paints a "scene" at a fixed logical size of 1280 by 720.
// A still is that scene scaled by 1.5 (1920 by 1080, a full slide).
var ClassGraphics = {

    // One colour per class period, given out in the order of the class list and
    // never by rank, so a period keeps its colour from week to week. The set was
    // checked for colour-blind separation on a white surface. Every bar also
    // carries its name and value, so colour is never the only cue.
    COLORS: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
    OTHER: '#8a8f98',

    W: 1280,
    H: 720,
    FONT: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    INK: '#1e293b',
    MUTED: '#566173',
    SURFACE: '#ffffff',
    AXIS: '#cbd2dc',

    // "Emma R." from whatever is stored. Students sign up as first name and last
    // initial, but a name the teacher typed in full must never reach a screen the
    // whole class can see. Same rule as ProgressManager.formatStudentName.
    shortName(raw) {
        var parts = String(raw || '').replace(/[^A-Za-zÀ-ɏ\s'\-.]/g, '').trim().split(/\s+/)
            .map(function(w) { return w.replace(/\.+$/, ''); }).filter(Boolean);
        if (!parts.length) return 'Student';
        var first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        if (parts.length < 2) return first;
        return first + ' ' + parts[parts.length - 1].charAt(0).toUpperCase() + '.';
    },

    // classes: [{ id, name }] in a fixed order. Returns { classId: colour }.
    classColors(classes) {
        var map = {};
        for (var i = 0; i < classes.length; i++) {
            map[classes[i].id] = i < this.COLORS.length ? this.COLORS[i] : this.OTHER;
        }
        return map;
    },

    points(n) {
        return Math.round(n).toLocaleString('en-US') + ' pts';
    },

    longDate(d) {
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    },

    // Shorten text with "..." until it fits maxWidth in the current font
    _fit(ctx, text, maxWidth) {
        text = String(text);
        if (ctx.measureText(text).width <= maxWidth) return text;
        while (text.length > 1 && ctx.measureText(text + '…').width > maxWidth) text = text.slice(0, -1);
        return text.replace(/\s+$/, '') + '…';
    },

    // A bar that starts square on the baseline and ends rounded
    _bar(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        ctx.fill();
    },

    // scene: {
    //   title, subtitle        left of the header band
    //   dateText, dateSub      right of the header band
    //   header                 the band's colour (the unit's own colour)
    //   footer                 one line saying what the numbers measure
    //   legend                 [{ name, color }] or null
    //   slots                  how many rows fit on the page
    //   max                    the value that fills the bar area
    //   rows                   [{ pos, name, sub, color, value }]; pos is the row
    //                          a bar sits on and may be a fraction while it moves
    // }
    draw(ctx, scene) {
        var W = this.W, H = this.H, F = this.FONT;
        var PAD = 56;

        ctx.globalAlpha = 1;
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = this.SURFACE;
        ctx.fillRect(0, 0, W, H);

        // Header band
        ctx.fillStyle = scene.header || '#0f766e';
        ctx.fillRect(0, 0, W, 112);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.font = '700 30px ' + F;
        ctx.fillText(scene.dateText || '', W - PAD, 58);
        var dateW = ctx.measureText(scene.dateText || '').width;
        if (scene.dateSub) {
            ctx.font = '400 20px ' + F;
            ctx.fillText(scene.dateSub, W - PAD, 92);
        }
        ctx.textAlign = 'left';
        ctx.font = '700 44px ' + F;
        ctx.fillText(this._fit(ctx, scene.title, W - PAD * 2 - dateW - 40), PAD, 60);
        ctx.font = '400 22px ' + F;
        ctx.fillText(this._fit(ctx, scene.subtitle || '', W - PAD * 2 - 260), PAD, 94);

        // Rows
        var top = 132, bottom = 656;
        var slots = Math.max(1, scene.slots);
        var rowH = Math.min(104, (bottom - top) / slots);
        var big = rowH >= 80;
        var nameSize = big ? 30 : 22, subSize = big ? 18 : 15, rankSize = big ? 34 : 24;
        var barH = Math.min(Math.round(rowH * 0.62), 58);
        var nameX = 108, nameW = big ? 300 : 250;
        var barX = nameX + nameW + 20;
        var valueW = big ? 190 : 150;
        var barMax = W - PAD - barX - valueW;
        var blockTop = top + Math.max(0, ((bottom - top) - slots * rowH) / 2);

        ctx.fillStyle = this.AXIS;
        ctx.fillRect(barX - 2, blockTop + 4, 2, slots * rowH - 8);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, blockTop, W, slots * rowH);
        ctx.clip();
        var rows = scene.rows || [];
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            if (r.pos > slots || r.pos < -1) continue;
            var mid = blockTop + r.pos * rowH + rowH / 2;

            ctx.textAlign = 'right';
            ctx.fillStyle = this.MUTED;
            ctx.font = '700 ' + rankSize + 'px ' + F;
            ctx.fillText(String(Math.round(r.pos) + 1), 88, mid + rankSize * 0.36);

            ctx.textAlign = 'left';
            ctx.fillStyle = this.INK;
            ctx.font = '700 ' + nameSize + 'px ' + F;
            ctx.fillText(this._fit(ctx, r.name, nameW), nameX, r.sub ? mid - 2 : mid + nameSize * 0.36);
            if (r.sub) {
                ctx.fillStyle = this.MUTED;
                ctx.font = '400 ' + subSize + 'px ' + F;
                ctx.fillText(this._fit(ctx, r.sub, nameW), nameX, mid + subSize + 4);
            }

            var bw = Math.max(4, scene.max > 0 ? (r.value / scene.max) * barMax : 0);
            ctx.fillStyle = r.color;
            this._bar(ctx, barX, mid - barH / 2, bw, barH, 4);

            ctx.fillStyle = this.INK;
            ctx.font = '700 ' + nameSize + 'px ' + F;
            ctx.fillText(this.points(r.value), barX + bw + 12, mid + nameSize * 0.36);
        }
        ctx.restore();

        // Footer: what the numbers measure, and which colour is which period
        ctx.textAlign = 'left';
        ctx.fillStyle = this.MUTED;
        ctx.font = '400 17px ' + F;
        var legend = scene.legend || [];
        var x = W - PAD;
        ctx.textAlign = 'right';
        for (var j = legend.length - 1; j >= 0; j--) {
            ctx.fillStyle = this.MUTED;
            ctx.fillText(legend[j].name, x, 694);
            x -= ctx.measureText(legend[j].name).width + 8;
            ctx.fillStyle = legend[j].color;
            ctx.fillRect(x - 14, 681, 14, 14);
            x -= 14 + 22;
        }
        ctx.textAlign = 'left';
        ctx.fillStyle = this.MUTED;
        ctx.fillText(this._fit(ctx, scene.footer || '', x - PAD), PAD, 694);
    },

    // A canvas holding the scene at `scale` times 1280 by 720
    still(scene, scale) {
        scale = scale || 1.5;
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(this.W * scale);
        canvas.height = Math.round(this.H * scale);
        var ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        this.draw(ctx, scene);
        return canvas;
    },

    pngBlob(canvas) {
        return new Promise(function(resolve, reject) {
            canvas.toBlob(function(blob) {
                if (blob) resolve(blob); else reject(new Error('The picture could not be made.'));
            }, 'image/png');
        });
    },

    // Hand a finished file to the browser's downloads
    save(blob, filename) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
    }
};
