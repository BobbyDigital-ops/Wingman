# Wingman — Road to Ace v2 + Menu & Aircraft Gallery Overhaul
29 October 2026

## Delivered in one phase
1. Explicit portrait/card wording **CONFIRM PILOT**. Selecting a new pilot opens a clear three-step **READY FOR YOUR FIRST SORTIE** screen with one **START ROAD TO ACE** button. There is no redundant, permanent aircraft-choice screen at the beginning of a run.
2. The eight-rank ladder and recurring named nemeses are intact. After picking one of the three missions, the player receives a separate **CHOOSE AIRCRAFT — RANK N** screen with all three same-faction planes, and must click **FLY THIS SORTIE**.
3. Every rank (and every retry after losing) allows a different aircraft. Selected type is persisted in the active run and passed to the game engine. The pilot's personal identity, skill, rank, service records, medals and stats persist.
4. A pilot has one fixed preferred aircraft, set by the existing roster. If they fly it, **hull, armour and primary gun damage** each receive exactly **+10%** during that campaign battle. Other aircraft retain standard stats. The +10% is applied to a copy of the player's own airframe, not the shared global aircraft table, and does not affect enemies or arcade modes. The preflight screen explains and highlights the bonus.
5. Fighter Overdrive acceleration factor was raised from 1.27 × the Spitfire's existing 1.25 speciality modifier to **1.46 × 1.25**. The corresponding fighter Overdrive speed cap rose from **1.52 × 1.25** to **1.68 × 1.25**. A stronger boost still retains a hard speed ceiling, and energy/flight effects remain in force. Other boosted craft receive a proportionate increase (1.27 to 1.40 acceleration factor, maximum 1.78 base speed). The aircraft-specific E ability remains separate from the pilot's Q skill.
6. Reviewed navigation across splash, operation select, arcade settings, career pilot selection, campaign onboarding, mission selection, preflight aircraft choice and results. Added/backstopped visible back routes, clearer non-destructive CHANGE PILOT wording, explicit NEW CAREER (RESET PROGRESS), and fixed the mobile fullscreen button that previously overlapped the career Close control.

## Actual historical aircraft photography
Six **visibly different, real photographs** now overlay the selection-screen canvases; the six locally generated paintings remain as automatic fallback if Wikimedia Commons cannot be reached. Each image is sourced from a Commons file whose page identifies it as public domain.

| In-game aircraft | Wikimedia Commons source |
| --- | --- |
| Spitfire | https://commons.wikimedia.org/wiki/File:Supermarine_Spitfire_Mk_IX_flying_past.jpg |
| Beaufighter | https://commons.wikimedia.org/wiki/File:Bristol_Beaufighter.jpg |
| Lancaster | https://commons.wikimedia.org/wiki/File:Avro_Lancaster_flying.jpg |
| Bf 109 | https://commons.wikimedia.org/wiki/File:Bf109_messerschmitt.JPG |
| Bf 110 | https://commons.wikimedia.org/wiki/File:German_Messerschmitt_Bf_110C_of_ZG_26_in_flight,_circa_1940_(Lot-2787-14).jpg |
| He 111 | https://commons.wikimedia.org/wiki/File:German_Heinkel_He_111s_in_flight_during_the_Battle_of_Britain,_in_1940_(342-FH-3A06233-81282AC).jpg |

Some image references depict different sub-variants/restorations of the aircraft families. All are intentionally selection-screen photography, not exact 1940 in-game liveries. These files are loaded from Commons at runtime; when online content fails the game draws local artwork instead. Future offline-first release should package properly attributed and permission-verified photo thumbnails locally.

## Regression coverage
- Node unit tests verify actual aircraft bonuses, normal aircraft stats and stronger-but-bounded Spitfire Overdrive.
- Browser tests cover confirm/start/mission/aircraft flow, reversing choices without progress loss, selecting different aircraft across ranks, six real images fully loaded, arcade Back buttons and mobile fullscreen overlay avoidance.
- Existing full eight-rank career progression, rival ladder and later 1v3 final boss are included in the regression suite.
- This does not replace subjective playtest of boost strength or physical Android review.