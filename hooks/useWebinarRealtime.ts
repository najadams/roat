'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WebinarWithTasks } from '@/types/webinar.types'

export function useWebinarRealtime(initialWebinars: WebinarWithTasks[]) {
  const [webinars, setWebinars] = useState<WebinarWithTasks[]>(initialWebinars)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('webinar_tasks_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'webinar_tasks' },
        async () => {
          // Refetch all webinars with tasks on any change
          const { data } = await supabase
            .from('webinars')
            .select('*, webinar_tasks(*)')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })

          if (data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setWebinars((data as any[]) as WebinarWithTasks[])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Sync prop changes
  useEffect(() => {
    setWebinars(initialWebinars)
  }, [initialWebinars])

  return webinars
}
