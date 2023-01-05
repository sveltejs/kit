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

	const version = version_string.split('.');
	// multipart/form-data was added in Undici 5.11: https://github.com/nodejs/undici/releases/tag/v5.11.0
	// Node 18.11 upgraded to Unidi 5.11: https://github.com/nodejs/node/blob/main/doc/changelogs/CHANGELOG_V18.md#2022-10-13-version-18110-current-danielleadams
	// We don't need to polyfill if it's already available
	if (parseInt(version[0]) > 18 || parseInt(version[1]) >= 11) {
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
