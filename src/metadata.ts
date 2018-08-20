// Gets the type sitting inside a promise
function unwrapPromise(type) {
    while (type.kind == "Promise") type = type.arguments[0]
    return type
}

// This turns TYPE into a string, the format of which is quite short in order to be useful for completions
export function typeToSimpleString(type): string {
    let result = ""
    switch (type.kind) {
        case "function":
            result = type.arguments.map(typeToSimpleString).join(", ")
            let t = unwrapPromise(type.type)
            if (!["any", "object", "void"].includes(t.kind)) {
                if (result == "") result = "()"
                result += "->" + typeToString(t)
            }
            break
        default:
            result = type.name || ""
    }
    return result
}

// This turns TYPE into a string, the format of which is quite close to the one tsc uses to display type strings
export function typeToString(type): string {
    let allTypes = arr => arr.map(typeToString).join(", ")
    let result = ""
    switch (type.kind) {
        case "function":
            result =
                "(" +
                allTypes(type.arguments) +
                ")" +
                " => " +
                typeToString(type.type)
            break
        case "array":
            result = typeToString(type.type) + "[]"
            break
        case "Promise":
            result = "Promise<" + allTypes(type.arguments) + ">"
            break
        case "union":
            result = type.arguments.map(typeToString).join(" | ")
            break
        case "LiteralType":
            result = type.name
            break
        case "tuple":
            result = "(" + type.arguments.map(typeToString).join(", ") + ")"
        case "any":
        case "object":
        case "boolean":
        case "number":
        case "string":
        case "void":
        default:
            result = type.kind
    }

    let name = ""
    // If the type has a name, it could be interesting to add it to the string
    // representation of the type. However, when the type is a LiteralType, the
    // name is already in result, so there's no need to add it.
    if (type.kind != "LiteralType" && type.name) name = type.name + ": "
    return name + result
}
