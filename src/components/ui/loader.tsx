'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type SpinnerProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
}

export function Spinner({ className, size = 'md' }: SpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin text-red-600', sizeMap[size], className)}
      aria-hidden
    />
  )
}

export function ButtonLoader({ label = 'Please wait…' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Spinner size="sm" className="text-current" />
      <span>{label}</span>
    </span>
  )
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-gray-600">
      <Spinner size="lg" />
      <p className="text-sm font-semibold">{label}</p>
    </div>
  )
}

export function FullPageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm">
      <Spinner size="lg" />
      <p className="text-sm font-bold text-gray-700">{label}</p>
    </div>
  )
}

export function InlineLoader({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
      <Spinner size="sm" />
      {label ? <span className="text-xs font-semibold">{label}</span> : null}
    </div>
  )
}

/** Skeleton card grid for offers / lists */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-red-100 bg-white overflow-hidden">
          <div className="h-44 bg-red-50" />
          <div className="p-4 space-y-3">
            <div className="h-3 w-1/3 rounded bg-gray-200" />
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-4 w-1/2 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  )
}
