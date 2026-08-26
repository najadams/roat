// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upsert: vi.fn(),
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}))

import { recordTourOutcome } from './tour.actions'

describe('recordTourOutcome', () => {
  beforeEach(() => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mocks.upsert.mockResolvedValue({ error: null })
    mocks.createClient.mockResolvedValue({
      auth: { getUser: mocks.getUser },
      from: vi.fn(() => ({ upsert: mocks.upsert })),
    })
  })

  it('rejects unknown tour IDs without opening a database client', async () => {
    await expect(recordTourOutcome('not-a-tour', 'completed')).resolves.toEqual({
      error: 'Unknown tutorial.',
    })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('requires an authenticated account', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    await expect(recordTourOutcome('dashboard', 'completed')).resolves.toEqual({
      error: 'Not authenticated.',
    })
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it('upserts the current server-owned tour version and outcome', async () => {
    const result = await recordTourOutcome('dashboard', 'skipped')
    expect(result).toMatchObject({
      success: true,
      progress: { tour_id: 'dashboard', tour_version: 1, outcome: 'skipped' },
    })
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        tour_id: 'dashboard',
        tour_version: 1,
        outcome: 'skipped',
      }),
      { onConflict: 'user_id,tour_id' }
    )
  })

  it('returns persistence errors without hiding them', async () => {
    mocks.upsert.mockResolvedValue({ error: { message: 'database unavailable' } })
    await expect(recordTourOutcome('dashboard', 'completed')).resolves.toEqual({
      error: 'database unavailable',
    })
  })
})
