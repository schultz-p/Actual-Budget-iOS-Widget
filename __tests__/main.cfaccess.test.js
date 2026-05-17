// Tests that Cloudflare Access service token headers are injected when configured.
// Uses jest.resetModules + jest.doMock so each test loads a fresh widget with
// a controlled config, without affecting the module cache of other test files.

const GROUPS = {
  data: [{ name: 'Category Group Title', categories: [{ name: 'Groceries', balance: 5000 }] }],
}
const EMPTY_ACCOUNTS = { data: [] }

function setupGlobals(capturedRequests) {
  const makeTextEl = () => ({ font: null, textColor: null })
  const makeStack = () => ({
    layoutHorizontally: jest.fn(),
    layoutVertically: jest.fn(),
    centerAlignContent: jest.fn(),
    addText: jest.fn(() => makeTextEl()),
    addSpacer: jest.fn(),
    addStack: jest.fn(() => makeStack()),
    backgroundColor: null,
    cornerRadius: null,
    setPadding: jest.fn(),
  })

  global.DateFormatter = jest.fn().mockImplementation(() => ({
    useNoDateStyle: jest.fn(),
    useShortTimeStyle: jest.fn(),
    string: jest.fn(() => '12:00 PM'),
  }))
  global.ListWidget = jest.fn().mockImplementation(() => ({
    addText: jest.fn(() => makeTextEl()),
    addStack: jest.fn(() => makeStack()),
    addSpacer: jest.fn(),
    setPadding: jest.fn(),
    presentLarge: jest.fn(),
    refreshAfterDate: null,
  }))
  global.Keychain = { contains: jest.fn(() => false), get: jest.fn(), set: jest.fn() }
  global.Font = {
    boldSystemFont: jest.fn(() => ({})),
    systemFont: jest.fn(() => ({})),
    mediumSystemFont: jest.fn(() => ({})),
  }
  // global.Color is already a constructor mock from scriptable-globals.js (setupFiles).
  // Don't override it here — jest.resetModules() clears the module cache but not globals.
  global.Script = { setWidget: jest.fn(), complete: jest.fn() }
  global.Request = jest.fn().mockImplementation((url) => {
    const mock = {
      url,
      headers: {},
      timeoutInterval: null,
      response: null,
      loadJSON: jest.fn().mockImplementation(() => {
        if (url.includes('categorygroups')) return Promise.resolve(GROUPS)
        return Promise.resolve(EMPTY_ACCOUNTS)
      }),
    }
    capturedRequests.push(mock)
    return mock
  })
}

// Base config shared across tests — CF fields are overridden per test.
const baseConfig = {
  syncId: 'test-sync',
  apiKey: 'test-key',
  apiBaseUrl: 'https://api.example.com',
  targetGroupName: 'Category Group Title',
}

async function runMainWithConfig(cfg, capturedRequests) {
  setupGlobals(capturedRequests)
  // The widget falls back to actual-budget-config.example when .js is absent.
  jest.doMock('../actual-budget-config.example', () => cfg)
  const { main } = require('../actual-budget-widget')
  await main()
}

beforeEach(() => {
  jest.resetModules()
})

describe('Cloudflare Access headers — present when configured', () => {
  test('adds CF-Access-Client-Id and CF-Access-Client-Secret to every request', async () => {
    const capturedRequests = []
    await runMainWithConfig({
      ...baseConfig,
      cfAccessClientId: 'test-cf-id',
      cfAccessClientSecret: 'test-cf-secret',
    }, capturedRequests)

    expect(capturedRequests.length).toBeGreaterThan(0)
    for (const req of capturedRequests) {
      expect(req.headers['CF-Access-Client-Id']).toBe('test-cf-id')
      expect(req.headers['CF-Access-Client-Secret']).toBe('test-cf-secret')
    }
  })
})

describe('Cloudflare Access headers — absent when not configured', () => {
  test('omits CF-Access headers when both fields are empty strings', async () => {
    const capturedRequests = []
    await runMainWithConfig({
      ...baseConfig,
      cfAccessClientId: '',
      cfAccessClientSecret: '',
    }, capturedRequests)

    expect(capturedRequests.length).toBeGreaterThan(0)
    for (const req of capturedRequests) {
      expect(req.headers['CF-Access-Client-Id']).toBeUndefined()
      expect(req.headers['CF-Access-Client-Secret']).toBeUndefined()
    }
  })

  test('omits CF-Access headers when fields are absent from config', async () => {
    const capturedRequests = []
    await runMainWithConfig({ ...baseConfig }, capturedRequests)

    expect(capturedRequests.length).toBeGreaterThan(0)
    for (const req of capturedRequests) {
      expect(req.headers['CF-Access-Client-Id']).toBeUndefined()
      expect(req.headers['CF-Access-Client-Secret']).toBeUndefined()
    }
  })
})

describe('User-Agent header', () => {
  test('is set on every request', async () => {
    const capturedRequests = []
    await runMainWithConfig({ ...baseConfig }, capturedRequests)

    expect(capturedRequests.length).toBeGreaterThan(0)
    for (const req of capturedRequests) {
      expect(req.headers['User-Agent']).toBe('actual-budget-ios-widget/1.0 (Scriptable; iOS)')
    }
  })

  test('is present alongside CF-Access headers when both are configured', async () => {
    const capturedRequests = []
    await runMainWithConfig({
      ...baseConfig,
      cfAccessClientId: 'test-cf-id',
      cfAccessClientSecret: 'test-cf-secret',
    }, capturedRequests)

    expect(capturedRequests.length).toBeGreaterThan(0)
    for (const req of capturedRequests) {
      expect(req.headers['User-Agent']).toBe('actual-budget-ios-widget/1.0 (Scriptable; iOS)')
      expect(req.headers['CF-Access-Client-Id']).toBe('test-cf-id')
    }
  })
})
