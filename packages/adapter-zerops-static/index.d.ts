import type { Adapter } from '@sveltejs/kit';
import type { PlatformProxy } from '@sveltejs/kit';

export default function plugin(options?: AdapterOptions): Adapter;

export const platform: PlatformProxy;

export interface AdapterOptions {
	/**
	 * Path to zerops.yml config file
	 * @default 'zerops.yml'
	 */
	config?: string;
}

declare global {
	namespace App {
		interface Platform {
			env: Record<string, string>;
		}
	}
} 