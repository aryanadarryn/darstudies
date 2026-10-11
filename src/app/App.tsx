import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
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

function useTheme() {
  const theme = useSettings((s) => s.settings.theme)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#020617' : '#0f766e')
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
  useTheme()
  useEffect(() => { load().then(weeklyRefresh) }, [load])
  useEffect(() => { document.documentElement.lang = lang === 'bm' ? 'ms' : 'en' }, [lang])

  if (!ready) return null
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
            <Route path="practice/quiz" element={<QuizPage />} />
            <Route path="practice/flashcards" element={<Flashcards />} />
            <Route path="practice/drill" element={<FormulaDrill />} />
            <Route path="practice/tools" element={<ToolsPage />} />
            <Route path="practice/tools/:toolId" element={<ToolPage />} />
            <Route path="planner" element={<Planner />} />
            <Route path="planner/setup" element={<PlannerSetup />} />
            <Route path="me" element={<Me />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
