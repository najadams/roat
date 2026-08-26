import type { Step } from 'react-joyride'
import type { TourContext, TourDefinition, TourId, TourProgress } from './types'

const exact = (path: string) => (pathname: string) => pathname === path

function tourStep(
  target: string,
  title: string,
  content: string,
  placement: Step['placement'] = 'bottom'
): Step {
  return {
    target,
    title,
    content,
    placement,
    skipBeacon: true,
  }
}

function welcome(title: string, content: string): Step {
  return tourStep('body', title, content, 'center')
}

export const TOUR_DEFINITIONS: TourDefinition[] = [
  {
    id: 'dashboard',
    version: 1,
    match: exact('/dashboard'),
    steps: context => [
      welcome('Welcome to ROAT', 'This dashboard brings zonal activity reporting and country webinar tracking into one operational view. This guide explains how to read it without changing any data.'),
      tourStep('[data-tour="page-header"]', 'Your current reporting period', 'The heading confirms the month represented by the dashboard. Most figures on this page update automatically as records are logged or completed.'),
      context.isMobile
        ? tourStep('[data-tour="mobile-menu"]', 'Application navigation', 'Open this menu whenever you need to move between the dashboard, Module A, Module B, and any administration pages available to your role.', 'bottom-start')
        : tourStep('[data-tour="sidebar"]', 'Application navigation', 'The sidebar groups daily activity reporting, webinar tracking, and role-specific administration tools. The highlighted item shows your current location.', 'right'),
      tourStep('[data-tour="module-a-kpis"]', 'Module A summary', 'These cards show this month’s activity volume, registrations, pending backlog, and completion rate. Administrators see the regional picture; officers see their assigned office.'),
      tourStep('[data-tour="dashboard-charts"]', 'Operational patterns', 'Use these charts to compare activity composition with webinar progress by country. Empty charts simply mean no matching records exist for the current period.'),
      ...(context.role === 'regional_admin'
        ? [tourStep('[data-tour="zone-analysis"]', 'Regional comparison', 'Administrators can compare zones, activity types, completion rates, pending work, and each office’s strongest activity for the month.')]
        : []),
      tourStep('[data-tour="module-b-kpis"]', 'Module B summary', 'These cards show the webinar portfolio, completed countries, average nine-task progress, and countries with overdue work.'),
      tourStep('[data-tour="notifications"]', 'Operational alerts', 'Notifications surface time-sensitive items such as delayed webinar tasks and pending activity follow-up.', 'bottom-end'),
      tourStep('[data-tour="profile-menu"]', 'Account and security', 'Open your profile menu to review your account, change your password, or sign out securely.', 'bottom-end'),
      tourStep('[data-tour="guide-button"]', 'Replay any page guide', 'Select Guide at any time to replay the tutorial for the page you are viewing. Your first-view progress is saved to your account.', 'bottom-end'),
    ],
  },
  {
    id: 'activities',
    version: 1,
    match: exact('/module-a/activities'),
    steps: context => [
      welcome('Activities register', 'This page is the working register for Module A. Use it to find, review, and—where your role permits—maintain zonal activity records.'),
      tourStep('[data-tour="page-header"]', 'Results at a glance', 'The header reports how many records match the current filters.'),
      ...(context.role !== 'viewer'
        ? [tourStep('[data-tour="primary-action"]', 'Log a new activity', 'Use this action to create one or several activity entries for a company or operational engagement.', 'bottom-end')]
        : []),
      tourStep('[data-tour="activity-filters"]', 'Narrow the register', `Filter by activity type, status, month${context.role === 'zonal_officer' ? '' : ', or zonal office'}. Filters update the URL, so the filtered view can be bookmarked or shared.`),
      tourStep('[data-tour="activity-results"]', 'Activity records', 'Each row shows the activity date, type, organisation, location, status, and available actions. An empty message means no records match the filters.'),
      tourStep('[data-tour="activity-status"]', 'Status', 'Status distinguishes pending, in-progress, completed, and cancelled work. It supports completion reporting and backlog monitoring.'),
      tourStep('[data-tour="activity-row-actions"]', 'Open and manage records', context.role === 'regional_admin' ? 'Open a record to review or edit it. Administrators also have a delete control, which always asks for confirmation.' : 'Open a record to review or update it when your role and the record status permit.', 'left'),
    ],
  },
  {
    id: 'activity-create',
    version: 1,
    match: exact('/module-a/new'),
    steps: context => [
      welcome('Log a zonal activity', 'This form captures the operational facts needed for registers, targets, dashboards, and reports. Required fields are marked clearly.'),
      tourStep('[data-tour="page-header"]', 'Create mode', 'The page heading confirms that a new record will be created. Use the back link or Cancel if you do not want to save.'),
      tourStep('[data-tour="activity-type"]', 'Choose the activity type', context.zonalOffice === 'accra' ? 'Select the Accra category that best describes the work and add operational detail where useful. “Other” requires a description.' : 'Select every activity completed for this organisation. Choosing several types creates separate linked entries from the shared details.'),
      ...(context.role === 'regional_admin'
        ? [tourStep('[data-tour="activity-zone"]', 'Assign the zonal office', 'Administrators must choose the office responsible for the activity. The selected office also determines which activity form variant is shown.')]
        : []),
      tourStep('[data-tour="activity-core"]', 'Core activity details', 'Record the activity date and the organisation or contact information. These details make registers searchable and reports meaningful.'),
      tourStep('[data-tour="activity-type"]', 'Conditional fields', 'Some selections reveal extra questions. Check-up calls require a call result, while Accra activities use a concise operational-details format.'),
      tourStep('[data-tour="activity-investment"]', 'Investment impact', 'When applicable, record investment value, currency, and jobs created. Leave this section blank when the activity has no measurable investment outcome.'),
      tourStep('[data-tour="activity-notes"]', 'Notes, outcomes, and evidence', 'Add the summary, follow-up action, result, and supporting photos or PDF documents. Evidence uploads occur only when the form is saved.'),
      tourStep('[data-tour="activity-status"]', 'Set the correct status', 'Choose the stage that accurately reflects the work. Completed records contribute to completion metrics; pending work remains visible in backlog monitoring.'),
      tourStep('[data-tour="form-actions"]', 'Save or cancel', 'Cancel leaves without submitting. Log Activity validates the form, uploads selected evidence, and then adds the record to the activities register.', 'top'),
    ],
  },
  {
    id: 'activity-edit',
    version: 1,
    match: pathname => /^\/module-a\/activities\/[^/]+$/.test(pathname),
    steps: context => [
      welcome('Review and update an activity', 'This page shows an existing Module A record. The fields available for editing depend on your role and the record’s current status.'),
      tourStep('[data-tour="page-header"]', 'Return or continue editing', 'Use Back to Activities to leave without navigating through the form. The heading confirms you are updating an existing record.'),
      tourStep('[data-tour="activity-type"]', 'Activity classification', context.role === 'regional_admin' ? 'Administrators can correct the activity classification when necessary.' : 'For data integrity, the activity classification is locked for officers after creation.'),
      ...(context.role === 'regional_admin'
        ? [tourStep('[data-tour="activity-zone"]', 'Zonal ownership', 'Administrators can correct the office assignment. Changing the zone can also change which form fields are relevant.')]
        : []),
      tourStep('[data-tour="activity-core"]', 'Operational details', 'Review the date, organisation, location, and contact details. Locked values are labelled; editable values can be corrected before saving.'),
      tourStep('[data-tour="activity-type"]', 'Activity-specific information', 'Conditional sections record details such as a check-up call result or Accra operational context when they apply.'),
      tourStep('[data-tour="activity-investment"]', 'Investment outcome', 'Keep investment value, currency, and jobs accurate so cumulative reports are not overstated.'),
      tourStep('[data-tour="activity-notes"]', 'Follow-up and evidence', 'Update the summary, required actions, outcome, or supporting files. Existing evidence remains available above the upload field.'),
      tourStep('[data-tour="activity-status"]', 'Workflow status', 'Update the stage to reflect the latest position. Non-administrators cannot reopen completed activities from the register.'),
      tourStep('[data-tour="form-actions"]', 'Apply the update', 'Cancel discards unsaved changes. Update Activity validates and saves the revised record.', 'top'),
    ],
  },
  {
    id: 'reports',
    version: 1,
    match: exact('/module-a/reports'),
    steps: context => [
      welcome('Module A reports', 'Use this page to analyse activity delivery across a selected period and, where permitted, across offices.'),
      tourStep('[data-tour="page-header"]', 'Report scope', 'The heading describes the current reporting period and provides the export action for a formal PDF or Excel output.'),
      tourStep('[data-tour="report-filters"]', 'Choose the reporting window', `Select weekly, monthly, quarterly, or annual reporting, then choose the relevant calendar values${context.role === 'regional_admin' ? ' and office scope' : ''}.`),
      tourStep('[data-tour="report-summary"]', 'Core indicators', 'These cards show entry volume, distinct companies served, completed work, and completion rate for the selected scope.'),
      tourStep('[data-tour="report-impact"]', 'Investment impact', 'Investment and jobs figures are deduplicated so logging several activity types for one engagement does not multiply the same outcome.'),
      tourStep('[data-tour="report-charts"]', 'Activity patterns', context.role === 'regional_admin' ? 'The breakdown shows activity composition, while the zonal chart compares delivery by office and type.' : 'The breakdown shows which activity categories make up the selected period.'),
      tourStep('[data-tour="report-table"]', 'Targets and progress', 'The summary lists each activity type, its achieved count, available target, and percentage progress. A dash means no target is configured.'),
      tourStep('[data-tour="report-export"]', 'Export the current view', 'The export uses the same period and office filters shown on screen, making it suitable for circulation or filing.', 'bottom-end'),
    ],
  },
  {
    id: 'accra-reports',
    version: 1,
    match: exact('/module-a/accra-reports'),
    steps: () => [
      welcome('Accra operational reports', 'This report uses the Accra-specific activity categories and register fields.'),
      tourStep('[data-tour="page-header"]', 'Accra report scope', 'The report is fixed to Accra and summarises the selected calendar period.'),
      tourStep('[data-tour="report-filters"]', 'Choose the period', 'Move between weekly, monthly, quarterly, and annual views, then select the matching year and calendar value.'),
      tourStep('[data-tour="report-summary"]', 'Status totals', 'These cards show all Accra activities in scope and how many are completed, in progress, or pending.'),
      tourStep('[data-tour="report-charts"]', 'Category and trend views', 'The category chart explains the mix of work, while the monthly trend shows when activity was recorded.'),
      tourStep('[data-tour="report-table"]', 'Activity register', 'The register provides the date, activity label, operational details, check-up call result where applicable, and status.'),
      tourStep('[data-tour="report-export"]', 'Export the report', 'Export preserves the current period and Accra scope for formal reporting.', 'bottom-end'),
    ],
  },
  {
    id: 'weekly-report',
    version: 1,
    match: exact('/module-a/weekly-report'),
    steps: context => [
      welcome('Weekly activity report', 'This view combines calculated activity delivery with editable weekly targets and narrative reporting.'),
      tourStep('[data-tour="page-header"]', 'Week and office controls', context.role === 'zonal_officer' ? 'Choose the week-ending date and export the report for your assigned office.' : 'Choose the office and week-ending date, then export the matching report to Excel.'),
      tourStep('[data-tour="weekly-identity"]', 'Report identity', 'Confirm the zonal office, responsible officer, and Monday-to-Friday reporting range before interpreting the figures.'),
      tourStep('[data-tour="weekly-summary"]', 'Targets versus achievement', 'The weekly summary compares targets with activities logged in the period and calculates the variance. Comments are assembled from matching activity details.'),
      tourStep(context.role === 'viewer' ? '[data-tour="weekly-summary"]' : '[data-tour="weekly-target-actions"]', 'Save weekly targets', context.role === 'viewer' ? 'Viewer access is read-only; target values are displayed without edit controls.' : 'Enter non-negative targets and save them before preparing the narrative.'),
      tourStep('[data-tour="weekly-narrative"]', 'Highlights and challenges', context.role === 'viewer' ? 'Review the office’s achievements, challenges, and summary narrative.' : 'Record key achievements, challenges, and a concise management summary, then save the narrative.'),
      tourStep('[data-tour="weekly-detail"]', 'Detailed activity tracker', 'This final section groups the underlying records by thematic area and presents dates, stakeholders, outcomes, evidence, and comments.'),
      tourStep('[data-tour="weekly-export"]', 'Export to Excel', 'The export contains the same selected office, week, calculations, narrative, and detailed tracker shown on this page.', 'bottom-end'),
    ],
  },
  {
    id: 'webinars',
    version: 1,
    match: exact('/module-b/webinars'),
    steps: context => [
      welcome('Webinar pipeline', 'Module B tracks every country through a strict nine-task webinar workflow.'),
      tourStep('[data-tour="page-header"]', 'Countries in scope', 'The heading shows how many country webinars are currently tracked.'),
      ...(context.role !== 'viewer'
        ? [tourStep('[data-tour="primary-action"]', 'Add a country webinar', 'Create a country record to start its first workflow task immediately.', 'bottom-end')]
        : []),
      tourStep('[data-tour="webinar-summary"]', 'Portfolio status', 'These cards separate active, completed, and delayed country workflows.'),
      tourStep('[data-tour="webinar-alert"]', 'Delay attention', 'When overdue work exists, this alert identifies how many countries require immediate follow-up.'),
      tourStep('[data-tour="webinar-pipeline"]', 'Nine-task pipeline', 'Each row shows the country, nine sequential task indicators, completed count, percentage progress, and a details link. Hover a task dot for its label and status.'),
      tourStep('[data-tour="webinar-legend"]', 'Status colours', 'Green is completed, blue is in progress, red is delayed, and grey has not started. Only the active task can be completed next.'),
      tourStep('[data-tour="webinar-row-action"]', 'Open country details', 'Use Details to review deadlines, complete the active task when permitted, and read the task history.', 'left'),
    ],
  },
  {
    id: 'webinar-create',
    version: 1,
    match: exact('/module-b/new'),
    steps: () => [
      welcome('Start webinar tracking', 'Creating a country record prepares all nine workflow tasks and begins the first task immediately.'),
      tourStep('[data-tour="page-header"]', 'New country webinar', 'Use the back link or Cancel to leave without creating a record.'),
      tourStep('[data-tour="webinar-country"]', 'Country name', 'Enter the full country name used in reports and the pipeline.'),
      tourStep('[data-tour="webinar-code"]', 'ISO country code', 'Enter the optional two-letter ISO code. ROAT uses it to display the country flag consistently.'),
      tourStep('[data-tour="webinar-notes"]', 'Initial notes', 'Record any useful context, contacts, constraints, or planning information for the webinar.'),
      tourStep('[data-tour="webinar-workflow"]', 'Nine sequential tasks', 'The preview shows the exact order. Each task begins only after the previous task is completed and receives a five-working-day deadline.'),
      tourStep('[data-tour="form-actions"]', 'Begin tracking', 'Cancel leaves without saving. Begin Tracking creates the country, starts task one, and opens the country detail page.', 'top'),
    ],
  },
  {
    id: 'webinar-detail',
    version: 1,
    match: pathname => /^\/module-b\/webinars\/[^/]+$/.test(pathname),
    steps: context => [
      welcome('Country webinar detail', 'This page is the operational record for one country’s nine-task webinar workflow.'),
      tourStep('[data-tour="page-header"]', 'Country identity', 'Confirm the country, ISO code, start date, and overall progress. Use Back to Pipeline to return to the portfolio view.'),
      tourStep('[data-tour="webinar-progress"]', 'Overall completion', 'The progress bar shows completed tasks out of nine. A red bar indicates at least one delayed task.'),
      tourStep('[data-tour="webinar-notes"]', 'Country notes', 'Initial planning notes appear here when they were supplied during creation.'),
      tourStep('[data-tour="webinar-tasks"]', 'Sequential task register', 'Each row shows the task order, workflow status, start date, deadline, and current timing information.'),
      tourStep('[data-tour="webinar-deadline"]', 'Deadlines and delay status', context.role === 'regional_admin' ? 'Administrators can select an unfinished deadline to correct it. Overdue active tasks are highlighted and show the number of days late.' : 'Each active task has a five-working-day deadline. Overdue tasks are highlighted and show the number of days late.'),
      ...(context.role !== 'viewer'
        ? [tourStep('[data-tour="webinar-complete"]', 'Complete the active task', 'Mark Complete records optional notes, closes the current task, and automatically starts the next task. Review carefully before confirming.')]
        : []),
      tourStep('[data-tour="webinar-task-notes"]', 'Completion history', 'When task notes exist, this section preserves the note, task number, and completion time for later review.'),
    ],
  },
  {
    id: 'admin-users',
    version: 1,
    match: exact('/admin/users'),
    steps: () => [
      welcome('User management', 'This administration page controls who can access ROAT and what each account is permitted to do.'),
      tourStep('[data-tour="page-header"]', 'Account administration', 'Use this register to review names, email addresses, roles, office assignments, account status, and membership dates.'),
      tourStep('[data-tour="user-invite"]', 'Invite a user', 'Enter the user’s formal name and email, then choose the correct role. Zonal officers must also be assigned to their reporting office.', 'bottom-end'),
      tourStep('[data-tour="user-table"]', 'User register', 'Administrator, zonal officer, and viewer roles have different access. Active status determines whether an account may enter the application.'),
      tourStep('[data-tour="user-password"]', 'Reset a password', 'Password reset applies the documented temporary password and requires the user to choose a new password at the next sign-in. Confirm the correct account first.'),
      tourStep('[data-tour="user-edit"]', 'Edit account access', 'Use Edit to correct the display name, change the role or office, and activate or deactivate the account. These changes affect access immediately.'),
    ],
  },
  {
    id: 'admin-targets',
    version: 1,
    match: exact('/admin/targets'),
    steps: () => [
      welcome('Quarterly activity targets', 'Set the expected number of activities by category for each regional office and quarter.'),
      tourStep('[data-tour="page-header"]', 'Target configuration', 'Targets drive progress percentages in reports and the regional performance overview.'),
      tourStep('[data-tour="target-zone"]', 'Choose the office', 'Select the zonal office whose targets you want to review or change.'),
      tourStep('[data-tour="target-period"]', 'Choose the quarter', 'Select the year and quarter. Existing values load automatically for that exact period.'),
      tourStep('[data-tour="target-grid"]', 'Enter target values', 'Use whole, non-negative numbers. Leave a field blank when no target should be measured for that activity type.'),
      tourStep('[data-tour="target-save"]', 'Save the target set', 'Saving updates every activity target shown for the selected office and quarter.', 'top'),
    ],
  },
  {
    id: 'admin-performance',
    version: 1,
    match: exact('/admin/performance'),
    steps: () => [
      welcome('Regional performance overview', 'This page compares achieved activities with configured targets across every regional office.'),
      tourStep('[data-tour="page-header"]', 'Performance scope', 'The heading confirms the selected period and quarter-to-date context. Edit Targets opens the configuration page for the active quarter.'),
      tourStep('[data-tour="performance-filters"]', 'Change the period', 'Review weekly, monthly, quarterly, or annual performance by choosing the corresponding year and calendar value.'),
      tourStep('[data-tour="performance-zones"]', 'Office health summary', 'Each office card states how many configured activity targets have been met and links directly to that office’s targets.'),
      tourStep('[data-tour="performance-grid"]', 'Cross-zone comparison', 'Each cell shows achieved versus target, a progress bar, and a percentage. Rows compare the same activity type across all offices.'),
      tourStep('[data-tour="performance-legend"]', 'Read the performance colours', 'Green means at least 100%, amber means 50–99%, red means below 50%, and grey means no target is set.'),
    ],
  },
  {
    id: 'admin-settings',
    version: 1,
    match: exact('/admin/settings'),
    steps: () => [
      welcome('System settings', 'This page documents the active operational configuration for ROAT.'),
      tourStep('[data-tour="page-header"]', 'Configuration reference', 'The settings shown here are informational and cannot be edited from this page.'),
      tourStep('[data-tour="delay-settings"]', 'Delay alarm system', 'ROAT checks overdue webinar tasks on weekdays, gives each active task a five-working-day window, and sends configured email alerts.'),
      tourStep('[data-tour="system-information"]', 'System information', 'This section confirms the application version, responsible division, active modules, and zonal-office coverage.'),
    ],
  },
  {
    id: 'profile',
    version: 1,
    match: exact('/profile'),
    steps: () => [
      welcome('Your ROAT profile', 'Review your account identity, access level, office assignment, and security settings here.'),
      tourStep('[data-tour="page-header"]', 'Profile settings', 'This page is personal to your signed-in account.'),
      tourStep('[data-tour="profile-identity"]', 'Identity and access badges', 'Confirm your name, email, role, assigned office, and active-account status.'),
      tourStep('[data-tour="profile-information"]', 'Account information', 'This reference section shows the authoritative email, role, office, status, and membership date.'),
      tourStep('[data-tour="profile-name"]', 'Display name', 'Update the name shown throughout ROAT. The save action is enabled only when the value has changed.'),
      tourStep('[data-tour="profile-password"]', 'Change your password', 'Choose a password of at least ten characters and enter it twice. Password values are never displayed after saving.'),
    ],
  },
]

export function getTourForPath(pathname: string): TourDefinition | null {
  return TOUR_DEFINITIONS.find(definition => definition.match(pathname)) ?? null
}

export function getTourById(tourId: TourId): TourDefinition | null {
  return TOUR_DEFINITIONS.find(definition => definition.id === tourId) ?? null
}

export function shouldAutoStartTour(
  definition: TourDefinition | null,
  progress: readonly TourProgress[],
  progressAvailable: boolean
): boolean {
  if (!definition || !progressAvailable) return false

  const seen = progress.find(item => item.tour_id === definition.id)
  return !seen || seen.tour_version < definition.version
}

export function buildTourSteps(definition: TourDefinition, context: TourContext): Step[] {
  return definition.steps(context)
}
