'use client'

import { CircleHelp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTour } from './TourProvider'

export function GuideButton() {
  const { currentTourAvailable, isRunning, startCurrentTour } = useTour()

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={startCurrentTour}
      disabled={!currentTourAvailable || isRunning}
      data-tour="guide-button"
      aria-label="Play the guide for this page"
      title="Play the guide for this page"
      className="h-9 gap-2 px-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40"
    >
      <CircleHelp className="h-4 w-4" aria-hidden="true" />
      <span className="hidden md:inline text-xs font-semibold tracking-wide">Guide</span>
    </Button>
  )
}
