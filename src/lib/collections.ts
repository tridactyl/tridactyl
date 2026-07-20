const identifier = "[A-Za-z_$][A-Za-z0-9_$]*"
const selectorSource = `_(?:\\.${identifier}|\\[\\d+\\])*`
const selectorPattern = new RegExp(`^${selectorSource}$`)
const methodPattern = new RegExp(
    `^(${selectorSource})\\.(includes|startsWith|endsWith)\\((.*)\\)$`,
)
const comparisons: Record<string, (left: any, right: any) => boolean> = {
    "==": (left, right) => left === right,
    "!=": (left, right) => left !== right,
    ">=": (left, right) => left >= right,
    "<=": (left, right) => left <= right,
    ">": (left, right) => left > right,
    "<": (left, right) => left < right,
}

export const isExpression = (source: string) =>
    source.trim().startsWith("(") ||
    /^_(?:$|[.\s<>=!&|]|\[)/.test(source.trim())

export function selector(source: string): (value: any) => any {
    if (!selectorPattern.test(source))
        throw new Error(`Invalid selector: ${source}`)
    const path = source
        .slice(1)
        .split(/(?=\.|\[)/)
        .filter(Boolean)
        .map(part => (part[0] === "." ? part.slice(1) : part.slice(1, -1)))
    return value => path.reduce((current, property) => current[property], value)
}

function operand(source: string): (value: any) => any {
    source = source.trim()
    if (source.startsWith("(") && source.endsWith(")"))
        return compile(source.slice(1, -1))
    const method = methodPattern.exec(source)
    if (method) {
        const object = selector(method[1])
        const argument = compile(method[3])
        return value => call(method[2], object(value), argument(value))
    }
    if (selectorPattern.test(source)) return selector(source)
    if (source === "true") return () => true
    if (source === "false") return () => false
    if (source === "null") return () => null
    if (/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(source))
        return () => Number(source)
    const string = stringLiteral(source)
    if (string !== undefined) return () => string
    throw new Error(`Invalid expression: ${source}`)
}

function stringLiteral(source: string): string | undefined {
    if (/^'[^'\\\r\n]*'$/.test(source)) return source.slice(1, -1)
    if (source.startsWith('"') && source.endsWith('"'))
        try {
            const value = JSON.parse(source)
            if (typeof value === "string") return value
        } catch (_) {}
    return undefined
}

function split(source: string, operators: readonly string[]) {
    let quote = ""
    let depth = 0
    for (let index = 0; index < source.length; index++) {
        const character = source[index]
        if (quote) {
            if (character === "\\") index++
            else if (character === quote) quote = ""
        } else if (character === "'" || character === '"') quote = character
        else if (character === "(") depth++
        else if (character === ")") depth--
        else if (depth === 0) {
            const operator = operators.find(operator =>
                source.startsWith(operator, index),
            )
            if (operator)
                return [
                    source.slice(0, index),
                    operator,
                    source.slice(index + operator.length),
                ] as const
        }
    }
    return undefined
}

function call(method: string, object: any, argument: any) {
    if (method === "includes" && Array.isArray(object))
        return Array.prototype.includes.call(object, argument)
    if (typeof object !== "string")
        throw new Error(`${method} requires a string`)
    if (method === "includes") return object.includes(argument)
    if (method === "startsWith") return object.startsWith(argument)
    return object.endsWith(argument)
}

function compile(source: string): (value: any) => any {
    source = source.trim()
    const logical = split(source, ["||"]) || split(source, ["&&"])
    if (logical) {
        const left = compile(logical[0])
        const right = compile(logical[2])
        return logical[1] === "||"
            ? value => Boolean(left(value)) || Boolean(right(value))
            : value => Boolean(left(value)) && Boolean(right(value))
    }
    const parts = split(source, Object.keys(comparisons))
    if (!parts) return operand(source)
    const [leftSource, operator, rightSource] = parts
    const left = operand(leftSource)
    const right = operand(rightSource)
    return value => comparisons[operator](left(value), right(value))
}

export function expression(source: string): (value: any) => any {
    if (!isExpression(source)) throw new Error(`Invalid expression: ${source}`)
    return compile(source)
}

function array(values: any): any[] {
    if (!Array.isArray(values)) throw new Error("Expected an array")
    return values
}

export function map(source: string, values: any[]): any[] {
    return array(values).map(expression(source))
}

export function filter(source: string, values: any[]): any[] {
    return array(values).filter(expression(source))
}

export function join(source: string, values: any[]): string {
    const list = array(values)
    if (!source) return Array.prototype.join.call(list)
    const separator = stringLiteral(source)
    if (separator === undefined && /^['"]/.test(source))
        throw new Error(`Invalid separator: ${source}`)
    return Array.prototype.join.call(
        list,
        separator === undefined ? source : separator,
    )
}
