'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

// Color assigned per activity type key — stays consistent across renders
const TYPE_COLORS: Record<string, string> = {
  investor_enquiry:              '#3b82f6',
  new_registration:              '#10b981',
  renewal:                       '#f59e0b',
  investor_issue_resolution:     '#ef4444',
  facilitation_done:             '#8b5cf6',
  site_visit:                    '#06b6d4',
  technology_transfer_agreement: '#ec4899',
  stakeholder_engagement:        '#f97316',
  official_correspondence:       '#14b8a6',
  outreach_promotional:          '#6366f1',
  media_interview:               '#84cc16',
  checkup_call:                  '#a855f7',
  iomp_update:                   '#0ea5e9',
}

export interface ZonalActivityType {
  key: string
  label: string
}

export interface ZonalData {
  zone: string
  [key: string]: number | string
}

interface ZonalSummaryChartProps {
  data: ZonalData[]
  activityTypes: ZonalActivityType[]
}

export function ZonalSummaryChart({ data, activityTypes }: ZonalSummaryChartProps) {
  // Only render bars for types that have at least one non-zero value
  const activeTypes = activityTypes.filter(t =>
    data.some(d => (d[t.key] as number) > 0)
  )

  if (data.length === 0 || activeTypes.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-slate-400">
        No activity data for this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="zone"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
          }}
          cursor={{ fill: 'rgba(148,163,184,0.08)' }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 10, paddingTop: 12 }}
        />
        {activeTypes.map(({ key, label }) => (
          <Bar
            key={key}
            dataKey={key}
            name={label}
            stackId="zone"
            fill={TYPE_COLORS[key] ?? '#94a3b8'}
            radius={undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
