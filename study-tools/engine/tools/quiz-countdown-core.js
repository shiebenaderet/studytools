// Quiz date countdown on the unit home screen.
//
// Teacher request (2026-10-13): a small, unobtrusive note with the quiz date and
// the days left. Set in a unit's config.json:
//   unit.quizDate:  "YYYY-MM-DD"  (local date; the note disappears the day after)
//   unit.quizLabel: "Quiz"        (optional; e.g. "Unit Test")
(function () {
  var api = {};
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function parse(ymd) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || '');
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return d.getMonth() === +m[2] - 1 ? d : null;
  }

  // Whole local calendar days from `now` to the date (0 on the day itself).
  api.daysUntil = function (ymd, now) {
    var target = parse(ymd);
    if (!target) return null;
    var n = now || new Date();
    var today = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    return Math.round((target - today) / 86400000);
  };

  // { date, countdown, days } for the home screen, or null when there is
  // nothing to show (no date, a bad date, or the quiz is over).
  api.describe = function (ymd, label, now) {
    var days = api.daysUntil(ymd, now);
    if (days === null || days < 0) return null;
    var d = parse(ymd);
    var name = label || 'Quiz';
    var date = name + ': ' + DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate();
    var countdown = days === 0 ? 'today. Good luck!'
      : days === 1 ? 'tomorrow'
      : days + ' days to go';
    return { date: date, countdown: countdown, days: days };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.QuizCountdown = api;
})();
