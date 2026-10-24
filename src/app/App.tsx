import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { canInstall } from '../auth/access'
import { useAccount } from '../auth/account'
import { GatedPage } from '../auth/Locked'
import { isStandalone, setInstallable } from '../lib/installability'
import { AUTH_ENABLED } from '../auth/supabase'
import { getKV } from '../db/db'
import { regeneratePlan } from '../lib/actions'
import { addDays, todayISO } from '../planner/dates'
import { useSettings } from '../store/settings'
import Layout from './Layout'

const Today = lazy(() => import('../pages/Today'))
const Learn = lazy(() => import('../pages/Learn'))
const SubjectPage = lazy(() => import('../pages/SubjectPage'))
const ChapterPage = lazy(() => import('../pages/ChapterPage'))
const SubtopicPage = lazy(() => import('../pages/SubtopicPage'))
const Practice = lazy(() => import('../pages/Practice'))
const QuizPage = lazy(() => import('../pages/QuizPage'))
const Flashcards = lazy(() => import('../pages/Flashcards'))
const FormulaDrill = lazy(() => import('../pages/FormulaDrill'))
const ToolsPage = lazy(() => import('../pages/ToolsPage'))
const ToolPage = lazy(() => import('../pages/ToolPage'))
const Planner = lazy(() => import('../pages/Planner'))
const PlannerSetup = lazy(() => import('../pages/PlannerSetup'))
const Me = lazy(() => import('../pages/Me'))
const Subscribe = lazy(() => import('../pages/Subscribe'))
const Login = lazy(() => import('../auth/Login'))
const InstallBlocked = lazy(() => import('../auth/InstallBlocked'))
const Admin = lazy(() => import('../admin/Admin'))
const AdminOverview = lazy(() => import('../admin/Admin').then((m) => ({ default: m.AdminOverview })))
const AdminUsers = lazy(() => import('../admin/AdminUsers'))
const AdminSubscriptions = lazy(() => import('../admin/AdminSubscriptions'))
const AdminPayments = lazy(() => import('../admin/AdminPayments'))
const AdminPlans = lazy(() => import('../admin/AdminPlans'))
const AdminSettings = lazy(() => import('../admin/AdminSettings'))

function useTheme() {
  const theme = useSettings((s) => s.settings.theme)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#020617' : '#6d28d9')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

/** Refresh the plan once a week so new weak topics and finished chapters are taken into account. */
async function weeklyRefresh() {
  const { settings } = useSettings.getState()
  if (!settings.onboarded) return
  const last = await getKV<string>('lastPlanned', '')
  if (!last || last <= addDays(todayISO(), -7)) await regeneratePlan(settings)
}

export default function App() {
  const { ready, load } = useSettings()
  const lang = useSettings((s) => s.settings.lang)
  const { ready: accountReady, session, access, init } = useAccount()
  useTheme()
  useEffect(() => { init() }, [init])
  // Only eligible users get the manifest, so only they are offered "Install app".
  useEffect(() => { setInstallable(canInstall(access)) }, [access])
  // Plan generation depends on what the user may open, so wait for the account check.
  useEffect(() => { if (accountReady) load().then(weeklyRefresh) }, [load, accountReady])
  useEffect(() => { document.documentElement.lang = lang === 'bm' ? 'ms' : 'en' }, [lang])

  if (!ready || !accountReady) return null
  if (AUTH_ENABLED && !session) {
    return <Suspense fallback={null}><Login /></Suspense>
  }
  // Installed earlier but not (or no longer) allowed to use the installed app: send them to the browser.
  if (access && !canInstall(access) && isStandalone()) {
    return <Suspense fallback={null}><InstallBlocked /></Suspense>
  }
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <Suspense fallback={<div className="p-8 text-center muted">…</div>}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Today />} />
            <Route path="learn" element={<Learn />} />
            <Route path="learn/:subjectId" element={<SubjectPage />} />
            <Route path="learn/:subjectId/:chapterId" element={<ChapterPage />} />
            <Route path="learn/:subjectId/:chapterId/:subtopicId" element={<SubtopicPage />} />
            <Route path="practice" element={<Practice />} />
            <Route path="practice/quiz" element={<GatedPage feature="quiz"><QuizPage /></GatedPage>} />
            <Route path="practice/flashcards" element={<GatedPage feature="flashcards"><Flashcards /></GatedPage>} />
            <Route path="practice/drill" element={<GatedPage feature="drill"><FormulaDrill /></GatedPage>} />
            <Route path="practice/tools" element={<GatedPage feature="tools"><ToolsPage /></GatedPage>} />
            <Route path="practice/tools/:toolId" element={<GatedPage feature="tools"><ToolPage /></GatedPage>} />
            <Route path="planner" element={<GatedPage feature="planner"><Planner /></GatedPage>} />
            <Route path="planner/setup" element={<PlannerSetup />} />
            <Route path="me" element={<Me />} />
            {AUTH_ENABLED && <Route path="subscribe" element={<Subscribe />} />}
            {AUTH_ENABLED && (
              <Route path="admin" element={<Admin />}>
                <Route index element={<AdminOverview />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="subscriptions" element={<AdminSubscriptions />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="plans" element={<AdminPlans />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
