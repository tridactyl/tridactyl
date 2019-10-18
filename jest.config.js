const tsConfig = require('./tsconfig');

module.exports = {
  preset: "ts-jest",
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  globals: {
    "ts-jest": {
      tsConfig: {
        ...tsConfig.compilerOptions,
        types: ["jest", "node"]
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
