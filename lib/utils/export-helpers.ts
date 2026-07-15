import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  ACCRA_STORAGE_ACTIVITY_TYPE,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_STATUS_LABELS,
  REGIONAL_ACTIVITY_TYPE_LABELS,
  ZONAL_OFFICE_LABELS,
} from '@/types/activity.types'
import type { Activity } from '@/types/activity.types'

export interface AccraActivityExportRow extends Activity {
  created_by_name?: string | null
  created_by_email?: string | null
}

function formatDateStr(date: string) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function exportToExcel(activities: Activity[]): Buffer {
  const rows = activities.map(a => ({
    Date: formatDateStr(a.date),
    'Activity Type': ACTIVITY_TYPE_LABELS[a.activity_type] ?? a.activity_type,
    'Activity Description': a.zonal_office === 'accra' ? a.detail ?? '' : '',
    Zone: ZONAL_OFFICE_LABELS[a.zonal_office] ?? a.zonal_office,
    'Company / Organisation': a.company_name,
    Location: a.location,
    Telephone: a.telephone ?? '',
    Email: a.email ?? '',
    Sector: a.sector ?? '',
    Detail: a.detail ?? '',
    'Action Required': a.action_required ?? '',
    'Investment Value': a.investment_amount ?? '',
    Currency: a.investment_currency ?? '',
    'Jobs Created': a.jobs_created ?? '',
    Status: a.status.replace(/_/g, ' '),
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Activities')

  // Auto-width columns
  const colWidths = Object.keys(rows[0] ?? {}).map(key => ({
    wch: Math.max(key.length, ...rows.map(r => String(r[key as keyof typeof r] ?? '').length))
  }))
  ws['!cols'] = colWidths

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
}

export function exportToPDF(
  activities: Activity[],
  period: string,
  zone?: string
): Buffer {
  const doc = new jsPDF({ orientation: 'landscape' })
  const isAccraReport = zone === 'accra'
  const summaryLabels = isAccraReport
    ? { [ACCRA_STORAGE_ACTIVITY_TYPE]: ACTIVITY_TYPE_LABELS[ACCRA_STORAGE_ACTIVITY_TYPE] }
    : REGIONAL_ACTIVITY_TYPE_LABELS

  // Header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(isAccraReport ? 'ROAT — Accra Activity Report' : 'ROAT — Activity Report', 14, 20)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Period: ${period.charAt(0).toUpperCase() + period.slice(1)}`, 14, 28)
  if (zone && zone !== 'all') {
    doc.text(`Zone: ${ZONAL_OFFICE_LABELS[zone] ?? zone}`, 14, 34)
  }
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, zone ? 40 : 34)

  const headerEndY = zone ? 40 : 34

  // Summary table (compact, left-aligned)
  const summaryRows: (string | number)[][] = Object.entries(summaryLabels).map(([key, label]) => {
    const count = activities.filter(a => a.activity_type === key).length
    const share = activities.length > 0 ? Math.round((count / activities.length) * 100) : 0
    return [label, count, `${share}%`]
  }).sort((a, b) => (b[1] as number) - (a[1] as number))
  summaryRows.push(['Total', activities.length, '100%'])

  autoTable(doc, {
    startY: headerEndY + 8,
    head: [['Activity Type', 'Count', 'Share']],
    body: summaryRows,
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    margin: { left: 14, right: 14 },
    tableWidth: 120,
  })

  const summaryEndY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  // Main data table with all 11 columns
  autoTable(doc, {
    startY: summaryEndY + 8,
    head: [['Date', 'Activity Type', 'Description', 'Zone', 'Company', 'Location', 'Tel', 'Email', 'Sector', 'Detail', 'Action Required', 'Investment', 'Cur', 'Jobs', 'Status']],
    body: activities.map(a => [
      formatDateStr(a.date),
      ACTIVITY_TYPE_LABELS[a.activity_type] ?? a.activity_type,
      a.zonal_office === 'accra' ? a.detail ?? '' : '',
      ZONAL_OFFICE_LABELS[a.zonal_office] ?? a.zonal_office,
      a.company_name,
      a.location,
      a.telephone ?? '',
      a.email ?? '',
      a.sector ?? '',
      a.detail ?? '',
      a.action_required ?? '',
      a.investment_amount != null ? a.investment_amount.toLocaleString('en-GB') : '',
      a.investment_currency ?? '',
      a.jobs_created != null ? String(a.jobs_created) : '',
      a.status.replace(/_/g, ' '),
    ]),
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 7 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 16 },   // Date
      1: { cellWidth: 28 },   // Activity Type
      2: { cellWidth: 26 },   // Description
      3: { cellWidth: 14 },   // Zone
      4: { cellWidth: 24 },   // Company
      5: { cellWidth: 18 },   // Location
      6: { cellWidth: 16 },   // Tel
      7: { cellWidth: 24 },   // Email
      8: { cellWidth: 13 },   // Sector
      9: { cellWidth: 20 },   // Detail
      10: { cellWidth: 20 },  // Action Required
      11: { cellWidth: 16, halign: 'right' }, // Investment
      12: { cellWidth: 9 },   // Currency
      13: { cellWidth: 9, halign: 'right' }, // Jobs
      14: { cellWidth: 13 },  // Status
    },
  })

  return Buffer.from(doc.output('arraybuffer'))
}

function getPeriodLabel(period: string, from?: string, to?: string) {
  const periodName = period.charAt(0).toUpperCase() + period.slice(1)
  if (!from || !to) return periodName
  return `${periodName}: ${formatDateStr(from)} - ${formatDateStr(to)}`
}

function drawMetric(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string | number,
  note?: string
) {
  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(x, y, width, 20, 2, 2, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  doc.text(String(value), x + 4, y + 8)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  doc.text(label.toUpperCase(), x + 4, y + 14)
  if (note) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.text(note, x + 4, y + 18)
  }
}

function addAccraReportFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text('ROAT - Accra Activity Report', 14, 200)
    doc.text(`Page ${i} of ${pageCount}`, 270, 200, { align: 'right' })
  }
}

export function exportAccraReportToPDF(
  activities: AccraActivityExportRow[],
  period: string,
  from?: string,
  to?: string
): Buffer {
  const doc = new jsPDF({ orientation: 'landscape' })
  const generatedAt = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const completed = activities.filter(a => a.status === 'completed').length
  const inProgress = activities.filter(a => a.status === 'in_progress').length
  const pending = activities.filter(a => a.status === 'pending').length
  const users = new Set(activities.map(a => a.created_by)).size

  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, 297, 34, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('ROAT - Accra Activity Report', 14, 17)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(getPeriodLabel(period, from, to), 14, 25)
  doc.text(`Generated: ${generatedAt}`, 270, 17, { align: 'right' })
  doc.text('Narrative activity records grouped by officer', 270, 25, { align: 'right' })

  drawMetric(doc, 14, 42, 50, 'Total Records', activities.length)
  drawMetric(doc, 69, 42, 50, 'Officers', users)
  drawMetric(doc, 124, 42, 50, 'Completed', completed)
  drawMetric(doc, 179, 42, 50, 'In Progress', inProgress)
  drawMetric(doc, 234, 42, 50, 'Pending', pending)

  const statusRows = Object.entries(ACTIVITY_STATUS_LABELS)
    .map(([status, label]) => {
      const count = activities.filter(a => a.status === status).length
      const share = activities.length > 0 ? Math.round((count / activities.length) * 100) : 0
      return [label, count, `${share}%`]
    })
    .filter(([, count]) => Number(count) > 0)

  autoTable(doc, {
    startY: 72,
    head: [['Status', 'Records', 'Share']],
    body: statusRows.length > 0 ? statusRows : [['No records', 0, '0%']],
    theme: 'grid',
    tableWidth: 88,
    margin: { left: 14 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
    },
  })

  const byUser = activities.reduce((acc, activity) => {
    const key = activity.created_by
    if (!acc[key]) {
      acc[key] = {
        name: activity.created_by_name || activity.created_by_email || 'Unknown User',
        email: activity.created_by_email ?? '',
        rows: [],
      }
    }
    acc[key].rows.push(activity)
    return acc
  }, {} as Record<string, { name: string; email: string; rows: AccraActivityExportRow[] }>)

  const userSummaries = Object.values(byUser)
    .sort((a, b) => b.rows.length - a.rows.length || a.name.localeCompare(b.name))
    .map(group => [
      group.name,
      group.email,
      group.rows.length,
      group.rows.filter(row => row.status === 'completed').length,
      group.rows.filter(row => row.status === 'in_progress').length,
      group.rows.filter(row => row.status === 'pending').length,
    ])

  autoTable(doc, {
    startY: 72,
    head: [['Officer', 'Email', 'Records', 'Completed', 'In Progress', 'Pending']],
    body: userSummaries.length > 0 ? userSummaries : [['No recorded users', '', 0, 0, 0, 0]],
    theme: 'grid',
    margin: { left: 110, right: 14 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 62 },
      2: { halign: 'right', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'right', cellWidth: 18 },
    },
  })

  let cursorY = Math.max(
    (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12,
    120
  )

  Object.values(byUser)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(group => {
      if (cursorY > 164) {
        doc.addPage()
        cursorY = 18
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(15, 23, 42)
      doc.text(group.name, 14, cursorY)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      const emailLabel = group.email ? ` - ${group.email}` : ''
      doc.text(`${group.rows.length} recorded activit${group.rows.length === 1 ? 'y' : 'ies'}${emailLabel}`, 14, cursorY + 6)

      autoTable(doc, {
        startY: cursorY + 11,
        head: [['Date', 'Status', 'Activity Description', 'Recorded']],
        body: group.rows
          .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
          .map(activity => [
            formatDateStr(activity.date),
            ACTIVITY_STATUS_LABELS[activity.status] ?? activity.status.replace(/_/g, ' '),
            activity.detail ?? '',
            new Date(activity.created_at).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          ]),
        theme: 'grid',
        margin: { left: 14, right: 14 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 2.6, valign: 'top' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 24 },
          2: { cellWidth: 190 },
          3: { cellWidth: 31 },
        },
      })

      cursorY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12
    })

  if (activities.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text('No Accra activities were recorded for this period.', 14, cursorY)
  }

  addAccraReportFooter(doc)
  return Buffer.from(doc.output('arraybuffer'))
}
