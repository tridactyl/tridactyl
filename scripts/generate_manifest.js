#!/usr/bin/env node

const fs = require("fs")
const targets = require("../browser-targets.json")

function propertyAt(value, path) {
    const names = path.split(".")
    const property = names.pop()
    const parent = names.reduce((result, name) => result?.[name], value)
    return { parent, property }
}

function generateManifest(template, targetName, targetDefinitions = targets) {
    const manifest = JSON.parse(JSON.stringify(template))
    const target = targetDefinitions[targetName]
    if (!target || !target.manifestVersionPath)
        throw new Error(`No manifest settings for ${targetName}`)
    const {
        additionalVersionPaths = [],
        excludeKeys = [],
        excludePermissions = [],
    } = target.manifest || {}
    if (
        new Set(excludeKeys).size !== excludeKeys.length ||
        new Set(excludePermissions).size !== excludePermissions.length
    )
        throw new Error(`Invalid manifest exclusions for ${targetName}`)
    for (const key of excludeKeys) {
        const { parent, property } = propertyAt(manifest, key)
        if (!parent || !Object.hasOwn(parent, property))
            throw new Error(`Invalid manifest exclusion ${key}`)
        delete parent[property]
    }
    for (const permission of excludePermissions) {
        const index = manifest.permissions.indexOf(permission)
        if (index < 0)
            throw new Error(`Invalid manifest exclusion ${permission}`)
        manifest.permissions.splice(index, 1)
    }
    for (const configuredPath of [
        target.manifestVersionPath,
        ...additionalVersionPaths,
    ]) {
        const path = configuredPath.slice()
        const property = path.pop()
        const parent = path.reduce((value, name) => {
            if (!value[name]) value[name] = {}
            return value[name]
        }, manifest)
        parent[property] = target.minimumVersion
    }
    return manifest
}

if (require.main === module) {
    const [targetName, source, destination] = process.argv.slice(2)
    const template = JSON.parse(fs.readFileSync(source, "utf8"))
    const manifest = generateManifest(template, targetName)
    fs.writeFileSync(destination, JSON.stringify(manifest, null, 4) + "\n")
}

module.exports = generateManifest
