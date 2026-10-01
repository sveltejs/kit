/** @import { ValidatedConfig } from 'types' */
/** @import { Validator } from './types.js' */
import * as e from '../../messages/build-errors.js';
import * as w from '../../messages/build-warnings.js';
import { join_or } from '../../utils/format.js';

const directives = object({
	'child-src': string_array(),
	'default-src': string_array(),
	'frame-src': string_array(),
	'worker-src': string_array(),
	'connect-src': string_array(),
	'font-src': string_array(),
	'img-src': string_array(),
	'manifest-src': string_array(),
	'media-src': string_array(),
	'object-src': string_array(),
	'prefetch-src': string_array(),
	'script-src': string_array(),
	'script-src-elem': string_array(),
	'script-src-attr': string_array(),
	'style-src': string_array(),
	'style-src-elem': string_array(),
	'style-src-attr': string_array(),
	'base-uri': string_array(),
	sandbox: string_array(),
	'form-action': string_array(),
	'frame-ancestors': string_array(),
	'navigate-to': string_array(),
	'report-uri': string_array(),
	'report-to': string_array(),
	'require-trusted-types-for': string_array(),
	'trusted-types': string_array(),
	'upgrade-insecure-requests': boolean(false),
	'require-sri-for': string_array(),
	'block-all-mixed-content': boolean(false),
	'plugin-types': string_array(),
	referrer: string_array()
});

const prerender_handler = validate(undefined, (input, keypath) => {
	if (typeof input === 'function') return input;
	if (['fail', 'warn', 'ignore'].includes(input)) return input;
	e.config_invalid_prerender_handler({ keypath });
});

const options = {
	adapter: validate(undefined, (input, keypath) => {
		if (typeof input !== 'object' || !input.adapt) {
			e.config_invalid_adapter({ keypath });
		}

		return input;
	}),

	alias: deprecate(
		validate({}, (input, keypath) => {
			if (typeof input !== 'object') {
				e.config_expected_object({ keypath });
			}

			for (const key in input) {
				assert_string(input[key], `${keypath}.${key}`);
			}

			return input;
		}),
		w.config_option_deprecated_alias
	),

	appDir: validate('_app', (input, keypath) => {
		assert_string(input, keypath);

		if (input) {
			if (input.startsWith('/') || input.endsWith('/')) {
				e.config_app_dir_slash({ keypath });
			}
		} else {
			e.config_empty_string({ keypath });
		}

		return input;
	}),

	compilerOptions: any(),

	csp: object({
		mode: list(['auto', 'hash', 'nonce']),
		directives,
		reportOnly: directives
	}),

	csrf: object({
		checkOrigin: removed(e.config_option_removed_check_origin),
		trustedOrigins: string_array([])
	}),

	embedded: boolean(false),

	env: object({
		dir: string('')
	}),

	experimental: object(
		{
			tracing: removed(e.config_option_removed_experimental_tracing),
			instrumentation: removed(e.config_option_removed_experimental_instrumentation),
			remoteFunctions: boolean(false),
			forkPreloads: boolean(false),
			handleRenderingErrors: removed()
		},
		true
	),

	extensions: validate(['.svelte'], (input, keypath) => {
		if (!Array.isArray(input) || !input.every((page) => typeof page === 'string')) {
			e.config_expected_string_array({ keypath });
		}

		input.forEach((extension) => {
			if (extension[0] !== '.') {
				e.config_extension_missing_dot({ keypath, extension });
			}

			if (!/^(\.[a-z0-9]+)+$/i.test(extension)) {
				e.config_extension_invalid({ extension });
			}
		});

		return input;
	}),

	files: object({
		src: string('src'),
		assets: string('static'),
		hooks: object({
			client: string(null),
			server: string(null),
			universal: string(null)
		}),
		lib: removed(e.config_option_removed_files_lib),
		params: string(null),
		routes: string(null),
		serviceWorker: string(null),
		appTemplate: string(null),
		errorTemplate: string(null)
	}),

	inlineStyleThreshold: number(0),

	moduleExtensions: string_array(['.js', '.ts']),

	kit: validate(undefined, (input) => {
		const keys = Object.keys(input)
			.map((key) => `\`${key}\``)
			.join(', ');

		e.config_kit_namespace({ keys });
	}),

	outDir: string('.svelte-kit'),

	output: object({
		linkHeaderPreload: boolean(false),
		preloadStrategy: removed(e.config_option_removed_preload_strategy),
		bundleStrategy: list(['split', 'single', 'inline'])
	}),

	paths: object({
		base: validate('', (input, keypath) => {
			assert_string(input, keypath);

			if (input !== '' && (input.endsWith('/') || !input.startsWith('/'))) {
				e.config_paths_base_invalid({ keypath });
			}

			return input;
		}),
		assets: validate('', (input, keypath) => {
			assert_string(input, keypath);

			if (input) {
				if (!/^[a-z]+:\/\//.test(input)) {
					e.config_paths_assets_not_absolute({ keypath });
				}

				if (input.endsWith('/')) {
					e.config_paths_assets_trailing_slash({ keypath });
				}
			}

			return input;
		}),
		origin: validate(undefined, (input, keypath) => {
			assert_string(input, keypath);

			let url;

			try {
				url = new URL(input);
			} catch {
				e.config_origin_invalid({ keypath, input });
			}

			if (url.protocol !== 'http:' && url.protocol !== 'https:') {
				e.config_origin_protocol({ keypath, protocol: url.protocol });
			}

			const origin = url.origin;

			if (input !== origin) {
				e.config_origin_has_path({ keypath, input, origin });
			}

			return origin;
		}),
		relative: boolean(true)
	}),

	preprocess: any(),

	prerender: object({
		concurrency: validate(1, (input, keypath) => {
			if (!Number.isInteger(input) || input < 1) {
				e.config_expected_positive_integer({ keypath });
			}

			return input;
		}),
		crawl: boolean(true),
		entries: validate(['*'], (input, keypath) => {
			if (!Array.isArray(input) || !input.every((page) => typeof page === 'string')) {
				e.config_expected_string_array({ keypath });
			}

			input.forEach((page) => {
				if (page !== '*' && page[0] !== '/') {
					e.config_prerender_entry_invalid({ keypath, entry: page });
				}
			});

			return input;
		}),

		handleHttpError: prerender_handler,
		handleMissingId: prerender_handler,
		handleEntryGeneratorMismatch: prerender_handler,
		handleUnseenRoutes: prerender_handler,
		handleInvalidUrl: prerender_handler,

		origin: removed(e.config_option_removed_prerender_origin)
	}),

	router: object({
		type: list(['pathname', 'hash']),
		resolution: list(['client', 'server'])
	}),

	serviceWorker: object({
		files: removed(),
		register: boolean(true),
		// options could be undefined but if it is defined we only validate that
		// it's an object since the type comes from the browser itself
		options: validate(undefined, object({}, true))
	}),

	tracing: object({
		server: boolean(false)
	}),

	typescript: deprecate(
		object({
			config: fun((config) => config)
		}),
		w.config_option_deprecated_typescript
	),

	version: object({
		name: string(Date.now().toString()),
		pollInterval: number(3_600_000)
	}),

	vitePlugin: removed(e.config_option_removed_vite_plugin)
};

/** @type {Validator<ValidatedConfig>} */
export const validate_options = object(options, true);

/**
 * @param {Validator} fn
 * @param {(values: { keypath: string }) => void} warn
 * @returns {Validator}
 */
function deprecate(fn, warn = w.config_option_deprecated) {
	return (input, keypath) => {
		if (input !== undefined) {
			warn({ keypath });
		}

		return fn(input, keypath);
	};
}

// Derive the names of SvelteKit's own config options from the schema, so they
// stay in sync automatically. These are used to separate Kit's options from
// `vite-plugin-svelte`'s options when config is passed via the Vite plugin.
const kit_defaults = validate_options({}, 'config');

/** The names of the options that live under the `kit` namespace */
export const kit_options = Object.keys(kit_defaults);

/** The names of the options that live under the `kit.experimental` namespace */
export const kit_experimental_options = Object.keys(kit_defaults.experimental);

/**
 * @param {(values: { keypath: string }) => never} error
 * @returns {Validator}
 */
function removed(error = e.config_option_removed) {
	return (input, keypath) => {
		if (typeof input !== 'undefined') {
			error({ keypath });
		}
	};
}

/**
 * @param {Record<string, Validator>} children
 * @param {boolean} [allow_unknown]
 * @returns {Validator}
 */
export function object(children, allow_unknown = false) {
	return (input, keypath) => {
		/** @type {Record<string, any>} */
		const output = {};

		if ((input && typeof input !== 'object') || Array.isArray(input)) {
			e.config_expected_object({ keypath });
		}

		for (const key in input) {
			if (!(key in children)) {
				if (allow_unknown) {
					const value = input[key];
					if (value !== undefined) output[key] = value;
				} else {
					// special case
					const suggestion =
						keypath === 'config.kit' && key in kit_options ? `config.${key}` : undefined;

					e.config_unexpected_option({ keypath: `${keypath}.${key}`, suggestion });
				}
			}
		}

		for (const key in children) {
			const validator = children[key];
			output[key] = validator(input && input[key], `${keypath}.${key}`);
		}

		return output;
	};
}

/**
 * @param {any} fallback
 * @param {(value: any, keypath: string) => any} fn
 * @returns {Validator}
 */
export function validate(fallback, fn) {
	return (input, keypath) => {
		return input === undefined ? fallback : fn(input, keypath);
	};
}

/**
 * @param {string | null} fallback
 * @param {boolean} allow_empty
 * @returns {Validator}
 */
function string(fallback, allow_empty = true) {
	return validate(fallback, (input, keypath) => {
		assert_string(input, keypath);

		if (!allow_empty && input === '') {
			e.config_empty_string({ keypath });
		}

		return input;
	});
}

/**
 * @param {string[] | undefined} [fallback]
 * @returns {Validator}
 */
function string_array(fallback) {
	return validate(fallback, (input, keypath) => {
		if (!Array.isArray(input) || input.some((value) => typeof value !== 'string')) {
			e.config_expected_string_array({ keypath });
		}

		return input;
	});
}

/**
 * @param {number} fallback
 * @returns {Validator}
 */
function number(fallback) {
	return validate(fallback, (input, keypath) => {
		if (typeof input !== 'number') {
			e.config_expected_number({ keypath });
		}
		return input;
	});
}

/**
 * @param {boolean} fallback
 * @returns {Validator}
 */
function boolean(fallback) {
	return validate(fallback, (input, keypath) => {
		if (typeof input !== 'boolean') {
			e.config_expected_boolean({ keypath });
		}
		return input;
	});
}

/**
 * @param {string[]} options
 * @returns {Validator}
 */
function list(options, fallback = options[0]) {
	return validate(fallback, (input, keypath) => {
		if (!options.includes(input)) {
			const quoted = options.map((option) => `"${option}"`);
			const expected =
				options.length > 2 ? `one of ${join_or(quoted)}` : `either ${join_or(quoted)}`;

			e.config_expected_one_of({ keypath, options: expected });
		}
		return input;
	});
}

/**
 * @param {(...args: any) => any} fallback
 * @returns {Validator}
 */
function fun(fallback) {
	return validate(fallback, (input, keypath) => {
		if (typeof input !== 'function') {
			e.config_expected_function({ keypath });
		}
		return input;
	});
}

function any() {
	return validate(undefined, (input) => input);
}

/**
 * @param {string} input
 * @param {string} keypath
 */
function assert_string(input, keypath) {
	if (typeof input !== 'string') {
		e.config_expected_string({ keypath });
	}
}
