// 'use client'
// import { useState, useEffect, Suspense } from 'react'
// import Link from 'next/link'
// import Image from 'next/image'
// import { useRouter, useSearchParams } from 'next/navigation'
// import { createClient } from '@/lib/supabase/client'
// import { Lock, Mail, Check, Shield } from 'lucide-react'

// function LoginForm() {
//   const router = useRouter()
//   const searchParams = useSearchParams()
//   const [email, setEmail] = useState('')
//   const [password, setPassword] = useState('')
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState('')

//   // Check for error in URL params (from OAuth callback)
//   useEffect(() => {
//     const errorParam = searchParams.get('error')
//     if (errorParam) {
//       setError(decodeURIComponent(errorParam))
//     }
//   }, [searchParams])

//   async function handleLogin(e: React.FormEvent) {
//     e.preventDefault()
//     setLoading(true)
//     setError('')
//     const supabase = createClient()
//     const { error: err } = await supabase.auth.signInWithPassword({ email, password })
//     if (err) {
//       setError(err.message)
//       setLoading(false)
//       return
//     }
//     router.push('/user/offers')
//     router.refresh()
//   }

//   async function handleGoogle() {
//     setLoading(true)
//     setError('')
//     const supabase = createClient()
//     try {
//       const { error } = await supabase.auth.signInWithOAuth({
//         provider: 'google',
//         options: {
//           redirectTo: `${window.location.origin}/auth/callback`,
//           scopes: 'email profile',
//         },
//       })
//       if (error) {
//         setError(error.message)
//         setLoading(false)
//       }
//     } catch (err) {
//       setError('Failed to sign in with Google')
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="relative min-h-screen w-full px-4 py-6 flex flex-col items-center justify-center">
//       {/* Full Screen Background Opacity Image - 50% opacity */}
//       <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-50">
//         <Image
//           src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1920&q=90"
//           alt="Background Texture"
//           fill
//           className="object-cover"
//           priority
//         />
//       </div>

//       <div className="relative z-10 w-full max-w-2xl">
//         <div className="text-center mb-10">
//           <Link href="/" className="text-5xl font-black text-red-600">ESR</Link>
//           <p className="text-xl text-gray-700 font-medium mt-3">Welcome back! Sign in to continue.</p>
//         </div>

//         <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-md border border-red-100 p-12 space-y-8">
//           <button
//             onClick={handleGoogle}
//             disabled={loading}
//             className="w-full flex items-center justify-center gap-3 border border-red-200 rounded-2xl py-4 font-bold text-gray-700 hover:border-red-300 hover:bg-red-50/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
//           >
//             <svg className="w-5 h-5" viewBox="0 0 24 24">
//               <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
//               <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
//               <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
//               <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
//             </svg>
//             <span className="text-base font-extrabold">{loading ? 'Signing in...' : 'Continue with Google'}</span>
//           </button>

//           <div className="flex items-center gap-3">
//             <div className="flex-1 h-px bg-red-100" />
//             <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">or</span>
//             <div className="flex-1 h-px bg-red-100" />
//           </div>

//           <form onSubmit={handleLogin} className="space-y-5">
//             {error && (
//               <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-2xl px-4 py-3">
//                 {error}
//               </div>
//             )}
//             <div>
//               <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
//                 <Mail size={16} className="text-red-600" />
//                 <span>Email</span>
//               </label>
//               <input
//                 type="email"
//                 value={email}
//                 onChange={e => setEmail(e.target.value)}
//                 required
//                 placeholder="you@example.com"
//                 className="w-full bg-red-50/50 border border-red-200 rounded-2xl px-5 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-300 text-gray-800 placeholder:text-gray-400"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
//                 <Lock size={16} className="text-red-600" />
//                 <span>Password</span>
//               </label>
//               <input
//                 type="password"
//                 value={password}
//                 onChange={e => setPassword(e.target.value)}
//                 required
//                 placeholder="••••••••"
//                 className="w-full bg-red-50/50 border border-red-200 rounded-2xl px-5 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-300 text-gray-800 placeholder:text-gray-400"
//               />
//             </div>

//             {/* Centered, balanced Sign In Button */}
//             <div className="pt-3 flex justify-center">
//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="w-full sm:w-72 py-4 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-2xl text-base transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
//               >
//                 {loading ? 'Signing in…' : 'Sign In'}
//               </button>
//             </div>
//           </form>
//         </div>

//         <p className="text-center text-base font-bold text-gray-700 mt-8">
//           Don&apos;t have an account?{' '}
//           <Link href="/auth/signup" className="text-red-600 font-extrabold hover:underline">Sign up free</Link>
//         </p>
//       </div>
//     </div>
//   )
// }

// export default function LoginPage() {
//   return (
//     <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
//       <LoginForm />
//     </Suspense>
//   )
// }

'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ButtonLoader } from '@/components/ui/loader'
import { startDemoSession, type DemoRole } from '@/lib/demo-session'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(() => searchParams.get('error') || '')
  const [status, setStatus] = useState('')
  const [passwordMode, setPasswordMode] = useState(false)
  const errorParam = searchParams.get('error')
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false'

  function enterDemo(role: DemoRole) {
    startDemoSession(role)
    toast.success(`${role} demo opened. No sign-in or database needed.`)
    router.push(role === 'Diner' ? '/user/offers' : '/demo/workspace')
  }

  // Check for error in URL params (from OAuth callback)
  useEffect(() => {
    if (errorParam) {
      toast.error(errorParam)
    }
  }, [errorParam])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (demoMode) {
      enterDemo('Diner')
      return
    }
    setLoading(true)
    setError('')
    setStatus('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
      toast.error(err.message)
      setLoading(false)
      return
    }
    toast.success('Signed in successfully')
    router.push('/user/offers')
    router.refresh()
  }

  async function handleEmailLink(e: React.FormEvent) {
    e.preventDefault()
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
      toast.error(linkError.message)
      setLoading(false)
      return
    }
    setStatus('Check your email for a secure sign-in link.')
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
    const supabase = createClient()
    try {
      toast.message('Redirecting to Google…')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'email profile',
        },
      })
      if (error) {
        setError(error.message)
        toast.error(error.message)
        setLoading(false)
      }
    } catch {
      setError('Failed to sign in with Google')
      toast.error('Failed to sign in with Google')
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-col items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-xl">
        <header className="mb-6 text-center">
          <p className="esr-eyebrow">ESR Pakistan</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Welcome to the table.</h1>
          <p className="mx-auto mt-3 max-w-md text-base leading-7 text-[var(--muted)]">
            Sign in or create your account with an email link. No password needed.
          </p>
        </header>

        <section aria-label="Sign in to ESR" className="esr-card space-y-6 p-6 shadow-sm sm:p-9">
          {demoMode && (
            <p className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-center text-sm font-semibold text-[var(--plum)]">
              Interactive demo · email delivery and Google sign-in are simulated.
            </p>
          )}
          <form onSubmit={passwordMode ? handleLogin : handleEmailLink} className="space-y-4">
            {error && (
              <p id="auth-error" role="alert" className="rounded-xl border border-[#a82035] bg-[#fff0ed] px-4 py-3 text-sm font-semibold text-[var(--crimson-hover)]">
                {error}
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
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-base text-[var(--foreground)] placeholder:text-[var(--muted)]"
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
                  className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-base text-[var(--foreground)]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="esr-primary-button flex w-full items-center justify-center gap-2 px-4 py-3 text-base disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <ButtonLoader label={passwordMode ? 'Signing in…' : 'Sending sign-in link…'} />
              ) : (
                passwordMode ? 'Sign in with password' : 'Email me a sign-in link →'
              )}
            </button>
            <p aria-live="polite" className="min-h-6 text-sm font-medium text-[var(--muted)]">
              {status}
            </p>
            <button
              type="button"
              onClick={() => {
                setPasswordMode((mode) => !mode)
                setError('')
                setStatus('')
              }}
              className="min-h-11 text-sm font-semibold text-[var(--crimson)] underline underline-offset-2"
            >
              {passwordMode ? 'Use an email link instead' : 'Already have a password? Sign in with password'}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-sm font-bold text-[var(--muted)]">or</span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-base font-bold text-[var(--plum)] hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? <ButtonLoader label="Signing in…" /> : 'Continue with Google'}
          </button>

          {demoMode && (
            <div className="space-y-3">
              <p className="text-center text-sm font-semibold text-[var(--muted)]">Or explore a sample account</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  ['Diner', 'Diner preview ↗'],
                  ['Admin', 'Admin preview ↗'],
                  ['Restaurant', 'Restaurant preview ↗'],
                ] as const).map(([role, label]) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => enterDemo(role)}
                    className="min-h-12 rounded-xl border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--plum)] hover:bg-[var(--surface-muted)]"
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
            <Link href="/auth/signup" className="font-bold text-[var(--crimson)] underline underline-offset-2">
              Sign up
            </Link>
          </p>
        </section>

        <footer className="mt-6 border-t border-[var(--border)] pt-4 text-center text-sm text-[var(--muted)]">
          Pakistani dining, better together · Secure sign-in · Your records stay in ESR
        </footer>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LoginForm />
    </Suspense>
  )
}