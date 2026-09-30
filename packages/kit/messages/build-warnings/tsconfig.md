## tsconfig_extends_missing

> `%file%` should extend SvelteKit's built-in configuration:
> %example%

Your TypeScript configuration needs to extend the one SvelteKit generates, so that TypeScript knows about generated types, path aliases and the compiler options SvelteKit relies on. The warning includes an example configuration. For your root `tsconfig.json`, that looks like this:

```json
/// file: tsconfig.json
{
	"extends": "$app/tsconfig",
	"include": ["src", "test", "*"],
	"exclude": ["src/service-worker"]
}
```

See [`$app/tsconfig`](https://svelte.dev/docs/kit/$app-tsconfig) and, for service workers, [`$app/tsconfig/service-worker`](https://svelte.dev/docs/kit/$app-tsconfig-service-worker).

## tsconfig_invalid

> Found issues while validating `%file%`:
> %issues%

Your `tsconfig.json` extends SvelteKit's generated configuration, but overrides settings that SvelteKit relies on. In every case, the fix is to stop overriding what [`$app/tsconfig`](https://svelte.dev/docs/kit/$app-tsconfig) sets, or to add back what's missing:

- **`types` was overwritten** — SvelteKit includes `"$app/types"` in `compilerOptions.types`, so that TypeScript can see generated module declarations for things like [environment variables](https://svelte.dev/docs/kit/environment-variables). Setting `types` yourself replaces that array rather than merging with it, so include the missing entries, for example `"types": ["$app/types", "node"]`.
- **`paths` was overwritten** — SvelteKit generates `compilerOptions.paths` from the (deprecated) [`alias`](https://svelte.dev/docs/kit/configuration#alias) option, so that TypeScript resolves these imports the same way Vite does. Remove your `paths`, and declare aliases with [subpath imports](https://nodejs.org/api/packages.html#subpath-imports) in `package.json` instead.
- **A file should be added to the `exclude` array** — service workers run in a different environment from the rest of your app and need their own TypeScript project, which extends [`$app/tsconfig/service-worker`](https://svelte.dev/docs/kit/$app-tsconfig-service-worker). Exclude them from your root `tsconfig.json`, for example `"exclude": ["src/service-worker"]`.
- **An essential option was overwritten** — `isolatedModules` must be `true` because Vite compiles modules one at a time, and `verbatimModuleSyntax` must be `true` so that type imports are safely removed from `.svelte` files. Remove the override.
