# Wingman — full regression and balance audit
**Date:** 29 October 2026  
**Source:** `main`, `BobbyDigital-ops/Wingman`  
**Result:** **161/161 passing test executions**: 59 Node unit tests, 90 standard browser executions (45 × desktop/mobile), and 12 additional mode-matrix executions (6 × desktop/mobile). Zero failing in the final verified runs.

**Environment:** Playwright 1.56.1, Chromium 141 headless, Linux sandbox; desktop browser and emulated Pixel 7 landscape (915×412). The test sandbox was stopped after validation.

## Verified game functions and actions
- Launch, splash screen, navigation, mode selection, back/continue, start, menu return, fullscreen and results flow
- Duel, Survival, three-player Free for All and 2v2; correct participant/team/mode configuration
- All six aircraft: selection, unique preview and in-game launch; Spitfire, Beaufighter, Lancaster, Bf 109E, Bf 110 and He 111
- Four theatre selections and three AI difficulty selections
- Flight steering, energy, climb/dive/stalls, overdrive, pilot special, armour shield, barrel roll, bomb salvo, defensive gunners, cooldowns and health
- Bullet collision, boundaries, floor crash, ceiling re-entry, ramming, horizontal wraps, friendly-fire rules and match duration
- AI interception, nearby/wrapped targets, bombing alignment, defensive manoeuvres, weather/wind and rank-specific decision level
- Six aircraft models/liveries, paint assets, four sky environments, damage effects and UI canvas rendering
- RAF/Luftwaffe 20+20 defined pilots, unique portrait coordinates, gender/name consistency, signature/attribute combinations and character-choice requirement
- Pilot licence, saved profile, reload, aircraft locking, three route branches, eight-tier career progression, full win, three-loss game over, rank cap and scorebook
- Saved pilot changes preserve career statistics and locked aircraft, historic save compatibility, abort sortie to menu and retry without a career soft-lock
- Mobile landscape buttons, held steering, input conflicts, UI hit targets, page layout and independent roster scrolling

## Defects fixed during this sweep
1. **Soft-lock on career abort:** MENU during an unfinished career challenge left an active encounter in memory and disabled subsequent rival challenges. MENU now clears this lock while preserving rank and lives.
2. **Completion rank overflow:** an eight-rank career could record `best=9` after final victory. It now caps at eight.
3. **Incorrect career armour:** the Beaufighter career offer previously used 96 armour when combat used 78; the Bf 110 offer used 90 when combat used 75. Offers now use 78 and 75 to match the actual game. This changes previews/roll generation, not the combat engine's base durability.
4. **Clipped 20-pilot roster:** the grid expanded to its full content height and did not scroll. It now has a bounded scrollport; the nationality dropdown stays visible. Verified with Playwright on both screen types.
5. **Stale regression fixtures:** updated older Bf109/Bf110 stats, the German 12→20 roster, total 32→40, names, painting-atlas assumptions and obsolete SVG-face selectors. Preserved the original British portrait assets.
6. **Missing test coverage:** added eight career-progression/endurance/scroll tests and six scenarios exercising all four modes, six aircraft and condition choices, each run on desktop and mobile.
7. **Cache refresh:** updated HTML asset query versions so published fixes replace prior cached game and career scripts.

## Current nominal flight-balance table
| Aircraft | Speed | Turn | Hull | Armour | Intended contrast |
| --- | ---: | ---: | ---: | ---: | --- |
| RAF Spitfire | 82 | 3.15 | 130 | 40 | Most agile single-engine fighter |
| Bf 109E | 87 | 2.94 | 125 | 42 | Faster, dive-focused; less turning |
| Beaufighter | 75 | 1.85 | 160 | 78 | Heavier protection, shield |
| Bf 110 | 78 | 1.70 | 160 | 75 | Faster cannon attacker, slower turning |
| Lancaster | 66 | 1.30 | 180 | 147 | Durable defensive bomber |
| He 111 | 69 | 1.35 | 175 | 135 | Quicker bomber with less protection |

The data above describes engine baselines, not guaranteed fair win rates. **No statistically meaningful AI tournament, player difficulty study, or per-aircraft kill-ratio analysis was performed.** Career runs roll small variations, and final game balance needs measured play.

## Limits / not certified
- Headless Chromium and emulated Pixel 7, **not actual Android/iOS hardware**, Firefox, Safari or production frame-time profiling.
- Eight-rank career tests start real encounter branches but invoke the encounter completion callback with controlled outcomes. They verify progression, not the ability of a human to beat all ranks in normal dogfights.
- Portrait slot uniqueness and image decode checks are not a substitute for an artist reviewing all faces, exact centering and visible detail at mobile size.
- Not a penetration/security audit, multi-hour memory soak, network-latency study, audio perceptual audit or accessibility screen-reader certification.
- Online matchmaking and multiplayer networking were not validated as implemented.
- The repository did not track a `package-lock.json` at test setup, so `npm install` rather than `npm ci` was required.

## Recommended phased roadmap
### Phase 1 — Permanent automated quality gate
Commit an npm lockfile, standardize browser install and run the full Node/Playwright matrix on every PR and main deployment; capture screenshots/trace on failures, add deployment smoke tests and saved-career migration coverage.

### Phase 2 — Quantitative flight and AI balance
Run seeded tournaments across all aircraft pairs, arenas, difficulties and pilot tactics; track win rate, accuracy, survival time and causes of death, then adjust speed, turn authority, heavy weapons, AI evasiveness and stamina based on measurements. Confirm with human playtesters.

### Phase 3 — Real pilot character differentiation
Make the 40 fixed characters behave as differently as their personalities suggest, with unique approach/escape patterns, meaningful special skill combinations and clear strengths/weaknesses; regression-test each archetype.

### Phase 4 — Road to Ace progression depth
Tune rank-by-rank difficulty through normal gameplay; introduce defined rival rematches, ace bosses, medals, pilot records, career summaries and versioned save migration. Check quit/resume/restart at every node.

### Phase 5 — Art/UI/audio polish
Audit all portrait crops and sex/name pairings visually, polish card readability and keyboard focus, damage/explosion presentation, aircraft visibility against sky colors, touch target sizes, ability cues, sound and accessibility.

### Phase 6 — Replayability and Android-first release
Deep-test Survival, Free for All and 2v2 cooperation, add leaderboards/challenges as appropriate, profile actual Android devices for FPS/memory/rotation/audio, complete Play Store packaging and staged-release testing. Add US/Japanese content only after core systems stay polished.

## Executed automated test inventory
Each browser scenario below was executed on both desktop and mobile-landscape, while each Node test ran once.

### Physics, weapons, AI and engine unit tests — 59 scenarios
1. game initialises and renders without external dependencies
2. starts a match, accepts keyboard and touch input, and survives match updates
3. menu can be restored and a new match started
4. extra-wide landscape viewport expands logical width without distorting pixel height
5. barrel roll inputs and energy-based flight remain stable
6. transient mobile blur during FIRE does not pause the game
7. ramming planes causes no direct health or component damage
8. all three native-sized miniature sprites load in the renderer
9. Fighter Overdrive activates for a bounded duration and has a cooldown
10. Bomber E releases exactly three spaced bombs and retains the rear gunner
11. Spitfire has effective guns while remaining controllable
12. overlapping aircraft cannot inflict point-blank gun damage
13. Overdrive does not teleport the aircraft or force a reverse turn
14. plane models have a dedicated display-sized rendering surface
15. all six unique side-on aircraft are available in art renderer
16. four-aircraft mode spawns distinct pilots with targetable AI
17. horizontal boundaries wrap aircraft without changing heading or health
18. floor collision crashes the plane and finishes the duel
19. ceiling allows exit then re-enters with reversed horizontal heading and no damage
20. ceiling re-entry works during a special reversal too
21. 2v2 uses two sides and never allows friendly-fire to target an ally
22. the four-pilot arena continues after a single AI is destroyed
23. armour absorbs hits before the hull is damaged
24. all classes have their intended simple armour and health
25. damaged aircraft still turn and are not component-disabled
26. Universal W boost is removed and only fighter E triggers Overdrive
27. stall depends on rapid altitude gain, not height or low energy alone
28. Heavy fighter shield reduces damage while active
29. Ground-threat prediction still overrides AI pursuit without universal boost
30. gentle tail assist only engages when lined up behind an opponent
31. keyboard special is reachable with E and roll with Q
32. aircraft do not use component health pools
33. HUD styles all have the same playable game state
34. all six aircraft use distinct tactical class statistics
35. bullet lifetime extends effective range and keeps deliberate class differences
36. bomber rear gunner triggers automatically on a pursuer behind it
37. depleted armour reduces hull; shield only protects and never recharges armour
38. low-health performance loss stays mild and flight controls survive
39. durability hierarchy preserves protection and fighter manoeuvrability
40. campaign rank AI changes tactical decision level without modifying hull or damage
41. real touch hold keeps continuous steering active until the actual touchend
42. wind affects both aircraft symmetrically and drifts bullets much less
43. no-wind round leaves the wind force at zero
44. AI sees a nearby opponent across the horizontally wrapped boundary
45. predicted gun interception accounts for relative movement and wind
46. bullets cross the horizontal boundary and hit an aircraft on the other side
47. duel timeouts count remaining armour as well as hull
48. mobile MENU button returns immediately to the aircraft selector without page reload
49. tail gunner covers the rear cone, not front or distant flank
50. AI bombers wait for an aligned, below-target bombing opportunity
51. a fighter sitting directly behind a Lancaster takes sustained turret damage
52. Phase 8 environment generator paints four distinct cached WWII theatres
53. Phase 8 damage smoke and shockwaves are bounded visual effects, not collision changes
54. climbing trades forward airspeed for height and diving restores it
55. rear turret delivers fighter-like bursts without matching fighter bullet damage
56. the fighter combat HUD and ability naming remain independent of bomb controls
57. steep dives produce useful overspeed that persists after leveling out
58. Spitfire Overdrive gains about 25 percent power; BF 109 keeps previous boost
59. player roll recovers quickly without making AI dodge more often

### Game menus, controls, modes and career UI — 14 scenarios
1. launches and draws the game without uncaught browser exceptions
2. selects aircraft, starts a duel and accepts steering and firing
3. launches four-plane team combat with class-labelled aircraft
4. reverse manoeuvre and wind boost run without browser errors
5. Road to Ace creates a pilot licence and persists it across reloads
6. Road to Ace starts and saves a locked-aircraft three-life run
7. career offers the full predetermined RAF and German pilot rosters
8. rolled airframe is saved and locked for the run
9. mobile landscape controls stay onscreen, hold steering and render at increased resolution
10. visible MENU control returns to aircraft selection while preserving game navigation
11. Phase 8 arenas render distinct cached landscape colours without JS exceptions
12. mobile buttons use centred labels and utilities do not cover the top HUD
13. branded splash leads to mode selection, equipment and a match
14. fighter does not have a bomb control and bomber ability is labelled correctly

### Art, layouts, pilots, career map and accessibility — 23 scenarios
1. flight pads never obscure title, mission briefing, loadout or results
2. operation and sortie buttons remain unobstructed on landscape screens
3. aircraft class identification returns to the live combat HUD
4. fullscreen instruction cannot interrupt operation selection
5. preflight fullscreen is available on title, operations and loadout
6. every pre-game action stays inside the visible landscape viewport without scrolling
7. new portraits render colourful gradients and detailed facial features
8. Road to Ace has a preflight fullscreen control outside its rerendered panel
9. predefined RAF pilots have varied SVG face and hair outlines
10. older saved pilot portraits without hairstyle still render on licence
11. saved pilot can reopen selection safely and keep their career on cancel
12. rank map has eight three-way branching tiers and an active challenge lane
13. Wingman 2.0 title and operation cards load illustrated artwork
14. Wingman 2.0 airframe gallery uses six genuine live aircraft previews
15. Wingman 2 aircraft retain silhouettes while showing six distinct liveries
16. German aircraft display recognisable identities with accurate original designations
17. all fixed pilots use their own painted atlas slot rather than five reused faces
18. active rivals use stable defined identities, separate from historic records
19. aircraft preview remains crisp transparent original geometry instead of enlarged 86px paintings
20. fixed roster gives persistent predesigned identities without erasing career stats
21. forty fixed pilots have distinct RAF and German painted portrait slots
22. every roster name has a portrait-matched gender and no new pilot is preselected
23. legacy saved pilot must explicitly pick a character without wiping progress

### Eight-rank career, losses, saves, exits and roster — 8 scenarios
1. RAF and Luftwaffe can both select a character, retain career on reload and see three real opponent branches
2. eight real career victories ascend exactly one tier each and complete the run
3. three losses consume exactly three lives, preserve defeats and end career without corrupting profile
4. switching a predefined character within the squadron keeps progression and changes signature
5. all 40 pilots have valid unique identity-and-skill profiles and unique art locations
6. abandoning an active career sortie via MENU unlocks the same tier without charging a life
7. rolled heavy fighter armour reflects actual combat armour rather than inflated historical cards
8. roster remains scrollable with the faction selector visible on both mobile and desktop

### Four modes, all six aircraft and arena/difficulty matrix — 6 scenarios
1. operation duel configures and launches the correct playable match
2. operation survival configures and launches the correct playable match
3. operation triple configures and launches the correct playable match
4. operation teams configures and launches the correct playable match
5. six aircraft select, preview and launch with no browser errors
6. every theatre and difficulty can be set before sortie launch

## Commands
```bash
npm install
npm run test:unit
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 npx playwright test --workers=1
```
The override is specific to the test sandbox's Ubuntu 26.04 and pinned Playwright build, not a recommended permanent CI approach.
