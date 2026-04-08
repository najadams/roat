import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { ZONAL_OFFICE_LABELS } from '@/types/activity.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'

export const metadata = { title: 'My Profile — ROAT' }

const ROLE_LABELS: Record<string, string> = {
  regional_admin: 'Regional Administrator',
  zonal_officer: 'Zonal Officer',
  viewer: 'Viewer',
}

const ROLE_BADGE: Record<string, string> = {
  regional_admin: 'bg-blue-100 text-blue-800',
  zonal_officer: 'bg-emerald-100 text-emerald-800',
  viewer: 'bg-slate-100 text-slate-600',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const { redirect } = await import('next/navigation')
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  if (!profile) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">My Profile</h1>
        </div>
        <Card className="border-amber-100 bg-amber-50 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800 font-medium">
              Your profile has not been set up yet.
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Please ask your administrator to run the user seed script, or contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const initials = profile.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const memberSince = format(new Date(profile.created_at), 'MMMM d, yyyy')

  return (
    <div className="max-w-2xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">My Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          View your account details and manage your settings.
        </p>
      </div>

      {/* Avatar + identity header */}
      <Card className="border-slate-100 shadow-sm">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-xl tracking-wider">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-slate-900 tracking-tight truncate">
                {profile.full_name}
              </p>
              <p className="text-sm text-slate-500 truncate">{profile.email}</p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[profile.role] ?? 'bg-slate-100 text-slate-600'}`}>
                  {ROLE_LABELS[profile.role] ?? profile.role}
                </span>
                {profile.zonal_office && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    {ZONAL_OFFICE_LABELS[profile.zonal_office] ?? profile.zonal_office} Office
                  </span>
                )}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${profile.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {profile.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account information */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="text-sm divide-y divide-slate-50">
            <div className="flex items-center justify-between py-3">
              <dt className="text-slate-500 font-medium">Email Address</dt>
              <dd className="text-slate-900 font-medium">{profile.email}</dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-slate-500 font-medium">Role</dt>
              <dd>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[profile.role] ?? 'bg-slate-100 text-slate-600'}`}>
                  {ROLE_LABELS[profile.role] ?? profile.role}
                </span>
              </dd>
            </div>
            {profile.zonal_office && (
              <div className="flex items-center justify-between py-3">
                <dt className="text-slate-500 font-medium">Zonal Office</dt>
                <dd className="text-slate-900 font-medium">
                  {ZONAL_OFFICE_LABELS[profile.zonal_office] ?? profile.zonal_office}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between py-3">
              <dt className="text-slate-500 font-medium">Account Status</dt>
              <dd>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${profile.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {profile.is_active ? 'Active' : 'Inactive'}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-slate-500 font-medium">Member Since</dt>
              <dd className="text-slate-900 font-medium">{memberSince}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Editable fields + password change */}
      <ProfileForm profile={profile} />
    </div>
  )
}
