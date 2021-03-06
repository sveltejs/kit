import fs from 'fs';
import path from 'path';
import { mkdirp } from '@sveltejs/app-utils/files';

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

const s = JSON.stringify;

/** @typedef {import('../../types').ManifestData} ManifestData */

/**
 * @param {{
 *   manifest_data: ManifestData;
 *   output: string;
 *   cwd: string;
 * }} options
 */
export function create_app({ manifest_data, output, cwd = process.cwd() }) {
	const dir = `${output}/generated`;
	const base = path.relative(cwd, dir);

	write_if_changed(`${dir}/manifest.js`, generate_client_manifest(manifest_data, base));

	write_if_changed(`${dir}/root.svelte`, generate_app(manifest_data, base));
}

/**
 * @param {string} str
 */
function trim(str) {
	return str.replace(/^\t\t/gm, '').trim();
}

/**
 * @param {{
 *   manifest_data: ManifestData;
 *   output: string;
 * }} param0
 */
export function create_serviceworker_manifest({
	manifest_data,
	output,
	client_files,
	static_files
}) {
	// let files = ['service-worker-index.html'];
	// if (fs.existsSync(static_files)) {
	// 	files = files.concat(walk(static_files));
	// }
	// const code = trim(`
	// 	// This file is generated by @sveltejs/kit — do not edit it!
	// 	export const timestamp = ${Date.now()};
	// 	export const files = [\n\t${files.map((x) => s('/' + x)).join(',\n\t')}\n];
	// 	export { files as assets }; // legacy
	// 	export const shell = [\n\t${client_files.map((x) => s('/' + x)).join(',\n\t')}\n];
	// 	export const routes = [\n\t${manifest_data.pages
	// 		.map((r) => `{ pattern: ${r.pattern} }`)
	// 		.join(',\n\t')}\n];
	// `);
	// write_if_changed(`${output}/service-worker.js`, code);
}

/**
 * @param {ManifestData} manifest_data
 * @param {string} base
 */
function generate_client_manifest(manifest_data, base) {
	const page_ids = new Set(manifest_data.pages.map((page) => page.pattern.toString()));

	const endpoints_to_ignore = manifest_data.endpoints.filter(
		(route) => !page_ids.has(route.pattern.toString())
	);

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

	const pages = `[
		${manifest_data.pages
			.map((page) => {
				const params = page.params.length
					? '(m) => ({ ' +
					  page.params
							.map((param, i) => {
								return param.startsWith('...')
									? `${param.slice(3)}: d(m[${i + 1}]).split('/')`
									: `${param}: d(m[${i + 1}])`;
							})
							.join(', ') +
					  '})'
					: 'empty';

				return `{
					// ${page.parts[page.parts.length - 1]}
					pattern: ${page.pattern},
					params: ${params},
					parts: [${page.parts.map((part) => `components[${component_indexes[part]}]`).join(', ')}]
				}`;
			})
			.join(',\n\n\t\t')}
	]`.replace(/^\t/gm, '');

	return trim(`
		import * as layout from ${s(get_path(manifest_data.layout))};

		const components = ${components};

		const d = decodeURIComponent;
		const empty = () => ({});

		export const pages = ${pages};

		export const ignore = [
			${endpoints_to_ignore.map((route) => route.pattern).join(',\n\t\t\t')}
		];

		export { layout };
	`);
}

/**
 * @param {ManifestData} manifest_data
 * @param {string} base
 */
function generate_app(manifest_data, base) {
	// TODO remove default layout altogether

	const max_depth = Math.max(
		...manifest_data.pages.map((page) => page.parts.filter(Boolean).length)
	);

	const levels = [];
	for (let i = 0; i <= max_depth; i += 1) {
		levels.push(i);
	}

	let l = max_depth;

	let pyramid = `<svelte:component this={components[${l}]} {...(props_${l} || {})}/>`;

	while (l-- > 1) {
		pyramid = `
			<svelte:component this={components[${l}]} {...(props_${l} || {})}>
				{#if components[${l + 1}]}
					${pyramid.replace(/\n/g, '\n\t\t\t\t\t')}
				{/if}
			</svelte:component>
		`
			.replace(/^\t\t\t/gm, '')
			.trim();
	}

	const error_file = path.relative(base, manifest_data.error);

	return trim(`
		<!-- This file is generated by @sveltejs/kit — do not edit it! -->
		<script>
			import { setContext, afterUpdate, onMount } from 'svelte';
			import ErrorComponent from ${s(error_file)};

			// error handling
			export let status = undefined;
			export let error = undefined;

			// stores
			export let stores;
			export let page;

			export let components;
			${levels.map((l) => `export let props_${l} = null;`).join('\n\t\t\t')}

			const Layout = components[0];

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
						title = document.title;
					}
				});

				mounted = true;
				return unsubscribe;
			});
		</script>

		<Layout {...(props_0 || {})}>
			{#if error}
				<ErrorComponent {status} {error}/>
			{:else}
				${pyramid.replace(/\n/g, '\n\t\t\t\t')}
			{/if}
		</Layout>

		{#if mounted}
			<div id="svelte-announcer" aria-live="assertive" aria-atomic="true">
				{#if navigated}
					Navigated to {title}
				{/if}
			</div>
		{/if}

		<style>
			#svelte-announcer {
				position: absolute;
				left: 0;
				top: 0;
				clip: rect(0 0 0 0);
				clip-path: inset(50%);
				overflow: hidden;
				white-space: nowrap;
				width: 1px;
				height: 1px;
			}
		</style>
	`);
}
