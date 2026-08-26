'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import {
  ACTIONS,
  EVENTS,
  Joyride,
  ORIGIN,
  STATUS,
  type EventData,
} from 'react-joyride'
import { recordTourOutcome } from '@/actions/tour.actions'
import {
  buildTourSteps,
  getTourForPath,
  shouldAutoStartTour,
} from '@/lib/tours/registry'
import type {
  TourDefinition,
  TourOutcome,
  TourProgress,
} from '@/lib/tours/types'
import type { UserRole, ZonalOffice } from '@/types/database.types'
import { TourTooltip } from './TourTooltip'

interface TourContextValue {
  currentTourAvailable: boolean
  isRunning: boolean
  startCurrentTour: () => void
}

const TourContext = createContext<TourContextValue | null>(null)

interface TourProviderProps {
  children: React.ReactNode
  role: UserRole
  zonalOffice: ZonalOffice | null
  initialProgress: TourProgress[]
  progressAvailable: boolean
}

export function TourProvider({
  children,
  role,
  zonalOffice,
  initialProgress,
  progressAvailable,
}: TourProviderProps) {
  const pathname = usePathname()
  const [progress, setProgress] = useState(initialProgress)
  const [isMobile, setIsMobile] = useState(false)
  const [viewportReady, setViewportReady] = useState(false)
  const [run, setRun] = useState(false)
  const [runKey, setRunKey] = useState(0)
  const [activePathname, setActivePathname] = useState<string | null>(null)
  const autoStarted = useRef(new Set<string>())
  const activeDefinition = useRef<TourDefinition | null>(null)
  const finishing = useRef(false)

  const definition = useMemo(() => getTourForPath(pathname), [pathname])
  const steps = useMemo(
    () => definition
      ? buildTourSteps(definition, { role, zonalOffice, isMobile })
      : [],
    [definition, isMobile, role, zonalOffice]
  )

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)')
    const update = () => {
      setIsMobile(media.matches)
      setViewportReady(true)
    }
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const persistOutcome = useCallback(async (
    completedDefinition: TourDefinition,
    outcome: TourOutcome
  ) => {
    const optimistic: TourProgress = {
      tour_id: completedDefinition.id,
      tour_version: completedDefinition.version,
      outcome,
      seen_at: new Date().toISOString(),
    }

    setProgress(current => [
      ...current.filter(item => item.tour_id !== completedDefinition.id),
      optimistic,
    ])

    const result = await recordTourOutcome(completedDefinition.id, outcome)
    if (result.error) {
      toast.error('Your guide progress could not be saved. You can still replay it from this page.')
    }
  }, [])

  const finishTour = useCallback((outcome: TourOutcome) => {
    if (finishing.current) return
    const completedDefinition = activeDefinition.current
    if (!completedDefinition) return

    finishing.current = true
    setRun(false)
    void persistOutcome(completedDefinition, outcome).finally(() => {
      finishing.current = false
      activeDefinition.current = null
    })
  }, [persistOutcome])

  const startTour = useCallback((nextDefinition: TourDefinition) => {
    activeDefinition.current = nextDefinition
    setActivePathname(pathname)
    finishing.current = false
    setRun(false)
    setRunKey(current => current + 1)
    window.requestAnimationFrame(() => setRun(true))
  }, [pathname])

  const startCurrentTour = useCallback(() => {
    if (!definition || steps.length === 0) return
    startTour(definition)
  }, [definition, startTour, steps.length])

  const isCurrentTourRunning = run && activePathname === pathname

  useEffect(() => {
    if (!viewportReady || isCurrentTourRunning || !definition || steps.length === 0) return
    if (!shouldAutoStartTour(definition, progress, progressAvailable)) return

    const key = `${definition.id}:${definition.version}`
    if (autoStarted.current.has(key)) return
    autoStarted.current.add(key)

    const timeout = window.setTimeout(() => startTour(definition), 450)
    return () => window.clearTimeout(timeout)
  }, [definition, isCurrentTourRunning, progress, progressAvailable, startTour, steps.length, viewportReady])

  const handleEvent = useCallback((event: EventData) => {
    if (
      event.type === EVENTS.STEP_AFTER &&
      event.action === ACTIONS.CLOSE &&
      event.origin === ORIGIN.KEYBOARD
    ) {
      finishTour('skipped')
      return
    }

    if (event.type !== EVENTS.TOUR_END) return
    if (event.status === STATUS.FINISHED) finishTour('completed')
    if (event.status === STATUS.SKIPPED) finishTour('skipped')
  }, [finishTour])

  const value = useMemo<TourContextValue>(() => ({
    currentTourAvailable: Boolean(definition && steps.length > 0),
    isRunning: isCurrentTourRunning,
    startCurrentTour,
  }), [definition, isCurrentTourRunning, startCurrentTour, steps.length])

  return (
    <TourContext.Provider value={value}>
      {children}
      {definition && steps.length > 0 && (
        <Joyride
          key={`${definition.id}-${runKey}`}
          continuous
          run={isCurrentTourRunning}
          scrollToFirstStep
          steps={steps}
          tooltipComponent={TourTooltip}
          floatingOptions={{
            hideArrow: true,
            strategy: 'fixed',
            shiftOptions: {
              crossAxis: true,
              padding: 12,
              rootBoundary: 'viewport',
            },
          }}
          onEvent={handleEvent}
          locale={{
            back: 'Back',
            close: 'Close and skip guide',
            last: 'Finish',
            next: 'Next',
            skip: 'Skip tour',
          }}
          options={{
            blockTargetInteraction: true,
            buttons: ['back', 'close', 'primary', 'skip'],
            closeButtonAction: 'skip',
            dismissKeyAction: 'close',
            overlayClickAction: false,
            overlayColor: 'rgba(15, 23, 42, 0.68)',
            primaryColor: '#0f172a',
            scrollDuration: 420,
            scrollOffset: 88,
            showProgress: true,
            skipBeacon: true,
            spotlightPadding: 8,
            spotlightRadius: 12,
            targetWaitTimeout: 2500,
            width: 'min(400px, calc(100vw - 2rem))',
            zIndex: 1000,
          }}
          styles={{
            floater: { filter: 'none' },
            spotlight: { stroke: 'rgba(255,255,255,0.75)', strokeWidth: 1 },
          }}
        />
      )}
    </TourContext.Provider>
  )
}

export function useTour() {
  const context = useContext(TourContext)
  if (!context) throw new Error('useTour must be used within TourProvider')
  return context
}
