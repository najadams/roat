'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { cn } from '@/lib/utils/cn'

interface MobileNavProps {
  open: boolean
  onClose: () => void
  role?: string
}

export function MobileNav({ open, onClose, role }: MobileNavProps) {
  // Close on ESC
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 lg:hidden transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="relative h-full">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <Sidebar role={role} onClose={onClose} />
        </div>
      </div>
    </>
  )
}
