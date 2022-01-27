import fetch, { Response, Request, Headers } from 'node-fetch';

// exported for dev/preview and node environments
export function __fetch_polyfill() {
	Object.defineProperties(globalThis, {
		fetch: {
			enumerable: true,
			configurable: true,
			value: fetch
		},
		Response: {
			enumerable: true,
			configurable: true,
			value: Response
		},
		Request: {
			enumerable: true,
			configurable: true,
			value: Request
		},
		Headers: {
			enumerable: true,
			configurable: true,
			value: Headers
		}
	});
}

// exported for esbuild shims in adapters
export { fetch, Response, Request, Headers };
