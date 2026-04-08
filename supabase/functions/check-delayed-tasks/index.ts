// supabase/functions/check-delayed-tasks/index.ts
// Scheduled Edge Function — runs every weekday morning at 7am UTC
// Marks overdue webinar tasks as delayed and sends email alerts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)

Deno.serve(async () => {
  try {
    // Find all in-progress tasks past their deadline
    const { data: overdueTasks, error: fetchError } = await supabase
      .from('webinar_tasks')
      .select(`
        id, task_name, deadline, webinar_id,
        webinars (country)
      `)
      .eq('status', 'in_progress')
      .eq('is_delayed', false)
      .lt('deadline', new Date().toISOString())

    if (fetchError) {
      console.error('Error fetching overdue tasks:', fetchError)
      return new Response(`Error: ${fetchError.message}`, { status: 500 })
    }

    if (!overdueTasks?.length) {
      return new Response('No delayed tasks found', { status: 200 })
    }

    // Mark all as delayed
    const ids = overdueTasks.map(t => t.id)
    const { error: updateError } = await supabase
      .from('webinar_tasks')
      .update({ is_delayed: true })
      .in('id', ids)

    if (updateError) {
      console.error('Error updating tasks:', updateError)
      return new Response(`Error: ${updateError.message}`, { status: 500 })
    }

    // Send alert email
    const taskList = overdueTasks.map(t =>
      `• ${(t.webinars as { country: string }).country} — ${t.task_name.replace(/_/g, ' ')} (due: ${new Date(t.deadline!).toDateString()})`
    ).join('\n')

    await resend.emails.send({
      from: Deno.env.get('ALERT_EMAIL_FROM')!,
      to: Deno.env.get('ALERT_EMAIL_TO')!,
      subject: `ROAT Alert: ${overdueTasks.length} Webinar Task(s) Overdue`,
      text: `The following webinar tasks are now overdue:\n\n${taskList}\n\nPlease log in to ROAT to review and take action.\n\nROAT — Regional and Global Operations Division`,
    })

    return new Response(`Marked ${overdueTasks.length} tasks as delayed`, { status: 200 })
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(`Unexpected error: ${err}`, { status: 500 })
  }
})
