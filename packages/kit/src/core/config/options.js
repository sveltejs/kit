const identity = (/** @type {any} */ id) => id;

/** @typedef {import('./types').ConfigDefinition} ConfigDefinition */

/** @type {Record<string, ConfigDefinition>} */
const options = {
	compilerOptions: {
		type: 'leaf',
		default: null,
		validate: identity
	},

	extensions: {
		type: 'leaf',
		default: ['.svelte'],
		validate: (option, keypath) => {
			if (!Array.isArray(option) || !option.every((page) => typeof page === 'string')) {
				throw new Error(`${keypath} must be an array of strings`);
			}

			option.forEach((extension) => {
				if (extension[0] !== '.') {
					throw new Error(`Each member of ${keypath} must start with '.' — saw '${extension}'`);
				}

				if (!/^(\.[a-z0-9]+)+$/i.test(extension)) {
					throw new Error(`File extensions must be alphanumeric — saw '${extension}'`);
				}
			});

			return option;
		}
	},

	kit: {
		type: 'branch',
		children: {
			adapter: {
				type: 'leaf',
				default: null,
				validate: (option, keypath) => {
					if (typeof option !== 'object' || !option.adapt) {
						let message = `${keypath} should be an object with an "adapt" method`;

						if (Array.isArray(option) || typeof option === 'string') {
							// for the early adapter adopters
							message += ', rather than the name of an adapter';
						}

						throw new Error(`${message}. See https://kit.svelte.dev/docs#adapters`);
					}

					return option;
				}
			},

			amp: expect_boolean(false),

			appDir: expect_string('_app', false),

			files: {
				type: 'branch',
				children: {
					assets: expect_string('static'),
					hooks: expect_string('src/hooks'),
					lib: expect_string('src/lib'),
					routes: expect_string('src/routes'),
					serviceWorker: expect_string('src/service-worker'),
					// TODO remove this, eventually
					setup: expect_string('src/setup'),
					template: expect_string('src/app.html')
				}
			},

			floc: expect_boolean(false),

			host: expect_string(null),

			hostHeader: expect_string(null),

			hydrate: expect_boolean(true),
			serviceWorker: {
				type: 'branch',
				children: {
					exclude: expect_array_of_strings([])
				}
			},

			package: {
				type: 'branch',
				children: {
					dir: expect_string('package'),
					exports: {
						type: 'branch',
						children: {
							include: expect_array_of_strings(['**']),
							exclude: expect_array_of_strings(['_*', '**/_*'])
						}
					},
					files: {
						type: 'branch',
						children: {
							include: expect_array_of_strings(['**']),
							exclude: expect_array_of_strings([])
						}
					},
					emitTypes: expect_boolean(true)
				}
			},

			paths: {
				type: 'branch',
				children: {
					base: expect_string(''),
					assets: expect_string('')
				}
			},

			prerender: {
				type: 'branch',
				children: {
					crawl: expect_boolean(true),
					enabled: expect_boolean(true),
					// TODO: remove this for the 1.0 release
					force: {
						type: 'leaf',
						default: undefined,
						validate: (option, keypath) => {
							if (typeof option !== undefined) {
								const newSetting = option ? 'continue' : 'fail';
								const needsSetting = newSetting === 'continue';
								throw new Error(
									`${keypath} has been removed in favor of \`onError\`. In your case, set \`onError\` to "${newSetting}"${
										needsSetting ? '' : ' (or leave it undefined)'
									} to get the same behavior as you would with \`force: ${JSON.stringify(option)}\``
								);
							}
						}
					},
					onError: {
						type: 'leaf',
						default: 'fail',
						validate: (option, keypath) => {
							if (typeof option === 'function') return option;
							if (['continue', 'fail'].includes(option)) return option;
							throw new Error(
								`${keypath} should be either a custom function or one of "continue" or "fail"`
							);
						}
					},
					pages: {
						type: 'leaf',
						default: ['*'],
						validate: (option, keypath) => {
							if (!Array.isArray(option) || !option.every((page) => typeof page === 'string')) {
								throw new Error(`${keypath} must be an array of strings`);
							}

							option.forEach((page) => {
								if (page !== '*' && page[0] !== '/') {
									throw new Error(
										`Each member of ${keypath} must be either '*' or an absolute path beginning with '/' — saw '${page}'`
									);
								}
							});

							return option;
						}
					}
				}
			},

			router: expect_boolean(true),

			ssr: expect_boolean(true),

			target: expect_string(null),

			trailingSlash: expect_enum(['never', 'always', 'ignore']),

			vite: {
				type: 'leaf',
				default: () => ({}),
				validate: (option, keypath) => {
					if (typeof option === 'object') {
						const config = option;
						option = () => config;
					}

					if (typeof option !== 'function') {
						throw new Error(
							`${keypath} must be a Vite config object (https://vitejs.dev/config) or a function that returns one`
						);
					}

					return option;
				}
			},

			i18n: {
				type: 'leaf',
				default: null,
				validate: (option, keypath) => {
					if (typeof option !== 'object' || option === null || Array.isArray(option)) {
						throw new Error(`${keypath} should be an Object. See https://kit.svelte.dev/docs#i18n`);
					}

					const keys = Object.keys(option);
					['defaultLocale', 'locales'].forEach((key) => {
						if (!keys.includes(key)) {
							throw new Error(`${keypath} should have the property ${key}. See https://kit.svelte.dev/docs#i18n`);
						}
					});

					if (typeof option.defaultLocale !== 'string' || !option.defaultLocale.length) {
						
						throw new Error(`${keypath}.defaultLocale should be a none empty string. See https://kit.svelte.dev/docs#i18n`);
					}

					const locales = options.locales;
					if (!Array.isArray(locales) || !locales.length || locales.some(locale => typeof locale !== 'string' || !locale.length)) {
						
						throw new Error(`${keypath}.locales should be an array of none empty strings. See https://kit.svelte.dev/docs#i18n`);
					}

					return option
				}
			}
		}
	},

	preprocess: {
		type: 'leaf',
		default: null,
		validate: identity
	}
};

/**
 * @param {string | null} string
 * @param {boolean} allow_empty
 * @returns {ConfigDefinition}
 */
function expect_string(string, allow_empty = true) {
	return {
		type: 'leaf',
		default: string,
		validate: (option, keypath) => {
			assert_is_string(option, keypath);
			if (!allow_empty && option === '') {
				throw new Error(`${keypath} cannot be empty`);
			}
			return option;
		}
	};
}

/**
 * @param {string[]} array
 * @returns {ConfigDefinition}
 */
function expect_array_of_strings(array) {
	return {
		type: 'leaf',
		default: array,
		validate: (option, keypath) => {
			if (!Array.isArray(option) || !option.every((glob) => typeof glob === 'string')) {
				throw new Error(`${keypath} must be an array of strings`);
			}
			return option;
		}
	};
}

/**
 * @param {boolean} boolean
 * @returns {ConfigDefinition}
 */
function expect_boolean(boolean) {
	return {
		type: 'leaf',
		default: boolean,
		validate: (option, keypath) => {
			if (typeof option !== 'boolean') {
				throw new Error(`${keypath} should be true or false, if specified`);
			}
			return option;
		}
	};
}

/**
 * @param {string[]} options
 * @returns {ConfigDefinition}
 */
function expect_enum(options, def = options[0]) {
	return {
		type: 'leaf',
		default: def,
		validate: (option, keypath) => {
			if (!options.includes(option)) {
				// prettier-ignore
				const msg = options.length > 2
					? `${keypath} should be one of ${options.slice(0, -1).map(option => `"${option}"`).join(', ')} or "${options[options.length - 1]}"`
					: `${keypath} should be either "${options[0]}" or "${options[1]}"`;

				throw new Error(msg);
			}
			return option;
		}
	};
}

/**
 * @param {any} option
 * @param {string} keypath
 */
function assert_is_string(option, keypath) {
	if (typeof option !== 'string') {
		throw new Error(`${keypath} should be a string, if specified`);
	}
}

export default options;
