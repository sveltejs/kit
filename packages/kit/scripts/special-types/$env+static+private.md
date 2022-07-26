Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://kit.svelte.dev/docs/modules#$env-dynamic-platform), this module cannot be imported into client-side code.

_Unlike_ [`$env/dynamic/private`](https://kit.svelte.dev/docs/modules#$env-dynamic-platform), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.

```ts
import { API_KEY } from '$env/static/private';
```
