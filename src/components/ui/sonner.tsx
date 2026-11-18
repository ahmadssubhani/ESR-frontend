'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      expand={false}
      duration={3500}
      toastOptions={{
        classNames: {
          toast: 'font-sans border shadow-lg',
          title: 'font-semibold text-sm',
          description: 'text-xs',
        },
      }}
    />
  )
}
