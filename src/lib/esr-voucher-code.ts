/** ESR-XXXXX codes, unique per offer + 30-minute UTC window. Same math as Flask admin. */

const MOD = 1_000_000_007

export function voucherTimeBlock(at: Date = new Date()) {
  return Math.floor((at.getUTCHours() * 60 + at.getUTCMinutes()) / 30)
}

export function generateEsrVoucherCode(offerId: string, at: Date = new Date()) {
  if (!offerId) return '—'
  const day = at.toISOString().slice(0, 10)
  const block = voucherTimeBlock(at)
  const seed = `${offerId}|${day}|${block}`
  let n = 0
  for (let i = 0; i < seed.length; i++) {
    n = (n * 31 + seed.charCodeAt(i)) % MOD
  }
  const digits = String(10000 + (n % 90000))
  return `ESR-${digits}`
}

export function msUntilNextVoucherRotation(at: Date = new Date()) {
  const minutes = at.getUTCHours() * 60 + at.getUTCMinutes()
  const intoBlock = minutes % 30
  const remainingMinutes = 30 - intoBlock - 1
  const remainingSeconds = 60 - at.getUTCSeconds()
  return Math.max(0, remainingMinutes * 60 * 1000 + remainingSeconds * 1000)
}

export function formatVoucherCountdown(at: Date = new Date()) {
  const ms = msUntilNextVoucherRotation(at)
  const totalSeconds = Math.floor(ms / 1000)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
