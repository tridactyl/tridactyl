export function isContentScript(): boolean {
    return !('tabs' in browser)
}