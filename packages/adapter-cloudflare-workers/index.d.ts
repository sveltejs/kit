import { Adapter } from '@sveltejs/kit';
import './ambient.js';

export default function plugin(options?: AdapterOptions): Adapter;

export interface AdapterOptions {
	config?: string;
	/**
	 * Enable Node.js compatibility
	 * https://developers.cloudflare.com/workers/runtime-apis/nodejs/
	 * @default undefined
	 */
	nodeCompat?: boolean;
}
