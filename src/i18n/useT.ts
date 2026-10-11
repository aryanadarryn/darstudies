import { useCallback } from 'react'
import type { Lang } from '../content/schema'
import { useSettings } from '../store/settings'
import { STRINGS, type StringKey } from './strings'

export function useT() {
  const lang = useSettings((s) => s.settings.lang)
  const t = useCallback((k: StringKey) => STRINGS[lang][k], [lang])
  /** Content text in the primary language. */
  const L = useCallback((x: Lang | undefined) => (x ? x[lang] : ''), [lang])
  /** Content text in the other language (shown as a secondary line). */
  const L2 = useCallback((x: Lang | undefined) => (x ? x[lang === 'en' ? 'bm' : 'en'] : ''), [lang])
  return { t, L, L2, lang }
}
