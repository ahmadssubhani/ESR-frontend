import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const apiRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', 'api')

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    if (fs.statSync(full).isDirectory()) walk(full, files)
    else if (name === 'route.ts') files.push(full)
  }
  return files
}

for (const file of walk(apiRoot)) {
  let text = fs.readFileSync(file, 'utf8')
  const lines = text.split('\n')
  const kept = []
  let sawSupabaseImport = false
  for (const line of lines) {
    if (line.includes("from '@/lib/supabase/server'")) {
      if (sawSupabaseImport) continue
      sawSupabaseImport = true
      if (!line.includes('getApiUser') && text.includes('getApiUser(')) {
        kept.push(line.replace(/\} from/, ', getApiUser } from'))
        continue
      }
    }
    kept.push(line)
  }
  const next = kept.join('\n')
  if (next !== text) {
    fs.writeFileSync(file, next, 'utf8')
    console.log('fixed', path.relative(apiRoot, file))
  }
}
