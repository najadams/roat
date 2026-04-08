// Auto-generated types placeholder
// Replace with: npx supabase gen types typescript --project-id <your-project-ref> > types/database.types.ts

export interface ActivityTarget {
  id: string
  zonal_office: ZonalOffice
  activity_type: ActivityType
  period_type: 'weekly' | 'monthly' | 'quarterly' | 'annual'
  period_year: number
  period_value: number   // month 1–12, quarter 1–4, or 0 for annual
  target_count: number
  created_by: string
  created_at: string
  updated_at: string
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ZonalOffice = 'kumasi' | 'tamale' | 'takoradi' | 'techiman' | 'ho' | 'koforidua'
export type UserRole = 'zonal_officer' | 'regional_admin' | 'viewer'
export type ActivityType =
  | 'new_registration'
  | 'renewal'
  | 'facilitation_done'
  | 'site_visit'
  | 'technology_transfer_agreement'
  | 'stakeholder_engagement'
  | 'media_interview'
  | 'checkup_call'
  | 'iomp_update'
  | 'investor_enquiry'
  | 'investor_issue_resolution'
  | 'official_correspondence'
  | 'outreach_promotional'
export type ActivityStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type WebinarTaskName =
  | 'notice_to_ministry_of_finance'
  | 'contact_with_mission'
  | 'date_confirmation_with_mission'
  | 'flyer_distribution'
  | 'obtaining_presenter_details'
  | 'link_creation'
  | 'confirmation_of_teams'
  | 'hosting_of_webinar'
  | 'webinar_report_and_leads_transfer'
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          zonal_office: ZonalOffice | null
          role: UserRole
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          zonal_office?: ZonalOffice | null
          role?: UserRole
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          zonal_office?: ZonalOffice | null
          role?: UserRole
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          id: string
          activity_type: ActivityType
          zonal_office: ZonalOffice
          date: string
          company_name: string
          location: string
          telephone: string | null
          email: string | null
          sector: string | null
          detail: string | null
          action_required: string | null
          status: ActivityStatus
          created_by: string
          updated_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          pending_alert_sent_at: string | null
        }
        Insert: {
          id?: string
          activity_type: ActivityType
          zonal_office: ZonalOffice
          date: string
          company_name: string
          location: string
          telephone?: string | null
          email?: string | null
          sector?: string | null
          detail?: string | null
          action_required?: string | null
          status?: ActivityStatus
          created_by: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          pending_alert_sent_at?: string | null
        }
        Update: {
          id?: string
          activity_type?: ActivityType
          zonal_office?: ZonalOffice
          date?: string
          company_name?: string
          location?: string
          telephone?: string | null
          email?: string | null
          sector?: string | null
          detail?: string | null
          action_required?: string | null
          status?: ActivityStatus
          created_by?: string
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      webinars: {
        Row: {
          id: string
          country: string
          country_code: string | null
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          country: string
          country_code?: string | null
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          country?: string
          country_code?: string | null
          notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      webinar_tasks: {
        Row: {
          id: string
          webinar_id: string
          task_name: WebinarTaskName
          task_order: number
          status: TaskStatus
          started_at: string | null
          completed_at: string | null
          deadline: string | null
          is_delayed: boolean
          notes: string | null
          completed_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          webinar_id: string
          task_name: WebinarTaskName
          task_order: number
          status?: TaskStatus
          started_at?: string | null
          completed_at?: string | null
          deadline?: string | null
          is_delayed?: boolean
          notes?: string | null
          completed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          webinar_id?: string
          task_name?: WebinarTaskName
          task_order?: number
          status?: TaskStatus
          started_at?: string | null
          completed_at?: string | null
          deadline?: string | null
          is_delayed?: boolean
          notes?: string | null
          completed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webinar_tasks_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinars"
            referencedColumns: ["id"]
          }
        ]
      }
      activity_targets: {
        Row: {
          id: string
          zonal_office: ZonalOffice
          activity_type: ActivityType
          period_type: 'weekly' | 'monthly' | 'quarterly' | 'annual'
          period_year: number
          period_value: number
          target_count: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          zonal_office: ZonalOffice
          activity_type: ActivityType
          period_type: 'weekly' | 'monthly' | 'quarterly' | 'annual'
          period_year: number
          period_value: number
          target_count: number
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          zonal_office?: ZonalOffice
          activity_type?: ActivityType
          period_type?: 'monthly' | 'quarterly' | 'annual'
          period_year?: number
          period_value?: number
          target_count?: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_monthly_activity_summary: {
        Row: {
          zonal_office: ZonalOffice
          activity_type: ActivityType
          month: string
          total: number
          completed: number
          pending: number
        }
        Relationships: []
      }
      v_quarterly_activity_summary: {
        Row: {
          zonal_office: ZonalOffice
          activity_type: ActivityType
          quarter: string
          year: number
          quarter_num: number
          total: number
        }
        Relationships: []
      }
      v_annual_cumulative_summary: {
        Row: {
          activity_type: ActivityType
          year: number
          total: number
          zones_contributing: number
        }
        Relationships: []
      }
      v_webinar_progress: {
        Row: {
          webinar_id: string
          country: string
          country_code: string | null
          created_at: string
          progress_pct: number
          tasks_completed: number
          tasks_delayed: number
          has_delayed_tasks: boolean
          current_task_order: number | null
        }
        Relationships: []
      }
      v_webinar_task_detail: {
        Row: {
          webinar_id: string
          country: string
          task_id: string
          task_name: WebinarTaskName
          task_order: number
          status: TaskStatus
          started_at: string | null
          completed_at: string | null
          deadline: string | null
          is_delayed: boolean
          notes: string | null
          currently_overdue: boolean
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_working_day_deadline: {
        Args: { start_ts: string; working_days: number }
        Returns: string
      }
    }
    Enums: {
      zonal_office: ZonalOffice
      user_role: UserRole
      activity_type: ActivityType
      activity_status: ActivityStatus
      webinar_task_name: WebinarTaskName
      task_status: TaskStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
