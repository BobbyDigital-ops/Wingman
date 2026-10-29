# Wingman — Phase 6: Arcade Replayability and Squad Tactics
Date: 29 October 2026

## Implemented arcade modes

### Classic Duel
Existing two-aircraft best-of-three remains. New after-action score, accuracy and awards; original aircraft health, damage, skills and flight balance unchanged.

### Survival / Endless Aces
One opponent per wave; 70 seconds to dispatch each rival or the run ends. Hull and armour damage carry into later waves. Each defeated opponent restores only 14% of base hull and 24% of base armour; no full reset. Enemy reaction, aim and target lead improve with wave number; plane types rotate. The scoreboard tracks cleared waves, kills, accuracy and accumulated points.

### Free For All
A true three-aircraft melee. Every aircraft is hostile to every other aircraft. One decisive bout: survive until the other two are down, or lose by destruction or timeout. No fake best-of-three duel scoring.

### Wingmen 2v2
One human with a same-faction AI wingman versus two opposing-faction AIs. Friendly fire remains disabled. Opposing pilots divide their initial targets, while friendly AI protects endangered allies. If the human dies but the teammate survives, the battle continues and the remaining wingman can earn a genuine squadron victory.

### Special Operations (four selectable missions)
- Ace Intercept: destroy an opposing ace fighter within 45 seconds.
- Crosswind: defeat a rival inside 75 seconds with a persistent strong wind.
- Iron Nerves: win a single dogfight in 90 seconds with zero starting armour.
- Heavy Hunter: destroy the opposing heavy fighter against ace AI within 90 seconds.
All special operations require an actual elimination before timeout. No technical victory for merely surviving the clock.

## Scores and achievements
- Device-local scorebook in src/data/arcade-records.js, stored in localStorage; up to the 120 most recent sorties, including mode, plane, difficulty, challenge, kills, waves, hits/shots, outcome and score.
- Best scores by operation, with expandable top-ten rankings for each of five modes.
- Twelve unlockable achievements for debut, victory, clean win, Free For All, 2v2, three Survival milestones and four challenges.
- End-of-sortie result includes score, personal best, kills, shots/hits and new awards.
- Invalid storage is safely handled. Nonfinite score input cannot poison the record board.
- This is **offline personal leaderboard functionality**, not global rankings. No remote account, backend or data submission is involved.

## AI and fairness
- No airframe attack, armour, hull, turn-rate or model changes.
- Wingmen and opponents choose team-aware targets without changing weapon damage.
- Higher Survival waves sharpen AI reactions and targeting instead of scaling damage.
- All forty pilot identities, portraits, Phase 4 careers and the compulsory 1v3 career finale remain intact.

## Multiplayer assessment (not implemented in Phase 6)
2v2 currently means one human and one friendly AI versus two enemy AIs; it is not online multiplayer.
True online multiplayer requires a synchronised authoritative game-state model, prediction/reconciliation for rapid aircraft movement, lobby and reconnect handling, anti-cheat and validated scores. Recommend a private online 1v1 prototype before expanding to online 2v2, after Android frame-time optimisation.

## Validation scope and limits
Unit tests cover mode-specific rules, proper winner evaluation, Survival partial repairs, actual challenge timers, squadron targeting, offline score persistence and achievements.
Playwright covers mode selection, challenge launch, score panels, top-ten lists and landscape-mobile controls.
Automated verification does not substitute for human skill/feel tuning or physical Android performance profiling.

## Recommendations
1. Playtest at least five full Survival runs, and tune partial repairs and 70-second wave deadlines.
2. Test whether 2v2 post-death wingman spectating feels exciting or should switch to a quick end-state.
3. Add genuinely new mission objectives, e.g., convoy defence or bomber escort, before another expansion.
4. Profile an actual Android phone before adding factions or a remote multiplayer backend.