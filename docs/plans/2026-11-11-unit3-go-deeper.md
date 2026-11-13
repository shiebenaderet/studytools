# Unit 3 Go Deeper Links: Plan and Vetting Table (Nov 11, 2026)

Unit 3, Building a Government, has no Go Deeper links yet. This file proposes 32, about 6 per
category, in the order of preference in `CLAUDE.md` step 4. **None of them is in
`config.json`.** Every link needs the teacher's OK first. The proposed `goDeeper` value is at
the end of this file, ready to paste once the links are vetted.

## Decisions for the Teacher

1. **Vet each link** in the tables below. Strike any you do not want; a category works with
   fewer than 6.
2. **Haudenosaunee video (Inside the Constitution).** It states as fact that the Confederacy
   shaped the Constitution, which historians dispute. Keep, drop, or keep with a note in class.
3. **Treaty of Greenville link.** The National Park Service article is by an Odawa historian.
   Only one paragraph is about the treaty, and it describes violence, including the
   Gnadenhutten massacre. Keep or drop.
4. **Britannica Kids "Anti-Federalists."** It says the Anti-Federalists' party "eventually
   became the Democratic Party," which is a simplification. Keep or swap for a spare.
5. **TED-Ed links (3).** They sit on ed.ted.com but play through YouTube, so they may be
   blocked at school. Keep as home links, or drop.
6. **Since Time Immemorial.** The OSPI page is a teacher hub, so it is not in the student
   list. Say if you want a specific lesson page linked.

## Size

Small. Once the links are approved: paste the array into `config.json`, run the content
check, bump the version, add a changelog entry. One commit.

## What "Opened" Means Here

Every link loaded on Nov 11, 2026, from the teacher's computer, not a school network. School
filtering was not tested. No video was watched and no interactive was run. "Opened" means one
of these:

- **page + metadata**: the page returned HTTP 200 and its title, description, grade tags and (where shown) the video duration were read from the page source. PBS LearningMedia pages render the player with JavaScript, so the player itself was not seen. PBS LearningMedia links redirect to the local station subdomain (here `kcts9.pbslearningmedia.org`); the `www` address is kept in the JSON.
- **full text read**: the article text was fetched and read or summarized.
- **via extraction service**: Britannica Kids and the Smithsonian block plain automated requests (HTTP 403 "Just a moment" / "request verification"). They were opened through a rendering fetch service instead, which returned the full article text with no login prompt in the way. A school Chromebook should behave like a normal browser, but check these on one.

Lengths come from the page's own duration field, rounded to the nearest minute.

## 1. Why the Articles Failed (6)

| Link title | URL | Source | Opened? | What the teacher should check |
|---|---|---|---|---|
| The Complexities of the Articles of Confederation | https://www.pbslearningmedia.org/resource/the-complexities-articles-confederation-gallery/the-american-revolution/ | Ken Burns in the Classroom (PBS LearningMedia), tagged grades 6-8 and 9-12 | Yes, page + metadata. It is a media gallery (several clips plus a lesson with primary sources and a simulation). Clip lengths not visible. | That the clips play without sign-in and how long each is. The page is built as a teacher lesson, so decide whether students landing on it will know to just watch the clips. No `minutes` set for this reason. |
| The Birth of American Government: Independence, the Articles, and the Constitution | https://www.pbslearningmedia.org/resource/birth-of-american-government-video/georgia-stories/ | Georgia Stories (PBS LearningMedia), grades 6-8 and 9-12 | Yes, page + metadata. Video, 8:51. | Made for Georgia students, so part of it is Georgia's role. Watch to see whether the Georgia material is a distraction. |
| The Constitution, the Articles, and Federalism | https://www.youtube.com/watch?v=bO7FQsCcbD8 | Crash Course US History #8 | Yes, page + metadata. 13:04. | YouTube, so home only. Fast, high school pace, the usual Crash Course jokes. Covers all of Unit 3, not just this chapter. |
| Shays's Rebellion | https://www.americanyawp.com/text/06-a-new-nation/#II_Shayss_Rebellion | The American Yawp, ch. 6 sec. II | Yes, full text read. Anchor id confirmed in the page's table of contents. | College prose (marked challenge). Confirm the anchor jumps to the section on a Chromebook. |
| A Confederation of Native Peoples Seeks Peace with the United States, 1786 (full text) | https://www.americanyawp.com/reader/a-new-nation/a-confederation-of-native-peoples-seek-peace-with-the-united-states-1786/ | The American Yawp Reader | Yes, full text read. Speech of the United Indian Nations to Congress, about 900 to 1,000 words, with a short intro. | Overlooked-voices link for this chapter: Native nations north of the Ohio asking Congress to stop surveying their land, the same land the Northwest Ordinance organized. 18th-century diplomatic prose, hard (marked challenge). The Yawp's own title says "seek"; the JSON title says "Seeks". |
| Articles of Confederation | https://kids.britannica.com/kids/article/Articles-of-Confederation/352788 | Britannica Kids | Yes, via extraction service. Full article visible (3 short paragraphs), no login needed for the text. | Very short and easy. Page carries ads, a "Subscribe" banner and subscriber-only Read Aloud buttons. Confirm it opens from a school device. |

Spares that were opened and are fine to swap in: Britannica Kids "Shays's Rebellion" (https://kids.britannica.com/kids/article/Shayss-Rebellion/627259, full text visible, 4 paragraphs); National Archives "Northwest Ordinance (1787)" milestone document (https://www.archives.gov/milestone-documents/northwest-ordinance, 200).

## 2. Compromises in Philadelphia (6)

| Link title | URL | Source | Opened? | What the teacher should check |
|---|---|---|---|---|
| Compromise and the Constitution of the United States | https://www.pbs.org/video/compromise-and-constitution-united-states-iezxca/ | Ken Burns, Benjamin Franklin (PBS) | Yes. Page says "Clip: Episode 2, 6m 36s". No expiry date and no statement that Passport is required; the page does carry the usual Passport promotion. A transcript of the clip found in search covers the Great Compromise and the Three-Fifths Compromise, with historians calling it "a tragic compromise". | That it plays without Passport or sign-in on a school device. Watch it: slavery is discussed frankly ("America's original sin"). |
| Debating Slavery at the Constitutional Convention | https://www.pbslearningmedia.org/resource/adlit08.ush.rev.slavery/debating-slavery/ | Africans in America (PBS LearningMedia), grades 3-5, 6-8, 9-12 | Yes, page + metadata. Video, 1:05. PBS's own title is just "Debating Slavery". | Only one minute long. Decide whether it is worth a slot. Overlooked-voices link for this chapter (see gaps). |
| The Making of the American Constitution | https://ed.ted.com/lessons/who-made-the-american-constitution-judy-walton | TED-Ed, Judy Walton | Yes, page + metadata. 3:58. Transcript read in search results. | The video is a YouTube embed on ed.ted.com, so it may be blocked at school. It is about the secrecy and gamble of the convention, not the Virginia and New Jersey plans in detail. |
| The Constitutional Convention | https://www.americanyawp.com/text/06-a-new-nation/#III_The_Constitutional_Convention | The American Yawp, ch. 6 sec. III | Yes, full text read. Covers the Virginia Plan, Great Compromise and Electoral College. Anchor confirmed. | College prose (marked challenge). |
| Rights and Compromises: Slavery in the Constitution | https://www.americanyawp.com/text/06-a-new-nation/#V_Rights_and_Compromises | The American Yawp, ch. 6 sec. V | Yes, full text read. Covers the Bill of Rights as a compromise, the three-fifths clause and the slave trade protected until 1808. Anchor confirmed. | The Yawp's heading is only "Rights and Compromises"; the subtitle was added. The section also covers the Bill of Rights, so it overlaps chapter 5. |
| Constitutional Convention | https://kids.britannica.com/kids/article/Constitutional-Convention/627434 | Britannica Kids | Yes, via extraction service. Full article visible (4 short paragraphs). | Short, and mentions the compromises in one sentence without naming them. The Students version (https://kids.britannica.com/students/article/Constitutional-Convention/394809) names the three-fifths compromise but was NOT OPENED (403 to direct fetch, not retried), so it is not in the JSON. Ads and subscribe banner as above. |

## 3. Inside the Constitution (7)

| Link title | URL | Source | Opened? | What the teacher should check |
|---|---|---|---|---|
| Foundations of the Constitution: Federalism, Separation of Powers, Checks and Balances | https://www.pbslearningmedia.org/resource/civ23-soc-foundconstitution/foundations-of-the-constitution-the-constitution-explained/ | The Constitution EXPLAINED, iCivics and Center for Civic Education (PBS LearningMedia), grades 6-8 and 9-12 | Yes, page + metadata. Video, about 2 min. | PBS's title is "Foundations of the Constitution"; the subtitle was added. Plays without sign-in? |
| Explaining the Electoral College | https://www.pbslearningmedia.org/resource/electoral-college-explainer-video/wviz-politics-on-point/ | Politics on Point, WVIZ (PBS LearningMedia), grades 6-8 | Yes, page + metadata. Video, 3:08. | Any present-day election framing you would rather avoid. A longer alternative was also opened: "The Electoral College, Civics Made Easy" (11:25, grades 6-8 and 9-12, https://www.pbslearningmedia.org/resource/civ25-soc-the-electoral-college/civics-made-easy/), which discusses reform debates. |
| The Haudenosaunee Confederacy and the Birth of American Democracy | https://www.pbslearningmedia.org/resource/civ23-soc-haudenosauneeconfederacy/the-haudenosaunee-confederacy-the-birth-of-american-democracy/ | PBS LearningMedia, grades 6-8 and 9-12 | Yes, page + metadata. Video, 2:05. Description says the Great Law of Peace influenced Franklin's Albany Plan "and eventually contributed to the U.S. Constitution". | A specific claim to check. How much the Haudenosaunee Confederacy shaped the Constitution is debated among historians; the video states the influence as fact. Decide whether to keep it, or keep it and raise the debate in class. Overlooked-voices link for this chapter. |
| How is power divided in the United States government? | https://ed.ted.com/lessons/how-is-power-divided-in-the-united-states-government-belinda-stutzman | TED-Ed, Belinda Stutzman | Yes, page + metadata. 3:50. | YouTube embed on ed.ted.com, may be blocked at school. |
| The Constitution: What Does It Say? | https://www.archives.gov/founding-docs/constitution/what-does-it-say | National Archives | Yes, page + metadata (200). Plain-language summary of the preamble and seven articles. | Reading level is adult but plain. The page uses click-to-open accordions; check they work on a phone. |
| The Interactive Constitution: Every Clause, Explained by Scholars | https://constitutioncenter.org/the-constitution | National Constitution Center | Yes, page + metadata (200). Landing page for the full text with scholar essays per clause. | This is a section landing page, not a single article (the closest thing to a homepage in the list). Essays are law-school level, hence "challenge". The subtitle was added. Stands in for the Yawp here (see gaps). |
| Checks and Balances | https://kids.britannica.com/kids/article/checks-and-balances/646630 | Britannica Kids | Yes, via extraction service. Full article visible, with veto, impeachment-style removal and judicial review listed by branch. Has a section on parliamentary systems too. | Ads and subscribe banner. The page's interactive diagram may be a subscriber feature. |

Spares opened: "We the People and the Constitution's Preamble" (PBS LearningMedia, 2:28); "Federalism and States' Rights" (PBS LearningMedia, 2:03); "The Separation of Powers in the U.S. Government" (PBS LearningMedia, 2:33); iCivics "Branches of Power" game (https://ed.icivics.org/resources/game/74/branches-of-power, page loaded, 10 to 30 min; whether it plays without an account was not tested).

## 4. Treaties and Sovereignty (7)

| Link title | URL | Source | Opened? | What the teacher should check |
|---|---|---|---|---|
| Federal Law: The Supreme Law of the Land | https://www.pbslearningmedia.org/resource/civ23-soc-fedlaw/federal-law-the-supreme-law-of-the-land-the-constitution-explained/ | The Constitution EXPLAINED (PBS LearningMedia), grades 6-8 and 9-12 | Yes, page + metadata. Video, 2:09, on the Supremacy Clause in Article VI. | It is about federal versus state law. Whether it mentions treaties at all is unknown; watch for that. |
| Treaties and Sovereignty: An Interview with John Echohawk | https://www.pbslearningmedia.org/resource/ac76218b-3b0c-4ffa-a315-fe92eb217a72/indian-pride-treaties-and-sovereignty-part-2/ | Indian Pride (PBS LearningMedia), grades 3-5, 6-8, 9-12 | Yes, page + metadata. Video, 9:49. Interview with the director of the Native American Rights Fund on treaties from first contact to the Constitution. | PBS's title is "Indian Pride, Treaties and Sovereignty, Part 2"; it was reworded. Older studio interview, slow paced. Sound and picture quality. |
| Tribal Sovereignty Explained | https://www.youtube.com/watch?v=GgzR-RSfc9U | Crash Course Native American History #2 | Yes, page + metadata. 11:22. Transcript read in search results: quotes the Indian Commerce Clause, uses "time immemorial" (Worcester v. Georgia), and builds the episode around the Chinook Nation of Washington and Oregon. | YouTube, home only. Strong match for the chapter's vocabulary. Goes past 1800 into termination, taxes and present-day recognition fights. |
| Summer 1795: The Treaty of Greenville Creates an Uneasy Peace | https://www.nps.gov/articles/a-long-legacy.htm | National Park Service, by Eric Hemenway of the Little Traverse Bay Bands of Odawa Indians | Yes, full text read. About 700 words, plain prose, no wall. | Only one paragraph is on the treaty itself; the rest is the violence before 1795 and the road to the War of 1812. It describes killings of Native people, including the Delaware at Gnadenhutten. Read it for tone. Overlooked-voices link (Native author). |
| Medicine Creek Treaty, 1854: See the Original Document | https://americanindian.si.edu/nationtonation/medicine-creek-treaty.html | Nation to Nation, Smithsonian National Museum of the American Indian | Yes, via extraction service (direct fetch got the Smithsonian's bot check). One paragraph quoting Article 3 on fishing rights, page images of the treaty, and a link to the National Archives catalog transcript. | That the page loads on a Chromebook without a verification screen. The image viewer on a phone. The subtitle was added. |
| Stevens Treaties: Washington's Treaties and the Fight for Fishing Rights | https://kids.britannica.com/students/article/Stevens-Treaties/631907 | Britannica Students | Yes, via extraction service. The whole article was visible without login: Medicine Creek, Point Elliott, the Walla Walla Council, the Yakama War, the fish-ins and the Boldt Decision. | CLAUDE.md warns that some Students-level articles need a login; this one showed full text, but confirm from a school device and from home. Uses "Indians" throughout. The subtitle was added. |
| Treaty of Medicine Creek, 1854 (full text) | https://www.historylink.org/File/5253 | HistoryLink.org (Washington State history encyclopedia) | Yes, full text read. Short intro then all 13 articles and the signers. No ads or login; has donate and newsletter prompts. | 19th-century legal language (marked challenge). Stands in for the Yawp here (see gaps). |

Not used as student links, for you to decide:

- OSPI "Since Time Immemorial" (https://ospi.k12.wa.us/student-success/resources-subject-area/john-mccoy-lulilas-time-immemorial-tribal-sovereignty-washington-state): opened, 200. It is a teacher-facing curriculum hub, not something a student can read, so it is left out of the JSON. It links a Middle School Unit 1C on the Medicine Creek Treaty (URL seen on the page, NOT OPENED).
- "Native Civics: The Medicine Creek Treaty, 1854 to Present" (https://www.youtube.com/watch?v=WpTNifa-iBM): opened, page + metadata, 11:11, channel "Teach With TVW". Looks like the best Washington-specific video, but it is a second YouTube link, so it is a spare.
- National Archives "American Indian Treaties" (https://www.archives.gov/research/native-americans/treaties): opened, 200. A research guide for adults; the Smithsonian page above reaches the same treaty more directly.
- Other PBS LearningMedia spares opened: "Tribal Federal Recognition, Indigeneity" (2:13, grades 6-8 and 9-12); "Original Treaties, Indigi-Genius" (4:43, grades 3-5 and 6-8).

## 5. Ratification and Rights (6)

| Link title | URL | Source | Opened? | What the teacher should check |
|---|---|---|---|---|
| Amending the U.S. Constitution | https://www.pbslearningmedia.org/resource/civ23-soc-amendingconstitution/amending-the-us-constitution-the-constitution-explained/ | The Constitution EXPLAINED (PBS LearningMedia), grades 6-8 and 9-12 | Yes, page + metadata. Video, 2:18. | Plays without sign-in? |
| The History of Voting Rights (interactive timeline) | https://www.pbslearningmedia.org/resource/ush22-soc-votinghistory/the-history-of-voting-rights-interactive-timeline/ | PBS LearningMedia, grades 6-8 and 9-12 | Yes, page + metadata. Interactive timeline from ratification to current voting-rights issues. The interactive itself was not run. | That it launches without a sign-in and works on a phone. It runs up to present-day voting disputes; check the last entries for anything you would not want to field. Overlooked-voices link for "Widening We the People". |
| Why wasn't the Bill of Rights originally in the US Constitution? | https://ed.ted.com/lessons/why-wasn-t-the-bill-of-rights-originally-in-the-us-constitution-james-coll | TED-Ed, James Coll | Yes, page + metadata. 4:33. | YouTube embed on ed.ted.com, may be blocked at school. |
| The Bill of Rights: A Transcription (full text) | https://www.archives.gov/founding-docs/bill-of-rights-transcript | National Archives | Yes, page + metadata (200). | Original spelling and all 12 proposed amendments, which can confuse; the ten ratified ones are listed further down the page. |
| Ratifying the Constitution | https://www.americanyawp.com/text/06-a-new-nation/#IV_Ratifying_the_Constitution | The American Yawp, ch. 6 sec. IV | Yes, full text read. Federalists against Anti-Federalists in the state conventions. Anchor confirmed. | College prose (marked challenge). |
| Anti-Federalists | https://kids.britannica.com/kids/article/Anti-Federalists/628041 | Britannica Kids | Yes, via extraction service. Full article visible (2 short paragraphs, centered on Patrick Henry). | Very short. It says the Anti-Federalists' party "eventually became the Democratic Party", a simplification you may not want. Ads and subscribe banner. |

Spares opened: "Explore the Bill of Rights, Interactive Lesson" (PBS LearningMedia, grades 6-8 and 9-12; interactive lessons sometimes ask students for a name or sign-in to save work, not tested); National Archives "19th Amendment" and "15th Amendment" milestone documents (both 200); National Archives "Amendments 11-27" (200).

## Tally

- 32 links in the JSON: 6, 6, 7, 7, 6.
- 32 of 32 loaded. 0 marked NOT OPENED in the JSON.
- 7 of those (6 Britannica, 1 Smithsonian) loaded only through the extraction service because the sites refuse plain automated requests.
- 15 are videos. None was watched. Lengths are from page metadata for 14; the Ken Burns Articles gallery has no length.
- Dropped during checking: PBS LearningMedia "Ratifying the Constitution" reading passage (404); PBS LearningMedia "Daniel Shays's Rebellion" interactive (tagged grades 9-12 only); pbs.org "Benjamin Franklin and the Antislavery Movement" clip (404 at the address tried).

## Gaps

1. **Ken Burns on pbs.org.** The American Revolution series page lists clips only through the war; nothing on the Articles, the convention or ratification. The one Ken Burns clip on pbs.org is from Benjamin Franklin (chapter 2). Chapter 1 has a Ken Burns in the Classroom gallery on PBS LearningMedia instead. Chapters 3, 4 and 5 have no Ken Burns material; their PBS links are short LearningMedia civics videos.
2. **No PBS clip on Shays' Rebellion or the Northwest Ordinance** for grades 6-8. The only Shays resource found is tagged 9-12.
3. **No PBS video on Federalists against Anti-Federalists** or on ratification for grades 6-8. The reading passage that existed is gone (404).
4. **American Yawp has no section for chapters 3 or 4.** Chapter 6 of the Yawp does not describe the structure of the Constitution in its own section, and it never mentions the Treaty of Greenville, the Northwest Ordinance, treaties or tribal sovereignty. The National Constitution Center (chapter 3) and the HistoryLink treaty text (chapter 4) carry the challenge tag instead.
5. **Treaty of Greenville.** No PBS resource and no Britannica Kids article of its own (only a Scholars-level article and image captions were found). The NPS article is the best free piece found, and only part of it is about the treaty.
6. **Britannica Kids has no article on the Three-Fifths Compromise, the Great Compromise, or the Virginia and New Jersey plans** that turned up in search. The Kids "Constitutional Convention" article is thin on them.
7. **Overlooked voices are thinnest in chapter 2 and chapter 5.** Chapter 2 has two links about slavery at the convention, but both are historians and delegates talking about enslaved people, not Black voices of the period. Chapter 5 has the voting-rights timeline but nothing on women in the ratification debate; Britannica Kids "Mercy Otis Warren" exists (https://kids.britannica.com/kids/article/Mercy-Otis-Warren/600839) but was NOT OPENED (403 to direct fetch, not retried), so it is not in the JSON.
8. **Washington State.** Chapter 4 has three Washington links (Smithsonian, Britannica Stevens Treaties, HistoryLink) but no PBS one. The Smithsonian's Pacific Northwest Fish Wars lesson on PBS LearningMedia is tagged grades 9-12 only.


## Proposed `goDeeper` Value

```json
[
  {
    "category": "Why the Articles Failed",
    "type": "video",
    "title": "The Complexities of the Articles of Confederation",
    "source": "Ken Burns in the Classroom, PBS LearningMedia, grades 6–8",
    "url": "https://www.pbslearningmedia.org/resource/the-complexities-articles-confederation-gallery/the-american-revolution/"
  },
  {
    "category": "Why the Articles Failed",
    "type": "video",
    "title": "The Birth of American Government: Independence, the Articles, and the Constitution",
    "source": "Georgia Stories, PBS LearningMedia, grades 6–8",
    "minutes": 9,
    "url": "https://www.pbslearningmedia.org/resource/birth-of-american-government-video/georgia-stories/"
  },
  {
    "category": "Why the Articles Failed",
    "type": "video",
    "title": "The Constitution, the Articles, and Federalism",
    "source": "Crash Course US History #8",
    "minutes": 13,
    "url": "https://www.youtube.com/watch?v=bO7FQsCcbD8"
  },
  {
    "category": "Why the Articles Failed",
    "type": "reading",
    "level": "challenge",
    "title": "Shays's Rebellion",
    "source": "The American Yawp, ch. 6 sec. II",
    "url": "https://www.americanyawp.com/text/06-a-new-nation/#II_Shayss_Rebellion"
  },
  {
    "category": "Why the Articles Failed",
    "type": "reading",
    "level": "challenge",
    "title": "A Confederation of Native Peoples Seeks Peace with the United States, 1786 (full text)",
    "source": "The American Yawp Reader",
    "url": "https://www.americanyawp.com/reader/a-new-nation/a-confederation-of-native-peoples-seek-peace-with-the-united-states-1786/"
  },
  {
    "category": "Why the Articles Failed",
    "type": "reference",
    "title": "Articles of Confederation",
    "source": "Britannica Kids",
    "url": "https://kids.britannica.com/kids/article/Articles-of-Confederation/352788"
  },
  {
    "category": "Compromises in Philadelphia",
    "type": "video",
    "title": "Compromise and the Constitution of the United States",
    "source": "Ken Burns, Benjamin Franklin (PBS)",
    "minutes": 7,
    "url": "https://www.pbs.org/video/compromise-and-constitution-united-states-iezxca/"
  },
  {
    "category": "Compromises in Philadelphia",
    "type": "video",
    "title": "Debating Slavery at the Constitutional Convention",
    "source": "Africans in America, PBS LearningMedia, grades 6–8",
    "minutes": 1,
    "url": "https://www.pbslearningmedia.org/resource/adlit08.ush.rev.slavery/debating-slavery/"
  },
  {
    "category": "Compromises in Philadelphia",
    "type": "video",
    "title": "The Making of the American Constitution",
    "source": "TED-Ed, Judy Walton",
    "minutes": 4,
    "url": "https://ed.ted.com/lessons/who-made-the-american-constitution-judy-walton"
  },
  {
    "category": "Compromises in Philadelphia",
    "type": "reading",
    "level": "challenge",
    "title": "The Constitutional Convention",
    "source": "The American Yawp, ch. 6 sec. III",
    "url": "https://www.americanyawp.com/text/06-a-new-nation/#III_The_Constitutional_Convention"
  },
  {
    "category": "Compromises in Philadelphia",
    "type": "reading",
    "level": "challenge",
    "title": "Rights and Compromises: Slavery in the Constitution",
    "source": "The American Yawp, ch. 6 sec. V",
    "url": "https://www.americanyawp.com/text/06-a-new-nation/#V_Rights_and_Compromises"
  },
  {
    "category": "Compromises in Philadelphia",
    "type": "reference",
    "title": "Constitutional Convention",
    "source": "Britannica Kids",
    "url": "https://kids.britannica.com/kids/article/Constitutional-Convention/627434"
  },
  {
    "category": "Inside the Constitution",
    "type": "video",
    "title": "Foundations of the Constitution: Federalism, Separation of Powers, Checks and Balances",
    "source": "The Constitution EXPLAINED, PBS LearningMedia, grades 6–8",
    "minutes": 2,
    "url": "https://www.pbslearningmedia.org/resource/civ23-soc-foundconstitution/foundations-of-the-constitution-the-constitution-explained/"
  },
  {
    "category": "Inside the Constitution",
    "type": "video",
    "title": "Explaining the Electoral College",
    "source": "Politics on Point, PBS LearningMedia, grades 6–8",
    "minutes": 3,
    "url": "https://www.pbslearningmedia.org/resource/electoral-college-explainer-video/wviz-politics-on-point/"
  },
  {
    "category": "Inside the Constitution",
    "type": "video",
    "title": "The Haudenosaunee Confederacy and the Birth of American Democracy",
    "source": "PBS LearningMedia, grades 6–8",
    "minutes": 2,
    "url": "https://www.pbslearningmedia.org/resource/civ23-soc-haudenosauneeconfederacy/the-haudenosaunee-confederacy-the-birth-of-american-democracy/"
  },
  {
    "category": "Inside the Constitution",
    "type": "video",
    "title": "How is power divided in the United States government?",
    "source": "TED-Ed, Belinda Stutzman",
    "minutes": 4,
    "url": "https://ed.ted.com/lessons/how-is-power-divided-in-the-united-states-government-belinda-stutzman"
  },
  {
    "category": "Inside the Constitution",
    "type": "reading",
    "title": "The Constitution: What Does It Say?",
    "source": "National Archives",
    "url": "https://www.archives.gov/founding-docs/constitution/what-does-it-say"
  },
  {
    "category": "Inside the Constitution",
    "type": "reading",
    "level": "challenge",
    "title": "The Interactive Constitution: Every Clause, Explained by Scholars",
    "source": "National Constitution Center",
    "url": "https://constitutioncenter.org/the-constitution"
  },
  {
    "category": "Inside the Constitution",
    "type": "reference",
    "title": "Checks and Balances",
    "source": "Britannica Kids",
    "url": "https://kids.britannica.com/kids/article/checks-and-balances/646630"
  },
  {
    "category": "Treaties and Sovereignty",
    "type": "video",
    "title": "Federal Law: The Supreme Law of the Land",
    "source": "The Constitution EXPLAINED, PBS LearningMedia, grades 6–8",
    "minutes": 2,
    "url": "https://www.pbslearningmedia.org/resource/civ23-soc-fedlaw/federal-law-the-supreme-law-of-the-land-the-constitution-explained/"
  },
  {
    "category": "Treaties and Sovereignty",
    "type": "video",
    "title": "Treaties and Sovereignty: An Interview with John Echohawk",
    "source": "Indian Pride, PBS LearningMedia, grades 6–8",
    "minutes": 10,
    "url": "https://www.pbslearningmedia.org/resource/ac76218b-3b0c-4ffa-a315-fe92eb217a72/indian-pride-treaties-and-sovereignty-part-2/"
  },
  {
    "category": "Treaties and Sovereignty",
    "type": "video",
    "title": "Tribal Sovereignty Explained",
    "source": "Crash Course Native American History #2",
    "minutes": 11,
    "url": "https://www.youtube.com/watch?v=GgzR-RSfc9U"
  },
  {
    "category": "Treaties and Sovereignty",
    "type": "reading",
    "title": "Summer 1795: The Treaty of Greenville Creates an Uneasy Peace",
    "source": "National Park Service, by Eric Hemenway (Little Traverse Bay Bands of Odawa Indians)",
    "url": "https://www.nps.gov/articles/a-long-legacy.htm"
  },
  {
    "category": "Treaties and Sovereignty",
    "type": "reference",
    "title": "Medicine Creek Treaty, 1854: See the Original Document",
    "source": "Nation to Nation, Smithsonian National Museum of the American Indian",
    "url": "https://americanindian.si.edu/nationtonation/medicine-creek-treaty.html"
  },
  {
    "category": "Treaties and Sovereignty",
    "type": "reference",
    "title": "Stevens Treaties: Washington's Treaties and the Fight for Fishing Rights",
    "source": "Britannica Students",
    "url": "https://kids.britannica.com/students/article/Stevens-Treaties/631907"
  },
  {
    "category": "Treaties and Sovereignty",
    "type": "reading",
    "level": "challenge",
    "title": "Treaty of Medicine Creek, 1854 (full text)",
    "source": "HistoryLink.org",
    "url": "https://www.historylink.org/File/5253"
  },
  {
    "category": "Ratification and Rights",
    "type": "video",
    "title": "Amending the U.S. Constitution",
    "source": "The Constitution EXPLAINED, PBS LearningMedia, grades 6–8",
    "minutes": 2,
    "url": "https://www.pbslearningmedia.org/resource/civ23-soc-amendingconstitution/amending-the-us-constitution-the-constitution-explained/"
  },
  {
    "category": "Ratification and Rights",
    "type": "reference",
    "title": "The History of Voting Rights (interactive timeline)",
    "source": "PBS LearningMedia, grades 6–8",
    "url": "https://www.pbslearningmedia.org/resource/ush22-soc-votinghistory/the-history-of-voting-rights-interactive-timeline/"
  },
  {
    "category": "Ratification and Rights",
    "type": "video",
    "title": "Why wasn't the Bill of Rights originally in the US Constitution?",
    "source": "TED-Ed, James Coll",
    "minutes": 5,
    "url": "https://ed.ted.com/lessons/why-wasn-t-the-bill-of-rights-originally-in-the-us-constitution-james-coll"
  },
  {
    "category": "Ratification and Rights",
    "type": "reading",
    "title": "The Bill of Rights: A Transcription (full text)",
    "source": "National Archives",
    "url": "https://www.archives.gov/founding-docs/bill-of-rights-transcript"
  },
  {
    "category": "Ratification and Rights",
    "type": "reading",
    "level": "challenge",
    "title": "Ratifying the Constitution",
    "source": "The American Yawp, ch. 6 sec. IV",
    "url": "https://www.americanyawp.com/text/06-a-new-nation/#IV_Ratifying_the_Constitution"
  },
  {
    "category": "Ratification and Rights",
    "type": "reference",
    "title": "Anti-Federalists",
    "source": "Britannica Kids",
    "url": "https://kids.britannica.com/kids/article/Anti-Federalists/628041"
  }
]
```

## Approved (Nov 12, 2026)

The teacher approved all 32 links on Nov 12, and they were added to the unit's `goDeeper` list in 8.55.93.
