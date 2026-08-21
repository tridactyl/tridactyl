# Browser API type-checking TODO

The generated browser types currently check top-level runtime API members, but they are not yet a complete minimum-version compatibility guarantee. The remaining work should fail closed rather than treating unknown or unimplemented behavior as supported.

## Versioned parameter and result fields

The generator preserves parameter and result interfaces from `@types/firefox-webext-browser` without applying BCD support data to their members. Code can therefore pass an option, event filter, or other argument field that is unavailable on the target browser. It can also read a result field that the target does not provide.

Required work:

- Map function parameters, event listener parameters, and result interfaces to their corresponding BCD features.
- Remove fields and parameters that are unsupported at the configured minimum version.
- Handle shared interfaces conservatively. If one TypeScript interface represents incompatible API contexts, generate context-specific types or report that the declaration cannot be represented safely.
- Treat missing or ambiguous BCD mappings as unsupported unless an explicit target-specific policy allows them.
- Keep type-only declarations available only where they do not expose unsupported runtime fields.

Required regression tests:

- An unsupported field in an otherwise supported function's options object fails compilation.
- A supported field in the same options object still compiles.
- An unsupported event filter or listener parameter fails compilation.
- An unsupported field on a returned object fails compilation.
- Shared interfaces do not accidentally retain a field merely because another API context supports it.

## Target-specific compatibility contracts

Target checks currently replace `src/lib/compat.ts` with one generated declaration. TypeScript trusts that declaration and does not inspect whether each wrapper has a valid implementation for the selected target. This is appropriate only when the wrapper provides a real fallback or adapter for that target.

Required work:

- Generate a separate `compat.ts` declaration for each browser target.
- Maintain an explicit target-support policy for compatibility wrappers.
- Expose a wrapper only when its raw API is supported or the wrapper provides a tested fallback for that target.
- Remove Chrome wrapper methods until a Chrome adapter or explicit Chrome fallback exists.
- Keep unknown wrapper support unavailable by default.
- Make target configurations resolve `@src/lib/compat` to the matching target declaration.

Required regression tests:

- An Android wrapper with a tested fallback remains callable when its raw API is unavailable.
- A wrapper without an Android fallback fails the Android check.
- A Firefox-only wrapper fails the Chrome check.
- Adding a target-specific adapter makes only that target's declaration available.
- Direct and proxied compatibility calls expose the same target-specific method set.

## Completion criteria

- Firefox and Firefox Android checks reject unsupported top-level APIs and unsupported nested fields at their configured minimum versions.
- Compatibility wrappers are exposed only for targets with valid implementations.
- Chrome has no compatibility-wrapper false negatives, even before a Chrome artifact is built.
- Every retained unknown BCD mapping and wrapper contract has an explicit, target-specific policy entry.
- Compiler-level fixtures demonstrate each previous false-negative class before and after transformation.
- Documentation describes any remaining incompleteness without presenting the checks as a full compatibility guarantee.
