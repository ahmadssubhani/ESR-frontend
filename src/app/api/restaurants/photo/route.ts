import { NextRequest, NextResponse } from 'next/server'
import { getGooglePlacesKey } from '@/lib/google-places'

/**
 * Proxies Google Place Photos so the API key never ships to the browser.
 * Usage:
 *   /api/restaurants/photo?kind=legacy&ref=PHOTO_REFERENCE
 *   /api/restaurants/photo?kind=new&ref=places%2FPLACE_ID%2Fphotos%2FPHOTO_ID
 */
export async function GET(request: NextRequest) {
  const key = getGooglePlacesKey()
  if (!key) {
    return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 503 })
  }

  const ref = request.nextUrl.searchParams.get('ref')
  const kind = request.nextUrl.searchParams.get('kind') || 'legacy'

  if (!ref) {
    return NextResponse.json({ error: 'Missing photo ref' }, { status: 400 })
  }

  let googleUrl: string
  if (kind === 'new') {
    // ref is like "places/ChIJ.../photos/AX..."
    const name = ref.replace(/\/media$/, '')
    googleUrl =
      `https://places.googleapis.com/v1/${name}/media` +
      `?maxWidthPx=800&skipHttpRedirect=false&key=${encodeURIComponent(key)}`
  } else {
    googleUrl =
      `https://maps.googleapis.com/maps/api/place/photo` +
      `?maxwidth=800` +
      `&photo_reference=${encodeURIComponent(ref)}` +
      `&key=${encodeURIComponent(key)}`
  }

  try {
    const upstream = await fetch(googleUrl, {
      redirect: 'follow',
      headers: { Accept: 'image/*' },
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Google photo fetch failed (${upstream.status})` },
        { status: 502 }
      )
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    const buffer = await upstream.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    })
  } catch (err) {
    console.error('Photo proxy error:', err)
    return NextResponse.json({ error: 'Failed to load restaurant photo' }, { status: 502 })
  }
}
