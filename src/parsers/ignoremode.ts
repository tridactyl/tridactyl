import { hasModifiers } from "../keyseq"

// Placeholder - should be moved into generic parser
export function parser(keys) {
    const response = { keys: [], exstr: undefined }
    if (
        (keys[0].shiftKey && keys[0].key === "Insert") ||
        (keys[0].altKey && keys[0].ctrlKey && keys[0].key === "Escape") ||
        (keys[0].altKey && keys[0].ctrlKey && keys[0].key === "`")
    ) {
        return { keys: [], exstr: "mode normal" }
    }
    return { keys: [], exstr: undefined }
}
