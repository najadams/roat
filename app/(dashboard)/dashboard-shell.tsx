'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'
import { TourProvider } from '@/components/tours/TourProvider'
import type { TourProgress } from '@/lib/tours/types'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface DashboardShellProps {
  profile: Profile | null
  initialTourProgress: TourProgress[]
  tourProgressAvailable: boolean
  children: React.ReactNode
}

export function DashboardShell({
  profile,
  initialTourProgress,
  tourProgressAvailable,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <TourProvider
      role={profile?.role ?? 'viewer'}
      zonalOffice={profile?.zonal_office ?? null}
      initialProgress={initialTourProgress}
      progressAvailable={tourProgressAvailable}
    >
      <div className="flex h-screen overflow-hidden bg-slate-50">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex flex-shrink-0" data-tour="sidebar">
          <Sidebar role={profile?.role} zonalOffice={profile?.zonal_office} />
        </div>

        {/* Mobile Nav */}
        <MobileNav
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          role={profile?.role}
          zonalOffice={profile?.zonal_office}
        />

        {/* Main content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header profile={profile} onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TourProvider>
  )
}
