const { main } = require('../actual-budget-widget')
const { makeTextEl, makeStack, allTexts } = require('../test/helpers')

// --- Fixtures ---

const GROUPS_WITH_TARGET = {
  data: [
    {
      name: 'Category Group Title',
      categories: [{ name: 'Groceries', balance: 5000 }],
    },
  ],
}

const ACCOUNT_VALID = {
  data: [
    {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'Checking',
      closed: false,
      offbudget: false,
    },
  ],
}

const ACCOUNT_INVALID_UUID = {
  data: [{ id: 'not-a-valid-uuid', name: 'Bad Account', closed: false, offbudget: false }],
}

const ACCOUNT_CLOSED = {
  data: [
    { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'Closed', closed: true, offbudget: false },
  ],
}

const ACCOUNT_OFFBUDGET = {
  data: [
    { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'Off-budget', closed: false, offbudget: true },
  ],
}

// Transactions: one genuinely uncategorised, plus three that must be excluded.
const MIXED_TRANSACTIONS = {
  data: [
    { id: 'tx-uncat', amount: -4200, date: '2024-03-10', category: null,   transfer_id: null,        starting_balance_flag: false },
    { id: 'tx-cat',   amount: -1000, date: '2024-03-11', category: 'food', transfer_id: null,        starting_balance_flag: false },
    { id: 'tx-xfer',  amount:  5000, date: '2024-03-12', category: null,   transfer_id: 'some-xfer', starting_balance_flag: false },
    { id: 'tx-open',  amount: 50000, date: '2024-01-01', category: null,   transfer_id: null,        starting_balance_flag: true  },
  ],
}

const NO_UNCATEGORISED_TRANSACTIONS = {
  data: [
    { id: 'tx1', amount: -500, date: '2024-03-10', category: 'food', transfer_id: null, starting_balance_flag: false },
  ],
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

// Build a Request mock that routes by URL.
function makeRequestMock({ groupsRes = GROUPS_WITH_TARGET, accountsRes, transactionsRes } = {}) {
  return jest.fn().mockImplementation((url) => {
    const mock = { headers: {}, loadJSON: jest.fn() }
    if (url.includes('categorygroups')) {
      mock.loadJSON.mockResolvedValue(groupsRes)
    } else if (url.includes('/transactions')) {
      if (transactionsRes instanceof Error) {
        mock.loadJSON.mockRejectedValue(transactionsRes)
      } else {
        mock.loadJSON.mockResolvedValue(transactionsRes ?? NO_UNCATEGORISED_TRANSACTIONS)
      }
    } else if (url.includes('/accounts')) {
      if (accountsRes instanceof Error) {
        mock.loadJSON.mockRejectedValue(accountsRes)
      } else {
        mock.loadJSON.mockResolvedValue(accountsRes ?? ACCOUNT_VALID)
      }
    }
    return mock
  })
}

// --- Tests ---

describe('main() — uncategorised transaction display', () => {
  test('does not show the uncategorised box when all transactions are categorised', async () => {
    global.Request = makeRequestMock({ transactionsRes: NO_UNCATEGORISED_TRANSACTIONS })
    await main()
    expect(allTexts(widget).some((t) => t.includes('uncategorised'))).toBe(false)
  })

  test('shows the uncategorised box when uncategorised transactions exist', async () => {
    global.Request = makeRequestMock({ transactionsRes: MIXED_TRANSACTIONS })
    await main()
    expect(allTexts(widget).some((t) => t.includes('uncategorised'))).toBe(true)
  })

  test('excludes categorised transactions from the uncategorised count', async () => {
    global.Request = makeRequestMock({ transactionsRes: MIXED_TRANSACTIONS })
    await main()
    // Only tx-uncat qualifies; the box text should say "1 uncategorised"
    expect(allTexts(widget).some((t) => t.startsWith('1 uncategorised'))).toBe(true)
  })

  test('excludes transfer transactions from the uncategorised count', async () => {
    global.Request = makeRequestMock({
      transactionsRes: {
        data: [{ id: 'xfer', amount: 1000, date: '2024-03-01', category: null, transfer_id: 'x', starting_balance_flag: false }],
      },
    })
    await main()
    expect(allTexts(widget).some((t) => t.includes('uncategorised'))).toBe(false)
  })

  test('excludes starting-balance transactions from the uncategorised count', async () => {
    global.Request = makeRequestMock({
      transactionsRes: {
        data: [{ id: 'open', amount: 50000, date: '2024-01-01', category: null, transfer_id: null, starting_balance_flag: true }],
      },
    })
    await main()
    expect(allTexts(widget).some((t) => t.includes('uncategorised'))).toBe(false)
  })
})

describe('main() — account filtering', () => {
  test('skips closed accounts and fetches no transactions for them', async () => {
    global.Request = makeRequestMock({ accountsRes: ACCOUNT_CLOSED })
    await main()
    // No transactions fetched → no uncategorised box
    expect(allTexts(widget).some((t) => t.includes('uncategorised'))).toBe(false)
    expect(global.Script.complete).toHaveBeenCalled()
  })

  test('skips off-budget accounts and fetches no transactions for them', async () => {
    global.Request = makeRequestMock({ accountsRes: ACCOUNT_OFFBUDGET })
    await main()
    expect(allTexts(widget).some((t) => t.includes('uncategorised'))).toBe(false)
    expect(global.Script.complete).toHaveBeenCalled()
  })
})

describe('main() — UUID validation', () => {
  test('skips an account with an invalid UUID format', async () => {
    global.Request = makeRequestMock({ accountsRes: ACCOUNT_INVALID_UUID })
    await main()
    // Invalid UUID → ok: false → txFailed footer shown
    expect(allTexts(widget).some((t) => t.includes('Uncategorised data unavailable'))).toBe(true)
    expect(global.Script.complete).toHaveBeenCalled()
  })
})

describe('main() — transaction fetch failure', () => {
  test('shows the txFailed footer when a per-account transaction request throws', async () => {
    global.Request = makeRequestMock({ transactionsRes: new Error('tx fetch failed') })
    await main()
    expect(allTexts(widget).some((t) => t.includes('Uncategorised data unavailable'))).toBe(true)
    expect(global.Script.complete).toHaveBeenCalled()
  })

  test('appends "(offline)" to the txFailed footer when the failure looks like a connectivity issue', async () => {
    global.Request = makeRequestMock({ transactionsRes: new Error('network connection was lost') })
    await main()
    expect(allTexts(widget).some((t) => t.includes('Uncategorised data unavailable (offline)'))).toBe(true)
  })
})

describe('main() — accounts list fetch failure', () => {
  test('shows the txFailed footer when the accounts request itself throws', async () => {
    global.Request = makeRequestMock({ accountsRes: new Error('accounts unavailable') })
    await main()
    expect(allTexts(widget).some((t) => t.includes('Uncategorised data unavailable'))).toBe(true)
    expect(global.Script.complete).toHaveBeenCalled()
  })
})
