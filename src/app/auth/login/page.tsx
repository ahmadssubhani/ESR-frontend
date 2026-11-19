'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import AuthPageShell from '@/components/auth/AuthPageShell'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ButtonLoader } from '@/components/ui/loader'
import { startDemoSession, type DemoRole } from '@/lib/demo-session'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(() => errorParam || '')
  const [status, setStatus] = useState(() => errorParam ? `Error: ${errorParam}` : '')
  const [passwordMode, setPasswordMode] = useState(false)
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false'

  function enterDemo(role: DemoRole) {
    startDemoSession(role)
    toast.success(`${role} workspace opened.`)
    router.push(role === 'Diner' ? '/user/offers' : '/demo/workspace')
  }

  useEffect(() => {
    if (errorParam) {
      toast.error(errorParam)
    }
  }, [errorParam])

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (demoMode) {
      enterDemo('Diner')
      return
    }
    setLoading(true)
    setError('')
    setStatus('')
    const supabase = createClient()
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) {
      setError(loginError.message)
      setStatus(`Error: ${loginError.message}`)
      toast.error(loginError.message)
      setLoading(false)
      return
    }
    toast.success('Signed in successfully')
    router.push('/user/offers')
    router.refresh()
  }

  async function handleEmailLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (demoMode) {
      enterDemo('Diner')
      return
    }
    setLoading(true)
    setError('')
    setStatus('')
    const supabase = createClient()
    const { error: linkError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (linkError) {
      setError(linkError.message)
      setStatus(`Error: ${linkError.message}`)
      toast.error(linkError.message)
      setLoading(false)
      return
    }
    const message = 'Check your email for a secure sign-in link.'
    setStatus(message)
    toast.success('Sign-in link sent')
    setLoading(false)
  }

  async function handleGoogle() {
    if (demoMode) {
      enterDemo('Diner')
      return
    }
    setLoading(true)
    setError('')
    setStatus('')
    const supabase = createClient()
    try {
      toast.message('Redirecting to Google…')
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'email profile',
        },
      })
      if (oauthError) throw oauthError
    } catch (oauthError) {
      const message = oauthError instanceof Error ? oauthError.message : 'Failed to sign in with Google.'
      setError(message)
      setStatus(`Error: ${message}`)
      toast.error(message)
      setLoading(false)
    }
  }

  return (
    <AuthPageShell
      title="Welcome to the table."
      description="Sign in or create your account with an email link. No password needed."
      size="wide"
    >
        <section aria-label="Sign in to ESR" className="esr-card space-y-6 p-6 sm:p-8">
          <form onSubmit={passwordMode ? handleLogin : handleEmailLink} className="space-y-4">
            {error && (
              <p id="auth-error" role="alert" className="flex items-start gap-2 rounded-xl border border-[var(--crimson)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-medium text-[var(--plum)]">
                <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--crimson)]" size={18} />
                <span>Error: {error}</span>
              </p>
            )}
            <div>
              <label htmlFor="login-email" className="mb-2 block text-base font-semibold text-[var(--plum)]">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                aria-describedby={error ? 'auth-error' : undefined}
                placeholder="you@example.com"
                className="esr-auth-input min-h-12 w-full rounded-xl px-4 text-base placeholder:text-[var(--muted)]"
              />
            </div>

            {passwordMode && (
              <div>
                <label htmlFor="login-password" className="mb-2 block text-base font-semibold text-[var(--plum)]">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  aria-describedby={error ? 'auth-error' : undefined}
                  className="esr-auth-input min-h-12 w-full rounded-xl px-4 text-base"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="esr-primary-button flex min-h-12 w-full items-center justify-center gap-2 px-4 py-3 text-base disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <ButtonLoader label={passwordMode ? 'Signing in…' : 'Sending sign-in link…'} />
              ) : (
                passwordMode ? 'Sign in with password' : 'Email me a sign-in link →'
              )}
            </button>
            <p role="status" aria-live="polite" aria-atomic="true" className="min-h-6 text-sm font-medium text-[var(--muted)]">
              {status}
            </p>
            <button
              type="button"
              onClick={() => {
                setPasswordMode((mode) => !mode)
                setError('')
                setStatus('')
              }}
              className="esr-auth-link min-h-11 text-sm"
            >
              {passwordMode ? 'Use an email link instead' : 'Already have a password? Sign in with password'}
            </button>
          </form>

          <div className="flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-sm font-medium text-[var(--muted)]">or</span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <button
            type="button"
            onClick={() => void handleGoogle()}
            disabled={loading}
            className="esr-outline-button flex min-h-12 w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {loading ? <ButtonLoader label="Signing in…" /> : 'Continue with Google'}
          </button>

          {demoMode && (
            <div className="space-y-3">
              <p className="text-center text-sm font-semibold text-[var(--muted)]">Choose an account type</p>
              <div className="grid grid-cols-1 gap-2 min-[520px]:grid-cols-3">
                {([
                  ['Diner', 'Diner ↗'],
                  ['Admin', 'Admin ↗'],
                  ['Restaurant', 'Restaurant ↗'],
                ] as const).map(([role, label]) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => enterDemo(role)}
                    className="esr-outline-button min-h-11 whitespace-nowrap rounded-xl px-3 text-sm font-semibold hover:bg-[var(--surface-muted)]"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm leading-6 text-[var(--plum)]">
            Restaurant teams: use the email address registered by your ESR admin. Restaurant access is always through an email sign-in link.
          </p>

          <p className="border-t border-[var(--border)] pt-5 text-center text-sm text-[var(--muted)]">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="esr-auth-link">Sign up</Link>
          </p>
        </section>
    </AuthPageShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <LoginForm />
    </Suspense>
  )
}
