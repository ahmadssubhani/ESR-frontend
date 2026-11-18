// import { createBrowserClient } from '@supabase/ssr'
// import type { Database } from '@/types/database'

// // 1. Core Browser Client Initializer
// export function createClient() {
//   return createBrowserClient<Database>(
//     process.env.NEXT_PUBLIC_SUPABASE_URL ||
//       'https://mkkikveswkxltsrlozhs.supabase.co',
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
//       'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ra2lrdmVzd2t4bHRzcmxvemhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NDE1MzAsImV4cCI6MjEwMTMxNzUzMH0.ZMuw6qrfYlASAhRMY3VabTEGnfkTSVVtbta-Vz_SzlM'
//   )
// }

// // ==========================================
// // 2. Authentication Helpers
// // ==========================================

// export const authBackend = {
//   // Google OAuth Login
//   async signInWithGoogle(redirectToPath: string = '/user/offers') {
//     const supabase = createClient()
//     return await supabase.auth.signInWithOAuth({
//       provider: 'google',
//       options: {
//         redirectTo: `${window.location.origin}${redirectToPath}`,
//       },
//     })
//   },

//   // Email & Password Login
//   async signInWithEmail(email: string, password: string) {
//     const supabase = createClient()
//     return await supabase.auth.signInWithPassword({ email, password })
//   },

//   // Sign Up New User
//   async signUp(email: string, password: string, fullName?: string) {
//     const supabase = createClient()
//     return await supabase.auth.signUp({
//       email,
//       password,
//       options: {
//         data: { full_name: fullName },
//         emailRedirectTo: `${window.location.origin}/auth/callback`,
//       },
//     })
//   },

//   // Sign Out
//   async signOut() {
//     const supabase = createClient()
//     return await supabase.auth.signOut()
//   },

//   // Get Current Logged-in User Session
//   async getCurrentUser() {
//     const supabase = createClient()
//     const {
//       data: { user },
//       error,
//     } = await supabase.auth.getUser()
//     if (error) return null
//     return user
//   },
// }

// // ==========================================
// // 3. Food App Data Helpers
// // ==========================================

// /**
//  * Fetch active offers joined with restaurant and category details.
//  */
// export async function getActiveOffers(categoryId?: string) {
//   const supabase = createClient()
//   let query = supabase
//     .from('offers')
//     .select(`
//       *,
//       restaurants (
//         *,
//         categories (*)
//       ),
//       reviews (*),
//       user_coupons (*)
//     `)
//     .gte('valid_till', new Date().toISOString())
//     .eq('approval_status', true)

//   if (categoryId && categoryId !== 'All') {
//     query = query.eq('restaurants.category_id', categoryId)
//   }

//   const { data, error } = await query
//   return { data, error }
// }

// /**
//  * Toggle saving/unsaving an offer for a user using user_offers table.
//  */
// export async function toggleSaveOffer(userId: string, offerId: string, isSaved: boolean) {
//   const supabase = createClient()

//   if (isSaved) {
//     return await supabase
//       .from('user_offers')
//       .delete()
//       .eq('user_id', userId)
//       .eq('offer_id', offerId)
//   } else {
//     return await supabase
//       .from('user_offers')
//       // @ts-ignore - bypasses strict TypeScript constraints if database.ts defines user_offers insert restrictively
//       .insert({ user_id: userId, offer_id: offerId })
//   }
// }

// /**
//  * Fetch categories for the filter carousel.
//  */
// export async function getCategories() {
//   const supabase = createClient()
//   const { data, error } = await supabase
//     .from('categories')
//     .select('*')
//     .order('name', { ascending: true })

//   return { data, error }
// }

// /**
//  * Fetch active promotional ads for hero banners.
//  */
// export async function getAdminAds() {
//   const supabase = createClient()
//   const { data, error } = await supabase
//     .from('admin_ads')

//     .select('*')
//     .eq('is_active', true)

//   return { data, error }
// }

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// 1. Core Browser Client Initializer
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return createBrowserClient<Database>(url, anonKey)
}

// ==========================================
// 2. Authentication Helpers
// ==========================================

export const authBackend = {
  // Google OAuth Login
  async signInWithGoogle(redirectToPath: string = '/user/offers') {
    const supabase = createClient()
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${redirectToPath}`,
      },
    })
  },

  // Email & Password Login
  async signInWithEmail(email: string, password: string) {
    const supabase = createClient()
    return await supabase.auth.signInWithPassword({ email, password })
  },

  // Sign Up New User
  async signUp(email: string, password: string, fullName?: string) {
    const supabase = createClient()
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  },

  // Sign Out
  async signOut() {
    const supabase = createClient()
    return await supabase.auth.signOut()
  },

  // Get Current Logged-in User Session
  async getCurrentUser() {
    const supabase = createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error) return null
    return user
  },
}

// ==========================================
// 3. Food App & Community Data Helpers
// ==========================================

/**
 * Fetch active offers joined with restaurant and category details.
 */
export async function getActiveOffers(categoryId?: string) {
  const supabase = createClient()
  let query = supabase
    .from('offers')
    .select(`
      *,
      restaurants (
        *,
        categories (*)
      ),
      reviews (*),
      user_coupons (*)
    `)
    .gte('valid_till', new Date().toISOString())
    .eq('approval_status', true)

  if (categoryId && categoryId !== 'All') {
    query = query.eq('restaurants.category_id', categoryId)
  }

  const { data, error } = await query
  return { data, error }
}

/**
 * Toggle saving/unsaving an offer for a user using user_offers table.
 */
export async function toggleSaveOffer(userId: string, offerId: string, isSaved: boolean) {
  const supabase = createClient()

  if (isSaved) {
    return await supabase
      .from('user_offers')
      .delete()
      .eq('user_id', userId)
      .eq('offer_id', offerId)
  } else {
    return await supabase
      .from('user_offers')
      // @ts-ignore - bypasses strict TypeScript constraints if database.ts defines user_offers insert restrictively
      .insert({ user_id: userId, offer_id: offerId })
  }
}

/**
 * Fetch categories for the filter carousel.
 */
export async function getCategories() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  return { data, error }
}

/**
 * Fetch active promotional ads for hero banners.
 */
export async function getAdminAds() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('admin_ads')
    .select('*')
    .eq('is_active', true)

  return { data, error }
}
