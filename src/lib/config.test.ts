import { testAll, testAllObject } from "@src/lib/test_utils"
import { canonicaliseMapstr } from "@src/lib/keyseq"
import { default_config } from "@src/lib/config"
import { zip } from "ramda"

const config = new default_config()
// todo: test subconfigs and platform_defaults
const nmaps = Object.keys(config.nmaps)

// Test that all of the default maps use the canonical representation (otherwise they won't work correctly, because Tridactyl expects the maps in the config to be canonical; which now that I write it, that does seem like an obvious foot-gun for if we ever change the canonicalisation algorithm).
//
// But, hey, at least with this test we are more likely to notice if that happens and either not change the canonicalisation algorithm or introduce a migration.
for (let mode of Object.keys(config).filter(x => x.match(/maps$/))) {
    const mapstrings = Object.keys(config[mode])
    testAll(canonicaliseMapstr, zip(mapstrings, mapstrings))
}
