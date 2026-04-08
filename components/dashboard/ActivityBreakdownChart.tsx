'use client'

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, Label
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

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="48%"
          innerRadius={62}
          outerRadius={95}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
          <Label
            content={({ viewBox }) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { cx, cy } = viewBox as any
              return (
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                  <tspan x={cx} dy="-7" fontSize="22" fontWeight="600" fill="#0f172a">
                    {total}
                  </tspan>
                  <tspan x={cx} dy="18" fontSize="10" fill="#94a3b8" letterSpacing="1">
                    ACTIVITIES
                  </tspan>
                </text>
              )
            }}
            position="center"
          />
        </Pie>
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
          }}
          formatter={(value, name) => [value, name]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
