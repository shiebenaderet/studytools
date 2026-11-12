# Textbook: Marking Key Terms and Adding Quote Portraits (Nov 11, 2026)

Two ideas from the teacher after reading Unit 3's leveled readings:

1. Important words that are not tested vocabulary should be marked in some way. The science
   team uses a SIOP color code: noun red, verb green, adjective blue, adverb orange.
2. Add quotations with pictures of the people who said them, to make the readings richer.

Nothing here is built. Each part needs a decision first.

## Findings

**How vocabulary is marked now.** A section lists its tested words in `vocabTerms`. The
engine finds those words in the text when the page is drawn and wraps each one in a
`.tb-vocab` span (dotted underline, tap for the definition). The reading text itself carries
`<strong>` around a term's first use. Because the wrapping happens at draw time, it works on
all four reading levels and on Read More without editing any text.

**That same method fits key terms.** A second list per section, for example `keyTerms`, could
mark names, places, events and documents (Daniel Shays, Springfield, Northwest Territory,
Virginia Plan). No reading text would change, so highlights and reading progress are safe,
and every level gets the marks at once.

**Bold should stay for tested vocabulary.** If key terms were also bold, a student could not
tell which words open a definition and which are on the quiz. A key term needs its own look.

**Color alone will not work for everyone.** About 1 in 12 boys has trouble telling red from
green, which are the noun and verb colors. Any color code needs a second signal, such as a
different underline per part of speech or a small label on tap. The colors also have to hold
up in the site's dark theme and next to the yellow highlighter.

**Part of speech is unevenly spread in history text.** Nearly every key term in these
readings is a noun (a person, place, event or document), so a strict color code would turn
most marks red. The code says more on the tested vocabulary, which includes verbs (ratify,
cede, veto) and adjectives (bicameral, legislative, judicial).

**Quote boxes exist already.** A section can carry one `primarySource` with `text` and
`attribution`; it draws as a "Primary Source" box under the reading. Only one Unit 3 section
uses it (the Preamble). It has no picture and is the same at every reading level.

**The quotations are already chosen.** Each Deep reading now has one to three real
quotations, and most Read More panels have one. A portrait box would reuse those.

**Not every speaker has a free picture.** Portraits of the founders, John Marshall,
Susan B. Anthony and Little Turtle are in the public domain. Photos of Billy Frank Jr.,
Mary Beth Tinker and Justice Abe Fortas are modern and mostly under copyright, so those
sections would need a public-domain or government photo, or no portrait.

## Proposal A: Key Terms

- Add `keyTerms` to a section: a list of `{ "term": "...", "note": "..." }`, where the note
  is one plain sentence saying who or what it is.
- The engine marks them the way it marks vocabulary, with a different look (no bold; a solid
  thin underline in a second color). Tapping shows the note in the same small card.
- Key terms are not added to flashcards, games or quizzes.
- The content checker reports a key term that does not appear in the section's text at a
  level, and one that duplicates a vocabulary word.

**Size:** engine, small (reuses `_highlightVocab` and the popup). Content, medium: about 4
to 6 terms and notes for each of 17 sections. README and Teacher Guide updates.

## Proposal B: Part-of-Speech Colors

- Add an optional `pos` to each vocabulary word and key term (`noun`, `verb`, `adjective`,
  `adverb`).
- Add a **Word colors** switch to the textbook's top bar, off by default. When it is on,
  marked words take the science team's colors, each with its own underline style, and the
  tap card names the part of speech.
- Only marked words are colored. Coloring every word in a passage would need an automatic
  tagger, which makes mistakes a teacher would have to proofread across about 60 texts.

**Size:** engine, small to medium (switch, saved per student, four styles in both themes).
Content, small: tag 50 vocabulary words plus the key terms.

## Proposal C: Quote Portraits

- Let `primarySource` take an `image` (`src`, `credit`) and a plain-words line (`means`),
  and let a section have more than one.
- Draw the portrait as a small round picture beside the quotation, with the speaker's name,
  the year and where the words come from.
- Show the box at every level, with the `means` line shown at Quick and Clear, so the
  quotation is not only for Deep.
- Portraits come from the Library of Congress, the National Archives and the National
  Portrait Gallery's open-access images, scaled to about 300 px.

**Size:** engine, small. Content, medium: one quotation and portrait per section (17), each
with a source record and rights line for the teacher to vet, as with the section images.

## Decisions for the Teacher

1. **Key terms (A):** build it? If yes, should a tap show a one-line note, or should the
   mark be visual only?
2. **Colors (B):** how does the science team use the code: on every word of a sentence, or
   on word-wall and vocabulary words? That decides whether marked words are enough.
3. **Colors on or off by default?** The plan says off, so the page stays calm for students
   who do not want it.
4. **Portraits (C):** show the quote box at every level, or at Full and Deep only?
5. **Speakers without a free picture** (Billy Frank Jr., Mary Beth Tinker, Abe Fortas): use
   a document image in place of a portrait, or skip the picture for those three?
6. **Order:** all three, or start with one? A and C are independent. B depends on A if key
   terms should be colored too.

## Not Changing

- The reading text, section ids and headings.
- How vocabulary works in flashcards and games.
- The privacy promise: all images are stored in the repository, nothing loads from another
  site.

## Built on Nov 11: What Shipped and What to Check

The teacher chose: quote boxes at every level, a portrait where a free one exists and the name alone where it does not, and a link to a trustworthy source on every quotation. Key terms, the Word colors switch and pronunciation guides were built the same day (see the changelog).

Each quotation below was matched word for word against its source page on Nov 11. Four pages (the three Founders Online letters and the University of Michigan pamphlet) block automated readers and were read through a page-extraction service, so each of those deserves one click. Portrait rights were read from the museum or Wikimedia Commons record, not from a signed statement.

| Section | Who | Source to click | Portrait |
|---|---|---|---|
| A Government Afraid of Power | Articles of Confederation | [The Avalon Project, Yale Law School](https://avalon.law.yale.edu/18th_century/artconf.asp) | none, name only |
| Cracks in the Confederation | George Washington | [Founders Online, National Archives](https://founders.archives.gov/documents/Washington/04-04-02-0286) | Gilbert Stuart, The Metropolitan Museum of Art |
| Philadelphia, 1787 | Thomas Jefferson | [Founders Online, National Archives](https://founders.archives.gov/documents/Jefferson/01-12-02-0075) | Rembrandt Peale, White House Collection |
| Two Plans and the Great Compromise | Benjamin Franklin | [The Avalon Project, Yale Law School](https://avalon.law.yale.edu/18th_century/debates_630.asp) | Joseph Siffred Duplessis, The Metropolitan Museum of Art |
| Compromises Over Slavery | Gouverneur Morris | [The Avalon Project, Yale Law School](https://avalon.law.yale.edu/18th_century/debates_808.asp) | Pierre Henri, The Metropolitan Museum of Art |
| We the People | Preamble to the Constitution | [National Archives](https://www.archives.gov/founding-docs/constitution-transcript) | none, name only |
| Seven Articles, Three Branches | Montesquieu | [The Founders’ Constitution, University of Chicago Press](https://press-pubs.uchicago.edu/founders/documents/v1ch17s9.html) | After Jacques-Antoine Dassier, Palace of Versailles |
| Choosing a President | James Wilson | [The Avalon Project, Yale Law School](https://avalon.law.yale.edu/18th_century/debates_904.asp) | Jean Pierre Henri Elouis, Smithsonian American Art Museum |
| Sharing Power With the States | James Madison | [The Avalon Project, Yale Law School](https://avalon.law.yale.edu/18th_century/fed45.asp) | none, name only |
| Checks and Balances | John Marshall | [Legal Information Institute, Cornell Law School](https://www.law.cornell.edu/supremecourt/text/5/137) | none, name only |
| Nations Within a Nation | Henry Knox | [Founders Online, National Archives](https://founders.archives.gov/documents/Washington/05-02-02-0357-0002) | Charles Peale Polk, National Portrait Gallery, Smithsonian |
| The Supreme Law of the Land | Treaty of Medicine Creek | [Washington Governor’s Office of Indian Affairs](https://goia.wa.gov/resources/treaties/treaty-medicine-creek-1854) | none, name only |
| The Treaty of Greenville | Treaty of Greenville | [The Avalon Project, Yale Law School](https://avalon.law.yale.edu/18th_century/greenvil.asp) | none, name only |
| The Great Debate | Mercy Otis Warren | [Evans Early American Imprint Collection, University of Michigan Library](https://quod.lib.umich.edu/e/evans/N16431.0001.001/1:2?rgn=div1;view=fulltext) | John Singleton Copley, Museum of Fine Arts, Boston |
| Changing the Constitution | George Mason | [The Avalon Project, Yale Law School](https://avalon.law.yale.edu/18th_century/debates_611.asp) | none, name only |
| The Bill of Rights | Abe Fortas | [Legal Information Institute, Cornell Law School](https://www.law.cornell.edu/supremecourt/text/393/503) | none, name only |
| Widening We the People | Susan B. Anthony | [Federal Judicial Center](https://www.fjc.gov/sites/default/files/trials/susanbanthony.pdf) | Frances Benjamin Johnston, Library of Congress |

**Left out on purpose**

- **George Mason portrait.** The only copy found has no holding institution on its record, so his box shows his name alone. Gunston Hall or the Virginia Museum of History and Culture may have a documented one.
- **Little Turtle.** A speech of his at the Greenville council was found ("I have now informed you of the boundaries of the Miami nation, where the Great Spirit placed my forefather a long time ago, and charged him not to sell, or part with his lands, but to preserve them for his posterity."). It was verified only in an 1847 reprint whose link is a 20 MB book file, and the one portrait found has no stated origin. The Greenville box uses the treaty’s Article 5 for now. Swap in his words once the American State Papers page at the Library of Congress can be linked.
- **James Madison and John Marshall** have no portrait in their boxes because each is already the section’s main picture.
- **Justice Abe Fortas** has no clearly free portrait.

**Wording corrected to match the sources.** Three quotations in the Deep readings were written from memory and differed slightly from the sources: Washington ("Influence is no government," lower case), Knox (capital letters in "Soil," "Conquest" and "War") and Anthony (commas, and "this Union"). They now match. Every "What Historians Argue" paragraph was audited later the same day (see `2026-11-11-unit3-historians-audit.md`). The other quotations in the readings and Read More panels were audited too; the record is in the same file.
