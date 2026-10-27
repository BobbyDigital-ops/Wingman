# WINGMAN ✈️
**A tiny, tactical, single-screen aerial duelling game.**

[Playbook and aircraft statistics](docs/GAME_DESIGN.md) · [Next build brief](docs/NEXT_BUILD_BRIEF.md)

## Play the prototype
The repository is a **dependency-free static site**. Open index.html in a
browser, or run a local server:

    python3 -m http.server 8000

Then visit http://localhost:8000

### Controls
| Action | Desktop | Landscape mobile |
|---|---|---|
| Turn left / right | A/D or ←/→ | Left two buttons |
| Fire one full burst | Space | FIRE |
| Special ability | Shift or K | ★ |
| Pause | P | Use browser/app pause for now |

Pick a **Spitfire-inspired fighter**, **heavy fighter**, or **bomber**.
Each has a unique feel and a special ability (boost, mine, bomb).
Gunfire is **committed**: firing launches a full short burst, then locks
the weapon for its cooldown. Do not waste shots.

The v0.1 game is **1v1 against AI, best of three rounds**. Hits damage
both overall hull integrity and a specific component: engine, nose,
body armour, left wing or right wing. Watch the E/N/A/L/R HUD colours.

## Deploy to Vercel
Import this GitHub repository into Vercel as an **Other / static** project.
No framework preset or build command is needed. Serve the repository root
(the directory containing index.html) as the output. Future pushes to the
connected branch will trigger new deployments if auto-deploy is enabled.

## Development
No npm packages, bundling, account keys, external fonts or image hosting.
The rendering surface is **320 × 180** pixels, scaled with crisp nearest-
neighbour pixels. Scenery is cached once; active objects are rendered each
frame using a fixed 60 Hz simulation step.

Run validation:

    node --check game.js
    node --test tests/smoke.test.cjs

## Known prototype limitations
- Online multiplayer and four-player modes **are not implemented yet**.
- Air obstacles and landscape objects are visual for now; edge/ground collisions
  are rudimentary and should be tuned by playtesting.
- The AI is deliberately basic. This is a vertical slice to judge flight feel.
- Nose damage is currently tracked visually but not yet tied to gun accuracy.
- Pixel art is procedural placeholder artwork, not a full sprite set.
- Mobile landscape is primary; Android device testing is still required.
