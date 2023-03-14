const TypeDoc = require("typedoc");


// Make the theme

// Theme docs: https://github.com/TypeStrong/typedoc/blob/master/internal-docs/custom-themes.md
// Theme example: https://github.com/Gerrit0/typedoc-custom-theme-demo/blob/main/src/index.tsx
function load(app) {
    app.renderer.defineTheme("tridactyl", TypeDoc.DefaultTheme);
}



// Build the docs
async function main() {
    const app = new TypeDoc.Application();
    // console.log(app.options);

    // Load our theme
    load(app);

    // Read the tsconfig.json
    app.options.addReader(new TypeDoc.TSConfigReader());

    app.bootstrap({
        // typedoc options here
        entryPoints: ["src"],
        theme: "tridactyl",
        entryPointStrategy: "expand",
        skipErrorChecking: true,
        exclude: "src/**/?(test_utils|*.test).ts",
    });

    const project = app.convert();

    if (project) {
        // Project may not have converted correctly
        const outputDir = "generated/static/docs";

        // Rendered docs
        await app.generateDocs(project, outputDir);
    }
}

main().catch(console.error);
