const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin")
const CopyWebPackPlugin = require("copy-webpack-plugin")

const fileExtensions = [".ts", ".tsx", ".js", ".json"]

module.exports = function(env, argv) {
    return {

        mode: "development",
        // mode: "production", // Uncomment me for less helpful error messages

        // Enable sourcemaps for debugging webpack's output.
        devtool: "source-map",
        // devtool: "inline-source-map", // Uncomment me for more helpful error messages

        // NB: duplicate these files in scripts/esbuild.js
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


        resolve: {
            // Add '.ts' and '.tsx' as resolvable extensions.
            extensions: fileExtensions,
            plugins: [new TsconfigPathsPlugin({extensions: fileExtensions})],
            // NB: items below also need to be added to the package.json "browser" field
            // or quick builds won't work
            fallback: {
                "url": false,
                "fs": false,
                "https": false,
                "http": false,
                "path": false,
                "timers": false,
                "stream": require.resolve("stream-browserify"),
            },
        },

        module: {
            rules: [
                { test: /\.ts?$/, loader: "ts-loader" },

                // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
                { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },
            ],
        },

        plugins: [
            new CopyWebPackPlugin({patterns: [
                { from: "src/manifest.json" },
                {
                    from: "src/static",
                    to: "static",
                    globOptions: {
                        ignore: ["**/*.psd", "**/*1024px.png"],
                    },
                },
                { from: "generated/static", to: "static" },
                { from: "issue_template.md" },
            ]}),
        ],
    }
}
