import fetch, { Response, Request, Headers } from 'node-fetch';
import { webcrypto } from 'crypto';

// exported for dev/preview and node environments
export function installPolyfills() {
	Object.defineProperties(globalThis, {
		crypto: {
			enumerable: true,
			configurable: true,
			value: webcrypto
		},
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
