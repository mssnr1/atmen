import { Button } from '../components/Button'
import { PlayIcon } from '../components/icons'
import { exercises, featuredExercise } from '../exercises'
import { formatSeconds } from '../lib/format'
import { navigate } from '../lib/route'
import { useStore } from '../storage/store'

export function HomeScreen() {
  const sessions = useStore((d) => d.sessions)
  const ex = featuredExercise
  const others = exercises.filter((e) => e.id !== ex.id)
  const rhythm = ex.pattern.phases.map((p) => `${formatSeconds(p.durationMs)} s ${p.type === 'inhale' ? 'in' : p.type === 'exhale' ? 'out' : 'hold'}`)

  return (
    <main className="safe-area mx-auto flex min-h-dvh max-w-md flex-col px-6">
      <header className="pt-10 pb-10 text-center">
        <h1 className="text-4xl font-light tracking-[0.35em] pl-[0.35em]">BREATH</h1>
        <p className="mt-3 text-mist/65">The art of breathing better</p>
      </header>

      <section aria-labelledby="featured" className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur">
        <p className="text-xs font-semibold tracking-widest text-accent uppercase">Featured exercise</p>
        <h2 id="featured" className="mt-2 text-2xl font-medium">
          {ex.name}
        </h2>
        <p className="mt-1 text-sm text-mist/60">{ex.tagline}</p>

        <div className="mt-5 flex gap-2 text-sm" aria-label="Breathing rhythm">
          {rhythm.map((r) => (
            <span key={r} className="rounded-full bg-white/8 px-3 py-1 text-mist/85">
              {r}
            </span>
          ))}
          <span className="rounded-full bg-white/8 px-3 py-1 text-mist/85">nose</span>
        </div>

        <p className="mt-5 leading-relaxed text-mist/85">{ex.summary}</p>
        <p className="mt-3 text-sm leading-relaxed text-mist/60">{ex.howItWorks}</p>

        <ul className="mt-5 space-y-2">
          {ex.benefits.map((b) => (
            <li key={b} className="flex items-center gap-3 text-sm text-mist/85">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              {b}
            </li>
          ))}
        </ul>

        <Button className="mt-7 w-full" icon={<PlayIcon className="size-5" />} onClick={() => navigate({ name: 'practice', exerciseId: ex.id })}>
          Start practice
        </Button>
      </section>

      {others.length > 0 && (
        <section aria-label="More exercises" className="mt-6 space-y-3">
          {others.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => navigate({ name: 'practice', exerciseId: e.id })}
              className="w-full rounded-2xl bg-white/5 p-4 text-left ring-1 ring-white/10 hover:bg-white/8"
            >
              <span className="block font-medium">{e.name}</span>
              <span className="block text-sm text-mist/60">{e.tagline}</span>
            </button>
          ))}
        </section>
      )}

      <footer className="mt-auto pt-10 text-center text-xs text-mist/45">
        {sessions.length > 0 ? `${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'} completed` : 'Inspired by James Nestor’s Breath'}
      </footer>
    </main>
  )
}
