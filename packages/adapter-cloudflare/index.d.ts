import { Adapter } from '@sveltejs/kit';
import './ambient.js';

export default function plugin(options?: AdapterOptions): Adapter;

export interface AdapterOptions {
	/**
	 * Customize the automatically-generated _routes.json file.
	 */
	routes?: {
		/**
		 * Routes that will be invoked by Functions. Accepts wildcard behavior.
		 *
		 * @default ["/*"]
		 */
		include?: string[];

		/**
		 * Defines routes that will not be invoked by Functions. Accepts wildcard behavior.
		 * Exclude always take priority over include.
		 *
		 * To have the adapter automatically exclude certain things, you can use these placeholders:<br/>
		 * 
		 * - \<build> to exclude the appDir (default is _app)
		 * - \<files> for static files
		 * - \<prerendered> for prerendered pages/paths
		 * - \<all> to exclude all of the above
		 * 
		 * @default ["<all>"]
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
