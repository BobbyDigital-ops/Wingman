# Wingman v0.3.3 — Fighter pursuit correction

Date: 30 October 2026.

## Observed issue

User gameplay recordings show a Bf 109 repeatedly circling the map rather
than pursuing the player's Spitfire. The earlier G3A.2 ceiling-recovery fix
improved some cases but did not address the repeated screen laps.

## Root cause confirmed in code

When an enemy fighter was in `attack` mode, close to its target
(`range < 65`), and pointing away (`facing > 1 rad`), the AI used to
replace its real target with a waypoint **in front of its own aircraft**:

```js
if(p.role==='fighter'&&p.aiMode==='attack'&&range<65&&facing>1){
  tx=p.x+p.vx*.65;
  ty=clamp(p.y-35,45,H-30);
}
```

This directed the AI *away* from the target precisely when it should turn
back and attack. Combined with the screen seam and ground recovery, it
produced repeated orbits and strange vertical loops.

## Correction

Remove the forced forward waypoint. The existing intercept solution,
skill-dependent aiming, real turn-radius and normal ground-recovery systems
remain intact. We deliberately rejected other prototypes that inflated
AI win rates or caused ground crashes.

## Objective checks

- Targeted regression: Bf 109 53 units from a target, facing 2.35 radians
  away, now commands a **negative turn back toward the target**. The old
  steering override steered in the wrong direction.
- Deterministic reproduced flight: target-facing frames increased
  **29.3% to 50.5%**, time moving away from the target fell from
  **64.5% to 37%**, and firing frames increased **68 to 102**.
  These compare like-for-like 14-second controlled scenarios.
- Full production-swoop tournament: **360 matches**, no invalid physics
  states or ground crashes, Bf 109 win rate **55%**, hit accuracy
  **32.05%**. Bomber attacks remained functional (Lancaster 224 bombs,
  He 111 212).
- Ace-level storm/crosswind: **30 matches**, no crashes or invalid physics.

These are simulation measurements, not a substitute for judging pursuit
in the user's browser with varied real player controls.

## Safety / rollback

This revision only changes one bad close-range steering decision. It does
not alter aircraft art, physics, weapons, audio, damage or bomber tactics.
Saved release checkpoints `releases/g3a1-bomber-evasion`,
`releases/g3a2-validated` and `releases/g3a3-pursuit-correction`
permit rollback or comparison. Do not force-push `main`.
