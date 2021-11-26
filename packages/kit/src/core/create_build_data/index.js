/**
 * @param {import('../create_app').ManifestData} manifest_data
 * @param {import('vite').Manifest} client_manifest
 * @param {import('vite').Manifest} server_manifest
 */
export function create_build_data(manifest_data, client_manifest, server_manifest) {
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

	manifest_data.routes.forEach((route) => {
		if (route.type === 'page') {
			[...route.a, ...route.b].forEach((file) => {
				if (!components.has(file)) {
					const js = new Set();
					const css = new Set();

					find_deps(file, js, css);

					components.set(file, {
						index: components.size,
						file: server_manifest[file].file,
						css: Array.from(css),
						js: Array.from(js)
					});
				}
			});
		}
	});

	// prettier-ignore
	return `{
		components: [
			${Array.from(components.values()).map((component) => `() => import('./${component.file}').then(module => ({
				module,
				assets: {
					css: ${JSON.stringify(component.css)},
					js: ${JSON.stringify(component.js)},
				}
			}))`).join(',\n\t\t\t')}
		],
		routes: [
			${Array.from(manifest_data.routes).map(route => {
				if (route.type === 'page') {
					return `{
						type: 'page',
						pattern: ${route.pattern},
						params: ${JSON.stringify(route.params)},
						path: ${JSON.stringify(route.path)},
						a: [${route.a.map(file => components.get(file).index).join(', ')}],
						b: [${route.b.map(file => components.get(file).index).join(', ')}]
					}`.replace(/^\t\t/gm, '');
				} else {
					return `{
						type: 'endpoint',
						pattern: ${route.pattern},
						params: ${JSON.stringify(route.params)},
						load: () => import('./${route.file}')
					}`.replace(/^\t\t/gm, '');
				}
			}).join(',\n\t\t\t')}
		]
	}`.replace(/^\t/gm, '');
}
