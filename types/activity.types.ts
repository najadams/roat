export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  investor_enquiry:               'Investor Enquiry',
  new_registration:               'New Registration',
  renewal:                        'Renewal',
  investor_issue_resolution:      'Aftercare',
  // facilitation_done:              'Administration',
  site_visit:                     'Monitoring / Site Visit',
  technology_transfer_agreement:  'Quota / TTA',
  stakeholder_engagement:         'Stakeholder Engagement',
  // official_correspondence:        'Official Correspondence',
  outreach_promotional:           'Outreach & Promotional Activity',
  media_interview:                'Media Interview',
  checkup_call:                   'Check-up Call',
  iomp_update:                    'IOMP Update',
}

export const ZONAL_OFFICE_LABELS: Record<string, string> = {
  kumasi: 'Kumasi',
  tamale: 'Tamale',
  takoradi: 'Takoradi',
  techiman: 'Techiman',
  ho: 'Ho',
  koforidua: 'Koforidua',
}

export const ACTIVITY_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export interface Activity {
  id: string
  activity_type: string
  zonal_office: string
  date: string
  company_name: string
  location: string
  telephone: string | null
  email: string | null
  sector: string | null
  detail: string | null
  action_required: string | null
  status: string
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}
