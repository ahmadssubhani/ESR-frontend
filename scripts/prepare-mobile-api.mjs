#!/usr/bin/env node
/**
 * ESR Mobile API + Swagger pipeline
 *
 * 1. Ensures every Next.js /api route uses Bearer-friendly auth (getApiUser)
 * 2. Scans all REST endpoints (Next + Flask JSON)
 * 3. Generates openapi/openapi.yaml, openapi/openapi.json, openapi/mobile-api-manifest.json
 *
 * Usage:
 *   node scripts/prepare-mobile-api.mjs
 *   node scripts/prepare-mobile-api.mjs --check   (exit 1 if generated files would change)
 *   node scripts/prepare-mobile-api.mjs --no-patch (scan + swagger only)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const API_ROOT = path.join(ROOT, 'src', 'app', 'api')
const FLASK_ROOT = path.join(ROOT, '..', 'esr-flask-admin')
const OPENAPI_DIR = path.join(ROOT, 'openapi')

const args = new Set(process.argv.slice(2))
const CHECK_ONLY = args.has('--check')
const NO_PATCH = args.has('--no-patch')

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
const JSON_SCHEMA = { type: 'object', additionalProperties: true }
const ERR_SCHEMA = { type: 'object', properties: { error: { type: 'string' } } }
const BEARER = [{ bearerAuth: [] }]
const PUBLIC = []
const FLASK_SESSION = [{ flaskSession: [] }]

/** Human-readable summaries (merged with auto-generated entries). */
const ENRICHMENTS = JSON.parse(
  fs.readFileSync(path.join(OPENAPI_DIR, 'enrichments.json'), 'utf8')
)

function log(section, msg) {
  console.log(`[${section}] ${msg}`)
}

function routeFileToOpenApiPath(relativeFromApi) {
  const segments = relativeFromApi.split(path.sep).filter(Boolean)
  if (segments[segments.length - 1] === 'route.ts') segments.pop()
  const openApiSegs = segments.map((s) => {
    const m = s.match(/^\[(.+)\]$/)
    return m ? `{${m[1]}}` : s
  })
  return `/api/${openApiSegs.join('/')}`.replace(/\/+/g, '/')
}

function scanRouteFile(absPath) {
  const text = fs.readFileSync(absPath, 'utf8')
  const rel = path.relative(API_ROOT, absPath)
  const openApiPath = routeFileToOpenApiPath(rel)
  const methods = HTTP_METHODS.filter((m) =>
    new RegExp(`export\\s+async\\s+function\\s+${m}\\b`).test(text)
  )
  const usesAuth =
    /getApiUser\s*\(/.test(text) ||
    /auth\.getUser\s*\(/.test(text) ||
    /Unauthorized/.test(text)
  const isAdmin = openApiPath.startsWith('/api/admin/')
  const needsPatch =
    /supabase\.auth\.getUser\s*\(\s*\)/.test(text) ||
    (/getApiUser\s*\(/.test(text) && !/getApiUser/.test(text.split("from '@/lib/supabase/server'")[0] + "from '@/lib/supabase/server'"))
  return { absPath, rel, openApiPath, methods, usesAuth, isAdmin, text, needsPatch: /supabase\.auth\.getUser\s*\(\s*\)/.test(text) }
}

function walkApiRoutes(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    if (fs.statSync(full).isDirectory()) walkApiRoutes(full, acc)
    else if (name === 'route.ts') acc.push(scanRouteFile(full))
  }
  return acc
}

function patchMobileAuth(routes) {
  let patched = 0
  for (const r of routes) {
    if (r.openApiPath === '/api/openapi.json') continue
    let text = r.text
    let changed = false

    if (/supabase\.auth\.getUser\s*\(\s*\)/.test(text)) {
      text = text.replace(/await supabase\.auth\.getUser\s*\(\s*\)/g, 'await getApiUser(supabase)')
      changed = true
    }

    const supabaseImports = text.match(/import \{([^}]+)\} from '@\/lib\/supabase\/server'/g) || []
    const hasGetApiUserImport = supabaseImports.some((line) => line.includes('getApiUser'))
    if (/getApiUser\s*\(/.test(text) && !hasGetApiUserImport) {
      text = text.replace(
        /import \{([^}]+)\} from '@\/lib\/supabase\/server'/,
        (_, imports) => {
          const parts = imports.split(',').map((s) => s.trim()).filter(Boolean)
          if (!parts.includes('getApiUser')) parts.push('getApiUser')
          return `import { ${parts.join(', ')} } from '@/lib/supabase/server'`
        }
      )
      changed = true
    }
    // Remove accidental duplicate supabase/server import lines
    const lines = text.split('\n')
    let seenSupabase = false
    text = lines
      .filter((line) => {
        if (!line.includes("from '@/lib/supabase/server'")) return true
        if (seenSupabase) return false
        seenSupabase = true
        return true
      })
      .join('\n')
    if (text !== r.text && changed) {
      /* deduped */
    }

    if (changed && !CHECK_ONLY && !NO_PATCH) {
      fs.writeFileSync(r.absPath, text, 'utf8')
      patched++
      log('patch', `mobile auth → ${r.rel}`)
    } else if (changed && CHECK_ONLY) {
      log('check', `would patch ${r.rel}`)
      patched++
    }
  }
  return patched
}

function scanFlaskJsonRoutes() {
  const routes = [
    {
      openApiPath: '/api/health',
      methods: ['GET', 'OPTIONS'],
      isAdmin: false,
      usesAuth: false,
      source: 'flask:factory.py',
    },
    {
      openApiPath: '/api/live/pulse',
      methods: ['GET'],
      isAdmin: true,
      usesAuth: true,
      source: 'flask:routes/live.py',
    },
    {
      openApiPath: '/api/live/vouchers',
      methods: ['GET'],
      isAdmin: true,
      usesAuth: true,
      source: 'flask:routes/live.py',
    },
  ]
  return routes
}

function tagForPath(p) {
  if (p.startsWith('/api/auth')) return 'Auth'
  if (p.startsWith('/api/admin')) return 'Admin'
  if (p.startsWith('/api/me')) return 'Me'
  if (p.startsWith('/api/devices')) return 'Devices'
  if (p.startsWith('/api/profile')) return 'Profile'
  if (p.startsWith('/api/restaurants')) return 'Restaurants'
  if (p.startsWith('/api/offers')) return 'Offers'
  if (p.startsWith('/api/coupons')) return 'Coupons'
  if (p.startsWith('/api/reviews')) return 'Reviews'
  if (p.startsWith('/api/wishlist')) return 'Wishlist'
  if (p.startsWith('/api/feed')) return 'Feed'
  if (p.startsWith('/api/ads')) return 'Ads'
  if (p.startsWith('/api/version')) return 'Meta'
  if (p.startsWith('/api/live') || p === '/api/health') return 'Flask'
  return 'API'
}

function securityForRoute(pathKey, method, meta) {
  if (meta.source?.startsWith('flask') && meta.isAdmin) return FLASK_SESSION
  if (pathKey.startsWith('/api/auth/login') || pathKey.startsWith('/api/auth/signup') || pathKey.startsWith('/api/auth/refresh')) {
    return method === 'OPTIONS' ? PUBLIC : PUBLIC
  }
  if (pathKey === '/api/health') return PUBLIC
  if (pathKey === '/api/openapi.json') return PUBLIC
  if (meta.isAdmin) return BEARER
  if (meta.usesAuth && method !== 'GET') return BEARER
  if (meta.usesAuth && method === 'GET' && (pathKey.includes('/profile') || pathKey.includes('/wishlist') || pathKey.startsWith('/api/me') || pathKey.startsWith('/api/admin'))) {
    return BEARER
  }
  if (pathKey.startsWith('/api/coupons/') && method !== 'OPTIONS') return BEARER
  return PUBLIC
}

function pathParameters(openApiPath) {
  const params = []
  for (const part of openApiPath.split('/')) {
    if (part.startsWith('{') && part.endsWith('}')) {
      params.push({
        name: part.slice(1, -1),
        in: 'path',
        required: true,
        schema: { type: 'string' },
      })
    }
  }
  return params
}

function buildOperation(pathKey, method, meta) {
  const key = `${method} ${pathKey}`
  const enrichment = ENRICHMENTS[key] || {}
  const summary =
    enrichment.summary ||
    `${method} ${pathKey.replace('/api/', '').replace(/\//g, ' ')}`.trim()
  const parameters = [...pathParameters(pathKey), ...(enrichment.parameters || [])]
  const op = {
    summary,
    description: enrichment.description || 'Mobile-ready REST endpoint. Send `Authorization: Bearer <access_token>` when security is required.',
    tags: [enrichment.tag || tagForPath(pathKey)],
    security: securityForRoute(pathKey, method, meta),
    responses: enrichment.responses || {
      '200': { description: 'OK', content: { 'application/json': { schema: JSON_SCHEMA } } },
      '401': { description: 'Unauthorized', content: { 'application/json': { schema: ERR_SCHEMA } } },
    },
  }
  if (meta.isAdmin) op['x-admin-only'] = true
  if (parameters.length) op.parameters = parameters
  if (enrichment.requestBody) op.requestBody = enrichment.requestBody
  if (method === 'POST' && pathKey.startsWith('/api/auth/')) {
    op.requestBody = enrichment.requestBody || {
      required: true,
      content: { 'application/json': { schema: JSON_SCHEMA } },
    }
  }
  return { [method.toLowerCase()]: op }
}

function buildOpenApiDocument(nextRoutes, flaskRoutes) {
  const paths = {}

  for (const r of nextRoutes) {
    if (r.openApiPath === '/api/openapi.json') {
      paths[r.openApiPath] = {
        ...buildOperation(r.openApiPath, 'GET', { usesAuth: false, isAdmin: false }),
      }
      continue
    }
    for (const method of r.methods) {
      if (!paths[r.openApiPath]) paths[r.openApiPath] = {}
      Object.assign(
        paths[r.openApiPath],
        buildOperation(r.openApiPath, method, {
          usesAuth: r.usesAuth,
          isAdmin: r.isAdmin,
          source: `next:${r.rel}`,
        })
      )
    }
  }

  for (const r of flaskRoutes) {
    for (const method of r.methods) {
      if (!paths[r.openApiPath]) paths[r.openApiPath] = {}
      Object.assign(
        paths[r.openApiPath],
        buildOperation(r.openApiPath, method, {
          usesAuth: r.usesAuth,
          isAdmin: r.isAdmin,
          source: r.source,
        })
      )
    }
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'ESR Mobile & REST API',
      version: '1.0.0',
      description:
        'Auto-generated from `npm run mobile:api`. Covers esr-web-frontend `/api/*` and Flask JSON routes. MY-esr duplicate folder is excluded. Authenticate with Bearer JWT from Supabase or `POST /api/auth/login`.',
    },
    servers: [
      { url: 'https://esr-web-frontend.vercel.app', description: 'Production (Next.js)' },
      { url: 'http://localhost:3000', description: 'Local Next.js' },
      { url: 'https://esr-flask-admin.vercel.app', description: 'Flask JSON (if deployed)' },
      { url: 'http://localhost:5000', description: 'Local Flask admin' },
    ],
    tags: [
      { name: 'Auth', description: 'Login, signup, token refresh' },
      { name: 'Profile' },
      { name: 'Me', description: 'Current user vouchers & reviews' },
      { name: 'Devices', description: 'Push token registration' },
      { name: 'Restaurants' },
      { name: 'Offers' },
      { name: 'Coupons' },
      { name: 'Reviews' },
      { name: 'Wishlist' },
      { name: 'Feed' },
      { name: 'Ads' },
      { name: 'Admin', description: 'Admin or owner role required' },
      { name: 'Meta' },
      { name: 'Flask', description: 'esr-flask-admin JSON endpoints' },
      { name: 'API' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Supabase access_token',
        },
        flaskSession: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session',
          description: 'Flask admin session after HTML login',
        },
      },
      schemas: {
        Error: ERR_SCHEMA,
        JsonObject: JSON_SCHEMA,
      },
    },
    paths,
  }
}

function writeOutputs(doc, nextRoutes, flaskRoutes) {
  fs.mkdirSync(OPENAPI_DIR, { recursive: true })
  const jsonPath = path.join(OPENAPI_DIR, 'openapi.json')
  const yamlPath = path.join(OPENAPI_DIR, 'openapi.yaml')
  const manifestPath = path.join(OPENAPI_DIR, 'mobile-api-manifest.json')

  const jsonContent = JSON.stringify(doc, null, 2) + '\n'
  const yamlContent = yaml.stringify(doc)
  const manifest = {
    generatedAt: new Date().toISOString(),
    mobileBaseUrl: 'https://esr-web-frontend.vercel.app/api',
    auth: {
      bearerHeader: 'Authorization: Bearer <access_token>',
      login: 'POST /api/auth/login',
      signup: 'POST /api/auth/signup',
      refresh: 'POST /api/auth/refresh',
      logout: 'POST /api/auth/logout',
      orUseSupabaseSdk: true,
    },
    swaggerUi: '/api-docs',
    openApiJson: '/api/openapi.json',
    endpoints: [
      ...nextRoutes
        .filter((r) => r.openApiPath !== '/api/openapi.json')
        .flatMap((r) =>
          r.methods.map((m) => ({
            method: m,
            path: r.openApiPath,
            admin: r.isAdmin,
            auth: r.usesAuth,
            source: 'next',
            file: r.rel.replace(/\\/g, '/'),
          }))
        ),
      ...flaskRoutes.flatMap((r) =>
        r.methods.map((m) => ({
          method: m,
          path: r.openApiPath,
          admin: r.isAdmin,
          auth: r.usesAuth,
          source: 'flask',
        }))
      ),
    ],
  }
  const manifestContent = JSON.stringify(manifest, null, 2) + '\n'

  if (CHECK_ONLY) {
    const drift =
      (!fs.existsSync(jsonPath) || fs.readFileSync(jsonPath, 'utf8') !== jsonContent) ||
      (!fs.existsSync(yamlPath) || fs.readFileSync(yamlPath, 'utf8') !== yamlContent)
    if (drift) {
      log('check', 'OpenAPI files out of date — run npm run mobile:api')
      process.exitCode = 1
    }
    return
  }

  fs.writeFileSync(jsonPath, jsonContent, 'utf8')
  fs.writeFileSync(yamlPath, yamlContent, 'utf8')
  fs.writeFileSync(manifestPath, manifestContent, 'utf8')
  log('write', jsonPath)
  log('write', yamlPath)
  log('write', manifestPath)
}

async function main() {
  log('start', 'ESR mobile API + Swagger pipeline (MY-esr excluded)')

  const nextRoutes = walkApiRoutes(API_ROOT)
  log('scan', `${nextRoutes.length} Next.js route files under src/app/api`)

  const patchCount = patchMobileAuth(nextRoutes)
  log('patch', `${patchCount} file(s) ${CHECK_ONLY ? 'need' : 'updated for'} Bearer auth`)

  if (!CHECK_ONLY && !NO_PATCH) {
    const { execSync } = await import('child_process')
    execSync('node scripts/dedupe-api-imports.mjs', { cwd: ROOT, stdio: 'inherit' })
  }

  const flaskRoutes = scanFlaskJsonRoutes()
  log('scan', `${flaskRoutes.length} Flask JSON route groups`)

  const doc = buildOpenApiDocument(nextRoutes, flaskRoutes)
  const pathCount = Object.keys(doc.paths).length
  const opCount = Object.values(doc.paths).reduce(
    (n, p) => n + Object.keys(p).length,
    0
  )
  log('openapi', `${pathCount} paths, ${opCount} operations`)

  writeOutputs(doc, nextRoutes, flaskRoutes)

  log('done', 'Swagger UI → /api-docs  |  OpenAPI → /api/openapi.json')
  log('done', 'Run: npm run mobile:api  (or --check in CI)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
