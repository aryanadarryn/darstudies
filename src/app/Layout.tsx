import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Toasts } from '../components/ui'
import BreakReminder from '../components/BreakReminder'
import ViewToggle, { useViewMode } from '../components/ViewToggle'
import BottomNav from './BottomNav'
import SideNav from './SideNav'

export default function Layout() {
  const { pathname } = useLocation()
  const view = useViewMode()
  const hideNav = pathname.startsWith('/planner/setup')

  useEffect(() => { document.documentElement.dataset.view = view }, [view])

  const outlet = (
    <Suspense fallback={<div className="p-8 text-center muted">…</div>}>
      <Outlet />
    </Suspense>
  )

  if (view === 'desktop') {
    return (
      <div className="flex min-h-dvh">
        {!hideNav && <SideNav />}
        <main className="min-w-0 flex-1 px-8 pb-10">
          <div className="mx-auto max-w-5xl">{outlet}</div>
        </main>
        {hideNav && <ViewToggle className="fixed right-4 top-4 z-40" />}
        <BreakReminder />
        <Toasts />
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <main className={`px-4 ${hideNav ? 'pb-8' : 'pb-nav'}`}>{outlet}</main>
      {!hideNav && <BottomNav />}
      {/* On a big screen in phone layout, keep the switch reachable outside the phone column. */}
      <ViewToggle className="fixed right-4 top-4 z-40 hidden lg:inline-flex" />
      <BreakReminder />
      <Toasts />
    </div>
  )
}
