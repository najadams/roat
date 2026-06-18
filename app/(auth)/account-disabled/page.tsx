'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AccountDisabledPage() {
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <Card className="w-full max-w-md border-0 shadow-lg">
      <CardHeader className="space-y-2 px-8 pb-6 pt-8">
        <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900">
          Account Disabled
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed text-slate-500">
          Your account is currently inactive. Please contact a regional administrator for access.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <Button
          onClick={handleSignOut}
          disabled={signingOut}
          className="h-11 w-full bg-slate-900 text-sm font-medium tracking-wide text-white hover:bg-slate-800"
        >
          {signingOut ? 'Signing Out...' : 'Sign Out'}
        </Button>
      </CardContent>
    </Card>
  )
}
