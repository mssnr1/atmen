# BREATH

The art of breathing better. A mobile-first PWA for guided breathing exercises, inspired by James Nestor's *Breath*.

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # engine unit tests
npm run build     # type-check + production build with service worker
npm run preview   # serve the build
```

## Architecture

```
src/
  engine/       Breathing engine: pure timing + pausable clock. No UI, audio or React.
    timeline.ts     resolvePlan(), positionAt(), transitionsBetween() — elapsed time → position
    clock.ts        PausableClock on performance.now()
    BreathingEngine.ts  start/pause/resume/restart, phase/status/complete events
  exercises/    Exercise configs (pattern, durations, copy). Add a technique = add a file here.
  feedback/     Audio cues (Web Audio, pre-scheduled), vibration, screen wake lock
  storage/      Versioned localStorage store: preferences + completed sessions
  hooks/        usePracticeSession — wires engine to feedback and storage
  visualization/  How a breath is shown. Reads the engine, never drives it.
    breathState.ts    snapshot → lung volume + airflow rate, shared by every mode
    modes.ts          mode registry (Simple, Anatomical)
    abstract/         Simple mode: the breath sign, its lines filling with light
    anatomy3d/        Anatomical mode: three.js / React Three Fiber
      AnatomyModel.tsx  loads the GLB, drives lung/diaphragm/belly morphs from the engine, heartbeat
      airflow3d.ts      where the air volume is for a breath state (nose → trachea → bronchi → lungs)
      AirVolume.tsx     the air as soft translucent sprites
      Anatomy3DVisualization.tsx  canvas, camera, orbit/zoom/pan limits, reset view, fallback
  stage/        The one room: a single figure behind every screen
    Stage.tsx         mounts the visualization once; screens are layers over it
    stage.ts          useStage(): a screen says what the figure breathes with and how it is framed
    ambient.ts        the figure's own calm breath outside a session, and the last exhale before one
  guide/        Body notes shown while breathing
  lib/
    breathClock.ts    the one ambient rhythm (5.5 s in, 5.5 s out) for figure, wordmark and breath sign
    suggest.ts        which exercise fits now: own answers before/after, else time of day
    weekRings.ts      the history as breath rings
  components/   Buttons, breath sign, wordmark, mood scale, page frame
  screens/      Start, FirstBreath, Practice (with its end), Exercise, History, Learn, Settings, Emergency
blender/        Reproducible Blender scripts, .blend source, preview render, model docs and licence
```

**Light is breath.** Lavender and sky are only ever the breath (lungs, breath sign, history rings);
buttons and cards are neutral, mint marks an effect, red marks acute help. The night look is the
default; the day look draws the figure in ink on paper.

**Timing.** Every position is computed from elapsed clock time, never from counted frames or ticks.
The animation samples the engine each frame; the 50 ms ticker only decides when events fire.
Audio cues for the rest of the session are scheduled on the Web Audio clock at start/resume,
so they stay accurate when the screen is off or the tab is throttled.

**Session length.** Durations are rounded to whole breaths by default (`alignToCycles`), so a session
never ends mid-breath: 2 min → 11 cycles (2:01), 5 min → 27 cycles (4:57), 10 min → 55 cycles (10:05).
Set `alignToCycles: false` for exact durations, or use `{ kind: 'cycles', count }`.

**Adding an exercise.** Box breathing, for example:

```ts
export const boxBreathing: Exercise = {
  id: 'box', name: 'Box Breathing', /* copy… */
  pattern: { phases: [
    { type: 'inhale', durationMs: 4000 }, { type: 'holdIn', durationMs: 4000 },
    { type: 'exhale', durationMs: 4000 }, { type: 'holdOut', durationMs: 4000 },
  ] },
  durationOptionsMs: [120_000, 300_000], defaultDurationMs: 300_000, alignToCycles: true,
}
```

Register it in `src/exercises/index.ts`; the player, animation, audio and haptics handle it unchanged.

**Visualizations.** Each mode samples the engine clock on every animation frame, so switching mode
mid-session picks up at exactly the current point of the breath and never touches the session.
In Anatomical mode a single variable, lung volume, drives everything: the diaphragm descends with it,
the lungs rest on the diaphragm, and the belly is displaced by the same descent. Airflow intensity is the
rate of change of that volume. The air is a WebGL density field (domain-warped noise, Beer–Lambert opacity),
rendered at half resolution because it is soft. Without WebGL, the lungs are tinted instead.

## Notes

- iOS Safari has no Vibration API; the vibration toggle is disabled there. Audio respects the silent switch.
- Session records already have an optional `feedback` field reserved for before/after ratings.

## Anatomy model licence

The 3D anatomy (`public/models/atmen-anatomy.glb`, `blender/atmen-anatomy.blend`) is adapted from
[Z-Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy) (CC BY-SA 4.0) and
BodyParts3D, © The Database Center for Life Science (CC BY-SA 2.1 Japan), and is itself
licensed under CC BY-SA 4.0. See [blender/README.md](blender/README.md).
