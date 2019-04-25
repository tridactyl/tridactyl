import * as excmd_lib from "@src/lib/excmd_lib"
import * as _excmds from "@src/excmds/_open"
type ft = typeof _excmds
type ArgumentsType<T> = T extends (...args: infer U) => any ? U: never;
export default excmd_lib.forwardedToBackground("background_excmds/open", _excmds) as {
    [k in keyof ft]: (...args: ArgumentsType<ft[k]>) => ReturnType<ft[k]> }
