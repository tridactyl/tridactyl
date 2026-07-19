const {
    Converter,
    DefaultTheme,
    IntrinsicType,
    JSX,
    ReflectionKind,
    ReflectionType,
    TypeScript: ts,
} = require("typedoc")

const h = JSX.createElement
const css = href => h("link", { rel: "stylesheet", href })

function restoreObjectLiteral(context, reflection, node) {
    const initializer = node && node.initializer
    if (!initializer || !ts.isObjectLiteralExpression(initializer)) return
    if (!initializer.properties.length) return

    if (reflection.type instanceof ReflectionType)
        context.project.removeReflection(reflection.type.declaration)
    const inferred = context.converter.convertType(
        context.withScope(reflection),
        context.checker.getTypeAtLocation(initializer),
    )
    if (!(inferred instanceof ReflectionType)) return

    const children = inferred.declaration.children || []
    inferred.declaration.children = undefined
    context.project.removeReflection(inferred.declaration)

    reflection.kind = ReflectionKind.ObjectLiteral
    reflection.type = new IntrinsicType("object")
    reflection.children = children
    for (const child of children) child.parent = reflection
}

class TridactylTheme extends DefaultTheme {
    constructor(renderer) {
        super(renderer)
        this.defaultLayoutTemplate = page => {
            const context = this.getRenderContext(page)
            const navigations = context.navigation(page).children
            const navigation = navigations[1] || navigations[0]
            navigation.props.class = "tsd-navigation secondary scroller"

            return h(
                "html",
                { class: "minimal no-js TridactylOwnNamespace" },
                h(
                    "head",
                    null,
                    h("meta", { charset: "utf-8" }),
                    h("meta", {
                        "http-equiv": "X-UA-Compatible",
                        content: "IE=edge",
                    }),
                    h(
                        "title",
                        null,
                        `${page.model.name} | ${page.project.name}`,
                    ),
                    h("meta", {
                        name: "viewport",
                        content: "width=device-width, initial-scale=1",
                    }),
                    css(context.relativeURL("assets/style.css")),
                    css(context.relativeURL("assets/highlight.css")),
                    h("script", { src: "/content.js" }),
                    h("script", { src: "/help.js" }),
                    css("/static/css/content.css"),
                    css("/static/css/hint.css"),
                    css("/static/css/viewsource.css"),
                    css("/static/typedoc/assets/css/main.css"),
                ),
                h(
                    "body",
                    null,
                    navigation,
                    h(
                        "div",
                        { class: "container container-main scroller" },
                        h(
                            "div",
                            { class: "content-wrap" },
                            page.template(page),
                        ),
                    ),
                ),
            )
        }
    }

    getUrls(project) {
        for (const child of project.children || []) {
            if (child.kind === ReflectionKind.Module)
                child.name = `"src/${child.name}"`
        }

        const names = Object.values(project.reflections).map(reflection => [
            reflection,
            reflection.name,
        ])
        for (const [reflection] of names)
            reflection.name = reflection.name
                .replace(/[^a-z0-9]/gi, "_")
                .toLowerCase()

        const urls = super.getUrls(project)
        for (const [reflection, name] of names) reflection.name = name

        const globals = urls.find(mapping => mapping.url === "modules.html")
        if (globals) globals.url = project.url = "globals.html"
        return urls
    }
}

exports.load = app => {
    app.converter.on(Converter.EVENT_CREATE_DECLARATION, restoreObjectLiteral, 100)
    app.renderer.defineTheme("tridactyl", TridactylTheme)
}
