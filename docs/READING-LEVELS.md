# Reading levels: Quick, Clear, Full, Deep

The one definition of the four reading levels used across Mr. B's course sites and
handouts (ams, ams-planning, colonial-unrest, revolutionaryvoices, studytools).
Approved Oct 15 2026. Every copy of this file should be identical; change it
everywhere at once or not at all.

## The rule

The names describe the **text**, never the reader. A name always means the same
difficulty. Renaming never moves a text to a different level, and a text that
measures outside its level is rewritten, not relabeled.

## The four levels

| Name | Old label | Shared name (teacher notes) | What the text is like | Reader band | Lexile | Measured grade (FK) | Sentences |
|---|---|---|---|---|---|---|---|
| **Quick** | Level 0 | Most Support ★ | Short sentences. Key words explained. | gr 2–3 | 600–799L | about 2–4 | about 5–10 words |
| **Clear** | Level 1 | Some Support ★★ | Plain words, a little more detail. | gr 5–6 | 800–1009L | about 5–6.5 | about 10–15 words |
| **Full** (default) | Level 2 | Standard ★★★ | The grade-level reading. | gr 7–8 | 1010–1184L | about 8–9.5 | about 14–20 words |
| **Deep** | Level 3 | Challenge ★★★★ | Adds real quotes from the time and what historians argue. | 8+ | 1185L+ | above Full | varied, longer |

The blurbs in the "What the text is like" column are the student-facing blurbs.
Use them word for word on level pickers.

## How the measured grade is checked

Flesch–Kincaid grade, computed the same way in every repo (`check-levels` in each
repo; the formula and syllable counter are copied, not reinvented):

- Strip HTML tags and text in parentheses (glosses), then split sentences on
  `. ! ?` followed by a space or the end; ignore fragments of two words or fewer.
- Syllables: lowercase letters only; words of three letters or fewer count 1;
  drop a final silent `-es`, `-ed` or `-e` (not after `l`); drop a leading `y`;
  count groups of one or two vowels (`aeiouy`).
- FK grade = 0.39 × words/sentence + 11.8 × syllables/word − 15.59.

Limits a check enforces, per reading:

| Level | Fails above |
|---|---|
| Quick | 5.0 |
| Clear | 7.5 |
| Full | 10.5 |
| Deep | must measure higher than that topic's Full |

The four levels of one topic must also step up: Quick < Clear < Full < Deep.

History texts measure a little high on FK (names and terms like *Massachusetts*
and *Parliament* count as long words), which is why the limits sit above the
targets. Lexile bands are from the handout standard and stay as they are.

## What changes and what doesn't

- **Changes:** what students see (pickers, tabs, headers, blurbs, prose such as
  "the Quick reading", "read at Deep") and teacher docs.
- **Doesn't change:** file names, URLs, anchors, CSS classes, data keys
  (`mostSupport`, `l0`, `level0`, `g2`, `?level=0`), localStorage keys, audio
  folders. Canvas links, saved work and recordings point at them.
- Printed handouts carry the name alone in the header ("Full"), small, Title Case,
  no letter-spacing. File names add " - Full" etc. for new files; existing files
  keep their names.
- In prose: "the Quick reading", "Quick and Clear readings", "read at Deep". Never
  "Quick readers" or "Deep students".
- "Level 3" on the outcome scale (1 Beginning to 4 Exemplary) is a different
  thing and keeps its number.
- A site with only three tiers names each tier by the band its text actually
  measures at. It does not assume its easiest tier is Quick.
