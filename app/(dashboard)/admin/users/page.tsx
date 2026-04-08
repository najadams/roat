import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserTable } from './user-table'

export const metadata = { title: 'User Management — ROAT' }

export default async function UsersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'regional_admin') redirect('/dashboard')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">User Management</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage user accounts, roles, and zonal office assignments.
        </p>
      </div>
      <UserTable users={profiles ?? []} />
    </div>
  )
}
