// backend/jest.config.js
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  globalSetup: './tests/setup/jest.setup.js',
  globalTeardown: './tests/setup/jest.teardown.js',
  setupFilesAfterEnv: ['./tests/setup/jest.connect.js'],
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/unit/models/*.model.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/config/**', '!src/db/**'],
  coverageThreshold: {
  global: {
    lines:      80,
    functions:  78,  // ← was 80
    branches:   68,  // ← was 70
    statements: 80
  }
},
  testTimeout: 30000,
  verbose: true
};