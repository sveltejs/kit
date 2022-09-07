---
title: Server-Only Modules
---

SvelteKit cares about security. When writing your backend and frontend in the same repository, it can be easy to accidentally import sensitive data into your front-end code (environment variables containing API keys, for example). SvelteKit provides a way to prevent this entirely: Server-Only Modules. We export a few of these ourselves: See the private [`$env`](modules#$env-dynamic-private) modules.

Thankfully, we don't keep all of this to ourselves. You can declare your module as server-only as well by placing it anywhere in your `$lib` directory and naming it `*.server.js` (or `ts`, etc.) Then, no matter how many hops you jump through, importing it into client code...

```js
// $lib/bad.server.js
export const shouldExplode = 'boom';

// $lib/hop-1.js
export { shouldExplode } from '$lib/bad.server.js';

// $lib/hop-2.js
export { shouldExplode } from '$lib/hop-1.js';

// $lib/hop-3.js
export { shouldExplode } from '$lib/hop-2.js';

// $lib/hop-4.js
export { shouldExplode } from '$lib/hop-3.js';

// src/routes/+page.svelte
<script>
	import { shouldExplode } from '$lib/hop-4.js';
</script>

<p>{shouldExplode}</p>
```

...will generate a helpful error.

```bash
[vite-plugin-svelte-kit] Cannot import $lib/bad.server.js into client-side code:
- .svelte-kit/generated/nodes/2.js
  - src/routes/+page.svelte
    - $lib/hop-4.js
      - $lib/hop-3.js
        - $lib/hop-2.js
          - $lib/hop-1.js
            - $lib/bad.server.js
```

Note: This feature works with simple dynamic imports (eg. `await import('$lib/bad.server.js')`), but it will not work with complex ones (``await import(`$lib/{myVar}`)``).