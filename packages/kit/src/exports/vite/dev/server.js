import { AsyncLocalStorage } from 'node:async_hooks';
import { DEV } from 'esm-env';
import { Server as KitServer } from '../../../runtime/server/index.js';
import { check_feature } from '../../../utils/features.js';
import { SCHEME } from '../../../utils/url.js';
import { manifest } from './ssr_manifest.js';

const async_local_storage = new AsyncLocalStorage();

/** @param {string} label */
globalThis.__SVELTEKIT_TRACK__ = (label) => {
	const context = async_local_storage.getStore();
	if (!context || context.prerender === true) return;

	// we can't await this because `read` has a synchronous signature
	void check_feature(context.event.route.id, context.config, label);
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

export class Server extends KitServer {
	/** @type {import('types').InternalServer['respond']} */
	async respond(request, options) {
		if (DEV) {
			options.before_handle = async (event, config, prerender, handle) => {
				// we need to use .run because .enterWith() is not supported in Cloudflare Workers
				// see https://blog.cloudflare.com/workers-node-js-asynclocalstorage/
				return await async_local_storage.run({ event, config, prerender }, handle);
			};
		}

		return await super.respond(request, options);
	}
}

import.meta.hot?.on('sveltekit:remote', async (hash) => {
	const remote = (await manifest._.remotes[hash]()).default;

	/** @type {Map<string, { type: string }>} */
	const exports = new Map();
	for (const name in remote) {
		exports.set(name, { type: remote[name].__.type });
	}
	const data = Object.fromEntries(exports);

	import.meta.hot?.send(`sveltekit:remote:${hash}`, data);
});
