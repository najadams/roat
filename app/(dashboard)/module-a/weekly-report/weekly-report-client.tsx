'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ZoneSelector } from '@/components/shared/ZoneSelector'
import { upsertWeeklyReport, upsertWeeklyCategoryTargets } from '@/actions/weekly-report.actions'
import { formatDate } from '@/lib/utils/date-helpers'
import type { WeeklyReportData } from '@/types/weekly-report.types'

interface Props {
  data: WeeklyReportData
  canEdit: boolean
  canPickZone: boolean
}

export function WeeklyReportClient({ data, canEdit, canPickZone }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [highlights, setHighlights] = useState(data.narrative?.key_highlights ?? '')
  const [challenges, setChallenges] = useState(data.narrative?.challenges ?? '')
  const [summary, setSummary] = useState(data.narrative?.narrative_summary ?? '')

  const [savingTargets, setSavingTargets] = useState(false)
  const [targets, setTargets] = useState<Record<string, string>>(
    () => Object.fromEntries(data.categories.map(c => [c.key, c.target?.toString() ?? '']))
  )

  async function saveTargets() {
    setSavingTargets(true)
    const result = await upsertWeeklyCategoryTargets(
      data.zonalOffice,
      data.weekEnding,
      data.categories.map(c => ({
        category_key: c.key,
        target_count: parseInt(targets[c.key] ?? '') || 0,
      }))
    )
    setSavingTargets(false)
    if ('error' in result) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to save targets')
    } else {
      toast.success('Weekly targets saved')
      router.refresh()
    }
  }

  function navigate(next: { zone?: string; week?: string }) {
    const p = new URLSearchParams()
    p.set('zone', next.zone ?? data.zonalOffice)
    p.set('week', next.week ?? data.weekEnding)
    router.push(`/module-a/weekly-report?${p.toString()}`)
  }

  async function saveNarrative() {
    setSaving(true)
    const result = await upsertWeeklyReport({
      zonal_office: data.zonalOffice,
      week_ending: data.weekEnding,
      key_highlights: highlights,
      challenges,
      narrative_summary: summary,
    })
    setSaving(false)
    if ('error' in result) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to save')
    } else {
      toast.success('Weekly narrative saved')
      router.refresh()
    }
  }

  const exportUrl = `/api/export/weekly-report?zone=${data.zonalOffice}&week=${data.weekEnding}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Weekly Report</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data.zoneLabel} · week ending {formatDate(data.weekEnding)}
          </p>
        </div>
        <div className="flex items-end gap-3">
          {canPickZone && (
            <div className="w-40">
              <ZoneSelector
                value={data.zonalOffice}
                onChange={z => navigate({ zone: z })}
                regionalOnly
              />
            </div>
          )}
          <Input
            type="date"
            value={data.weekEnding}
            onChange={e => navigate({ week: e.target.value })}
            className="h-10 w-40 text-sm border-slate-200"
          />
          <Button asChild variant="outline" size="sm" className="border-slate-200">
            <a href={exportUrl}>Export Excel</a>
          </Button>
        </div>
      </div>

      {/* Section A */}
      <Card className="border-slate-100 shadow-sm">
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
          <Field label="Zonal Office" value={data.zoneLabel} />
          <Field label="Officer" value={data.officerName || '—'} />
          <Field label="Week" value={`${formatDate(data.weekRange.from)} – ${formatDate(data.weekRange.to)}`} />
        </CardContent>
      </Card>

      {/* Section B */}
      <Card className="border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="pb-2 pt-5 px-5 flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">
            Section B — Weekly Summary
          </CardTitle>
          {canEdit && (
            <Button onClick={saveTargets} disabled={savingTargets} variant="outline" size="sm" className="border-slate-200">
              {savingTargets ? 'Saving…' : 'Save Targets'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-100 text-left">
                  {['Activity', 'Target', 'Achieved', 'Variance', 'Comments'].map(h => (
                    <th key={h} className="px-5 py-2.5 text-[10px] font-semibold tracking-widest uppercase text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.categories.map(c => (
                  <tr key={c.key} className="border-b border-slate-50 align-top">
                    <td className="px-5 py-3 font-medium text-slate-700">{c.label}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {canEdit ? (
                        <Input
                          type="number"
                          min="0"
                          value={targets[c.key] ?? ''}
                          onChange={e => setTargets(prev => ({ ...prev, [c.key]: e.target.value }))}
                          placeholder="—"
                          className="h-8 w-20 text-sm border-slate-200"
                        />
                      ) : (
                        c.target ?? '—'
                      )}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900">{c.achieved}</td>
                    <td className={`px-5 py-3 font-medium ${c.variance === null ? 'text-slate-400' : c.variance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {c.variance === null ? '—' : c.variance > 0 ? `+${c.variance}` : c.variance}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 whitespace-pre-line max-w-md">{c.comments || '—'}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                  <td className="px-5 py-3 text-slate-900">Total</td>
                  <td className="px-5 py-3 text-slate-700">{data.totals.target}</td>
                  <td className="px-5 py-3 text-slate-900">{data.totals.achieved}</td>
                  <td className="px-5 py-3" colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Section C */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">
            Section C — Key Highlights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5">
          <NarrativeField label="Engagements & Achievements" value={highlights} onChange={setHighlights} disabled={!canEdit} rows={5} />
          <NarrativeField label="Challenges" value={challenges} onChange={setChallenges} disabled={!canEdit} rows={3} />
          <NarrativeField label="Narrative Summary" value={summary} onChange={setSummary} disabled={!canEdit} rows={4} />
          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={saveNarrative} disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white text-sm">
                {saving ? 'Saving…' : 'Save Narrative'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section D */}
      <Card className="border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">
            Section D — Detailed Activity Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-100 text-left">
                  {['Thematic Area', 'Activities', 'Dates', 'Partner/Stakeholder', 'Outcome', 'Evidence', 'Comments'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[10px] font-semibold tracking-widest uppercase text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.thematic.map(t => (
                  <tr key={t.key} className="border-b border-slate-50 align-top">
                    <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{t.label}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-pre-line max-w-xs">{t.activityDescriptions || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{t.dates || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{t.partners || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-pre-line">{t.outcomes || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{t.evidence || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-pre-line">{t.comments || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-widest uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  )
}

function NarrativeField({ label, value, onChange, disabled, rows }: {
  label: string; value: string; onChange: (v: string) => void; disabled: boolean; rows: number
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        className="text-sm border-slate-200 resize-none disabled:opacity-70"
      />
    </div>
  )
}
