# Wingman — Bug & Polish Audit
**Audit:** 28 October 2026 · **Target:** browser release + Android landscape · **Baseline:** main before interface-overlap PR  
**Evidence:** user's four landscape screenshots; gameplay/UI source review; GitHub Actions unit-test output; targeted Playwright browser regression suite.  
**Classification:** OBS = visible in supplied screenshot; CODE = code inspection; TEST = automated coverage; VERIFY = still requires browser or real-device confirmation.  
**Do not mistake proposals for verified bugs.** Items marked VERIFY are targeted checks, not proven defects.

## P0 — Immediate release blockers and regressions
- [x] **UI-001 · OBS · FIXED IN PR:** Left/right, SKILL, BOOST and FIRE controls rendered over splash, operation and loadout screens, physically obscuring Back/Continue/Launch. Hide the entire touch-control layer whenever a modal/career/result screen is active. **Pass:** no flight pad visible or hit-testable in non-gameplay screens.
- [x] **UI-002 · OBS/CODE · FIXED IN PR:** Aircraft **class** was removed from combat HUD when cards were simplified. Show YOU/HOSTILE with FIGHTER, HEAVY FIGHTER, MEDIUM/HEAVY BOMBER. **Pass:** canvas displays accurate class for Spitfire, Beaufighter, Lancaster and German equivalents.
- [x] **UI-003 · OBS/CODE · FIXED IN PR:** Browser's fullscreen education notice appeared over menu buttons after Begin Operations. Delay the fullscreen request until Launch Sortie rather than opening mode selection. **Pass:** operation selection itself does not request fullscreen. Browser-native warning on sortie entry may still appear; cannot style/suppress browser chrome.
- [x] **TEST-001 · CI · FIXED IN PR:** Unit-test fake canvas lacked `createLinearGradient`/`addColorStop`, making many otherwise unrelated tests fail after HUD redesign. Extend gradient mocks, then rerun.
- [x] **TEST-002 · CI · FIXED IN PR:** Rear-gun test still expected 7 damage despite balance change to 6; update assertion.
- [x] **TEST-003 · CI · FIXED IN PR:** Roll test expected an unexposed `triggerRoll`; add it and `triggerPilotSkill` to the test's internal instrumentation.
- [ ] **REL-001 · VERIFY:** Require full clean unit + desktop Chromium + mobile-landscape Playwright runs before treating this PR as production-ready; check CI evidence and any artifacts.

## P1 — Navigation, responsive layout and readability
- [ ] **UI-004 · VERIFY:** On 740×360 and 915×412 phones, check *every* menu CTA after keyboard/browser bars appear, including the scroll-to-bottom case. No clipped navigation or unreachable flight settings.
- [ ] **UI-005 · VERIFY:** Check 640×320 and 844×390 landscape and devices with side/bottom cut-outs; adjust safe-area insets and the dynamic viewport fallback only if required.
- [ ] **UI-006 · VERIFY:** Ensure normal play controls remain reachable after leaving fullscreen; their hitboxes must not move offscreen or shrink below 64 px action / 84 px steering.
- [ ] **UI-007 · VERIFY:** Keep MENU and fullscreen controls clear of enemy HUD text for long aircraft names and all aspect ratios.
- [ ] **UI-008 · VERIFY:** Restore the intended current menu section after returning from Road to Ace, licence screens and match results; test both direct and back-navigation flows.
- [ ] **UI-009 · VERIFY:** Confirm modal Back/Next/Launch buttons are topmost hit targets at their centres, including during orientation changes.
- [ ] **UI-010 · CODE:** Standardize gameplay vs menu vs result visibility in one explicit UI state system; avoid relying permanently on layered CSS selectors and stateful flags.
- [ ] **UI-011 · CODE:** `styles.css` and `interface.css` contain multiple competing `pointer:coarse` and `!important` button-size rules. Consolidate into one responsive token system.
- [ ] **UI-012 · VERIFY:** Avoid tap-highlight, selection, long-press, or context menus while simultaneously holding steer and FIRE on Chrome Android.
- [ ] **UI-013 · VERIFY:** On desktop, hide or deliberately diminish touch controls only while playing with keyboard; confirm mouse users can still access touch controls when desired.
- [ ] **UI-014 · VERIFY:** Check portrait rotate hint doesn't trap the player permanently after changing orientation.
- [ ] **UI-015 · VERIFY:** Keep flight controls hidden whenever `#career-screen` is open, even if the underlying game menu is hidden.
- [ ] **UI-016 · POLISH:** Give selected aircraft a recognisable national marking and silhouette; current equipment choices are text cards without a visual aircraft preview.
- [ ] **UI-017 · POLISH:** Use consistent names for SKILL / BOOST / BOMBS and pilot specials across menu, HUD, keyboard help and in-game buttons. The same button changes aircraft roles.

## P1 — Combat readability & feedback
- [ ] **HUD-001 · VERIFY:** Health and armour strips remain distinguishable at low values and with accessibility contrast settings; add small keyed legend for new players.
- [ ] **HUD-002 · VERIFY:** In 3- and 4-plane modes the HUD only directly describes the first opposing pilot. Design a compact squadron roster for every combatant.
- [ ] **HUD-003 · VERIFY:** Opposing team faction label should reflect the actual airframe; avoid RAF-vs-RAF confusion as a side effect of a random enemy selection.
- [ ] **HUD-004 · POLISH:** Show aircraft skill and gun readiness contextually; do not add bulky fixed panels.
- [ ] **HUD-005 · VERIFY:** Damage and armour feedback is perceived as it happens (shot impact, flash, sound, debris, visible health change).
- [ ] **HUD-006 · VERIFY:** Introduce a readable boost/pilot-skill cooldown cue close to controls without covering aircraft or scenery.
- [ ] **HUD-007 · VERIFY:** ROUND/VICTORY banners can appear across aircraft and bullets near the screen centre. Shift or fade them so critical play remains visible.
- [ ] **HUD-008 · VERIFY:** Enemies/players near top edge must remain identifiable under the HUD gradient; labels and projectiles must not disappear under opaque top bands.
- [ ] **HUD-009 · VERIFY:** White and pale-blue HUD text must remain legible over bright alpine and coast skies.
- [ ] **HUD-010 · POLISH:** Replace sterile “IAS 75” bar with a small mechanically evocative meter only if it still reads well on mobile.
- [ ] **HUD-011 · POLISH:** In-game alert sound and damage feedback should match the WWII theme without repetitive harsh beeps.

## P1 — Gameplay balance & controls regression
- [ ] **PLAY-001 · VERIFY:** A held turning thumb produces uninterrupted full-circle rotation; no 90-degree tap limitation or intermittent touch cancellation.
- [ ] **PLAY-002 · VERIFY:** Simultaneous steer + FIRE + SKILL works with distinct touch identifiers and release order.
- [ ] **PLAY-003 · VERIFY:** Spitfire dive → overspeed → swoop-up consumes speed naturally; overspeed remains bounded.
- [ ] **PLAY-004 · VERIFY:** Spitfire 25% stronger Overdrive retains consistent HUD and cooldown behaviour; BF 109 remains distinct.
- [ ] **PLAY-005 · VERIFY:** Fighter/heavy/bomber turn authority is distinct without making heavy aircraft practically unplayable.
- [ ] **PLAY-006 · VERIFY:** Player roll recovers rapidly, AI roll frequency stays controlled, and defensive invulnerability is not excessive.
- [ ] **PLAY-007 · VERIFY:** Beaufighter and Bf 110 armour tuning yields reasonably paced kills, not unresponsive damage sponges.
- [ ] **PLAY-008 · VERIFY:** Lancaster/He 111 rear gunners punish sustained tailing, but not a fleeting high-speed pass.
- [ ] **PLAY-009 · VERIFY:** Wind occasionally varies by direction/magnitude and doesn't cause unavoidable crashes.
- [ ] **PLAY-010 · VERIFY:** Fullscreen/blur/orientation change never leaves steering stuck or gameplay paused indefinitely.
- [ ] **PLAY-011 · VERIFY:** Ground crashes and top-edge re-entry remain fair at extreme boosted dive speed.
- [ ] **PLAY-012 · VERIFY:** Campaign pilots' class, airframe rolls, skill and upgrades persist after reload.

## P2 — Menu art direction and interaction polish
- [ ] **ART-001 · POLISH:** Title splash: add larger aircraft portraits and clear RAF/Luftwaffe conflict framing; current in-repo sprite illustrations remain small.
- [ ] **ART-002 · POLISH:** Replace generic gradient-only backgrounds with purposeful briefing-map, hangar, or operations-room motifs.
- [ ] **ART-003 · POLISH:** Differentiate operation modes with distinct iconography and visual hierarchy, not four identical rectangles.
- [ ] **ART-004 · POLISH:** Show aircraft silhouette, speed/turn/armour trade-offs and national colours in loadout selection.
- [ ] **ART-005 · POLISH:** Proper selection transitions, focused state and tactile button depression for both touch and keyboard navigation.
- [ ] **ART-006 · POLISH:** More atmospheric battlefield terrain variety; current alpine peaks read as repeated polygon shapes.
- [ ] **ART-007 · POLISH:** Improve plane visual scale and readability without silently changing collision radius or balance.
- [ ] **ART-008 · POLISH:** Distinct hit, flame, crash and smoke visuals per severity; remain performance-budgeted.
- [ ] **ART-009 · POLISH:** Result screen should show sortie stats and a convincing after-action document, not just a victory label.
- [ ] **ART-010 · POLISH:** Reduce menu blur of actively animated background if it distracts from menu choices.
- [ ] **ART-011 · POLISH:** Ensure glyphs, fonts and textures remain crisp on Chromebook and Android high-DPI displays.
- [ ] **ART-012 · POLISH:** Introduce optional subtle UI animations, with reduced-motion respected.

## P2 — Architecture, performance, mobile readiness
- [ ] **TECH-001 · CODE:** Rendering runs continuously during menus. Consider pausing expensive combat canvases and animating only a cheap static intro scene until sortie starts.
- [ ] **TECH-002 · CODE:** High-DPI canvas scale reaches 2.5–3; profile battery/heat/GPU fill rate on real midrange Android.
- [ ] **TECH-003 · CODE:** Standardize one responsive coordinate system for CSS UI, low-res scenery, model overlay and hit testing.
- [ ] **TECH-004 · CODE:** Audit repeated CSS rules, specificity overrides and accidental z-index interactions before further interface redesigns.
- [ ] **TECH-005 · CODE:** Avoid repeated per-frame gradient/object allocation in HUD; cache or reuse where safely possible.
- [ ] **TECH-006 · VERIFY:** Test resize/orientation/fullscreen transitions repeatedly for stuck pointers, inconsistent DPR and lost canvas contexts.
- [ ] **TECH-007 · VERIFY:** Detect and surface `webglcontextlost`/canvas context errors where relevant; ensure graceful fallback.
- [ ] **TECH-008 · VERIFY:** Compare sustained 60s, 5min and 15min mobile frame pacing and memory stability in combat, 2v2 and career.
- [ ] **TECH-009 · CODE:** Separate stateful input/menu presentation from the main physics module to make testability and release reviews easier.
- [ ] **TECH-010 · VERIFY:** Review localStorage corruption, quota errors, save-version compatibility and cross-device expectations.
- [ ] **TECH-011 · VERIFY:** Make deployment cache-busting deterministic (asset hashes rather than manually edited date query strings).
- [ ] **TECH-012 · POLISH:** Define Android PWA installable/offline baseline before Google Play packaging; don't confuse this with present browser release.

## Regression matrix and release gate
- **Playwright/Chromium desktop:** splash → mode → loadout → combat → MENU; class labels drawn to canvas; all links and buttons keyboard/mouse usable.
- **Playwright/Chromium mobile landscape:** 915×412 and 740×360; menu controls absent; CTA centres hit-test as intended; game controls visible only during play; multi-touch hold tests.
- **Deterministic Node unit tests:** all smoke tests pass including canvas fake gradients, Roll, altered 6-damage rear gun, dive and AI behaviour.
- **Real Android manual QA:** fullscreen browser warning, physical keyboard bars, 60Hz touch holds, gesture nav and cut-outs; Playwright emulation is not a substitute.
- **Release acceptance:** no failing CI checks, no JS page errors during transitions, no obscured controls, visually correct class labels, exact production commit verified before promoting.

## Suggested sequencing
1. **Now:** UI-001/002/003 and TEST-001/002/003; run regression suite; release.
2. **Next:** UI-004–015 and HUD-001–009; inspect every responsive viewport.
3. **Then:** PLAY-001–012; balance changes only after cross-class test fights.
4. **Finally:** ART-001–012 and TECH-001–012; prioritise visual payoff vs Android performance.

_This is a comprehensive working inventory, not a claim that all investigative items are already failing._