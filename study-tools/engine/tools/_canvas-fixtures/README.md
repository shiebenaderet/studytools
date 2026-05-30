# Canvas QTI golden fixtures

These zips are checked-in known-good outputs of the Canvas exporter, used as
regression baselines.

| File | Source | Question count | Generated | Canvas-verified |
|---|---|---|---|---|
| `mc.zip` | civil-war / practice (first 4) | 4 multiple_choice | 2026-05-30 | 2026-05-30 |
| `short-answer.zip` | civil-war / fib (first 2) | 2 short_answer | 2026-05-30 | 2026-05-30 |
| `essay.zip` | civil-war / shortAnswer (first 2) | 2 essay | 2026-05-30 | 2026-05-30 |

## Verification status

Each fixture currently passes:

- `validateForCanvas` (the user-facing pre-build rule registry)
- `selfCheckPackage` (the post-build defensive invariants in
  `question-export-core.js`)
- `validate-package.js` (the round-trip CLI that unzips and re-checks QTI
  conformance from disk)

What is **not yet** confirmed: that Canvas itself accepts each .zip on
import and grades correctly. That step is gated on a real Canvas course;
update the "Canvas-verified" column with the date once verified.

## Manual verification checklist

For each fixture, upload to a Canvas course (Settings → Import Course
Content → QTI .zip), then take the imported quiz once:

- **mc.zip**: 4 questions show with 4 options each; the correct answer
  scores 100%, wrong answers score 0%.
- **short-answer.zip**: 2 questions show a text input; typing the expected
  answer (case-insensitive) scores 100%.
- **essay.zip**: 2 prompts show their key terms + sentence starters in the
  body; you can type a response and it lands in SpeedGrader unscored.

If any step fails, fix the renderer in
`study-tools/engine/tools/question-export-core.js`, rebuild the affected
fixture with the same selection (see "How to regenerate" below), re-verify,
and commit. Update the "Canvas-verified" date.

## How to regenerate

```bash
node -e '
var core = require("./study-tools/engine/tools/question-export-core.js");
var JSZip = require("./study-tools/engine/vendor/jszip.min.js");
var fs = require("fs");
var cfg = require("./study-tools/units/civil-war/config.json");

function buildZip(qs, opts, outPath) {
  var pkg = core.buildCanvasPackage(qs, opts);
  if (core.selfCheckPackage(pkg).length) throw new Error("selfCheck failed");
  var v = core.validateForCanvas(qs, opts);
  if (!v.ok) throw new Error("validate failed");
  var zip = new JSZip();
  Object.keys(pkg.fileMap).forEach(function (p) { zip.file(p, pkg.fileMap[p]); });
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
    .then(function (buf) { fs.writeFileSync(outPath, buf); });
}

var mcQs = core.normalizeQuestions(cfg).slice(0, 4);
var fibQs = core.normalizeFib(cfg).slice(0, 2);
var esQs = (cfg.shortAnswerQuestions || []).slice(0, 2).map(function (sa, i) {
  return { id: i, question: sa.question || "", options: [], correctIndex: -1, topic: sa.topic || "T",
           _essay: { keyTerms: sa.keyTerms || [], sentenceStarters: sa.sentenceStarters || [] } };
});

Promise.resolve()
  .then(function () { return buildZip(mcQs, { title: "Civil War — Practice MC (fixture)", maxAttempts: 1, unitId: "civil-war", source: "practice" }, "study-tools/engine/tools/_canvas-fixtures/mc.zip"); })
  .then(function () { return buildZip(fibQs, { title: "Civil War — FIB (fixture)", maxAttempts: 1, unitId: "civil-war", source: "fib" }, "study-tools/engine/tools/_canvas-fixtures/short-answer.zip"); })
  .then(function () { return buildZip(esQs, { title: "Civil War — Short Answer (fixture)", maxAttempts: 1, unitId: "civil-war", source: "shortAnswer" }, "study-tools/engine/tools/_canvas-fixtures/essay.zip"); });
'
```

Then re-run the round-trip CLI:

```bash
for f in study-tools/engine/tools/_canvas-fixtures/*.zip; do
  node study-tools/engine/tools/validate-package.js "$f"
done
```

Expected: `OK <path>` for all three, exit 0.

## Why they exist

`question-export-core.js` is pure; identifiers and order are stable. Any
unintended drift in the rendered XML can be diffed against these fixtures
before reaching a real Canvas import.
