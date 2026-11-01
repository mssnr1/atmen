import { useEffect, useState, type ReactNode } from "react";
import { BreathingBubbles } from "../calm/BreathingBubbles";
import { calmText } from "../calm/texts";
import { ChevronRightIcon } from "../components/icons";
import { ParticleWord } from "../components/ParticleWord";
import { useI18n } from "../i18n";
import { navigate, startPractice } from "../lib/route";

const FADE_MS = 600;
/** The logo's letter spacing (em) widens in small steps like an inhale; the specks flow along. */
const SPACING_FROM = 0.22;
const SPACING_TO = 0.6;
const SPACING_STEPS = 6;
const STEP_MS = 400;
/** The exercise behind "I'm stressed": the long exhale. */
const STRESS_EXERCISE = "relax";

/**
 * The start screen shown each time the app opens: the "atmen" logo widening
 * like an inhale over a breathing background, and three ways in: normal
 * training, a quick wind-down when stressed, and acute help in a panic.
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const { lang, t } = useI18n();
  const c = calmText[lang].start;
  const [leaving, setLeaving] = useState(false);
  const [step, setStep] = useState(0);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const spacing = reduced
    ? 0.45
    : SPACING_FROM + ((SPACING_TO - SPACING_FROM) * step) / SPACING_STEPS;

  useEffect(() => {
    if (reduced || step >= SPACING_STEPS) return;
    const next = setTimeout(
      () => setStep(step + 1),
      step === 0 ? 150 : STEP_MS,
    );
    return () => clearTimeout(next);
  }, [step, reduced]);

  useEffect(() => {
    if (!leaving) return;
    const done = setTimeout(onDone, FADE_MS);
    return () => clearTimeout(done);
  }, [leaving, onDone]);

  const choose = (go: () => void) => {
    if (leaving) return;
    go();
    setLeaving(true);
  };

  return (
    <div
      className="safe-area fixed inset-0 z-50 flex flex-col overflow-hidden bg-paper px-5"
      style={
        leaving
          ? { animation: `fade-out ${FADE_MS}ms ease-in forwards` }
          : undefined
      }
      data-testid="splash"
    >
      <BreathingBubbles />
      <div className="relative flex flex-1 items-center justify-center">
        <div className="text-center">
          <ParticleWord
            text="atmen"
            spacing={spacing}
            fontSize={56}
            className="h-24 w-[min(88vw,26rem)] text-breath md:h-28"
          />
          <p className="splash-tagline mt-3 text-[0.9375rem] tracking-[0.06em] text-muted md:text-[1.0625rem]">
            {t.splashTagline}
          </p>
        </div>
      </div>
      <nav
        className="start-choices relative mx-auto mb-4 flex w-full max-w-sm flex-col gap-3 md:mb-10 md:max-w-md"
        data-testid="start-choices"
      >
        <Choice
          title={c.training.title}
          hint={c.training.hint}
          tone="primary"
          onClick={() => choose(() => navigate({ name: "home" }))}
          testId="start-training"
        />
        <Choice
          title={c.stressed.title}
          hint={c.stressed.hint}
          tone="soft"
          onClick={() => choose(() => startPractice(STRESS_EXERCISE))}
          testId="start-stressed"
        />
        <Choice
          title={c.panic.title}
          hint={c.panic.hint}
          tone="alert"
          onClick={() => choose(() => navigate({ name: "sos" }))}
          testId="start-panic"
        />
      </nav>
    </div>
  );
}

const TONES = {
  primary: "bg-blue text-white [&_.hint]:text-white/75",
  soft: "bg-card/70 text-ink ring-1 ring-line backdrop-blur-xl [&_.hint]:text-muted",
  alert:
    "bg-alert text-white shadow-[0_8px_28px_-8px_var(--color-alert)] [&_.hint]:text-white/80",
} as const;

function Choice({
  title,
  hint,
  tone,
  onClick,
  testId,
}: {
  title: string;
  hint: ReactNode;
  tone: keyof typeof TONES;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`flex min-h-[4.25rem] w-full items-center justify-between gap-3 rounded-[22px] px-5 py-3 text-left transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${TONES[tone]}`}
    >
      <span>
        <span className="block text-[1.0625rem] leading-tight font-medium">
          {title}
        </span>
        <span className="hint mt-0.5 block text-[0.8125rem] leading-snug">
          {hint}
        </span>
      </span>
      <ChevronRightIcon className="size-4 shrink-0 opacity-80" />
    </button>
  );
}
