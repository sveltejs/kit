import { fetch, Response, Request, Headers, FormData } from 'undici';
import { ReadableStream, TransformStream, WritableStream } from 'stream/web';
import { Readable } from 'stream';
import { Request as NodeFetchRequest } from 'node-fetch';
import { webcrypto as crypto } from 'crypto';

/** @type {Record<string, any>} */
const globals = {
	crypto,
	fetch,
	Response,
	// TODO remove the superclass as soon as Undici supports formData
	// https://github.com/nodejs/undici/issues/974
	Request: class extends Request {
		// @ts-expect-error
		async formData() {
			const nodeFetchFormData = await new NodeFetchRequest(this.url, {
				method: this.method,
				headers: this.headers,
				body: this.body && Readable.from(this.body)
			}).formData();

			const formData = new FormData();
			for (const [name, value] of nodeFetchFormData.entries()) {
				formData.append(name, value);
			}
			return formData;
		}
	},
	Headers,
	ReadableStream,
	TransformStream,
	WritableStream,
	FormData
};

// exported for dev/preview and node environments
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
