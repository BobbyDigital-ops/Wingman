# Wingman — Phase 10D regression repair (v1.0.3)

## Status
**All 177 Node regression tests pass; none are skipped.** The dedicated campaign simulation workflow and twelve-rung benchmark both passed at commit `26c40a51d2f8ad6433945acbb5960b235c86ef13`.

This branch is based on Phase 10D (`feature/v102-boss-rivals`); production `main` is unchanged. A frozen backup of the baseline is at `backup/v102-before-regression-fixes-20261101`.

## What actually failed
The prior run reported 14 failures. They were predominantly outdated test fixtures, not evidence that the approved contemporary flight physics should be rolled back.

1. **Campaign combat harness** — one older integration test failed to load the game's mission doctrine, pilot roster and pilot AI, leaving formation leaders and escaping aces without their actual production rules. The repaired harness now tests *all* current mission objective outcomes, not merely the old nine.
2. **Menu regression fixtures** — older tests expected literal copy or a no-longer-used preflight screen. Revised tests choose an actual connected campaign node, ensure events cannot launch combat, retain faction locks and verify the correct existing assets and aircraft launch.
3. **Reworked world geometry** — an old floor test treated y=245 as the ground, despite the expanded world having a floor near y=400. Ceiling testing demanded an instantaneous horizontal reversal, which conflicts with the current soft recovery. Updated checks assert correct collisions, living/damage state and no artificial momentum snap.
4. **Assisted bomber release** — old assertions demanded bombs be ejected instantly when the ability was pressed. The current ability arms a limited drop opportunity; the new test positions the target on a valid physical flight path and verifies real bomb release and cooldown.
5. **Aircraft statistics and roles** — old exact figures and speed hierarchy no longer described the approved tactical six-airframe balance. Updated checks enforce the actual production figures and meaningful differences in turning, armour, weapons and durability.
6. **Weather and HUD** — a test attempted to check crosswind on a rung now occupied by a noncombat intelligence event; it now checks a real high-risk combat lane. An assertion for a removed `contactRows` renderer was replaced with checks for current objective-aware HUD and reinforcement logic.
7. **AI pursuit and ground recovery** — an old fighter reversal test was positioned inside the ceiling-recovery threshold. The setup was moved to normal flying altitude, and the assert now checks a committed reversal followed by renewed pursuit. A separate test intermittently failed because the matchmaking code randomly selected an opponent aircraft class; that test now explicitly selects a real Bf 109 and a genuine ground-threat geometry.
8. **Version badge** — corrected the displayed game version from the obsolete v0.8.2 to v1.0.3.

No aircraft art, pilot portraits, missions, physics constants, collision radii, saves, or existing campaign upgrade effects were modified.

## Verification
- `npm run test:unit` — **177/177 passed** on `feature/v103-regression-bugfix`.
- `npm run campaign:benchmark` — **passed** on the new branch.
- GitHub Actions `Validate Wingman` — **passed** on the regression-repair branch.
- Separate desktop and mobile Playwright suite — checked independently, not included in the 177 Node tests; its status must be verified from the browser workflow, not inferred from unit success.

## Remaining manual acceptance
On Android/Chromebook landscape, verify tap targets, portrait images, campaign ladder, airframe selection, boss phase transitions and victory/debrief screens before any production promotion.
