# Wingman v0.3.4 — G3B tactical dogfighting AI

Date: 30 October 2026.

## Intent
Replace continuous right-to-left patrol-like passes with deliberate fighter interception,
pursuit, target tailing, a physically flown turn after overshooting, and threat-driven evasions.
The player, AI and bombers still use the production aircraft flight model. Existing
weapons, hulls, artwork, menus, campaign and bomber flight plan remain unchanged.

## Problems isolated
- AI used to **extend away** whenever guns were cooling down. It could repeatedly fly off
  rather than keep a firing position.
- Recomputing the shortest turn on every near crossing could reverse bank direction.
- Floor recovery was activated too early for fighters and too late for slower heavy fighters.
- A previously committed turn could resume *after* terrain recovery and cause a crash.
- Evasion could start merely from a nearby enemy pointing in the general direction,
  even without a current gun burst.

## G3B flight decisions
- Fighter: intercept or rejoin, track and tail, fire only when the real guns are aligned,
  bank through a short committed overshoot turn, evade while under gun threat.
- Heavy fighter: a higher and wider attack lane with longer predicted terrain clearance.
  It cannot instantly copy a single-engine fighter's tight turn.
- Bomber: retains the separate G3A bomber flight plan, rear turret and bombing logic.
- All manoeuvres use ordinary physical steering (no velocity teleport, invulnerability,
  screen-edge wall or arbitrary damage).
- Emergency terrain recovery cancels an unfinished fighter break so a saved aircraft
  doesn't resume its old dive.

## Controlled real-flight verification
15-second flight simulations executed against the loaded production JS flight model
and the G3B AI function, with moving player targets, three fixed altitude corridors
(y=85,120,165), both horizontal directions and reproducible seeds. Aircraft fly
using production `updatePlane` and `WingmanFlightPhysics`.

- Bf 109: survived 30/30 fixtures; average time in a tail position increased from
  **76 frames** on v0.3.3 to **254 frames** on G3B; average gun-burst frames
  from **102** to **136** in the same moving-target scenarios.
- Spitfire: survived 24/24 additional fixtures.
- Heavy + Bf 110: after separate heavy-flight safety tuning, both aircraft
  survived a combined 36/36 fixtures (three seeds per corridor/direction).
  Their slower handling favours wider attack passes, not tight tail chases.
- Lancaster + He 111: bomber AI unchanged; survived 48/48 moving-target fixtures.

These controlled flights are **not** player playtesting, a balanced win-rate claim,
or a complete proof of terrain avoidance under every possible trajectory.
Check campaign fights and real mobile control before promoting from preview.

## Version, tests and safety
- Version label: v0.3.4 G3B.
- Regression tests cover cooldown pursuit, overshoot banking, under-fire evasions,
  break cancellation during ground recovery, ceiling behaviour and heavy anticipation.
- Development is isolated on `dev/tactical-ai-rebuild-v034`; original v0.3.3 `main`
  is not replaced until the new AI preview proves itself.
