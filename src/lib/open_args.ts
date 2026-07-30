export const tabopenArgs = {
    "-b": Boolean,
    "-p": Boolean,
    "-w": Boolean,
    "-c": String,
    "--focus-address-bar": Boolean,
    "--discard": Boolean,
}

export const winopenArgs = {
    "-private": Boolean,
    "-popup": Boolean,
    "-c": String,
}

export function getOpenArgs(command: string) {
    return command === "tabopen"
        ? tabopenArgs
        : command === "winopen"
          ? winopenArgs
          : undefined
}
