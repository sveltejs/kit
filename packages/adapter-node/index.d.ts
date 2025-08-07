import { Adapter } from '@sveltejs/kit';
import './ambient.js';

declare global {
	const ENV_PREFIX: string;
}

interface AdapterOptions {
	out?: string;
	precompress?: boolean;
	envPrefix?: string;
	/**
	 * If set to `false`, sourcemaps for bundled files will not be generated.
	 * @default true
	 */
	bundleSourcemap?: boolean;
}

export default function plugin(options?: AdapterOptions): Adapter;
