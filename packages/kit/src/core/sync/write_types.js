import { write_if_changed } from './utils.js';

/** @param {string} imports */
const header = (imports) => `
// this file is auto-generated
import type { ${imports} } from '@sveltejs/kit';`;

/** @param {string} arg */
const endpoint = (arg) => `
export type RequestHandler<Output extends ResponseBody = ResponseBody> = GenericRequestHandler<${arg}, Output>;`;

/** @param {string} arg */
const page = (arg) => `
export type Load<
	InputProps extends Record<string, any> = Record<string, any>,
	OutputProps extends Record<string, any> = InputProps
> = GenericLoad<${arg}, InputProps, OutputProps>;`;

/**
 * @param {import('types').ValidatedConfig} config
 * @param {import('types').ManifestData} manifest_data
 */
export function write_types(config, manifest_data) {
	/** @type {Map<string, { params: string[], type: 'page' | 'endpoint' | 'both' }>} */
	const shadow_types = new Map();

	/** @param {string} key */
	function extract_params(key) {
		/** @type {string[]} */
		const params = [];

		const pattern = /\[(?:\.{3})?([^\]]+)\]/g;
		let match;

		while ((match = pattern.exec(key))) {
			params.push(match[1]);
		}

		return params;
	}

	manifest_data.routes.forEach((route) => {
		const file = route.type === 'endpoint' ? route.file : route.shadow;

		if (file) {
			const ext = /** @type {string} */ (
				config.kit.endpointExtensions.find((ext) => file.endsWith(ext))
			);
			const key = file.slice(0, -ext.length);
			shadow_types.set(key, {
				params: extract_params(key),
				type: route.type === 'endpoint' ? 'endpoint' : 'both'
			});
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
		const arg =
			params.length > 0 ? `{ ${params.map((param) => `${param}: string`).join('; ')} }` : '{}';

		const imports = [];
		const content = [];

		if (type !== 'page') {
			imports.push('RequestHandler as GenericRequestHandler, ResponseBody');
			content.push(endpoint(arg));
		}

		if (type !== 'endpoint') {
			imports.push('Load as GenericLoad');
			content.push(page(arg));
		}

		content.unshift(header(imports.join(', ')));

		write_if_changed(
			`${config.kit.outDir}/types/${key || 'index'}.d.ts`,
			content.join('\n').trim()
		);
	});
}
