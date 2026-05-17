module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./__tests__/setup/scriptable-globals.js'],
  setupFilesAfterEnv: ['./__tests__/setup/scriptable-mocks.js'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/setup/'],
}
