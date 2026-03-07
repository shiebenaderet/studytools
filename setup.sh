#!/bin/bash
# ============================================================
# Study Tools — Teacher Setup Script
# ============================================================
# Run this ONCE after forking to remove the example content
# and start fresh with your own unit.
#
# Usage:
#   chmod +x setup.sh
#   ./setup.sh
# ============================================================

set -e

echo ""
echo "========================================"
echo "  Study Tools — Teacher Setup"
echo "========================================"
echo ""
echo "This will remove the example unit (Early Republic)"
echo "and set up a blank project for your own content."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

# 1. Remove the example unit folder
if [ -d "study-tools/units/early-republic" ]; then
    rm -rf "study-tools/units/early-republic"
    echo "[OK] Removed example unit (early-republic)"
else
    echo "[--] Example unit already removed"
fi

# 2. Reset units.json to empty
cat > "study-tools/units/units.json" << 'UNITS'
{
    "units": []
}
UNITS
echo "[OK] Reset units.json"

# 3. Reset Supabase config to placeholders
cat > "study-tools/engine/js/core/supabase-config.js" << 'SUPA'
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
SUPA
echo "[OK] Reset Supabase config to placeholders"

# 4. Remove example audio files (keep the folder and tracks.json structure)
if ls study-tools/engine/audio/*.mp3 1>/dev/null 2>&1; then
    rm -f study-tools/engine/audio/*.mp3
    echo "[OK] Removed example audio files"
else
    echo "[--] No audio files to remove"
fi

# 5. Reset tracks.json to empty
cat > "study-tools/engine/audio/tracks.json" << 'TRACKS'
{
    "artists": {},
    "tracks": []
}
TRACKS
echo "[OK] Reset tracks.json"

# 6. Create a starter unit folder with template config
mkdir -p "study-tools/units/my-unit"
cat > "study-tools/units/my-unit/config.json" << 'CONFIG'
{
    "unit": {
        "id": "my-unit",
        "title": "My Study Tool",
        "subtitle": "Study for your upcoming test!",
        "essentialQuestion": "What is the big question students should think about?",
        "theme": {
            "primary": "#1669C5",
            "secondary": "#1F90ED",
            "accent": "#f59e0b"
        }
    },
    "activities": [
        "flashcards",
        "practice-test",
        "fill-in-blank",
        "wordle",
        "hangman"
    ],
    "vocabulary": [
        {
            "term": "Example Term",
            "definition": "Replace this with your vocabulary",
            "simpleExplanation": "A simple explanation for students",
            "example": "Use the term in a sentence",
            "category": "Category 1"
        }
    ],
    "practiceQuestions": [
        {
            "question": "Replace this with your question?",
            "options": ["Wrong answer", "Correct answer", "Wrong answer", "Wrong answer"],
            "correct": 1,
            "explanation": "Explain why the answer is correct.",
            "topic": "Category 1"
        }
    ]
}
CONFIG
echo "[OK] Created starter unit at study-tools/units/my-unit/"

# 7. Update units.json with the starter unit
cat > "study-tools/units/units.json" << 'UNITS2'
{
    "units": [
        {
            "id": "my-unit",
            "title": "My Study Tool",
            "path": "units/my-unit/config.json"
        }
    ]
}
UNITS2
echo "[OK] Updated units.json with starter unit"

echo ""
echo "========================================"
echo "  Setup complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Edit study-tools/units/my-unit/config.json with your content"
echo "  2. Rename 'my-unit' folder to match your topic (e.g., 'civil-war')"
echo "  3. Update the 'id' in config.json and units.json to match"
echo "  4. Commit and push your changes"
echo "  5. Your site will be live at:"
echo "     https://YOUR-USERNAME.github.io/studytools/study-tools/?unit=my-unit"
echo ""
echo "See docs/TEACHER-GUIDE.md for detailed instructions."
echo ""
