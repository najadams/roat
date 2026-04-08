import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ACTIVITY_TYPE_LABELS, ZONAL_OFFICE_LABELS } from '@/types/activity.types'
import type { Activity } from '@/types/activity.types'

function formatDateStr(date: string) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function exportToExcel(activities: Activity[], filename = 'argus-report'): Buffer {
  const rows = activities.map(a => ({
    Date: formatDateStr(a.date),
    'Activity Type': ACTIVITY_TYPE_LABELS[a.activity_type] ?? a.activity_type,
    Zone: ZONAL_OFFICE_LABELS[a.zonal_office] ?? a.zonal_office,
    'Company / Organisation': a.company_name,
    Location: a.location,
    Telephone: a.telephone ?? '',
    Email: a.email ?? '',
    Sector: a.sector ?? '',
    Detail: a.detail ?? '',
    'Action Required': a.action_required ?? '',
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

  // Header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('ROAT — Activity Report', 14, 20)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Period: ${period.charAt(0).toUpperCase() + period.slice(1)}`, 14, 28)
  if (zone && zone !== 'all') {
    doc.text(`Zone: ${ZONAL_OFFICE_LABELS[zone] ?? zone}`, 14, 34)
  }
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, zone ? 40 : 34)

  const headerEndY = zone ? 40 : 34

  // Summary table (compact, left-aligned)
  const summaryRows: (string | number)[][] = Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => {
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

  const summaryEndY = (doc as any).lastAutoTable.finalY

  // Main data table with all 11 columns
  autoTable(doc, {
    startY: summaryEndY + 8,
    head: [['Date', 'Activity Type', 'Zone', 'Company', 'Location', 'Tel', 'Email', 'Sector', 'Detail', 'Action Required', 'Status']],
    body: activities.map(a => [
      formatDateStr(a.date),
      ACTIVITY_TYPE_LABELS[a.activity_type] ?? a.activity_type,
      ZONAL_OFFICE_LABELS[a.zonal_office] ?? a.zonal_office,
      a.company_name,
      a.location,
      a.telephone ?? '',
      a.email ?? '',
      a.sector ?? '',
      a.detail ?? '',
      a.action_required ?? '',
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
      0: { cellWidth: 18 },
      1: { cellWidth: 32 },
      2: { cellWidth: 18 },
      3: { cellWidth: 28 },
      4: { cellWidth: 22 },
      5: { cellWidth: 20 },
      6: { cellWidth: 28 },
      7: { cellWidth: 16 },
      8: { cellWidth: 28 },
      9: { cellWidth: 28 },
      10: { cellWidth: 16 },
    },
  })

  return Buffer.from(doc.output('arraybuffer'))
}
