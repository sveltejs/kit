import type { Adapter } from '@sveltejs/kit';
import './ambient.js';

interface AdapterOptions {
	/**
	 * The directory to build the server to.
	 * @default 'build'
	 */
	out?: string;
	/**
	 * Generate `.br` and `.gz` variants of client and prerendered assets during the
	 * build. The generated routes negotiate `Accept-Encoding` per request and serve
	 * the smallest accepted variant. Ignored when `buildOptions.compile` is set,
	 * because embedded assets are imported by identity path.
	 * @default false
	 */
	precompress?: boolean;
	/**
	 * If you need to change the name of the environment variables used to configure
	 * the deployment (for example, to deconflict with environment variables you
	 * don't control), you can specify a prefix:
	 *
	 * ```js
	 * envPrefix: 'MY_CUSTOM_'
	 * ```
	 *
	 * ```sh
	 * MY_CUSTOM_HOST=127.0.0.1 \
	 * MY_CUSTOM_PORT=4000 \
	 * bun ./build
	 * ```
	 */
	envPrefix?: string;
	/**
	 * Default options passed to `Bun.serve`. Environment variables take precedence.
	 * The options must be JSON-serializable.
	 */
	serverOptions?: Pick<
		import('bun').Serve.Options<never>,
		| 'development'
		| 'hostname'
		| 'port'
		| 'idleTimeout'
		| 'maxRequestBodySize'
		| 'reusePort'
		| 'unix'
		| 'ipv6Only'
	>;
	/**
	 * Pass Bun build options directly for advanced configuration. The generated entrypoint,
	 * output directory, top-level target, and module format are reserved. Set `compile` to
	 * create an executable; if it does not specify an outfile, the executable is written to
	 * `<out>/server`.
	 * @default {}
	 */
	buildOptions?: Pick<
		import('bun').BuildConfig,
		| 'sourcemap'
		| 'minify'
		| 'bytecode'
		| 'banner'
		| 'footer'
		| 'drop'
		| 'features'
		| 'optimizeImports'
		| 'splitting'
		| 'compile'
	>;
}

export default function plugin(options?: AdapterOptions): Adapter;
