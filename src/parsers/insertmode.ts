import { hasModifiers } from "../keyseq"

// Placeholder - should be moved into generic parser
export function parser(keys) {
    const response = { keys: [], exstr: undefined }
    if (!hasModifiers(keys[0])) {
        if (keys[0].key === "Escape") {
            return { keys: [], exstr: "unfocus" }
        }
    }
    return { keys: [], exstr: undefined }
}
