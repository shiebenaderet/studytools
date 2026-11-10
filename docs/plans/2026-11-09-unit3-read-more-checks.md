# Unit 3: Short Readings, Read More, and Read More Checks

**Date:** 2026-11-09
**Requested by:** the teacher
**Status:** Decisions 1, 2, 4, 5 and 6 answered (see end). Decision 3 waiting on the teacher.

## The Request

The full Unit 3 drafts (17 sections, about 8,500 words at Full) are about three
times longer per chapter than the Revolution unit. Because flashcards stay
locked until every section of a chapter is read, that length becomes a barrier.
The teacher wants:

1. A shorter textbook that counts toward the reading gate.
2. A "Read More" option that holds the longer version for students who want it.
3. A way for those students to show the teacher what they read, through
   comprehension checks, and to earn study points for doing it.

## Findings

| What exists | Where | Reuse? |
|---|---|---|
| Reading gate: a chapter counts as read when every section is in `sectionsRead` (scrolled to) | `textbook.js`, spec `2026-04-11-textbook-gating-design.md` | Yes. Short sections only count toward it. |
| Section callouts: `keyIdea`, `primarySource`, `checkIn` (`stop-and-think` or `quick-check` multiple choice, saved in `quickChecks`) | `textbook.js` lines ~590–830 | Yes. Quick Check is the auto-graded half of a Read More check. |
| Go Deeper links (external, per category, end of chapter) | `go-deeper.js` | No. Read More is our own text inside the section, not a link out. |
| Feedback table: students insert, only signed-in teachers read | `migrate-feedback.sql`, `feedback.js` | Pattern to copy for a responses table. |
| Leaderboard score: vocab mastered x 10 + best test + study time (diminishing) + map bonus, times a consistency multiplier | `leaderboard.js` `calculateScore` | Yes. Add a Read More term. |
| Response Incentives design (June 2026): `responses` table, `ResponseCapture` helper, study points per answered question, paste blocking | spec `2026-06-02-response-incentives-design.md` | **Approved but never built.** This plan builds its table, capture helper and paste guard once, for both Short Answer and Read More. |
| Teacher dashboard: reads `progress`, `sessions`, `leaderboard`, `students`, `classes` | `dashboard/dashboard.js` | Add a Responses view. |

## Proposed Design

### 1. Short sections (content)

Each section's main text drops to about 250 words at Full: the opener scene, the
core vocabulary, and one or two events. A chapter lands near 700 to 900 words at
Full, close to Revolution. Quick and Clear are shorter still. Only this text
counts toward the reading gate.

**Size:** M (17 sections x 4 levels of writing).

### 2. Read More (engine)

A new optional section field, `readMore`, holds the longer version. It shows as a
closed "Read More" panel under the short text. Opening it does not affect the
gate, so no student is held back by it. Read Aloud, tap-to-define and the
highlighter must work inside it. Highlights need their own key
(`segment/section/readMore`) so they do not collide with the short text's
character offsets.

`readMore` holds Full text only at first. A Clear version can be added later.

**Size:** S to M (render, Read Aloud and highlighter keys, progress merge rule).

### 3. Read More Check (engine + database)

At the end of each Read More panel:

- **One Quick Check** (multiple choice, auto-graded, explanation shown), using
  the existing `quick-check` renderer.
- **One "Tell Mr. B" question**: a short written answer (two or three
  sentences) about something only the longer text covers.

The written answer saves with a "Save my answer" button. Saving sends it to a new
`responses` table (from the June design) with `source = 'read-more'` and the
section id. Paste is blocked in the box, as the June design planned.

**Size:** M (table + RLS, capture helper, UI, offline queue reuse).

### 4. Study points (engine)

A finished Read More Check (Quick Check answered and a written answer saved that
meets a minimum length) earns points once per section. Points fold into
`calculateScore` as a new term, so they also get the consistency multiplier.

**Size:** S.

### 5. Teacher view (dashboard)

A Responses tab in the dashboard: filter by unit, class and section; read each
answer with the student's name and date; mark one as a good example. This also
serves the June design's goal of a corpus of real student exemplars.

**Size:** M.

## Order of Work

1. Short sections for Chapter 1, reviewed by the teacher, then the rest.
2. Read More panel (engine), then the long drafts moved into `readMore`.
3. `responses` table, capture, paste guard, Read More Check UI.
4. Points.
5. Dashboard Responses tab.
6. Leveling the short sections into Quick, Clear and Deep.

Each engine step ships as its own commit with a version bump and changelog
entry, on a branch, and goes live only with the teacher's OK.

## Decisions for the Teacher

1. **Points per finished Read More Check.** For scale: one mastered term is 10
   points, and 30 minutes of study is 30. Suggestion: 15 points per section, so
   all 17 sections are worth 255 before the multiplier.
2. **Minimum written length to earn points.** Suggestion: 20 words, with the
   paste guard on.
3. **Build the Short Answer half of the June design at the same time?** It uses
   the same table and helper, so the added cost is small.
4. **Read More levels.** Full only at first, or Full and Clear?
5. **Gate pacing.** Split Chapter 1 so Sections 4 and 5 (the compromises) unlock
   on 11/18 instead of 11/16, to match the lessons?
6. **Names on responses.** The dashboard would show the student's name with each
   answer, like feedback does. Guest-mode students could read but not earn
   points. OK?

## Answers (2026-11-09)

1. **15 points** per finished Read More Check.
2. **20-word minimum** to earn points, with the **paste guard on**.
3. Waiting: the teacher asked to be reminded what the June plan covers.
4. **Read More at Full first**, then add Clear.
5. **Split Chapter 1.** Unit 3 gets five categories: Sections 1 to 3 unlock 11/16, and the compromises (Sections 4 and 5) unlock 11/18.
6. **Names shown** on responses in the dashboard. Guest-mode students read but do not earn points.

## Found While Answering Decision 5

Sort It Out uses only the first four unlocked categories
(`categories.slice(0, 4)` in `sort-it-out.js`). With five categories, the last
one would never appear. Fix: pick four of the unlocked categories at random each
round. **Size:** S. Ships as its own commit before the unit opens.
