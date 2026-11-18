'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

function getPageTitle(pathname: string) {
  if (pathname === '/user/offers' || pathname === '/discover') return 'Discover restaurants | ESR'
  if (pathname.startsWith('/user/foodies-feed')) return 'Foodie Feed | ESR'
  if (pathname === '/auth/login') return 'Welcome to the table | ESR'
  if (pathname === '/') return 'ESR – Discover Restaurant Deals'
  return 'ESR – Discover Restaurant Deals'
}

export default function RouteAccessibility() {
  const pathname = usePathname()
  const previousPath = useRef(pathname)

  useEffect(() => {
    document.title = getPageTitle(pathname)
    if (previousPath.current !== pathname) {
      previousPath.current = pathname
      requestAnimationFrame(() => {
        const heading = document.querySelector<HTMLElement>('main h1, h1')
        if (!heading) return
        heading.tabIndex = -1
        heading.focus({ preventScroll: true })
      })
    }
  }, [pathname])

  return null
}
