import { join } from 'path';

/** @typedef {import('./types').Validator} Validator */

/** @type {Validator} */
const options = object(
	{
		extensions: validate(['.svelte'], (input, keypath) => {
			if (!Array.isArray(input) || !input.every((page) => typeof page === 'string')) {
				throw new Error(`${keypath} must be an array of strings`);
			}

			input.forEach((extension) => {
				if (extension[0] !== '.') {
					throw new Error(`Each member of ${keypath} must start with '.' — saw '${extension}'`);
				}

				if (!/^(\.[a-z0-9]+)+$/i.test(extension)) {
					throw new Error(`File extensions must be alphanumeric — saw '${extension}'`);
				}
			});

			return input;
		}),

		kit: object({
			adapter: validate(null, (input, keypath) => {
				if (typeof input !== 'object' || !input.adapt) {
					let message = `${keypath} should be an object with an "adapt" method`;

					if (Array.isArray(input) || typeof input === 'string') {
						// for the early adapter adopters
						message += ', rather than the name of an adapter';
					}

					throw new Error(`${message}. See https://kit.svelte.dev/docs#adapters`);
				}

				return input;
			}),

			amp: boolean(false),

			appDir: validate('_app', (input, keypath) => {
				assert_string(input, keypath);

				if (input) {
					if (input.startsWith('/') || input.endsWith('/')) {
						throw new Error(
							"config.kit.appDir cannot start or end with '/'. See https://kit.svelte.dev/docs#configuration"
						);
					}
				} else {
					throw new Error(`${keypath} cannot be empty`);
				}

				return input;
			}),

			browser: object({
				hydrate: boolean(true),
				router: boolean(true)
			}),

			csp: object({
				mode: list(['auto', 'hash', 'nonce']),
				directives: object({
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
				})
			}),

			files: object({
				assets: string('static'),
				hooks: string(join('src', 'hooks')),
				lib: string(join('src', 'lib')),
				routes: string(join('src', 'routes')),
				serviceWorker: string(join('src', 'service-worker')),
				template: string(join('src', 'app.html'))
			}),

			floc: boolean(false),

			// TODO: remove this for the 1.0 release
			headers: error(
				(keypath) =>
					`${keypath} has been removed. See https://github.com/sveltejs/kit/pull/3384 for details`
			),

			// TODO: remove this for the 1.0 release
			host: error(
				(keypath) =>
					`${keypath} has been removed. See https://github.com/sveltejs/kit/pull/3384 for details`
			),

			// TODO remove for 1.0
			hydrate: error((keypath) => `${keypath} has been moved to config.kit.browser.hydrate`),

			inlineStyleThreshold: number(0),

			methodOverride: object({
				parameter: string('_method'),
				allowed: validate([], (input, keypath) => {
					if (!Array.isArray(input) || !input.every((method) => typeof method === 'string')) {
						throw new Error(`${keypath} must be an array of strings`);
					}

					if (input.map((i) => i.toUpperCase()).includes('GET')) {
						throw new Error(`${keypath} cannot contain "GET"`);
					}

					return input;
				})
			}),

			package: object({
				dir: string('package'),
				// excludes all .d.ts and filename starting with _
				exports: fun((filepath) => !/^_|\/_|\.d\.ts$/.test(filepath)),
				files: fun(() => true),
				emitTypes: boolean(true)
			}),

			paths: object({
				base: validate('', (input, keypath) => {
					assert_string(input, keypath);

					if (input !== '' && (input.endsWith('/') || !input.startsWith('/'))) {
						throw new Error(
							`${keypath} option must be a root-relative path that starts but doesn't end with '/'. See https://kit.svelte.dev/docs#configuration-paths`
						);
					}

					return input;
				}),
				assets: validate('', (input, keypath) => {
					assert_string(input, keypath);

					if (input) {
						if (!/^[a-z]+:\/\//.test(input)) {
							throw new Error(
								`${keypath} option must be an absolute path, if specified. See https://kit.svelte.dev/docs#configuration-paths`
							);
						}

						if (input.endsWith('/')) {
							throw new Error(
								`${keypath} option must not end with '/'. See https://kit.svelte.dev/docs#configuration-paths`
							);
						}
					}

					return input;
				})
			}),

			prerender: object({
				concurrency: number(1),
				crawl: boolean(true),
				createIndexFiles: boolean(true),
				enabled: boolean(true),
				entries: validate(['*'], (input, keypath) => {
					if (!Array.isArray(input) || !input.every((page) => typeof page === 'string')) {
						throw new Error(`${keypath} must be an array of strings`);
					}

					input.forEach((page) => {
						if (page !== '*' && page[0] !== '/') {
							throw new Error(
								`Each member of ${keypath} must be either '*' or an absolute path beginning with '/' — saw '${page}'`
							);
						}
					});

					return input;
				}),

				// TODO: remove this for the 1.0 release
				force: validate(undefined, (input, keypath) => {
					if (typeof input !== undefined) {
						const newSetting = input ? 'continue' : 'fail';
						const needsSetting = newSetting === 'continue';
						throw new Error(
							`${keypath} has been removed in favor of \`onError\`. In your case, set \`onError\` to "${newSetting}"${
								needsSetting ? '' : ' (or leave it undefined)'
							} to get the same behavior as you would with \`force: ${JSON.stringify(input)}\``
						);
					}
				}),

				onError: validate('fail', (input, keypath) => {
					if (typeof input === 'function') return input;
					if (['continue', 'fail'].includes(input)) return input;
					throw new Error(
						`${keypath} should be either a custom function or one of "continue" or "fail"`
					);
				}),

				// TODO: remove this for the 1.0 release
				pages: error((keypath) => `${keypath} has been renamed to \`entries\`.`)
			}),

			// TODO: remove this for the 1.0 release
			protocol: error(
				(keypath) =>
					`${keypath} has been removed. See https://github.com/sveltejs/kit/pull/3384 for details`
			),

			// TODO remove for 1.0
			router: error((keypath) => `${keypath} has been moved to config.kit.browser.router`),

			routes: fun((filepath) => !/(?:(?:^_|\/_)|(?:^\.|\/\.)(?!well-known))/.test(filepath)),

			serviceWorker: object({
				register: boolean(true),
				files: fun((filename) => !/\.DS_STORE/.test(filename))
			}),

			// TODO remove this for 1.0
			ssr: error(
				(keypath) =>
					`${keypath} has been removed — use the handle hook instead: https://kit.svelte.dev/docs#hooks-handle'`
			),

			target: string(null),

			trailingSlash: list(['never', 'always', 'ignore']),

			vite: validate(
				() => ({}),
				(input, keypath) => {
					if (typeof input === 'object') {
						const config = input;
						input = () => config;
					}

					if (typeof input !== 'function') {
						throw new Error(
							`${keypath} must be a Vite config object (https://vitejs.dev/config) or a function that returns one`
						);
					}

					return input;
				}
			)
		})
	},
	true
);

/**
 * @param {Record<string, Validator>} children
 * @param {boolean} [allow_unknown]
 * @returns {Validator}
 */
function object(children, allow_unknown = false) {
	return (input, keypath) => {
		/** @type {Record<string, any>} */
		const output = {};

		if ((input && typeof input !== 'object') || Array.isArray(input)) {
			throw new Error(`${keypath} should be an object`);
		}

		for (const key in input) {
			if (!(key in children)) {
				if (allow_unknown) {
					output[key] = input[key];
				} else {
					let message = `Unexpected option ${keypath}.${key}`;

					// special case
					if (keypath === 'config.kit' && key in options) {
						message += ` (did you mean config.${key}?)`;
					}

					throw new Error(message);
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
function validate(fallback, fn) {
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
			throw new Error(`${keypath} cannot be empty`);
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
		if (input === undefined) return input;

		if (!Array.isArray(input) || input.some((value) => typeof value !== 'string')) {
			throw new Error(`${keypath} must be an array of strings, if specified`);
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
			throw new Error(`${keypath} should be a number, if specified`);
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
			throw new Error(`${keypath} should be true or false, if specified`);
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
			// prettier-ignore
			const msg = options.length > 2
				? `${keypath} should be one of ${options.slice(0, -1).map(input => `"${input}"`).join(', ')} or "${options[options.length - 1]}"`
				: `${keypath} should be either "${options[0]}" or "${options[1]}"`;

			throw new Error(msg);
		}
		return input;
	});
}

/**
 * @param {(filename: string) => boolean} fallback
 * @returns {Validator}
 */
function fun(fallback) {
	return validate(fallback, (input, keypath) => {
		if (typeof input !== 'function') {
			throw new Error(`${keypath} should be a function, if specified`);
		}
		return input;
	});
}

/**
 * @param {string} input
 * @param {string} keypath
 */
function assert_string(input, keypath) {
	if (typeof input !== 'string') {
		throw new Error(`${keypath} should be a string, if specified`);
	}
}

/** @param {(keypath?: string) => string} fn */
function error(fn) {
	return validate(undefined, (input, keypath) => {
		if (input !== undefined) {
			throw new Error(fn(keypath));
		}
	});
}

export default options;
