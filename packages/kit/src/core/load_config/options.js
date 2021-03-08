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
				default: [null],
				validate: (option, keypath) => {
					// support both `adapter: 'foo'` and `adapter: ['foo', opts]`
					if (!Array.isArray(option)) {
						option = [option];
					}

					// TODO allow inline functions
					assert_is_string(option[0], keypath);

					return option;
				}
			},

			amp: expect_boolean(false),

			appDir: expect_string('_app', false),

			files: {
				type: 'branch',
				children: {
					assets: expect_string('static'),
					routes: expect_string('src/routes'),
					serviceWorker: expect_string('src/service-worker'),
					setup: expect_string('src/setup'),
					template: expect_string('src/app.html')
				}
			},

			host: expect_string(null),

			hostHeader: expect_string(null),

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

			// used for testing
			startGlobal: expect_string(null),

			target: expect_string(null)
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
