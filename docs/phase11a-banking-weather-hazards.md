# Wingman — Banking, weather and environmental hazards
Development scope: **Flight physics/handling visual polish** and **Hazards & encounter variety**, following the 31 October 2026 development control document.

**Version:** v1.1.0 preview. **Branch:** `feature/v105-banking-environment-hazards`. **Safe rollback:** `backup/v104-before-environment-banking-20261101`.

## Completed
- Flight silhouettes now **visibly bank left/right in proportion to real turn velocity**. The transition is smoothed and automatically levels out. Fighters bank faster than heavy fighters; bombers respond more slowly. NPC and human aircraft use the same renderer.
- Banking uses the approved existing painted aircraft/sprite assets. It applies only a bounded 2.5D visual shear/foreshortening, never changes hit boxes, orientation, bullet vectors, yaw, aircraft physics or save data. Corkscrew and rolling specials override normal banking as before.
- Dynamic cloud banks, fog/haze, rain, storms with brief lightning, and sun glare. Cloud cover and fog are cosmetic visibility effects only and do not secretly change hit detection.
- **Shared storm wind** uses the existing global wind force, with more gust variance in storms. Crosswind missions retain their existing stronger, symmetric rules. No player-only buff/debuff.
- **Flak** in designated later sorties and selectable in Skirmish: visible world-space marker appears ~1.9 seconds before the airburst. Neutral 7-point damage is applied within the real burst radius to either side, while respecting spawn protection and one hit per burst.
- **Searchlights** in designated later sorties and selectable in Skirmish: sweeping neutral beams expose low-flying aircraft; continuous exposure can trigger a 5-point ground-flak hit with a cooldown. Same danger for RAF and Luftwaffe.
- **No surprise final-boss artillery.** Rank 12 has storm atmosphere but no additional neutral damage hazard.
- Mission data declares its weather and hazards; the selected-node dossier shows the condition label and meaningful warning text.
- Skirmish has **WEATHER** dropdown: Auto, Clear, Clouds, Fog, Rain, Storm, Sun Glare, Flak, Searchlights. Weather selection is preserved with the user's other Skirmish presets.
- Emergency no-module fallback keeps legacy mechanics functional. Old saves and the campaign save schema are unchanged.
- No new cartoon artwork or pilot portrait replacements.

## Where to test
Skirmish → WEATHER is the fastest way to preview every effect.
1. Choose **Storm**, start a duel and steer repeatedly in both directions: both aircraft should visibly bank then smoothly level when steering stops.
2. Test **Rain**, **Fog** and **Sun Glare**, checking aircraft silhouettes, aiming reticle, performance and visibility on a phone.
3. Test **Flak**: the marker should warn before a small neutral explosion. Neither team has immunity.
4. Test **Searchlights**: beams sweep low sky. They only threaten aircraft caught low in their cone for long enough.
5. Check an ordinary campaign combat mission and especially a boss encounter: no new save bugs or unexplained damage.

## Automated acceptance
- 202 Node regression and feature tests passed at feature implementation commit, including campaign saves, physics/AI and dedicated fairness/visual-banking cases.
- 420 real-engine seeded campaign attempts are executed by the tactical campaign verification workflow, including the new environmental module.
- Chromium desktop and Android-style landscape acceptance runs cover the existing menu flow, Skirmish weather choice, real turn banking, explicit hazard missions and weather screenshots. Specific counts and SHA must be checked on the latest workflow run before declaring final success.
- Sample screenshots from current-menu Chromium tests are archived in the `phase11a-desktop-mobile-visuals` GitHub Actions artifact when the workflow completes.

## Known limits
- Banking is an intentionally restrained **2.5D illusion on existing side-on aircraft paintings**, not full 3D roll geometry; user visual sign-off remains necessary.
- Fog/clouds and glare alter visual contrast, but do not provide AI invisibility or alter aim/weapon calculations.
- Automated mobile Chromium checks are not physical-device performance certification. Real Android FPS, multitouch interference and feel require a manual device pass.
- Do not treat seeded bot win rates as human odds or ship directly to production: manually review combat and fairness first.

## Release controls
All changes land on this preview branch only. Preserve the backup branch and keep production `main` unchanged until the stage is approved.
