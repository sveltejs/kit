import { Headers as NodeFetchHeaders } from 'node-fetch';

/** @param {Partial<import('types/helper').ResponseHeaders> | undefined} object */
export function to_headers(object) {
	const headers = new Headers();

	if (object) {
		for (const key in object) {
			const value = object[key];
			if (!value) continue;

			if (typeof value === 'string') {
				headers.set(key, value);
			} else {
				value.forEach((value) => {
					headers.append(key, value);
				});
			}
		}
	}

	return headers;
}

/** @param {Response} response */
export function to_out_headers(response) {
	if (!response?.headers) {
		return {};
	}

	// using node-fetch's headers object just to have access to the raw method
	const node_fetch_headers = new NodeFetchHeaders(response.headers);

	/** @type {Object<string, string | string[]>} */
	const headerObject = Object.fromEntries(response.headers);

	if (headerObject['set-cookie']) {
		headerObject['set-cookie'] = node_fetch_headers.raw()['set-cookie'];
	}

	return headerObject;
}
