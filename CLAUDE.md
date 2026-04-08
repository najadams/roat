# CLAUDE.md — Argus Development Guide

> **Project:** Argus — Regional and Global Operations Division  
> **Stack:** Next.js 14 (App Router) + Supabase + Tailwind CSS + shadcn/ui  
> **Purpose:** Zonal office performance reporting (Module A) and webinar progress tracking (Module B)

---

for not too long option field items use modern radio buttons.
use formal spacing and font to give it premium look

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Versions](#2-tech-stack--versions)
3. [Project Structure](#3-project-structure)
4. [Environment Variables](#4-environment-variables)
5. [Database Schema](#5-database-schema)
6. [Row Level Security Policies](#6-row-level-security-policies)
7. [Database Triggers & Functions](#7-database-triggers--functions)
8. [Database Views](#8-database-views)
9. [Authentication & Access Control](#9-authentication--access-control)
10. [Module A — Zonal Activity Reporting](#10-module-a--zonal-activity-reporting)
11. [Module B — Webinar Tracker](#11-module-b--webinar-tracker)
12. [Dashboard & Reporting](#12-dashboard--reporting)
13. [Component Conventions](#13-component-conventions)
14. [API & Server Actions](#14-api--server-actions)
15. [Security Checklist](#15-security-checklist)
16. [Delay Alarm System](#16-delay-alarm-system)
17. [Coding Standards](#17-coding-standards)
18. [Development Workflow](#18-development-workflow)

---

## 1. Project Overview

**Argus** is an internal web application for the Regional and Global Operations Division. It serves two core functions:

- **Module A:** Data entry and reporting for six zonal offices across Ghana. Officers log activities such as new registrations, site visits, stakeholder engagements, and more. Reports are generated monthly, quarterly, and annually — both per zone and cumulatively.

- **Module B:** Tracks progress of webinars country by country through a strict six-step sequential workflow. Tasks must be completed in order within 5 working days each. Delayed tasks trigger visual alarms and email notifications.

### Zonal Offices
| Code | Office |
|------|--------|
| `kumasi` | Kumasi |
| `tamale` | Tamale |
| `takoradi` | Takoradi |
| `techiman` | Techiman |
| `ho` | Ho |
| `koforidua` | Koforidua |

---

## 2. Tech Stack & Versions

| Tool | Version | Purpose |
|------|---------|---------|
| Next.js | 14.x (App Router) | Frontend + server actions |
| Supabase | Latest JS client v2 | Auth, DB, Realtime, Edge Functions |
| TypeScript | 5.x | Type safety throughout |
| Tailwind CSS | 3.x | Styling |
| shadcn/ui | Latest | UI component library |
| Recharts | 2.x | Charts and dashboards |
| date-fns | 3.x | Date manipulation + working day logic |
| Resend | Latest | Transactional email for alarms |
| Zod | 3.x | Schema validation on forms and API |
| React Hook Form | 7.x | Form state management |

### Installation

```bash
npx create-next-app@latest argus --typescript --tailwind --app
cd argus
npx shadcn-ui@latest init
npm install @supabase/supabase-js @supabase/ssr
npm install recharts date-fns zod react-hook-form @hookform/resolvers
npm install resend
npm install xlsx jspdf jspdf-autotable  # for export features
```

---

## 3. Project Structure

```
argus/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # Main app shell with sidebar
│   │   ├── dashboard/
│   │   │   └── page.tsx                # Overview dashboard
│   │   ├── module-a/
│   │   │   ├── activities/
│   │   │   │   ├── page.tsx            # Activity list with filters
│   │   │   │   └── [id]/page.tsx       # Activity detail/edit
│   │   │   ├── new/
│   │   │   │   └── page.tsx            # New activity form
│   │   │   └── reports/
│   │   │       └── page.tsx            # Monthly/quarterly/annual reports
│   │   ├── module-b/
│   │   │   ├── webinars/
│   │   │   │   ├── page.tsx            # Webinar pipeline overview
│   │   │   │   └── [id]/page.tsx       # Individual webinar detail
│   │   │   └── new/
│   │   │       └── page.tsx            # Add new country/webinar
│   │   └── admin/
│   │       ├── users/
│   │       │   └── page.tsx            # User management (admin only)
│   │       └── settings/
│   │           └── page.tsx
│   └── api/
│       ├── webhooks/
│       │   └── route.ts
│       └── export/
│           └── route.ts                # PDF/Excel export endpoint
│
├── components/
│   ├── ui/                             # shadcn/ui components (auto-generated)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── MobileNav.tsx
│   ├── module-a/
│   │   ├── ActivityForm.tsx
│   │   ├── ActivityTable.tsx
│   │   ├── ActivityFilters.tsx
│   │   └── ActivityCard.tsx
│   ├── module-b/
│   │   ├── WebinarPipeline.tsx         # Country pipeline with progress bar
│   │   ├── TaskRow.tsx                 # Individual task with delay coloring
│   │   ├── ProgressBadge.tsx
│   │   └── WebinarForm.tsx
│   ├── dashboard/
│   │   ├── ZonalSummaryChart.tsx
│   │   ├── ActivityBreakdownChart.tsx
│   │   ├── WebinarProgressChart.tsx
│   │   └── StatsCard.tsx
│   └── shared/
│       ├── ExportButton.tsx
│       ├── DateRangePicker.tsx
│       ├── ZoneSelector.tsx
│       └── StatusBadge.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # Browser client
│   │   ├── server.ts                   # Server client (for Server Components)
│   │   └── middleware.ts               # Auth middleware helper
│   ├── utils/
│   │   ├── working-days.ts             # 5-working-day deadline calculator
│   │   ├── date-helpers.ts
│   │   ├── export-helpers.ts           # PDF and Excel export logic
│   │   └── cn.ts                       # Tailwind class merge utility
│   └── validations/
│       ├── activity.schema.ts          # Zod schemas for Module A
│       └── webinar.schema.ts           # Zod schemas for Module B
│
├── actions/
│   ├── activity.actions.ts             # Server Actions for Module A
│   ├── webinar.actions.ts              # Server Actions for Module B
│   └── user.actions.ts                 # Server Actions for user management
│
├── types/
│   ├── database.types.ts               # Auto-generated from Supabase CLI
│   ├── activity.types.ts
│   └── webinar.types.ts
│
├── hooks/
│   ├── useActivities.ts
│   ├── useWebinarRealtime.ts           # Supabase Realtime subscription
│   └── useCurrentUser.ts
│
├── middleware.ts                        # Auth route protection
├── supabase/
│   ├── migrations/                     # SQL migration files
│   └── functions/
│       └── check-delayed-tasks/        # Edge Function for alarm system
│           └── index.ts
└── CLAUDE.md                           # This file
```

---

## 4. Environment Variables

Create a `.env.local` file at the project root. **Never commit this file.**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# IMPORTANT: Service role key bypasses ALL RLS policies.
# Use ONLY in server-side code (Server Actions, API Routes, Edge Functions).
# NEVER expose in client-side code.
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Email (Resend)
RESEND_API_KEY=re_your_resend_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
ALERT_EMAIL_FROM=alerts@gipc.gov.gh
ALERT_EMAIL_TO=admin@gipc.gov.gh
```

---

## 5. Database Schema

Run these migrations in order via the Supabase SQL editor or Supabase CLI.

### Migration 001 — Enums

```sql
-- Zonal offices
CREATE TYPE zonal_office AS ENUM (
  'kumasi', 'tamale', 'takoradi', 'techiman', 'ho', 'koforidua'
);

-- User roles
CREATE TYPE user_role AS ENUM (
  'zonal_officer', 'regional_admin', 'viewer'
);

-- Activity types (Module A)
CREATE TYPE activity_type AS ENUM (
  'new_registration',
  'renewal',
  'facilitation_done',
  'site_visit',
  'technology_transfer_agreement',
  'stakeholder_engagement',
  'media_interview',
  'checkup_call',
  'iomp_update'
);

-- Activity status
CREATE TYPE activity_status AS ENUM (
  'pending', 'in_progress', 'completed', 'cancelled'
);

-- Webinar task names (Module B) — must follow this order
CREATE TYPE webinar_task_name AS ENUM (
  'notice_to_ministry_of_finance',
  'contact_with_mission',
  'date_confirmation_with_mission',
  'flyer_distribution',
  'hosting_of_webinar',
  'webinar_report_and_leads_transfer'
);

-- Webinar task status
CREATE TYPE task_status AS ENUM (
  'not_started', 'in_progress', 'completed', 'delayed'
);
```

### Migration 002 — Profiles Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  zonal_office zonal_office,          -- NULL for regional_admin (sees all)
  role user_role NOT NULL DEFAULT 'zonal_officer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Migration 003 — Module A: Activities Table

```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type activity_type NOT NULL,
  zonal_office zonal_office NOT NULL,

  -- Core fields
  date DATE NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT NOT NULL,
  telephone TEXT,
  email TEXT,
  sector TEXT,
  detail TEXT,
  action_required TEXT,
  status activity_status NOT NULL DEFAULT 'pending',

  -- Audit fields
  created_by UUID NOT NULL REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Indexes for common query patterns
CREATE INDEX idx_activities_zone ON activities(zonal_office);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_date ON activities(date);
CREATE INDEX idx_activities_zone_date ON activities(zonal_office, date);
CREATE INDEX idx_activities_not_deleted ON activities(deleted_at) WHERE deleted_at IS NULL;

CREATE TRIGGER activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Migration 004 — Module B: Webinars & Tasks

```sql
CREATE TABLE webinars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  country_code CHAR(2),               -- ISO 3166-1 alpha-2 (e.g. 'FR' for France)
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE webinar_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id UUID NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
  task_name webinar_task_name NOT NULL,
  task_order SMALLINT NOT NULL CHECK (task_order BETWEEN 1 AND 6),
  status task_status NOT NULL DEFAULT 'not_started',

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,               -- started_at + 5 working days (set by trigger)
  is_delayed BOOLEAN NOT NULL DEFAULT FALSE,

  -- Notes per task
  notes TEXT,
  completed_by UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(webinar_id, task_order),
  UNIQUE(webinar_id, task_name)
);

CREATE INDEX idx_webinar_tasks_webinar ON webinar_tasks(webinar_id);
CREATE INDEX idx_webinar_tasks_status ON webinar_tasks(status);
CREATE INDEX idx_webinar_tasks_delayed ON webinar_tasks(is_delayed) WHERE is_delayed = TRUE;

CREATE TRIGGER webinars_updated_at
  BEFORE UPDATE ON webinars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER webinar_tasks_updated_at
  BEFORE UPDATE ON webinar_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 6. Row Level Security Policies

**Critical:** Enable RLS on every table before writing policies.

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinars ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinar_tasks ENABLE ROW LEVEL SECURITY;
```

### Profiles Policies

```sql
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (id = auth.uid());

-- Regional admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'regional_admin'
  )
);

-- Only admins can insert/update profiles
CREATE POLICY "Admins can manage profiles"
ON profiles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'regional_admin'
  )
);
```

### Activities Policies

```sql
-- Zonal officers see only their own zone's activities
CREATE POLICY "Zonal officers see own zone"
ON activities FOR SELECT
USING (
  zonal_office = (
    SELECT zonal_office FROM profiles WHERE id = auth.uid()
  )
  AND deleted_at IS NULL
);

-- Regional admins see all zones
CREATE POLICY "Admins see all activities"
ON activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'regional_admin'
  )
  AND deleted_at IS NULL
);

-- Viewers see all activities (read-only)
CREATE POLICY "Viewers see all activities"
ON activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'viewer'
  )
  AND deleted_at IS NULL
);

-- Zonal officers can insert for their own zone only
CREATE POLICY "Zonal officers can insert own zone"
ON activities FOR INSERT
WITH CHECK (
  zonal_office = (
    SELECT zonal_office FROM profiles WHERE id = auth.uid()
  )
  AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'zonal_officer'
);

-- Admins can insert for any zone
CREATE POLICY "Admins can insert any activity"
ON activities FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'regional_admin'
  )
);

-- Officers can update their own zone's records; admins can update all
CREATE POLICY "Officers update own zone activities"
ON activities FOR UPDATE
USING (
  (zonal_office = (SELECT zonal_office FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'zonal_officer')
  OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'regional_admin'
);
```

### Webinar Policies

```sql
-- All authenticated users can view webinars (not deleted)
CREATE POLICY "Authenticated users view webinars"
ON webinars FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND deleted_at IS NULL
);

-- Only admins and officers can create webinars
CREATE POLICY "Officers and admins create webinars"
ON webinars FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('zonal_officer', 'regional_admin')
  )
);

-- All authenticated users can view webinar tasks
CREATE POLICY "Authenticated users view tasks"
ON webinar_tasks FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Officers and admins can update tasks
CREATE POLICY "Officers and admins update tasks"
ON webinar_tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('zonal_officer', 'regional_admin')
  )
);
```

---

## 7. Database Triggers & Functions

### Auto-create Webinar Tasks on New Webinar

When a new webinar is inserted, automatically create all 6 tasks in `not_started` status.

```sql
CREATE OR REPLACE FUNCTION create_webinar_tasks()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO webinar_tasks (webinar_id, task_name, task_order, status)
  VALUES
    (NEW.id, 'notice_to_ministry_of_finance',    1, 'in_progress'),  -- First task starts immediately
    (NEW.id, 'contact_with_mission',              2, 'not_started'),
    (NEW.id, 'date_confirmation_with_mission',    3, 'not_started'),
    (NEW.id, 'flyer_distribution',               4, 'not_started'),
    (NEW.id, 'hosting_of_webinar',               5, 'not_started'),
    (NEW.id, 'webinar_report_and_leads_transfer', 6, 'not_started');

  -- Set deadline for the first task
  UPDATE webinar_tasks
  SET
    started_at = NOW(),
    deadline = calculate_working_day_deadline(NOW(), 5)
  WHERE webinar_id = NEW.id AND task_order = 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_webinar_created
  AFTER INSERT ON webinars
  FOR EACH ROW EXECUTE FUNCTION create_webinar_tasks();
```

### Advance to Next Task on Completion

```sql
CREATE OR REPLACE FUNCTION advance_to_next_task()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when status changes TO 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();

    -- Activate the next task
    UPDATE webinar_tasks
    SET
      status = 'in_progress',
      started_at = NOW(),
      deadline = calculate_working_day_deadline(NOW(), 5)
    WHERE
      webinar_id = NEW.webinar_id
      AND task_order = NEW.task_order + 1
      AND status = 'not_started';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_task_completed
  BEFORE UPDATE ON webinar_tasks
  FOR EACH ROW EXECUTE FUNCTION advance_to_next_task();
```

### Working Day Deadline Calculator (SQL)

```sql
-- Adds N working days to a timestamp, skipping weekends.
-- Extend this function to also skip Ghanaian public holidays
-- by maintaining a public_holidays table.
CREATE OR REPLACE FUNCTION calculate_working_day_deadline(
  start_ts TIMESTAMPTZ,
  working_days INT
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  result TIMESTAMPTZ := start_ts;
  days_added INT := 0;
BEGIN
  WHILE days_added < working_days LOOP
    result := result + INTERVAL '1 day';
    -- Skip Saturday (6) and Sunday (0)
    IF EXTRACT(DOW FROM result) NOT IN (0, 6) THEN
      days_added := days_added + 1;
    END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### Audit Trail Trigger

```sql
-- Automatically updates updated_by when a record is changed
CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activities_set_updated_by
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION set_updated_by();
```

---

## 8. Database Views

### Module A: Reporting Views

```sql
-- Monthly summary per zone and activity type
CREATE VIEW v_monthly_activity_summary AS
SELECT
  zonal_office,
  activity_type,
  DATE_TRUNC('month', date)::DATE AS month,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending
FROM activities
WHERE deleted_at IS NULL
GROUP BY zonal_office, activity_type, DATE_TRUNC('month', date);

-- Quarterly summary
CREATE VIEW v_quarterly_activity_summary AS
SELECT
  zonal_office,
  activity_type,
  DATE_TRUNC('quarter', date)::DATE AS quarter,
  EXTRACT(YEAR FROM date)::INT AS year,
  EXTRACT(QUARTER FROM date)::INT AS quarter_num,
  COUNT(*) AS total
FROM activities
WHERE deleted_at IS NULL
GROUP BY zonal_office, activity_type, DATE_TRUNC('quarter', date),
         EXTRACT(YEAR FROM date), EXTRACT(QUARTER FROM date);

-- Annual cumulative (all zones)
CREATE VIEW v_annual_cumulative_summary AS
SELECT
  activity_type,
  EXTRACT(YEAR FROM date)::INT AS year,
  COUNT(*) AS total,
  COUNT(DISTINCT zonal_office) AS zones_contributing
FROM activities
WHERE deleted_at IS NULL
GROUP BY activity_type, EXTRACT(YEAR FROM date);
```

### Module B: Webinar Progress View

```sql
CREATE VIEW v_webinar_progress AS
SELECT
  w.id AS webinar_id,
  w.country,
  w.country_code,
  w.created_at,
  ROUND(
    (COUNT(*) FILTER (WHERE t.status = 'completed') * 100.0) / 6,
    0
  )::INT AS progress_pct,
  COUNT(*) FILTER (WHERE t.status = 'completed') AS tasks_completed,
  COUNT(*) FILTER (WHERE t.is_delayed = TRUE) AS tasks_delayed,
  BOOL_OR(t.is_delayed) AS has_delayed_tasks,
  MAX(t.task_order) FILTER (WHERE t.status = 'in_progress') AS current_task_order
FROM webinars w
LEFT JOIN webinar_tasks t ON t.webinar_id = w.id
WHERE w.deleted_at IS NULL
GROUP BY w.id, w.country, w.country_code, w.created_at;

-- Full task status per webinar (for pipeline view)
CREATE VIEW v_webinar_task_detail AS
SELECT
  w.id AS webinar_id,
  w.country,
  t.id AS task_id,
  t.task_name,
  t.task_order,
  t.status,
  t.started_at,
  t.completed_at,
  t.deadline,
  t.is_delayed,
  t.notes,
  CASE
    WHEN t.status = 'in_progress' AND NOW() > t.deadline THEN TRUE
    ELSE FALSE
  END AS currently_overdue
FROM webinars w
JOIN webinar_tasks t ON t.webinar_id = w.id
WHERE w.deleted_at IS NULL
ORDER BY w.country, t.task_order;
```

---

## 9. Authentication & Access Control

### Supabase Client Setup

```typescript
// lib/supabase/client.ts — for use in Client Components
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

```typescript
// lib/supabase/server.ts — for use in Server Components and Server Actions
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

### Middleware (Route Protection)

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users to login
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from login
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single()

    if (profile?.role !== 'regional_admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

---

## 10. Module A — Zonal Activity Reporting

### Zod Validation Schema

```typescript
// lib/validations/activity.schema.ts
import { z } from 'zod'

export const activityTypes = [
  'new_registration', 'renewal', 'facilitation_done', 'site_visit',
  'technology_transfer_agreement', 'stakeholder_engagement',
  'media_interview', 'checkup_call', 'iomp_update'
] as const

export const activitySchema = z.object({
  activity_type: z.enum(activityTypes, {
    required_error: 'Activity type is required'
  }),
  date: z.string().min(1, 'Date is required'),
  company_name: z.string().min(1, 'Company name is required').max(200),
  location: z.string().min(1, 'Location is required').max(200),
  telephone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  sector: z.string().optional(),
  detail: z.string().optional(),
  action_required: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
})

export type ActivityFormData = z.infer<typeof activitySchema>
```

### Server Action — Create Activity

```typescript
// actions/activity.actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { activitySchema } from '@/lib/validations/activity.schema'
import { revalidatePath } from 'next/cache'

export async function createActivity(formData: unknown) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('zonal_office, role')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found' }

  const parsed = activitySchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  const { error } = await supabase.from('activities').insert({
    ...parsed.data,
    zonal_office: profile.zonal_office!,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  revalidatePath('/module-a/activities')
  return { success: true }
}
```

### Activity Type Labels (for UI display)

```typescript
// types/activity.types.ts
export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  new_registration: 'New Registration',
  renewal: 'Renewal',
  facilitation_done: 'Facilitation Done',
  site_visit: 'Site Visit',
  technology_transfer_agreement: 'Technology Transfer Agreement',
  stakeholder_engagement: 'Stakeholder Engagement',
  media_interview: 'Media Interview',
  checkup_call: 'Check-up Call',
  iomp_update: 'IOMP Update',
}

export const ZONAL_OFFICE_LABELS: Record<string, string> = {
  kumasi: 'Kumasi',
  tamale: 'Tamale',
  takoradi: 'Takoradi',
  techiman: 'Techiman',
  ho: 'Ho',
  koforidua: 'Koforidua',
}
```

---

## 11. Module B — Webinar Tracker

### Task Metadata

```typescript
// types/webinar.types.ts
export const TASK_LABELS: Record<string, string> = {
  notice_to_ministry_of_finance:    'Notice to Ministry of Finance',
  contact_with_mission:             'Contact with Mission',
  date_confirmation_with_mission:   'Date Confirmation with Mission',
  flyer_distribution:               'Flyer Distribution',
  hosting_of_webinar:               'Hosting of Webinar',
  webinar_report_and_leads_transfer:'Webinar Report & Leads Transfer',
}

export const TASK_ORDER = [
  'notice_to_ministry_of_finance',
  'contact_with_mission',
  'date_confirmation_with_mission',
  'flyer_distribution',
  'hosting_of_webinar',
  'webinar_report_and_leads_transfer',
] as const

export type TaskName = typeof TASK_ORDER[number]
```

### Server Action — Complete a Task

```typescript
// actions/webinar.actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function completeWebinarTask(taskId: string, notes?: string) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('webinar_tasks')
    .update({
      status: 'completed',
      completed_by: user.id,
      notes: notes ?? null,
    })
    .eq('id', taskId)
    .eq('status', 'in_progress')  // Can only complete an in-progress task

  if (error) return { error: error.message }

  revalidatePath('/module-b/webinars')
  return { success: true }
}
```

### Working Days Utility (Client/Shared)

```typescript
// lib/utils/working-days.ts
import { addDays, isWeekend } from 'date-fns'

export function addWorkingDays(startDate: Date, days: number): Date {
  let result = new Date(startDate)
  let added = 0
  while (added < days) {
    result = addDays(result, 1)
    if (!isWeekend(result)) {
      added++
    }
  }
  return result
}

export function isTaskDelayed(deadline: string | null): boolean {
  if (!deadline) return false
  return new Date() > new Date(deadline)
}

export function getDelayDays(deadline: string | null): number {
  if (!deadline || !isTaskDelayed(deadline)) return 0
  const diff = new Date().getTime() - new Date(deadline).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}
```

---

## 12. Dashboard & Reporting

### Stats Cards to Display

**Module A Dashboard:**
- Total activities this month (per zone or cumulative)
- Activities by type (breakdown chart)
- Completion rate %
- Activities per zone (bar chart comparison)
- Year-on-year trend line

**Module B Dashboard:**
- Total active webinars
- Average progress % across all countries
- Countries with delayed tasks (red alert count)
- Pipeline view: each country as a row with 6 task indicators

### Recharts Example — Zonal Activity Bar Chart

```tsx
// components/dashboard/ZonalSummaryChart.tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ZonalData {
  zone: string
  new_registration: number
  site_visit: number
  stakeholder_engagement: number
}

export function ZonalSummaryChart({ data }: { data: ZonalData[] }) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="zone" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="new_registration" fill="#2563eb" name="New Registration" />
        <Bar dataKey="site_visit" fill="#16a34a" name="Site Visit" />
        <Bar dataKey="stakeholder_engagement" fill="#d97706" name="Stakeholder Engagement" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

### Report Periods

```typescript
// lib/utils/date-helpers.ts
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns'

export type ReportPeriod = 'monthly' | 'quarterly' | 'annual'

export function getReportDateRange(period: ReportPeriod, date = new Date()) {
  switch (period) {
    case 'monthly':
      return { from: startOfMonth(date), to: endOfMonth(date) }
    case 'quarterly':
      return { from: startOfQuarter(date), to: endOfQuarter(date) }
    case 'annual':
      return { from: startOfYear(date), to: endOfYear(date) }
  }
}
```

---

## 13. Component Conventions

### TaskRow — Delayed State Styling

```tsx
// components/module-b/TaskRow.tsx
import { cn } from '@/lib/utils/cn'
import { isTaskDelayed, getDelayDays } from '@/lib/utils/working-days'

interface TaskRowProps {
  taskName: string
  label: string
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed'
  deadline: string | null
}

export function TaskRow({ taskName, label, status, deadline }: TaskRowProps) {
  const delayed = status === 'in_progress' && isTaskDelayed(deadline)
  const delayDays = getDelayDays(deadline)

  return (
    <tr className={cn(
      'border-b transition-colors',
      status === 'completed' && 'bg-green-50',
      delayed && 'bg-red-50 animate-pulse',
      status === 'not_started' && 'bg-gray-50 opacity-60',
    )}>
      <td className="px-4 py-3 font-medium">{label}</td>
      <td className="px-4 py-3">
        <StatusBadge status={delayed ? 'delayed' : status} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {deadline ? new Date(deadline).toLocaleDateString() : '—'}
      </td>
      {delayed && (
        <td className="px-4 py-3 text-sm font-semibold text-red-600">
          ⚠ {delayDays} day{delayDays !== 1 ? 's' : ''} overdue
        </td>
      )}
    </tr>
  )
}
```

### StatusBadge Component

```tsx
// components/shared/StatusBadge.tsx
import { cn } from '@/lib/utils/cn'

const STATUS_STYLES = {
  completed:   'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  not_started: 'bg-gray-100 text-gray-600',
  delayed:     'bg-red-100 text-red-800',
  pending:     'bg-yellow-100 text-yellow-800',
  cancelled:   'bg-gray-200 text-gray-500 line-through',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
      STATUS_STYLES[status as keyof typeof STATUS_STYLES] ?? 'bg-gray-100 text-gray-700'
    )}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
```

---

## 14. API & Server Actions

### Rules for Server Actions vs API Routes

- Use **Server Actions** for all form submissions and mutations (create, update, delete).
- Use **API Routes** only for: webhook handlers, file export (PDF/Excel), and external service callbacks.
- Never call the Supabase service role key from client components.
- Always validate input with Zod before touching the database.

### Export Route (PDF/Excel)

```typescript
// app/api/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format')   // 'pdf' | 'excel'
  const period = searchParams.get('period')   // 'monthly' | 'quarterly' | 'annual'
  const zone   = searchParams.get('zone')

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch and format data, then return file
  // Implementation uses 'xlsx' library for Excel, 'jspdf' for PDF
}
```

---

## 15. Security Checklist

Before going to production, verify every item on this list:

### Database
- [ ] RLS enabled on ALL tables (`profiles`, `activities`, `webinars`, `webinar_tasks`)
- [ ] Every table has at least one SELECT policy — no table left open by default
- [ ] Tested RLS by logging in as a zonal officer and confirming cross-zone data is inaccessible
- [ ] `updated_by` audit trail triggers active on `activities`
- [ ] Service role key NOT present in any client-side code or `.env.local` committed to git

### Authentication
- [ ] Minimum password length set to 10+ characters in Supabase Auth settings
- [ ] MFA enabled for all `regional_admin` accounts
- [ ] Inactive users have `is_active = FALSE` and cannot log in (enforced via middleware)
- [ ] Session timeout configured appropriately

### Application
- [ ] All user inputs validated with Zod before database operations
- [ ] No raw SQL string interpolation with user input (use parameterized queries)
- [ ] Admin routes protected in `middleware.ts`
- [ ] `.env.local` added to `.gitignore`
- [ ] Environment variables validated at startup

### Infrastructure
- [ ] Supabase project using Cape Town (af-south-1) region for data residency
- [ ] Daily backups enabled (Supabase Pro plan)
- [ ] Point-in-time recovery configured
- [ ] Production URL added to Supabase allowed redirect URLs

---

## 16. Delay Alarm System

### Supabase Edge Function

```typescript
// supabase/functions/check-delayed-tasks/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)

Deno.serve(async () => {
  // Find all in-progress tasks past their deadline
  const { data: overdueTasks } = await supabase
    .from('webinar_tasks')
    .select(`
      id, task_name, deadline, webinar_id,
      webinars (country)
    `)
    .eq('status', 'in_progress')
    .eq('is_delayed', false)
    .lt('deadline', new Date().toISOString())

  if (!overdueTasks?.length) {
    return new Response('No delayed tasks found', { status: 200 })
  }

  // Mark all as delayed
  const ids = overdueTasks.map(t => t.id)
  await supabase
    .from('webinar_tasks')
    .update({ status: 'delayed', is_delayed: true })
    .in('id', ids)

  // Send alert email
  const taskList = overdueTasks.map(t =>
    `• ${(t.webinars as any).country} — ${t.task_name.replace(/_/g, ' ')} (due: ${new Date(t.deadline!).toDateString()})`
  ).join('\n')

  await resend.emails.send({
    from: Deno.env.get('ALERT_EMAIL_FROM')!,
    to: Deno.env.get('ALERT_EMAIL_TO')!,
    subject: `⚠ Argus Alert: ${overdueTasks.length} Webinar Task(s) Overdue`,
    text: `The following webinar tasks are now overdue:\n\n${taskList}\n\nPlease log in to Argus to review.`,
  })

  return new Response(`Marked ${overdueTasks.length} tasks as delayed`, { status: 200 })
})
```

### Schedule with pg_cron

Run this in the Supabase SQL editor to trigger the function every morning at 7am UTC:

```sql
SELECT cron.schedule(
  'check-delayed-webinar-tasks',
  '0 7 * * 1-5',  -- 7:00 AM UTC, Monday to Friday
  $$
    SELECT net.http_post(
      url := 'https://your-project-ref.supabase.co/functions/v1/check-delayed-tasks',
      headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'
    )
  $$
);
```

---

## 17. Coding Standards

- **TypeScript strictly:** No `any` types except where unavoidable (and add a `// TODO` comment).
- **Server Components by default:** Only use `'use client'` when you need interactivity, hooks, or browser APIs.
- **Co-locate validation:** Every form must have a matching Zod schema in `/lib/validations/`.
- **Error handling:** Server Actions always return `{ success: true }` or `{ error: string }`. Never throw.
- **Naming conventions:**
  - Database columns: `snake_case`
  - TypeScript types/interfaces: `PascalCase`
  - React components: `PascalCase`
  - Utility functions: `camelCase`
  - Files: `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- **No magic strings:** Use the enum/constant objects defined in `/types/` throughout the codebase.
- **Accessible UI:** All forms must have associated labels. Use `aria-*` attributes where shadcn/ui doesn't handle it automatically.

---

## 18. Development Workflow

### Getting Started

```bash
# Clone and install
git clone <repo-url> argus
cd argus
npm install

# Set up environment
cp .env.example .env.local
# Fill in your Supabase URL, anon key, service role key, and Resend key

# Generate TypeScript types from your Supabase schema
npx supabase gen types typescript --project-id your-project-ref > types/database.types.ts

# Start development server
npm run dev
```

### Branch Strategy

```
main          → production
staging       → pre-production testing
dev           → active development
feature/*     → individual features (e.g. feature/module-b-alarms)
fix/*         → bug fixes
```

### Recommended Build Order

1. Database schema + RLS policies + triggers (set up in Supabase)
2. Auth: login page, middleware, profile creation
3. Module A: activity form → activity list → reports page
4. Dashboard: charts pulling from views
5. Module B: webinar creation → task pipeline UI → task completion action
6. Delay alarm: Edge Function + pg_cron schedule
7. Export: PDF and Excel from reports page
8. Admin: user management panel
9. Security review against checklist in Section 15
10. UAT with zonal officers → production deployment

---

*Last updated: February 2026 | Argus v1.0 | Regional and Global Operations Division*
