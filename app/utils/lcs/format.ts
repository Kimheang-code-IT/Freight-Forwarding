export function formatLcsMoney(
  value: unknown,
  currency = 'USD',
  locale: string = 'en',
) {
  const amount = Number(value || 0)
  const safe = Number.isFinite(amount) ? amount : 0
  try {
    return new Intl.NumberFormat(locale === 'km' ? 'km-KH' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe)
  }
  catch {
    return `${currency} ${safe.toFixed(2)}`
  }
}

export function formatLcsDate(
  value: unknown,
  locale: string = 'en',
  timeZone = 'Asia/Phnom_Penh',
) {
  const text = String(value || '').trim()
  if (!text) return '—'
  const date = new Date(text.includes('T') ? text : `${text}T00:00:00`)
  if (Number.isNaN(date.getTime())) return text
  return new Intl.DateTimeFormat(locale === 'km' ? 'km-KH' : 'en-US', {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date)
}
