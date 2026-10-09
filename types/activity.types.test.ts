import { describe, expect, it } from 'vitest'
import {
  REGIONAL_ACTIVITY_TYPES,
  REGIONAL_ACTIVITY_TYPE_LABELS,
} from '@/types/activity.types'
import {
  THEMATIC_AREAS,
  WEEKLY_REPORT_CATEGORIES,
} from '@/types/weekly-report.types'

describe('Quota and TTA activity classification', () => {
  it('exposes Quota and TTA as distinct regional activity types', () => {
    expect(REGIONAL_ACTIVITY_TYPES).toContain('quota')
    expect(REGIONAL_ACTIVITY_TYPES).toContain('technology_transfer_agreement')
    expect(REGIONAL_ACTIVITY_TYPE_LABELS.quota).toBe('Quota')
    expect(REGIONAL_ACTIVITY_TYPE_LABELS.technology_transfer_agreement)
      .toBe('Technology Transfer Agreement (TTA)')
  })

  it('reports Quota and TTA in separate weekly summary categories', () => {
    const quotaCategory = WEEKLY_REPORT_CATEGORIES.find(category => category.key === 'quota')
    const ttaCategory = WEEKLY_REPORT_CATEGORIES.find(category => category.key === 'tta')

    expect(quotaCategory?.types).toEqual(['quota'])
    expect(ttaCategory?.types).toEqual(['technology_transfer_agreement'])
  })

  it('reports Quota, TTA, and check-up calls in separate thematic areas', () => {
    expect(THEMATIC_AREAS.find(area => area.key === 'quota')?.types).toEqual(['quota'])
    expect(THEMATIC_AREAS.find(area => area.key === 'tta')?.types)
      .toEqual(['technology_transfer_agreement'])
    expect(THEMATIC_AREAS.find(area => area.key === 'checkup_calls')?.types)
      .toEqual(['checkup_call'])
  })
})
