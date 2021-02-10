export default {
	adapter: {
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

	appDir: expect_string('.svelte'),

	files: {
		default: {
			assets: expect_string('static'),
			routes: expect_string('src/routes'),
			setup: expect_string('src/setup'),
			template: expect_string('src/app.html')
		}
	},

	host: expect_string(null),

	hostHeader: expect_string(null),

	paths: {
		default: {
			base: expect_string(''),
			assets: expect_string('')
		}
	},

	prerender: {
		default: {
			crawl: expect_boolean(true),
			enabled: expect_boolean(true),
			force: expect_boolean(false),
			pages: {
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
};

function expect_string(string) {
	return {
		default: string,
		validate: (option, keypath) => {
			assert_is_string(option, keypath);
			return option;
		}
	};
}

function expect_boolean(boolean) {
	return {
		default: boolean,
		validate: (option, keypath) => {
			if (typeof option !== 'boolean') {
				throw new Error(`${keypath} should be true or false, if specified`);
			}
			return option;
		}
	};
}

function assert_is_string(option, keypath) {
	if (typeof option !== 'string') {
		throw new Error(`${keypath} should be a string, if specified`);
	}
}
