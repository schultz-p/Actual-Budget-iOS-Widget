module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./test/scriptable-globals.js'],
  setupFilesAfterEnv: ['./test/scriptable-mocks.js'],
}
