import { s } from '../../utils/misc.js';

/**
 * @param {import('../create_app').ManifestData} manifest_data
 * @param {string} client_entry_file
 * @param {import('vite').Manifest} client_manifest
 * @param {import('vite').Manifest} server_manifest
 */
export function create_build_data(
	manifest_data,
	client_entry_file,
	client_manifest,
	server_manifest
) {
	// TODO create subsets

	const components = new Map();

	/**
	 * @param {string} file
	 * @param {Set<string>} css
	 * @param {Set<string>} js
	 * @returns
	 */
	function find_deps(file, js, css) {
		const chunk = client_manifest[file];

		if (js.has(chunk.file)) return;
		js.add(chunk.file);

		if (chunk.css) {
			chunk.css.forEach((file) => css.add(file));
		}

		if (chunk.imports) {
			chunk.imports.forEach((file) => find_deps(file, js, css));
		}
	}

	const entry_js = new Set();
	const entry_css = new Set();

	find_deps(client_entry_file, entry_js, entry_css);

	manifest_data.routes.forEach((route) => {
		if (route.type === 'page') {
			[...route.a, ...route.b].forEach((id) => {
				if (!components.has(id)) {
					const js = new Set();
					const css = new Set();

					find_deps(id, js, css);

					components.set(id, {
						id,
						index: components.size,
						file: server_manifest[id].file,
						css: Array.from(css),
						js: Array.from(js)
					});
				}
			});
		}
	});

	// prettier-ignore
	return `{
		components: {
			${Array.from(components.values()).map((component) => `'${component.id}': () => import('./${component.file}').then(module => ({
				module,
				entry: ${s(client_manifest[component.id].file)},
				css: ${s(component.css)},
				js: ${s(component.js)}
			}))`).join(',\n\t\t\t')}
		},
		manifest: {
			entry: {
				file: ${s(client_manifest[client_entry_file].file)},
				css: ${s(Array.from(entry_css))},
				js: ${s(Array.from(entry_js))}
			},
			assets: ${s(manifest_data.assets)},
			layout: ${s(manifest_data.layout)},
			error: ${s(manifest_data.error)},
			routes: [
				${Array.from(manifest_data.routes).map(route => {
					if (route.type === 'page') {
						return `{
							type: 'page',
							pattern: ${route.pattern},
							params: ${get_params(route.params)},
							path: ${s(route.path)},
							a: ${s(route.a)},
							b: ${s(route.b)}
						}`.replace(/^\t\t/gm, '');
					} else {
						return `{
							type: 'endpoint',
							pattern: ${route.pattern},
							params: ${get_params(route.params)},
							load: () => import('./${server_manifest[route.file].file}')
						}`.replace(/^\t\t/gm, '');
					}
				}).join(',\n\t\t\t\t')}
			]
		}
	}`.replace(/^\t/gm, '');
}

/** @param {string[]} array */
function get_params(array) {
	// given an array of params like `['x', 'y', 'z']` for
	// src/routes/[x]/[y]/[z]/svelte, create a function
	// that turns a RexExpMatchArray into ({ x, y, z })
	return array.length
		? '(m) => ({ ' +
				array
					.map((param, i) => {
						return param.startsWith('...')
							? `${param.slice(3)}: d(m[${i + 1}] || '')`
							: `${param}: d(m[${i + 1}])`;
					})
					.join(', ') +
				'})'
		: 'null';
}
