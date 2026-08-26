import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TooltipRenderProps } from 'react-joyride'
import { TourTooltip } from './TourTooltip'

const buttonProps = (action: string) => ({
  'aria-label': action,
  'data-action': action,
  onClick: vi.fn(),
  role: 'button',
  title: action,
})

function renderTooltip() {
  const props = {
    backProps: buttonProps('back'),
    closeProps: buttonProps('close'),
    index: 5,
    isLastStep: false,
    primaryProps: buttonProps('next'),
    size: 8,
    skipProps: buttonProps('skip'),
    step: {
      content: 'The guide explanation remains scrollable while its controls stay visible.',
      title: 'Viewport-safe guide',
    },
    tooltipProps: {
      'aria-modal': true,
      role: 'alertdialog',
    },
  } as unknown as TooltipRenderProps

  return render(
    <div data-testid="floater">
      <TourTooltip {...props} />
    </div>
  )
}

describe('TourTooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 400 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('moves an overflowing tooltip fully back inside the viewport', () => {
    renderTooltip()
    const tooltip = screen.getByRole('alertdialog')

    vi.spyOn(tooltip, 'getBoundingClientRect').mockReturnValue({
      bottom: 940,
      height: 240,
      left: 20,
      right: 420,
      top: 700,
      width: 400,
      x: 20,
      y: 700,
      toJSON: () => ({}),
    })

    window.dispatchEvent(new Event('resize'))
    act(() => vi.runAllTimers())

    expect(tooltip).toHaveStyle({
      maxHeight: '776px',
      transform: 'translate3d(-32px, -152px, 0)',
    })
  })

  it('keeps navigation outside the scrollable explanation area', () => {
    renderTooltip()
    act(() => vi.runAllTimers())

    const tooltip = screen.getByRole('alertdialog')
    const scrollRegion = screen.getByText(/guide explanation/i).parentElement
    const nextButton = screen.getByRole('button', { name: 'next' })

    expect(scrollRegion).toHaveClass('overflow-y-auto')
    expect(scrollRegion).toHaveAttribute('tabindex', '0')
    expect(scrollRegion).not.toContainElement(nextButton)
    expect(nextButton.parentElement?.parentElement).toHaveClass('flex-none')
    expect(tooltip).toContainElement(screen.getByRole('button', { name: 'skip' }))
  })
})
