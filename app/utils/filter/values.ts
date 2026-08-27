/** Normalize query/select values into a unique list of filter tokens. */
export function parseFilterQuery(value: unknown): string[] {
  if (value == null || value === '') return []
  if (Array.isArray(value)) {
    return [...new Set(value.flatMap(item => parseFilterQuery(item)))]
  }
  if (typeof value === 'object' && 'value' in value) {
    return parseFilterQuery((value as { value: unknown }).value)
  }
  return [...new Set(
    String(value)
      .split(',')
      .map(part => part.trim())
      .filter(Boolean),
  )]
}

/** True when the row should remain visible for this filter (empty = no restriction). */
export function matchesFilter(rowValue: unknown, selected: unknown): boolean {
  const values = parseFilterQuery(selected)
  if (!values.length) return true
  return values.includes(String(rowValue ?? ''))
}
