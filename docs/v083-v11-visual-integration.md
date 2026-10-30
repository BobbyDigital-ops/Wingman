# Wingman v0.8.3 — v11 menu visual integration

## Baseline and safe rollback
- Branch: feature/v083-v11-visual-integration
- Started from v0.8.2 commit a97f2aef08aa6291e721281d61ab7a1ba338aa1c.
- Preserved backups: backup/v082-menu-before-v11-visual-pass-20261030 and backup/main-before-v11-visual-pass-20261030.
- Production branch main was not changed.

## Implementation
- Imported the original user-approved v11 background artwork from the uploaded HTML file to wingman-ui/v11-art/{title.jpg,personnel.jpg,operations.jpg,hangar.webp,campaign.jpg}.
- Added menu-v14-v11-art.css as the final menu stylesheet, layered over v13. It updates splash, profile, operations, hangar, home, campaign, dossier and outcome backgrounds; introduces the original visual palette and tactile controls.
- Campaign retains the functional eight-rank ladder and live rival/game state while receiving an operations-chart parchment treatment, route accents, physical panel edges and war-room scene.
- Options now has the v11 two-column cockpit console, three instrument gauges, grouped Gameplay / Controls / Audio / Graphics tabs and the original parchment/metal visual language.
- Existing functional difficulty, theatre, sound and fullscreen controls are used. Gameplay presets persist in wingman-ui-flight-presets-v1; Reset Flight Presets restores default difficulty/theatre.
- Main poster headline now adopts the v11 "Choose Your Adventure" composition.
- Existing aircraft sprites, pilot portraits, aircraft IDs, AI, flight simulation and campaign save keys were not changed.

## QA performed
- Verified uploaded background assets and CSS references exist on the feature branch.
- Verified ui.js compiles and UI initialization succeeds in a mocked DOM.
- Exercised options pane switching and controls; validated difficulty/theatre persistence and reset.
- Exercised an eight-rank campaign rendering with a live saved run and verified its mission selection.
- Added tests/menu-v083.test.cjs to the repository's unit test script and aligned the older v0.8.1 main-menu test to the approved Change Profile behaviour.
- Vercel preview build returned READY.

## Remaining acceptance review
- Visual pixel-to-pixel comparison on actual desktop and Android Chrome has not yet been completed. The v11 HTML is a prototype, so live components use its art and material design instead of copying placeholder gameplay or portraits.
- Before production promotion, manually inspect landscape layout, touch targets, campaign ladder scroll, options panel fit, player record preservation, and gameplay transitions.
- No gameplay balancing/physics change was made in this pass.
