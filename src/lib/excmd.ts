export interface ExProgram {
    source: string
    exversion: 2
}

export const EX_CANCELLED = Object.freeze({
    __tridactylExOutcome: "cancelled" as const,
})

export function isExCancelled(value: unknown): value is typeof EX_CANCELLED {
    return (
        typeof value === "object" &&
        value !== null &&
        (value as typeof EX_CANCELLED).__tridactylExOutcome === "cancelled"
    )
}

export type ExCommand = string | ExProgram

export const stripLeadingColons = (source: string) =>
    source.replace(/^(\s*):+/, "$1")

export function isExProgram(command: unknown): command is ExProgram {
    return (
        typeof command === "object" &&
        command !== null &&
        (command as ExProgram).exversion === 2 &&
        typeof (command as ExProgram).source === "string"
    )
}

export const programSource = (command: ExCommand) =>
    isExProgram(command) ? command.source : command

export const formatExProgram = (command: ExCommand) => {
    if (!isExProgram(command)) return command
    const prefix = command.source.startsWith("\n") ? "" : "\n"
    const suffix = command.source.endsWith("\n") ? "" : "\n"
    return `{${prefix}${command.source}${suffix}}`
}

export function joinExCommand(parts: ExCommand[]): ExCommand {
    const programs = parts.filter(isExProgram)
    if (!programs.length) return (parts as string[]).join(" ")
    if (parts.length === 1) return programs[0]
    throw new Error("An ex block must be the only program argument")
}
