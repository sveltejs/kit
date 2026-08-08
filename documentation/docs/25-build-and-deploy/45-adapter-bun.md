---
title: Bun servers
---

To generate a standalone [Bun](https://bun.com/) server, use [`adapter-bun`](https://github.com/sveltejs/kit/tree/main/packages/adapter-bun). The generated server uses [`Bun.serve`](https://bun.com/docs/runtime/http/server) and `Bun.file` directly.

## Usage

Install with `bun add -D @sveltejs/adapter-bun`, then add the adapter to your `vite.config.js`:

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

The adapter uses Bun's bundler and must run inside Bun. Build your app with `bun run --bun build`,
then start it with:

```sh
bun ./build
```

The default output directory is `build`. Production dependencies are externalised in the same way as with [`adapter-node`](adapter-node): packages in `dependencies` must be installed alongside the build, while packages in `devDependencies` are bundled into it.

Client assets and prerendered pages are served through Bun's native `routes` and file responses. This includes streaming and range requests, conditional requests using `Last-Modified`, correct MIME types, and immutable caching for hashed SvelteKit assets.
File responses are intentionally not buffered at startup: Bun can use `sendfile(2)` where available,
keeps memory usage bounded for large assets, and retains native range and conditional-request handling.

## Options

The adapter accepts these options:

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

The directory to build the server to. It defaults to `build`.

### envPrefix

Adds a prefix to all environment variables read by the production server. For example, with `envPrefix: 'MY_'`, configure the server with `MY_HOST`, `MY_PORT`, and `MY_REUSE_PORT`.

### serverOptions

Provides JSON-serializable defaults for `Bun.serve`. This is useful for settings such as `hostname`, `port`, `reusePort`, `ipv6Only`, `idleTimeout`, `development`, and `maxRequestBodySize`. Environment variables override these defaults.

`fetch`, `routes`, `websocket`, `error`, `tls`, `http3`, and `http1` cannot be configured this way. The adapter does not generate a reusable request-handler entrypoint, so applications that require these options need a custom Bun integration instead of the generated server.

### buildOptions

Pass options to Bun's build API through `buildOptions`. Set `buildOptions.compile: true` to generate
`build/server`, a single executable containing the Bun runtime, your
server code, client assets, and prerendered pages. In this mode, the adapter builds the executable
directly instead of generating the JavaScript server files:

```js
adapter({
	buildOptions: {
		compile: true
	}
});
```

The adapter uses the [`Bun.build`](https://bun.com/reference/bun/build) JavaScript API directly. The
`--bun` flag is required because Vite normally respects its Node.js shebang:

```sh
bun run --bun build
```

With the default options, only the executable is required at runtime. It is specific to the platform on which it was built. For advanced configuration, pass [`Bun.BuildConfig`](https://bun.com/reference/bun/BuildConfig) options directly. The adapter supplies the generated `entrypoints`, so that property is not configurable. Options such as code splitting may emit additional runtime files:

```js
adapter({
	buildOptions: {
		compile: {
			outfile: 'my-app',
			target: 'bun-linux-x64'
		},
		minify: true,
		bytecode: true,
		sourcemap: 'linked'
	}
});
```

Native dependencies and cross-compilation have the same constraints as [Bun's single-file executables](https://bun.com/docs/bundler/executables).
The adapter reserves the top-level Bun build `target` and `format` because generated servers always
run as Bun ESM. Set the executable target inside `buildOptions.compile.target`, as shown above.
Source maps default to `external`; set `sourcemap: 'none'` to disable them. Minification and bytecode
remain opt-in. Compile options without an explicit `outfile` use `<out>/server`.

## Environment variables

In production, Bun automatically reads `.env` files. All of the following variables can be prefixed using `envPrefix`.

### `PORT`, `HOST`, and `SOCKET_PATH`

The server listens on `0.0.0.0:3000` by default. Configure a TCP listener with `HOST` and `PORT`, or set `SOCKET_PATH` to use a Unix domain socket instead:

```sh
HOST=127.0.0.1 PORT=4000 bun ./build
SOCKET_PATH=/tmp/sveltekit.sock bun ./build
```

On Linux, `SOCKET_PATH` may begin with a null byte to use an abstract namespace socket.

### `REUSE_PORT` and `IPV6_ONLY`

Set `REUSE_PORT=true` to let multiple Bun processes bind the same port. The operating system load balances requests between them. `SO_REUSEPORT` is supported on Linux; macOS and Windows ignore it.

Set `IPV6_ONLY=true` to enable `IPV6_V6ONLY` on an IPv6 listener.

### `BODY_SIZE_LIMIT`

The maximum request body size in bytes. It supports `K`, `M`, and `G` suffixes and defaults to `512K`.

### `IDLE_TIMEOUT` and `SHUTDOWN_TIMEOUT`

`IDLE_TIMEOUT` sets Bun's connection inactivity timeout in seconds. It must be between `0` and `255`; `0` disables the timeout. The adapter automatically disables the timeout for server-sent event responses.

On `SIGINT` or `SIGTERM`, the server stops accepting connections and waits for in-flight requests. `SHUTDOWN_TIMEOUT` controls how many seconds it waits before forcefully closing active connections and defaults to `30`.

### `DEVELOPMENT`

Set `DEVELOPMENT=true` to enable Bun's contextual server error pages. It defaults to `false` in the generated production server.

### Proxy headers

When [`paths.origin`](configuration#paths) is not configured, the adapter derives the request origin from Bun's request URL and the `host` header. Set `PROTOCOL_HEADER`, `HOST_HEADER`, and `PORT_HEADER` when a trusted reverse proxy exposes the public origin through other headers:

```sh
PROTOCOL_HEADER=x-forwarded-proto HOST_HEADER=x-forwarded-host bun ./build
```

Set `ADDRESS_HEADER` to the trusted proxy header containing the client address. If it is `x-forwarded-for`, set `XFF_DEPTH` to the number of trusted proxies and the adapter will select the address from the right-hand side of the list.

Only use these variables behind a trusted proxy because clients can spoof forwarded headers.

## Platform-specific context

The `platform` property contains the original `Request` and Bun `Server`:

```js
/** @type {import('./$types').RequestHandler} */
export function GET({ platform }) {
	const address = platform.server.requestIP(platform.request);
	return Response.json(address);
}
```

The server object also exposes Bun's native operational metrics. Applications can publish them
through their own authenticated endpoint or instrumentation without the adapter reserving a URL:

```js
/** @type {import('./$types').RequestHandler} */
export function GET({ platform }) {
	return Response.json({
		pendingRequests: platform.server.pendingRequests,
		pendingWebSockets: platform.server.pendingWebSockets,
		chatSubscribers: platform.server.subscriberCount('chat')
	});
}
```
