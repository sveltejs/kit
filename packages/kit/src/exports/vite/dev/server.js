import { AsyncLocalStorage } from 'node:async_hooks';
import * as devalue from 'devalue';
import { DEV } from 'esm-env';
import { get } from '__sveltekit/manifest-data';
import { Server as KitServer } from '../../../runtime/server/index.js';
import { check_feature } from '../../../runtime/../utils/features.js';
import { SCHEME } from '../../../runtime/../utils/url.js';

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
	/** @param {import('@sveltejs/kit').ServerInitOptions} options */
	async init(options) {
		if (__SVELTEKIT_PRERENDERING__) {
			options.read = async (file) => {
				const response = await get(`/read?${new URLSearchParams({ file })}`);
				if (!response.ok) {
					throw new Error(
						`read(...) failed: could not fetch ${file} (${response.status} ${response.statusText})`
					);
				}
				return response.body;
			};
		}

		return super.init(options);
	}

	/** @type {import('types').InternalServer['respond']} */
	async respond(request, options) {
		if (DEV) {
			options.before_handle = async (event, config, prerender, handle) => {
				// we need to use .run because .enterWith() is not supported in Cloudflare Workers
				// see https://blog.cloudflare.com/workers-node-js-asynclocalstorage/
				return await async_local_storage.run({ event, config, prerender }, handle);
			};
		}

		if (__SVELTEKIT_PRERENDERING__ || __SVELTEKIT_GENERATING_FALLBACK__) {
			options.getClientAddress = () => {
				throw new Error('Cannot read clientAddress during prerendering');
			};

			options.prerendering = {
				fallback: __SVELTEKIT_GENERATING_FALLBACK__,
				dependencies: new Map(),
				remote_responses: import.meta.hot?.data.remote_responses
			};

			options.read = async (file) => {
				const response = await get(`/prerender-read?${new URLSearchParams({ file })}`);
				return Buffer.from(await response.arrayBuffer());
			};
		}

		const response = await super.respond(request, options);

		if (__SVELTEKIT_PRERENDERING__) {
			import.meta.hot?.send(
				'sveltekit:prerender-dependencies',
				devalue.stringify(options.prerendering?.dependencies, {
					/** @param {Response} value */
					Response: async (value) =>
						value instanceof Response &&
						/** @satisfies {import('../types.js').SerializedResponse} */ ({
							status: value.status,
							statusText: value.statusText,
							headers: Object.fromEntries(value.headers),
							body: await value.arrayBuffer()
						})
				})
			);
		}

		return response;
	}
}

if (import.meta.hot) {
	import.meta.hot.data.remote_responses ??= new Map();
}
