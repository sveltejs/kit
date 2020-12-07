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

	target: expect_string(null),

	// used for testing
	startGlobal: expect_string(null),

	files: {
		default: {
			assets: expect_string('static'),
			routes: expect_string('src/routes'),
			setup: expect_string('src/setup'),
			template: expect_string('src/app.html')
		}
	},

	paths: {
		default: {
			base: expect_string(''),
			assets: expect_string(''),
			generated: expect_string('_app')
		}
	}
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

function assert_is_string(option, keypath) {
	if (typeof option !== 'string') {
		throw new Error(`${keypath} should be a string, if specified`);
	}
}
