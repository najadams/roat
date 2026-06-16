'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface ExportButtonProps {
  period: string
  zone?: string
  year?: number
  quarter?: number
  month?: number
  week?: number
}

export function ExportButton({ period, zone, year, quarter, month, week }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleExport(format: 'pdf' | 'excel') {
    setLoading(true)
    try {
      const params = new URLSearchParams({ format, period })
      if (zone && zone !== 'all') params.set('zone', zone)
      // Carry the selected period so the export matches the on-screen report
      if (year !== undefined) params.set('year', String(year))
      if (quarter !== undefined) params.set('quarter', String(quarter))
      if (month !== undefined) params.set('month', String(month))
      if (week !== undefined) params.set('week', String(week))

      const response = await fetch(`/api/export?${params.toString()}`)
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `argus-report-${period}-${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Report exported as ${format.toUpperCase()}`)
    } catch {
      toast.error('Failed to export report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading} className="gap-2 text-sm border-slate-200">
          <Download className="h-4 w-4" />
          {loading ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('pdf')} className="gap-2 text-sm">
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')} className="gap-2 text-sm">
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
