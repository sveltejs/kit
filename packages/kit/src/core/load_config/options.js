const noop = () => {};

/** @typedef {import('./types').ConfigDefinition} ConfigDefinition */

/** @type {Record<string, ConfigDefinition>} */
const options = {
	compilerOptions: {
		type: 'leaf',
		default: null,
		validate: noop
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
					force: expect_boolean(false),
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
			}
		}
	},

	preprocess: {
		type: 'leaf',
		default: null,
		validate: noop
	}
};

/**
 * @param {string} string
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
 * @param {any} option
 * @param {string} keypath
 */
function assert_is_string(option, keypath) {
	if (typeof option !== 'string') {
		throw new Error(`${keypath} should be a string, if specified`);
	}
}

export default options;
