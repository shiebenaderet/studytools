<div align="center">

# 📚 Study Tools Platform

**A free, open-source study tool for students — flashcards, quizzes, games, and more.**

Built for GitHub Pages. Powered by a single config file. No coding required to customize.

[![Live Site](https://img.shields.io/badge/Live_Site-study.mrbsocialstudies.org-1669C5?style=for-the-badge&logo=google-chrome&logoColor=white)](https://study.mrbsocialstudies.org)
[![License](https://img.shields.io/badge/License-Educational_Use-22c55e?style=for-the-badge)](#license)
[![Version](https://img.shields.io/badge/Version-8.8.3-f59e0b?style=for-the-badge)](#)

---

**Are you a teacher?** Fork this repo and make it your own — any subject, any grade level.

👉 **[Teacher Setup Guide](docs/TEACHER-GUIDE.md)** — step-by-step instructions, no coding experience needed.

</div>

---

## ✨ What Students Get

### 📖 Study
| Activity | Description |
|----------|-------------|
| **Learn Mode** | Guided study sessions inspired by Seneca Learning. Short interactive slides with adaptive depth (3 tiers), pre/post assessments, reflection prompts, Wiki Writer bonus challenge, 1.5x points multiplier |
| **Textbook** | Interactive reading with 3 reading levels (Easier/On Grade/Challenge), collapsible sidebar navigation, vocab highlighting, primary source quotes, Key Idea callouts, Quick Checks, and reading progress tracking |
| **Flashcards** | Anki-style spaced repetition with 3D flip animation, confidence rating, "Make Your Own Example", vocab tiers (must-know/encounter/bonus), and "Read in textbook" deep-links |
| **Short Answer** | Visual card-based question selector with topic images, color-coded categories, and key term chips |
| **Source Analysis** | Primary source analysis using the SIFT method with scoring |
| **Typing Practice** | Monkeytype-inspired typing with full passages and per-term snippets |
| **Resource Library** | Searchable vocabulary reference with mastery indicators, Wikipedia, Kids Wiki, and YouTube links |
| **How to Study** | Interactive study strategies page with comprehension quiz and Study Smart badge |

### 📝 Practice
| Activity | Description |
|----------|-------------|
| **Practice Test** | 10-question mastery loop — tracks progress across sessions until every question answered correctly; wrong answers feed back to flashcards |
| **Fill-in-the-Blank** | One-at-a-time stepper with word bank or type-it mode |
| **Timeline** | Drag events into chronological order with shuffle, remove, and challenge mode |

### 🎮 Games
| Activity | Description |
|----------|-------------|
| **Sort It Out** | Sort terms into category buckets with streak bonuses and speed timer (1.25x analysis tier) |
| **Who Am I?** | Guess the term from progressive clues — fewer clues = more points (1.25x analysis tier) |
| **Four Corners** | Find the odd one out — 3 terms share a category, 1 does not belong (1.25x analysis tier) |
| **Map Quiz** | Click-on-the-map geography quiz with 3-strike hint system. Includes 1861 States & Territories map with Learn/Quiz modes and Union/Confederate/Border/Territory color-coding |
| **Lightning Round** | 60-second speed quiz with leaderboard |
| **Crossword** | Auto-generated crossword from vocabulary |
| **Quiz Race** | Timed 1v1 same-screen quiz race with leaderboard |
| **Wordle** | Guess the vocabulary term in 6 tries with definition clues |
| **Tower Defense** | 3D tower defense — answer vocab to earn coins, build towers, survive 10 waves |
| **Flip Match** | Memory matching — pair terms to definitions |
| **Hangman** | Classic word guessing with definitions |
| **Term Catcher** | Catch the falling correct term |

---

## 🧠 Smart Learning

- **Cross-activity weakness tracking** — wrong answers feed a shared tracker that surfaces weak terms across Flashcards, Practice Test, Fill-in-the-Blank, Lightning Round, and Typing Practice
- **Auto study time tracking** — time in activities counts automatically; pauses on inactivity or hidden tab
- **Mastery gating** — Read > Study > Practice > Play flow: students read the textbook chapter before flashcards unlock, then master terms to unlock games. Vocabulary tiers (must-know/encounter/bonus) focus study on tested terms
- **Achievement system** — unlockable badges with confetti for milestones
- **Guest mode** — parents and visitors can browse without entering a name

---

## 🏗️ Platform Features

<table>
<tr>
<td width="50%">

**For Students**
- Dark/light theme with Outfit font
- Settings gear with theme toggle, dyslexic font, and search
- Command palette (`/` or `Cmd+K`)
- OpenDyslexic font toggle
- Study timer, notes, printable guide
- Music player with auto-shuffle, loop, playlist
- Deep linking to activities (`#activity-name`)
- Progress tracking (local + optional cloud sync)
- Personalized welcome screen and progress stats

</td>
<td width="50%">

**For Teachers**
- Config-driven — one JSON file powers everything
- Hidden teacher dashboard (via command palette)
- Student progress table with edit/delete
- Leaderboard with teacher approval
- Class-vs-class competition view
- Analytics: activity popularity, weak topics
- Privacy-first — [see privacy policy](study-tools/engine/privacy.html)

</td>
</tr>
</table>

---

## 📁 Project Structure

```
study-tools/
├── engine/                 # The app (don't need to edit)
│   ├── css/styles.css      # Theming via CSS custom properties
│   ├── js/core/            # App shell, progress, mastery, leaderboard
│   ├── js/activities/      # One file per activity (plugin system)
│   ├── tools/              # Study tools (notes, timer, music, export)
│   ├── vendor/             # Self-hosted fonts, icons, Supabase SDK
│   └── index.html          # Main app shell
├── units/                  # Your content goes here
│   ├── units.json          # Unit manifest
│   └── early-republic/     # Example unit (complete reference)
│       └── config.json     # Vocabulary, questions, timeline, theme
├── dashboard/              # Teacher dashboard (standalone)
└── database/               # Supabase schema + migrations
```

> **To customize content**, you only edit files in `units/`. The engine reads your `config.json` and builds everything automatically.

---

## 🚀 Quick Start

### For teachers (no coding)

1. **Fork** this repo
2. Run `./setup.sh` to remove the example content and start fresh
3. Add your own vocabulary and questions to a `config.json` file
4. Enable GitHub Pages — your site is live

See the **[Teacher Guide](docs/TEACHER-GUIDE.md)** for the full walkthrough.

### For developers

```bash
# Clone the repo
git clone https://github.com/shiebenaderet/studytools.git

# Serve locally (any static server works)
cd studytools
python3 -m http.server 8000

# Open in browser
open http://localhost:8000/study-tools/engine/?unit=early-republic
```

No build step. No dependencies to install. Just HTML, CSS, and JavaScript.

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JavaScript (no framework, no build step) |
| Fonts | [Outfit](https://fonts.google.com/specimen/Outfit) (self-hosted), [OpenDyslexic](https://opendyslexic.org/) (self-hosted) |
| Icons | [Font Awesome 6.4](https://fontawesome.com/) (self-hosted) |
| Cloud sync | [Supabase](https://supabase.com/) JS SDK (self-hosted, optional) |
| Hosting | [GitHub Pages](https://pages.github.com/) (free) |
| 3D | [Three.js](https://threejs.org/) (Tower Defense only, CDN) |

**Privacy:** All fonts, icons, and scripts are self-hosted. No third-party analytics, no cookies, no tracking. See the [privacy page](study-tools/engine/privacy.html).

---

## 🔒 Privacy & Security

- No student emails, passwords, or accounts
- No cookies, tracking, or third-party analytics
- All assets self-hosted (no CDN IP leakage)
- Guest mode for anonymous browsing
- Supabase RLS policies restrict data access
- COPPA school exception documented
- Teacher approval required for leaderboard visibility
- [Full privacy policy](study-tools/engine/privacy.html)

---

## 🙌 Student Contributors

Students who reported bugs or suggested improvements:

| Student | Contribution |
|---------|-------------|
| **Ahmad** | Found the leaderboard scoring bug where map quiz scores above 100% weren't being counted |
| **Fabian** | Reported Wordle display issue with abbreviated terms |

> Want to be listed here? Report a bug or suggest an improvement to your teacher!

---

## 📄 License

For educational use.

</content>