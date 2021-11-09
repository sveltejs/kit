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
			out: 'build',
			precompress: false
		})
	}
};
```

## Build Options

### serverEntryPoint

The server entry point. Allows you to provide a [custom server implementation](#middleware). Defaults to the provided reference server.

### out

The directory to build the server to. It defaults to `build` — i.e. `node build` would start the server locally after it has been created.

### precompress

Enables precompressing using gzip and brotli for assets and prerendered pages. It defaults to `false`.

## Runtime Options

### Environment variables

By default, the server will accept connections on `0.0.0.0` using port 3000. These can be customised with the `PORT` and `HOST` environment variables:

```
HOST=127.0.0.1 PORT=4000 node build
```

You can also specify `SOCKET_PATH` if you'd like to use a Unix domain socket or Windows named pipe.

## Middleware

The adapter exports a middleware `(req, res, next) => {}` that's compatible with [Express](https://github.com/expressjs/expressjs.com) / [Connect](https://github.com/senchalabs/connect) / [Polka](https://github.com/lukeed/polka). Additionally, it also exports a reference server implementation using this middleware with a plain Node HTTP server.

But you can use your favorite server framework to combine it with other middleware and server logic. You can import `kitMiddleware`, your ready-to-use SvelteKit middleware from the `build` directory. You can use [the `serverEntryPoint` option](#serverEntryPoint) to bundle your custom server entry point.

```js
// src/server.js
import { assetsMiddleware, prerenderedMiddleware, kitMiddleware } from '../build/middlewares.js';
import polka from 'polka';

const app = polka();

const myMiddleware = function (req, res, next) {
	console.log('Hello world!');
	next();
};

app.use(myMiddleware);

app.get('/no-svelte', (req, res) => {
	res.end('This is not Svelte!');
});

app.all('*', assetsMiddleware, prerenderedMiddleware, kitMiddleware);

// Express users can also write in a second way:
// app.use(assetsMiddleware, prerenderedMiddleware, kitMiddleware);

app.listen(3000);
```

For using middleware in dev mode, [see the FAQ](https://kit.svelte.dev/faq#how-do-i-use-x-with-sveltekit-how-do-i-use-middleware).

## Deploying

You will need the output directory (`build` by default), the project's `package.json`, and the production dependencies in `node_modules` to run the application. Production dependencies can be generated with `npm ci --prod`, you can also skip this step if your app doesn't have any dependencies. You can then start your app with

```bash
node build
```

## Changelog

[The Changelog for this package is available on GitHub](https://github.com/sveltejs/kit/blob/master/packages/adapter-node/CHANGELOG.md).

## License

[MIT](LICENSE)
