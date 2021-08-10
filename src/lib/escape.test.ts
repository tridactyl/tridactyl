import * as escape from "../lib/escape"

import { testAll } from "../lib/test_utils"

testAll(escape.sh, [
    ["foo&rm -rf", "'foo&rm -rf'"],
    ["foo&rm -rf'", "'foo&rm -rf'\\'''"],
    ["foo&rm -rf'foo&rm -rf'", "'foo&rm -rf'\\''foo&rm -rf'\\'''"],
])

testAll(escape.windows_cmd, [
    ["foo&rm -rf", "foo^&rm -rf"],
    ["foo&rm -rf'", "foo^&rm -rf'"],
    ['"&whoami', '^"^&whoami'],
])
