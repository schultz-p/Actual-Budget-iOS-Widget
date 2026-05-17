// Stubs for Scriptable globals referenced at module scope in the widget.
// Color is used in top-level const declarations so it must exist before require().
// All other Scriptable APIs (ListWidget, Keychain, Request, etc.) are only
// referenced inside main(), which is not called in the Node.js test environment.
function MockColor() {}
MockColor.gray = () => ({})
MockColor.green = () => ({})
MockColor.red = () => ({})
MockColor.orange = () => ({})
MockColor.white = () => ({})
global.Color = MockColor
