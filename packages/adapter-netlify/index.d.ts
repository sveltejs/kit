import { Adapter } from '@sveltejs/kit';
import { Runtime } from './utils.js';
import './ambient.d.ts';

export { Runtime };

export interface Config {
	/**
	 * Which [Serverless Function](https://docs.netlify.com/build/functions/configuration/#nodejs-version-for-runtime)
		* runtime to use (`'nodejs22.x'`, `'nodejs24.x'` etc) or `'edge'` to deploy as an Edge Function.
	 * @default Same as the build environment
	 */
	runtime?: Runtime;
}

export interface AdapterOptions {
	/**
	 * The runtime to use. Supported runtimes are `edge`, `nodejs22.x`, `nodejs24.x`, and `nodejs26.x`.
	 * If omitted, the Node.js runtime configured for the Netlify build is used.
	 */
	runtime?: Runtime;
	/**
	 * If `true`, your app will be split into multiple functions instead of a single one for the entire app.
	 * @default false
	 */
	split?: boolean;
}

export default function plugin(opts?: AdapterOptions): Adapter;
