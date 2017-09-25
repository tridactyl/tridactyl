// Interfaces common to the tridactyl project.

// For some obscure reason, tsc doesn't like .d.ts files to share a name with
// .ts files. So don't do that.

interface Number {
    mod(n: number): number
}

interface Message {
    command?: string
    string?: string
    number?: number
}


