import path from 'path';
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

	const dir = path.relative('.', config.kit.files.routes);

	manifest_data.routes.forEach((route) => {
		const imports = [];
		const declarations = [];
		const exports = [];

		const params = parse_route_id(route.id).names;

		declarations.push(
			`interface Params ${
				params.length > 0 ? `{ ${params.map((param) => `${param}: string`).join('; ')} }` : '{}'
			}`
		);

		if (route.type === 'page') {
			// TODO write Load, GET, etc
			imports.push(`import type { Load, GET as GenericGET } from '@sveltejs/kit';`);
			exports.push(`export type GET = GenericGET<Params>;`);
		} else {
			imports.push(`import type { RequestHandler as GenericRequestHandler } from '@sveltejs/kit';`);
			exports.push(`export type RequestHandler = GenericRequestHandler<Params>;`);
		}

		const output = `${imports.join('\n')}\n\n${declarations.join('\n')}\n\n${exports.join('\n')}`;

		// TODO src/routes needs to be in this path somehow
		write(`${config.kit.outDir}/types/${dir}/${route.id}/$types.d.ts`, output);
	});
}
