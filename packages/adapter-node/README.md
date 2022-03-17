# @sveltejs/adapter-node

[Adapter](https://kit.svelte.dev/docs/adapters) for SvelteKit apps that generates a standalone Node server.

## Usage

Install with `npm i -D @sveltejs/adapter-node@next`, then add the adapter to your `svelte.config.js`:

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-node';

export default {
	kit: {
		adapter: adapter()
	}
};
```

## Environment variables

### `PORT` and `HOST`

By default, the server will accept connections on `0.0.0.0` using port 3000. These can be customised with the `PORT` and `HOST` environment variables:

```
HOST=127.0.0.1 PORT=4000 node build
```

### `ORIGIN`, `PROTOCOL_HEADER` and `HOST_HEADER`

HTTP doesn't give SvelteKit a reliable way to know the URL that is currently being requested. The simplest way to tell SvelteKit where the app is being served is to set the `ORIGIN` environment variable:

```
ORIGIN=https://my.site node build
```

With this, a request for the `/stuff` pathname will correctly resolve to `https://my.site/stuff`. Alternatively, you can specify headers that tell SvelteKit about the request protocol and host, from which it can construct the origin URL:

```
PROTOCOL_HEADER=x-forwarded-proto HOST_HEADER=x-forwarded-host node build
```

> [`x-forwarded-proto`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Proto) and [`x-forwarded-host`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Host) are de facto standard headers that forward the original protocol and host if you're using a reverse proxy (think load balancers and CDNs). You should only set these variables if you trust the reverse proxy.

### `ADDRESS_HEADER` and `XFF_DEPTH`

The [RequestEvent](https://kit.svelte.dev/docs/types#additional-types-requestevent) object passed to hooks and endpoints includes an `event.clientAddress` property representing the client's IP address. By default this is the connecting `remoteAddress`. If your server is behind one or more proxies (such as a load balancer), this value will contain the innermost proxy's IP address rather than the client's, so we need to specify an `ADDRESS_HEADER` to read the address from:

```
ADDRESS_HEADER=True-Client-IP node build
```

> Headers can easily be spoofed. As with `PROTOCOL_HEADER` and `HOST_HEADER`, you should [know what you're doing](https://adam-p.ca/blog/2022/03/x-forwarded-for/) before setting these.

If the `ADDRESS_HEADER` is `X-Forwarded-For`, the header value will contain a comma-separated list of IP addresses. The `XFF_DEPTH` environment variable should specify how many trusted proxies sit in front of your server. E.g. if there are three trusted proxies, proxy 3 will forward the addresses of the original connection and the first two proxies:

```
<client address>, <proxy 1 address>, <proxy 2 address>
```

Some guides will tell you to read the left-most address, but this leaves you [vulnerable to spoofing](https://adam-p.ca/blog/2022/03/x-forwarded-for/):

```
<spoofed address>, <client address>, <proxy 1 address>, <proxy 2 address>
```

Instead, we read from the _right_, accounting for the number of trusted proxies. In this case, we would use `XFF_DEPTH=3`.

> If you need to read the left-most address instead (and don't care about spoofing) — for example, to offer a geolocation service, where it's more important for the IP address to be _real_ than _trusted_, you can do so by inspecting the `x-forwarded-for` header within your app.

## Options

The adapter can be configured with various options:

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-node';

export default {
	kit: {
		adapter: adapter({
			// default options are shown
			out: 'build',
			precompress: false,
			envPrefix: ''
		})
	}
};
```

### out

The directory to build the server to. It defaults to `build` — i.e. `node build` would start the server locally after it has been created.

### precompress

Enables precompressing using gzip and brotli for assets and prerendered pages. It defaults to `false`.

### envPrefix

If you need to change the name of the environment variables used to configure the deployment (for example, to deconflict with environment variables you don't control), you can specify a prefix:

```js
envPrefix: 'MY_CUSTOM_';
```

```
MY_CUSTOM_HOST=127.0.0.1 \
MY_CUSTOM_PORT=4000 \
MY_CUSTOM_ORIGIN=https://my.site \
node build
```

## Custom server

The adapter creates two files in your build directory — `index.js` and `handler.js`. Running `index.js` — e.g. `node build`, if you use the default build directory — will start a server on the configured port.

Alternatively, you can import the `handler.js` file, which exports a handler suitable for use with [Express](https://github.com/expressjs/expressjs.com), [Connect](https://github.com/senchalabs/connect) or [Polka](https://github.com/lukeed/polka) (or even just the built-in [`http.createServer`](https://nodejs.org/dist/latest/docs/api/http.html#httpcreateserveroptions-requestlistener)) and set up your own server:

```js
// my-server.js
import { handler } from './build/handler.js';
import express from 'express';

const app = express();

// add a route that lives separately from the SvelteKit app
app.get('/healthcheck', (req, res) => {
	res.end('ok');
});

// let SvelteKit handle everything else, including serving prerendered pages and static assets
app.use(handler);

app.listen(3000, () => {
	console.log('listening on port 3000');
});
```

## Deploying

You will need the output directory (`build` by default), the project's `package.json`, and the production dependencies in `node_modules` to run the application. Production dependencies can be generated with `npm ci --prod`, you can also skip this step if your app doesn't have any dependencies. You can then start your app with

```bash
node build
```

## Changelog

[The Changelog for this package is available on GitHub](https://github.com/sveltejs/kit/blob/master/packages/adapter-node/CHANGELOG.md).

## License

[MIT](LICENSE)
