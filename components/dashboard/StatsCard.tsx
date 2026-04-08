import { cn } from '@/lib/utils/cn'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

const VARIANTS = {
  default: { icon: 'bg-slate-100 text-slate-600', value: 'text-slate-900' },
  success: { icon: 'bg-emerald-100 text-emerald-600', value: 'text-emerald-700' },
  warning: { icon: 'bg-amber-100 text-amber-600', value: 'text-amber-700' },
  danger:  { icon: 'bg-red-100 text-red-600', value: 'text-red-700' },
}

export function StatsCard({ title, value, subtitle, icon: Icon, variant = 'default' }: StatsCardProps) {
  const styles = VARIANTS[variant]

  return (
    <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold tracking-widest uppercase text-slate-400">
            {title}
          </CardTitle>
          {Icon && (
            <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', styles.icon)}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <p className={cn('text-3xl font-semibold tracking-tight', styles.value)}>{value}</p>
        {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
