'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Eye, EyeOff, MailCheck } from 'lucide-react'
import AuthPageShell from '@/components/auth/AuthPageShell'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ButtonLoader } from '@/components/ui/loader'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 8) {
      const message = 'Password must be at least 8 characters.'
      setError(message)
      setStatus(`Error: ${message}`)
      toast.error(message)
      return
    }

    setLoading(true)
    setError('')
    setStatus('')
    try {
      const supabase = createClient()
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (signupError) throw signupError

      if (data.user) {
        setDone(true)
        setStatus('Check your email to confirm your account.')
        toast.success('Account created — check your email')
      }
    } catch (signupError) {
      const message = signupError instanceof Error ? signupError.message : 'Account creation failed. Please try again.'
      setError(message)
      setStatus(`Error: ${message}`)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setLoading(true)
    setError('')
    setStatus('')
    const supabase = createClient()
    try {
      toast.message('Redirecting to Google…')
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
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
    <AuthPageShell title="Join the table." description="Create your free account to save restaurants, share reviews and claim discounts.">
        {done ? (
          <section aria-labelledby="signup-confirmation-title" className="esr-card rounded-3xl p-7 text-center sm:p-8">
            <MailCheck aria-hidden="true" className="mx-auto mb-4 text-[var(--crimson)]" size={40} />
            <h2 id="signup-confirmation-title" className="text-2xl font-normal">Check your email</h2>
            <p className="mt-3 text-base leading-7 text-[var(--muted)]">
              We sent a confirmation link to <strong className="text-[var(--plum)]">{email}</strong>. Use it to activate your account.
            </p>
            <p role="status" aria-live="polite" className="sr-only">{status}</p>
          </section>
        ) : (
          <section aria-label="Create your ESR account" className="esr-card space-y-5 rounded-3xl p-6 sm:p-8">
            <button
              type="button"
              onClick={() => void handleGoogle()}
              disabled={loading}
              className="esr-outline-button inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl px-4 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {loading ? <ButtonLoader label="Continuing with Google…" /> : 'Continue with Google'}
            </button>

            <div className="flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-sm font-medium text-[var(--muted)]">or</span>
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <p id="signup-error" role="alert" className="flex items-start gap-2 rounded-xl border border-[var(--crimson)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-medium text-[var(--plum)]">
                  <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--crimson)]" size={18} />
                  <span>Error: {error}</span>
                </p>
              )}
              <div>
                <label htmlFor="signup-name" className="mb-2 block text-base font-semibold text-[var(--plum)]">Full name</label>
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  aria-invalid={Boolean(error && /name/i.test(error))}
                  aria-describedby={error ? 'signup-error' : undefined}
                  className="esr-auth-input min-h-12 w-full rounded-xl px-4 text-base"
                />
              </div>
              <div>
                <label htmlFor="signup-email" className="mb-2 block text-base font-semibold text-[var(--plum)]">Email address</label>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  aria-invalid={Boolean(error && /email/i.test(error))}
                  aria-describedby={error ? 'signup-error' : undefined}
                  className="esr-auth-input min-h-12 w-full rounded-xl px-4 text-base"
                />
              </div>
              <div>
                <label htmlFor="signup-password" className="mb-2 block text-base font-semibold text-[var(--plum)]">Password</label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    aria-invalid={Boolean(error && password.length < 8)}
                    aria-describedby={`signup-password-help${error ? ' signup-error' : ''}`}
                    className="esr-auth-input min-h-12 w-full rounded-xl py-3 pl-4 pr-20 text-base"
                  />
                  <button
                    type="button"
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-1 top-1 inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-[var(--crimson)] underline underline-offset-2"
                  >
                    {showPassword ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p id="signup-password-help" className="mt-2 text-sm text-[var(--muted)]">At least 8 characters</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="esr-primary-button inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <ButtonLoader label="Creating account…" /> : 'Create account →'}
              </button>
              <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{status}</p>
            </form>
          </section>
        )}

        <p className="mt-6 text-center text-base text-[var(--muted)]">
          Already have an account?{' '}
          <Link href="/auth/login" className="esr-auth-link">Sign in</Link>
        </p>
    </AuthPageShell>
  )
}
