import * as ts from "typescript"
import * as fs from "fs"
import * as commandLineArgs from "command-line-args"

/** True if this is visible outside this file, false otherwise */
function isNodeExported(node: ts.Node): boolean {
    return (
        (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0 ||
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
                if (ttype) nodeInfo["type"] = checker.typeToString(ttype)
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

function generateMetadata(out: string, fileNames: string[]): void {
    let program = ts.createProgram(fileNames, {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.CommonJS,
    })

    let everything = {}

    for (const sourceFile of program.getSourceFiles()) {
        let n = (fileNames as any).find(name => sourceFile.fileName.match(name))
        if (n) visit(program.getTypeChecker(), n, sourceFile, everything)
    }

    // print out the doc
    fs.writeFileSync(
        out,
        "export let everything = " + JSON.stringify(everything, undefined, 4),
    )

    return
}

let opts = commandLineArgs([
    { name: "out", type: String },
    { name: "src", type: String, multiple: true, defaultOption: true },
])

if (!opts.out)
    throw new Error(
        "Argument syntax: --out outfile [--src] file1.ts [file2.ts ...]",
    )

generateMetadata(opts.out, opts.src)
