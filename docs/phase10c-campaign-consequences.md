# Wingman — Phase 10C: Campaign Decisions & Consequences

## Goal
Make campaign non-combat nodes, supplies and preparation alter later dogfights rather than merely awarding resource points.

## Save and rollback
- Starting build: Phase 10A/10B, v1.0 preview, branch `feature/v100-tactical-ai-missions`.
- Backup: `backup/v100-before-phase10c-20261101`.
- Feature: `feature/v101-campaign-consequences`.
- Production/main untouched.
- Campaign schema: **13**. Old saves migrate without resetting pilot, rank, lives, rewards, earned perks, or route history.

## Tactical preparations
Three consumable field orders are stored in `run.operations` (0–2 each). They are used only when the next actual combat sortie launches.

| Order | How it is earned | Actual next-sortie effect |
|---|---|---|
| Radio intercept | Scout the front at Intelligence node; or buy for 2 supplies during mission planning | Delay each scheduled enemy reinforcement wave by 15 seconds. If the next sortie has no backup, the radio token is preserved. |
| Ambush plan | Prepare an ambush at Intelligence node | Lower each enemy's AI tactical skill parameter by **0.13** on the next combat sortie, without changing airframe physics or weapons. |
| Ground crew favour | Help the ground crew at Mess Hall event; or buy for 2 supplies during mission planning | Start with **25/100** wingman support charge instead of 0/100. |

All three plans have a two-token stock limit. One token per type can be spent on each takeoff. The radio order only consumes when an encounter actually has a backup-wave schedule. Tokens cannot be earned or purchased by opening or selecting a node. Purchasing consumes supplies immediately and fails if there are insufficient supplies or the stock is already full. Used orders are logged in the sortie's after-action report.

## Retained mechanics
Supply crates and repair stations keep their original supply/condition effects. The gunsmith at the quartermaster, the dice gamble, and risky engine tests remain; they now coexist with the short-run tactical orders. Ordinary aircraft upgrades remain attached to the run and their effects still accumulate as intended.

## User flow
1. Choose a connected node from the 12-rung map.
2. For non-combat nodes, select an option and receive a real, visible encounter result showing supplies, aircraft condition, installed upgrades, and any new field orders.
3. Return to the ladder, choose a subsequent battle, and view the held orders in the mission dossier.
4. Optionally spend 2 supplies for radio intelligence or a crew favour (subject to stock and supply limits).
5. Choose an aircraft and scramble. Appropriate field orders activate on takeoff, not on merely viewing the briefing.
6. Fight using the unchanged core physics. Then see the orders actually consumed in the After Action Report, choose a reward if victorious, and return to the unselected ladder.
7. A defeat still costs a life without advancing the rank. Consumed orders remain consumed, and any spent radio delay is not accidentally duplicated on retry.

## Verification
- Pure campaign tests verify supplies, inventory limits, deterministic event outcomes, token persistence, mission-specific wave delay, no-wave carry-forward and loss/retry reset.
- Production combat-engine QA verifies the actual differences in a controlled encounter: radio backup **30s → 45s**, ambush enemy tactical skill **0.8945 → 0.7645**, crew favour **0 → 25** support meter.
- Existing escort, intercept, recon, leader, escape ace, and friendly-fire objective checks still passed in the targeted simulated smoke.
- Saved career integration test: loaded an older rank-2 save, won radio intel, purchased ground help, launched the next fight, observed correct consumption and preserved radio, completed the debrief/reward, advanced to rank 4 without losing lives or pilot data.
- Mock illustrated menu verifies order purchase costs 2 supplies, updates stock, and keeps the selected mission visible.
- Full Node test suite, Playwright browser and real phone tests have not been verified; continue acceptance testing on preview before any production merge.

## Acceptance checklist
- Choose radio intel at a non-combat node, then an encounter with reinforcements. The backup should arrive 15 seconds later.
- After helping the ground crew or buying crew support, the next combat starts with one quarter of the call-for-support bar.
- An ambush should marginally reduce hostile tactical proficiency without changing their aircraft.
- A lost sortie must not give another free radio delay.
- The encounter report, briefing and debrief should describe the earned/held/spent plans clearly.
- Verify landscape mobile layouts are readable and that reward selection still returns to the unselected, connected ladder.

## Next milestone
**Phase 10D — Boss encounters and returning rivals**: multi-stage elite/final encounters, clearly telegraphed tactics and persistent rivalry. Special airships, ground targets and their art remain later-phase content.
