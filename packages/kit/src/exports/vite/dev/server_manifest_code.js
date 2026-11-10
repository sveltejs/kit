/** @import { ManifestData, SSRManifest, ValidatedConfig } from 'types' */
import path from 'node:path';
import * as devalue from 'devalue';
import { runtime_directory } from '../../../core/utils.js';
import { resolve_entry } from '../../../utils/filesystem.js';
import { posixify } from '../../../utils/os.js';
import { SVELTE_KIT_ASSETS } from '../../../constants.js';

const unsafe_chars = /[<>\b\f\n\r\t\0\u2028\u2029]/g;

/** @type {Record<string, string>} */
const escaped_chars = {
	'<': '\\u003C',
	'>': '\\u003E',
	'\b': '\\b',
	'\f': '\\f',
	'\n': '\\n',
	'\r': '\\r',
	'\t': '\\t',
	'\0': '\\0',
	'\u2028': '\\u2028',
	'\u2029': '\\u2029'
};

/**
 * json for generated code, escaping the characters that could break out of it
 * @param {unknown} value
 * @returns {string}
 */
export function to_code(value) {
	const json = JSON.stringify(value);
	return json === undefined
		? 'undefined'
		: json.replace(unsafe_chars, (char) => escaped_chars[char]);
}

/**
 * generates the dev manifest as a module, whose loaders import in whichever environment imports it
 * @param {SSRManifest} manifest the dev manifest, for its serialisable parts
 * @param {ManifestData} manifest_data
 * @param {ValidatedConfig} svelte_config
 * @param {string} root
 * @returns {string}
 */
export function generate_server_manifest_code(manifest, manifest_data, svelte_config, root) {
	/** @param {string} file */
	const file_path = (file) => to_code(posixify(path.resolve(root, file)));

	const nodes = manifest_data.nodes.map((node, index) => {
		/** @type {string[]} */
		const lines = [
			`const result = { index: ${index}, universal_id: ${to_code(node.universal)}, server_id: ${to_code(node.server)}, imports: [], stylesheets: [], fonts: [] };`,
			// modules whose css is inlined to avoid a flash of unstyled content
			'const css_modules = [];'
		];

		if (node.component) {
			lines.push(
				`result.component = async () => { css_modules.push(${file_path(node.component)}); return (await import(${file_path(node.component)})).default; };`
			);
		}

		if (node.universal) {
			if (node.page_options?.ssr === false) {
				lines.push(`result.universal = ${devalue.uneval(node.page_options)};`);
			} else {
				lines.push(
					`css_modules.push(${file_path(node.universal)});`,
					`result.universal = await import(${file_path(node.universal)});`
				);
			}
		}

		if (node.server) {
			lines.push(`result.server = await import(${file_path(node.server)});`);
		}

		lines.push('result.inline_styles = () => inline_styles(css_modules);', 'return result;');

		return `async () => {\n\t\t${lines.join('\n\t\t')}\n\t}`;
	});

	const routes = manifest.routes.map((route) => {
		const endpoint = manifest_data.routes.find((r) => r.id === route.id)?.endpoint;

		return `{
		id: ${to_code(route.id)},
		pattern: ${devalue.uneval(route.pattern)},
		params: ${devalue.uneval(route.params)},
		page: ${devalue.uneval(route.page)},
		endpoint: ${endpoint ? `() => import(${file_path(endpoint.file)})` : 'null'},
		endpoint_id: ${to_code(route.endpoint_id)}
	}`;
	});

	const matchers = manifest_data.params
		? `async () => {
		const module = await import(${file_path(manifest_data.params)});
		if (!module.params) throw new Error('${manifest_data.params} must export \`params\`');
		return module.params;
	}`
		: 'async () => ({})';

	const instrumentation = resolve_entry(
		path.join(svelte_config.files.src, 'instrumentation.server'),
		svelte_config.moduleExtensions
	);

	const assets = svelte_config.paths.assets ? SVELTE_KIT_ASSETS : svelte_config.paths.base;

	return `// generated during dev for \`@sveltejs/kit/dev-server\`
import { inline_styles } from ${to_code(`${runtime_directory}/server/dev_host.js`)};

export const assets = ${to_code(assets)};

export const instrumentation = ${instrumentation ? `() => import(${file_path(instrumentation)})` : 'null'};

/** @type {import('types').SSRManifest} */
export const manifest = {
	app_dir: ${to_code(manifest.app_dir)},
	app_path: ${to_code(manifest.app_path)},
	assets: ${devalue.uneval(manifest.assets)},
	mime_types: ${devalue.uneval(manifest.mime_types)},
	client: ${devalue.uneval(manifest.client)},
	server_assets: {},
	nodes: [
	${nodes.join(',\n\t')}
	],
	prerendered_routes: new Set(),
	remotes: {},
	routes: [
	${routes.join(',\n\t')}
	],
	matchers: ${matchers}
};
`;
}
