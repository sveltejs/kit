---
question: How do I use environment variables?
---

Vite uses [dotenv](https://github.com/motdotla/dotenv) to load environment variables from a file named `.env` or similar. SvelteKit allows you to use any environment variables prefixed with either `VITE_` or `PUBLIC_` because it adds `PUBLIC_` to [Vite's `envPrefix` setting](https://vitejs.dev/config/index.html#envprefix) by default. You would need to instantiate dotenv yourself if you want all environment variables exposed in `process.env['YOUR_ENV_VAR']`. We hope to see all environment variables exposed on the server-side [in the future](https://github.com/vitejs/vite/issues/3176).

[Environment variables cannot be used directly in Svelte templates](https://github.com/sveltejs/kit/issues/720) due [an issue in the way Vite's define plugin works](https://github.com/vitejs/vite/issues/3176).

For example, you can create a `.env` file in your project root folder with a `PUBLIC_*` variable:

```sh
PUBLIC_MESSAGE="World"
```

Then you can access this variable in a `.js` or `.ts` module:

```js
export const MESSAGE = import.meta.env.PUBLIC_MESSAGE;
```

Then you can pull in the variable in your components from the module:

```html
<script>
	import { MESSAGE } from `$lib/Env.js`
</script>
<h1>Hello, {MESSAGE}</h1>
```

You can also use [Vite's `define` option](https://vitejs.dev/config/#define):

```
define: { 'process.env.FOO': 'process.env.FOO' }
```

Please see [the Vite documentation](https://vitejs.dev/guide/env-and-mode.html#env-files) for more info about environment variables.
