/**
 * Seed demo restaurants + approved offers into Supabase.
 * Usage: npx tsx scripts/seed-demo-offers.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // ignore
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const RESTAURANT_IDS = {
  spice: '11111111-1111-4111-8111-111111111101',
  burger: '11111111-1111-4111-8111-111111111102',
  cafe: '11111111-1111-4111-8111-111111111103',
  pizza: '11111111-1111-4111-8111-111111111104',
  chinese: '11111111-1111-4111-8111-111111111105',
  bakery: '11111111-1111-4111-8111-111111111106',
} as const

async function ensureCategories() {
  const names = ['Restaurant', 'Cafe', 'Bakery', 'Pizza', 'Fast Food', 'Chinese', 'Desi']
  for (const name of names) {
    const { error } = await supabase.from('categories').upsert({ name }, { onConflict: 'name' })
    if (error) throw new Error(`categories: ${error.message}`)
  }
  const { data, error } = await supabase.from('categories').select('id, name')
  if (error) throw new Error(error.message)
  const map = new Map((data || []).map((c) => [c.name, c.id]))
  return map
}

async function main() {
  console.log('Seeding demo offers into', url)

  const categories = await ensureCategories()

  const restaurants = [
    {
      id: RESTAURANT_IDS.spice,
      name: 'Spice Bazaar',
      description: 'Contemporary Pakistani dining with signature grills.',
      address: 'MM Alam Road, Gulberg',
      city: 'Lahore',
      country: 'PK',
      lat: 31.5204,
      lng: 74.3587,
      cover_url:
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
      price_level: 'HIGH',
      restaurant_type: 'DINE IN & TAKE AWAY & DELIVERY',
      is_featured: true,
      is_active: true,
      category_id: categories.get('Desi') ?? null,
      tags: ['grill', 'desi', 'family'],
    },
    {
      id: RESTAURANT_IDS.burger,
      name: 'Burger Craft',
      description: 'Smash burgers and loaded fries.',
      address: 'Packages Mall area',
      city: 'Lahore',
      country: 'PK',
      lat: 31.4715,
      lng: 74.356,
      cover_url:
        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
      price_level: 'MEDIUM',
      restaurant_type: 'DINE IN & TAKE AWAY & DELIVERY',
      is_featured: true,
      is_active: true,
      category_id: categories.get('Fast Food') ?? null,
      tags: ['burger', 'fast food'],
    },
    {
      id: RESTAURANT_IDS.cafe,
      name: 'Café Aylanto',
      description: 'Coffee, brunch and desserts.',
      address: 'MM Alam Road',
      city: 'Lahore',
      country: 'PK',
      lat: 31.522,
      lng: 74.351,
      cover_url:
        'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
      price_level: 'HIGH',
      restaurant_type: 'DINE IN ONLY',
      is_featured: false,
      is_active: true,
      category_id: categories.get('Cafe') ?? null,
      tags: ['cafe', 'brunch'],
    },
    {
      id: RESTAURANT_IDS.pizza,
      name: "Pizza 4P's",
      description: 'Wood-fired pizzas and pasta.',
      address: 'Mall Road',
      city: 'Lahore',
      country: 'PK',
      lat: 31.565,
      lng: 74.329,
      cover_url:
        'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
      price_level: 'MEDIUM',
      restaurant_type: 'DINE IN & DELIVERY',
      is_featured: true,
      is_active: true,
      category_id: categories.get('Pizza') ?? null,
      tags: ['pizza', 'italian'],
    },
    {
      id: RESTAURANT_IDS.chinese,
      name: 'Dragon Wok',
      description: 'Chinese classics and dim sum.',
      address: 'Liberty Market',
      city: 'Lahore',
      country: 'PK',
      lat: 31.51,
      lng: 74.342,
      cover_url:
        'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=800&q=80',
      price_level: 'MEDIUM',
      restaurant_type: 'DINE IN & TAKE AWAY',
      is_featured: false,
      is_active: true,
      category_id: categories.get('Chinese') ?? null,
      tags: ['chinese', 'noodles'],
    },
    {
      id: RESTAURANT_IDS.bakery,
      name: 'Oven & Dough',
      description: 'Artisan breads and pastries.',
      address: 'DHA Phase 5',
      city: 'Lahore',
      country: 'PK',
      lat: 31.47,
      lng: 74.41,
      cover_url:
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
      price_level: 'LOW',
      restaurant_type: 'TAKE AWAY & DELIVERY',
      is_featured: false,
      is_active: true,
      category_id: categories.get('Bakery') ?? null,
      tags: ['bakery', 'pastry'],
    },
  ]

  const { error: restErr } = await supabase.from('restaurants').upsert(restaurants, {
    onConflict: 'id',
  })
  if (restErr) throw new Error(`restaurants: ${restErr.message}`)

  const restaurantIdList = Object.values(RESTAURANT_IDS)
  await supabase.from('offers').delete().in('restaurant_id', restaurantIdList)

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000
  const iso = (offsetDays: number) => new Date(now + offsetDays * day).toISOString()

  const offers = [
    {
      id: '22222222-2222-4222-8222-222222222201',
      restaurant_id: RESTAURANT_IDS.spice,
      name: 'Grill Platter for Two',
      description: 'Mixed grill with naan and chutneys. Valid dine-in.',
      original_price: 4999,
      discounted_price: 3499,
      image_url:
        'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
      valid_from: iso(-1),
      valid_till: iso(90),
      approval_status: true,
      is_bumper: false,
      is_redeemable: true,
    },
    {
      id: '22222222-2222-4222-8222-222222222202',
      restaurant_id: RESTAURANT_IDS.spice,
      name: 'Weekday Lunch Thali',
      description: 'Chef thali with dessert. Mon–Thu only.',
      original_price: 1899,
      discounted_price: 1299,
      image_url:
        'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80',
      valid_from: iso(-2),
      valid_till: iso(60),
      approval_status: true,
      is_bumper: false,
      is_redeemable: true,
    },
    {
      id: '22222222-2222-4222-8222-222222222203',
      restaurant_id: RESTAURANT_IDS.burger,
      name: 'Smash Cheeseburger Deal',
      description: 'Double smash burger + fries + drink.',
      original_price: 1599,
      discounted_price: 999,
      image_url:
        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
      valid_from: iso(-1),
      valid_till: iso(45),
      approval_status: true,
      is_bumper: false,
      is_redeemable: true,
    },
    {
      id: '22222222-2222-4222-8222-222222222204',
      restaurant_id: RESTAURANT_IDS.burger,
      name: 'Family Burger Box',
      description: '4 burgers + large fries.',
      original_price: 3499,
      discounted_price: 2499,
      image_url:
        'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
      valid_from: iso(-3),
      valid_till: iso(30),
      approval_status: true,
      is_bumper: false,
      is_redeemable: true,
    },
    {
      id: '22222222-2222-4222-8222-222222222205',
      restaurant_id: RESTAURANT_IDS.cafe,
      name: 'Weekend Brunch Special',
      description: 'Eggs Benedict + coffee for two.',
      original_price: 2999,
      discounted_price: 2199,
      image_url:
        'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=800&q=80',
      valid_from: iso(-1),
      valid_till: iso(50),
      approval_status: true,
      is_bumper: false,
      is_redeemable: true,
    },
    {
      id: '22222222-2222-4222-8222-222222222206',
      restaurant_id: RESTAURANT_IDS.pizza,
      name: 'Any Large Pizza 30% Off',
      description: 'Dine-in or takeaway. Extra toppings excluded.',
      original_price: 2499,
      discounted_price: 1749,
      image_url:
        'https://images.unsplash.com/photo-1574071318508-1cdbab80d264?auto=format&fit=crop&w=800&q=80',
      valid_from: iso(-4),
      valid_till: iso(40),
      approval_status: true,
      is_bumper: false,
      is_redeemable: true,
    },
    {
      id: '22222222-2222-4222-8222-222222222207',
      restaurant_id: RESTAURANT_IDS.pizza,
      name: 'Pasta Night Duo',
      description: 'Two pastas + garlic bread.',
      original_price: 3299,
      discounted_price: 2299,
      image_url:
        'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=800&q=80',
      valid_from: iso(-2),
      valid_till: iso(35),
      approval_status: true,
      is_bumper: false,
      is_redeemable: true,
    },
    {
      id: '22222222-2222-4222-8222-222222222208',
      restaurant_id: RESTAURANT_IDS.chinese,
      name: 'Dim Sum Basket Deal',
      description: '12-piece steamer basket + soup.',
      original_price: 2799,
      discounted_price: 1899,
      image_url:
        'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=800&q=80',
      valid_from: iso(-1),
      valid_till: iso(55),
      approval_status: true,
      is_bumper: false,
      is_redeemable: true,
    },
    {
      id: '22222222-2222-4222-8222-222222222209',
      restaurant_id: RESTAURANT_IDS.bakery,
      name: 'Fresh Pastry Box',
      description: '6 assorted pastries.',
      original_price: 1499,
      discounted_price: 999,
      image_url:
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
      valid_from: iso(-1),
      valid_till: iso(25),
      approval_status: true,
      is_bumper: false,
      is_redeemable: true,
    },
    {
      id: '22222222-2222-4222-8222-222222222299',
      restaurant_id: RESTAURANT_IDS.spice,
      name: 'Bumper Friday Feast',
      description: 'Limited bumper deal — bumper carousel only.',
      original_price: 7999,
      discounted_price: 4999,
      image_url:
        'https://images.unsplash.com/photo-1555939594-58ed7bd19a8e?auto=format&fit=crop&w=800&q=80',
      valid_from: iso(-1),
      valid_till: iso(14),
      approval_status: true,
      is_bumper: true,
      is_redeemable: true,
    },
  ]

  const { error: offerErr } = await supabase.from('offers').upsert(offers, { onConflict: 'id' })
  if (offerErr) throw new Error(`offers: ${offerErr.message}`)

  const { count, error: countErr } = await supabase
    .from('offers')
    .select('*', { count: 'exact', head: true })
    .eq('approval_status', true)
    .eq('is_redeemable', true)
    .eq('is_bumper', false)

  if (countErr) throw new Error(countErr.message)

  console.log(`Done. All Offers eligible count: ${count}`)
  console.log('Refresh http://localhost:3000/user/offers')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
