import * as excmd_lib from "@src/lib/excmd_lib"
import * as _excmds from "@src/excmds/_clipboard"
export default excmd_lib.forwardedToBackground("background_excmds/clipboard", _excmds)
