import { create } from 'zustand'
import { getKV, setKV } from '../db/db'
import { todayISO } from '../planner/dates'
import { defaultPlanEnd } from '../planner/generatePlan'
import type { Settings } from '../planner/types'

// Default Form 4 start; the setup wizard asks the user to confirm it against the school calendar.
const SCHOOL_START = '2027-01-11'

export const defaultSettings = (): Settings => ({
  lang: 'en',
  theme: 'system',
  onboarded: false,
  schoolStart: SCHOOL_START,
  planStart: todayISO(),
  planEnd: defaultPlanEnd(SCHOOL_START),
  exams: [],
  holidays: [],
  minutes: { holiday: 60, school: 45, weekend: 90 },
  dailyCap: 90,
  studyDays: [1, 2, 3, 4, 5, 6],
  confidence: { phy: 3, chem: 3, bio: 3, addmath: 3, math: 3, sej: 3, pi: 3, bm: 3, bi: 3 },
  currentChapters: {},
  reminderTime: '20:00',
  breakMinutes: 25,
  viewMode: 'auto',
  form: 4,
})

interface SettingsState {
  ready: boolean
  settings: Settings
  load: () => Promise<void>
  update: (patch: Partial<Settings>) => Promise<void>
}

export const useSettings = create<SettingsState>((set, get) => ({
  ready: false,
  settings: defaultSettings(),
  load: async () => {
    const stored = await getKV<Partial<Settings>>('settings', {})
    const defaults = defaultSettings()
    // Merge confidence so subjects added after the user's setup get the default rating.
    set({ ready: true, settings: { ...defaults, ...stored, confidence: { ...defaults.confidence, ...stored.confidence } } })
  },
  update: async (patch) => {
    const settings = { ...get().settings, ...patch }
    set({ settings })
    await setKV('settings', settings)
  },
}))
