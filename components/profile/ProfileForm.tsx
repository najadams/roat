'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateOwnDisplayName, changeOwnPassword } from '@/actions/user.actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter()

  // Display name state
  const [fullName, setFullName] = useState(profile.full_name)
  const [savingName, setSavingName] = useState(false)

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  async function handleSaveName() {
    if (fullName.trim() === profile.full_name) return
    setSavingName(true)
    const result = await updateOwnDisplayName(fullName.trim())
    setSavingName(false)
    if (result.error) {
      toast.error(typeof result.error === 'string' ? result.error : 'Failed to update name')
    } else {
      toast.success('Display name updated')
      router.refresh()
    }
  }

  async function handleChangePassword() {
    setPasswordError(null)
    if (newPassword.length < 10) {
      setPasswordError('Password must be at least 10 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    setSavingPassword(true)
    const result = await changeOwnPassword(newPassword)
    setSavingPassword(false)
    if (result.error) {
      setPasswordError(typeof result.error === 'string' ? result.error : 'Failed to update password')
    } else {
      toast.success('Password updated successfully')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="space-y-6">
      {/* Display name */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">
            Display Name
          </CardTitle>
          <CardDescription className="text-sm text-slate-500">
            Update the name shown across the application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-sm font-medium text-slate-700">
                Full Name
              </Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="h-10 text-sm border-slate-200 max-w-sm"
              />
            </div>
            <Button
              onClick={handleSaveName}
              disabled={savingName || fullName.trim() === profile.full_name || !fullName.trim()}
              className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium tracking-wide"
            >
              {savingName ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-900 tracking-tight">
            Change Password
          </CardTitle>
          <CardDescription className="text-sm text-slate-500">
            Choose a strong password of at least 10 characters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password" className="text-sm font-medium text-slate-700">
                New Password
              </Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setPasswordError(null) }}
                placeholder="••••••••••"
                className="h-10 text-sm border-slate-200 max-w-sm"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password" className="text-sm font-medium text-slate-700">
                Confirm Password
              </Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setPasswordError(null) }}
                placeholder="••••••••••"
                className="h-10 text-sm border-slate-200 max-w-sm"
                autoComplete="new-password"
              />
            </div>
            {passwordError && (
              <p className="text-sm text-red-600 font-medium">{passwordError}</p>
            )}
            <Button
              onClick={handleChangePassword}
              disabled={savingPassword || !newPassword || !confirmPassword}
              className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium tracking-wide"
            >
              {savingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
