import { addDays, isWeekend } from 'date-fns'

export function addWorkingDays(startDate: Date, days: number): Date {
  let result = new Date(startDate)
  let added = 0
  while (added < days) {
    result = addDays(result, 1)
    if (!isWeekend(result)) {
      added++
    }
  }
  return result
}

export function isTaskDelayed(deadline: string | null): boolean {
  if (!deadline) return false
  return new Date() > new Date(deadline)
}

export function getDelayDays(deadline: string | null): number {
  if (!deadline || !isTaskDelayed(deadline)) return 0
  const diff = new Date().getTime() - new Date(deadline).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}
