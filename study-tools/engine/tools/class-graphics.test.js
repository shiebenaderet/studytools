// Tests for the dashboard's class graphics: the name rule, the race, and the
// GIF writer. Run: node study-tools/engine/tools/class-graphics.test.js
//
// The GIF writer is checked by decoding what it writes with a separate,
// plainly written decoder below and comparing every pixel of every frame.
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../../dashboard/class-graphics.js'), 'utf8');
const CG = new Function(src + '; return ClassGraphics;')();

let passed = 0, failed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log('  ok  ' + name); }
    catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}
function eq(a, b, msg) {
    if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'not equal') + ': got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b));
}

// ---- A small GIF decoder, independent of the writer ----
function lzwDecode(min, data) {
    const out = [], clear = 1 << min, end = clear + 1;
    let size = min + 1, next = end + 1, dict = [], bits = 0, nb = 0, pos = 0, prev = null;
    for (let i = 0; i < clear; i++) dict[i] = [i];
    for (;;) {
        while (nb < size) { bits |= data[pos++] << nb; nb += 8; }
        const code = bits & ((1 << size) - 1); bits >>>= size; nb -= size;
        if (code === clear) { size = min + 1; next = end + 1; dict.length = clear + 2; prev = null; continue; }
        if (code === end) break;
        let entry;
        if (code < next && dict[code]) entry = dict[code];
        else if (code === next && prev) entry = prev.concat(prev[0]);
        else throw new Error('bad LZW code ' + code + ' (next free ' + next + ')');
        for (const v of entry) out.push(v);
        if (prev && next < 4096) { dict[next++] = prev.concat(entry[0]); if (next === (1 << size) && size < 12) size++; }
        prev = entry;
    }
    return out;
}
function decodeGif(g) {
    const W = g[6] | g[7] << 8, H = g[8] | g[9] << 8;
    let p = 13 + 768, trans = -1, delay = 0, loops = false;
    const screen = new Uint8Array(W * H), frames = [];
    while (g[p] !== 0x3B) {
        if (g[p] === 0x21 && g[p + 1] === 0xF9) { trans = (g[p + 3] & 1) ? g[p + 6] : -1; delay = g[p + 4] | g[p + 5] << 8; p += 8; }
        else if (g[p] === 0x21) { if (g[p + 1] === 0xFF) loops = true; p += 2; while (g[p]) p += g[p] + 1; p++; }
        else if (g[p] === 0x2C) {
            const x = g[p + 1] | g[p + 2] << 8, y = g[p + 3] | g[p + 4] << 8, w = g[p + 5] | g[p + 6] << 8, h = g[p + 7] | g[p + 8] << 8;
            p += 10; const min = g[p++], data = [];
            while (g[p]) { for (let i = 0; i < g[p]; i++) data.push(g[p + 1 + i]); p += g[p] + 1; }
            p++;
            const px = lzwDecode(min, data);
            if (px.length !== w * h) throw new Error('frame ' + frames.length + ' has ' + px.length + ' pixels, wants ' + w * h);
            for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const v = px[yy * w + xx]; if (v !== trans) screen[(y + yy) * W + x + xx] = v; }
            frames.push({ pixels: screen.slice(), w, h, delay });
        } else throw new Error('unknown block 0x' + g[p].toString(16) + ' at ' + p);
    }
    return { W, H, frames, loops };
}
let seed = 11;
const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const table = new Uint8Array(768).map((_, i) => (i * 37) % 256);

console.log('GIF writer');
test('noisy frames survive a round trip, including the dictionary filling up and restarting', () => {
    const W = 160, H = 120, w = CG._gifWriter(W, H, table), frames = [];
    for (let f = 0; f < 3; f++) { const a = new Uint8Array(W * H); for (let i = 0; i < a.length; i++) a[i] = rnd(255); frames.push(a); w.addFrame(a, 7); }
    const d = decodeGif(w.finish());
    eq([d.W, d.H, d.frames.length, d.loops], [W, H, 3, true]);
    d.frames.forEach((fr, f) => { for (let i = 0; i < W * H; i++) if (fr.pixels[i] !== frames[f][i]) throw new Error('frame ' + f + ' differs at pixel ' + i); });
});
test('a frame stores only the rectangle that changed', () => {
    const W = 100, H = 60, w = CG._gifWriter(W, H, table);
    const a = new Uint8Array(W * H).fill(3), b = a.slice();
    for (let y = 20; y < 30; y++) for (let x = 40; x < 55; x++) b[y * W + x] = 9;
    w.addFrame(a, 100); w.addFrame(b, 7); w.addFrame(b, 350);
    const d = decodeGif(w.finish());
    eq(d.frames.map(f => [f.w, f.h, f.delay]), [[100, 60, 100], [15, 10, 7], [1, 1, 350]]);
    eq(Array.from(d.frames[2].pixels), Array.from(b), 'last frame');
});
test('long flat runs and a one-pixel image', () => {
    const w = CG._gifWriter(300, 200, table), a = new Uint8Array(60000).fill(0);
    w.addFrame(a, 7);
    eq(decodeGif(w.finish()).frames[0].pixels.every(v => v === 0), true);
    const one = CG._gifWriter(1, 1, table); one.addFrame(new Uint8Array([5]), 7);
    eq(Array.from(decodeGif(one.finish()).frames[0].pixels), [5]);
});

console.log('Palette');
test('every class colour is kept exactly, and colour 255 is never given out', () => {
    const pal = CG._paletteBuilder(); pal.seed(CG.COLORS.concat(['#ffffff', '#1B2D45']));
    const data = new Uint8ClampedArray(4 * 5000);
    for (let i = 0; i < 5000; i++) { data[i * 4] = rnd(256); data[i * 4 + 1] = rnd(256); data[i * 4 + 2] = rnd(256); data[i * 4 + 3] = 255; }
    pal.add(data); pal.finish();
    const out = new Uint8Array(5000); pal.map(data, out);
    eq(out.some(v => v === 255), false, 'transparent colour used for a real pixel');
    CG.COLORS.forEach(hex => {
        const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)), one = new Uint8Array(1);
        pal.map(new Uint8ClampedArray(rgb.concat(255)), one);
        eq(Array.from(pal.table.slice(one[0] * 3, one[0] * 3 + 3)), rgb, hex);
    });
});

console.log('Names');
test('a name is shortened to a first name and last initial', () => {
    eq(['Emma R.', 'emma rodriguez', 'Jordan Alexander Smith', 'Mary Ann S', 'Kai', '', 'José Á.'].map(n => CG.shortName(n)),
       ['Emma R.', 'Emma R.', 'Jordan S.', 'Mary S.', 'Kai', 'Student', 'José Á.']);
});

console.log('Race');
const model = { title: 'T', subtitle: 'U', header: '#000000', footer: '', legend: null, slots: 2, days: ['2026-11-16', '2026-11-17', '2026-11-18'],
    items: [{ name: 'A', sub: '', color: '#2a78d6', values: [10, 20, 60] }, { name: 'B', sub: '', color: '#eb6834', values: [30, 40, 50] }, { name: 'C', sub: '', color: '#1baf7a', values: [null, null, 5] }] };
// Rows on the page, top to bottom. A bar waiting below the page (pos >= slots) is clipped when drawn.
const order = sc => sc.rows.filter(r => r.pos < sc.slots).sort((a, b) => a.pos - b.pos).map(r => r.name + ':' + Math.round(r.value));
test('each day shows that day\'s order and values', () => {
    eq(order(CG.raceScene(model, 0)), ['B:30', 'A:10']);
    eq(order(CG.raceScene(model, 1)), ['B:40', 'A:20']);
    eq(order(CG.raceScene(model, 2)), ['A:60', 'B:50']);
});
test('between days, values are part way and the day label is the nearer day', () => {
    const sc = CG.raceScene(model, 1.25);
    eq(Math.round(sc.rows.find(r => r.name === 'A').value), 30);
    eq([sc.dateSub, CG.raceScene(model, 1.75).dateSub], ['Day 2 of 3', 'Day 3 of 3']);
    eq(sc.max, 45);
});
test('an item with no score yet is not drawn, and one below the page stays off it', () => {
    eq(CG.raceScene(model, 0).rows.some(r => r.name === 'C'), false);
    const c = CG.raceScene(model, 2).rows.find(r => r.name === 'C');
    eq(!c || c.pos >= model.slots, true);
});
test('colours are given by the order of the class list, and a ninth class is grey', () => {
    const map = CG.classColors('abcdefghi'.split('').map(id => ({ id })));
    eq([map.a, map.h, map.i], [CG.COLORS[0], CG.COLORS[7], CG.OTHER]);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
