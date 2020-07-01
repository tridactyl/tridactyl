import * as escape from "@src/lib/escape"

import { testAll } from "@src/lib/test_utils"

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
