// Copy this file to actual-budget-config.js and fill in your values.
// actual-budget-config.js is listed in .gitignore so your credentials won't be committed.
//
// Appearance and behaviour settings (fonts, colors, refresh intervals, etc.) live in
// actual-budget-widget.js and can be edited there.

// 🔑 Your Actual Budget sync ID (Settings → Advanced → Sync ID)
const syncId = "YOUR_SYNC_ID"

// 🔐 API key set in your actual-http-api server (must match the `API_KEY` env variable)
const apiKey = "YOUR_API_KEY"

// 🌐 Base URL of your actual-http-api instance (no trailing slash, must be HTTPS)
const apiBaseUrl = "https://your-actual-api.example.com"

// 📁 Name of the category group to display in the widget
const targetGroupName = "Category Group Title"

// ☁️ Cloudflare Access service token (optional)
// Only needed if your actual-http-api endpoint is protected by a Cloudflare Access policy.
// Create a service token in Zero Trust → Access → Service Auth, then paste the values below.
// Leave both empty if you are not using Cloudflare Access.
const cfAccessClientId = ""
const cfAccessClientSecret = ""

// Node.js / Jest compatibility
if (typeof module !== 'undefined') module.exports = { syncId, apiKey, apiBaseUrl, targetGroupName, cfAccessClientId, cfAccessClientSecret }
