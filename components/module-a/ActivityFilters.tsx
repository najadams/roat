'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { ACTIVITY_TYPE_LABELS, ZONAL_OFFICE_LABELS } from '@/types/activity.types'

interface ActivityFiltersProps {
  showZoneFilter?: boolean
}

export function ActivityFilters({ showZoneFilter = false }: ActivityFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      return params.toString()
    },
    [searchParams]
  )

  function handleFilter(key: string, value: string) {
    router.push(`${pathname}?${createQueryString(key, value === 'all' ? '' : value)}`)
  }

  function clearFilters() {
    router.push(pathname)
  }

  const hasFilters = searchParams.toString().length > 0

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={searchParams.get('type') ?? 'all'}
        onValueChange={val => handleFilter('type', val)}
      >
        <SelectTrigger className="h-9 text-sm border-slate-200 w-[200px]">
          <SelectValue placeholder="Activity type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-sm">All Activity Types</SelectItem>
          {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key} className="text-sm">{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showZoneFilter && (
        <Select
          value={searchParams.get('zone') ?? 'all'}
          onValueChange={val => handleFilter('zone', val)}
        >
          <SelectTrigger className="h-9 text-sm border-slate-200 w-[160px]">
            <SelectValue placeholder="Zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-sm">All Zones</SelectItem>
            {Object.entries(ZONAL_OFFICE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key} className="text-sm">{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={searchParams.get('status') ?? 'all'}
        onValueChange={val => handleFilter('status', val)}
      >
        <SelectTrigger className="h-9 text-sm border-slate-200 w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-sm">All Statuses</SelectItem>
          <SelectItem value="pending" className="text-sm">Pending</SelectItem>
          <SelectItem value="in_progress" className="text-sm">In Progress</SelectItem>
          <SelectItem value="completed" className="text-sm">Completed</SelectItem>
          <SelectItem value="cancelled" className="text-sm">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="month"
        value={searchParams.get('month') ?? ''}
        onChange={e => handleFilter('month', e.target.value)}
        className="h-9 text-sm border-slate-200 w-[160px]"
      />

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 gap-1.5 text-slate-500 hover:text-slate-900"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  )
}
