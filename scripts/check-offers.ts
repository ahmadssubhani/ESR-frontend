import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const raw = readFileSync('.env.local', 'utf8')
for (const line of raw.split(/\r?\n/)) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i < 0) continue
  let k = t.slice(0, i).trim()
  let v = t.slice(i + 1).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  process.env[k] = v
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY!
const now = new Date().toISOString()

async function run(label: string, key: string) {
  const c = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await c
    .from('offers')
    .select(`id, name, approval_status, is_redeemable, is_bumper, valid_from, valid_till, restaurants(name)`)
    .eq('approval_status', true)
    .eq('is_redeemable', true)
    .eq('is_bumper', false)
    .lte('valid_from', now)
    .gte('valid_till', now)
    .order('created_at', { ascending: false })
    .limit(40)
  console.log('\n==', label, '==')
  console.log('error', error)
  console.log('count', data?.length ?? 0)
  console.log('names', (data || []).map((o: { name: string }) => o.name))
}

async function main() {
  await run('service', svc)
  await run('anon', anon)

  const admin = createClient(url, svc, { auth: { persistSession: false } })
  const all = await admin.from('offers').select('id,name,approval_status,is_redeemable,is_bumper')
  console.log('\n== all raw ==', all.data?.length, all.error)
  console.log(all.data)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
