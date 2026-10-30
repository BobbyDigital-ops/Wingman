# Wingman v0.8.2 — reference-spec menu flow and mobile navigation

Source: previously uploaded `Wingman_Menu_Overhaul_Download(1).zip` / `Wingman_v11_Integration_Guide.md`, and actual Android landscape screenshots.

## Flow
1. Splash: **Press to Start**
2. Personnel office: **Select your Service Record**, three genuinely independent local slots
3. Empty slot: existing real pilot roster, preserving original approved portraits and names
4. Existing slot: Main Menu, **Skirmish** and **King of the Skies**
5. Skirmish: real mission dropdown, faction, skill, battlefield and 1v1 opponent dropdown
6. Aircraft hangar: existing RAF/Luftwaffe aircraft images and stats, full-screen landscape layout without scrolling
7. Mission review → actual game through existing bridge. Campaign retains its own aircraft-faction lock.

## Save model
`src/profile/profile-slots.js` loads before `game.js`, `arcade-records.js` and `career.js`.
The first migration snapshots existing canonical localStorage keys `wingman-road-to-ace-v1` and `wingman-arcade-v1` to slot 0. It retains those legacy live keys as canonical while selected.
Switching profile: save the current canonical records to the active slot, restore the target slot's records to the canonical keys, then reload the parent document so campaign and game caches reinitialize. Do not switch while the game is playing.
If a target slot has no career, it remains empty until the user selects a pilot from the existing roster. No saved slot is deleted by this flow.
A sessionStorage marker returns to Home or pilot selection after a safe reload.

## Campaign ladder
- Default **EXPANDED MAP** fills the width of the viewport.
- Ranks and connections are in a dedicated map scroller.
- Three compact mission choices remain selectable; selected mission and **SELECT AIRCRAFT** are visible in a lower command strip.
- **VIEW MISSION DOSSIER** switches to full-width detailed statistics, condition, repairs and mission orders; **EXPAND LADDER** returns to map.

## Mobile rules
For landscape heights up to 530 CSS pixels, aircraft selection is one fixed-height viewport. Duplicate mission settings are hidden on the hangar because they already exist on Skirmish; the existing selected values still flow to the briefing and game. Aircraft art, live stats, faction controls, three aircraft choices and sticky Back/Ready actions all remain accessible. Tall/portrait screens retain scrollable layouts.

## Regression and constraints
- Three independent saves, legacy preservation, switching and active-sortie refusal: tested.
- Splash → profile → Home → Skirmish dropdown → Hangar → Briefing → arcade launch: simulated end-to-end.
- Campaign ladder expand/dossier toggles: simulated.
- Game physics, AI, backgrounds, campaign rules, pilot roster and art source SHA unchanged from v0.8.1. `game.js` changed only the on-screen version/phase label.
- Human visual verification on actual Android/iOS landscape is still required before merging to main.
