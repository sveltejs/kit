import { Adapter } from '@sveltejs/kit';
import './ambient.js';

declare global {
	const ENV_PREFIX: string;
	const PRECOMPRESS: boolean;
	const ORIGIN: string | undefined;
}

interface AdapterOptions {
	/**
	 * The directory to build the server to. It defaults to `build` — i.e.
	 * `node build` would start the server locally after it has been created.
	 * @default 'build'
	 */
	out?: string;
	/**
	 * Enables precompressing using gzip and brotli for assets and prerendered pages.
	 * @default true
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
	 * node build
	 * ```
	 */
	envPrefix?: string;
}

export default function plugin(options?: AdapterOptions): Adapter;
