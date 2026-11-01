# Wingman — Phase 10D: Boss Encounters and Returning Rivals

## Goal
Give regional elite missions and the final showdown distinct, clearly announced stages while turning returning enemy pilots into persistent rivals. Preserve the existing flight feel and campaign decisions from Phase 10C.

## Branch and rollback
- Source baseline: `feature/v101-campaign-consequences` at `2e328d246548d49b4c71004b6f79e36affadeb17`.
- Phase 10D development branch: `feature/v102-boss-rivals`.
- Frozen pre-change backup: `backup/v101-before-phase10d-20261101`.
- Production (`main`) has **not** been merged or touched.
- Campaign save schema: **14**. Existing pilots, records, lives, rank, route history, field orders, supplies and upgrades remain intact.

## Encounter design
- **Rank 4, Channel regional ace**: starts with the normal dogfight. Below **55% actual hull**, changes to a tight duellist/scissor-counter plan.
- **Rank 8, Continental regional ace**: starts with high-altitude pursuit. Below **55% actual hull**, switches to interception/crossing-attack style.
- **Rank 12, final squadron**: preserves the previous two-escort launch and the ace's timed/escort-loss entry. Stage 1: escort screen. Stage 2: commander engages. Stage 3: below **45% of the commander's actual hull**, tactical style switches to aggressive brawler.
- Stage transitions are visible by banner and HUD, and stage details appear in the mission dossier. Injured Channel aces commit to scissor-counter manoeuvres, Continental aces attempt crossing attacks, and last-stand commanders use close-in attacks and occasional energy-limited boost pursuit.
- No boss healing, scripted teleporting, damage multipliers, weapon cheats, changes to collision/flight physics, or new aircraft art.
- The existing final win condition remains: defeat both escorts and their commander before the deadline.

## Recurring enemy pilots
- The game chooses previously encountered pilots from the existing 40-person roster, weighting genuine player losses more heavily than wins.
- At the rank 4 and 8 ace-hunt nodes, a returning fighter's **same pilot ID** is preserved through campaign mission decoration; the mission does not silently substitute a generic fighter.
- On the final rung, a previous recurring opponent can become the named commander.
- First-time runs without a previous opponent use the existing deterministic pilot selection.
- Records persist with wins, losses, last result, last rank and streak; details surface in the briefing and debrief. A defeated boss is recognised in the very next retry, without duplicated briefing text.
- Existing approved pilot portraits and aircraft visuals are reused. There is no cartoon replacement.

## QA
- Dedicated new `tests/phase10d-boss-rivalry.test.cjs` covers deterministic recurring-rival selection, three encounter designs, actual-health transition thresholds, no free repairs, save migration from schema 13, pilot identity and UI wiring.
- Latest run on Phase 10D: **177 tests, 163 passed, 14 failed**. The same **14 tests** failed on the untouched Phase 10C checkpoint (**169 tests, 155 passed, 14 failed**). All **8 new Phase 10D tests passed**. These failures are legacy expectations, including outdated aircraft physics, aircraft stat and UI assumptions. They must be investigated separately, not "fixed" by rolling back good combat mechanics.
- GitHub CI syntax check passes. The full legacy suite is **not green**, and this phase has not been certified through manual real-device gameplay.
- A dedicated non-production Vercel preview was created explicitly for the Phase 10D branch. It was not generated automatically by this project's Git integration.

## Recommended acceptance tests
1. On rank 4, visit an elite ace. Verify the two-stage briefing, then reduce the lead below 55% hull: expect a named stage announcement and changed fighter manoeuvres, not a sudden HP refill.
2. Repeat on rank 8 and check the different, intercept-focused style at phase 2.
3. Fight the final squadron: escorts first, commander arrival, then last-stand behaviour below 45% commander hull. Verify the timer, victory and defeat/retry rules.
4. Lose to an elite, continue with a remaining life and revisit the foe. Confirm its name, portrait, record and rivalry wording carry forward.
5. Load a Phase 10C save at a mid-ladder rung with field orders and supplies; ensure no reset and that spent/held operations still behave correctly.
6. Inspect the briefing/debrief, victory panel and rank 12 ladder on Android landscape and Chromebook.

## Next
Validate real-device feel and old browser-specific regression expectations; do not merge to production until accepted. Later, separate phases can add bespoke airship encounters, ground targets, radio audio and release polish.
