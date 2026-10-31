// Profile: nickname, picture and streak style. Kept in settings (works offline, included in backups) and, when signed in,
// copied to the account so it follows the user to other devices. The photo goes to the "avatars" storage bucket.
import { supabase } from '../auth/supabase'
import { useAccount } from '../auth/account'
import { useSettings } from '../store/settings'

export interface Profile {
  nickname?: string
  /** Emoji avatar, shown when there is no photo. */
  emoji?: string
  color?: string
  /** A small data: URL (this device) or the uploaded https URL. */
  photo?: string
  streakIcon?: string
  /** Days to aim for; the streak bar fills towards it. */
  streakGoal?: number
  updatedAt?: number
}

export const AVATAR_EMOJIS = ['🦉', '🐯', '🐼', '🦊', '🐨', '🐸', '🦄', '🐙', '🚀', '🌟', '📚', '🎧']
export const AVATAR_COLORS = ['#6d28d9', '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777', '#475569']
export const STREAK_ICONS = ['🔥', '⚡', '⭐', '🌱', '🚀', '💎']
export const STREAK_GOALS = [7, 14, 30, 50, 100]
export const NICKNAME_MAX = 24

export const streakIcon = (p?: Profile) => p?.streakIcon ?? '🔥'
export const streakGoal = (p?: Profile) => p?.streakGoal ?? 7

/** Nickname, else the first name from the account, else nothing. */
export function displayName(p: Profile | undefined, fullName?: string | null) {
  return p?.nickname?.trim() || fullName?.trim().split(/\s+/)[0] || ''
}

/** Shrinks a picked image to a 192 px square JPEG (centre crop), small enough to keep in settings. */
export async function resizePhoto(file: File, size = 192): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  canvas.getContext('2d')!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}

const synced = (p: Profile) => ({ nickname: p.nickname, emoji: p.emoji, color: p.color, streakIcon: p.streakIcon, streakGoal: p.streakGoal, updatedAt: p.updatedAt })

/**
 * Saves the profile on this device, then copies it to the account. Returns false when the photo could not be
 * uploaded (it is still kept on this device).
 */
export async function saveProfile(patch: Partial<Profile>): Promise<boolean> {
  const { settings, update } = useSettings.getState()
  let profile: Profile = { ...settings.profile, ...patch, updatedAt: Date.now() }
  await update({ profile })
  const session = useAccount.getState().session
  if (!supabase || !session || !navigator.onLine) return true

  let photoUrl: string | null | undefined
  let uploaded = true
  if ('photo' in patch) {
    if (patch.photo?.startsWith('data:')) {
      const path = `${session.user.id}/avatar.jpg`
      const blob = await (await fetch(patch.photo)).blob()
      const { error } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (error) uploaded = false
      else photoUrl = `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${profile.updatedAt}`
    } else photoUrl = null
  }
  const { error } = await supabase.auth.updateUser({ data: { profile: { ...synced(profile), ...(photoUrl !== undefined && { photoUrl }) } } })
  // Keep the uploaded URL so other devices and this one agree; fall back to the local copy if anything failed.
  if (!error && photoUrl) {
    profile = { ...useSettings.getState().settings.profile, photo: photoUrl }
    await update({ profile })
  }
  return uploaded && !error
}

/** After sign-in: take the account's profile when it is newer than this device's copy. */
export async function pullProfile() {
  const session = useAccount.getState().session
  const remote = session?.user.user_metadata?.profile as (Profile & { photoUrl?: string | null }) | undefined
  if (!remote?.updatedAt) return
  const { settings, update } = useSettings.getState()
  if ((settings.profile?.updatedAt ?? 0) >= remote.updatedAt) return
  const { photoUrl, ...rest } = remote
  const photo = photoUrl === undefined ? settings.profile?.photo : photoUrl ?? undefined
  await update({ profile: { ...rest, photo } })
}
