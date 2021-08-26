import {
	any,
	array,
	boolean,
	coerce,
	defaulted as _,
	define,
	deprecated,
	enums,
	func,
	object,
	refine,
	string,
	type,
	union
} from 'superstruct';

export const options_type = type({
	// common svelte options
	compilerOptions: _(any(), null),
	preprocess: _(any(), null),
	extensions: _(array(svelte_extension()), ['.svelte']),

	// kit options
	kit: obj({
		adapter: _(adapter(), null),
		amp: _(boolean(), false),
		appDir: _(non_empty_string(), '_app'),
		files: obj({
			assets: _(string(), 'static'),
			hooks: _(string(), 'src/hooks'),
			lib: _(string(), 'src/lib'),
			routes: _(string(), 'src/routes'),
			serviceWorker: _(string(), 'src/service-worker'),
			template: _(string(), 'src/app.html')
		}),
		floc: _(boolean(), false),
		assets: _(string(), null),
		hostHeader: _(string(), null),
		hydrate: _(boolean(), true),
		serviceWorker: obj({
			exclude: array(string())
		}),
		package: obj({
			dir: _(string(), 'package'),
			exports: obj({
				include: _(array(string()), ['**']),
				exclude: _(array(string()), ['_*', '**/_*'])
			}),
			files: obj({
				include: _(array(string()), ['**']),
				exclude: array(string())
			}),
			emitTypes: _(boolean(), true)
		}),
		paths: obj({
			base: _(string(), ''),
			assets: _(string(), '')
		}),
		prerender: obj({
			crawl: _(boolean(), true),
			enabled: _(boolean(), true),
			// TODO: remove this for the 1.0 release
			force: prerender_force()
		}),
		onError: _(on_error(), 'fail'),
		pages: _(page(), ['*']),
		router: _(boolean(), true),
		ssr: _(boolean(), true),
		target: _(string(), null),
		trailingSlash: _(enums(['never', 'always', 'ignore']), true),
		vite: _(vite_config(), () => ({}))
	})
});

/**
 * @param {S} schema
 * @template {Record<string, import('superstruct').Struct<any, any>>} S
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

function on_error() {
	return refine(union([func(), string()]), 'on_error', (value, ctx) => {
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

function vite_config() {
	return coerce(func(), object(), (value) => () => value);
}

/**
 * utility function to print struct value
 * https://github.com/ianstormtaylor/superstruct/blob/a44563d2784e6377e3e08330a5ec84b36d1b8933/src/utils.ts#L37-L39
 * @param {any} value
 */
function print(value) {
	return typeof value === 'string' ? JSON.stringify(value) : `${value}`;
}
