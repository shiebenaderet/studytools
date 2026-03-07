# Vocab Tower Defense — Design Document

## Overview

A 3D tower defense game where students answer vocabulary questions to build and upgrade towers that defend against waves of enemies. Built with Three.js, optimized for Chromebooks (low-poly aesthetic, lightweight rendering).

## Gameplay

### Core Loop
1. **Wave announced** — enemies begin marching along a path toward the base
2. **Question pop-up** — game pauses, a timed vocabulary question appears as an overlay
3. **Correct answer** — earn currency to place or upgrade a tower
4. **Wrong answer** — no currency; enemy wave continues unimpeded
5. **Towers auto-attack** — placed towers shoot at enemies passing within range
6. **Base HP** — enemies that reach the end deal damage; game over at 0 HP

### Question Flow (Timed Pop-ups)
- Questions appear between waves and during waves (every ~15 seconds)
- 10-second timer per question (matches Lightning Round pacing)
- Multiple choice (4 options) pulled from unit's `practiceQuestions` and generated from `vocabulary` definitions
- Correct = earn coins; streak bonus for consecutive correct answers
- Wrong = no coins + the term is flagged in `weakness_tracker`

### Tower Types (3-4 types, vocabulary-themed)
| Tower | Theme | Behavior |
|-------|-------|----------|
| **Quill Tower** | Writing/knowledge | Single-target, fast fire rate |
| **Cannon Tower** | Military/power | Area damage, slow fire rate |
| **Frost Tower** | Diplomacy/debate | Slows enemies in range |
| **Eagle Tower** | American eagle | Long range, moderate damage |

Each tower has 3 upgrade levels. Upgrades cost more coins (= more correct answers needed).

### Enemies
- Simple low-poly shapes (cubes, spheres) with health bars
- Wave difficulty increases: more enemies, faster, more HP
- 10 waves per game session (keeps sessions under 10 minutes)

### Map
- Single pre-built path (S-curve or zigzag) on a flat terrain
- Grid-based tower placement on either side of the path
- Low-poly grass/dirt textures, simple skybox

## Technical Architecture

### Rendering (Three.js)
- **Target**: 30+ FPS on Chromebooks (Intel HD Graphics)
- **Geometry**: All models are low-poly primitives (BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry) — no imported 3D models
- **Materials**: MeshLambertMaterial (cheapest lit material) with flat colors
- **Lighting**: Single DirectionalLight + AmbientLight
- **Shadows**: Disabled (performance)
- **Resolution**: Render at 0.75x device pixel ratio on low-end devices
- **Draw calls**: Target < 50 by using InstancedMesh for enemies and towers of the same type

### Performance Budget
- No imported .glb/.gltf models (all procedural geometry)
- Texture-free (color-only materials)
- No post-processing effects
- Simple particle system for projectiles (small spheres)
- Object pooling for enemies and projectiles

### File Structure
```
study-tools/engine/js/activities/tower-defense.js  — Single file, activity plugin
```

The entire game lives in one activity file registered via `StudyEngine.registerActivity()`. Three.js loaded from CDN via script tag.

### Integration Points
- **Config**: Uses `vocabulary` (term/definition for generated questions) and `practiceQuestions` (pre-written multiple choice)
- **Weakness tracker**: Wrong answers feed into shared `weakness_tracker` in progress
- **Leaderboard**: Final score (waves survived × 100 + coins remaining) submitted via `LeaderboardManager.submitScore()`
- **Achievements**: New badges — "Tower Master" (beat all 10 waves), "Perfect Defense" (no base damage taken)
- **Progress**: Saves best wave reached and high score

### Question Generation
1. Pull from `practiceQuestions` first (pre-written, higher quality)
2. Generate additional questions from `vocabulary`: show definition, pick correct term from 4 options
3. Shuffle and avoid repeats within a session
4. Prioritize terms from `weakness_tracker` (terms the student struggles with)

## UI Layout

```
┌─────────────────────────────────────┐
│  Wave 3/10    Coins: 150    HP: ████│  ← HUD overlay (HTML)
│                                     │
│         ┌─────────────────┐         │
│         │   3D Game View  │         │
│         │   (Three.js)    │         │
│         └─────────────────┘         │
│                                     │
│  [Quill $50] [Cannon $100] [Frost]  │  ← Tower shop (HTML)
└─────────────────────────────────────┘

Question overlay (pauses game):
┌─────────────────────────────────────┐
│         ⏱ 8 seconds                 │
│                                     │
│  "The first Secretary of the        │
│   Treasury was..."                  │
│                                     │
│  [A] John Adams    [B] A. Hamilton  │
│  [C] T. Jefferson  [D] J. Madison   │
└─────────────────────────────────────┘
```

- HUD and tower shop are HTML overlays (not rendered in Three.js) for crisp text
- Question overlay is a centered modal, same style as other app modals
- 3D canvas fills the activity container

## Scope & Constraints

- **Single-player only** (multiplayer would require WebSocket server)
- **No save mid-game** — sessions are short (5-10 minutes)
- **One map** — no map editor or map selection for v1
- **No sound** — Chromebook speakers are unreliable in classrooms
- **Keyboard + mouse/trackpad** — click to place towers, click answer options
- **Touch support** — tap to place, tap answers (tablets)

## Future Considerations (Not v1)
- Multiple maps with different paths
- Boss enemies at wave 5 and 10 with bonus questions
- Co-op mode (two students manage different sides of the map)
- Custom tower skins earned through achievements
