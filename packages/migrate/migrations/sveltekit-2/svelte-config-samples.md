## Removes dangerZone (1)

```js before
export default {
	kit: {
		foo: bar,
		dangerZone: {
			trackServerFetches: true
		},
		baz: qux
	}
};
```

```js after
export default {
	kit: {
		foo: bar,
		baz: qux
	}
};
```

## Removes dangerZone (2)

```js before
export default {
	kit: {
		foo: bar,
		dangerZone: {
			trackServerFetches: true
		}
	}
};
```

<!-- prettier-ignore -->
```js after
export default {
	kit: {
		foo: bar,
	}
};
```

## Replaces vitePreprocess import (1)

```js before
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter()
	}
};

export default config;
```

```js after
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter()
	}
};

export default config;
```

## Replaces vitePreprocess import (2)

```js before
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess, foo } from '@sveltejs/kit/vite';

export default {
	preprocess: vitePreprocess()
};
```

<!-- prettier-ignore -->
```js after
import adapter from '@sveltejs/adapter-auto';
import { foo } from '@sveltejs/kit/vite';
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
	preprocess: vitePreprocess()
};
```

## Replaces vitePreprocess import (3)

```js before
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess, foo } from '@sveltejs/kit/vite';
import { a } from '@sveltejs/vite-plugin-svelte';

export default {
	preprocess: vitePreprocess()
};
```

```js after
import adapter from '@sveltejs/adapter-auto';
import { foo } from '@sveltejs/kit/vite';
import { a, vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
	preprocess: vitePreprocess()
};
```
