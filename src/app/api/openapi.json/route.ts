import { NextRequest } from 'next/server'
import { jsonApi } from '@/lib/api/cors'
import generatedSpec from '../../../../openapi/openapi.json'
import { openApiDocument as fallbackSpec } from '@/lib/openapi/spec'

/** Prefer `openapi/openapi.json` from `npm run mobile:api`. */
const openApiDocument = generatedSpec?.paths ? generatedSpec : fallbackSpec

export async function GET(request: NextRequest) {
  return jsonApi(request, openApiDocument)
}
