import { Adapter } from '@sveltejs/kit';
import './ambient.js';

export default function plugin(options?: AdapterOptions): Adapter;

export interface AdapterOptions {
	/**
	 * Customize the automatically-generated _routes.json file.
	 */
	routes?: {
		/**
		 * Should we automatically generate excludes for _routes.json
		 * based on prerendered pages and static assets?
		 *
		 * @default true
		 */
		autoGenerate?: boolean;

		/**
		 * Routes that will be invoked by Functions. Accepts wildcard behavior.
		 *
		 * If used with autoGenerate, these will be placed first.
		 * If we reach the 100 limit, auto-generated includes will be removed first.
		 */
		include?: string[];

		/**
		 * Defines routes that will not be invoked by Functions. Accepts wildcard behavior.
		 * Exclude always take priority over include.
		 *
		 * If used with autoGenerate, these will be placed first.
		 * If we reach the 100 limit, auto-generated includes will be removed first.
		 */
		exclude?: string[];
	};
}

export interface RoutesJSONSpec {
	version: 1;
	description: string;
	include: string[];
	exclude: string[];
}
