import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
]

function allowedOrigins(): string[] {
  const fromEnv = (process.env.API_CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
  const production = process.env.NEXT_PUBLIC_APP_URL?.trim()
  return [...new Set([...DEFAULT_ORIGINS, ...fromEnv, ...(vercel ? [vercel] : []), ...(production ? [production] : [])])]
}

export function corsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get('origin')
  const allowed = allowedOrigins()
  const allowOrigin =
    origin && (allowed.includes(origin) || allowed.includes('*'))
      ? origin
      : allowed[0] || '*'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export function handleCorsPreflight(request: NextRequest): NextResponse | null {
  if (request.method !== 'OPTIONS') return null
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}

export function withCors<T>(request: NextRequest, response: NextResponse<T>): NextResponse<T> {
  const extra = corsHeaders(request)
  Object.entries(extra).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

export function jsonApi(
  request: NextRequest,
  body: unknown,
  init?: ResponseInit
): NextResponse {
  const preflight = handleCorsPreflight(request)
  if (preflight) return preflight
  const status = init?.status ?? 200
  if (status === 204) {
    return withCors(request, new NextResponse(null, { ...init, status: 204 }))
  }
  return withCors(request, NextResponse.json(body, init))
}
