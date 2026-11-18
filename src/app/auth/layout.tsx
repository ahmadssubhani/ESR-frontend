import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Welcome to the table | ESR',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
