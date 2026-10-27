# Wingman — coding brief / next implementation prompt

Repository: https://github.com/BobbyDigital-ops/Wingman

## Current state
Wingman is a dependency-free HTML/CSS/Canvas game, logical resolution 320x180.
The initial version already has mobile touch controls, one AI rival, three plane
types, committed machine-gun/cannon bursts, cooldowns, damage zones, mines/bombs,
a fighter boost, and best-of-three rounds. Read the existing files before editing.

## Exact next development brief
> Work directly in the linked Wingman repository. Preserve its existing
> lightweight static deployment. First reproduce gameplay in desktop and
> landscape mobile viewports and fix any runtime or touch input bugs. Then
> prioritise *feel*: tune constant-forward flight, energy loss in climbs, gains
> in dives, turning radius and screen boundary behaviour. Burst firing is the
> core tactical mechanic: one tap must commit to the entire burst, and missing
> must leave a meaningful post-burst cooldown. Verify that all three classes
> can win against each other through manoeuvring and positioning, rather than
> one class being simply stronger. Keep component damage affecting controls,
> and improve visibility with a tiny plane-part HUD that doesn't obscure play.
> Make the pixel art more coherent if useful, but keep 320x180 and few effects;
> avoid generating high-fidelity art or adding huge dependencies.
>
> Run basic tests and manual checks for keyboard plus landscape touch controls,
> repeated matches, pauses, firing during cooldown, bombs, mines, and collisions.
> Report changed files, results, limitations, and specific remaining issues.

## Acceptance checklist for next pass
- [ ] Runs in browser without console errors; mobile landscape usable.
- [ ] Left/right simultaneous touches handled gracefully; touch fire/special work.
- [ ] Plane always moves; bank/turn feels controllable, no unfair edge trapping.
- [ ] All burst shots are consumed; cooldown blocks premature repeat.
- [ ] Fighter, heavy fighter and bomber feel meaningfully different.
- [ ] Speed, turning, health respond to part damage; feedback is clear.
- [ ] Enemy is fallible and obeys the same rules as the player.
- [ ] Frame rate and memory stay stable on an Android midrange phone.
- [ ] Round resets and rematches do not retain old projectiles or inputs.
- [ ] Single screen, no clutter and no bullet hell.
