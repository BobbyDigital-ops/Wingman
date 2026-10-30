# Wingman G3A — AI combat baseline

Date: 30 October 2026. Build: `v0.3.0`. Existing previous release:
`926d29994067b4d94abe6f215a2592ebee6665e1` (v0.2.3).

## What was fixed

- The AI-vs-AI tournament now loads **the actual G1+ Swoop flight physics**.
  It previously fell back silently to Classic physics and contained an obsolete
  function-signature anchor, so results from that older harness were unreliable.
- Bombers now use dedicated **high-altitude cruise and bomb-run steering**.
  They maintain horizontal momentum, climb gently to altitude and release
  actual bombs when a physical target-crossing solution exists. Defensive
  rear guns remain active. Their velocity is not artificially pushed upward.
- Fighter and heavy-fighter aircraft handling, gun damage, health, hitboxes,
  tail-lock assist, bomb damage and player controls are unchanged.

## Deterministic combat tournament — G3A

**360 mirrored AI-vs-AI fights:** six aircraft, all pairings in both seat
positions, four arenas (alpine, coast, desert, storm), three skill levels
(rookie, standard, ace), no wind, 55 seconds per fight.

| Aircraft | AI win rate | Bullet hit rate | Ground deaths | Bombs dropped |
| --- | ---: | ---: | ---: | ---: |
| Spitfire | 80.8% | 34.80% | 0 | 0 |
| Bf 109 | 60.8% | 29.06% | 0 | 0 |
| Beaufighter | 62.5% | 25.54% | 0 | 0 |
| Bf 110 | 56.7% | 21.84% | 0 | 0 |
| Lancaster | 27.9% | 86.38% | 0 | 297 |
| He 111 | 11.3% | 85.72% | 0 | 309 |

**30 additional storm-arena ace-difficulty fights with crosswind**
also produced no ground deaths and no nonfinite physics states.

### Interpretation

These are **AI-versus-AI simulations, not player skill statistics**.
Bomber weapon accuracy largely measures automated rear turret fire and cannot
be compared directly to manually aimed forward guns. A low bomber duel win
rate is expected: its intended strength is heavy defensive armament and ground
attack, not turning contests with Spitfires.

Spitfires are notably strong even without a human pilot. Later G3 work should
check fighter-vs-fighter fairness, player win rates, and progression up the
King of the Skies campaign. Do **not** arbitrarily nerf the Spitfire's
manoeuvrability; it should remain an elite dogfighter.

### Current acceptance / what remains

- [x] Test harness uses production swoop physics and current engine anchors
- [x] No invalid physics states in the 390-match benchmark
- [x] Normal bomber AI does not repeatedly crash while making bomb runs
- [x] Bomber weapons still function in simulated matches
- [ ] G3B: measured fighter-vs-fighter engagement tuning and difficult-but-fair AI
- [ ] G3C: King of the Skies difficulty curve and tactical progression
- [ ] G3D: desktop/mobile hands-on playtests, hit rate and frustration tuning

Run locally: `npm run test:unit` or
`npm run balance:tournament -- --reps=1 --seconds=55 --wind=off`.

**Limitations:** No full human Playwright playtest in this benchmark.
The test uses the actual gameplay update and collision code with scripted
AI for both positions. Audio/menus are not part of this benchmark.
