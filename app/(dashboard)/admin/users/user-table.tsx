'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateUserProfile, inviteUser } from '@/actions/user.actions'
import { ZONAL_OFFICE_LABELS } from '@/types/activity.types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Edit2, Shield, ShieldOff, UserPlus } from 'lucide-react'
import { formatDate } from '@/lib/utils/date-helpers'
import type { Database, UserRole } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface UserTableProps {
  users: Profile[]
}

export function UserTable({ users: initialUsers }: UserTableProps) {
  const [users, setUsers] = useState(initialUsers)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    role: '',
    zonal_office: '',
    is_active: true,
  })

  const [inviting, setInviting] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    full_name: '',
    email: '',
    role: 'zonal_officer',
    zonal_office: '',
  })

  function openInvite() {
    setInviteForm({ full_name: '', email: '', role: 'zonal_officer', zonal_office: '' })
    setInviteOpen(true)
  }

  async function handleInvite() {
    setInviting(true)
    const result = await inviteUser({
      full_name: inviteForm.full_name,
      email: inviteForm.email,
      role: inviteForm.role,
      zonal_office: inviteForm.zonal_office || null,
    })

    if (result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to invite user')
    } else {
      toast.success('Invitation sent — the user will receive a setup email')
      setInviteOpen(false)
    }
    setInviting(false)
  }

  function openEdit(user: Profile) {
    setEditing(user)
    setForm({
      full_name: user.full_name,
      role: user.role,
      zonal_office: user.zonal_office ?? '',
      is_active: user.is_active,
    })
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)

    const result = await updateUserProfile(editing.id, {
      full_name: form.full_name,
      role: form.role,
      zonal_office: form.zonal_office || null,
      is_active: form.is_active,
    })

    if (result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to update user')
    } else {
      toast.success('User updated successfully')
      setUsers(prev =>
        prev.map(u =>
          u.id === editing.id
            ? { ...u, ...form, role: form.role as UserRole, zonal_office: (form.zonal_office || null) as Profile['zonal_office'] }
            : u
        )
      )
      setEditing(null)
    }
    setSaving(false)
  }

  const ROLE_LABELS: Record<string, string> = {
    regional_admin: 'Administrator',
    zonal_officer: 'Zonal Officer',
    viewer: 'Viewer',
  }

  return (
    <>
      <div className="flex justify-end">
        <Button
          onClick={openInvite}
          className="bg-slate-900 hover:bg-slate-800 text-white text-sm gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-100">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="text-xs font-semibold tracking-wide text-slate-400 uppercase py-3">Name</TableHead>
              <TableHead className="text-xs font-semibold tracking-wide text-slate-400 uppercase py-3">Email</TableHead>
              <TableHead className="text-xs font-semibold tracking-wide text-slate-400 uppercase py-3">Role</TableHead>
              <TableHead className="text-xs font-semibold tracking-wide text-slate-400 uppercase py-3">Zone</TableHead>
              <TableHead className="text-xs font-semibold tracking-wide text-slate-400 uppercase py-3">Status</TableHead>
              <TableHead className="text-xs font-semibold tracking-wide text-slate-400 uppercase py-3">Since</TableHead>
              <TableHead className="py-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id} className="border-slate-100">
                <TableCell className="font-medium text-slate-900 text-sm py-3.5">{user.full_name}</TableCell>
                <TableCell className="text-slate-500 text-sm py-3.5">{user.email}</TableCell>
                <TableCell className="py-3.5">
                  <Badge variant="outline" className="text-xs font-medium">
                    {ROLE_LABELS[user.role] ?? user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-500 text-sm py-3.5">
                  {user.zonal_office ? ZONAL_OFFICE_LABELS[user.zonal_office] : '—'}
                </TableCell>
                <TableCell className="py-3.5">
                  {user.is_active ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                      <Shield className="h-3.5 w-3.5" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                      <ShieldOff className="h-3.5 w-3.5" />
                      Inactive
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-slate-400 text-sm py-3.5">{formatDate(user.created_at)}</TableCell>
                <TableCell className="py-3.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-slate-900"
                    onClick={() => openEdit(user)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Invite User Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Invite New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Full Name</Label>
              <Input
                placeholder="e.g. Kwame Mensah"
                value={inviteForm.full_name}
                onChange={e => setInviteForm(f => ({ ...f, full_name: e.target.value }))}
                className="h-10 text-sm border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Email Address</Label>
              <Input
                type="email"
                placeholder="e.g. k.mensah@gipc.gov.gh"
                value={inviteForm.email}
                onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                className="h-10 text-sm border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Role</Label>
              <RadioGroup
                value={inviteForm.role}
                onValueChange={val => setInviteForm(f => ({ ...f, role: val }))}
                className="flex flex-col gap-2"
              >
                {[
                  { value: 'zonal_officer', label: 'Zonal Officer' },
                  { value: 'regional_admin', label: 'Regional Administrator' },
                  { value: 'viewer', label: 'Viewer (Read-only)' },
                ].map(({ value, label }) => (
                  <label
                    key={value}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                      inviteForm.role === value ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
                    }`}
                  >
                    <RadioGroupItem value={value} />
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Zonal Office</Label>
              <Select
                value={inviteForm.zonal_office || 'none'}
                onValueChange={val => setInviteForm(f => ({ ...f, zonal_office: val === 'none' ? '' : val }))}
              >
                <SelectTrigger className="h-10 text-sm border-slate-200">
                  <SelectValue placeholder="Select zone (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-sm">No Zone (Admin / Viewer)</SelectItem>
                  {Object.entries(ZONAL_OFFICE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-sm">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400">Required for Zonal Officers. Leave blank for Administrators and Viewers.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              onClick={handleInvite}
              disabled={inviting || !inviteForm.full_name || !inviteForm.email}
              className="bg-slate-900 hover:bg-slate-800 text-white text-sm"
            >
              {inviting ? 'Sending Invite...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Full Name</Label>
              <Input
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="h-10 text-sm border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Role</Label>
              <RadioGroup
                value={form.role}
                onValueChange={val => setForm(f => ({ ...f, role: val }))}
                className="flex flex-col gap-2"
              >
                {[
                  { value: 'zonal_officer', label: 'Zonal Officer' },
                  { value: 'regional_admin', label: 'Regional Administrator' },
                  { value: 'viewer', label: 'Viewer (Read-only)' },
                ].map(({ value, label }) => (
                  <label
                    key={value}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                      form.role === value ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
                    }`}
                  >
                    <RadioGroupItem value={value} />
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Zonal Office</Label>
              <Select
                value={form.zonal_office || 'none'}
                onValueChange={val => setForm(f => ({ ...f, zonal_office: val === 'none' ? '' : val }))}
              >
                <SelectTrigger className="h-10 text-sm border-slate-200">
                  <SelectValue placeholder="Select zone (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-sm">No Zone (Admin)</SelectItem>
                  {Object.entries(ZONAL_OFFICE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-sm">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Account Status</Label>
              <RadioGroup
                value={form.is_active ? 'active' : 'inactive'}
                onValueChange={val => setForm(f => ({ ...f, is_active: val === 'active' }))}
                className="flex gap-4"
              >
                {[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ].map(({ value, label }) => (
                  <label
                    key={value}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                      (form.is_active ? 'active' : 'inactive') === value
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200'
                    }`}
                  >
                    <RadioGroupItem value={value} />
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-slate-900 hover:bg-slate-800 text-white text-sm"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
