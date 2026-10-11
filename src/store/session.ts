// Ephemeral UI state: the PWA install prompt and the break-reminder timer.
import { create } from 'zustand'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface SessionState {
  installEvent: BeforeInstallPromptEvent | null
  installed: boolean
  /** Seconds of active study since the last break. */
  studySeconds: number
  tick: (seconds: number) => void
  resetBreak: () => void
  promptInstall: () => Promise<void>
}

export const useSession = create<SessionState>((set, get) => ({
  installEvent: null,
  installed: window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true,
  studySeconds: 0,
  tick: (s) => set({ studySeconds: get().studySeconds + s }),
  resetBreak: () => set({ studySeconds: 0 }),
  promptInstall: async () => {
    const e = get().installEvent
    if (!e) return
    await e.prompt()
    const { outcome } = await e.userChoice
    set({ installEvent: null, installed: outcome === 'accepted' })
  },
}))

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  useSession.setState({ installEvent: e as BeforeInstallPromptEvent })
})
window.addEventListener('appinstalled', () => useSession.setState({ installed: true, installEvent: null }))

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
