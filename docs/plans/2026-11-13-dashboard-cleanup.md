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
