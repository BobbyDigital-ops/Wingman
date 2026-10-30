# Wingman v0.8.1 — supplied menu redesign trial

## Source
- User-uploaded `Wingman_Menu_Overhaul_Download(1).zip`, with `Wingman_Complete_Menu_v11_Hangar_Integration.html` and `Wingman_v11_Integration_Guide.md`.
- Also inspected the standalone `Wingman_Menu_v11_Preview.html`.
- As specifically instructed by that guide, these are **layout/design references only**, never production gameplay or pilot-art replacements.

## Implemented on an isolated branch
- RAF Fighter Command home: illustrated poster treatment with Skirmish and King of the Skies as the two clear main choices; operational links to Hangar, Pilots and Options.
- Skirmish operation desk: full real mode choice, live difficulty/theatre/opponent selections, next to the live hangar.
- Aircraft hangar: RAF/Luftwaffe faction rail, aircraft hero with **existing** canonical art, existing-name/card strip, live game speed/turn/armour/damage values, ability description, preserved specialist bonuses, campaign faction lock, sticky back and ready buttons, scroll-safe landscape layout.
- Preserved existing mission briefing, pilot selection, pilot licence, King of the Skies map, save data and their real interactive transitions.
- No reference iframe, source demo roster, fake 0–10 combat stats or placeholder pilot images imported.
- All accepted gameplay, camera, AI, terrain and scene art retained exactly as v0.8.0 except HUD version text.

## Files touched
- `wingman-ui/ui.js` — home, operations and hangar rendering only
- `wingman-ui/menu-v12-reference.css` — scoped new styles and mobile/landscape rules
- `wingman-ui/index.html` — stylesheet inclusion, UI cache update
- `src/ui/wingman-bridge.js` — only iframe asset version updated
- `game.js` — only v0.8.1 on-screen version/phase text
- `index.html` — cache-bust game label
- `tests/menu-v081.test.cjs`, `package.json` — menu integration regression tests

## Validated
- Real game stats appear immediately on switching aircraft.
- Skirmish -> Operations -> RAF aircraft -> switch to Luftwaffe -> Bf 110 -> Review -> Back -> Review -> Arcade launch, preserving difficulty and theatre.
- Campaign -> Aircraft lock by pilot faction -> Review -> Launch with selected canonical aircraft type.
- Original aircraft indices [fighter,heavy,bomber,bf109,bf110,he111] and portrait atlas logic preserved.
- Confirmed same GitHub blob SHAs for career, campaign, swoop physics, pilot roster and aircraft assets; game.js equal to baseline once version-label string is normalized.

## Pending human visual checks
- Android landscape tap sizing, viewport and scroll feel.
- A side-by-side screenshot comparison against the supplied reference and real art.
- Other non-hangar reference pages are represented by their existing live functional equivalents; do not overwrite them with static prototype logic.
- No approval to promote to main has been given.
