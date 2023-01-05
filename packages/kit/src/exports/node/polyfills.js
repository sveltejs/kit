import { fetch, Response, Request, Headers, FormData } from 'undici';
import { ReadableStream, TransformStream, WritableStream } from 'stream/web';
import { webcrypto as crypto } from 'crypto';

/** @type {Record<string, any>} */
const globals = {
	crypto,
	fetch,
	Response,
	Request,
	Headers,
	ReadableStream,
	TransformStream,
	WritableStream,
	FormData
};

// exported for dev/preview and node environments
export function installPolyfills() {
	const version_string = globalThis.process?.versions?.node;

	// don't polyfill on non-Node platforms like Deno
	if (!version_string) {
		return;
	}

	for (const name in globals) {
		Object.defineProperty(globalThis, name, {
			enumerable: true,
			configurable: true,
			writable: true,
			value: globals[name]
		});
	}
}
