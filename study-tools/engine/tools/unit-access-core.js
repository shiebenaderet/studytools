// Which units a student can see and open.
//
// Teacher request (2026-10-04): "students don't see future units. They should only
// see the current unit we're on." Each unit in units/units.json can carry:
//   opens: "YYYY-MM-DD"  first day students can see it (local date)
//   hidden: true          never shown to students (last year's units, kept for the
//                         dashboard, the Question Export Tool and teacher preview)
//   draft: true           work in progress; same as hidden on the landing page
// The current unit is the open unit with the latest `opens` date. The landing page
// shows only that one; the engine refuses a hidden or not-yet-open unit unless the
// teacher has unlocked this session. Earlier units this year stay reachable by
// direct link (for review), they just leave the landing page.
//
// Units with no `opens` date count as open (older configs), but a unit with a date
// always wins the "current" slot over one without.
(function () {
  var api = {};

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // Local calendar date as YYYY-MM-DD, so a unit opens at local midnight, not UTC.
  api.today = function (now) {
    var d = now || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  };

  api.isOpen = function (unit, today) {
    if (!unit || unit.hidden || unit.draft) return false;
    return !unit.opens || unit.opens <= today;
  };

  // The one unit the landing page shows, or null if nothing is open.
  api.currentUnit = function (units, today) {
    var open = (units || []).filter(function (u) { return api.isOpen(u, today); });
    if (!open.length) return null;
    var dated = open.filter(function (u) { return u.opens; });
    if (!dated.length) return open[0];
    return dated.reduce(function (a, b) { return b.opens > a.opens ? b : a; });
  };

  // Can the engine load this unit id? Unknown ids are allowed (the engine shows its
  // own "not found" error) so a typo is not reported as "not open yet".
  // Returns { ok, reason: 'hidden' | 'not-open' | null, unit }.
  api.canOpen = function (units, unitId, today, teacher) {
    var unit = null;
    (units || []).forEach(function (u) { if (u.id === unitId) unit = u; });
    if (!unit || teacher) return { ok: true, reason: null, unit: unit };
    if (unit.hidden) return { ok: false, reason: 'hidden', unit: unit };
    if (unit.opens && unit.opens > today) return { ok: false, reason: 'not-open', unit: unit };
    return { ok: true, reason: null, unit: unit };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.UnitAccess = api;
})();
