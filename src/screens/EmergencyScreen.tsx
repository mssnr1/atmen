import { useEffect, useRef, useState, type ReactNode } from "react";
import { BreathingBubbles } from "../calm/BreathingBubbles";
import { calmText } from "../calm/texts";
import { CloseIcon } from "../components/icons";
import { useI18n } from "../i18n";
import { formatClock } from "../lib/format";
import { navigate } from "../lib/route";

/** A slow, simple rhythm without holds: 4 s in, 6 s out (6 breaths a minute). */
const IN_MS = 4000;
const OUT_MS = 6000;
const CYCLE_MS = IN_MS + OUT_MS;
/** A new calming sentence every two breaths. */
const LINE_EVERY = 2;
const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x);

/**
 * Acute help: one big circle to breathe with, a calm sentence that changes
 * every two breaths, and below it grounding, the coming community help and
 * where to find real help in an emergency.
 */
export function EmergencyScreen() {
  const { lang } = useI18n();
  const s = calmText[lang].sos;
  const circle = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState({
    inhale: true,
    left: 4,
    cycle: 0,
    elapsed: 0,
  });

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const ms = now - start;
      const t = ms % CYCLE_MS;
      const inhale = t < IN_MS;
      const size = inhale ? ease(t / IN_MS) : 1 - ease((t - IN_MS) / OUT_MS);
      if (circle.current)
        circle.current.style.transform = `scale(${0.58 + 0.42 * size})`;
      const left = Math.ceil(((inhale ? IN_MS : CYCLE_MS) - t) / 1000);
      const cycle = Math.floor(ms / CYCLE_MS);
      const elapsed = Math.floor(ms / 1000);
      setTick((p) =>
        p.inhale === inhale &&
        p.left === left &&
        p.cycle === cycle &&
        p.elapsed === elapsed
          ? p
          : { inhale, left, cycle, elapsed },
      );
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const line = Math.floor(tick.cycle / LINE_EVERY) % s.lines.length;

  return (
    <main
      className="relative min-h-dvh overflow-hidden bg-paper"
      data-testid="sos"
    >
      <BreathingBubbles cycleMs={CYCLE_MS} variant="long-out" />
      <div className="safe-area relative mx-auto flex w-full max-w-md flex-col px-5 md:max-w-xl">
        <header className="flex items-center justify-between">
          <span className="text-[0.9375rem] font-medium text-ink-2">
            {s.title}
          </span>
          <div className="flex items-center gap-2">
            <a
              href="tel:112"
              className="inline-flex h-11 items-center rounded-full bg-alert/10 px-4 text-[0.9375rem] font-medium text-alert ring-1 ring-alert/30 backdrop-blur-xl"
            >
              {s.emergencyCall}
            </a>
            <button
              type="button"
              aria-label={s.close}
              onClick={() => navigate({ name: "home" })}
              className="inline-flex size-11 items-center justify-center rounded-full bg-card/70 ring-1 ring-line backdrop-blur-xl"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>
        </header>

        {/* The breath: fills most of the first screen, so nothing else needs reading. */}
        <section className="flex min-h-[calc(100dvh-9rem)] flex-col items-center justify-center pb-6">
          <div className="relative grid size-[min(78vw,22rem)] place-items-center">
            <div
              ref={circle}
              className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_40%_35%,var(--bubble-air-core),var(--color-air)_75%)] opacity-90 shadow-[0_0_80px_-10px_var(--color-air)] will-change-transform"
              style={{ transform: "scale(0.58)" }}
            />
            <div className="absolute inset-0 rounded-full ring-1 ring-air/30" />
            <div className="relative text-center text-white">
              <div
                key={tick.inhale ? "in" : "out"}
                className="sos-fade text-[1.75rem] font-medium md:text-[2rem]"
              >
                {tick.inhale ? s.inhale : s.exhale}
              </div>
              <div className="mt-1 text-[1.125rem] tabular-nums opacity-80">
                {tick.left}
              </div>
            </div>
          </div>
          <p
            key={line}
            className="sos-fade mt-10 min-h-[3.5rem] max-w-xs text-center text-[1.1875rem] leading-snug text-ink md:max-w-sm md:text-[1.375rem]"
            aria-live="polite"
          >
            {s.lines[line]}
          </p>
          <p className="mt-4 text-[0.8125rem] text-muted tabular-nums">
            {s.since(formatClock(tick.elapsed * 1000))}
          </p>
        </section>

        <section className="space-y-3 pb-10">
          <Card>
            <h2 className="text-[1.0625rem] font-medium">{s.groundingTitle}</h2>
            <ol className="mt-3 space-y-1.5 text-[0.9375rem] text-ink-2">
              {s.grounding.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ol>
          </Card>

          {/* Community help: only sketched for now, not working yet. */}
          <Card>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[1.0625rem] font-medium">
                {s.communityTitle}
              </h2>
              <span className="shrink-0 rounded-full bg-blue-soft px-2.5 py-1 text-[0.75rem] font-medium text-accent">
                {s.soon}
              </span>
            </div>
            <div className="mt-3 flex -space-x-2" aria-hidden="true">
              {["#f6c7a8", "#b9d3f7", "#d8c4f5", "#c5e6cf"].map((c) => (
                <span
                  key={c}
                  className="size-9 rounded-full ring-2 ring-card"
                  style={{ background: c }}
                />
              ))}
              <span className="grid size-9 place-items-center rounded-full bg-surface-2 text-[0.75rem] text-muted ring-2 ring-card">
                +
              </span>
            </div>
            <p className="mt-3 text-[0.9375rem] leading-snug text-ink-2">
              {s.communityText}
            </p>
            <button
              type="button"
              disabled
              className="mt-4 w-full rounded-full bg-surface py-3 text-[0.9375rem] font-medium text-muted"
            >
              {s.communityTitle}
            </button>
          </Card>

          <Card>
            <h2 className="text-[1.0625rem] font-medium">{s.helpTitle}</h2>
            <p className="mt-2 text-[0.9375rem] leading-snug text-ink-2">
              {s.helpText}
            </p>
            <a
              href="tel:112"
              className="mt-4 flex w-full items-center justify-center rounded-full bg-alert py-3 text-[1rem] font-medium text-white"
              data-testid="sos-call"
            >
              {s.emergencyCall}
            </a>
            <h2 className="mt-6 text-[1.0625rem] font-medium">{s.talkTitle}</h2>
            <p className="mt-2 text-[0.9375rem] leading-snug text-ink-2">
              {s.talkText}
            </p>
            <a
              href={`tel:${s.talkNumber}`}
              className="mt-4 flex w-full items-center justify-center rounded-full bg-surface py-3 text-[1rem] font-medium text-ink"
            >
              {s.talkCall}
            </a>
          </Card>

          <p className="px-2 pt-2 text-center text-[0.8125rem] leading-snug text-muted">
            {s.disclaimer}
          </p>
        </section>
      </div>
    </main>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[22px] bg-card/80 p-5 ring-1 ring-line backdrop-blur-xl">
      {children}
    </div>
  );
}
