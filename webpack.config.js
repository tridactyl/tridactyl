const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin")
const CopyWebPackPlugin = require("copy-webpack-plugin")
const webpack = require("webpack")
const fileExtensions = [".ts", "tsx", ".js", ".json"]

module.exports = (env, argv) => {
    let plugins = [
        new CopyWebPackPlugin({patterns: [
            { from: "src/manifest.json" },
            {
                from: "src/static",
                to: "static",
                globOptions: {
                    ignore: ["*.psd", "*1024px.png"],
                }
            },
            { from: "generated/static", to: "static" },
            { from: "issue_template.md" },
        ]}),
    ]
    if (argv.browser === 'chrome') {
        plugins.push(
            new webpack.ProvidePlugin({
                browser: 'webextension-polyfill-for-webpack',
            })
        )
    }
    return {
        mode: "development",
        entry: {
            background: "./src/background.ts",
            content: "./src/content.ts",
            commandline_frame: "./src/commandline_frame.ts",
            help: "./src/help.ts",
            newtab: "./src/newtab.ts",
        },
        output: {
            filename: "[name].js",
            path: __dirname + "/build",
        },

        // Enable sourcemaps for debugging webpack's output.
        devtool: "source-map",
        // devtool: "inline-source-map", // Uncomment me for more helpful error messages

        resolve: {
            // Add '.ts' and '.tsx' as resolvable extensions.
            extensions: fileExtensions,
            plugins: [new TsconfigPathsPlugin({extensions: fileExtensions})]
        },

        module: {
            rules: [
                // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
                { test: /\.tsx?$/, loader: "ts-loader" },

                // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
                { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },
            ],
        },
        plugins,
        // Fix css
        // https://github.com/webpack-contrib/css-loader/issues/447#issuecomment-285598881
        node: {
            fs: "empty",
        },
    }
}
