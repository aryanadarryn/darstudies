// What the signed-in user may open. The server enforces the same rules (RLS on the content table);
// this copy decides what the UI shows as locked.
export const FEATURES = ['learn', 'quiz', 'flashcards', 'drill', 'tools', 'planner'] as const
export type Feature = (typeof FEATURES)[number]
export type Tier = 'full' | 'trial' | 'expired'

export interface Access {
  tier: Tier
  is_admin: boolean
  email: string | null
  full_name: string | null
  trial_ends_at: string
  /** May install the app (PWA): admin, allowed by an admin, or on a plan with app install. Missing on servers without that migration. */
  can_install?: boolean
  subscription: { status: string; current_period_end: string; plan: { name_en: string; name_bm: string; allow_install?: boolean } | null } | null
  subjects: string[]
  features: Feature[]
}

/**
 * access === undefined → accounts are switched off: everything is open.
 * access === null → signed out or not loaded: everything is locked.
 * subject is omitted for features that are not tied to a subject (drill, tools, planner); then `form` is the form
 * being studied. Form 3 is free for every signed-in user.
 */
export function canUse(access: Access | null | undefined, feature: Feature, subject?: string, form?: 3 | 4): boolean {
  if (access === undefined) return true
  if (!access) return false
  if (access.tier === 'full') return true
  if (subject ? subject.startsWith('f3') : form === 3 && feature !== 'tools') return true
  return access.features.includes(feature) && (subject === undefined || access.subjects.includes(subject))
}

/**
 * Whether the app may be installed on this device. Open when accounts are off; closed when signed out.
 * A server without the install migration sends no flag, so behaviour stays as before (allowed).
 */
export function canInstall(access: Access | null | undefined): boolean {
  if (access === undefined) return true
  if (!access) return false
  return access.can_install !== false
}

/** Whole days left until an ISO date (0 when passed). */
export function daysLeft(iso: string | undefined, now = Date.now()): number {
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 86_400_000))
}
