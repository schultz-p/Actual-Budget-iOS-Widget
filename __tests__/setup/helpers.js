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

function allTexts(widgetInstance) {
  const direct = widgetInstance.addText.mock.calls.map((c) => c[0])
  const stacks = widgetInstance.addStack.mock.results.map((r) => r.value)
  const nested = stacks.flatMap((s) => s.addText.mock.calls.map((c) => c[0]))
  return [...direct, ...nested]
}

module.exports = { makeTextEl, makeStack, allTexts }
