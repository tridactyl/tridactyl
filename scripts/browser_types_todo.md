# Browser API type-checking TODO

The implemented contract and checks are documented in `browser_types.md`.

- Generate context-specific clones where conservative shared-interface filtering is unnecessarily restrictive.
- Transform independently versioned fields in inline object-literal inputs/results and aliases to named interfaces.
- Proxy nested event adapters if they ever need to be called outside the background process.
