'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Full navigation to bust the Next.js router cache so the new
    // user's profile is fetched fresh by the dashboard layout.
    window.location.href = '/dashboard'
  }

  return (
    <Card className="w-full max-w-md shadow-lg border-0">
      <CardHeader className="space-y-2 pb-8 pt-8 px-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center">
            <span className="text-white font-bold text-sm tracking-wider">AR</span>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
              Regional & Global Operations
            </p>
          </div>
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">
          Sign in to ROAT
        </CardTitle>
        <CardDescription className="text-slate-500 text-sm leading-relaxed">
          Enter your credentials to access the operations dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <Alert variant="destructive" className="text-sm">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-slate-700 tracking-wide">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="h-11 border-slate-200 focus:border-slate-400 focus:ring-slate-300 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700 tracking-wide">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••"
              required
              autoComplete="current-password"
              className="h-11 border-slate-200 focus:border-slate-400 focus:ring-slate-300 text-sm"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium tracking-wide mt-2"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">
          Contact your administrator if you need access.
        </p>
      </CardContent>
    </Card>
  )
}
