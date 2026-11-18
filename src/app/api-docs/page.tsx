'use client'

import { useEffect, useRef } from 'react'

export default function ApiDocsPage() {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js'
    script.async = true
    script.onload = () => {
      // @ts-expect-error swagger global
      window.SwaggerUIBundle({
        url: '/api/openapi.json',
        dom_id: '#swagger-ui',
        presets: [
          // @ts-expect-error swagger global
          window.SwaggerUIBundle.presets.apis,
          // @ts-expect-error swagger global
          window.SwaggerUIBundle.SwaggerUIStandalonePreset,
        ],
        layout: 'BaseLayout',
        persistAuthorization: true,
      })
    }
    document.body.appendChild(script)
    return () => {
      link.remove()
      script.remove()
    }
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">ESR API Documentation</h1>
        <p className="text-sm text-gray-600 mt-1">
          OpenAPI spec: <a className="text-red-600 underline" href="/api/openapi.json">/api/openapi.json</a>
        </p>
      </header>
      <div id="swagger-ui" ref={host} />
    </div>
  )
}
