import type { ReactNode } from 'react'
import { useI18n } from '../i18n'
import { navigate } from '../lib/route'
import { IconButton } from './Button'
import { ArrowLeftIcon } from './icons'

interface Props {
  title: string
  /** A small line above the title. */
  eyebrow?: string
  /** A line under the title. */
  lead?: string
  /** A single reading column instead of the wide layout. */
  narrow?: boolean
  testId?: string
  children: ReactNode
}

/**
 * A page that lies over the room like a sheet of paper: back arrow, a light headline, content. Every
 * page other than start and practice uses it, so they all read as one layer.
 */
export function Page({ title, eyebrow, lead, narrow = false, testId, children }: Props) {
  const { t } = useI18n()
  return (
    <main
      className={`safe-area relative z-10 mx-auto flex min-h-dvh w-full flex-col bg-paper px-6 ${narrow ? 'max-w-md md:max-w-2xl md:px-14' : 'max-w-md md:max-w-3xl md:px-14 lg:max-w-6xl lg:px-16'}`}
      data-testid={testId}
    >
      <IconButton label={t.back} onClick={() => navigate({ name: 'home' })} className="mt-1 -ml-2.5 text-ink" data-testid="page-back">
        <ArrowLeftIcon className="size-6" strokeWidth={1.5} />
      </IconButton>
      {eyebrow && <p className="eyebrow mt-5">{eyebrow}</p>}
      <h1 className={`display text-[2.125rem] md:text-[3rem] ${eyebrow ? 'mt-2' : 'mt-5'}`}>{title}</h1>
      {lead && <p className="mt-3 max-w-xl text-body leading-relaxed text-ink-2">{lead}</p>}
      {children}
    </main>
  )
}
