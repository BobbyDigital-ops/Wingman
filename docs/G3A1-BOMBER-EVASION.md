# Wingman G3A.1 — Bomber evasion verification

Date: 30 October 2026. Version: `v0.3.1`. Comparison to G3A
`v0.3.0` on the same production Swoop flight physics.

## Implementation

Bombers maintain a high-altitude bombing corridor when unthreatened but
perform controlled alternating banked climbs and descents when a fighter
gets behind them or aligns a firing run. They respond over several seconds
rather than flipping direction instantly. Lancaster and He 111 have
slightly different evasive leg lengths and pitches.

- Ground avoidance has priority; limits keep manoeuvres within safe airspace
- **No** extra upward velocity, collision immunity, inflated hitboxes or
  fighter-like manoeuvring authority
- The regular bomber angular turn, velocity coupling, damage and rear-turret
  mechanics remain in effect
- A correctly aligned physical bomb solution may still release ordnance
  while under attack

## Identical-seed A/B benchmark

360 mirrored AI-versus-AI fixtures (all 6 aircraft, all 15 pairings in both
orders, all 4 arenas, 3 difficulty settings, 55 seconds, no wind).
Results use real `game.js` plus `src/physics/swoop-flight.js` with seeded
AI on both sides. These are **not human player win-rate measurements**.

| Measure | G3A v0.3.0 | G3A.1 v0.3.1 |
| --- | ---: | ---: |
| Lancaster: incoming fighter bullet accuracy | 34.8% | **29.5%** |
| He 111: incoming fighter bullet accuracy | 36.3% | **28.9%** |
| Lancaster: AI win rate overall | 27.9% | **39.2%** |
| He 111: AI win rate overall | 11.3% | **33.3%** |
| Lancaster: bombs released | 297 | 275 |
| He 111: bombs released | 309 | 286 |
| Bomber ground deaths | 0 | **0** |
| Nonfinite physics states | 0 | **0** |

Separate 30-fixture storm/wind/ace difficulty stress test: zero ground
deaths and zero invalid physics states. AI evasion regression check in a
30-match alpine/standard fixture recorded 14,451 Lancaster evasion frames,
13,452 He 111 evasion frames, 34 and 12 bombs respectively, zero crashes.

## Scope and next steps

This is a bomber-specific correction. Fighter stats, player lock-on, gun
audio, visuals, aircraft skins and campaign progression are unchanged.

The benchmark indicates a substantial defensive improvement without
unrealistic immunity. High-difficulty human tailing still needs evaluation:
the player should be able to land a sustained burst by anticipating a
bomber's next leg. The routine is intentionally predictable enough to learn.

The code test does not validate whether every evasion *looks* natural on
every phone/desktop display; use the live browser game for visual judgement.
