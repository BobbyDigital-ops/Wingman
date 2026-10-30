# Wingman v0.8.2 — menu flow, mobile hangar and full campaign ladder

Based on the user-uploaded `Wingman_Complete_Menu_v11_Hangar_Integration.html` and its integration guide.

## UX flow
Fresh launch: RAF splash → three independent service records → select existing pilot or create one with the live roster → main menu.
Subsequent visits during the same selected profile can return home directly. Change Profile is available from the home screen. Existing v0.8.1 career is migrated without deletion into service record 01.

## Profiles and storage safety
`src/ui/profile-slots.js` manages three isolated snapshots containing `wingman-road-to-ace-v1` and `wingman-arcade-v1`, but the game keeps reading and writing its original canonical keys.
Switching profiles saves the current keys, restores the target snapshot, and reloads the whole page to avoid mixing in-memory career state between pilots. No changes to pilot IDs, portraits, aircraft assets or metadata.
A new empty slot opens the existing live character roster.

## UI
- Main: keep Skirmish, King of the Skies, service licence, Change Profile, and Options. Remove Hangar/Pilots shortcut buttons.
- Skirmish: actual mission-type dropdown with difficulty, theatre and 1v1 opponent dropdown. Operates on the original game config fields.
- Hangar: **no repeated configuration dropdowns**. Display a compact selected-flight summary, three approved aircraft images, original aircraft specs and sticky action bar. Mobile landscape CSS fits the viewport without requiring page scroll.
- Campaign: full-width, internally scrollable 8-rank ladder by default. Bottom action opens a separate mission/rivals/aircraft-condition screen; back button restores full ladder. Tapping a current-rank node selects and opens its mission.
- Existing briefing, campaign systems, pilot records, art, physics, scenery and AI remain unchanged.

## QA
- Script syntax and menu state tests for splash/profile/home/mission select/hangar/briefing/launch/campaign ladder and sortie view.
- Independent-storage migration and roundtrip tests for career plus arcade records.
- Same game code as v0.8.1 except the v0.8.2 visible version label.
- Headless flight QA: 120 simulated matches, zero ground crashes; nine campaign objective checks pass.
- Mobile CSS is designed for no-scroll layout; human screenshot/playthrough verification remains necessary.

## Checkpoints
Original v0.8.1: `backup/v081-before-layout-refinement-20261030`.
Implementation branch: `dev/v082-menu-flow-mobile-campaign`.
Do not promote to `main` without user approval.
