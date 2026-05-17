// Copy this file to actual-budget-config.js and fill in your values.
// actual-budget-config.js is listed in .gitignore so your credentials won't be committed.
//
// In Scriptable: add both actual-budget-widget.js and actual-budget-config.js to your
// scripts folder. The widget loads the config via importModule().
//
// In Node.js / Jest: require('./actual-budget-config') is used automatically.

// === 📦 CONFIGURATION VARIABLES ===

// 🔑 Your Actual Budget sync ID (Settings → Advanced → Sync ID)
const syncId = "YOUR_SYNC_ID"

// 🔐 API key set in your actual-http-api server (must match the `API_KEY` env variable)
const apiKey = "YOUR_API_KEY"

// 🌐 Base URL of your actual-http-api instance (no trailing slash, must be HTTPS)
const apiBaseUrl = "https://your-actual-api.example.com"

// 📁 Name of the category group to display in the widget
const targetGroupName = "Category Group Title"

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

// Node.js / Jest compatibility
if (typeof module !== 'undefined') module.exports = {
  syncId, apiKey, apiBaseUrl, targetGroupName,
  currencyPrefix, currencySuffix, currencyMinorUnitDivisor,
  textSize, balanceSize, groupTitleSize, footerTextSize,
  groupTitleColor, footerTextColor, positiveColor, zeroColor, negativeColor,
  itemSpacing, widgetPadding,
  lookbackDays, uncategorisedBgColor, uncategorisedTextColor, uncategorisedBoxPadding, uncategorisedFontSize,
  enableDebugLogging, refreshIntervalMinutes, retryIntervalMinutes,
}
