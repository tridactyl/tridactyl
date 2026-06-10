// Borrowed from https://github.com/facebook/jest/issues/2867#issuecomment-546592968-permalink
const failFast = require("jasmine-fail-fast");

if (process.argv.includes("--bail")) {
  const jasmineEnv = jasmine.getEnv();
  jasmineEnv.addReporter(failFast.init());
}
