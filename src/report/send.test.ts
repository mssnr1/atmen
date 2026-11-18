import { describe, expect, it } from 'vitest'
import { feedbackAvailable, feedbackPayload } from './send'

const report = { message: '  Hat mir gut getan.  ', context: 'Resonanz · nach der Übung', language: 'de' }

describe('feedback', () => {
  it('is only offered with a key', () => {
    expect(feedbackAvailable('')).toBe(false)
    expect(feedbackAvailable('  ')).toBe(false)
    expect(feedbackAvailable('abc')).toBe(true)
  })

  it('sends the message trimmed, with where it was written', () => {
    const p = feedbackPayload(report, 'key')
    expect(p.access_key).toBe('key')
    expect(p.message).toBe('Hat mir gut getan.')
    expect(p.subject).toContain('nach der Übung')
    expect(p.botcheck).toBe('')
    expect(p.email).toBeUndefined()
  })

  it('uses a contact address as reply-to only when it looks like one', () => {
    expect(feedbackPayload({ ...report, contact: 'a@b.de' }, 'k').email).toBe('a@b.de')
    const phone = feedbackPayload({ ...report, contact: '0170 123' }, 'k')
    expect(phone.email).toBeUndefined()
    expect(phone.contact).toBe('0170 123')
  })
})
