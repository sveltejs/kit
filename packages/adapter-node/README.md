# @sveltejs/adapter-node

[Adapter](https://kit.svelte.dev/docs#adapters) for SvelteKit apps that generates a standalone Node server.

## Usage

Install with `npm i -D @sveltejs/adapter-node@next`, then add the adapter to your `svelte.config.js`:

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-node';

export default {
	kit: {
		adapter: adapter({
			// default options are shown
			out: 'build'
		})
	}
};
```

## Options

### out

The directory to build the server to. It defaults to `build` — i.e. `node build` would start the server locally after it has been created.

## License

[MIT](LICENSE)
