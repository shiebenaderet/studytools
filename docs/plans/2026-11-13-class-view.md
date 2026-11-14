# Class View: Who Is Active and What They Do

Requested by the teacher on Nov 13, after the dashboard refinements went live: "an easier way to
see the classes by period so I can see who hasn't been active, who has, and see what they have
been doing while logged in. Too much Wordle? Not enough flashcards? No reading of the chapter?"

Nothing here is built. It waits for the teacher's answers.

## Findings

What the site records about each student today:

| Recorded | Detail |
|---|---|
| Each visit | When it started, how long it lasted, and which activities were used during it. |
| Reading | Which textbook sections the student has marked as read. |
| Flashcards | Which terms are mastered. |
| Practice test | The best score. |
| Each activity | When it was last opened, and the minutes spent on the most recent day only. |

What it does not record: **total minutes in each activity.** The site keeps one day of minutes
per activity and overwrites it the next day. So the dashboard can say "Wordle in 5 of this
week's 6 visits" today, but not "42 minutes of Wordle."

The current Students tab has the pieces in three places (Needs a nudge, the student table, By
unit and class period), none of which shows one class with what each student did.

## Proposals

| | What | Size |
|---|---|---|
| A | **Class view.** One class period at a time, one row per student: last visit, visits this week, reading (sections read out of the unit's total), must-know terms mastered, best practice test, and what they used this week as counts of visits ("Wordle 5, Flashcards 1"). A plain note at the end of the row: "Away 9 days", "Not started", "Games only this week", "No reading yet", or nothing. Students who need attention sort to the top. Built from what is already recorded. | Medium |
| B | **Record minutes per activity from now on.** The site would keep minutes per activity per day, so the class view can show "Wordle 42 min, Flashcards 6 min" for the week. It touches the student site and sync (a new merge rule), needs one line on the privacy page, and counts only from the day it ships. | Medium |

Proposed grouping for the notes:

- **Reading:** Textbook.
- **Study:** Learn Mode, Flashcards, Practice Test, Fill in the Blank, Short Answer, Typing
  Practice, Source Analysis, Power Sort, Sort It Out, Who Am I, Four Corners, Timeline, Map Quiz.
- **Games:** Wordle, Hangman, Flip Match, Term Catcher, Tower Defense, Crossword, Quiz Race,
  Lightning Round.

"Games only this week" would mean every activity the student used in the last seven days is in
the Games group.

## Decisions for the Teacher

1. Build the class view (A)?
2. Should it replace the "All students" table, or sit beside it?
3. Which days should "what they used" cover?
4. Is the Reading, Study, Games grouping right?
5. Record minutes per activity from now on (B)?
