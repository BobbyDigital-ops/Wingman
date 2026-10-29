# Wingman — Spitfire Skill, Luftwaffe Characters & Hangar Gallery
29 October 2026

## 1. Pilot skill fixed and made legible
- Player Q and touch SKILL both activate the selected pilot's individual ability. Without a career profile the standard default is BARREL ROLL.
- A successful barrel roll has a visible full-rotation animation, and its existing half-second invulnerable roll window and seven-second skill cooldown remain intact.
- The touch skill button now identifies the actual ability (ROLL, REVERSE, SMOKE, etc.) and displays remaining cooldown seconds, an active highlight and an accessible status label.
- An on-screen cue reports successful activation and recharging. Failed/recharging inputs return false and do not mislead the player.
- The aircraft-specific ability remains on E (Spitfire OVERDRIVE). Pilot SKILL is Q; they are distinct controls.

## 2. Fixed Luftwaffe pilot identities
- The German roster is canonical and frozen after loading. Each of 20 characters has their own identity, stats, signature skill and distinct painted slot.
- The existing German portrait atlas is 384 × 560 pixels, with twenty 96 × 112 tiles. Its image regions have 20 unique pixel fingerprints.
- Six portraits show women (tiles 3, 5, 11, 14, 16 and 18); their six roster identities now have female first names and gender metadata. The remaining fourteen have male first names and artwork.
- Removed a late roster-name override that turned a male character into Lotte while its image stayed male. Kept the existing comedic names and female identities where they match the illustrations.
- Corrected the unintended portrait mapping swap; all 20 German pilot selection cards now use unique direct atlas slots.
- Older saved German pilot identities are reconciled to canonical names/genders while preserving career statistics and custom callsigns.
- The original British portraits, existing German paintings and all 40 aircraft/pilot gameplay traits are preserved.

## 3. Aircraft selection illustrations
- Added src/art/hangar-illustrations.js for six independently themed promotional scenes, separate from live flight rendering.
- Individually graded RAF/Luftwaffe environments, clouds, painted horizons, cloud glow, contrails, frame patina and propeller effects now accompany the six existing, recognisable aircraft silhouettes.
- Corrected the old over-enlarged aircraft preview scale, allowing the whole aircraft to fit on the card.
- Made card labels responsive and correctly contained, shortening only small labels where appropriate (BF 109E EMIL, BF 110, HE 111); the large identification and aircraft spec remain.
- Combat aircraft shapes, hitboxes, physics and performance remain unchanged.

## QA
- Dedicated Playwright coverage checks all 20 German painted faces have distinct pixel fingerprints, female/male matching, one-to-one rendered crop positions, key Q and actual touch skill input, distinct scene canvases, and card label bounds.
- Full existing desktop Chromium and emulated mobile landscape regression retained.
- Image/portrait and gameplay assets are local; no remote runtime image service or new external downloads required.
- Future aesthetic art upgrades can replace individual hangar illustrations without touching physics or aircraft identity.

## Final QA sign-off
- **79/79 Node unit tests passed** after the final identity and save migration changes.
- **123/123 runnable full-suite Playwright tests passed, with one intentionally skipped desktop-only touch test**, covering career, normal combat, all aircraft, portraits, menus, and emulated mobile landscape. The comprehensive suite was completed before the final saved-identity migration addition.
- **11/11 final focused browser checks passed, with one desktop-only touch check skipped**, on the complete latest code. Includes twenty visually distinct German portrait hashes, both keyboard Q and real mobile SKILL touch, independent six-plane hangar canvases, card bounds, and legacy career migration on both desktop and mobile.
- Verified that the changed image and presentation code remains separate from aircraft physics, collision shapes, weapon power, and the rest of career progression.
- Browser emulation does not replace a human visual review or an actual physical Android touch test.
