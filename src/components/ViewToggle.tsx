// Switch between the phone layout and the wide browser layout.
import { useEffect, useState } from 'react'
import { useT } from '../i18n/useT'
import { useSettings } from '../store/settings'

const WIDE = '(min-width: 1024px)'

/** Resolved layout: 'auto' follows the screen width. */
export function useViewMode(): 'mobile' | 'desktop' {
  const mode = useSettings((s) => s.settings.viewMode)
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches)
  useEffect(() => {
    const mq = window.matchMedia(WIDE)
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return mode === 'auto' ? (wide ? 'desktop' : 'mobile') : mode
}

export default function ViewToggle({ className = '' }: { className?: string }) {
  const { t } = useT()
  const update = useSettings((s) => s.update)
  const view = useViewMode()
  const options = [
    { v: 'mobile' as const, icon: '📱', label: t('me.view.mobile') },
    { v: 'desktop' as const, icon: '🖥️', label: t('me.view.desktop') },
  ]
  return (
    <div role="group" aria-label={t('me.view')} className={`inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className}`}>
      {options.map((o) => (
        <button key={o.v} aria-pressed={view === o.v} title={o.label} onClick={() => update({ viewMode: o.v })}
          className={`flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${view === o.v ? 'bg-teal-700 text-white' : 'muted hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
          <span aria-hidden>{o.icon}</span>{o.label}
        </button>
      ))}
    </div>
  )
}
