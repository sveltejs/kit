/** @import { EnvironmentModuleNode, Plugin, ResolvedConfig, ViteDevServer } from 'vite' */
/** @import { ValidatedConfig } from 'types' */
import fs from 'node:fs';
import path from 'node:path';
import { prefixRegex } from '@rolldown/pluginutils';
import { DEV_ASSET_ID, DEV_INLINE_STYLES_ID, DEV_REPORT_ERROR_ID } from '../../../constants.js';
import { runtime_directory } from '../../../core/utils.js';
import { s } from '../../../utils/misc.js';
import { posixify } from '../../../utils/os.js';
import { from_fs } from '../../../utils/vite.js';
import { find_deps, get_inline_css_urls, report_load_error } from '../dev/generate_manifest.js';

const resolved_report_error_id = '\0' + DEV_REPORT_ERROR_ID;
const resolved_asset_id = '\0' + DEV_ASSET_ID;

const ids = [DEV_ASSET_ID, DEV_INLINE_STYLES_ID, DEV_REPORT_ERROR_ID];

/**
 * Gives a dev server that runs outside the Vite process, through `@sveltejs/kit/adapter/dev`,
 * what only the Vite process knows
 * @param {ValidatedConfig} svelte_config
 * @param {() => { vite: typeof import('vite'); root: string }} get_config
 * @returns {Plugin}
 */
export function plugin_dev_server(svelte_config, get_config) {
	/** @type {ResolvedConfig} */
	let vite_config;

	/** @type {ViteDevServer} */
	let vite_dev_server;

	return {
		name: 'vite-plugin-sveltekit-dev-server',
		apply: 'serve',

		applyToEnvironment(environment) {
			// SvelteKit's own `ssr` environment runs in the Vite process and reads these directly
			return (
				!!svelte_config.adapter?.dev?.respond &&
				environment.config.consumer === 'server' &&
				environment.name !== 'ssr'
			);
		},

		configResolved(config) {
			vite_config = config;
		},

		configureServer(server) {
			vite_dev_server = server;
		},

		resolveId: {
			filter: { id: ids.map((id) => prefixRegex(id)) },
			handler(id) {
				return '\0' + id;
			}
		},

		load: {
			filter: { id: ids.map((id) => prefixRegex('\0' + id)) },
			async handler(id) {
				const { vite } = get_config();
				const environment = /** @type {import('vite').DevEnvironment} */ (this.environment);
				const { moduleGraph } = environment;

				if (id.startsWith(resolved_asset_id)) {
					const { root } = get_config();
					const file = new URLSearchParams(id.slice(id.indexOf('?'))).get('file') ?? '';

					// the file can change, and its contents should not stay in the module graph
					const self = moduleGraph.getModuleById(id);
					if (self) moduleGraph.invalidateModule(self);

					// the path that `read` gets from the asset URL
					const resolved = file.startsWith('/@fs') ? from_fs(file) : path.join(root, file);

					return `export default ${s(fs.readFileSync(resolved).toString('base64'))};`;
				}

				if (id.startsWith(resolved_report_error_id)) {
					const error = new URLSearchParams(id.slice(id.indexOf('?'))).get('error');
					if (error) report_load_error(vite, vite_dev_server, JSON.parse(error));

					// so that the same error is reported each time it happens
					const self = moduleGraph.getModuleById(id);
					if (self) moduleGraph.invalidateModule(self);

					return 'export {};';
				}

				/** @type {Set<EnvironmentModuleNode>} */
				const deps = new Set();

				for (const file of new URLSearchParams(id.slice(id.indexOf('?'))).getAll('module')) {
					const node = moduleGraph.getModuleById(file);
					if (node) await find_deps(environment, node, deps);
				}

				// the answer depends on what has loaded so far, so it is only valid once. Vite does
				// not cache the result of a module that is invalidated while it loads
				const self = moduleGraph.getModuleById(id);
				if (self) moduleGraph.invalidateModule(self);

				const stylesheets = Array.from(get_inline_css_urls(vite, deps), ([url, inline]) => ({
					url,
					inline
				}));

				return `export default ${JSON.stringify(stylesheets)};`;
			}
		},

		// `read` from `$app/server` needs the size of an asset before it responds, and a server
		// outside the Vite process cannot stat the file, so the asset's own module provides it
		transform(code, id) {
			const { root } = get_config();
			const [file, query = ''] = id.split('?', 2);
			const params = new URLSearchParams(query);

			if (params.has('inline') || params.has('raw')) return;
			if (!params.has('url') && !vite_config.assetsInclude(file)) return;

			/** @type {fs.Stats} */
			let stats;
			try {
				stats = fs.statSync(file);
			} catch {
				return;
			}
			if (!stats.isFile()) return;

			// the same path that `read` gets from the asset URL
			const relative = posixify(path.relative(root, file));
			const key =
				relative.startsWith('../') || path.isAbsolute(relative)
					? `/@fs${posixify(file)}`
					: relative;

			return {
				code:
					`import { server_assets as __sveltekit_server_assets } from ${s(`${runtime_directory}/server/dev_assets.js`)};\n` +
					`${code}\n__sveltekit_server_assets[${s(key)}] = ${stats.size};\n`,
				map: null
			};
		}
	};
}
