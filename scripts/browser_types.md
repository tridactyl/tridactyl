# Browser API types

`generate_browser_types.js` combines the pinned Firefox WebExtension declarations with the minimum versions in `browser-targets.json` and MDN Browser Compatibility Data. It emits one package per target under `generated/browser-types`.

The generator removes unsupported runtime functions and constants but preserves type-only declarations. This lets TypeScript reject an unavailable call while still allowing shared types such as `browser.tabs.Tab`.

The checks cover runtime API members, matching the previous ESLint rules; they do not filter versioned fields inside parameter or result types. Calls through `src/lib/compat.ts` use that module's declared fallback contract, so the Chrome advisory does not inspect wrapper implementations until a Chrome runtime adapter exists.

Run the required Firefox checks with:

```sh
yarn typecheck:browser-targets
```

```sh
yarn typecheck:chrome
```

`browser_types_policy.json` lists the targets that retain each declaration path that does not map to BCD; unlisted targets remove it. Generation fails when that list drifts. `src/lib/compat.ts` is the only raw compatibility boundary; target checks consume its generated declaration while the normal TypeScript build checks its implementation against full types.
