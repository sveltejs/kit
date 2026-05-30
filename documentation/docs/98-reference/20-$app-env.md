---
title: $app/env
---

> MODULE: $app/env

`$app/env` exposes the same values as [`$app/environment`]($app-environment). When `kit.experimental.explicitEnvironmentVariables` is enabled and your app has `src/env.js` or `src/env.ts`, import `browser`, `building`, `dev` and `version` from `$app/env` instead of `$app/environment`.

## Explicit environment variables

Explicit environment variables are enabled by setting `kit.experimental.explicitEnvironmentVariables` to `true` and creating `src/env.js` or `src/env.ts`:

```js
/// file: src/env.js
import * as v from 'valibot';

export const variables = {
	API_KEY: {},
	PUBLIC_BASE_URL: {
		public: true,
		description: 'The public origin of this app'
	},
	FEATURE_FLAG: {
		static: true,
		validate: v.optional(v.picklist(['enabled', 'disabled']), 'disabled')
	}
};
```

`src/env.js` is bundled and evaluated before the rest of your app is built, so `variables` can use normal JavaScript such as imports, spreads and conditionals.

Variables listed in `variables` can be imported by name from `$app/env/private` or `$app/env/public`:

```js
import { API_KEY, FEATURE_FLAG } from '$app/env/private';
import { PUBLIC_BASE_URL } from '$app/env/public';
```

`$app/env/private` is server-only and cannot be imported by code that runs in the browser. `$app/env/public` can be imported anywhere.

Each variable can specify these properties:

- `validate`: a [Standard Schema](https://standardschema.dev/) validator. If omitted, the value must be a string
- `static`: if `true`, the build-time value is inlined into the bundle. Defaults to `false`
- `public`: if `true`, the variable is exported from `$app/env/public`; otherwise it is exported from `$app/env/private`. Defaults to `false`
- `description`: a string used as JSDoc for generated declarations

When explicit environment variables are enabled, `$env/static/private`, `$env/static/public`, `$env/dynamic/private`, `$env/dynamic/public` and `$app/environment` are unavailable. Use `$app/env`, `$app/env/private` and `$app/env/public` instead.
