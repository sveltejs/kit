import buffer from 'node:buffer';
import { webcrypto as crypto } from 'node:crypto';

// `buffer.File` was added in Node 18.13.0 while the `File` global was added in Node 20.0.0
const File = /** @type {import('node:buffer') & { File?: File}} */ (buffer).File;

/** @type {Record<string, any>} */
const globals = {
	crypto,
	File
};

// exported for dev/preview and node environments
/**
 * Rend ces <span class='vo'>[APIs](https://sveltefr.dev/docs/development#api)</span> web disponibles en tant que variables globales :
 * - `crypto`
 * - `File`
 */
export function installPolyfills() {
	for (const name in globals) {
		if (name in globalThis) continue;

		Object.defineProperty(globalThis, name, {
			enumerable: true,
			configurable: true,
			writable: true,
			value: globals[name]
		});
	}
}
