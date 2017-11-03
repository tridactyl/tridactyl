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
    devtool: "source-map",

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
            'python3 src/excmds_macros.py', './src/commandline_injector.sh src/static/docs/modules/_excmds_.html'
        ]}),
        new CopyWebPackPlugin([
            { from: "src/manifest.json" },
            { from: "src/static", to: "static" },
        ]),
    ]
}
