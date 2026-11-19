export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return null
  }
  return value
}

export function roleHome(role: string | null | undefined, requestedPath?: string | null): string {
  if (role === 'admin' || role === 'restaurant' || role === 'owner') {
    return '/admin/dashboard'
  }
  return safeReturnPath(requestedPath) || '/user/offers'
}

export function authCallbackUrl(origin: string, next?: string | null): string {
  const callback = new URL('/auth/callback', origin)
  const safeNext = safeReturnPath(next)
  if (safeNext) callback.searchParams.set('next', safeNext)
  return callback.toString()
}

export function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase()
  if (normalized.includes('invalid login credentials')) return 'Email or password is incorrect.'
  if (normalized.includes('already registered') || normalized.includes('already exists')) {
    return 'An account already uses this email. Try signing in instead.'
  }
  if (normalized.includes('email not confirmed')) return 'Confirm your email before signing in.'
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  return message
}
