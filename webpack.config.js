const UglifyJSPlugin = require('uglifyjs-webpack-plugin')
const CopyWebPackPlugin = require('copy-webpack-plugin')
const WebpackShellPlugin = require('webpack-shell-plugin')

module.exports = {
    entry: {
        background: "./src/background.ts",
        content: "./src/content.ts",
        commandline_frame: "./src/commandline_frame.ts",
    },
    output: {
        filename: "[name].js",
        path: __dirname + "/build"
    },

    // Enable sourcemaps for debugging webpack's output.
    devtool: "inline-source-map",

    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js", ".json"]
    },

    module: {
        rules: [
            // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
            { test: /\.tsx?$/, loader: "awesome-typescript-loader" },

            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            { enforce: "pre", test: /\.js$/, loader: "source-map-loader" }
        ]
    },

    plugins: [
        // new UglifyJSPlugin({
        //     uglifyOptions: {
        //         ecma: 8
        //     }
        // }),
        new WebpackShellPlugin({onBuildStart: [
            'scripts/excmds_macros.py',
            'scripts/make_docs.sh &',
        ]}),
        new CopyWebPackPlugin([
            { from: "src/manifest.json" },
            { from: "src/static", to: "static" },
            { from: "generated/static", to: "static" },
        ]),
    ]
}
