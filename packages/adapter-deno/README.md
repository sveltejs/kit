# @sveltejs/adapter-deno

[Adapter](https://kit.svelte.dev/docs#adapters) for SvelteKit apps that generates a standalone Deno server.

## Usage

Install with `npm i -D @sveltejs/adapter-deno@next`, then add the adapter to your `svelte.config.js`:

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-deno';

export default {
	kit: {
		adapter: adapter({
			// default options are shown
			out: 'build'
      deps: './deps.ts' // (relative to adapter-deno package)
		})
	}
};
```

After building the server (`npm run build`), use the following command to start:

```sh
$ deno run --allow-env --allow-read --allow-net path/to/build/server.js
```

The server needs at least the following permissions to run:

- `allow-env` - allow environment access, to support runtime configuration via runtime variables (can be further restricted to include just the necessary variables)
- `allow-read` - allow file system read access (can be further restricted to include just the necessary directories)
- `allow-net` - allow network access (can be further restricted to include just the necessary domains)

## Options

### out

The directory to build the server to. It defaults to `build` — i.e. `deno run --allow-env --allow-read --allow-net build/server.js` would start the server locally after it has been created.

### deps

The file re-exporting external runtime dependencies (`deps.ts` by convention in Deno). It defaults to the `deps.ts` included in the package.

## Environment variables

By default, the server will accept connections on `0.0.0.0` using port 3000. These can be customised with the `PORT` and `HOST` environment variables:

```
HOST=127.0.0.1 PORT=4000 deno run --allow-env --allow-read --allow-net build/server.js
```

## License

[MIT](LICENSE)
