import { DEV } from 'esm-env';

/** @type {Set<string> | null} */
let warned = null;

// TODO v2: remove all references to unwrap_promises

/**
 * Given an object, return a new object where all top level values are awaited
 *
 * @param {Record<string, any>} object
 * @param {string | null} [id]
 * @returns {Promise<Record<string, any>>}
 */
export async function unwrap_promises(object, id) {
	if (DEV) {
		/** @type {string[]} */
		const promises = [];

		for (const key in object) {
			if (typeof object[key]?.then === 'function') {
				promises.push(key);
			}
		}

		if (promises.length > 0) {
			if (!warned) warned = new Set();

			const last = promises.pop();

			const properties =
				promises.length > 0
					? `${promises.map((p) => `"${p}"`).join(', ')} and "${last}" properties`
					: `"${last}" property`;

			const location = id ? `the \`load\` function in ${id}` : 'a `load` function';

			const description = promises.length > 0 ? 'are promises' : 'is a promise';

			const message = `The top-level ${properties} returned from ${location} ${description}.`;

			if (!warned.has(message)) {
				console.warn(
					`\n${message}\n\nIn SvelteKit 2.0, these will no longer be awaited automatically. To get rid of this warning, await all promises included as top-level properties in \`load\` return values.\n`
				);

				warned.add(message);
			}
		}
	}

	for (const key in object) {
		if (typeof object[key]?.then === 'function') {
			return Object.fromEntries(
				await Promise.all(Object.entries(object).map(async ([key, value]) => [key, await value]))
			);
		}
	}

	return object;
}
