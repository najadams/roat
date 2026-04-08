import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ReportsContent } from './reports-content'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = { title: 'Reports — ROAT' }

interface PageProps {
  searchParams: Promise<{
    period?: string
    zone?: string
    year?: string
    quarter?: string
    month?: string
  }>
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>}>
      <ReportsContent profile={profileData} searchParams={params} />
    </Suspense>
  )
}
