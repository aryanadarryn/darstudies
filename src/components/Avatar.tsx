import { useAccount } from '../auth/account'
import { AVATAR_COLORS, displayName, type Profile } from '../lib/profile'
import { useSettings } from '../store/settings'

/** Round profile picture: the user's photo, else their emoji, else their initial. */
export default function Avatar({ size = 48, profile: override }: { size?: number; profile?: Profile }) {
  const stored = useSettings((s) => s.settings.profile)
  const fullName = useAccount((s) => s.access?.full_name)
  const profile = override ?? stored
  const color = profile?.color ?? AVATAR_COLORS[0]
  const style = { width: size, height: size, fontSize: size * 0.5 }
  if (profile?.photo) return <img src={profile.photo} alt="" style={style} className="shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-slate-900" />
  const initial = displayName(profile, fullName).charAt(0).toUpperCase()
  return (
    <span aria-hidden style={{ ...style, backgroundColor: color + (profile?.emoji ? '26' : '') }}
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${profile?.emoji ? '' : 'text-white'}`}>
      {profile?.emoji ?? (initial || '🙂')}
    </span>
  )
}
