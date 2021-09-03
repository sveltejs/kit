import fs from 'fs';
import path from 'path';
import {
	any,
	array,
	boolean,
	coerce,
	defaulted as _,
	define,
	deprecated,
	enums,
	nullable,
	object,
	optional,
	refine,
	string,
	type
} from 'superstruct';

/**
 * @typedef {import('superstruct').Struct<T, S>} Struct
 * @template T, S
 */

/**
 * @typedef {import('../../../types/config').Adapter} Adapter
 * @typedef {import('../../../types/config').PrerenderOnErrorValue} PrerenderOnErrorValue
 */

export function options_type({ cwd = process.cwd() } = {}) {
	return type({
		// common svelte options
		compilerOptions: _(nullable(some()), null),
		preprocess: _(nullable(some()), null),
		extensions: _(array(svelte_extension()), ['.svelte']),

		// kit options
		kit: obj({
			adapter: _(nullable(adapter()), null),
			amp: _(boolean(), false),
			appDir: _(app_dir(), '_app'),
			files: obj({
				assets: fs_path_string({ cwd, fallback: 'static' }),
				hooks: fs_path_string({ cwd, fallback: 'src/hooks' }),
				lib: fs_path_string({ cwd, fallback: 'src/lib' }),
				routes: fs_path_string({ cwd, fallback: 'src/routes' }),
				serviceWorker: fs_path_string({ cwd, fallback: 'src/service-worker' }),
				template: template_path_string({ cwd, fallback: 'src/app.html', check_exist: true })
			}),
			floc: _(boolean(), false),
			host: _(nullable(string()), null),
			hostHeader: _(nullable(string()), null),
			hydrate: _(boolean(), true),
			serviceWorker: obj({
				exclude: _(array(string()), [])
			}),
			package: obj({
				dir: _(string(), 'package'),
				exports: obj({
					include: _(array(string()), ['**']),
					exclude: _(array(string()), ['_*', '**/_*'])
				}),
				files: obj({
					include: _(array(string()), ['**']),
					exclude: _(array(string()), [])
				}),
				emitTypes: _(boolean(), true)
			}),
			paths: obj({
				base: _(paths_base(), ''),
				assets: _(paths_assets(), '')
			}),
			prerender: obj({
				crawl: _(boolean(), true),
				enabled: _(boolean(), true),
				// TODO: remove this for the 1.0 release
				force: prerender_force(),
				onError: _(on_error(), 'fail'),
				pages: _(array(page()), ['*'])
			}),
			router: _(boolean(), true),
			ssr: _(boolean(), true),
			target: _(nullable(string()), null),
			trailingSlash: _(enums(['never', 'always', 'ignore']), 'never'),
			vite: _(vite_config(), () => ({}))
		})
	});
}

/**
 * non-nullable any
 * @returns {Struct<{}, null>}
 */
function some() {
	return define('some', () => true);
}

require;

/**
 * @param {S} schema
 * @template {Record<string, Struct<any, any>>} S
 */
function obj(schema) {
	return _(object(schema), {});
}

function non_empty_string() {
	return refine(string(), 'non_empty_string', (value) => {
		return value !== '' || `Expected a non-empty string`;
	});
}

function svelte_extension() {
	return refine(string(), 'svelte_extension', (value) => {
		if (value[0] !== '.') {
			return `Expected string to start with '.', but received: ${print(value)}`;
		}
		if (!/^(\.[a-z0-9]+)+$/i.test(value)) {
			return `Expected string to be alphanumeric, but received: ${print(value)}`;
		}
		return true;
	});
}

/**
 *
 * @returns {Struct<Adapter, null>}
 */
function adapter() {
	return define('adapter', (value) => {
		// @ts-expect-error - suppress error when checking value.adapt
		if (value && typeof value === 'object' && typeof value.adapt === 'function') {
			return true;
		}

		let message = `Expected an object with an "adapt" method`;

		if (Array.isArray(value) || typeof value === 'string') {
			// for the early adapter adopters
			message += ', rather than the name of an adapter';
		}

		message += `. See https://kit.svelte.dev/docs#adapters`;

		return message;
	});
}

function app_dir() {
	return refine(non_empty_string(), 'app_dir', (value) => {
		if (value.startsWith('/') || value.endsWith('/')) {
			return "kit.appDir cannot start or end with '/'. See https://kit.svelte.dev/docs#configuration";
		}

		return true;
	});
}

/**
 * @typedef {{
 *   cwd?: string,
 *   fallback?: string,
 *   check_exist?: boolean
 * }} FSPathStringOptions
 */

/**
 * @param {FSPathStringOptions} opts
 */
function fs_path_string({ cwd = process.cwd(), fallback, check_exist = false } = {}) {
	const str_coerce = coerce(string(), optional(string()), (value = fallback || '') => {
		return path.isAbsolute(value) ? value : path.join(cwd, value);
	});

	return refine(str_coerce, 'fs_path_string', (value) => {
		return !check_exist || fs.existsSync(value) || `${path.relative(cwd, value)} does not exist`;
	});
}

/**
 * @param {FSPathStringOptions} opts
 */
function template_path_string({ cwd = process.cwd(), fallback } = {}) {
	return refine(fs_path_string({ cwd, fallback }), 'template_path_string', (value) => {
		const contents = fs.readFileSync(value, 'utf8');
		const expected_tags = ['%svelte.head%', '%svelte.body%'];
		expected_tags.forEach((tag) => {
			if (contents.indexOf(tag) === -1) {
				return `${path.relative(cwd, value)} is missing ${tag}`;
			}
		});
		return true;
	});
}

function paths_base() {
	return refine(string(), 'paths_base', (value) => {
		if (value !== '' && (value.endsWith('/') || !value.startsWith('/'))) {
			return `Expected path to be a root-relative path that starts but doesn't end with '/'. See https://kit.svelte.dev/docs#configuration-paths`;
		}

		return true;
	});
}

function paths_assets() {
	return refine(string(), 'paths_assets', (value) => {
		// Allow empty string
		if (!value) return true;

		if (!/^[a-z]+:\/\//.test(value)) {
			return 'Expected path to be an absolute path, if specified. See https://kit.svelte.dev/docs#configuration-paths';
		}

		if (value.endsWith('/')) {
			return "Expected path tp not end with '/'. See https://kit.svelte.dev/docs#configuration-paths";
		}

		return true;
	});
}

function prerender_force() {
	return deprecated(string(), (value, ctx) => {
		const newSetting = value ? 'continue' : 'fail';
		const needsSetting = newSetting === 'continue';
		return `${
			ctx.path
		} has been removed in favor of \`onError\`. In your case, set \`onError\` to "${newSetting}"${
			needsSetting ? '' : ' (or leave it undefined)'
		} to get the same behavior as you would with \`force: ${print(value)}\``;
	});
}

/**
 *
 * @returns {Struct<PrerenderOnErrorValue, null>}
 */
function on_error() {
	return refine(any(), 'on_error', (value, ctx) => {
		if (typeof value !== 'function' && !['continue', 'fail'].includes(value)) {
			return `${ctx.path} should be either a custom function or one of "continue" or "fail"`;
		}

		return true;
	});
}

function page() {
	return refine(string(), 'page', (value) => {
		if (value !== '*' && value[0] !== '/') {
			return `Expected string be either '*' or an absolute path beginning with '/', but received ${print(
				value
			)}`;
		}

		return true;
	});
}

function vite_config() {
	return coerce(vite_config_func(), object(), (value) => () => value);
}

/**
 * @returns {Struct<() => import('vite').UserConfig, null>}
 */
function vite_config_func() {
	return define('vite_config_func', (value) => {
		return (
			typeof value === 'function' ||
			`Expected a vite config function, but received: ${print(value)}`
		);
	});
}

/**
 * utility function to print struct value
 * https://github.com/ianstormtaylor/superstruct/blob/a44563d2784e6377e3e08330a5ec84b36d1b8933/src/utils.ts#L37-L39
 * @param {any} value
 */
function print(value) {
	return typeof value === 'string' ? JSON.stringify(value) : `${value}`;
}
