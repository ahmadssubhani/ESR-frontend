// // // import { createServerClient } from '@supabase/ssr'
// // // import { NextResponse, type NextRequest } from 'next/server'

// // // export async function proxy(request: NextRequest) {
// // //   let supabaseResponse = NextResponse.next({ request })

// // //   const supabase = createServerClient(
// // //     process.env.NEXT_PUBLIC_SUPABASE_URL!,
// // //     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
// // //     {
// // //       cookies: {
// // //         getAll() {
// // //           return request.cookies.getAll()
// // //         },
// // //         setAll(cookiesToSet) {
// // //           cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
// // //           supabaseResponse = NextResponse.next({ request })
// // //           cookiesToSet.forEach(({ name, value, options }) =>
// // //             supabaseResponse.cookies.set(name, value, options)
// // //           )
// // //         },
// // //       },
// // //     }
// // //   )

// // //   const { data: { user } } = await supabase.auth.getUser()

// // //   const path = request.nextUrl.pathname

// // //   // Protect /user routes
// // //   if (path.startsWith('/user') && !user) {
// // //     return NextResponse.redirect(new URL('/auth/login', request.url))
// // //   }

// // //   // Protect /admin routes
// // //   if (path.startsWith('/admin')) {
// // //     if (!user) {
// // //       return NextResponse.redirect(new URL('/auth/login', request.url))
// // //     }
// // //     // Check role
// // //     const { data: profile } = await supabase
// // //       .from('profiles')
// // //       .select('role')
// // //       .eq('id', user.id)
// // //       .single()

// // //     if (!profile || !['admin', 'owner'].includes(profile.role)) {
// // //       return NextResponse.redirect(new URL('/', request.url))
// // //     }
// // //   }

// // //   // Redirect logged-in users away from auth pages
// // //   if (path.startsWith('/auth') && user) {
// // //     return NextResponse.redirect(new URL('/user/offers', request.url))
// // //   }

// // //   return supabaseResponse
// // // }

// // // export const config = {
// // //   matcher: ['/user/:path*', '/admin/:path*', '/auth/:path*'],
// // // }

// // // middleware.ts (in root folder, NOT in app/ or lib/)
// // import { createServerClient } from '@supabase/ssr'
// // import { NextResponse, type NextRequest } from 'next/server'

// // export async function middleware(request: NextRequest) {
// //   let supabaseResponse = NextResponse.next({ request })

// //   const supabase = createServerClient(
// //     process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
// //     {
// //       cookies: {
// //         getAll() {
// //           return request.cookies.getAll()
// //         },
// //         setAll(cookiesToSet) {
// //           cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
// //           supabaseResponse = NextResponse.next({ request })
// //           cookiesToSet.forEach(({ name, value, options }) =>
// //             supabaseResponse.cookies.set(name, value, options)
// //           )
// //         },
// //       },
// //     }
// //   )

// //   const { data: { user } } = await supabase.auth.getUser()

// //   const path = request.nextUrl.pathname

// //   // Protect /user routes
// //   if (path.startsWith('/user') && !user) {
// //     return NextResponse.redirect(new URL('/auth/login', request.url))
// //   }

// //   // Protect /admin routes
// //   if (path.startsWith('/admin')) {
// //     if (!user) {
// //       return NextResponse.redirect(new URL('/auth/login', request.url))
// //     }
// //     // Check role
// //     const { data: profile } = await supabase
// //       .from('profiles')
// //       .select('role')
// //       .eq('id', user.id)
// //       .single()

// //     if (!profile || !['admin', 'owner'].includes(profile.role)) {
// //       return NextResponse.redirect(new URL('/', request.url))
// //     }
// //   }

// //   // Redirect logged-in users away from auth pages
// //   if (path.startsWith('/auth') && user) {
// //     return NextResponse.redirect(new URL('/user/offers', request.url))
// //   }

// //   return supabaseResponse
// // }

// // export const config = {
// //   matcher: ['/user/:path*', '/admin/:path*', '/auth/:path*'],
// // }

// // middleware.ts (root level - NOT in app/ or lib/ folders)
// import { createServerClient } from '@supabase/ssr'
// import { NextResponse, type NextRequest } from 'next/server'

// export async function middleware(request: NextRequest) {
//   let supabaseResponse = NextResponse.next({ request })

//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll() {
//           return request.cookies.getAll()
//         },
//         setAll(cookiesToSet) {
//           cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
//           supabaseResponse = NextResponse.next({ request })
//           cookiesToSet.forEach(({ name, value, options }) =>
//             supabaseResponse.cookies.set(name, value, options)
//           )
//         },
//       },
//     }
//   )

//   const { data: { user } } = await supabase.auth.getUser()
//   const path = request.nextUrl.pathname

//   // Protect /user routes - redirect to login if not authenticated
//   if (path.startsWith('/user') && !user) {
//     return NextResponse.redirect(new URL('/auth/login', request.url))
//   }

//   // Protect /admin routes - check for admin/owner role
//   if (path.startsWith('/admin')) {
//     if (!user) {
//       return NextResponse.redirect(new URL('/auth/login', request.url))
//     }
    
//     // Check user role from profiles table
//     const { data: profile } = await supabase
//       .from('profiles')
//       .select('role')
//       .eq('id', user.id)
//       .single()

//     if (!profile || !['admin', 'owner'].includes(profile.role)) {
//       return NextResponse.redirect(new URL('/', request.url))
//     }
//   }

//   // Redirect logged-in users away from auth pages (login/signup)
//   if (path.startsWith('/auth') && user) {
//     return NextResponse.redirect(new URL('/user/offers', request.url))
//   }

//   return supabaseResponse
// }

// export const config = {
//   matcher: ['/user/:path*', '/admin/:path*', '/auth/:path*'],
// }

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { corsHeaders, handleCorsPreflight } from '@/lib/api/cors'

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const preflight = handleCorsPreflight(request)
    if (preflight) return preflight
    const response = NextResponse.next()
    Object.entries(corsHeaders(request)).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  }
  return NextResponse.next()
}

// Optional matcher config to exclude static assets
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)',
  ],
}
