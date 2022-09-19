const query_pattern = /\?.*$/s;

/** @param {string} path */
export function remove_query_from_id(path) {
	return path.replace(query_pattern, '');
}

/**
 * Vite does some weird things with import trees in dev
 * for example, a Tailwind app.css will appear to import
 * every file in the project. This isn't a problem for
 * Rollup during build.
 * @param {Iterable<string>} config_module_types
 */
export const get_module_types = (config_module_types) => {
	return new Set([
		'',
		'.ts',
		'.js',
		'.svelte',
		'.mts',
		'.mjs',
		'.cts',
		'.cjs',
		'.svelte.md',
		'.svx',
		'.md',
		...config_module_types
	]);
};
