# Wingman — Game design and aircraft balancing (v0.1)

## Vision
A skill-first, single-screen, side-on aerial duelling game for landscape mobile.
Not bullet hell: every gun trigger commits to a short burst, followed by a
vulnerable cooldown. Positioning, turning radius, altitude and damage matter.
Prototype: player vs one AI, best of three. Goal: later online 1v1, 2v2 and
four-player free-for-all using the same small-arena combat rules.

## Visual direction
- Crisp, deliberately chunky 16-bit-inspired pixel art; NOT photorealistic or toy-like.
- Logical canvas resolution **320 × 180**, scaled using nearest-neighbour pixels.
- Tiny, plausible side-profile aircraft silhouettes, with scenery taking most of frame.
- Limited colour palettes, layered snowy mountains, pine trees, castle/fortress, water.
- Pre-rendered scene and lightweight arcade sprites for mobile performance.
- No external image assets required in prototype; scene and aircraft are drawn by code.
- Prototype background props are decorative. Only arena floor and edges interact with flight.

## Controls
Mobile in landscape: left thumb turns left/right; right thumb fires or uses special.
Desktop: A/D or left/right arrows, Space for gun, Shift/K for special, P to pause.
Aircraft move forward automatically; turning affects direction and velocity follows
with inertia. Diving gains speed, climbing loses speed. Hard prototype arena
bounds reflect aircraft; revisit soft boundaries based on playtesting.

## Aircraft

| Parameter | Fighter (Spitfire-inspired) | Heavy fighter | Bomber |
|---|---:|---:|---:|
| Base forward speed, px/s | 62 | 49 | 40 |
| Turn rate, rad/s | 3.35 | 2.35 | 1.73 |
| Hull points | 110 | 160 | 205 |
| Collision radius, px | 8 | 10 | 12 |
| Shots per committed burst | 6 | 4 | 4 |
| Time between shots | 0.085s | 0.14s | 0.17s |
| Gun cooldown after final shot | 2.05s | 2.55s | 2.7s |
| Damage per gun hit | 12 | 23 | 11 |
| Bullet speed, px/s | 165 | 155 | 135 |
| Special cooldown | 7.5s | 8.5s | 5.6s |
| Special | 1.2s speed boost | Air mine, arms after 0.7s | Gravity bomb |

**Fighter:** superior turn rate and speed; lower armour; requires skilful aiming.
**Heavy fighter:** dangerous short cannon burst, average turn radius, defensive mine.
**Bomber:** large profile, strong hull, sluggish in duels; must get above a target
to use gravity bombs effectively. All values are first-pass tuning, not final balance.

## Burst rule — core of the game
A button tap spends an entire burst. The gun cycles the listed number of shots
automatically. After the last projectile, cooldown starts. Spamming/tapping while
firing or cooling down does nothing. This rewards waiting for an opening; shooting
too early invites a counterattack. Gun projectiles are individually simulated and
can miss. Future balancing may add aim spread, range falloff, or burst cancellation
penalties — only if playtesting warrants them.

## Component damage
Each plane tracks 5 component integrity values (0–100):
- **E** — engine/propeller. Reduces speed and climb performance.
- **N** — nose/front armour. Independently tracks frontal impacts; future gun penalty.
- **A** — body/side armour. Lower integrity amplifies incoming hull damage.
- **L** — left wing. Reduces turning in the negative/left direction.
- **R** — right wing. Reduces turning in the positive/right direction.

Hits lower total hull points **and** one location-specific component, based on the
projectile's position relative to the aircraft's heading. Effects are simplified:
the engine retains at least 52% propulsion at zero integrity; each wing retains
at least 40% turn authority. The plane should remain playable when wounded.
The HUD currently uses compact E/N/A/L/R coloured indicators; an illustrated
damage silhouette is a future feature.

## Match design
- AI shares the same flight/weapon/cooldown and damage rules as player.
- AI attempts to approach the player's tail; shoots only when roughly aligned.
- AI bomber drops on a lower target; heavy fighter deploys mine in close pursuit.
- Collisions between aircraft and with the bottom ground cause damage.
- First to win two rounds wins the match.
- Each round has a 90-second limit; on timeout the higher fraction of remaining
  hull health wins. A close tie counts as a draw.
- No online multiplayer, unlock currency, matchmaking or accounts in v0.1.

## Architectural roadmap
1. **v0.1 / done:** testable static webpage; three planes; flight and energy; AI;
   1v1 rounds; gun bursts; damage zones; bombs/mines; canvas art; touch controls.
2. **v0.2:** test physics/balance on actual Android devices; tune AI tactics;
   improve terrain/collision readability and wing damage visuals; sound toggle.
3. **v0.3:** sprite atlas, coherent palette, 2–3 scenic maps, weather as optional
   mechanic, more varied opponent behaviour, accessibility settings.
4. **v0.4:** refactor to deterministic input-driven simulation with seeded RNG,
   reliable state snapshots, server-authoritative multiplayer, rollback/interpolation
   strategy; online 1v1 before 2v2/four-player matches.
5. **Later:** unlockable sidegrade planes (no pay-to-win), matchmaking,
   optional cosmetics and leaderboard.

## Explicit constraints for contributors
- Keep logic readable and the touch UI landscape-first.
- Keep the game single-screen and small, avoid heavy visual effects or particle spam.
- Treat **burst/cooldown/flight handling** as protected design pillars.
- Do not claim multiplayer is supported until network synchronisation is implemented.
- Do not replace aircraft with photorealistic or high-poly assets.


## v0.2 visual/scale direction — 27 October 2026
- Aircraft sprites now live in \`src/art/aircraft.js\`, made from individually
  defined pixel rows and rendered using a cached sprite canvas per class.
- The actual render dimensions are small: fighter ~16×7, heavy ~19×9,
  bomber ~20×10 pixels. All remain recognisable side profiles.
- The game uses a **minimum 480 logical pixels wide**, expanding with the
  mobile landscape screen aspect ratio up to 650, with a constant 180 height.
  More horizontal arena area is shown; do not enlarge aircraft proportionally.
- Spawns are at about 19% and 81% of world width; collision radii are now
  6 / 8 / 9 for fighter / heavy fighter / bomber.
- Scenery was reorganised for less dense mountain repetition, more open sky,
  less intrusive valley slopes, and distant environmental objects.
- Art is still a lightweight in-code pixel-art prototype and should be
  compared critically against the original agreed visual mockup on a real
  Android device before finalising colours or silhouettes.
- Future work: verify sprite loading on-device, refine propeller animation,
  remove hard-boundary reversal exploits, improve altitude/energy handling,
  terrain collisions, and artwork.


## Phase 2 — Flight, manoeuvres and class skills (October 2026)

Implemented arcade flight-energy reserve (0–100). Sustained climbs drain energy,
dives restore it; near-zero energy reduces speed and turning authority. Aircraft
still have continuous forward movement. Arena boundaries use an inward corrective
turn instead of a hard instant reflection. These are intentionally arcade
approximations, not a full aerodynamic model.

**All aircraft have a standard barrel roll:** a briefly invulnerable-to-bullets
defensive manoeuvre. During the roll, regular gun bursts cannot be initiated.
It does not protect against bombs, mines or collisions. A recovery period follows.
Touch: ROLL button. Keyboard: L. This is NOT the plane's special skill.

**Distinct weapons:**
- Spitfire: 10 small rounds, damage 6 each, 0.075s apart, 2.0s cooldown.
- Heavy fighter: 3 cannon rounds, damage 22 each, 0.19s apart, 2.8s cooldown.
- Bomber: 4 defensive rounds, damage 9 each, 0.17s apart, 2.4s cooldown.

**Class skills:**
- Spitfire: Break Turn, fast near reversal with energy / speed penalty, 8s cooldown.
- Heavy fighter: reinforced armour for 10s; damage reduced by 60%, 20s cooldown.
- Bomber: bombing run launches three staggered gravity bombs, 12s cooldown.

AI uses the same guns, rolls and class skills under basic contextual rules.
The next development focus is real-world Android playtesting: tune energy,
stalls, edge manoeuvring, HUD legibility, and AI tactics (including avoiding
the repetitive chase-circle pattern). Damage-awarded powerups are **not**
implemented; their balance must be assessed separately.
