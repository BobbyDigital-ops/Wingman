# Wingman — Phase 10E: Combat Difficulty, Boss Balance & QA
Status: implementation complete on the **v1.0.4 development preview branch**. Production `main` remains unchanged.

## Checkpoints
- Base: `feature/v103-regression-bugfix`, commit `7bb292fde5fb315db1fae66de435b13b9ede8083`.
- Frozen rollback: `backup/v103-before-phase10e-20261101`.
- Changes: `feature/v104-phase10e-combat-balance`.
- Gameplay version displayed in the HUD: **v1.0.4**.
- Pilot portraits, approved aircraft paintings, six class stats, aircraft physics, projectile physics, saved campaigns and save schema **14** remain intact.

## Combat tuning performed
1. **Smooth rung-by-rung AI progression.** New standalone pure module `src/campaign/combat-balance.js` calibrates decision proficiency for ranks 1–12 and keeps LOW / MEDIUM / HIGH lane differences meaningful. In the old algorithm HIGH-risk AI saturated at full proficiency by mid-campaign, hiding progression. The new curve includes regional-boss spikes and a recovery rung. Field-order ambushes still reduce tactical skill.
2. **Physical echelon opening.** Multi-aircraft sorties still launch their real aircraft simultaneously, but the second and third opponents enter from separate higher/lower positions, rather than the second aircraft starting closer to the player than the leader. No scripted invulnerability, free manoeuvres or teleporting.
3. **Split pursuit instead of overlapping deathballs.** Enemy flanker route offsets now vary with skill while still steering through existing yaw and inertia.
4. **Escort mission fairness.** Earlier, every enemy assigned itself the protected bomber, frequently destroying the objective while the player remained undamaged. Now the designated interceptor attacks the bomber while the hunter and incoming reinforcements engage its defender. The protected bomber begins behind the player's fighter, but retains its original health, armour, weapons and physics.
5. **Continental regional ace.** Rank 8 gains a minimum **112-second** mission window so its distinct two-phase dogfight can actually be contested, rather than expiring with both aircraft flying.
6. **Meaningful threat ratings.** A documented rank/lane/objective/wingmen/reinforcement model replaces near-universal 100/100 labels on late sorties. The final showdown reads 86, 92 or 98 based on selected lane. These are relative planning ratings, **not measured win odds**.

## Verification
- `npm run test:unit`: **188/188 passing** at the time this document was prepared.
- `npm run campaign:benchmark`: automated campaign workflow passed.
- **312 stock scripted-bot battles**: both factions, all six aircraft, both deterministic trials for every combat route (156 distinct aircraft/mission combinations).
- **108 equipped late-game battles**: rank 4, 8 and 12 encounters across both sides and all three faction aircraft, with the actual `sortieBonuses` function applying plausible upgrades and aircraft specialist bonuses.
- Total **420 seeded combat attempts**, plus real-engine objective checks for escort survival, interceptions, reconnaissance, escape artists, leaders, intel, reinforcements, friendly fire and field orders.
- **0 ground-crash regressions** observed in the automated audit.
- Benchmarks include battle time, enemy engagement/pursuit seconds, enemy evasion, threat-line seconds, tail retention, damage, usable forward-gun accuracy and whether the final commander enters.
- Bomber bomb hits and defensive turret hits are **excluded** from forward-gun accuracy because the events do not use the same tracked shot denominator.

### Interpreting the numbers
Unupgraded scripted bot win rates, aggregated over six very different craft, were about **31% low-risk, 17% medium-risk, and 8% high-risk**. Across the three milestones, stock results were ~22% (rank 4), ~6% (rank 8) and 0% (rank 12). A separate equipped-bot sample gave ~17%, ~11% and 0%, respectively. These are **not human win probabilities**; the scripted bot does not use human tactical reasoning or choose wingman support and pilot skills like a practiced player. Small trial counts and different enemy paths can produce counterintuitive equipped-vs-stock swings.

The rank-12 commander entered combat in a subset of simulated flights, while none of these particular automated pilots reached stage 3. That stage is covered by dedicated unit tests but **needs manual long-form playtesting** before claiming that the final boss is optimally balanced. The final challenge deliberately remains extremely demanding; the benchmark does not establish that it is human-beatable or unbeatable.

## Acceptance priorities
- Desktop and landscape mobile: splash → profile → choose pilot → King of the Skies → select reachable node → mission dossier → original aircraft hangar → combat → menu.
- Rank 4 and 8: see and survive the real boss phase transition, especially rank 8's longer contest.
- Escort rank 7: intercept enemy fighters while the bomber exits behind you; confirm at least one enemy attacks the player and one attacks the bomber.
- Rank 12: commander enters, phase 2 and 3 are visibly announced, no free healing or off-physics boosts.
- Cross-check saved careers, pilot portraits and campaign resource progression.

The targeted Playwright CI workflow is `.github/workflows/wingman-phase10e-browser.yml`. It is separate from older browser cases that target removed menu prototypes. Do not claim browser pass until its current workflow run actually completes successfully.

**Do not promote this branch to production until real mobile and human boss playtesting is complete.**
