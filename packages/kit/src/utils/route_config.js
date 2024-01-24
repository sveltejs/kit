/**
 * Do a shallow merge (first level) of the config object
 * @param {Array<import('types').SSRNode | undefined>} nodes
 */
export function get_page_config(nodes) {
	/** @type {any} */
	let current = {};

	for (const node of nodes) {
		if (!node?.universal?.config && !node?.server?.config) continue;

		current = {
			...current,
			...node?.universal?.config,
			...node?.server?.config
		};
	}

	// TODO 3.0 always return `current`? then we can get rid of `?? {}` in other places
	return Object.keys(current).length ? current : undefined;
}
