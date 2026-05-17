// === 📦 CREDENTIALS ===
// Loaded from actual-budget-config.js (gitignored). See actual-budget-config.example.js.
const _cfg = typeof importModule !== 'undefined'
  ? importModule('actual-budget-config')
  : (() => { try { return require('./actual-budget-config') } catch { return require('./actual-budget-config.example') } })()

const { syncId, apiKey, apiBaseUrl, targetGroupName } = _cfg

// 💸 Currency formatting
const currencyPrefix = "$"  // Symbol shown before the number
const currencySuffix = ""   // Text shown after the number
// Actual stores amounts as integers in the minor unit (cents for USD, pence for GBP, etc.)
// Set to 1 for zero-decimal currencies like JPY or KWD
const currencyMinorUnitDivisor = 100

// === 🎨 APPEARANCE SETTINGS ===

// Font sizes
const textSize = 16                         // Category name
const balanceSize = 16                      // Category balance
const groupTitleSize = 12                   // Title line
const footerTextSize = 10                   // Footer line

// Text colors
const groupTitleColor = Color.gray()        // Title line color
const footerTextColor = Color.gray()        // Footer line color
const positiveColor = Color.green()         // Balance > 0
const zeroColor = Color.gray()              // Balance = 0
const negativeColor = Color.red()           // Balance < 0

// Layout
const itemSpacing = 10                      // Space between lines
const widgetPadding = 20                    // Padding around widget edges

// === 🔍 UNCATEGORISED TRANSACTIONS SETTINGS ===

const lookbackDays = 30                     // Days to look back for uncategorised txns
const uncategorisedBgColor = new Color("#333333", 0.2)  // Background box color
const uncategorisedTextColor = Color.orange()           // Text color
const uncategorisedBoxPadding = 6           // Padding inside the summary box
const uncategorisedFontSize = 12            // Font size for uncategorised summary

// === ⚙️ BEHAVIOUR SETTINGS ===

const enableDebugLogging = false            // Log fetch/debug info to console
const refreshIntervalMinutes = 360          // How often the widget refreshes on success
const retryIntervalMinutes = 30             // How often to retry after any failure

// === 🔧 Helper: Format Amount
function formatAmount(amount) {
  const abs = Math.abs(amount)
  const formatted = `${currencyPrefix}${(abs / currencyMinorUnitDivisor).toFixed(2)}${currencySuffix}`
  return amount < 0 ? `-${formatted}` : formatted
}

// === 🔧 Helper: Validate API response has a data array
function assertDataArray(response, label) {
  if (!response || !Array.isArray(response.data)) {
    throw new Error(`Malformed response from ${label}: expected { data: [...] }`)
  }
}

// === 🔧 Helper: Create an authenticated API request
function makeApiRequest(path) {
  const r = new Request(`${apiBaseUrl}${path}`)
  r.headers = { "x-api-key": apiKey, "accept": "application/json" }
  return r
}

// === 📆 Helper: ISO date N days before a given date
function isoDateNDaysAgo(n, from) {
  const d = new Date(from)
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

async function main() {

if (!apiBaseUrl.startsWith("https://")) {
  throw new Error(`apiBaseUrl must use HTTPS — got: "${apiBaseUrl}"`)
}

// === 📅 Format timestamps
const now = new Date()
const isoMonth = now.toISOString().slice(0, 7)

const monthFormatter = new DateFormatter()
monthFormatter.dateFormat = "MMMM yyyy"
const prettyMonth = monthFormatter.string(now)

const timeFormatter = new DateFormatter()
timeFormatter.useNoDateStyle()
timeFormatter.useShortTimeStyle()

// === 🧾 Try loading cache
let w = new ListWidget()
let cache = null
let data, lastSuccessTime
let budgetFromCache = false
let txFailed = false

if (Keychain.contains("actual-cache")) {
  try {
    cache = JSON.parse(Keychain.get("actual-cache"))
  } catch {
    console.warn("⚠️ Cache could not be parsed")
  }
}

const req = makeApiRequest(`/v1/budgets/${syncId}/months/${isoMonth}/categorygroups`)

try {
  const raw = await req.loadJSON()
  assertDataArray(raw, "category groups")
  data = raw
  Keychain.set("actual-cache", JSON.stringify({ timestamp: now.toISOString(), data }))
  lastSuccessTime = now
} catch (e) {
  console.error("❌ API fetch failed:", e)
  if (cache) {
    data = cache.data
    lastSuccessTime = cache.timestamp ? new Date(cache.timestamp) : null
    budgetFromCache = true
  } else {
    w.addText("❌ No data & no cache available.")
    Script.setWidget(w)
    Script.complete()
    return
  }
}

// === 🧾 Fetch uncategorised transactions
const accountsReq = makeApiRequest(`/v1/budgets/${syncId}/accounts`)

let uncategorised = []
let txPartialFail = false

try {
  const accountData = await accountsReq.loadJSON()
  assertDataArray(accountData, "accounts")
  const validAccounts = accountData.data.filter(a => !a.closed && !a.offbudget)
  if (enableDebugLogging) console.log(`✅ Found ${validAccounts.length} accounts`)

  const sinceDate = isoDateNDaysAgo(lookbackDays, now)

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  const results = await Promise.all(validAccounts.map(async acc => {
    if (!UUID_RE.test(acc.id)) {
      console.warn(`⚠️ Skipping account '${acc.name}': unexpected id format '${acc.id}'`)
      return { ok: false }
    }
    try {
      const txData = await makeApiRequest(
        `/v1/budgets/${syncId}/accounts/${acc.id}/transactions?since_date=${sinceDate}`
      ).loadJSON()
      assertDataArray(txData, `transactions for '${acc.name}'`)
      const uncats = txData.data.filter(tx =>
        !tx.category &&
        !tx.transfer_id &&
        !tx.starting_balance_flag
      )
      if (enableDebugLogging) {
        console.log(`📒 ${acc.name}: ${uncats.length} uncategorised / ${txData.data.length} total`)
        for (const tx of uncats) {
          console.log(`  - ${formatAmount(tx.amount)} on ${tx.date}`)
        }
      }
      return { ok: true, uncats }
    } catch (err) {
      console.warn(`❌ Failed to fetch transactions for '${acc.name}' (${acc.id})`)
      console.warn(err.message || err)
      return { ok: false }
    }
  }))

  const successCount = results.filter(r => r.ok).length
  for (const result of results) {
    if (result.ok) {
      uncategorised.push(...result.uncats)
    }
  }
  // Only treat as a full failure (triggering short retry) when no accounts succeeded.
  // Partial failures get a warning in the footer but don't shorten the refresh interval.
  if (successCount === 0 && results.length > 0) {
    txFailed = true
  } else if (successCount < results.length) {
    txPartialFail = true
  }

} catch (err) {
  console.error("❌ Failed to fetch account list")
  console.error(err.message || err)
  txFailed = true
}

if (enableDebugLogging) {
  const suffix = txFailed ? " (all accounts failed)" : txPartialFail ? " (partial — some accounts failed)" : ""
  console.log(`📦 Uncategorised count: ${uncategorised.length}${suffix}`)
}

// === 📂 Display category group
const groups = data.data
const targetGroup = groups.find(g => g.name === targetGroupName)

if (!targetGroup) {
  w.addText(`❌ Group '${targetGroupName}' not found`)
} else {
  const title = w.addText(`${prettyMonth} • ${targetGroup.name}`)
  title.font = Font.boldSystemFont(groupTitleSize)
  title.textColor = groupTitleColor
  w.addSpacer(12)

  for (const cat of targetGroup.categories) {
    const stack = w.addStack()
    stack.layoutHorizontally()
    stack.centerAlignContent()

    const nameTxt = stack.addText(cat.name)
    nameTxt.font = Font.systemFont(textSize)
    nameTxt.textColor = Color.white()

    stack.addSpacer()

    const balTxt = stack.addText(formatAmount(cat.balance))
    balTxt.font = Font.boldSystemFont(balanceSize)

    if (cat.balance > 0) balTxt.textColor = positiveColor
    else if (cat.balance < 0) balTxt.textColor = negativeColor
    else balTxt.textColor = zeroColor

    w.addSpacer(itemSpacing)
  }
}

// === 📦 Insert uncategorised transaction box (if applicable)
if (uncategorised.length > 0) {
  const totalAmount = uncategorised.reduce((sum, tx) => sum + tx.amount, 0)
  const totalFormatted = formatAmount(totalAmount)

  const uncatBox = w.addStack()
  uncatBox.layoutVertically()
  uncatBox.backgroundColor = uncategorisedBgColor
  uncatBox.cornerRadius = 8
  const p = uncategorisedBoxPadding
  uncatBox.setPadding(p, p, p, p)

  const daysNote = `past ${lookbackDays} days`
  const uncatText = uncatBox.addText(`${uncategorised.length} uncategorised: ${totalFormatted} • ${daysNote}`)
  uncatText.font = Font.mediumSystemFont(uncategorisedFontSize)
  uncatText.textColor = uncategorisedTextColor

  w.addSpacer(itemSpacing)
}

// === 🕓 Footer
w.addSpacer(4)

function addFooterLine(text) {
  const t = w.addText(text)
  t.font = Font.systemFont(footerTextSize)
  t.textColor = footerTextColor
}

if (budgetFromCache) addFooterLine(`⚠️ Balances from cache • Last retrieved: ${lastSuccessTime ? timeFormatter.string(lastSuccessTime) : "unknown"}`)
if (txFailed) addFooterLine(`⚠️ Uncategorised data unavailable`)
if (txPartialFail) addFooterLine(`⚠️ Uncategorised data incomplete`)
if (!budgetFromCache && !txFailed) addFooterLine(`Last retrieved: ${timeFormatter.string(lastSuccessTime)}`)

// === 🔁 Auto-refresh
const refreshInterval = (budgetFromCache || txFailed) ? retryIntervalMinutes : refreshIntervalMinutes
const nextRefresh = new Date(Date.now() + refreshInterval * 60 * 1000)
w.refreshAfterDate = nextRefresh

// === 📱 Display widget
w.setPadding(widgetPadding, widgetPadding, widgetPadding, widgetPadding)
w.presentLarge()
Script.setWidget(w)
Script.complete()

} // end main()

// In Scriptable: run the widget. In Node.js (tests): export pure helpers.
if (typeof module !== 'undefined') {
  module.exports = { formatAmount, assertDataArray, isoDateNDaysAgo, main }
} else {
  main()
}
