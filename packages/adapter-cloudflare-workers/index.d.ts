/// <reference types="@cloudflare/workers-types" />

import { Adapter } from '@sveltejs/kit';
import './ambient.js';
import { GetPlatformProxyOptions } from 'wrangler';

export default function plugin(options?: AdapterOptions): Adapter;

export interface AdapterOptions {
	config?: string;
	/**
	 * Config object passed to {@link https://developers.cloudflare.com/workers/wrangler/api/#getplatformproxy | getPlatformProxy}
	 * during development and preview.
	 */
	platformProxy?: GetPlatformProxyOptions;
}
