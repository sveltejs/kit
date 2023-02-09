import { ReadableStream, TransformStream, WritableStream } from 'node:stream/web';
import buffer from 'node:buffer';
import { webcrypto as crypto } from 'node:crypto';
import { fetch, Response, Request, Headers, FormData, File as UndiciFile } from 'undici';

// @ts-expect-error
const File = buffer.File ?? UndiciFile;

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
	FormData,
	File
};

// exported for dev/preview and node environments
// TODO: remove this once we only support Node 18.11+ (the version multipart/form-data was added)
export function installPolyfills() {
	for (const name in globals) {
		Object.defineProperty(globalThis, name, {
			enumerable: true,
			configurable: true,
			writable: true,
			value: globals[name]
		});
	}
}
