#!/usr/bin/env node

const { spawnSync } = require("child_process")
const fs = require("fs")
const os = require("os")
const path = require("path")

const firefoxDir =
    process.platform === "win32"
        ? path.join(process.env.APPDATA || os.homedir(), "Mozilla", "Firefox")
        : process.platform === "darwin"
          ? path.join(os.homedir(), "Library", "Application Support", "Firefox")
          : path.join(os.homedir(), ".mozilla", "firefox")

function findDefaultProfile() {
    const sections = []
    let section
    for (const line of fs.readFileSync(path.join(firefoxDir, "profiles.ini"), "utf8").split(/\r?\n/)) {
        const header = line.trim().match(/^\[([^\]]+)\]$/)
        if (header) {
            section = { name: header[1] }
            sections.push(section)
        } else if (section) {
            const separator = line.indexOf("=")
            if (separator > 0) section[line.slice(0, separator)] = line.slice(separator + 1)
        }
    }
    const profilePath =
        sections.find(section => section.name.startsWith("Profile") && section.Name === "default-release")?.Path ??
        sections.find(section => section.name.startsWith("Install") && section.Default)?.Default ??
        sections.find(section => section.name.startsWith("Profile") && section.Default === "1")?.Path
    if (!profilePath) throw new Error(`No default profile found in ${firefoxDir}`)
    return path.isAbsolute(profilePath) ? profilePath : path.resolve(firefoxDir, profilePath)
}

try {
    const profile = process.argv[2] || findDefaultProfile()
    const command = process.platform === "win32" ? "web-ext.cmd" : "web-ext"
    const result = spawnSync(command, ["run", "--source-dir", "build/", "--firefox", "deved", "--pre-install", "--firefox-profile", profile, "--no-reload", "--pref", "browser.startup.page=3", "--pref", "browser.sessionstore.resume_from_crash=true"], { stdio: "inherit" })
    if (result.error) throw result.error
    process.exitCode = result.status ?? 1
} catch (error) {
    console.error(`runwithprofile: ${error.message}`)
    process.exitCode = 1
}
