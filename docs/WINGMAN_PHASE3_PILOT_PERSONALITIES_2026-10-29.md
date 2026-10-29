# Wingman — Phase 3: Pilot Personalities & Road to Ace Scaling
**Date:** 29 October 2026

## Design choices
Pilot identity is fixed. A rival's portrait, aircraft, name, original attribute strengths, preferred tactic, and signature skill remain consistent across every encounter. Career **rank** modifies proficiency and slightly improves that pilot's effective handling/gunnery/engine stats — never their base aircraft durability, weapon damage, or identity.

## Eight implemented AI tactical archetypes
| Personality | Behaviour |
| --- | --- |
| Hunter | Continues pursuit and punishes enemies with guns cooling down |
| Duellist | Closes for turning engagements and seeks a superior firing angle |
| Sniper | Maintains distance, leads shots carefully and fires only on tighter alignment |
| Interceptor | Seeks high-ground approaches and uses emergency dives |
| Trickster | Breaks pursuit, changes altitude and uses smoke defensively |
| Guardian | Conserves hull/armour, extends away when threatened and hardens early |
| Survivor | Pulls away when damaged or when unable to shoot; favours evasive altitude changes |
| Brawler | Presses close-range engagements and opens fire more opportunistically |

Every one of the 40 predefined characters is mapped from their existing archetype and fixed attributes to a deterministic temperament: aggression, evasiveness, patience, altitude preference and ideal engagement range. The pilots keep their original names, sexes, portrait slots and signature abilities. The single pilot's **rank** changes reaction/lead/skill availability, not their temperament.

## Rank-dependent pilot stats
For each of the three personal stats (manoeuvrability, gunnery, engine), the effective enemy rating is:
`clamp(round(originalRating - 13 + 17 * (rank-1)/7), 35, 95)`

| Ladder rank | Offset against original personal stats | AI skill progression |
| --- | --- | --- |
| 1 | −13 | Slowest reactions, low lead, little signature skill use |
| 2 | −11 | Better aim, still an inexperienced rival |
| 3 | −8 | More controlled manoeuvring |
| 4 | −6 | Veteran responses and greater skill availability |
| 5 | −3 | Sharper target prediction and skill timing |
| 6 | −1 | Nearly reaches original stats |
| 7 | +2 | Confident, frequent tactical skill use |
| 8 | +4 | Elite reactions, leading and deliberate special skills |

*Rounded values shown for readability. Actual progression is computed each encounter; the same pilot's original ratios are preserved subject to the existing 35–95 cap.*

**Example:** a rival with base TURN 80, GUNS 70, ENGINE 60 would have approximately 67 / 57 / 47 on rung 1 and 84 / 74 / 64 on rung 8, with the exact same name, plane, personality and special move. Aircraft hull and raw bullet damage remain unchanged.

## Named double-ace branches
- Ranks **3, 5 and 7**, the **third route only**: real **1v2** fights.
- The additional enemy is now a **separate named character from the opposing 20-pilot roster**, with a different aircraft type where possible, their own attribute scale, signature skill, temperament and AI steering.
- The route card labels the danger as `1v2 WITH [name]` and shows the lead rival's effective stats and tactic.
- Rank 8 remains a **1v1 final ace encounter**, and all other branches remain 1v1.
- Existing saved-career encounter choices are upgraded at fight start: pilot identity and rank are preserved; legacy double-aircraft routes are assigned a consistent named wingman.

## Combat presentation
- The combat HUD displays the enemy's callsign and rank.
- Career matches with two enemy aircraft correctly read **1 v 2**, rather than incorrectly displaying **2 v 2**.
- Original British and painted German portraits and all six aircraft models are unchanged.

## Testing
- Added repeatable tests covering all 40 identity/tactic profiles, all eight ranks, monotonic effective personal attributes, legacy save compatibility, named 1v2 branches and full-rank career progression.
- The existing full regression matrix of unit and browser tests is retained.
- Rank progression/browser coverage uses controlled win/loss callback outcomes for state testing. This is **not** evidence that players can defeat an ace on the last rung in normal gameplay.
- Further future work: human playtesting for exact pacing, psychological differentiation, two-enemy fairness and final boss difficulty; no arbitrary health/damage multipliers have been introduced.

## Next recommendation
After playing this build, pay particular attention to a returning rival's recognisable tactics at ranks 1, 4 and 8. If they still feel too similar in normal combat, adjust each archetype using measured behaviour telemetry rather than new weapon stats. The next major development phase remains deeper career progression, recurring nemeses and ace bosses.

## Final implementation validation
- **68/68 unit checks passed**, including personality profile uniqueness, monotonically increasing attributes, actual `game.js` foe stat assignment, independent 1v2 skill assignments and previous flight/combat tests.
- **106/106 Playwright browser checks passed** across Chromium desktop and emulated mobile landscape, including the new 8-rank 1v2 branch sweep, returning-rival progression, career save persistence, menu/aircraft controls and portrait loading.
- The Vercel deployment returned **HTTP 200** for `index.html`, `src/data/pilot-ai.js`, `career.js` and `game.js`. The new personality module and HUD changes were confirmed in the served files.
- Tests use controlled career win/loss callbacks and emulated mobile browsers, not an eight-rank human playthrough or a physical Android handset.
