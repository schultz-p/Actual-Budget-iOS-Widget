const { isoDateNDaysAgo } = require('../actual-budget-widget')

describe('isoDateNDaysAgo', () => {
  test('returns a string in YYYY-MM-DD format', () => {
    expect(isoDateNDaysAgo(0, '2024-03-15T00:00:00.000Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('returns the same date when n is 0', () => {
    expect(isoDateNDaysAgo(0, '2024-03-15T00:00:00.000Z')).toBe('2024-03-15')
  })

  test('subtracts days within a month', () => {
    expect(isoDateNDaysAgo(1, '2024-03-15T00:00:00.000Z')).toBe('2024-03-14')
    expect(isoDateNDaysAgo(7, '2024-03-15T00:00:00.000Z')).toBe('2024-03-08')
  })

  test('crosses a month boundary', () => {
    expect(isoDateNDaysAgo(1, '2024-03-01T00:00:00.000Z')).toBe('2024-02-29') // 2024 is a leap year
    expect(isoDateNDaysAgo(30, '2024-03-15T00:00:00.000Z')).toBe('2024-02-14')
  })

  test('crosses a year boundary', () => {
    expect(isoDateNDaysAgo(1, '2024-01-01T00:00:00.000Z')).toBe('2023-12-31')
  })

  test('accepts a Date object as the from parameter', () => {
    expect(isoDateNDaysAgo(5, new Date('2024-06-10T00:00:00.000Z'))).toBe('2024-06-05')
  })
})
