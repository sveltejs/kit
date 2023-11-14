import { ReadableStream, TransformStream, WritableStream } from 'node:stream/web';
import buffer from 'node:buffer';
import { webcrypto as crypto } from 'node:crypto';
import { fetch, Response, Request, Headers, FormData, File as UndiciFile } from 'undici';

// `buffer.File` was added in Node 18.13.0 while the `File` global was added in Node 20.0.0
const File = /** @type {import('node:buffer') & { File?: File}} */ (buffer).File ?? UndiciFile;

/** @type {Record<string, any>} */
const globals_post_node_18_11 = {
	crypto,
	File
};

/** @type {Record<string, any>} */
// TODO: remove this once we only support Node 18.11+ (the version multipart/form-data was added)
const globals_pre_node_18_11 = {
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
/**
 * Make various web APIs available as globals:
 * - `crypto`
 * - `fetch` (only in node < 18.11)
 * - `Headers` (only in node < 18.11)
 * - `Request` (only in node < 18.11)
 * - `Response` (only in node < 18.11)
 */
export function installPolyfills() {
	// Be defensive (we don't know in which environments this is called) and always apply if something goes wrong
	let globals = globals_pre_node_18_11;
	try {
		const version = process.versions.node.split('.').map((n) => parseInt(n, 10));
		if ((version[0] === 18 && version[1] >= 11) || version[0] > 18) {
			globals = globals_post_node_18_11;
		}
	} catch (e) {
		// ignore
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
