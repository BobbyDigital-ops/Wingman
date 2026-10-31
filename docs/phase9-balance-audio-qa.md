# Wingman — Phase 9 gameplay, balance and release-readiness pass

## Branch and safety
- Base: Phase 9A (twelve-rung mixed campaign), commit 4488ec4599a80b9a09be3662c84b10e430b8f395.
- Branch: feature/phase9b-campaign-balance.
- Backup: backup/phase9a-before-phase9-balance-20261031.
- Main and earlier preview branches remain untouched.

## Phase 9B — difficulty and campaign balance
- Pilot progression now spans all 12 rungs (previously capped at rank 8).
- Guard against twice applying the same ranked attribute improvement in mission selection and combat.
- AI difficulty grows through pilot experience, not hidden enemy health or gun damage increases.
- Elite named encounters at ranks 4 and 8, including an optional wingman on the high-risk route.
- All mandatory regional elite fights grant premium upgrade choice; elite routes avoid the normal low-risk setback.
- 12-rung AI benchmark script now excludes non-combat nodes and reports breakdown by region and risk.
- Combat physics, original pilot and aircraft art, input handling and existing menu flow unchanged.

## Targeted real-engine combat sample (scripted pilot)
Production `game.js` and the real physics/AI modules were exercised with two deterministic attempts at each selected mission. These values are **not human win rates**, and the sample is too small for statistical confidence.

| Rung | Encounter | Scripted pilot wins / 2 | Avg remaining integrity | Ground crashes |
|---|---|---:|---:|---:|
| 1 | Standard duel | 2 | 94% | 0 |
| 2 | Medium duel | 2 | 87% | 0 |
| 4 | High-risk elite, 1v2 | 2 | 8% | 0 |
| 6 | Low-risk interception | 2 | 34% | 0 |
| 8 | High-risk elite, 1v2 | 0 | 0% | 0 |
| 9 | Medium duel | 2 | 42% | 0 |
| 11 | Medium escort | 0 | 4% | 0 |
| 12 | Final 1v3 boss | 0 | 0% | 0 |

The QA engine's escort/interception/recon/ace-timer/aircraft-bonus/friendly-fire objective checks all passed, and it recorded no ground crashes. These are useful regression and difficulty signals, not evidence that the campaign is fully balanced for a human player.

## Phase 9C — initial environmental variety
- Selected late-campaign high-risk sorties have declared crosswinds.
- Selected missions include a subtle visual coastal-haze modifier.
- The same wind applies to both teams and uses existing wind physics. Haze changes appearance only, not hit detection or AI vision.
- Hazards appear in the mission banner.
- Additional flak/searchlight/night-weather systems are not part of this pass.

## Phase 9D — audio controls
- Working mute toggle in the illustrated options panel (previously not displayed).
- Working master volume slider, saved to wingman-audio-volume.
- Preserve existing recorded gunfire, engines, impacts and procedural audio.
- Dedicated radio dialogue, music and separate SFX/music sliders remain future production work.

## Phase 9E — checks and mobile polish
- Full 12-rung campaign progression exercised in a scripted integration harness: mixed events, reward claims, elite victories, final boss, completed run and service record persistence.
- Standalone engine exercised for elite reward eligibility, pilot rank growth, event resource changes and volume persistence.
- New tests/phase9-integrated.test.cjs added to npm test:unit.
- Older rank-8 campaign, pilot and smoke tests revised for the 12-rung format.
- A test workflow runs unit tests and the 12-rung AI benchmark on development-branch pushes, when GitHub Actions is available.
- Landscape sizing and keyboard focus styling refined for audio controls.
- Full Node test-suite results, automated browser screenshots, Android physical-device testing, measured player difficulty and real-store release certification have not yet been independently confirmed.

## Suggested quick user tests
1. Start/continue a campaign; check the twelve-rung map and take a supply/intel node, confirming the next rung and stored reward.
2. Fight a normal sortie, then an elite at rung 4 or 8; check that the elite is meaningfully harder and its upgrade reward works.
3. Try a high-risk late-region sortie: check crosswind or haze notices and verify both aircraft behave naturally.
4. Open Options > Audio; toggle sound and move Master Volume, then reload and confirm it persists.
5. On a phone in landscape, test campaign map scrolling, single-node dossiers, Scramble and return from victory/defeat.

## Scope note
This is a playable Phase 9 integration and balancing foundation, not proof that Phase 9 is release-complete. Final difficulty tuning needs full-length AI benchmark results and human playtesting; additional events, audio production and device certification remain outstanding.
