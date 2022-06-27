import { fetch, Response, Request, Headers } from 'undici';
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
	WritableStream
};

// exported for dev/preview and node environments
export function installPolyfills() {
	for (const name in globals) {
		if (name in globalThis) continue;

		Object.defineProperty(globalThis, name, {
			enumerable: true,
			configurable: true,
			value: globals[name]
		});
	}
}
