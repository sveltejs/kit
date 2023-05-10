import fs from 'node:fs';
import path from 'node:path';
import { posixify } from '../../utils/filesystem.js';
import { ts } from './ts.js';
import { replace_ext_with_js } from './write_types/index.js';

/**
 * Creates types for all endpoint routes
 * @param {import('types').ValidatedConfig} config
 * @param {import('types').ManifestData} manifest_data
 */
export function write_api(config, manifest_data) {
	if (!ts) return;

	const types_dir = `${config.kit.outDir}/types`;

	try {
		fs.mkdirSync(types_dir, { recursive: true });
	} catch {}

	const api_imports = [`import type * as Kit from '@sveltejs/kit';`];

	/** @type {string[]} */
	const api_declarations = [];

	api_declarations.push(
		`export interface TypedRequestInit<Method extends string> extends RequestInit { \n\tmethod: Method; \n}`
	);

	api_declarations.push(
		`type GetEndpointType<F extends (...args: any) => any> = Awaited<ReturnType<F>> extends Kit.TypedResponse<infer T> ? T : never;`
	);

	api_declarations.push(
		`type ExpandMethods<T> = { [Method in keyof T]: T[Method] extends (...args: any) => any ?  GetEndpointType<T[Method]> : never; };`
	);

	api_declarations.push(
		`type optional_trailing = \`\` | \`/\` | \`/?\${string}\` | \`?\${string}\` `
	);

	/** @type {string[]} */
	const api_endpoints = ['export type Endpoints = {'];

	let index = 0;

	for (const route of manifest_data.routes) {
		if (route.endpoint) {
			const route_import_path = posixify(
				path.relative(types_dir, replace_ext_with_js(route.endpoint.file))
			);
			api_endpoints.push(`\t${index}: { `);
			api_endpoints.push(`\t\tpath: \`${fixSlugs(posixify(route.id))}\${optional_trailing}\`; `);
			api_endpoints.push(`\t\tmethods: ExpandMethods<typeof import('${route_import_path}')>`);
			api_endpoints.push(`\t};`);
			++index;
		}
	}

	api_endpoints.push('};');

	/** @type {string[]} */
	const api_utility_types = [];

	api_utility_types.push(`type EndpointsPaths = Endpoints[keyof Endpoints]["path"];`);

	api_utility_types.push(`type MatchedPaths<S extends string> = {
		[Index in keyof Endpoints as S extends Endpoints[Index]["path"]
			? "matched"
			: never]: Endpoints[Index];
	};`);

	api_utility_types.push(
		`type ExtractMethodsFromMatched<T> = T extends { matched: { methods: infer K } } ? K : {};`
	);

	api_utility_types.push(
		`type ValidMethod<S extends string> = string & keyof ExtractMethodsFromMatched<MatchedPaths<S>>;`
	);

	api_utility_types.push(
		`type TypedResponseFromPath<S extends EndpointsPaths, Method extends ValidMethod<S>> = Kit.TypedResponse<ExtractMethodsFromMatched<MatchedPaths<S>>[Method]>;`
	);

	/** @type {string[]} */
	const api_exports = [];

	api_exports.push(
		`export function TypedFetch<
		S extends EndpointsPaths,
		Method extends ValidMethod<S>
 	>(
		input: S,
		init: TypedRequestInit<Method>
  	): Promise<TypedResponseFromPath<S, Method>>;`
	);

	api_exports.push(
		`export function TypedFetch<
		S extends EndpointsPaths,
		Method extends ValidMethod<S> = "GET" extends ValidMethod<S> ? "GET" : ValidMethod<S>
	>(
		input: S,
		...init: "GET" extends ValidMethod<S> ? [init?: TypedRequestInit<Method>] : [init: TypedRequestInit<Method>]
	): Promise<TypedResponseFromPath<S, Method>>;`
	);

	/*
	// weaker typed option (you can fetch any url without type info if outside of TypedFetch scope)
	// this leads to little to no intellisense while writing a typed fetch call because the standard fetch absorbs all partial inputs like { method: ""}
	api_exports.push(`export function TypedFetch(
		input: URL | RequestInfo,
		init?: RequestInit
	): Promise<Response>;
	`);*/

	// stronger typed but more opinionated option (you cannot fetch from urls that match enpoints without going through TypedFetch typing)
	// this provides strong intellisense on both urls and methods, and informative error when fetching from a endpoint wihtout a default "GET"
	api_exports.push(`export function TypedFetch<S extends string>(
		input: S extends EndpointsPaths ? {error: \`method is required for endpoint \${S} without GET handler\`, available_methods: \` \${ValidMethod<S>} \`} : S | URL | RequestInfo,
		init?: RequestInit
	): Promise<Response>;`);

	const output = [
		api_imports.join('\n'),
		api_declarations.join('\n'),
		api_endpoints.join('\n'),
		api_utility_types.join('\n'),
		api_exports.join('\n\n')
	]
		.filter(Boolean)
		.join('\n\n');

	fs.writeFileSync(`${types_dir}/$api.d.ts`, output);
}

/**
 * Creates types for all endpoint routes
 * TODO: cover all routing cases (optional, typed and Rest parameters slugs)
 * @param {string} str
 * @returns {string}
 */
function fixSlugs(str) {
	return str.replace(/\[.*?\]/g, '${string}').replace(/[\<].*?\>/g, '${string}');
}

/**
 * There are some typing bugs with endpoints, for example :
 * 1: 'endpoint method' extends Kit.EventHandler is falsy during runtime.
 * 2: 'enpoint method' extends (...args: any) => any, if the endpoint is unpacking parameters in function head the returned type from fetch is TypedResponse<any>
 * 		as opposed to being correctly typed if instead the function head has 'event: RequestEvent' and then the unpacking is done in the function body
 */
