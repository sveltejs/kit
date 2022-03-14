# @sveltejs/adapter-node

[Adapter](https://kit.svelte.dev/docs/adapters) for SvelteKit apps that generates a standalone Node server.

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
			precompress: false,
			env: {
				path: 'SOCKET_PATH',
				host: 'HOST',
				port: 'PORT',
				origin: 'ORIGIN',
				headers: {
					protocol: 'PROTOCOL_HEADER',
					host: 'HOST_HEADER'
				}
			},
			xForwardedForIndex: -1
		})
	}
};
```

## Options

### out

The directory to build the server to. It defaults to `build` — i.e. `node build` would start the server locally after it has been created.

### precompress

Enables precompressing using gzip and brotli for assets and prerendered pages. It defaults to `false`.

### env

By default, the server will accept connections on `0.0.0.0` using port 3000. These can be customised with the `PORT` and `HOST` environment variables:

```
HOST=127.0.0.1 PORT=4000 node build
```

HTTP doesn't give SvelteKit a reliable way to know the URL that is currently being requested. The simplest way to tell SvelteKit where the app is being served is to set the `ORIGIN` environment variable:

```
ORIGIN=https://my.site node build
```

With this, a request for the `/stuff` pathname will correctly resolve to `https://my.site/stuff`. Alternatively, you can specify headers that tell SvelteKit about the request protocol and host, from which it can construct the origin URL:

```
PROTOCOL_HEADER=x-forwarded-proto HOST_HEADER=x-forwarded-host node build
```

> [`x-forwarded-proto`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Proto) and [`x-forwarded-host`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Host) are de facto standard headers that forward the original protocol and host if you're using a reverse proxy (think load balancers and CDNs). You should only set these variables if you trust the reverse proxy.

The [RequestEvent](https://kit.svelte.dev/docs/types#additional-types-requestevent) object passed to hooks and endpoints includes an `event.clientAddress` property representing the client's IP address. By default this is the connecting `remoteAddress`. If your server is behind one or more proxies (such as a load balancer), this value will contain the innermost proxy's IP address rather than the client's, so we need to specify an `ADDRESS_HEADER` to read the address from:

```
ADDRESS_HEADER=True-Client-IP node build
```

> Headers can easily be spoofed. As with `PROTOCOL_HEADER` and `HOST_HEADER`, you should [know what you're doing](https://adam-p.ca/blog/2022/03/x-forwarded-for/) before setting these.

All of these environment variables can be changed, if necessary, using the `env` option:

```js
env: {
	host: 'MY_HOST_VARIABLE',
	port: 'MY_PORT_VARIABLE',
	origin: 'MY_ORIGINURL',
	headers: {
		address: 'MY_ADDRESS_HEADER',
		protocol: 'MY_PROTOCOL_HEADER',
		host: 'MY_HOST_HEADER'
	}
}
```

```
MY_HOST_VARIABLE=127.0.0.1 \
MY_PORT_VARIABLE=4000 \
MY_ORIGINURL=https://my.site \
node build
```

### xForwardedForIndex

If the `ADDRESS_HEADER` is `X-Forwarded-For`, the header value will contain a comma-separated list of IP addresses. For example, if there are three proxies between your server and the client, proxy 3 will forward the addresses of the client and the first two proxies:

```
<client address>, <proxy 1 address>, <proxy 2 address>
```

To get the client address we could use `xForwardedFor: 0` or `xForwardedFor: -3`, which counts back from the number of addresses.

**X-Forwarded-For is [trivial to spoof](https://adam-p.ca/blog/2022/03/x-forwarded-for/), howevever**:

```
<spoofed address>, <client address>, <proxy 1 address>, <proxy 2 address>
```

For that reason you should always use a negative number (depending on the number of proxies) if you need to trust `event.clientAddress`. In the above example, `0` would yield the spoofed address while `-3` would continue to work.

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
