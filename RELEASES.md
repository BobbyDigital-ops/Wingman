# Wingman release checkpoints

Each finished development phase receives an **immutable snapshot branch** under
`releases/` before starting the next major phase. The production game is built
from `main`; the release branches are recovery points, not active development
branches. Never commit ongoing work to a snapshot branch.

## Checkpoints

| Game version | Development phase | Snapshot branch | Commit | Summary |
| --- | --- | --- | --- | --- |
| v0.1.3 | G1 | `releases/g1-physics` | `079509683bbe76a5a036276094905c3571d9e204` | Flight physics, aircraft profiles, RAF crosshair and AI safety baseline |
| v0.2.0 | G2 | `releases/g2-weapons` | `7c0c89a20ae6fc7384ff770a5f1b6ecfd52dfa40` | Tracers, bombs, explosions, smaller gunsight |
| v0.2.1 | G2.1 | `releases/g2-1-audio` | `7714357c2f1c525c21659d01a6bbb2afd5be3883` | Improved bombs, gun audio and bomb whistles |
| v0.2.2 | G2.2 | `releases/g2-2-stable` | This checkpoint's branch head | Smaller dark crosshair and WWII bombs; physical AI dive recovery; distinct gun, metal-hit and crash sounds; in-game version display |
| v0.2.3 | G2.3 | `releases/g2-3-recorded-guns` | `926d29994067b4d94abe6f215a2592ebee6665e1` | CC0 recorded gunfire, outdoor reflection tails, dynamic compression, legacy synthetic comparison |
| v0.3.0 | G3A | `releases/g3a-balance-baseline` | This checkpoint's branch head | AI bomber altitude-hold and realistic bombing runs; corrected swoop-physics tournament; 390-match baseline and long-running regression gates |
| v0.3.1 | G3A.1 | `releases/g3a1-bomber-evasion` | This checkpoint's branch head | Defensive bomber S-turns, physically bounded climbs/dips, threat-response behaviour; 390-fight A/B benchmark and evasion regression gate |
| v0.3.2 | G3A.2 | `releases/g3a2-fighter-pursuit` | This checkpoint's branch head | Fighter near-ceiling AI no longer enters false ground-recovery mode; verified AI pursuit against 390-match benchmark |
| v0.3.3 | G3A.3 | `releases/g3a3-pursuit-correction` | This checkpoint's branch head | Removed incorrect close-range fighter steering that forced flight away from the target; added regression for target-directed re-engagement |
| v0.3.4 (preview) | G3B | `releases/g3b-ai-preview` | This checkpoint's branch head | Tactical interceptor, short banked fighter reversals, under-fire evasions, role-specific safe recovery and moving-target simulation checks; awaiting live playtest before production |

## Rollback procedure

1. Locate a release branch above, and compare its game in a **preview deployment**
   before changing production.
2. To restore, create a new main-branch commit that restores the selected
   release branch's files. Avoid overwriting protected history or force-pushing
   main. Alternatively, use Vercel's rollback/promotion controls when available
   to reassign production to the previously verified deployment.
3. Verify the production alias points to the desired build and test a sortie
   (menus, flight, audio, controls, and campaign state).
4. Preserve player save compatibility where possible; a code rollback does not
   automatically roll back `localStorage` game saves.

## Versioning rule

During development use `v0.<major phase>.<release revision>`. The version appears
in the centre of the HUD during a sortie, next to the Wingman name. Future
completed phases should be committed, tested, deployed, and then bookmarked
under `releases/`. Older release branches should never be repointed.
