import { useEffect } from 'react'
import { useStore } from '../storage/store'
import { messages, type Language, type Messages } from './messages'

export * from './messages'

/** The current language and its messages. Keeps `<html lang>` in step. */
export function useI18n(): { lang: Language; t: Messages } {
  const lang = useStore((d) => d.preferences.language)
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  return { lang, t: messages[lang] }
}
