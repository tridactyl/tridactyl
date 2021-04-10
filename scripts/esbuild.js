const esbuild = require('esbuild')

for (let f of ["content", "background", "help", "newtab", "commandline_frame"]) {
        esbuild.build({
        entryPoints: [`src/${f}.ts`],
        bundle: true,
        sourcemap: true,
        target: "firefox68",
        outfile: `build/${f}.js`,
    }).catch(() => process.exit(1))
}
