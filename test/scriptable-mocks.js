// Scriptable API mocks needed inside main(). Loaded via setupFilesAfterEnv
// so jest.fn() is available. All mocks are reset before each test.

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

beforeEach(() => {
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

  global.Keychain = {
    contains: jest.fn(() => false),
    get: jest.fn(() => null),
    set: jest.fn(),
  }

  // Default: every request fails — individual tests override as needed.
  global.Request = jest.fn().mockImplementation((url) => ({
    url,
    headers: {},
    loadJSON: jest.fn().mockRejectedValue(new Error('Network error')),
  }))

  global.Font = {
    boldSystemFont: jest.fn(() => ({})),
    systemFont: jest.fn(() => ({})),
    mediumSystemFont: jest.fn(() => ({})),
  }

  global.Script = {
    setWidget: jest.fn(),
    complete: jest.fn(),
  }
})
