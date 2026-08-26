'use client'

import { useLayoutEffect, useRef } from 'react'
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { TooltipRenderProps } from 'react-joyride'

const VIEWPORT_PADDING = 12

/**
 * Floating UI positions against the target's scroll container. A very tall
 * target can leave less room than the tooltip needs on every side, so keep the
 * rendered panel inside the browser viewport as a final safety boundary.
 */
function useViewportConstrainedTooltip() {
  const tooltipRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const tooltip = tooltipRef.current
    const floater = tooltip?.parentElement
    if (!tooltip || !floater) return

    let animationFrame = 0

    const constrainToViewport = () => {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = window.requestAnimationFrame(() => {
        tooltip.style.maxHeight = `${Math.max(0, window.innerHeight - VIEWPORT_PADDING * 2)}px`
        tooltip.style.transform = 'translate3d(0, 0, 0)'

        const rect = tooltip.getBoundingClientRect()
        let shiftX = 0
        let shiftY = 0

        if (rect.left < VIEWPORT_PADDING) {
          shiftX = VIEWPORT_PADDING - rect.left
        } else if (rect.right > window.innerWidth - VIEWPORT_PADDING) {
          shiftX = window.innerWidth - VIEWPORT_PADDING - rect.right
        }

        if (rect.top < VIEWPORT_PADDING) {
          shiftY = VIEWPORT_PADDING - rect.top
        } else if (rect.bottom > window.innerHeight - VIEWPORT_PADDING) {
          shiftY = window.innerHeight - VIEWPORT_PADDING - rect.bottom
        }

        tooltip.style.transform = `translate3d(${shiftX}px, ${shiftY}px, 0)`
      })
    }

    constrainToViewport()

    const resizeObserver = new ResizeObserver(constrainToViewport)
    resizeObserver.observe(tooltip)

    const positionObserver = new MutationObserver(constrainToViewport)
    positionObserver.observe(floater, {
      attributes: true,
      attributeFilter: ['style'],
    })

    window.addEventListener('resize', constrainToViewport)
    window.addEventListener('scroll', constrainToViewport, true)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      positionObserver.disconnect()
      window.removeEventListener('resize', constrainToViewport)
      window.removeEventListener('scroll', constrainToViewport, true)
    }
  }, [])

  return tooltipRef
}

export function TourTooltip({
  backProps,
  closeProps,
  index,
  isLastStep,
  primaryProps,
  size,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  const tooltipRef = useViewportConstrainedTooltip()

  return (
    <div
      {...tooltipProps}
      ref={tooltipRef}
      data-tour-tooltip
      className="flex w-[min(400px,calc(100vw-1.5rem))] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-950/20 will-change-transform"
    >
      <div className="flex flex-none items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Step {index + 1} of {size}
        </span>
        <button
          {...closeProps}
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Close and skip this guide</span>
        </button>
      </div>

      <div
        className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5"
        tabIndex={0}
      >
        {step.title && (
          <h2 className="text-base font-semibold tracking-tight text-slate-950">
            {step.title}
          </h2>
        )}
        <div className="mt-2 text-sm leading-6 text-slate-600">
          {step.content}
        </div>
      </div>

      <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5">
        <button
          {...skipProps}
          type="button"
          className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          Skip tour
        </button>

        <div className="flex items-center gap-2">
          {index > 0 && (
            <button
              {...backProps}
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back
            </button>
          )}
          <button
            {...primaryProps}
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-950 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            {isLastStep ? (
              <>
                Finish
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
