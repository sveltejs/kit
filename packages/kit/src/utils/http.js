/** @param {Partial<import('types').ResponseHeaders> | undefined} object */
export function to_headers(object) {
	const headers = new Headers();

	if (object) {
		for (const key in object) {
			const value = object[key];
			if (!value) continue;

			if (Array.isArray(value)) {
				value.forEach((value) => {
					headers.append(key, /** @type {string} */ (value));
				});
			} else {
				headers.set(key, /** @type {string} */ (value));
			}
		}
	}

	return headers;
}

/**
 * Given an Accept header and a list of possible content types, pick
 * the most suitable one to respond with
 * @param {string} accept
 * @param {string[]} types
 */
export function negotiate(accept, types) {
	/** @type {Array<{ type: string, subtype: string, q: number, i: number }>} */
	const parts = [];

	accept.split(',').forEach((str, i) => {
		const match = /([^/]+)\/([^;]+)(?:;q=([0-9.]+))?/.exec(str);

		// no match equals invalid header — ignore
		if (match) {
			const [, type, subtype, q = '1'] = match;
			parts.push({ type, subtype, q: +q, i });
		}
	});

	parts.sort((a, b) => {
		if (a.q !== b.q) {
			return b.q - a.q;
		}

		if ((a.subtype === '*') !== (b.subtype === '*')) {
			return a.subtype === '*' ? 1 : -1;
		}

		if ((a.type === '*') !== (b.type === '*')) {
			return a.type === '*' ? 1 : -1;
		}

		return a.i - b.i;
	});

	let accepted;
	let min_priority = Infinity;

	for (const mimetype of types) {
		const [type, subtype] = mimetype.split('/');
		const priority = parts.findIndex(
			(part) =>
				(part.type === type || part.type === '*') &&
				(part.subtype === subtype || part.subtype === '*')
		);

		if (priority !== -1 && priority < min_priority) {
			accepted = mimetype;
			min_priority = priority;
		}
	}

	return accepted;
}
