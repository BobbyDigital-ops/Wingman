# Wingman v1.1.1 — Visual Feedback Patch
**Status:** preview branch only. **Scope:** feedback on banking, clouds, searchlights, flak and wind, following the 31 October 2026 development plan.

## User issues and corrections
- **Banking too subtle:** significantly stronger projected art transform (up to 55% vertical foreshortening with a visible roll shear), a subtle wing-planform projection behind the approved aircraft image, faster response, smooth levelling. Both RAF and Axis aircraft, players and AI. No change to physics or collision geometry.
- **Odd white circles:** replaced the pale oval cloud marks with irregular, elongated layered cloud bands and textured silhouettes. The existing approved scenery stays intact. Rain preserved.
- **Remove searchlights:** removed them from mission generation, environmental runtime, hazard rendering and Skirmish options. Saved old searchlight sorties are safely converted to fog for presentation and actual play; save schema unchanged.
- **Flak too tame:** one actual damage/warning region, but four staggered smoke/flash puffs, dark irregular airburst clouds, shrapnel streaks and a separate layered flak report. Decorative puffs cannot deal additional damage. Neutral hit rules and advance warning preserved.
- **Wind unclear:** every sortie now shows a functional RAF-style striped windsock, with cloth direction and actual airspeed drift. Strong storm wind (base 25 campaign / 29 Skirmish), guaranteed storm/rain gust fields and stronger declared crosswinds. Aircraft on both sides are physically pushed in X, with small symmetric vertical turbulence in storms. The existing gun lead accounts for shared crosswind; no player-only drift penalty.
- **Cache:** incremented in-game version to `v1.1.1` and refreshed JS asset version strings.

## Verification
- Node test suite: 204 regression/feature cases in the latest code.
- Dedicated Chromium desktop/phone-landscape suite: 13 tests.
- Tactical campaign suite: 420 real-engine scripted sorties; used as reproducible functional checks, **not** human skill win odds.
- Tests confirm retired searchlights, safe legacy encounters, flak warnings and single damage event, windsock direction, aircraft banking, symmetric motion, full menu launch, mobile viewport and original aircraft sprites.
- All changes are on `feature/v111-visible-banking-clouds-flak-windsock`.
- Rollback checkpoint `backup/v110-before-effects-feedback-20261101` freezes the previous v1.1.0 code.
- Production `main` is unchanged. No changes to pilot portraits, aircraft types/skins, saved-run schema or core handling formulas.

## Human review before next phase
1. Skirmish → Storm: bank repeatedly, compare left/right, release and watch the wing level.
2. Fly level on Storm and Rain: feel the lateral drift, read the direction and magnitude from the top-centre windsock.
3. Skirmish → Clouds: confirm no big white circular marks remain.
4. Skirmish → Flak: wait for warning ring (~7 seconds), then inspect multi-puff burst (~9 seconds) and sound. A single hit can damage either side.
5. Confirm Searchlights no longer appear. Verify Fog, Rain and mobile performance.
6. If approved, resume the plan with audio/combat feedback and further environmental polish as needed.

This is still a development preview, not a release candidate.
