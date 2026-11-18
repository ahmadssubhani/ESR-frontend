// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { ensureUserProfile } from '@/lib/ensure-profile'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/user/offers'
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  // If there's an error from Google/OAuth
  if (error) {
    console.error('OAuth error:', error, error_description)
    // Redirect to login with error message
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(error_description || error)}`
    )
  }

  if (code) {
    try {
      const supabase = await createClient()
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Exchange error:', exchangeError)
        return NextResponse.redirect(
          `${origin}/auth/login?error=${encodeURIComponent(exchangeError.message)}`
        )
      }

      // Backfill profiles for users created before the trigger / missing a row
      if (data.user) {
        try {
          await ensureUserProfile(data.user)
        } catch (profileErr) {
          console.error('Profile ensure failed after auth:', profileErr)
        }
      }

      // Successful authentication - redirect to dashboard
      return NextResponse.redirect(`${origin}${next}`)
    } catch (err) {
      console.error('Callback error:', err)
      return NextResponse.redirect(
        `${origin}/auth/login?error=Authentication failed`
      )
    }
  }

  // No code provided - redirect to home
  return NextResponse.redirect(origin)
}
