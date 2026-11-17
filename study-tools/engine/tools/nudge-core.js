// Nudge log: which nudges a student has seen and followed.
//
// Teacher request (2026-11-16): find out whether nudges work. Each student keeps a
// small log, saved as progress key `nudge_log` and synced like other progress:
//   { <nudgeId>: { shown, followed, lastShown, lastFollowed, target } }
// `shown` counts days a nudge was shown (a nudge is shown at most once a day).
// `followed` counts days the student acted on it: clicked a card, or opened the
// suggested activity within FOLLOW_WINDOW of a toast. The dashboard adds these
// up across students. The merge rule lives in ProgressManager.mergeActivityData.
(function () {
  var api = {};
  api.FOLLOW_WINDOW = 15 * 60 * 1000;

  // Names for the dashboard, in the order it lists them.
  api.NAMES = {
    'card-notebook': 'Card: Get your notebook ready',
    'card-read': 'Card: Read the next chapter',
    'card-review': 'Card: Review missed terms',
    'card-next': 'Card: Next step in the study plan',
    'card-stale': 'Card: Come back to an activity',
    'card-untried': 'Card: Try something new',
    'card-capped': 'Card: Points maxed, try another',
    'reminder-reread': 'Home note: Reread today',
    'reminder-quiz': 'Home note: Quiz soon, check your notebook',
    'learn-first': 'Toast: Start with Learn Mode',
    'short-answer': 'Toast: Write a short answer',
    'harder-game': 'Toast: Try a harder game',
    'after-learn': 'Toast: Test what you just learned',
    'notebook-missed': 'Toast: Missed questions are on your notebook list',
    'notebook-chapter': 'Toast: Chapter done, add the half-sheet',
    'mix-it-up': 'Toast: Switch activities',
    'review-missed': 'Toast: Review missed terms',
    'next-step': 'Toast: Next study step',
    'come-back': 'Toast: Come back to an activity'
  };

  // Nudge ids are short lowercase slugs. Logs come back from the database,
  // which a student could edit, so anything else (including "__proto__") is
  // ignored, and counts must be whole non-negative numbers.
  var ID = /^[a-z0-9-]{1,40}$/;
  var RESERVED = { constructor: 1, prototype: 1 };
  api.validId = function (id) { return typeof id === 'string' && ID.test(id) && !RESERVED[id]; };
  function count(n) {
    n = Number(n);
    return isFinite(n) && n > 0 ? Math.min(Math.floor(n), 100000) : 0;
  }
  api.count = count;

  function dayKey(t) {
    var d = new Date(t);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  api.dayKey = dayKey;

  // Long enough to read: about a second per 15 characters, 5 to 15 seconds.
  api.toastDuration = function (message) {
    var n = String(message || '').length;
    return Math.min(15000, Math.max(5000, Math.ceil(n / 15) * 1000));
  };

  api.shownToday = function (log, id, now) {
    var e = log && log[id];
    return !!(e && e.lastShown && dayKey(e.lastShown) === dayKey(now));
  };

  // Count a showing (once a day). Returns true if it counted.
  api.markShown = function (log, id, target, now) {
    if (!api.validId(id) || api.shownToday(log, id, now)) return false;
    var e = log[id] || (log[id] = { shown: 0, followed: 0 });
    e.shown = (e.shown || 0) + 1;
    e.lastShown = now;
    if (target) e.target = target; else delete e.target;
    return true;
  };

  // Count a follow, at most once per showing. Returns true if it counted.
  api.markFollowed = function (log, id, now) {
    if (!api.validId(id)) return false;
    var e = log && log[id];
    if (!e || !e.lastShown) return false;
    if (e.lastFollowed && e.lastFollowed >= e.lastShown) return false;
    e.followed = (e.followed || 0) + 1;
    e.lastFollowed = now;
    return true;
  };

  // Toasts the student just acted on by opening `target` soon after.
  api.followedBy = function (log, target, now) {
    return Object.keys(log || {}).filter(function (id) {
      var e = log[id];
      return api.validId(id) && e && typeof e === 'object' && e.target === target && e.lastShown && now - e.lastShown <= api.FOLLOW_WINDOW &&
        !(e.lastFollowed && e.lastFollowed >= e.lastShown);
    });
  };

  // Dashboard: add up logs. rows: [{ student_id, data }]
  // Returns [{ id, name, students, shown, followed, rate }] in NAMES order,
  // then any unknown ids.
  api.summarize = function (rows) {
    var by = Object.create(null);
    (rows || []).forEach(function (r) {
      var log = r && r.data;
      if (!log || typeof log !== 'object' || Array.isArray(log)) return;
      Object.keys(log).forEach(function (id) {
        if (!api.validId(id)) return;
        var e = log[id];
        if (!e || typeof e !== 'object') return;
        var shown = count(e.shown);
        if (!shown) return;
        var name = Object.prototype.hasOwnProperty.call(api.NAMES, id) ? api.NAMES[id] : id;
        var s = by[id] || (by[id] = { id: id, name: name, students: 0, shown: 0, followed: 0 });
        s.students++;
        s.shown += shown;
        s.followed += Math.min(count(e.followed), shown);
      });
    });
    var order = Object.keys(api.NAMES);
    return Object.keys(by).sort(function (a, b) {
      var ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia === -1) ia = order.length;
      if (ib === -1) ib = order.length;
      return ia - ib || a.localeCompare(b);
    }).map(function (id) {
      var s = by[id];
      s.rate = s.shown ? Math.round(100 * s.followed / s.shown) : 0;
      return s;
    });
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.NudgeCore = api;
})();
