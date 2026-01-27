const counters = Object.create(null);

/**
 * @param {string} import_meta_url (use import.meta.url)
 * @returns {number}
 */
export function increment(import_meta_url) {
	if (counters[import_meta_url] == null) {
		counters[import_meta_url] = 0;
	}
	return counters[import_meta_url]++;
}

/**
 * must be called from `foo/reset-states/+server.js`, resets all counters in foo
 * @param {string} import_meta_url
 */
export function reset_states(import_meta_url) {
	if (!import_meta_url.endsWith('reset-states/+server.js')) {
		throw new Error('must be called from reset-states/+server.js');
	}
	const parent_dir = new URL(`${import_meta_url}/../..`).toString();
	Object.keys(counters)
		.filter((k) => k.startsWith(parent_dir))
		.forEach((k) => {
			counters[k] = 0;
		});
}
