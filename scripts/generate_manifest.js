#!/usr/bin/env node

const fs = require("fs")
const targets = require("../browser-targets.json")

function generateManifest(template, targetName) {
    const target = targets[targetName]
    if (!target || !target.manifestVersionPath) {
        throw new Error(`No manifest settings for ${targetName}`)
    }

    const manifest = JSON.parse(JSON.stringify(template))
    const path = target.manifestVersionPath.slice()
    const property = path.pop()
    const parent = path.reduce((value, name) => {
        if (!value[name]) value[name] = {}
        return value[name]
    }, manifest)
    parent[property] = target.minimumVersion
    return manifest
}

if (require.main === module) {
    const [targetName, source, destination] = process.argv.slice(2)
    const template = JSON.parse(fs.readFileSync(source, "utf8"))
    const manifest = generateManifest(template, targetName)
    fs.writeFileSync(destination, JSON.stringify(manifest, null, 4) + "\n")
}

module.exports = generateManifest
