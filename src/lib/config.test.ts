import { testAll, testAllObject } from "@src/lib/test_utils"
import { canonicaliseMapstr } from "@src/lib/keyseq"
import { default_config } from "@src/lib/config"
import { zip } from "ramda"

const config = new default_config()
// todo: test subconfigs and platform_defaults
const nmaps = Object.keys(config.nmaps)

for (let mode of Object.keys(config).filter(x=>x.match(/maps$/))) {
    const mapstrings = Object.keys(config[mode])
    testAll(canonicaliseMapstr, zip(mapstrings, mapstrings))
}
