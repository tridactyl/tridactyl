import { MinimalKey } from "@src/lib/keyseq"
import * as nmode from "@src/parsers/nmode"

const key = (keyup = false) => new MinimalKey("Enter", { keyup })

test("an initial keyup does not count unless nmode is strict", () => {
    nmode.init("mode normal", "ignore", 1)
    expect(nmode.parser([key(true)]).exstr).toBeUndefined()
    expect(nmode.parser([key()]).exstr).toBe("mode normal")

    nmode.init("mode normal", "ignore", 1, true)
    expect(nmode.parser([key(true)]).exstr).toBe("mode normal")
})
