import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ pathname: '/dashboard' }))
const recordTourOutcome = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  usePathname: () => state.pathname,
}))

vi.mock('@/actions/tour.actions', () => ({ recordTourOutcome }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

vi.mock('react-joyride', async importOriginal => {
  const actual = await importOriginal<typeof import('react-joyride')>()
  return {
    ...actual,
    Joyride: ({ run, onEvent }: { run?: boolean; onEvent?: (event: Record<string, unknown>) => void }) =>
      run ? (
        <div data-testid="mock-tour">
          <button
            type="button"
            onClick={() => onEvent?.({
              type: actual.EVENTS.TOUR_END,
              status: actual.STATUS.FINISHED,
            })}
          >
            Complete mock tour
          </button>
          <button
            type="button"
            onClick={() => onEvent?.({
              type: actual.EVENTS.TOUR_END,
              status: actual.STATUS.SKIPPED,
            })}
          >
            Skip mock tour
          </button>
        </div>
      ) : null,
  }
})

import { TourProvider, useTour } from './TourProvider'

function GuideTrigger() {
  const { currentTourAvailable, isRunning, startCurrentTour } = useTour()
  return (
    <button type="button" onClick={startCurrentTour}>
      {currentTourAvailable ? 'Guide available' : 'No guide'} {isRunning ? 'running' : 'idle'}
    </button>
  )
}

function renderProvider({
  progress = [],
  progressAvailable = true,
}: {
  progress?: Array<{
    tour_id: 'dashboard'
    tour_version: number
    outcome: 'completed' | 'skipped'
    seen_at: string
  }>
  progressAvailable?: boolean
} = {}) {
  return render(
    <TourProvider
      role="zonal_officer"
      zonalOffice="kumasi"
      initialProgress={progress}
      progressAvailable={progressAvailable}
    >
      <GuideTrigger />
    </TourProvider>
  )
}

describe('TourProvider', () => {
  beforeEach(() => {
    state.pathname = '/dashboard'
    recordTourOutcome.mockResolvedValue({ success: true })
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('automatically starts an unseen page tour after hydration', async () => {
    renderProvider()
    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })
    expect(screen.getByTestId('mock-tour')).toBeInTheDocument()
  })

  it('does not auto-start when progress is current, but manual replay still works', async () => {
    renderProvider({
      progress: [{
        tour_id: 'dashboard',
        tour_version: 1,
        outcome: 'completed',
        seen_at: new Date().toISOString(),
      }],
    })

    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })
    expect(screen.queryByTestId('mock-tour')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /guide available/i }))
    await act(async () => {
      vi.runAllTimers()
      await Promise.resolve()
    })
    expect(screen.getByTestId('mock-tour')).toBeInTheDocument()
  })

  it('suppresses automatic playback when progress cannot be loaded', async () => {
    renderProvider({ progressAvailable: false })
    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })
    expect(screen.queryByTestId('mock-tour')).not.toBeInTheDocument()
  })

  it('persists completed and skipped outcomes', async () => {
    renderProvider()
    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Complete mock tour' }))
    await act(async () => Promise.resolve())
    expect(recordTourOutcome).toHaveBeenCalledWith('dashboard', 'completed')

    fireEvent.click(screen.getByRole('button', { name: /guide available/i }))
    await act(async () => {
      vi.runAllTimers()
      await Promise.resolve()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Skip mock tour' }))
    await act(async () => Promise.resolve())
    expect(recordTourOutcome).toHaveBeenCalledWith('dashboard', 'skipped')
  })
})
