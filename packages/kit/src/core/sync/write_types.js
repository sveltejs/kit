import { write_if_changed } from './utils.js';

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

		const pattern = /\[([^\]]+)\]/g;
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

		const imports = [
			type !== 'page' && 'RequestHandler as GenericRequestHandler',
			type !== 'endpoint' && 'Load as GenericLoad'
		]
			.filter(Boolean)
			.join(', ');

		const file = `${config.kit.outDir}/types/${key || 'index'}.d.ts`;
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
