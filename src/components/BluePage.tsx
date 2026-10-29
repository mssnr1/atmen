import { useEffect, type ReactNode } from 'react'

/** A fullscreen blue screen. Tints the browser chrome while it is shown. */
export function BluePage({ children, testId }: { children: ReactNode; testId?: string }) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    const before = meta?.getAttribute('content')
    meta?.setAttribute('content', '#2f6bf5')
    document.body.classList.add('blue-page')
    return () => {
      if (before) meta?.setAttribute('content', before)
      document.body.classList.remove('blue-page')
    }
  }, [])
  return (
    <main className="safe-area fixed inset-0 overflow-y-auto bg-blue text-white" data-testid={testId}>
      <div className="mx-auto flex min-h-full max-w-md flex-col px-7">{children}</div>
    </main>
  )
}
