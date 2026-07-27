#!/usr/bin/env node

const fs = require("fs")
const path = require("path")
const root = path.resolve(__dirname, "..")
const source = path.join(root, "doc/glossary.jsonl")
const entries = []
const anchors = new Set()

for (const [index, line] of fs
    .readFileSync(source, "utf8")
    .split("\n")
    .entries()) {
    if (!line.trim()) continue
    let entry
    try {
        entry = JSON.parse(line)
    } catch (error) {
        throw new Error(`${source}:${index + 1}: ${error.message}`)
    }
    if (
        !entry ||
        typeof entry.word !== "string" ||
        typeof entry.definition !== "string" ||
        !entry.word.trim() ||
        !entry.definition.trim()
    )
        throw new Error(
            `${source}:${index + 1}: word and definition must be non-empty strings`,
        )
    const word = entry.word.trim().normalize("NFC")
    const definition = entry.definition.trim()
    const anchor = word.toLowerCase()
    if (anchors.has(anchor))
        throw new Error(
            `${source}:${index + 1}: duplicate word ${JSON.stringify(word)}`,
        )
    anchors.add(anchor)
    entries.push({ word, definition, anchor })
}

if (!entries.length) throw new Error(`${source}: glossary must not be empty`)
entries.sort((a, b) => (a.word < b.word ? -1 : a.word > b.word ? 1 : 0))
const escape = value =>
    value.replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`)
const body = [
    "<h1>Glossary</h1>",
    "<p>Terms used in Tridactyl&#39;s documentation.</p>",
    '<dl class="glossary-list">',
    ...entries.map(
        entry =>
            `<div class="glossary-entry" id="${escape(entry.anchor)}"><dt><code>${escape(entry.word)}</code></dt><dd>${escape(entry.definition)}</dd></div>`,
    ),
    "</dl>",
].join("\n")
let html = fs.readFileSync(
    path.join(root, "src/static/clippy/tutor.template.html"),
    "utf8",
)
for (const [marker, replacement] of [
    ["<title>Tridactyl Tutorial</title>", "<title>Tridactyl Glossary</title>"],
    ['href="./glossary.html"', 'aria-current="page" href="./glossary.html"'],
    ["REPLACETHIS", body],
]) {
    if (html.split(marker).length !== 2)
        throw new Error(
            `Expected one ${JSON.stringify(marker)} in tutor.template.html`,
        )
    html = html.replace(marker, replacement)
}

fs.writeFileSync(
    path.join(root, "src/.glossary.generated.json"),
    JSON.stringify(entries),
)
fs.writeFileSync(path.join(root, "generated/static/clippy/glossary.html"), html)
