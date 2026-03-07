# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0] - 2026-03-06

### Added
- **3D Tower Defense game** — New vocabulary-powered tower defense game built with Three.js:
  - Answer timed vocabulary questions (10 seconds each) to earn coins
  - Build 4 tower types: Quill (fast), Cannon (area damage), Frost (slows), Eagle (long range)
  - 10 waves of enemies with increasing difficulty (more enemies, more HP, faster)
  - S-curve path with grid-based tower placement
  - Low-poly procedural geometry optimized for Chromebooks (no imported 3D models)
  - Streak bonus for consecutive correct answers
  - Wrong answers tracked in weakness tracker
  - Start screen with tower previews and best score
  - Victory/Game Over screen with stats
- **Three.js CDN** — Loaded on-demand only when Tower Defense is opened (no impact on other activities)

### Changed
- Removed Typing Race from default activities (replaced by Tower Defense)

## [3.3.0] - 2026-03-06

### Added
- **"Explain It To Me" feature** — Kid-friendly simple explanations for every vocabulary term, accessible via lightbulb button:
  - **Flashcards** — Button on the back face reveals a plain-language explanation below the definition
  - **Practice Test** — Appears after wrong answers to help students understand what they missed
  - **Resource Library** — Available on every term card for quick clarification
  - All 37 vocabulary terms have hand-written `simpleExplanation` fields with relatable analogies and plain language

## [3.2.0] - 2026-03-06

### Added
- **Fill-in-the-Blank redesign** — Questions now appear one at a time with progress bar, dot navigation, and prev/next buttons instead of all-at-once scrolling
  - **Type It mode** — Students can choose to type answers instead of using the word bank
  - **Word Bank mode** — Tap a word, then tap the blank (with clear instructions)
  - Mode selector screen at start with clear descriptions
  - Results screen shows all answers with correct/incorrect highlighting
- **Vocab Tower Defense design doc** — Design document for upcoming 3D tower defense game at `docs/plans/`

### Changed
- Fill-in-the-Blank moved from all-at-once layout to single-question stepper for less scrolling

## [3.1.0] - 2026-03-06

### Added
- **1v1 Quiz Race** — New 2-player same-screen game: Player 1 uses keys 1-4, Player 2 uses keys 7-0. Race to answer multiple-choice questions with 6-second timer, correct = +1, wrong = -1. Key hints shown on each option.
- **Teacher Analytics Dashboard** — Three analytics cards in teacher view:
  - **Popular Activities** — Bar chart showing usage counts per activity with "underused" warnings
  - **Tricky Terms** — Top 10 most-missed vocabulary terms aggregated from weakness tracker and flashcard ratings
  - **Review Recommendations** — AI-generated suggestions based on mastery rates, activity usage gaps, and common struggles
- **Click-to-cycle quotes** — Click the quote card on the home page to slide to the next quote with smooth transition animation and "Tap for more quotes" hint

### Changed
- Removed Category Sort from default unit activities (replaced by Quiz Race)

## [3.0.0] - 2026-03-06

### Added
- **Leaderboard system** — New "Leaderboard" nav tab with three sub-tabs:
  - **Top Students** — Individual rankings with podium visualization for top 3 (gold/silver/bronze), score breakdown (vocab × 10 + test score + study minutes)
  - **Class Battle** — Class-vs-class rankings with animated horizontal bar chart, ranked by average student score
  - **Achievements** — Moved from home page to leaderboard tab to reduce clutter
- **Teacher leaderboard management** — In teacher dashboard:
  - Approve individual students or "Approve All" for the leaderboard
  - Remove individual entries
  - Reset entire leaderboard with confirmation
  - Status badges (Pending/Approved) with class and score details
- **Auto-score submission** — Scores automatically submitted to Supabase on every activity save and when visiting the leaderboard
- **"Top Student" achievement** — New badge for reaching #1 on the leaderboard
- **`leaderboard` database table** — `student_id, unit_id, score, vocab_mastered, best_test_score, study_time_seconds, approved` with RLS policies

### Changed
- Achievements removed from home page stats container (now in Leaderboard tab)
- Nav bar now includes Leaderboard between Games and Tools

## [2.5.0] - 2026-03-06

### Changed
- **Achievements merged into progress** — Badge grid now renders inside the stats/progress container instead of a separate section, saving vertical space
- **Numbered study flow** — Home page welcome replaced with clear 1-2-3 step cards (Learn → Practice → Play) with descriptions and CTA buttons
- **Quote card more prominent** — Larger portrait (72px), primary-colored border, gradient background tint, bolder author text
- **Removed separate badges-container** from HTML layout

## [2.4.0] - 2026-03-06

### Changed
- **Condensed home page** — Smaller progress tracker (reduced padding, font sizes, hidden progress labels), compact achievement badges (56px inline flex instead of 90px grid), tighter quote card spacing
- **Fun fact moved to footer** — Historical fun facts now display in the site footer on every page instead of below the quote card on the home page only
- **Focus timer no longer overlaps header** — Timer bar pushes page content down via `body.timer-active` class instead of covering the sticky header; reduced timer bar height from 44px to 36px
- **Compact achievements** — Heading and summary merged into a single inline row; badges reduced to 56px with smaller icons/text
- **Light mode polish** — Replaced remaining hardcoded `rgba(255,255,255,...)` in wordle, timeline, source analysis, and achievement styles with theme-aware CSS variables; loading screen uses CSS variables

## [2.3.0] - 2026-03-06

### Added
- **Light/dark mode toggle** — Sun/moon button (fixed bottom-right) with localStorage persistence; full light theme with adjusted shadows, borders, and contrast
- **`--font-mono` CSS variable** — Monospace font variable for consistent typing-related UI

- **New quotes** — Benjamin Banneker (letter to Jefferson), Tecumseh (speech to Osages), John Marshall (Cohens v. Virginia), Andrew Jackson (Bank War), with portraits and verified sources
- **5 new fun facts** — Banneker, Tecumseh, Marshall, Jackson

### Changed
- **Typing Practice colors** — Replaced all hardcoded Monkeytype colors (#323437, #e2b714, #646669, #ca4754, #d1d0c5) with site CSS variables for full theme consistency
- **Typing Practice fonts** — Replaced all hardcoded `'Roboto Mono'` references (10+ instances) with `var(--font-mono)` CSS variable
- **Reduced vertical spacing** — Tighter stats, cards, header, sections, quote card, and footer padding to minimize scrolling on home page
- Fixed-position button stack reordered: search (top), theme toggle (middle), dyslexic font (bottom)

## [2.2.0] - 2026-03-06

### Added
- **Women's quotes** — Abigail Adams (2 quotes), Mercy Otis Warren, and Dolley Madison with verified sources and local portraits
- **Toussaint Louverture quote** — "tree of black liberty" quote with portrait, representing Black voices in the Early Republic era
- **Haitian Revolution fun facts** — Two new fun facts connecting the Haitian Revolution to the Louisiana Purchase

### Changed
- Washington abolition quote now includes editorial bracket `[slavery]` for 8th-grade clarity
- Replaced misattributed Dolley Madison quote with her verified letter about saving Washington's portrait during the War of 1812

## [2.1.0] - 2026-03-06

### Added
- **Command palette** — Searchable command launcher (`/`, `Cmd+K`, or visible search button) for quick navigation to any activity, tool, or shortcut
- **Hidden teacher dashboard** — Type "teacher" in the command palette to access; magic link email auth restricted to approved school domains (@edmonds.wednet.edu), with password fallback
- **Collapsible header** — Header and nav collapse into a compact activity topbar when students enter an activity, maximizing screen space for content
- **Historical flavor on home page** — Random historical quote with portrait and fun fact displayed on the home screen, pulled from unit config
- **Responsive progress bar** — Slim 10px bar with percentage label displayed below instead of cramped text inside the fill

### Changed
- Container max-width widened to 1280px for better desktop utilization
- Stats grid uses fixed 4-column layout (2-col on mobile) instead of auto-fit
- Stat values use primary text color instead of accent for better readability
- Keyboard shortcuts modal now built with safe DOM methods (no innerHTML)

### Fixed
- Wordle no longer repeats the same term consecutively — tracks recent words and cycles through half the pool before repeating
- Magic link auth redirect no longer lands on welcome screen — detects auth hash before showing name/period input
- URL cleaned properly after magic link redirect (no trailing `#`)

## [2.0.0] - 2026-03-06

### Added
- **Dark theme redesign** — Complete visual overhaul with Outfit font, dark slate backgrounds, and cohesive CSS variable system (`--bg-deep`, `--bg-card`, `--bg-surface`, `--text-primary`, etc.)
- **Anki-style flashcards** — Spaced repetition with 3D flip animation, confidence rating (Again/Hard/Good/Easy), progress dots, and session completion stats
- **Cross-activity weakness tracking** — Wrong answers in Practice Test, Lightning Round, and Typing Practice feed into a shared `weakness_tracker`, surfaced as review suggestions in Flashcards
- **Per-term typing snippets** — Each vocabulary term has a 2-3 sentence mini-passage; weak terms highlighted in amber and prioritized for practice
- **Source Analysis activity** — SIFT method primary source analysis with classification, contextual questions, and scoring
- **Mastery gating** — Activities unlock progressively as students demonstrate mastery
- **Student welcome screen** — Name and period input overlay with personalized greetings throughout the app
- **Historical flavor content** — 15 era-appropriate quotes with Wikimedia Commons portraits and 15 fun facts from the 1785-1815 period in config
- **Resource Library** — Searchable, collapsible vocabulary reference with Kiddle, Wikipedia, and YouTube links per term
- **Achievement system** — Unlockable badges with confetti animations for milestones (perfect scores, streaks, speed records)

### Changed
- Font family from Roboto/Lexend to Outfit (variable weight 300-900)
- All activity UI components converted from white/light backgrounds to dark theme
- Category card colors updated for dark theme contrast (study=blue, practice=purple, games=green)
- Feedback colors use semi-transparent RGBA instead of solid light backgrounds (e.g., `rgba(34,197,94,0.15)` instead of `#dcfce7`)
- Practice test answer positions randomized per question with persistent shuffle maps
- Activity card grid alignment and button styling unified

### Fixed
- Source analysis "Questions:" field showing blank after score screen (empty array was truthy)
- Flashcard content overflow on long definitions
- Timeline, crossword, and all game activities now render correctly on dark backgrounds
- Modal, toast, and input styling consistent with dark theme
- Hangman gallows visible on dark backgrounds (was `#333` on dark)

## [1.0.0] - 2026-03-05

### Added
- Core engine with plugin-based activity architecture
- 13 study activities: Flashcards, Practice Test, Short Answer, Fill-in-the-Blank, Timeline, Category Sort, Wordle, Hangman, Flip Match, Typing Race, Term Catcher, Lightning Round, Crossword
- Config-driven unit system with vocabulary, questions, timeline events
- Progress tracking via localStorage with optional Supabase cloud sync
- Teacher dashboard for viewing student progress across classes
- Landing page with unit picker
- Study tools: note-taking guide, focused study timer, printable study guide, progress export
- Keyboard shortcuts (1-5 for nav, ? for help, Esc to close modals)
- Touch support with tap-to-select for all drag-and-drop activities
- Loading spinner while config loads
- Toast notification system (replaces browser alert dialogs)
- Welcome cards on home screen with quick-start guidance
- Blue gradient theme (#1669C5 to #1F90ED) with CSS custom properties
- Google Fonts: Roboto for headings, Lexend for body text
- OpenDyslexic font toggle (persists preference via localStorage)
- Root redirect from repo root to study-tools landing page
- Supabase database schema with Row Level Security
- README and versioning

### Fixed
- Wordle no longer gives partial words (e.g., "dept" from "Dept. of War") - filters to single-word terms only, supports up to 12 letters
- Typing Race provides progressive hints when stuck (character count, first letter, half reveal) and a skip button
- Practice test answer positions randomized (was 96% at position B) and question order shuffled
- Crossword uses full terms instead of first word only
- Timeline defaults to Challenge Mode (years hidden) with toggle
- Term Catcher falling terms all look identical so students must read them (no color giveaway)
- Lightning Round button contrast improved for readability
- Flashcard content no longer overflows on long definitions
- Practice test saves and restores current question index
- All hardcoded green tints updated to match blue theme

### Security
- Supabase Row Level Security policies for client-side writes
- No innerHTML usage with user-provided content
