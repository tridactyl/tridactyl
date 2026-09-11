#!/usr/bin/env node
require("fs").writeFileSync(
    process.argv[2],
    JSON.stringify(
        JSON.parse(require("fs").readFileSync(process.argv[2], "utf8")),
    ),
)
