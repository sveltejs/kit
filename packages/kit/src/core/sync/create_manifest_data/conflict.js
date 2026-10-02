/** @param {import('types').RouteData[]} routes */
export function prevent_conflicts(routes) {
	/** @type {Map<string, string>} */
	const lookup = new Map();

	for (const route of routes) {
		if (!route.leaf && !route.endpoint) continue;

		/** @type {string[]} */
		let permutations;

		const normalized = normalize_route_id(route.id);

		const ends_with_optional = /<\?.+?>$/.test(normalized);
		if (!ends_with_optional && Array.from(normalized.matchAll(/<\?.+?>/g)).length) {
			// find all permutations created by optional parameters
			const split = normalized.split(/<\?(.+?)>/g);

			permutations = [/** @type {string} */ (split[0])];

			// turn `x/[[optional]]/y` into `x/y` and `x/[required]/y`
			for (let i = 1; i < split.length; i += 2) {
				const matcher = split[i];
				const next = split[i + 1];

				permutations = permutations.reduce((a, b) => {
					a.push(b + next);
					if (!(matcher === '*' && b.endsWith('//'))) a.push(b + `<${matcher}>${next}`);
					return a;
				}, /** @type {string[]} */ ([]));
			}
		} else {
			permutations = [normalized];
		}

		for (const permutation of permutations) {
			// remove leading/trailing/duplicated slashes caused by prior
			// manipulation of optional parameters and (groups)
			const key = permutation
				.replace(/\/{2,}/, '/')
				.replace(/^\//, '')
				.replace(/\/$/, '');

			if (lookup.has(key)) {
				throw new Error(
					`The "${lookup.get(key)}" and "${route.id}" routes conflict with each other`
				);
			}

			lookup.set(key, route.id);
		}
	}
}

/** @param {string} id */
function normalize_route_id(id) {
	return (
		id
			// remove groups
			.replace(/(?<=^|\/)\(.+?\)(?=$|\/)/g, '')

			.replace(/\[[ux]\+([0-9a-f]+)\]/g, (_, x) =>
				String.fromCharCode(parseInt(x, 16)).replace(/\//g, '%2f')
			)

			// replace `[param]` with `<*>`, `[param=x]` with `<x>`, and `[[param]]` with `<?*>`
			.replace(
				/\[(?:(\[)|(\.\.\.))?.+?(=.+?)?\]\]?/g,
				(_, optional, rest, matcher) => `<${optional ? '?' : ''}${rest ?? ''}${matcher ?? '*'}>`
			)
	);
}
