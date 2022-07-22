Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$app/env/platform`](https://kit.svelte.dev/docs/modules#$app-env-platform), this module cannot be imported into client-side code.

_Unlike_ [`$app/env/platform`](https://kit.svelte.dev/docs/modules#$app-env-platform), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.

```ts
import { API_KEY } from '$app/env/private';
```
