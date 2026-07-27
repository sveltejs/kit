/** @import { RequestEvent } from '@sveltejs/kit'; */
/** @import { InternalServer, PrerenderOption, RequestOptions } from 'types'; */
import fs from 'node:fs';
import path from 'node:path';
import { AsyncLocalStorage } from 'node:async_hooks';
import { dev } from './context.js';
import { fix_stack_trace } from './sourcemaps.js';
import { manifest } from './ssr_manifest.js';
import { Server as KitServer } from '../../../runtime/server/index.js';
import { check_feature } from '../../../utils/features.js';
import { SCHEME } from '../../../utils/url.js';
import { from_fs } from '../../../utils/vite.js';

const { set_fix_stack_trace } = await import(/* @vite-ignore */ '__sveltekit/server');
set_fix_stack_trace(fix_stack_trace);

const { set_assets } = await import(/* @vite-ignore */ '$app/paths/internal/server');
set_assets(__SVELTEKIT_PATHS_ASSETS__);

/**
 * @typedef {object} FeatureContext
 * @property {RequestEvent} event
 * @property {Record<string, any>} config
 * @property {PrerenderOption} prerender
 */

/** @type {AsyncLocalStorage<FeatureContext>} */
const async_local_storage = new AsyncLocalStorage();

/** @param {string} label */
globalThis.__SVELTEKIT_TRACK__ = (label) => {
	const context = async_local_storage.getStore();
	if (!context || context.prerender === true) return;

	check_feature(
		/** @type {string} */ (context.event.route.id),
		context.config,
		label,
		dev.svelte_config.kit.adapter
	);
};

const fetch = globalThis.fetch;
/** @type {typeof fetch} */
globalThis.fetch = (info, init) => {
	if (typeof info === 'string' && !SCHEME.test(info)) {
		throw new Error(
			`Cannot use relative URL (${info}) with global fetch — use \`event.fetch\` instead: https://svelte.dev/docs/kit/web-standards#fetch-apis`
		);
	}

	return fetch(info, init);
};

const emulator = await dev.svelte_config.kit.adapter?.emulate?.();

export class Server extends KitServer {
	/**
	 * @param {Request} request
	 * @param {RequestOptions} options
	 * @returns {Promise<Response>}
	 */
	async respond(request, options) {
		return await /** @type {InternalServer['respond']} */ (super.respond)(request, {
			...options,
			read: (file) => {
				if (file in manifest._.server_assets) {
					return fs.readFileSync(from_fs(file));
				}

				return fs.readFileSync(path.join(__SVELTEKIT_FILES_ASSETS__, file));
			},
			before_handle: async (event, config, prerender, handle) => {
				// we need to use .run because .enterWith() is not supported in Cloudflare Workers
				// see https://blog.cloudflare.com/workers-node-js-asynclocalstorage/
				return await async_local_storage.run({ event, config, prerender }, handle);
			},
			emulator
		});
	}
}
