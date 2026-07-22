#!/usr/bin/env node

const { exec, execFileSync } = require("child_process")
const fs = require("fs")

function bump_version(versionstr, component = 2) {
    const versionarr = versionstr.split(".")
    versionarr[component] = Number(versionarr[component]) + 1
    for (let smaller = component + 1; smaller <= 2; smaller++) {
        versionarr[smaller] = 0
    }
    return versionarr.join(".")
}

function release_name(manifest) {
    return (manifest.version_name || manifest.version)
        .slice(manifest.version.length)
        .trim()
}

function set_release_version(manifest, component, name = "") {
    if (![0, 1, 2].includes(component)) throw new Error("Version component must be 0, 1 or 2")
    if (component === 2 && name) throw new Error("Only major and minor releases can be named")

    const nameForRelease =
        component === 2 ? release_name(manifest) : name.trim()
    manifest.version = bump_version(manifest.version, component)
    manifest.version_name = [manifest.version, nameForRelease].filter(Boolean).join(" ")
}

async function add_beta(versionstr) {
    await fs.promises.mkdir(".build_cache", {recursive: true})
    try {
        await fs.promises.access(".git")
        await new Promise((resolve, err) => {
            exec("git rev-list --count HEAD > .build_cache/count", (execerr, stdout, stderr) => {
                if (execerr) err(execerr)
                resolve(stdout.trim())
            })
        })
    }
    catch {
        ; // Not in a git directory - don't do anything
    }
    return versionstr + "pre" + (await fs.promises.readFile(".build_cache/count", {encoding: "utf8"})).trim()
}

async function get_hash() {
    await fs.promises.mkdir(".build_cache", {recursive: true})
    try {
        await fs.promises.access(".git")
        await new Promise((resolve, err) => {
            exec("git rev-parse --short HEAD > .build_cache/hash", (execerr, stdout, stderr) => {
                if (execerr) err(execerr)
                resolve(stdout.trim())
            })
        })
    }
    catch {
        ; // Not in a git directory - don't do anything
    }
    return (await fs.promises.readFile(".build_cache/hash", {encoding: "utf8"})).trim()
}

function make_update_json(versionstr) {
    return {
        addons: {
            "tridactyl.vim.betas@cmcaine.co.uk": {
                updates: [
                    {
                        version: versionstr,
                        update_link:
                            "https://tridactyl.cmcaine.co.uk/betas/tridactyl2-" +
                            versionstr +
                            ".xpi",
                    },
                ],
            },
            "tridactyl.vim.betas.nonewtab@cmcaine.co.uk": {
                updates: [
                    {
                        version: versionstr,
                        update_link:
                            "https://tridactyl.cmcaine.co.uk/betas/nonewtab/tridactyl_nonewtab_beta-" +
                            versionstr +
                            ".xpi",
                    },
                ],
            },
        },
    }
}

function save_manifest(filename, manifest) {
    // Save file
    const fs = require("fs")
    fs.writeFileSync(filename, JSON.stringify(manifest, null, 4))
}

async function main() {
    let filename, manifest, releaseName
    switch (process.argv[2]) {
        case "bump": {
            // Load src manifest and bump
            filename = "./src/manifest.json"
            manifest = require("." + filename)
            set_release_version(
                manifest,
                Number(process.argv[3]),
                process.argv.slice(4).join(" "),
            )
            const changelog = fs.readFileSync("./CHANGELOG.md", "utf8")
            const releaseHeading = `Release ${manifest.version} / Unreleased`
            const releaseNotes = changelog
                .split(/(?=^#+ Release )/m)
                .find(notes =>
                    notes.split("\n", 1)[0].trimEnd().endsWith(releaseHeading),
                )
            if (!releaseNotes) {
                throw new Error(`No ${releaseHeading} changelog entry`)
            }
            const datedReleaseNotes = releaseNotes.replace(
                "Unreleased",
                new Date().toISOString().slice(0, 10),
            )
            fs.writeFileSync(
                "./CHANGELOG.md",
                changelog.replace(releaseNotes, () => datedReleaseNotes),
            )
            save_manifest(filename, manifest)
            execFileSync("git", ["add", filename, "./CHANGELOG.md"])
            execFileSync("git", [
                "commit",
                "--cleanup=verbatim",
                "-m",
                `release ${manifest.version}`,
                "-m",
                datedReleaseNotes.trim(),
            ])
            execFileSync("git", ["tag", manifest.version])
            console.log(
                `Make sure you use the release checklist before committing this.`,
            )
            console.log(`https://github.com/tridactyl/tridactyl/issues/714`)
            break
        }
        case "beta":
            filename = "./build/manifest.json"
            manifest = require("." + filename)
            releaseName = release_name(manifest)
            manifest.version = await add_beta(manifest.version)
            manifest.version_name = [manifest.version + "-" + (await get_hash()), releaseName].filter(Boolean).join(" ")
            manifest.applications.gecko.update_url =
                "https://tridactyl.cmcaine.co.uk/betas/updates.json"

            try {
                // Make and write updates.json
                save_manifest(
                    "../../public_html/betas/updates.json",
                    make_update_json(manifest.version),
                )
            } catch(e) {
                console.warn("Unless you're the buildbot, ignore this error: " + e)
            }

            // Save manifest.json
            save_manifest(filename, manifest)
            break
        default:
            throw "Unknown command!"
    }
}

if (require.main === module) main()

module.exports = { set_release_version }
