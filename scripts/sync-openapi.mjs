import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import yaml from 'yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const specModule = pathToFileURL(path.join(root, 'src/lib/openapi/spec.ts')).href

// ts-node not available — read compiled approach: use dynamic import after build is heavy.
// Write JSON from a duplicated export: load via tsx if present, else read pre-synced json only.
const jsonPath = path.join(root, 'openapi/openapi.json')
const yamlPath = path.join(root, 'openapi/openapi.yaml')

async function main() {
  let doc
  try {
    const { execSync } = await import('child_process')
    const out = execSync('npx --yes tsx -e "import { openApiDocument } from \'./src/lib/openapi/spec.ts\'; console.log(JSON.stringify(openApiDocument))"', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    doc = JSON.parse(out.trim())
  } catch {
    if (fs.existsSync(jsonPath)) {
      doc = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
      console.warn('Used existing openapi/openapi.json (run with tsx to refresh from spec.ts)')
    } else {
      throw new Error('Could not compile spec.ts; install tsx or commit openapi/openapi.json')
    }
  }
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true })
  fs.writeFileSync(jsonPath, JSON.stringify(doc, null, 2))
  fs.writeFileSync(yamlPath, yaml.stringify(doc))
  console.log('Wrote', yamlPath, 'and', jsonPath)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
