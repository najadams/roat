'use client'

import { useRouter } from 'next/navigation'
import { Menu, LogOut, User } from 'lucide-react'
import { NotificationBell } from './NotificationBell'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { ZONAL_OFFICE_LABELS } from '@/types/activity.types'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface HeaderProps {
  profile: Profile | null
  onMenuClick: () => void
}

export function Header({ profile, onMenuClick }: HeaderProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  const roleLabel = {
    regional_admin: 'Regional Administrator',
    zonal_officer: profile?.zonal_office
      ? `${ZONAL_OFFICE_LABELS[profile.zonal_office]} Officer`
      : 'Zonal Officer',
    viewer: 'Viewer',
  }[profile?.role ?? 'viewer']

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden text-slate-600"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden lg:block">
          <p className="text-xs text-slate-400 tracking-widest uppercase font-medium">
            Regional & Global Operations Division
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <NotificationBell />
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-3 h-auto py-1.5 px-2 hover:bg-slate-50">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-slate-900">{profile?.full_name ?? 'User'}</p>
              <p className="text-xs text-slate-400">{roleLabel}</p>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-slate-800 text-white text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div>
              <p className="font-medium text-slate-900">{profile?.full_name}</p>
              <p className="text-xs text-slate-500 font-normal">{profile?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 text-sm cursor-pointer"
            onClick={() => router.push('/profile')}
          >
            <User className="h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="gap-2 text-sm text-red-600 focus:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  )
}
