import type { ReactNode } from 'react'

interface Props {
  title: string
  description: string
  children: ReactNode
  size?: 'compact' | 'wide'
}

export default function AuthPageShell({ title, description, children, size = 'compact' }: Props) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-col items-center justify-center px-4 py-10 sm:px-6">
      <div className={`w-full ${size === 'wide' ? 'max-w-xl' : 'max-w-[460px]'}`}>
        <header className="mb-6 text-center">
          <p className="esr-eyebrow">ESR Pakistan</p>
          <h1 className="mt-3 text-4xl font-normal sm:text-5xl">{title}</h1>
          <p className="mx-auto mt-3 max-w-md text-base leading-7 text-[var(--muted)]">{description}</p>
        </header>
        {children}
      </div>
    </main>
  )
}
