const tsConfig = require('./tsconfig');

module.exports = {
  preset: "ts-jest",
  setupFiles: [
    "jest-webextension-mock"
  ],
  setupFilesAfterEnv: [
    "./e2e_tests/failfast.js"
  ],
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  globals: {
    "ts-jest": {
      tsConfig: {
        ...tsConfig.compilerOptions,
          types: ["jest", "node", "@types/firefox-webext-browser"]
      },
      diagnostics: {
        ignoreCodes: [151001]
      },
    }
  },
  moduleNameMapper: {
    "@src/(.*)": "<rootDir>/src/$1"
  },
  moduleFileExtensions: [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json"
  ],
};
