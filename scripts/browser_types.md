# Browser API types

`generate_browser_types.js` combines the pinned Firefox WebExtension declarations with the minimum versions in `browser-targets.json` and MDN Browser Compatibility Data (BCD). It emits one package and report per target under `generated/browser-types`.

The generator filters runtime functions and constants, optional function and event parameters, callback Promise returns, fields in recursively named parameter/result/event interfaces, interface-valued runtime objects, and versioned string-literal unions (including alias chains). Shared interfaces use the conservative intersection of every mapped context, so a field is removed globally if any retained use cannot provide it.

BCD normally lists only children with independent compatibility histories. Unlisted children inherit only from a supported or explicitly retained runtime parent. The reviewed inheritance targets and explicit exceptions live in `browser_types_policy.json`.

`browser_types.lock.json` is generated and must not be edited manually. It records dependency fingerprints, target settings, observed unmapped runtime paths and compatibility exports, and per-target declaration and nested-inventory hashes. Ordinary generation validates the lock before writing output. Unmapped runtime paths default to removal unless `browser_types_policy.json` explicitly retains them.

Partial implementations default to unsupported. The reviewed Android exceptions are `tabs.query`, which may return only a subset of matching tabs, and `storage.sync`, which stores data without account synchronization or quota enforcement. Independently documented child incompatibilities are still removed.

`src/lib/compat.ts` is type-checked before a generated declaration is emitted for each target. Every wrapped method has an explicit `native`, `fallback`, capability-only, or unavailable status. `DesktopApis`, `FirefoxApis`, and `FirefoxDesktopApis` make platform-only branches explicit without casts. Content callers use capability-specific RPC routes that are validated in the background; extension pages retain local context-sensitive API behavior. Event adapters remain background-local because listener functions cannot be serialized.

Run the required Firefox checks with:

```sh
yarn typecheck:browser-targets
```

After changing BCD, Firefox declarations, target versions, the generator, or human policy, update and review the generated lock with:

```sh
yarn update-browser-types-lock
git diff -- scripts/browser_types.lock.json
```

The updater writes only the lock. It never adds aliases, partial-support exceptions, runtime retentions, nested overrides, or compatibility decisions.

Run the advisory Chrome check separately with `yarn typecheck:chrome`. It intentionally reports remaining direct Firefox-only source calls; target-specific compatibility wrappers do not fall through to raw browser APIs.

The reports distinguish mapped, inherited, retained, and removed top-level paths and nested candidate paths. A nested row records compatibility evidence used by one or more declarations, not whether a same-named declaration member was emitted. Generation also fails when the generated lock, compatibility methods, capability membership, or human policy decisions drift.

Remaining limitations are deliberately not presented as a full compatibility guarantee:

- Inline object-literal input/result members and data aliases to named interfaces are not rewritten.
- TypeScript can accept structurally wider callback return objects unless the returned value is explicitly typed.
- Open-ended values such as `string[]` event-property filters cannot be narrowed from individual BCD value entries.
- Conservative shared-interface filtering can reject a supported field in one context when another context is unsupported; operation-specific type cloning would improve precision.
