import fs from 'fs';
import path from 'path';
import { s } from '../../utils/misc.js';
import { mkdirp } from '../../utils/filesystem.js';

/**
 * Maps file contents to file path
 *  @type {Map<string, string>} */
const previous_contents = new Map();

/**
 * Checks `previous_contents` map for `file` key and performs strict inequality comparison of `code` against the value, then writes `code` to `file` if there are changes.
 * @param {string} file - the path of the file to be written
 * @param {string} code - code to be checked against `previous_contents` and written if unequal
 */
export function write_if_changed(file, code) {
	if (code !== previous_contents.get(file)) {
		previous_contents.set(file, code);
		mkdirp(path.dirname(file));
		fs.writeFileSync(file, code);
	}
}

/** @typedef {import('types/internal').ManifestData} ManifestData */


/**
 * Updates or creates two files - manifest.js and root.svelte - in the specified output directory.
 * @param {Object} options
 * @param {ManifestData} options.manifest_data - details the apps assets, user defined components, routes, and __layout and error components
 * @param {string} options.output - directory files will be written in
 * @param {string} options.cwd - the current working directory. Defaults to `process.cwd()`
 */
export function create_app({ manifest_data, output, cwd = process.cwd() }) {
	const base = path.relative(cwd, output);

	write_if_changed(`${output}/manifest.js`, generate_client_manifest(manifest_data, base));
	write_if_changed(`${output}/root.svelte`, generate_app(manifest_data));
}

/**
 * Returns string without leading tabs and whitespace.
 * @param {string} str
 * 
 */
function trim(str) {
	return str.replace(/^\t\t/gm, '').trim();
}

/**
 * Generates code for the `manifest.js` file which imports svelte components and exports the app's `routes`, an an array of arrays containing a pattern to match the route and two arrays of components (`[__layout, page]` and `[error]`)
 * @param {ManifestData} manifest_data - object containing paths to the apps assets, user defined components, routes, and the app's __layout and error components.
 * @param {string} base - the base path to prepend to imports 
 */
function generate_client_manifest(manifest_data, base) {
	/** @type {Record<string, number>} */
	const component_indexes = {};

	/** @param {string} c */
	const get_path = (c) => path.relative(base, c);
	
	const components = `[
		${manifest_data.components
			.map((component, i) => {
				component_indexes[component] = i;

				return `() => import(${s(get_path(component))})`;
			})
			.join(',\n\t\t\t\t')}
	]`.replace(/^\t/gm, '');

	/** 
	 * Matches components by path and returns an array of those components accessed within the `c`array.
	 * @param {string[]} parts - array of component paths */
	const get_indices = (parts) =>
		`[${parts.map((part) => (part ? `c[${component_indexes[part]}]` : '')).join(', ')}]`;

	const routes = `[
		${manifest_data.routes
			.map((route) => {
				if (route.type === 'page') {
					const params =
						route.params.length > 0 &&
						'(m) => ({ ' +
							route.params
								.map((param, i) => {
									return param.startsWith('...')
										? `${param.slice(3)}: d(m[${i + 1}] || '')`
										: `${param}: d(m[${i + 1}])`;
								})
								.join(', ') +
							'})';

					const tuple = [route.pattern, get_indices(route.a), get_indices(route.b)];

					// optional items
					if (params || route.shadow) tuple.push(params || 'null');
					if (route.shadow) tuple.push('1');

					return `// ${route.a[route.a.length - 1]}\n\t\t[${tuple.join(', ')}]`;
				}
			})
			.filter(Boolean)
			.join(',\n\n\t\t')}
	]`.replace(/^\t/gm, '');

	return trim(`
		const c = ${components};

		const d = decodeURIComponent;

		export const routes = ${routes};

		// we import the root layout/error components eagerly, so that
		// connectivity errors after initialisation don't nuke the app
		export const fallback = [c[0](), c[1]()];
	`);
}

/**
 * Generates the code for the `root.svelte` component.
 * @param {ManifestData} manifest_data - object containing paths to the apps assets, user defined components, routes, and the app's __layout and error components.
 */
function generate_app(manifest_data) {
	// TODO remove default layout altogether

	const max_depth = Math.max(
		...manifest_data.routes.map((route) =>
			route.type === 'page' ? route.a.filter(Boolean).length : 0
		),
		1
	);

	const levels = [];
	for (let i = 0; i <= max_depth; i += 1) {
		levels.push(i);
	}

	let l = max_depth;

	let pyramid = `<svelte:component this={components[${l}]} {...(props_${l} || {})}/>`;

	while (l--) {
		pyramid = `
			{#if components[${l + 1}]}
				<svelte:component this={components[${l}]} {...(props_${l} || {})}>
					${pyramid.replace(/\n/g, '\n\t\t\t\t\t')}
				</svelte:component>
			{:else}
				<svelte:component this={components[${l}]} {...(props_${l} || {})} />
			{/if}
		`
			.replace(/^\t\t\t/gm, '')
			.trim();
	}

	return trim(`
		<!-- This file is generated by @sveltejs/kit — do not edit it! -->
		<script>
			import { setContext, afterUpdate, onMount } from 'svelte';

			// stores
			export let stores;
			export let page;

			export let components;
			${levels.map((l) => `export let props_${l} = null;`).join('\n\t\t\t')}

			setContext('__svelte__', stores);

			$: stores.page.set(page);
			afterUpdate(stores.page.notify);

			let mounted = false;
			let navigated = false;
			let title = null;

			onMount(() => {
				const unsubscribe = stores.page.subscribe(() => {
					if (mounted) {
						navigated = true;
						title = document.title || 'untitled page';
					}
				});

				mounted = true;
				return unsubscribe;
			});
		</script>

		${pyramid.replace(/\n/g, '\n\t\t')}

		{#if mounted}
			<div id="svelte-announcer" aria-live="assertive" aria-atomic="true" style="position: absolute; left: 0; top: 0; clip: rect(0 0 0 0); clip-path: inset(50%); overflow: hidden; white-space: nowrap; width: 1px; height: 1px">
				{#if navigated}
					{title}
				{/if}
			</div>
		{/if}
	`);
}
