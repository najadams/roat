// supabase/functions/check-pending-activities/index.ts
// Scheduled Edge Function — runs every weekday morning at 7am UTC
// Finds activities stuck in 'pending' for 2+ days and emails the creator

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  investor_enquiry:              'Investor Enquiry',
  new_registration:              'New Registration',
  renewal:                       'Renewal',
  investor_issue_resolution:     'Aftercare',
  facilitation_done:             'Administration',
  site_visit:                    'Monitoring / Site Visit',
  technology_transfer_agreement: 'Quota / TTA',
  stakeholder_engagement:        'Stakeholder Engagement',
  official_correspondence:       'Official Correspondence',
  outreach_promotional:          'Outreach & Promotional Activity',
  media_interview:               'Media Interview',
  checkup_call:                  'Check-up Call',
  iomp_update:                   'IOMP Update',
}

Deno.serve(async () => {
  try {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

    // Find stale pending activities with creator profile
    const { data: staleActivities, error: fetchError } = await supabase
      .from('activities')
      .select(`
        id, activity_type, company_name, date, location, zonal_office,
        created_at, created_by,
        profiles!activities_created_by_fkey (
          full_name, email
        )
      `)
      .eq('status', 'pending')
      .is('deleted_at', null)
      .is('pending_alert_sent_at', null)
      .lt('created_at', twoDaysAgo)

    if (fetchError) {
      console.error('Error fetching stale activities:', fetchError)
      return new Response(`Error: ${fetchError.message}`, { status: 500 })
    }

    if (!staleActivities?.length) {
      return new Response('No stale pending activities found', { status: 200 })
    }

    // Group activities by creator email
    const byUser: Record<string, {
      name: string
      email: string
      activities: typeof staleActivities
    }> = {}

    for (const activity of staleActivities) {
      const profile = activity.profiles as { full_name: string; email: string } | null
      if (!profile?.email) continue
      if (!byUser[profile.email]) {
        byUser[profile.email] = { name: profile.full_name, email: profile.email, activities: [] }
      }
      byUser[profile.email].activities.push(activity)
    }

    // Send one email per user listing all their stale activities
    const emailPromises = Object.values(byUser).map(({ name, email, activities }) => {
      const activityList = activities.map(a => {
        const typeLabel = ACTIVITY_TYPE_LABELS[a.activity_type] ?? a.activity_type.replace(/_/g, ' ')
        const daysPending = Math.floor(
          (Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )
        return `  • ${typeLabel} — ${a.company_name} (${a.location})\n    Logged: ${new Date(a.date).toDateString()} · Pending for ${daysPending} day${daysPending !== 1 ? 's' : ''}`
      }).join('\n\n')

      return resend.emails.send({
        from: Deno.env.get('ALERT_EMAIL_FROM')!,
        to: email,
        subject: `ROAT Reminder: ${activities.length} Pending Activit${activities.length !== 1 ? 'ies' : 'y'} Awaiting Action`,
        text: `Dear ${name},\n\nThe following ${activities.length === 1 ? 'activity has' : 'activities have'} been in Pending status for 2 or more days and may require follow-up:\n\n${activityList}\n\nPlease log in to ROAT to update the status or add notes.\n\nROAT — Regional and Global Operations Division`,
      })
    })

    await Promise.all(emailPromises)

    // Mark all alerted activities so we don't re-send tomorrow
    const alertedIds = staleActivities.map(a => a.id)
    const { error: updateError } = await supabase
      .from('activities')
      .update({ pending_alert_sent_at: new Date().toISOString() })
      .in('id', alertedIds)

    if (updateError) {
      console.error('Error marking activities as alerted:', updateError)
      return new Response(`Error: ${updateError.message}`, { status: 500 })
    }

    return new Response(
      `Alerted ${Object.keys(byUser).length} user(s) about ${staleActivities.length} stale pending activit${staleActivities.length !== 1 ? 'ies' : 'y'}`,
      { status: 200 }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(`Unexpected error: ${err}`, { status: 500 })
  }
})
