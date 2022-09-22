/** @param {Record<string, any>} object */
export async function unwrap_promises(object) {
	/** @type {Record<string, any>} */
	const unwrapped = {};

	for (const key in object) {
		unwrapped[key] = await object[key];
	}

	return unwrapped;
}
