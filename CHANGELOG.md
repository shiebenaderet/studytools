# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
