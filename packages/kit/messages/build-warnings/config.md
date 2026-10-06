## config_option_deprecated

> The `%keypath%` option is deprecated, and will be removed in a future version

This option still works, but it will be removed in a future major version of SvelteKit. See the [configuration reference](https://svelte.dev/docs/kit/@sveltejs-kit-vite) for the recommended alternative.

## config_option_deprecated_alias

> The `%keypath%` option is deprecated, and will be removed in a future version of SvelteKit. Use subpath imports instead: https://svelte.dev/docs/kit/$lib

Node's [subpath imports](https://nodejs.org/api/packages.html#subpath-imports), declared in the `imports` field of your `package.json`, are understood natively by Vite, TypeScript and other tools, so they don't need a separate SvelteKit option. For example, instead of `alias: { $utils: 'src/utils' }`, add this to your `package.json`...

```json
{
	"imports": {
		"#utils/*": "./src/utils/*"
	}
}
```

...and import from `#utils/...`. See [`$lib`](https://svelte.dev/docs/kit/$lib) for how SvelteKit uses the same mechanism for `#lib`.

## config_option_deprecated_typescript

> The `%keypath%` option is deprecated, and will be removed in a future version. Add configuration to `tsconfig.json` directly

Rather than modifying SvelteKit's generated TypeScript configuration with a function, add the options to your own `tsconfig.json`, which [extends `$app/tsconfig`](https://svelte.dev/docs/kit/$app-tsconfig).
