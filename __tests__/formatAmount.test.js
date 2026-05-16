const { formatAmount } = require('../actual-budget-widget')

// formatAmount uses the widget's default config constants:
//   currencyPrefix = "$", currencySuffix = "", currencyMinorUnitDivisor = 100

describe('formatAmount', () => {
  test('formats a positive amount', () => {
    expect(formatAmount(1000)).toBe('$10.00')
    expect(formatAmount(100)).toBe('$1.00')
    expect(formatAmount(1)).toBe('$0.01')
  })

  test('formats zero', () => {
    expect(formatAmount(0)).toBe('$0.00')
  })

  test('formats a negative amount with a leading minus before the currency prefix', () => {
    expect(formatAmount(-1000)).toBe('-$10.00')
    expect(formatAmount(-1)).toBe('-$0.01')
  })

  test('formats large amounts', () => {
    expect(formatAmount(100000)).toBe('$1000.00')
    expect(formatAmount(123456)).toBe('$1234.56')
  })

  test('rounds to two decimal places', () => {
    // Amounts are stored as integer cents so fractional cents should not occur,
    // but toFixed(2) behaviour is worth pinning.
    expect(formatAmount(1005)).toBe('$10.05')
  })
})
