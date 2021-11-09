// TODO hardcoding the relative location makes this brittle
import { init, render } from '../output/server/app.js';
import { assets } from './assets.js';

init();

const getResult = (body, options) => ({
	promise: Promise.resolve(),
	waitUntil: Promise.resolve(),
	response: new Response(body, options)
});

// eslint-disable-next-line
_ENTRIES = {
	middleware_kit: {
		async default({ request }) {
			if (request.method === 'GET') {
				const { pathname, searchParams } = new URL(request.url);

				if (!assets.has(pathname.slice(1))) {
					const rendered = await render({
						method: request.method,
						headers: request.headers,
						path: pathname,
						query: searchParams,
						rawBody: new Uint8Array() // TODO
					});

					if (rendered) {
						const { status, headers, body } = rendered;
						return getResult(body, { status, headers });
					}
				}
			}

			return getResult(null, {
				headers: {
					'x-middleware-next': '1'
				}
			});
		}
	}
};
