import fetch, { Response, Request, Headers } from 'node-fetch';
import { webcrypto as crypto } from 'crypto';

/** @type {Record<string, any>} */
const globals = {
	crypto,
	fetch,
	Response,
	Request,
	Headers
};

// exported for dev/preview and node environments
export function installPolyfills() {
	for (const name in globals) {
		// TODO use built-in fetch once https://github.com/nodejs/undici/issues/1262 is resolved
		Object.defineProperty(globalThis, name, {
			enumerable: true,
			configurable: true,
			value: globals[name]
		});
	}
}
