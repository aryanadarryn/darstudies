import { NavLink } from 'react-router-dom'
import ViewToggle from '../components/ViewToggle'
import { useT } from '../i18n/useT'
import { TABS } from './BottomNav'

/** Left menu for the wide browser layout. */
export default function SideNav() {
  const { t } = useT()
  return (
    <aside className="sticky top-0 flex h-dvh w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 flex items-center gap-2 px-2">
        <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="h-9 w-9 rounded-xl" />
        <div>
          <div className="font-bold leading-tight">Darstudies</div>
          <div className="text-[11px] muted">Form 4 · KSSM</div>
        </div>
      </div>
      <nav className="flex-1">
        <ul className="space-y-1">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <NavLink to={tab.to} end={tab.end}
                className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${isActive ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={tab.icon} />
                </svg>
                {t(tab.key)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <ViewToggle className="self-start" />
    </aside>
  )
}
