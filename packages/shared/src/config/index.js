/** @typedef {import('./types').Validator} Validator */

/**
 * @param {Record<string, Validator>} children
 *
 * @param {boolean | ((keypath: string, key: string) => string)} [allow_unknown]
 * If unknown object keys are allowed.
 * If you want to enhance the error message with something, use the function signature
 *
 * @returns {Validator}
 */
export function object(children, allow_unknown = false) {
	return (input, keypath) => {
		/** @type {Record<string, any>} */
		const output = {};

		if ((input && typeof input !== 'object') || Array.isArray(input)) {
			throw new Error(`${keypath} should be an object`);
		}

		for (const key in input) {
			if (!(key in children)) {
				if (allow_unknown === true) {
					output[key] = input[key];
				} else {
					let message = `Unexpected option ${keypath}.${key}`;
					if (typeof allow_unknown !== 'boolean') {
						message += allow_unknown(keypath, key);
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
export function string(fallback, allow_empty = true) {
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
export function string_array(fallback) {
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
export function number(fallback) {
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
export function boolean(fallback) {
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
export function list(options, fallback = options[0]) {
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
export function fun(fallback) {
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
export function assert_string(input, keypath) {
	if (typeof input !== 'string') {
		throw new Error(`${keypath} should be a string, if specified`);
	}
}

/** @param {(keypath?: string) => string} fn */
export function error(fn) {
	return validate(undefined, (input, keypath) => {
		if (input !== undefined) {
			throw new Error(fn(keypath));
		}
	});
}
