import fs from 'fs';
import path from 'path';
import { s } from '../../utils/misc.js';
import { mkdirp } from '../../utils/filesystem.js';
import { SVELTE_KIT } from '../constants.js';

/** @type {Map<string, string>} */
const previous_contents = new Map();

/**
 * @param {string} file
 * @param {string} code
 */
export function write_if_changed(file, code) {
	if (code !== previous_contents.get(file)) {
		previous_contents.set(file, code);
		mkdirp(path.dirname(file));
		fs.writeFileSync(file, code);
	}
}

/** @typedef {import('types').ManifestData} ManifestData */

/**
 * @param {{
 *   config: import('types').ValidatedConfig;
 *   manifest_data: ManifestData;
 *   cwd: string;
 * }} options
 */
export function create_app({ config, manifest_data, cwd = process.cwd() }) {
	const output = `${SVELTE_KIT}/generated`;
	const base = path.relative(cwd, output);

	write_if_changed(`${output}/manifest.js`, generate_client_manifest(manifest_data, base));
	write_if_changed(`${output}/root.svelte`, generate_app(manifest_data));

	create_types(config, manifest_data);
}

/**
 * @param {string} str
 */
function trim(str) {
	return str.replace(/^\t\t/gm, '').trim();
}

/**
 * @param {ManifestData} manifest_data
 * @param {string} base
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

	/** @param {string[]} parts */
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
 * @param {ManifestData} manifest_data
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

/**
 * @param {import('types').ValidatedConfig} config
 * @param {ManifestData} manifest_data
 */
function create_types(config, manifest_data) {
	const shadow_types = new Map();

	/** @param {string} key */
	function extract_params(key) {
		/** @type {string[]} */
		const params = [];

		const pattern = /\[([^\]]+)\]/g;
		let match;

		while ((match = pattern.exec(key))) {
			params.push(match[1]);
		}

		return params;
	}

	manifest_data.routes.forEach((route) => {
		if (route.type === 'endpoint') {
			const key = route.file.slice(0, -path.extname(route.file).length);
			shadow_types.set(key, { params: extract_params(key), type: 'endpoint' });
		} else if (route.shadow) {
			const key = route.shadow.slice(0, -path.extname(route.shadow).length);
			shadow_types.set(key, { params: extract_params(key), type: 'both' });
		}
	});

	manifest_data.components.forEach((component) => {
		if (component.startsWith('.')) return; // exclude fallback components

		const ext = /** @type {string} */ (config.extensions.find((ext) => component.endsWith(ext)));
		const key = component.slice(0, -ext.length);

		if (!shadow_types.has(key)) {
			shadow_types.set(key, { params: extract_params(key), type: 'page' });
		}
	});

	shadow_types.forEach(({ params, type }, key) => {
		const arg = `{ ${params.map((param) => `${param}: string`).join('; ')} }`;

		const imports = [
			type !== 'page' && 'RequestHandler as GenericRequestHandler',
			type !== 'endpoint' && 'Load as GenericLoad'
		]
			.filter(Boolean)
			.join(', ');

		const file = `${SVELTE_KIT}/types/${key || 'index'}.d.ts`;
		const content = [
			'// this file is auto-generated',
			`import type { ${imports} } from '@sveltejs/kit';`,
			type !== 'page' && `export type RequestHandler = GenericRequestHandler<${arg}>;`,
			type !== 'endpoint' &&
				`export type Load<Props = Record<string, any>> = GenericLoad<${arg}, Props>;`
		]
			.filter(Boolean)
			.join('\n');

		write_if_changed(file, content);
	});
}
