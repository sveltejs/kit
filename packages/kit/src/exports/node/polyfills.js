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
// TODO: remove this once we only support Node 18.11+ (the version multipart/form-data was added)
export function installPolyfills() {
	// don't polyfill on non-Node platforms like Deno
	if (!globalThis.process?.versions?.node) {
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
