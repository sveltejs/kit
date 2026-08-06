import type { Adapter } from '@sveltejs/kit';
import type { BuildConfig, Serve } from 'bun';
import './ambient.js';

declare global {
	const ENV_PREFIX: string;
	const ORIGIN: string | undefined;
}

type CompileOptions = Omit<BuildConfig, 'entrypoints' | 'compile' | 'target' | 'format'> & {
	compile: Exclude<NonNullable<BuildConfig['compile']>, false>;
};

interface AdapterOptions {
	/**
	 * The directory to build the server to.
	 * @default 'build'
	 */
	out?: string;
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
	 * node build
	 * ```
	 */
	envPrefix?: string;
	/**
	 * Default options passed to `Bun.serve`. Environment variables take precedence.
	 * The options must be JSON-serializable. Use `build/handler.js` with a custom
	 * `Bun.serve` call for routes, WebSockets, or custom error handling.
	 */
	serverOptions?: Pick<
		Serve.Options<never>,
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
	 * Compile the build into a single executable containing the server and static assets.
	 * Pass Bun build options directly for advanced configuration. The generated entrypoint,
	 * top-level target, and module format are reserved. If neither an outfile nor outdir is
	 * specified, the executable is written to `<out>/app`.
	 * @default false
	 */
	compile?: boolean | CompileOptions;
}

export default function plugin(options?: AdapterOptions): Adapter;
