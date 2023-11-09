import { Adapter } from '@sveltejs/kit';
import './ambient.js';

export default function plugin(options?: AdapterOptions): Adapter;

export interface AdapterOptions {
	/**
	 * List of packages that should not be bundled.
	 */
	external?: string[];

	/**
	 * Map of packages that should be replaced with a different package.
	 */
	alias?: { string: string };

	/**
	 * The name of the wrangler config file to use.
	 * Defaults to `wrangler.toml`.
	 */
	config?: string;
}
