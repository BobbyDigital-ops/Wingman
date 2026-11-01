# Wingman — Phase 10A / 10B: Tactical AI and Mission Variety

## Baseline and rollback
- Baseline: v0.9.5, commit `16da5f0fe7859795f20b1942c1ca23de725b6708`.
- Backup: `backup/v095-before-phase10ab-20261101`.
- Feature: `feature/v100-tactical-ai-missions`.
- Production/main and earlier preview builds are untouched.

## Phase 10A — Aircraft tactics
- Added `src/ai/mission-doctrine.js`, a deterministic tactical doctrine layer: hunter, flanker, interceptor, screen, guard, formation leader, courier, escaping ace and boss.
- Mission-specific enemy targeting: bomber interceptors pursue the protected friendly bomber; screens actively engage the player and bias their interception toward their protected leader; friendly AI wingmen clear threats near the player.
- Flankers offset their intercept toward the target's side instead of using exactly the same tail position as their partner.
- Couriers and escaping aces execute committed escape legs, with normal flight inertia; ground/ceiling recovery has priority. Removed the old early-return escape behaviour that bypassed ground recovery.
- Preserved the v0.9.5 combat AI, role-based aircraft physics, weapons, bomber rear guns, original aircraft/pilot art, player controls and all skirmish modes.

## Phase 10B — Different win conditions
- **The Escape Artist** (rungs 3 and 10, middle route): down a marked evasive ace before the clock expires. His fighter escort is optional. Later version may get another fighter after 42 seconds.
- **Break the Formation** (rung 9, middle route): three aircraft, but the squadron leader is the only required target. The two wingmen try to screen the leader.
- Retained **Intelligence Carrier**: hit the marked carrier, not necessarily its escort.
- Retained **Bomber Escort**: keep the friendly bomber alive until extraction; enemy interceptors target the bomber, not only the player.
- Kept elite engagements, timed intercepts, reconnaissance survival, 1v2 encounters, reinforcement plans and the single final boss.
- The HUD identifies marked leader/escape-ace/Intel targets. The sortie dossier shows objectives, number of initial enemies, reinforcements and each aircraft's tactical role.
- All real-world visuals and character assets remain unchanged.

## Save compatibility
- Incremented campaign schema 11 → 12. Existing saves keep the pilot, lives, earned upgrades, rank, records and route history. Unstarted encounter options regenerate with the new mission plan. Pending rewards remain protected.
- Scripted migration test: rank 9, two lives, previous losses and path history maintained; selected middle mission was Formation Break, reward claimed, advanced to rank 10 Escape Artist with retained stats.

## QA completed
- Pure tactic role, target selection and priority objective tests.
- Full real-engine smoke objectives: interception, escort survival/loss, recon survival/loss, ace-hunt timeout, friendly fire guard, formation leader-only victory, guards-only not-victory, formation timeout, escape-ace victory and timeout. All passed in targeted simulation.
- 26 campaign combat route configurations inspected per faction (52 total), with no invalid aircraft count or opponent data.
- Sample full-engine RAF route sweep: no ground crashes, objective regressions or initialization errors. Simulated AI win rates are not estimates of human difficulty.
- Mocked live menu confirms selected Formation Break displays the objective, three enemies, marked leader and guard roles.
- Entire Node test suite and real phone/Chromebook browser visual checks are not certified by these targeted harnesses. Test in preview before merging.

## Suggested acceptance tests
1. On rung 3, middle route: intercept the evasive ace. Check that taking down the marked ace ends the sortie without shooting the escort.
2. On rung 9, middle route: target the formation leader. Shooting down the two guards alone must *not* count as victory.
3. Try escort and 1v2 combat; enemies should actively pursue their assigned targets rather than orbit endlessly.
4. Check that the briefing lists forces and doctrines; the live HUD labels marked targets; post-sortie debrief/reward returns to a fresh, unselected connected ladder.
5. On Android/Chromebook landscape, check HUD visibility, ladder scrolling and airframe upgrades.

## Next phase
Phase 10C: meaningful event and campaign decisions—intel that changes a future fight, supplies and repairs that matter, persistent short-run buffs/debuffs—after this combat build is accepted. Airship bosses, ground targets, dedicated radio audio and full release QA remain separate future work.
