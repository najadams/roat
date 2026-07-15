'use client'

import {
  BarChart, Bar, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1', '#84cc16',
]

interface ActivityData {
  name: string
  value: number
}

export function ActivityBreakdownChart({ data }: { data: ActivityData[] }) {
  if (data.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">
        No data for this period
      </div>
    )
  }

  const total = data.reduce((sum, d) => sum + d.value, 0)
  const rankedData = [...data]
    .sort((a, b) => b.value - a.value)
    .map(item => ({
      ...item,
      share: total > 0 ? Math.round((item.value / total) * 100) : 0,
    }))
  const height = Math.max(260, rankedData.length * 34 + 34)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={rankedData}
        layout="vertical"
        margin={{ top: 8, right: 24, left: 18, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis
          type="number"
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
        />
        <YAxis
          dataKey="name"
          type="category"
          width={150}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#64748b' }}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
          }}
          formatter={(value, name, item) => [
            `${value} entries (${item.payload.share}%)`,
            name,
          ]}
          cursor={{ fill: 'rgba(148,163,184,0.08)' }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {rankedData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
