// Graphics to show a class: slide-sized pictures of the standings, and a
// looping GIF of the race. Everything is drawn and encoded in this browser and
// saved as a file on this computer; nothing is sent to another service.
//
// One routine, draw(), paints a "scene" at a fixed logical size of 1280 by 720.
// A still is that scene scaled by 1.5 (1920 by 1080, a full slide). The race
// is the same scene drawn once per frame at 1280 by 720.
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

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, blockTop, W, slots * rowH);
        ctx.clip();
        // While two bars trade places in the race, each row is painted as a
        // solid strip so one slides over the other instead of the two sets of
        // words printing on top of each other. The one moving up goes on top.
        var rows = (scene.rows || []).slice().sort(function(a, b) { return (a.lift || 0) - (b.lift || 0); });
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            if (r.pos > slots || r.pos < -1) continue;
            var mid = blockTop + r.pos * rowH + rowH / 2;
            ctx.fillStyle = this.SURFACE;
            ctx.fillRect(0, mid - rowH / 2, W, rowH);

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

        ctx.fillStyle = this.AXIS;
        ctx.fillRect(barX - 2, blockTop + 4, 2, slots * rowH - 8);

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

    // ---- The race ----
    //
    // model: {
    //   title, subtitle, header, footer, legend, slots    as for a scene
    //   days    ['2026-11-16', ...] in order
    //   items   [{ name, sub, color, values }]; values has one number per day,
    //           or null for a day before the student or class had a score
    // }

    // Where every item stands on each day: its row, and the day's highest value
    _raceRanks(model) {
        var ranks = [], maxes = [];
        for (var d = 0; d < model.days.length; d++) {
            var present = [];
            for (var i = 0; i < model.items.length; i++) {
                if (model.items[i].values[d] != null) present.push(i);
            }
            present.sort(function(a, b) {
                return model.items[b].values[d] - model.items[a].values[d] ||
                    model.items[a].name.localeCompare(model.items[b].name);
            });
            var row = new Array(model.items.length).fill(null);
            for (var r = 0; r < present.length; r++) row[present[r]] = r;
            ranks.push(row);
            maxes.push(present.length ? Math.max(1, model.items[present[0]].values[d]) : 1);
        }
        return { ranks: ranks, maxes: maxes };
    },

    _dayLabel(key) {
        return new Date(key + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    },

    // The scene at time t, where t = 3.5 is halfway between the fourth day and
    // the fifth. Values grow evenly; bars change rows with an ease so that a
    // pass is easy to follow.
    raceScene(model, t, pre) {
        pre = pre || this._raceRanks(model);
        var last = model.days.length - 1;
        t = Math.max(0, Math.min(last, t));
        var d0 = Math.floor(t), d1 = Math.min(last, d0 + 1), f = t - d0;
        var e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
        var below = model.slots + 0.5;     // where a bar waits before it has a score, or after it drops off the page
        var rows = [];
        for (var i = 0; i < model.items.length; i++) {
            var it = model.items[i];
            var v0 = it.values[d0], v1 = it.values[d1];
            if (v0 == null && v1 == null) continue;
            var r0 = pre.ranks[d0][i], r1 = pre.ranks[d1][i];
            var p0 = r0 == null ? below : Math.min(r0, below);
            var p1 = r1 == null ? below : Math.min(r1, below);
            if (p0 >= below && p1 >= below) continue;
            var from = v0 == null ? 0 : v0, to = v1 == null ? from : v1;
            rows.push({ name: it.name, sub: it.sub, color: it.color, value: from + (to - from) * f, pos: p0 + (p1 - p0) * e, lift: p0 - p1 });
        }
        var day = f < 0.5 ? d0 : d1;
        return {
            title: model.title,
            subtitle: model.subtitle,
            header: model.header,
            footer: model.footer,
            legend: model.legend,
            slots: model.slots,
            dateText: this._dayLabel(model.days[day]),
            dateSub: 'Day ' + (day + 1) + ' of ' + model.days.length,
            max: pre.maxes[d0] + (pre.maxes[d1] - pre.maxes[d0]) * f,
            rows: rows
        };
    },

    // A looping GIF of the race, about ten seconds however many days it covers,
    // with a pause on the last day. onProgress gets a number from 0 to 1.
    async raceGif(model, onProgress) {
        if (model.days.length < 2) throw new Error('A race needs at least two days of scores.');
        var W = this.W, H = this.H, self = this;
        var canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        var ctx = canvas.getContext('2d', { willReadFrequently: true });
        var pre = this._raceRanks(model);

        var FRAME = 7;                                    // hundredths of a second per frame
        var steps = model.days.length - 1;
        var perDay = Math.max(0.25, Math.min(1.4, 9 / steps));
        var framesPerDay = Math.max(2, Math.round(perDay * 100 / FRAME));
        var total = steps * framesPerDay + 1;
        var timeOf = function(i) { return i / framesPerDay; };
        var pixelsAt = function(i) {
            self.draw(ctx, self.raceScene(model, timeOf(i), pre));
            return ctx.getImageData(0, 0, W, H).data;
        };

        // A GIF has 256 colours. Choose them from a spread of frames, and make
        // sure every class colour is among them so no bar is ever repainted.
        var palette = this._paletteBuilder();
        var seeds = [this.SURFACE, this.INK, this.MUTED, this.AXIS, '#ffffff', model.header];
        model.items.forEach(function(it) { seeds.push(it.color); });
        palette.seed(seeds);
        var SAMPLES = Math.min(total, 8);
        for (var k = 0; k < SAMPLES; k++) {
            palette.add(pixelsAt(Math.round(k * (total - 1) / Math.max(1, SAMPLES - 1))));
        }
        palette.finish();

        var gif = this._gifWriter(W, H, palette.table);
        var indices = new Uint8Array(W * H);
        for (var i = 0; i < total; i++) {
            palette.map(pixelsAt(i), indices);
            gif.addFrame(indices, i === 0 ? 100 : (i === total - 1 ? 350 : FRAME));
            if (i % 3 === 0) {
                if (onProgress) onProgress(i / total);
                await new Promise(function(done) { setTimeout(done, 0); });     // let the page show the progress
            }
        }
        if (onProgress) onProgress(1);
        return new Blob([gif.finish()], { type: 'image/gif' });
    },

    // Picks up to 255 colours (the 256th is kept for "unchanged") by sorting
    // every pixel into one of 32,768 coarse colour boxes and keeping the boxes
    // seen most often. map() then turns a frame's pixels into colour numbers.
    _paletteBuilder() {
        var BOXES = 32768;
        var counts = new Float64Array(BOXES);
        var sumR = new Float64Array(BOXES), sumG = new Float64Array(BOXES), sumB = new Float64Array(BOXES);
        var lut = new Int16Array(BOXES).fill(-1);
        var table = new Uint8Array(768);
        var size = 0;
        var box = function(r, g, b) { return ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3); };
        return {
            table: table,
            seed(hexes) {
                hexes.forEach(function(hex) {
                    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
                    if (!m) return;
                    var r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16), i = box(r, g, b);
                    counts[i] += 1e12; sumR[i] += r * 1e12; sumG[i] += g * 1e12; sumB[i] += b * 1e12;
                });
            },
            add(data) {
                for (var p = 0; p < data.length; p += 4) {
                    var i = box(data[p], data[p + 1], data[p + 2]);
                    counts[i]++; sumR[i] += data[p]; sumG[i] += data[p + 1]; sumB[i] += data[p + 2];
                }
            },
            finish() {
                var used = [];
                for (var i = 0; i < BOXES; i++) { if (counts[i] > 0) used.push(i); }
                used.sort(function(a, b) { return counts[b] - counts[a]; });
                size = Math.min(used.length, 255);
                for (var n = 0; n < size; n++) {
                    var i2 = used[n];
                    table[n * 3] = Math.round(sumR[i2] / counts[i2]);
                    table[n * 3 + 1] = Math.round(sumG[i2] / counts[i2]);
                    table[n * 3 + 2] = Math.round(sumB[i2] / counts[i2]);
                    lut[i2] = n;
                }
            },
            // The nearest kept colour to a box that was not kept
            _nearest(i) {
                var r = ((i >> 10) & 31) * 8 + 4, g = ((i >> 5) & 31) * 8 + 4, b = (i & 31) * 8 + 4;
                var best = 0, bestD = Infinity;
                for (var n = 0; n < size; n++) {
                    var dr = table[n * 3] - r, dg = table[n * 3 + 1] - g, db = table[n * 3 + 2] - b;
                    var dist = dr * dr + dg * dg + db * db;
                    if (dist < bestD) { bestD = dist; best = n; }
                }
                return best;
            },
            map(data, out) {
                for (var p = 0, q = 0; p < data.length; p += 4, q++) {
                    var i = ((data[p] >> 3) << 10) | ((data[p + 1] >> 3) << 5) | (data[p + 2] >> 3);
                    var n = lut[i];
                    if (n < 0) n = lut[i] = this._nearest(i);
                    out[q] = n;
                }
            }
        };
    },

    // Writes an animated GIF that loops for ever. Each frame after the first
    // stores only the rectangle that changed, with unchanged pixels inside it
    // marked transparent (colour 255), which keeps a ten-second race small.
    _gifWriter(width, height, table) {
        var TRANSPARENT = 255;
        var buf = new Uint8Array(1 << 20), len = 0;
        var need = function(n) {
            if (len + n <= buf.length) return;
            var bigger = new Uint8Array(Math.max(buf.length * 2, len + n));
            bigger.set(buf.subarray(0, len));
            buf = bigger;
        };
        var byte = function(b) { need(1); buf[len++] = b; };
        var word = function(w) { need(2); buf[len++] = w & 255; buf[len++] = (w >> 8) & 255; };
        var bytes = function(arr, n) { need(n); buf.set(arr.subarray(0, n), len); len += n; };
        var text = function(str) { for (var i = 0; i < str.length; i++) byte(str.charCodeAt(i)); };

        text('GIF89a');
        word(width); word(height);
        byte(0xF7); byte(0); byte(0);            // a shared table of 256 colours
        bytes(table, 768);
        byte(0x21); byte(0xFF); byte(11); text('NETSCAPE2.0'); byte(3); byte(1); word(0); byte(0);   // loop for ever

        // LZW, as GIF requires: codes start at 9 bits and grow to 12, then the
        // dictionary is cleared and starts again.
        var HSIZE = 8209;
        var hkey = new Int32Array(HSIZE), hcode = new Int32Array(HSIZE);
        var block = new Uint8Array(255);
        var lzw = function(pixels, count) {
            var CLEAR = 256, END = 257;
            var nbits = 9, maxcode = 511, free = 258, clearNext = false;
            var acc = 0, accBits = 0, bn = 0;
            var flush = function() { if (bn) { byte(bn); bytes(block, bn); bn = 0; } };
            var out = function(code) {
                acc |= code << accBits;
                accBits += nbits;
                while (accBits >= 8) {
                    block[bn++] = acc & 255;
                    if (bn === 255) flush();
                    acc >>>= 8;
                    accBits -= 8;
                }
                if (free > maxcode || clearNext) {
                    if (clearNext) { nbits = 9; maxcode = 511; clearNext = false; }
                    else { nbits++; maxcode = nbits === 12 ? 4096 : (1 << nbits) - 1; }
                }
            };
            byte(8);
            hkey.fill(-1);
            out(CLEAR);
            var ent = pixels[0];
            for (var i = 1; i < count; i++) {
                var c = pixels[i];
                var key = (ent << 8) | c;
                var h = key % HSIZE;
                var found = false;
                while (hkey[h] !== -1) {
                    if (hkey[h] === key) { ent = hcode[h]; found = true; break; }
                    if (++h === HSIZE) h = 0;
                }
                if (found) continue;
                out(ent);
                ent = c;
                if (free < 4096) {
                    hkey[h] = key;
                    hcode[h] = free++;
                } else {
                    hkey.fill(-1);
                    free = 258;
                    clearNext = true;
                    out(CLEAR);
                }
            }
            out(ent);
            out(END);
            if (accBits > 0) { block[bn++] = acc & 255; if (bn === 255) flush(); }
            flush();
            byte(0);
        };

        var prev = null;
        return {
            addFrame(indices, delay) {
                var x0 = 0, y0 = 0, w = width, h = height, pixels = indices;
                if (prev) {
                    var minX = width, minY = height, maxX = -1, maxY = -1;
                    for (var y = 0, p = 0; y < height; y++) {
                        for (var x = 0; x < width; x++, p++) {
                            if (indices[p] !== prev[p]) {
                                if (x < minX) minX = x;
                                if (x > maxX) maxX = x;
                                if (y < minY) minY = y;
                                maxY = y;
                            }
                        }
                    }
                    if (maxX < 0) { minX = minY = maxX = maxY = 0; }        // nothing moved: a one-pixel frame keeps the timing
                    x0 = minX; y0 = minY; w = maxX - minX + 1; h = maxY - minY + 1;
                    pixels = new Uint8Array(w * h);
                    for (var yy = 0, q = 0; yy < h; yy++) {
                        var src = (y0 + yy) * width + x0;
                        for (var xx = 0; xx < w; xx++, q++, src++) {
                            pixels[q] = indices[src] === prev[src] ? TRANSPARENT : indices[src];
                        }
                    }
                } else {
                    prev = new Uint8Array(width * height);
                }
                byte(0x21); byte(0xF9); byte(4);
                byte(prev && pixels !== indices ? 0x05 : 0x04);     // leave the last frame in place; 0x05 adds "colour 255 is transparent"
                word(delay); byte(TRANSPARENT); byte(0);
                byte(0x2C); word(x0); word(y0); word(w); word(h); byte(0);
                lzw(pixels, pixels.length);
                prev.set(indices);
            },
            finish() {
                byte(0x3B);
                return buf.slice(0, len);
            }
        };
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
