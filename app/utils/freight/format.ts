/** Shared display formatting for freight tables, strips, and badges. */

type Translate = (key: string) => string
type TranslateExists = (key: string) => boolean

/**
 * Compact day cell value: first 10 chars (`YYYY-MM-DD`) with a fallback.
 * Pass `fallback` explicitly when a page needs `''` instead of `—`.
 */
export function shortDay(value: unknown, fallback = '—') {
  const text = String(value ?? '')
  return text ? text.slice(0, 10) : fallback
}

/** Select items for status constants, using `freight.reportCatalog.statuses.*` when present. */
export function labeledStatusOptions(
  values: readonly string[],
  t: Translate,
  te: TranslateExists,
) {
  return values.map((value) => {
    const slug = value.toLowerCase().replaceAll(' ', '_')
    const key = `freight.reportCatalog.statuses.${slug}`
    return {
      label: te(key) ? String(t(key)) : value.replaceAll('_', ' '),
      value,
    }
  })
}

/** Title-cased label for UPPER_SNAKE codes (e.g. `CUSTOMER_INVOICE` → `Customer Invoice`). */
export function codeTitle(value: unknown) {
  return String(value ?? '')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, ch => ch.toUpperCase())
}
