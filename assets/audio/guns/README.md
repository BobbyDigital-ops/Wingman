# Wingman field-recorded gunfire (v0.2.3)

These seven assets are **CC0 (public-domain) edited recordings** from
[yegors/hard-lines](https://github.com/yegors/hard-lines/tree/main/public/audio).
The source project identifies the original recording collection as
[The Free Firearm Sound Library on OpenGameArt](https://opengameart.org/content/the-free-firearm-sound-library),
which is released under **CC0 1.0**. Recordists credited by the upstream
project: Ben Jaszczak, Brian Nelson, Kevin Heras, and Matthew Nanney.

| Wingman file | Upstream source |
|---|---|
| `mg-0.wav` | `ak47-report-0.wav` |
| `mg-1.wav` | `ak47-report-1.wav` |
| `mg-2.wav` | `ak47-report-2.wav` |
| `mg-tail.mp3` | `ak47-tail-0.mp3` |
| `cannon-0.wav` | `awm-report-0.wav` |
| `cannon-1.wav` | `awm-report-1.wav` |
| `cannon-tail.mp3` | `awm-tail-0.mp3` |

These are **genuine firearm recordings, not recordings of WWII aircraft-mounted
Browning guns or Hispano cannons**. Their timbres are adapted to an arcade
WWII game via per-shot filtering, playback-rate variation and compressed
mixing. Outdoor reflection recordings are played after bursts. All seven
binary files match the Git SHA-1 of the upstream originals.

All audio is bundled locally with the game; the browser does not contact
third-party hosts during play. Native sound synthesis remains the fallback
when samples cannot load or when the user opens `?guns=synthetic`.

No attribution is legally required under CC0; we keep this provenance log
for future maintenance and release auditing.
