/** @type {import("jest").Config} */
module.exports = {
  preset: "jest-expo",
  rootDir: ".",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["<rootDir>/tests/**/*.test.ts?(x)"],
  clearMocks: true,
};