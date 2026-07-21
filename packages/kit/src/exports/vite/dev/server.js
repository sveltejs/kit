import { AsyncLocalStorage } from 'node:async_hooks';
import { Server as KitServer } from '../../../runtime/server/index.js';
import { fix_stack_trace } from './sourcemaps.js';
import { get_svelte_config } from './context.js';
import { check_feature } from '../../../utils/features.js';
import { SCHEME } from '../../../utils/url.js';

const { set_fix_stack_trace } = await import(/* @vite-ignore */ '__sveltekit/server');
set_fix_stack_trace(fix_stack_trace);

/** @type {typeof import('../../../runtime/app/paths/internal/server.js')} */
const { set_assets } = await import(
	/* @vite-ignore */ import.meta.resolve('../../../runtime/app/paths/internal/server.js')
);
set_assets(__SVELTEKIT_PATHS_ASSETS__);

const async_local_storage = new AsyncLocalStorage();

/** @param {string} label */
globalThis.__SVELTEKIT_TRACK__ = (label) => {
	const context = async_local_storage.getStore();
	if (!context || context.prerender === true) return;

	check_feature(context.event.route.id, context.config, label, get_svelte_config().kit.adapter);
};

const fetch = globalThis.fetch;
/** @type {typeof fetch} */
globalThis.fetch = (info, init) => {
	if (typeof info === 'string' && !SCHEME.test(info)) {
		throw new Error(
			`Cannot use relative URL (\${info}) with global fetch — use \`event.fetch\` instead: https://svelte.dev/docs/kit/web-standards#fetch-apis`
		);
	}

	return fetch(info, init);
};

const emulator = await get_svelte_config().kit.adapter?.emulate?.();

export class Server extends KitServer {
	/** @type {import('types').InternalServer['respond']} */
	async respond(request, options) {
		options.before_handle = async (event, config, prerender, handle) => {
			// we need to use .run because .enterWith() is not supported in Cloudflare Workers
			// see https://blog.cloudflare.com/workers-node-js-asynclocalstorage/
			return await async_local_storage.run({ event, config, prerender }, handle);
		};
		options.emulator = emulator;

		return await super.respond(request, options);
	}
}
