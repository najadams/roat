import {
  startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter,
  startOfYear, endOfYear,
  startOfWeek, endOfWeek,
  format
} from 'date-fns'

export type ReportPeriod = 'weekly' | 'monthly' | 'quarterly' | 'annual'

export function getReportDateRange(period: ReportPeriod, date = new Date()) {
  switch (period) {
    case 'weekly':
      return { from: startOfWeek(date, { weekStartsOn: 1 }), to: endOfWeek(date, { weekStartsOn: 1 }) }
    case 'monthly':
      return { from: startOfMonth(date), to: endOfMonth(date) }
    case 'quarterly':
      return { from: startOfQuarter(date), to: endOfQuarter(date) }
    case 'annual':
      return { from: startOfYear(date), to: endOfYear(date) }
  }
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy')
}

export function formatDatetime(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy, HH:mm')
}

export function getCurrentQuarter(date = new Date()): number {
  return Math.floor(date.getMonth() / 3) + 1
}

export function getQuarterLabel(quarter: number, year: number): string {
  return `Q${quarter} ${year}`
}

/**
 * Returns the Friday of a given ISO week number and year.
 * ISO weeks start on Monday; Friday = Monday + 4 days.
 */
export function getISOWeekFriday(week: number, year: number): Date {
  const jan4 = new Date(year, 0, 4)
  const dow = jan4.getDay() || 7
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - (dow - 1) + (week - 1) * 7)
  monday.setDate(monday.getDate() + 4)
  return monday
}

/**
 * Returns the month (1–12) that an ISO week belongs to.
 * Assignment rule: the week belongs to the month containing its Friday.
 */
export function getMonthOfWeek(week: number, year: number): number {
  return getISOWeekFriday(week, year).getMonth() + 1
}

/**
 * Returns the number of ISO weeks in a given year (52 or 53).
 */
export function getISOWeekCount(year: number): number {
  const dec28 = new Date(year, 11, 28)
  const d = new Date(Date.UTC(dec28.getFullYear(), dec28.getMonth(), dec28.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/**
 * Returns ISO week numbers whose Friday falls in the given month.
 */
export function getWeeksInMonth(year: number, month: number): number[] {
  const count = getISOWeekCount(year)
  const weeks: number[] = []
  for (let w = 1; w <= count; w++) {
    if (getMonthOfWeek(w, year) === month) weeks.push(w)
  }
  return weeks
}

/**
 * Returns ISO week numbers whose Friday falls in the given quarter (1–4).
 */
export function getWeeksInQuarter(year: number, quarter: number): number[] {
  const firstMonth = (quarter - 1) * 3 + 1
  const months = [firstMonth, firstMonth + 1, firstMonth + 2]
  const count = getISOWeekCount(year)
  const weeks: number[] = []
  for (let w = 1; w <= count; w++) {
    if (months.includes(getMonthOfWeek(w, year))) weeks.push(w)
  }
  return weeks
}

/**
 * Returns all ISO week numbers in the given year.
 */
export function getWeeksInYear(year: number): number[] {
  const count = getISOWeekCount(year)
  return Array.from({ length: count }, (_, i) => i + 1)
}

/**
 * Returns a human-readable label for an ISO week.
 * Example: "Week 14 · 31 Mar – 4 Apr"
 */
export function getWeekLabel(week: number, year: number): string {
  const friday = getISOWeekFriday(week, year)
  const monday = new Date(friday)
  monday.setDate(friday.getDate() - 4)
  const fmt = (d: Date) => format(d, 'd MMM')
  return `Week ${week} · ${fmt(monday)} – ${fmt(friday)}`
}
