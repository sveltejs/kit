# @sveltejs/adapter-bun

SvelteKit adapter that builds a standalone server for the [Bun](https://bun.com/) runtime.

```sh
bun add -D @sveltejs/adapter-bun
```

```js
import adapter from '@sveltejs/adapter-bun';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit({ adapter: adapter() })]
});
```

Build with `bun run --bun build`, then run the default output with `bun ./build`.

See the [adapter-bun documentation](https://svelte.dev/docs/kit/adapter-bun) for configuration,
environment variables, compiled executables, proxy setup, and the Bun-specific platform API.

## Changelog

[View the package changelog](https://github.com/sveltejs/kit/blob/main/packages/adapter-bun/CHANGELOG.md).

## License

[MIT](LICENSE)
