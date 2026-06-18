'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboardingPassword } from '@/actions/user.actions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SetupPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password.length < 10) {
      setError('Password must be at least 10 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSaving(true)
    const result = await completeOnboardingPassword(password)
    setSaving(false)

    if (result.error) {
      setError(typeof result.error === 'string' ? result.error : 'Unable to complete setup')
      return
    }

    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md border-0 shadow-lg">
      <CardHeader className="space-y-3 px-8 pb-6 pt-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900">
            <span className="text-sm font-bold tracking-wider text-white">AR</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Regional & Global Operations
          </p>
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">
            Set Your Password
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed text-slate-500">
            Create a secure password to finish your Argus account setup.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <Alert variant="destructive" className="text-sm">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium tracking-wide text-slate-700">
              New Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={event => {
                setPassword(event.target.value)
                setError(null)
              }}
              autoComplete="new-password"
              className="h-11 border-slate-200 text-sm focus:border-slate-400 focus:ring-slate-300"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-sm font-medium tracking-wide text-slate-700">
              Confirm Password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={event => {
                setConfirmPassword(event.target.value)
                setError(null)
              }}
              autoComplete="new-password"
              className="h-11 border-slate-200 text-sm focus:border-slate-400 focus:ring-slate-300"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={saving || !password || !confirmPassword}
            className="mt-2 h-11 w-full bg-slate-900 text-sm font-medium tracking-wide text-white hover:bg-slate-800"
          >
            {saving ? 'Completing Setup...' : 'Complete Setup'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
