'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      theme="light"
      closeButton
      expand={false}
      duration={3500}
      toastOptions={{
        classNames: {
          toast: 'font-sans border border-[var(--border)] bg-[var(--surface)] text-[var(--plum)] shadow-md',
          title: 'font-semibold text-sm text-[var(--plum)]',
          description: 'text-sm text-[var(--muted)]',
        },
      }}
    />
  )
}
