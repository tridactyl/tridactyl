const pnpPlugin = require('@yarnpkg/esbuild-plugin-pnp')
const esbuild = require('esbuild')

for (let f of ["content", "background", "help", "newtab", "commandline_frame"]) {
    esbuild.build({
        plugins: [pnpPlugin.pnpPlugin()],
        entryPoints: [`src/${f}.ts`],
        bundle: true,
        sourcemap: true,
        target: "firefox68",
        outfile: `buildtemp/${f}.js`,
    }).catch(() => process.exit(1))
}
