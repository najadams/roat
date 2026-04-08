export const TASK_LABELS: Record<string, string> = {
  notice_to_ministry_of_finance:     'Notice to Ministry of Finance',
  contact_with_mission:              'Contact with Mission',
  date_confirmation_with_mission:    'Date Confirmation with Mission',
  flyer_distribution:                'Flyer Distribution',
  obtaining_presenter_details:       'Obtaining Presenter Details',
  link_creation:                     'Link Creation',
  confirmation_of_teams:             'Confirmation of Teams',
  hosting_of_webinar:                'Hosting of Webinar',
  webinar_report_and_leads_transfer: 'Webinar Report & Leads Transfer',
}

export const TASK_ORDER = [
  'notice_to_ministry_of_finance',
  'contact_with_mission',
  'date_confirmation_with_mission',
  'flyer_distribution',
  'obtaining_presenter_details',
  'link_creation',
  'confirmation_of_teams',
  'hosting_of_webinar',
  'webinar_report_and_leads_transfer',
] as const

export type TaskName = typeof TASK_ORDER[number]

export interface Webinar {
  id: string
  country: string
  country_code: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface WebinarTask {
  id: string
  webinar_id: string
  task_name: TaskName
  task_order: number
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed'
  started_at: string | null
  completed_at: string | null
  deadline: string | null
  is_delayed: boolean
  notes: string | null
  completed_by: string | null
  created_at: string
  updated_at: string
}

export interface WebinarWithTasks extends Webinar {
  webinar_tasks: WebinarTask[]
}
