import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  TOUR_DEFINITIONS,
  buildTourSteps,
  getTourForPath,
  shouldAutoStartTour,
} from './registry'
import type { TourContext, TourProgress } from './types'

const officer: TourContext = {
  role: 'zonal_officer',
  zonalOffice: 'kumasi',
  isMobile: false,
}

const admin: TourContext = {
  role: 'regional_admin',
  zonalOffice: null,
  isMobile: false,
}

const viewer: TourContext = {
  role: 'viewer',
  zonalOffice: null,
  isMobile: true,
}

function readSourceTree(directory: string): string {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap(entry => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return readSourceTree(path)
      if (!entry.name.endsWith('.tsx') && !entry.name.endsWith('.ts')) return ''
      return readFileSync(path, 'utf8')
    })
    .join('\n')
}

describe('tour registry', () => {
  it.each([
    ['/dashboard', 'dashboard'],
    ['/module-a/activities', 'activities'],
    ['/module-a/new', 'activity-create'],
    ['/module-a/activities/44f149d5-9766-442c-b19e-a50855ba7b65', 'activity-edit'],
    ['/module-a/reports', 'reports'],
    ['/module-a/accra-reports', 'accra-reports'],
    ['/module-a/weekly-report', 'weekly-report'],
    ['/module-b/webinars', 'webinars'],
    ['/module-b/new', 'webinar-create'],
    ['/module-b/webinars/44f149d5-9766-442c-b19e-a50855ba7b65', 'webinar-detail'],
    ['/admin/users', 'admin-users'],
    ['/admin/targets', 'admin-targets'],
    ['/admin/performance', 'admin-performance'],
    ['/admin/settings', 'admin-settings'],
    ['/profile', 'profile'],
  ])('maps %s to %s', (path, id) => {
    expect(getTourForPath(path)?.id).toBe(id)
  })

  it('does not treat nested or unknown paths as a known tour', () => {
    expect(getTourForPath('/module-a/activities/id/extra')).toBeNull()
    expect(getTourForPath('/login')).toBeNull()
  })

  it('has unique, versioned definitions with useful step sets for every role', () => {
    const ids = TOUR_DEFINITIONS.map(definition => definition.id)
    expect(new Set(ids).size).toBe(ids.length)

    for (const definition of TOUR_DEFINITIONS) {
      expect(definition.version).toBeGreaterThan(0)
      for (const context of [officer, admin, viewer]) {
        const steps = buildTourSteps(definition, context)
        expect(steps.length).toBeGreaterThanOrEqual(4)
        expect(steps.length).toBeLessThanOrEqual(14)
        expect(steps.every(step => typeof step.target === 'string')).toBe(true)
      }
    }
  })

  it('uses mobile navigation and role-specific controls only when applicable', () => {
    const dashboard = getTourForPath('/dashboard')!
    const mobileTargets = buildTourSteps(dashboard, viewer).map(step => step.target)
    const desktopTargets = buildTourSteps(dashboard, admin).map(step => step.target)
    expect(mobileTargets).toContain('[data-tour="mobile-menu"]')
    expect(mobileTargets).not.toContain('[data-tour="sidebar"]')
    expect(desktopTargets).toContain('[data-tour="sidebar"]')
    expect(desktopTargets).toContain('[data-tour="zone-analysis"]')

    const activities = getTourForPath('/module-a/activities')!
    expect(buildTourSteps(activities, viewer).map(step => step.target))
      .not.toContain('[data-tour="primary-action"]')
    expect(buildTourSteps(activities, officer).map(step => step.target))
      .toContain('[data-tour="primary-action"]')
  })

  it('auto-starts only for unseen or older versions when progress is available', () => {
    const definition = getTourForPath('/dashboard')!
    const current: TourProgress = {
      tour_id: definition.id,
      tour_version: definition.version,
      outcome: 'skipped',
      seen_at: new Date().toISOString(),
    }

    expect(shouldAutoStartTour(definition, [], true)).toBe(true)
    expect(shouldAutoStartTour(definition, [current], true)).toBe(false)
    expect(shouldAutoStartTour(definition, [{ ...current, tour_version: 0 }], true)).toBe(true)
    expect(shouldAutoStartTour(definition, [], false)).toBe(false)
    expect(shouldAutoStartTour(null, [], true)).toBe(false)
  })

  it('has a source anchor for every selector used by every role variant', () => {
    const source = `${readSourceTree(join(process.cwd(), 'app'))}\n${readSourceTree(join(process.cwd(), 'components'))}`
    const selectors = new Set(
      TOUR_DEFINITIONS.flatMap(definition =>
        [officer, admin, viewer].flatMap(context =>
          buildTourSteps(definition, context).map(step => String(step.target))
        )
      )
    )

    for (const selector of selectors) {
      if (selector === 'body') continue
      const match = selector.match(/^\[data-tour="(.+)"\]$/)
      expect(match, `Unexpected selector: ${selector}`).not.toBeNull()
      expect(source).toContain(`data-tour="${match?.[1]}"`)
    }
  })
})
