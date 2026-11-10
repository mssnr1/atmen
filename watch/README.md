# Fluo for Apple Watch (test app)

A first native watchOS version of Fluo: choose an exercise, breathe with the
pre-rendered 3D figure from the web app, a wrist rattle that swells with the inhale and fades with the exhale, insight
cards and the "gut gemacht" end screen.

- `FluoWatch/Frames/` – one Resonance breath rendered from the web app's 3D
  figure (120 frames, 416×496 = 46 mm display). Frames 0–54 inhale, 55–64 rest,
  65–119 exhale; other rhythms map their phase progress onto these ranges.
- `FluoWatch/Fonts/` – Inter (SIL OFL 1.1).

## Build

```sh
brew install xcodegen
cd watch && xcodegen generate
open FluoWatch.xcodeproj
```

Simulator: pick an Apple Watch simulator and Run. Own watch: sign in under
Xcode > Settings > Accounts (a free Apple ID is enough), choose the team under
Signing & Capabilities, connect the paired iPhone, turn on Developer Mode on
iPhone and watch, then Run on the watch. Free-account installs expire after
7 days.
