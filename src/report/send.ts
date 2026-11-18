/**
 * Feedback from the app to the team, as an e-mail. The app has no server of its own (GitHub Pages),
 * so a form service (Web3Forms) turns the request into a mail to the address the key belongs to.
 * The key is public by design: it can only send to that one address, never read anything.
 */
/** Web3Forms access key for the team's inbox; empty means the feedback button stays hidden. */
const TEAM_KEY = ''
export const FEEDBACK_KEY: string = import.meta.env.VITE_FEEDBACK_KEY || TEAM_KEY
const ENDPOINT = 'https://api.web3forms.com/submit'

export interface FeedbackReport {
  message: string
  /** Optional, only if the user wants an answer. */
  contact?: string
  /** Where in the app it was written, e.g. "Resonanzatmung · während der Übung". */
  context: string
  language: string
}

export function feedbackAvailable(key = FEEDBACK_KEY): boolean {
  return key.trim().length > 0
}

/** The request body sent to the form service; kept apart so it can be tested without a network. */
export function feedbackPayload(r: FeedbackReport, key = FEEDBACK_KEY): Record<string, string> {
  const body: Record<string, string> = {
    access_key: key,
    subject: `Fluo Feedback · ${r.context}`,
    from_name: 'Fluo App',
    message: r.message.trim(),
    context: r.context,
    language: r.language,
    // The form service's spam trap: a real user never fills this.
    botcheck: '',
  }
  const contact = r.contact?.trim()
  if (contact) {
    body.contact = contact
    if (/^\S+@\S+\.\S+$/.test(contact)) body.email = contact
  }
  return body
}

export async function sendFeedback(r: FeedbackReport, fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!feedbackAvailable() || !r.message.trim()) return false
  try {
    const res = await fetcher(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(feedbackPayload(r)),
    })
    const json = (await res.json().catch(() => ({}))) as { success?: boolean }
    return res.ok && json.success !== false
  } catch {
    return false
  }
}
