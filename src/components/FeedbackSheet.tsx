import { useEffect, useState } from 'react'
import type { Messages } from '../i18n'
import { sendFeedback } from '../report/send'
import { BottomSheet } from './BottomSheet'
import { Button } from './Button'

type Status = 'writing' | 'sending' | 'sent' | 'failed'

interface Props {
  open: boolean
  onClose: () => void
  t: Messages['feedback']
  closeLabel: string
  /** Shown above the form when the exercise waits behind it. */
  paused: boolean
  context: string
  language: string
}

/** A short note to the team, sent as an e-mail; calm, nothing required but the message itself. */
export function FeedbackSheet({ open, onClose, t, closeLabel, paused, context, language }: Props) {
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [status, setStatus] = useState<Status>('writing')

  // A fresh form each time after a message went out; an unsent draft stays.
  useEffect(() => {
    if (open && status === 'sent') {
      setMessage('')
      setContact('')
      setStatus('writing')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || status === 'sending') return
    setStatus('sending')
    const ok = await sendFeedback({ message, contact, context, language })
    setStatus(ok ? 'sent' : 'failed')
  }

  return (
    <BottomSheet open={open} title={t.title} closeLabel={closeLabel} onClose={onClose} testId="feedback-sheet">
      {status === 'sent' ? (
        <div className="py-6 text-center" data-testid="feedback-sent" aria-live="polite">
          <p className="display text-[1.75rem]">{t.sentTitle}</p>
          <p className="mt-2 text-body text-ink-2">{t.sentLine}</p>
          <Button onClick={onClose} className="mt-6 w-full">
            {closeLabel}
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="pt-1 pb-2">
          <p className="text-body leading-relaxed text-ink-2">
            {paused && <span className="text-ink">{t.paused} </span>}
            {t.intro}
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.placeholder}
            aria-label={t.title}
            rows={5}
            maxLength={4000}
            className="mt-4 block w-full resize-none rounded-[18px] bg-surface-2/70 px-4 py-3 text-body text-ink ring-1 ring-line/70 outline-none placeholder:text-ink-2/70 focus:ring-ink/40"
            data-testid="feedback-message"
          />
          <label className="mt-4 block">
            <span className="text-body font-medium">{t.contact}</span>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              autoComplete="email"
              maxLength={200}
              className="mt-2 block w-full rounded-full bg-surface-2/70 px-4 py-3 text-body text-ink ring-1 ring-line/70 outline-none focus:ring-ink/40"
              data-testid="feedback-contact"
            />
            <span className="mt-1.5 block text-note text-ink-2">{t.contactHint}</span>
          </label>
          {status === 'failed' && (
            <p className="mt-3 text-note text-alert" role="alert" data-testid="feedback-failed">
              {t.failed}
            </p>
          )}
          <Button type="submit" disabled={!message.trim() || status === 'sending'} className="mt-5 w-full" data-testid="feedback-send">
            {status === 'sending' ? t.sending : t.send}
          </Button>
        </form>
      )}
    </BottomSheet>
  )
}
