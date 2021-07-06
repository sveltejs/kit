import fetch, { Response, Request, Headers } from 'node-fetch';

// exported for dev, prerender, and preview
export function __fetch_polyfill() {
	Object.defineProperties(globalThis, {
		fetch: {
			enumerable: true,
			value: fetch
		},
		Response: {
			enumerable: true,
			value: Response
		},
		Request: {
			enumerable: true,
			value: Request
		},
		Headers: {
			enumerable: true,
			value: Headers
		}
	});
}

// exported for esbuild shims in adapters
export { fetch, Response, Request, Headers };
