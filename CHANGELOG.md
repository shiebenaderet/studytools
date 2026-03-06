# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
