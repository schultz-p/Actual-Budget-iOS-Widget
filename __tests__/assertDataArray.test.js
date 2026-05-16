const { assertDataArray } = require('../actual-budget-widget')

describe('assertDataArray', () => {
  test('does not throw when response has an empty data array', () => {
    expect(() => assertDataArray({ data: [] }, 'test')).not.toThrow()
  })

  test('does not throw when response has a populated data array', () => {
    expect(() => assertDataArray({ data: [1, 2, 3] }, 'test')).not.toThrow()
  })

  test('throws when response is null', () => {
    expect(() => assertDataArray(null, 'accounts')).toThrow(
      'Malformed response from accounts: expected { data: [...] }'
    )
  })

  test('throws when response is undefined', () => {
    expect(() => assertDataArray(undefined, 'accounts')).toThrow(
      'Malformed response from accounts'
    )
  })

  test('throws when data property is missing', () => {
    expect(() => assertDataArray({}, 'accounts')).toThrow(
      'Malformed response from accounts'
    )
  })

  test('throws when data is not an array', () => {
    expect(() => assertDataArray({ data: 'string' }, 'accounts')).toThrow()
    expect(() => assertDataArray({ data: null }, 'accounts')).toThrow()
    expect(() => assertDataArray({ data: 42 }, 'accounts')).toThrow()
  })

  test('includes the label in the error message', () => {
    expect(() => assertDataArray(null, 'category groups')).toThrow('category groups')
  })
})
