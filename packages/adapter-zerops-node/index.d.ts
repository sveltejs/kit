import { Adapter } from '@sveltejs/kit';

export default function plugin(options?: AdapterOptions): Adapter;

export interface AdapterOptions {
	/**
	 * Path to zerops.yml config file
	 * @default 'zerops.yml' 
	 */
	config?: string;
} 