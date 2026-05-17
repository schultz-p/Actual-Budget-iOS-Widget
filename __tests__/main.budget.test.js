const { main } = require('../actual-budget-widget')
const { makeTextEl, makeStack, allTexts } = require('../test/helpers')

// --- Fixtures ---

const GROUPS_WITH_TARGET = {
  data: [
    {
      name: 'Category Group Title',
      categories: [
        { name: 'Groceries', balance: 5000 },   // positive
        { name: 'Dining', balance: -2000 },      // negative
        { name: 'Transport', balance: 0 },        // zero
      ],
    },
  ],
}

const GROUPS_WITHOUT_TARGET = {
  data: [{ name: 'Some Other Group', categories: [] }],
}

const EMPTY_ACCOUNTS = { data: [] }

// Returns a per-URL Request mock that serves budget groups + empty accounts.
function makeRequestMock(groupsResponse) {
  return jest.fn().mockImplementation((url) => {
    const mock = { headers: {}, loadJSON: jest.fn() }
    if (url.includes('categorygroups')) {
      mock.loadJSON.mockResolvedValue(groupsResponse)
    } else {
      mock.loadJSON.mockResolvedValue(EMPTY_ACCOUNTS)
    }
    return mock
  })
}

// --- Widget setup ---

let widget
beforeEach(() => {
  global.ListWidget = jest.fn().mockImplementation(() => {
    widget = {
      addText: jest.fn(() => makeTextEl()),
      addStack: jest.fn(() => makeStack()),
      addSpacer: jest.fn(),
      setPadding: jest.fn(),
      presentLarge: jest.fn(),
      refreshAfterDate: null,
    }
    return widget
  })
})

// --- Tests ---

describe('main() — API success', () => {
  beforeEach(() => {
    global.Request = makeRequestMock(GROUPS_WITH_TARGET)
  })

  test('completes the script', async () => {
    await main()
    expect(global.Script.complete).toHaveBeenCalled()
    expect(global.Script.setWidget).toHaveBeenCalled()
  })

  test('writes the API response to the Keychain cache', async () => {
    await main()
    expect(global.Keychain.set).toHaveBeenCalledWith(
      'actual-cache',
      expect.stringContaining('"data"')
    )
  })

  test('renders the target group title', async () => {
    await main()
    expect(allTexts(widget).some((t) => t.includes('Category Group Title'))).toBe(true)
  })

  test('renders all three balance colour branches (positive, negative, zero)', async () => {
    await main()
    // Three category rows means addStack was called at least three times
    expect(widget.addStack.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  test('does not show the uncategorised box when there are no uncategorised transactions', async () => {
    await main()
    expect(allTexts(widget).some((t) => t.includes('uncategorised'))).toBe(false)
  })

  test('shows the "last retrieved" footer line (not a cache or failure run)', async () => {
    await main()
    expect(allTexts(widget).some((t) => t.includes('Last retrieved'))).toBe(true)
  })
})

describe('main() — target group not found', () => {
  test('shows an error message when the configured group name is absent from the response', async () => {
    global.Request = makeRequestMock(GROUPS_WITHOUT_TARGET)
    await main()
    expect(allTexts(widget).some((t) => t.includes('not found'))).toBe(true)
    expect(global.Script.complete).toHaveBeenCalled()
  })
})

describe('main() — cache fallback', () => {
  const cachedPayload = JSON.stringify({
    timestamp: new Date().toISOString(),
    data: GROUPS_WITH_TARGET,
  })

  beforeEach(() => {
    // API always fails
    global.Request = jest.fn().mockImplementation((url) => ({
      url,
      headers: {},
      loadJSON: jest.fn().mockRejectedValue(new Error('offline')),
    }))
    global.Keychain.contains = jest.fn(() => true)
    global.Keychain.get = jest.fn(() => cachedPayload)
  })

  test('falls back to cached data when the API is unreachable', async () => {
    await main()
    expect(global.Script.complete).toHaveBeenCalled()
  })

  test('shows a cache-warning footer line', async () => {
    await main()
    expect(allTexts(widget).some((t) => t.includes('from cache'))).toBe(true)
  })

  test('does not write to the Keychain cache (data came from cache)', async () => {
    await main()
    expect(global.Keychain.set).not.toHaveBeenCalled()
  })

  test('labels the cache footer as "Device offline" when the error is a connectivity failure', async () => {
    // default beforeEach throws new Error('offline') → networkOffline = true
    await main()
    expect(allTexts(widget).some((t) => t.includes('Device offline'))).toBe(true)
  })

  test('labels the cache footer as "Server unreachable" when the server returned an error', async () => {
    global.Request = jest.fn().mockImplementation((url) => ({
      url, headers: {},
      loadJSON: jest.fn().mockRejectedValue(new Error('500 Internal Server Error')),
    }))
    await main()
    expect(allTexts(widget).some((t) => t.includes('Server unreachable'))).toBe(true)
  })
})

describe('main() — no data and no cache', () => {
  beforeEach(() => {
    global.Keychain.contains = jest.fn(() => false)
  })

  test('shows "Device offline" when the error looks like a connectivity failure', async () => {
    global.Request = jest.fn().mockImplementation((url) => ({
      url, headers: {},
      loadJSON: jest.fn().mockRejectedValue(new Error('offline')),
    }))
    await main()
    expect(global.Script.complete).toHaveBeenCalled()
    expect(allTexts(widget).some((t) => t.includes('Device offline'))).toBe(true)
  })

  test('shows "Server unreachable" when the error is not a connectivity failure', async () => {
    global.Request = jest.fn().mockImplementation((url) => ({
      url, headers: {},
      loadJSON: jest.fn().mockRejectedValue(new Error('500 Internal Server Error')),
    }))
    await main()
    expect(global.Script.complete).toHaveBeenCalled()
    expect(allTexts(widget).some((t) => t.includes('Server unreachable'))).toBe(true)
  })

  test('schedules a retry refresh so the widget does not get permanently stuck', async () => {
    global.Request = jest.fn().mockImplementation((url) => ({
      url, headers: {},
      loadJSON: jest.fn().mockRejectedValue(new Error('offline')),
    }))
    const before = Date.now()
    await main()
    expect(widget.refreshAfterDate).toBeInstanceOf(Date)
    expect(widget.refreshAfterDate.getTime()).toBeGreaterThan(before)
  })
})

describe('main() — malformed Keychain cache', () => {
  test('recovers gracefully when the cache JSON is invalid and the API succeeds', async () => {
    global.Keychain.contains = jest.fn(() => true)
    global.Keychain.get = jest.fn(() => '{{{not valid json')
    global.Request = makeRequestMock(GROUPS_WITH_TARGET)

    await main()
    // Should still render from fresh API data
    expect(global.Script.complete).toHaveBeenCalled()
    expect(allTexts(widget).some((t) => t.includes('Category Group Title'))).toBe(true)
  })
})
