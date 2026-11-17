# Notebook Companion (Nov 16, 2026)

The teacher asked for a new page under Tools that tells each student what to put in their
notebook before the quiz, based on how they have been studying. It has four parts:

1. An overview of the key vocabulary and definitions, plus a check that the student has
   the unit's handouts.
2. Practice questions the student keeps getting wrong on the site.
3. Outlines for the short-answer questions.
4. Reminders over the next few weeks to read or reread textbook sections, based on how
   the student has been studying.

Nothing here is built. The findings come from reading the engine code and the Unit 3
(`building-a-government`) config and textbook.

## Findings

**The page fits the existing Tools screen.** Tools is the `tools` array in
`js/core/app.js` (`showTools`), and each card calls a function in `tools/tools.js`. The
command palette lists the same tools (`js/core/command-palette.js`). **My Study Guide**
(`StudyTools.openNotes`) already sorts terms into Needs Review and Mastered and has typed
notes boxes for each category, so the two would partly overlap (decision 1).

**Vocabulary: everything needed is in place.** Unit 3 has 50 terms with `tier`,
`category` and `definition`. Flashcard mastery (`flashcards.mastered`) and the weak-term
record (`weakness_tracker`, with miss counts, written by many games) show which terms a
student knows and which they keep missing. The page can list must-know terms by chapter
and put the missed ones first.

**Handouts: the site has no record of them.** No unit config lists handouts. The teacher
would add a short list to each unit's config, for example:

```json
"notebook": {
  "handouts": [
    { "title": "Articles of Confederation weaknesses chart", "category": "Why the Articles Failed" },
    { "title": "Great Compromise graphic organizer", "category": "Compromises in Philadelphia" }
  ]
}
```

Students could tick each one off as they find it in their notebook. That would be the
page's only new saved data, and it needs a merge rule so that ticks made on a phone and on
a Chromebook add up (decision 3).

**Missed questions: only Practice Test records them.** `practice-test-mastery.wrong`
lists the questions a student missed in Practice Test. A right answer in any activity takes
the question off that list (`MasteryManager.noteQuestionRight`). Quiz Race, Learn Mode and
Tower Defense ask the same questions but never record a miss, so a student who studies
mostly in games would see a short list or none at all. Recording those misses means a small
change in each of the three activities (decision 4).

**Short-answer outlines: the content already exists.** Unit 3 has 6 short-answer
questions, one or two per chapter. Each has `keyTerms` and a `plan` with four parts:
claim, evidence, evidence, reasoning. A student's own draft is saved under
`short-answer-<n>` (Short Answer and Response Builder share it). The page could show an
empty outline frame (Claim / Evidence 1 / Evidence 2 / Reasoning, the key terms to use,
and the textbook section to reread), or it could fill the frame in from `plan`
(decision 5).

**Reread reminders: the site knows what a student read, but not when.** Textbook progress
stores `sectionsRead["segment/section"] = true`, with no date. Spacing rereads
(a few days after the first read, again a week later, again just before the quiz) needs
the date of the first read. That is a new field, `readAt`, with a merge rule that keeps
the earliest date. Sections read before this change have no date, so the page would fall
back to the chapter's open date in `categorySchedule`.

Two signals can also pick *which* section to reread:
- Every textbook section lists its `vocabTerms`. A term the student keeps missing points to
  the section that teaches it ("You missed *Virginia Plan* 3 times. Reread 'Big States,
  Small States'").
- The unit has `unit.quizDate` (Unit 3: Dec 17) and `categorySchedule` (chapters open Nov
  16 to Dec 2), so the schedule can count back from the quiz.

**The site cannot send reminders.** It has no push notifications or email, and adding
them would mean third-party services the privacy page rules out. Reminders can only appear
when a student opens the site: on the companion page, and as a one-line note on the unit
home screen next to the quiz countdown (decision 6).

## Proposed build

| # | Item | Size |
|---|---|---|
| 1 | Notebook Companion page under Tools and in the command palette: vocab overview by chapter, missed terms first | Small |
| 2 | Handout checklist from a new `notebook.handouts` config field, with saved ticks and a merge rule | Small to medium |
| 3 | Missed-questions section from Practice Test data (question, right answer, explanation) | Small |
| 3b | Optional: record misses in Quiz Race, Learn Mode and Tower Defense too | Medium |
| 4 | Short-answer outlines, one per question, grouped by chapter | Small |
| 5 | `readAt` dates for textbook sections, with a merge rule and tests | Small |
| 6 | Reread schedule: what to reread and when, based on read dates, missed terms and the quiz date | Medium |
| 7 | Optional: one-line reread reminder on the unit home screen | Small |
| 8 | Print view, so the list can be printed or glued into a paper notebook | Small |
| 9 | README, Teacher Guide (new field, activity table, checklist, FAQ), changelog, version | Small |

Each item ships as its own commit. Items 1, 3 and 4 need no new data and could go live
before the quiz even if the reread schedule waits.

## Decisions made

- **Handouts (Nov 16):** skipped for now. Vocabulary goes out as half-sheets that students
  glue into their notebooks over time, so items 2 and decision 3 are on hold.
- **Reminders (Nov 16):** yes, on-site reminders, on the companion page and as a line on
  the unit home screen (item 7 is in).
- **Placement:** a new Notebook Companion card beside My Study Guide.
- **Notebook format:** interactive notebook.
- **Handouts:** skip, or swap in a checklist of core vocabulary students tick off as it goes
  in their notebook (open: see below).
- **Missed questions:** record misses in Quiz Race, Learn Mode and Tower Defense too
  (item 3b is in).
- **Short-answer outlines:** empty frame with key terms and the section to reread.
- **Reread spacing:** about 2 days after the first read, about 7 days after, and the 2 days
  before the quiz.
- **Units:** every unit with a quiz date.

- **Vocabulary checklist:** yes, core terms to tick off as each half-sheet goes in.
- **Short-answer questions:** the quiz uses the same ones as the site, so the outlines say so.

**A call made while building:** Quiz Race is two players on one screen, so a miss cannot
be pinned on one student. Misses are recorded in Learn Mode and Tower Defense (and, as
before, Practice Test) but not Quiz Race.

## Built (Nov 16)

Three commits on the `notebook-companion` branch:

1. Learn Mode and Tower Defense record missed practice questions
   (`MasteryManager.noteQuestionWrong`).
2. The textbook saves a first-read date per section (`readAt`) and rereads (`rereads`),
   with merge rules (earliest first read; union of rereads, newest 10), and shows
   **Mark as Reread** when a reread is due.
3. The Notebook Companion page (`tools/notebook-core.js` with tests,
   `tools/notebook-companion.js`): reading plan, vocabulary checklist (ticks saved in
   `activity_notebook`, later tick wins), missed questions, outlines, print view, the
   "Reread today" note on the home screen, and docs.

Commits 1 and 2 change nothing a student sees until the page arrives in commit 3, so the
docs ship with commit 3.

## Decisions for the teacher

1. **Replace or add?** Make Notebook Companion a new Tools card beside My Study Guide, or
   fold My Study Guide into it?
2. **Notebook format.** What does a notebook page look like in your class (interactive
   notebook, Cornell notes, a vocab section)? The page should use the same headings.
3. **Handouts.** Which handouts belong to Unit 3, and should students tick them off (saved)
   or only see a printed list?
4. **Missed questions from games too?** Practice Test only, or also Quiz Race, Learn Mode
   and Tower Defense?
5. **Short-answer outlines.** Empty frame with key terms and a section to reread, or
   filled in from the model plan? Are the quiz's short-answer questions the same ones the
   site has?
6. **Reminders.** On the companion page only, or also a line on the unit home screen?
7. **Reread spacing.** Proposed: about 2 days after the first read, about 7 days after,
   and the 2 days before the quiz. Keep that or change it?
8. **Which units?** Unit 3 only, or every unit that has a quiz date?
