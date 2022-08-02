import { rimraf } from '../../utils/filesystem.js';
import { parse_route_id } from '../../utils/routing.js';
import { write } from './utils.js';

/** @param {string} imports */
const header = (imports) => `
// this file is auto-generated
import type { ${imports} } from '@sveltejs/kit';`;

/** @param {string} arg */
const endpoint = (arg) => `
export type RequestHandler<Output = ResponseBody> = GenericRequestHandler<${arg}, Output>;`;

/** @param {string} arg */
const page = (arg) => `
export type Load<
	InputData extends Record<string, any> = Record<string, any>,
	OutputData extends Record<string, any> = InputData
> = GenericLoad<${arg}, InputData, OutputData>;`;

/**
 * @param {import('types').ValidatedConfig} config
 * @param {import('types').ManifestData} manifest_data
 */
export function write_types(config, manifest_data) {
	rimraf(`${config.kit.outDir}/types`);

	manifest_data.routes.forEach((route) => {
		const declarations = [];
		const params = parse_route_id(route.id).names;

		declarations.push(
			`interface Params ${
				params.length > 0 ? `{ ${params.map((param) => `${param}: string`).join('; ')} }` : '{}'
			}`
		);

		if (route.type === 'page') {
			// TODO write Load, GET, etc
		} else {
			// TODO write RequestHandler
		}

		// TODO src/routes needs to be in this path somehow
		write(`${config.kit.outDir}/types/${route.id}/$types.d.ts`, declarations.join('\n').trim());
	});
}
