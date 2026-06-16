import * as XLSX from 'xlsx'
import type { WeeklyReportData } from '@/types/weekly-report.types'

type Row = (string | number)[]

function officeSheet(r: WeeklyReportData): XLSX.WorkSheet {
  const aoa: Row[] = []
  aoa.push(['WEEKLY REPORT – RGOD REGIONAL OFFICES'])
  aoa.push([])
  aoa.push(['SECTION A: GENERAL INFORMATION'])
  aoa.push(['Zonal Office', r.zoneLabel])
  aoa.push(['Officer', r.officerName])
  aoa.push(['Week Ending', r.weekEnding])
  aoa.push([])
  aoa.push(['SECTION B: WEEKLY SUMMARY'])
  aoa.push(['Activity (Summary)', 'Target', 'Achieved', 'Variance (+/-)', 'Comments'])
  for (const c of r.categories) {
    aoa.push([c.label, c.target ?? '', c.achieved, c.variance ?? '', c.comments])
  }
  aoa.push(['Total', r.totals.target, r.totals.achieved, '', ''])
  aoa.push([])
  aoa.push(['SECTION C: KEY HIGHLIGHTS (Engagements, Achievements, Challenges)'])
  aoa.push(['Engagements & Achievements', r.narrative?.key_highlights ?? ''])
  aoa.push(['Challenges', r.narrative?.challenges ?? ''])
  aoa.push(['Narrative Summary', r.narrative?.narrative_summary ?? ''])
  aoa.push([])
  aoa.push(['SECTION D: DETAILED ACTIVITY TRACKER'])
  aoa.push(['Thematic Area', 'Activity Description', 'Date', 'Partner/Stakeholder', 'Outcome', 'Evidence', 'Comments'])
  for (const t of r.thematic) {
    aoa.push([t.label, t.activityDescriptions, t.dates, t.partners, t.outcomes, t.evidence, t.comments])
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = [{ wch: 32 }, { wch: 40 }, { wch: 16 }, { wch: 24 }, { wch: 30 }, { wch: 20 }, { wch: 30 }]
  return ws
}

function consolidationSheet(reports: WeeklyReportData[]): XLSX.WorkSheet {
  const categories = reports[0]?.categories ?? []
  const header: Row = ['Activity (Summary)', ...reports.map(r => r.zoneLabel), 'All Zones']
  const aoa: Row[] = [['CONSOLIDATED WEEKLY SUMMARY'], [], header]
  for (let i = 0; i < categories.length; i++) {
    const label = categories[i].label
    const perOffice = reports.map(r => r.categories[i]?.achieved ?? 0)
    aoa.push([label, ...perOffice, perOffice.reduce((a, b) => a + b, 0)])
  }
  const totals = reports.map(r => r.totals.achieved)
  aoa.push(['Total', ...totals, totals.reduce((a, b) => a + b, 0)])
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = [{ wch: 32 }, ...reports.map(() => ({ wch: 14 })), { wch: 12 }]
  return ws
}

/** Builds the multi-sheet weekly report workbook (one sheet per office + consolidation). */
export function buildWeeklyReportWorkbook(reports: WeeklyReportData[]): Buffer {
  const wb = XLSX.utils.book_new()
  for (const r of reports) {
    const name = `${r.zoneLabel.toUpperCase()} OFFICE`.slice(0, 31)
    XLSX.utils.book_append_sheet(wb, officeSheet(r), name)
  }
  if (reports.length > 1) {
    XLSX.utils.book_append_sheet(wb, consolidationSheet(reports), 'Consolidation')
  }
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}
