module.exports = {
  preset: 'ts-jest',
  setupFiles: [
    'jest-webextension-mock',
  ],
  setupFilesAfterEnv: [
    './e2e_tests/failfast.js',
  ],
  testEnvironment: 'jsdom',
  testRunner: 'jest-jasmine2',
  transform: {
    '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$': [
      'ts-jest', {
        tsconfig: {
          moduleResolution: 'node',
          module: 'es2020',
          esModuleInterop: true,
          noImplicitAny: false,
          noEmitOnError: true,
          outDir: 'build/tsc-out',
          sourceMap: true,
          target: 'es2019',
          lib: [
            'es2020',
            'dom',
            'dom.iterable',
          ],
          experimentalDecorators: true,
          alwaysStrict: true,
          strictBindCallApply: true,
          noImplicitThis: true,
          strictFunctionTypes: true,
          baseUrl: 'src/',
          types: [
            'jest',
            'node',
            '@types/firefox-webext-browser',
          ],
          paths: {
            '@src/*': [
              '*',
            ],
          },
        },
        diagnostics: {
          ignoreCodes: [
            151001,
          ],
        },
      },
    ],
  },
  moduleNameMapper: {
    '@src/(.*)': '<rootDir>/src/$1',
  },
  moduleFileExtensions: [
    'js',
    'json',
    'jsx',
    'ts',
    'tsx',
  ],
}
