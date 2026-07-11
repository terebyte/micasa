const krw = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' })

// The store keeps money in cents (minor units x100); the UI edits whole won.
export function centsToWon(cents: number | null | undefined): number | '' {
  if (cents === null || cents === undefined) return ''
  return Math.round(cents / 100)
}

export function wonToCents(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}

export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '-'
  return krw.format(Math.round(cents / 100))
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  return iso.slice(0, 10)
}

export function toDateInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : ''
}

export function fromDateInput(value: string): string | null {
  return value ? `${value}T00:00:00Z` : null
}

export function isOverdue(iso: string | null | undefined): boolean {
  if (!iso) return false
  return new Date(iso).getTime() < Date.now()
}
