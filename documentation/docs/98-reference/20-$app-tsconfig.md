---
title: $app/tsconfig
---

This module contains TypeScript configuration tailored for your app. Your own config should extend it — a typical `tsconfig.json` looks like this:

```json
/// file: tsconfig.json
{
	"extends": "$app/tsconfig",
	"include": ["src", "test"],
	"exclude": ["src/service-worker"]
}
```

You can extend this configuration with your own `compilerOptions`. Overriding the following properties may cause things to break — SvelteKit will warn you if this happens:

- `paths` — this is derived from the (deprecated) [`alias`](configuration#alias) config option, together with any [subpath imports](https://nodejs.org/api/packages.html#subpath-imports) specified in your `package.json`, to align behaviour between Vite and TypeScript. Ideally, configure subpath imports rather than using `paths` directly
- `types` — your app needs to be able to 'see' generated module declarations for things like [environment variables](environment-variables), and as such this array must include `"$app/types"`
- `isolatedModules` — must be `true`, as Vite compiles modules one at a time
- `verbatimModuleSyntax` — must be `true`, so that you can safely use type imports in `.svelte` files

Note that the example configuration above excludes `src/service-worker`, because service workers need to be in their own TypeScript project. If you are using a service worker, create a `src/service-worker/tsconfig.json` that extends [`$app/tsconfig/service-worker`]($app-tsconfig-service-worker).
