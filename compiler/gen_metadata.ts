import * as ts from "typescript"
import * as fs from "fs"
import * as commandLineArgs from "command-line-args"

class SimpleType {
    name: string
    kind: string
    // Support for generics is mostly done but it might not be needed for now
    // generics: Array<SimpleType>
    arguments: Array<SimpleType>
    type: SimpleType

    constructor(typeNode) {
        switch (typeNode.kind) {
            case ts.SyntaxKind.VoidKeyword:
                this.kind = "void"
                break
            case ts.SyntaxKind.AnyKeyword:
                this.kind = "any"
                break
            case ts.SyntaxKind.BooleanKeyword:
                this.kind = "boolean"
                break
            case ts.SyntaxKind.NumberKeyword:
                this.kind = "number"
                break
            case ts.SyntaxKind.ObjectKeyword:
                this.kind = "object"
                break
            case ts.SyntaxKind.StringKeyword:
                this.kind = "string"
                break
            case ts.SyntaxKind.Parameter:
                // 149 is "Parameter". We don't care about that so let's
                // convert its type into a SimpleType and grab what we need from it
                let ttype = new SimpleType(typeNode.type)
                this.kind = ttype.kind
                // this.generics = ttype.generics
                this.arguments = ttype.arguments
                this.type = ttype.type
                this.name = typeNode.name.original.escapedText
                break
            case ts.SyntaxKind.TypeReference:
                // 162 is "TypeReference". Not sure what the rules are here but it seems to be used for generics
                this.kind = typeNode.typeName.escapedText
                if (typeNode.typeArguments) {
                    this.arguments = typeNode.typeArguments.map(
                        t => new SimpleType(typeNode.typeArguments[0]),
                    )
                }
                break
            case ts.SyntaxKind.FunctionType:
                this.kind = "function"
                // Probably don't need generics for now
                // this.generics = (typeNode.typeParameters || []).map(p => new SimpleType(p))
                this.arguments = typeNode.parameters.map(p => new SimpleType(p))
                this.type = new SimpleType(typeNode.type)
                break
            case ts.SyntaxKind.TypeLiteral:
                // This is a type literal. i.e., something like this: { [str: string]: string[] }
                // Very complicated and perhaps not useful to know about. Let's just say "object" for now
                this.kind = "object"
                break
            case ts.SyntaxKind.ArrayType:
                this.kind = "array"
                this.type = new SimpleType(typeNode.elementType)
                break
            case ts.SyntaxKind.TupleType:
                this.kind = "tuple"
                this.arguments = typeNode.elementTypes.map(
                    t => new SimpleType(t),
                )
                break
            case ts.SyntaxKind.UnionType:
                this.kind = "union"
                this.arguments = typeNode.types.map(t => new SimpleType(t))
                break
            case ts.SyntaxKind.LiteralType:
                // "LiteralType". I'm not sure what this is. Probably things like type a = "b" | "c"
                this.kind = "LiteralType"
                this.name = typeNode.literal.text
                break
            default:
                console.log(typeNode)
                throw new Error(
                    `Unhandled kind (${typeNode.kind}) for ${typeNode}`,
                )
        }
    }
}

/** True if this is visible outside this file, false otherwise */
function isNodeExported(node: ts.Node): boolean {
    return (
        (ts.getCombinedModifierFlags(<ts.Declaration>node) &
            ts.ModifierFlags.Export) !==
            0 ||
        (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
    )
}

function visit(checker: any, filename: string, node: any, everything: any) {
    switch (node.kind) {
        case ts.SyntaxKind.FunctionDeclaration:
            let symbol = checker.getSymbolAtLocation(node.name)
            if (symbol && isNodeExported(node)) {
                everything[filename] = everything[filename] || {}
                let file = everything[filename]

                let nodeName = symbol.escapedName
                file[nodeName] = file[nodeName] || {}
                let nodeInfo = file[nodeName]
                nodeInfo["doc"] = nodeInfo["doc"] || []

                let doc = ts.displayPartsToString(
                    symbol.getDocumentationComment(),
                )
                if (doc && !nodeInfo["doc"].includes(doc))
                    nodeInfo["doc"].push(doc)

                let ttype = checker.getTypeOfSymbolAtLocation(
                    symbol,
                    symbol.valueDeclaration!,
                )
                if (ttype) {
                    nodeInfo["type"] = new SimpleType(
                        checker.typeToTypeNode(ttype),
                    )
                }
            }
            break
        // Other declaration syntaxkinds:
        // case ts.SyntaxKind.VariableDeclaration:
        // case ts.SyntaxKind.VariableDeclarationList:
        // case ts.SyntaxKind.PropertyDeclaration:
        // case ts.SyntaxKind.MethodDeclaration:
        // case ts.SyntaxKind.EndOfDeclarationMarker:
        // case ts.SyntaxKind.MergeDeclarationMarker:
        // case ts.SyntaxKind.MissingDeclaration:
        // case ts.SyntaxKind.ClassDeclaration
        // case ts.SyntaxKind.ClassExpression:
        // case ts.SyntaxKind.ClassDeclaration:
        // case ts.SyntaxKind.InterfaceDeclaration:
        // case ts.SyntaxKind.TypeAliasDeclaration:
        // case ts.SyntaxKind.EnumDeclaration:
        // case ts.SyntaxKind.ModuleDeclaration:
        // case ts.SyntaxKind.ImportEqualsDeclaration:
        // case ts.SyntaxKind.ImportDeclaration:
        // case ts.SyntaxKind.NamespaceExportDeclaration:
        // case ts.SyntaxKind.ExportDeclaration:
        // case ts.SyntaxKind.Constructor:
    }

    ts.forEachChild(node, node => visit(checker, filename, node, everything))
}

function generateMetadata(
    out: string,
    themedir: string,
    fileNames: string[],
): void {
    /* Parse Tridactyl */
    let program = ts.createProgram(fileNames, {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.CommonJS,
    })

    let everything = {}

    for (const sourceFile of program.getSourceFiles()) {
        let n = (fileNames as any).find(name => sourceFile.fileName.match(name))
        if (n) visit(program.getTypeChecker(), n, sourceFile, everything)
    }

    let metadataString = `\nexport let everything = ${JSON.stringify(
        everything,
        undefined,
        4,
    )}\n`

    if (themedir) {
        metadataString += `\nexport let staticThemes = ${JSON.stringify(
            fs.readdirSync(themedir),
        )}\n`
    }

    // print out the doc
    fs.writeFileSync(out, metadataString)

    return
}

let opts = commandLineArgs([
    { name: "out", type: String },
    { name: "themeDir", type: String },
    { name: "src", type: String, multiple: true, defaultOption: true },
])

if (!opts.out || opts.src.length < 1)
    throw new Error(
        "Argument syntax: --out outfile [--src] file1.ts [file2.ts ...]",
    )

generateMetadata(opts.out, opts.themeDir, opts.src)
