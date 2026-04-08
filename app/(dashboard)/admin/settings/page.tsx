import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const metadata = { title: 'Settings — ROAT' }

export default async function SettingsPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          System configuration and preferences.
        </p>
      </div>

      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">
            Delay Alarm System
          </CardTitle>
          <CardDescription className="text-sm text-slate-500">
            The system automatically checks for overdue webinar tasks every weekday at 7:00 AM UTC
            via a Supabase Edge Function scheduled with pg_cron.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-slate-600">Schedule</span>
              <span className="font-mono text-slate-800 text-xs bg-slate-100 px-2 py-1 rounded">0 7 * * 1-5</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-slate-600">Working Day Window</span>
              <span className="text-slate-800 font-medium">5 working days per task</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Alert Emails</span>
              <span className="text-slate-800 font-medium">Resend (configured via env vars)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card className="border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-slate-600">Application</span>
              <span className="text-slate-800 font-medium">ROAT v1.0</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-slate-600">Division</span>
              <span className="text-slate-800 font-medium">Regional and Global Operations</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-slate-600">Modules</span>
              <span className="text-slate-800 font-medium">Module A (Zonal Reporting), Module B (Webinar Tracking)</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Zonal Offices</span>
              <span className="text-slate-800 font-medium">Kumasi, Tamale, Takoradi, Techiman, Ho, Koforidua</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
