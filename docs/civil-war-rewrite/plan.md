# Civil War Unit Rewrite — Plan

**Source materials:** `study-tools/units/civil-war/_source-materials/`
- `19 Worlds of North and South.pdf` (6 pages)
- `20 African Americans.pdf` (5 pages)
- `21 Dividing Nation.pdf` (7 pages)
- `CH_22_The Civil War.pdf` (9 pages)
- Plus ~60 supporting documents (primary sources, lesson plans, image analyses)

**Decisions locked in (2026-05-08):**
1. Categories become the 4 chapter titles (full names, not abbreviated)
2. Old terms not in new outline → demoted to `tier: "encounter"` (kept as bonus content, not gated)
3. Glory, simulation, Lincoln document deep-dive → classroom only, not on site (simulation already linked)
4. Textbook segments → re-author from the 4 PDFs to match new chapter structure
5. Typing passages → re-author once vocab is finalized; one passage per chapter, weighted toward must-know terms
6. Practice questions → audit all 50, keep what fits, remove and replace the rest

**Out of scope (staying as-is):**
- Maps (1861 quiz, civil-war battle map, Underground Railroad map)
- Imagery (vocab `imageUrl`, portraits — already authored last session)
- Music (none authored yet for civil-war; a separate future task)
- Battle simulation (external link, no changes)
- `historicalFlavor` quotes/funFacts (16+16 already authored, will need a small audit at the end to make sure attributions still match terms in scope)

---

## Categories: old → new

| Current site (3) | New (4 chapters) |
|---|---|
| Sectionalism (12 terms) | **Worlds of North & South** (10 terms) |
| Road to War (15 terms) | **African Americans at Mid-Century** (10 terms) — NEW |
| The War Itself (22 terms) | **A Dividing Nation** (10 terms) |
| | **The Civil War** (10 terms) |

The category-name change drives:
- Mastery gating order (will be: N&S → AA → Dividing → War)
- Flashcard category badges
- Practice question topic filters
- "Connections" topic questions (cross-chapter, gated behind all 4 mastered)
- Textbook segment IDs
- Reflection prompt context

---

## Vocabulary delta

**Survives, recategorized (~30 of 49):**
| Term | Current category | New category |
|---|---|---|
| sectionalism | Sectionalism | Worlds of North & South |
| cotton gin | Sectionalism | Worlds of North & South |
| plantation economy | Sectionalism | Worlds of North & South (rename → "Plantation"?) |
| free state | Sectionalism | Worlds of North & South |
| slave state | Sectionalism | Worlds of North & South |
| Mason Dixon Line | Sectionalism | Worlds of North & South |
| slavery | Sectionalism | African Americans at Mid-Century |
| abolitionism | Sectionalism | African Americans at Mid-Century |
| Frederick Douglass | Sectionalism | African Americans at Mid-Century |
| Underground Railroad | Sectionalism | African Americans at Mid-Century |
| Nat Turner's Rebellion | Sectionalism | African Americans at Mid-Century |
| Harriet Tubman | Sectionalism | African Americans at Mid-Century |
| William Lloyd Garrison | Sectionalism | African Americans at Mid-Century (or Dividing Nation?) |
| Missouri Compromise | Road to War | A Dividing Nation |
| Wilmot Proviso | Road to War | A Dividing Nation |
| Compromise of 1850 | Road to War | A Dividing Nation |
| Fugitive Slave Law | Road to War | A Dividing Nation |
| Uncle Tom's Cabin | Road to War | A Dividing Nation |
| Bleeding Kansas | Road to War | A Dividing Nation |
| Dred Scott decision | Road to War | A Dividing Nation |
| Lincoln Douglas Debates | Road to War | A Dividing Nation |
| John Brown's Raid | Road to War | A Dividing Nation |
| Election of 1860 | Road to War | A Dividing Nation |
| secession | Road to War | A Dividing Nation |
| Kansas Nebraska Act | Road to War | A Dividing Nation |
| popular sovereignty | Road to War | A Dividing Nation |
| Fort Sumter | The War Itself | The Civil War |
| Battle of Antietam | The War Itself | The Civil War |
| Siege of Vicksburg | The War Itself | The Civil War |
| Battle of Gettysburg | The War Itself | The Civil War |
| Appomattox | The War Itself | The Civil War |
| Abraham Lincoln | The War Itself | The Civil War |
| Jefferson Davis | The War Itself | The Civil War |
| Robert E. Lee | The War Itself | The Civil War |
| Ulysses S. Grant | The War Itself | The Civil War |
| William T. Sherman | The War Itself | The Civil War |
| Emancipation Proclamation | The War Itself | The Civil War |
| Gettysburg Address | The War Itself | The Civil War |
| total war | The War Itself | The Civil War |
| 54th Massachusetts | The War Itself | The Civil War |
| 13th Amendment | The War Itself | The Civil War |

**Demoted to `tier: "encounter"` (kept but not gated, ~8 terms):**
- Stonewall Jackson, Clara Barton, Stephen Douglas, Minie ball, Copperheads, USCT, Anaconda Plan, Reconstruction

**NEW terms to author (~17 from outline):**
- Ch 19: Cotton Kingdom, Industrial Revolution, Yeoman farmer, Tariff, Urbanization
- Ch 20: Slave codes, Overseer, Spirituals, Invisible institution, Resistance (overt vs. everyday), Field hand / House servant, Slave family, African retentions
- Ch 22: Union / Confederacy, Bull Run

**Final vocab target:** ~40 must-know + ~8 encounter = ~48 total (was 49).

---

## Phases (each phase is shippable, in order)

### Phase 1 — Vocab restructure (no content rewrites yet)
Just move terms between categories and rename the categories themselves. Builds the new gating skeleton without breaking anything.

- [ ] Update `unit.categoryQuestions` keys to the 4 new chapter names
- [ ] Re-tag `category` on each surviving vocab term
- [ ] Demote 8 terms to `tier: "encounter"`
- [ ] Re-tag practice questions' `topic` field (or stub to "TBD" so they don't show until audited)
- [ ] Re-tag fillInBlankSentences `category` field
- [ ] Verify the site still loads end-to-end and home cards aren't blocked

**Risk:** Practice question filtering will go weird until Phase 5 since topics won't match. Mitigation: temporarily set every practice question topic to whatever its term's new category is, so something always shows.

### Phase 2 — New vocab authoring
Author the 17 new terms with definitions, examples, categories. Re-use the downloader for new images.

- [ ] Write 17 definitions (~15-20 words each, matching last session's tightening)
- [ ] Write 17 example sentences (carry historical context — moves to More toggle on flashcard)
- [ ] Source Wikimedia images for ~12 of them (skip pure abstracts)
- [ ] Run `download-vocab-images.py` to localize
- [ ] Re-author 1-2 displaced existing definitions if a new term reframes them (e.g., "plantation economy" might want a tweak now that "Cotton Kingdom" exists alongside)

### Phase 3 — Textbook rewrite
Re-author `textbook.json` from 3 segments → 4 segments matching the new chapters, sourced from the 4 PDFs.

- [ ] Read all 4 chapter PDFs (delegate to subagent — they fit comfortably in one read pass)
- [ ] Re-author each segment at standard 8th-grade reading level (~600-800 words each)
- [ ] Maintain the 3 reading levels per segment (basic / standard / advanced) that the textbook activity supports
- [ ] Embed must-know terms naturally so the term-to-section map (used by flashcards' "Read in textbook" link) keeps working
- [ ] Verify each chapter answers its 3 essential questions from the outline

### Phase 4 — Typing passages
Re-author the 3 typing passages → 4 passages, one per chapter, weighted to feature must-know terms in context.

- [ ] One passage per chapter (~200-300 words, matching westward-expansion convention)
- [ ] Each passage exercises 6-8 must-know terms from its chapter
- [ ] Verify reading level (8th grade target)

### Phase 5 — Practice question audit
Audit all 50 practice questions against the new 4-chapter structure.

- [ ] Tag each existing question: KEEP, REWRITE, or DROP
- [ ] For KEEP: confirm topic matches new category name
- [ ] For REWRITE: revise wording to match new framing, retag topic
- [ ] For DROP: remove
- [ ] Author replacements to hit ~12-13 questions per chapter (50ish total)
- [ ] Maintain "Connections" topic for cross-chapter questions (gated behind all 4 mastered)

### Phase 6 — Short-answer rewrite
Currently 5 questions (3 category + 2 connection). New structure wants 6 (one per chapter + 2 connection) or stay at 5 and just retag. Outline's connecting questions give us 5 strong cross-chapter prompts to draw from.

- [ ] Decide: 6 (4 chapter + 2 connection) or stay at 5 (4 chapter + 1 connection)?
- [ ] Author chapter-level prompts mapping to each chapter's essential questions
- [ ] Author connection prompts from the outline's 5 unit-level questions

### Phase 7 — Timeline audit
Currently 11 events. The chronology doesn't change — events stay accurate. But the chapter assignment changes.

- [ ] Tag each event with its new chapter so the timeline activity can group correctly
- [ ] Add 1-2 events that the new framing emphasizes (e.g., 1808 slave trade ban, 1850 Compromise, Bull Run if missing)
- [ ] Verify dates against the chapter PDFs

### Phase 8 — Reflection prompts + historicalFlavor sweep
- [ ] Reflection prompts: re-tone for the 4-chapter framing (currently 12 generic; some are still relevant). Add prompts that map to the 4 unit-level connecting questions.
- [ ] historicalFlavor: audit the 16 quotes — most are still good; verify attributions still hit terms or figures in scope. Same for 16 fun facts.
- [ ] Update CLAUDE.md memory with the new category names

### Phase 9 — Smoke test + cleanup
- [ ] Walk through every activity on the unit: home → flashcards → textbook → games → leaderboard
- [ ] Verify mastery gating works in the new order
- [ ] Verify deep-link from flashcards to textbook still resolves
- [ ] Update version, ship.

---

## Open questions — RESOLVED 2026-05-08

1. **William Lloyd Garrison** → Ch 21 (A Dividing Nation)
2. **plantation economy** → rename to "Plantation"
3. **Field hand / House servant** → two separate terms
4. **Bull Run** → add as new must-know if Ch 22 PDF supports it (decide during Phase 3 textbook read)
5. **Reconstruction** → DROP entirely. Future Reconstruction unit will handle it.

This nudges the demoted-to-encounter list down from 8 → 7 (Reconstruction gone).
And nudges the new-terms list slightly: Bull Run is provisional pending the PDF.

---

## Estimated effort

- Phase 1: 30 min (mechanical re-tagging)
- Phase 2: 90 min (17 new terms + image sourcing + downloader)
- Phase 3: 2-3 hours (read PDFs, author 4 segments at 3 reading levels each)
- Phase 4: 60 min (4 typing passages)
- Phase 5: 90 min (50-question audit + replacements)
- Phase 6: 30 min
- Phase 7: 30 min
- Phase 8: 30 min
- Phase 9: 30 min

**Total: ~10 hours of focused work**, but every phase ships standalone so the unit is never broken between sessions.
