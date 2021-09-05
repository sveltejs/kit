const identity = (/** @type {any} */ id) => id;

/** @typedef {import('./types').ConfigDefinition} ConfigDefinition */

/** @type {Record<string, ConfigDefinition>} */
const options = {
	compilerOptions: validate(null, identity),

	extensions: validate(['.svelte'], (option, keypath) => {
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
	}),

	kit: object({
		adapter: validate(null, (option, keypath) => {
			if (typeof option !== 'object' || !option.adapt) {
				let message = `${keypath} should be an object with an "adapt" method`;

				if (Array.isArray(option) || typeof option === 'string') {
					// for the early adapter adopters
					message += ', rather than the name of an adapter';
				}

				throw new Error(`${message}. See https://kit.svelte.dev/docs#adapters`);
			}

			return option;
		}),

		amp: boolean(false),

		appDir: string('_app', false),

		files: object({
			assets: string('static'),
			hooks: string('src/hooks'),
			lib: string('src/lib'),
			routes: string('src/routes'),
			serviceWorker: string('src/service-worker'),
			template: string('src/app.html')
		}),

		floc: boolean(false),

		host: string(null),

		hostHeader: string(null),

		hydrate: boolean(true),
		serviceWorker: object({
			exclude: array_of_strings([])
		}),

		package: object({
			dir: string('package'),
			exports: object({
				include: array_of_strings(['**']),
				exclude: array_of_strings(['**/_*'])
			}),
			files: object({
				include: array_of_strings(['**']),
				exclude: array_of_strings([])
			}),
			emitTypes: boolean(true)
		}),

		paths: object({
			base: string(''),
			assets: string('')
		}),

		prerender: object({
			crawl: boolean(true),
			enabled: boolean(true),
			// TODO: remove this for the 1.0 release
			force: validate(undefined, (option, keypath) => {
				if (typeof option !== undefined) {
					const newSetting = option ? 'continue' : 'fail';
					const needsSetting = newSetting === 'continue';
					throw new Error(
						`${keypath} has been removed in favor of \`onError\`. In your case, set \`onError\` to "${newSetting}"${
							needsSetting ? '' : ' (or leave it undefined)'
						} to get the same behavior as you would with \`force: ${JSON.stringify(option)}\``
					);
				}
			}),
			onError: validate('fail', (option, keypath) => {
				if (typeof option === 'function') return option;
				if (['continue', 'fail'].includes(option)) return option;
				throw new Error(
					`${keypath} should be either a custom function or one of "continue" or "fail"`
				);
			}),
			pages: validate(['*'], (option, keypath) => {
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
			})
		}),

		router: boolean(true),

		ssr: boolean(true),

		target: string(null),

		trailingSlash: list(['never', 'always', 'ignore']),

		vite: validate(
			() => ({}),
			(option, keypath) => {
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
		)
	}),

	preprocess: validate(null, identity)
};

/**
 * @param {Record<string, ConfigDefinition>} children
 * @returns {ConfigDefinition}
 */
function object(children) {
	return {
		type: 'branch',
		children
	};
}

/**
 * @param {any} fallback
 * @param {(value: any, keypath: string) => any} validate
 * @returns {ConfigDefinition}
 */
function validate(fallback, validate) {
	return {
		type: 'leaf',
		validate,
		fallback
	};
}

/**
 * @param {string | null} fallback
 * @param {boolean} allow_empty
 * @returns {ConfigDefinition}
 */
function string(fallback, allow_empty = true) {
	return validate(fallback, (option, keypath) => {
		if (typeof option !== 'string') {
			throw new Error(`${keypath} should be a string, if specified`);
		}

		if (!allow_empty && option === '') {
			throw new Error(`${keypath} cannot be empty`);
		}

		return option;
	});
}

/**
 * @param {string[]} array
 * @returns {ConfigDefinition}
 */
function array_of_strings(array) {
	return validate(array, (option, keypath) => {
		if (!Array.isArray(option) || !option.every((glob) => typeof glob === 'string')) {
			throw new Error(`${keypath} must be an array of strings`);
		}
		return option;
	});
}

/**
 * @param {boolean} fallback
 * @returns {ConfigDefinition}
 */
function boolean(fallback) {
	return validate(fallback, (option, keypath) => {
		if (typeof option !== 'boolean') {
			throw new Error(`${keypath} should be true or false, if specified`);
		}
		return option;
	});
}

/**
 * @param {string[]} options
 * @returns {ConfigDefinition}
 */
function list(options, fallback = options[0]) {
	return validate(fallback, (option, keypath) => {
		if (!options.includes(option)) {
			// prettier-ignore
			const msg = options.length > 2
				? `${keypath} should be one of ${options.slice(0, -1).map(option => `"${option}"`).join(', ')} or "${options[options.length - 1]}"`
				: `${keypath} should be either "${options[0]}" or "${options[1]}"`;

			throw new Error(msg);
		}
		return option;
	});
}

export default options;
