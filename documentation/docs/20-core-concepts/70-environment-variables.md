---
title: Environment variables
---

Environment variables are values your app needs that exist separately from the app's source code. They allow you to use sensitive information like API keys and database credentials without storing them in version control.

During development, and at build time, variables defined in a `.env` or `.env.local` file will be added to the environment:

```env
/// file: .env.local
API_KEY=19f401ba-e8b0-48c4-8c77-b0ebb26d97fe
```

After following the setup below, they can be imported via the following modules:

- [`$app/env/private`]($app-env-private)
- [`$app/env/public`]($app-env-public)

> [!LEGACY]
> The `$env/*` modules, along with `$app/environment` were removed in SvelteKit 3 in favour of explicit environment variables that were added in SvelteKit 2.62 as an experimental option.

### Setup

Add a `src/env.ts` (or `src/env.js`) file that exports a `variables` object:

```ts
/// file: src/env.ts
import { defineEnvVars } from '@sveltejs/kit/hooks';

export const variables = defineEnvVars({
	// ...
});
```

Each value in the object passed to [`defineEnvVars`](@sveltejs-kit-hooks#defineEnvVars) is an [`EnvVarConfig`](@sveltejs-kit#EnvVarConfig) object that configures the environment variable.

> [!NOTE] `defineEnvVars` returns its argument unaltered — it exists purely to help with type safety.

### Private variables

By default, all variables are considered private. For example, you don't want to reveal your `API_KEY`:

```ts
/// file: src/env.ts
import { defineEnvVars } from '@sveltejs/kit/hooks';

export const variables = defineEnvVars({
	+++API_KEY: {}+++
});
```

> [!NOTE] Since no configuration is needed for this variable, we can use an empty object (`{}`).

Now that `API_KEY` is defined, it can be imported into app code via `$app/env/private`:

```js
import { API_KEY } from '$app/env/private';
```

The `$app/env/private` module cannot be imported into code that runs in the browser, so that you can't accidentally reveal your secrets in a JavaScript bundle.

### Public variables

Some variables are perfectly safe — necessary, even — to expose to the browser. For these, we can specify `public: true`:

```ts
/// file: src/env.ts
import { defineEnvVars } from '@sveltejs/kit/hooks';

export const variables = defineEnvVars({
	GOOGLE_ANALYTICS_ID: {
		+++public: true+++
	}
});
```

`GOOGLE_ANALYTICS_ID` can now be imported from `$app/env/public`, or used in your `app.html` template as `%sveltekit.env.GOOGLE_ANALYTICS_ID%`:

```html
<!--- file: src/app.html --->
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<link rel="icon" href="%sveltekit.assets%/favicon.png" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		%sveltekit.head%

		<script
			async
			src="https://www.googletagmanager.com/gtag/js?id=+++%sveltekit.env.GOOGLE_ANALYTICS_ID%+++"
		></script>

		<script>
			window.dataLayer ??= [];
			function gtag(){dataLayer.push(arguments)}
			gtag('js', new Date());
			gtag('config', +++'%sveltekit.env.GOOGLE_ANALYTICS_ID%'+++);
		</script>
	</head>
	<body data-sveltekit-preload-data="hover">
		<div style="display: contents">%sveltekit.body%</div>
	</body>
</html>
```

### Validation

You can specify a [Standard Schema](https://standardschema.dev/) validator such as [Zod](https://zod.dev/) or [Valibot](https://valibot.dev/) to check that an environment variable value is correct:

```ts
/// file: src/env.ts
import { defineEnvVars } from '@sveltejs/kit/hooks';
+++import * as v from 'valibot';+++

export const variables = defineEnvVars({
	GOOGLE_ANALYTICS_ID: {
		public: true,
		+++schema: v.pipe(v.string(), v.regex(/G-[A-Z0-9]+/))+++
	}
});
```

If a value is invalid, the app will fail to start (or build). To opt out of one or the other, use [`building`]($app-env#building) from `$app/env` along with a validator that accepts an optional value:

```ts
/// file: src/env.ts
import { defineEnvVars } from '@sveltejs/kit/hooks';
+++import { building } from '$app/env'+++
import * as v from 'valibot';

export const variables = defineEnvVars({
	SECRET: {
		// optional when building but required when starting the app
		+++schema: building ? v.optional(v.string()) : v.string()+++
	}
});
```

You can use validators to make values optional, or transform them (such as turning a string into a boolean, or parsing JSON) — see your validation library's documentation to learn how.

### Static variables

By default, variables are dynamic. If a variable is configured with `static: true`, it will be inlined into your application code, enabling optimisations like dead-code elimination:

```ts
/// file: src/env.ts
import { defineEnvVars } from '@sveltejs/kit/hooks';
import * as v from 'valibot';

export const variables = defineEnvVars({
	SHOW_DEBUG_OVERLAY: {
		public: true,
		+++static: true,+++

		// coerce to true/false
		schema: v.pipe(
			v.optional(v.string(), ''),
			v.transform((str) => str !== '')
		)
	}
});
```

Because this variable is `static`, the `<DebugOverlay>` component shown here will be excluded from the JavaScript bundle unless `SHOW_DEBUG_OVERLAY` is truthy:

```svelte
<script>
	import { SHOW_DEBUG_OVERLAY } from '$app/env/public';
	import DebugOverlay from '$lib/components/DebugOverlay.svelte';
</script>

{#if SHOW_DEBUG_OVERLAY}
	<DebugOverlay />
{/if}
```

But if the variable is set before building the app...

```bash
SHOW_DEBUG_OVERLAY=true npm run build
```

...then the component will be included and shown.

### Documenting variables

You can document the purpose of an environment variable by adding a `description`:

```ts
/// file: src/env.ts
import { defineEnvVars } from '@sveltejs/kit/hooks';

export const variables = defineEnvVars({
	CACHE_TTL_SECONDS: {
		description: 'How long to cache responses, in seconds'
	}
});
```

Hovering over `CACHE_TTL_SECONDS` in your app code will show the description.
