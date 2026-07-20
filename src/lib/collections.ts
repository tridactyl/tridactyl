const selectorPattern = /^_(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/

export const isSelector = (source: string) => selectorPattern.test(source)

export function selector(source: string): (value: any) => any {
    if (!selectorPattern.test(source))
        throw new Error(`Invalid selector: ${source}`)
    const path = source.split(".").slice(1)
    return value => path.reduce((current, property) => current[property], value)
}

function array(values: any): any[] {
    if (!Array.isArray(values)) throw new Error("Expected an array")
    return values
}

export function map(source: string, values: any[]): any[] {
    return array(values).map(selector(source))
}

export function filter(source: string, values: any[]): any[] {
    return array(values).filter(selector(source))
}
