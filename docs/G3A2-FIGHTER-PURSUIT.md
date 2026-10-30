# Wingman G3A.2 — Fighter pursuit recovery fix

Date: 30 October 2026. Version: `v0.3.2`.

## What the player reported

A recorded 20.5-second Spitfire-versus-Bf 109 dogfight showed the enemy
fighter repeatedly pitching vertically rather than chasing. The new bomber
evasion implementation was initially suspected, but the Bf 109 is a fighter.

## Confirmed cause

The `aiInput` fighter-specific ceiling check still forced
`p.aiMode='recover'` whenever `p.y<46`. That was a legacy safety
rule: ground recovery tries to pull aircraft back towards y=~107, but the
game now has a separate immediate top-of-screen reversal. As a result, the
two recovery systems competed near the top of the arena.

In a deterministic player-fighter versus Bf 109 simulation, the enemy
spent 351 of 843 simulation frames (41.6%) in recovery mode. Importantly,
the same fighter behaviour was reproduced on **v0.2.3**, before the bomber
changes. Therefore simply reverting to the pre-bomber game would not solve it.

## Fix

At the top of the arena, the fighter enters normal `intercept` rather than
ground `recover` mode. This allows the existing ceiling re-entry logic to
handle the boundary independently while the fighter remains engaged. The
normal predictive **ground recovery** remains fully intact. This fix
does not alter physics, manoeuvrability, bomber evasive flying, damage,
weapons, controls or art.

## Deterministic A/B results

| Result | v0.3.1 | v0.3.2 |
| --- | ---: | ---: |
| Bf 109 recover-mode proportion in reproducible 14s duel | 41.6% | 21.0% |
| Bf 109 hit accuracy in 360-match simulation | 26.89% | 27.81% |
| Bf 109 AI win rate in 360-match simulation | 54.2% | 57.5% |
| Ground crashes in 360 matches | 0 | 0 |
| Invalid physics states | 0 | 0 |

Additional 30-match storm/crosswind ace-level fixture: 0 ground crashes
and 0 invalid physics states. Both Lancaster and He 111 still dropped bombs,
although total bombs fell because fighters now engage more effectively.

A new smoke regression checks a fighter placed near the ceiling remains
in intercept mode and does not reactivate ground recovery.

## Limitations

Deterministic tests confirm the cause and improved combat engagement.
They do not replace a hands-on real-browser check of animations and player
feel. Any remaining bobbing should be reviewed visually before making
more speculative AI changes. The earlier
`releases/g3a1-bomber-evasion` and `releases/g2-3-recorded-guns`
checkpoints remain available for restoration if necessary.
