/**
 * Apply RLS recursion fix via DATABASE_URL.
 * Usage: npx tsx scripts/fix-rls-recursion.ts
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import pg from 'pg'

function loadEnvLocal() {
  const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    let k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!process.env[k]) process.env[k] = v
  }
}

loadEnvLocal()

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260813_fix_profiles_rls_recursion.sql'),
  'utf8'
)

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('Missing DATABASE_URL in .env.local')
  process.exit(1)
}

const candidates = [
  connectionString,
  // Session pooler (IPv4-friendly) — common Supabase regions
  connectionString.replace(
    '@db.yrgekrxzroveszknetnx.supabase.co:5432',
    '@aws-0-ap-southeast-1.pooler.supabase.com:5432'
  ).replace('postgresql://postgres:', 'postgresql://postgres.yrgekrxzroveszknetnx:'),
  connectionString.replace(
    '@db.yrgekrxzroveszknetnx.supabase.co:5432',
    '@aws-0-ap-south-1.pooler.supabase.com:5432'
  ).replace('postgresql://postgres:', 'postgresql://postgres.yrgekrxzroveszknetnx:'),
  connectionString.replace(
    '@db.yrgekrxzroveszknetnx.supabase.co:5432',
    '@aws-0-eu-central-1.pooler.supabase.com:5432'
  ).replace('postgresql://postgres:', 'postgresql://postgres.yrgekrxzroveszknetnx:'),
  connectionString.replace(
    '@db.yrgekrxzroveszknetnx.supabase.co:5432',
    '@aws-0-us-east-1.pooler.supabase.com:5432'
  ).replace('postgresql://postgres:', 'postgresql://postgres.yrgekrxzroveszknetnx:'),
]

async function tryConnect(cs: string) {
  const client = new pg.Client({
    connectionString: cs,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  return client
}

async function main() {
  let client: pg.Client | null = null
  let lastErr: unknown
  try {
    for (const cs of candidates) {
      try {
        client = await tryConnect(cs)
        console.log('Connected via', cs.replace(/:[^:@]+@/, ':***@'))
        break
      } catch (err) {
        lastErr = err
      }
    }
    if (!client) {
      throw lastErr || new Error('Could not connect to database')
    }
    await client.query(sql)
    console.log('RLS recursion fix applied.')
  } finally {
    if (client) {
      try {
        await client.end()
      } catch {
        // ignore
      }
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
