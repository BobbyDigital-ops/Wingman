# Wingman — Phase 2: Measured Flight & Combat Balance
**Date:** 29 October 2026  
**Status:** Production changes committed; 720 baseline + 720 rebalanced seeded AI sorties completed.  
**Game scope:** Six existing RAF and Luftwaffe aircraft; 40 pilots, factions, artwork and career progression retained.

## Method
The added `tests/balance-tournament.cjs` instruments the actual `game.js` physics, AI steering, gunfire, rear turret, bombs, hit detection and crash logic **in a Node VM at runtime**. These hooks are **not included in the shipped browser build**. It runs both positions as AI, removes player-only steering/roll assistance, and equalises bomber readiness for both sides. The generator resets a seeded pseudorandom stream per fixture and swaps the aircraft positions. Combat particle effects are disabled in the headless benchmark; the actual combat physics and projectile collision logic run unchanged.

Each matrix: all **15 unordered two-aircraft pairings**, both seating orders, **4 arenas**, **3 AI difficulties** (rookie/standard/ace) and **2 paired seed repetitions** = **720 bouts** (240 per aircraft), at most 75 simulated seconds per bout. The same exact seeds and configuration were run against the original game and revised game. Arena visuals do not change core physics; the arena dimension supplies different seeded weather/dynamics. The match ends on destruction, crash or at 75 seconds with remaining hull-plus-armour fraction as tiebreaker. A draw contributes 0.5 to the aggregate rate.

## Before and after — verified 720-sortie matrices

| Aircraft | Original win-rate | Rebalanced win-rate | Change |
| --- | ---: | ---: | ---: |
| Spitfire | 52.7% | **62.5%** | +9.8 pp |
| Messerschmitt Bf 109E | 32.5% | **48.8%** | +16.3 pp |
| Bristol Beaufighter | 26.9% | **49.4%** | +22.5 pp |
| Messerschmitt Bf 110 | 21.5% | **53.3%** | +31.8 pp |
| Avro Lancaster | 86.5% | **43.3%** | −43.2 pp |
| Heinkel He 111 | 80.0% | **42.7%** | −37.3 pp |

**Interpretation:** the original automated results were heavily dominated by bombers, which had robust armour and an exceptionally accurate, rapid rear turret. The revised ranges are markedly closer, but they are AI-vs-AI measurements, **not** player win rates or proof of perfect balance.

### Rebalanced win rates by opponent difficulty

| Aircraft | Rookie | Standard | Ace |
| --- | ---: | ---: | ---: |
| Spitfire | 55.6% | 61.9% | 70.0% |
| Bf 109E | 43.1% | 52.5% | 50.6% |
| Beaufighter | 44.4% | 40.0% | 63.8% |
| Bf 110 | 46.3% | 52.5% | 61.3% |
| Lancaster | 51.9% | 48.1% | 30.0% |
| He 111 | 58.8% | 45.0% | 24.4% |

The aggressive ace-level aiming and manoeuvring particularly favours fighters over bombers. This is a potential **future class-vs-difficulty tuning focus**, not something to change unmeasured.

### Selected head-to-head comparisons

All selected pairs below had 48 simulated matches:
- **Spitfire vs Bf 109E:** 30 Spitfire wins, 17 Bf 109 wins, 1 draw. Spitfire remains the stronger close dogfighter, while Bf 109 has speed/energy advantages.
- **Spitfire vs Beaufighter:** 24 wins each; heavy weapons are now meaningful when aligned.
- **Spitfire vs Bf 110:** 24 Spitfire, 23 Bf 110, 1 draw.
- **Beaufighter vs Lancaster:** 25 Beaufighter, 19 Lancaster, 4 draws.
- **Bf 109E vs Lancaster:** 26 Bf 109, 22 Lancaster.
- **Bf 110 vs He 111:** 31 Bf 110, 14 He 111, 3 draws.

## Actual gameplay changes

### Messerschmitt Bf 109E (energy fighter)
- Turn rate **2.94 → 3.02**, still below Spitfire **3.15**.
- Burst **9 → 10**, interval **0.067 → 0.064 s**, cooldown **1.48 → 1.40 s**.
- Speed, hull, armour and the historically established different Overdrive behaviour remain unchanged.

### Beaufighter and Bf 110 (heavy interceptors)
- Beaufighter turn **1.85 → 1.98**; burst **5 → 7**; interval **0.19 → 0.17 s**; cooldown **2.45 → 2.20 s**.
- Bf 110 turn **1.70 → 1.91**; burst **6 → 8**; interval **0.18 → 0.17 s**; cooldown **2.62 → 2.27 s**.
- Heavy pilots now activate their armour shield proactively when incoming turret fire begins or armour is below 75%, instead of waiting until the hull is badly damaged.
- Their weaker turning compared with single-engine fighters, separate guns and shield ability are retained.

### Lancaster and He 111 (defensive bombers)
- Lancaster armour **147 → 124**; He 111 armour **135 → 116**, while hull health and bomber speed remain unchanged.
- Automatic rear gun burst **7 → 4 rounds**, individual round damage **6 → 4.5**, recharge **1.85 → 2.70 s**.
- Rear-gun detection and firing cone slightly narrowed and visualised turret dispersion **±0.035 → ±0.095 rad**.
- Bomb salvos, forward guns, bomber silhouettes and aircraft selection remain intact.
- With their rear guns, they still punish direct tail-chasing and remain durable, but can now be challenged by heavy fighters.

### Cross-system consistency
- Road to Ace's `BASE_AIRCRAFT` now matches the revised engine turn and armour values, so rolled airframes are derived from accurate stats.
- A repeatable tournament runner and two new smoke checks were added, wired into `npm run test:unit`.
- `npm run balance:tournament` reruns the full tournament; custom runs use `node tests/balance-tournament.cjs --reps=2 --seconds=75 --output=/path/file.json`.
- Existing aircraft, portraits, 40 fixed pilots, career tree, six silhouettes, landscapes, and other modes are intentionally preserved.

## What the simulator does not certify
- **Not a human playtest**, and not a prediction of competitive online match win rates. Both players use the existing tactical AI.
- AI-vs-AI ability timing, geometry and targeting can favour certain roles; it is not a replacement for manual difficulty and feel testing.
- Arcade damage and skill values are game abstractions, not historical aircraft-performance simulations.
- Per-venue physics currently shares a common combat model; four environments test seeded variations and rendering separation, not different flight physics.
- The measured 720-sortie result is an empirical exploratory benchmark, not an immutable requirement that every aircraft must have a 50% rate.

## Recommended follow-up
1. **Manual difficulty pass:** have humans play 10–20 sorties per fighter, including head-to-head Spitfire/Bf 109 and heavy bomber interception.
2. **Pilot personalities (Phase 3):** use the existing AI-style framework to differentiate pilots tactically, then run the same simulator by pilot archetype.
3. **Career difficulty (Phase 4):** calibrate rank-specific AI with player results; the ace-level matchup split merits attention.
4. **Performance gate:** repeat on real Android hardware, measuring frame times during 4-aircraft battles.

## How to reproduce
```bash
npm install
npm run test:unit
npm run balance:tournament
# Or save full per-fixture telemetry:
node tests/balance-tournament.cjs --reps=2 --seconds=75 --output=wingman-tournament.json
```

## Release verification — completed

- **63/63** Node engine, physics, career ability and tournament-determinism unit tests passing.
- **102/102** Playwright browser cases passing across desktop Chromium and Pixel 7 landscape browser emulation, including menus, all six aircraft, all four modes, all eight career ranks, saves, portrait rendering and scrolling.
- **720 original + 720 revised** matched AI sorties completed without nonfinite physics. The original and revised matrices used matching seeds and the corrected equal-start benchmark.
- Verified the Vercel production deployment serves HTTP 200 for the updated `game.js`, `career.js` and `index.html` with fresh asset versions.
- These checks do not certify subjective human play feel, physical-device FPS, iOS, online multiplayer or historical simulation accuracy.

The code changes, source-level tournament runner and its regression checks are committed to `main`. All pilot portraits, pilot identities, career progression and aircraft silhouettes have been preserved.
