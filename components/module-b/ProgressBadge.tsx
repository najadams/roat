import { cn } from '@/lib/utils/cn'

interface ProgressBadgeProps {
  pct: number
  hasDelayed?: boolean
  size?: 'sm' | 'md'
}

export function ProgressBadge({ pct, hasDelayed = false, size = 'sm' }: ProgressBadgeProps) {
  const color =
    hasDelayed
      ? 'bg-red-100 text-red-700 ring-1 ring-red-200'
      : pct === 100
      ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
      : pct >= 50
      ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
      : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        color
      )}
    >
      {hasDelayed && <span className="text-red-500">!</span>}
      {pct}%
    </span>
  )
}

interface TaskDotProps {
  status: string
  label?: string
}

const DOT_COLORS: Record<string, string> = {
  completed:   'bg-emerald-400',
  in_progress: 'bg-blue-400',
  not_started: 'bg-slate-200',
  delayed:     'bg-red-400',
}

export function TaskDot({ status, label }: TaskDotProps) {
  return (
    <div
      className={cn(
        'h-4 w-4 rounded-full flex-shrink-0 transition-all',
        DOT_COLORS[status] ?? 'bg-slate-300'
      )}
      title={label}
    />
  )
}
