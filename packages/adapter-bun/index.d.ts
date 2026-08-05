import type { Adapter } from '@sveltejs/kit';
import type { BuildConfig, Serve, TLSOptions } from 'bun';
import './ambient.js';

declare global {
	const ENV_PREFIX: string;
	const PRECOMPRESS: boolean;
	const ORIGIN: string | undefined;
}

type ServerOptions = Omit<
	Serve.BaseServeOptions<undefined> & Serve.HostnamePortServeOptions<undefined>,
	'fetch' | 'routes' | 'websocket' | 'error'
> & {
	unix?: string;
	tls?: TLSOptions | TLSOptions[];
};

type CompileOptions = Omit<BuildConfig, 'entrypoints' | 'compile'> & {
	compile: NonNullable<BuildConfig['compile']>;
};

interface AdapterOptions {
	/**
	 * The directory to build the server to.
	 * @default 'build'
	 */
	out?: string;
	/**
	 * Enables precompressing assets and prerendered pages with gzip and brotli.
	 * @default true
	 */
	precompress?: boolean;
	/**
	 * A prefix for the environment variables used to configure the production server.
	 */
	envPrefix?: string;
	/**
	 * Default options passed to `Bun.serve`. Environment variables take precedence.
	 * The options must be JSON-serializable. Use `build/handler.js` with a custom
	 * `Bun.serve` call for routes, WebSockets, or custom error handling.
	 */
	serverOptions?: ServerOptions;
	/**
	 * Compile the build into a single executable containing the server and static assets.
	 * Pass Bun build options directly for advanced configuration. The generated entrypoint is reserved.
	 * @default false
	 */
	compile?: boolean | CompileOptions;
}

export default function plugin(options?: AdapterOptions): Adapter;
