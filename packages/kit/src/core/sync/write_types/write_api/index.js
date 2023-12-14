import fs from 'node:fs';
import path from 'node:path';
import { posixify } from '../../../../utils/filesystem.js';
import { ts } from '../../ts.js';
import { replace_ext_with_js } from '../index.js';

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

	const api_imports = ['import type * as Kit from "@sveltejs/kit";'];

	/** @type {string[]} */
	const api_declarations = [];

	api_declarations.push("declare module '__sveltekit/paths' {");
	api_declarations.push(
		`\tinterface paths { \n\t\tbase: '${config.kit.paths.base}', \n\t\tassets: '${config.kit.paths.assets}'\n\t}`
	);
	api_declarations.push('}');

	api_declarations.push(
		'interface TypedRequestInit<Method extends string> extends RequestInit { \n\tmethod?: Method; \n}'
	);
	api_declarations.push(
		'interface TypedRequestInitRequired<Method extends string> extends RequestInit { \n\tmethod: Method; \n}'
	);
	api_declarations.push(
		'type GetEndpointType<F extends (...args: any) => any> = Awaited<ReturnType<F>> extends Kit.TypedResponse<infer T> ? Kit.Jsonify<T> : never;'
	);
	api_declarations.push(
		'type ExpandMethods<T> = { [Method in keyof T]: T[Method] extends (...args: any) => any ? GetEndpointType<T[Method]> : never; };'
	);
	api_declarations.push('type optional_trailing = `` | `?${string}`;');
	api_declarations.push('type restricted_characters = ` ` | `/` | `\\\\`;');
	api_declarations.push('type restricted_characters_rest = ` ` | `\\\\`;');
	api_declarations.push(
		'type RemoveTrailingSlash<S extends string> = S extends "/" ? S : S extends `${infer _S}/` ? _S : S;'
	);
	api_declarations.push(
		`\n/** Check if is not empty, and does not contain restricted characters */ \ntype ValidateRequired<S extends string> = FixDynamicStr<S> extends \`/\${infer Slug}\` ?
		Slug extends ('' | \`\${string}\${restricted_characters}\${string}\`) ?
				false
			: true
		: false;\n`
	);
	api_declarations.push(
		`/** Check if does not contain restricted characters. If the check fails, \n * check if it has a starting slash and take the content after it as a slug parameter and validate it */ \ntype ValidateOptional<S extends string> = FixDynamicStr<S> extends \`/\${infer Slug}\` ?
		Slug extends (\`\${string}\${restricted_characters}\${string}\`) ?
				false
			: true
		: FixDynamicStr<S> extends '' ?
			true
	  	: false;\n`
	);
	api_declarations.push(
		`/** Almost no check, just exclude restricted characters */ \ntype ValidateRest<S extends string> = FixDynamicStr<S> extends \`/\${infer Slug}\` ?
		Slug extends (\`\${string}\${restricted_characters_rest}\${string}\`) ?
				false
			: true
		: FixDynamicStr<S> extends '' ?
			true
	  	: false;\n`
	);

	api_declarations.push(
		`\n/** Check if is empty or starts with '#' or '?' and does not contain restricted characters */ \ntype ValidateTrailing<S extends string> = FixDynamicTrailing<S> extends '' | \`?\${infer Slug}\` | \`#\${infer Slug}\` ?
		Slug extends (\`\${string}\${restricted_characters}\${string}\`) ?
				false
			: true
		: false;\n`
	);
	api_declarations.push(
		'type UnionAllTrue<B extends boolean> = [B] extends [true] ? true : false;'
	);
	api_declarations.push(
		'type FixDynamicStr<S> = S extends undefined | null ? "" : Kit.Equals<S, string> extends true ? `/${string}` : S;'
	);
	api_declarations.push(
		'type FixDynamicTrailing<S> = S extends undefined | null ? "" : Kit.Equals<S, string> extends true ? `?${string}` : S;'
	);

	/** @type {string[]} */
	const api_endpoints = [
		'declare module "@sveltejs/kit" {',
		'\tinterface ValidURLs<ToCheck extends string> {'
	];

	let index = 1;

	for (const route of manifest_data.routes) {
		if (route.endpoint || route.leaf) {
			const { matcher_str, validator_str } = parseSlugs(route.id);
			api_endpoints.push(`\t\t${index}: { `);
			api_endpoints.push(`\t\t\tid: \`${route.id}\`; `);
			api_endpoints.push(
				`\t\t\tdoes_match: RemoveTrailingSlash<ToCheck> extends \`${config.kit.paths.base}${matcher_str}\` ? ${validator_str} : false; `
			);
			if (route.endpoint) {
				const route_import_path = posixify(
					path.relative(types_dir, replace_ext_with_js(route.endpoint.file))
				);
				api_endpoints.push(`\t\t\tmethods: ExpandMethods<typeof import('${route_import_path}')>`);
				api_endpoints.push('\t\t\tendpoint: true');
			} else {
				api_endpoints.push('\t\t\tendpoint: false');
			}
			if (route.leaf) api_endpoints.push('\t\t\tleaf: true');
			else api_endpoints.push('\t\t\tleaf: false');
			api_endpoints.push('\t\t};');
			++index;
		}
	}

	api_endpoints.push('\t}');
	api_endpoints.push('}');

	/** @type {string[]} */
	const api_utility_types = [];

	api_utility_types.push(`type MatchedEndpoints<S extends string> = {
		[Index in keyof Kit.ValidURLs<S> as Kit.ValidURLs<S>[Index]["does_match"] extends true 
		? Kit.ValidURLs<S>[Index]["endpoint"] extends true
		? "matched" : never : never]: Kit.ValidURLs<S>[Index];
	};`);

	api_utility_types.push(
		'type ExtractMethodsFromMatched<T> = T extends { matched: { methods: infer K } } ? K : {};'
	);

	api_utility_types.push(
		"type ExtractIdFromMatched<T> = T extends { matched: { id: infer K } } ? K extends string ? K : '' : '';"
	);

	api_utility_types.push(
		'type ValidMethod<S extends string> = string & keyof ExtractMethodsFromMatched<MatchedEndpoints<S>>;'
	);

	api_utility_types.push(
		'type TypedResponseFromPath<S extends string, Method extends ValidMethod<S>> = Kit.TypedResponse<ExtractMethodsFromMatched<MatchedEndpoints<S>>[Method], true> | Kit.TypedResponse<App.Error, false>;'
	);

	/** @type {string[]} */
	const api_exports = [];

	api_exports.push(
		`export declare function fetch<
		S,
		Method extends ValidMethod<S & string> = "GET" & ValidMethod<S & string>
	>(
		input: S extends string ? Kit.IsRelativePath<S> extends true ? MatchedEndpoints<S> extends { matched: any } ? S : \`no matched endpoints with id: \${S}\` : never : never,
		...init: "GET" extends ValidMethod<S & string> ? [init?: TypedRequestInit<Method | ValidMethod<S & string>>] : [init: TypedRequestInitRequired<Method>]
	): Promise<TypedResponseFromPath<S & string, Method>>;`
	);

	api_exports.push(`export declare function fetch<S>(
		input: S extends string ? Kit.IsRelativePath<S> extends true ? MatchedEndpoints<S> extends { matched: any } ? \`invalid method for endpoint: \${ExtractIdFromMatched<MatchedEndpoints<S>>}, available_methods: \${ValidMethod<S>} \` : Kit.Equals<S, string> extends true ? S : \`no matched endpoints with id: \${S}\` : URL | RequestInfo : URL | RequestInfo,
		init?: RequestInit
	): Promise<Response>;`);

	api_exports.push(
		`declare global {
	function fetch<
		S,
		Method extends ValidMethod<S & string> = "GET" & ValidMethod<S & string>
	>(
		input: S extends string ? Kit.IsRelativePath<S> extends true ? MatchedEndpoints<S> extends { matched: any } ? S : \`no matched endpoints with id: \${S}\` : never : never,
		...init: "GET" extends ValidMethod<S & string> ? [init?: TypedRequestInit<Method | ValidMethod<S & string>>] : [init: TypedRequestInitRequired<Method>]
	): Promise<TypedResponseFromPath<S & string, Method>>;
}`
	);

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
 */
function parseSlugs(str) {
	let changed;
	let index = 0;
	const validators = [];
	do {
		changed = false;
		if (str.search(/\(.*?\)\/?/) !== -1) {
			changed = true;
			str = str.replace(/\(.*?\)\/?/, '');
		}
		if (str.search(/\/?\[\[.*?\]\]/) !== -1) {
			changed = true;
			str = str.replace(/\/?\[\[.*?\]\]/, `\${infer OptionalSlug${index}}`);
			validators.push(`ValidateOptional<OptionalSlug${index++}>`);
		}
		if (str.search(/\/?<<.*?>>/) !== -1) {
			changed = true;
			str = str.replace(/\/?<<.*?>>/, `\${infer OptionalSlug${index}}`);
			validators.push(`ValidateOptional<OptionalSlug${index++}>`);
		}
		if (str.search(/\/?\/?\[\.\.\..*?\]/) !== -1) {
			changed = true;
			str = str.replace(/\/?\[\.\.\..*?\]/, `\${infer RestSlug${index}}`);
			validators.push(`ValidateRest<RestSlug${index++}>`);
		}
		if (str.search(/\/?<\.\.\..*?>/) !== -1) {
			changed = true;
			str = str.replace(/\/?<\.\.\..*?>/, `\${infer RestSlug${index}}`);
			validators.push(`ValidateRest<RestSlug${index++}>`);
		}
		if (str.search(/\[.*?\]/) !== -1) {
			changed = true;
			str = str.replace(/\/?\[.*?\]/, `\${infer RequiredSlug${index}}`);
			validators.push(`ValidateRequired<RequiredSlug${index++}>`);
		}
		if (str.search(/\/?<.*?>/) !== -1) {
			changed = true;
			str = str.replace(/\/?<.*?>/, `\${infer RequiredSlug${index}}`);
			validators.push(`ValidateRequired<RequiredSlug${index++}>`);
		}
	} while (changed);
	if (!endsWithSlug(str)) {
		str += '${infer Trailing}';
		validators.push('ValidateTrailing<Trailing>');
	}
	const validator_str =
		validators.length > 0
			? `UnionAllTrue<${validators.length > 1 ? validators.join(' | ') : validators.join('')}>`
			: 'true';

	return {
		matcher_str: str,
		validator_str
	};
}

/**
 *
 * @param {string} str
 */
function endsWithSlug(str) {
	return str.endsWith('}');
}
