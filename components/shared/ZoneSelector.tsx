'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ZONAL_OFFICE_LABELS } from '@/types/activity.types'

interface ZoneSelectorProps {
  value: string
  onChange: (value: string) => void
  includeAll?: boolean
  placeholder?: string
}

const zones = Object.entries(ZONAL_OFFICE_LABELS)

export function ZoneSelector({
  value,
  onChange,
  includeAll = false,
  placeholder = 'Select zone',
}: ZoneSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 text-sm border-slate-200">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all" className="text-sm">All Zones</SelectItem>
        )}
        {zones.map(([key, label]) => (
          <SelectItem key={key} value={key} className="text-sm">
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
