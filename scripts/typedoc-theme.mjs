import {
    Converter,
    DefaultTheme,
    IntrinsicType,
    JSX,
    KindRouter,
    PageKind,
    Reflection,
    ReflectionKind,
    ReflectionType,
    Slugger,
    TypeScript as ts,
} from "typedoc"

const h = JSX.createElement
const css = href => h("link", { rel: "stylesheet", href })
const cleanName = name => name.replace(/[^a-z0-9]/gi, "_").toLowerCase()
const isGeneratedSource = source =>
    /\/\.[^/]+\.generated\.ts$/.test(source.fullFileName)

function rewriteWikiLinks(parts, owner, reflections) {
    return parts.flatMap(part => {
        if (part.kind !== "text" || !part.text.includes("[[")) return part

        const out = []
        let end = 0
        for (const match of part.text.matchAll(
            /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
        )) {
            if (match.index > end)
                out.push({
                    kind: "text",
                    text: part.text.slice(end, match.index),
                })
            const candidates = reflections.get(match[1]) || []
            const ownerModule = getModule(owner)
            const target =
                (!owner.kindOf(
                    ReflectionKind.Module | ReflectionKind.Namespace,
                ) &&
                    candidates.find(
                        candidate => candidate.parent === owner.parent,
                    )) ||
                candidates.find(
                    candidate => getModule(candidate) === ownerModule,
                ) ||
                candidates.find(
                    candidate =>
                        !candidate.kindOf(
                            ReflectionKind.Module | ReflectionKind.Namespace,
                        ) &&
                        !candidate.sources?.some(isGeneratedSource),
                ) ||
                candidates.find(
                    candidate =>
                        !candidate.kindOf(
                            ReflectionKind.Module | ReflectionKind.Namespace,
                        ),
                ) ||
                candidates[0]
            out.push(
                target
                    ? {
                          kind: "inline-tag",
                          tag: "@link",
                          text: match[2] || match[1],
                          target,
                      }
                    : { kind: "text", text: match[2] || match[1] },
            )
            end = match.index + match[0].length
        }
        if (end < part.text.length)
            out.push({ kind: "text", text: part.text.slice(end) })
        return out
    })
}

function getModule(reflection) {
    while (reflection.parent && !reflection.parent.isProject())
        reflection = reflection.parent
    return reflection
}

function escapeDependencyTags(parts) {
    return parts.map(part =>
        part.kind === "text"
            ? {
                  ...part,
                  text: part.text.replace(
                      /<(\/?)(iframe|object|frame)>/gi,
                      "&lt;$1$2&gt;",
                  ),
              }
            : part,
    )
}

function restoreWikiLinks(context) {
    const reflections = new Map()
    for (const reflection of Object.values(context.project.reflections)) {
        if (!reflection.isDeclaration()) continue
        const matches = reflections.get(reflection.name) || []
        matches.push(reflection)
        reflections.set(reflection.name, matches)
    }
    for (const reflection of Object.values(context.project.reflections)) {
        const fromDependency = reflection.sources?.some(source =>
            source.fullFileName.includes("/node_modules/"),
        )
        for (const source of reflection.sources || [])
            if (
                source.fullFileName.includes("/node_modules/") ||
                isGeneratedSource(source)
            )
                source.url = undefined
        const comment = reflection.comment
        if (!comment) continue
        comment.summary = rewriteWikiLinks(
            comment.summary,
            reflection,
            reflections,
        )
        for (const tag of comment.blockTags)
            tag.content = rewriteWikiLinks(tag.content, reflection, reflections)
        if (fromDependency) {
            comment.summary = escapeDependencyTags(comment.summary)
            for (const tag of comment.blockTags)
                tag.content = escapeDependencyTags(tag.content)
        }
    }
    if (context.project.readme)
        context.project.readme = rewriteWikiLinks(
            context.project.readme,
            context.project,
            reflections,
        )
}

function restoreObjectLiteral(context, reflection) {
    const node = context.getSymbolFromReflection(reflection)?.valueDeclaration
    const initializer = node && "initializer" in node && node.initializer
    if (!initializer || !ts.isObjectLiteralExpression(initializer)) return
    if (!initializer.properties.length) return

    if (reflection.type instanceof ReflectionType)
        context.project.removeTypeReflections(reflection.type)
    const inferred = context.converter.convertType(
        context.withScope(reflection),
        context.checker.getTypeAtLocation(initializer),
    )
    if (!(inferred instanceof ReflectionType)) return

    reflection.type = new IntrinsicType("object")
    context.project.mergeReflections(inferred.declaration, reflection)
}

class LegacySlugger extends Slugger {
    serialize(value) {
        return value.startsWith("\0") ? value.slice(1) : super.serialize(value)
    }
}

class TridactylRouter extends KindRouter {
    aliases = new Map()
    aliasCounts = new Map()

    getSlugger(target) {
        while (!this.sluggers.has(target)) target = target.parent
        let slugger = this.sluggers.get(target)
        if (!(slugger instanceof LegacySlugger)) {
            slugger = new LegacySlugger(this.sluggerConfiguration)
            this.sluggers.set(target, slugger)
        }
        return slugger
    }

    getPageKind(target) {
        if (!(target instanceof Reflection)) return
        if (
            target.kindOf(
                ReflectionKind.Class |
                    ReflectionKind.Interface |
                    ReflectionKind.Enum |
                    ReflectionKind.Module |
                    ReflectionKind.Namespace,
            )
        )
            return PageKind.Reflection
        if (target.kindOf(ReflectionKind.Document)) return PageKind.Document
    }

    getIdealBaseName(reflection) {
        const directory = this.directories.get(reflection.kind)
        const parts = []
        do {
            let name = reflection.name
            if (
                reflection.parent?.isProject() &&
                reflection.kind === ReflectionKind.Module
            )
                name = `"src/${name}"`
            parts.unshift(cleanName(name))
            reflection = reflection.parent
        } while (reflection && !reflection.isProject())
        return `${directory}/${parts.join(".")}`
    }

    getLegacyAlias(reflection, pageTarget) {
        if (this.aliases.has(reflection)) return this.aliases.get(reflection)

        const base = cleanName(reflection.name) || `reflection-${reflection.id}`
        let counts = this.aliasCounts.get(pageTarget)
        if (!counts) this.aliasCounts.set(pageTarget, (counts = new Map()))
        const count = counts.get(base) || 0
        const alias = count ? `${base}-${count}` : base
        counts.set(base, count + 1)
        this.aliases.set(reflection, alias)
        return alias
    }

    createAnchor(target, pageTarget) {
        if (!target.isDeclaration())
            return super.createAnchor(target, pageTarget)

        const parts = []
        for (
            let current = target;
            current !== pageTarget;
            current = current.parent
        )
            parts.unshift(this.getLegacyAlias(current, pageTarget))
        return this.getSlugger(pageTarget).slug("\0" + parts.join("."))
    }

    buildPages(project) {
        this.aliases.clear()
        this.aliasCounts.clear()
        const pages = super.buildPages(project)
        const globals = pages.find(page => page.url === "modules.html")
        if (globals) {
            globals.url = "globals.html"
            this.fullUrls.set(project, "globals.html")
        }
        return pages
    }
}

class TridactylTheme extends DefaultTheme {
    getReflectionClasses(reflection) {
        const kind = ReflectionKind.classString(reflection.kind)
        const parent =
            reflection.parent &&
            ReflectionKind.classString(reflection.parent.kind).replace(
                "tsd-kind-",
                "tsd-parent-kind-",
            )
        return [super.getReflectionClasses(reflection), kind, parent]
            .filter(Boolean)
            .join(" ")
    }

    constructor(renderer) {
        super(renderer)
        const reflectionTemplate = this.reflectionTemplate
        this.reflectionTemplate = page => {
            const content = reflectionTemplate(page)
            if (
                !page.model.kindOf(
                    ReflectionKind.Module | ReflectionKind.Namespace,
                )
            )
                return content

            const context = this.getRenderContext(page)
            page.pageSections.length = 0
            const renderMember = context.member
            context.member = reflection =>
                reflection.isReference() ? null : renderMember(reflection)
            return h(JSX.Fragment, null, content, context.members(page.model))
        }

        this.defaultLayoutTemplate = (page, template) => {
            const context = this.getRenderContext(page)
            const content = template(page)
            const helpLink = (label, href) =>
                h("li", null, h("a", { href }, label))
            const docLink = (label, url) =>
                helpLink(label, context.relativeURL(url))
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
                    h(
                        "nav",
                        { class: "tsd-navigation secondary scroller" },
                        h(
                            "section",
                            { class: "TridactylHelpNavigation" },
                            h("h3", null, "Help Pages"),
                            h(
                                "ul",
                                null,
                                docLink("Commands", "modules/_src_excmds_.html"),
                                docLink(
                                    "Settings",
                                    "classes/_src_lib_config_.default_config.html",
                                ),
                                docLink("Tutorial", "../clippy/1-tutor.html"),
                                docLink(
                                    "Editor Functions",
                                    "modules/_src_lib_editor_.html",
                                ),
                                docLink(
                                    "Command-Line Functions",
                                    "modules/_src_commandline_frame_.html",
                                ),
                                docLink(
                                    "Hint Mode Commands",
                                    "modules/_src_content_hinting_.html",
                                ),
                                helpLink(
                                    "Wiki",
                                    "https://github.com/tridactyl/tridactyl/wiki",
                                ),
                            ),
                        ),
                        context.pageNavigation(page),
                    ),
                    h(
                        "div",
                        { class: "container container-main scroller" },
                        h("div", { class: "content-wrap" }, content),
                    ),
                ),
            )
        }
    }
}

export function load(app) {
    app.converter.on(Converter.EVENT_RESOLVE_END, restoreWikiLinks, 100)
    app.converter.on(
        Converter.EVENT_CREATE_DECLARATION,
        restoreObjectLiteral,
        100,
    )
    app.renderer.defineRouter("tridactyl", TridactylRouter)
    app.renderer.defineTheme("tridactyl", TridactylTheme)
}
