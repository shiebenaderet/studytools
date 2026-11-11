# Textbook: Optional Written Questions on the Brief Readings (Nov 11, 2026)

**Request.** The teacher wants optional short-answer questions on the extended readings and
on the brief readings that students read before a chapter's terms unlock.

Nothing here is built. It needs the decisions at the end.

## Findings

**The extended readings already have this.** Every Read More panel in Unit 3 ends with a
Read More Check: one Quick Check and one written "Tell Mr. B" question. A signed-in
student's answer is sent to the `responses` table and shows in the dashboard's Responses
tab. A check is complete when the Quick Check is answered and a sent answer has 20 or more
words, and each completed check is worth 15 leaderboard points.

**The brief readings have no written question.** A section can carry a `checkIn`, either a
Stop & Think box (nothing saved) or a Quick Check (multiple choice, saved). Unit 3's brief
readings use neither.

**The reading gate is separate.** A chapter's terms unlock when its sections are marked as
read. A written question can sit under the reading without touching that gate.

**The database accepts only two kinds of answer today.** `responses.source` must be
`short-answer` or `read-more`, both in the table's rule and in the `save_response`
function. A third kind for the brief readings needs a small migration run on the live
database, which needs the teacher's say-so.

**The dashboard labels answers by source.** The Responses tab has a Source filter with two
choices and badges each answer "Short Answer" or "Read More".

## Proposal

- A section may carry `prompt: { "label": "Tell Mr. B", "question": "..." }`. It draws
  under the brief reading as the same box the Read More Check uses: word count, paste
  blocked, **Send** button, saved on the device as the student types.
- It is optional for the student. It never blocks Mark as Read and never blocks the terms
  from unlocking.
- Answers go to the `responses` table with a new source, `reading`, keyed by
  `segment-id/section-id`, and the dashboard gets a third Source choice and badge,
  "Reading".
- The question is the same at all four reading levels, written in plain words, and
  answerable from the brief reading alone, with no "Look at" lines.
- Progress for it is saved and merged across devices the way Read More Check progress is.

## Size

| Piece | Size |
|---|---|
| Engine: prompt box under the brief reading (reuses the Read More Check box) | Small |
| Database: allow source `reading` (one migration file, run by the teacher) | Small, needs the teacher |
| Dashboard: third Source choice and badge | Small |
| Progress merge rule and leaderboard points, if any | Small |
| Content: 17 questions for Unit 3 | Medium |
| README, Teacher Guide, changelog | Small |

## Decisions for the Teacher

1. **Is this the right reading of "optional"?** Optional for the student (never blocks the
   unlock), and optional for a unit (a section without a `prompt` shows nothing).
2. **Points.** None, or a smaller award than the Read More Check's 15 (for example 5 points
   for a sent answer of 20 or more words)? Points make more students answer and give you
   more to read.
3. **Every section, or one per chapter?** Seventeen questions for Unit 3, or five, placed
   on each chapter's last section.
4. **Database.** OK to add the `reading` source to the live database? The alternative is to
   reuse `read-more` with a different key, which needs no migration but mixes the two kinds
   in the dashboard filter.
5. **Timing.** Chapter 1 opens Friday, Nov 13. This can ship after the unit opens; students
   who have already read a section would simply find a new optional box there.
