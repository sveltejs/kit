import { Adapter } from '@sveltejs/kit';
import './ambient.js';

export default function plugin(opts?: { split?: boolean; edge?: boolean }): Adapter;

export interface RouteConfig {
	/**
	 * Whether to use [Edge Functions](https://docs.netlify.com/edge-functions/overview/) (`'edge'`)
	 * @default undefined
	 */
	runtime?: 'edge';
}
