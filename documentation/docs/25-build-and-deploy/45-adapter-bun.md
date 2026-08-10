---
title: Bun servers
---

[`adapter-bun`](https://github.com/sveltejs/kit/tree/main/packages/adapter-bun) builds a SvelteKit application into a standalone [Bun](https://bun.com/) server. The generated server uses `Bun.serve` for requests and Bun file responses for client assets, prerendered output, and files read with [`$app/server`](https://svelte.dev/docs/kit/$app-server#read).

## Usage

Install the adapter:

```sh
bun add -D @sveltejs/adapter-bun
```

Configure it in `vite.config.js`:

```js
// @errors: 2307 2554
/// file: vite.config.js
import adapter from '@sveltejs/adapter-bun';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter()
		})
	]
});
```

The adapter calls Bun's build API, so the production build itself must run in Bun. The `--bun` flag overrides Vite's Node.js shebang:

```sh
bun run --bun build
```

The default build is written to `build`. Start it with:

```sh
bun ./build
```

The JavaScript server, client files, and prerendered files in the output directory are all required at runtime. Application imports are processed according to Bun's bundler behavior.

Client assets and prerendered output are registered as native Bun routes. Only `GET` and the corresponding automatic `HEAD` requests are served by those routes; other methods continue to SvelteKit. Bun supplies MIME types, conditional-request validators, byte ranges for filesystem-backed files, and streaming without buffering every asset in memory. Files below SvelteKit's `immutable` directory receive `Cache-Control: public,max-age=31536000,immutable`.

> [!NOTE] Bun treats `*` in a route pathname as a wildcard. The adapter rejects client and prerendered filenames that contain a literal `*`; rename those files before building.

## Options

```js
// @errors: 2307 2554
/// file: vite.config.js
import adapter from '@sveltejs/adapter-bun';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter({
				out: 'build',
				envPrefix: '',
				serverOptions: {
					idleTimeout: 30
				},
				buildOptions: {
					sourcemap: 'external'
				}
			})
		})
	]
});
```

### out

The output directory. It defaults to `build`.

### envPrefix

A prefix for every deployment environment variable documented below. This is useful when the unprefixed names conflict with variables managed by your host:

```js
adapter({ envPrefix: 'MY_APP_' });
```

```sh
MY_APP_HOST=127.0.0.1 MY_APP_PORT=4000 bun ./build
```

When a prefix is configured, the server fails at startup if it finds an unknown environment variable with that prefix. This catches collisions and misspellings.

### serverOptions

JSON-serializable defaults passed to `Bun.serve`. The supported properties are:

- `hostname`
- `port`
- `unix`
- `reusePort`
- `ipv6Only`
- `idleTimeout`
- `maxRequestBodySize`
- `development`

Environment variables take precedence over these defaults. A configured Unix socket takes precedence over `hostname`, `port`, `reusePort`, and `ipv6Only`.

The generated server owns `fetch` and `routes`. It does not expose `websocket`, `error`, TLS, HTTP/3, or HTTP/1 configuration through `serverOptions`. Use a custom Bun integration if your application requires those `Bun.serve` options.

### buildOptions

Advanced Bun build settings can be supplied with `buildOptions`. The adapter currently accepts `sourcemap`, `minify`, `bytecode`, `banner`, `footer`, `drop`, `features`, `optimizeImports`, `splitting`, and `compile`. Code splitting is enabled by default; `splitting: false` bundles the server into a single file, which works around [`Bun.build` output path collisions](https://github.com/oven-sh/bun/issues/17674) on applications whose module graph produces identically-hashed chunks.

The generated entrypoint, output directory, top-level `target`, and module `format` are reserved. Generated servers target Bun and use ESM. Source maps default to `external`; set `sourcemap: 'none'` to disable them.

#### Compiled executables

Set `compile: true` to generate a single executable at `<out>/server`:

```js
adapter({
	buildOptions: {
		compile: true
	}
});
```

Build and run it without a separately installed Bun runtime:

```sh
bun run --bun build
./build/server
```

The executable embeds the server code, client assets, prerendered output, and Bun runtime. `compile` can also be a Bun target string, which keeps the default `server` filename, or an options object. To change the executable name or cross-compile, provide an options object:

```js
adapter({
	out: 'dist',
	buildOptions: {
		compile: {
			outfile: 'application',
			target: 'bun-linux-x64'
		},
		minify: true,
		bytecode: true,
		sourcemap: 'linked'
	}
});
```

The result in this example is `dist/application`. Platform targets, native dependencies, and other limitations follow [Bun's executable compilation rules](https://bun.com/docs/bundler/executables).

## Environment variables

Bun loads `.env` files automatically. If `envPrefix` is set, add that prefix to each name in this section.

### Listener

`HOST` and `PORT` configure the TCP listener. Without either value or a `serverOptions` default, Bun uses its own listener defaults.

```sh
HOST=127.0.0.1 PORT=4000 bun ./build
```

`SOCKET_PATH` selects a Unix domain socket instead. When it is present, TCP-only options are ignored:

```sh
SOCKET_PATH=/tmp/sveltekit.sock bun ./build
```

`REUSE_PORT` enables Bun's `reusePort` option and `IPV6_ONLY` enables `ipv6Only`. Boolean variables accept `1`, `true`, `yes`, and `on`, or `0`, `false`, `no`, and `off`, without regard to letter case.

### Request limits and diagnostics

`BODY_SIZE_LIMIT` controls `Bun.serve`'s `maxRequestBodySize`. It defaults to `512K`. The value must resolve to a whole number of bytes and may use a case-insensitive binary `K`, `M`, or `G` suffix, such as `768K` or `1.5M`.

`IDLE_TIMEOUT` sets Bun's per-request inactivity timeout in seconds. It must be an integer from `0` through `255`; `0` disables the timeout. The generated handler disables the timeout for responses whose content type starts with `text/event-stream` and also adds `X-Accel-Buffering: no`.

`DEVELOPMENT` enables Bun's development-mode error pages. It defaults to `false` for the generated server.

### Public origin behind a proxy

If [`paths.origin`](configuration#paths) is configured, that value is the trusted origin for every request. Otherwise, the adapter derives the origin from the incoming request URL and `Host` header.

Behind a trusted reverse proxy, `PROTOCOL_HEADER`, `HOST_HEADER`, and `PORT_HEADER` name headers that contain the public scheme, host, and port:

```sh
PROTOCOL_HEADER=x-forwarded-proto \
HOST_HEADER=x-forwarded-host \
PORT_HEADER=x-forwarded-port \
bun ./build
```

The protocol header must contain only a scheme such as `https`, without a colon. The port header must contain a number. Invalid values produce a `400 Bad Request` response.

> [!CAUTION] Only trust forwarded headers when requests can reach the server through a proxy you control. A direct client can spoof these headers.

### Client addresses behind a proxy

[`event.getClientAddress()`](https://svelte.dev/docs/kit/@sveltejs-kit#RequestEvent) uses `server.requestIP(request).address` by default. Set `ADDRESS_HEADER` to the name of a trusted proxy header when the direct peer is a proxy:

```sh
ADDRESS_HEADER=true-client-ip bun ./build
```

For `x-forwarded-for`, also set `XFF_DEPTH` to the number of trusted proxies. The default depth is `1`, and the adapter selects from the right side of the comma-separated list so client-supplied entries to the left cannot change the trusted result:

```sh
ADDRESS_HEADER=x-forwarded-for XFF_DEPTH=2 bun ./build
```

`XFF_DEPTH` must be an integer of at least `1`. `getClientAddress()` throws if the configured header is absent or contains fewer addresses than the configured depth.

## Platform API

The request event's `platform` property exposes the original Web API request received by Bun and the Bun server instance:

```js
/** @type {import('./$types').RequestHandler} */
export function GET({ getClientAddress, platform }) {
	return Response.json({
		address: getClientAddress(),
		requestUrl: platform.request.url,
		serverId: platform.server.id,
		pendingRequests: platform.server.pendingRequests,
		pendingWebSockets: platform.server.pendingWebSockets
	});
}
```

`platform.request` remains the original request even when the adapter normalizes the request URL to a configured or proxy-derived public origin before passing it to SvelteKit.

## Graceful shutdown

On `SIGINT` or `SIGTERM`, the generated server calls `server.stop()`. Bun stops accepting new connections and the adapter waits for pending requests before emitting a `sveltekit:shutdown` process event with the signal name:

```js
process.on('sveltekit:shutdown', async (reason) => {
	await jobs.stop();
	await db.close();
});
```

Connections that are still open after `SHUTDOWN_TIMEOUT` seconds are closed forcefully, so idle connections such as open event streams cannot delay the shutdown indefinitely. The value must be a non-negative integer and defaults to `30`.

Sending a second shutdown signal forces the process to exit with status `1`.
