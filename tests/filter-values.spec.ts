import { describe, expect, it } from 'vitest'
import { matchesFilter, parseFilterQuery } from '../app/utils/filter/values'

describe('parseFilterQuery', () => {
  it('splits comma lists, arrays, and blanks', () => {
    expect(parseFilterQuery('')).toEqual([])
    expect(parseFilterQuery('Draft')).toEqual(['Draft'])
    expect(parseFilterQuery('Draft,Issued')).toEqual(['Draft', 'Issued'])
    expect(parseFilterQuery(['Draft', 'Issued', 'Draft'])).toEqual(['Draft', 'Issued'])
    expect(parseFilterQuery(['Draft,Sent', 'Accepted'])).toEqual(['Draft', 'Sent', 'Accepted'])
    expect(parseFilterQuery({ value: 'Issued' })).toEqual(['Issued'])
  })
})

describe('matchesFilter', () => {
  it('keeps every row when nothing is selected', () => {
    expect(matchesFilter('Draft', [])).toBe(true)
    expect(matchesFilter('Draft', '')).toBe(true)
  })

  it('keeps rows whose value is in the selected list', () => {
    expect(matchesFilter('Draft', ['Draft', 'Issued'])).toBe(true)
    expect(matchesFilter('Cancelled', ['Draft', 'Issued'])).toBe(false)
    expect(matchesFilter('Issued', 'Issued')).toBe(true)
  })
})
