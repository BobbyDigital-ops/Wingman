# Wingman — Combined Phase 4 + Phase 5 delivery
**Build date:** 29 October 2026  
**Scope:** Road to Ace campaign expansion and presentation/audio polishing

## Phase 4 — Road to Ace

### Mandatory 1v3 final squadron
The eight-rung structure and the three selectable routes at each rung are retained. At rung eight, **all three routes face the same final named ace**, with two distinct named escorts chosen per route. This makes the final showdown compulsory rather than a third-lane optional fight.

- Two wingmen enter initially, with separate identities, flight types, pilot attributes, personalities and skills.
- The final ace enters after **20 seconds** or immediately following the **first escort loss**, whichever occurs first.
- An offscreen boss is marked as *queued*, not defeated; early escort kills cannot terminate the battle.
- The final ace enters with normal hull/armour, rank-eight AI proficiency and temporary spawn safety. No arbitrary boss hit-point multiplier.
- **All three aircraft must be destroyed** for victory; the player losing or the battle timer expiring is defeat.
- Boss and escorts coordinate different high/low attack lanes, retaining each pilot's underlying temperament.
- Combat HUD shows an incoming-ace countdown and arrival callout; scoring explicitly distinguishes final squadron/1v3 from 2v2.

### Nemeses, promotions and persistent records
- Previous rivals who have appeared in the service record are favoured for reappearances above rank 4.
- The final boss is the highest-ranked remembered rival when one exists, or a deterministic roster ace otherwise.
- Pilot stats and personalities scale according to the completed Phase 3 proficiency model, while flight model, raw weapon damage and aircraft hull remain unchanged.
- Persistent **service log** (last 32 sorties), with opponent name, rank, mission, number of opponents and win/loss.
- Persistent **streak and longest streak**, including proper resets on a loss.
- Service ranks: Rookie, Flying Officer, Flight Leader, Ace Commander, Legendary Ace, with visible promotion announcements.
- Six earned decorations: First Victory, Triple Ace, Veteran Wings, Two Against One, Iron Will, Wingman Legend.
- Completed-career summary with final ace, confirmed kills, best streak, medals and previous missions.
- Old saved career profiles are migrated in memory for the new optional fields; active rank-eight saves regenerate the new compulsory final-squadron choices.

### Encounter variety
- Tactical branch labels distinguish interception, high-altitude duel, hunter patrol and double-ace missions.
- Existing optional 1v2 missions remain at the third branch of ranks 3, 5 and 7.
- Each route continues to use its own battlefield arena choice.
- New labels are **briefings and combat variants**, not new objective systems such as convoy escort or bombing targets. Those remain future features.

## Phase 5 — Visual, interface and original audio
- The six existing aircraft silhouettes and all approved RAF/Luftwaffe portrait assets remain unchanged.
- Added carefully bounded aircraft soot, camouflage wear and damaged-panel details without resizing models or altering collision.
- Improved overdrive contrails, kill confirmations, and more readable combat announcement ribbons.
- Final-ace approach timer and dramatic entry announcement.
- New campaign medal gallery, flight record/dossier, promotion ribbons, final squadron cards, finale ceremony and mobile-responsive layouts.
- Original synthesised **Web Audio** motor tone, gunfire, impacts, explosions, specials, final ace introduction, victory and defeat music cues. No recorded or copyrighted sound files are used.
- Engine pitch responds to airspeed, and becomes rougher at lower hull condition.
- Persistent sound-on/off setting, available through desktop navigation or mobile operation menu.
- No external dependency required for assets or sound effects; browsers without AudioContext keep silent game functionality.

## Tests and remaining limitations
- Stage-boss combat tests verify queuing, early escort kill, 20-second reinforcement, distinct aircraft/pilot identities and the requirement to eliminate all enemies.
- Career browser tests validate full eight-rung progression, named double-ace and final-squadron branches, saved decorations, service-log persistence and remembered nemesis.
- Browser tests cover unique portrait slot mapping, worn/damaged artwork variants, persistent audio mute and desktop/mobile layout.
- Tests use **controlled career win/loss callbacks** for campaign progression; they do not demonstrate an actual human defeating the final squadron.
- The audiovisual work is a substantial **polish pass**, not individually repainted aircraft art or 40 new portrait illustrations.
- Audio perception, Bluetooth latency, native Android/iOS performance and extended human play-balancing are not verified by headless browser automation.

## Suggested next priorities
1. Human-playtest the 1v3 and tune escort arrival and damage pressure using recorded outcomes, preserving the three-stage mechanic.
2. Add actual alternative mission objectives (convoy defence, interception timer, bomber escort) behind clear automated victory conditions.
3. Add proper menu-level audio sliders/options and assess procedural sound on physical devices.
4. Follow with Phase 6 Survival/Free-for-All/2v2 replayability and Android performance optimisation.
