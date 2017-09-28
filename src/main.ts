interface Number {
    mod(n: number): number
}

/** Conventional definition of modulo that never gives a -ve result. */
Number.prototype.mod = function (n: number): number {
    return Math.abs(this % n)
}

// Send keys to parser
keydown_background.onKeydown.addListener(Parsing.acceptKey)

// To eventually be replaced by:
// browser.keyboard.onKeydown.addListener(Parsing.acceptKey)
