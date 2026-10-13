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
  subscription: { status: string; current_period_end: string; plan: { name_en: string; name_bm: string } | null } | null
  subjects: string[]
  features: Feature[]
}

/**
 * access === undefined → accounts are switched off: everything is open.
 * access === null → signed out or not loaded: everything is locked.
 * subject is omitted for features that are not tied to a subject (drill, tools, planner).
 */
export function canUse(access: Access | null | undefined, feature: Feature, subject?: string): boolean {
  if (access === undefined) return true
  if (!access) return false
  if (access.tier === 'full') return true
  return access.features.includes(feature) && (subject === undefined || access.subjects.includes(subject))
}

/** Whole days left until an ISO date (0 when passed). */
export function daysLeft(iso: string | undefined, now = Date.now()): number {
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 86_400_000))
}
