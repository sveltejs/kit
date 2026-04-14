import { AsyncLocalStorage } from 'node:async_hooks';
import * as devalue from 'devalue';
import { get } from '__sveltekit/manifest-data';
import { Server as OriginalServer } from '../../../runtime/server/index.js';
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

export class Server extends OriginalServer {
	/** @type {import('types').InternalServer['respond']} */
	async respond(request, options) {
		options.before_handle = async (event, config, prerender, handle) => {
			// we need to use .run because .enterWith() is not supported in Cloudflare Workers
			// see https://blog.cloudflare.com/workers-node-js-asynclocalstorage/
			return await async_local_storage.run({ event, config, prerender }, handle);
		};

		if (__SVELTEKIT_PRERENDERING__ || __SVELTEKIT_GENERATING_FALLBACK__) {
			options.getClientAddress = () => {
				throw new Error('Cannot read clientAddress during prerendering');
			};

			options.prerendering = {
				fallback: __SVELTEKIT_GENERATING_FALLBACK__,
				// TODO: proxy this to send messages back to the prerenderer?
				dependencies: new Map(),
				remote_responses: new Map()
			};

			options.read = async (file) => {
				const response = await get(`/read/${encodeURIComponent(file)}`);
				return Buffer.from(await response.arrayBuffer());
			};
		}

		return super.respond(request, options);
	}
}

if (import.meta.hot) {
	import.meta.hot.data.saved = new Map();
	import.meta.hot.on('sveltekit:prerender-saved', ({ file, body }) => {
		import.meta.hot?.data.saved.set(file, devalue.parse(body));
	});
}
