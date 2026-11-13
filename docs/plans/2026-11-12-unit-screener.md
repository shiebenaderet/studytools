# Unit Starting Check: Plan, Review and Decisions (Nov 12, 2026)

The teacher asked for a short quiz that students take before they start a unit, so that
growth over the unit can be measured and shown, in place of relying only on streak bonuses.
The teacher also said the logic has to be air-tight.

The first version of this plan was reviewed the same day against the existing code. The
review found that its two central rules would not have worked. This file now records what
the review found, what the teacher decided, and the design to use if a site version is built.

**Status.** For Unit 3 the starting check is an ungraded Canvas quiz given in class. No site
feature has been built. Whether to build one is decided after Unit 3's results.

## Decisions (teacher, Nov 12)

1. **Unit 3:** the starting check is a Canvas quiz in class on Monday, November 16, in the
   first 10 minutes of each period, before any Unit 3 teaching. Unit 3 goes live on the site
   the same day. There are 15 questions, three per chapter (one definition, one "use it"
   situation and one idea question), with "I don't know yet" as a fifth choice on each. The
   first draft had ten definition questions that echoed the flashcards; five were swapped
   for "use it" questions so growth shows more than flashcard study.
2. **Never graded,** and growth is never graded either.
3. **End of unit:** the same 15 questions return as an ungraded reflection, separate from
   the unit quiz, with about 5 new ones. Students see no answers and no score until then.
4. **Site version:** decide after Unit 3's results.
5. **If a site version is built:** required for signed-in students, and the unit opens
   anyway if anything fails; answers kept in a table only the teacher can read; a guest is
   asked to sign in first; no leaderboard points; after the end check a student sees two
   counts and nothing else.
6. **District approval and families:** the teacher confirms both.

Settled without a decision: "I don't know yet" is recorded apart from a wrong answer; the
check is taken in class on the same day by every period, and a late taker is marked late;
growth is never ranked or announced by class period; the check's questions are kept out of
the practice bank and the practice bank is not reused for the check.

The approved questions and their answer key are in the unit's `_source-materials/starting-check/`
folder, which is not published. They are not in this file on purpose.

## What the Review Found

Each point was checked against the code by a second reviewer.

**The "one attempt, locked" rule would not have held.**

- `mergeActivityData` runs only when progress is downloaded (`progress.js`, its one caller is
  `syncFromSupabase`). Uploads write the device's copy over the cloud row without reading it.
  A second device, or a tab left open, could replace a finished attempt.
- **Reset My Progress** deletes every row for the unit, on the device and in the cloud.
- Progress keys carry no student id, and restoring an account does not clear them, so on a
  shared device one student's record can pass as another's.
- Finishing is not an upload. The list of unsent changes lives in memory, so a finished
  attempt can stay on a device after the tab closes and never reach the teacher.

**The "comes first" rule would have misfired on day one.**

- It tested for "no saved progress in the unit." Opening any activity writes a streak and a
  study day, and the site reloads itself once after an update. Ordinary students would have
  been skipped and recorded as "no baseline."
- The first screen is chosen before the cloud copy has loaded and before sign-in, and a link
  straight to an activity bypasses a home-page check.
- The plan had no off switch and did not say what happens on an error. A required gate that
  fails would lock every student out of the unit.

**The plan never said what is saved.** No existing activity saves an answer per question,
and no practice question has an id. Without stable ids, one edited or dropped question
spoils every saved answer after it.

**The practice bank cannot supply the questions.** In 47 of Unit 3's 61 practice questions
the right answer is the longest choice, which is worth about 11 of 15 to a student who
always picks the longest. The content checker does not look at questions at all.

**What the numbers can bear.** A 15-question total is rough for one student, about plus or
minus 4 questions, and sound for a class or a large individual gain. A per-chapter score for
one student is mostly luck. An "I don't know yet" choice changes scores by how willing a
student is to guess, so it has to be counted separately. Two question sets cannot be shown
to be equally hard without trying them on students, so the same set is used at both ends.

**Points.** A bonus added to the leaderboard score is not the same for everyone, because the
score is multiplied by days studied, and a stored score never goes down. Building the check
as an ordinary activity would also earn study time and a study day.

**Privacy.** The progress table can be read and written with the site's public key. That is
already true of today's progress data. The database has a stricter pattern in use for
written answers: a table with no public access, written through one function.

**Timing.** Unit 3 was not on the live site, so the deadline was the merge, not midnight.
A site version needs about five hours of building and testing, the teacher's read of every
question, a run on a real phone and Chromebook, and a database script the teacher runs.

## Design for a Site Version, If One Is Built

- **Record.** One per student and unit: question-set id and version, student id, start and
  finish times, and for each question id the original choice (or "don't know") and its time.
  A snapshot of study already done in the unit is stored at the start, so a late taker is
  labelled and not thrown away. No stored score; it is worked out from the answers.
- **Storage and lock.** A table only the teacher can read, written through one database
  function that accepts the first finished attempt and refuses later ones. The teacher needs
  a way to void one student's attempt. Reset My Progress must not reach it.
- **Gate.** One function, called where the first screen is chosen, at the top of
  `activateActivity`, and after every sign-in or restore. It reads only the check's own
  record for the signed-in student id, after one cloud lookup with a time limit. On any
  error, or no answer in time, the student goes in and nothing is written.
- **Off switch.** A flag in the unit's `config.json`, which is fetched fresh on every load.
  Ship with it off, test, then turn it on as its own commit.
- **Outside the activity path.** The check is drawn by the gate, not opened as an activity,
  so it earns no study time, streak or points.
- **Saving.** Each write re-reads the stored record first and never changes a finished one.
  Finish waits for the upload, and an unsent finished record is sent again on every load.
- **Teacher preview.** With the teacher unlock on, the gate passes and nothing is recorded.
- **Questions.** Permanent ids, a set version, options shuffled on screen with the original
  choice saved. The checker gains rules for the set: unique ids, four distinct options, the
  key in range, equal numbers per chapter, no stem shared with the practice bank or a
  flashcard definition, and an error when the key is the longest choice too often.
- **Tests.** The student path without the teacher unlock and with the clock set to an open
  date; two devices; a second tab; Reset My Progress; an offline finish; the live unit
  untouched when a unit has no check.
- **Privacy page.** A plain statement about the check ships in the same change.

## Found Along the Way

Not part of the starting check, and not yet acted on:

- **Practice bank.** The right answer is the first choice in 48 of Unit 3's 61 practice
  questions and the longest in 47. The site shuffles choices on screen. The Question Export
  tool keeps the stored order, so a Canvas quiz built from the bank needs "Shuffle Answers"
  turned on. Evening out the choice lengths is a content job for the bank itself.
- **Database sign-ups.** Teacher-only access depends on public sign-ups (and anonymous
  sign-ins) being off in the database's authentication settings. Nobody has confirmed the
  live setting.
- **Privacy page.** It says "first name" where the site asks for first name and last
  initial, it implies the database key is private, and it does not mention written answers.

## Not Changing

- Streaks, the consistency bonus and the leaderboard formula.
- Learn Mode's warm-up, which stays a per-session check.
