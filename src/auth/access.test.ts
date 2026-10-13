import { describe, expect, it } from 'vitest'
import { type Access, canUse, daysLeft } from './access'

const base: Access = {
  tier: 'trial', is_admin: false, email: 'a@b.c', full_name: null, trial_ends_at: '2030-01-01T00:00:00Z',
  subscription: null, subjects: ['sej', 'bi'], features: ['learn', 'quiz', 'planner'],
}

describe('canUse', () => {
  it('opens everything when accounts are switched off', () => {
    expect(canUse(undefined, 'flashcards', 'phy')).toBe(true)
  })
  it('locks everything when signed out', () => {
    expect(canUse(null, 'learn', 'sej')).toBe(false)
  })
  it('needs both the subject and the feature during the trial', () => {
    expect(canUse(base, 'learn', 'sej')).toBe(true)
    expect(canUse(base, 'flashcards', 'sej')).toBe(false)
    expect(canUse(base, 'learn', 'phy')).toBe(false)
  })
  it('checks only the feature when no subject is given', () => {
    expect(canUse(base, 'planner')).toBe(true)
    expect(canUse(base, 'drill')).toBe(false)
  })
  it('opens everything for subscribers', () => {
    expect(canUse({ ...base, tier: 'full', subjects: [], features: [] }, 'flashcards', 'phy')).toBe(true)
  })
  it('uses the after-trial lists when expired', () => {
    expect(canUse({ ...base, tier: 'expired', subjects: [], features: [] }, 'learn', 'sej')).toBe(false)
  })
})

describe('daysLeft', () => {
  const now = Date.parse('2026-10-13T00:00:00Z')
  it('rounds part days up', () => expect(daysLeft('2026-10-14T06:00:00Z', now)).toBe(2))
  it('never goes negative', () => expect(daysLeft('2026-10-01T00:00:00Z', now)).toBe(0))
  it('treats a missing date as ended', () => expect(daysLeft(undefined, now)).toBe(0))
})
