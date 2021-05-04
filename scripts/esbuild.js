const esbuild = require('esbuild')
const fs = require('fs')

for (let f of ["content", "background", "help", "newtab", "commandline_frame"]) {
        esbuild.build({
        entryPoints: [`src/${f}.ts`],
        bundle: true,
        sourcemap: true,
        target: "firefox68",
        outfile: `buildtemp/${f}.js`,
    }).catch(() => process.exit(1))
}

// TODO: replace the copywebpackplugin below
// await fs.promises.cp()
//
//                { from: "src/manifest.json" },
//                {
//                    from: "src/static",
//                    to: "static",
//                    globOptions: {
//                        ignore: ["**/*.psd", "**/*1024px.png"],
//                    },
//                },
//                { from: "generated/static", to: "static" },
//                { from: "issue_template.md" },
