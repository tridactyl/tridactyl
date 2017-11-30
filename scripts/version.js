#!/usr/bin/env node

const {exec} = require('child_process')

function bump_version(versionstr, component = 2) {
    const versionarr = versionstr.split('.')
    versionarr[component] = Number(versionarr[component]) + 1
    for (let smaller = component + 1; smaller <= 2; smaller++) {
        versionarr[smaller] = 0
    }
    return versionarr.join('.')
}

async function add_beta(versionstr) {
    return new Promise((resolve, err)=>{
        exec('git rev-list --count HEAD', (execerr, stdout, stderr)=>{
            if (execerr) err(execerr)
            resolve(versionstr + "pre" + stdout.trim())
        })
    })
}

function save_manifest(filename, manifest) {
    // Save file
    const fs = require('fs')
    fs.writeFileSync(filename, JSON.stringify(manifest, null, 4))
}

async function main() {
    let filename, manifest
    switch (process.argv[2]) {
        case 'bump':
            // Load src manifest and bump
            filename = './src/manifest.json'
            manifest = require('.' + filename)
            manifest.version = bump_version(manifest.version, Number(process.argv[3]))
            save_manifest(filename, manifest)
            exec(`git add ${filename} && git commit -m 'release ${manifest.version}' && git tag ${manifest.version}`)
            break
        case 'beta':
            filename = './build/manifest.json'
            manifest = require('.' + filename)
            manifest.version = await add_beta(manifest.version)
            save_manifest(filename, manifest)
            break
        default:
            throw "Unknown command!"
    }
}

main()
