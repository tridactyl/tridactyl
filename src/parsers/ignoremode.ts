import { hasModifiers } from "../keyseq"

// Placeholder - should be moved into generic parser
export function parser(keys) {
    const response = { keys: [], exstr: undefined }
    if (keys[0].shiftKey && keys[0].key === "Insert") {
        return { keys: [], exstr: "mode normal" }
    }
    return { keys: [], exstr: undefined }
}
