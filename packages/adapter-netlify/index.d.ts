import { Adapter } from '@sveltejs/kit';
import './ambient.d.ts';

export type Runtime = 'edge' | 'nodejs22.x' | 'nodejs24.x' | 'nodejs26.x';

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
