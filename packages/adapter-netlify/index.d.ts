import { Adapter } from '@sveltejs/kit';
import './ambient.d.ts';

export interface AdapterOptions {
	/**
	 * If `true`, your app will be deployed as a [Netlify Edge Function](https://docs.netlify.com/build/edge-functions/overview/) rather than the standard Node-based function.
	 * @default false
	 */
	edge?: boolean;
	/**
	 * If `true`, your app will be split into multiple functions instead of a single one for the entire app.
	 *
	 * If `edge` is `true`, this option cannot be used.
	 * @default false
	 */
	split?: boolean;
}

export default function plugin(opts?: AdapterOptions): Adapter;
