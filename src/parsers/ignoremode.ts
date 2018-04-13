import { hasModifiers } from "../keyseq"

// Placeholder - should be moved into generic parser
export function parser(keys) {
    const response = { keys: [], ex_str: undefined }
    if (keys[0].shiftKey && keys[0].key === "Escape") {
        return { keys: [], ex_str: "mode normal" }
    }
    return { keys: [], ex_str: undefined }
}
