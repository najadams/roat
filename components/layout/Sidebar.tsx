'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import {
  LayoutDashboard,
  ClipboardList,
  Radio,
  Users,
  Settings,
  ChevronRight,
  Target,
  BarChart2,
} from 'lucide-react'

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Module A',
    icon: ClipboardList,
    children: [
      { label: 'Log Activity', href: '/module-a/new' },
      { label: 'All Activities', href: '/module-a/activities' },
      { label: 'Reports', href: '/module-a/reports' },
    ],
  },
  {
    label: 'Module B',
    icon: Radio,
    children: [
      { label: 'Webinar Pipeline', href: '/module-b/webinars' },
      { label: 'Add Webinar', href: '/module-b/new' },
    ],
  },
]

const adminItems = [
  { label: 'User Management', href: '/admin/users', icon: Users },
  { label: 'Targets', href: '/admin/targets', icon: Target },
  { label: 'Performance', href: '/admin/performance', icon: BarChart2 },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

interface SidebarProps {
  role?: string
  onClose?: () => void
}

export function Sidebar({ role, onClose }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  function isGroupActive(children: { href: string }[]) {
    return children.some(child => isActive(child.href))
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white w-64">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs tracking-wider">RT</span>
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-white">ROAT</p>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase">
              Operations Division
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        {navItems.map(item => {
          if (item.children) {
            const active = isGroupActive(item.children)
            return (
              <div key={item.label}>
                <div
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                    active
                      ? 'text-white'
                      : 'text-slate-400'
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="tracking-wide text-xs uppercase font-semibold">{item.label}</span>
                </div>
                <div className="ml-4 pl-3 border-l border-slate-700/50 space-y-0.5 mb-2">
                  {item.children.map(child => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive(child.href)
                          ? 'bg-slate-700 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      )}
                    >
                      {isActive(child.href) && (
                        <ChevronRight className="h-3 w-3 flex-shrink-0" />
                      )}
                      <span>{child.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive(item.href!)
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}

        {/* Admin section */}
        {role === 'regional_admin' && (
          <div className="pt-4">
            <p className="px-3 mb-1 text-[10px] font-semibold tracking-widest text-slate-500 uppercase">
              Administration
            </p>
            {adminItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-700/50">
        <p className="text-[10px] text-slate-500 tracking-wide">
          ROAT v1.0 &mdash; Feb 2026
        </p>
      </div>
    </div>
  )
}
