# Unit Screener: A "What Do You Already Know?" Quiz Before a Unit (Nov 12, 2026)

The teacher asked whether students could take a short screening quiz before they start a
unit's study site, so that growth over the unit can be measured and shown, in place of
relying only on streak bonuses. The teacher also said the logic has to be air-tight.

Nothing here is built. This is a plan with the decisions the teacher needs to make.

## Findings

**What exists already.**

- Learn Mode opens every session with an ungraded warm-up and closes with a check. Each
  session saves both scores (`learn-mode-sessions`: `preScore`, `preCount`, `postScore`,
  `postCount`). That measures growth inside one sitting, on a handful of questions, and
  only for students who use Learn Mode. It is not a unit baseline.
- Each unit has a bank of multiple-choice questions tagged by chapter (Unit 3 has 61, nine
  to seventeen per chapter) and a Practice Test that draws from it.
- Progress is saved on the device and synced to the `progress` table as one row per
  student, unit and activity. A screener result can be one more row of that kind, so the
  database needs no new table or column.
- The leaderboard score is built from study activity and multiplied by a consistency
  bonus for the number of days studied.

**What makes this hard to get right.**

1. **A baseline can be taken only once.** If a student can retake it, or a second device
   can overwrite it, the number means nothing. The first finished attempt has to win
   everywhere, for good.
2. **Guessing.** A four-choice question gives 25% to a student who knows nothing. Without
   an "I don't know yet" choice, baselines will sit near 25% and vary by luck.
3. **The same questions are used for practice.** If the screener draws from the practice
   bank, students will meet those exact questions again in Practice Test and Learn Mode
   and can memorize the answers. The end-of-unit score would then show memory of the
   items, not learning.
4. **Rewarding growth invites low first scores.** If growth earns leaderboard points, a
   student gains by answering the screener wrong on purpose.
5. **Students who started early.** Anyone who studies a unit before taking the screener
   has no true baseline, and one cannot be made up afterward.
6. **Skipping.** If the screener can be skipped, some students will have no baseline. If
   it cannot, a student who is absent on day one is blocked from the site until they
   take it.
7. **Guests.** A student who is not signed in has results only on that device.
8. **What "after" means.** Growth needs a second measurement, taken under the same
   conditions, at a time the teacher chooses.

## Proposal

**A. The screener.** A unit can carry a `screener`: a fixed set of about 15 questions,
three per chapter, written for this purpose and used nowhere else on the site. Each
question has four choices plus **I don't know yet**. The first screen says it is not
graded and that honest answers make the site more useful. No answers or score are shown
at the end, only "Thanks. You'll see how much you've learned at the end of the unit."
(Showing answers would teach the items.)

**B. One attempt, locked.**

- Answers save after every question, so a closed tab or a switch of device resumes where
  the student stopped.
- Once finished, the result is stamped with a completion time and cannot be reopened.
- Sync rule: a finished attempt always beats an unfinished one; between two finished
  attempts, the earlier completion time wins. This is a new rule in
  `mergeActivityData`, with tests for every pairing.
- The teacher preview never records an attempt.

**C. When it appears.** The first time a signed-in student opens a unit that has a
screener and no saved progress in that unit, the screener comes first. A student who
already has progress in the unit is not asked and is recorded as "no baseline."

**D. The second measurement.** A matching end-of-unit check: a second fixed set of 15
questions on the same chapters and at the same difficulty, also used nowhere else. The
teacher turns it on by date in the unit list (like `opens`). It also allows one attempt.

**E. What students and the teacher see.**

- Student: after the end check, "At the start you knew 4 of 15. Now you know 12 of 15,"
  with the same split by chapter.
- Teacher dashboard: a Growth tab listing each student's start score, end score and
  change, by class and by chapter, with "no baseline" and "not taken" shown as such.

**F. Leaderboard.** Growth is not added to the leaderboard score. Finishing each of the
two checks earns a small fixed bonus, the same for everyone, so there is a reason to do
them and no reason to do badly.

## Sizes

| Part | Size |
|---|---|
| Screener activity, one-attempt lock, resume, merge rule and tests | Medium |
| "Comes first" gate, with the early-starter and guest cases | Small to medium |
| End-of-unit check and the student growth screen | Small (reuses the screener) |
| Dashboard Growth tab | Medium |
| Two question sets per unit (30 questions), written and checked | Medium, per unit |
| Privacy page, README and Teacher Guide | Small |

## Timing

Unit 3 opens on November 13. This cannot be built and tested properly by then. Students
who start Unit 3 on Friday without a screener have no baseline for that unit, and
adding one a week later would measure a class that has already studied. The first unit
that can have a true baseline is the one after Unit 3. For Unit 3, the Learn Mode
session scores are the only growth data.

## Decisions for the Teacher

1. **Required or skippable?** Required gives every student a baseline but blocks the site
   until it is done. Skippable ("Not now," asked again next visit) never blocks anyone
   but leaves gaps. The plan assumes required, with a teacher override for one student.
2. **Guests.** Should a student who is not signed in take the screener (saved on that
   device only), or should the screener wait until they sign in?
3. **New questions or reserved ones?** Writing 30 new questions per unit is the clean
   choice. The cheaper one is to set aside 30 of the existing practice questions and
   remove them from Practice Test and Learn Mode, which leaves Unit 3 with 31 for
   practice.
4. **Same questions before and after, or two matched sets?** The same set is the most
   direct comparison but the student has seen the items once. Two sets avoid that and
   need the sets to be equally hard, which someone has to judge.
5. **When is the end check?** A date the teacher sets, or automatically when a student
   has mastered every chapter?
6. **Leaderboard.** A fixed bonus for finishing, as proposed, or no points at all?
7. **Does it count for a grade?** The plan assumes it never does, and says so to
   students. If it ever might, students need to be told before they take it.
8. **Start with which unit?** The unit after Unit 3, as above, or a late Unit 3 screener
   knowing its baseline is not a true one?

## Not Changing

- Streaks, the consistency bonus and the current leaderboard formula.
- Learn Mode's warm-up, which stays as a per-session check.
- The database layout. Results use the existing `progress` table.
