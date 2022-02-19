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
