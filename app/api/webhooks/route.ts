import { NextRequest, NextResponse } from 'next/server'

// Placeholder for webhook handlers (e.g., Supabase realtime webhooks)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Webhook received:', body)
    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
