(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.QExport = api;
})(this, function () {
  function csvField(v) {
    v = String(v == null ? '' : v);
    return '"' + v.replace(/"/g, '""') + '"';
  }
  function toCsv(rows) {
    return rows.map(function (r) { return r.map(csvField).join(','); }).join('\r\n') + '\r\n';
  }
  function normalizeQuestions(config) {
    var qs = (config && config.practiceQuestions) || [];
    var out = [];
    qs.forEach(function (q, i) {
      if (!q || !Array.isArray(q.options) || typeof q.correct !== 'number') return;
      if (q.correct < 0 || q.correct >= q.options.length) return;
      if (q.options.length < 2) return;
      var opts = q.options.slice(0, 4);
      while (opts.length < 4) opts.push('');
      out.push({ id: i, question: q.question || '', options: opts, correctIndex: q.correct, topic: q.topic || 'Uncategorized' });
    });
    return out;
  }
  var BLOOKET_TIME = 20;
  function formatBlooket(questions) {
    var rows = [['Question #','Question Text','Answer 1','Answer 2','Answer 3','Answer 4','Time Limit (sec)','Correct Answer(s)']];
    questions.forEach(function (q, i) {
      rows.push([i + 1, q.question, q.options[0], q.options[1], q.options[2], q.options[3], BLOOKET_TIME, q.correctIndex + 1]);
    });
    return toCsv(rows);
  }
  function formatGimkit(questions) {
    var rows = [['Question','Correct Answer','Incorrect Answer 1','Incorrect Answer 2','Incorrect Answer 3']];
    questions.forEach(function (q) {
      var wrong = q.options.filter(function (_, idx) { return idx !== q.correctIndex; });
      rows.push([q.question, q.options[q.correctIndex], wrong[0] || '', wrong[1] || '', wrong[2] || '']);
    });
    return toCsv(rows);
  }
  return { csvField: csvField, toCsv: toCsv, normalizeQuestions: normalizeQuestions, formatBlooket: formatBlooket, formatGimkit: formatGimkit };
});
