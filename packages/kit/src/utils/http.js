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
