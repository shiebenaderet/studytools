# Teacher Dashboard: Trim and Regroup (Nov 13, 2026)

The teacher said the dashboard is getting unwieldy and asked for a review. The tab bar had
already run off the side of the page; that was fixed in 8.55.103 by letting it wrap. This
plan is about the cause: too many tabs, several of them showing the same thing.

Nothing here is built. The findings come from reading the dashboard's code. The live data
was not looked at, so anything about how full or empty a tab is in practice is the
teacher's to judge.

## Findings

**There are eleven tabs, and they fall into four kinds.**

| Kind | Tabs today | What they read |
|---|---|---|
| How the class is doing | Overview, Students, Activity Usage, Vocab Insights | progress, sessions, students |
| Rankings | Scores, Leaderboard, and three sections of Overview | leaderboard |
| What students wrote | Responses, Wiki Entries, Feedback | responses, progress, feedback |
| Setup | Class Codes, Schedule | classes, unit configs |

**The same ranking table appears in three places.** Scores lists every leaderboard entry
with its approval status and actions. Leaderboard lists the approved ones as students see
them. Overview shows Top Students and Class Standings again, and a Leaderboard Replay.

**Overview is the largest tab by far** (about 800 lines of the dashboard's 3,400): four
headline numbers, daily activity, recently active students, class standings, top students,
a rankings chart, the replay and a leaderboard.

**The filter bar sits above every tab but only some tabs use it.** Class, Unit and the two
dates apply to Overview, Students, Activity Usage, Scores, Vocab Insights, Leaderboard,
Wiki Entries and Responses. Class Codes, Schedule and Feedback ignore it.

**Setup tabs are used rarely but take two of the eleven places.** Class Codes is needed at
the start of a year. Schedule shows unlock dates and produces a snippet to paste into a
unit's config.

**The header also carries two tools,** Map Exporter and Question Exporter, which open
separate pages.

## Proposal

Six tabs in place of eleven. Nothing is removed; sections move.

| New tab | Holds |
|---|---|
| **Overview** | The four headline numbers, daily activity and recently active students. The ranking sections move out. |
| **Students** | The student table, with Activity Usage and Vocab Insights below it as two sections. |
| **Leaderboard** | Pending approvals first (today's Scores), then what students see (today's Leaderboard), then Class Standings and the Replay. |
| **Responses** | As now, with Wiki Entries added as a fourth choice in its Source filter. |
| **Feedback** | As now. |
| **Setup** | Class Codes and Schedule, with links to the Map Exporter and Question Exporter. |

Also:

- The filter bar shows only on tabs that use it.
- Later, results from the Canvas starting check get a Growth section under Students.

## Size and Risk

| Piece | Size |
|---|---|
| Move sections between tabs (markup and the tab switcher; no change to what is read or written) | Medium |
| Wiki Entries as a Source choice in Responses | Small |
| Filter bar shown per tab | Small |
| Teacher Guide and README | Small |

The dashboard needs a teacher sign-in and live data, so it cannot be fully tested from
here. Each moved section can be checked against a stand-in database for layout and
errors, but the teacher has to look at the real thing after it ships. Shipping it as two
or three small steps keeps any surprise easy to find and undo.

## Decisions for the Teacher

1. Six tabs as proposed, the eleven as they are now, or a different grouping?
2. Which tabs do you open most weeks, and which do you never open? Anything never opened
   could be dropped instead of moved.
3. Should the filter bar hide on tabs that do not use it?
4. Is there anything on the dashboard that is wrong, slow or annoying that this plan does
   not mention?

## Decided and Built (Nov 13, 2026)

The teacher approved the six-tab grouping and the hidden filter bar. Built in 8.55.105 as one step. One addition found while building: Overview's Top Students table is the same list as "What students see," so it is no longer shown. The exporter links stay in the header and were not repeated on Setup.

## Fixed Along the Way (8.55.106)

The teacher called the Activity Usage section confusing and asked about a 175-minute average
session. Both traced to the same faults:

- The dashboard read only the first 1,000 rows of the progress and sessions tables, which
  hold many times that. It now pages through all of them.
- The Students table and the per-unit averages looked for flashcard and test progress under
  the wrong names, so they showed 0 or a dash.
- Activity Usage listed the site's own record-keeping entries as activities. It was rebuilt
  as "By unit and class period": started and not started by period, with names, averages,
  and the activities students open.

## Next Refinements (proposed Nov 13, not built)

The teacher asked for more: a way to export the study graphic as a GIF or video to show each
Friday, a leaderboard graphic, and scores that reset each unit.

### Findings

- **The study graphic** is the Class Rankings chart on the Leaderboard tab: a line chart and
  an animated bar race of each period's average score, day by day, built from a daily
  snapshot of the leaderboard. It can only be watched on the dashboard today.
- **Scores are already kept per unit.** Each leaderboard row and each daily snapshot belongs
  to one unit, and a student starts a new unit at zero on the site. The dashboard does not
  show it that way: its Unit filter opens on "All Units," so rankings there mix every unit.
- **A browser can make these files itself.** A drawing on a canvas can be saved as a PNG, and
  a sequence of canvas frames can be encoded as a GIF by a small script shipped with the
  site, or recorded as a video. Nothing has to be sent to another service.
- **Names.** The student leaderboard shows first name and last initial, and only for students
  the teacher has approved. A graphic shown to the whole class should follow the same rule,
  or show class periods only.

### Proposals

| | What | Size |
|---|---|---|
| A | **Friday race.** A "Make this week's graphic" button on the Leaderboard tab that builds the bar race for the current unit as a GIF (1280 by 720, about 10 seconds, loops) and downloads it. A GIF plays in Slides, Canvas pages and email without a player. | Medium to large |
| B | **Leaderboard still.** A slide-sized PNG (1920 by 1080) of the current unit: class standings, or the top ten students, or both as separate images, with the unit name and date. | Small to medium |
| C | **Current unit by default.** The dashboard opens with the Unit filter set to the current unit, so every ranking shows scores since that unit began. "All Units" stays as a choice. | Small |
| D | **Needs a nudge.** On the Students tab, a list by period of students with no activity in the last seven days, ready to read out or print. | Small |
| E | **Growth.** After the Canvas starting check, a section under Students that shows start and end results by period and by question. | Medium, after Monday's data |

### Decisions for the Teacher

1. GIF, video, or both for the Friday race?
2. Should graphics show class periods only, or students by first name and last initial?
3. Which stills: class standings, top ten students, or both?
4. Should the dashboard open on the current unit?
5. Build the "needs a nudge" list?
6. Which comes first?

