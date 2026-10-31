# Wingman — Phase 9A: twelve-rung mixed encounter campaign (preview)

## Baseline and rollback
- Starting build: v0.8.5 feature/v085-selected-campaign-sortie (commit b08a7b7c099c8cc240ebc758f29be74e68881bf7).
- Protected branch: backup/v085-before-phase9a-20261031.
- Working branch: feature/phase9a-twelve-rung-mixed-encounters.
- Production main and previous preview branches are unchanged.

## What's implemented
- Twelve encounters distributed across three regions of four rungs each: Channel Defence, Continental Front and The Final Push.
- Three choices per rung, with combat or non-combat encounters. Combat remains available on all non-boss rungs.
- Elite combat at rungs 4 and 8, mandatory final three-plane combat boss at rung 12.
- New non-combat encounter types: Field Supplies, Intelligence, Mess Hall Event, Quartermaster/Shop and Hangar Dice.
- Interactive two/three-option events with real saved outcomes: supplies, airframe repairs, upgrades and deterministic risks.
- Non-combat choices do not call game.js flight-start. They increment rank and log the event, without incrementing combat wins.
- Unaffordable purchases and dice wagers disabled in the UI and rejected by the campaign engine.
- The illustrated v11 campaign chart now displays twelve rows and themed event symbols.
- Single selected-event dossier retains the v0.8.5 layout, pilot record and navigation.
- Current-run outcomes appear as a feedback banner when an event is resolved.
- Older saved runs migrate to schema 9 without clearing pilot history, rank, lives, supplies or pending rewards.

## Core implementation
- src/campaign/king-of-skies.js — deterministic node layout, event choices, outcomes and region mapping.
- career.js — rank 12 rules, save migration, event advancement and service log.
- src/ui/wingman-bridge.js — non-combat action bridge and combat guard.
- wingman-ui/ui.js — mixed chart, event dossier, buttons and updated rank labels.
- wingman-ui/menu-v17-phase9a.css — event visual styling.
- tests/campaign-phase9a.test.cjs — new event and progression regression coverage.
- Existing campaign and menu tests updated for 12-rung design.

## QA and limitations
- Checked JS parsing for core campaign, legacy career and illustrated UI.
- Exercised pure campaign planner for all 12 ranks and all three lanes.
- Exercised resource updates, invalid action rejection and the illustrated event choice from rung 2 to rung 3.
- Loaded an older schema-8 saved run into the real career script with a mock DOM, then verified rank/lives/history persistence and event advancement.
- The full Node test suite and Playwright real browser suite have not been executed in this environment. They must be run before merging to production.
- Phase 9A is a first playable content framework. More story/event variety, reward pacing, route constraints, sound and balancing remain future phases.
