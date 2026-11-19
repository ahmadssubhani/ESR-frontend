export type DemoRole = 'Diner' | 'Admin' | 'Restaurant'

const DEMO_ROLE_KEY = 'esr_demo_role'
const DEMO_ROLE_EVENT = 'esr-demo-role-updated'

export function getDemoRole() {
  if (typeof window === 'undefined') return null
  const role = localStorage.getItem(DEMO_ROLE_KEY)
  return role === 'Diner' || role === 'Admin' || role === 'Restaurant' ? role : null
}

export function subscribeToDemoRole(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener(DEMO_ROLE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(DEMO_ROLE_EVENT, onChange)
  }
}

export function startDemoSession(role: DemoRole) {
  localStorage.setItem(DEMO_ROLE_KEY, role)
  window.dispatchEvent(new Event(DEMO_ROLE_EVENT))
}

export function endDemoSession() {
  localStorage.removeItem(DEMO_ROLE_KEY)
  window.dispatchEvent(new Event(DEMO_ROLE_EVENT))
}

